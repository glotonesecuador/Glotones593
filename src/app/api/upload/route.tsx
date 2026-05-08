import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  const formData = await req.formData()
  const file     = formData.get('file') as File | null
  const folder   = (formData.get('folder') as string) ?? 'products'
  if (!file) return NextResponse.json({ error: 'No se recibió archivo' }, { status: 400 })
  const bytes  = await file.arrayBuffer()
  const buffer = Buffer.from(bytes)
  const ext    = file.name.split('.').pop() ?? 'jpg'
  const name   = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
  const db = supabaseAdmin()
  const { error } = await db.storage.from('glotones-assets').upload(name, buffer, {
    contentType: file.type,
    upsert: false,
  })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  const { data: { publicUrl } } = db.storage.from('glotones-assets').getPublicUrl(name)
  return NextResponse.json({ url: publicUrl })
}
