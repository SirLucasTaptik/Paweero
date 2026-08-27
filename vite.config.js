import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { writeFileSync } from 'node:fs'
import { resolve } from 'node:path'

// Build damgası. Vercel bu değişkenleri build sırasında verir; yerelde tanımsız
// oldukları için "dev" damgası çıkar. Amaç: siteye bakıp hangi commit'in yayında
// olduğunu panele girmeden görebilmek — tarayıcı cache'i mi, yeni sürüm mü?
const sha = process.env.VERCEL_GIT_COMMIT_SHA || ''
const BUILD_INFO = {
  commit: sha ? sha.slice(0, 7) : 'dev',
  branch: process.env.VERCEL_GIT_COMMIT_REF || 'local',
  env: process.env.VERCEL_ENV || 'local',
  at: new Date().toISOString(),
}

const SITE = 'https://paweero.com'
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://uyuqcpttdbejaakbwzyl.supabase.co'
const SUPABASE_KEY = process.env.VITE_SUPABASE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV5dXFjcHR0ZGJlamFha2J3enlsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg0Mjk2NTgsImV4cCI6MjA5NDAwNTY1OH0.y8dJOe0yyWeKeaUU9PfPxnGn6b-2yHyG84LBdqaNH9k'

// index.html tek başına Google'a yalnızca bir adres verir. Sitemap, ilan
// adreslerini de listeleyerek taranmalarını sağlar. İlanlar veritabanında
// durduğu için liste build anında çekilir; ağ erişimi yoksa yalnızca sabit
// sayfalar yazılır — build asla bu yüzden kırılmaz.
const slugify = (s) => String(s || '')
  .toLowerCase()
  .replace(/ı/g, 'i').replace(/ğ/g, 'g').replace(/ü/g, 'u')
  .replace(/ş/g, 's').replace(/ö/g, 'o').replace(/ç/g, 'c')
  .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60)

const STATIC_ROUTES = [
  { path: '/',                 priority: '1.0', changefreq: 'daily'  },
  { path: '/animals',          priority: '0.9', changefreq: 'daily'  },
  { path: '/animals/foster',   priority: '0.8', changefreq: 'daily'  },
  { path: '/lost-found',       priority: '0.9', changefreq: 'hourly' },
  { path: '/help',             priority: '0.9', changefreq: 'hourly' },
  { path: '/help/helped',      priority: '0.6', changefreq: 'weekly' },
]

// Filtreler uygulamanın loadFromDB() sorgularıyla birebir aynı olmalı. Aksi hâlde
// sitemap, uygulamanın göstermediği bir kaydı listeler ve o adres 404 döner —
// Google'ın "sitemap'te ölü adres" olarak işaretlediği durum tam olarak budur.
async function fetchRows(table, columns, filter = '') {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?select=${columns}&limit=2000${filter}`, {
    headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` },
  })
  if (!res.ok) throw new Error(`${table}: HTTP ${res.status}`)
  return res.json()
}

function sitemapPlugin() {
  return {
    name: 'paweero-sitemap',
    apply: 'build',
    async closeBundle() {
      const urls = STATIC_ROUTES.map(r => ({ ...r, lastmod: BUILD_INFO.at.slice(0, 10) }))
      try {
        const [animals, lf, reports] = await Promise.all([
          // animals: uygulama yalnızca status=active kayıtları gösteriyor.
          fetchRows('animals', 'id,name,created_at', '&status=eq.active').catch(() => []),
          // lf_listings ve reports: uygulamada durum filtresi yok, hepsi listeleniyor.
          fetchRows('lf_listings', 'id,name,created_at').catch(() => []),
          fetchRows('reports', 'id,title,created_at').catch(() => []),
        ])
        const add = (rows, seg, nameOf) => rows.forEach(r => {
          const slug = slugify(nameOf(r))
          urls.push({
            path: `/${seg}/${r.id}${slug ? '-' + slug : ''}`,
            priority: '0.7', changefreq: 'weekly',
            lastmod: (r.created_at || BUILD_INFO.at).slice(0, 10),
          })
        })
        add(animals, 'animals', r => r.name)
        add(lf, 'lost-found', r => r.name)
        add(reports, 'help', r => r.title)
        console.log(`[sitemap] ${urls.length} adres (${animals.length} hayvan, ${lf.length} kayıp/bulunan, ${reports.length} rapor)`)
      } catch (e) {
        console.warn('[sitemap] ilanlar çekilemedi, yalnızca sabit sayfalar yazıldı:', e.message)
      }

      const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map(u => `  <url>
    <loc>${SITE}${u.path}</loc>
    <lastmod>${u.lastmod}</lastmod>
    <changefreq>${u.changefreq}</changefreq>
    <priority>${u.priority}</priority>
  </url>`).join('\n')}
</urlset>
`
      writeFileSync(resolve(process.cwd(), 'dist/sitemap.xml'), xml)
    },
  }
}

export default defineConfig({
  plugins: [react(), sitemapPlugin()],
  define: { __BUILD_INFO__: JSON.stringify(BUILD_INFO) },
})
