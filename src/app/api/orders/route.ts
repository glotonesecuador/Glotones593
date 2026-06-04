import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const status      = searchParams.get('status')
  const date        = searchParams.get('date')
  const phone       = searchParams.get('phone')
  const location_id = searchParams.get('location_id')
  const limit       = parseInt(searchParams.get('limit') ?? '100')

  const db = supabaseAdmin()
  let query = db.from('orders').select('*').order('created_at', { ascending: false }).limit(limit)

  if (status) query = query.eq('status', status)
  if (phone)  query = query.eq('phone', phone)
  if (location_id && location_id !== 'todas') query = query.eq('location_id', location_id)

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
  // FIX: verificar sesión igual que GET
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const body = await req.json()
  const db   = supabaseAdmin()

  // FIX: location_id ya no tiene el fallback hardcodeado 'cd-rio-1'
  // Si viene 'todas' o nulo, se guarda null para que el filtro por sucursal
  // no excluya la orden de ninguna vista
  const location_id = body.location_id && body.location_id !== 'todas'
    ? body.location_id
    : null

  const { data, error } = await db.from('orders').insert({
    customer_name: body.customer_name ?? 'Consumidor Final',
    phone:         body.phone ?? null,
    address:       body.address ?? null,
    cedula:        body.cedula ?? null,
    email:         body.email ?? null,
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
    location_id,
  }).select().single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Auto-crear/actualizar cliente en CRM si tiene teléfono
  if (body.phone && body.customer_name !== 'Consumidor Final') {
    await db.from('customers').upsert({
      phone:      String(body.phone),
      name:       body.customer_name,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'phone', ignoreDuplicates: false })
  }

  return NextResponse.json(data, { status: 201 })
}
