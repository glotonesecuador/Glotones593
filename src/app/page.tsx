'use client'
export const dynamic = 'force-dynamic'

import { useState, useEffect, useMemo } from 'react'
import {
  ShoppingBag,
  MapPin,
  X,
  CheckCircle,
  Plus,
  Minus,
  Trash2,
  Search,
  ChevronDown,
  User,
  Lock,
  MessageCircle,
  UploadCloud
} from 'lucide-react'
import type { Product, OrderItem } from '@/types'
import clsx from 'clsx'

export default function MenuPublico() {
  const [sucursales, setSucursales]   = useState<any[]>([])
  const [sucursalActual, setSucursalActual] = useState('')
  // true = mostrar modal de selección de sucursal al entrar
  const [sucursalModal, setSucursalModal] = useState(true)
  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<string[]>([])
  const [activeCat, setActiveCat] = useState('Todas')
  const [cart, setCart] = useState<OrderItem[]>([])
  const [cartOpen, setCartOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [config, setConfig] = useState<any>({})
  const [productModal, setProductModal] = useState<Product | null>(null)
  const [qty, setQty] = useState(1)

  // --- ESTADO PARA EXTRAS (MODIFICADORES AVANZADOS) ---
  const [selecciones, setSelecciones] = useState<Record<string, string[]>>({})

  // Checkout
  const [step, setStep] = useState<'menu' | 'checkout' | 'success'>('menu')
  const [channel, setChannel] = useState('Local (Comer aquí)')
  const [nombre, setNombre] = useState('')
  const [telefono, setTelefono] = useState('')
  const [direccion, setDireccion] = useState('')
  const [notas, setNotas] = useState('')
  const [method, setMethod] = useState('Efectivo')
  const [enviando, setEnviando] = useState(false)
  const [ordenId, setOrdenId] = useState('')

  // Nuevo estado para el comprobante de transferencia
  const [comprobante, setComprobante] = useState<File | null>(null)

  const [accessModal, setAccessModal] = useState(false)
  const [phoneSearch, setPhoneSearch] = useState('')
  const [foundOrders, setFoundOrders] = useState<any[]>([])
  const [searching, setSearching] = useState(false)

  useEffect(() => {
    Promise.all([
      fetch('/api/products').then(r => r.json()),
      fetch('/api/settings').then(r => r.json()),
      fetch('/api/locations').then(r => r.json()), // <-- 1. Agregamos esta línea
    ]).then(([prods, settings, locs]) => {
      const lista = Array.isArray(prods) ? prods : []
      setProducts(lista)
      const cats = Array.from(new Set(lista.map((p: Product) => p.category))) as string[]
      setCategories(cats)
      
      if (settings?.store) {
        const conf = settings.store;
        setConfig(conf);
        if (conf.enable_cash === false) {
          if (conf.enable_transfer !== false) setMethod('Transferencia');
          else if (conf.enable_card !== false) setMethod('Tarjeta');
        }
        if (conf.enable_local === false) {
          if (conf.enable_pickup !== false) setChannel('Retiro (Llevar)');
          else if (conf.enable_delivery !== false) setChannel('Pedido Directo (Delivery)');
        }
      }

      // Guardamos las sucursales; la selección la hace el modal de bienvenida
      if (Array.isArray(locs) && locs.length > 0) {
        const activas = locs.filter(l => l.active !== false);
        setSucursales(activas);
        // No auto-seleccionamos: el cliente elige en el modal
      }

      setLoading(false)
    })
  }, [])

  const filtrados = useMemo(() => {
    return products.filter((p) => {
      if (activeCat !== 'Todas' && p.category !== activeCat) return false
      return true
    })
  }, [products, activeCat])

  // --- LÓGICA DE MANEJO DE GRUPOS (RADIO VS CHECKBOX) ---
  const handleSelectExtra = (grupoId: string, extraId: string, max: number) => {
    setSelecciones((prev) => {
      const actual = prev[grupoId] || []

      if (max === 1) {
        return { ...prev, [grupoId]: [extraId] }
      }

      if (actual.includes(extraId)) {
        return { ...prev, [grupoId]: actual.filter((id) => id !== extraId) }
      } else {
        if (actual.length < max) {
          return { ...prev, [grupoId]: [...actual, extraId] }
        }
        return prev
      }
    })
  }

  // --- VALIDACIÓN DE BOTÓN AGREGAR (Grupos Obligatorios) ---
  const esValidoParaAgregar = useMemo(() => {
    if (!productModal) return false
    const grupos = (productModal as any).extras_config || []
    if (!Array.isArray(grupos)) return true

    for (const grupo of grupos) {
      if (typeof grupo !== 'object') continue
      const reqMin = Number(grupo.min) || 0

      // Si el grupo exige un mínimo (es obligatorio)
      if (reqMin > 0) {
        const seleccionados = selecciones[grupo.id] || []
        if (seleccionados.length < reqMin) {
          return false
        }
      }
    }
    return true
  }, [productModal, selecciones])

  // --- CÁLCULO DE PRECIO (Obligatorios = $0) ---
  const precioFinalModal = useMemo(() => {
    if (!productModal) return 0
    const base =
      productModal.discount_pct > 0
        ? productModal.price * (1 - productModal.discount_pct / 100)
        : productModal.price

    let costoExtras = 0
    const grupos = (productModal as any).extras_config || []

    if (Array.isArray(grupos)) {
      grupos.forEach((grupo: any) => {
        if (typeof grupo !== 'object') return
        const seleccionados = selecciones[grupo.id] || []

        seleccionados.forEach((extraId: string) => {
          const extra = products.find((p) => p.id === extraId)
          if (extra) {
            const reqMin = Number(grupo.min) || 0
            const isObligatorio = grupo.tipo === 'obligatorio' || reqMin > 0
            // Si es obligatorio, el costo de esa opción es 0 (está incluido en la base)
            const precioAplicar = isObligatorio ? 0 : Number(extra.price)
            costoExtras += precioAplicar
          }
        })
      })
    }

    return (base + costoExtras) * qty
  }, [productModal, selecciones, qty, products])

  const addToCart = (p: Product, quantity = 1) => {
    const grupos = (p as any).extras_config || []
    
    // Estructuras para guardar los modificadores
    const partes_estructuradas: { grupo: string; opciones: string }[] = []
    const partes_texto: string[] = []

    if (Array.isArray(grupos)) {
      grupos.forEach((g: any) => {
        if (typeof g !== 'object' || !g.id) return
        const seleccionados = selecciones[g.id] || []
        if (seleccionados.length > 0) {
          const nombres = seleccionados
            .map((id) => products.find((pr) => pr.id === id)?.name)
            .filter(Boolean)
          
          partes_estructuradas.push({
            grupo: g.nombre,
            opciones: nombres.join(', '),
          })
          partes_texto.push(`${g.nombre}: ${nombres.join(', ')}`)
        }
      })
    }

    const textoExtras = partes_texto.length > 0 ? ` (${partes_texto.join(' | ')})` : ''
    const itemPrecioFinal = precioFinalModal / quantity

    setCart((prev) => {
      const lineId = crypto.randomUUID()
      return [
        ...prev,
        {
          id: lineId,
          base_id: p.id,
          name: `${p.name}${textoExtras}`, // Mantenemos para DB/Cocina
          base_name: p.name,               // Para UI Carrito
          modifiers: partes_estructuradas, // Para UI Carrito (Viñetas)
          price: itemPrecioFinal,
          quantity,
          image_url: p.image_url,
        } as any, // As any para no chocar con types globales por ahora
      ]
    })

    setProductModal(null)
    setSelecciones({})
    setQty(1)
  }

  const cambiarQty = (id: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((i) =>
          i.id === id ? { ...i, quantity: i.quantity + delta } : i
        )
        .filter((i) => i.quantity > 0)
    )
  }

  const cartTotal = cart.reduce((a, i) => a + i.price * i.quantity, 0)
  const cartCount = cart.reduce((a, i) => a + i.quantity, 0)

  const color = config.primaryColor ?? '#c026d3'
  const colorDark = '#a21caf'

  const buscarPedidos = async () => {
    if (!phoneSearch.trim()) return
    setSearching(true)
    const res = await fetch(`/api/orders?phone=${phoneSearch.trim()}&limit=20`)
    const data = await res.json()
    setFoundOrders(Array.isArray(data) ? data : [])
    setSearching(false)
  }

  const confirmarPedido = async () => {
    if (!nombre.trim()) return

    setEnviando(true)
    let comprobanteUrl = ''

    // Si es transferencia, primero subimos la imagen
    if (method === 'Transferencia' && comprobante) {
      const fd = new FormData()
      fd.append('file', comprobante)
      fd.append('folder', 'comprobantes')
      try {
        const resUpload = await fetch('/api/upload', {
          method: 'POST',
          body: fd,
        })
        const dataUpload = await resUpload.json()
        comprobanteUrl = dataUpload.url || ''
      } catch (error) {
        alert('Error al subir el comprobante. Por favor intenta de nuevo.')
        setEnviando(false)
        return
      }
    }

    // Adjuntamos la URL del comprobante a las notas para que el Admin lo vea
    const notasFinales =
      method === 'Transferencia' && comprobanteUrl
        ? `${notas}\n\n🧾 [COMPROBANTE ADJUNTO]: ${comprobanteUrl}`
        : notas

    const res = await fetch('/api/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        customer_name: nombre, 
        phone: telefono || null, 
        address: channel === 'Pedido Directo (Delivery)' ? direccion : 'Retiro en Local',
        total: cartTotal, 
        channel, 
        method, 
        items: cart, 
        notes: notasFinales || null,
        location_id: sucursalActual // <-- AQUÍ ESTÁ LA MAGIA ESCALABLE
      }),
    })

    const data = await res.json()

    setEnviando(false)
    if (res.ok) {
      setOrdenId(data.id?.slice(0, 8).toUpperCase() ?? 'OK')
      setCart([])
      setComprobante(null)
      setStep('success')
      setCartOpen(false)
    } else {
      alert('Error al procesar el pedido.')
    }
  }

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center font-bold text-fuchsia-800 text-xl">
        Cargando Glotones...
      </div>
    )
  }

  // Sucursales con fallback hardcodeado: si la DB no tiene datos, usamos estos.
  // Cuando la DB esté cargada, sucursales[] los reemplaza automáticamente.
  const sucursalesFallback = sucursales.length > 0 ? sucursales : [
    { id: 'norte-1', name: 'Glotones Norte', address: '', phone: '0939013199', active: true },
    { id: 'sur-1',   name: 'Glotones Sur',   address: '', phone: '0983809283', active: true },
  ]

  // Modal de bienvenida: siempre aparece al entrar (sucursalModal = true por defecto)
  if (sucursalModal) {
    return (
      <div
        className="min-h-screen flex items-center justify-center p-4"
        style={{ background: `linear-gradient(160deg, ${color} 0%, ${colorDark} 100%)` }}
      >
        <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-300">
          {/* Header */}
          <div className="p-8 pb-6 text-center" style={{ backgroundColor: color }}>
            {config.logoUrl ? (
              <img
                src={config.logoUrl}
                className="w-20 h-20 rounded-full object-contain bg-white border-4 border-white/30 mx-auto mb-4 shadow-lg"
                alt="Logo"
              />
            ) : (
              <div className="w-20 h-20 rounded-full bg-white/20 border-4 border-white/30 mx-auto mb-4 flex items-center justify-center shadow-lg">
                <span className="text-4xl font-black text-white">G</span>
              </div>
            )}
            <h1 className="text-2xl font-black text-white uppercase tracking-tight">
              {config.name || 'Glotones'}
            </h1>
            <p className="text-white/70 text-xs font-bold mt-1 uppercase tracking-widest">
              ¿Dónde estás tú?
            </p>
          </div>

          {/* Opciones de sucursal */}
          <div className="p-6 space-y-3">
            <p className="text-center text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">
              Elige tu local más cercano
            </p>
            {sucursalesFallback.map((suc) => (
              <button
                key={suc.id}
                onClick={() => {
                  setSucursalActual(suc.id)
                  setSucursalModal(false)
                }}
                className="w-full flex items-center gap-4 p-5 rounded-2xl border-2 border-gray-100 hover:border-purple-300 active:scale-[0.98] transition-all group text-left"
              >
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0 text-white text-2xl font-black shadow-md group-hover:scale-110 transition-transform"
                  style={{ backgroundColor: color }}
                >
                  📍
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-black text-gray-800 text-base leading-tight">{suc.name}</p>
                  {suc.address && (
                    <p className="text-xs text-gray-400 font-medium mt-0.5 truncate">{suc.address}</p>
                  )}
                </div>
                <svg className="w-5 h-5 text-gray-300 group-hover:text-purple-400 shrink-0 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </button>
            ))}
          </div>

          <div className="px-6 pb-6">
            <p className="text-center text-[10px] text-gray-300 font-bold uppercase tracking-widest">
              Tu pedido irá al WhatsApp del local elegido
            </p>
          </div>
        </div>
      </div>
    )
  }

  if (step === 'success') {
    // Generamos el texto automático para WhatsApp
    const mensajeWa = encodeURIComponent(
      `🍔 ¡Hola Glotones!\nAcabo de realizar el pedido *#${ordenId}* por la web.\n\n` +
      `👤 *Cliente:* ${nombre}\n` +
      `💳 *Método de pago:* ${method}\n` +
      `💰 *Total a pagar:* $${cartTotal.toFixed(2)}\n\n` +
      (method === 'Tarjeta' ? `👉 *Por favor envíenme el link de pagos para procesar la tarjeta.*` : `¡Quedo atento a la confirmación!`)
    );
    // Usar el teléfono de la sucursal elegida, con fallback al global
    const sucursalElegida = sucursalesFallback.find(s => s.id === sucursalActual);
    const numeroWa = sucursalElegida?.phone || config.phone || '0939013199';
    const linkWa = `https://wa.me/593${numeroWa}?text=${mensajeWa}`;

    return (
      <div
        className="min-h-screen flex items-center justify-center p-4"
        style={{ background: `linear-gradient(135deg, ${color}, ${colorDark})` }}
      >
        <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-sm w-full text-center">
          <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
          <h2 className="font-black text-2xl text-gray-800 mb-2">
            ¡Pedido Recibido!
          </h2>
          <p className="text-gray-500 mb-4">
            Tu pedido <strong>#{ordenId}</strong> está en nuestro sistema.
          </p>

          {method === 'Tarjeta' && (
            <div className="bg-blue-50 border border-blue-200 p-3 rounded-xl mb-4">
              <p className="text-xs text-blue-700 font-bold">
                Para enviarte el link de pago seguro y comenzar a preparar tu comida, por favor avísanos por WhatsApp.
              </p>
            </div>
          )}

          {method === 'Transferencia' && (
            <div className="bg-purple-50 border border-purple-200 p-3 rounded-xl mb-4">
              <p className="text-xs text-purple-700 font-bold">
                ¡Comprobante subido con éxito! Avísanos por WhatsApp para validarlo rápido.
              </p>
            </div>
          )}

          {/* ESTE BOTÓN ABRE EL WHATSAPP DEL CLIENTE HACIA TU NÚMERO */}
          <a
            href={linkWa}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full py-4 rounded-xl text-white font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 shadow-lg hover:scale-105 transition-transform mb-4 bg-green-500"
          >
            <MessageCircle className="w-5 h-5" /> Enviar por WhatsApp
          </a>

          <button
            onClick={() => {
              setStep('menu')
              setNombre('')
              setTelefono('')
              setDireccion('')
              setNotas('')
              setMethod('Efectivo')
              setComprobante(null)
            }}
            className="w-full py-3 rounded-xl text-gray-600 font-bold text-sm bg-gray-100 hover:bg-gray-200 transition-colors"
          >
            Hacer otro pedido
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="font-sans min-h-screen bg-gray-100 text-gray-800 flex flex-col relative pb-24 md:pb-0">
      {/* ── HEADER ─────────────────────────────────── */}
      <header className="sticky top-0 z-40 shadow-xl">
        {/* Barra 1: Logo + Nav + User */}
        <div className="text-white px-4 py-3" style={{ backgroundColor: color }}>
          <div className="container mx-auto flex justify-between items-center">
            <div
              className="cursor-pointer hover:scale-105 transition"
              onClick={() => window.scrollTo(0, 0)}
            >
              {config.logoUrl ? (
                <img
                  src={config.logoUrl}
                  className="w-12 h-12 rounded-full object-contain bg-white border border-white p-0.5"
                />
              ) : (
                <svg
                  viewBox="0 0 200 200"
                  className="w-12 h-12"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <circle
                    cx="100"
                    cy="100"
                    r="95"
                    fill="white"
                    fillOpacity="0.2"
                    stroke="white"
                    strokeWidth="5"
                  />
                  <text
                    x="100"
                    y="130"
                    fontFamily="sans-serif"
                    fontWeight="900"
                    fontSize="90"
                    textAnchor="middle"
                    fill="white"
                  >
                    G
                  </text>
                </svg>
              )}
            </div>
            <nav className="hidden md:flex gap-8 font-black text-white text-lg tracking-wide uppercase">
              <button
                onClick={() => window.scrollTo(0, 0)}
                className="hover:text-yellow-300 transition"
              >
                INICIO
              </button>
              <button
                onClick={() => alert('Próximamente')}
                className="hover:text-yellow-300 transition"
              >
                LOCALES
              </button>
              <button
                onClick={() => setActiveCat('Todas')}
                className="hover:text-yellow-300 transition"
              >
                MENÚ
              </button>
              {config.phone && (
                <button
                  onClick={() =>
                    window.open(`https://wa.me/593${config.phone}`, '_blank')
                  }
                  className="hover:text-yellow-300 transition"
                >
                  CONTACTO
                </button>
              )}
              {!config.phone && (
                <button className="hover:text-yellow-300 transition">
                  CONTACTO
                </button>
              )}
            </nav>
            <button
              onClick={() => setAccessModal(true)}
              className="text-white hover:text-yellow-300"
            >
              <User className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Barra 2: Ubicación + Carrito */}
        <div
          className="text-white px-4 py-2 border-t border-fuchsia-800"
          style={{ backgroundColor: colorDark }}
        >
          <div className="container mx-auto flex justify-between items-center">
            {/* NUEVO SELECTOR DINÁMICO DE SUCURSAL */}
            <div className="flex items-center gap-2 text-sm md:text-base hover:text-yellow-300 transition-colors">
              <MapPin className="w-4 h-4 text-yellow-300" />
              <select 
                value={sucursalActual} 
                onChange={e => setSucursalActual(e.target.value)} 
                className="bg-transparent text-white font-bold outline-none cursor-pointer appearance-none text-center"
              >
                {sucursales.length === 0 && <option className="text-gray-900">Cargando...</option>}
                {sucursales.map(s => (
                  <option key={s.id} value={s.id} className="text-gray-900 font-bold">
                    {s.name}
                  </option>
                ))}
              </select>
              <ChevronDown className="w-3 h-3 text-yellow-300" />
            </div>

            {/* BOTÓN DEL CARRITO EN ESCRITORIO (SE MANTIENE IGUAL) */}
            <button
              onClick={() => setCartOpen(true)}
              className="hidden md:flex items-center gap-2 border border-fuchsia-400 rounded px-3 py-1 hover:bg-fuchsia-800 transition"
            >
              <span className="font-bold">${cartTotal.toFixed(2)}</span>
              <ShoppingBag className="w-4 h-4 text-yellow-300" />
            </button>
          </div>

        {/* Barra 3: Categorías */}
        <div
          className="text-white shadow-lg"
          style={{ backgroundColor: color }}
        >
          <div className="container mx-auto px-4 py-3 flex items-center gap-4 overflow-x-auto whitespace-nowrap">
            <Search className="w-5 h-5 text-white shrink-0" />
            <button
              onClick={() => setActiveCat('Todas')}
              className={clsx(
                'font-bold uppercase text-sm',
                activeCat === 'Todas'
                  ? 'text-yellow-300'
                  : 'text-fuchsia-100 hover:text-white'
              )}
            >
              TODAS
            </button>
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveCat(cat)}
                className={clsx(
                  'font-bold uppercase text-sm',
                  activeCat === cat
                    ? 'text-yellow-300'
                    : 'text-fuchsia-100 hover:text-white'
                )}
              >
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
              <h2 className="font-black text-2xl text-gray-800 uppercase">
                {config.bannerTitle ?? 'ACUMULA SMASH POINTS'}
              </h2>
              <p className="text-sm text-gray-500">
                {config.bannerText ??
                  'Regístrate, gana puntos con tus compras y canjealos por productos y más'}
              </p>
            </div>
            <button
              className="text-white px-6 py-2 rounded font-bold hover:opacity-90 transition whitespace-nowrap"
              style={{ backgroundColor: color }}
            >
              {config.bannerBtnText ?? 'Únete'}
            </button>
          </div>
        )}

        {/* Título */}
        <h2
          className="text-3xl font-black text-center mb-6 uppercase tracking-wider"
          style={{ color }}
        >
          {activeCat === 'Todas' ? 'NUESTRO MENÚ' : activeCat}
        </h2>

        {/* Grid de productos */}
        {products.length === 0 ? (
          <p className="text-center text-gray-400 mt-10">Cargando productos...</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtrados.map((p) => {
              const precioFinal =
                p.discount_pct > 0
                  ? p.price * (1 - p.discount_pct / 100)
                  : p.price
              return (
                <div
                  key={p.id}
                  onClick={() => {
                    setProductModal(p)
                    setQty(1)
                    setSelecciones({})
                  }}
                  className="bg-white rounded-xl shadow-sm hover:shadow-xl transition cursor-pointer overflow-hidden border border-gray-200 group flex flex-col"
                >
                  <div className="h-48 relative overflow-hidden bg-gray-100">
                    {p.image_url ? (
                      <img
                        src={p.image_url}
                        className="w-full h-full object-cover group-hover:scale-105 transition"
                        alt={p.name}
                      />
                    ) : (
                      <img
                        src="https://placehold.co/400"
                        className="w-full h-full object-cover"
                        alt="placeholder"
                      />
                    )}
                    {p.discount_pct > 0 && (
                      <span
                        className="absolute top-2 left-2 text-white text-xs font-bold px-2 py-1 rounded shadow"
                        style={{ backgroundColor: color }}
                      >
                        -{p.discount_pct}%
                      </span>
                    )}
                  </div>
                  <div className="p-4 flex flex-col flex-grow">
                    <h3 className="font-bold text-lg leading-tight text-gray-800 mb-1">
                      {p.name}
                    </h3>
                    <p className="text-gray-500 text-sm line-clamp-2 mb-4 flex-grow">
                      {p.description}
                    </p>
                    <div className="flex justify-between items-center mt-auto">
                      <div>
                        <span
                          className="font-black text-xl"
                          style={{ color }}
                        >
                          ${precioFinal.toFixed(2)}
                        </span>
                        {p.discount_pct > 0 && (
                          <span className="text-xs text-gray-400 line-through ml-2">
                            ${p.price.toFixed(2)}
                          </span>
                        )}
                      </div>
                      <button
                        className="text-white px-3 py-1 rounded-full text-xs font-bold hover:opacity-90"
                        style={{ backgroundColor: color }}
                      >
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
        <p className="mb-2">
          © 2026 Glotones 593 - Todos los derechos reservados
        </p>
        <a
          href="/admin/login"
          className="hover:text-fuchsia-700 flex items-center justify-center gap-1 mx-auto font-bold text-xs"
        >
          <Lock className="w-3 h-3" /> Admin
        </a>
      </footer>

      {/* ── NUEVO: BOTÓN FLOTANTE CARRITO MÓVIL ─────────────────────────── */}
      {cartCount > 0 && !cartOpen && !productModal && (
        <div className="fixed bottom-6 left-0 right-0 z-40 flex justify-center md:hidden animate-in slide-in-from-bottom-5 pointer-events-none">
          <button
            onClick={() => setCartOpen(true)}
            className="pointer-events-auto text-white px-6 py-4 rounded-full shadow-2xl flex items-center gap-4 font-black text-sm active:scale-95 transition-all"
            style={{ backgroundColor: color }}
          >
            <span className="text-lg">${cartTotal.toFixed(2)}</span>
            <div className="w-px h-5 bg-white/30" />
            <div className="flex items-center gap-2">
              <ShoppingBag className="w-5 h-5" />
              <span className="bg-white text-gray-900 w-5 h-5 rounded-full flex items-center justify-center text-xs">
                {cartCount}
              </span>
            </div>
          </button>
        </div>
      )}

      {/* ── MODAL PRODUCTO (BOTTOM SHEET EN MÓVIL, MODAL EN DESKTOP) ─────────────────────────── */}
      {productModal && (
        <div className="fixed inset-0 z-[50000] flex items-end md:items-center justify-center bg-black/60 backdrop-blur-sm p-0 md:p-4 overflow-hidden">
          <div className="bg-white w-full max-w-5xl h-[92vh] md:h-[80vh] rounded-t-[40px] md:rounded-2xl mt-auto md:mt-0 overflow-hidden flex flex-col md:flex-row shadow-2xl animate-in slide-in-from-bottom md:zoom-in-95 duration-300">
            {/* LADO IZQUIERDO: IMAGEN */}
            <div className="w-full h-1/3 min-h-[220px] md:min-h-0 md:h-full md:w-1/2 bg-[#F8F9FA] relative flex flex-col items-center justify-center shrink-0 border-b md:border-b-0 md:border-r border-gray-100">
              {/* DRAG HANDLE (Barrita gris superior en móvil) */}
              <div className="w-12 h-1.5 bg-gray-300 rounded-full absolute top-3 md:hidden z-40" />

              <button
                onClick={() => setProductModal(null)}
                className="absolute top-4 right-4 md:left-4 z-40 md:hidden bg-white p-2 rounded-full shadow active:scale-90 transition-transform"
              >
                <X className="w-5 h-5 text-gray-800" />
              </button>

              <div className="relative w-full h-full flex items-center justify-center p-6 md:p-8">
                {productModal.image_url ? (
                  <img
                    src={productModal.image_url}
                    className="w-full h-full object-contain mix-blend-multiply drop-shadow-xl"
                    alt={productModal.name}
                  />
                ) : (
                  <div className="text-8xl opacity-20">🍔</div>
                )}
              </div>
            </div>

            {/* LADO DERECHO: OPCIONES */}
            <div className="w-full md:w-1/2 flex flex-col flex-1 min-h-0 bg-white relative">
              <button
                onClick={() => setProductModal(null)}
                className="hidden md:flex absolute top-4 right-4 z-10 p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <X className="w-5 h-5 text-gray-400" />
              </button>

              <div className="flex-1 overflow-y-auto p-6 md:p-8 custom-scrollbar">
                <div className="mb-8">
                  <h2 className="text-3xl font-black text-gray-900 leading-tight mb-2">
                    {productModal.name}
                  </h2>
                  <p className="text-gray-500 text-sm font-medium">
                    {productModal.description}
                  </p>
                </div>

                <div className="space-y-6">
                  {/* Iterar sobre los grupos configurados */}
                  {Array.isArray((productModal as any).extras_config) &&
                    ((productModal as any).extras_config).map(
                      (grupo: any, index: number) => {
                        if (
                          typeof grupo !== 'object' ||
                          !grupo.opciones ||
                          !Array.isArray(grupo.opciones)
                        )
                          return null

                        const opcionesDelGrupo = products.filter((p) =>
                          grupo.opciones.includes(p.id)
                        )
                        if (opcionesDelGrupo.length === 0) return null

                        const seleccionados = selecciones[grupo.id] || []
                        const reqMin = Number(grupo.min) || 0
                        const isObligatorio =
                          grupo.tipo === 'obligatorio' || reqMin > 0

                        return (
                          <div key={grupo.id || index} className="pt-2">
                            <div className="flex justify-between items-end border-b pb-2 mb-3">
                              <div>
                                <h3 className="font-bold text-gray-900 text-lg">
                                  {grupo.nombre}
                               </h3>
                                <p className="text-xs text-gray-400">
                                  {grupo.max === 1
                                    ? 'Seleccione 1'
                                    : `Seleccione hasta ${grupo.max}`}
                                </p>
                              </div>
                              <span
                                className={clsx(
                                  'px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider',
                                  isObligatorio
                                    ? 'text-white'
                                    : 'bg-gray-100 text-gray-600'
                                )}
                                style={
                                  isObligatorio
                                    ? { backgroundColor: color }
                                    : {}
                                }
                              >
                                {isObligatorio ? 'Obligatorio' : 'Opcional'}
                              </span>
                            </div>

                            <div className="space-y-1">
                              {opcionesDelGrupo.map((extra) => {
                                const isChecked = seleccionados.includes(
                                  extra.id
                                )
                                const type =
                                  grupo.max === 1 ? 'radio' : 'checkbox'

                                return (
                                  <label
                                    key={extra.id}
                                    className="flex items-center justify-between py-3 cursor-pointer group"
                                  >
                                    <div className="flex flex-col">
                                      <span className="text-sm text-gray-700 group-hover:text-black font-medium">
                                        {extra.name}
                                      </span>
                                      {isObligatorio ? (
                                        <span className="text-xs font-black text-green-600 mt-1 uppercase">
                                          Incluido
                                        </span>
                                      ) : Number(extra.price) > 0 ? (
                                        <span
                                          className="text-xs font-bold mt-1"
                                          style={{ color }}
                                        >
                                          +${Number(extra.price).toFixed(2)}
                                        </span>
                                      ) : null}
                                    </div>
                                    <div className="ml-4 flex items-center justify-center">
                                      <input
                                        type={type}
                                        checked={isChecked}
                                        onChange={() =>
                                          handleSelectExtra(
                                            grupo.id,
                                            extra.id,
                                            grupo.max
                                          )
                                        }
                                        className={clsx(
                                          'w-5 h-5 border-gray-300 transition-all',
                                          type === 'radio'
                                            ? 'rounded-full'
                                            : 'rounded-md'
                                        )}
                                        style={{
                                          accentColor: color,
                                          color: color,
                                        }}
                                      />
                                    </div>
                                  </label>
                                )
                              })}
                            </div>
                          </div>
                        )
                      }
                    )}
                </div>
              </div>

              {/* FOOTER DEL MODAL STICKY */}
              <div className="p-6 border-t border-gray-100 bg-white shrink-0 shadow-[0_-10px_20px_rgba(0,0,0,0.03)]">
                <div className="flex items-center gap-4">
                  <div className="flex items-center justify-between w-32 border rounded-lg px-4 py-3">
                    <button
                      onClick={() => setQty((q) => Math.max(1, q - 1))}
                      className="text-gray-400 hover:text-black"
                    >
                      <Minus className="w-4 h-4" />
                    </button>
                    <span className="font-bold text-gray-800">{qty}</span>
                    <button
                      onClick={() => setQty((q) => q + 1)}
                      className="text-gray-400 hover:text-black"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                  <button
                    onClick={() => addToCart(productModal, qty)}
                    disabled={!esValidoParaAgregar}
                    className="flex-1 text-white font-bold h-12 rounded-lg flex items-center justify-between px-6 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-md active:scale-95"
                    style={{ backgroundColor: color }}
                  >
                    <span>
                      {esValidoParaAgregar ? 'Agregar' : 'Faltan selecciones'}
                    </span>
                    <span>${precioFinalModal.toFixed(2)}</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL CARRITO (BOTTOM SHEET EN MÓVIL) ──────────────────────────── */}
      {cartOpen && (
        <div className="fixed inset-0 z-[50000] flex items-end md:items-center justify-center p-0 md:p-4 bg-black/60 backdrop-blur-sm overflow-hidden">
          <div className="relative bg-white rounded-t-[40px] md:rounded-2xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col h-[95vh] md:max-h-[90vh] animate-in slide-in-from-bottom duration-300">
            {/* DRAG HANDLE MÓVIL */}
            <div className="w-12 h-1.5 bg-gray-300 rounded-full absolute top-3 left-1/2 -translate-x-1/2 md:hidden z-50" />

            <div
              className="p-6 pt-10 md:pt-6 flex justify-between items-center text-white shrink-0"
              style={{ backgroundColor: color }}
            >
              <h3 className="font-bold text-lg">Carrito</h3>
              <button
                onClick={() => setCartOpen(false)}
                className="hover:bg-black/20 rounded-full p-1 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* pb-36 para que el contenido no quede oculto detrás del footer pegajoso */}
            <div className="p-6 overflow-y-auto pb-40 custom-scrollbar flex-1">
              {cart.length === 0 ? (
                <p className="text-center text-gray-400 py-8">
                  Tu carrito está vacío
                </p>
              ) : (
                <>
                  <div className="space-y-4 mb-6">
                    {cart.map((item: any) => (
                      <div
                        key={item.id}
                        className="flex gap-4 bg-white p-4 rounded-3xl border border-gray-100 shadow-sm"
                      >
                        {/* IMAGEN DEL ITEM (Estilo Competencia) */}
                        <div className="w-16 h-16 rounded-2xl bg-gray-50 overflow-hidden shrink-0">
                          {item.image_url ? (
                            <img
                              src={item.image_url}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-xl opacity-30">
                              🍔
                            </div>
                          )}
                        </div>

                        {/* DETALLES Y MODIFICADORES */}
                        <div className="flex-1 flex flex-col justify-between">
                          <div className="flex justify-between items-start mb-1">
                            <h4 className="font-black text-gray-800 text-sm leading-tight pr-2">
                              {item.base_name || item.name}
                            </h4>
                            <span
                              className="font-black text-sm"
                              style={{ color }}
                            >
                              ${(item.price * item.quantity).toFixed(2)}
                            </span>
                          </div>

                          {/* LISTA DE EXTRAS CON VIÑETAS (Estilo Competencia) */}
                          {item.modifiers && item.modifiers.length > 0 && (
                            <div className="mb-3 mt-1 space-y-1">
                              {item.modifiers.map(
                                (mod: any, idx: number) => (
                                  <div key={idx} className="leading-tight">
                                    <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">
                                      {mod.grupo}
                                    </p>
                                    <p className="text-[11px] text-gray-600 font-medium flex items-start gap-1">
                                      <span className="text-gray-300">•</span>{' '}
                                      <span>{mod.opciones}</span>
                                    </p>
                                  </div>
                                )
                              )}
                            </div>
                          )}

                          {/* CONTROLES CANTIDAD Y BORRAR */}
                          <div className="flex items-center justify-between mt-auto pt-2">
                            <button
                              onClick={() =>
                                cambiarQty(item.id, -item.quantity)
                              }
                              className="text-gray-300 hover:text-red-500 transition-colors p-1"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                            <div className="flex items-center gap-3 bg-gray-50 px-3 py-1.5 rounded-full border border-gray-100">
                              <button
                                onClick={() => cambiarQty(item.id, -1)}
                                className="text-gray-400 hover:text-black"
                              >
                                <Minus className="w-3 h-3" />
                              </button>
                              <span className="font-black text-xs w-4 text-center">
                                {item.quantity}
                              </span>
                              <button
                                onClick={() => cambiarQty(item.id, +1)}
                                style={{ color }}
                              >
                                <Plus className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="space-y-3 pt-4 border-t border-gray-100">
                    <input
                      placeholder="Nombre Completo *"
                      className="w-full border p-3 rounded-xl text-sm bg-gray-50 focus:bg-white"
                      value={nombre}
                      onChange={(e) => setNombre(e.target.value)}
                    />
                    <input
                      placeholder="Teléfono para contactarte *"
                      className="w-full border p-3 rounded-xl text-sm bg-gray-50 focus:bg-white"
                      value={telefono}
                      onChange={(e) => setTelefono(e.target.value)}
                      type="tel"
                    />

                    <div className="grid grid-cols-2 gap-3">
                      {/* LECTURA DINÁMICA DE CANALES DESDE CONFIG */}
                      <select
                        value={channel}
                        onChange={(e) => setChannel(e.target.value)}
                        className="w-full border p-3 rounded-xl text-xs font-bold text-gray-700 bg-gray-50"
                      >
                        {config.enable_local !== false && (
                          <option value="Local (Comer aquí)">
                            🏠 Local (Aquí)
                          </option>
                        )}
                        {config.enable_pickup !== false && (
                          <option value="Retiro (Llevar)">🛍️ Retiro</option>
                        )}
                        {config.enable_delivery !== false && (
                          <option value="Pedido Directo (Delivery)">
                            🛵 Delivery
                          </option>
                        )}
                      </select>

                      {/* LECTURA DINÁMICA DE MÉTODOS DE PAGO DESDE CONFIG */}
                      <select
                        value={method}
                        onChange={(e) => {
                          setMethod(e.target.value)
                          setComprobante(null)
                        }}
                        className="w-full border p-3 rounded-xl text-xs font-bold text-gray-700 bg-gray-50"
                      >
                        {config.enable_cash !== false && (
                          <option value="Efectivo">💵 Efectivo</option>
                        )}
                        {config.enable_transfer !== false && (
                          <option value="Transferencia">
                            🏦 Transf / DeUna
                          </option>
                        )}
                        {config.enable_card !== false && (
                          <option value="Tarjeta">💳 Tarjeta / Link</option>
                        )}
                      </select>
                    </div>

                    {channel === 'Pedido Directo (Delivery)' && (
                      <input
                        placeholder="Dirección de entrega detallada"
                        className="w-full border p-3 rounded-xl text-sm bg-blue-50 border-blue-200 placeholder-blue-400"
                        value={direccion}
                        onChange={(e) => setDireccion(e.target.value)}
                      />
                    )}

                    {method === 'Efectivo' && (
                      <p className="text-xs text-gray-500 bg-gray-50 p-3 rounded-xl border border-gray-100">
                        Por favor ten el efectivo listo al momento de la entrega o
                        retiro de tu pedido.
                      </p>
                    )}

                    {method === 'Tarjeta' && (
                      <p className="text-xs text-blue-700 bg-blue-50 p-3 rounded-xl border border-blue-100">
                        Generaremos tu orden y te enviaremos un Link de Pago
                        seguro por WhatsApp.
                      </p>
                    )}

                    {/* LECTURA DINÁMICA DE DATOS BANCARIOS + DE UNA */}
                    {method === 'Transferencia' && (
                      <div className="bg-purple-50 p-4 rounded-[20px] border border-purple-100 space-y-4">
                        <div className="flex gap-4">
                          {/* DATOS DEL BANCO */}
                          <div className="flex-1 text-[10px] text-purple-900 font-mono bg-white p-3 rounded-[15px] border border-purple-200 shadow-sm leading-relaxed">
                            <span className="font-black font-sans uppercase tracking-widest text-purple-600 block mb-1">
                              Datos Bancarios
                            </span>
                            Banco:{' '}
                            <strong>
                              {config.bank_name || 'No configurado'}
                            </strong>
                            <br />
                            Cta:{' '}
                            <strong>
                              {config.bank_account_type || ''}{' '}
                              {config.bank_account || ''}
                            </strong>
                            <br />
                            CI/RUC:{' '}
                            <strong>{config.bank_ruc || 'No configurado'}</strong>
                            <br />
                            Titular:{' '}
                            <strong>
                              {config.bank_owner || 'No configurado'}
                            </strong>
                          </div>

                          {/* QR DE UNA (Placeholder visual) */}
                          <div className="w-24 h-24 shrink-0 bg-white rounded-[15px] border border-purple-200 shadow-sm flex flex-col items-center justify-center p-2">
                            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-1 border border-purple-200 border-dashed">
                              <span className="text-[7px] font-black text-purple-400 text-center leading-tight">
                                Tu QR
                                <br />
                                Aquí
                              </span>
                            </div>
                            <span className="text-[9px] font-black text-purple-800">
                              DeUna!
                            </span>
                          </div>
                        </div>

                        <label className="flex items-center justify-center gap-2 w-full p-3 bg-white border-2 border-dashed border-purple-300 rounded-xl cursor-pointer hover:bg-purple-100 hover:border-purple-500 transition text-sm text-purple-700 font-bold">
                          <UploadCloud className="w-5 h-5" />
                          {comprobante
                            ? 'Comprobante Listo'
                            : 'Subir Comprobante'}
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) =>
                              setComprobante(e.target.files?.[0] || null)
                            }
                          />
                        </label>
                        {comprobante && (
                          <p className="text-[10px] text-green-600 font-bold text-center bg-green-50 rounded p-1 truncate">
                            ✓ {comprobante.name}
                          </p>
                        )}
                      </div>
                    )}

                    <textarea
                      placeholder="Notas especiales (sin cebolla, extra salsa...)"
                      rows={2}
                      className="w-full border p-3 rounded-xl text-sm bg-gray-50 focus:bg-white resize-none"
                      value={notas}
                      onChange={(e) => setNotas(e.target.value)}
                    />
                  </div>
                </>
              )}
            </div>

            {/* STICKY FOOTER DEL CARRITO */}
            {cart.length > 0 && (
              <div className="absolute bottom-0 left-0 right-0 p-6 bg-white border-t border-gray-100 shadow-[0_-10px_20px_rgba(0,0,0,0.05)]">
                <div className="flex justify-between items-center mb-4">
                  <span className="font-black text-gray-400 uppercase text-xs tracking-widest">
                    TOTAL
                  </span>
                  <span
                    className="font-black text-2xl"
                    style={{ color }}
                  >
                    ${cartTotal.toFixed(2)}
                  </span>
                </div>

                <button
                  onClick={confirmarPedido}
                  disabled={
                    enviando ||
                    !nombre.trim() ||
                    !telefono.trim() ||
                    (method === 'Transferencia' && !comprobante)
                  }
                  className="w-full py-4 rounded-xl text-white font-black text-sm shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-transform active:scale-95 uppercase tracking-widest"
                  style={{ backgroundColor: color }}
                >
                  {enviando ? 'PROCESANDO...' : 'CONFIRMAR PEDIDO'}
                </button>
                {(!nombre.trim() || !telefono.trim()) && (
                  <p className="text-center text-[10px] text-red-400 mt-2 font-bold uppercase">
                    Nombre y Teléfono son obligatorios
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── MODAL ACCESO (cliente/admin) ───────────── */}
      {accessModal && (
        <div className="fixed inset-0 z-[50000] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
            <div
              className="p-4 flex justify-between items-center text-white"
              style={{ backgroundColor: color }}
            >
              <h3 className="font-bold text-lg">Bienvenido</h3>
              <button
                onClick={() => setAccessModal(false)}
                className="hover:bg-black/20 rounded-full p-1 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <p className="text-sm text-gray-500">
                Ingresa tu celular para ver tus pedidos anteriores.
              </p>
              <input
                value={phoneSearch}
                onChange={(e) => setPhoneSearch(e.target.value)}
                placeholder="Tu Teléfono (ej: 099...)"
                className="w-full border p-3 rounded-xl text-sm"
              />
              <button
                onClick={buscarPedidos}
                disabled={searching}
                className="w-full py-3 rounded-xl text-white font-bold"
                style={{ backgroundColor: color }}
              >
                {searching ? 'Buscando...' : 'Buscar Mis Pedidos'}
              </button>

              {foundOrders.length > 0 && (
                <div className="space-y-2 max-h-48 overflow-y-auto mt-4">
                  {foundOrders.map((o) => (
                    <div key={o.id} className="border rounded-xl p-3 text-sm">
                      <div className="flex justify-between">
                        <span className="font-bold">{o.status}</span>
                        <span
                          className="font-bold"
                          style={{ color }}
                        >
                          ${Number(o.total).toFixed(2)}
                        </span>
                      </div>
                      <p className="text-gray-400 text-xs">
                        {new Date(o.created_at).toLocaleDateString('es-EC')}
                      </p>
                    </div>
                  ))}
                </div>
              )}

              {foundOrders.length === 0 && phoneSearch && !searching && (
                <p className="text-center text-gray-400 text-sm mt-4">
                  No se encontraron pedidos
                </p>
              )}

              <div className="border-t pt-4 text-center mt-4">
                <a
                  href="/admin/login"
                  className="text-sm font-bold hover:underline"
                  style={{ color }}
                >
                  Acceso Staff →
                </a>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Botón flotante WhatsApp */}
      {(sucursalesFallback.find(s => s.id === sucursalActual)?.phone || config.phone) && (
        <a
          href={`https://wa.me/593${sucursalesFallback.find(s => s.id === sucursalActual)?.phone || config.phone}`}
          target="_blank"
          rel="noopener noreferrer"
          className={clsx(
            'fixed right-6 z-30 w-14 h-14 bg-green-500 rounded-full flex items-center justify-center shadow-2xl hover:bg-green-600 transition-all hover:scale-110',
            cartCount > 0 ? 'bottom-24 md:bottom-6' : 'bottom-6'
          )}
        >
          <MessageCircle className="w-7 h-7 text-white" />
        </a>
      )}
    </div>
  )
}