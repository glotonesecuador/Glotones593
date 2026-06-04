import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'

type Params = { params: { id: string } }

// Método para Editar producto o cambiar su estado Activo/Inactivo
export async function PUT(req: NextRequest, { params }: Params) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  
  try {
    const body = await req.json()
    const db = supabaseAdmin()
    
    // Mapeamos explícitamente los campos para evitar errores de columnas inexistentes
    const updateData = {
      name:         body.name,
      description:  body.description,
      price:        Number(body.price),
      category:     body.category,
      discount_pct: Number(body.discount_pct) || 0,
      sort_order:   Number(body.sort_order) || 0,
      active:       body.active ?? true,
      image_url:    body.image_url,
      // 👇 ESTA ES LA CLAVE: Enviamos el objeto JSON de los grupos
      extras_config: body.extras_config 
    }

    const { data, error } = await db
      .from('products')
      .update(updateData)
      .eq('id', params.id)
      .select()
      .single()
      
    if (error) {
      console.error("Error de Supabase:", error.message)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    
    return NextResponse.json(data)
  } catch (error: any) {
    console.error("Error en la API:", error.message)
    return NextResponse.json({ error: 'Fallo al procesar la solicitud' }, { status: 500 })
  }
}

// Método para Eliminar producto
export async function DELETE(req: NextRequest, { params }: Params) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  
  const db = supabaseAdmin()
  
  // 1. Intentamos hacer un borrado físico (Hard Delete)
  // Esto funcionará perfecto para productos nuevos de prueba que aún no tienen ventas.
  const { error } = await db.from('products').delete().eq('id', params.id)
  
  if (error) {
    // Si da error (código 23503 en Postgres es violación de llave foránea),
    // significa que la hamburguesa ya está en el historial de ventas.
    // 2. Hacemos un "Soft Delete" pasando el active a false para no romper tu data.
    console.warn(`Fallo borrado físico para producto ${params.id}. Aplicando Soft Delete.`)
    
    const { error: softError } = await db
      .from('products')
      .update({ active: false })
      .eq('id', params.id)
      
    if (softError) return NextResponse.json({ error: softError.message }, { status: 500 })
  }
  
  return NextResponse.json({ ok: true })
}