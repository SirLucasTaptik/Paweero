// ─────────────────────────────────────────────────────────────────────────────
// PAWEERO — KURUMSAL SAYFA (/about)
//
// Bu dosya sayfanın TEK içerik kaynağı. Metinler bileşenlerin içine dağılmış
// değil; aşağıdaki CONFIG ve CONTENT nesnelerinde duruyor. Bir yazıyı ya da
// telefonu değiştirmek için tek yere dokunmak yeterli.
//
// Projede bir CMS yok. Bu yüzden "panelden düzenlenebilir" alanları tek bir
// yapılandırma bloğunda topladım: ileride bir panel eklenirse bu nesnenin
// yerine veriden beslenen bir kaynak koymak yetecek, bileşenler değişmeyecek.
// ─────────────────────────────────────────────────────────────────────────────

// ── DÜZENLENEBİLİR KURUMSAL BİLGİLER ────────────────────────────────────────
// Boş bırakılan alan sayfada HİÇ görünmez. Var olmayan bir e-posta, adres ya da
// sosyal hesap uydurmuyoruz; bilgi edinildiğinde buraya yazmak yeterli.
export const ABOUT_CONFIG = {
  phone: "+971 58 103 3420",
  phoneHref: "tel:+971581033420",
  email: "",            // örn. "hello@paweero.com"
  location: "",         // örn. "Dubai, BAE"
  social: {
    // Paylaşım bağlantısındaki ?stkn=... parametresi profilin parçası değil;
    // Instagram uygulamasının ürettiği, kişiye bağlı bir oturum jetonu. Siteye
    // koymanın faydası yok, jetonu yaymanın anlamı da yok — kanonik adres bu.
    instagram: "https://www.instagram.com/paweero",
    facebook: "",
    linkedin: "",
  },
  legal: {
    privacy: "",        // sayfalar yayınlandığında adreslerini yaz
    terms: "",
    cookies: "",
  },
};

