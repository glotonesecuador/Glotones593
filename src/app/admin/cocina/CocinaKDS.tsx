'use client'

import { useState, useEffect, useCallback } from 'react'
import { RefreshCw, CheckCircle, Flame, Clock } from 'lucide-react'
import type { Order } from '@/types'
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

function TarjetaPedido({ order, onAvanzar }: { order: Order; onAvanzar: (id: string) => void }) {
  const elapsed   = useTimer(order.created_at)
  const urgente   = elapsed > 10 * 60
  const advertencia = elapsed > 5 * 60

  return (
    <div className={clsx('bg-white rounded-2xl overflow-hidden border-2 transition-all',
      urgente ? 'border-red-400' : advertencia ? 'border-yellow-400' : 'border-gray-700')}>
      <div className={clsx('flex items-center justify-between px-4 py-3',
        urgente ? 'bg-red-500 text-white' : advertencia ? 'bg-yellow-400 text-white' :
        order.status === 'En Proceso' ? 'bg-blue-500 text-white' : 'bg-gray-800 text-white')}>
        <div>
          <p className="font-bold text-sm">{order.customer_name}</p>
          <p className="text-xs opacity-80">{order.channel}</p>
        </div>
        <div className="flex items-center gap-1 font-mono text-lg font-black">
          {urgente && <Flame className="w-5 h-5" />}
          <Clock className="w-4 h-4" />
          {formatTimer(elapsed)}
        </div>
      </div>

      <div className="p-4 space-y-2">
        {Array.isArray(order.items) && order.items.map((item: any, i: number) => (
          <div key={i} className="flex items-center gap-3">
            <span className="shrink-0 w-7 h-7 bg-gray-900 text-white rounded-lg flex items-center justify-center text-sm font-black">
              {item.quantity}
            </span>
            <p className="font-semibold text-gray-800">{item.name}</p>
          </div>
        ))}
        {order.notes && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-xl px-3 py-2 mt-2">
            <p className="text-xs font-semibold text-yellow-700 mb-0.5">NOTA</p>
            <p className="text-sm text-yellow-800">{order.notes}</p>
          </div>
        )}
      </div>

      <div className="px-4 pb-4">
        <button onClick={() => onAvanzar(order.id)}
          className={clsx('w-full py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all active:scale-[0.98]',
            order.status === 'Pendiente' ? 'bg-blue-500 hover:bg-blue-600 text-white' : 'bg-green-500 hover:bg-green-600 text-white')}>
          <CheckCircle className="w-4 h-4" />
          {order.status === 'Pendiente' ? 'Empezar a cocinar' : 'Marcar como Listo'}
        </button>
      </div>
    </div>
  )
}

export default function CocinaKDS() {
  const [orders, setOrders]   = useState<Order[]>([])
  const [loading, setLoading] = useState(true)

  const cargar = useCallback(async () => {
    const res  = await fetch('/api/orders?limit=100')
    const data = await res.json()
    if (Array.isArray(data)) {
      setOrders(data.filter((o: Order) => o.status === 'Pendiente' || o.status === 'En Proceso'))
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    cargar()
    const id = setInterval(cargar, 15_000)
    return () => clearInterval(id)
  }, [cargar])

  const avanzar = async (id: string) => {
    const order = orders.find(o => o.id === id)
    if (!order) return
    const next = order.status === 'Pendiente' ? 'En Proceso' : 'Listo'
    await fetch(`/api/orders/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: next }),
    })
    cargar()
  }

  const pendientes   = orders.filter(o => o.status === 'Pendiente')
  const enProceso    = orders.filter(o => o.status === 'En Proceso')

  return (
    <div className="h-full bg-gray-950 text-white overflow-y-auto">
      <div className="sticky top-0 z-10 bg-gray-900 border-b border-gray-800 px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
          <h1 className="font-display font-black text-xl">KDS — Cocina</h1>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-400">
            <span className="text-yellow-400 font-bold">{pendientes.length}</span> pendientes ·{' '}
            <span className="text-blue-400 font-bold">{enProceso.length}</span> en proceso
          </span>
          <button onClick={cargar} className="p-2 rounded-lg bg-gray-800 hover:bg-gray-700">
            <RefreshCw className="w-4 h-4 text-gray-400" />
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-24">
          <div className="w-10 h-10 border-4 border-gray-700 border-t-green-400 rounded-full animate-spin" />
        </div>
      ) : orders.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-gray-600">
          <CheckCircle className="w-16 h-16 mb-4" />
          <p className="text-xl font-bold">Todo al día</p>
          <p className="text-sm mt-1">No hay pedidos pendientes</p>
        </div>
      ) : (
        <div className="p-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {pendientes.map(o => <TarjetaPedido key={o.id} order={o} onAvanzar={avanzar} />)}
          {enProceso.map(o => <TarjetaPedido key={o.id} order={o} onAvanzar={avanzar} />)}
        </div>
      )}
    </div>
  )
}
