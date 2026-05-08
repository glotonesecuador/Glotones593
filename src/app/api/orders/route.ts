import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  const { searchParams } = new URL(req.url)
  const status = searchParams.get('status')
  const date   = searchParams.get('date')
  const phone  = searchParams.get('phone')
  const limit  = parseInt(searchParams.get('limit') ?? '100')
  const db = supabaseAdmin()
  let query = db.from('orders').select('*').order('created_at', { ascending: false }).limit(limit)
  if (status) query = query.eq('status', status)
  if (phone)  query = query.eq('phone', phone)
  if (date) {
    query = query
      .gte('created_at', `${date}T00:00:00.000Z`)
      .lte('created_at', `${date}T23:59:59.999Z`)
  }
  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const db   = supabaseAdmin()
  const { data, error } = await db.from('orders').insert({
    customer_name: body.customer_name ?? 'Consumidor Final',
    phone:         body.phone ?? null,
    address:       body.address ?? null,
    total:         Number(body.total),
    net_total:     body.net_total ? Number(body.net_total) : null,
    status:        'Pendiente',
    channel:       body.channel ?? 'Local',
    method:        body.method ?? 'Efectivo',
    platform_fee:  body.platform_fee ?? 0,
    delivery_cost: body.delivery_cost ?? 0,
    items:         body.items ?? [],
    invoice_data:  body.invoice_data ?? {},
    notes:         body.notes ?? null,
  }).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}
