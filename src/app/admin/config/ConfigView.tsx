'use client'

import { useState, useEffect } from 'react'
import {
  Save, Store, Palette, Globe, Lock, CheckCircle,
  Plus, Trash2, Eye, EyeOff, X, Users, ImagePlus,
  Zap, AlertCircle, Gift, MapPin, Edit3, 
  CreditCard, Building, Truck // <-- Añadí los íconos nuevos aquí
} from 'lucide-react'
import clsx from 'clsx'

const TABS = [
  { id: 'tienda',        label: 'Tienda',        icon: Store   },
  { id: 'caja',          label: 'Caja y Pagos',  icon: CreditCard }, // <-- NUEVA PESTAÑA
  { id: 'sucursales',    label: 'Sucursales',    icon: MapPin  },
  { id: 'apariencia',    label: 'Apariencia',    icon: Palette },
  { id: 'canales',       label: 'Canales',       icon: Globe   },
  { id: 'usuarios',      label: 'Usuarios',      icon: Users   },
  { id: 'integraciones', label: 'Integraciones', icon: Zap     },
  { id: 'acceso',        label: 'Seguridad',     icon: Lock    },
]

const CANALES_DEFAULT = [
  { id: 'local',     name: 'Local / Retiro', fee: 0,  active: true,  builtin: true  },
  { id: 'directo',   name: 'Pedido Directo', fee: 0,  active: true,  builtin: true  },
  { id: 'whatsapp',  name: 'WhatsApp',       fee: 0,  active: true,  builtin: true  },
  { id: 'pedidosya', name: 'PedidosYa',      fee: 18, active: true,  builtin: false },
  { id: 'rappi',     name: 'Rappi',          fee: 20, active: true,  builtin: false },
  { id: 'ifood',     name: 'iFood',          fee: 22, active: false, builtin: false },
  { id: 'uber',      name: 'Uber Eats',      fee: 25, active: false, builtin: false },
]

interface Canal    { id: string; name: string; fee: number; active: boolean; builtin: boolean }
interface Usuario  { id: string; name: string; email: string; role: string; active: boolean }
interface Sucursal { id: string; name: string; address: string; active: boolean }

