'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { RefreshCw, XCircle, Search, Clock, ChefHat, CheckCircle, Truck, Bell } from 'lucide-react'
import type { Order, OrderStatus } from '@/types'
import clsx from 'clsx'

const COLUMNAS = [
  {
    status:    'Pendiente' as OrderStatus,
    label:     'POR ACEPTAR',
    next:      'En Proceso' as OrderStatus,
    nextLabel: 'Aceptar',
    color:     'border-yellow-400',
    bg:        'bg-yellow-50',
    headerBg:  'bg-yellow-400',
    btnColor:  'bg-blue-500 hover:bg-blue-600',
    icon:      Clock,
  },
  {
    status:    'En Proceso' as OrderStatus,
    label:     'EN PREPARACIÓN',
    next:      'Listo' as OrderStatus,
    nextLabel: 'Listo para entregar',
    color:     'border-blue-400',
    bg:        'bg-blue-50',
    headerBg:  'bg-blue-500',
    btnColor:  'bg-green-500 hover:bg-green-600',
    icon:      ChefHat,
  },
  {
    status:    'Listo' as OrderStatus,
    label:     'POR ENTREGAR',
    next:      'Entregado' as OrderStatus,
    nextLabel: 'Marcar entregado',
    color:     'border-green-400',
    bg:        'bg-green-50',
    headerBg:  'bg-green-500',
    btnColor:  'bg-purple-500 hover:bg-purple-600',
    icon:      Truck,
  },
]

function tiempoAtras(dateStr: string) {
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000)
  if (diff < 60)   return `${diff}s`
  if (diff < 3600) return `${Math.floor(diff / 60)}m`
  return `${Math.floor(diff / 3600)}h`
}

function useTimer(dateStr: string) {
  const [elapsed, setElapsed] = useState(0)
  useEffect(() => {
    const update = () => setElapsed(Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000))
    update()
    const id = setInterval(update, 1000)
    return () => clearInterval(id)
  }, [dateStr])
  return elapsed
}

function formatTimer(s: number) {
  const m = Math.floor(s / 60)
  const sec = s % 60
  return `${m}:${String(sec).padStart(2, '0')}`
}

function OrderCard({ order, col, onAvanzar, onCancelar, actualizando }: {
  order: Order
  col: typeof COLUMNAS[0]
  onAvanzar: (id: string, next: OrderStatus) => void
  onCancelar: (id: string) => void
  actualizando: string | null
}) {
  const elapsed  = useTimer(order.created_at)
  const urgente  = elapsed > 10 * 60
  const warning  = elapsed > 5 * 60
  const Icon     = col.icon

  return (
    <div className={clsx(
      'bg-white rounded-2xl overflow-hidden shadow-sm border-2 transition-all',
      urgente ? 'border-red-400 shadow-red-100' :
      warning ? 'border-yellow-300' :
      col.color
    )}>
      {/* Card header */}
      <div className={clsx(
        'px-4 py-3 flex items-center justify-between text-white',
        urgente ? 'bg-red-500' : col.headerBg
      )}>
        <div>
          <p className="font-bold text-sm leading-tight">{order.customer_name}</p>
          <p className="text-xs opacity-80">{order.channel} · {order.method}</p>
        </div>
        <div className="text-right">
          <p className="font-mono font-black text-lg">{formatTimer(elapsed)}</p>
          <p className="text-xs opacity-70">${Number(order.total).toFixed(2)}</p>
        </div>
      </div>

      {/* Items */}
      <div className="px-4 py-3 space-y-2">
        {Array.isArray(order.items) && order.items.map((item: any, i: number) => (
          <div key={i} className="flex items-center gap-3">
            <span className="w-7 h-7 bg-gray-900 text-white rounded-lg flex items-center justify-center text-sm font-black shrink-0">
              {item.quantity}
            </span>
            <span className="font-semibold text-gray-800 text-sm">{item.name}</span>
          </div>
        ))}

        {order.notes && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-xl px-3 py-2 mt-1">
            <p className="text-xs font-bold text-yellow-700 uppercase mb-0.5">Nota</p>
            <p className="text-sm text-yellow-800">{order.notes}</p>
          </div>
        )}

        {order.phone && (
          <p className="text-xs text-gray-400">📞 {order.phone}</p>
        )}
        {order.address && (
          <p className="text-xs text-gray-400">📍 {order.address}</p>
        )}
      </div>

      {/* Actions */}
      <div className="px-4 pb-4 flex gap-2">
        <button
          onClick={() => onAvanzar(order.id, col.next)}
          disabled={actualizando === order.id}
          className={clsx(
            'flex-1 py-2.5 rounded-xl text-white font-bold text-sm transition-all active:scale-[0.98] disabled:opacity-60',
            col.btnColor
          )}
        >
          {actualizando === order.id ? '...' : col.nextLabel}
        </button>
        <button
          onClick={() => onCancelar(order.id)}
          disabled={actualizando === order.id}
          className="px-3 py-2.5 rounded-xl bg-red-50 text-red-500 hover:bg-red-100 transition-colors"
        >
          <XCircle className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}