const C = {
  en: {
    navLabel: "About Paweero",
    hero: {
      kicker: "Animal Welfare Technology Platform",
      title: "Technology for those who cannot speak for themselves.",
      body: "Paweero is an animal rescue and welfare platform connecting people, volunteers, foster families, adopters, veterinarians and organizations to help animals faster and more effectively.",
      primary: "Explore Paweero",
      secondary: "Get in Touch",
    },
    what: {
      title: "What is Paweero?",
      body: [
        "Paweero is a technology platform built to make animal rescue, fostering, adoption and community support more organized, transparent and accessible.",
        "Instead of relying on scattered social media posts, messages and disconnected conversations, Paweero brings the rescue journey together in one place.",
        "From reporting an animal in need to finding help, coordinating volunteers, connecting with foster families and finding a permanent home, Paweero helps people turn intention into action.",
      ],
      journey: ["Report", "Help", "Rescue", "Care", "Foster", "Adopt", "Success"],
    },
    problem: {
      title: "Animal rescue should not depend on luck.",
      items: [
        "Rescue information is scattered across social media.",
        "Important messages get lost.",
        "Volunteers are difficult to coordinate.",
        "Foster opportunities are hard to discover.",
        "Adoption processes are often fragmented.",
        "There is little visibility into what happens after a rescue request.",
        "Organizations and individuals often work independently instead of together.",
      ],
      closing: "Paweero brings these disconnected efforts together.",
    },
    mission: {
      label: "Our Mission",
      title: "Help more animals with less effort.",
      body: "We believe technology can make compassion more organized, connected and effective. Paweero exists to help people take action when an animal needs help — and to make every successful rescue visible, measurable and shareable.",
    },
    vision: {
      label: "Our Vision",
      title: "A connected global network for animal welfare.",
      body: "Our long-term vision is to create a global ecosystem where citizens, volunteers, veterinarians, shelters, rescue organizations and adopters can work together through one connected platform.",
      lines: ["Every report can become an action.", "Every action can become a rescue.", "Every rescue can become a success story."],
    },
    how: {
      title: "How Paweero works",
      steps: [
        { n: "01", icon: "🚨", title: "Report",  body: "Someone reports an animal that needs help." },
        { n: "02", icon: "🔗", title: "Connect", body: "People nearby can discover the situation and offer help." },
        { n: "03", icon: "🚗", title: "Rescue",  body: "Volunteers coordinate transportation, food, medical support or temporary care." },
        { n: "04", icon: "🩺", title: "Care",    body: "The animal receives the necessary veterinary or temporary care." },
        { n: "05", icon: "🏡", title: "Rehome",  body: "Foster and adoption opportunities help the animal move toward a safe permanent home." },
        { n: "06", icon: "✨", title: "Success", body: "The rescue journey becomes a transparent success story." },
      ],
    },
    who: {
      title: "Who is Paweero for?",
      cards: [
        { icon: "🙋", title: "Citizens",             body: "Report an animal and ask the community for help." },
        { icon: "🤝", title: "Volunteers",           body: "Offer your time, skills, transportation or resources." },
        { icon: "🛏️", title: "Foster Families",      body: "Provide a temporary safe home." },
        { icon: "🏡", title: "Adopters",             body: "Find animals looking for their forever home." },
        { icon: "🩺", title: "Veterinarians",        body: "Support animals through professional care." },
        { icon: "🏢", title: "Rescue Organizations", body: "Coordinate cases and build a stronger rescue network." },
        { icon: "🏠", title: "Shelters",             body: "Connect animals with people who can help." },
      ],
    },
    eco: {
      title: "The Paweero ecosystem",
      body: "Paweero is not a listing board. Each part feeds the others: a report can become a rescue, a rescue can become a foster placement, a foster placement can become a home.",
      nodes: ["Rescue", "Adoption", "Foster", "Lost & Found", "Volunteers", "Veterinarians", "Organizations", "Shelters", "Community"],
    },
    tech: {
      title: "Technology with a purpose.",
      body: "Paweero uses technology to remove friction from animal welfare. The mission is animal welfare; technology is what makes it faster.",
      items: [
        "Location-based discovery", "Rescue coordination", "Digital adoption applications",
        "Automated communication", "Community notifications", "Rescue journey tracking",
        "Intelligent matching", "Impact analytics",
      ],
    },
    impact: { title: "Impact", note: "Live numbers from the platform." },
    stories: { title: "Every rescue has a story.", cta: "See all success stories", read: "Read story", empty: "The first success stories will appear here as rescues are completed." },
    partners: {
      title: "Let's create more impact together.",
      body: "Paweero works with people and organizations who want to make animal welfare more connected, transparent and effective.",
      list: ["Animal welfare organizations", "Veterinary clinics", "Shelters", "Corporates", "Pet brands", "Municipalities", "Technology companies", "Volunteers and communities"],
      cta: "Partner with Paweero",
    },
    corp: { title: "Paweero", subtitle: "Animal Welfare Technology Platform", phoneLabel: "Phone", emailLabel: "Email", locationLabel: "Location" },
    contact: { title: "Have an idea, partnership or question?", body: "We would love to hear from you.", cta: "Contact Paweero", call: "Call" },
    footer: {
      cols: [
        { title: "Paweero", links: [["About Paweero", "#about-top"], ["Mission", "#mission"], ["Impact", "#impact"], ["Contact", "#contact"]] },
        { title: "Explore", links: [["Rescue", "tab:help"], ["Adoption", "tab:animals"], ["Foster", "tab:foster"], ["Lost & Found", "tab:lostfound"], ["Success stories", "tab:helped"]] },
        { title: "Community", links: [["Volunteers", "tab:help"], ["Organizations", "#partners"], ["Veterinarians", "#partners"], ["Shelters", "#partners"]] },
      ],
      legalTitle: "Legal",
      legal: [["Privacy Policy", "privacy"], ["Terms & Conditions", "terms"], ["Cookie Policy", "cookies"]],
      rights: "© Paweero. All rights reserved.",
    },
  },

  tr: {
    navLabel: "Paweero Hakkında",
    hero: {
      kicker: "Hayvan Refahı Teknoloji Platformu",
      title: "Kendini anlatamayanlar için teknoloji.",
      body: "Paweero; insanları, gönüllüleri, geçici bakım ailelerini, sahiplenenleri, veteriner hekimleri ve kurumları buluşturan bir hayvan kurtarma ve refah platformu. Amaç, hayvanlara daha hızlı ve daha etkili ulaşmak.",
      primary: "Paweero'yu keşfet",
      secondary: "İletişime geç",
    },
    what: {
      title: "Paweero nedir?",
      body: [
        "Paweero; hayvan kurtarmayı, geçici bakımı, sahiplendirmeyi ve topluluk desteğini daha düzenli, şeffaf ve ulaşılabilir kılmak için kurulmuş bir teknoloji platformu.",
        "Dağınık sosyal medya paylaşımlarına, kaybolan mesajlara ve birbirinden kopuk konuşmalara güvenmek yerine, Paweero kurtarma yolculuğunu tek bir yerde topluyor.",
        "Yardıma ihtiyacı olan bir hayvanı bildirmekten gönüllüleri koordine etmeye, geçici bakım ailesi bulmaktan kalıcı bir yuvaya kavuşturmaya kadar — Paweero iyi niyeti eyleme çeviriyor.",
      ],
      journey: ["Bildir", "Yardım", "Kurtarma", "Bakım", "Geçici yuva", "Sahiplenme", "Mutlu son"],
    },
    problem: {
      title: "Bir hayvanın kurtulması şansa kalmamalı.",
      items: [
        "Kurtarma bilgisi sosyal medyaya dağılmış durumda.",
        "Önemli mesajlar kayboluyor.",
        "Gönüllüleri koordine etmek zor.",
        "Geçici bakım fırsatlarını görmek zor.",
        "Sahiplendirme süreçleri parça parça ilerliyor.",
        "Bir yardım çağrısından sonra ne olduğu görünmüyor.",
        "Kurumlar ve bireyler birlikte değil, ayrı ayrı çalışıyor.",
      ],
      closing: "Paweero bu kopuk çabaları bir araya getiriyor.",
    },
    mission: {
      label: "Misyonumuz",
      title: "Daha az çabayla daha çok hayvana ulaşmak.",
      body: "Teknolojinin merhameti daha düzenli, daha bağlantılı ve daha etkili kılabileceğine inanıyoruz. Paweero, bir hayvanın yardıma ihtiyacı olduğunda insanların harekete geçmesini kolaylaştırmak ve her başarılı kurtarmayı görünür, ölçülebilir ve paylaşılabilir kılmak için var.",
    },
    vision: {
      label: "Vizyonumuz",
      title: "Hayvan refahı için bağlantılı, küresel bir ağ.",
      body: "Uzun vadeli hedefimiz; vatandaşların, gönüllülerin, veteriner hekimlerin, barınakların, kurtarma kuruluşlarının ve sahiplenenlerin tek bir platform üzerinden birlikte çalışabildiği küresel bir ekosistem kurmak.",
      lines: ["Her bildirim bir eyleme dönüşebilir.", "Her eylem bir kurtarmaya dönüşebilir.", "Her kurtarma bir mutlu sona dönüşebilir."],
    },
    how: {
      title: "Paweero nasıl çalışır?",
      steps: [
        { n: "01", icon: "🚨", title: "Bildir",      body: "Biri, yardıma ihtiyacı olan bir hayvanı bildirir." },
        { n: "02", icon: "🔗", title: "Bağlan",      body: "Yakındaki insanlar durumu görür ve yardım teklif eder." },
        { n: "03", icon: "🚗", title: "Kurtarma",    body: "Gönüllüler ulaşımı, mamayı, tıbbi desteği ya da geçici bakımı örgütler." },
        { n: "04", icon: "🩺", title: "Bakım",       body: "Hayvan, ihtiyaç duyduğu veteriner bakımını ya da geçici barınmayı alır." },
        { n: "05", icon: "🏡", title: "Yuvaya",      body: "Geçici bakım ve sahiplendirme, hayvanı güvenli kalıcı bir yuvaya yaklaştırır." },
        { n: "06", icon: "✨", title: "Mutlu son",   body: "Kurtarma yolculuğu şeffaf bir başarı hikâyesine dönüşür." },
      ],
    },
    who: {
      title: "Paweero kimin için?",
      cards: [
        { icon: "🙋", title: "Vatandaşlar",        body: "Bir hayvanı bildir, topluluktan yardım iste." },
        { icon: "🤝", title: "Gönüllüler",         body: "Zamanını, becerini, aracını ya da imkânlarını paylaş." },
        { icon: "🛏️", title: "Geçici bakım aileleri", body: "Geçici ama güvenli bir yuva sun." },
        { icon: "🏡", title: "Sahiplenenler",      body: "Kalıcı yuvasını arayan hayvanları bul." },
        { icon: "🩺", title: "Veteriner hekimler", body: "Mesleki bakımla hayvanların yanında ol." },
        { icon: "🏢", title: "Kurtarma kuruluşları", body: "Vakaları koordine et, daha güçlü bir ağ kur." },
        { icon: "🏠", title: "Barınaklar",         body: "Hayvanları yardım edebilecek insanlarla buluştur." },
      ],
    },
    eco: {
      title: "Paweero ekosistemi",
      body: "Paweero bir ilan tahtası değil. Parçalar birbirini besliyor: bir bildirim kurtarmaya, bir kurtarma geçici bakıma, geçici bakım kalıcı bir yuvaya dönüşebiliyor.",
      nodes: ["Kurtarma", "Sahiplendirme", "Geçici bakım", "Kayıp & Bulunan", "Gönüllüler", "Veterinerler", "Kurumlar", "Barınaklar", "Topluluk"],
    },
    tech: {
      title: "Amacı olan teknoloji.",
      body: "Paweero teknolojiyi, hayvan refahının önündeki sürtünmeyi azaltmak için kullanıyor. Amaç hayvan refahı; teknoloji onu hızlandıran şey.",
      items: [
        "Konuma göre keşif", "Kurtarma koordinasyonu", "Dijital sahiplenme başvuruları",
        "Otomatik bilgilendirme", "Topluluk bildirimleri", "Kurtarma yolculuğu takibi",
        "Akıllı eşleştirme", "Etki analitiği",
      ],
    },
    impact: { title: "Etki", note: "Platformdan canlı sayılar." },
    stories: { title: "Her kurtarmanın bir hikâyesi var.", cta: "Tüm başarı hikâyeleri", read: "Hikâyeyi oku", empty: "İlk başarı hikâyeleri, kurtarmalar tamamlandıkça burada görünecek." },
    partners: {
      title: "Birlikte daha çok etki yaratalım.",
      body: "Paweero; hayvan refahını daha bağlantılı, şeffaf ve etkili kılmak isteyen insanlarla ve kurumlarla birlikte çalışıyor.",
      list: ["Hayvan refahı kuruluşları", "Veteriner klinikleri", "Barınaklar", "Şirketler", "Evcil hayvan markaları", "Belediyeler", "Teknoloji şirketleri", "Gönüllüler ve topluluklar"],
      cta: "Paweero ile iş birliği",
    },
    corp: { title: "Paweero", subtitle: "Hayvan Refahı Teknoloji Platformu", phoneLabel: "Telefon", emailLabel: "E-posta", locationLabel: "Konum" },
    contact: { title: "Bir fikrin, iş birliği önerin ya da sorun mu var?", body: "Seni dinlemek isteriz.", cta: "Paweero ile iletişime geç", call: "Ara" },
    footer: {
      cols: [
        { title: "Paweero", links: [["Paweero Hakkında", "#about-top"], ["Misyon", "#mission"], ["Etki", "#impact"], ["İletişim", "#contact"]] },
        { title: "Keşfet", links: [["Kurtarma", "tab:help"], ["Sahiplendirme", "tab:animals"], ["Geçici bakım", "tab:foster"], ["Kayıp & Bulunan", "tab:lostfound"], ["Başarı hikâyeleri", "tab:helped"]] },
        { title: "Topluluk", links: [["Gönüllüler", "tab:help"], ["Kurumlar", "#partners"], ["Veteriner hekimler", "#partners"], ["Barınaklar", "#partners"]] },
      ],
      legalTitle: "Yasal",
      legal: [["Gizlilik Politikası", "privacy"], ["Kullanım Koşulları", "terms"], ["Çerez Politikası", "cookies"]],
      rights: "© Paweero. Tüm hakları saklıdır.",
    },
  },
};

