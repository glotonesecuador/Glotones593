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
  try {
    const body = await req.json()
    const db   = supabaseAdmin()
    
    // Iteramos sobre el objeto recibido. 
    // Si el frontend envía { store: {...} }, esto guardará 'store' en el campo key 
    // y el objeto de configuración en el campo value.
    for (const [key, value] of Object.entries(body)) {
      const { error } = await db.from('settings').upsert({
        key:        key,
        value:      value,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'key' })
      
      if (error) throw error
    }
    
    return NextResponse.json({ ok: true })
  } catch (error: any) {
    console.error("Error guardando settings:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}