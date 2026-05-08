'use client'

import { useState, useEffect } from 'react'
import { Plus, X, Truck } from 'lucide-react'
import type { Ingredient, Purchase } from '@/types'

export default function ComprasView() {
  const [compras, setCompras]         = useState<Purchase[]>([])
  const [ingredientes, setIngredientes] = useState<Ingredient[]>([])
  const [loading, setLoading]         = useState(true)
  const [modal, setModal]             = useState(false)
  const [guardando, setGuardando]     = useState(false)
  const [periodo, setPeriodo]         = useState(new Date().toISOString().slice(0, 7))

  const cargar = async () => {
    const [c, i] = await Promise.all([
      fetch('/api/purchases').then(r => r.json()),
      fetch('/api/ingredients').then(r => r.json()),
    ])
    if (Array.isArray(c)) setCompras(c)
    if (Array.isArray(i)) setIngredientes(i)
    setLoading(false)
  }

  useEffect(() => { cargar() }, [])

  const guardar = async (e: React.FormEvent) => {
    e.preventDefault()
    const fd = new FormData(e.target as HTMLFormElement)
    setGuardando(true)
    const qty   = Number(fd.get('quantity'))
    const total = Number(fd.get('total_cost'))
    await fetch('/api/purchases', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ingredient_id: fd.get('ingredient_id'),
        quantity:      qty,
        total_cost:    total,
        unit_cost:     qty > 0 ? total / qty : 0,
        supplier:      fd.get('supplier'),
        date:          fd.get('date'),
      }),
    })
    setGuardando(false)
    setModal(false)
    cargar()
  }

  const [year, month] = periodo.split('-').map(Number)
  const filtradas = compras.filter(c => {
    const d = new Date(c.date)
    return d.getFullYear() === year && (d.getMonth() + 1) === month
  })

  const totalMes = filtradas.reduce((a, c) => a + Number(c.total_cost), 0)

  if (loading) return (
    <div className="flex items-center justify-center h-full">
      <div className="w-8 h-8 border-4 border-gray-200 border-t-purple-500 rounded-full animate-spin" />
    </div>
  )

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-display font-black text-2xl text-gray-800">Compras</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Total del mes: <strong className="text-red-500">${totalMes.toFixed(2)}</strong>
          </p>
        </div>
        <div className="flex gap-3">
          <input type="month" value={periodo} onChange={e => setPeriodo(e.target.value)} className="input-field text-sm w-40" />
          <button onClick={() => setModal(true)} className="btn-brand flex items-center gap-2 text-sm">
            <Plus className="w-4 h-4" /> Registrar compra
          </button>
        </div>
      </div>

      <div className="card overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b text-left text-xs uppercase text-gray-500">
                <th className="px-4 py-3">Ingrediente</th>
                <th className="px-4 py-3">Cantidad</th>
                <th className="px-4 py-3">Costo unitario</th>
                <th className="px-4 py-3">Proveedor</th>
                <th className="px-4 py-3">Fecha</th>
                <th className="px-4 py-3 text-right">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtradas.map(c => {
                const ing = ingredientes.find(i => i.id === c.ingredient_id)
                return (
                  <tr key={c.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Truck className="w-4 h-4 text-gray-400 shrink-0" />
                        <span className="font-semibold text-gray-800">{ing?.name ?? 'Ingrediente eliminado'}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{Number(c.quantity).toFixed(2)} {ing?.unit ?? ''}</td>
                    <td className="px-4 py-3 text-gray-600">${Number(c.unit_cost ?? 0).toFixed(4)}</td>
                    <td className="px-4 py-3 text-gray-500">{c.supplier ?? '—'}</td>
                    <td className="px-4 py-3 text-gray-500 text-xs">{new Date(c.date).toLocaleDateString('es-EC')}</td>
                    <td className="px-4 py-3 text-right font-bold text-red-500">-${Number(c.total_cost).toFixed(2)}</td>
                  </tr>
                )
              })}
              {filtradas.length === 0 && (
                <tr><td colSpan={6} className="px-4 py-12 text-center text-gray-400">No hay compras este período</td></tr>
              )}
            </tbody>
            {filtradas.length > 0 && (
              <tfoot>
                <tr className="bg-gray-50 border-t">
                  <td colSpan={5} className="px-4 py-3 font-bold text-gray-700">Total del período</td>
                  <td className="px-4 py-3 text-right font-black text-red-600 text-base">-${totalMes.toFixed(2)}</td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>

      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-bold text-gray-800 text-lg">Registrar Compra</h3>
              <button onClick={() => setModal(false)}><X className="w-5 h-5 text-gray-400" /></button>
            </div>
            <form onSubmit={guardar} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5 block">Ingrediente *</label>
                <select name="ingredient_id" className="input-field" required>
                  <option value="">Seleccionar ingrediente...</option>
                  {ingredientes.map(i => (
                    <option key={i.id} value={i.id}>{i.name} ({i.unit})</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5 block">Cantidad *</label>
                  <input name="quantity" type="number" step="0.01" min="0.01" placeholder="0.00" className="input-field" required />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5 block">Costo total $*</label>
                  <input name="total_cost" type="number" step="0.01" min="0" placeholder="0.00" className="input-field" required />
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5 block">Proveedor</label>
                <input name="supplier" placeholder="Nombre del proveedor" className="input-field" />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5 block">Fecha *</label>
                <input name="date" type="date" defaultValue={new Date().toISOString().split('T')[0]} className="input-field" required />
              </div>
              <div className="bg-blue-50 rounded-xl p-3 text-xs text-blue-600">
                💡 Al registrar la compra, el stock del ingrediente se actualizará automáticamente.
              </div>
              <button type="submit" disabled={guardando} className="w-full btn-brand py-3 disabled:opacity-60">
                {guardando ? 'Guardando...' : 'Registrar compra'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
