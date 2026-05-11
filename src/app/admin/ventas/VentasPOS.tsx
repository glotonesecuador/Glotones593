'use client'

import { useState, useEffect, useMemo } from 'react'
import { Search, ShoppingCart, Plus, Minus, Trash2, Receipt, User, CheckCircle, X, Mail, CreditCard } from 'lucide-react'
import type { Product, OrderItem, SaleChannel } from '@/types'
import clsx from 'clsx'

const CHANNELS = [
  { label: 'Local / Retiro',  value: 'Local'          },
  { label: 'Pedido Directo',  value: 'Pedido Directo'  },
  { label: 'PedidosYa',       value: 'PedidosYa',  fee: true },
  { label: 'Rappi',           value: 'Rappi',      fee: true },
  { label: 'iFood',           value: 'iFood',      fee: true },
  { label: 'WhatsApp',        value: 'WhatsApp'        },
]

const METODOS = ['Efectivo', 'Transferencia', 'Tarjeta', 'Payphone']

export default function VentasPOS() {
  const [products, setProducts]     = useState<Product[]>([])
  const [categories, setCategories] = useState<string[]>(['Todas'])
  const [activeCat, setActiveCat]   = useState('Todas')
  const [search, setSearch]         = useState('')
  const [cart, setCart]             = useState<OrderItem[]>([])
  const [channel, setChannel]       = useState<SaleChannel>('Local')
  const [method, setMethod]         = useState('Efectivo')
  const [feePercent, setFeePercent] = useState(0)
  
  // Datos del Cliente aplanados
  const [nombre, setNombre]         = useState('')
  const [telefono, setTelefono]     = useState('')
  const [cedula, setCedula]         = useState('')
  const [email, setEmail]           = useState('')
  
  const [notas, setNotas]           = useState('')
  const [loading, setLoading]       = useState(true)
  const [saving, setSaving]         = useState(false)
  const [exito, setExito]           = useState('')
  const [historial, setHistorial]   = useState<any[]>([])
  const [verHistorial, setVerHistorial] = useState(false)
  
  // Nuevos estados para sucursal y vuelto
  const [sucursalActual, setSucursalActual] = useState('todas')
  const [montoRecibido, setMontoRecibido] = useState<number | ''>('')

  const cargarProductos = () => {
    fetch('/api/products?admin=1')
      .then(r => r.json())
      .then((data) => {
        const lista = Array.isArray(data) ? data : []
        setProducts(lista)
        const cats = Array.from(new Set(lista.map((p: Product) => p.category))) as string[]
        setCategories(['Todas', ...cats])
        setLoading(false)
      })
  }

  const cargarHistorial = () => {
    fetch('/api/orders?limit=30')
      .then(r => r.json())
      .then(data => setHistorial(Array.isArray(data) ? data : []))
  }

  useEffect(() => { 
    cargarProductos()
    cargarHistorial()
    // Capturar la sucursal activa al cargar
    const sucursal = localStorage.getItem('sucursal_activa') || 'todas'
    setSucursalActual(sucursal)
  }, [])

  const filtrados = useMemo(() =>
    products.filter(p => {
      if (activeCat !== 'Todas' && p.category !== activeCat) return false
      if (search && !p.name.toLowerCase().includes(search.toLowerCase())) return false
      return true
    }), [products, activeCat, search])

  const agregar = (p: Product) => {
    setCart(prev => {
      const ex = prev.find(i => i.id === p.id)
      if (ex) return prev.map(i => i.id === p.id ? { ...i, quantity: i.quantity + 1 } : i)
      return [...prev, { id: p.id, name: p.name, price: p.price, quantity: 1, image_url: p.image_url }]
    })
  }

  const cambiarQty = (id: string, delta: number) => {
    setCart(prev => prev.map(i => i.id === id ? { ...i, quantity: i.quantity + delta } : i).filter(i => i.quantity > 0))
  }

  const subtotal = cart.reduce((a, i) => a + i.price * i.quantity, 0)
  const comision = subtotal * (feePercent / 100)
  const total    = subtotal

 const cobrar = async () => {
    if (cart.length === 0) return
    setSaving(true)

    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customer_name: nombre || 'Consumidor Final',
          phone: telefono || null,
          cedula: cedula || null,
          email: email || null,
          total,
          net_total: total - comision,
          channel,
          method,
          platform_fee: comision,
          items: cart,
          notes: notas || null,
          location_id: sucursalActual === 'todas' ? 'cd-rio-1' : sucursalActual,
          status: 'Pendiente' // Recuerda que esto asegura que vaya a la cocina
        }),
      })

      if (res.ok) {
        // ✨ LA MAGIA DEL CRM AQUÍ ✨
        // Si el cajero ingresó un teléfono, lo guardamos o actualizamos en el CRM
        if (telefono) {
          await fetch('/api/customers', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              phone: telefono,
              name: nombre || 'Consumidor Final',
              email: email || null
            })
          }).catch(err => console.log("Error silencioso CRM:", err))
        }

        // Limpiar el formulario
        setCart([])
        setNombre('')
        setTelefono('')
        setCedula('')
        setEmail('')
        setNotas('')
        setMontoRecibido('')
        setExito(`✅ Venta registrada — $${total.toFixed(2)}`)
        setTimeout(() => setExito(''), 4000)
        cargarHistorial()
      }
    } catch (error) {
      console.error("Error al cobrar:", error)
    } finally {
      setSaving(false)
    }
  }
  if (loading) return (
    <div className="h-full flex items-center justify-center">
      <div className="w-10 h-10 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin" />
    </div>
  )

  return (
    <div className="h-full flex overflow-hidden relative">
      {/* PRODUCTOS */}
      <div className="flex-1 flex flex-col overflow-hidden border-r border-gray-200">
        <div className="bg-white px-4 pt-4 pb-3 border-b space-y-3">
          <div className="flex gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Buscar producto..." className="input-field pl-9" />
            </div>
            <select value={channel} onChange={e => { setChannel(e.target.value as SaleChannel); setFeePercent(0) }}
              className="input-field w-44 font-bold text-gray-700">
              {CHANNELS.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select>
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {categories.map(cat => (
              <button key={cat} onClick={() => setActiveCat(cat)}
                className={clsx('shrink-0 px-4 py-1.5 rounded-full text-xs font-semibold transition-all',
                  activeCat === cat ? 'bg-purple-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200')}>
                {cat}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3">
            {filtrados.map(p => {
              const enCarrito = cart.find(i => i.id === p.id)
              return (
                <button key={p.id} onClick={() => agregar(p)}
                  className={clsx('relative bg-white rounded-2xl overflow-hidden shadow-sm border text-left hover:shadow-md active:scale-[0.98] transition-all',
                    enCarrito ? 'border-purple-300 ring-2 ring-purple-200' : 'border-gray-100')}>
                  {p.discount_pct > 0 && (
                    <span className="absolute top-2 left-2 z-10 badge bg-red-500 text-white">-{p.discount_pct}%</span>
                  )}
                  {enCarrito && (
                    <span className="absolute top-2 right-2 z-10 w-6 h-6 bg-purple-600 text-white rounded-full flex items-center justify-center text-xs font-bold">
                      {enCarrito.quantity}
                    </span>
                  )}
                  <div className="aspect-square bg-gray-100">
                    {p.image_url
                      ? <img src={p.image_url} alt={p.name} className="w-full h-full object-cover" />
                      : <div className="w-full h-full flex items-center justify-center text-4xl">🍔</div>}
                  </div>
                  <div className="p-2.5">
                    <p className="font-semibold text-gray-800 text-sm leading-tight line-clamp-2">{p.name}</p>
                    <p className="text-purple-600 font-bold text-base mt-1">${p.price.toFixed(2)}</p>
                  </div>
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {/* TICKET */}
      <div className="w-80 xl:w-[400px] flex flex-col bg-white overflow-hidden shadow-xl z-10">
        <div className="flex items-center justify-between px-4 py-3 bg-purple-700 text-white">
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <Receipt className="w-5 h-5" />
              <span className="font-display font-bold text-lg leading-tight">Ticket de Venta</span>
            </div>
            <span className="text-[10px] uppercase font-bold text-purple-200 tracking-wider">
              {sucursalActual === 'todas' ? 'Matriz' : sucursalActual}
            </span>
          </div>
          <button onClick={() => setVerHistorial(true)} className="bg-purple-800 hover:bg-purple-900 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors">
            Historial
          </button>
        </div>

        {exito && (
          <div className="bg-green-50 text-green-700 text-sm px-4 py-3 border-b border-green-100 flex items-center gap-2 animate-in fade-in">
            <CheckCircle className="w-4 h-4 shrink-0" />{exito}
          </div>
        )}

        <div className="px-4 pt-3 pb-3 border-b border-gray-100 bg-gray-50/50 space-y-2 shrink-0">
          <div className="grid grid-cols-2 gap-2">
            <div className="relative col-span-2">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
              <input value={nombre} onChange={e => setNombre(e.target.value)} placeholder="Nombre del cliente" className="input-field pl-9 text-xs py-2 bg-white" />
            </div>
            <div className="relative">
              <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
              <input value={cedula} onChange={e => setCedula(e.target.value)} placeholder="Cédula / RUC" className="input-field pl-9 text-xs py-2 bg-white" />
            </div>
            <input value={telefono} onChange={e => setTelefono(e.target.value)} placeholder="Teléfono" className="input-field text-xs py-2 bg-white px-3" />
            <div className="relative col-span-2">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
              <input value={email} onChange={e => setEmail(e.target.value)} placeholder="Correo electrónico" className="input-field pl-9 text-xs py-2 bg-white" type="email" />
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2 bg-gray-50/30">
          {cart.length === 0 ? (
            <div className="text-center py-12 text-gray-300">
              <ShoppingCart className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p className="text-sm font-bold uppercase tracking-widest">Sin productos</p>
            </div>
          ) : cart.map(item => (
            <div key={item.id} className="flex items-center gap-3 bg-white border border-gray-100 rounded-xl p-2 shadow-sm">
              {item.image_url
                ? <img src={item.image_url} className="w-10 h-10 rounded-lg object-cover shrink-0" />
                : <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center shrink-0 text-xl">🍔</div>}
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-gray-800 truncate uppercase">{item.name}</p>
                <p className="text-[10px] text-gray-500 font-semibold">${item.price.toFixed(2)} c/u</p>
              </div>
              <div className="flex items-center gap-1 shrink-0 bg-gray-50 rounded-lg p-0.5 border border-gray-100">
                <button onClick={() => cambiarQty(item.id, -1)} className="w-6 h-6 rounded-md bg-white hover:bg-gray-200 flex items-center justify-center shadow-sm text-gray-600">
                  <Minus className="w-3 h-3" />
                </button>
                <span className="w-5 text-center text-xs font-black">{item.quantity}</span>
                <button onClick={() => cambiarQty(item.id, +1)} className="w-6 h-6 rounded-md bg-purple-600 hover:bg-purple-700 text-white flex items-center justify-center shadow-sm">
                  <Plus className="w-3 h-3" />
                </button>
                <button onClick={() => setCart(prev => prev.filter(i => i.id !== item.id))} className="w-6 h-6 rounded-md bg-red-50 hover:bg-red-100 text-red-500 flex items-center justify-center ml-1">
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            </div>
          ))}
        </div>

        <div className="px-4 pb-4 pt-3 border-t bg-white space-y-3 shrink-0">
          <div className="flex gap-1.5 flex-wrap">
            {METODOS.map(m => (
              <button key={m} onClick={() => { setMethod(m); setMontoRecibido(''); }}
                className={clsx('flex-1 min-w-[70px] py-2 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all border',
                  method === m ? 'bg-purple-600 border-purple-600 text-white shadow-md' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50')}>
                {m}
              </button>
            ))}
          </div>

          {/* CALCULADORA DE VUELTO (Solo si es Efectivo) */}
          {method === 'Efectivo' && cart.length > 0 && (
            <div className="bg-green-50 p-3 rounded-xl border border-green-200 flex flex-col gap-2 animate-in fade-in zoom-in-95">
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-black text-green-800 uppercase tracking-widest">Efectivo Recibido</span>
                <div className="flex items-center gap-1 bg-white px-2 py-1 rounded-lg border border-green-200 shadow-sm">
                  <span className="text-green-700 font-bold">$</span>
                  <input
                    type="number"
                    value={montoRecibido}
                    onChange={e => setMontoRecibido(e.target.value ? Number(e.target.value) : '')}
                    className="w-16 text-right font-black text-green-900 outline-none bg-transparent"
                    placeholder="0.00"
                  />
                </div>
              </div>
              {typeof montoRecibido === 'number' && montoRecibido >= total && (
                <div className="flex justify-between items-center border-t border-green-200/50 pt-2 mt-1">
                  <span className="text-[10px] font-black text-green-800 uppercase tracking-widest">Entregar Vuelto</span>
                  <span className="font-black text-2xl text-green-600">${(montoRecibido - total).toFixed(2)}</span>
                </div>
              )}
            </div>
          )}

          {CHANNELS.find(c => c.value === channel)?.fee && (
            <div className="flex items-center justify-between bg-red-50 p-2 rounded-lg border border-red-100">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold text-red-800 uppercase">Comisión %</span>
                <input type="number" value={feePercent} onChange={e => setFeePercent(Number(e.target.value))}
                  className="w-12 input-field text-xs py-1 px-1 text-center bg-white" min="0" max="30" step="0.5" />
              </div>
              <span className="text-xs font-black text-red-600">-${comision.toFixed(2)}</span>
            </div>
          )}

          <input value={notas} onChange={e => setNotas(e.target.value)}
            placeholder="Notas del pedido (Ej: Sin cebolla)" className="input-field text-xs py-2" />

          <div className="flex justify-between items-center py-2 border-t border-gray-100">
            <span className="font-display font-black text-gray-400 uppercase tracking-widest">TOTAL A COBRAR</span>
            <span className="font-display font-black text-3xl text-gray-900">${total.toFixed(2)}</span>
          </div>

          <button onClick={cobrar} disabled={cart.length === 0 || saving}
            className="w-full bg-green-500 hover:bg-green-600 disabled:bg-gray-200 disabled:text-gray-400 text-white font-display font-black text-lg py-4 rounded-2xl shadow-lg transition-all active:scale-95 flex items-center justify-center gap-2">
            {saving ? (
              <><span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> PROCESANDO...</>
            ) : <><CheckCircle className="w-5 h-5" /> CONFIRMAR VENTA</>}
          </button>
        </div>
      </div>

      {/* PANEL HISTORIAL */}
      {verHistorial && (
        <div className="absolute inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setVerHistorial(false)} />
          <div className="relative w-full max-w-md bg-white shadow-2xl h-full flex flex-col animate-in slide-in-from-right">
            <div className="flex items-center justify-between p-4 border-b bg-purple-700 text-white shrink-0">
              <h3 className="font-black uppercase tracking-widest text-sm">Historial de ventas</h3>
              <button onClick={() => setVerHistorial(false)} className="hover:bg-purple-800 p-1.5 rounded-lg"><X className="w-5 h-5" /></button>
            </div>
            <div className="flex-1 overflow-y-auto divide-y">
              {historial.length === 0 && <p className="text-center p-8 text-gray-400 font-bold uppercase text-xs">Sin ventas registradas</p>}
              {historial.map(order => (
                <div key={order.id} className="p-4 hover:bg-gray-50 transition-colors">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <p className="font-black text-sm uppercase text-gray-800">{order.customer_name}</p>
                      <p className="text-[10px] font-bold text-gray-400">{new Date(order.created_at).toLocaleString('es-EC')}</p>
                    </div>
                    <p className="font-black text-lg text-purple-600">${Number(order.total).toFixed(2)}</p>
                  </div>
                  <p className="text-[10px] font-bold text-gray-500 uppercase leading-relaxed">
                    {Array.isArray(order.items) ? order.items.map((i: any) => `${i.name} (x${i.quantity})`).join(' • ') : '—'}
                  </p>
                  <div className="flex gap-2 mt-2">
                    <span className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded text-[9px] font-black uppercase">{order.channel}</span>
                    <span className="bg-green-50 text-green-600 px-2 py-0.5 rounded text-[9px] font-black uppercase">{order.method}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}