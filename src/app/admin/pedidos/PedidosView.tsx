'use client'

import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { 
  RefreshCw, XCircle, Search, Clock, ChefHat, 
  CheckCircle, Truck, Bell, Plus, Smartphone, 
  Store, DollarSign, ShoppingBag, Filter, Trash2,
  Calendar, Download, X, Eye // <-- Agregado Eye para el recibo
} from 'lucide-react'
import type { Order, OrderStatus, Product } from '@/types'
import clsx from 'clsx'

const COLUMNAS = [
  {
    status: 'Pendiente' as OrderStatus,
    label: 'POR ACEPTAR',
    next: 'En Proceso' as OrderStatus,
    nextLabel: 'Aceptar',
    color: 'border-yellow-400',
    bg: 'bg-yellow-50',
    headerBg: 'bg-yellow-400',
    btnColor: 'bg-blue-500 hover:bg-blue-600',
    icon: Clock,
  },
  {
    status: 'En Proceso' as OrderStatus,
    label: 'EN PREPARACIÓN',
    next: 'Listo' as OrderStatus,
    nextLabel: 'Listo para entregar',
    color: 'border-blue-400',
    bg: 'bg-blue-50',
    headerBg: 'bg-blue-500',
    btnColor: 'bg-green-500 hover:bg-green-600',
    icon: ChefHat,
  },
  {
    status: 'Listo' as OrderStatus,
    label: 'POR ENTREGAR',
    next: 'Entregado' as OrderStatus,
    nextLabel: 'Marcar entregado',
    color: 'border-green-400',
    bg: 'bg-green-50',
    headerBg: 'bg-green-500',
    btnColor: 'bg-purple-500 hover:bg-purple-600',
    icon: Truck,
  },
]

function useTimer(dateStr: string) {
  const [elapsed, setElapsed] = useState(0)
  useEffect(() => {
    const update = () => setElapsed(Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000))
    update()
    const id = setInterval(update, 1000)
    return () => clearInterval(id)
  }, [dateStr])
  return elapsed
}

function formatTimer(s: number) {
  const m = Math.floor(s / 60)
  const sec = s % 60
  return `${m}:${String(sec).padStart(2, '0')}`
}

