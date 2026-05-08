'use client'

import { useState, useEffect } from 'react'
import { Plus, X, ChefHat, Trash2 } from 'lucide-react'
import type { Product, Ingredient } from '@/types'
import clsx from 'clsx'

interface RecipeItem { ingredient_id: string; quantity: number; ingredient?: Ingredient }
interface ProductWithCost extends Product { recipe?: RecipeItem[]; cost?: number; margin?: number }

export default function CostosView() {
  const [products, setProducts]       = useState<ProductWithCost[]>([])
  const [ingredients, setIngredients] = useState<Ingredient[]>([])
  const [loading, setLoading]         = useState(true)
  const [selected, setSelected]       = useState<ProductWithCost | null>(null)
  const [recipe, setRecipe]           = useState<RecipeItem[]>([])
  const [guardando, setGuardando]     = useState(false)
  const [busqueda, setBusqueda]       = useState('')

  const cargar = async () => {
    const [p, i, r] = await Promise.all([
      fetch('/api/products?admin=1').then(res => res.json()),
      fetch('/api/ingredients').then(res => res.json()),
      fetch('/api/recipes').then(res => res.json()),
    ])
    const prods: Product[]       = Array.isArray(p) ? p : []
    const ings: Ingredient[]     = Array.isArray(i) ? i : []
    const recs: any[]            = Array.isArray(r) ? r : []

    const withCost: ProductWithCost[] = prods.map(prod => {
      const prodRecipe = recs.filter(rec => rec.product_id === prod.id).map(rec => ({
        ...rec,
        ingredient: ings.find(ing => ing.id === rec.ingredient_id),
      }))
      const cost = prodRecipe.reduce((acc, rec) => {
        return acc + (rec.ingredient?.cost ?? 0) * rec.quantity
      }, 0)
      const margin = prod.price > 0 ? ((prod.price - cost) / prod.price) * 100 : 0
      return { ...prod, recipe: prodRecipe, cost, margin }
    })

    setProducts(withCost)
    setIngredients(ings)
    setLoading(false)
  }

  useEffect(() => { cargar() }, [])

  const abrirReceta = (p: ProductWithCost) => {
    setSelected(p)
    setRecipe(p.recipe ?? [])
  }

  const agregarLinea = () => {
    setRecipe(prev => [...prev, { ingredient_id: '', quantity: 0 }])
  }

  const actualizarLinea = (idx: number, field: string, value: any) => {
    setRecipe(prev => prev.map((r, i) => i === idx ? { ...r, [field]: value } : r))
  }

  const eliminarLinea = (idx: number) => {
    setRecipe(prev => prev.filter((_, i) => i !== idx))
  }

  const costoReceta = recipe.reduce((acc, r) => {
    const ing = ingredients.find(i => i.id === r.ingredient_id)
    return acc + (ing?.cost ?? 0) * (r.quantity || 0)
  }, 0)

  const guardarReceta = async () => {
    if (!selected) return
    setGuardando(true)
    await fetch(`/api/recipes/${selected.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items: recipe.filter(r => r.ingredient_id && r.quantity > 0) }),
    })
    setGuardando(false)
    setSelected(null)
    cargar()
  }

  const filtrados = products.filter(p =>
    !busqueda || p.name.toLowerCase().includes(busqueda.toLowerCase())
  )

  if (loading) return (
    <div className="flex items-center justify-center h-full">
      <div className="w-8 h-8 border-4 border-gray-200 border-t-purple-500 rounded-full animate-spin" />
    </div>
  )

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="font-display font-black text-2xl text-gray-800">Costos & Recetas</h1>
        <input value={busqueda} onChange={e => setBusqueda(e.target.value)}
          placeholder="Buscar producto..." className="input-field w-64" />
      </div>

      <div className="card overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b text-left text-xs uppercase text-gray-500">
                <th className="px-4 py-3">Producto</th>
                <th className="px-4 py-3">Precio venta</th>
                <th className="px-4 py-3">Costo receta</th>
                <th className="px-4 py-3">Ganancia</th>
                <th className="px-4 py-3">Margen %</th>
                <th className="px-4 py-3 text-right">Receta</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtrados.map(p => {
                const cost   = p.cost ?? 0
                const margin = p.margin ?? 0
                const gain   = p.price - cost
                return (
                  <tr key={p.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl overflow-hidden bg-gray-100 shrink-0">
                          {p.image_url
                            ? <img src={p.image_url} className="w-full h-full object-cover" />
                            : <div className="w-full h-full flex items-center justify-center text-xl">🍔</div>}
                        </div>
                        <div>
                          <p className="font-semibold text-gray-800">{p.name}</p>
                          <p className="text-xs text-gray-400">{p.category}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 font-bold text-gray-800">${Number(p.price).toFixed(2)}</td>
                    <td className="px-4 py-3">
                      {cost > 0
                        ? <span className="font-semibold text-orange-600">${cost.toFixed(4)}</span>
                        : <span className="text-gray-300 text-xs">Sin receta</span>}
                    </td>
                    <td className="px-4 py-3">
                      {cost > 0
                        ? <span className={clsx('font-bold', gain >= 0 ? 'text-green-600' : 'text-red-500')}>
                            ${gain.toFixed(2)}
                          </span>
                        : <span className="text-gray-300">—</span>}
                    </td>
                    <td className="px-4 py-3">
                      {cost > 0 ? (
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-2 bg-gray-100 rounded-full w-16">
                            <div className={clsx('h-full rounded-full', margin >= 50 ? 'bg-green-500' : margin >= 30 ? 'bg-yellow-500' : 'bg-red-500')}
                              style={{ width: `${Math.min(margin, 100)}%` }} />
                          </div>
                          <span className={clsx('text-xs font-bold', margin >= 50 ? 'text-green-600' : margin >= 30 ? 'text-yellow-600' : 'text-red-500')}>
                            {margin.toFixed(1)}%
                          </span>
                        </div>
                      ) : <span className="text-gray-300">—</span>}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button onClick={() => abrirReceta(p)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-purple-50 text-purple-600 hover:bg-purple-100 text-xs font-semibold ml-auto">
                        <ChefHat className="w-3.5 h-3.5" />
                        {(p.recipe?.length ?? 0) > 0 ? 'Editar receta' : 'Crear receta'}
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL RECETA */}
      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b sticky top-0 bg-white">
              <div>
                <h3 className="font-bold text-gray-800 text-lg">Receta: {selected.name}</h3>
                <p className="text-xs text-gray-400">Precio de venta: ${Number(selected.price).toFixed(2)}</p>
              </div>
              <button onClick={() => setSelected(null)}><X className="w-5 h-5 text-gray-400" /></button>
            </div>

            <div className="p-5 space-y-4">
              <div className="space-y-3">
                {recipe.map((r, idx) => {
                  const ing = ingredients.find(i => i.id === r.ingredient_id)
                  const subtotal = (ing?.cost ?? 0) * (r.quantity || 0)
                  return (
                    <div key={idx} className="flex items-center gap-2 bg-gray-50 rounded-xl p-3">
                      <select value={r.ingredient_id} onChange={e => actualizarLinea(idx, 'ingredient_id', e.target.value)}
                        className="input-field flex-1 text-sm py-2">
                        <option value="">Seleccionar...</option>
                        {ingredients.map(i => <option key={i.id} value={i.id}>{i.name} ({i.unit})</option>)}
                      </select>
                      <input type="number" step="0.001" min="0" value={r.quantity || ''}
                        onChange={e => actualizarLinea(idx, 'quantity', Number(e.target.value))}
                        placeholder="Cant." className="input-field w-20 text-sm py-2" />
                      <span className="text-xs text-gray-500 w-16 text-right shrink-0">
                        ${subtotal.toFixed(4)}
                      </span>
                      <button onClick={() => eliminarLinea(idx)} className="text-red-400 hover:text-red-600 shrink-0">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  )
                })}
              </div>

              <button onClick={agregarLinea} className="w-full border-2 border-dashed border-gray-200 hover:border-purple-300 rounded-xl py-2.5 text-sm text-gray-500 hover:text-purple-600 transition-all flex items-center justify-center gap-2">
                <Plus className="w-4 h-4" /> Agregar ingrediente
              </button>

              <div className="bg-purple-50 rounded-xl p-3 flex justify-between items-center">
                <div>
                  <p className="text-xs text-purple-600 font-semibold">Costo total receta</p>
                  <p className="font-display font-black text-xl text-purple-700">${costoReceta.toFixed(4)}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-gray-500">Margen estimado</p>
                  <p className={clsx('font-bold text-lg', selected.price > costoReceta ? 'text-green-600' : 'text-red-500')}>
                    {selected.price > 0 ? (((selected.price - costoReceta) / selected.price) * 100).toFixed(1) : 0}%
                  </p>
                </div>
              </div>

              <button onClick={guardarReceta} disabled={guardando} className="w-full btn-brand py-3 disabled:opacity-60">
                {guardando ? 'Guardando...' : 'Guardar receta'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
