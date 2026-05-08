'use client'

import { useState, useEffect } from 'react'
import { Plus, Edit, Trash2, X, AlertTriangle, Package } from 'lucide-react'
import type { Ingredient } from '@/types'
import clsx from 'clsx'

const UNIDADES = ['und', 'kg', 'g', 'lb', 'lt', 'ml', 'oz', 'caja', 'bolsa', 'rollo']

export default function InventarioView() {
  const [items, setItems]         = useState<Ingredient[]>([])
  const [loading, setLoading]     = useState(true)
  const [modal, setModal]         = useState(false)
  const [editando, setEditando]   = useState<Ingredient | null>(null)
  const [guardando, setGuardando] = useState(false)
  const [busqueda, setBusqueda]   = useState('')
  const [filtro, setFiltro]       = useState<'todos' | 'bajo' | 'ok'>('todos')

  const cargar = async () => {
    const res  = await fetch('/api/ingredients')
    const data = await res.json()
    if (Array.isArray(data)) setItems(data)
    setLoading(false)
  }

  useEffect(() => { cargar() }, [])

  const guardar = async (e: React.FormEvent) => {
    e.preventDefault()
    const fd = new FormData(e.target as HTMLFormElement)
    setGuardando(true)
    const body = {
      name:      fd.get('name'),
      unit:      fd.get('unit'),
      cost:      fd.get('cost'),
      stock:     fd.get('stock'),
      min_stock: fd.get('min_stock'),
    }
    const url    = editando ? `/api/ingredients/${editando.id}` : '/api/ingredients'
    const method = editando ? 'PUT' : 'POST'
    await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    setGuardando(false)
    setModal(false)
    cargar()
  }

  const eliminar = async (id: string) => {
    if (!confirm('¿Eliminar este ingrediente?')) return
    await fetch(`/api/ingredients/${id}`, { method: 'DELETE' })
    cargar()
  }

  const filtrados = items.filter(i => {
    if (busqueda && !i.name.toLowerCase().includes(busqueda.toLowerCase())) return false
    if (filtro === 'bajo' && i.stock > i.min_stock) return false
    if (filtro === 'ok'   && i.stock <= i.min_stock) return false
    return true
  })

  const bajoStock = items.filter(i => i.stock <= i.min_stock).length

  if (loading) return (
    <div className="flex items-center justify-center h-full">
      <div className="w-8 h-8 border-4 border-gray-200 border-t-purple-500 rounded-full animate-spin" />
    </div>
  )

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-display font-black text-2xl text-gray-800">Inventario</h1>
          {bajoStock > 0 && (
            <p className="text-sm text-red-500 flex items-center gap-1 mt-0.5">
              <AlertTriangle className="w-4 h-4" />
              {bajoStock} ingrediente{bajoStock > 1 ? 's' : ''} con stock bajo
            </p>
          )}
        </div>
        <button onClick={() => { setEditando(null); setModal(true) }} className="btn-brand flex items-center gap-2 text-sm">
          <Plus className="w-4 h-4" /> Nuevo ingrediente
        </button>
      </div>

      <div className="flex gap-3 flex-wrap">
        <input value={busqueda} onChange={e => setBusqueda(e.target.value)}
          placeholder="Buscar ingrediente..." className="input-field flex-1 min-w-48" />
        <div className="flex gap-2">
          {[{ v: 'todos', l: 'Todos' }, { v: 'bajo', l: '⚠ Bajo stock' }, { v: 'ok', l: '✓ Normal' }].map(f => (
            <button key={f.v} onClick={() => setFiltro(f.v as any)}
              className={clsx('px-3 py-1.5 rounded-xl text-xs font-semibold transition-all',
                filtro === f.v ? 'bg-purple-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200')}>
              {f.l}
            </button>
          ))}
        </div>
      </div>

      <div className="card overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b text-left text-xs uppercase text-gray-500">
                <th className="px-4 py-3">Ingrediente</th>
                <th className="px-4 py-3">Unidad</th>
                <th className="px-4 py-3">Stock actual</th>
                <th className="px-4 py-3">Mínimo</th>
                <th className="px-4 py-3">Costo</th>
                <th className="px-4 py-3">Estado</th>
                <th className="px-4 py-3 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtrados.map(item => {
                const bajo = item.stock <= item.min_stock
                return (
                  <tr key={item.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Package className="w-4 h-4 text-gray-400 shrink-0" />
                        <span className="font-semibold text-gray-800">{item.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{item.unit}</td>
                    <td className="px-4 py-3">
                      <span className={clsx('font-bold', bajo ? 'text-red-500' : 'text-gray-800')}>
                        {Number(item.stock).toFixed(2)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-500">{Number(item.min_stock).toFixed(2)}</td>
                    <td className="px-4 py-3 text-gray-600">${Number(item.cost).toFixed(4)}</td>
                    <td className="px-4 py-3">
                      {bajo
                        ? <span className="badge bg-red-100 text-red-600">⚠ Bajo</span>
                        : <span className="badge bg-green-100 text-green-600">✓ OK</span>}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-2">
                        <button onClick={() => { setEditando(item); setModal(true) }} className="p-1.5 rounded-lg hover:bg-blue-50 text-blue-500">
                          <Edit className="w-4 h-4" />
                        </button>
                        <button onClick={() => eliminar(item.id)} className="p-1.5 rounded-lg hover:bg-red-50 text-red-500">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
              {filtrados.length === 0 && (
                <tr><td colSpan={7} className="px-4 py-12 text-center text-gray-400">No hay ingredientes registrados</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-bold text-gray-800 text-lg">{editando ? 'Editar ingrediente' : 'Nuevo ingrediente'}</h3>
              <button onClick={() => setModal(false)}><X className="w-5 h-5 text-gray-400" /></button>
            </div>
            <form onSubmit={guardar} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5 block">Nombre *</label>
                <input name="name" defaultValue={editando?.name} placeholder="Ej: Carne de res" className="input-field" required />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5 block">Unidad *</label>
                  <select name="unit" defaultValue={editando?.unit ?? 'und'} className="input-field">
                    {UNIDADES.map(u => <option key={u} value={u}>{u}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5 block">Costo $</label>
                  <input name="cost" type="number" step="0.0001" min="0" defaultValue={editando?.cost ?? 0} className="input-field" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5 block">Stock actual</label>
                  <input name="stock" type="number" step="0.01" min="0" defaultValue={editando?.stock ?? 0} className="input-field" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5 block">Stock mínimo</label>
                  <input name="min_stock" type="number" step="0.01" min="0" defaultValue={editando?.min_stock ?? 5} className="input-field" />
                </div>
              </div>
              <button type="submit" disabled={guardando} className="w-full btn-brand py-3 disabled:opacity-60">
                {guardando ? 'Guardando...' : editando ? 'Actualizar' : 'Crear ingrediente'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
