'use client'

import { useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { signOut, useSession, SessionProvider } from 'next-auth/react'
import {
  ShoppingCart, ChefHat, ClipboardList, TrendingUp,
  UtensilsCrossed, Package, Truck, BarChart3,
  DollarSign, Settings, LogOut, Menu, Store, ChevronRight,
  Users,
} from 'lucide-react'
import clsx from 'clsx'

const NAV = [
  { href: '/admin/ventas',     label: 'Ventas (POS)',    icon: ShoppingCart,    color: 'text-yellow-400' },
  { href: '/admin/cocina',     label: 'Cocina (KDS)',    icon: ChefHat,         color: 'text-orange-400' },
  { href: '/admin/pedidos',    label: 'Pedidos',         icon: ClipboardList,   color: 'text-blue-400'   },
  { href: '/admin/finanzas',   label: 'Finanzas',        icon: TrendingUp,      color: 'text-green-400'  },
  { href: '/admin/clientes',   label: 'Clientes CRM',    icon: Users,           color: 'text-rose-400'   },
  { href: '/admin/catalogo',   label: 'Catálogo & Menú', icon: UtensilsCrossed, color: 'text-purple-400' },
  { href: '/admin/inventario', label: 'Inventario',      icon: Package,         color: 'text-cyan-400'   },
  { href: '/admin/compras',    label: 'Compras',         icon: Truck,           color: 'text-indigo-400' },
  { href: '/admin/reportes',   label: 'Reportes',        icon: BarChart3,       color: 'text-pink-400'   },
  { href: '/admin/costos',     label: 'Costos',          icon: DollarSign,      color: 'text-emerald-400'},
  { href: '/admin/config',     label: 'Configuración',   icon: Settings,        color: 'text-gray-400'   },
]

function AdminLayoutInner({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router   = useRouter()
  const { data: session } = useSession()
  const [open, setOpen] = useState(false)

  if (pathname === '/admin/login') return <>{children}</>

  const Sidebar = () => (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-3 px-5 py-5 border-b border-white/10">
        <div className="w-9 h-9 bg-white/20 rounded-xl flex items-center justify-center">
          <Store className="w-5 h-5 text-white" />
        </div>
        <div>
          <p className="font-display font-bold text-white text-sm">Glotones 593</p>
          <p className="text-white/50 text-xs">Panel Admin</p>
        </div>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {NAV.map(({ href, label, icon: Icon, color }) => {
          const active = pathname === href
          return (
            <button
              key={href}
              onClick={() => { router.push(href); setOpen(false) }}
              className={clsx(
                'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all',
                active ? 'bg-white text-purple-700 shadow-sm' : 'text-white/70 hover:text-white hover:bg-white/10'
              )}
            >
              <Icon className={clsx('w-4 h-4 shrink-0', active ? 'text-purple-600' : color)} />
              <span>{label}</span>
              {active && <ChevronRight className="w-3 h-3 ml-auto text-purple-400" />}
            </button>
          )
        })}
      </nav>

      <div className="px-3 py-4 border-t border-white/10">
        <div className="flex items-center gap-3 px-3 py-2 mb-2">
          <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-white text-xs font-bold">
            {session?.user?.name?.[0] ?? 'A'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white text-xs font-semibold truncate">{session?.user?.name ?? 'Admin'}</p>
            <p className="text-white/40 text-xs truncate">{session?.user?.email}</p>
          </div>
        </div>
        <button
          onClick={() => signOut({ callbackUrl: '/admin/login' })}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-white/60 hover:text-white hover:bg-white/10 text-sm transition-all"
        >
          <LogOut className="w-4 h-4" />
          Salir
        </button>
      </div>
    </div>
  )

  return (
    <div className="flex h-screen bg-gray-100 overflow-hidden">
      <aside className="hidden lg:flex flex-col w-60 bg-purple-800 shrink-0">
        <Sidebar />
      </aside>

      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setOpen(false)} />
          <aside className="absolute left-0 top-0 bottom-0 w-60 bg-purple-800 flex flex-col">
            <Sidebar />
          </aside>
        </div>
      )}

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="lg:hidden bg-white border-b px-4 py-3 flex items-center gap-3">
          <button onClick={() => setOpen(true)} className="p-2 rounded-lg hover:bg-gray-100">
            <Menu className="w-5 h-5 text-gray-600" />
          </button>
          <span className="font-display font-bold text-purple-700">
            {NAV.find(n => pathname.startsWith(n.href))?.label ?? 'Admin'}
          </span>
        </header>
        <main className="flex-1 overflow-y-auto">{children}</main>
      </div>
    </div>
  )
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <AdminLayoutInner>{children}</AdminLayoutInner>
    </SessionProvider>
  )
}