// İlan sahibinin kararını başvurana ileten uç.
//
// Başvuran, formu doldurduktan sonra yalnızca bekleyebiliyordu; karar ilan
// sahibinin ekranında kalıyordu. Burası o kararı başvuranın posta kutusuna
// taşıyor.
//
// Alıcıyı istemci söylemiyor: başvuru satırını kullanıcının kendi oturum
// anahtarıyla okuyoruz, yani "bu ilan senin mi" sorusunu RLS zaten yanıtlıyor;
// ayrıca satırdaki ilan sahibi ile oturumun sahibini karşılaştırıyoruz. İlan
// sahibinin adresi e-postaya hiç girmiyor — başvuran onu ancak sahibi kendisi
// yazarsa öğrenir.

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || "https://uyuqcpttdbejaakbwzyl.supabase.co";
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY || process.env.VITE_SUPABASE_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV5dXFjcHR0ZGJlamFha2J3enlsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg0Mjk2NTgsImV4cCI6MjA5NDAwNTY1OH0.y8dJOe0yyWeKeaUU9PfPxnGn6b-2yHyG84LBdqaNH9k";

const RESEND_KEY = process.env.RESEND_API_KEY || "";
const MAIL_FROM  = process.env.MAIL_FROM || "Paweero <bildirim@paweero.com>";
const SITE = "https://paweero.com";

const STATUSES = ["reviewing", "declined", "adopted"];
const isEmail = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(v || ""));
const clip = (v, n) => String(v == null ? "" : v).slice(0, n);
const same = (a, b) => String(a || "").trim().toLowerCase() === String(b || "").trim().toLowerCase();

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "method_not_allowed" });
  }

  const body = typeof req.body === "string" ? safeParse(req.body) : (req.body || {});
  const { applicationId, status, lang = "en", token = "" } = body;

  if (!applicationId || !STATUSES.includes(status)) return res.status(400).json({ error: "bad_request" });
  if (!token) return res.status(401).json({ error: "no_session" });
  if (!RESEND_KEY) return res.status(503).json({ error: "mailer_not_configured" });

  const auth = { apikey: SUPABASE_KEY, Authorization: `Bearer ${token}` };

  // Oturumun gerçekten kime ait olduğu.
  let caller = "";
  try {
    const r = await fetch(`${SUPABASE_URL}/auth/v1/user`, { headers: auth });
    if (!r.ok) return res.status(401).json({ error: "bad_session" });
    caller = (await r.json()).email || "";
  } catch (e) {
    return res.status(502).json({ error: "auth_failed" });
  }
  if (!isEmail(caller)) return res.status(401).json({ error: "bad_session" });

  // Başvuru satırı: kullanıcının kendi anahtarıyla, yani RLS'in izin verdiği kadar.
  let app = null;
  try {
    const r = await fetch(
      `${SUPABASE_URL}/rest/v1/applications?id=eq.${encodeURIComponent(applicationId)}` +
      `&select=applicant_email,first_name,animal_id,animal_name,mode,ref_code,listing_owner_email&limit=1`,
      { headers: auth });
    const rows = r.ok ? await r.json() : [];
    app = rows[0] || null;
  } catch (e) {
    return res.status(502).json({ error: "lookup_failed" });
  }
  if (!app) return res.status(404).json({ error: "not_found" });
  if (!same(app.listing_owner_email, caller)) return res.status(403).json({ error: "not_owner" });
  if (!isEmail(app.applicant_email)) return res.status(404).json({ error: "applicant_has_no_email" });

  const tr = lang === "tr";
  const who = clip(app.first_name, 80) || (tr ? "Merhaba" : "Hello");
  const listing = clip(app.animal_name, 120) || (tr ? "bir ilan" : "a listing");
  const link = app.animal_id
    ? `${SITE}/${tr ? "tr" : "en"}/animals/${encodeURIComponent(app.animal_id)}`
    : `${SITE}/${tr ? "tr" : "en"}`;

  const subject = tr
    ? `Paweero — "${listing}" başvurun hakkında`
    : `Paweero — about your application for "${listing}"`;

  const middle = status === "adopted"
    ? (tr
        ? [`Müjde: "${listing}" için yaptığın başvuru kabul edildi — ilan yuvalandı olarak kapandı! 🎉`,
           "İlan sahibi ayrıntılar için seninle doğrudan iletişime geçecek.",
           "Bir cana yuva olduğun için teşekkür ederiz."]
        : [`Good news: your application for "${listing}" was accepted — the listing is now closed as adopted! 🎉`,
           "The person who posted the listing will contact you directly with the details.",
           "Thank you for giving an animal a home."])
    : status === "reviewing"
    ? (tr
        ? [`"${listing}" için yaptığın başvuru değerlendirmeye alındı.`,
           "İlan sahibi başvurunu inceliyor; gerekirse seninle doğrudan iletişime geçecek.",
           "İlan sayfasında da 'başvuru değerlendiriliyor' olarak görünüyor."]
        : [`Your application for "${listing}" is now under review.`,
           "The person who posted the listing is looking at it and will reach out directly if needed.",
           "The listing page now shows it as under review."])
    : (tr
        ? [`"${listing}" için yaptığın başvuru bu sefer olumlu sonuçlanmadı.`,
           "İlgin için teşekkür ederiz — yuva bekleyen başka canlar da var.",
           "Paweero'da sana uygun bir ilan bulabilirsin."]
        : [`Your application for "${listing}" was not taken forward this time.`,
           "Thank you for caring — there are other animals still waiting for a home.",
           "You can find another listing that suits you on Paweero."]);

  const text = [
    `${who},`,
    "",
    ...middle,
    "",
    app.ref_code ? `${tr ? "Referans" : "Reference"}: ${clip(app.ref_code, 40)}` : "",
    link,
  ].filter(l => l !== "" || true).join("\n").replace(/\n{3,}/g, "\n\n").trim();

  try {
    const r = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${RESEND_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: MAIL_FROM, to: [app.applicant_email], subject, text }),
    });
    if (!r.ok) {
      const detail = await r.text().catch(() => "");
      console.error("[reply] Resend hatası:", r.status, detail.slice(0, 300));
      return res.status(502).json({ error: "send_failed", status: r.status });
    }
  } catch (e) {
    console.error("[reply] gönderim hatası:", e);
    return res.status(502).json({ error: "send_failed" });
  }

  return res.status(200).json({ ok: true });
}

function safeParse(v) { try { return JSON.parse(v); } catch (e) { return {}; } }
