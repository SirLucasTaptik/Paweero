# İlan sahibine e-posta — kurulum

`api/notify.js` mesajı paweero.com adına gönderiyor. Çalışması için tek eksik bir
API anahtarı. Anahtar yokken uygulama bozulmuyor: uç `503` dönüyor ve kullanıcı,
kendi mail uygulamasında hazır gelen taslakla mesajı yolluyor.

## 1. Resend hesabı (ücretsiz)

[resend.com](https://resend.com) → kayıt ol. Ücretsiz katman ayda 3.000, günde
100 e-posta — bu ölçek için fazlasıyla yeterli.

## 2. Alan adını doğrula

Resend → **Domains** → **Add Domain** → `paweero.com`.

Resend üç kayıt veriyor (DKIM, SPF, bazen DMARC). Bunları alan adının DNS'ine
eklemen gerekiyor — alan adı Vercel'de duruyorsa: Vercel → **Domains** →
paweero.com → **DNS Records**.

Doğrulama birkaç dakika ile birkaç saat arasında tamamlanıyor. Bu adım
atlanırsa mailler ya hiç gitmez ya da doğrudan spam'e düşer.

## 3. Anahtarı Vercel'e ekle

Resend → **API Keys** → **Create API Key** (yetki: *Sending access*).

Vercel → proje → **Settings** → **Environment Variables**:

| Ad | Değer |
|---|---|
| `RESEND_API_KEY` | `re_...` (Resend'den aldığın anahtar) |
| `MAIL_FROM` | `Paweero <bildirim@paweero.com>` (isteğe bağlı; varsayılan bu) |

Üç ortamı da (Production, Preview, Development) işaretle. Sonra **Deployments**
→ son deploy → **Redeploy**: ortam değişkenleri yalnızca yeni derlemede geçerli
oluyor.

## 4. Dene

Bir ilana gir → "Take Action" → formu doldur → Gönder.

- **"Yanıtın ilan sahibine iletildi"** → mail gitti.
- **"Mesajın hazır — mail uygulamanda Gönder'e basman yeterli"** → uç mail
  gönderemedi, yedek yola düşüldü. Vercel → proje → **Logs**'ta `[notify]` ile
  başlayan satır sebebini yazar (`mailer_not_configured`, `send_failed`,
  `owner_has_no_email`).

## Tasarım notları

- **Alıcıyı istemci belirlemiyor.** İstek yalnızca ilan kimliğini taşıyor; uç,
  sahibin adresini veritabanından okuyor. Böylece hem ilan sahibinin adresi
  tarayıcıya geçmiyor hem de bu uç "istediğim adrese mail yolla" aracına
  dönüşmüyor.
- **Yanıtla doğrudan çalışıyor:** mailin `reply_to` alanı başvuran kişinin
  adresi. İlan sahibi Yanıtla'ya bastığında mesaj ona gidiyor.
- `SUPABASE_SERVICE_KEY` tanımlarsan uç onu kullanır; tanımlı değilse herkese
  açık anon anahtarla okur (bugünkü RLS'te ilanlar zaten herkese açık).
