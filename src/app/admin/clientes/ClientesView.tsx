'use client'

import { useState, useEffect, useMemo } from 'react'
import {
  Search, Users, Star, Phone, Mail, MapPin, Instagram,
  ShoppingBag, TrendingUp, Gift, X, Edit, Plus, Crown,
  Calendar, MessageCircle, Filter
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

      return matchSearch && matchFiltro
    })
  }, [clientes, busqueda, filtro])

  const stats = {
    total:     clientes.length,
    vip:       clientes.filter(c => c.auto_tags.includes('VIP')).length,
    frecuente: clientes.filter(c => c.auto_tags.includes('Frecuente')).length,
    nuevos:    clientes.filter(c => c.auto_tags.includes('Nuevo')).length,
    ingresos:  clientes.reduce((a, c) => a + c.total_spent, 0),
  }

  if (loading) return (
    <div className="flex items-center justify-center h-full min-h-[50vh]">
      <div className="w-8 h-8 border-4 border-gray-200 border-t-purple-500 rounded-full animate-spin" />
    </div>
  )

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-display font-black text-2xl text-gray-800">CRM — Clientes</h1>
          <p className="text-gray-400 text-sm">{clientes.length} clientes registrados</p>
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
            <div key={s.label} className={`card flex items-center gap-3 ${s.color}`}>
              {/* Validación de seguridad para el Icono */}
              {Icon ? <Icon className="w-7 h-7 shrink-0" /> : <div className="w-7 h-7 bg-gray-200 rounded-full" />}
              <div>
                <p className="text-xs font-semibold opacity-70 uppercase tracking-wide">{s.label}</p>
                <p className="font-display font-black text-xl">{s.value}</p>
              </div>
            </div>
          )
        })}
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap gap-2 items-center">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input value={busqueda} onChange={e => setBusqueda(e.target.value)}
            placeholder="Buscar por nombre, teléfono o email..." className="input-field pl-9" />
        </div>
        <div className="flex gap-1.5 flex-wrap">
          {['Todos', 'VIP', 'Frecuente', 'Nuevo', 'Oro', 'Plata'].map(f => (
            <button key={f} onClick={() => setFiltro(f)}
              className={clsx('px-3 py-1.5 rounded-xl text-xs font-semibold transition-all',
                filtro === f ? 'bg-purple-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200')}>
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* Tabla */}
      <div className="card overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b text-left text-xs uppercase text-gray-500">
                <th className="px-4 py-3">Cliente</th>
                <th className="px-4 py-3">Contacto</th>
                <th className="px-4 py-3">Pedidos</th>
                <th className="px-4 py-3">Total gastado</th>
                <th className="px-4 py-3">Puntos</th>
                <th className="px-4 py-3">Nivel</th>
                <th className="px-4 py-3">Tags</th>
                <th className="px-4 py-3">Último pedido</th>
                <th className="px-4 py-3 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtrados.map(c => {
                const loy = LOYALTY_CONFIG[c.loyalty]
                return (
                  <tr key={c.phone} className="hover:bg-gray-50 cursor-pointer" onClick={() => setSelected(c)}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-purple-100 flex items-center justify-center text-purple-700 font-bold text-sm shrink-0">
                          {c.name?.[0] ?? '?'}
                        </div>
                        <div>
                          <p className="font-semibold text-gray-800">{c.name ?? 'Sin nombre'}</p>
                          <p className="text-xs text-gray-400">{c.phone}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="space-y-0.5">
                        {c.email    && <p className="text-xs text-gray-500 flex items-center gap-1"><Mail className="w-3 h-3" />{c.email}</p>}
                        {c.instagram && <p className="text-xs text-gray-500 flex items-center gap-1"><Instagram className="w-3 h-3" />{c.instagram}</p>}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-bold text-gray-800">{c.order_count}</span>
                      <span className="text-gray-400 text-xs ml-1">pedidos</span>
                    </td>
                    <td className="px-4 py-3 font-bold text-purple-600">${c.total_spent.toFixed(2)}</td>
                    <td className="px-4 py-3">
                      <span className="flex items-center gap-1 font-bold text-gray-700">
                        <Gift className="w-3.5 h-3.5 text-purple-400" />
                        {c.points}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={clsx('badge border text-xs', loy.color)}>
                        {loy.icon} {c.loyalty}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {c.auto_tags.map(tag => (
                          <span key={tag} className="badge bg-purple-50 text-purple-600 text-xs">{tag}</span>
                        ))}
                        {c.manual_tags && c.manual_tags.split(',').map(tag => tag.trim()).filter(Boolean).map(tag => (
                          <span key={tag} className="badge bg-blue-50 text-blue-600 text-xs">{tag}</span>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-400">
                      {c.last_order ? tiempoAtras(c.last_order) : 'Nunca'}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button onClick={e => { e.stopPropagation(); abrirEditar(c) }}
                        className="p-1.5 rounded-lg hover:bg-blue-50 text-blue-500">
                        <Edit className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                )
              })}
              {filtrados.length === 0 && (
                <tr><td colSpan={9} className="px-4 py-12 text-center text-gray-400">
                  {busqueda ? `No se encontró "${busqueda}"` : 'No hay clientes registrados'}
                </td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL PERFIL CLIENTE */}
      {selected && !editModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b sticky top-0 bg-white">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-purple-100 flex items-center justify-center text-purple-700 font-black text-xl">
                  {selected.name?.[0] ?? '?'}
                </div>
                <div>
                  <h3 className="font-bold text-gray-800 text-lg">{selected.name ?? 'Sin nombre'}</h3>
                  <p className="text-sm text-gray-400">{selected.phone}</p>
                </div>
              </div>
              <div className="flex gap-2">
                <button onClick={() => abrirEditar(selected)} className="btn-ghost text-sm flex items-center gap-1.5">
                  <Edit className="w-4 h-4" /> Editar
                </button>
                <button onClick={() => setSelected(null)}><X className="w-5 h-5 text-gray-400" /></button>
              </div>
            </div>

            <div className="p-5 space-y-5">
              {/* Stats del cliente */}
              <div className="grid grid-cols-3 gap-3">
                <div className="card text-center bg-purple-50">
                  <p className="font-black text-2xl text-purple-700">{selected.order_count}</p>
                  <p className="text-xs text-purple-500 font-semibold">Pedidos</p>
                </div>
                <div className="card text-center bg-green-50">
                  <p className="font-black text-2xl text-green-700">${selected.total_spent.toFixed(2)}</p>
                  <p className="text-xs text-green-500 font-semibold">Total gastado</p>
                </div>
                <div className="card text-center bg-yellow-50">
                  <p className="font-black text-2xl text-yellow-700">{selected.points}</p>
                  <p className="text-xs text-yellow-500 font-semibold">Puntos</p>
                </div>
              </div>

              {/* Nivel de lealtad */}
              <div className={clsx('card border flex items-center gap-3', LOYALTY_CONFIG[selected.loyalty].color)}>
                <span className="text-3xl">{LOYALTY_CONFIG[selected.loyalty].icon}</span>
                <div>
                  <p className="font-bold">Nivel {selected.loyalty}</p>
                  <p className="text-xs opacity-70">
                    {selected.loyalty === 'Bronce' && `Necesita ${500 - selected.points} puntos más para Plata`}
                    {selected.loyalty === 'Plata'  && `Necesita ${1000 - selected.points} puntos más para Oro`}
                    {selected.loyalty === 'Oro'    && '¡Cliente de élite! 🏆'}
                  </p>
                </div>
              </div>

              {/* Info de contacto */}
              <div className="card space-y-3">
                <h4 className="font-bold text-gray-700">Información de contacto</h4>
                {[
                  { icon: Phone,     label: 'Teléfono',  value: selected.phone },
                  { icon: Mail,      label: 'Email',     value: selected.email },
                  { icon: MapPin,    label: 'Dirección', value: selected.address },
                  { icon: Instagram, label: 'Instagram', value: selected.instagram },
                  { icon: Calendar,  label: 'Cumpleaños',value: selected.birthday 
                    ? new Date(selected.birthday).toLocaleDateString('es-EC', { day: 'numeric', month: 'long' }) 
                    : null },
                ].filter(item => item.value).map(item => {
                  const Icon = item.icon
                  return (
                    <div key={item.label} className="flex items-center gap-3">
                      {/* Validación de seguridad para el Icono */}
                      {Icon && <Icon className="w-4 h-4 text-gray-400 shrink-0" />}
                      <div>
                        <p className="text-xs text-gray-400">{item.label}</p>
                        <p className="text-sm font-medium text-gray-700">{item.value}</p>
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Tags */}
              <div className="card space-y-2">
                <h4 className="font-bold text-gray-700">Tags</h4>
                <div className="flex flex-wrap gap-2">
                  {selected.auto_tags.map(tag => (
                    <span key={tag} className="badge bg-purple-50 text-purple-600 border border-purple-200">{tag}</span>
                  ))}
                  {selected.manual_tags && selected.manual_tags.split(',').map(t => t.trim()).filter(Boolean).map(tag => (
                    <span key={tag} className="badge bg-blue-50 text-blue-600 border border-blue-200">{tag}</span>
                  ))}
                </div>
              </div>

              {/* Notas */}
              {selected.notes && (
                <div className="card bg-yellow-50 border border-yellow-200">
                  <h4 className="font-bold text-yellow-700 mb-1">Notas</h4>
                  <p className="text-sm text-yellow-800">{selected.notes}</p>
                </div>
              )}

              {/* Acciones rápidas */}
              <div className="flex gap-3">
                {selected.phone && (
                  <a href={`https://wa.me/593${selected.phone}`} target="_blank" rel="noopener noreferrer"
                    className="flex-1 flex items-center justify-center gap-2 bg-green-500 hover:bg-green-600 text-white py-2.5 rounded-xl font-semibold text-sm transition-all">
                    <MessageCircle className="w-4 h-4" /> WhatsApp
                  </a>
                )}
                <button onClick={() => abrirEditar(selected)}
                  className="flex-1 btn-brand flex items-center justify-center gap-2 text-sm">
                  <Edit className="w-4 h-4" /> Editar perfil
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL EDITAR */}
      {editModal && selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b sticky top-0 bg-white">
              <h3 className="font-bold text-gray-800">Editar cliente</h3>
              <button onClick={() => setEditModal(false)}><X className="w-5 h-5 text-gray-400" /></button>
            </div>
            <div className="p-5 space-y-4">
              {[
                { key: 'name',        label: 'Nombre completo', placeholder: 'Juan Pérez'              },
                { key: 'email',       label: 'Email',           placeholder: 'juan@ejemplo.com'        },
                { key: 'address',     label: 'Dirección',       placeholder: 'Av. Principal...'        },
                { key: 'instagram',   label: 'Instagram',       placeholder: '@usuario'                },
                { key: 'manual_tags', label: 'Tags manuales',   placeholder: 'VIP, Sin picante, Alérgico a...' },
              ].map(field => (
                <div key={field.key}>
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5 block">{field.label}</label>
                  <input
                    value={(editData as any)[field.key] ?? ''}
                    onChange={e => setEditData(p => ({ ...p, [field.key]: e.target.value }))}
                    placeholder={field.placeholder}
                    className="input-field"
                  />
                </div>
              ))}

              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5 block">Cumpleaños</label>
                <input type="date" value={(editData.birthday as string) ?? ''}
                  onChange={e => setEditData(p => ({ ...p, birthday: e.target.value }))}
                  className="input-field" />
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5 block">Notas internas</label>
                <textarea value={(editData.notes as string) ?? ''}
                  onChange={e => setEditData(p => ({ ...p, notes: e.target.value }))}
                  rows={3} placeholder="Preferencias, alergias, notas especiales..."
                  className="input-field resize-none" />
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5 block">
                  Rating ({editData.rating ?? 5} ⭐)
                </label>
                <input type="range" min={1} max={5} value={editData.rating ?? 5}
                  onChange={e => setEditData(p => ({ ...p, rating: Number(e.target.value) }))}
                  className="w-full accent-purple-600" />
              </div>

              <button onClick={guardar} disabled={guardando} className="w-full btn-brand py-3 disabled:opacity-60">
                {guardando ? 'Guardando...' : 'Guardar cambios'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}