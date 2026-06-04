import { useState, useMemo } from 'react'
import type { Product, GrupoExtra } from '@/types'
import { X, Minus, Plus } from 'lucide-react'
import clsx from 'clsx'

interface ModalPedidoProps {
  producto: Product
  extrasDisponibles: Product[]
  alAgregar: (item: any) => void
  cerrar: () => void
}

export default function ModalPedido({ producto, extrasDisponibles, alAgregar, cerrar }: ModalPedidoProps) {
  const [cantidad, setCantidad] = useState(1)

  // Mapa: grupoId → IDs de extras seleccionados en ese grupo
  const [seleccionPorGrupo, setSeleccionPorGrupo] = useState<Record<string, string[]>>({})

  // FIX: lee extras_config como GrupoExtra[] desde el tipo compartido
  // Soporta tanto el formato guardado (GrupoExtra[]) como el array legacy de IDs planos
  const grupos: GrupoExtra[] = useMemo(() => {
    const config = producto.extras_config
    if (!config || config.length === 0) return []

    // Formato nuevo: array de objetos GrupoExtra
    if (typeof config[0] === 'object' && 'opciones' in config[0]) {
      return config.filter(g => g.opciones.length > 0)
    }

    // Formato legacy: array plano de IDs → convertir a un grupo opcional genérico
    const idsLegacy = config as unknown as string[]
    return [{
      id:      'legacy',
      nombre:  'Personaliza tus extras',
      tipo:    'opcional',
      min:     0,
      max:     idsLegacy.length,
      opciones: idsLegacy,
    }]
  }, [producto.extras_config])

  const toggleExtra = (grupoId: string, extraId: string, grupo: GrupoExtra) => {
    setSeleccionPorGrupo(prev => {
      const actuales = prev[grupoId] ?? []
      const yaEsta   = actuales.includes(extraId)

      if (yaEsta) {
        return { ...prev, [grupoId]: actuales.filter(id => id !== extraId) }
      }

      // Respetar máximo del grupo (si max === 1 = selección única como radio)
      if (grupo.max === 1) {
        return { ...prev, [grupoId]: [extraId] }
      }
      if (actuales.length >= grupo.max) return prev
      return { ...prev, [grupoId]: [...actuales, extraId] }
    })
  }

  // Todos los extras seleccionados aplanados (para calcular precio y enviar)
  const extrasSeleccionados: Product[] = useMemo(() => {
    return grupos.flatMap(g => {
      const ids = seleccionPorGrupo[g.id] ?? []
      return ids.map(id => extrasDisponibles.find(e => e.id === id)).filter(Boolean) as Product[]
    })
  }, [grupos, seleccionPorGrupo, extrasDisponibles])

  // Validación: grupos obligatorios con mínimo no satisfecho
  const gruposInvalidos = useMemo(() =>
    grupos.filter(g => {
      if (g.tipo !== 'obligatorio') return false
      return (seleccionPorGrupo[g.id]?.length ?? 0) < g.min
    }), [grupos, seleccionPorGrupo])

  const total = useMemo(() => {
    const costoExtras = extrasSeleccionados.reduce((acc, e) => acc + Number(e.price), 0)
    return (Number(producto.price) + costoExtras) * cantidad
  }, [producto.price, extrasSeleccionados, cantidad])

  const handleAgregar = () => {
    if (gruposInvalidos.length > 0) return
    alAgregar({
      lineId:        crypto.randomUUID(),
      productoBase:  producto,
      cantidad,
      extras:        extrasSeleccionados,
      subtotal:      total,
    })
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-0 md:p-4 overflow-hidden">
      <div className="bg-white w-full max-w-6xl h-full md:h-[85vh] md:rounded-[40px] overflow-hidden shadow-2xl flex flex-col md:flex-row animate-in zoom-in-95">

        {/* Imagen del producto */}
        <div className="w-full md:w-1/2 bg-[#F8F8F8] relative flex items-center justify-center p-8 md:p-16 shrink-0 md:shrink">
          <button onClick={cerrar} className="absolute top-6 left-6 z-30 bg-white p-2 rounded-full shadow-md md:hidden">
            <X className="w-6 h-6 text-gray-800" />
          </button>
          <div className="relative w-full aspect-square md:h-full">
            {producto.image_url ? (
              <img
                src={producto.image_url}
                className="w-full h-full object-contain mix-blend-multiply drop-shadow-2xl"
                alt={producto.name}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-9xl grayscale opacity-20">🍔</div>
            )}
          </div>
        </div>

        {/* Panel derecho */}
        <div className="w-full md:w-1/2 flex flex-col h-full bg-white relative">
          <button onClick={cerrar} className="hidden md:flex absolute top-8 right-8 z-30 p-2 hover:bg-gray-100 rounded-full transition-all text-gray-400">
            <X className="w-6 h-6" />
          </button>

          <div className="flex-1 overflow-y-auto px-6 md:px-12 py-10 no-scrollbar">
            <div className="mb-10">
              <h2 className="text-3xl md:text-4xl font-black text-[#542C82] leading-tight">{producto.name}</h2>
              <p className="text-gray-400 text-sm mt-3 font-semibold leading-relaxed">
                {producto.description || 'Cuarto de libra de carne smash, queso cheddar y el secreto de la casa.'}
              </p>
              <div className="mt-4 inline-block bg-purple-50 px-4 py-1.5 rounded-full">
                <span className="text-purple-700 font-black text-lg">${Number(producto.price).toFixed(2)}</span>
              </div>
            </div>

            {/* FIX: renderiza cada GrupoExtra con su lógica de min/max/obligatorio */}
            {grupos.length > 0 && (
              <div className="space-y-10">
                {grupos.map(grupo => {
                  const extrasDelGrupo = grupo.opciones
                    .map(id => extrasDisponibles.find(e => e.id === id))
                    .filter(Boolean) as Product[]

                  if (extrasDelGrupo.length === 0) return null

                  const seleccionados = seleccionPorGrupo[grupo.id] ?? []
                  const esObligatorio  = grupo.tipo === 'obligatorio'
                  const seleccionMin   = esObligatorio && seleccionados.length < grupo.min

                  return (
                    <div key={grupo.id} className="space-y-4">
                      <div className="flex justify-between items-end border-b-2 border-gray-100 pb-4">
                        <div>
                          <h3 className="font-black text-gray-800 text-xl tracking-tight">{grupo.nombre}</h3>
                          <p className="text-xs text-gray-400 font-bold uppercase tracking-tighter mt-1">
                            {esObligatorio
                              ? `Elige ${grupo.min === grupo.max ? grupo.min : `${grupo.min}–${grupo.max}`}`
                              : grupo.max > 1 ? `Hasta ${grupo.max} opciones` : 'Puedes elegir uno'}
                          </p>
                        </div>
                        <span className={clsx(
                          'text-[10px] font-black px-3 py-1 rounded-md uppercase tracking-widest',
                          esObligatorio
                            ? seleccionMin
                              ? 'bg-red-100 text-red-700'
                              : 'bg-green-100 text-green-700'
                            : 'bg-gray-100 text-gray-500'
                        )}>
                          {esObligatorio ? (seleccionMin ? 'Obligatorio' : '✓ Ok') : 'Opcional'}
                        </span>
                      </div>

                      <div className="grid gap-4">
                        {extrasDelGrupo.map(extra => {
                          const activo = seleccionados.includes(extra.id)
                          return (
                            <label
                              key={extra.id}
                              className={clsx(
                                'flex items-center justify-between p-5 rounded-2xl border-2 transition-all cursor-pointer group',
                                activo ? 'border-[#542C82] bg-purple-50/30' : 'border-gray-100 hover:border-purple-200'
                              )}
                            >
                              <div className="flex flex-col">
                                <span className="text-sm md:text-base font-bold text-gray-700 group-hover:text-[#542C82] transition-colors">{extra.name}</span>
                                <span className="text-xs font-black text-[#542C82] mt-0.5">+${Number(extra.price).toFixed(2)}</span>
                              </div>
                              <div className={clsx(
                                'w-7 h-7 flex items-center justify-center transition-all',
                                grupo.max === 1 ? 'rounded-full' : 'rounded-md',
                                activo ? 'bg-[#542C82] border-2 border-[#542C82]' : 'border-2 border-gray-300 bg-white'
                              )}>
                                {activo && <div className="w-2.5 h-2.5 bg-white rounded-full" />}
                              </div>
                              <input
                                type={grupo.max === 1 ? 'radio' : 'checkbox'}
                                className="hidden"
                                checked={activo}
                                onChange={() => toggleExtra(grupo.id, extra.id, grupo)}
                              />
                            </label>
                          )
                        })}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="p-6 md:p-10 border-t border-gray-100 bg-white shrink-0">
            {gruposInvalidos.length > 0 && (
              <p className="text-xs text-red-600 font-bold text-center mb-3">
                Selecciona las opciones obligatorias para continuar
              </p>
            )}
            <div className="flex flex-col sm:flex-row items-center gap-4">
              <div className="flex items-center justify-between w-full sm:w-auto bg-gray-100 rounded-2xl px-6 py-3 border border-gray-200 gap-8">
                <button onClick={() => setCantidad(Math.max(1, cantidad - 1))} className="text-gray-400 hover:text-[#542C82] transition-colors">
                  <Minus className="w-6 h-6 stroke-[3px]" />
                </button>
                <span className="font-black text-xl text-gray-800 w-6 text-center">{cantidad}</span>
                <button onClick={() => setCantidad(cantidad + 1)} className="text-gray-400 hover:text-[#542C82] transition-colors">
                  <Plus className="w-6 h-6 stroke-[3px]" />
                </button>
              </div>

              <button
                onClick={handleAgregar}
                disabled={gruposInvalidos.length > 0}
                className={clsx(
                  'w-full flex-1 text-white font-black h-16 rounded-[20px] shadow-xl flex items-center justify-between px-8 transition-all active:scale-[0.98]',
                  gruposInvalidos.length > 0
                    ? 'bg-gray-300 shadow-none cursor-not-allowed'
                    : 'bg-[#542C82] hover:bg-[#432369] shadow-purple-100'
                )}
              >
                <span className="uppercase tracking-[2px] text-xs">Añadir al pedido</span>
                <div className="flex items-center gap-3">
                  <div className="h-6 w-px bg-white/20" />
                  <span className="text-xl">${total.toFixed(2)}</span>
                </div>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
