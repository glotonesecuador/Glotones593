'use client'

import { useState, useEffect } from 'react'
import { TrendingUp, TrendingDown, DollarSign, ShoppingBag, Download, Plus, X } from 'lucide-react'

export default function FinanzasView() {
  const [orders, setOrders]     = useState<any[]>([])
  const [expenses, setExpenses] = useState<any[]>([])
  const [loading, setLoading]   = useState(true)
  const [periodo, setPeriodo]   = useState(new Date().toISOString().slice(0, 7))
  const [modalGasto, setModalGasto] = useState(false)
  const [guardando, setGuardando]   = useState(false)

  const cargar = () => {
    Promise.all([
      fetch('/api/orders?limit=1000').then(r => r.json()),
      fetch('/api/expenses').then(r => r.json()),
    ]).then(([o, e]) => {
      setOrders(Array.isArray(o) ? o : [])
      setExpenses(Array.isArray(e) ? e : [])
      setLoading(false)
    })
  }

  useEffect(() => { cargar() }, [])

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

  const totalVentas  = ordenesPeriodo.reduce((a, o) => a + Number(o.total), 0)
  const totalGastos  = gastosPeriodo.reduce((a, e) => a + Number(e.amount), 0)
  const neto         = totalVentas - totalGastos

  const stats = [
    { label: 'Ventas',   value: `$${totalVentas.toFixed(2)}`,  icon: TrendingUp,  color: 'text-green-600',  bg: 'bg-green-50'  },
    { label: 'Gastos',   value: `$${totalGastos.toFixed(2)}`,  icon: TrendingDown,color: 'text-red-600',    bg: 'bg-red-50'    },
    { label: 'Neto',     value: `$${neto.toFixed(2)}`,          icon: DollarSign,  color: neto >= 0 ? 'text-blue-600' : 'text-red-700', bg: neto >= 0 ? 'bg-blue-50' : 'bg-red-50' },
    { label: 'Pedidos',  value: ordenesPeriodo.length,           icon: ShoppingBag, color: 'text-purple-600', bg: 'bg-purple-50' },
  ]

  const guardarGasto = async (e: React.FormEvent) => {
    e.preventDefault()
    const fd = new FormData(e.target as HTMLFormElement)
    setGuardando(true)
    await fetch('/api/expenses', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        concept: fd.get('concept'),
        amount:  fd.get('amount'),
        type:    fd.get('type'),
        date:    fd.get('date'),
      }),
    })
    setGuardando(false)
    setModalGasto(false)
    cargar()
  }

  const exportarCSV = () => {
    const headers = ['Fecha', 'Cliente', 'Canal', 'Método', 'Total']
    const filas = ordenesPeriodo.map(o => [
      new Date(o.created_at).toLocaleDateString('es-EC'),
      o.customer_name, o.channel, o.method,
      Number(o.total).toFixed(2),
    ])
    const csv = [headers, ...filas].map(r => r.join(',')).join('\n')
    const link = document.createElement('a')
    link.href = 'data:text/csv;charset=utf-8,' + encodeURIComponent(csv)
    link.download = `ventas-${periodo}.csv`
    link.click()
  }

  if (loading) return (
    <div className="flex items-center justify-center h-full">
      <div className="w-8 h-8 border-4 border-gray-200 border-t-purple-500 rounded-full animate-spin" />
    </div>
  )

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="font-display font-black text-2xl text-gray-800">Finanzas</h1>
        <div className="flex items-center gap-3">
          <input type="month" value={periodo} onChange={e => setPeriodo(e.target.value)} className="input-field text-sm w-40" />
          <button onClick={exportarCSV} className="btn-ghost flex items-center gap-2 text-sm">
            <Download className="w-4 h-4" /> CSV
          </button>
          <button onClick={() => setModalGasto(true)} className="btn-brand flex items-center gap-2 text-sm">
            <Plus className="w-4 h-4" /> Gasto
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map(s => {
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
        <div className="card">
          <h2 className="font-bold text-gray-700 mb-4">Ventas del período</h2>
          <div className="overflow-x-auto max-h-80 overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-white">
                <tr className="border-b text-left text-gray-500 text-xs uppercase">
                  <th className="pb-2 pr-3">Cliente</th>
                  <th className="pb-2 pr-3">Canal</th>
                  <th className="pb-2 pr-3">Fecha</th>
                  <th className="pb-2 text-right">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {ordenesPeriodo.slice(0, 100).map(o => (
                  <tr key={o.id} className="hover:bg-gray-50">
                    <td className="py-2 pr-3 font-medium">{o.customer_name}</td>
                    <td className="py-2 pr-3 text-gray-500 text-xs">{o.channel}</td>
                    <td className="py-2 pr-3 text-gray-400 text-xs">{new Date(o.created_at).toLocaleDateString('es-EC')}</td>
                    <td className="py-2 text-right font-bold text-purple-600">${Number(o.total).toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="card">
          <h2 className="font-bold text-gray-700 mb-4">Gastos del período</h2>
          <div className="overflow-x-auto max-h-80 overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-white">
                <tr className="border-b text-left text-gray-500 text-xs uppercase">
                  <th className="pb-2 pr-3">Concepto</th>
                  <th className="pb-2 pr-3">Tipo</th>
                  <th className="pb-2 pr-3">Fecha</th>
                  <th className="pb-2 text-right">Monto</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {gastosPeriodo.map(e => (
                  <tr key={e.id} className="hover:bg-gray-50">
                    <td className="py-2 pr-3 font-medium">{e.concept}</td>
                    <td className="py-2 pr-3 text-gray-500 text-xs">{e.type}</td>
                    <td className="py-2 pr-3 text-gray-400 text-xs">{new Date(e.date).toLocaleDateString('es-EC')}</td>
                    <td className="py-2 text-right font-bold text-red-500">-${Number(e.amount).toFixed(2)}</td>
                  </tr>
                ))}
                {gastosPeriodo.length === 0 && (
                  <tr><td colSpan={4} className="py-6 text-center text-gray-400 text-sm">Sin gastos este período</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {modalGasto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-bold text-gray-800 text-lg">Registrar Gasto</h3>
              <button onClick={() => setModalGasto(false)}><X className="w-5 h-5 text-gray-400" /></button>
            </div>
            <form onSubmit={guardarGasto} className="space-y-4">
              <input name="concept" placeholder="Concepto" className="input-field" required />
              <div className="grid grid-cols-2 gap-3">
                <input name="amount" type="number" step="0.01" placeholder="Monto $" className="input-field" required />
                <select name="type" className="input-field">
                  <option>Operativo</option>
                  <option>Insumos</option>
                  <option>Nómina</option>
                  <option>Servicios</option>
                  <option>Otros</option>
                </select>
              </div>
              <input name="date" type="date" defaultValue={new Date().toISOString().split('T')[0]} className="input-field" required />
              <button type="submit" disabled={guardando} className="w-full btn-brand py-3 disabled:opacity-60">
                {guardando ? 'Guardando...' : 'Guardar Gasto'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
