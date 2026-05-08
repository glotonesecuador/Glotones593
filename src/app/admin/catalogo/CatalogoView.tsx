'use client'

import { useState, useEffect } from 'react'
import { Plus, Edit, Trash2, X, Search, Tag, ToggleLeft, ToggleRight, ImagePlus } from 'lucide-react'
import type { Product } from '@/types'
import clsx from 'clsx'

const CATEGORIAS_DEFAULT = ['Promociones', 'Hamburguesas', 'Fries', 'Bebidas', 'Extras']

export default function CatalogoView() {
  const [products, setProducts]     = useState<Product[]>([])
  const [categories, setCategories] = useState<string[]>(CATEGORIAS_DEFAULT)
  const [loading, setLoading]       = useState(true)
  const [busqueda, setBusqueda]     = useState('')
  const [filtrocat, setFiltroCat]   = useState('Todas')
  const [modal, setModal]           = useState(false)
  const [editando, setEditando]     = useState<Product | null>(null)
  const [guardando, setGuardando]   = useState(false)
  const [imgPreview, setImgPreview] = useState('')
  const [subiendo, setSubiendo]     = useState(false)
  const [modalCat, setModalCat]     = useState(false)
  const [nuevaCat, setNuevaCat]     = useState('')

  const cargar = async () => {
    const res  = await fetch('/api/products?admin=1')
    const data = await res.json()
    if (Array.isArray(data)) {
      setProducts(data)
      const cats = Array.from(new Set(data.map((p: Product) => p.category))) as string[]
      setCategories(Array.from(new Set([...CATEGORIAS_DEFAULT, ...cats])))
    }
    setLoading(false)
  }

  useEffect(() => { cargar() }, [])

  const abrirNuevo = () => {
    setEditando(null)
    setImgPreview('')
    setModal(true)
  }

  const abrirEditar = (p: Product) => {
    setEditando(p)
    setImgPreview(p.image_url || '')
    setModal(true)
  }

  const subirImagen = async (file: File) => {
    setSubiendo(true)
    const formData = new FormData()
    formData.append('file', file)
    formData.append('folder', 'products')
    const res  = await fetch('/api/upload', { method: 'POST', body: formData })
    const data = await res.json()
    setSubiendo(false)
    if (data.url) setImgPreview(data.url)
  }

  const guardar = async (e: React.FormEvent) => {
    e.preventDefault()
    const fd = new FormData(e.target as HTMLFormElement)
    setGuardando(true)
    const body = {
      name:         fd.get('name'),
      description:  fd.get('description'),
      price:        fd.get('price'),
      category:     fd.get('category'),
      discount_pct: fd.get('discount_pct') || 0,
      sort_order:   fd.get('sort_order') || 0,
      active:       true,
      image_url:    imgPreview || null,
    }
    const url    = editando ? `/api/products/${editando.id}` : '/api/products'
    const method = editando ? 'PUT' : 'POST'
    await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    setGuardando(false)
    setModal(false)
    cargar()
  }

  const eliminar = async (id: string) => {
    if (!confirm('¿Eliminar este producto?')) return
    await fetch(`/api/products/${id}`, { method: 'DELETE' })
    cargar()
  }

  const toggleActivo = async (p: Product) => {
    await fetch(`/api/products/${p.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...p, active: !p.active }),
    })
    cargar()
  }

  const filtrados = products.filter(p => {
    if (filtrocat !== 'Todas' && p.category !== filtrocat) return false
    if (busqueda && !p.name.toLowerCase().includes(busqueda.toLowerCase())) return false
    return true
  })

  if (loading) return (
    <div className="flex items-center justify-center h-full">
      <div className="w-8 h-8 border-4 border-gray-200 border-t-purple-500 rounded-full animate-spin" />
    </div>
  )

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="font-display font-black text-2xl text-gray-800">Catálogo & Menú</h1>
        <div className="flex gap-2">
          <button onClick={() => setModalCat(true)} className="btn-ghost flex items-center gap-2 text-sm">
            <Tag className="w-4 h-4" /> Categorías
          </button>
          <button onClick={abrirNuevo} className="btn-brand flex items-center gap-2 text-sm">
            <Plus className="w-4 h-4" /> Nuevo producto
          </button>
        </div>
      </div>

      <div className="flex gap-3 flex-wrap items-center">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input value={busqueda} onChange={e => setBusqueda(e.target.value)}
            placeholder="Buscar producto..." className="input-field pl-9" />
        </div>
        <div className="flex gap-2 flex-wrap">
          {['Todas', ...categories].map(cat => (
            <button key={cat} onClick={() => setFiltroCat(cat)}
              className={clsx('px-3 py-1.5 rounded-full text-xs font-semibold transition-all',
                filtrocat === cat ? 'bg-purple-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200')}>
              {cat}
            </button>
          ))}
        </div>
      </div>

      <div className="flex gap-4 text-sm text-gray-500">
        <span><strong className="text-gray-800">{products.length}</strong> productos totales</span>
        <span><strong className="text-green-600">{products.filter(p => p.active).length}</strong> activos</span>
        <span><strong className="text-gray-400">{products.filter(p => !p.active).length}</strong> inactivos</span>
      </div>

      <div className="card overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b text-left text-xs uppercase text-gray-500">
                <th className="px-4 py-3">Producto</th>
                <th className="px-4 py-3">Categoría</th>
                <th className="px-4 py-3">Precio</th>
                <th className="px-4 py-3">Descuento</th>
                <th className="px-4 py-3">Estado</th>
                <th className="px-4 py-3 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtrados.map(p => (
                <tr key={p.id} className={clsx('hover:bg-gray-50 transition-colors', !p.active && 'opacity-50')}>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl overflow-hidden bg-gray-100 shrink-0">
                        {p.image_url
                          ? <img src={p.image_url} className="w-full h-full object-cover" />
                          : <div className="w-full h-full flex items-center justify-center text-xl">🍔</div>}
                      </div>
                      <div>
                        <p className="font-semibold text-gray-800">{p.name}</p>
                        {p.description && <p className="text-xs text-gray-400 truncate max-w-xs">{p.description}</p>}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="badge bg-purple-50 text-purple-700">{p.category}</span>
                  </td>
                  <td className="px-4 py-3 font-bold text-gray-800">${Number(p.price).toFixed(2)}</td>
                  <td className="px-4 py-3">
                    {p.discount_pct > 0
                      ? <span className="badge bg-red-100 text-red-600">-{p.discount_pct}%</span>
                      : <span className="text-gray-300">—</span>}
                  </td>
                  <td className="px-4 py-3">
                    <button onClick={() => toggleActivo(p)} className="flex items-center gap-1.5 text-xs font-medium">
                      {p.active
                        ? <><ToggleRight className="w-5 h-5 text-green-500" /><span className="text-green-600">Activo</span></>
                        : <><ToggleLeft className="w-5 h-5 text-gray-400" /><span className="text-gray-400">Inactivo</span></>}
                    </button>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-2">
                      <button onClick={() => abrirEditar(p)} className="p-1.5 rounded-lg hover:bg-blue-50 text-blue-500">
                        <Edit className="w-4 h-4" />
                      </button>
                      <button onClick={() => eliminar(p.id)} className="p-1.5 rounded-lg hover:bg-red-50 text-red-500">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filtrados.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-gray-400">No hay productos</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL PRODUCTO */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b sticky top-0 bg-white">
              <h3 className="font-bold text-gray-800 text-lg">
                {editando ? 'Editar producto' : 'Nuevo producto'}
              </h3>
              <button onClick={() => setModal(false)}><X className="w-5 h-5 text-gray-400" /></button>
            </div>
            <form onSubmit={guardar} className="p-5 space-y-4">
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 block">Imagen</label>
                <div className="flex gap-3 items-start">
                  <div className="w-24 h-24 rounded-xl overflow-hidden bg-gray-100 border-2 border-dashed border-gray-200 flex items-center justify-center shrink-0">
                    {imgPreview ? <img src={imgPreview} className="w-full h-full object-cover" /> : <span className="text-3xl">🍔</span>}
                  </div>
                  <div className="flex-1">
                    <label className="flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 border-dashed border-gray-200 hover:border-purple-300 hover:bg-purple-50 cursor-pointer transition-all text-sm">
                      <ImagePlus className="w-4 h-4 text-purple-500" />
                      <span className="text-gray-600">{subiendo ? 'Subiendo...' : 'Seleccionar imagen'}</span>
                      <input type="file" accept="image/*" className="hidden"
                        onChange={e => e.target.files?.[0] && subirImagen(e.target.files[0])} />
                    </label>
                    <p className="text-xs text-gray-400 mt-1.5">JPG, PNG o WebP. Máx 5MB.</p>
                    {imgPreview && (
                      <button type="button" onClick={() => setImgPreview('')} className="text-xs text-red-400 mt-1">
                        Quitar imagen
                      </button>
                    )}
                  </div>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5 block">Nombre *</label>
                <input name="name" defaultValue={editando?.name} placeholder="Ej: La Glotona Suprema" className="input-field" required />
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5 block">Descripción</label>
                <textarea name="description" defaultValue={editando?.description ?? ''} rows={2}
                  placeholder="Doble carne smash, triple queso cheddar..." className="input-field resize-none" />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5 block">Precio *</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
                    <input name="price" type="number" step="0.01" min="0"
                      defaultValue={editando?.price} placeholder="0.00" className="input-field pl-7" required />
                  </div>
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5 block">Categoría *</label>
                  <select name="category" defaultValue={editando?.category ?? 'Extras'} className="input-field" required>
                    {categories.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5 block">Descuento %</label>
                  <input name="discount_pct" type="number" min="0" max="100"
                    defaultValue={editando?.discount_pct ?? 0} className="input-field" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5 block">Orden</label>
                  <input name="sort_order" type="number" min="0"
                    defaultValue={editando?.sort_order ?? 0} className="input-field" />
                </div>
              </div>

              <button type="submit" disabled={guardando || subiendo} className="w-full btn-brand py-3 text-base disabled:opacity-60">
                {guardando ? 'Guardando...' : editando ? 'Actualizar producto' : 'Crear producto'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL CATEGORÍAS */}
      {modalCat && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-bold text-gray-800">Categorías</h3>
              <button onClick={() => setModalCat(false)}><X className="w-5 h-5 text-gray-400" /></button>
            </div>
            <div className="space-y-2 mb-4">
              {categories.map(cat => (
                <div key={cat} className="flex items-center justify-between px-3 py-2 bg-gray-50 rounded-xl">
                  <span className="text-sm font-medium text-gray-700">{cat}</span>
                  <span className="text-xs text-gray-400">{products.filter(p => p.category === cat).length} productos</span>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <input value={nuevaCat} onChange={e => setNuevaCat(e.target.value)}
                placeholder="Nueva categoría..." className="input-field text-sm flex-1" />
              <button onClick={() => { if (nuevaCat.trim()) { setCategories(prev => [...prev, nuevaCat.trim()]); setNuevaCat('') } }}
                className="btn-brand text-sm px-4">
                Agregar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
