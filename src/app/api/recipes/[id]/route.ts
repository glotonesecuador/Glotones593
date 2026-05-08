import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'

type Params = { params: { id: string } }

export async function PUT(req: NextRequest, { params }: Params) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  const body = await req.json()
  const db   = supabaseAdmin()

  // Borrar receta anterior
  await db.from('recipes').delete().eq('product_id', params.id)

  // Insertar la nueva
  if (body.items && body.items.length > 0) {
    const rows = body.items.map((item: any) => ({
      product_id:    params.id,
      ingredient_id: item.ingredient_id,
      quantity:      Number(item.quantity),
    }))
    const { error } = await db.from('recipes').insert(rows)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}