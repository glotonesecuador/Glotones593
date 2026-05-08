import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const category = searchParams.get('category')
  const adminReq = searchParams.get('admin') === '1'
  const db = supabaseAdmin()
  let query = db.from('products').select('*').order('sort_order').order('name')
  if (!adminReq) query = query.eq('active', true)
  if (category && category !== 'Todas') query = query.eq('category', category)
  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  const body = await req.json()
  const db   = supabaseAdmin()
  const { data, error } = await db.from('products').insert({
    name:         body.name,
    description:  body.description ?? null,
    price:        Number(body.price),
    category:     body.category,
    image_url:    body.image_url ?? null,
    active:       body.active ?? true,
    discount_pct: body.discount_pct ?? 0,
    sort_order:   body.sort_order ?? 0,
  }).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}
