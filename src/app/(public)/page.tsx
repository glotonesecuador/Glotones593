'use client'
export const dynamic = 'force-dynamic'
import { useState, useEffect, useMemo } from 'react'
import {
  ShoppingBag, MapPin, X, CheckCircle, Plus, Minus,
  Search, ChevronDown, User, Lock, MessageCircle
} from 'lucide-react'
import type { Product, OrderItem } from '@/types'
import clsx from 'clsx'

export default function MenuPublico() {
  const [products, setProducts]       = useState<Product[]>([])
  const [categories, setCategories]   = useState<string[]>([])
  const [activeCat, setActiveCat]     = useState('Todas')
  const [cart, setCart]               = useState<OrderItem[]>([])
  const [cartOpen, setCartOpen]       = useState(false)
  const [loading, setLoading]         = useState(true)
  const [config, setConfig]           = useState<any>({})
  const [productModal, setProductModal] = useState<Product | null>(null)
  const [qty, setQty]                 = useState(1)

  // Checkout
  const [step, setStep]               = useState<'menu' | 'checkout' | 'success'>('menu')
  const [channel, setChannel]         = useState('Local')
  const [nombre, setNombre]           = useState('')
  const [telefono, setTelefono]       = useState('')
  const [direccion, setDireccion]     = useState('')
  const [notas, setNotas]             = useState('')
  const [method, setMethod]           = useState('Efectivo')
  const [enviando, setEnviando]       = useState(false)
  const [ordenId, setOrdenId]         = useState('')
  const [accessModal, setAccessModal] = useState(false)
  const [phoneSearch, setPhoneSearch] = useState('')
  const [foundOrders, setFoundOrders] = useState<any[]>([])
  const [searching, setSearching]     = useState(false)

  useEffect(() => {
    Promise.all([
      fetch('/api/products').then(r => r.json()),
      fetch('/api/settings').then(r => r.json()),
    ]).then(([prods, settings]) => {
      const lista = Array.isArray(prods) ? prods : []
      setProducts(lista)
      const cats = Array.from(new Set(lista.map((p: Product) => p.category))) as string[]
      setCategories(cats)
      if (settings?.store) setConfig(settings.store)
      setLoading(false)
    })
  }, [])

  const filtrados = useMemo(() => products.filter(p => {
    if (activeCat !== 'Todas' && p.category !== activeCat) return false
    return true
  }), [products, activeCat])

  const addToCart = (p: Product, quantity = 1) => {
    setCart(prev => {
      const ex = prev.find(i => i.id === p.id)
      if (ex) return prev.map(i => i.id === p.id ? { ...i, quantity: i.quantity + quantity } : i)
      return [...prev, { id: p.id, name: p.name, price: p.price, quantity, image_url: p.image_url }]
    })
    setProductModal(null)
  }

  const cambiarQty = (id: string, delta: number) => {
    setCart(prev => prev.map(i => i.id === id ? { ...i, quantity: i.quantity + delta } : i).filter(i => i.quantity > 0))
  }

  const cartTotal = cart.reduce((a, i) => a + i.price * i.quantity, 0)
  const cartCount = cart.reduce((a, i) => a + i.quantity, 0)

  const color     = config.primaryColor ?? '#c026d3'
  const colorDark = '#a21caf'

  const buscarPedidos = async () => {
    if (!phoneSearch.trim()) return
    setSearching(true)
    const res  = await fetch(`/api/orders?phone=${phoneSearch.trim()}&limit=20`)
    const data = await res.json()
    setFoundOrders(Array.isArray(data) ? data : [])
    setSearching(false)
  }

  const confirmarPedido = async () => {
    if (!nombre.trim()) return
    setEnviando(true)
    const res = await fetch('/api/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        customer_name: nombre,
        phone:         telefono || null,
        address:       direccion || null,
        total:         cartTotal,
        channel,
        method,
        items:         cart,
        notes:         notas || null,
      }),
    })
    const data = await res.json()
    setEnviando(false)
    if (res.ok) {
      setOrdenId(data.id?.slice(0, 8).toUpperCase() ?? 'OK')
      setCart([])
      setStep('success')
      setCartOpen(false)
    }
  }

  if (loading) return (
    <div className="h-screen flex items-center justify-center font-bold text-fuchsia-800 text-xl">
      Cargando Glotones...
    </div>
  )

  if (step === 'success') return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: `linear-gradient(135deg, ${color}, ${colorDark})` }}>
      <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-sm w-full text-center">
        <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
        <h2 className="font-black text-2xl text-gray-800 mb-2">¡Pedido Recibido!</h2>
        <p className="text-gray-500 mb-2">Tu pedido <strong>#{ordenId}</strong> está siendo procesado.</p>
        <p className="text-sm text-gray-400 mb-6">Te avisaremos cuando esté listo.</p>
        <button onClick={() => { setStep('menu'); setNombre(''); setTelefono(''); setDireccion(''); setNotas('') }}
          className="w-full py-3 rounded-xl text-white font-bold text-lg" style={{ backgroundColor: color }}>
          Hacer otro pedido
        </button>
      </div>
    </div>
  )

  return (
    <div className="font-sans min-h-screen bg-gray-100 text-gray-800 flex flex-col relative">

      {/* ── HEADER ─────────────────────────────────── */}
      <header className="sticky top-0 z-50 shadow-xl">

        {/* Barra 1: Logo + Nav + User */}
        <div className="text-white px-4 py-3" style={{ backgroundColor: color }}>
          <div className="container mx-auto flex justify-between items-center">
            <div className="cursor-pointer hover:scale-105 transition" onClick={() => window.scrollTo(0, 0)}>
              {config.logoUrl
                ? <img src={config.logoUrl} className="w-12 h-12 rounded-full object-contain bg-white border border-white p-0.5" />
                : (
                  <svg viewBox="0 0 200 200" className="w-12 h-12" xmlns="http://www.w3.org/2000/svg">
                    <circle cx="100" cy="100" r="95" fill="white" fillOpacity="0.2" stroke="white" strokeWidth="5" />
                    <text x="100" y="130" fontFamily="sans-serif" fontWeight="900" fontSize="90" textAnchor="middle" fill="white">G</text>
                  </svg>
                )}
            </div>
            <nav className="hidden md:flex gap-8 font-black text-white text-lg tracking-wide uppercase">
              <button onClick={() => window.scrollTo(0, 0)} className="hover:text-yellow-300 transition">INICIO</button>
              <button onClick={() => alert('Próximamente')} className="hover:text-yellow-300 transition">LOCALES</button>
              <button onClick={() => setActiveCat('Todas')} className="hover:text-yellow-300 transition">MENÚ</button>
              {config.phone && (
                <button onClick={() => window.open(`https://wa.me/593${config.phone}`, '_blank')} className="hover:text-yellow-300 transition">CONTACTO</button>
              )}
              {!config.phone && <button className="hover:text-yellow-300 transition">CONTACTO</button>}
            </nav>
            <button onClick={() => setAccessModal(true)} className="text-white hover:text-yellow-300">
              <User className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Barra 2: Ubicación + Carrito */}
        <div className="text-white px-4 py-2 border-t border-fuchsia-800" style={{ backgroundColor: colorDark }}>
          <div className="container mx-auto flex justify-between items-center">
            <button className="flex items-center gap-2 text-sm md:text-base hover:text-yellow-300">
              <MapPin className="w-4 h-4 text-yellow-300" />
              <span>¿Dónde quieres pedir?</span>
              <ChevronDown className="w-3 h-3" />
            </button>
            <button onClick={() => setCartOpen(true)}
              className="flex items-center gap-2 border border-fuchsia-400 rounded px-3 py-1 hover:bg-fuchsia-800 transition">
              <span className="font-bold">${cartTotal.toFixed(2)}</span>
              <ShoppingBag className="w-4 h-4 text-yellow-300" />
            </button>
          </div>
        </div>

        {/* Barra 3: Categorías */}
        <div className="text-white shadow-lg" style={{ backgroundColor: color }}>
          <div className="container mx-auto px-4 py-3 flex items-center gap-4 overflow-x-auto whitespace-nowrap">
            <Search className="w-5 h-5 text-white shrink-0" />
            <button onClick={() => setActiveCat('Todas')}
              className={clsx('font-bold uppercase text-sm', activeCat === 'Todas' ? 'text-yellow-300' : 'text-fuchsia-100 hover:text-white')}>
              TODAS
            </button>
            {categories.map(cat => (
              <button key={cat} onClick={() => setActiveCat(cat)}
                className={clsx('font-bold uppercase text-sm', activeCat === cat ? 'text-yellow-300' : 'text-fuchsia-100 hover:text-white')}>
                {cat.toUpperCase()}
              </button>
            ))}
          </div>
        </div>
      </header>

      {/* ── MAIN ───────────────────────────────────── */}
      <main className="container mx-auto p-4 flex-grow bg-gray-100">

        {/* Banner */}
        {config.showBanner && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-8 flex flex-col md:flex-row justify-between items-center max-w-4xl mx-auto gap-4">
            <div>
              <h2 className="font-black text-2xl text-gray-800 uppercase">{config.bannerTitle ?? 'ACUMULA SMASH POINTS'}</h2>
              <p className="text-sm text-gray-500">{config.bannerText ?? 'Regístrate, gana puntos con tus compras y canjealos por productos y más'}</p>
            </div>
            <button className="text-white px-6 py-2 rounded font-bold hover:opacity-90 transition whitespace-nowrap" style={{ backgroundColor: color }}>
              {config.bannerBtnText ?? 'Únete'}
            </button>
          </div>
        )}

        {/* Título */}
        <h2 className="text-3xl font-black text-center mb-6 uppercase tracking-wider" style={{ color }}>
          {activeCat === 'Todas' ? 'NUESTRO MENÚ' : activeCat}
        </h2>

        {/* Grid de productos */}
        {products.length === 0 ? (
          <p className="text-center text-gray-400 mt-10">Cargando productos...</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtrados.map(p => {
              const precioFinal = p.discount_pct > 0 ? p.price * (1 - p.discount_pct / 100) : p.price
              return (
                <div key={p.id}
                  onClick={() => { setProductModal(p); setQty(1) }}
                  className="bg-white rounded-xl shadow-sm hover:shadow-xl transition cursor-pointer overflow-hidden border border-gray-200 group flex flex-col">
                  <div className="h-48 relative overflow-hidden bg-gray-100">
                    {p.image_url
                      ? <img src={p.image_url} className="w-full h-full object-cover group-hover:scale-105 transition" alt={p.name} />
                      : <img src="https://placehold.co/400" className="w-full h-full object-cover" alt="placeholder" />}
                    {p.discount_pct > 0 && (
                      <span className="absolute top-2 left-2 text-white text-xs font-bold px-2 py-1 rounded shadow" style={{ backgroundColor: color }}>
                        -{p.discount_pct}%
                      </span>
                    )}
                  </div>
                  <div className="p-4 flex flex-col flex-grow">
                    <h3 className="font-bold text-lg leading-tight text-gray-800 mb-1">{p.name}</h3>
                    <p className="text-gray-500 text-sm line-clamp-2 mb-4 flex-grow">{p.description}</p>
                    <div className="flex justify-between items-center mt-auto">
                      <div>
                        <span className="font-black text-xl" style={{ color }}>${precioFinal.toFixed(2)}</span>
                        {p.discount_pct > 0 && <span className="text-xs text-gray-400 line-through ml-2">${p.price.toFixed(2)}</span>}
                      </div>
                      <button className="text-white px-3 py-1 rounded-full text-xs font-bold hover:opacity-90" style={{ backgroundColor: color }}>
                        + AGREGAR
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </main>

      {/* ── FOOTER ─────────────────────────────────── */}
      <footer className="p-4 text-center text-gray-400 text-sm bg-white border-t mt-8">
        <p className="mb-2">© 2025 Glotones 593 - Todos los derechos reservados</p>
        <a href="/admin/login" className="hover:text-fuchsia-700 flex items-center justify-center gap-1 mx-auto font-bold text-xs">
          <Lock className="w-3 h-3" /> Admin
        </a>
      </footer>

      {/* ── MODAL PRODUCTO ─────────────────────────── */}
      {productModal && (
        <div className="fixed inset-0 z-[50000] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="p-4 flex justify-between items-center text-white" style={{ backgroundColor: color }}>
              <h3 className="font-bold text-lg">{productModal.name}</h3>
              <button onClick={() => setProductModal(null)} className="hover:bg-fuchsia-800 rounded-full p-1"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-6">
              {productModal.image_url && (
                <img src={productModal.image_url} className="w-full h-48 object-cover rounded-xl mb-4" alt={productModal.name} />
              )}
              {productModal.description && <p className="text-gray-500 text-sm mb-4">{productModal.description}</p>}
              <div className="flex items-center justify-between mb-4">
                <span className="font-black text-2xl" style={{ color }}>${productModal.price.toFixed(2)}</span>
                <div className="flex items-center gap-3">
                  <button onClick={() => setQty(q => Math.max(1, q - 1))} className="w-8 h-8 rounded-full border-2 flex items-center justify-center" style={{ borderColor: color, color }}>
                    <Minus className="w-4 h-4" />
                  </button>
                  <span className="font-bold text-lg w-6 text-center">{qty}</span>
                  <button onClick={() => setQty(q => q + 1)} className="w-8 h-8 rounded-full flex items-center justify-center text-white" style={{ backgroundColor: color }}>
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <button onClick={() => addToCart(productModal, qty)}
                className="w-full py-3 rounded-xl text-white font-bold text-lg" style={{ backgroundColor: color }}>
                Agregar ${(productModal.price * qty).toFixed(2)}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL CARRITO ──────────────────────────── */}
      {cartOpen && (
        <div className="fixed inset-0 z-[50000] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-4 flex justify-between items-center text-white shrink-0" style={{ backgroundColor: color }}>
              <h3 className="font-bold text-lg">Carrito</h3>
              <button onClick={() => setCartOpen(false)} className="hover:bg-fuchsia-800 rounded-full p-1"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-6 overflow-y-auto">
              {cart.length === 0 ? (
                <p className="text-center text-gray-400 py-8">Tu carrito está vacío</p>
              ) : (
                <>
                  {cart.map(item => (
                    <div key={item.id} className="flex justify-between border-b py-3 items-center">
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-1.5">
                          <button onClick={() => cambiarQty(item.id, -1)} className="w-6 h-6 rounded-full border flex items-center justify-center text-gray-500 hover:border-gray-400">
                            <Minus className="w-3 h-3" />
                          </button>
                          <span className="font-bold text-sm w-5 text-center">{item.quantity}</span>
                          <button onClick={() => cambiarQty(item.id, +1)} className="w-6 h-6 rounded-full flex items-center justify-center text-white" style={{ backgroundColor: color }}>
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>
                        <span className="text-sm font-medium">{item.name}</span>
                      </div>
                      <span className="font-bold">${(item.price * item.quantity).toFixed(2)}</span>
                    </div>
                  ))}

                  <div className="mt-4 space-y-3">
                    <input placeholder="Nombre *" className="w-full border p-2 rounded-lg text-sm" value={nombre} onChange={e => setNombre(e.target.value)} />
                    <input placeholder="Teléfono" className="w-full border p-2 rounded-lg text-sm" value={telefono} onChange={e => setTelefono(e.target.value)} type="tel" />
                    
                    <select value={channel} onChange={e => setChannel(e.target.value)} className="w-full border p-2 rounded-lg text-sm">
                      <option>Local</option>
                      <option>Retiro</option>
                      <option>Pedido Directo</option>
                      <option>WhatsApp</option>
                    </select>

                    {channel === 'Pedido Directo' && (
                      <input placeholder="Dirección de entrega" className="w-full border p-2 rounded-lg text-sm" value={direccion} onChange={e => setDireccion(e.target.value)} />
                    )}

                    <select value={method} onChange={e => setMethod(e.target.value)} className="w-full border p-2 rounded-lg text-sm">
                      <option>Efectivo</option>
                      <option>Transferencia</option>
                      <option>Tarjeta</option>
                    </select>

                    <input placeholder="Notas especiales..." className="w-full border p-2 rounded-lg text-sm" value={notas} onChange={e => setNotas(e.target.value)} />
                  </div>

                  <div className="border-t mt-4 pt-4 flex justify-between font-bold text-lg">
                    <span>Total</span>
                    <span style={{ color }}>${cartTotal.toFixed(2)}</span>
                  </div>

                  <button onClick={confirmarPedido} disabled={enviando || !nombre.trim()}
                    className="w-full mt-4 py-3 rounded-xl text-white font-bold text-lg disabled:opacity-60" style={{ backgroundColor: color }}>
                    {enviando ? 'Enviando...' : `PEDIR AHORA $${cartTotal.toFixed(2)}`}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL ACCESO (cliente/admin) ───────────── */}
      {accessModal && (
        <div className="fixed inset-0 z-[50000] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="p-4 flex justify-between items-center text-white" style={{ backgroundColor: color }}>
              <h3 className="font-bold text-lg">Bienvenido</h3>
              <button onClick={() => setAccessModal(false)} className="hover:bg-fuchsia-800 rounded-full p-1"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-6 space-y-4">
              <p className="text-sm text-gray-500">Ingresa tu celular para ver tus pedidos anteriores.</p>
              <input value={phoneSearch} onChange={e => setPhoneSearch(e.target.value)}
                placeholder="Tu Teléfono (ej: 099...)" className="w-full border p-3 rounded-xl text-sm" />
              <button onClick={buscarPedidos} disabled={searching}
                className="w-full py-3 rounded-xl text-white font-bold" style={{ backgroundColor: color }}>
                {searching ? 'Buscando...' : 'Buscar Mis Pedidos'}
              </button>

              {foundOrders.length > 0 && (
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {foundOrders.map(o => (
                    <div key={o.id} className="border rounded-xl p-3 text-sm">
                      <div className="flex justify-between">
                        <span className="font-bold">{o.status}</span>
                        <span className="font-bold" style={{ color }}>${Number(o.total).toFixed(2)}</span>
                      </div>
                      <p className="text-gray-400 text-xs">{new Date(o.created_at).toLocaleDateString('es-EC')}</p>
                    </div>
                  ))}
                </div>
              )}

              {foundOrders.length === 0 && phoneSearch && !searching && (
                <p className="text-center text-gray-400 text-sm">No se encontraron pedidos</p>
              )}

              <div className="border-t pt-4 text-center">
                <a href="/admin/login" className="text-sm font-bold hover:underline" style={{ color }}>
                  Acceso Staff →
                </a>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Botón flotante WhatsApp */}
      {config.phone && (
        <a href={`https://wa.me/593${config.phone}`} target="_blank" rel="noopener noreferrer"
          className="fixed bottom-6 right-6 z-40 w-14 h-14 bg-green-500 rounded-full flex items-center justify-center shadow-2xl hover:bg-green-600 transition-all hover:scale-110">
          <MessageCircle className="w-7 h-7 text-white" />
        </a>
      )}
    </div>
  )
}
