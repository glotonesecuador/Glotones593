import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

// Conexión directa y autónoma
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export const dynamic = 'force-dynamic'

export async function POST() {
  try {
    const { data: orders, error: fetchError } = await supabase
      .from('orders')
      .select('phone, customer_name, email, total, created_at, status')
      .not('phone', 'is', null)
      .neq('phone', '');

    if (fetchError) throw fetchError;
    if (!orders || orders.length === 0) return NextResponse.json({ message: 'Sin pedidos' });

    const customerMap: Record<string, any> = {};

    orders.forEach((o: any) => {
      const tel = o.phone.toString().trim();

      if (!customerMap[tel]) {
        customerMap[tel] = {
          phone: tel, name: o.customer_name || 'Cliente Glotón', email: o.email || null,
          total_spent: 0, order_count: 0, last_order: o.created_at, points: 0
        };
      }

      if (o.status !== 'Cancelado' && o.status !== 'Error') {
        customerMap[tel].total_spent += parseFloat(o.total) || 0;
        customerMap[tel].order_count += 1;
        customerMap[tel].points = Math.floor(customerMap[tel].total_spent);

        if (new Date(o.created_at) > new Date(customerMap[tel].last_order)) {
          customerMap[tel].last_order = o.created_at;
        }
        if (o.customer_name && customerMap[tel].name === 'Cliente Glotón') {
          customerMap[tel].name = o.customer_name;
        }
      }
    });

    const finalData = Object.values(customerMap);
    const { error: upsertError } = await supabase
      .from('customers')
      .upsert(finalData, { onConflict: 'phone' });

    if (upsertError) throw upsertError;

    return NextResponse.json({ success: true, actualizados: finalData.length });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}