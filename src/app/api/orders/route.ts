import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const db = supabaseAdmin()

    // 1. Preparamos el objeto con los datos aplanados
    const { data, error } = await db
      .from('orders')
      .insert([{
        customer_name: body.customer_name,
        phone: body.phone,
        cedula: body.cedula,       // NUEVO CAMPO PLANO
        email: body.email,         // NUEVO CAMPO PLANO
        total: body.total,
        net_total: body.net_total,
        channel: body.channel,
        method: body.method,
        platform_fee: body.platform_fee,
        items: body.items,
        notes: body.notes,
        location_id: body.location_id, // SUCURSAL
        status: body.status || 'Pendiente', // El POS lo mandará como Entregado, KDS/Web como Pendiente
      }])
      .select()
      .single()

    if (error) {
      console.error("Error Supabase Orders:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data, { status: 201 })
  } catch (err: any) {
    console.error("Error API Orders POST:", err)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const limit = searchParams.get('limit') ? Number(searchParams.get('limit')) : 50
  const location_id = searchParams.get('location_id')
  
  const db = supabaseAdmin()
  let query = db.from('orders').select('*').order('created_at', { ascending: false }).limit(limit)
  
  // Filtrar por sucursal si no es "todas"
  if (location_id && location_id !== 'todas') {
    query = query.eq('location_id', location_id)
  }

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}