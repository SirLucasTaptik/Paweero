#!/usr/bin/env node
/**
 * Depodaki mevcut fotoğrafları küçültür.
 *
 * Uygulama artık yüklemeden önce küçültüyor, ama bu değişiklikten ÖNCE yüklenmiş
 * fotoğraflar hâlâ telefon kamerasının ürettiği boyutta (3-8 MB). Bu script onları
 * aynı yola geri yazar — adres değişmediği için veritabanında hiçbir güncelleme
 * gerekmez ve paylaşılmış linkler bozulmaz.
 *
 * UYARI: --write orijinalin üzerine yazar, geri dönüşü yoktur. Önce denemeyi
 * çalıştır, listeyi gözden geçir, sonra --write ekle.
 *
 * Kullanım:
 *   npm i -D sharp
 *   SUPABASE_SERVICE_KEY=... node scripts/optimize-storage.mjs          # deneme (yazmaz)
 *   SUPABASE_SERVICE_KEY=... node scripts/optimize-storage.mjs --write  # gerçekten yazar
 *
 * Servis anahtarını Supabase panelinde Settings > API > service_role altında
 * bulursun. ASLA depoya commit etme, sadece komut satırında ver.
 */
import { createClient } from '@supabase/supabase-js'
import sharp from 'sharp'

const URL    = process.env.SUPABASE_URL || 'https://uyuqcpttdbejaakbwzyl.supabase.co'
const KEY    = process.env.SUPABASE_SERVICE_KEY
const BUCKET = process.env.SUPABASE_BUCKET || 'pawero-photos'
const WRITE  = process.argv.includes('--write')

const MAX_EDGE   = 1600      // uygulamadaki resizeImage ile aynı
const QUALITY    = 82
const SKIP_UNDER = 600 * 1024   // zaten hafifse dokunma

if (!KEY) {
  console.error('SUPABASE_SERVICE_KEY tanımlı değil. Örnek:\n' +
                '  SUPABASE_SERVICE_KEY=eyJ... node scripts/optimize-storage.mjs')
  process.exit(1)
}

const db = createClient(URL, KEY)
const isImage = (n) => /\.(jpe?g|png|webp)$/i.test(n)   // gif ve svg'ye dokunma

// Depo klasör klasör gezilir; list() tek seferde yalnızca bir seviye döner.
async function* walk(prefix = '') {
  let offset = 0
  while (true) {
    const { data, error } = await db.storage.from(BUCKET)
      .list(prefix, { limit: 100, offset, sortBy: { column: 'name', order: 'asc' } })
    if (error) throw new Error(`list(${prefix}): ${error.message}`)
    if (!data.length) break
    for (const entry of data) {
      const path = prefix ? `${prefix}/${entry.name}` : entry.name
      if (entry.id === null) yield* walk(path)          // klasör
      else yield { path, size: entry.metadata?.size ?? 0 }
    }
    if (data.length < 100) break
    offset += 100
  }
}

const kb = (n) => (n / 1024).toFixed(0).padStart(6) + ' KB'
let seen = 0, changed = 0, before = 0, after = 0, failed = 0

console.log(`${WRITE ? 'YAZMA' : 'DENEME'} modu · kova: ${BUCKET} · hedef: ${MAX_EDGE}px / q${QUALITY}\n`)

for await (const file of walk()) {
  if (!isImage(file.path)) continue
  seen++
  if (file.size && file.size < SKIP_UNDER) continue

  try {
    const { data: blob, error } = await db.storage.from(BUCKET).download(file.path)
    if (error) throw new Error(error.message)
    const input = Buffer.from(await blob.arrayBuffer())

    const out = await sharp(input)
      .rotate()                                   // EXIF dönüklüğünü uygula
      .resize({ width: MAX_EDGE, height: MAX_EDGE, fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality: QUALITY, mozjpeg: true })
      .toBuffer()

    // Küçültme kazanç sağlamadıysa dosyaya dokunma.
    if (out.length >= input.length) continue

    before += input.length; after += out.length; changed++
    console.log(`${kb(input.length)} → ${kb(out.length)}  ${file.path}`)

    if (WRITE) {
      // Aynı yola upsert: adres değişmez, veritabanı ve paylaşılmış linkler bozulmaz.
      // Uzantı .png kalsa bile içerik JPEG olur; tarayıcı Content-Type başlığına
      // baktığı için sorun çıkmaz. Ayrıca CDN eski kopyayı bir süre (varsayılan
      // 1 saat) servis etmeye devam edebilir — değişiklik anında görünmeyebilir.
      const { error: upErr } = await db.storage.from(BUCKET)
        .upload(file.path, out, { contentType: 'image/jpeg', upsert: true, cacheControl: '3600' })
      if (upErr) throw new Error(upErr.message)
    }
  } catch (e) {
    failed++
    console.warn(`  ATLANDI  ${file.path}: ${e.message}`)
  }
}

console.log(`\ngörsel: ${seen} · küçültülecek: ${changed} · hata: ${failed}`)
if (changed) {
  console.log(`toplam: ${kb(before)} → ${kb(after)}  (%${(100 - after / before * 100).toFixed(1)} azalma)`)
}
if (!WRITE && changed) console.log('\nBu bir denemeydi, hiçbir dosya değişmedi. Yazmak için --write ekle.')
