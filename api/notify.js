// İlan sahibine e-posta gönderen uç. İki şeyi aynı anda çözüyor:
//
//  1. Mesaj gerçekten gidiyor — gönderici paweero.com adına, alıcının mail
//     kutusuna düşen normal bir e-posta.
//  2. İlan sahibinin adresi istemciye hiç geçmiyor. Alıcıyı burada, ilan
//     kimliğinden yola çıkarak veritabanından okuyoruz; dışarıdan "şu adrese
//     yolla" denemiyor. Aksi hâlde bu uç herkesin kullanabileceği bir spam
//     aracına dönerdi.

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || "https://uyuqcpttdbejaakbwzyl.supabase.co";
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY || process.env.VITE_SUPABASE_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV5dXFjcHR0ZGJlamFha2J3enlsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg0Mjk2NTgsImV4cCI6MjA5NDAwNTY1OH0.y8dJOe0yyWeKeaUU9PfPxnGn6b-2yHyG84LBdqaNH9k";

const RESEND_KEY = process.env.RESEND_API_KEY || "";
const MAIL_FROM  = process.env.MAIL_FROM || "Paweero <bildirim@paweero.com>";
const SITE = "https://paweero.com";

// Hangi ilan türü hangi tabloda ve sahibin adresi hangi kolonda duruyor.
const SOURCES = {
  animal: { table: "animals",     column: "submitter_email", seg: "animals"    },
  report: { table: "reports",     column: "reporter_name",   seg: "help"       },
  lf:     { table: "lf_listings", column: "contact_email",   seg: "lost-found" },
};

const isEmail = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(v || ""));
const clip = (v, n) => String(v == null ? "" : v).slice(0, n);

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "method_not_allowed" });
  }

  const body = typeof req.body === "string" ? safeParse(req.body) : (req.body || {});
  const { kind, id, lang = "en", refCode = "", name = "", email = "", phone = "", lines = [] } = body;

  const src = SOURCES[kind];
  if (!src || !id) return res.status(400).json({ error: "bad_request" });
  if (!isEmail(email)) return res.status(400).json({ error: "bad_sender_email" });
  if (!RESEND_KEY) return res.status(503).json({ error: "mailer_not_configured" });

  // Alıcı veritabanından: istemci kime gideceğini söyleyemiyor.
  let owner = null, listingName = "";
  try {
    const r = await fetch(
      `${SUPABASE_URL}/rest/v1/${src.table}?id=eq.${encodeURIComponent(id)}&select=${src.column},name,title&limit=1`,
      { headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` } });
    const rows = r.ok ? await r.json() : [];
    owner = rows[0] ? rows[0][src.column] : null;
    listingName = (rows[0] && (rows[0].name || rows[0].title)) || "";
  } catch (e) {
    return res.status(502).json({ error: "lookup_failed" });
  }
  if (!isEmail(owner)) return res.status(404).json({ error: "owner_has_no_email" });

  const tr = lang === "tr";
  const subject = `Paweero — ${listingName || (tr ? "ilanın" : "your listing")}${refCode ? ` (${refCode})` : ""}`;
  const text = [
    tr ? "Merhaba," : "Hello,",
    "",
    tr ? `Paweero'daki "${listingName}" ilanın için biri seninle iletişime geçmek istiyor.`
       : `Someone would like to reach you about your Paweero listing "${listingName}".`,
    "",
    ...(Array.isArray(lines) ? lines.slice(0, 20).map(l => `• ${clip(l, 400)}`) : []),
    "",
    tr ? "İletişim bilgileri:" : "Their contact details:",
    clip(name, 120),
    clip(email, 160),
    clip(phone, 40),
    "",
    refCode ? `${tr ? "Referans" : "Reference"}: ${clip(refCode, 40)}` : "",
    `${SITE}/${tr ? "tr" : "en"}/${src.seg}/${encodeURIComponent(id)}`,
    "",
    tr ? "Yanıtlamak için bu e-postayı yanıtlaman yeterli."
       : "Just reply to this email to get back to them.",
  ].filter(l => l !== undefined).join("\n").replace(/\n{3,}/g, "\n\n").trim();

  try {
    const r = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${RESEND_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: MAIL_FROM,
        to: [owner],
        reply_to: email,          // sahibi "yanıtla" deyince doğrudan başvurana gider
        subject,
        text,
      }),
    });
    if (!r.ok) {
      const detail = await r.text().catch(() => "");
      console.error("[notify] Resend hatası:", r.status, detail.slice(0, 300));
      return res.status(502).json({ error: "send_failed", status: r.status });
    }
  } catch (e) {
    console.error("[notify] gönderim hatası:", e);
    return res.status(502).json({ error: "send_failed" });
  }

  return res.status(200).json({ ok: true });
}

function safeParse(v) { try { return JSON.parse(v); } catch (e) { return {}; } }
