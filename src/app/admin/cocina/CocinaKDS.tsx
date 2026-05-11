'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { RefreshCw, CheckCircle, Flame, Clock, ChefHat, Bell, CheckCheck } from 'lucide-react'
import type { Order, Product } from '@/types'
import clsx from 'clsx'

function useTimer(startTime: string) {
  const [elapsed, setElapsed] = useState(0)
  useEffect(() => {
    const update = () => setElapsed(Math.floor((Date.now() - new Date(startTime).getTime()) / 1000))
    update()
    const id = setInterval(update, 1000)
    return () => clearInterval(id)
  }, [startTime])
  return elapsed
}

function formatTimer(s: number) {
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}

function TarjetaPedido({ order, onAvanzar, actualizando, catalogo }: { order: Order; onAvanzar: (id: string, next: string) => void; actualizando: boolean; catalogo: Product[] }) {
  const elapsed   = useTimer(order.created_at)
  const urgente   = elapsed > 10 * 60
  const advertencia = elapsed > 5 * 60

  const isCompletado = order.status === 'Listo' || order.status === 'Entregado'

  const headerBg = isCompletado ? 'bg-gray-200 text-gray-500'
                 : urgente ? 'bg-red-500 text-white' 
                 : advertencia ? 'bg-yellow-400 text-yellow-950' 
                 : order.status === 'En Proceso' ? 'bg-blue-500 text-white' 
                 : 'bg-gray-100 text-gray-800 border-b border-gray-200'

  const btnClass = order.status === 'Pendiente' 
                 ? 'bg-blue-500 hover:bg-blue-600 text-white shadow-md shadow-blue-200' 
                 : 'bg-green-500 hover:bg-green-600 text-white shadow-md shadow-green-200'

  return (
    <div className={clsx('bg-white rounded-2xl overflow-hidden border shadow-sm transition-all animate-in zoom-in-95',
      isCompletado ? 'opacity-60 grayscale-[0.5] border-gray-200' :
      urgente ? 'border-red-400 shadow-red-100' : advertencia ? 'border-yellow-400 shadow-yellow-100' : 'border-gray-200')}>
      
      <div className={clsx('flex items-center justify-between px-4 py-3', headerBg)}>
        <div>
          <p className="font-black text-sm uppercase truncate max-w-[140px]">{order.customer_name}</p>
          <p className="text-[10px] font-bold uppercase opacity-80 tracking-wider">{order.channel}</p>
        </div>
        {!isCompletado ? (
          <div className="flex items-center gap-1.5 font-mono text-xl font-black tracking-tighter">
            {urgente && <Flame className="w-5 h-5 animate-pulse" />}
            <Clock className="w-4 h-4 opacity-70" />
            {formatTimer(elapsed)}
          </div>
        ) : (
          <div className="flex items-center gap-1 font-black text-sm uppercase text-gray-400">
            <CheckCheck className="w-5 h-5" /> Listo
          </div>
        )}
      </div>

      <div className="p-4 space-y-3">
        {Array.isArray(order.items) && order.items.map((item: any, i: number) => {
          const prod = catalogo.find(p => p.id === item.id)
          return (
            <div key={i} className="flex items-start gap-3 border-b border-gray-50 pb-3 last:border-0 last:pb-0">
              <span className={clsx("shrink-0 w-7 h-7 rounded-lg flex items-center justify-center text-sm font-black", isCompletado ? "bg-gray-100 text-gray-500" : "bg-purple-100 text-purple-700")}>
                {item.quantity}
              </span>
              <div>
                <p className="font-bold text-sm text-gray-800 uppercase leading-tight pt-1">{item.name}</p>
                {prod?.description && (
                  <p className="text-[10px] text-gray-500 leading-tight mt-1 font-medium italic">
                    {prod.description}
                  </p>
                )}
              </div>
            </div>
          )
        })}
        {order.notes && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-xl px-3 py-2 mt-2">
            <p className="text-[10px] font-black text-yellow-700 uppercase tracking-widest mb-0.5">Nota</p>
            <p className="text-xs font-medium italic text-yellow-900 leading-tight">{order.notes}</p>
          </div>
        )}
      </div>

      {!isCompletado && (
        <div className="px-4 pb-4 mt-auto">
          <button 
            onClick={() => onAvanzar(order.id, order.status === 'Pendiente' ? 'En Proceso' : 'Listo')}
            disabled={actualizando}
            className={clsx('w-full py-3.5 rounded-xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 transition-transform active:scale-[0.98]', btnClass, actualizando && 'opacity-50 cursor-not-allowed')}
          >
            {actualizando ? 'PROCESANDO...' : (
              <>
                <CheckCircle className="w-4 h-4" />
                {order.status === 'Pendiente' ? 'Empezar a cocinar' : '¡Pedido Listo!'}
              </>
            )}
          </button>
        </div>
      )}
    </div>
  )
}

