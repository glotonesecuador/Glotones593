'use client'

import { useState, useEffect, useMemo } from 'react'
import { Plus, Edit, Trash2, X, Search, Tag, ToggleLeft, ToggleRight, ImagePlus, ListPlus, Copy } from 'lucide-react'
import type { Product } from '@/types'
import clsx from 'clsx'

const CATEGORIAS_DEFAULT = ['Promociones', 'Hamburguesas', 'Fries', 'Bebidas', 'Extras']

type GrupoExtra = {
  id: string;
  nombre: string;
  tipo: 'obligatorio' | 'opcional';
  min: number;
  max: number;
  opciones: string[]; 
}

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

  // CONSTRUCTOR DE MODIFICADORES
  const [gruposExtras, setGruposExtras] = useState<GrupoExtra[]>([])

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

  // --- LÓGICA DE MEMORIA INTELIGENTE: Extraer grupos únicos ya creados ---
  const gruposGuardados = useMemo(() => {
    const mapa = new Map<string, GrupoExtra>();
    products.forEach(p => {
      let config: GrupoExtra[] = [];
      try {
        if (typeof (p as any).extras_config === 'string') {
          config = JSON.parse((p as any).extras_config);
        } else if (Array.isArray((p as any).extras_config)) {
          config = (p as any).extras_config;
        }
      } catch (e) {}
      
      config.forEach(g => {
        // Usamos el nombre del grupo como llave única para no tener repetidos (Ej: "Salsas")
        if (g.nombre && g.opciones && g.opciones.length > 0 && !mapa.has(g.nombre.toLowerCase().trim())) {
          mapa.set(g.nombre.toLowerCase().trim(), g);
        }
      })
    });
    return Array.from(mapa.values());
  }, [products]);

  const abrirNuevo = () => {
    setEditando(null)
    setImgPreview('')
    setGruposExtras([]) 
    setModal(true)
  }

  const abrirEditar = (p: Product) => {
    setEditando(p)
    setImgPreview(p.image_url || '')
    
    let configGuardada = [];
    try {
      if (typeof (p as any).extras_config === 'string') {
        configGuardada = JSON.parse((p as any).extras_config);
      } else if (Array.isArray((p as any).extras_config)) {
        configGuardada = (p as any).extras_config;
      }
    } catch (e) {
      console.error("Error leyendo JSON de extras:", e);
    }
    
    setGruposExtras(configGuardada)
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

  const agregarGrupo = () => {
    setGruposExtras([...gruposExtras, { 
      id: crypto.randomUUID(), 
      nombre: '', 
      tipo: 'opcional', 
      min: 0, 
      max: 1, 
      opciones: [] 
    }])
  }

  // --- FUNCIÓN PARA COPIAR UN GRUPO EXISTENTE ---
  const copiarGrupoExistente = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const jsonStr = e.target.value;
    if (!jsonStr) return;
    
    const grupoBase: GrupoExtra = JSON.parse(jsonStr);
    
    // Clonamos el grupo pero le damos un ID nuevo para evitar conflictos de React
    setGruposExtras([...gruposExtras, { 
      ...grupoBase,
      id: crypto.randomUUID() 
    }]);
    
    // Resetear el select a la opción por defecto
    e.target.value = "";
  }

  const actualizarGrupo = (id: string, campo: keyof GrupoExtra, valor: any) => {
    setGruposExtras(prev => prev.map(g => g.id === id ? { ...g, [campo]: valor } : g))
  }

  const eliminarGrupo = (id: string) => {
    setGruposExtras(prev => prev.filter(g => g.id !== id))
  }

  const toggleOpcionEnGrupo = (grupoId: string, extraId: string) => {
    setGruposExtras(prev => prev.map(g => {
      if (g.id === grupoId) {
        const nuevasOpciones = g.opciones.includes(extraId)
          ? g.opciones.filter(id => id !== extraId)
          : [...g.opciones, extraId]
        return { ...g, opciones: nuevasOpciones }
      }
      return g
    }))
  }

  const guardar = async (e: React.FormEvent) => {
    e.preventDefault()
    setGuardando(true)

    const gruposInvalidos = gruposExtras.some(g => g.nombre.trim() === '' || g.opciones.length === 0);
    if (gruposInvalidos) {
      alert("⚠️ Tienes grupos de modificadores sin nombre o sin opciones seleccionadas. Por favor, complétalos o elimínalos con la 'X' roja antes de guardar.");
      setGuardando(false);
      return;
    }

    const fd = new FormData(e.target as HTMLFormElement)
    
    const body = {
      name:         fd.get('name'),
      description:  fd.get('description'),
      price:        Number(fd.get('price')),
      category:     fd.get('category'),
      discount_pct: Number(fd.get('discount_pct')) || 0,
      sort_order:   Number(fd.get('sort_order')) || 0,
      active:       true,
      image_url:    imgPreview || null,
      extras_config: gruposExtras,
    }

    const url    = editando ? `/api/products/${editando.id}` : '/api/products'
    const method = editando ? 'PUT' : 'POST'
    
    try {
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      
      if (!response.ok) throw new Error('Error al guardar')
      
      setGuardando(false)
      setModal(false)
      cargar()
    } catch (error) {
      console.error(error)
      alert("Error de servidor. Revisa tu conexión o la consola.")
      setGuardando(false)
    }
  }

  const eliminar = async (id: string) => {
    if (!confirm('¿Estás seguro de eliminar este producto de la base de datos?')) return;
    try {
      const res = await fetch(`/api/products/${id}`, { method: 'DELETE' });
      if (!res.ok) {
        alert('No se pudo eliminar el producto. Es muy probable que ya tenga ventas asociadas. Por favor, usa el botón de "Inactivar" (Toggle) en su lugar.');
        return;
      }
      cargar();
    } catch (error) {
      console.error("Error de conexión:", error);
      alert('Hubo un problema de conexión al intentar eliminar el producto.');
    }
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

      {/* MODAL PRODUCTO (CONSTRUCTOR DE MODIFICADORES) */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto custom-scrollbar">
            <div className="flex items-center justify-between p-5 border-b sticky top-0 bg-white shadow-sm z-10">
              <h3 className="font-bold text-gray-800 text-lg">
                {editando ? 'Editar producto' : 'Nuevo producto'}
              </h3>
              <button type="button" onClick={() => setModal(false)}><X className="w-5 h-5 text-gray-400 hover:text-gray-600" /></button>
            </div>
            <form onSubmit={guardar} className="p-6 space-y-6">
              
              {/* DATOS BÁSICOS */}
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 block">Imagen</label>
                  <div className="flex gap-3 items-start">
                    <div className="w-24 h-24 rounded-xl overflow-hidden bg-gray-100 border-2 border-dashed border-gray-200 flex items-center justify-center shrink-0 shadow-inner">
                      {imgPreview ? <img src={imgPreview} className="w-full h-full object-cover" /> : <span className="text-3xl text-gray-300">🍔</span>}
                    </div>
                    <div className="flex-1">
                      <label className="flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 border-dashed border-gray-200 hover:border-purple-300 hover:bg-purple-50 cursor-pointer transition-all text-sm font-medium w-fit">
                        <ImagePlus className="w-4 h-4 text-purple-500" />
                        <span className="text-gray-600">{subiendo ? 'Subiendo...' : 'Seleccionar imagen'}</span>
                        <input type="file" accept="image/*" className="hidden"
                          onChange={e => e.target.files?.[0] && subirImagen(e.target.files[0])} />
                      </label>
                      <p className="text-[10px] text-gray-400 mt-2 font-medium">Recomendado: 800x800px. Máx 5MB.</p>
                      {imgPreview && (
                        <button type="button" onClick={() => setImgPreview('')} className="text-xs text-red-500 font-bold mt-1.5 hover:underline">
                          Quitar imagen
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5 block">Nombre *</label>
                  <input name="name" defaultValue={editando?.name} placeholder="Ej: La Glotona Suprema" className="input-field focus:ring-purple-500" required />
                </div>

                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5 block">Descripción</label>
                  <textarea name="description" defaultValue={editando?.description ?? ''} rows={2}
                    placeholder="Doble carne smash, triple queso cheddar..." className="input-field resize-none focus:ring-purple-500" />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5 block">Precio *</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm font-bold">$</span>
                      <input name="price" type="number" step="0.01" min="0"
                        defaultValue={editando?.price} placeholder="0.00" className="input-field pl-7 focus:ring-purple-500" required />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5 block">Categoría *</label>
                    <select name="category" defaultValue={editando?.category ?? 'Hamburguesas'} className="input-field focus:ring-purple-500" required>
                      {categories.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5 block">Descuento %</label>
                    <input name="discount_pct" type="number" min="0" max="100"
                      defaultValue={editando?.discount_pct ?? 0} className="input-field focus:ring-purple-500" />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5 block">Orden</label>
                    <input name="sort_order" type="number" min="0"
                      defaultValue={editando?.sort_order ?? 0} className="input-field focus:ring-purple-500" />
                  </div>
                </div>
              </div>

              {/* CONSTRUCTOR DE MODIFICADORES */}
              <div className="border-t-2 border-gray-100 pt-6">
                <div className="flex justify-between items-center mb-4">
                  <div>
                    <h4 className="text-sm font-black uppercase text-purple-700 tracking-wide">Constructor de Modificadores</h4>
                    <p className="text-[10px] text-gray-400 font-bold uppercase mt-0.5">Define salsas, extras y opciones</p>
                  </div>
                  <div className="flex gap-2 items-center">
                    {/* HACK: DESPLEGABLE DE CLONACIÓN INTELIGENTE */}
                    {gruposGuardados.length > 0 && (
                      <select 
                        onChange={copiarGrupoExistente}
                        className="bg-white border border-purple-200 text-purple-700 rounded-lg text-[10px] font-black uppercase tracking-widest px-2 py-1.5 cursor-pointer hover:bg-purple-50 outline-none"
                      >
                        <option value="">Copiar de existente...</option>
                        {gruposGuardados.map((g, i) => (
                          <option key={i} value={JSON.stringify(g)}>📋 {g.nombre}</option>
                        ))}
                      </select>
                    )}

                    <button type="button" onClick={agregarGrupo} className="flex items-center gap-2 bg-purple-100 hover:bg-purple-200 text-purple-700 px-3 py-1.5 rounded-lg text-xs font-black transition-colors shrink-0">
                      <ListPlus className="w-4 h-4" /> Añadir Grupo
                    </button>
                  </div>
                </div>

                <div className="space-y-4">
                  {gruposExtras.map((grupo, index) => (
                    <div key={grupo.id} className="bg-gray-50 border border-gray-200 rounded-2xl p-4 shadow-sm relative animate-in fade-in zoom-in-95 duration-200">
                      <button type="button" onClick={() => eliminarGrupo(grupo.id)} className="absolute -top-2 -right-2 bg-red-100 hover:bg-red-200 text-red-600 p-1.5 rounded-full shadow-sm transition-colors">
                        <X className="w-3 h-3 font-bold" />
                      </button>
                      
                      <div className="space-y-3">
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="text-[10px] font-bold text-gray-500 uppercase block mb-1">Nombre del Grupo</label>
                            <input type="text" value={grupo.nombre} onChange={e => actualizarGrupo(grupo.id, 'nombre', e.target.value)} placeholder="Ej: Salsas" className="input-field text-sm py-1.5" required />
                          </div>
                          <div>
                            <label className="text-[10px] font-bold text-gray-500 uppercase block mb-1">Obligatorio / Opcional</label>
                            <select value={grupo.tipo} onChange={e => actualizarGrupo(grupo.id, 'tipo', e.target.value)} className="input-field text-sm py-1.5 bg-white">
                              <option value="obligatorio">Obligatorio (Cliente debe elegir)</option>
                              <option value="opcional">Opcional (Puede saltarlo)</option>
                            </select>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="text-[10px] font-bold text-gray-500 uppercase block mb-1">Mínimo selecciones</label>
                            <input type="number" min="0" value={grupo.min} onChange={e => actualizarGrupo(grupo.id, 'min', Number(e.target.value))} className="input-field text-sm py-1.5" />
                          </div>
                          <div>
                            <label className="text-[10px] font-bold text-gray-500 uppercase block mb-1">Máximo selecciones</label>
                            <input type="number" min="1" value={grupo.max} onChange={e => actualizarGrupo(grupo.id, 'max', Number(e.target.value))} className="input-field text-sm py-1.5" />
                          </div>
                        </div>

                        {/* SELECTOR DE PRODUCTOS */}
                        <div className="pt-2">
                          <label className="text-[10px] font-black text-purple-600 uppercase tracking-widest block mb-2">Selecciona las opciones a mostrar:</label>
                          <div className="grid grid-cols-2 gap-2 max-h-32 overflow-y-auto p-2 bg-white rounded-xl border border-gray-100">
                            {products.filter(p => p.category?.toLowerCase() === 'extras').map(extra => (
                              <label key={extra.id} className="flex items-center gap-2 p-1.5 hover:bg-purple-50 rounded-lg cursor-pointer transition-colors border border-transparent hover:border-purple-100">
                                <input 
                                  type="checkbox"
                                  checked={grupo.opciones.includes(extra.id)}
                                  onChange={() => toggleOpcionEnGrupo(grupo.id, extra.id)}
                                  className="w-3.5 h-3.5 text-purple-600 rounded border-gray-300 focus:ring-purple-500"
                                />
                                <div className="flex flex-col min-w-0">
                                  <span className="text-[10px] font-bold text-gray-700 truncate leading-tight">{extra.name}</span>
                                  <span className="text-[9px] text-gray-400 font-semibold">+${Number(extra.price).toFixed(2)}</span>
                                </div>
                              </label>
                            ))}
                            {products.filter(p => p.category?.toLowerCase() === 'extras').length === 0 && (
                              <p className="col-span-2 text-[10px] text-gray-400 italic text-center py-2">No has creado productos "Extras" en el catálogo.</p>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                  {gruposExtras.length === 0 && (
                    <div className="text-center py-6 border-2 border-dashed border-gray-200 rounded-2xl">
                      <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Sin modificadores</p>
                      <p className="text-[10px] text-gray-400 mt-1">Este producto se venderá tal cual, sin opciones a elegir.</p>
                    </div>
                  )}
                </div>
              </div>

              {/* BOTÓN GUARDAR */}
              <button type="submit" disabled={guardando || subiendo} className="w-full bg-purple-600 hover:bg-purple-700 text-white font-black py-4 rounded-2xl shadow-lg transition-all active:scale-[0.98] disabled:opacity-50 mt-6">
                {guardando ? (
                  <span className="flex items-center justify-center gap-2 uppercase tracking-widest text-sm">
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Guardando...
                  </span>
                ) : (
                  <span className="uppercase tracking-widest text-sm">{editando ? 'Actualizar Producto' : 'Crear Producto'}</span>
                )}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL CATEGORÍAS */}
      {modalCat && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-black text-gray-800 uppercase tracking-widest text-sm">Categorías del Menú</h3>
              <button type="button" onClick={() => setModalCat(false)} className="p-1 hover:bg-gray-100 rounded-lg transition-colors"><X className="w-5 h-5 text-gray-400" /></button>
            </div>
            <div className="space-y-2 mb-6 max-h-64 overflow-y-auto pr-1">
              {categories.map(cat => (
                <div key={cat} className="flex items-center justify-between px-4 py-3 bg-gray-50 rounded-xl border border-gray-100">
                  <span className="text-xs font-bold text-gray-700 uppercase">{cat}</span>
                  <span className="text-[10px] font-black text-gray-400 uppercase tracking-tighter bg-white px-2 py-1 rounded-lg shadow-sm border">{products.filter(p => p.category === cat).length} Ítems</span>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <input value={nuevaCat} onChange={e => setNuevaCat(e.target.value)}
                placeholder="Nombre categoría..." className="input-field text-xs flex-1 h-11" />
              <button type="button" onClick={() => { if (nuevaCat.trim()) { setCategories(prev => [...prev, nuevaCat.trim()]); setNuevaCat('') } }}
                className="bg-purple-600 hover:bg-purple-700 text-white font-black text-[10px] uppercase tracking-widest px-4 rounded-xl shadow-md transition-all active:scale-95">
                Añadir
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}