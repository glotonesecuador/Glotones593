import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET() {
  const db = supabaseAdmin()
  const { data, error } = await db.from('settings').select('*')
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  const result: Record<string, any> = {}
  data?.forEach(row => { result[row.key] = row.value })
  return NextResponse.json(result)
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const db   = supabaseAdmin()
  const { error } = await db.from('settings').upsert({
    key:        body.key,
    value:      body.value,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'key' })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