export const aboutNavLabel = (lang) => (C[lang] || C.en).navLabel;

export default C;

// ─────────────────────────────────────────────────────────────────────────────
// BİLEŞEN
// ─────────────────────────────────────────────────────────────────────────────
import React from "react";

const SOCIAL_LABEL = { instagram: "Instagram", facebook: "Facebook", linkedin: "LinkedIn" };

const SOCIAL_ICON = {
  instagram: (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2"
         strokeLinecap="round" strokeLinejoin="round" focusable="false">
      <rect x="2" y="2" width="20" height="20" rx="5" /><circle cx="12" cy="12" r="4" />
      <circle cx="17.5" cy="6.5" r="1.2" fill="currentColor" stroke="none" />
    </svg>
  ),
  facebook: (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" focusable="false">
      <path d="M14 8.5V7c0-.8.2-1.2 1.4-1.2H17V3h-2.4C11.7 3 10.7 4.4 10.7 6.8v1.7H9V11h1.7v10H14V11h2.3l.3-2.5H14z"/>
    </svg>
  ),
  linkedin: (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" focusable="false">
      <path d="M4.98 3.5a2.5 2.5 0 11-.02 5 2.5 2.5 0 01.02-5zM3 9h4v12H3zM9 9h3.8v1.7h.05c.53-.95 1.83-1.95 3.75-1.95 4 0 4.4 2.35 4.4 5.4V21h-4v-5.4c0-1.3-.03-3-1.9-3s-2.15 1.42-2.15 2.9V21H9z"/>
    </svg>
  ),
};

