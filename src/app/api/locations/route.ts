import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

// Función para traer las sucursales (GET)
export async function GET() {
  const db = supabaseAdmin()
  const { data, error } = await db
    .from('locations')
    .select('*')
    .order('name', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

// Función para grabar/actualizar sucursales (POST)
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const db = supabaseAdmin()

    // Payload limpio solo con los campos estrictamente necesarios
    // (Hemos quitado user_id y updated_at por si no existen en tu tabla)
    const payload = {
      id: body.id,
      name: body.name,
      address: body.address || null,
      active: body.active ?? true
    }

    // Usamos upsert para que si el ID existe lo actualice, y si no, lo cree
    const { data, error } = await db
      .from('locations')
      .upsert(payload, { onConflict: 'id' })
      .select()
      .single()

    if (error) {
      // ESTE CONSOLE.LOG ES CLAVE: Te dirá exactamente qué columna falta o qué está fallando
      console.error("❌ ERROR EN SUPABASE (LOCATIONS):", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data, { status: 201 })
    
  } catch (err: any) {
    console.error("❌ ERROR INTERNO API LOCATIONS:", err)
    return NextResponse.json({ error: err.message || 'Error interno del servidor' }, { status: 500 })
  }
}

// Función para borrar sucursales (DELETE)
export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')
  
  if (!id) return NextResponse.json({ error: 'ID requerido' }, { status: 400 })

  const db = supabaseAdmin()
  const { error } = await db.from('locations').delete().eq('id', id)

  if (error) {
    console.error("❌ ERROR AL BORRAR EN SUPABASE:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  
  return NextResponse.json({ ok: true })
}