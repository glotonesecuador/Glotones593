'use client'

import { useState, useEffect, useMemo } from 'react'
import {
  Search, Users, Star, Phone, Mail, MapPin, AtSign,
  ShoppingBag, TrendingUp, Gift, X, Edit, Plus, Crown,
  Calendar, MessageCircle, Filter, Download, RefreshCw
} from 'lucide-react'
import clsx from 'clsx'

interface Customer {
  phone: string; name: string | null; email: string | null
  address: string | null; birthday: string | null; instagram: string | null
  manual_tags: string | null; notes: string | null; rating: number
  total_spent: number; order_count: number; last_order: string | null
  auto_tags: string[]; points: number; loyalty: 'Bronce' | 'Plata' | 'Oro'
  created_at: string
}

const LOYALTY_CONFIG = {
  Oro:    { color: 'bg-yellow-100 text-yellow-700 border-yellow-300', icon: '🥇' },
  Plata:  { color: 'bg-gray-100 text-gray-600 border-gray-300',       icon: '🥈' },
  Bronce: { color: 'bg-orange-100 text-orange-600 border-orange-300', icon: '🥉' },
}

function tiempoAtras(dateStr: string) {
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000 / 60 / 60 / 24)
  if (diff === 0) return 'Hoy'
  if (diff === 1) return 'Ayer'
  if (diff < 30)  return `Hace ${diff} días`
  if (diff < 365) return `Hace ${Math.floor(diff / 30)} meses`
  return `Hace ${Math.floor(diff / 365)} años`
}

