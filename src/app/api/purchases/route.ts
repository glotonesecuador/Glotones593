import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  const db = supabaseAdmin()
  const { data, error } = await db.from('purchases').select('*').order('date', { ascending: false })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  const body = await req.json()
  const db   = supabaseAdmin()

  // Guardar la compra
  const { data, error } = await db.from('purchases').insert({
    ingredient_id: body.ingredient_id,
    quantity:      Number(body.quantity),
    total_cost:    Number(body.total_cost),
    unit_cost:     Number(body.unit_cost) ?? 0,
    supplier:      body.supplier ?? null,
    date:          body.date ?? new Date().toISOString().split('T')[0],
  }).select().single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Actualizar stock del ingrediente
  const { data: ing } = await db.from('ingredients').select('stock').eq('id', body.ingredient_id).single()
  if (ing) {
    await db.from('ingredients').update({
      stock:     Number(ing.stock) + Number(body.quantity),
      cost:      Number(body.unit_cost) > 0 ? Number(body.unit_cost) : undefined,
    }).eq('id', body.ingredient_id)
  }

  return NextResponse.json(data, { status: 201 })
}