export default function PedidosView() {
  const [orders, setOrders]         = useState<Order[]>([])
  const [loading, setLoading]       = useState(true)
  const [actualizando, setAct]      = useState<string | null>(null)
  const [busqueda, setBusqueda]     = useState('')
  const [newAlert, setNewAlert]     = useState(false)
  const prevCount                   = useRef(0)
  const audioRef                    = useRef<HTMLAudioElement | null>(null)

  const cargar = useCallback(async () => {
    const res  = await fetch('/api/orders?limit=200')
    const data = await res.json()
    if (Array.isArray(data)) {
      const activos = data.filter((o: Order) =>
        ['Pendiente', 'En Proceso', 'Listo'].includes(o.status)
      )
      // Detectar nuevo pedido
      const pendientes = activos.filter((o: Order) => o.status === 'Pendiente').length
      if (prevCount.current > 0 && pendientes > prevCount.current) {
        setNewAlert(true)
        setTimeout(() => setNewAlert(false), 5000)
        // Sonido
        try {
          if (!audioRef.current) {
            audioRef.current = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3')
          }
          audioRef.current.play().catch(() => {})
        } catch {}
      }
      prevCount.current = pendientes
      setOrders(activos)
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    cargar()
    const id = setInterval(cargar, 15_000)
    return () => clearInterval(id)
  }, [cargar])

  const avanzar = async (id: string, next: OrderStatus) => {
    setAct(id)
    await fetch(`/api/orders/${id}`, {
      method:  'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ status: next }),
    })
    setAct(null)
    cargar()
  }

  const cancelar = async (id: string) => {
    if (!confirm('¿Cancelar este pedido?')) return
    setAct(id)
    await fetch(`/api/orders/${id}`, { method: 'DELETE' })
    setAct(null)
    cargar()
  }

  const filtrados = orders.filter(o => {
    if (!busqueda) return true
    const q = busqueda.toLowerCase()
    return o.customer_name.toLowerCase().includes(q) || (o.phone ?? '').includes(q)
  })

  const porEstado = (status: OrderStatus) => filtrados.filter(o => o.status === status)

  return (
    <div className="h-full flex flex-col overflow-hidden bg-gray-50">

      {/* ALERTA NUEVO PEDIDO */}
      {newAlert && (
        <div className="fixed top-4 right-4 z-50 bg-green-500 text-white px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-3 animate-bounce">
          <Bell className="w-6 h-6" />
          <div>
            <p className="font-black text-lg">¡Nuevo Pedido!</p>
            <p className="text-sm opacity-80">Revisa la columna Por Aceptar</p>
          </div>
        </div>
      )}

      {/* HEADER */}
      <div className="bg-white border-b px-6 py-4 flex items-center justify-between shrink-0">
        <h1 className="font-display font-black text-2xl text-gray-800">Órdenes</h1>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              value={busqueda}
              onChange={e => setBusqueda(e.target.value)}
              placeholder="Ingresar ID de la orden"
              className="input-field pl-9 w-56 text-sm"
            />
          </div>
          <button onClick={cargar} className="p-2 rounded-xl hover:bg-gray-100 transition-colors">
            <RefreshCw className="w-5 h-5 text-gray-500" />
          </button>
        </div>
      </div>

      {/* KANBAN */}
      {loading ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="w-10 h-10 border-4 border-gray-200 border-t-purple-500 rounded-full animate-spin" />
        </div>
      ) : (
        <div className="flex-1 grid grid-cols-3 gap-0 overflow-hidden">
          {COLUMNAS.map(col => {
            const lista = porEstado(col.status)
            const Icon  = col.icon
            return (
              <div key={col.status} className="flex flex-col border-r last:border-0 overflow-hidden">
                {/* Column header */}
                <div className="px-4 py-3 bg-white border-b flex items-center justify-between shrink-0">
                  <div className="flex items-center gap-2">
                    <Icon className="w-4 h-4 text-gray-500" />
                    <span className="font-black text-xs uppercase tracking-wider text-gray-600">
                      {col.label}
                    </span>
                  </div>
                  <span className={clsx(
                    'w-6 h-6 rounded-full flex items-center justify-center text-xs font-black text-white',
                    lista.length > 0 ? col.headerBg : 'bg-gray-300'
                  )}>
                    {lista.length}
                  </span>
                </div>

                {/* Cards */}
                <div className="flex-1 overflow-y-auto p-3 space-y-3">
                  {lista.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-gray-300 text-center px-4 py-16">
                      <Icon className="w-12 h-12 mb-3 opacity-20" />
                      <p className="text-sm">
                        {col.status === 'Pendiente'  && 'Aquí verás nuevas órdenes de tus clientes. Acéptalas para confirmar que las prepararás.'}
                        {col.status === 'En Proceso' && 'Aquí verás las órdenes a preparar de tu lado. Al terminar, márcalas como listas.'}
                        {col.status === 'Listo'      && 'Aquí verás órdenes listas para entregar al cliente.'}
                      </p>
                    </div>
                  ) : lista.map(order => (
                    <OrderCard
                      key={order.id}
                      order={order}
                      col={col}
                      onAvanzar={avanzar}
                      onCancelar={cancelar}
                      actualizando={actualizando}
                    />
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
