# E-posta — kurulum

Paweero iki yönde e-posta gönderiyor, ikisi de paweero.com adına:

| Uç | Ne zaman | Kime |
|---|---|---|
| `api/notify.js` | biri bir ilana başvurduğunda / yardım teklif ettiğinde | ilan sahibine |
| `api/reply.js` | ilan sahibi "Değerlendirmeye al", "Reddet" ya da "🏡 Yuvalandı" dediğinde | başvurana |

İkisi de aynı anahtarı kullanıyor. Anahtar yokken uygulama bozulmuyor: uçlar
`503` dönüyor, işlem yine tamamlanıyor ve ekranda açıkça yazıyor (*"Reddedildi
(e-posta gönderilemedi)"*). Başvuru sahibine giden mesajda yedek yol yok —
anahtar olmadan o bildirim hiç gitmez.

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

**İlan sahibine giden mail:** bir ilana gir → "Take Action" → formu doldur → Gönder.

- **"Yanıtın ilan sahibine iletildi"** → mail gitti.
- **"Mesajın hazır — mail uygulamanda Gönder'e basman yeterli"** → uç mail
  gönderemedi, yedek yola düşüldü.

**Başvurana giden mail:** Hesabım → *İlanıma gelen başvurular* → bir satırda
**Değerlendirmeye al**.

- **"Değerlendirmeye alındı, başvurana haber verildi"** → mail gitti.
- **"Değerlendirmeye alındı (e-posta gönderilemedi)"** → gitmedi.

Sebebi Vercel → proje → **Logs**'ta `[notify]` ya da `[reply]` ile başlayan
satırda yazar: `mailer_not_configured` (anahtar yok), `send_failed` (Resend
reddetti, genelde alan adı doğrulanmamış), `owner_has_no_email`,
`applicant_has_no_email`, `not_owner` (başka birinin ilanı), `bad_session`
(oturum düşmüş, çıkıp tekrar gir).

## Tasarım notları

- **Alıcıyı istemci belirlemiyor.** İstek yalnızca ilan kimliğini taşıyor; uç,
  sahibin adresini veritabanından okuyor. Böylece hem ilan sahibinin adresi
  tarayıcıya geçmiyor hem de bu uç "istediğim adrese mail yolla" aracına
  dönüşmüyor.
- **Yanıtla doğrudan çalışıyor:** ilan sahibine giden mailin `reply_to` alanı
  başvuran kişinin adresi. İlan sahibi Yanıtla'ya bastığında mesaj ona gidiyor.
- **Ters yönde adres paylaşılmıyor.** Başvurana giden mailde `reply_to` yok ve
  ilan sahibinin adresi metinde geçmiyor: başvuran onu ancak ilan sahibi
  kendisi yazarsa öğreniyor. Yetki iki kez doğrulanıyor — başvuru satırı
  kullanıcının kendi oturum anahtarıyla okunuyor (RLS) ve satırdaki ilan
  sahibi oturumun sahibiyle karşılaştırılıyor.
- `SUPABASE_SERVICE_KEY` tanımlarsan uç onu kullanır; tanımlı değilse herkese
  açık anon anahtarla okur (bugünkü RLS'te ilanlar zaten herkese açık).
