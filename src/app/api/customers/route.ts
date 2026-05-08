import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const db = supabaseAdmin()

  const { data: customers, error } = await db
    .from('customers')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const { data: orders } = await db
    .from('orders')
    .select('phone, total, created_at, status')
    .neq('status', 'Cancelado')

  const enriched = (customers ?? []).map((c: any) => {
    const clientOrders = (orders ?? []).filter((o: any) => o.phone === c.phone)
    const total_spent  = clientOrders.reduce((a: number, o: any) => a + Number(o.total), 0)
    const order_count  = clientOrders.length
    const sorted       = [...clientOrders].sort((a: any, b: any) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    )
    const last_order = sorted[0]?.created_at ?? null

    const auto_tags: string[] = []
    if (order_count >= 10)  auto_tags.push('VIP')
    if (order_count >= 5)   auto_tags.push('Frecuente')
    if (order_count === 1)  auto_tags.push('Nuevo')
    if (total_spent >= 100) auto_tags.push('Alto valor')
    if (order_count === 0)  auto_tags.push('Sin pedidos')

    const points  = Math.floor(total_spent * 10)
    const loyalty = points >= 1000 ? 'Oro' : points >= 500 ? 'Plata' : 'Bronce'

    return { ...c, total_spent, order_count, last_order, auto_tags, points, loyalty }
  })

  return NextResponse.json(enriched)
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const body = await req.json()
  const db   = supabaseAdmin()

  const { data, error } = await db.from('customers').upsert({
    phone:       body.phone,
    name:        body.name ?? null,
    email:       body.email ?? null,
    address:     body.address ?? null,
    birthday:    body.birthday ?? null,
    instagram:   body.instagram ?? null,
    manual_tags: body.manual_tags ?? null,
    notes:       body.notes ?? null,
    rating:      body.rating ?? 5,
    updated_at:  new Date().toISOString(),
  }, { onConflict: 'phone' }).select().single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}