const Section = ({ id, children, tone = "" }) => (
  <section id={id} className={`ab-sec ${tone}`}>
    <div className="ab-wrap">{children}</div>
  </section>
);

// Ekosistem görseli: merkez + çevresindeki düğümler, aralarında bağlantı
// çizgileri. SVG olarak çiziliyor — ölçekleniyor, metni ekran okuyucuya
// açık ve ayrı bir görsel dosyası gerektirmiyor.
// Düğüm etiketini daireye sığacak biçimde en fazla iki satıra böler.
function wrapLabel(text, max = 11) {
  if (text.length <= max) return [text];
  const words = text.split(" ");
  if (words.length === 1) return [text];   // tek kelime bölünmez, punto küçülür
  const lines = [""];
  for (const w of words) {
    const cur = lines[lines.length - 1];
    if (!cur) lines[lines.length - 1] = w;
    else if ((cur + " " + w).length <= max) lines[lines.length - 1] = cur + " " + w;
    else lines.push(w);
  }
  return lines.slice(0, 2);
}

function EcosystemDiagram({ nodes, label }) {
  const cx = 200, cy = 200, r = 142;
  const pts = nodes.map((n, i) => {
    const a = (i / nodes.length) * Math.PI * 2 - Math.PI / 2;
    return { n, x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) };
  });
  return (
    <svg className="ab-eco" viewBox="0 0 400 400" role="img" aria-label={label}>
      {pts.map((p, i) => (
        <line key={`l${i}`} x1={cx} y1={cy} x2={p.x} y2={p.y} className="ab-eco-line" />
      ))}
      <circle cx={cx} cy={cy} r="46" className="ab-eco-core" />
      <text x={cx} y={cy + 5} className="ab-eco-core-t" textAnchor="middle">PAWEERO</text>
      {pts.map((p, i) => (
        <g key={`n${i}`}>
          <circle cx={p.x} cy={p.y} r="30" className="ab-eco-node" />
          {/* Uzun etiketi kesmek yerine iki satıra bölüyoruz: "Sahiplendi…"
              diye kısalan bir düğüm okunmuyordu. */}
          {wrapLabel(p.n).map((line, li, arr) => (
            <text key={li} x={p.x} y={p.y + 3.5 + (li - (arr.length - 1) / 2) * 9.5}
              className={`ab-eco-node-t${line.length > 11 ? " sm" : ""}`} textAnchor="middle">{line}</text>
          ))}
        </g>
      ))}
    </svg>
  );
}

