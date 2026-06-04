import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'

export async function POST() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const db = supabaseAdmin()

  // Traer todas las órdenes no canceladas
  const { data: orders } = await db
    .from('orders')
    .select('phone, customer_name, total, created_at')
    .neq('status', 'Cancelado')
    .not('phone', 'is', null)

  if (!orders) return NextResponse.json({ ok: true, synced: 0 })

  // Agrupar por teléfono
  const map: Record<string, { name: string; phone: string; total: number; count: number; last: string }> = {}

  for (const o of orders) {
    if (!o.phone) continue
    if (!map[o.phone]) {
      map[o.phone] = { phone: o.phone, name: o.customer_name, total: 0, count: 0, last: o.created_at }
    }
    map[o.phone].total += Number(o.total)
    map[o.phone].count += 1
    if (new Date(o.created_at) > new Date(map[o.phone].last)) {
      map[o.phone].last = o.created_at
    }
  }

  // Upsert cada cliente en la tabla customers
  let synced = 0
  for (const c of Object.values(map)) {
    const { error } = await db.from('customers').upsert({
      phone:      c.phone,
      name:       c.name !== 'Consumidor Final' ? c.name : undefined,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'phone', ignoreDuplicates: false })

    if (!error) synced++
  }

  return NextResponse.json({ ok: true, synced })
}