export default function ConfigView() {
  const [tab, setTab]             = useState('tienda')
  const [guardando, setGuardando] = useState(false)
  const [exito, setExito]         = useState('')
  const [subiendo, setSubiendo]   = useState(false)

  // --- AÑADÍ LOS CAMPOS NUEVOS AL CONFIG INICIAL ---
  const [config, setConfig] = useState({
    name: 'Glotones 593', phone: '', instagram: '', address: '',
    primaryColor: '#c026d3', logoUrl: '', showBanner: true,
    bannerTitle: 'ACUMULA SMASH POINTS',
    bannerText: 'Regístrate y gana puntos con cada compra',
    bannerBtnText: 'Únete',
    bank_name: '', bank_account_type: '', bank_account: '', bank_ruc: '', bank_owner: '',
    enable_cash: true, enable_transfer: true, enable_card: true,
    enable_local: true, enable_pickup: true, enable_delivery: true,
  })

  const [ratioPuntos, setRatioPuntos] = useState(20)
  const [canales, setCanales]         = useState<Canal[]>(CANALES_DEFAULT)
  const [modalCanal, setModalCanal]   = useState(false)
  const [nuevoCanal, setNuevoCanal]   = useState({ name: '', fee: 0 })

  const [usuarios, setUsuarios]       = useState<Usuario[]>([
    { id: '1', name: 'Admin Glotones', email: 'admin@glotones593.com', role: 'admin', active: true },
  ])
  const [modalUser, setModalUser]     = useState(false)
  const [nuevoUser, setNuevoUser]     = useState({ name: '', email: '', password: '', role: 'cajero' })
  const [showPwd, setShowPwd]         = useState(false)

  const [pwdNueva, setPwdNueva]       = useState('')
  const [pwdConfirm, setPwdConfirm]   = useState('')
  const [showPwds, setShowPwds]       = useState(false)
  const [errPwd, setErrPwd]           = useState('')

  const [integr, setIntegr] = useState({
    rappi_token: '', rappi_store_id: '', rappi_active: false,
    pedidosya_token: '', pedidosya_store: '', pedidosya_active: false,
    ubereats_token: '', ubereats_store: '', ubereats_active: false,
  })

  // ESTADOS PARA SUCURSALES
  const [sucursales, setSucursales]   = useState<Sucursal[]>([])
  const [modalSucursal, setModalSucursal] = useState({ open: false, isEdit: false })
  const [nuevaSucursal, setNuevaSucursal] = useState<Sucursal>({ id: '', name: '', address: '', active: true })

  useEffect(() => {
    fetch('/api/settings').then(r => r.json()).then(data => {
      if (data?.store)         setConfig(p => ({ ...p, ...data.store }))
      if (data?.canales)       setCanales(data.canales)
      if (data?.usuarios)      setUsuarios(data.usuarios)
      if (data?.integraciones) setIntegr(p => ({ ...p, ...data.integraciones }))
      if (data?.ratio_puntos)  setRatioPuntos(Number(data.ratio_puntos))
    })

    fetch('/api/locations').then(r => r.json()).then(data => {
      if (Array.isArray(data)) setSucursales(data)
    })
  }, [])

  const update = (k: string, v: any) => setConfig(p => ({ ...p, [k]: v }))
  const ok = (msg: string) => { setExito(msg); setTimeout(() => setExito(''), 3000) }

  const guardar = async (key: string, value: any) => {
    setGuardando(true)
    await fetch('/api/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ [key]: value }), // Modificado para que haga match perfecto con tu route.ts
    })
    setGuardando(false)
    ok('¡Guardado correctamente!')
  }

  const guardarPuntos = async () => {
    setGuardando(true)
    await fetch('/api/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ratio_puntos: ratioPuntos }),
    })
    setGuardando(false)
    ok('¡Reglas de lealtad actualizadas!')
  }

  const guardarSucursal = async () => {
    if (!nuevaSucursal.id || !nuevaSucursal.name) return
    setGuardando(true)
    await fetch('/api/locations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(nuevaSucursal),
    })
    setModalSucursal({ open: false, isEdit: false })
    setNuevaSucursal({ id: '', name: '', address: '', active: true })
    
    // Recargar lista
    const res = await fetch('/api/locations')
    const data = await res.json()
    if (Array.isArray(data)) setSucursales(data)
    
    setGuardando(false)
    ok('Sucursal guardada')
  }

  const eliminarSucursal = async (id: string) => {
    if (!confirm('¿Eliminar sucursal?')) return
    await fetch(`/api/locations?id=${id}`, { method: 'DELETE' })
    setSucursales(prev => prev.filter(s => s.id !== id))
    ok('Sucursal eliminada')
  }

  const subirLogo = async (file: File) => {
    setSubiendo(true)
    const fd = new FormData()
    fd.append('file', file)
    fd.append('folder', 'logos')
    const res  = await fetch('/api/upload', { method: 'POST', body: fd })
    const data = await res.json()
    setSubiendo(false)
    if (data.url) update('logoUrl', data.url)
  }

  const agregarCanal = () => {
    if (!nuevoCanal.name.trim()) return
    const c: Canal = { id: nuevoCanal.name.toLowerCase().replace(/\s+/g, '_'), name: nuevoCanal.name, fee: nuevoCanal.fee, active: true, builtin: false }
    const lista = [...canales, c]
    setCanales(lista)
    guardar('canales', lista)
    setNuevoCanal({ name: '', fee: 0 })
    setModalCanal(false)
  }

  const agregarUsuario = () => {
    if (!nuevoUser.name || !nuevoUser.email) return
    const u: Usuario = { id: Date.now().toString(), name: nuevoUser.name, email: nuevoUser.email, role: nuevoUser.role, active: true }
    const lista = [...usuarios, u]
    setUsuarios(lista)
    guardar('usuarios', lista)
    setNuevoUser({ name: '', email: '', password: '', role: 'cajero' })
    setModalUser(false)
  }

  const cambiarClave = () => {
    setErrPwd('')
    if (pwdNueva.length < 8) { setErrPwd('Mínimo 8 caracteres'); return }
    if (pwdNueva !== pwdConfirm) { setErrPwd('Las claves no coinciden'); return }
    guardar('pwd_hint', `Cambiada el ${new Date().toLocaleDateString('es-EC')}`)
    setPwdNueva(''); setPwdConfirm('')
    ok('Clave actualizada. Actualiza también tu .env.local')
  }

  const Toggle = ({ value, onChange }: { value: boolean; onChange: () => void }) => (
    <div onClick={onChange} className={clsx('w-10 h-5 rounded-full cursor-pointer relative transition-colors', value ? 'bg-purple-600' : 'bg-gray-300')}>
      <div className={clsx('absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all', value ? 'left-5' : 'left-0.5')} />
    </div>
  )

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="font-display font-black text-2xl text-gray-800">Configuración</h1>
        {exito && (
          <div className="flex items-center gap-2 bg-green-50 text-green-700 text-sm px-4 py-2 rounded-xl border border-green-100">
            <CheckCircle className="w-4 h-4" /> {exito}
          </div>
        )}
      </div>

      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl flex-wrap">
        {TABS.map(t => {
          const Icon = t.icon
          return (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={clsx('flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all',
                tab === t.id ? 'bg-white text-purple-700 shadow-sm' : 'text-gray-500 hover:text-gray-700')}>
              <Icon className="w-4 h-4" />{t.label}
            </button>
          )
        })}
      </div>

      {/* TIENDA */}
      {tab === 'tienda' && (
        <div className="space-y-5 animate-in fade-in">
          <div className="card space-y-5">
            <h2 className="font-bold text-gray-700">Información del negocio</h2>
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 block">Logo</label>
              <div className="flex items-center gap-4">
                <div className="w-20 h-20 rounded-2xl bg-gray-100 border-2 border-dashed border-gray-200 flex items-center justify-center overflow-hidden">
                  {config.logoUrl ? <img src={config.logoUrl} className="w-full h-full object-contain" /> : <Store className="w-8 h-8 text-gray-300" />}
                </div>
                <label className="flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 border-dashed border-gray-200 hover:border-purple-300 hover:bg-purple-50 cursor-pointer transition-all text-sm">
                  <ImagePlus className="w-4 h-4 text-purple-500" />
                  <span className="text-gray-600">{subiendo ? 'Subiendo...' : 'Subir logo'}</span>
                  <input type="file" accept="image/*" className="hidden" onChange={e => e.target.files?.[0] && subirLogo(e.target.files[0])} />
                </label>
              </div>
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5 block">Nombre del negocio</label>
              <input value={config.name} onChange={e => update('name', e.target.value)} className="input-field" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5 block">Teléfono</label>
                <input value={config.phone} onChange={e => update('phone', e.target.value)} placeholder="0999999999" className="input-field" />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5 block">Instagram</label>
                <input value={config.instagram} onChange={e => update('instagram', e.target.value)} placeholder="@glotones593" className="input-field" />
              </div>
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5 block">Dirección</label>
              <input value={config.address} onChange={e => update('address', e.target.value)} className="input-field" />
            </div>
            <button onClick={() => guardar('store', config)} disabled={guardando} className="btn-brand flex items-center gap-2">
              <Save className="w-4 h-4" /> {guardando ? 'Guardando...' : 'Guardar datos de tienda'}
            </button>
          </div>

          <div className="card space-y-4 border-2 border-purple-100 bg-purple-50/30">
            <div className="flex items-center gap-2 mb-2">
              <Gift className="w-5 h-5 text-purple-600" />
              <h2 className="font-bold text-gray-800">Programa de Lealtad (Cashback)</h2>
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5 block">
                Meta para ganar 1 Punto ($1 de descuento)
              </label>
              <div className="flex items-center gap-3 mt-2">
                <span className="text-gray-400 font-medium">$</span>
                <input 
                  type="number" 
                  value={ratioPuntos} 
                  onChange={(e) => setRatioPuntos(Number(e.target.value))}
                  className="input-field max-w-[120px]"
                />
                <span className="text-gray-500 font-medium text-sm">de compra = 1 Punto</span>
              </div>
              <p className="text-xs text-gray-500 mt-3 italic">
                * Los puntos se calculan automáticamente sumando todas las compras del año en curso. 
                Las compras por plataformas de delivery no suman puntos.
              </p>
            </div>
            <button onClick={guardarPuntos} disabled={guardando} className="btn-brand flex items-center gap-2 bg-purple-700 hover:bg-purple-800">
              <Save className="w-4 h-4" /> Guardar reglas de lealtad
            </button>
          </div>
        </div>
      )}

      {/* ── NUEVA PESTAÑA: CAJA Y PAGOS ─────────────────────────────────── */}
      {tab === 'caja' && (
        <div className="space-y-5 animate-in fade-in">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* DATOS BANCARIOS */}
            <div className="card space-y-4">
              <div className="flex items-center gap-2 border-b pb-3">
                <Building className="w-5 h-5 text-purple-600" />
                <h2 className="font-bold text-gray-700">Datos para Transferencias</h2>
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5 block">Banco</label>
                <input value={config.bank_name ?? ''} onChange={e => update('bank_name', e.target.value)} placeholder="Ej: Banco Pichincha" className="input-field" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5 block">Tipo de Cuenta</label>
                  <input value={config.bank_account_type ?? ''} onChange={e => update('bank_account_type', e.target.value)} placeholder="Ej: Ahorros" className="input-field" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5 block">Nº de Cuenta</label>
                  <input value={config.bank_account ?? ''} onChange={e => update('bank_account', e.target.value)} placeholder="Ej: 2200000000" className="input-field" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5 block">CI / RUC</label>
                  <input value={config.bank_ruc ?? ''} onChange={e => update('bank_ruc', e.target.value)} placeholder="Ej: 0999999999001" className="input-field" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5 block">Titular</label>
                  <input value={config.bank_owner ?? ''} onChange={e => update('bank_owner', e.target.value)} placeholder="Ej: Glotones 593" className="input-field" />
                </div>
              </div>
            </div>

            <div className="space-y-5">
              {/* MÉTODOS DE PAGO */}
              <div className="card space-y-4">
                <div className="flex items-center gap-2 border-b pb-3">
                  <CreditCard className="w-5 h-5 text-purple-600" />
                  <h2 className="font-bold text-gray-700">Métodos de Pago Activos</h2>
                </div>
                <div className="flex items-center justify-between p-2 hover:bg-gray-50 rounded-lg transition-colors">
                  <span className="font-semibold text-sm text-gray-700">Efectivo al recibir</span>
                  <Toggle value={config.enable_cash !== false} onChange={() => update('enable_cash', config.enable_cash === false ? true : false)} />
                </div>
                <div className="flex items-center justify-between p-2 hover:bg-gray-50 rounded-lg transition-colors">
                  <span className="font-semibold text-sm text-gray-700">Transferencia Bancaria</span>
                  <Toggle value={config.enable_transfer !== false} onChange={() => update('enable_transfer', config.enable_transfer === false ? true : false)} />
                </div>
                <div className="flex items-center justify-between p-2 hover:bg-gray-50 rounded-lg transition-colors">
                  <span className="font-semibold text-sm text-gray-700">Tarjeta de Crédito / Link</span>
                  <Toggle value={config.enable_card !== false} onChange={() => update('enable_card', config.enable_card === false ? true : false)} />
                </div>
              </div>

              {/* CANALES DE ENTREGA INTERNOS */}
              <div className="card space-y-4">
                <div className="flex items-center gap-2 border-b pb-3">
                  <Truck className="w-5 h-5 text-purple-600" />
                  <h2 className="font-bold text-gray-700">Canales de Entrega (Web)</h2>
                </div>
                <div className="flex items-center justify-between p-2 hover:bg-gray-50 rounded-lg transition-colors">
                  <span className="font-semibold text-sm text-gray-700">Local (Comer aquí)</span>
                  <Toggle value={config.enable_local !== false} onChange={() => update('enable_local', config.enable_local === false ? true : false)} />
                </div>
                <div className="flex items-center justify-between p-2 hover:bg-gray-50 rounded-lg transition-colors">
                  <span className="font-semibold text-sm text-gray-700">Retiro (Para llevar)</span>
                  <Toggle value={config.enable_pickup !== false} onChange={() => update('enable_pickup', config.enable_pickup === false ? true : false)} />
                </div>
                <div className="flex items-center justify-between p-2 hover:bg-gray-50 rounded-lg transition-colors">
                  <span className="font-semibold text-sm text-gray-700">Pedido Directo (Delivery)</span>
                  <Toggle value={config.enable_delivery !== false} onChange={() => update('enable_delivery', config.enable_delivery === false ? true : false)} />
                </div>
              </div>
            </div>
          </div>
          <button onClick={() => guardar('store', config)} disabled={guardando} className="btn-brand flex items-center gap-2">
            <Save className="w-4 h-4" /> {guardando ? 'Guardando...' : 'Guardar Caja y Pagos'}
          </button>
        </div>
      )}

      {/* SUCURSALES */}
      {tab === 'sucursales' && (
        <div className="space-y-4 animate-in fade-in">
          <div className="flex justify-between items-center">
            <h2 className="font-bold text-gray-700 uppercase text-sm">Sucursales del negocio</h2>
            <button onClick={() => setModalSucursal({ open: true, isEdit: false })} className="btn-brand text-xs px-4 py-2 flex items-center gap-1.5">
              <Plus className="w-4 h-4" /> Nueva Sucursal
            </button>
          </div>
          <div className="bg-white rounded-3xl border border-gray-100 overflow-hidden shadow-sm">
            <table className="w-full text-sm text-left">
              <thead className="bg-gray-50 text-gray-400 font-black text-[10px] uppercase">
                <tr>
                  <th className="px-6 py-4">ID / Slug</th>
                  <th className="px-6 py-4">Nombre Comercial</th>
                  <th className="px-6 py-4 text-center">Estado</th>
                  <th className="px-6 py-4 text-right">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 uppercase text-[11px] font-bold">
                {sucursales.map((s) => (
                  <tr key={s.id} className="hover:bg-gray-50 transition-colors text-gray-700">
                    <td className="px-6 py-4 text-purple-600 font-black">{s.id}</td>
                    <td className="px-6 py-4">
                      <p className="text-gray-900">{s.name}</p>
                      <p className="text-[9px] text-gray-400 normal-case italic font-medium">{s.address}</p>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className={clsx("px-2 py-1 rounded-lg", s.active ? "bg-green-50 text-green-600" : "bg-red-50 text-red-500")}>
                        {s.active ? 'ACTIVA' : 'INACTIVA'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right flex justify-end gap-2">
                      <button onClick={() => { setNuevaSucursal(s); setModalSucursal({ open: true, isEdit: true }) }} className="p-2 hover:bg-gray-100 rounded-lg text-gray-400">
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button onClick={() => eliminarSucursal(s.id)} className="p-2 hover:bg-red-50 rounded-lg text-gray-400 hover:text-red-500">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* APARIENCIA */}
      {tab === 'apariencia' && (
        <div className="space-y-4 animate-in fade-in">
          <div className="card space-y-4">
            <h2 className="font-bold text-gray-700">Color principal</h2>
            <div className="flex items-center gap-3">
              <input type="color" value={config.primaryColor} onChange={e => update('primaryColor', e.target.value)} className="w-12 h-10 rounded-lg border border-gray-200 cursor-pointer p-1" />
              <input value={config.primaryColor} onChange={e => update('primaryColor', e.target.value)} className="input-field flex-1 font-mono text-sm" />
              <div className="w-10 h-10 rounded-xl shrink-0" style={{ backgroundColor: config.primaryColor }} />
            </div>
          </div>
          <div className="card space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-gray-700">Banner promocional</h2>
              <Toggle value={config.showBanner} onChange={() => update('showBanner', !config.showBanner)} />
            </div>
            {config.showBanner && (
              <>
                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5 block">Título</label>
                  <input value={config.bannerTitle} onChange={e => update('bannerTitle', e.target.value)} className="input-field" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5 block">Texto</label>
                  <input value={config.bannerText} onChange={e => update('bannerText', e.target.value)} className="input-field" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5 block">Texto del botón</label>
                  <input value={config.bannerBtnText} onChange={e => update('bannerBtnText', e.target.value)} className="input-field" />
                </div>
              </>
            )}
          </div>
          <button onClick={() => guardar('store', config)} disabled={guardando} className="btn-brand flex items-center gap-2">
            <Save className="w-4 h-4" /> Guardar apariencia
          </button>
        </div>
      )}

      {/* CANALES */}
      {tab === 'canales' && (
        <div className="space-y-4 animate-in fade-in">
          <div className="card space-y-3">
            <div className="flex items-center justify-between mb-2">
              <h2 className="font-bold text-gray-700">Canales de venta externos</h2>
              <button onClick={() => setModalCanal(true)} className="btn-brand text-sm flex items-center gap-1.5">
                <Plus className="w-4 h-4" /> Nuevo canal
              </button>
            </div>
            {canales.map(c => (
              <div key={c.id} className={clsx('flex items-center gap-3 p-3 rounded-xl border transition-all', c.active ? 'bg-white border-gray-200' : 'bg-gray-50 border-gray-100 opacity-60')}>
                <Toggle value={c.active} onChange={() => setCanales(prev => prev.map(x => x.id === c.id ? { ...x, active: !x.active } : x))} />
                <div className="flex-1">
                  <p className="font-semibold text-sm text-gray-800">{c.name}</p>
                  {c.builtin && <p className="text-xs text-gray-400">Canal nativo</p>}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500">Comisión:</span>
                  <input type="number" value={c.fee} min="0" max="50" step="0.5"
                    onChange={e => setCanales(prev => prev.map(x => x.id === c.id ? { ...x, fee: Number(e.target.value) } : x))}
                    className="w-16 input-field text-xs py-1.5 text-center" />
                  <span className="text-xs text-gray-500">%</span>
                </div>
                {!c.builtin && (
                  <button onClick={() => setCanales(prev => prev.filter(x => x.id !== c.id))} className="p-1.5 rounded-lg hover:bg-red-50 text-red-400">
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
          </div>
          <button onClick={() => guardar('canales', canales)} disabled={guardando} className="btn-brand flex items-center gap-2">
            <Save className="w-4 h-4" /> Guardar canales
          </button>
        </div>
      )}

      {/* USUARIOS */}
      {tab === 'usuarios' && (
        <div className="space-y-4 animate-in fade-in">
          <div className="card space-y-3">
            <div className="flex items-center justify-between mb-2">
              <h2 className="font-bold text-gray-700">Usuarios del sistema</h2>
              <button onClick={() => setModalUser(true)} className="btn-brand text-sm flex items-center gap-1.5">
                <Plus className="w-4 h-4" /> Nuevo usuario
              </button>
            </div>
            {usuarios.map(u => (
              <div key={u.id} className={clsx('flex items-center gap-3 p-3 rounded-xl border', u.active ? 'bg-white border-gray-200' : 'bg-gray-50 border-gray-100 opacity-60')}>
                <div className="w-9 h-9 rounded-xl bg-purple-100 flex items-center justify-center text-purple-700 font-bold text-sm shrink-0">{u.name[0]}</div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm text-gray-800">{u.name}</p>
                  <p className="text-xs text-gray-400 truncate">{u.email}</p>
                </div>
                <span className={clsx('badge text-xs', u.role === 'admin' ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-600')}>{u.role}</span>
                <Toggle value={u.active} onChange={() => { const lista = usuarios.map(x => x.id === u.id ? { ...x, active: !x.active } : x); setUsuarios(lista); guardar('usuarios', lista) }} />
                {u.role !== 'admin' && (
                  <button onClick={() => { if (!confirm('¿Eliminar?')) return; const lista = usuarios.filter(x => x.id !== u.id); setUsuarios(lista); guardar('usuarios', lista) }}
                    className="p-1.5 rounded-lg hover:bg-red-50 text-red-400"><Trash2 className="w-4 h-4" /></button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* INTEGRACIONES */}
      {tab === 'integraciones' && (
        <div className="space-y-4 animate-in fade-in">
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm text-blue-700 flex gap-2">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <p>Configura los tokens API de cada plataforma. Contáctalas directamente para obtener acceso como partner.</p>
          </div>
          {[
            { key: 'rappi', label: 'Rappi', color: 'bg-orange-500', activeKey: 'rappi_active' as const, tokenKey: 'rappi_token' as const, storeKey: 'rappi_store_id' as const, placeholder: 'Bearer token...' },
            { key: 'pedidosya', label: 'PedidosYa', color: 'bg-red-500', activeKey: 'pedidosya_active' as const, tokenKey: 'pedidosya_token' as const, storeKey: 'pedidosya_store' as const, placeholder: 'Bearer token...' },
            { key: 'ubereats', label: 'Uber Eats', color: 'bg-black', activeKey: 'ubereats_active' as const, tokenKey: 'ubereats_token' as const, storeKey: 'ubereats_store' as const, placeholder: 'Client ID...' },
          ].map(plat => (
            <div key={plat.key} className="card space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 ${plat.color} rounded-xl flex items-center justify-center text-white font-black text-xs`}>{plat.label.slice(0, 2)}</div>
                  <p className="font-bold text-gray-800">{plat.label}</p>
                </div>
                <Toggle value={integr[plat.activeKey]} onChange={() => setIntegr(p => ({ ...p, [plat.activeKey]: !p[plat.activeKey] }))} />
              </div>
              {integr[plat.activeKey] && (
                <div className="grid grid-cols-2 gap-3 pt-2 border-t">
                  <div>
                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5 block">API Token</label>
                    <input type="password" value={integr[plat.tokenKey]} onChange={e => setIntegr(p => ({ ...p, [plat.tokenKey]: e.target.value }))} placeholder={plat.placeholder} className="input-field text-xs" />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5 block">Store ID</label>
                    <input value={integr[plat.storeKey]} onChange={e => setIntegr(p => ({ ...p, [plat.storeKey]: e.target.value }))} placeholder="123456" className="input-field text-xs" />
                  </div>
                </div>
              )}
            </div>
          ))}
          <button onClick={() => guardar('integraciones', integr)} disabled={guardando} className="btn-brand flex items-center gap-2">
            <Save className="w-4 h-4" /> Guardar integraciones
          </button>
        </div>
      )}

      {/* SEGURIDAD */}
      {tab === 'acceso' && (
        <div className="space-y-4 animate-in fade-in">
          <div className="card space-y-4">
            <h2 className="font-bold text-gray-700">Cambiar contraseña admin</h2>
            <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-3 text-xs text-yellow-700 flex gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>Después de cambiar la clave aquí, actualiza también ADMIN_PASSWORD en tu .env.local.</span>
            </div>
            {errPwd && <div className="bg-red-50 text-red-600 text-sm px-4 py-3 rounded-xl border border-red-100">{errPwd}</div>}
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5 block">Nueva contraseña</label>
              <div className="relative">
                <input type={showPwds ? 'text' : 'password'} value={pwdNueva} onChange={e => setPwdNueva(e.target.value)} placeholder="Mínimo 8 caracteres" className="input-field pr-10" />
                <button type="button" onClick={() => setShowPwds(!showPwds)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                  {showPwds ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5 block">Confirmar contraseña</label>
              <input type={showPwds ? 'text' : 'password'} value={pwdConfirm} onChange={e => setPwdConfirm(e.target.value)} placeholder="Repite la contraseña" className="input-field" />
            </div>
            <button onClick={cambiarClave} disabled={guardando} className="btn-brand flex items-center gap-2">
              <Lock className="w-4 h-4" /> Cambiar contraseña
            </button>
          </div>
        </div>
      )}

      {/* MODALES EXTRAS */}
      {modalCanal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-bold text-gray-800 uppercase text-sm">Nuevo canal</h3>
              <button onClick={() => setModalCanal(false)}><X className="w-5 h-5 text-gray-400" /></button>
            </div>
            <div className="space-y-4">
              <input value={nuevoCanal.name} onChange={e => setNuevoCanal(p => ({ ...p, name: e.target.value }))} placeholder="Ej: Glovo" className="input-field" />
              <input type="number" value={nuevoCanal.fee} min="0" max="50" onChange={e => setNuevoCanal(p => ({ ...p, fee: Number(e.target.value) }))} className="input-field" placeholder="Comisión %" />
              <button onClick={agregarCanal} className="w-full btn-brand py-3">Agregar canal</button>
            </div>
          </div>
        </div>
      )}

      {modalUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-bold text-gray-800 uppercase text-sm">Nuevo usuario</h3>
              <button onClick={() => setModalUser(false)}><X className="w-5 h-5 text-gray-400" /></button>
            </div>
            <div className="space-y-4">
              <input value={nuevoUser.name} onChange={e => setNuevoUser(p => ({ ...p, name: e.target.value }))} placeholder="Nombre completo" className="input-field" />
              <input type="email" value={nuevoUser.email} onChange={e => setNuevoUser(p => ({ ...p, email: e.target.value }))} placeholder="email@ejemplo.com" className="input-field" />
              <div className="relative">
                <input type={showPwd ? 'text' : 'password'} value={nuevoUser.password} onChange={e => setNuevoUser(p => ({ ...p, password: e.target.value }))} placeholder="Contraseña inicial" className="input-field pr-10" />
                <button type="button" onClick={() => setShowPwd(!showPwd)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                  {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <select value={nuevoUser.role} onChange={e => setNuevoUser(p => ({ ...p, role: e.target.value }))} className="input-field uppercase text-xs font-bold">
                {['admin', 'cajero', 'cocina', 'solo_lectura'].map(r => <option key={r} value={r}>{r}</option>)}
              </select>
              <button onClick={agregarUsuario} className="w-full btn-brand py-3 font-bold uppercase text-xs">Crear usuario</button>
            </div>
          </div>
        </div>
      )}

      {modalSucursal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-8 space-y-6 animate-in zoom-in-95">
             <div className="flex justify-between items-center border-b pb-4">
               <h3 className="font-black text-gray-800 uppercase tracking-tight">{modalSucursal.isEdit ? 'Editar Sucursal' : 'Nueva Sucursal'}</h3>
               <button onClick={() => setModalSucursal({ open: false, isEdit: false })}><X className="text-gray-400" /></button>
             </div>
             <div className="space-y-4">
               <div><label className="text-[10px] font-black text-gray-400 uppercase block mb-1">ID Único (slug)</label><input value={nuevaSucursal.id} disabled={modalSucursal.isEdit} onChange={e => setNuevaSucursal({...nuevaSucursal, id: e.target.value})} className="input-field" placeholder="sur-1" /></div>
               <div><label className="text-[10px] font-black text-gray-400 uppercase block mb-1">Nombre Comercial</label><input value={nuevaSucursal.name} onChange={e => setNuevaSucursal({...nuevaSucursal, name: e.target.value})} className="input-field" placeholder="Glotones Sur" /></div>
               <div><label className="text-[10px] font-black text-gray-400 uppercase block mb-1">Dirección</label><input value={nuevaSucursal.address} onChange={e => setNuevaSucursal({...nuevaSucursal, address: e.target.value})} className="input-field" placeholder="Av. Principal..." /></div>
               <div className="flex items-center justify-between p-3 bg-gray-50 rounded-2xl">
                 <span className="text-[10px] font-black text-gray-500 uppercase">Activa</span>
                 <Toggle value={nuevaSucursal.active} onChange={() => setNuevaSucursal({...nuevaSucursal, active: !nuevaSucursal.active})} />
               </div>
               <button onClick={guardarSucursal} className="w-full btn-brand py-4 rounded-2xl uppercase text-xs font-black shadow-lg">Confirmar</button>
             </div>
          </div>
        </div>
      )}
    </div>
  )
}