export default function ClientesView() {
  const [clientes, setClientes]   = useState<Customer[]>([])
  const [loading, setLoading]     = useState(true)
  const [busqueda, setBusqueda]   = useState('')
  const [filtro, setFiltro]       = useState('Todos')
  const [selected, setSelected]   = useState<Customer | null>(null)
  const [editModal, setEditModal] = useState(false)
  const [guardando, setGuardando] = useState(false)
  const [editData, setEditData]   = useState<Partial<Customer>>({})

  // NUEVOS ESTADOS PARA FILTROS DE FECHA
  const [desde, setDesde] = useState('')
  const [hasta, setHasta] = useState('')

  const cargar = async () => {
    try {
      const res  = await fetch('/api/customers')
      const data = await res.json()
      if (Array.isArray(data)) setClientes(data)
    } catch (error) {
      console.error('Error cargando clientes:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { cargar() }, [])

  // FUNCIÓN PARA SINCRONIZAR MONTOS DESDE EL HISTORIAL (Corrige los $0.00)
  const sincronizarCRM = async () => {
    if (!confirm('¿Deseas recalcular los totales gastados de todos los clientes basándote en el historial de pedidos?')) return
    setLoading(true)
    try {
      const res = await fetch('/api/admin/sync-crm', { method: 'POST' })
      if (res.ok) {
        await cargar()
        alert('CRM Sincronizado con éxito')
      }
    } catch (e) {
      alert('Error en la sincronización')
    } finally {
      setLoading(false)
    }
  }

  // FUNCIÓN PARA EXPORTAR A CSV
  const exportarCSV = () => {
    const headers = ['Nombre', 'Telefono', 'Email', 'Pedidos', 'Total Gastado', 'Nivel', 'Registro']
    const rows = filtrados.map(c => [
      c.name || 'Sin nombre',
      c.phone,
      c.email || '',
      c.order_count,
      Number(c.total_spent).toFixed(2),
      c.loyalty,
      new Date(c.created_at).toLocaleDateString()
    ])
    const csvContent = "data:text/csv;charset=utf-8," + [headers, ...rows].map(e => e.join(",")).join("\n")
    const link = document.createElement("a")
    link.setAttribute("href", encodeURI(csvContent))
    link.setAttribute("download", `clientes_glotones_${new Date().toISOString().split('T')[0]}.csv`)
    link.click()
  }

  const abrirEditar = (c: Customer) => {
    setEditData({
      name: c.name ?? '', email: c.email ?? '', address: c.address ?? '',
      birthday: c.birthday ?? '', instagram: c.instagram ?? '',
      manual_tags: c.manual_tags ?? '', notes: c.notes ?? '', rating: c.rating,
    })
    setSelected(c)
    setEditModal(true)
  }

  const guardar = async () => {
    if (!selected) return
    setGuardando(true)
    await fetch('/api/customers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...editData, phone: selected.phone }),
    })
    setGuardando(false)
    setEditModal(false)
    cargar()
  }

  const filtrados = useMemo(() => {
    return clientes.filter(c => {
      const q = busqueda.toLowerCase()
      const matchSearch = !busqueda ||
        (c.name ?? '').toLowerCase().includes(q) ||
        c.phone.includes(q) ||
        (c.email ?? '').toLowerCase().includes(q)

      const matchFiltro =
        filtro === 'Todos'     ? true :
        filtro === 'VIP'       ? c.auto_tags.includes('VIP') :
        filtro === 'Frecuente' ? c.auto_tags.includes('Frecuente') :
        filtro === 'Nuevo'     ? c.auto_tags.includes('Nuevo') :
        filtro === 'Oro'       ? c.loyalty === 'Oro' :
        filtro === 'Plata'     ? c.loyalty === 'Plata' : true

      // LÓGICA DE FILTRO POR FECHAS
      const fechaC = new Date(c.created_at).getTime()
      const matchDesde = !desde || fechaC >= new Date(desde).getTime()
      const matchHasta = !hasta || fechaC <= new Date(hasta + 'T23:59:59').getTime()

      return matchSearch && matchFiltro && matchDesde && matchHasta
    })
  }, [clientes, busqueda, filtro, desde, hasta])

  const stats = {
    total:     clientes.length,
    vip:       clientes.filter(c => c.auto_tags.includes('VIP')).length,
    frecuente: clientes.filter(c => c.auto_tags.includes('Frecuente')).length,
    nuevos:    clientes.filter(c => c.auto_tags.includes('Nuevo')).length,
    ingresos:  clientes.reduce((a, c) => a + Number(c.total_spent), 0),
  }

  if (loading) return (
    <div className="flex items-center justify-center h-full min-h-[50vh]">
      <div className="w-8 h-8 border-4 border-gray-200 border-t-purple-500 rounded-full animate-spin" />
    </div>
  )

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-5 uppercase text-[10px] font-black">
      {/* Header con Sincronización y Exportación */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-display font-black text-2xl text-gray-800 tracking-tighter">CRM — Clientes</h1>
          <p className="text-gray-400 text-sm font-bold uppercase">{clientes.length} clientes registrados</p>
        </div>
        <div className="flex gap-2">
          <button onClick={sincronizarCRM} className="flex items-center gap-2 bg-white border border-gray-200 px-4 py-2 rounded-xl text-[10px] font-black hover:bg-gray-50 transition-all uppercase">
            <RefreshCw className={clsx("w-4 h-4 text-purple-600", loading && "animate-spin")} /> Sincronizar Datos
          </button>
          <button onClick={exportarCSV} className="flex items-center gap-2 bg-purple-600 text-white px-4 py-2 rounded-xl text-[10px] font-black hover:bg-purple-700 transition-all shadow-sm uppercase">
            <Download className="w-4 h-4" /> Exportar CSV
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        {[
          { label: 'Total clientes', value: stats.total,                     icon: Users,       color: 'bg-purple-50 text-purple-600' },
          { label: 'VIP',           value: stats.vip,                        icon: Crown,       color: 'bg-yellow-50 text-yellow-600' },
          { label: 'Frecuentes',    value: stats.frecuente,                  icon: TrendingUp,  color: 'bg-blue-50 text-blue-600'     },
          { label: 'Nuevos',        value: stats.nuevos,                     icon: Plus,        color: 'bg-green-50 text-green-600'   },
          { label: 'Ingresos total',value: `$${stats.ingresos.toFixed(2)}`,  icon: ShoppingBag, color: 'bg-pink-50 text-pink-600'     },
        ].map(s => {
          const Icon = s.icon
          return (
            <div key={s.label} className={clsx("card flex items-center gap-3 border-0 shadow-sm", s.color)}>
              {Icon && <Icon className="w-7 h-7 shrink-0" />}
              <div>
                <p className="text-[9px] font-black opacity-70 uppercase tracking-widest leading-none mb-1">{s.label}</p>
                <p className="font-display font-black text-xl leading-none">{s.value}</p>
              </div>
            </div>
          )
        })}
      </div>

      {/* Filtros Avanzados (Búsqueda + Fechas) */}
      <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm space-y-4">
        <div className="flex flex-wrap gap-4 items-end">
          <div className="relative flex-1 min-w-[280px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input value={busqueda} onChange={e => setBusqueda(e.target.value)}
              placeholder="Nombre, teléfono o email..." className="input-field pl-9 text-[11px] font-black" />
          </div>
          <div className="flex flex-col">
            <span className="text-[9px] font-black text-gray-400 mb-1 ml-1 uppercase tracking-widest">Desde</span>
            <input type="date" value={desde} onChange={e => setDesde(e.target.value)} className="input-field py-2 text-xs" />
          </div>
          <div className="flex flex-col">
            <span className="text-[9px] font-black text-gray-400 mb-1 ml-1 uppercase tracking-widest">Hasta</span>
            <input type="date" value={hasta} onChange={e => setHasta(e.target.value)} className="input-field py-2 text-xs" />
          </div>
          <button onClick={() => {setDesde(''); setHasta(''); setBusqueda(''); setFiltro('Todos')}} className="p-2.5 bg-gray-100 rounded-xl text-gray-400 hover:text-red-500 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex gap-1.5 flex-wrap border-t pt-4">
          {['Todos', 'VIP', 'Frecuente', 'Nuevo', 'Oro', 'Plata'].map(f => (
            <button key={f} onClick={() => setFiltro(f)}
              className={clsx('px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all',
                filtro === f ? 'bg-purple-600 text-white shadow-md' : 'bg-gray-100 text-gray-600 hover:bg-gray-200')}>
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* Tabla Principal */}
      <div className="card overflow-hidden p-0 border-gray-100 shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead>
              <tr className="bg-gray-50 border-b text-[10px] uppercase font-black text-gray-400 tracking-wider">
                <th className="px-4 py-4">Cliente</th>
                <th className="px-4 py-3">Contacto</th>
                <th className="px-4 py-3 text-center">Pedidos</th>
                <th className="px-4 py-3 text-center">Total gastado</th>
                <th className="px-4 py-3 text-center">Puntos / Nivel</th>
                <th className="px-4 py-3">Tags</th>
                <th className="px-4 py-3">Último pedido</th>
                <th className="px-4 py-3 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 uppercase text-[10px] font-black">
              {filtrados.map(c => {
                const loy = LOYALTY_CONFIG[c.loyalty]
                return (
                  <tr key={c.phone} className="hover:bg-gray-50 cursor-pointer group transition-colors" onClick={() => setSelected(c)}>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center text-purple-700 font-black text-sm">
                          {c.name?.[0] ?? '?'}
                        </div>
                        <div>
                          <p className="font-black text-gray-800 leading-tight">{c.name ?? 'Sin nombre'}</p>
                          <p className="text-gray-400 font-bold tracking-tight">{c.phone}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-col gap-0.5 lowercase text-gray-500 font-bold">
                        {c.email && <span className="flex items-center gap-1"><Mail size={10}/>{c.email}</span>}
                        {c.instagram && <span className="flex items-center gap-1 uppercase"><AtSign size={10}/>{c.instagram}</span>}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="font-black text-gray-800 text-sm">{c.order_count}</span>
                      <span className="text-gray-400 ml-1 font-bold">pedidos</span>
                    </td>
                    <td className="px-4 py-3 text-center font-black text-purple-600 text-sm">${c.total_spent.toFixed(2)}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-col items-center gap-1">
                        <span className={clsx('px-2 py-0.5 rounded-lg border font-black text-[8px] flex items-center gap-1', loy.color)}>
                          {loy.icon} {c.loyalty}
                        </span>
                        <span className="text-gray-400 text-[9px]">{c.points} PTS</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {c.auto_tags.map(tag => (
                          <span key={tag} className="px-2 py-0.5 rounded bg-purple-50 text-purple-600 font-black text-[9px]">{tag}</span>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-400 font-bold">
                      {c.last_order ? tiempoAtras(c.last_order) : 'Nunca'}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button onClick={e => { e.stopPropagation(); abrirEditar(c) }}
                        className="p-1.5 rounded-lg hover:bg-blue-50 text-blue-500 shadow-sm transition-all">
                        <Edit className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL PERFIL CLIENTE */}
      {selected && !editModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between p-7 border-b sticky top-0 bg-white z-10">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-2xl bg-purple-100 flex items-center justify-center text-purple-700 font-black text-2xl shadow-inner">
                  {selected.name?.[0] ?? '?'}
                </div>
                <div>
                  <h3 className="font-black text-gray-800 text-2xl uppercase tracking-tighter leading-tight">{selected.name ?? 'Sin nombre'}</h3>
                  <p className="text-sm text-gray-400 font-black tracking-widest">{selected.phone}</p>
                </div>
              </div>
              <div className="flex gap-2">
                <button onClick={() => abrirEditar(selected)} className="bg-gray-100 hover:bg-gray-200 px-5 py-2.5 rounded-2xl text-xs font-black uppercase flex items-center gap-2 transition-all">
                  <Edit className="w-4 h-4" /> Editar
                </button>
                <button onClick={() => setSelected(null)} className="p-2.5 rounded-2xl hover:bg-gray-100 transition-all"><X className="w-6 h-6 text-gray-400" /></button>
              </div>
            </div>

            <div className="p-7 space-y-7">
              <div className="grid grid-cols-3 gap-5 uppercase font-black">
                <div className="bg-purple-50 p-5 rounded-[2rem] text-center border border-purple-100 shadow-sm">
                  <p className="text-3xl text-purple-700 leading-none">{selected.order_count}</p>
                  <p className="text-[10px] text-purple-400 mt-2 tracking-widest">Pedidos</p>
                </div>
                <div className="bg-green-50 p-5 rounded-[2rem] text-center border border-green-100 shadow-sm">
                  <p className="text-3xl text-green-700 leading-none">${selected.total_spent.toFixed(2)}</p>
                  <p className="text-[10px] text-green-400 mt-2 tracking-widest">Total Gastado</p>
                </div>
                <div className="bg-yellow-50 p-5 rounded-[2rem] text-center border border-yellow-100 shadow-sm">
                  <p className="text-3xl text-yellow-700 leading-none">{selected.points}</p>
                  <p className="text-[10px] text-yellow-400 mt-2 tracking-widest">Puntos</p>
                </div>
              </div>

              <div className={clsx('p-5 rounded-[2rem] border-2 flex items-center gap-5 transition-all shadow-sm', LOYALTY_CONFIG[selected.loyalty].color)}>
                <span className="text-5xl">{LOYALTY_CONFIG[selected.loyalty].icon}</span>
                <div>
                  <p className="font-black text-xl uppercase tracking-tighter">Nivel {selected.loyalty}</p>
                  <p className="text-[11px] font-bold opacity-80 leading-relaxed">
                    {selected.loyalty === 'Bronce' && `Necesita ${500 - selected.points} puntos más para Plata`}
                    {selected.loyalty === 'Plata'  && `Necesita ${1000 - selected.points} puntos más para Oro`}
                    {selected.loyalty === 'Oro'    && '¡CLIENTE DE ÉLITE GLOTONES! 🏆'}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="bg-gray-50 p-6 rounded-[2.5rem] space-y-5 border border-gray-100">
                  <h4 className="font-black text-gray-400 text-[10px] uppercase tracking-[0.2em] border-b border-gray-200 pb-3">Contacto Directo</h4>
                  {[
                    { icon: Phone,   label: 'WhatsApp',  value: selected.phone },
                    { icon: Mail,    label: 'Email',     value: selected.email },
                    { icon: MapPin,  label: 'Dirección', value: selected.address },
                    { icon: AtSign,  label: 'Instagram', value: selected.instagram },
                  ].map((item, i) => item.value && (
                    <div key={i} className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center shadow-sm">
                        <item.icon className="w-5 h-5 text-purple-600" />
                      </div>
                      <div>
                        <p className="text-[9px] font-black text-gray-400 uppercase leading-none mb-1">{item.label}</p>
                        <p className="font-bold text-gray-800 text-sm leading-tight uppercase tracking-tight">{item.value}</p>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="bg-gray-50 p-6 rounded-[2.5rem] space-y-5 border border-gray-100">
                   <h4 className="font-black text-gray-400 text-[10px] uppercase tracking-[0.2em] border-b border-gray-200 pb-3">Segmentación</h4>
                   <div className="flex flex-wrap gap-2 pt-1">
                     {selected.auto_tags.map(t => <span key={t} className="px-3 py-1.5 bg-purple-700 text-white rounded-xl font-black text-[9px] uppercase tracking-widest">{t}</span>)}
                     {selected.manual_tags && selected.manual_tags.split(',').map(t => t.trim()).filter(Boolean).map(tag => (
                       <span key={tag} className="px-3 py-1.5 bg-blue-600 text-white rounded-xl font-black text-[9px] uppercase tracking-widest">{tag}</span>
                     ))}
                   </div>
                   {selected.notes && (
                     <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-inner mt-4">
                        <p className="text-[9px] font-black text-gray-400 uppercase mb-2 tracking-widest leading-none">Notas Internas</p>
                        <p className="text-xs font-bold text-gray-600 italic leading-relaxed uppercase">{selected.notes}</p>
                     </div>
                   )}
                </div>
              </div>

              <div className="flex gap-4">
                <a href={`https://wa.me/593${selected.phone}`} target="_blank" className="flex-1 bg-green-500 hover:bg-green-600 text-white py-5 rounded-[2rem] font-black uppercase text-sm flex items-center justify-center gap-3 shadow-xl shadow-green-100 transition-all active:scale-95">
                  <MessageCircle className="w-6 h-6" /> Iniciar Chat de Ventas
                </a>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL EDITAR CLIENTE */}
      {editModal && selected && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/70 backdrop-blur-md">
          <div className="bg-white rounded-[3rem] shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto animate-in slide-in-from-bottom-8 duration-300">
            <div className="p-8 border-b flex items-center justify-between sticky top-0 bg-white z-10">
              <h3 className="font-black text-gray-800 uppercase tracking-tighter text-xl leading-none">Editar Perfil</h3>
              <button onClick={() => setEditModal(false)} className="p-3 hover:bg-gray-100 rounded-2xl transition-all"><X className="w-6 h-6 text-gray-400" /></button>
            </div>
            <div className="p-8 space-y-6">
              {[
                { key: 'name',    label: 'Nombre completo',   ph: 'JUAN PÉREZ' },
                { key: 'email',   label: 'Email de contacto', ph: 'CLIENTE@MAIL.COM' },
                { key: 'address', label: 'Dirección física',  ph: 'CALLE, CIUDAD...' },
                { key: 'instagram', label: 'Instagram / Redes', ph: '@USUARIO' },
                { key: 'manual_tags', label: 'Tags (VIP, SIN CEBOLLA)', ph: 'SEPARAR POR COMAS...' },
              ].map(field => (
                <div key={field.key}>
                  <label className="text-[10px] font-black text-gray-400 uppercase mb-2 ml-1 block tracking-widest">{field.label}</label>
                  <input value={(editData as any)[field.key] ?? ''} onChange={e => setEditData(p => ({ ...p, [field.key]: e.target.value }))}
                    placeholder={field.ph} className="input-field text-[11px] font-black uppercase py-4 px-5 bg-gray-50 border-gray-100 focus:bg-white transition-all shadow-inner" />
                </div>
              ))}
              
              <div>
                <label className="text-[10px] font-black text-gray-400 uppercase mb-2 ml-1 block tracking-widest">Cumpleaños</label>
                <input type="date" value={(editData.birthday as string) ?? ''} onChange={e => setEditData(p => ({ ...p, birthday: e.target.value }))}
                  className="input-field py-4 px-5 bg-gray-50 border-gray-100 shadow-inner" />
              </div>

              <div>
                <label className="text-[10px] font-black text-gray-400 uppercase mb-2 ml-1 block tracking-widest">Notas Especiales</label>
                <textarea value={(editData.notes as string) ?? ''} onChange={e => setEditData(p => ({ ...p, notes: e.target.value }))}
                  rows={3} className="input-field resize-none text-[11px] font-black uppercase py-4 px-5 bg-gray-50 border-gray-100 shadow-inner" />
              </div>

              <div>
                <label className="text-[10px] font-black text-gray-400 uppercase mb-3 ml-1 block tracking-widest">Calificación del Cliente ({editData.rating ?? 5} ⭐)</label>
                <input type="range" min={1} max={5} value={editData.rating ?? 5} onChange={e => setEditData(p => ({ ...p, rating: Number(e.target.value) }))}
                  className="w-full accent-purple-600 h-2 bg-gray-100 rounded-lg appearance-none cursor-pointer" />
              </div>

              <button onClick={guardar} disabled={guardando} className="w-full bg-purple-600 hover:bg-purple-700 text-white py-5 rounded-[2rem] font-black uppercase text-sm shadow-2xl shadow-purple-100 transition-all active:scale-95 disabled:opacity-50 mt-4 tracking-widest">
                {guardando ? 'Guardando...' : 'Confirmar Cambios'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}