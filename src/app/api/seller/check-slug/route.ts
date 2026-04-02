import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { z } from 'zod'

const schema = z.object({ slug: z.string().min(2) })

export async function POST(req: NextRequest) {
  const body   = await req.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ exists: false })

  const svc = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
  const [{ data: a }, { data: b }] = await Promise.all([
    svc.from('seller_applications').select('id').eq('store_slug', parsed.data.slug).maybeSingle(),
    svc.from('seller_stores').select('id').eq('slug', parsed.data.slug).maybeSingle(),
  ])
  return NextResponse.json({ exists: !!(a || b) })
}
