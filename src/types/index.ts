export interface Product {
  id: string
  name: string
  description: string | null
  price: number
  category: string
  image_url: string | null
  active: boolean
  discount_pct: number
  sort_order: number
  created_at: string
  extras_config?: GrupoExtra[]
}

export interface Category {
  id: string
  name: string
  sort_order: number
}

// Un item dentro de una orden.
// - id       → lineId único de esta línea (UUID generado al agregar al carrito)
// - base_id  → ID del Product original (para lookup en catálogo / KDS)
export interface OrderItem {
  id: string
  base_id: string
  name: string
  price: number
  quantity: number
  image_url?: string | null
}

// Grupo de modificadores/extras asignado a un producto
export interface GrupoExtra {
  id: string
  nombre: string
  tipo: 'obligatorio' | 'opcional'
  min: number
  max: number
  opciones: string[]  // IDs de productos con category === 'Extras'
}

export interface Order {
  id: string
  customer_name: string
  phone: string | null
  address: string | null
  cedula: string | null
  email: string | null
  total: number
  net_total: number | null
  status: OrderStatus
  channel: SaleChannel
  method: string | null
  platform_fee: number
  delivery_cost: number
  items: OrderItem[]
  invoice_data: Record<string, string>
  location_id: string | null
  notes: string | null
  created_at: string
}

export type OrderStatus = 'Pendiente' | 'En Proceso' | 'Listo' | 'Entregado' | 'Cancelado'
export type SaleChannel = 'Local' | 'Retiro' | 'Pedido Directo' | 'PedidosYa' | 'Rappi' | 'iFood' | 'WhatsApp'

export interface Customer {
  phone: string
  name: string | null
  email: string | null
  address: string | null
  birthday: string | null
  instagram: string | null
  manual_tags: string | null
  rating: number
  created_at: string
  total_spent?: number
  order_count?: number
  last_order?: string
  auto_tags?: string[]
  points?: number
  loyalty?: 'Bronce' | 'Plata' | 'Oro'
}

export interface Ingredient {
  id: string
  name: string
  unit: string
  cost: number
  stock: number
  min_stock: number
}

export interface Purchase {
  id: string
  ingredient_id: string | null
  quantity: number
  total_cost: number
  unit_cost: number | null
  supplier: string | null
  date: string
  ingredient?: Ingredient
}

export interface Expense {
  id: string
  concept: string
  amount: number
  type: string
  date: string
  created_at: string
}

export interface StoreSettings {
  name: string
  primaryColor: string
  phone: string
  instagram: string
  address: string
  showBanner: boolean
  bannerTitle: string
  bannerText: string
  bannerBtnText: string
  logoUrl?: string
}
