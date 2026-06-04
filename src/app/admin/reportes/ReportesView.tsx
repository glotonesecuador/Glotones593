'use client'

import { useState, useEffect } from 'react'
import { Download, TrendingUp, ShoppingBag, DollarSign, BarChart3, Users, Crown, Gift } from 'lucide-react'

export default function ReportesView() {
  const [orders, setOrders]     = useState<any[]>([])
  const [expenses, setExpenses] = useState<any[]>([])
  const [clientes, setClientes] = useState<any[]>([])
  const [loading, setLoading]   = useState(true)
  const [periodo, setPeriodo]   = useState(new Date().toISOString().slice(0, 7))

  useEffect(() => {
    Promise.all([
      fetch('/api/orders?limit=2000').then(r => r.json()),
      fetch('/api/expenses').then(r => r.json()),
      fetch('/api/customers').then(r => r.json()),
    ]).then(([o, e, c]) => {
      setOrders(Array.isArray(o) ? o : [])
      setExpenses(Array.isArray(e) ? e : [])
      setClientes(Array.isArray(c) ? c : [])
      setLoading(false)
    })
  }, [])

  const [year, month] = periodo.split('-').map(Number)

  const ordenesPeriodo = orders.filter(o => {
    if (o.status === 'Cancelado') return false
    const d = new Date(o.created_at)
    return d.getFullYear() === year && (d.getMonth() + 1) === month
  })

  const gastosPeriodo = expenses.filter(e => {
    const d = new Date(e.date)
    return d.getFullYear() === year && (d.getMonth() + 1) === month
  })

  const totalVentas = ordenesPeriodo.reduce((a, o) => a + Number(o.total), 0)
  const totalGastos = gastosPeriodo.reduce((a, e) => a + Number(e.amount), 0)
  const neto        = totalVentas - totalGastos
  const ticketProm  = ordenesPeriodo.length > 0 ? totalVentas / ordenesPeriodo.length : 0

  const porCanal = ordenesPeriodo.reduce((acc: any, o) => {
    acc[o.channel] = (acc[o.channel] ?? 0) + Number(o.total)
    return acc
  }, {})

  const porDia = ordenesPeriodo.reduce((acc: any, o) => {
    const d = new Date(o.created_at).toLocaleDateString('es-EC', { day: '2-digit', month: '2-digit' })
    acc[d] = (acc[d] ?? 0) + Number(o.total)
    return acc
  }, {})

  const productosMap: Record<string, { name: string; qty: number; total: number }> = {}
  ordenesPeriodo.forEach(o => {
    if (Array.isArray(o.items)) {
      o.items.forEach((item: any) => {
        if (!productosMap[item.name]) productosMap[item.name] = { name: item.name, qty: 0, total: 0 }
        productosMap[item.name].qty   += item.quantity
        productosMap[item.name].total += item.price * item.quantity
      })
    }
  })
  const topProductos = Object.values(productosMap).sort((a, b) => b.qty - a.qty).slice(0, 10)

  // Stats de lealtad
  const topClientes  = [...clientes].sort((a, b) => b.total_spent - a.total_spent).slice(0, 10)
  const totalPuntos  = clientes.reduce((a, c) => a + (c.points ?? 0), 0)
  const clientesOro  = clientes.filter(c => c.loyalty === 'Oro').length
  const clientesPlata = clientes.filter(c => c.loyalty === 'Plata').length

  const exportarCSV = () => {
    const headers = ['Fecha', 'Cliente', 'Teléfono', 'Canal', 'Método', 'Items', 'Total']
    const filas = ordenesPeriodo.map(o => [
      new Date(o.created_at).toLocaleDateString('es-EC'),
      o.customer_name, o.phone ?? '', o.channel, o.method ?? '',
      Array.isArray(o.items) ? o.items.map((i: any) => `${i.name}x${i.quantity}`).join(' | ') : '',
      Number(o.total).toFixed(2),
    ])
    const csv  = [headers, ...filas].map(r => r.join(',')).join('\n')
    const link = document.createElement('a')
    link.href     = 'data:text/csv;charset=utf-8,' + encodeURIComponent(csv)
    link.download = `reporte-${periodo}.csv`
    link.click()
  }

  if (loading) return (
    <div className="flex items-center justify-center h-full">
      <div className="w-8 h-8 border-4 border-gray-200 border-t-purple-500 rounded-full animate-spin" />
    </div>
  )

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="font-display font-black text-2xl text-gray-800">Reportes</h1>
        <div className="flex gap-3">
          <input type="month" value={periodo} onChange={e => setPeriodo(e.target.value)} className="input-field text-sm w-40" />
          <button onClick={exportarCSV} className="btn-brand flex items-center gap-2 text-sm">
            <Download className="w-4 h-4" /> Exportar CSV
          </button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Ventas brutas',   value: `$${totalVentas.toFixed(2)}`, icon: TrendingUp,  color: 'text-green-600',  bg: 'bg-green-50'  },
          { label: 'Pedidos',         value: ordenesPeriodo.length,          icon: ShoppingBag, color: 'text-blue-600',   bg: 'bg-blue-50'   },
          { label: 'Ticket promedio', value: `$${ticketProm.toFixed(2)}`,  icon: BarChart3,   color: 'text-purple-600', bg: 'bg-purple-50' },
          { label: 'Utilidad neta',   value: `$${neto.toFixed(2)}`,         icon: DollarSign,  color: neto >= 0 ? 'text-emerald-600' : 'text-red-600', bg: neto >= 0 ? 'bg-emerald-50' : 'bg-red-50' },
        ].map(s => {
          const Icon = s.icon
          return (
            <div key={s.label} className={`card flex items-center gap-3 ${s.bg}`}>
              <Icon className={`w-8 h-8 shrink-0 ${s.color}`} />
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{s.label}</p>
                <p className={`font-display font-black text-xl ${s.color}`}>{s.value}</p>
              </div>
            </div>
          )
        })}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Ventas por canal */}
        <div className="card">
          <h2 className="font-bold text-gray-700 mb-4">Ventas por canal</h2>
          <div className="space-y-3">
            {Object.entries(porCanal).sort(([, a]: any, [, b]: any) => b - a).map(([canal, total]: any) => {
              const pct = totalVentas > 0 ? (total / totalVentas) * 100 : 0
              return (
                <div key={canal}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="font-medium text-gray-700">{canal}</span>
                    <span className="font-bold text-gray-800">${total.toFixed(2)} <span className="text-gray-400 font-normal">({pct.toFixed(1)}%)</span></span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full bg-purple-500 rounded-full" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              )
            })}
            {Object.keys(porCanal).length === 0 && <p className="text-gray-400 text-sm text-center py-4">Sin datos</p>}
          </div>
        </div>

        {/* Top productos */}
        <div className="card">
          <h2 className="font-bold text-gray-700 mb-4">Productos más vendidos</h2>
          <div className="space-y-2">
            {topProductos.map((p, i) => (
              <div key={p.name} className="flex items-center gap-3 py-1.5">
                <span className="w-6 h-6 rounded-full bg-purple-100 text-purple-700 text-xs font-black flex items-center justify-center shrink-0">{i + 1}</span>
                <span className="flex-1 text-sm font-medium text-gray-700 truncate">{p.name}</span>
                <span className="text-xs text-gray-500">{p.qty} uds</span>
                <span className="text-sm font-bold text-gray-800 w-20 text-right">${p.total.toFixed(2)}</span>
              </div>
            ))}
            {topProductos.length === 0 && <p className="text-gray-400 text-sm text-center py-4">Sin datos</p>}
          </div>
        </div>
      </div>

      {/* Ventas por día */}
      <div className="card">
        <h2 className="font-bold text-gray-700 mb-4">Ventas por día</h2>
        <div className="overflow-x-auto">
          <div className="flex gap-2 min-w-max pb-2">
            {Object.entries(porDia).map(([dia, total]: any) => {
              const maxVal = Math.max(...Object.values(porDia) as number[])
              const height = maxVal > 0 ? Math.max((total / maxVal) * 80, 4) : 4
              return (
                <div key={dia} className="flex flex-col items-center gap-1 w-12">
                  <span className="text-xs font-bold text-gray-700">${total.toFixed(0)}</span>
                  <div className="w-8 bg-purple-500 rounded-t-lg" style={{ height: `${height}px` }} />
                  <span className="text-xs text-gray-400">{dia}</span>
                </div>
              )
            })}
            {Object.keys(porDia).length === 0 && <p className="text-gray-400 text-sm py-4">Sin datos este período</p>}
          </div>
        </div>
      </div>

      {/* ── LEALTAD & CLIENTES ─────────────────────── */}
      <div className="border-t pt-6">
        <h2 className="font-display font-black text-xl text-gray-800 mb-4 flex items-center gap-2">
          <Gift className="w-6 h-6 text-purple-500" /> Programa de Lealtad
        </h2>

        {/* Stats lealtad */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {[
            { label: 'Total clientes', value: clientes.length,    icon: Users,  bg: 'bg-purple-50', color: 'text-purple-600' },
            { label: 'Nivel Oro',      value: clientesOro,        icon: Crown,  bg: 'bg-yellow-50', color: 'text-yellow-600' },
            { label: 'Nivel Plata',    value: clientesPlata,      icon: Crown,  bg: 'bg-gray-50',   color: 'text-gray-600'   },
            { label: 'Puntos emitidos',value: totalPuntos,        icon: Gift,   bg: 'bg-pink-50',   color: 'text-pink-600'   },
          ].map(s => {
            const Icon = s.icon
            return (
              <div key={s.label} className={`card flex items-center gap-3 ${s.bg}`}>
                <Icon className={`w-7 h-7 shrink-0 ${s.color}`} />
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{s.label}</p>
                  <p className={`font-display font-black text-xl ${s.color}`}>{s.value}</p>
                </div>
              </div>
            )
          })}
        </div>

        {/* Top clientes */}
        <div className="card">
          <h3 className="font-bold text-gray-700 mb-4">Top 10 clientes por consumo</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b text-left text-xs uppercase text-gray-500">
                  <th className="px-4 py-2">#</th>
                  <th className="px-4 py-2">Cliente</th>
                  <th className="px-4 py-2">Teléfono</th>
                  <th className="px-4 py-2">Pedidos</th>
                  <th className="px-4 py-2">Total gastado</th>
                  <th className="px-4 py-2">Puntos</th>
                  <th className="px-4 py-2">Nivel</th>
                  <th className="px-4 py-2">Último pedido</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {topClientes.map((c, i) => (
                  <tr key={c.phone} className="hover:bg-gray-50">
                    <td className="px-4 py-2">
                      <span className="w-6 h-6 rounded-full bg-purple-100 text-purple-700 text-xs font-black flex items-center justify-center">{i + 1}</span>
                    </td>
                    <td className="px-4 py-2 font-semibold text-gray-800">{c.name ?? 'Sin nombre'}</td>
                    <td className="px-4 py-2 text-gray-500">{c.phone}</td>
                    <td className="px-4 py-2 text-gray-700">{c.order_count}</td>
                    <td className="px-4 py-2 font-bold text-purple-600">${Number(c.total_spent).toFixed(2)}</td>
                    <td className="px-4 py-2 font-bold text-gray-700">{c.points} pts</td>
                    <td className="px-4 py-2">
                      <span className={`badge text-xs ${
                        c.loyalty === 'Oro'   ? 'bg-yellow-100 text-yellow-700' :
                        c.loyalty === 'Plata' ? 'bg-gray-100 text-gray-600' :
                                                'bg-orange-100 text-orange-600'
                      }`}>
                        {c.loyalty === 'Oro' ? '🥇' : c.loyalty === 'Plata' ? '🥈' : '🥉'} {c.loyalty}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-gray-400 text-xs">
                      {c.last_order ? new Date(c.last_order).toLocaleDateString('es-EC') : 'Nunca'}
                    </td>
                  </tr>
                ))}
                {topClientes.length === 0 && (
                  <tr><td colSpan={8} className="px-4 py-8 text-center text-gray-400">Sin clientes registrados</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}