export default function PedidosView() {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [actualizando, setAct] = useState<string | null>(null)
  const [busqueda, setBusqueda] = useState('')
  const [newAlert, setNewAlert] = useState(false)
  const [filtroCanal, setFiltroCanal] = useState('Todos')
  const [viewMode, setViewBg] = useState<'KDS' | 'VENTAS'>('KDS')
  
  const [listaCanales, setListaCanales] = useState<any[]>([])
  const [menuProductos, setMenuProductos] = useState<Product[]>([])
  const [modalManual, setModalManual] = useState(false)

  // ESTADO PARA EL MODAL DE COMPROBANTE
  const [comprobanteImg, setComprobanteImg] = useState<string | null>(null)

  // NUEVOS ESTADOS PARA FILTROS DE FECHA
  const [desde, setDesde] = useState('')
  const [hasta, setHasta] = useState('')

  const [clienteManual, setClienteManual] = useState({
    customer_name: '', phone: '', cedula: '', email: '', address: '', channel: 'WhatsApp'
  })
  const [itemsVenta, setItemsVenta] = useState<{id: string, name: string, quantity: number, price: number}[]>([])

  const prevCount = useRef(0)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  const cargar = useCallback(async () => {
    try {
      const sucursalActiva = typeof window !== 'undefined' ? localStorage.getItem('sucursal_activa') || 'todas' : 'todas';

      const [resOrders, resSettings, resProducts] = await Promise.all([
        fetch(`/api/orders?limit=1000&location_id=${sucursalActiva}`), // Aumentado el límite para reportes
        fetch('/api/settings'),
        fetch('/api/products')
      ])
      
      const dataOrders = await resOrders.json()
      const dataSettings = await resSettings.json()
      const dataProducts = await resProducts.json()

      if (dataSettings?.canales) setListaCanales(dataSettings.canales)
      if (Array.isArray(dataProducts)) setMenuProductos(dataProducts)

      if (Array.isArray(dataOrders)) {
        const activos = dataOrders.filter((o: Order) => ['Pendiente', 'En Proceso', 'Listo'].includes(o.status))
        const pendientes = activos.filter((o: Order) => o.status === 'Pendiente').length
        
        if (prevCount.current > 0 && pendientes > prevCount.current) {
          setNewAlert(true)
          setTimeout(() => setNewAlert(false), 5000)
          if (!audioRef.current) {
            audioRef.current = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3')
          }
          audioRef.current.play().catch(() => {})
        }
        prevCount.current = pendientes
        setOrders(dataOrders)
      }
    } catch (e) { console.error(e) }
    setLoading(false)
  }, [])

  useEffect(() => {
    cargar()
    const id = setInterval(cargar, 15_000)
    return () => clearInterval(id)
  }, [cargar])

  // FUNCIÓN PARA EXPORTAR VENTAS A CSV
  const exportarVentas = () => {
    const headers = ['Fecha', 'Sucursal', 'Canal', 'Cliente', 'Cédula', 'Teléfono', 'Total', 'Neto', 'Estado']
    const rows = filtrados.map(o => [
      new Date(o.created_at).toLocaleString('es-EC'),
      o.location_id?.toUpperCase() || 'MATRIZ',
      o.channel,
      o.customer_name,
      o.cedula || '-',
      o.phone || '-',
      Number(o.total).toFixed(2),
      Number(o.net_total || o.total).toFixed(2),
      o.status
    ])
    
    let csvContent = "data:text/csv;charset=utf-8," + [headers, ...rows].map(e => e.join(",")).join("\n")
    const encodedUri = encodeURI(csvContent)
    const link = document.createElement("a")
    link.setAttribute("href", encodedUri)
    link.setAttribute("download", `reporte_ventas_${new Date().toISOString().split('T')[0]}.csv`)
    document.body.appendChild(link)
    link.click()
  }

  const agregarItem = (prodId: string) => {
    const prod = menuProductos.find(p => p.id === prodId)
    if (!prod) return
    setItemsVenta(prev => {
      const existe = prev.find(item => item.id === prodId)
      if (existe) {
        return prev.map(item => item.id === prodId ? { ...item, quantity: item.quantity + 1 } : item)
      }
      return [...prev, { id: prod.id, name: prod.name, quantity: 1, price: Number(prod.price) }]
    })
  }

  const eliminarItem = (id: string) => setItemsVenta(prev => prev.filter(i => i.id !== id))
  
  const totalVentaManual = useMemo(() => itemsVenta.reduce((acc, item) => acc + (item.price * item.quantity), 0), [itemsVenta])

  const avanzar = async (id: string, next: OrderStatus) => {
    setAct(id)
    await fetch(`/api/orders/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: next }),
    })
    setAct(null)
    cargar()
  }

  const cancelar = async (id: string) => {
    if (!confirm('¿Cancelar este pedido?')) return
    setAct(id)
    await fetch(`/api/orders/${id}`, { method: 'DELETE' })
    setAct(null)
    cargar()
  }

  const registrarVentaApp = async () => {
    if (itemsVenta.length === 0 || !clienteManual.customer_name) {
      alert("Por favor agrega productos y el nombre del cliente.")
      return
    }
    
    setAct('manual')
    const canalObj = listaCanales.find(c => c.name === clienteManual.channel)
    const porcentajeFee = canalObj ? (canalObj.fee / 100) : 0
    const feeCalculado = totalVentaManual * porcentajeFee
    const sucursalActiva = localStorage.getItem('sucursal_activa') || 'todas';

    try {
      const resOrder = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customer_name: clienteManual.customer_name,
          phone: clienteManual.phone || null,
          cedula: clienteManual.cedula || null,
          email: clienteManual.email || null,
          address: clienteManual.address || null,
          total: totalVentaManual,
          platform_fee: feeCalculado,
          net_total: totalVentaManual - feeCalculado,
          channel: clienteManual.channel,
          method: 'App/Manual',
          status: 'Entregado',
          location_id: sucursalActiva === 'todas' ? 'cd-rio-1' : sucursalActiva,
          items: itemsVenta
        })
      })

      if (clienteManual.phone) {
        await fetch('/api/customers', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            phone: clienteManual.phone,
            name: clienteManual.customer_name,
            email: clienteManual.email,
            address: clienteManual.address
          })
        })
      }

      if (resOrder.ok) {
        setModalManual(false)
        setItemsVenta([])
        setClienteManual({ customer_name: '', phone: '', cedula: '', email: '', address: '', channel: 'WhatsApp' })
        cargar()
      }
    } catch (e) { alert("Error al registrar la venta.") } finally { setAct(null) }
  }

  const filtrados = useMemo(() => {
    return orders.filter(o => {
      const q = busqueda.toLowerCase()
      const matchBusqueda = !busqueda || 
        o.customer_name.toLowerCase().includes(q) || 
        (o.phone ?? '').includes(busqueda) ||
        (o.cedula ?? '').includes(busqueda)

      const matchCanal = filtroCanal === 'Todos' || o.channel === filtroCanal

      // Filtro por rango de fechas
      const fechaO = new Date(o.created_at).getTime()
      const matchDesde = !desde || fechaO >= new Date(desde).getTime()
      const matchHasta = !hasta || fechaO <= new Date(hasta + 'T23:59:59').getTime()

      return matchBusqueda && matchCanal && matchDesde && matchHasta
    })
  }, [orders, busqueda, filtroCanal, desde, hasta])

  const stats = useMemo(() => {
    const validos = filtrados.filter(o => o.status !== 'Cancelado')
    return {
      bruto: validos.reduce((a, b) => a + Number(b.total), 0),
      neto: validos.reduce((a, b) => a + Number(b.net_total || b.total), 0),
      count: validos.length
    }
  }, [filtrados])

  return (
    <div className="h-full flex flex-col overflow-hidden bg-gray-50 min-h-screen font-black uppercase text-[10px]">
      {newAlert && (
        <div className="fixed top-4 right-4 z-[100] bg-green-500 text-white px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-3 animate-bounce">
          <Bell className="w-6 h-6" />
          <div>
            <p className="font-black text-lg">¡Nuevo Pedido!</p>
            <p className="text-sm opacity-80 font-bold">Revisa la columna Por Aceptar</p>
          </div>
        </div>
      )}

      <div className="bg-white border-b px-6 py-4 space-y-4 shrink-0 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display font-black text-2xl text-gray-800 tracking-tight">Control Operativo</h1>
            <div className="flex gap-4 mt-1">
              <button onClick={() => setViewBg('KDS')} className={clsx("text-[10px] font-black tracking-widest transition-all", viewMode === 'KDS' ? "text-purple-600 border-b-2 border-purple-600" : "text-gray-400")}>Cocina (KDS)</button>
              <button onClick={() => setViewBg('VENTAS')} className={clsx("text-[10px] font-black tracking-widest transition-all", viewMode === 'VENTAS' ? "text-purple-600 border-b-2 border-purple-600" : "text-gray-400")}>Reporte Ventas</button>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <button onClick={exportarVentas} className="bg-white border border-gray-200 text-gray-700 px-4 py-2 rounded-xl text-[10px] font-black flex items-center gap-2 hover:bg-gray-50 transition-all shadow-sm">
              <Download className="w-4 h-4 text-purple-600" /> Exportar CSV
            </button>
            <button onClick={() => setModalManual(true)} className="bg-gray-900 text-white px-4 py-2 rounded-xl text-[10px] font-black flex items-center gap-2 hover:bg-black transition-all shadow-lg">
              <Plus className="w-4 h-4" /> REGISTRAR VENTA
            </button>
            <button onClick={cargar} className="p-2.5 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors"><RefreshCw className={clsx("w-5 h-5 text-gray-500", loading && "animate-spin")} /></button>
          </div>
        </div>

        {/* BARRA DE FILTROS INTEGRADA */}
        <div className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-5 gap-3 items-end border-t pt-4">
          <div className="relative">
            <label className="text-[9px] font-black text-gray-400 mb-1 block">Búsqueda rápida</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input value={busqueda} onChange={e => setBusqueda(e.target.value)} placeholder="Cliente / Cédula / Tel..." className="input-field pl-9 text-[11px]" />
            </div>
          </div>
          <div>
            <label className="text-[9px] font-black text-gray-400 mb-1 block">Desde</label>
            <input type="date" value={desde} onChange={e => setDesde(e.target.value)} className="input-field text-xs py-2 h-[38px] bg-white" />
          </div>
          <div>
            <label className="text-[9px] font-black text-gray-400 mb-1 block">Hasta</label>
            <input type="date" value={hasta} onChange={e => setHasta(e.target.value)} className="input-field text-xs py-2 h-[38px] bg-white" />
          </div>
          <div>
            <label className="text-[9px] font-black text-gray-400 mb-1 block">Canal</label>
            <select value={filtroCanal} onChange={e => setFiltroCanal(e.target.value)} className="input-field text-[11px] h-[38px] font-black">
              <option value="Todos">TODOS LOS CANALES</option>
              {listaCanales.map(c => <option key={c.id} value={c.name}>{c.name.toUpperCase()}</option>)}
            </select>
          </div>
          <button onClick={() => {setDesde(''); setHasta(''); setBusqueda(''); setFiltroCanal('Todos')}} className="h-[38px] bg-gray-100 text-gray-500 rounded-xl hover:text-red-600 transition-all flex items-center justify-center gap-2 font-black">
            <Trash2 className="w-4 h-4" /> Limpiar
          </button>
        </div>

        {viewMode === 'VENTAS' && (
          <div className="grid grid-cols-3 gap-4 pb-2 animate-in fade-in slide-in-from-top-2">
            <div className="bg-purple-50 p-4 rounded-2xl border border-purple-100 flex items-center gap-4">
              <div className="w-10 h-10 bg-purple-600 rounded-xl flex items-center justify-center text-white"><ShoppingBag className="w-5 h-5"/></div>
              <div><p className="text-[9px] font-black text-purple-400 uppercase leading-none mb-1">Bruto total</p><p className="text-xl font-black text-purple-700 leading-none">${stats.bruto.toFixed(2)}</p></div>
            </div>
            <div className="bg-green-50 p-4 rounded-2xl border border-green-100 flex items-center gap-4">
              <div className="w-10 h-10 bg-green-600 rounded-xl flex items-center justify-center text-white"><DollarSign className="w-5 h-5"/></div>
              <div><p className="text-[9px] font-black text-green-400 uppercase leading-none mb-1">Neto real</p><p className="text-xl font-black text-green-700 leading-none">${stats.neto.toFixed(2)}</p></div>
            </div>
            <div className="bg-blue-50 p-4 rounded-2xl border border-blue-100 flex items-center gap-4">
              <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white"><Filter className="w-5 h-5"/></div>
              <div><p className="text-[9px] font-black text-blue-400 uppercase leading-none mb-1">Pedidos</p><p className="text-xl font-black text-blue-700 leading-none">{stats.count}</p></div>
            </div>
          </div>
        )}
      </div>

      <div className="flex-1 overflow-hidden">
        {viewMode === 'KDS' ? (
          <div className="h-full grid grid-cols-3 gap-0 bg-gray-200/50">
            {COLUMNAS.map(col => {
              const lista = filtrados.filter(o => o.status === col.status)
              return (
                <div key={col.status} className="flex flex-col border-r border-gray-200 last:border-0 overflow-hidden">
                  <div className="px-4 py-3 bg-white border-b border-gray-200 flex items-center justify-between shrink-0">
                    <div className="flex items-center gap-2">
                      <col.icon className="w-4 h-4 text-gray-500" />
                      <span className="font-black text-[10px] uppercase tracking-wider text-gray-600">{col.label}</span>
                    </div>
                    <span className={clsx('w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black text-white', lista.length > 0 ? col.headerBg : 'bg-gray-300')}>{lista.length}</span>
                  </div>
                  <div className="flex-1 overflow-y-auto p-3 space-y-3">
                    {lista.map(order => (
                      <OrderCard 
                        key={order.id} 
                        order={order} 
                        col={col} 
                        onAvanzar={avanzar} 
                        onCancelar={cancelar} 
                        actualizando={actualizando} 
                        onVerComprobante={setComprobanteImg} // <-- Pasamos el prop
                      />
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <div className="h-full overflow-y-auto p-6 animate-in fade-in duration-500">
            <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
              <table className="w-full text-sm text-left">
                <thead className="bg-gray-50 text-gray-400 font-black text-[9px] uppercase tracking-widest border-b">
                  <tr>
                    <th className="px-4 py-4">Sucursal</th>
                    <th className="px-4 py-4">Canal / Fecha</th>
                    <th className="px-4 py-4">Cliente</th>
                    <th className="px-4 py-4">Identificación</th>
                    <th className="px-4 py-4">Contacto</th>
                    <th className="px-4 py-4 text-right">Neto</th>
                    <th className="px-4 py-4 text-center">Estado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filtrados.map((p) => (
                    <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-4">
                        <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded-lg font-black text-[8px]">
                          {p.location_id === 'todas' || !p.location_id ? 'MATRIZ' : p.location_id.toUpperCase()}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <span className="font-black text-purple-600 block">{p.channel}</span>
                        <span className="text-[9px] text-gray-400 font-bold">{new Date(p.created_at).toLocaleString('es-EC')}</span>
                      </td>
                      <td className="px-4 py-4 font-black text-gray-800">{p.customer_name}</td>
                      <td className="px-4 py-4 text-gray-600 font-bold">{p.cedula || '-'}</td>
                      <td className="px-4 py-4">
                        <div className="flex flex-col gap-0.5">
                          <span className="text-gray-600 font-bold">{p.phone || '-'}</span>
                          <span className="text-gray-400 lowercase italic text-[9px]">{p.email || ''}</span>
                        </div>
                      </td>
                      <td className="px-4 py-4 text-right font-black text-green-600 text-sm">${Number(p.net_total || p.total).toFixed(2)}</td>
                      <td className="px-4 py-4 text-center">
                        <span className={clsx("px-3 py-1 rounded-full font-black text-[9px] tracking-widest", 
                          p.status === 'Cancelado' ? "bg-red-50 text-red-500" : "bg-green-50 text-green-500 border border-green-100")}>
                          {p.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {filtrados.length === 0 && (
                    <tr><td colSpan={7} className="px-4 py-20 text-center text-gray-400 font-black tracking-widest uppercase">No se encontraron pedidos en este rango</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* MODAL PARA VER LA IMAGEN DEL COMPROBANTE DE TRANSFERENCIA */}
      {comprobanteImg && (
        <div className="fixed inset-0 z-[100000] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl overflow-hidden shadow-2xl max-w-md w-full relative animate-in zoom-in-95">
            <div className="p-4 border-b flex justify-between items-center bg-gray-50">
              <h3 className="font-black uppercase tracking-widest text-xs text-gray-700">Comprobante de Pago</h3>
              <button onClick={() => setComprobanteImg(null)} className="p-1 hover:bg-gray-200 rounded-full transition-colors"><XCircle className="w-6 h-6 text-gray-500" /></button>
            </div>
            <div className="p-4 flex justify-center bg-gray-100 h-[60vh]">
              <img src={comprobanteImg} className="w-full h-full object-contain" alt="Comprobante" />
            </div>
            <div className="p-4">
              <button onClick={() => setComprobanteImg(null)} className="w-full bg-gray-900 text-white font-black py-3 rounded-xl uppercase tracking-widest text-xs active:scale-95 transition-all">
                Cerrar Imagen
              </button>
            </div>
          </div>
        </div>
      )}

      {modalManual && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl p-8 w-full max-w-4xl shadow-2xl space-y-6 overflow-y-auto max-h-[90vh]">
            <div className="flex justify-between items-center border-b pb-4">
              <h3 className="text-xl font-black text-gray-800 uppercase tracking-tighter">Nueva Venta Multiproducto</h3>
              <button onClick={() => setModalManual(false)} className="p-2 hover:bg-gray-100 rounded-xl transition-all"><XCircle className="w-6 h-6 text-gray-400" /></button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="space-y-4">
                <p className="text-[10px] font-black text-purple-600 uppercase border-b border-purple-100 pb-1 tracking-widest">Seleccionar Productos</p>
                <select className="w-full p-4 bg-gray-50 border border-gray-200 rounded-2xl font-black text-xs uppercase" onChange={(e) => agregarItem(e.target.value)} value="">
                  <option value="" disabled>Añadir producto al carrito...</option>
                  {menuProductos.map(p => <option key={p.id} value={p.id}>{p.name} — ${p.price}</option>)}
                </select>

                <div className="bg-gray-50 rounded-2xl p-4 min-h-[200px] space-y-3 border border-dashed border-gray-200">
                  {itemsVenta.length === 0 && <div className="flex flex-col items-center justify-center py-10 opacity-30"><ShoppingBag size={40} /><p className="text-[10px] font-black uppercase mt-2">Carrito vacío</p></div>}
                  {itemsVenta.map(item => (
                    <div key={item.id} className="flex items-center justify-between bg-white p-3 rounded-xl shadow-sm border border-gray-100 animate-in slide-in-from-left-2">
                      <div className="flex items-center gap-3">
                        <span className="w-7 h-7 bg-purple-600 text-white rounded-lg flex items-center justify-center text-[11px] font-black shadow-md">{item.quantity}</span>
                        <p className="font-black text-xs uppercase tracking-tight">{item.name}</p>
                      </div>
                      <div className="flex items-center gap-4">
                        <p className="font-black text-xs text-purple-700">${(item.price * item.quantity).toFixed(2)}</p>
                        <button onClick={() => eliminarItem(item.id)} className="text-red-400 hover:text-red-600 p-1 hover:bg-red-50 rounded-lg transition-all"><Trash2 className="w-4 h-4" /></button>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="bg-gray-900 text-white p-6 rounded-3xl flex justify-between items-center shadow-xl">
                  <span className="font-black text-[10px] uppercase text-white/50 tracking-widest">Total a cobrar:</span>
                  <span className="text-3xl font-black tracking-tighter">${totalVentaManual.toFixed(2)}</span>
                </div>
              </div>

              <div className="space-y-4">
                <p className="text-[10px] font-black text-blue-600 uppercase border-b border-blue-100 pb-1 tracking-widest">Información del Cliente</p>
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <label className="text-[9px] font-black text-gray-400 uppercase ml-1">Canal de Venta</label>
                    <select className="w-full mt-1 p-4 bg-gray-50 border border-gray-200 rounded-2xl font-black text-xs uppercase" value={clienteManual.channel} onChange={e => setClienteManual({...clienteManual, channel: e.target.value})}>
                      {listaCanales.map(c => <option key={c.id} value={c.name}>{c.name} ({c.fee}%)</option>)}
                    </select>
                  </div>
                  <div className="col-span-2">
                    <label className="text-[9px] font-black text-gray-400 uppercase ml-1">Nombre Completo</label>
                    <input type="text" className="w-full mt-1 p-4 bg-gray-50 border border-gray-200 rounded-2xl font-black text-xs uppercase shadow-inner" value={clienteManual.customer_name} onChange={e => setClienteManual({...clienteManual, customer_name: e.target.value})} placeholder="EJ: JUAN PÉREZ" />
                  </div>
                  <div>
                    <label className="text-[9px] font-black text-gray-400 uppercase ml-1">WhatsApp</label>
                    <input type="text" className="w-full mt-1 p-4 bg-gray-50 border border-gray-200 rounded-2xl font-black text-xs shadow-inner" value={clienteManual.phone} onChange={e => setClienteManual({...clienteManual, phone: e.target.value})} placeholder="09XXXXXXXX" />
                  </div>
                  <div>
                    <label className="text-[9px] font-black text-gray-400 uppercase ml-1">Cédula / RUC</label>
                    <input type="text" className="w-full mt-1 p-4 bg-gray-50 border border-gray-200 rounded-2xl font-black text-xs shadow-inner" value={clienteManual.cedula} onChange={e => setClienteManual({...clienteManual, cedula: e.target.value})} placeholder="17XXXXXXXX" />
                  </div>
                  <div className="col-span-2">
                    <label className="text-[9px] font-black text-gray-400 uppercase ml-1">Correo (Opcional)</label>
                    <input type="email" className="w-full mt-1 p-4 bg-gray-50 border border-gray-200 rounded-2xl font-black text-xs shadow-inner lowercase" value={clienteManual.email} onChange={e => setClienteManual({...clienteManual, email: e.target.value})} placeholder="cliente@mail.com" />
                  </div>
                </div>
                <button onClick={registrarVentaApp} disabled={actualizando === 'manual'} className="w-full bg-blue-600 text-white py-6 rounded-[2rem] font-black text-sm hover:bg-blue-700 shadow-2xl shadow-blue-200 uppercase tracking-[0.2em] transition-all active:scale-95 disabled:opacity-50">
                  {actualizando === 'manual' ? 'PROCESANDO...' : 'FINALIZAR Y DESCONTAR'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function OrderCard({ order, col, onAvanzar, onCancelar, actualizando, onVerComprobante }: { order: Order, col: any, onAvanzar: any, onCancelar: any, actualizando: any, onVerComprobante: (url: string) => void }) {
  const elapsed = useTimer(order.created_at); 
  const urgente = elapsed > 10 * 60; 
  const warning = elapsed > 5 * 60;
  
  // LOGICA PARA LEER EL COMPROBANTE
  const tieneComprobante = order.notes?.includes('🧾 [COMPROBANTE ADJUNTO]:')
  const partesNota = order.notes?.split('🧾 [COMPROBANTE ADJUNTO]:')
  const notaReal = partesNota?.[0]?.trim()
  const urlComprobante = partesNota?.[1]?.trim()

  return (
    <div className={clsx('bg-white rounded-2xl overflow-hidden shadow-sm border-2 transition-all animate-in zoom-in-95', 
      urgente ? 'border-red-400 shadow-red-100' : warning ? 'border-yellow-300' : col.color)}>
      <div className={clsx('px-4 py-3 flex items-center justify-between text-white', 
        urgente ? 'bg-red-500' : col.headerBg)}>
        <div>
          <p className="font-black text-[11px] leading-tight uppercase truncate max-w-[120px]">{order.customer_name}</p>
          <p className="text-[9px] font-bold opacity-80 uppercase tracking-widest">{order.channel} · {order.method}</p>
        </div>
        <div className="text-right">
          <p className="font-mono font-black text-base leading-none">{formatTimer(elapsed)}</p>
          <p className="text-[9px] font-bold opacity-70 tracking-widest">${Number(order.total).toFixed(2)}</p>
        </div>
      </div>
      <div className="px-4 py-3 space-y-2">
        {Array.isArray(order.items) && order.items.map((item: any, i: number) => (
          <div key={i} className="flex items-center gap-3">
            <span className="w-5 h-5 bg-gray-900 text-white rounded-lg flex items-center justify-center text-[10px] font-black shrink-0">{item.quantity}</span>
            <span className="font-black text-gray-800 text-[10px] uppercase truncate tracking-tight">{item.name}</span>
          </div>
        ))}
        
        {/* RENDERIZADO DE NOTAS Y BOTON DE RECIBO */}
        {notaReal && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-xl px-2 py-1.5 mt-1 shadow-inner">
            <p className="text-[10px] font-bold text-yellow-800 leading-tight italic lowercase">{notaReal}</p>
          </div>
        )}
        
        {tieneComprobante && urlComprobante && (
          <button 
            onClick={() => onVerComprobante(urlComprobante)}
            className="mt-2 w-full flex items-center justify-center gap-1.5 bg-purple-100 hover:bg-purple-200 text-purple-700 px-3 py-2 rounded-xl shadow-sm border border-purple-200 text-[10px] font-black uppercase tracking-widest transition-all active:scale-95"
          >
            <Eye className="w-3.5 h-3.5" /> Ver Comprobante
          </button>
        )}

        {order.phone && <p className="text-[9px] font-black text-gray-400 text-right tracking-tighter mt-2">📞 {order.phone}</p>}
      </div>
      <div className="px-4 pb-4 flex gap-2">
        <button onClick={() => onAvanzar(order.id, col.next)} disabled={actualizando === order.id} className={clsx('flex-1 py-3 rounded-xl text-white font-black text-[10px] uppercase tracking-[0.1em] transition-all shadow-md active:scale-95 disabled:opacity-60', col.btnColor)}>
          {actualizando === order.id ? 'ESPERE...' : col.nextLabel}
        </button>
        <button onClick={() => onCancelar(order.id)} disabled={actualizando === order.id} className="px-3 py-3 rounded-xl bg-red-50 text-red-500 hover:bg-red-100 transition-colors border border-red-100"><XCircle className="w-4 h-4" /></button>
      </div>
    </div>
  )
}