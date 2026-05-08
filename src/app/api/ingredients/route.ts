import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  const db = supabaseAdmin()
  const { data, error } = await db.from('ingredients').select('*').order('name')
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  const body = await req.json()
  const db   = supabaseAdmin()
  const { data, error } = await db.from('ingredients').insert({
    name:      body.name,
    unit:      body.unit ?? 'und',
    cost:      Number(body.cost) ?? 0,
    stock:     Number(body.stock) ?? 0,
    min_stock: Number(body.min_stock) ?? 5,
  }).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}
