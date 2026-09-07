// Bir ilan adresi WhatsApp'ta paylaşıldığında sitenin genel başlığı ve görseli
// görünüyordu: hangi hayvan olduğu belli değildi. Uygulama tarayıcıda çizildiği
// için sosyal medya tarayıcıları (JavaScript çalıştırmazlar) yalnızca boş
// index.html'i görüyor.
//
// Bu fonksiyon SADECE o tarayıcılara cevap veriyor — vercel.json'daki yönlendirme
// user-agent'a bakıp botları buraya alıyor, gerçek ziyaretçi uygulamayı görmeye
// devam ediyor. Döndürdüğümüz sayfa ilanın kendi fotoğrafını, adını ve konumunu
// taşıyan meta etiketlerinden ibaret.

const SITE = "https://paweero.com";
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || "https://uyuqcpttdbejaakbwzyl.supabase.co";
const SUPABASE_KEY = process.env.VITE_SUPABASE_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV5dXFjcHR0ZGJlamFha2J3enlsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg0Mjk2NTgsImV4cCI6MjA5NDAwNTY1OH0.y8dJOe0yyWeKeaUU9PfPxnGn6b-2yHyG84LBdqaNH9k";
const FALLBACK_IMAGE = `${SUPABASE_URL}/storage/v1/object/public/pawero-photos/banner/hero.jpg`;

const TABLES = {
  "animals":    { table: "animals",     seg: "animals"    },
  "lost-found": { table: "lf_listings", seg: "lost-found" },
  "help":       { table: "reports",     seg: "help"       },
};

// İçerik kullanıcıdan geliyor; etiketlerin içine ham koymak sayfayı kırar.
const esc = (v) => String(v == null ? "" : v)
  .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
  .replace(/"/g, "&quot;").replace(/'/g, "&#39;");

const clip = (v, n) => {
  const t = String(v || "").replace(/\s+/g, " ").trim();
  return t.length > n ? t.slice(0, n - 1) + "…" : t;
};

const photoOf = (row) =>
  (Array.isArray(row.photo_urls) && row.photo_urls[0]) || row.photo_url || FALLBACK_IMAGE;

function describe(kind, row, lang) {
  const tr = lang === "tr";
  if (kind === "animals") {
    const bits = [row.breed, row.age, row.gender].filter(Boolean).join(" · ");
    const where = [row.city, row.province].filter(Boolean).join(", ");
    return {
      title: `${row.name || (tr ? "Hayvan" : "Animal")}${bits ? " — " + bits : ""} | Paweero`,
      desc: clip((tr ? row.desc_tr : row.desc_en) || row.desc_tr || row.desc_en ||
        (tr ? `${where} bölgesinde sahiplenmeyi bekliyor.` : `Waiting for a home in ${where}.`), 200),
    };
  }
  if (kind === "lost-found") {
    const lost = row.type === "lost";
    const what = row.name && row.name !== "Unknown" ? row.name : (row.species || (tr ? "Hayvan" : "Animal"));
    const where = [row.area, row.city].filter(Boolean).join(", ");
    return {
      title: `${tr ? (lost ? "Kayıp" : "Bulunan") : (lost ? "Lost" : "Found")}: ${what}${where ? " — " + where : ""} | Paweero`,
      desc: clip((tr ? row.desc_tr : row.desc_en) || row.desc_tr || row.desc_en ||
        (tr ? `${where} bölgesinde bildirildi.` : `Reported in ${where}.`), 200),
    };
  }
  return {
    title: `${row.title || (tr ? "Yardım bekleyen hayvan" : "Animal in need")} | Paweero`,
    desc: clip(row.description || (tr ? `${row.location} — yardım bekliyor.` : `${row.location} — needs help.`), 200),
  };
}

export default async function handler(req, res) {
  const { lang = "en", type = "animals", slug = "" } = req.query || {};
  const conf = TABLES[type];
  const id = String(slug).split("-")[0];
  const path = `/${lang}/${type}/${slug}`;

  let meta = {
    title: "Paweero — Free Animal Welfare Platform",
    desc: "Adopt, foster, post a lost & found, or report an animal in distress. Always free.",
    image: FALLBACK_IMAGE,
  };

  if (conf && /^\d+$/.test(id)) {
    try {
      const r = await fetch(`${SUPABASE_URL}/rest/v1/${conf.table}?id=eq.${id}&select=*&limit=1`, {
        headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` },
      });
      const rows = r.ok ? await r.json() : [];
      if (rows[0]) {
        const d = describe(type, rows[0], lang);
        meta = { ...d, image: photoOf(rows[0]) };
      }
    } catch (e) {
      // Veri çekilemezse genel etiketlerle devam: önizleme zayıf olur, kırılmaz.
    }
  }

  const html = `<!DOCTYPE html>
<html lang="${esc(lang)}">
<head>
<meta charset="UTF-8" />
<title>${esc(meta.title)}</title>
<meta name="description" content="${esc(meta.desc)}" />
<link rel="canonical" href="${SITE}${esc(path)}" />
<meta property="og:site_name" content="Paweero" />
<meta property="og:type" content="article" />
<meta property="og:title" content="${esc(meta.title)}" />
<meta property="og:description" content="${esc(meta.desc)}" />
<meta property="og:image" content="${esc(meta.image)}" />
<meta property="og:url" content="${SITE}${esc(path)}" />
<meta property="og:locale" content="${esc(lang)}" />
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:title" content="${esc(meta.title)}" />
<meta name="twitter:description" content="${esc(meta.desc)}" />
<meta name="twitter:image" content="${esc(meta.image)}" />
</head>
<body>
<p>${esc(meta.title)}</p>
<p><a href="${SITE}${esc(path)}">${SITE}${esc(path)}</a></p>
</body>
</html>`;

  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.setHeader("Cache-Control", "public, s-maxage=600, stale-while-revalidate=86400");
  res.status(200).send(html);
}
