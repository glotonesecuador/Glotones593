/**
 * SCRIPT DE MIGRACIÓN: Firebase Firestore → Supabase PostgreSQL
 * 
 * USO:
 *   1. npm install @supabase/supabase-js firebase-admin dotenv
 *   2. Copia tu serviceAccountKey.json de Firebase Console
 *   3. Configura las variables de entorno abajo
 *   4. node migrate-firebase-to-supabase.js
 */

require('dotenv').config({ path: '.env.local' })

const admin    = require('firebase-admin')
const { createClient } = require('@supabase/supabase-js')
const ws = require('ws')

// ─── CONFIGURACIÓN ─────────────────────────────────
const FIREBASE_PROJECT_ID = 'glotones-90e1c'
const FIREBASE_APP_ID     = 'glotones-ec-oficial'
const SUPABASE_URL         = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_KEY         = process.env.SUPABASE_SERVICE_ROLE_KEY

// ─── INIT ──────────────────────────────────────────
const serviceAccount = require('./serviceAccountKey.json')

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  projectId:  FIREBASE_PROJECT_ID,
})

const firestoreDb = admin.firestore()
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
  realtime: { transport: ws }
})

const BASE_PATH = `artifacts/${FIREBASE_APP_ID}/public/data`

async function getCollection(name) {
  const snap = await firestoreDb.collection(`${BASE_PATH}/${name}`).get()
  return snap.docs.map(d => ({ id: d.id, ...d.data() }))
}

async function migrateProducts() {
  console.log('\n📦 Migrando productos...')
  const products = await getCollection('products')
  console.log(`  Encontrados: ${products.length}`)

  for (const p of products) {
    const { error } = await supabase.from('products').upsert({
      id:          p.id,
      name:        p.name || 'Sin nombre',
      description: p.description || null,
      price:       Number(p.price) || 0,
      category:    p.category || 'Extras',
      image_url:   p.image && p.image.startsWith('http') ? p.image : null,
      active:      p.active !== false,
      discount_pct: Number(p.discountPct || p.discount_pct) || 0,
      sort_order:  Number(p.sortOrder) || 0,
    }, { onConflict: 'id' })

    if (error) console.error(`  ❌ Producto ${p.name}:`, error.message)
    else process.stdout.write('.')
  }
  console.log(`\n  ✅ ${products.length} productos migrados`)
}

async function migrateOrders() {
  console.log('\n🛒 Migrando órdenes...')
  const orders = await getCollection('orders')
  console.log(`  Encontradas: ${orders.length}`)

  const BATCH_SIZE = 50
  for (let i = 0; i < orders.length; i += BATCH_SIZE) {
    const batch = orders.slice(i, i + BATCH_SIZE).map(o => ({
      id:            o.id,
      customer_name: o.customer || 'Consumidor Final',
      phone:         o.phone ? String(o.phone) : null,
      address:       o.address || null,
      total:         Number(o.total) || 0,
      net_total:     o.netTotal ? Number(o.netTotal) : null,
      status:        o.status || 'Pendiente',
      channel:       o.channel || 'Local',
      method:        o.method || 'Efectivo',
      platform_fee:  Number(o.platformFee) || 0,
      delivery_cost: Number(o.deliveryRealCost) || 0,
      items:         Array.isArray(o.items) ? o.items : [],
      invoice_data:  o.invoiceData || {},
      notes:         o.notes || null,
      created_at:    o.date ? new Date(o.date).toISOString() : new Date().toISOString(),
    }))

    const { error } = await supabase.from('orders').upsert(batch, { onConflict: 'id' })
    if (error) console.error(`  ❌ Batch ${i}-${i+BATCH_SIZE}:`, error.message)
    else process.stdout.write('.')
  }
  console.log(`\n  ✅ ${orders.length} órdenes migradas`)
}

async function migrateCustomers() {
  console.log('\n👥 Migrando clientes...')
  const customers = await getCollection('customersData')
  console.log(`  Encontrados: ${customers.length}`)

  for (const c of customers) {
    const phone = String(c.phone || c.id || '').replace(/\D/g, '')
    if (!phone) continue

    const { error } = await supabase.from('customers').upsert({
      phone,
      name:        c.name || null,
      email:       c.email || null,
      address:     c.address || null,
      birthday:    c.birthday ? c.birthday.split('T')[0] : null,
      instagram:   c.instagram || null,
      manual_tags: c.manualTags || null,
      rating:      Number(c.rating) || 5,
    }, { onConflict: 'phone' })

    if (error) console.error(`  ❌ Cliente ${phone}:`, error.message)
    else process.stdout.write('.')
  }
  console.log(`\n  ✅ ${customers.length} clientes migrados`)
}

async function migrateIngredients() {
  console.log('\n🧂 Migrando ingredientes...')
  const ingredients = await getCollection('ingredients')
  console.log(`  Encontrados: ${ingredients.length}`)

  for (const i of ingredients) {
    const { error } = await supabase.from('ingredients').upsert({
      id:        i.id,
      name:      i.name || 'Sin nombre',
      unit:      i.unit || 'und',
      cost:      Number(i.cost) || 0,
      stock:     Number(i.stock) || 0,
      min_stock: Number(i.minStock || i.min_stock) || 5,
    }, { onConflict: 'id' })

    if (error) console.error(`  ❌ Ingrediente ${i.name}:`, error.message)
    else process.stdout.write('.')
  }
  console.log(`\n  ✅ ${ingredients.length} ingredientes migrados`)
}

async function migrateCategories() {
  console.log('\n📂 Migrando categorías...')
  const categories = await getCollection('categories')
  console.log(`  Encontradas: ${categories.length}`)

  for (const c of categories) {
    const { error } = await supabase.from('categories').upsert({
      id:         c.id,
      name:       c.name,
      sort_order: Number(c.sortOrder) || 0,
    }, { onConflict: 'name' })

    if (error) console.error(`  ❌ Categoría ${c.name}:`, error.message)
  }
  console.log('  ✅ Categorías migradas')
}

async function migrateExpenses() {
  console.log('\n💸 Migrando gastos...')
  const expenses = await getCollection('expenses')
  console.log(`  Encontrados: ${expenses.length}`)

  for (const e of expenses) {
    const { error } = await supabase.from('expenses').upsert({
      id:      e.id,
      concept: e.concept || 'Gasto',
      amount:  Number(e.amount) || 0,
      type:    e.type || 'Operativo',
      date:    e.date ? new Date(e.date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
    }, { onConflict: 'id' })

    if (error) console.error(`  ❌ Gasto:`, error.message)
  }
  console.log('  ✅ Gastos migrados')
}

async function main() {
  console.log('🚀 MIGRACIÓN FIREBASE → SUPABASE')
  console.log('================================')
  console.log(`Firebase: ${FIREBASE_PROJECT_ID}`)
  console.log(`Supabase: ${SUPABASE_URL}`)
  console.log()

  try {
    await migrateCategories()
    await migrateProducts()
    await migrateIngredients()
    await migrateCustomers()
    await migrateOrders()
    await migrateExpenses()

    console.log('\n\n✅ ¡MIGRACIÓN COMPLETA!')
    console.log('   Verifica tus datos en: Supabase > Table Editor')
  } catch (err) {
    console.error('\n❌ Error durante la migración:', err)
  } finally {
    process.exit(0)
  }
}

main()