export default function CocinaKDS() {
  const [orders, setOrders]   = useState<Order[]>([])
  const [catalogo, setCatalogo] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [actualizando, setAct] = useState<string | null>(null)
  
  const [sucursalActual, setSucursalActual] = useState('todas')
  const [newAlert, setNewAlert] = useState(false)
  const prevCount = useRef(0)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  useEffect(() => {
    fetch('/api/products').then(r => r.json()).then(data => {
      setCatalogo(Array.isArray(data) ? data : [])
    })
  }, [])

  const cargar = useCallback(async () => {
    const sucursalActiva = typeof window !== 'undefined' ? localStorage.getItem('sucursal_activa') || 'todas' : 'todas'
    setSucursalActual(sucursalActiva)

    const res  = await fetch(`/api/orders?limit=100&location_id=${sucursalActiva}`)
    const data = await res.json()
    
    if (Array.isArray(data)) {
      const activos = data.filter((o: Order) => ['Pendiente', 'En Proceso', 'Listo', 'Entregado'].includes(o.status))
      
      const pendientesCount = activos.filter((o: Order) => o.status === 'Pendiente').length
      if (prevCount.current > 0 && pendientesCount > prevCount.current) {
        setNewAlert(true)
        setTimeout(() => setNewAlert(false), 5000)
        try {
          if (!audioRef.current) audioRef.current = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3')
          audioRef.current.play().catch(() => {})
        } catch {}
      }
      prevCount.current = pendientesCount
      setOrders(activos)
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    cargar()
    const id = setInterval(cargar, 15_000)
    return () => clearInterval(id)
  }, [cargar])

  const avanzar = async (id: string, nextStatus: string) => {
    setAct(id)
    try {
      const res = await fetch(`/api/orders/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: nextStatus }),
      })
      if (!res.ok) {
        console.error("Error al actualizar la orden en Supabase")
        alert("Hubo un error al avanzar el pedido. Intenta nuevamente.")
      }
    } catch (error) {
      console.error("Error de red", error)
    }
    setAct(null)
    cargar()
  }

  const pendientes   = orders.filter(o => o.status === 'Pendiente')
  const enProceso    = orders.filter(o => o.status === 'En Proceso')
  const completados  = orders.filter(o => o.status === 'Listo' || o.status === 'Entregado').slice(0, 12)

  return (
    <div className="h-full bg-gray-50 text-gray-800 overflow-y-auto min-h-screen">
      
      {newAlert && (
        <div className="fixed top-4 right-4 z-[100] bg-green-500 text-white px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-3 animate-bounce border-2 border-green-400">
          <Bell className="w-6 h-6" />
          <div>
            <p className="font-black text-lg uppercase">¡Nuevo Ticket!</p>
            <p className="text-xs font-medium opacity-90">Revisa la lista de pendientes</p>
          </div>
        </div>
      )}

      <div className="sticky top-0 z-10 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between shadow-sm">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center">
              <ChefHat className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <h1 className="font-display font-black text-2xl uppercase tracking-tight text-gray-800">KDS — Cocina</h1>
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-0.5">
                Sucursal: <span className="text-purple-600">{sucursalActual === 'todas' ? 'Global' : sucursalActual}</span>
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="hidden sm:flex items-center gap-4 bg-gray-50 px-4 py-2 rounded-xl border border-gray-100">
            <div className="text-center">
              <p className="text-xl font-black text-yellow-500 leading-none">{pendientes.length}</p>
              <p className="text-[9px] font-bold text-gray-400 uppercase tracking-wider mt-1">Pendientes</p>
            </div>
            <div className="w-px h-8 bg-gray-200"></div>
            <div className="text-center">
              <p className="text-xl font-black text-blue-500 leading-none">{enProceso.length}</p>
              <p className="text-[9px] font-bold text-gray-400 uppercase tracking-wider mt-1">En Proceso</p>
            </div>
          </div>
          <button onClick={cargar} className="p-3 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-all shadow-sm active:scale-95">
            <RefreshCw className={clsx("w-5 h-5 text-gray-600", loading && "animate-spin")} />
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-32">
          <div className="w-12 h-12 border-4 border-gray-200 border-t-purple-600 rounded-full animate-spin" />
        </div>
      ) : (
        <div className="p-6 space-y-8">
          
          {pendientes.length === 0 && enProceso.length === 0 ? (
             <div className="flex flex-col items-center justify-center py-20 text-gray-400 bg-white rounded-3xl border border-dashed border-gray-200">
              <div className="w-20 h-20 bg-green-50 rounded-full flex items-center justify-center mb-4">
                <CheckCircle className="w-10 h-10 text-green-500" />
              </div>
              <p className="text-xl font-black text-gray-700 uppercase tracking-tight">Todo al día</p>
              <p className="text-xs font-medium mt-1">Sin pedidos pendientes en cocina</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 items-start">
              {pendientes.map(o => <TarjetaPedido key={o.id} order={o} onAvanzar={avanzar} actualizando={actualizando === o.id} catalogo={catalogo} />)}
              {enProceso.map(o => <TarjetaPedido key={o.id} order={o} onAvanzar={avanzar} actualizando={actualizando === o.id} catalogo={catalogo} />)}
            </div>
          )}

          {completados.length > 0 && (
            <div className="pt-8 border-t border-gray-200">
              <h2 className="text-sm font-black text-gray-400 uppercase tracking-widest mb-6 flex items-center gap-2">
                <CheckCheck className="w-4 h-4" /> Entregados Recientemente
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 items-start opacity-80">
                {completados.map(o => <TarjetaPedido key={o.id} order={o} onAvanzar={avanzar} actualizando={actualizando === o.id} catalogo={catalogo} />)}
              </div>
            </div>
          )}

        </div>
      )}
    </div>
  )
}