export function AboutPage({ lang = "en", stats = {}, stories = [], onExplore, onContact, onTab, onStory }) {
  const c = C[lang] || C.en;
  const cfg = ABOUT_CONFIG;

  // Sayılar veritabanından geliyor. Kaynağı olmayan hiçbir ölçüt gösterilmiyor —
  // uydurma rakam koymaktansa satırı hiç çıkarmamak doğrusu.
  const metrics = [
    { k: "waiting",    v: stats.waiting,    en: "Animals waiting",   tr: "Yuva bekleyen" },
    { k: "adopted",    v: stats.adopted,    en: "Adopted",           tr: "Yuvalanan" },
    { k: "active",     v: stats.active,     en: "Active rescue cases", tr: "Aktif kurtarma" },
    { k: "helped",     v: stats.helped,     en: "Animals helped",    tr: "Yardım edilen" },
    { k: "volunteers", v: stats.volunteers, en: "Volunteers",        tr: "Gönüllü" },
  ].filter(m => typeof m.v === "number" && m.v > 0);   // sıfır bir başarı değil; satırı hiç göstermiyoruz

  const go = (href) => {
    if (!href) return;
    if (href.startsWith("#")) {
      document.getElementById(href.slice(1))?.scrollIntoView({ behavior: "smooth", block: "start" });
    } else if (href.startsWith("tab:")) {
      onTab?.(href.slice(4));
    }
  };

  const socials = Object.entries(cfg.social).filter(([, url]) => url);
  const SocialLinks = ({ className = "ab-social" }) => (
    <span className={className}>
      {socials.map(([k, url]) => (
        <a key={k} href={url} target="_blank" rel="noopener noreferrer"
           className="ab-social-l" aria-label={SOCIAL_LABEL[k] || k}>
          <span aria-hidden="true">{SOCIAL_ICON[k]}</span>
          <span>{SOCIAL_LABEL[k] || k}</span>
        </a>
      ))}
    </span>
  );
  const legal = c.footer.legal.filter(([, key]) => cfg.legal[key]);

  return (
    <div className="about" id="about-top">
      {/* ── HERO ── */}
      <header className="ab-hero">
        <div className="ab-wrap ab-hero-in">
          <p className="ab-kicker">{c.hero.kicker}</p>
          <h1 className="ab-h1">{c.hero.title}</h1>
          <p className="ab-lead">{c.hero.body}</p>
          <div className="ab-cta">
            <button className="btn btn-dark" onClick={() => onExplore?.()}>{c.hero.primary}</button>
            <button className="btn btn-outline" onClick={() => go("#contact")}>{c.hero.secondary}</button>
          </div>
        </div>
      </header>

      {/* ── PAWEERO NEDİR ── */}
      <Section>
        <h2 className="ab-h2">{c.what.title}</h2>
        {c.what.body.map((p, i) => <p key={i} className="ab-p">{p}</p>)}
        <ol className="ab-journey" aria-label={c.what.title}>
          {c.what.journey.map((stepName, i) => (
            <li key={stepName} className="ab-journey-step">
              <span className="ab-journey-dot" aria-hidden="true">{i + 1}</span>
              {stepName}
            </li>
          ))}
        </ol>
      </Section>

      {/* ── SORUN ── */}
      <Section tone="ab-tint">
        <h2 className="ab-h2">{c.problem.title}</h2>
        <ul className="ab-problems">
          {c.problem.items.map(item => <li key={item}>{item}</li>)}
        </ul>
        <p className="ab-closing">{c.problem.closing}</p>
      </Section>

      {/* ── MİSYON & VİZYON ── */}
      <Section id="mission">
        <div className="ab-two">
          <article>
            <p className="ab-label">{c.mission.label}</p>
            <h2 className="ab-h2">{c.mission.title}</h2>
            <p className="ab-p">{c.mission.body}</p>
          </article>
          <article>
            <p className="ab-label">{c.vision.label}</p>
            <h2 className="ab-h2">{c.vision.title}</h2>
            <p className="ab-p">{c.vision.body}</p>
            <ul className="ab-vlines">
              {c.vision.lines.map(l => <li key={l}>{l}</li>)}
            </ul>
          </article>
        </div>
      </Section>

      {/* ── NASIL ÇALIŞIR ── */}
      <Section tone="ab-tint">
        <h2 className="ab-h2">{c.how.title}</h2>
        <div className="ab-steps">
          {c.how.steps.map(s => (
            <article key={s.n} className="ab-step">
              <span className="ab-step-n">{s.n}</span>
              <span className="ab-step-i" aria-hidden="true">{s.icon}</span>
              <h3 className="ab-h3">{s.title}</h3>
              <p className="ab-sm">{s.body}</p>
            </article>
          ))}
        </div>
      </Section>

      {/* ── KİMLER İÇİN ── */}
      <Section>
        <h2 className="ab-h2">{c.who.title}</h2>
        <div className="ab-cards">
          {c.who.cards.map(card => (
            <article key={card.title} className="ab-card">
              <span className="ab-card-i" aria-hidden="true">{card.icon}</span>
              <h3 className="ab-h3">{card.title}</h3>
              <p className="ab-sm">{card.body}</p>
            </article>
          ))}
        </div>
      </Section>

      {/* ── EKOSİSTEM ── */}
      <Section tone="ab-tint">
        <h2 className="ab-h2">{c.eco.title}</h2>
        <p className="ab-p">{c.eco.body}</p>
        <EcosystemDiagram nodes={c.eco.nodes} label={c.eco.title} />
      </Section>

      {/* ── TEKNOLOJİ ── */}
      <Section>
        <h2 className="ab-h2">{c.tech.title}</h2>
        <p className="ab-p">{c.tech.body}</p>
        <ul className="ab-chips">
          {c.tech.items.map(i => <li key={i} className="ab-chip">{i}</li>)}
        </ul>
      </Section>

      {/* ── ETKİ ── */}
      {metrics.length > 0 && (
        <Section id="impact" tone="ab-dark">
          <h2 className="ab-h2">{c.impact.title}</h2>
          <p className="ab-sm ab-dim">{c.impact.note}</p>
          <div className="ab-metrics">
            {metrics.map(m => (
              <div key={m.k} className="ab-metric">
                <div className="ab-metric-n">{m.v}</div>
                <div className="ab-metric-l">{lang === "tr" ? m.tr : m.en}</div>
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* ── BAŞARI HİKÂYELERİ ── */}
      <Section id="stories">
        <h2 className="ab-h2">{c.stories.title}</h2>
        {stories.length === 0 ? (
          <p className="ab-p ab-muted">{c.stories.empty}</p>
        ) : (
          <>
            <div className="ab-stories">
              {stories.map(s => (
                <button key={s.id} className="ab-story" onClick={() => onStory?.(s)}>
                  <span className="ab-story-img">
                    {s.photo_url
                      ? <img src={s.photo_url} alt={s.title?.[lang] || s.title?.en || ""} loading="lazy" />
                      : <span className="ab-story-ph" aria-hidden="true">🐾</span>}
                  </span>
                  <span className="ab-story-b">
                    <span className="ab-story-t">{s.title?.[lang] || s.title?.en || ""}</span>
                    <span className="ab-story-l">📍 {s.location}</span>
                    <span className="ab-story-s">{lang === "tr" ? "Yardım edildi ✓" : "Helped ✓"}</span>
                    <span className="ab-story-c">{c.stories.read} →</span>
                  </span>
                </button>
              ))}
            </div>
            <button className="btn btn-outline" onClick={() => onTab?.("helped")}>{c.stories.cta}</button>
          </>
        )}
      </Section>

      {/* ── İŞ BİRLİĞİ ── */}
      <Section id="partners" tone="ab-tint">
        <h2 className="ab-h2">{c.partners.title}</h2>
        <p className="ab-p">{c.partners.body}</p>
        <ul className="ab-chips">
          {c.partners.list.map(i => <li key={i} className="ab-chip">{i}</li>)}
        </ul>
        <button className="btn btn-dark" onClick={() => go("#contact")}>{c.partners.cta}</button>
      </Section>

      {/* ── İLETİŞİM + KURUMSAL BİLGİ ── */}
      <Section id="contact">
        <div className="ab-two">
          <article>
            <h2 className="ab-h2">{c.contact.title}</h2>
            <p className="ab-p">{c.contact.body}</p>
            <div className="ab-contact-btns">
              <a className="btn btn-dark" href={cfg.phoneHref}>📞 {c.contact.call} · {cfg.phone}</a>
              {cfg.email && <a className="btn btn-outline" href={`mailto:${cfg.email}`}>✉️ {cfg.email}</a>}
            </div>
            {socials.length > 0 && <SocialLinks />}
          </article>
          <article className="ab-corp">
            <h3 className="ab-corp-n">{c.corp.title}</h3>
            <p className="ab-corp-s">{c.corp.subtitle}</p>
            <dl className="ab-dl">
              <dt>{c.corp.phoneLabel}</dt>
              <dd><a href={cfg.phoneHref}>{cfg.phone}</a></dd>
              {cfg.email && (<><dt>{c.corp.emailLabel}</dt><dd><a href={`mailto:${cfg.email}`}>{cfg.email}</a></dd></>)}
              {cfg.location && (<><dt>{c.corp.locationLabel}</dt><dd>{cfg.location}</dd></>)}
            </dl>
          </article>
        </div>
      </Section>

      {/* ── FOOTER ── */}
      <footer className="ab-footer">
        <div className="ab-wrap">
          <div className="ab-fcols">
            {c.footer.cols.map(col => (
              <nav key={col.title} aria-label={col.title}>
                <h2 className="ab-fh">{col.title}</h2>
                <ul>
                  {col.links.map(([label, href]) => (
                    <li key={label}>
                      <button className="ab-flink" onClick={() => go(href)}>{label}</button>
                    </li>
                  ))}
                </ul>
              </nav>
            ))}
            {legal.length > 0 && (
              <nav aria-label={c.footer.legalTitle}>
                <h2 className="ab-fh">{c.footer.legalTitle}</h2>
                <ul>
                  {legal.map(([label, key]) => (
                    <li key={label}><a className="ab-flink" href={cfg.legal[key]}>{label}</a></li>
                  ))}
                </ul>
              </nav>
            )}
          </div>
          <div className="ab-fbottom">
            <span>{c.footer.rights}</span>
            {socials.length > 0 && <SocialLinks />}
          </div>
        </div>
      </footer>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// STİLLER — uygulamanın kendi değişkenlerini kullanıyor (--dark, --amber, --off…)
// böylece sayfa ilk günden beri Paweero'nun parçasıymış gibi duruyor.
// ─────────────────────────────────────────────────────────────────────────────
export const ABOUT_STYLES = `
  .about { background:var(--white); }
  .ab-wrap { max-width:1060px; margin:0 auto; padding:0 var(--pad); }
  .ab-sec { padding:56px 0; border-bottom:1px solid var(--border); }
  .ab-sec.ab-tint { background:var(--off); }
  .ab-sec.ab-dark { background:var(--dark); color:#fff; border-bottom:none; }

  .ab-hero { padding:56px 0 52px; background:
      radial-gradient(1100px 380px at 15% -10%, rgba(212,134,43,0.16), transparent 62%),
      radial-gradient(900px 360px at 100% 0%, rgba(45,122,79,0.10), transparent 60%), var(--white);
    border-bottom:1px solid var(--border); }
  .ab-hero-in { max-width:760px; }
  .ab-kicker { font-size:12px; font-weight:700; letter-spacing:1.4px; text-transform:uppercase;
               color:var(--amber); margin:0 0 16px; }
  .ab-h1 { font-size:clamp(30px,6.4vw,54px); line-height:1.08; letter-spacing:-1.4px; font-weight:800;
           color:var(--dark); margin:0 0 20px; }
  .ab-lead { font-size:clamp(15px,2.3vw,18px); line-height:1.65; color:var(--muted); margin:0 0 28px; }
  .ab-cta { display:flex; gap:10px; flex-wrap:wrap; }

  .ab-h2 { font-size:clamp(22px,3.6vw,32px); line-height:1.2; letter-spacing:-0.7px; font-weight:800;
           color:inherit; margin:0 0 18px; max-width:22ch; }
  .ab-sec.ab-dark .ab-h2 { color:#fff; }
  .ab-h3 { font-size:15px; font-weight:700; color:var(--dark); margin:0 0 6px; letter-spacing:-0.2px; }
  .ab-p  { font-size:15px; line-height:1.75; color:var(--muted); margin:0 0 14px; max-width:68ch; }
  .ab-sm { font-size:13.5px; line-height:1.65; color:var(--muted); margin:0; }
  .ab-dim { opacity:0.75; margin-bottom:22px; }
  .ab-muted { color:var(--muted); }
  .ab-label { font-size:12px; font-weight:700; letter-spacing:1.2px; text-transform:uppercase;
              color:var(--amber); margin:0 0 10px; }
  .ab-closing { font-size:17px; font-weight:700; color:var(--dark); margin:22px 0 0; letter-spacing:-0.3px; }

  .ab-journey { display:flex; gap:8px; flex-wrap:wrap; list-style:none; padding:0; margin:26px 0 0; }
  .ab-journey-step { display:flex; align-items:center; gap:8px; background:var(--off); border-radius:999px;
                     padding:9px 15px 9px 9px; font-size:13px; font-weight:600; color:var(--dark); }
  .ab-journey-dot { width:22px; height:22px; border-radius:50%; background:var(--dark); color:#fff;
                    font-size:11px; font-weight:700; display:flex; align-items:center; justify-content:center; }

  .ab-problems { list-style:none; padding:0; margin:0; display:grid; gap:10px;
                 grid-template-columns:repeat(auto-fit,minmax(280px,1fr)); }
  .ab-problems li { position:relative; padding-left:26px; font-size:14.5px; line-height:1.6; color:var(--muted); }
  .ab-problems li::before { content:"—"; position:absolute; left:0; top:0; color:var(--red); font-weight:700; }

  .ab-two { display:grid; gap:34px; grid-template-columns:repeat(auto-fit,minmax(300px,1fr)); }
  .ab-vlines { list-style:none; padding:0; margin:16px 0 0; }
  .ab-vlines li { font-size:14.5px; font-weight:600; color:var(--dark); padding:7px 0;
                  border-top:1px solid var(--border); }

  .ab-steps { display:grid; gap:14px; grid-template-columns:repeat(auto-fit,minmax(240px,1fr)); }
  .ab-step { background:var(--white); border:1px solid var(--border); border-radius:var(--r);
             padding:20px; position:relative; transition:transform 0.15s, box-shadow 0.15s; }
  @media (hover:hover) { .ab-step:hover, .ab-card:hover { transform:translateY(-2px); box-shadow:var(--shadow-md); } }
  .ab-step-n { position:absolute; top:16px; right:18px; font-size:12px; font-weight:800; color:var(--border); letter-spacing:0.5px; }
  .ab-step-i, .ab-card-i { display:flex; align-items:center; justify-content:center; width:42px; height:42px;
                           border-radius:12px; background:var(--off); font-size:20px; margin-bottom:12px; }

  .ab-cards { display:grid; gap:14px; grid-template-columns:repeat(auto-fit,minmax(220px,1fr)); }
  .ab-card { background:var(--off); border-radius:var(--r); padding:20px; transition:transform 0.15s, box-shadow 0.15s; }
  .ab-card .ab-card-i { background:var(--white); }

  .ab-eco { display:block; width:100%; max-width:420px; height:auto; margin:24px auto 0; }
  .ab-eco-line { stroke:var(--border); stroke-width:1.2; }
  .ab-eco-core { fill:var(--dark); }
  .ab-eco-core-t { fill:#fff; font-size:13px; font-weight:800; letter-spacing:0.6px; font-family:var(--font); }
  .ab-eco-node { fill:var(--white); stroke:var(--amber); stroke-width:1.5; }
  .ab-eco-node-t { fill:var(--dark); font-size:8.4px; font-weight:700; font-family:var(--font); }
  .ab-eco-node-t.sm { font-size:7px; letter-spacing:-0.2px; }

  .ab-chips { list-style:none; padding:0; margin:0 0 22px; display:flex; flex-wrap:wrap; gap:8px; }
  .ab-chip { background:var(--white); border:1px solid var(--border); border-radius:999px;
             padding:8px 14px; font-size:13px; font-weight:600; color:var(--dark); }
  .ab-sec:not(.ab-tint) .ab-chip { background:var(--off); border-color:transparent; }

  .ab-metrics { display:grid; gap:12px; grid-template-columns:repeat(auto-fit,minmax(150px,1fr)); }
  .ab-metric { background:rgba(255,255,255,0.07); border-radius:var(--r); padding:22px 18px; }
  .ab-metric-n { font-size:34px; font-weight:800; letter-spacing:-1.2px; line-height:1; }
  .ab-metric-l { font-size:12px; font-weight:600; letter-spacing:0.4px; opacity:0.72; margin-top:8px; text-transform:uppercase; }

  .ab-stories { display:grid; gap:14px; grid-template-columns:repeat(auto-fit,minmax(240px,1fr)); margin-bottom:22px; }
  .ab-story { display:flex; flex-direction:column; text-align:left; background:var(--white); border:1px solid var(--border);
              border-radius:var(--r); overflow:hidden; padding:0; cursor:pointer; font-family:var(--font);
              transition:transform 0.15s, box-shadow 0.15s; }
  @media (hover:hover) { .ab-story:hover { transform:translateY(-2px); box-shadow:var(--shadow-md); } }
  .ab-story-img { display:block; height:150px; background:var(--off); overflow:hidden; }
  .ab-story-img img { width:100%; height:100%; object-fit:cover; display:block; }
  .ab-story-ph { display:flex; align-items:center; justify-content:center; height:100%; font-size:34px; opacity:0.4; }
  .ab-story-b { display:block; padding:14px 16px 16px; }
  .ab-story-t { display:block; font-size:14.5px; font-weight:700; color:var(--dark); margin-bottom:5px; }
  .ab-story-l { display:block; font-size:12px; color:var(--muted); margin-bottom:8px; }
  .ab-story-s { display:inline-block; font-size:11px; font-weight:700; color:var(--green);
                background:rgba(45,122,79,0.1); border-radius:999px; padding:3px 9px; }
  .ab-story-c { display:block; font-size:12.5px; font-weight:700; color:var(--amber); margin-top:10px; }

  .ab-contact-btns { display:flex; gap:10px; flex-wrap:wrap; margin-bottom:14px; }
  .ab-contact-btns .btn { text-decoration:none; }
  .ab-social { display:flex; gap:14px; flex-wrap:wrap; }
  .ab-social-l { display:inline-flex; align-items:center; gap:7px; font-size:13px; font-weight:600;
                 color:var(--amber); text-decoration:none; }
  .ab-social-l:hover { text-decoration:underline; }
  .ab-footer .ab-social-l { color:rgba(255,255,255,0.92); }
  .ab-footer .ab-social-l:hover { color:var(--amber); }
  .ab-corp { background:var(--off); border-radius:var(--r); padding:24px; align-self:start; }
  .ab-corp-n { font-size:20px; font-weight:800; color:var(--dark); margin:0 0 4px; letter-spacing:-0.4px; }
  .ab-corp-s { font-size:13px; color:var(--muted); margin:0 0 18px; }
  .ab-dl { margin:0; font-size:14px; }
  .ab-dl dt { font-size:11.5px; font-weight:700; letter-spacing:0.6px; text-transform:uppercase;
              color:var(--muted); margin-top:14px; }
  .ab-dl dd { margin:3px 0 0; color:var(--dark); font-weight:600; }
  .ab-dl a { color:var(--dark); }

  /* Alt çubuk mobilde sabit duruyor: footer'ın son satırı onun altında kalmasın. */
  .ab-footer { background:var(--dark); color:#fff;
               padding:44px 0 calc(30px + var(--nav-h) + env(safe-area-inset-bottom,0px)); }
  @media (min-width:768px) { .ab-footer { padding-bottom:30px; } }
  .ab-fcols { display:grid; gap:28px; grid-template-columns:repeat(auto-fit,minmax(150px,1fr)); }
  .ab-fcols ul { list-style:none; padding:0; margin:0; }
  .ab-fcols li { margin-bottom:9px; }
  .ab-fh { font-size:12px; font-weight:700; letter-spacing:1.1px; text-transform:uppercase;
           color:rgba(255,255,255,0.55); margin:0 0 14px; }
  .ab-flink { background:none; border:none; padding:0; font-family:var(--font); font-size:14px;
              color:rgba(255,255,255,0.92); cursor:pointer; text-align:left; text-decoration:none; display:inline-block; }
  .ab-flink:hover { color:var(--amber); }
  .ab-fbottom { display:flex; justify-content:space-between; align-items:center; gap:14px; flex-wrap:wrap;
                margin-top:34px; padding-top:20px; border-top:1px solid rgba(255,255,255,0.14);
                font-size:12.5px; color:rgba(255,255,255,0.6); }

  .about :focus-visible { outline:2px solid var(--amber); outline-offset:3px; border-radius:4px; }

  @media (max-width:520px) {
    .ab-sec { padding:40px 0; }
    .ab-hero { padding:36px 0 34px; }
    .ab-cta .btn, .ab-contact-btns .btn { width:100%; justify-content:center; }
  }
`;
