import { useState, useRef, useEffect } from "react";

// ─── SUPABASE ─────────────────────────────────────────────────────────────────
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || "https://uyuqcpttdbejaakbwzyl.supabase.co";
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV5dXFjcHR0ZGJlamFha2J3enlsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg0Mjk2NTgsImV4cCI6MjA5NDAwNTY1OH0.y8dJOe0yyWeKeaUU9PfPxnGn6b-2yHyG84LBdqaNH9k";
// İstemci ilk gerçek veritabanı çağrısında yüklenir. Supabase paketi 220 KB
// (gzip 57 KB) — React'ten bile büyük — ve sayfanın ilk boyaması için gerekmiyor.
// Dinamik import onu giriş paketinden çıkarır: iskelet, veritabanı istemcisi
// ayrıştırılmadan ekrana gelir. Tüm çağrılar zaten async olduğu için maliyeti yok.
let dbPromise = null;
const getDb = () => (dbPromise ||= import("@supabase/supabase-js")
  .then(m => m.createClient(SUPABASE_URL, SUPABASE_KEY)));

// If exactly one Foster/Help/Sighting/Claim purpose applies to an animal, the
// trigger button should name that action directly instead of the generic
// "Take Action" label — that framing only makes sense when there's a real choice.
function getSingleActionLabel(animal, lang) {
  const opts = [];
  if (animal.canFoster) opts.push(lang==="tr" ? "Geçici Bakım Ver" : "Offer Foster Care");
  if (animal.needsHelp) opts.push(lang==="tr" ? "Yardım Teklif Et" : "Offer Help");
  if (animal.isLost)    opts.push(lang==="tr" ? "Gördüm" : "I Saw This Animal");
  if (animal.isFound)   opts.push(lang==="tr" ? "Benim Olabilir" : "This Might Be My Pet");
  return opts.length === 1 ? opts[0] : null;
}

// ─── BRAND IMAGES ─────────────────────────────────────────────────────────────
// Fallback photo used anywhere a listing has no uploaded image — the "P" brand mark.
const FALLBACK_IMAGE = "https://uyuqcpttdbejaakbwzyl.supabase.co/storage/v1/object/public/pawero-photos/banner/hero-p.png";
// Hero banner image on the Home page — the real Lucas & Şirin photo.
const HERO_IMAGE = "https://uyuqcpttdbejaakbwzyl.supabase.co/storage/v1/object/public/pawero-photos/banner/hero.jpg";

// ─── IMAGE MODERATION ────────────────────────────────────────────────────────
const moderateImage = async (imageUrl) => {
  try {
    console.log("Calling moderate-image with:", imageUrl);
    const { data, error } = await (await getDb()).functions.invoke("moderate-image", {
      body: { imageUrl }
    });
    console.log("moderate-image response:", { data, error });
    if (error) { console.error("moderate-image error:", error); return { safe: true }; } // fail open
    return data;
  } catch (err) {
    console.error("moderate-image exception:", err);
    return { safe: true }; // fail open
  }
};

// ─── UPLOAD PHOTO WITH MODERATION ────────────────────────────────────────────
const uploadPhoto = async (file, folder) => {
  const client = await getDb();
  const ext = file.name.split('.').pop();
  const path = `${folder}/${Date.now()}.${ext}`;
  const { error } = await client.storage.from("pawero-photos").upload(path, file);
  if (error) return { url: null, error: "Upload failed" };
  const { data: urlData } = client.storage.from("pawero-photos").getPublicUrl(path);
  const publicUrl = urlData.publicUrl;
  // Moderate
  const modResult = await moderateImage(publicUrl);
  if (!modResult.safe) {
    // Delete the uploaded file
    await client.storage.from("pawero-photos").remove([path]);
    return { url: null, error: modResult.reason === "not_animal" ? "not_animal" : "inappropriate" };
  }
  return { url: publicUrl, error: null };
};


// ─── DYNAMIC DRAWER HEIGHT UTILITY ────────────────────────────────────────
// Calculates drawer height based on image aspect ratio
// Portrait images (ratio < 0.8) → 85vh; Landscape/Square → 70vh
const getDrawerHeightByImageAspectRatio = (imageUrl) => {
  return new Promise((resolve) => {
    if (!imageUrl) {
      console.log("No image URL provided, using default drawer height 70vh");
      resolve(70); // 70vh as fallback
      return;
    }
    const img = new Image();
    img.onload = () => {
      const aspectRatio = img.width / img.height;
      const height = aspectRatio < 0.8 ? 85 : 70;
      console.log(`Image loaded: ${img.width}x${img.height}, aspect ratio: ${aspectRatio.toFixed(2)}, drawer height: ${height}vh`);
      resolve(height);
    };
    img.onerror = () => {
      console.warn("Failed to load image for aspect ratio calculation, using default 70vh");
      resolve(70); // fallback
    };
    img.src = imageUrl;
  });
};


// ─── PHOTO ERROR MESSAGE HELPER ─────────────────────────────────────────────
const photoErrorMsg = (errorCode, lang) => {
  if (errorCode === "not_animal") {
    return lang === "tr"
      ? "Fotoğrafta bir hayvan görünmüyor. Lütfen hayvanın net bir fotoğrafını yükleyin."
      : "We couldn't detect an animal in this photo. Please upload a clear photo of the animal.";
  }
  return lang === "tr"
    ? "Bu fotoğraf uygunsuz veya zararlı içerik içeriyor olabilir. Lütfen hayvanın uygun bir fotoğrafını yükleyin."
    : "This photo may contain inappropriate or harmful content. Please upload a suitable photo of the animal.";
};

// ─── WHATSAPP SHARE ──────────────────────────────────────────────────────────
// Opens WhatsApp with a pre-filled message so users can share a listing.
const shareOnWhatsApp = (text) => {
  const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
  window.open(url, "_blank", "noopener,noreferrer");
};

// Reusable small WhatsApp share button used across every listing type.
function WhatsAppShareButton({ text, lang, t }) {
  return (
    <button
      className="btn btn-sm"
      style={{ background:"#25D366", color:"#fff", border:"none", display:"inline-flex", alignItems:"center", gap:5 }}
      title={lang === "tr" ? "WhatsApp'ta paylaş" : "Share on WhatsApp"}
      onClick={e => { e.stopPropagation(); shareOnWhatsApp(text); }}
    >
      <svg viewBox="0 0 24 24" width="14" height="14" fill="#fff" style={{ flexShrink:0 }}>
        <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2 22l5.25-1.38c1.45.79 3.08 1.21 4.79 1.21h.01c5.46 0 9.91-4.45 9.91-9.91C21.96 6.45 17.5 2 12.04 2zm5.8 14.16c-.24.68-1.42 1.31-1.96 1.36-.5.05-1.14.07-1.84-.12-.42-.13-.97-.31-1.67-.61-2.94-1.27-4.86-4.23-5.01-4.43-.15-.2-1.2-1.6-1.2-3.05 0-1.45.76-2.16 1.03-2.46.27-.3.59-.37.79-.37.2 0 .39.002.56.01.18.008.42-.07.66.5.24.58.82 2.01.89 2.16.07.15.12.32.02.52-.1.2-.15.32-.3.5-.15.18-.31.39-.44.53-.15.15-.3.31-.13.6.17.3.76 1.25 1.63 2.03 1.12 1 2.07 1.31 2.36 1.46.29.15.46.13.63-.08.17-.2.72-.84.91-1.13.19-.29.39-.24.66-.15.27.1 1.7.8 1.99.95.29.15.48.22.55.34.07.12.07.7-.17 1.38z"/>
      </svg>
      {t?.shareWA || (lang === "tr" ? "Paylaş" : "Share")}
    </button>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// DATA
// ─────────────────────────────────────────────────────────────────────────────

const ANIMALS = [
  { id:1, name:"Luna",   emoji:"🐕", species:{en:"Dog",    tr:"Köpek"},   breed:{en:"Golden Retriever Mix",    tr:"Golden Retriever Mix"},    age:{en:"2 yrs",    tr:"2 yaş"},    gender:{en:"Female",tr:"Dişi"}, country:"Türkiye",      province:"İstanbul",   city:"Beşiktaş", tags:{en:["Vaccinated","Spayed","Kid-friendly"],    tr:["Aşılı","Kısırlaştırıldı","Çocuk dostu"]}, urgent:false, isNew:true,  canFoster:true,  desc:{en:"Luna is a gentle, playful girl who loves everyone she meets. Great with children and other dogs.",                              tr:"Luna sakin, sevecen bir köpek. Çocuklarla ve diğer köpeklerle çok iyi geçiniyor."} },
  { id:2, name:"Mochi",  emoji:"🐈", species:{en:"Cat",    tr:"Kedi"},    breed:{en:"Domestic Shorthair",      tr:"Tekir"},                    age:{en:"4 mos",    tr:"4 aylık"}, gender:{en:"Male",  tr:"Erkek"}, country:"Türkiye",      province:"İzmir",      city:"Konak",    tags:{en:["Vaccinated","Playful","Indoor"],          tr:["Aşılı","Oyuncu","İç mekan"]},             urgent:true,  isNew:false, canFoster:true,  desc:{en:"Mochi is a tiny bundle of energy! Found as a stray kitten, now healthy and ready for his forever family.",                   tr:"Mochi sokaktan kurtarılmış minik bir yavru. Sağlığına kavuştu, sıcak bir yuva bekliyor."} },
  { id:3, name:"Rocky",  emoji:"🐇", species:{en:"Rabbit", tr:"Tavşan"},  breed:{en:"Holland Lop",             tr:"Hollanda Lop"},             age:{en:"1 yr",     tr:"1 yaş"},    gender:{en:"Male",  tr:"Erkek"}, country:"Türkiye",      province:"Ankara",     city:"Çankaya",  tags:{en:["Neutered","Litter-trained","Gentle"],     tr:["Kısırlaştırıldı","Evcil","Sakin"]},       urgent:false, isNew:false, canFoster:false, desc:{en:"Rocky is a calm and gentle rabbit. Perfect for a quiet household.",                                                          tr:"Rocky sakin, uysal bir tavşan. Sessiz bir eve çok uygun."} },
  { id:4, name:"Bella",  emoji:"🐕", species:{en:"Dog",    tr:"Köpek"},   breed:{en:"German Shepherd",         tr:"Alman Çoban Köpeği"},       age:{en:"3 yrs",    tr:"3 yaş"},    gender:{en:"Female",tr:"Dişi"}, country:"BAE",          province:"Dubai",      city:"Jumeirah", tags:{en:["Trained","Vaccinated","Active"],          tr:["Eğitimli","Aşılı","Aktif"]},              urgent:false, isNew:true,  canFoster:false, desc:{en:"Bella is smart and loyal. Needs an active family with outdoor space.",                                                       tr:"Bella zeki ve sadık bir köpek. Dış alanı olan aktif bir aile için ideal."} },
  { id:5, name:"Cleo",   emoji:"🐈", species:{en:"Cat",    tr:"Kedi"},    breed:{en:"Siamese Mix",             tr:"Siyam Mix"},                age:{en:"6 yrs",    tr:"6 yaş"},    gender:{en:"Female",tr:"Dişi"}, country:"Cyprus"      , province:"Girne",      city:"Girne",    tags:{en:["Senior","Calm","Vaccinated"],             tr:["Yaşlı","Sakin","Aşılı"]},                 urgent:true,  isNew:false, canFoster:true,  desc:{en:"Cleo is a senior cat who loves peaceful spots. She deserves a forever home.",                                                tr:"Cleo huzurlu bir köşe seven yaşlı bir kedi. Kalıcı bir yuva hak ediyor."} },
  { id:6, name:"Peanut", emoji:"🐹", species:{en:"Hamster",tr:"Hamster"}, breed:{en:"Syrian Hamster",          tr:"Suriye Hamster"},           age:{en:"6 mos",    tr:"6 aylık"}, gender:{en:"Male",  tr:"Erkek"}, country:"BAE",          province:"Abu Dhabi",  city:"Al Reem",  tags:{en:["Healthy","Friendly"],                    tr:["Sağlıklı","Uysal"]},                      urgent:false, isNew:false, canFoster:true,  desc:{en:"Peanut comes with cage and accessories. Easy to care for.",                                                                  tr:"Peanut kafesi ve aksesuarlarıyla birlikte verilecek."} },
  { id:7, name:"Atlas",  emoji:"🐕", species:{en:"Dog",    tr:"Köpek"},   breed:{en:"Kangal Mix",              tr:"Kangal Mix"},               age:{en:"4 yrs",    tr:"4 yaş"},    gender:{en:"Male",  tr:"Erkek"}, country:"Türkiye",      province:"Ankara",     city:"Keçiören", tags:{en:["Vaccinated","Stray","Large breed"],       tr:["Aşılı","Sahipsiz","Büyük cüsse"]},        urgent:true,  isNew:false, canFoster:true,  desc:{en:"Atlas was rescued from the street. Big and gentle, needs a home with a large garden.",                                       tr:"Atlas sokaktan alındı. Büyük ve sevecen, geniş bahçeli bir eve ihtiyacı var."} },
  { id:8, name:"Zara",   emoji:"🐈", species:{en:"Cat",    tr:"Kedi"},    breed:{en:"Van Cat",                 tr:"Van Kedisi"},               age:{en:"2 yrs",    tr:"2 yaş"},    gender:{en:"Female",tr:"Dişi"}, country:"Türkiye",      province:"Van",        city:"İpekyolu", tags:{en:["Vaccinated","Spayed","Active"],           tr:["Aşılı","Kısırlaştırıldı","Aktif"]},       urgent:false, isNew:true,  canFoster:true,  desc:{en:"Zara is a Van Cat, Turkey's iconic breed. Loves water and has an energetic personality.",                                    tr:"Zara Türkiye'nin simgesi Van kedisi. Suyu seven, enerjik bir karakter."} },
  { id:9, name:"Max",    emoji:"🐕", species:{en:"Dog",    tr:"Köpek"},   breed:{en:"Labrador Mix",            tr:"Labrador Mix"},             age:{en:"1 yr",     tr:"1 yaş"},    gender:{en:"Male",  tr:"Erkek"}, country:"Cyprus"      , province:"Lefkoşa",    city:"Lefkoşa",  tags:{en:["Vaccinated","Playful","Young"],           tr:["Aşılı","Oyuncu","Genç"]},                 urgent:false, isNew:true,  canFoster:true,  desc:{en:"Max is an energetic and affectionate young dog. Loves running in open spaces.",                                              tr:"Max enerjik ve sevecen genç bir köpek. Açık alanda koşmayı çok seviyor."} },
];

const COUNTRIES = ["All Countries","Türkiye","Cyprus","BAE","Katar","Kuveyt","Bahreyn","Umman","Suudi Arabistan"];

const COUNTRY_META = {
  // key                  EN label                 TR label            dil    varsayılan il      saat dilimleri                          ISO   telefon                      para
  "Türkiye":         { en:"Turkey",             tr:"Türkiye",         lang:"tr", province:"İstanbul", tz:["Europe/Istanbul","Asia/Istanbul"], iso:"TR", phone:"+90 5XX XXX XX XX",  currency:"TL"  },
  "Cyprus":          { en:"Cyprus",             tr:"Kıbrıs",          lang:"en", province:"Lefkoşa",  tz:["Asia/Nicosia","Europe/Nicosia"],   iso:"CY", phone:"+357 9X XXX XXX",    currency:"EUR" },
  "BAE":             { en:"UAE",                tr:"BAE",             lang:"en", province:"Dubai",    tz:["Asia/Dubai"],                      iso:"AE", phone:"+971 5X XXX XXXX",   currency:"AED" },
  "Katar":           { en:"Qatar",              tr:"Katar",           lang:"en", province:"Doha",     tz:["Asia/Qatar"],                      iso:"QA", phone:"+974 XXXX XXXX",     currency:"QAR" },
  "Kuveyt":          { en:"Kuwait",             tr:"Kuveyt",          lang:"en", province:"Al Asimah",tz:["Asia/Kuwait"],                     iso:"KW", phone:"+965 XXXX XXXX",     currency:"KWD" },
  "Bahreyn":         { en:"Bahrain",            tr:"Bahreyn",         lang:"en", province:"Manama",   tz:["Asia/Bahrain"],                    iso:"BH", phone:"+973 XXXX XXXX",     currency:"BHD" },
  "Umman":           { en:"Oman",               tr:"Umman",           lang:"en", province:"Muscat",   tz:["Asia/Muscat"],                     iso:"OM", phone:"+968 XXXX XXXX",     currency:"OMR" },
  "Suudi Arabistan": { en:"Saudi Arabia",       tr:"Suudi Arabistan", lang:"en", province:"Riyadh",   tz:["Asia/Riyadh"],                     iso:"SA", phone:"+966 5X XXX XXXX",   currency:"SAR" },
};

// Kayıtlarda saklanan eski ülke değerleri. Ada tek ülkeye indirildi ama daha önce
// "Kuzey Kıbrıs" / "Güney Kıbrıs" olarak kaydedilmiş ilanlar filtrelerden düşmesin.
const LEGACY_COUNTRY = { "Kuzey Kıbrıs":"Cyprus", "Güney Kıbrıs":"Cyprus" };
const normCountry = (c) => LEGACY_COUNTRY[c] || c || "";
// Serbest metin konum alanlarında (acil bildirimler) ülkeyi yakalamak için.
const COUNTRY_ALIASES = {
  "Cyprus": ["cyprus","kıbrıs","kibris","kktc"],
};

// Kıbrıs'ın iki yakasındaki ilçeler aynı listede olduğu için adları netleştirilir.
// Anahtarlar (soldaki) kayıtlarda saklanan değerler — asla değişmez.
const PROVINCE_LABELS = {
  "Lefkoşa":    { en:"Nicosia (North)",        tr:"Lefkoşa" },
  "Nicosia":    { en:"Nicosia (South)",        tr:"Lefkoşa (Güney)" },
  "Gazimağusa": { en:"Famagusta (North)",      tr:"Gazimağusa" },
  "Famagusta":  { en:"Famagusta (Free Area)",  tr:"Mağusa (Güney)" },
  "Girne":      { en:"Kyrenia",                tr:"Girne" },
  "Güzelyurt":  { en:"Morphou",                tr:"Güzelyurt" },
  "İskele":     { en:"Iskele",                 tr:"İskele" },
  "Lefke":      { en:"Lefka",                  tr:"Lefke" },
  "Limassol":   { en:"Limassol",               tr:"Limasol" },
  "Larnaca":    { en:"Larnaca",                tr:"Larnaka" },
  "Paphos":     { en:"Paphos",                 tr:"Baf" },
};

// "Tümü" seçenekleri ülke değil, ayrı tutulur.
const ALL_LABELS = {
  "All Countries": { en:"All Countries", tr:"Tüm Ülkeler" },
  "All Provinces": { en:"All Provinces", tr:"Tüm İller" },
  "All Cities":    { en:"All Areas",     tr:"Tüm Semtler" },
};
// Kayıtlarda saklanan anahtar hiç değişmez; kullanıcının gördüğü metin dile göre gelir.
const locLabel = (name, lang) => {
  const l = lang === "tr" ? "tr" : "en";
  return (ALL_LABELS[name] || COUNTRY_META[name] || PROVINCE_LABELS[name] || {})[l] || name;
};

// Saat dilimi ve IP ülke kodundan ülke anahtarına çeviri — COUNTRY_META'dan türetilir,
// böylece yeni bir ülke eklemek tek bir satır demek.
const TZ_COUNTRY = {};
const ISO_COUNTRY = {};
for (const [key, m] of Object.entries(COUNTRY_META)) {
  for (const z of m.tz) if (!TZ_COUNTRY[z]) TZ_COUNTRY[z] = key;
  if (m.iso && !ISO_COUNTRY[m.iso]) ISO_COUNTRY[m.iso] = key;
}

const PROVINCES = {
  "All Countries":  ["All Provinces"],
  "Türkiye":        ["All Provinces","Adana","Adıyaman","Afyonkarahisar","Ağrı","Amasya","Ankara","Antalya","Artvin","Aydın","Balıkesir","Bilecik","Bingöl","Bitlis","Bolu","Burdur","Bursa","Çanakkale","Çankırı","Çorum","Denizli","Diyarbakır","Edirne","Elazığ","Erzincan","Erzurum","Eskişehir","Gaziantep","Giresun","Gümüşhane","Hakkari","Hatay","Isparta","Mersin","İstanbul","İzmir","Kars","Kastamonu","Kayseri","Kırklareli","Kırşehir","Kocaeli","Konya","Kütahya","Malatya","Manisa","Kahramanmaraş","Mardin","Muğla","Muş","Nevşehir","Niğde","Ordu","Rize","Sakarya","Samsun","Siirt","Sinop","Sivas","Tekirdağ","Tokat","Trabzon","Tunceli","Şanlıurfa","Uşak","Van","Yozgat","Zonguldak","Aksaray","Bayburt","Karaman","Kırıkkale","Batman","Şırnak","Bartın","Ardahan","Iğdır","Yalova","Karabük","Kilis","Osmaniye","Düzce"],
  // Ada tek ülke olarak listelenir; ilçe anahtarları kayıtlarda saklandığı gibi kalır.
  "Cyprus":         ["All Provinces","Lefkoşa","Nicosia","Girne","Limassol","Larnaca","Paphos","Gazimağusa","Famagusta","Güzelyurt","İskele","Lefke"],
  "BAE":            ["All Provinces","Dubai","Abu Dhabi","Sharjah","Ajman","Ras Al Khaimah","Fujairah","Umm Al Quwain"],
  "Katar":           ["All Provinces","Doha","Al Rayyan","Al Wakrah","Umm Salal","Al Daayen","Al Khor","Al Shamal","Al Shahaniya"],
  "Kuveyt":          ["All Provinces","Al Asimah","Hawalli","Farwaniya","Mubarak Al-Kabeer","Ahmadi","Jahra"],
  "Bahreyn":         ["All Provinces","Manama","Muharraq","Northern Bahrain","Southern Bahrain"],
  "Umman":           ["All Provinces","Muscat","Dhofar","Al Batinah North","Al Batinah South","Al Dakhiliyah","Al Sharqiyah North","Al Sharqiyah South","Al Dhahirah","Al Buraimi","Al Wusta","Musandam"],
  "Suudi Arabistan": ["All Provinces","Riyadh","Makkah","Madinah","Eastern Province","Asir","Tabuk","Hail","Northern Borders","Jazan","Najran","Al Bahah","Al Jouf","Qassim"],
};
const CITIES = {
  "All Provinces": ["All Cities"],

  // ── Türkiye — 81 il, tüm ilçeler ──
  "Adana":           ["All Cities","Aladağ","Ceyhan","Çukurova","Feke","İmamoğlu","Karaisalı","Karataş","Kozan","Pozantı","Saimbeyli","Sarıçam","Seyhan","Tufanbeyli","Yumurtalık","Yüreğir"],
  "Adıyaman":        ["All Cities","Merkez","Besni","Çelikhan","Gerger","Gölbaşı","Kâhta","Samsat","Sincik","Tut"],
  "Afyonkarahisar":  ["All Cities","Merkez","Başmakçı","Bayat","Bolvadin","Çay","Çobanlar","Dazkırı","Dinar","Emirdağ","Evciler","Hocalar","İhsaniye","İscehisar","Kızılören","Sandıklı","Sinanpaşa","Sultandağı","Şuhut"],
  "Ağrı":            ["All Cities","Merkez","Diyadin","Doğubayazıt","Eleşkirt","Hamur","Patnos","Taşlıçay","Tutak"],
  "Amasya":          ["All Cities","Merkez","Göynücek","Gümüşhacıköy","Hamamözü","Merzifon","Suluova","Taşova"],
  "Ankara":          ["All Cities","Akyurt","Altındağ","Ayaş","Bala","Beypazarı","Çamlıdere","Çankaya","Çubuk","Elmadağ","Etimesgut","Evren","Gölbaşı","Güdül","Haymana","Kahramankazan","Kalecik","Keçiören","Kızılcahamam","Mamak","Nallıhan","Polatlı","Pursaklar","Sincan","Şereflikoçhisar","Yenimahalle"],
  "Antalya":         ["All Cities","Akseki","Aksu","Alanya","Demre","Döşemealtı","Elmalı","Finike","Gazipaşa","Gündoğmuş","İbradı","Kaş","Kemer","Kepez","Konyaaltı","Korkuteli","Kumluca","Manavgat","Muratpaşa","Serik"],
  "Artvin":          ["All Cities","Merkez","Ardanuç","Arhavi","Borçka","Hopa","Kemalpaşa","Murgul","Şavşat","Yusufeli"],
  "Aydın":           ["All Cities","Efeler","Bozdoğan","Buharkent","Çine","Didim","Germencik","İncirliova","Karacasu","Karpuzlu","Koçarlı","Köşk","Kuşadası","Kuyucak","Nazilli","Söke","Sultanhisar","Yenipazar"],
  "Balıkesir":       ["All Cities","Altıeylül","Karesi","Ayvalık","Balya","Bandırma","Bigadiç","Burhaniye","Dursunbey","Edremit","Erdek","Gömeç","Gönen","Havran","İvrindi","Kepsut","Manyas","Marmara","Savaştepe","Sındırgı","Susurluk"],
  "Bilecik":         ["All Cities","Merkez","Bozüyük","Gölpazarı","İnhisar","Osmaneli","Pazaryeri","Söğüt","Yenipazar"],
  "Bingöl":          ["All Cities","Merkez","Adaklı","Genç","Karlıova","Kiğı","Solhan","Yayladere","Yedisu"],
  "Bitlis":          ["All Cities","Merkez","Adilcevaz","Ahlat","Güroymak","Hizan","Mutki","Tatvan"],
  "Bolu":            ["All Cities","Merkez","Dörtdivan","Gerede","Göynük","Kıbrıscık","Mengen","Mudurnu","Seben","Yeniçağa"],
  "Burdur":          ["All Cities","Merkez","Ağlasun","Altınyayla","Bucak","Çavdır","Çeltikçi","Gölhisar","Karamanlı","Kemer","Tefenni","Yeşilova"],
  "Bursa":           ["All Cities","Osmangazi","Nilüfer","Yıldırım","Büyükorhan","Gemlik","Gürsu","Harmancık","İnegöl","İznik","Karacabey","Keles","Kestel","Mudanya","Mustafakemalpaşa","Orhaneli","Orhangazi","Yenişehir"],
  "Çanakkale":       ["All Cities","Merkez","Ayvacık","Bayramiç","Biga","Bozcaada","Çan","Eceabat","Ezine","Gelibolu","Gökçeada","Lapseki","Yenice"],
  "Çankırı":         ["All Cities","Merkez","Atkaracalar","Bayramören","Çerkeş","Eldivan","Ilgaz","Kızılırmak","Korgun","Kurşunlu","Orta","Şabanözü","Yapraklı"],
  "Çorum":           ["All Cities","Merkez","Alaca","Bayat","Boğazkale","Dodurga","İskilip","Kargı","Laçin","Mecitözü","Oğuzlar","Ortaköy","Osmancık","Sungurlu","Uğurludağ"],
  "Denizli":         ["All Cities","Merkezefendi","Pamukkale","Acıpayam","Babadağ","Baklan","Bekilli","Beyağaç","Bozkurt","Buldan","Çal","Çameli","Çardak","Çivril","Güney","Honaz","Kale","Sarayköy","Serinhisar","Tavas"],
  "Diyarbakır":      ["All Cities","Bağlar","Kayapınar","Sur","Yenişehir","Bismil","Çermik","Çınar","Çüngüş","Dicle","Eğil","Ergani","Hani","Hazro","Kocaköy","Kulp","Lice","Silvan"],
  "Edirne":          ["All Cities","Merkez","Enez","Havsa","İpsala","Keşan","Lalapaşa","Meriç","Süloğlu","Uzunköprü"],
  "Elazığ":          ["All Cities","Merkez","Ağın","Alacakaya","Arıcak","Baskil","Karakoçan","Keban","Kovancılar","Maden","Palu","Sivrice"],
  "Erzincan":        ["All Cities","Merkez","Çayırlı","İliç","Kemah","Kemaliye","Otlukbeli","Refahiye","Tercan","Üzümlü"],
  "Erzurum":         ["All Cities","Yakutiye","Palandöken","Aziziye","Aşkale","Çat","Hınıs","Horasan","İspir","Karaçoban","Karayazı","Köprüköy","Narman","Oltu","Olur","Pasinler","Pazaryolu","Şenkaya","Tekman","Tortum","Uzundere"],
  "Eskişehir":       ["All Cities","Odunpazarı","Tepebaşı","Alpu","Beylikova","Çifteler","Günyüzü","Han","İnönü","Mahmudiye","Mihalgazi","Mihalıççık","Sarıcakaya","Seyitgazi","Sivrihisar"],
  "Gaziantep":       ["All Cities","Şahinbey","Şehitkamil","Araban","İslahiye","Karkamış","Nizip","Nurdağı","Oğuzeli","Yavuzeli"],
  "Giresun":         ["All Cities","Merkez","Alucra","Bulancak","Çamoluk","Çanakçı","Dereli","Doğankent","Espiye","Eynesil","Görele","Güce","Keşap","Piraziz","Şebinkarahisar","Tirebolu","Yağlıdere"],
  "Gümüşhane":       ["All Cities","Merkez","Kelkit","Köse","Kürtün","Şiran","Torul"],
  "Hakkari":         ["All Cities","Merkez","Çukurca","Derecik","Şemdinli","Yüksekova"],
  "Hatay":           ["All Cities","Antakya","Defne","İskenderun","Altınözü","Arsuz","Belen","Dörtyol","Erzin","Hassa","Kırıkhan","Kumlu","Payas","Reyhanlı","Samandağ","Yayladağı"],
  "Isparta":         ["All Cities","Merkez","Aksu","Atabey","Eğirdir","Gelendost","Gönen","Keçiborlu","Senirkent","Sütçüler","Şarkikaraağaç","Uluborlu","Yalvaç","Yenişarbademli"],
  "Mersin":          ["All Cities","Akdeniz","Mezitli","Toroslar","Yenişehir","Anamur","Aydıncık","Bozyazı","Çamlıyayla","Erdemli","Gülnar","Mut","Silifke","Tarsus"],
  "İstanbul":        ["All Cities","Adalar","Arnavutköy","Ataşehir","Avcılar","Bağcılar","Bahçelievler","Bakırköy","Başakşehir","Bayrampaşa","Beşiktaş","Beykoz","Beylikdüzü","Beyoğlu","Büyükçekmece","Çatalca","Çekmeköy","Esenler","Esenyurt","Eyüpsultan","Fatih","Gaziosmanpaşa","Güngören","Kadıköy","Kağıthane","Kartal","Küçükçekmece","Maltepe","Pendik","Sancaktepe","Sarıyer","Silivri","Sultanbeyli","Sultangazi","Şile","Şişli","Tuzla","Ümraniye","Üsküdar","Zeytinburnu"],
  "İzmir":           ["All Cities","Aliağa","Balçova","Bayındır","Bayraklı","Bergama","Beydağ","Bornova","Buca","Çeşme","Çiğli","Dikili","Foça","Gaziemir","Güzelbahçe","Karabağlar","Karaburun","Karşıyaka","Kemalpaşa","Kınık","Kiraz","Konak","Menderes","Menemen","Narlıdere","Ödemiş","Seferihisar","Selçuk","Tire","Torbalı","Urla"],
  "Kars":            ["All Cities","Merkez","Akyaka","Arpaçay","Digor","Kağızman","Sarıkamış","Selim","Susuz"],
  "Kastamonu":       ["All Cities","Merkez","Abana","Ağlı","Araç","Azdavay","Bozkurt","Cide","Çatalzeytin","Daday","Devrekani","Doğanyurt","Hanönü","İhsangazi","İnebolu","Küre","Pınarbaşı","Seydiler","Şenpazar","Taşköprü","Tosya"],
  "Kayseri":         ["All Cities","Kocasinan","Melikgazi","Talas","Akkışla","Bünyan","Develi","Felahiye","Hacılar","İncesu","Özvatan","Pınarbaşı","Sarıoğlan","Sarız","Tomarza","Yahyalı","Yeşilhisar"],
  "Kırklareli":      ["All Cities","Merkez","Babaeski","Demirköy","Kofçaz","Lüleburgaz","Pehlivanköy","Pınarhisar","Vize"],
  "Kırşehir":        ["All Cities","Merkez","Akçakent","Akpınar","Boztepe","Çiçekdağı","Kaman","Mucur"],
  "Kocaeli":         ["All Cities","İzmit","Gebze","Darıca","Gölcük","Körfez","Başiskele","Çayırova","Derince","Dilovası","Kandıra","Karamürsel","Kartepe"],
  "Konya":           ["All Cities","Selçuklu","Meram","Karatay","Ahırlı","Akören","Akşehir","Altınekin","Beyşehir","Bozkır","Cihanbeyli","Çeltik","Çumra","Derbent","Derebucak","Doğanhisar","Emirgazi","Ereğli","Güneysınır","Hadim","Halkapınar","Hüyük","Ilgın","Kadınhanı","Karapınar","Kulu","Sarayönü","Seydişehir","Taşkent","Tuzlukçu","Yalıhüyük","Yunak"],
  "Kütahya":         ["All Cities","Merkez","Altıntaş","Aslanapa","Çavdarhisar","Domaniç","Dumlupınar","Emet","Gediz","Hisarcık","Pazarlar","Simav","Şaphane","Tavşanlı"],
  "Malatya":         ["All Cities","Battalgazi","Yeşilyurt","Akçadağ","Arapgir","Arguvan","Darende","Doğanşehir","Doğanyol","Hekimhan","Kale","Kuluncak","Pütürge","Yazıhan"],
  "Manisa":          ["All Cities","Şehzadeler","Yunusemre","Ahmetli","Akhisar","Alaşehir","Demirci","Gölmarmara","Gördes","Kırkağaç","Köprübaşı","Kula","Salihli","Sarıgöl","Saruhanlı","Selendi","Soma","Turgutlu"],
  "Kahramanmaraş":   ["All Cities","Dulkadiroğlu","Onikişubat","Afşin","Andırın","Çağlayancerit","Ekinözü","Elbistan","Göksun","Nurhak","Pazarcık","Türkoğlu"],
  "Mardin":          ["All Cities","Artuklu","Dargeçit","Derik","Kızıltepe","Mazıdağı","Midyat","Nusaybin","Ömerli","Savur","Yeşilli"],
  "Muğla":           ["All Cities","Menteşe","Bodrum","Dalaman","Datça","Fethiye","Kavaklıdere","Köyceğiz","Marmaris","Milas","Ortaca","Seydikemer","Ula","Yatağan"],
  "Muş":             ["All Cities","Merkez","Bulanık","Hasköy","Korkut","Malazgirt","Varto"],
  "Nevşehir":        ["All Cities","Merkez","Acıgöl","Avanos","Derinkuyu","Gülşehir","Hacıbektaş","Kozaklı","Ürgüp"],
  "Niğde":           ["All Cities","Merkez","Altunhisar","Bor","Çamardı","Çiftlik","Ulukışla"],
  "Ordu":            ["All Cities","Altınordu","Akkuş","Aybastı","Çamaş","Çatalpınar","Çaybaşı","Fatsa","Gölköy","Gülyalı","Gürgentepe","İkizce","Kabadüz","Kabataş","Korgan","Kumru","Mesudiye","Perşembe","Ulubey","Ünye"],
  "Rize":            ["All Cities","Merkez","Ardeşen","Çamlıhemşin","Çayeli","Derepazarı","Fındıklı","Güneysu","Hemşin","İkizdere","İyidere","Kalkandere","Pazar"],
  "Sakarya":         ["All Cities","Adapazarı","Serdivan","Erenler","Akyazı","Arifiye","Ferizli","Geyve","Hendek","Karapürçek","Karasu","Kaynarca","Kocaali","Pamukova","Sapanca","Söğütlü","Taraklı"],
  "Samsun":          ["All Cities","Atakum","İlkadım","Canik","Tekkeköy","19 Mayıs","Alaçam","Asarcık","Ayvacık","Bafra","Çarşamba","Havza","Kavak","Ladik","Salıpazarı","Terme","Vezirköprü","Yakakent"],
  "Siirt":           ["All Cities","Merkez","Baykan","Eruh","Kurtalan","Pervari","Şirvan","Tillo"],
  "Sinop":           ["All Cities","Merkez","Ayancık","Boyabat","Dikmen","Durağan","Erfelek","Gerze","Saraydüzü","Türkeli"],
  "Sivas":           ["All Cities","Merkez","Akıncılar","Altınyayla","Divriği","Doğanşar","Gemerek","Gölova","Gürün","Hafik","İmranlı","Kangal","Koyulhisar","Suşehri","Şarkışla","Ulaş","Yıldızeli","Zara"],
  "Tekirdağ":        ["All Cities","Süleymanpaşa","Çorlu","Çerkezköy","Ergene","Kapaklı","Hayrabolu","Malkara","Marmaraereğlisi","Muratlı","Saray","Şarköy"],
  "Tokat":           ["All Cities","Merkez","Almus","Artova","Başçiftlik","Erbaa","Niksar","Pazar","Reşadiye","Sulusaray","Turhal","Yeşilyurt","Zile"],
  "Trabzon":         ["All Cities","Ortahisar","Akçaabat","Araklı","Arsin","Beşikdüzü","Çarşıbaşı","Çaykara","Dernekpazarı","Düzköy","Hayrat","Köprübaşı","Maçka","Of","Sürmene","Şalpazarı","Tonya","Vakfıkebir","Yomra"],
  "Tunceli":         ["All Cities","Merkez","Çemişgezek","Hozat","Mazgirt","Nazımiye","Ovacık","Pertek","Pülümür"],
  "Şanlıurfa":       ["All Cities","Eyyübiye","Haliliye","Karaköprü","Akçakale","Birecik","Bozova","Ceylanpınar","Halfeti","Harran","Hilvan","Siverek","Suruç","Viranşehir"],
  "Uşak":            ["All Cities","Merkez","Banaz","Eşme","Karahallı","Sivaslı","Ulubey"],
  "Van":             ["All Cities","İpekyolu","Tuşba","Edremit","Bahçesaray","Başkale","Çaldıran","Çatak","Erciş","Gevaş","Gürpınar","Muradiye","Özalp","Saray"],
  "Yozgat":          ["All Cities","Merkez","Akdağmadeni","Aydıncık","Boğazlıyan","Çandır","Çayıralan","Çekerek","Kadışehri","Saraykent","Sarıkaya","Sorgun","Şefaatli","Yenifakılı","Yerköy"],
  "Zonguldak":       ["All Cities","Merkez","Alaplı","Çaycuma","Devrek","Ereğli","Gökçebey","Kilimli","Kozlu"],
  "Aksaray":         ["All Cities","Merkez","Ağaçören","Eskil","Gülağaç","Güzelyurt","Ortaköy","Sarıyahşi","Sultanhanı"],
  "Bayburt":         ["All Cities","Merkez","Aydıntepe","Demirözü"],
  "Karaman":         ["All Cities","Merkez","Ayrancı","Başyayla","Ermenek","Kazımkarabekir","Sarıveliler"],
  "Kırıkkale":       ["All Cities","Merkez","Bahşılı","Balışeyh","Çelebi","Delice","Karakeçili","Keskin","Sulakyurt","Yahşihan"],
  "Batman":          ["All Cities","Merkez","Beşiri","Gercüş","Hasankeyf","Kozluk","Sason"],
  "Şırnak":          ["All Cities","Merkez","Beytüşşebap","Cizre","Güçlükonak","İdil","Silopi","Uludere"],
  "Bartın":          ["All Cities","Merkez","Amasra","Kurucaşile","Ulus"],
  "Ardahan":         ["All Cities","Merkez","Çıldır","Damal","Göle","Hanak","Posof"],
  "Iğdır":           ["All Cities","Merkez","Aralık","Karakoyunlu","Tuzluca"],
  "Yalova":          ["All Cities","Merkez","Altınova","Armutlu","Çınarcık","Çiftlikköy","Termal"],
  "Karabük":         ["All Cities","Merkez","Eflani","Eskipazar","Ovacık","Safranbolu","Yenice"],
  "Kilis":           ["All Cities","Merkez","Elbeyli","Musabeyli","Polateli"],
  "Osmaniye":        ["All Cities","Merkez","Bahçe","Düziçi","Hasanbeyli","Kadirli","Sumbas","Toprakkale"],
  "Düzce":           ["All Cities","Merkez","Akçakoca","Cumayeri","Çilimli","Gölyaka","Gümüşova","Kaynaşlı","Yığılca"],

  // ── Cyprus (kuzey ilçeleri) ──
  "Lefkoşa":         ["All Cities","Lefkoşa Merkez","Surlariçi","Arabahmet","Selimiye","Yenicami","Abdi Çavuş","Ayluka","Çağlayan","Dumlupınar","Göçmenköy","Hürriyet","İncirli","Karamanzade","Kermiya","Kızılbaş","Köşklüçiftlik","Küçük Kaymaklı","Kumsal","Marmara","Ortaköy","Taşkınköy","Yenişehir","Aydemet","Gelibolu","Metehan","Hamitköy","Haspolat","Gönyeli","Yenikent","Alayköy","Kanlıköy","Değirmenlik","Dikmen","Gökhan","Meriç","Akıncılar","Balıkesir","Türkeli","Yılmazköy","Minareliköy","Demirhan","Düzova","Cihangir","Gaziköy","Görneç","Kalavaç","Kırıkkale","Yiğitler","Beyköy","Şirinevler","Ercan"],
  "Gazimağusa":      ["All Cities","Gazimağusa Merkez","Suriçi","Sakarya","Baykal","Karakol","Çanakkale","Maraş","Tuzla","Mutluyaka","Yeniboğaziçi","Akdoğan","Beyarmudu","Pile","Geçitkale","Serdarlı","Vadili","İnönü","Dörtyol","Alaniçi","Paşaköy","Çayönü","Turunçlu","Yıldırım","Güvercinlik","Mormenekşe","Akova","Aslanköy","Atlılar","Ergazi","Gaziler","Kurudere","Muratağa","Sandallar","Tatlısu Yolu","Yenişehir Mağusa","Ötüken","Beyköy Mağusa"],
  "Girne":           ["All Cities","Girne Merkez","Karaoğlanoğlu","Alsancak","Lapta","Karşıyaka","Çamlıbel","Karaman","Zeytinlik","Edremit","Doğanköy","Ozanköy","Bellapais","Çatalköy","Arapköy","Esentepe","Karakum","Ilgaz","Kayalar","Akdeniz","Taşkent","Ağırdağ","Alemdağ","Bahçeli","Çınarlı","Geçitköy","Hisarköy","Karaağaç","Kozan","Kozanköy","Malatya","Mevlevi","Pınarbaşı","Sadrazamköy","Tepebaşı","Yayla","Yeşiltepe","Karpaşa","Boğazköy","Dağyolu","Karşıyaka Sahil","Lapta Sahil","Alsancak Sahil"],
  "Güzelyurt":       ["All Cities","Güzelyurt Merkez","Zümrütköy","Bostancı","Kalkanlı","Aydınköy","Yayla","Akçay","Şahinler","Serhatköy","Doğancı","Gayretköy","Güneşköy","Yuvacık","Mevlevi Güzelyurt","Aşağı Bostancı","Kırıkkale Güzelyurt"],
  "İskele":          ["All Cities","İskele Merkez","Boğaz","Bafra","Kumyalı","Ziyamet","Mehmetçik","Büyükkonuk","Yeni Erenköy","Dipkarpaz","Sipahi","Avtepe","Kaplıca","Balalan","Yarköy","Kurtuluş","Tuzluca","Çayırova","Adaçay","Ardahan","Esenköy","Gelincik","Kilitkaya","Kuruova","Mersinlik","Tatlısu","Topçuköy","Turnalar","Zeybekköy","Altınova","Bahçeli İskele","Derince","Ergazi İskele","Karpaz","Sazlıköy","Yedikonuk","Yenierenköy Sahil","Long Beach","Bogaz Sahil"],
  "Lefke":           ["All Cities","Lefke Merkez","Gemikonağı","Yeşilyurt","Gaziveren","Yedidalga","Bağlıköy","Cengizköy","Denizli","Taşpınar","Çamlıköy","Doğancı Lefke","Elmalı","Yeşilırmak","Aplıç","Karadağ"],

  // ── BAE / UAE — emirates and their communities ──
  "Dubai":           ["All Cities","Al Barari","Al Barsha","Al Barsha Heights (Tecom)","Al Barsha South","Al Furjan","Al Garhoud","Al Jaddaf","Al Jafiliya","Al Karama","Al Khawaneej","Al Mankhool","Al Mizhar","Al Muraqqabat","Al Nahda","Al Quoz","Al Qusais","Al Rashidiya","Al Rigga","Al Safa","Al Satwa","Al Sufouh","Al Twar","Al Warqa","Al Wasl","Arabian Ranches","Arjan","Bluewaters Island","Bur Dubai","Business Bay","City Walk","Culture Village","Damac Hills","Deira","Discovery Gardens","Downtown Dubai","Dubai Creek Harbour","Dubai Design District (d3)","Dubai Festival City","Dubai Healthcare City","Dubai Hills Estate","Dubai Internet City","Dubai Investment Park (DIP)","Dubai Marina","Dubai Media City","Dubai Production City (IMPZ)","Dubai Silicon Oasis","Dubai South","Dubai Sports City","Dubai Studio City","DIFC","Emirates Hills","Expo City","Green Community","Hatta","International City","Jebel Ali","Jumeirah","Jumeirah Beach Residence (JBR)","Jumeirah Golf Estates","Jumeirah Islands","Jumeirah Lake Towers (JLT)","Jumeirah Park","Jumeirah Village Circle (JVC)","Jumeirah Village Triangle (JVT)","Knowledge Village","La Mer","Living Legends","Meydan","Mirdif","Motor City","Mudon","Muhaisnah","Nad Al Sheba","Nadd Al Hamar","Oud Metha","Palm Jumeirah","Pearl Jumeirah","Port Saeed","Ras Al Khor","Remraam","Sheikh Zayed Road","The Greens","The Lakes","The Meadows","The Springs","The Villa","The Views","Town Square","Umm Al Sheif","Umm Ramool","Umm Suqeim","Warsan","World Trade Centre","Za'abeel"],
  "Abu Dhabi":       ["All Cities","Al Bahia","Al Bateen","Al Danah","Al Falah","Al Ghadeer","Al Karamah","Al Khalidiyah","Al Manaseer","Al Maryah Island","Al Maqta","Al Mina","Al Mushrif","Al Muroor","Al Nahyan","Al Raha Beach","Al Raha Gardens","Al Rahba","Al Reef","Al Reem Island","Al Samha","Al Shahama","Al Shamkha","Al Wahda","Al Zahiyah","Baniyas","Bain Al Jessrain","Corniche","Hydra Village","Khalifa City","Madinat Zayed","Masdar City","Mohammed Bin Zayed City","Mussafah","Saadiyat Island","Shakhbout City","Tourist Club Area","Yas Island","Al Ain","Al Jimi","Al Muwaiji","Al Mutarad","Al Towayya","Hili","Zakher","Al Yahar","Ruwais","Ghayathi","Liwa","Delma Island","Sila"],
  "Sharjah":         ["All Cities","Abu Shagara","Al Azra","Al Butina","Al Fisht","Al Gharb","Al Ghuwair","Al Heerah","Al Khan","Al Layyah","Al Majaz","Al Mamzar","Al Mujarrah","Al Nahda","Al Nud","Al Qasimia","Al Qulayaah","Al Rahmaniya","Al Ramtha","Al Riqqa","Al Shahba","Al Suyoh","Al Taawun","Al Tai","Al Yarmook","Al Zahia","Halwan","Industrial Area","Maysaloon","Muwaileh","Rolla","Samnan","Tilal City","University City","Al Dhaid","Al Badayer","Dibba Al Hisn","Kalba","Khor Fakkan","Mleiha"],
  "Ajman":           ["All Cities","Ajman Downtown","Ajman Corniche","Al Amerah","Al Bustan","Al Hamidiyah","Al Helio","Al Jurf","Al Mowaihat","Al Nakhil","Al Nuaimiyah","Al Rashidiya","Al Rawda","Al Rumailah","Al Sawan","Al Tallah","Al Yasmeen","Al Zahra","Emirates City","Manama","Masfout"],
  "Ras Al Khaimah":  ["All Cities","RAK City","Al Dhait","Al Ghail","Al Hamra Village","Al Jazirah Al Hamra","Al Mairid","Al Marjan Island","Al Nakheel","Al Qusaidat","Al Rams","Al Uraibi","Digdaga","Ghalilah","Julphar","Khatt","Khuzam","Mina Al Arab","Sha'am","Masafi"],
  "Fujairah":        ["All Cities","Fujairah City","Al Aqah","Al Bidiyah","Al Faseel","Al Gurfa","Al Hilal City","Al Taween","Dibba Al Fujairah","Merashid","Mirbah","Murbah","Qidfa","Sakamkam","Masafi"],
  "Umm Al Quwain":   ["All Cities","UAQ City","Al Dar Al Baida","Al Haditha","Al Humrah","Al Maidan","Al Raas","Al Rafaah","Al Ramlah","Al Riqqah","Al Salamah","Falaj Al Mualla","Khor Al Beidah"],

  // ── Cyprus (güney ilçeleri) ──
  "Nicosia":             ["All Cities","Nicosia Centre","Strovolos","Lakatamia","Aglantzia","Latsia","Engomi","Ayios Dometios","Kaimakli","Pallouriotissa","Dali","Tseri","Geri","Anthoupoli","Archangelos","Makedonitissa","Kokkinotrimithia","Astromeritis","Peristerona","Ergates","Politiko","Deftera","Kato Deftera","Psimolofou","Pera Chorio","Nisou","Alambra","Lympia","Idalion","Agioi Trimithias","Palaiometocho","Mammari","Akaki","Meniko","Malounta","Klirou","Agrokipia","Mitsero","Kambia","Kapedes","Analiontas","Lythrodontas","Mathiatis","Sia","Agia Varvara","Kotsiatis","Episkopeio","Tymvou","Margi","Potamia","Kalo Chorio Orinis","Farmakas","Gourri","Fikardou","Palaichori","Askas","Alona","Platanistasa","Polystypos","Lagoudera","Saranti","Orounta","Vyzakia","Nikitari","Agia Marina Xyliatou","Xyliatos","Kato Moni","Agios Epifanios"],
  "Limassol":            ["All Cities","Limassol Centre","Germasogeia","Agios Athanasios","Mesa Geitonia","Ypsonas","Kato Polemidia","Pano Polemidia","Agios Tychonas","Mouttagiaka","Parekklisia","Pyrgos","Monagroulli","Pentakomo","Kellaki","Akrotiri","Kolossi","Erimi","Episkopi","Trachoni","Asomatos","Fasoula","Palodia","Spitali","Agios Amvrosios","Laneia","Silikou","Doros","Apesia","Limnatis","Alassa","Agros","Kyperounta","Pelendri","Potamitissa","Zoopigi","Kalo Chorio Limassol","Arakapas","Eptagoneia","Akapnou","Vasa","Omodos","Koilani","Pera Pedi","Mandria Limassol","Platres","Foini","Trimiklini","Moniatis","Saittas","Pissouri","Avdimou","Paramali","Sotira Limassol","Kantou","Souni","Zanakia","Prastio","Dierona","Zakaki","Moni","Fasouri","Kivides","Malia","Arsos","Anogyra"],
  "Larnaca":             ["All Cities","Larnaca Centre","Aradippou","Livadia","Oroklini","Dromolaxia","Meneou","Kiti","Pervolia","Athienou","Xylofagou","Xylotymbou","Pyla","Mazotos","Alethriko","Kornos","Pano Lefkara","Kato Lefkara","Tersefanou","Kalo Chorio Larnaca","Softades","Anglisides","Kophinou","Menogeia","Psevdas","Klavdia","Alaminos","Maroni","Zygi","Kalavasos","Tochni","Choirokoitia","Vavla","Kato Drys","Skarinou","Agios Theodoros","Melini","Odou","Ora","Delikipos","Agia Anna","Avdellero","Troulloi","Pyrga","Kellia","Aplanta","Mosfiloti","Kalo Chorio Kapouti","Vavatsinia","Lageia","Mari","Petrofani","Avgorou Road"],
  "Paphos":              ["All Cities","Paphos Centre","Kato Paphos","Chloraka","Emba","Kissonerga","Peyia","Coral Bay","Tala","Tremithousa","Mesogi","Konia","Geroskipou","Timi","Polis Chrysochous","Latchi","Argaka","Pomos","Kathikas","Tsada","Anarita","Acheleia","Mandria Paphos","Kouklia","Nikoklia","Agia Marina Chrysochous","Drouseia","Ineia","Kritou Terra","Lysos","Steni","Stroumbi","Polemi","Kallepia","Letymbou","Akoursos","Miliou","Neo Chorio","Prodromi","Goudi","Chrysochou","Peristerona Paphos","Pano Arodes","Kato Arodes","Fyti","Simou","Lasa","Kannaviou","Panagia","Statos","Pentalia","Salamiou","Nata","Mamonia","Choletria","Axylou","Armou","Marathounta","Episkopi Paphos","Choulou","Kelokedara","Kedares","Praitori","Agios Georgios","Kissonerga Beach"],
  "Famagusta":           ["All Cities","Ayia Napa","Paralimni","Protaras","Deryneia","Sotira","Liopetri","Frenaros","Avgorou","Achna","Vrysoulles","Kapparis","Pernera","Agia Thekla","Cape Greco","Dasaki Achnas","Acheritou","Agia Triada","Fig Tree Bay","Nissi Beach","Konnos Bay","Xylophagou Coast","Ormideia","Xylotymbou East"],

  // ── Katar ──
  "Doha":                ["All Cities","West Bay","Al Dafna","Msheireb","Souq Waqif","Al Bidda","Al Sadd","Fereej Bin Mahmoud","Al Mansoura","Najma","Umm Ghuwailina","Al Hilal","Old Airport","Nuaija","Abu Hamour","Ain Khaled","Al Waab","Al Muntazah","Madinat Khalifa","Duhail","Al Markhiya","Onaiza","Al Khulaifat","Ras Abu Aboud","Al Thumama","Mesaimeer","Barwa City","Al Gharrafa","Bin Omran","Al Rumaila","Al Messila"],
  "Al Rayyan":           ["All Cities","Al Rayyan City","New Al Rayyan","Education City","Muaither","Al Aziziya","Al Luqta","Al Shagub","Baaya","Fereej Al Soudan","Al Sailiya","Al Wajba","Al Gharrafa South","Rawdat Egdaim","Al Themaid","Bu Sidra"],
  "Al Wakrah":           ["All Cities","Al Wakrah City","Al Wukair","Mesaieed","Barwa Al Baraha","Ezdan Village","Al Mashaf","Abu Sidra Wakrah"],
  "Umm Salal":           ["All Cities","Umm Salal Mohammed","Umm Salal Ali","Al Kharaitiyat","Izghawa","Bu Fasseela","Al Kheesa South"],
  "Al Daayen":           ["All Cities","Lusail","Wadi Al Banat","Al Kheesa","Rawdat Al Hamama","Umm Qarn","Leabaib","Al Ebb","Jery Al Samur","Al Sakhama"],
  "Al Khor":             ["All Cities","Al Khor City","Al Thakhira","Ras Laffan","Simaisma","Al Dhakira Coast"],
  "Al Shamal":           ["All Cities","Madinat Al Shamal","Al Ruwais","Abu Dhalouf","Fuwayrit","Al Ghariyah","Ain Sinan"],
  "Al Shahaniya":        ["All Cities","Al Shahaniya City","Dukhan","Al Jemailiya","Umm Bab","Al Nasraniya","Al Utouriya"],

  // ── Kuveyt ──
  "Al Asimah":           ["All Cities","Kuwait City","Sharq","Dasman","Bneid Al Qar","Abdullah Al Salem","Adailiya","Faiha","Khaldiya","Kaifan","Mansouriya","Nuzha","Qadsiya","Qortuba","Rawda","Shamiya","Shuwaikh","Surra","Yarmouk","Daiya","Granada","Sulaibikhat","Jaber Al Ahmad","Doha Kuwait","Nahdha"],
  "Hawalli":             ["All Cities","Hawalli","Salmiya","Jabriya","Bayan","Mishref","Salwa","Rumaithiya","Shaab","Maidan Hawalli","Mubarak Al Abdullah","Zahra","Hitteen","Siddeeq","Shuhada","Al Bidea","Anjafa"],
  "Farwaniya":           ["All Cities","Farwaniya","Jleeb Al Shuyoukh","Khaitan","Ardiya","Rabiya","Andalous","Rehab","Firdous","Ishbiliya","Omariya","Riggae","Abdullah Al Mubarak","Sabah Al Nasser","Abraq Khaitan","Dajeej"],
  "Mubarak Al-Kabeer":   ["All Cities","Mubarak Al Kabeer","Abu Fatira","Abu Hasaniya","Adan","Qurain","Sabah Al Salem","Messila","Fnaitees","Al Qusour","Sabhan","Wista"],
  "Ahmadi":              ["All Cities","Ahmadi","Fahaheel","Mangaf","Abu Halifa","Mahboula","Fintas","Egaila","Sabahiya","Riqqa","Dhaher","Wafra","Zour","Khiran","Sabah Al Ahmad City","Ali Sabah Al Salem","Julaia"],
  "Jahra":               ["All Cities","Jahra","Saad Al Abdullah","Naeem","Nasseem","Oyoun","Qasr","Waha","Taima","Amghara","Sulaibiya","Abdali","Kabd","Salmi"],

  // ── Bahreyn ──
  "Manama":              ["All Cities","Manama Centre","Adliya","Juffair","Hoora","Gudaibiya","Seef","Salmaniya","Sanabis","Zinj","Mahooz","Umm Al Hassam","Karbabad","Jidhafs","Bilad Al Qadeem","Ras Rumman","Diplomatic Area","Bahrain Bay","Bu Ghazal","Al Qufool"],
  "Muharraq":            ["All Cities","Muharraq City","Amwaj Islands","Busaiteen","Hidd","Arad","Galali","Dair","Samaheej","Diyar Al Muharraq","Halat Bu Maher"],
  "Northern Bahrain":    ["All Cities","Hamad Town","Budaiya","Saar","Janabiya","Barbar","Diraz","Bani Jamra","Karrana","Jasra","Malkiya","Damistan","Northern City","Sadad","Al Qadam","Duraz","Abu Saiba"],
  "Southern Bahrain":    ["All Cities","Riffa","East Riffa","West Riffa","Isa Town","Sitra","Zallaq","Awali","Askar","Jaw","Durrat Al Bahrain","Sakhir","Riffa Views","Hawar Islands"],

  // ── Umman ──
  "Muscat":              ["All Cities","Muttrah","Ruwi","Qurum","Al Khuwair","Ghubrah","Azaiba","Bausher","Seeb","Al Mawaleh","Al Hail","Mabela","Amerat","Quriyat","Madinat Al Sultan Qaboos","Shatti Al Qurum","Wadi Kabir","Darsait","Wattayah","Al Ansab","Misfah","Old Muscat","Al Khoud"],
  "Dhofar":              ["All Cities","Salalah","Taqah","Mirbat","Rakhyut","Thumrait","Dalkut","Sadah","Shalim","Al Mazyona","Muqshin","Awqad","Saada"],
  "Al Batinah North":    ["All Cities","Sohar","Shinas","Liwa","Saham","Al Khaburah","Suwaiq","Falaj Al Qabail"],
  "Al Batinah South":    ["All Cities","Rustaq","Al Awabi","Nakhal","Wadi Al Maawil","Barka","Al Musanaah","Naaman"],
  "Al Dakhiliyah":       ["All Cities","Nizwa","Bahla","Manah","Al Hamra","Adam","Izki","Samail","Bidbid","Birkat Al Mouz","Jabal Akhdar"],
  "Al Sharqiyah North":  ["All Cities","Ibra","Al Mudhaibi","Bidiyah","Al Qabil","Wadi Bani Khalid","Dima Wa Al Taeen","Sinaw"],
  "Al Sharqiyah South":  ["All Cities","Sur","Al Kamil Wal Wafi","Jalan Bani Bu Hassan","Jalan Bani Bu Ali","Masirah","Ras Al Hadd","Ras Al Jinz"],
  "Al Dhahirah":         ["All Cities","Ibri","Yanqul","Dhank"],
  "Al Buraimi":          ["All Cities","Al Buraimi City","Mahdah","Al Sunaynah"],
  "Al Wusta":            ["All Cities","Haima","Duqm","Mahout","Al Jazer"],
  "Musandam":            ["All Cities","Khasab","Bukha","Daba","Madha"],

  // ── Suudi Arabistan ──
  "Riyadh":              ["All Cities","Riyadh City","Olaya","Al Malaz","Al Nakheel","Diplomatic Quarter","Al Muruj","Hittin","Al Yasmin","Al Narjis","Irqah","Al Aqiq","King Abdullah Financial District","Al Rawdah","Al Sulaymaniyah","Al Wurud","Al Sahafah","Qurtubah","Al Izdihar","Diriyah","Al Kharj","Al Majmaah","Al Zulfi","Wadi Al Dawasir","Dawadmi","Huraymila","Thadiq","Afif"],
  "Makkah":              ["All Cities","Makkah City","Al Aziziyah","Al Shawqiyah","Al Awali","Al Nuzha Makkah","Jeddah","Al Hamra","Al Rawdah Jeddah","Al Salamah","Al Shatie","Al Andalus","Al Naeem","Al Zahra","Obhur","Al Basateen","Al Faisaliyah","Al Balad","Al Marwah","Al Safa","Taif","Rabigh","Al Qunfudhah","Al Lith","Khulais","Turbah"],
  "Madinah":             ["All Cities","Madinah City","Central Haram Area","Quba","Al Aziziyah Madinah","Al Khalidiyah","Al Uyun","Yanbu","Badr","Al Ula","Khaybar","Mahd Al Dhahab","Al Henakiyah"],
  "Eastern Province":    ["All Cities","Dammam","Al Khobar","Dhahran","Qatif","Jubail","Al Ahsa","Hofuf","Ras Tanura","Abqaiq","Safwa","Saihat","Khafji","Hafar Al Batin","Nairyah","Al Uqair","Half Moon Bay"],
  "Asir":                ["All Cities","Abha","Khamis Mushait","Bisha","Mahayil","Rijal Almaa","Al Namas","Sarat Abidah","Tathleeth","Dhahran Al Janoub","Ahad Rufaidah"],
  "Tabuk":               ["All Cities","Tabuk City","Duba","Haql","Al Wajh","Umluj","Tayma","NEOM"],
  "Hail":                ["All Cities","Hail City","Baqaa","Al Ghazalah","Al Shinan","Mawqaq","Al Sulaimi"],
  "Northern Borders":    ["All Cities","Arar","Rafha","Turaif","Al Uwayqilah"],
  "Jazan":               ["All Cities","Jazan City","Sabya","Abu Arish","Samtah","Ahad Al Masarihah","Farasan","Baish","Al Darb"],
  "Najran":              ["All Cities","Najran City","Sharurah","Habuna","Yadamah","Badr Al Janoub","Thar"],
  "Al Bahah":            ["All Cities","Al Bahah City","Baljurashi","Al Mandaq","Al Aqiq Bahah","Qilwah","Al Makhwah","Al Qura"],
  "Al Jouf":             ["All Cities","Sakaka","Dumat Al Jandal","Qurayyat","Tabarjal"],
  "Qassim":              ["All Cities","Buraidah","Unaizah","Al Rass","Al Bukayriyah","Al Mithnab","Riyadh Al Khabra","Uyun Al Jiwa","Al Badayea","Al Asyah"],
};

// ─── PROVINCE COORDINATES (approximate centers, for geolocation matching) ───
const PROVINCE_COORDS = {
  // Türkiye
  "Adana":[37.00,35.32],"Adıyaman":[37.76,38.28],"Afyonkarahisar":[38.76,30.54],"Ağrı":[39.72,43.05],
  "Amasya":[40.65,35.83],"Ankara":[39.93,32.86],"Antalya":[36.90,30.71],"Artvin":[41.18,41.82],
  "Aydın":[37.85,27.85],"Balıkesir":[39.65,27.89],"Bilecik":[40.15,29.98],"Bingöl":[38.89,40.50],
  "Bitlis":[38.40,42.11],"Bolu":[40.74,31.61],"Burdur":[37.72,30.29],"Bursa":[40.18,29.07],
  "Çanakkale":[40.15,26.41],"Çankırı":[40.60,33.61],"Çorum":[40.55,34.95],"Denizli":[37.78,29.10],
  "Diyarbakır":[37.91,40.24],"Edirne":[41.68,26.56],"Elazığ":[38.68,39.22],"Erzincan":[39.75,39.49],
  "Erzurum":[39.90,41.27],"Eskişehir":[39.78,30.52],"Gaziantep":[37.07,37.38],"Giresun":[40.92,38.39],
  "Gümüşhane":[40.46,39.48],"Hakkari":[37.58,43.74],"Hatay":[36.40,36.35],"Isparta":[37.77,30.55],
  "Mersin":[36.81,34.64],"İstanbul":[41.01,28.98],"İzmir":[38.42,27.14],"Kars":[40.61,43.10],
  "Kastamonu":[41.39,33.78],"Kayseri":[38.73,35.49],"Kırklareli":[41.73,27.22],"Kırşehir":[39.15,34.16],
  "Kocaeli":[40.85,29.88],"Konya":[37.87,32.49],"Kütahya":[39.42,29.99],"Malatya":[38.36,38.32],
  "Manisa":[38.61,27.43],"Kahramanmaraş":[37.58,36.93],"Mardin":[37.31,40.74],"Muğla":[37.22,28.36],
  "Muş":[38.74,41.49],"Nevşehir":[38.62,34.71],"Niğde":[37.97,34.68],"Ordu":[40.98,37.88],
  "Rize":[41.02,40.52],"Sakarya":[40.78,30.40],"Samsun":[41.29,36.33],"Siirt":[37.93,41.94],
  "Sinop":[42.03,35.15],"Sivas":[39.75,37.02],"Tekirdağ":[40.98,27.51],"Tokat":[40.31,36.55],
  "Trabzon":[41.00,39.72],"Tunceli":[39.11,39.55],"Şanlıurfa":[37.16,38.79],"Uşak":[38.68,29.41],
  "Van":[38.49,43.38],"Yozgat":[39.82,34.81],"Zonguldak":[41.46,31.79],"Aksaray":[38.37,34.03],
  "Bayburt":[40.26,40.22],"Karaman":[37.18,33.22],"Kırıkkale":[39.84,33.51],"Batman":[37.88,41.13],
  "Şırnak":[37.52,42.46],"Bartın":[41.64,32.34],"Ardahan":[41.11,42.70],"Iğdır":[39.92,44.05],
  "Yalova":[40.65,29.27],"Karabük":[41.20,32.62],"Kilis":[36.72,37.12],"Osmaniye":[37.07,36.25],
  "Düzce":[40.84,31.16],
  // Cyprus — kuzey
  "Lefkoşa":[35.19,33.36],"Gazimağusa":[35.12,33.95],"Girne":[35.34,33.32],
  "Güzelyurt":[35.20,32.99],"İskele":[35.29,33.89],"Lefke":[35.11,32.85],
  // BAE
  "Dubai":[25.20,55.27],"Abu Dhabi":[24.45,54.38],"Sharjah":[25.35,55.40],
  "Ajman":[25.41,55.44],"Ras Al Khaimah":[25.79,55.94],"Fujairah":[25.12,56.33],"Umm Al Quwain":[25.57,55.55],

  // Cyprus — güney + Körfez
  "Nicosia":[35.17,33.36],"Limassol":[34.71,33.02],"Larnaca":[34.92,33.62],"Paphos":[34.78,32.42],
  "Famagusta":[35.02,33.98],"Doha":[25.29,51.53],"Al Rayyan":[25.29,51.42],"Al Wakrah":[25.17,51.60],
  "Umm Salal":[25.42,51.40],"Al Daayen":[25.58,51.48],"Al Khor":[25.68,51.50],"Al Shamal":[26.12,51.22],
  "Al Shahaniya":[25.38,51.18],"Al Asimah":[29.38,47.99],"Hawalli":[29.33,48.03],"Farwaniya":[29.28,47.96],
  "Mubarak Al-Kabeer":[29.20,48.07],"Ahmadi":[29.08,48.08],"Jahra":[29.34,47.66],"Manama":[26.22,50.58],
  "Muharraq":[26.26,50.62],"Northern Bahrain":[26.15,50.48],"Southern Bahrain":[26.03,50.55],"Muscat":[23.59,58.41],
  "Dhofar":[17.02,54.09],"Al Batinah North":[24.34,56.71],"Al Batinah South":[23.68,57.42],"Al Dakhiliyah":[22.93,57.53],
  "Al Sharqiyah North":[22.69,58.53],"Al Sharqiyah South":[22.57,59.53],"Al Dhahirah":[23.22,56.51],"Al Buraimi":[24.25,55.79],
  "Al Wusta":[19.96,56.28],"Musandam":[26.18,56.25],"Riyadh":[24.71,46.68],"Makkah":[21.39,39.86],
  "Madinah":[24.47,39.61],"Eastern Province":[26.42,50.09],"Asir":[18.22,42.51],"Tabuk":[28.38,36.57],
  "Hail":[27.52,41.69],"Northern Borders":[30.98,41.04],"Jazan":[16.89,42.57],"Najran":[17.49,44.13],
  "Al Bahah":[20.01,41.47],"Al Jouf":[29.97,40.20],"Qassim":[26.33,43.97],
};

// Haversine-ish nearest-province lookup (good enough at province scale)
function findNearestProvince(lat, lon) {
  let best = null, bestDist = Infinity;
  for (const [name, [plat, plon]] of Object.entries(PROVINCE_COORDS)) {
    const dLat = lat - plat, dLon = lon - plon;
    const dist = dLat * dLat + dLon * dLon; // squared distance is fine for comparison
    if (dist < bestDist) { bestDist = dist; best = name; }
  }
  return best;
}

function findCountryForProvince(province) {
  for (const [country, list] of Object.entries(PROVINCES)) {
    if (list.includes(province)) return country;
  }
  return null;
}

// ─── REGION DETECTION ───────────────────────────────────────────────────────
// Ziyaretçinin ülkesine göre dil ve ülke seçimi (COUNTRY_META.lang):
//   Türkiye → Türkçe,  Kıbrıs ve Körfez → İngilizce.
// Saat dilimi anında sonuç verir (ağ beklemeden ilk boyamada doğru dil),
// IP sorgusu sonradan doğrular — VPN ya da yanlış ayarlı saat dilimi için.
function countryFromTimezone() {
  try { return TZ_COUNTRY[Intl.DateTimeFormat().resolvedOptions().timeZone] || null; } catch (e) { return null; }
}

// Desteklenen bölge dışındaysa null → dil EN, ülke filtresi "All Countries".
const INITIAL_COUNTRY = countryFromTimezone();
const INITIAL_SETUP   = INITIAL_COUNTRY ? COUNTRY_META[INITIAL_COUNTRY] : null;
// Form varsayılanları: bölge tespit edilemediyse eski davranış (Türkiye/İstanbul) korunur.
const FORM_COUNTRY  = INITIAL_COUNTRY || "Türkiye";
const FORM_PROVINCE = INITIAL_SETUP ? INITIAL_SETUP.province : "İstanbul";
// Kıbrıs tek ülke ama telefon kodu ve para birimi hattın iki yakasında farklı:
// kuzey ilçeleri Türk numarası ve TL, güney ilçeleri Kıbrıs Cumhuriyeti kodu ve
// Euro kullanır. İlçe bazlı istisnalar ülke varsayılanını ezer.
const PROVINCE_DIALING = {
  "Lefkoşa":    { phone:"+90 5XX XXX XX XX", currency:"TL"  },
  "Girne":      { phone:"+90 5XX XXX XX XX", currency:"TL"  },
  "Gazimağusa": { phone:"+90 5XX XXX XX XX", currency:"TL"  },
  "Güzelyurt":  { phone:"+90 5XX XXX XX XX", currency:"TL"  },
  "İskele":     { phone:"+90 5XX XXX XX XX", currency:"TL"  },
  "Lefke":      { phone:"+90 5XX XXX XX XX", currency:"TL"  },
  "Nicosia":    { phone:"+357 9X XXX XXX",   currency:"EUR" },
  "Limassol":   { phone:"+357 9X XXX XXX",   currency:"EUR" },
  "Larnaca":    { phone:"+357 9X XXX XXX",   currency:"EUR" },
  "Paphos":     { phone:"+357 9X XXX XXX",   currency:"EUR" },
  "Famagusta":  { phone:"+357 9X XXX XXX",   currency:"EUR" },
};
// Bunlar yalnızca ipucu metni — kullanıcının gireceği değer hiçbir zaman kısıtlanmaz.
// Alt bileşenlerde ülkeyi prop olarak gezdirmek yerine saat diliminden çıkan
// FORM_COUNTRY / FORM_PROVINCE yeterli.
const metaFor    = (country) => COUNTRY_META[country] || COUNTRY_META["Türkiye"];
const dialFor    = (country, province) => PROVINCE_DIALING[province] || metaFor(country);
const phoneHint  = (country, province) => dialFor(country, province).phone;
const rewardHint = (country, province, lang) => lang === "tr" ? `örn. 1.000 ${dialFor(country, province).currency}`   : `e.g. 1,000 ${dialFor(country, province).currency}`;
const priceHint  = (country, province, lang) => lang === "tr" ? `örn. 300 ${dialFor(country, province).currency}/gün` : `e.g. 300 ${dialFor(country, province).currency}/day`;

const ADOPTERS = [
  { id:101, name:"Yılmaz Family",  emoji:"👨‍👩‍👧", looking:{en:"Dog",         tr:"Köpek"},        city:"İstanbul", tags:{en:["Has yard","Experienced","Kid-friendly"], tr:["Bahçe var","Deneyimli","Çocuk dostu"]}, desc:{en:"Family of 4 with a large garden. Looking for a medium to large breed dog.",            tr:"Büyük bahçeli, 4 kişilik bir aile. Orta-büyük ırk köpek arıyoruz."} },
  { id:102, name:"Elif K.",        emoji:"👩",     looking:{en:"Cat",          tr:"Kedi"},         city:"Ankara",   tags:{en:["Works from home","Apartment","First pet"], tr:["Evden çalışıyor","Daire","İlk pet"]},  desc:{en:"Young professional working from home. Looking for an affectionate cat.",              tr:"Evden çalışan genç profesyonel. Sevecen bir kedi arıyor."} },
  { id:103, name:"Ahmed & Sara",   emoji:"👫",     looking:{en:"Any",          tr:"Her türlü"},    city:"Dubai",    tags:{en:["Retired","Quiet home","Experienced"],    tr:["Emekli","Sakin ev","Deneyimli"]},      desc:{en:"Retired couple living in Dubai. Looking for a quiet companion.",                      tr:"Dubai'de yaşayan emekli çift. Sessiz bir dost arıyorlar."} },
  { id:104, name:"Mehmet Y.",      emoji:"👨",     looking:{en:"Small animal", tr:"Küçük hayvan"}, city:"Girne",    tags:{en:["Single","Apartment","Calm"],             tr:["Tek kişi","Daire","Sakin"]},            desc:{en:"Software developer in Cyprus. Looking for an easy-to-care-for small companion.",      tr:"Kıbrıs'ta yaşayan yazılımcı. Bakımı kolay küçük bir dost arıyor."} },
];

const SITTERS_SEED = [
  { id:401, name:"Zeynep A.", emoji:"👩", city:"İstanbul", area:"Kadıköy",      rating:4.9, reviews:42, price:{en:"350 TL/day", tr:"350 TL/gün"},   services:{en:["Dog sitting","Cat sitting","Boarding"],              tr:["Köpek bakımı","Kedi bakımı","Pansiyon"]},              accepts:["Dog","Cat"],          hasYard:true,  maxPets:2, availability:{en:"Mon–Sat",     tr:"Pzt–Cmt"},    bio:{en:"Experienced animal carer with a secure garden. 5 years experience. Very loving environment.",   tr:"5 yıllık deneyimli hayvan bakıcısı. Güvenli bahçeli evde sevgi dolu bakım."} },
  { id:402, name:"Emre T.",   emoji:"👨", city:"İstanbul", area:"Beşiktaş",     rating:4.7, reviews:18, price:{en:"280 TL/day", tr:"280 TL/gün"},   services:{en:["Dog sitting","Dog walking","Boarding"],              tr:["Köpek bakımı","Köpek gezisi","Pansiyon"]},             accepts:["Dog"],                hasYard:false, maxPets:1, availability:{en:"Weekends",    tr:"Hafta sonu"}, bio:{en:"Dog owner for 10 years. Offer daily walks and overnight stays in my apartment.",              tr:"10 yıldır köpek sahibiyim. Günlük geziler ve geceleme imkânı."} },
  { id:403, name:"Sara M.",   emoji:"👩", city:"Dubai",    area:"Jumeirah",     rating:5.0, reviews:31, price:{en:"AED 150/day",tr:"AED 150/gün"},  services:{en:["Cat sitting","Small pet sitting","Boarding"],         tr:["Kedi bakımı","Küçük hayvan bakımı","Pansiyon"]},       accepts:["Cat","Rabbit","Bird"], hasYard:false, maxPets:3, availability:{en:"Mon–Sun",     tr:"Pzt–Paz"},    bio:{en:"Specialist in cats and small animals. Quiet, pet-friendly apartment in Jumeirah.",            tr:"Kedi ve küçük hayvan uzmanı. Jumeirah'da sakin, evcil hayvan dostu daire."} },
  { id:404, name:"Hasan K.",  emoji:"👨", city:"Ankara",   area:"Çankaya",      rating:4.6, reviews:11, price:{en:"300 TL/day", tr:"300 TL/gün"},   services:{en:["Dog sitting","Boarding"],                            tr:["Köpek bakımı","Pansiyon"]},                            accepts:["Dog"],                hasYard:true,  maxPets:2, availability:{en:"Mon–Fri",     tr:"Pzt–Cum"},    bio:{en:"Garden villa with two friendly resident dogs. A great environment for your pet.",             tr:"Bahçeli villa. İki misafirperver köpeğimizle harika bir ortam."} },
  { id:405, name:"Nadia R.",  emoji:"👩", city:"Dubai",    area:"Dubai Marina",  rating:4.8, reviews:56, price:{en:"AED 200/day",tr:"AED 200/gün"},  services:{en:["Dog sitting","Cat sitting","Boarding","Dog walking"],  tr:["Köpek bakımı","Kedi bakımı","Pansiyon","Köpek gezisi"]},accepts:["Dog","Cat"],          hasYard:false, maxPets:3, availability:{en:"Mon–Sun",     tr:"Pzt–Paz"},    bio:{en:"Professional pet sitter with vet nursing background. Senior & anxious animal specialist.",    tr:"Veteriner hemşireliği geçmişiyle profesyonel bakıcı. Yaşlı ve kaygılı hayvan uzmanı."} },
  { id:406, name:"Ayşe D.",   emoji:"👩", city:"Girne",    area:"Alsancak",     rating:4.9, reviews:14, price:{en:"400 TL/day", tr:"400 TL/gün"},   services:{en:["Dog sitting","Cat sitting","Small pet sitting"],      tr:["Köpek bakımı","Kedi bakımı","Küçük hayvan bakımı"]},   accepts:["Dog","Cat","Rabbit"],  hasYard:true,  maxPets:3, availability:{en:"Mon–Sun",     tr:"Pzt–Paz"},    bio:{en:"Peaceful care in a spacious garden home in the fresh air of Cyprus.",                         tr:"Kıbrıs'ın temiz havasında geniş bahçeli evde huzurlu bakım."} },
];

const LF_SEED = [
  { id:501, type:"lost",  emoji:"🐕", name:"Karamel",    species:{en:"Dog",   tr:"Köpek"},  breed:{en:"Golden Mix",   tr:"Golden Mix"},   color:{en:"Yellow",      tr:"Sarı"},        area:"Kadıköy",  city:"İstanbul", date:{en:"2 days ago",  tr:"2 gün önce"},  contact:"0532 345 67 89", reward:{en:"2,000 TL", tr:"2.000 TL"}, desc:{en:"Male, neutered, blue collar with tag. Responds to his name. Last seen near Kadıköy Moda beach.",          tr:"Erkek, kısırlaştırıldı, mavi tasmalı. İsmine geliyor. Kadıköy Moda sahilinde kayboldu."},           status:"open"     },
  { id:502, type:"found", emoji:"🐈", name:"Unknown",     species:{en:"Cat",   tr:"Kedi"},   breed:{en:"Tabby",        tr:"Tekir"},        color:{en:"Orange",      tr:"Turuncu"},     area:"Alsancak", city:"Girne",    date:{en:"Today",       tr:"Bugün"},       contact:"0542 765 43 21", reward:{en:"",        tr:""},         desc:{en:"Female tabby, injured front paw. Friendly and approachable. Currently cared for by finder.",             tr:"Ön pençesinde yaralı, dişi tekir. Uysal ve yaklaşılabilir. Şu an bulucunun yanında."},              status:"open"     },
  { id:503, type:"lost",  emoji:"🐕", name:"Kar",         species:{en:"Dog",   tr:"Köpek"},  breed:{en:"Spitz",        tr:"Spitz"},        color:{en:"White",       tr:"Beyaz"},       area:"Beşiktaş", city:"İstanbul", date:{en:"5 days ago",  tr:"5 gün önce"},  contact:"0533 111 22 33", reward:{en:"1,500 TL",tr:"1.500 TL"}, desc:{en:"Female, spayed, microchipped. Small white Spitz, very shy around strangers.",                            tr:"Dişi, kısırlaştırıldı, mikroçipli. Küçük beyaz Spitz, yabancılara çekingen."},                      status:"reunited" },
  { id:504, type:"lost",  emoji:"🐇", name:"Pamuk",       species:{en:"Rabbit",tr:"Tavşan"}, breed:{en:"Holland Lop",  tr:"Hollanda Lop"}, color:{en:"White-Brown", tr:"Beyaz-Kahve"}, area:"Çankaya",  city:"Ankara",   date:{en:"Yesterday",   tr:"Dün"},         contact:"0544 987 65 43", reward:{en:"",        tr:""},         desc:{en:"Indoor rabbit, brown and white. Escaped through an open gate. Very tame, comes to his name.",            tr:"İç mekan tavşanı, kahverengi-beyaz. Açık kalan kapıdan kaçtı. Çok uysal, ismine geliyor."},         status:"open"     },
  { id:505, type:"found", emoji:"🐕", name:"Unknown",     species:{en:"Dog",   tr:"Köpek"},  breed:{en:"Mixed breed",  tr:"Melez"},        color:{en:"Brown",       tr:"Kahverengi"},  area:"Jumeirah", city:"Dubai",    date:{en:"3 days ago",  tr:"3 gün önce"},  contact:"055 234 5678",   reward:{en:"",        tr:""},         desc:{en:"Male dog, no collar. Limping slightly. Calm temperament. Currently at my house.",                        tr:"Erkek köpek, tasmasız. Hafif topallıyor. Sakin mizaçlı. Şu an evimde bakılıyor."},                  status:"open"     },
];

const REPORTS_SEED = [
  { id:201, emoji:"🐕", title:{en:"Injured dog — Bağdat Avenue",       tr:"Yaralı köpek — Bağdat Caddesi"},    desc:{en:"Appears to have a broken hind leg, cannot move. Has been there since last night.",         tr:"Sol arka bacağı kırık görünüyor, hareket edemiyor. Dün akşamdan beri orada."},   location:"Bağdat Cad., Kadıköy, İstanbul",  time:{en:"2 hours ago", tr:"2 saat önce"}, status:"active", reporter:"Ahmet K.",  volunteers:[] },
  { id:202, emoji:"🐈", title:{en:"Stray kittens under bridge",         tr:"Yavru kediler köprü altında"},       desc:{en:"4 kittens approximately 3 weeks old. Mother has not been seen.",                          tr:"4 yavru kedi, ~3 haftalık. Anne görülmüyor."},                                  location:"Unkapanı Köprüsü, İstanbul",        time:{en:"5 hours ago", tr:"5 saat önce"}, status:"active", reporter:"Fatma A.",  volunteers:[{name:"Deniz M.", eta:"On my way now", etaOrder:0},{name:"Selin K.", eta:"1 hour", etaOrder:1}] },
  { id:203, emoji:"🐦", title:{en:"Injured bird — cannot fly",          tr:"Yaralı kuş — uçamıyor"},             desc:{en:"Wing injury, sitting on the pavement and unable to fly.",                                 tr:"Kanat yaralanması var, kaldırımda oturuyor."},                                  location:"Alsancak, Girne, KKTC",             time:{en:"1 day ago",   tr:"1 gün önce"},  status:"helped", reporter:"Mehmet Y.", volunteers:[{name:"Ayşe D.", eta:"On my way now", etaOrder:0}] },
];

const SPECIES   = [{l:"All",e:"🐾"},{l:"Dog",e:"🐕"},{l:"Cat",e:"🐈"},{l:"Rabbit",e:"🐇"},{l:"Hamster",e:"🐹"},{l:"Bird",e:"🐦"}];
const SVC_TYPES = ["All Services","Dog sitting","Cat sitting","Dog walking","Boarding","Small pet sitting"];

// ─── NAVIGATION — 4 clear top-level tabs ─────────────────────────────────────
// Animals  = adopt + foster (user goal: find a pet)
// Lost & Found = lost reports + found reports (user goal: reunite pets)
// Owners   = rehome + sitting + find families + post profile
// Help     = emergency rescue reports
const TABS = [
  { id:"home",     icon:"⌂",  label:"Home"        },
  { id:"animals",  icon:"🐾", label:"Animals"      },
  { id:"lostfound",icon:"🔍", label:"Lost & Found" },
  { id:"help",     icon:"🚨", label:"Help"         },
];

// ─── ROUTING ──────────────────────────────────────────────────────────────────
// Uygulama tek sayfaydı; her şey "/" adresinde yaşıyordu. Bu, Google'a
// indeksleyecek tek bir sayfa vermek demek. Artık her görünümün gerçek bir
// adresi var ve ilanlar tekil olarak paylaşılabiliyor.
const SITE_URL = "https://paweero.com";
const TAB_SEGMENT = { home:"", animals:"animals", lostfound:"lost-found", help:"help" };
const SEGMENT_TAB = { "":"home", "animals":"animals", "lost-found":"lostfound", "help":"help" };
// Alt görünümler ayrı adres alır — /animals ve /animals/foster farklı listeler.
// Varsayılan alt görünüm adrese yazılmaz: /animals ile /animals/adopt aynı sayfa
// olurdu ve Google bunu kopya içerik sayardı. /animals/adopt yazılırsa çalışır,
// ama adres sessizce /animals'a sadeleşir.
const TAB_SUBS = { animals:["adopt","foster"], help:["active","helped"] };
const DEFAULT_SUB = { animals:"adopt", help:"active" };

const slugify = (s) => String(s || "")
  .toLowerCase()
  .replace(/ı/g,"i").replace(/ğ/g,"g").replace(/ü/g,"u").replace(/ş/g,"s").replace(/ö/g,"o").replace(/ç/g,"c")
  .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
  .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60);

// Tanınmayan adres "notfound" sekmesine düşer. Bu önemli: her adres index.html'e
// yönlendiği için /asdfgh de 200 OK dönüyordu ve ana sayfayı gösteriyordu —
// Google bunu "soft 404" sayar, tarama bütçesini harcar ve hatalı linkler sonsuz
// sahte sayfa üretir. Artık açıkça "bulunamadı" diyoruz ve noindex veriyoruz.
// Her sayfanın dili adresinde yazar: /tr/animals ve /en/animals ayrı adreslerdir.
// Sebebi: iki dil tek adreste yaşarken Googlebot çoğunlukla ABD'den taradığı için
// hep İngilizce'yi görüyordu, Türkçe içerik indekse hiç girmiyordu.
const LANGS = ["tr", "en"];

function parseLocation(pathname) {
  let parts;
  try { parts = decodeURIComponent(pathname).split("/").filter(Boolean); }
  catch (e) { parts = pathname.split("/").filter(Boolean); }

  // Dil öneki varsa ayır. Yoksa lang null döner — çağıran taraf tespit edip
  // adresi dilli sürüme yazar, böylece öneksiz eski linkler de çalışmaya devam eder.
  const lang = LANGS.includes(parts[0]) ? parts.shift() : null;

  const head = parts[0] || "";
  if (!(head in SEGMENT_TAB) || parts.length > 2) return { lang, tab:"notfound", sub:null, seg:"" };
  const tab = SEGMENT_TAB[head];
  const seg = parts[1] || "";
  const isSub = (TAB_SUBS[tab] || []).includes(seg);
  return { lang, tab, sub: isSub ? seg : null, seg: isSub ? "" : seg };
}

// Kayıt kimliği sayı da olabilir UUID de. Slug'ı ayırmak yerine kimliğin kendisini
// önek olarak arıyoruz — tek kural iki biçimi de çözüyor, UUID'deki tireler bozmuyor.
const matchesSeg = (item, seg) => {
  const id = String(item.id);
  return seg === id || seg.startsWith(id + "-");
};
const itemPath = (lang, tab, item, name) => {
  const slug = slugify(name);
  return `/${lang}/${TAB_SEGMENT[tab]}/${item.id}${slug ? "-" + slug : ""}`;
};
const tabPath = (lang, tab, sub) => {
  const base = `/${lang}/` + TAB_SEGMENT[tab];
  const named = sub && sub !== DEFAULT_SUB[tab] && (TAB_SUBS[tab] || []).includes(sub);
  return (named ? base + "/" + sub : base).replace(/\/+$/, "") || `/${lang}`;
};
// Aynı sayfanın diğer dildeki karşılığı — hreflang ve dil değiştirici için.
const swapLang = (path, lang) => {
  const parts = path.split("/").filter(Boolean);
  if (LANGS.includes(parts[0])) parts[0] = lang; else parts.unshift(lang);
  return "/" + parts.join("/");
};

// ─── SAYFA META BİLGİSİ ───────────────────────────────────────────────────────
// Her görünüm kendi başlığını, açıklamasını ve canonical adresini yazar. Google
// sayfayı JS çalıştırdıktan sonra okuduğu için bunlar indekse girer; ancak
// WhatsApp/Facebook gibi link önizlemeleri JS çalıştırmaz — onlar index.html'deki
// sabit og etiketlerini görür. Kalıcı çözüm sunucu tarafı render.
const PAGE_META = {
  notfound: {
    en: { title:"Page not found | Paweero",
          desc:"This page or listing is no longer available." },
    tr: { title:"Sayfa bulunamadı | Paweero",
          desc:"Bu sayfa ya da ilan artık mevcut değil." },
  },
  home: {
    en: { title:"Paweero — Free Animal Welfare Platform",
          desc:"Adopt, foster, find a pet sitter, post a lost & found, or report animals in distress across Turkey, Cyprus and the Gulf. Always free." },
    tr: { title:"Paweero — Ücretsiz Hayvan Refahı Platformu",
          desc:"Türkiye, Kıbrıs ve Körfez'de sahiplen, geçici bakım ver, bakıcı bul, kayıp ilanı ver ya da tehlikedeki hayvanları bildir. Her zaman ücretsiz." },
  },
  animals: {
    en: { title:"Adopt or Foster an Animal | Paweero",
          desc:"Browse animals waiting for adoption or foster care. Free listings from rescuers and shelters across Turkey, Cyprus and the Gulf." },
    tr: { title:"Sahiplen ya da Geçici Bakım Ver | Paweero",
          desc:"Sahiplenilmeyi veya geçici bakımı bekleyen hayvanlara göz at. Türkiye, Kıbrıs ve Körfez'den ücretsiz ilanlar." },
  },
  lostfound: {
    en: { title:"Lost & Found Pets | Paweero",
          desc:"Report a lost pet or an animal you have found. Free lost and found listings for Turkey, Cyprus and the Gulf." },
    tr: { title:"Kayıp ve Bulunan Hayvanlar | Paweero",
          desc:"Kaybolan hayvanını bildir ya da bulduğun bir hayvanı paylaş. Türkiye, Kıbrıs ve Körfez için ücretsiz kayıp ilanları." },
  },
  help: {
    en: { title:"Report an Animal in Distress | Paweero",
          desc:"Report injured, sick or abandoned animals and see active rescue calls near you. Free and open to everyone." },
    tr: { title:"Tehlikedeki Hayvanı Bildir | Paweero",
          desc:"Yaralı, hasta ya da terk edilmiş hayvanları bildir, yakınındaki aktif kurtarma çağrılarını gör. Ücretsiz ve herkese açık." },
  },
};

// Varsayılan olmayan alt görünümlerin kendi başlığı olur; aksi hâlde /animals ile
// /animals/foster aynı başlığı taşır ve Google ikisini kopya sayar.
const SUB_META = {
  "animals/foster": {
    en: { title:"Foster an Animal | Paweero",
          desc:"Offer a temporary home to an animal in need. Browse animals looking for foster care across Turkey, Cyprus and the Gulf." },
    tr: { title:"Geçici Bakım Ver | Paweero",
          desc:"İhtiyacı olan bir hayvana geçici yuva ol. Türkiye, Kıbrıs ve Körfez'de geçici bakım bekleyen hayvanlara göz at." },
  },
  "help/helped": {
    en: { title:"Rescued Animals | Paweero",
          desc:"Animals that were reported in distress and have since been helped. See what the community has resolved." },
    tr: { title:"Yardım Edilen Hayvanlar | Paweero",
          desc:"Tehlikede olduğu bildirilen ve yardım ulaştırılan hayvanlar. Topluluğun çözüme kavuşturduğu ilanlar." },
  },
};

function upsertTag(selector, create) {
  let el = document.head.querySelector(selector);
  if (!el) { el = create(); document.head.appendChild(el); }
  return el;
}
const setMetaName = (name, content) => {
  upsertTag(`meta[name="${name}"]`, () => Object.assign(document.createElement("meta"), { name })).content = content;
};
const setMetaProp = (prop, content) => {
  upsertTag(`meta[property="${prop}"]`, () => {
    const m = document.createElement("meta"); m.setAttribute("property", prop); return m;
  }).setAttribute("content", content);
};

// Aynı sayfanın dil sürümlerini birbirine bağlar. Google böylece ikisini kopya
// saymaz, kullanıcıya diline uygun olanı gösterir. x-default, dili belli olmayan
// ziyaretçi için varsayılan sürüm.
function applyHreflang(path, noindex) {
  document.head.querySelectorAll('link[rel="alternate"][data-seo="hreflang"]').forEach(el => el.remove());
  if (noindex) return;
  const add = (hreflang, href) => {
    const l = document.createElement("link");
    l.rel = "alternate"; l.hreflang = hreflang; l.href = SITE_URL + href;
    l.dataset.seo = "hreflang";
    document.head.appendChild(l);
  };
  LANGS.forEach(l => add(l, swapLang(path, l)));
  add("x-default", swapLang(path, "en"));
}

// Sayfa başlığı, açıklaması, canonical ve paylaşım etiketlerini tek yerden yazar.
function applyPageMeta({ title, desc, path, image, lang, noindex }) {
  const url = SITE_URL + path;
  document.title = title;
  document.documentElement.lang = lang === "tr" ? "tr" : "en";
  applyHreflang(path, noindex);
  setMetaName("description", desc);
  setMetaName("robots", noindex ? "noindex, follow" : "index, follow, max-image-preview:large");
  upsertTag('link[rel="canonical"]', () => Object.assign(document.createElement("link"), { rel:"canonical" })).href = url;
  setMetaProp("og:title", title);
  setMetaProp("og:description", desc);
  setMetaProp("og:url", url);
  setMetaProp("og:locale", lang === "tr" ? "tr_TR" : "en_US");
  setMetaProp("og:type", path === "/" ? "website" : "article");
  if (image) setMetaProp("og:image", image);
  setMetaName("twitter:title", title);
  setMetaName("twitter:description", desc);
  if (image) setMetaName("twitter:image", image);
}

// Arama sonuçlarında kırıntı yolu (breadcrumb) göstermek için.
function applyBreadcrumb(trail) {
  const el = upsertTag('script[data-seo="breadcrumb"]', () => {
    const s = document.createElement("script");
    s.type = "application/ld+json"; s.dataset.seo = "breadcrumb"; return s;
  });
  if (!trail || trail.length < 2) { el.textContent = ""; return; }
  el.textContent = JSON.stringify({
    "@context":"https://schema.org", "@type":"BreadcrumbList",
    itemListElement: trail.map((t, i) => ({
      "@type":"ListItem", position:i + 1, name:t.name, item:SITE_URL + t.path,
    })),
  });
}

const APP_STEPS = [{id:1,title:"Personal"},{id:2,title:"Home"},{id:3,title:"Lifestyle"},{id:4,title:"Experience"},{id:5,title:"Review"}];
const EMPTY_APP = { firstName:"",lastName:"",email:"",phone:"",age:"",occupation:"",homeType:"",ownRent:"",hasYard:"",hasChildren:"",childrenAges:"",householdSize:"",hoursHome:"",activityLevel:"",travelFreq:"",petCare:"",allergies:"",hadPetsBefore:"",currentPetDetails:"",currentPets:"",vetReference:"",whyAdopt:"",longTermPlan:"",agree:false };
const EMPTY_FOSTER_APP = { firstName:"",lastName:"",email:"",phone:"",hasPetExperience:"",experienceNote:"",availableFrom:"",fosterDuration:"",canProvideCare:"",notes:"",agree:false };
const genRef    = () => "PWR-" + Math.random().toString(36).slice(2,7).toUpperCase();

// ─── ETA OPTIONS ─────────────────────────────────────────────────────────────
// etaOrder drives sort (0 = fastest). "Coordinating" is non-physical so goes last.
const ETA_OPTIONS = [
  { label:"On my way now",    labelTR:"Şu an yola çıkıyorum",    sub:"Already heading there",                         subTR:"Zaten yola çıktım",                              icon:"🚀", order:0  },
  { label:"1 hour",           labelTR:"1 saat",                   sub:"Will arrive within the hour",                   subTR:"Bir saat içinde orada olacağım",                 icon:"⏱️", order:1  },
  { label:"2 hours",          labelTR:"2 saat",                   sub:"On my way later today",                         subTR:"Bugün daha sonra yola çıkacağım",                icon:"🕑", order:2  },
  { label:"4 hours",          labelTR:"4 saat",                   sub:"Can help this afternoon",                       subTR:"Bu öğleden sonra yardım edebilirim",             icon:"🕓", order:3  },
  { label:"Today",            labelTR:"Bugün",                    sub:"Will be there sometime today",                  subTR:"Bugün bir ara orada olacağım",                   icon:"📅", order:4  },
  { label:"Tomorrow morning", labelTR:"Yarın sabah",              sub:"First thing tomorrow",                          subTR:"Yarın sabahın ilk saatlerinde",                  icon:"🌅", order:5  },
  { label:"Coordinating",     labelTR:"Koordinasyon yapıyorum",   sub:"Arranging transport, clinic, food or support",  subTR:"Ulaşım, klinik, yiyecek veya destek ayarlıyorum", icon:"💬", order:99 },
];

// ─── TRANSLATIONS ─────────────────────────────────────────────────────────────
const T = {
  en: {
    // app shell
    appName:"Paweero", lang:"EN",
    home:"Home", animals:"Animals", lostFound:"Lost & Found", owners:"Owners", help:"Emergency",
    // post chooser (single entry point for all posting actions)
    postChooserTitle:"What would you like to do?",
    postChooserSub:"Choose the option that matches your situation — this makes sure your post reaches the right people.",
    postAdoptFosterTitle:"List an Animal",
    postAdoptFosterDesc:"Post an animal — it can be up for adoption, foster, and/or help, all at once.",
    postLostTitle:"I Lost My Pet",
    postLostDesc:"Create a lost pet report to help find them.",
    postFoundTitle:"I Found an Animal",
    postFoundDesc:"Create a found report to reunite them with their family.",
    postEmergencyTitle:"Report an Animal in Distress",
    postEmergencyDesc:"Injured, sick, or in immediate danger — needs urgent rescue.",
    postFabLabel:"Post",
    helpFormRedirectNote:"This form is only for animals needing urgent rescue — injured, sick, or in immediate danger.",
    helpFormWrongPlace:"Not an emergency?",
    helpFormRedirectAdopt:"Post for adoption/foster instead →",
    helpFormRedirectLF:"Report a lost or found pet instead →",
    // Take Action sheet — multi-select purposes on a single listing
    takeAction:"Take Action",
    takeActionSub_pre:"How would you like to help",
    takeActionSelectPurpose:"Select at least one — you can choose more than one.",
    purposeAdopt:"🏠 Adopt", purposeAdoptDesc:"I want to give this animal a permanent home.",
    purposeFoster:"🛏️ Foster", purposeFosterDesc:"I can provide temporary care.",
    purposeHelp:"🆘 Offer Help", purposeHelpDesc:"I can support in another way (funds, transport, supplies…).",
    selectAtLeastOnePurpose:"Please select at least one option.",
    taContactTitle:"Your Contact Details",
    taAdoptSection:"Adoption Details",
    taFosterSection:"Foster Details",
    taHelpSection:"Help Details",
    helpTypeQ:"How can you help? *",
    helpTypeFinancial:"Financial support", helpTypeTransport:"Transport", helpTypeShelter:"Temporary shelter",
    helpTypeMedical:"Medical assistance", helpTypeSupplies:"Food / supplies", helpTypeOther:"Other",
    helpAvailability:"When can you help? (optional)", helpAvailabilityPh:"e.g. Today, this weekend…",
    helpMessage:"Message (optional)", helpMessagePh:"Anything the poster should know…",
    taSubmit:"Send", taSubmitting:"Sending...",
    taSuccessTitle:"Sent!",
    taSuccessDesc:"Your response has been sent to the poster. They'll reach out to you directly.",
    taSuccessFor:"You registered interest for:",
    // hero
    heroH1:"A free platform for", heroH1Em:"animal welfare.",
    heroP:"Adopt, foster, find a pet sitter, post a lost & found, or report animals in distress — always free, for every animal.",
    browseAnimals:"Browse Animals", postAnimal:"Post an Animal", reportAnimal:"Report Animal in Need", shareWA:"Share",
    // stats
    adopted:"Adopted", waiting:"Waiting", rescues:"Rescue", shelters:"Shelters", helped:"Helped",
    // home quick links
    browseByGoal:"Browse by goal",
    adoptTitle:"Adopt a Pet",              adoptDesc:"Browse rescued animals and submit an adoption application.",
    fosterTitle:"Foster an Animal",        fosterDesc:"Provide a temporary home for an animal in need.",
    lostFoundTitle:"Lost & Found",         lostFoundDesc:"Report a lost pet or view found animals.",
    sittingTitle:"Pet Sitting & Boarding", sittingDesc:"Find trusted sitters near you, or register as one.",
    rehomeTitle:"Rehome Your Pet",         rehomeDesc:"List your pet so loving families can find them.",
    helpTitle:"Help an Animal",            helpDesc:"Spotted an injured or abandoned animal? Report it fast.",
    recentlyAdded:"Recently added",
    // animals tab
    adopt:"Adopt", foster:"Foster", postProfile:"📋 Post Adoption Profile",
    findPet:"Find a pet to adopt or foster.",
    fosterWhat:"What is fostering?",
    fosterNote:"You temporarily care for an animal (2–8 weeks) while we find a permanent home.",
    searchPlaceholder:"Search by name or breed…",
    noAnimalsFound:"No animals found.",
    applyAdopt:"Apply to Adopt", applyFoster:"Apply to Foster",
    animalProfile:"Animal Profile",
    // lost & found tab
    lostFoundSub:"Reuniting pets with their owners.",
    browse:"Browse", postListing:"+ Post a Listing",
    openListings:"open", allListings:"All listings", lostFilter:"🔴 Lost", foundFilter:"🟢 Found",
    lfEmptyLostTitle:"Good news! No lost animals have been reported in this area.",
    lfEmptyLostDesc:"We hope it stays this way. If your pet has gone missing, you can create a lost pet report to help the community find them.",
    lfEmptyLostCta:"Report a Lost Pet",
    lfEmptyFoundTitle:"No found animals have been reported yet.",
    lfEmptyFoundDesc:"There are currently no reported found animals in this area. If you've found a pet, create a report to help reunite them with their family.",
    lfEmptyFoundCta:"Report a Found Pet",
    lfEmptyAllTitle:"No listings yet in this area.",
    lfEmptyAllDesc:"Nothing has been reported here so far. If you've lost or found an animal, create a listing to help reunite pets with their families.",
    lfEmptyAllCta:"Post a Listing",
    postLostFoundNote:"Post a listing whether you've lost a pet or found one. Include a clear description and your contact details.",
    listingType:"Type of listing *", iLostMyPet:"I lost my pet 🔴", iFoundAnAnimal:"I found an animal 🟢",
    petName:"Pet name *", species:"Species", breed:"Breed", colour:"Colour", cityField:"City *",
    areaField:"Area / Neighbourhood *", yourContact:"Your contact *", contactPlaceholder:"Phone number or email",
    reward:"Reward (optional)", descriptionField:"Description *",
    descLostPlaceholder:"Distinctive features, collar, where and when last seen…",
    descFoundPlaceholder:"Description of the animal, where you found it, current status…",
    postLost:"Post Lost Pet Listing", postFound:"Post Found Animal Listing",
    contactCopied:"Contact info copied!", contactInfo:"📞 Contact:",
    lostPetSheet:"Lost Pet", foundAnimalSheet:"Found Animal",
    reunited:"Reunited",
    // owners tab
    forOwners:"For Pet Owners", forOwnersSub:"Find sitters, rehome your pet, or connect with adopting families.",
    petSitting:"🛋️ Pet Sitting", becomeSitter:"+ Become a Sitter", rehomeTab:"🔄 Rehome a Pet",
    findFamilies:"👨‍👩‍👧 Find Families",
    cityLabel:"City:", serviceLabel:"Service:", sittersFound:"sitter(s) found",
    noSittersFound:"No sitters found for this filter.",
    book:"Book", sitterProfile:"Sitter Profile", sendRequest:"Send Booking Request",
    bookingRequestSent:"Booking request sent to",
    hasYard:"✓ Has yard", noYard:"✕ No yard", maxPets:"Max",
    sitterRegNote:"Join our sitter network. Set your own rates and hours. Pet owners in your area will find and book you through Paweero.",
    yourName:"Your name *", cityInput:"City *", neighbourhood:"Neighbourhood",
    pricePerDay:"Price per day", servicesOffered:"Services offered *", animalsAccepted:"Animals accepted *",
    availability:"Availability", availPlaceholder:"e.g. Mon–Fri, weekends only",
    aboutYou:"About you", aboutYouPlaceholder:"Your experience, home environment, how you'll care for pets…",
    registerSitter:"Register as Sitter",
    rehomeTitle2:"List Your Pet for Rehoming",
    rehomeNote:"Fill in your pet's details. We'll make the listing visible to adopting families.",
    ageField:"Age", reasonField:"Reason for Rehoming",
    reasonPlaceholder:"Help potential adopters understand the situation…",
    submitListing:"Submit Listing",
    lookingForFamilies:"People Looking to Adopt",
    lookingFor:"Looking for:", contactRequest:"Contact request sent",
    adoptionProfile:"Create an Adoption Profile",
    adoptionProfileNote:"Tell pet owners about your home so they feel confident placing their animal with you.",
    freeToPost:"✓ Free to post",
    lookingForLabel:"Looking for",
    aboutHome:"About your home", aboutHomePlaceholder:"Living situation, experience with animals, family setup…",
    postProfileBtn:"Post Profile",
    // help tab
    emergencyBar:"Emergency: Turkey 156 (Jandarma) · KKTC 0392 444 0 156 · UAE 800 ADDA (2332)",
    helpAnimals:"Help Animals in Need",
    helpSub:"Spotted an injured or abandoned animal? Report it and rescuers will be notified immediately.",
    activeReports:"Active Reports", needingHelp:"needing help",
    helpedTab:"Helped", helpedAnimals:"animals helped",
    volunteersResponding:"volunteer(s) responding",
    iCanHelp:"I can help →", youAreResponding:"✓ You're responding",
    markAsHelped:"Mark as Helped", animalHasBeenHelped:"✓ Animal has been helped",
    notListedAbove:"Spotted an animal in distress not listed above?",
    submitNewReport:"🚨 Submit a New Report",
    submitReportTitle:"Submit a Report", cancel:"Cancel",
    animalType:"Animal Type", situation:"Situation", titleField:"Title *", locationField:"Location *",
    photo:"Photo", uploadPhoto:"Tap to upload a photo", photoHint:"JPG or PNG, up to 10 MB",
    submitReport:"Submit Report",
    reportedBy:"Reported by",
    locationDetected:"Location detected",
    fillTitleLocation:"Please fill title and location",
    photoUploaded2:"Photo uploaded",
    reportSubmitted:"Report submitted — responders notified",
    // ETA sheet
    iCanHelpSheet:"I can help",
    chooseEta:"Choose when you expect to arrive. This will be shown on the report so others know help is on the way.",
    // Helped proof sheet
    proofRequired:"Proof required.",
    proofNote:"To mark this animal as helped, please upload a current photo so the reporter and our team can confirm.",
    photoUploaded:"✓ Photo uploaded — ready to submit",
    confirmHelped:"Confirm — Mark as Helped", replacePhoto:"Replace Photo",
    uploadProof:"Upload a photo of the animal",
    proofHint:"Must show the animal's current condition",
    noPhotoNoHelp:"You cannot mark this as helped without uploading a photo.",
    markedAsHelped:"✓ Marked as helped — thank you!",
    // adoption application
    applyTitle:"Adoption Application", fosterAppTitle:"Foster Application",
    personalInfo:"Personal Information", personalInfoSub:"All details are kept confidential.",
    firstName:"First Name *", lastName:"Last Name *", email:"Email *", phoneField:"Phone *",
    ageField2:"Age *", occupationField:"Occupation *",
    homeTitle:"Home & Living", homeSub:"We need to make sure every animal goes to a safe environment.",
    homeType:"Type of Home *",
    apartment:"Apartment / Flat", apartmentHint:"No private outdoor space",
    house:"House with garden", houseHint:"Private outdoor space",
    farmhouse:"Farm / Farmhouse", farmhouseHint:"Rural",
    other:"Other",
    ownRentQ:"Own or Rent? *", own:"I own my home",
    rent:"I rent", rentHint:"Landlord permission may be required",
    outdoorQ:"Outdoor Space? *", fenced:"Yes — fenced", unfenced:"Yes — not fenced", noOutdoor:"No outdoor space",
    childrenQ:"Children in Household? *", noChildren:"No children", yesLive:"Yes, live here", yesVisit:"Visit regularly",
    childAges:"Ages of children", householdSize:"People in Household *",
    lifestyleTitle:"Lifestyle", lifestyleSub:"Understanding your routine helps us find the right match.",
    hoursQ:"Hours someone is home per day? *",
    h04:"0–4 hours", h04hint:"Often away",
    h48:"4–8 hours", h48hint:"Moderate",
    h812:"8–12 hours", h812hint:"Often home",
    h12:"12+ hours", h12hint:"Almost always home",
    activityQ:"Activity Level? *",
    relaxed:"Relaxed", relaxedHint:"Quiet home",
    moderate:"Moderate", moderateHint:"Regular walks",
    veryActive:"Very Active", veryActiveHint:"Daily exercise",
    travelQ:"How Often Do You Travel? *",
    rarely:"Rarely", monthly:"Monthly", weeklyMore:"Weekly or more",
    petCareQ:"Who cares for the animal when you travel?",
    petCarePlaceholder:"Family member, pet sitter…",
    allergiesQ:"Any Allergies to Animals?", allergiesPlaceholder:"None, or describe",
    experienceTitle:"Animal Experience",
    experienceSub_adopt:"Tell us about your history with animals and your plans for",
    hadPetsQ:"Have You Owned a Pet Before? *",
    yesCurrent:"Yes — I currently have pets",
    yesPast:"Yes — I've had pets before",
    noFirst:"No — this would be my first",
    currentPetsDesc:"Describe your current pets",
    currentPetsPlaceholder:"Species, temperament, how they interact with new animals",
    pastPetsDesc:"Tell us about previous pets",
    pastPetsPlaceholder:"What happened to them? How long did you have them?",
    vetRef:"Vet Reference (optional)", vetPlaceholder:"Vet name and location",
    whyAdopt_adopt:"Why do you want to adopt",
    whyAdopt_foster:"Why do you want to foster",
    whyPlaceholder:"What drew you to this animal? Why are you a good match?",
    longTermQ:"Long-term care plan? *", longTermPlaceholder:"How will you care for them over the years, if circumstances change?",
    declaration:"I confirm all information is truthful. Paweero may conduct a home visit and may reject any application without providing a reason.",
    reviewTitle:"Review Your Application", reviewSub:"Tap any completed step to go back and edit.",
    confirmNote_pre:"Confirmation will be sent to", confirmNote_post:"We'll respond within 3–5 business days.",
    personalSection:"Personal", homeSection:"Home", lifestyleSection:"Lifestyle", experienceSection:"Experience",
    nameLabel:"Name", emailLabel:"Email", phoneLabel:"Phone", ageLabel:"Age", occupationLabel:"Occupation",
    homeTypeLabel:"Home type", ownRentLabel:"Own/Rent", outdoorLabel:"Outdoor", childrenLabel:"Children", householdLabel:"Household",
    hoursLabel:"Hours home", activityLabel:"Activity", travelLabel:"Travel",
    hadPetsLabel:"Had pets", whyLabel:"Why", stepBack:"Back", stepContinue:"Continue", stepSubmit:"Submit",
    stepOf:"of",
    appSubmitted:"Application Submitted",
    appSubmittedDesc_pre:"Thank you,", appSubmittedDesc_adopt:"Your application to adopt", appSubmittedDesc_foster:"Your application to foster", appSubmittedDesc_post:"has been received.",
    refLabel:"Reference",
    appStep1:"Application received", appStep1d:"Your submission is in our system.",
    appStep2:"Team review", appStep2d:"We assess your profile.",
    appStep3:"Decision emailed", appStep3d_pre:"You'll hear back at", appStep3d_post:"within 3–5 days.",
    appStep4_adopt:"Home visit", appStep4d_adopt:"A visit may be arranged before approval.",
    appStep4_foster:"Foster briefing", appStep4d_foster:"We'll brief you on care requirements.",
    done:"Done",
    // contact
    close:"Close", contact:"Contact", savedFavourites:"Saved to favourites",
    accepts:"Accepts:", noneToPost:"Nothing to show yet.",
  },
  tr: {
    // uygulama kabuğu
    appName:"Paweero", lang:"TR",
    home:"Ana Sayfa", animals:"Hayvanlar", lostFound:"Kayıp & Bulunan", owners:"Sahipler", help:"Acil Durum",
    // gönderi seçici (tüm paylaşım aksiyonları için tek giriş noktası)
    postChooserTitle:"Ne yapmak istiyorsun?",
    postChooserSub:"Durumuna uygun seçeneği seç — bu sayede ilanın doğru kişilere ulaşır.",
    postAdoptFosterTitle:"Hayvan İlanı Ver",
    postAdoptFosterDesc:"Bir hayvan için ilan ver — aynı anda sahiplenme, geçici bakım ve/veya yardım için uygun olabilir.",
    postLostTitle:"Hayvanımı Kaybettim",
    postLostDesc:"Hayvanını bulmana yardımcı olacak bir kayıp ilanı oluştur.",
    postFoundTitle:"Bir Hayvan Buldum",
    postFoundDesc:"Ailesine kavuşması için bulunan hayvan ilanı oluştur.",
    postEmergencyTitle:"Tehlikedeki Hayvanı Bildir",
    postEmergencyDesc:"Yaralı, hasta veya acil tehlikede — kurtarma ekibi gerekiyor.",
    postFabLabel:"İlan Ver",
    helpFormRedirectNote:"Bu form sadece acil kurtarmaya ihtiyacı olan hayvanlar içindir — yaralı, hasta veya tehlikede olanlar.",
    helpFormWrongPlace:"Acil bir durum değil mi?",
    helpFormRedirectAdopt:"Bunun yerine sahiplenme/geçici bakım ilanı ver →",
    helpFormRedirectLF:"Bunun yerine kayıp/bulunan ilanı ver →",
    // Aksiyon Al ekranı — tek ilanda çoklu amaç seçimi
    takeAction:"Aksiyon Al",
    takeActionSub_pre:"Nasıl yardımcı olmak istersin:",
    takeActionSelectPurpose:"En az birini seç — birden fazlasını seçebilirsin.",
    purposeAdopt:"🏠 Sahiplen", purposeAdoptDesc:"Bu hayvana kalıcı bir yuva vermek istiyorum.",
    purposeFoster:"🛏️ Geçici Bakım", purposeFosterDesc:"Geçici bakım verebilirim.",
    purposeHelp:"🆘 Yardım Teklif Et", purposeHelpDesc:"Başka bir şekilde destek olabilirim (bağış, ulaşım, malzeme…).",
    selectAtLeastOnePurpose:"Lütfen en az bir seçenek işaretle.",
    taContactTitle:"İletişim Bilgilerin",
    taAdoptSection:"Sahiplenme Detayları",
    taFosterSection:"Geçici Bakım Detayları",
    taHelpSection:"Yardım Detayları",
    helpTypeQ:"Nasıl yardımcı olabilirsin? *",
    helpTypeFinancial:"Maddi destek", helpTypeTransport:"Ulaşım", helpTypeShelter:"Geçici barınak",
    helpTypeMedical:"Tıbbi yardım", helpTypeSupplies:"Mama / malzeme", helpTypeOther:"Diğer",
    helpAvailability:"Ne zaman yardım edebilirsin? (opsiyonel)", helpAvailabilityPh:"örn. Bugün, bu hafta sonu…",
    helpMessage:"Mesaj (opsiyonel)", helpMessagePh:"İlan sahibinin bilmesi gereken bir şey var mı…",
    taSubmit:"Gönder", taSubmitting:"Gönderiliyor...",
    taSuccessTitle:"Gönderildi!",
    taSuccessDesc:"Yanıtın ilan sahibine iletildi. Seninle doğrudan iletişime geçecekler.",
    taSuccessFor:"Şunlar için ilgini kaydettik:",
    // hero
    heroH1:"Hayvan refahı için", heroH1Em:"ücretsiz platform.",
    heroP:"Sahiplen, geçici bakım ver, bakıcı bul, kayıp ilanı ver ya da tehlikedeki hayvanları bildir — her zaman ücretsiz, her hayvan için.",
    browseAnimals:"Hayvanlara Göz At", postAnimal:"Hayvan İlanı Ver", reportAnimal:"Tehlikedeki Hayvan Bildir", shareWA:"Paylaş",
    // istatistikler
    adopted:"Sahiplenilen", waiting:"Bekleyen", rescues:"Kurtarma", shelters:"Barınak", helped:"Yardım Edildi",
    // hızlı bağlantılar
    browseByGoal:"Ne yapmak istiyorsun?",
    adoptTitle:"Hayvan Sahiplen",          adoptDesc:"Kurtarılmış hayvanlara göz at ve sahiplenme başvurusu gönder.",
    fosterTitle:"Geçici Bakım Ver",        fosterDesc:"İhtiyacı olan bir hayvana geçici bir yuva sun.",
    lostFoundTitle:"Kayıp & Bulunan",      lostFoundDesc:"Kayıp ilanı ver ya da bulunan hayvanları görüntüle.",
    sittingTitle:"Petsitter & Pansiyonat", sittingDesc:"Yakınındaki güvenilir bakıcıları bul ya da bakıcı olarak kayıt ol.",
    rehomeTitle:"Hayvanını Yeni Yuvaya",   rehomeDesc:"Hayvanını listele, ona sevgi dolu bir aile bulsun.",
    helpTitle:"Hayvana Yardım Et",         helpDesc:"Yaralı ya da terk edilmiş bir hayvan mı gördün? Hemen bildir.",
    recentlyAdded:"Son eklenenler",
    // hayvanlar sekmesi
    adopt:"Sahiplen", foster:"Geçici Bakım", postProfile:"📋 Sahiplenme Profili Oluştur",
    findPet:"Sahiplenmek veya geçici bakım için hayvan bul.",
    fosterWhat:"Geçici bakım nedir?",
    fosterNote:"Kalıcı yuva bulana kadar 2–8 hafta boyunca hayvana geçici bakım verirsin.",
    searchPlaceholder:"İsim veya ırk ile ara…",
    noAnimalsFound:"Hayvan bulunamadı.",
    applyAdopt:"Sahiplenme Başvurusu", applyFoster:"Geçici Bakım Başvurusu",
    animalProfile:"Hayvan Profili",
    // kayıp & bulunan sekmesi
    lostFoundSub:"Hayvanları sahipleriyle buluşturuyoruz.",
    browse:"İlanlar", postListing:"+ İlan Ver",
    openListings:"açık", allListings:"Tüm ilanlar", lostFilter:"🔴 Kayıp", foundFilter:"🟢 Bulunan",
    lfEmptyLostTitle:"İyi haber! Bu bölgede kayıp hayvan ihbarı yok.",
    lfEmptyLostDesc:"Umuyoruz bu böyle kalır. Eğer hayvanınız kayıpsa, topluluğun onu bulmasına yardımcı olmak için bir kayıp ilanı oluşturabilirsiniz.",
    lfEmptyLostCta:"Kayıp İlanı Ver",
    lfEmptyFoundTitle:"Henüz bulunan hayvan ihbarı yapılmamış.",
    lfEmptyFoundDesc:"Bu bölgede şu anda bildirilmiş bulunan hayvan yok. Bir hayvan bulduysanız, ailesine kavuşmasına yardımcı olmak için bir ilan oluşturabilirsiniz.",
    lfEmptyFoundCta:"Bulunan Hayvan İlanı Ver",
    lfEmptyAllTitle:"Bu bölgede henüz hiç ilan yok.",
    lfEmptyAllDesc:"Şimdiye kadar buraya hiçbir şey bildirilmemiş. Bir hayvan kaybettiyseniz veya bulduysanız, ailesine kavuşmasına yardımcı olmak için bir ilan oluşturabilirsiniz.",
    lfEmptyAllCta:"İlan Ver",
    postLostFoundNote:"Kayıp ilanı veya bulunan hayvan ilanı ver. Net bir açıklama ve iletişim bilgilerini ekle.",
    listingType:"İlan türü *", iLostMyPet:"Hayvanımı kaybettim 🔴", iFoundAnAnimal:"Bir hayvan buldum 🟢",
    petName:"Hayvanın adı *", species:"Tür", breed:"Irk", colour:"Renk", cityField:"Şehir *",
    areaField:"Semt / Mahalle *", yourContact:"İletişim bilgisi *", contactPlaceholder:"Telefon veya e-posta",
    reward:"Ödül (isteğe bağlı)", descriptionField:"Açıklama *",
    descLostPlaceholder:"Belirgin özellikleri, tasmayı, nerede ve ne zaman kaybolduğunu yaz…",
    descFoundPlaceholder:"Hayvanın tanımı, nerede bulunduğu, şu anki durumu…",
    postLost:"Kayıp İlanı Ver", postFound:"Bulunan Hayvan İlanı Ver",
    contactCopied:"İletişim bilgisi kopyalandı!", contactInfo:"📞 İletişim:",
    lostPetSheet:"Kayıp Hayvan", foundAnimalSheet:"Bulunan Hayvan",
    reunited:"Kavuştu",
    // sahipler sekmesi
    forOwners:"Hayvan Sahipleri İçin", forOwnersSub:"Bakıcı bul, hayvanını yeni yuvaya ver ya da ailelerle bağlantı kur.",
    petSitting:"🛋️ Petsitter", becomeSitter:"+ Bakıcı Ol", rehomeTab:"🔄 Yeni Yuvaya Ver",
    findFamilies:"👨‍👩‍👧 Aile Bul",
    cityLabel:"Şehir:", serviceLabel:"Hizmet:", sittersFound:"bakıcı bulundu",
    noSittersFound:"Bu filtreye uygun bakıcı bulunamadı.",
    book:"Rezervasyon", sitterProfile:"Bakıcı Profili", sendRequest:"Rezervasyon İsteği Gönder",
    bookingRequestSent:"Rezervasyon isteği gönderildi:",
    hasYard:"✓ Bahçe/dış alan var", noYard:"✕ Dış alan yok", maxPets:"Maks.",
    sitterRegNote:"Bakıcı ağımıza katıl. Kendi saatlerini ve ücretini belirle. Yakınındaki hayvan sahipleri seni Paweero üzerinden bulup rezervasyon yapacak.",
    yourName:"Adın *", cityInput:"Şehir *", neighbourhood:"Semt / Mahalle",
    pricePerDay:"Günlük ücret", servicesOffered:"Sunduğun hizmetler *", animalsAccepted:"Bakabileceğin hayvanlar *",
    availability:"Müsaitlik", availPlaceholder:"örn. Pzt–Cum, yalnızca hafta sonu",
    aboutYou:"Hakkında", aboutYouPlaceholder:"Deneyimin, ev ortamın, evcil hayvanlara nasıl bakacağın…",
    registerSitter:"Bakıcı Olarak Kayıt Ol",
    rehomeTitle2:"Hayvanını Yeni Yuvaya Ver",
    rehomeNote:"Hayvanının bilgilerini gir. İlanını sahiplenmek isteyen ailelere göstereceğiz.",
    ageField:"Yaş", reasonField:"Yeni Yuvaya Verme Sebebi",
    reasonPlaceholder:"Potansiyel sahipler için durumu açıkla…",
    submitListing:"İlanı Yayınla",
    lookingForFamilies:"Sahiplenmek İsteyen Aileler",
    lookingFor:"Arıyor:", contactRequest:"İletişim isteği gönderildi",
    adoptionProfile:"Sahiplenme Profili Oluştur",
    adoptionProfileNote:"Hayvan sahiplerine eviniz hakkında bilgi ver; hayvanlarını emanet etmek konusunda kendilerini güvende hissetsinler.",
    freeToPost:"✓ Ücretsiz yayınla",
    lookingForLabel:"Ne arıyor",
    aboutHome:"Eviniz hakkında", aboutHomePlaceholder:"Yaşam koşulları, hayvanlarla deneyim, aile yapısı…",
    postProfileBtn:"Profili Yayınla",
    // yardım sekmesi
    emergencyBar:"Acil: Türkiye 156 (Jandarma) · KKTC 0392 444 0 156 · BAE 800 ADDA (2332)",
    helpAnimals:"Tehlikedeki Hayvanlara Yardım",
    helpSub:"Yaralı ya da terk edilmiş bir hayvan gördün mü? Bildir, kurtarma ekibi hemen haberdar edilsin.",
    activeReports:"Aktif İhbarlar", needingHelp:"yardım bekliyor",
    helpedTab:"Yardım Edildi", helpedAnimals:"hayvana yardım edildi",
    volunteersResponding:"gönüllü yanıt veriyor",
    iCanHelp:"Yardım edebilirim →", youAreResponding:"✓ Yanıt veriyorsun",
    markAsHelped:"Yardım Edildi Olarak İşaretle", animalHasBeenHelped:"✓ Hayvana yardım edildi",
    notListedAbove:"Yukarıda listelenmeyen tehlikedeki bir hayvan mı gördün?",
    submitNewReport:"🚨 Yeni İhbar Gönder",
    submitReportTitle:"İhbar Gönder", cancel:"İptal",
    animalType:"Hayvan Türü", situation:"Durum", titleField:"Başlık *", locationField:"Konum *",
    photo:"Fotoğraf", uploadPhoto:"Fotoğraf yüklemek için dokun", photoHint:"JPG veya PNG, en fazla 10 MB",
    submitReport:"İhbarı Gönder",
    reportedBy:"Bildiren:",
    locationDetected:"📍 Konum algılandı",
    fillTitleLocation:"Lütfen başlık ve konum girin",
    photoUploaded2:"Fotoğraf yüklendi",
    reportSubmitted:"İhbar gönderildi — kurtarma ekibi bildirildi",
    // ETA sayfası
    iCanHelpSheet:"Yardım edebilirim",
    chooseEta:"Ne zaman ulaşabileceğini seç. Bu bilgi ihbar kartında görünecek, böylece diğerleri yardımın yolda olduğunu bilecek.",
    // Yardım edildi kanıt sayfası
    proofRequired:"Kanıt gerekli.",
    proofNote:"Hayvanın yardım edildi olarak işaretlenebilmesi için güncel bir fotoğraf yükle.",
    photoUploaded:"✓ Fotoğraf yüklendi — göndermeye hazır",
    confirmHelped:"Onayla — Yardım Edildi İşaretle", replacePhoto:"Fotoğrafı Değiştir",
    uploadProof:"Hayvanın fotoğrafını yükle",
    proofHint:"Hayvanın mevcut durumunu göstermelidir",
    noPhotoNoHelp:"Fotoğraf yüklemeden bu işareti koyamazsın.",
    markedAsHelped:"✓ Yardım edildi olarak işaretlendi — teşekkürler!",
    // sahiplenme başvurusu
    applyTitle:"Sahiplenme Başvurusu", fosterAppTitle:"Geçici Bakım Başvurusu",
    personalInfo:"Kişisel Bilgiler", personalInfoSub:"Tüm bilgiler gizli tutulur.",
    firstName:"Ad *", lastName:"Soyad *", email:"E-posta *", phoneField:"Telefon *",
    ageField2:"Yaş *", occupationField:"Meslek *",
    homeTitle:"Ev & Yaşam Koşulları", homeSub:"Her hayvanın güvenli bir ortama gitmesini sağlamak istiyoruz.",
    homeType:"Konut türü *",
    apartment:"Daire / Apartman", apartmentHint:"Özel dış alan yok",
    house:"Bahçeli ev", houseHint:"Özel dış alan var",
    farmhouse:"Çiftlik evi", farmhouseHint:"Kırsal alan",
    other:"Diğer",
    ownRentQ:"Kiralık mı, kendinize ait mi? *", own:"Evin sahibiyim",
    rent:"Kiracıyım", rentHint:"Ev sahibinin izni gerekebilir",
    outdoorQ:"Dış alan var mı? *", fenced:"Evet — çevrili / güvenli", unfenced:"Evet — çevrili değil", noOutdoor:"Dış alan yok",
    childrenQ:"Evde çocuk var mı? *", noChildren:"Çocuk yok", yesLive:"Evet, evde kalıyor", yesVisit:"Düzenli olarak ziyaret ediyor",
    childAges:"Çocukların yaşları", householdSize:"Evdeki kişi sayısı *",
    lifestyleTitle:"Yaşam Tarzı", lifestyleSub:"Günlük rutinini öğrenmek doğru eşleşmeyi bulmamıza yardımcı olur.",
    hoursQ:"Evde günde kaç saat biri bulunur? *",
    h04:"0–4 saat", h04hint:"Çoğunlukla dışarıda",
    h48:"4–8 saat", h48hint:"Orta düzeyde",
    h812:"8–12 saat", h812hint:"Çoğunlukla evde",
    h12:"12+ saat", h12hint:"Neredeyse hep evde",
    activityQ:"Aktivite düzeyin nedir? *",
    relaxed:"Sakin", relaxedHint:"Sessiz bir ev",
    moderate:"Orta", moderateHint:"Düzenli yürüyüşler",
    veryActive:"Çok aktif", veryActiveHint:"Günlük spor, doğa yürüyüşü",
    travelQ:"Ne sıklıkla seyahat edersin? *",
    rarely:"Nadiren", monthly:"Aylık", weeklyMore:"Haftalık veya daha sık",
    petCareQ:"Seyahatte hayvana kim bakacak?",
    petCarePlaceholder:"Aile üyesi, petsitter…",
    allergiesQ:"Hayvanlara alerjin var mı?", allergiesPlaceholder:"Yok veya açıkla",
    experienceTitle:"Hayvanlarla Deneyim",
    experienceSub_adopt:"Hayvanlarla geçmişin ve planların hakkında bilgi ver:",
    hadPetsQ:"Daha önce evcil hayvanın oldu mu? *",
    yesCurrent:"Evet — şu an evcil hayvanım var",
    yesPast:"Evet — daha önce evcil hayvan besledim",
    noFirst:"Hayır — bu benim ilk evcil hayvanım olur",
    currentPetsDesc:"Mevcut hayvanlarını açıkla",
    currentPetsPlaceholder:"Tür, mizaç, yeni hayvanlarla nasıl geçindikleri",
    pastPetsDesc:"Önceki evcil hayvanların hakkında anlat",
    pastPetsPlaceholder:"Onlara ne oldu? Ne kadar süre besledin?",
    vetRef:"Veteriner referansı (isteğe bağlı)", vetPlaceholder:"Veteriner adı ve konumu",
    whyAdopt_adopt:"Bu hayvanı neden sahiplenmek istiyorsun?",
    whyAdopt_foster:"Bu hayvana neden geçici bakım vermek istiyorsun?",
    whyPlaceholder:"Bu hayvanı seçme sebebin? Neden iyi bir eşleşmesiniz?",
    longTermQ:"Uzun vadeli bakım planın? *", longTermPlaceholder:"Koşullar değişse bile yıllar içinde hayvana nasıl bakacaksın?",
    declaration:"Tüm bilgilerin doğru olduğunu onaylıyorum. Paweero ev ziyareti yapabilir ve herhangi bir başvuruyu gerekçe göstermeksizin reddedebilir.",
    reviewTitle:"Başvurunu Gözden Geçir", reviewSub:"Düzenlemek için tamamlanmış adımlara dokun.",
    confirmNote_pre:"Onay e-postası", confirmNote_post:"adresine gönderilecek. 3–5 iş günü içinde yanıt alırsın.",
    personalSection:"Kişisel", homeSection:"Ev", lifestyleSection:"Yaşam", experienceSection:"Deneyim",
    nameLabel:"Ad Soyad", emailLabel:"E-posta", phoneLabel:"Telefon", ageLabel:"Yaş", occupationLabel:"Meslek",
    homeTypeLabel:"Konut", ownRentLabel:"Mülkiyet", outdoorLabel:"Dış alan", childrenLabel:"Çocuk", householdLabel:"Kişi sayısı",
    hoursLabel:"Evde saat", activityLabel:"Aktivite", travelLabel:"Seyahat",
    hadPetsLabel:"Hayvan geçmişi", whyLabel:"Neden", stepBack:"Geri", stepContinue:"Devam", stepSubmit:"Gönder",
    stepOf:"/ ",
    appSubmitted:"Başvuru Gönderildi",
    appSubmittedDesc_pre:"Teşekkürler,", appSubmittedDesc_adopt:"sahiplenme başvurunu aldık:", appSubmittedDesc_foster:"geçici bakım başvurunu aldık:", appSubmittedDesc_post:"",
    refLabel:"Referans",
    appStep1:"Başvuru alındı", appStep1d:"Başvurun sistemimizde.",
    appStep2:"Ekip incelemesi", appStep2d:"Profilini değerlendiriyoruz.",
    appStep3:"Karar e-postayla bildirilecek", appStep3d_pre:"3–5 iş günü içinde", appStep3d_post:"adresine yanıt gönderilecek.",
    appStep4_adopt:"Ev ziyareti", appStep4d_adopt:"Onaydan önce kısa bir ziyaret ayarlanabilir.",
    appStep4_foster:"Bakım brifing", appStep4d_foster:"Bakım gereksinimleri hakkında seni bilgilendireceğiz.",
    done:"Tamam",
    // genel
    close:"Kapat", contact:"İletişim", savedFavourites:"Favorilere eklendi",
    accepts:"Kabul ediyor:", noneToPost:"Henüz gösterilecek bir şey yok.",
  },
};
// ─────────────────────────────────────────────────────────────────────────────
// CSS
// ─────────────────────────────────────────────────────────────────────────────
const CSS = `
  /* Aptos Display — Microsoft's modern humanist sans-serif.
     Available natively on Windows 11 / Office 365 systems.
     We load a close web substitute (Plus Jakarta Sans) as fallback for other platforms. */
  @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap');

  /* Force font inheritance on ALL elements including native form controls */
  *, *::before, *::after { box-sizing:border-box; margin:0; padding:0; -webkit-tap-highlight-color:transparent; font-family:inherit; }
  input, button, select, textarea, optgroup { font-family:inherit; }
  :root {
    --white:#fff; --off:#f7f7f8; --border:#e8e8ea; --light:#f2f2f4;
    --muted:#8a8a8e; --body:#2c2c2e; --dark:#1c1c1e;
    --amber:#d4862b; --red:#c0392b; --green:#2d7a4f; --blue:#2563eb;
    /* Aptos Display first, then system fallbacks, then web fallback */
    --font:'Aptos Display','Aptos','Plus Jakarta Sans','Segoe UI Variable Display','Segoe UI',-apple-system,BlinkMacSystemFont,system-ui,sans-serif;
    --pad:20px; --nav-h:64px; --top-h:56px; --r:16px; --r-sm:12px; --r-lg:22px;
    --shadow-sm: 0 1px 3px rgba(0,0,0,0.05), 0 1px 2px rgba(0,0,0,0.04);
    --shadow-md: 0 4px 16px rgba(0,0,0,0.07);
    --shadow-lg: 0 12px 32px rgba(0,0,0,0.10);
  }
  html { scroll-behavior:smooth; }
  body { font-family:var(--font); background:var(--white); color:var(--body); font-size:15px; line-height:1.5; -webkit-font-smoothing:antialiased; overflow-x:hidden; letter-spacing:-0.1px; }

  /* ─ TOPBAR ─ */
  .topbar { position:sticky; top:0; z-index:100; height:var(--top-h); background:var(--white); border-bottom:1px solid var(--border); display:flex; align-items:center; justify-content:space-between; padding:0 var(--pad); will-change:transform; backface-visibility:hidden; }
  .logo { font-family:var(--font); font-size:17px; font-weight:700; color:var(--dark); display:flex; align-items:center; gap:7px; letter-spacing:-0.3px; }
  .logo-dot { width:8px; height:8px; border-radius:50%; background:var(--amber); flex-shrink:0; }
  .desk-nav { display:none; gap:2px; }
  @media (min-width:768px) { .desk-nav { display:flex; } }
  .dnav { font-size:13px; font-weight:500; color:var(--muted); background:none; border:none; padding:6px 12px; border-radius:6px; cursor:pointer; transition:all 0.12s; }
  .dnav:hover { color:var(--dark); background:var(--light); }
  .dnav.on { color:var(--dark); font-weight:600; background:var(--light); }
  .dnav.red { color:var(--muted); }
  .dnav.red.on { color:var(--red); background:rgba(192,57,43,0.07); }
  /* language selector */
  .lang-sel { display:flex; align-items:center; gap:2px; background:var(--light); border:1px solid var(--border); border-radius:6px; padding:2px; flex-shrink:0; }
  .lang-btn { font-family:var(--font); font-size:12px; font-weight:600; color:var(--muted); background:none; border:none; padding:4px 8px; border-radius:5px; cursor:pointer; transition:all 0.12s; letter-spacing:0.3px; }
  .lang-btn.on { background:var(--white); color:var(--dark); box-shadow:0 1px 3px rgba(0,0,0,0.1); }

  /* ─ BOTTOM NAV ─ */
  .bottom-nav { position:fixed; bottom:0; left:0; right:0; z-index:100; height:var(--nav-h); background:var(--white); border-top:1px solid var(--border); display:flex; justify-content:space-around; align-items:center; padding-bottom:env(safe-area-inset-bottom,0); transform:translateZ(0); -webkit-transform:translateZ(0); will-change:transform; backface-visibility:hidden; }
  @media (min-width:768px) { .bottom-nav { display:none; } }
  .tab-btn { display:flex; flex-direction:column; align-items:center; gap:3px; background:none; border:none; cursor:pointer; flex:1; padding:8px 4px; color:var(--muted); transition:color 0.12s; }
  .tab-btn.on { color:var(--dark); }
  .tab-btn.red.on { color:var(--red); }
  .tab-icon  { font-size:20px; line-height:1; }
  .tab-label { font-size:10px; font-weight:600; letter-spacing:0.2px; }
  .tab-bar   { width:18px; height:2px; border-radius:1px; background:var(--amber); margin-top:2px; opacity:0; transition:opacity 0.12s; }
  .tab-btn.on .tab-bar { opacity:1; }
  .tab-btn.red.on .tab-bar { background:var(--red); }

  /* ─ LAYOUT ─ */
  .app  { min-height:calc(100vh - var(--top-h)); padding-bottom:var(--nav-h); }
  @media (min-width:768px) { .app { padding-bottom:0; } }
  .wrap { max-width:960px; margin:0 auto; padding:0 var(--pad) 48px; }

  /* ─ PAGE HEADER ─ */
  .ph { background:var(--white); border-bottom:1px solid var(--border); padding:14px var(--pad) 0; position:sticky; top:var(--top-h); z-index:50; }
  .ph-title { font-size:20px; font-weight:700; color:var(--dark); letter-spacing:-0.3px; }
  .ph-sub   { font-size:12px; color:var(--muted); margin-top:2px; margin-bottom:12px; }

  /* ─ SUB-TABS ─ */
  .stabs { display:flex; gap:0; border-bottom:1px solid var(--border); overflow-x:auto; scrollbar-width:none; margin-bottom:-1px; }
  .stabs::-webkit-scrollbar { display:none; }
  .stab { font-size:13px; font-weight:500; color:var(--muted); background:none; border:none; border-bottom:2px solid transparent; padding:10px 16px; cursor:pointer; white-space:nowrap; margin-bottom:0; transition:all 0.12s; min-height:44px; }
  .stab:hover { color:var(--dark); }
  .stab.on { color:var(--dark); border-bottom-color:var(--dark); font-weight:600; }

  /* ─ HERO ─ */
  .hero { padding:0; border-bottom:none; overflow:hidden; }
  .hero-inner { display:flex; flex-direction:column; max-width:1100px; margin:0 auto; }
  @media (min-width:768px) { .hero-inner { flex-direction:row; align-items:center; gap:8px; } }
  /* flex-basis follows the main axis — in the mobile column layout that is the
     HEIGHT, so a basis here would pad the text block out to a fixed height and
     leave dead space above the image. Sizing is by content until the row layout. */
  .hero-text { padding:52px var(--pad) 8px; flex:0 0 auto; min-width:0; }
  @media (min-width:768px) { .hero-text { padding:56px 0 56px var(--pad); flex:1 1 460px; } }
  /* The image keeps its own aspect ratio — no fixed box, so it never letterboxes
     and leaves empty space above the stats line. line-height:0 kills the inline gap. */
  .hero-media { position:relative; max-width:460px; margin:8px auto 0; border-radius:var(--r-lg); overflow:hidden; line-height:0; }
  @media (min-width:768px) { .hero-media { flex:0 1 460px; margin:0 var(--pad) 0 0; } }
  .hero-media img {
    width:100%; height:auto; display:block;
  }
  .hero-media::after {
    /* Soft edge fade where the image meets the text — a purely decorative overlay,
       never affects layout height. */
    content:""; position:absolute; inset:0; pointer-events:none;
    background:linear-gradient(to bottom, var(--white) 0%, transparent 16%);
  }
  @media (min-width:768px) {
    .hero-media::after { background:linear-gradient(to right, var(--white) 0%, transparent 14%); }
  }
  .hero-label { font-size:12px; font-weight:600; letter-spacing:1.5px; text-transform:uppercase; color:var(--muted); margin-bottom:14px; }
  .hero-h1 { font-size:clamp(30px,6vw,46px); font-weight:700; color:var(--dark); line-height:1.1; margin-bottom:14px; letter-spacing:-1px; }
  .hero-h1 em { color:var(--amber); font-style:italic; }
  .hero-p  { font-size:15px; color:var(--muted); max-width:440px; line-height:1.65; margin-bottom:28px; }
  .hero-cta { display:flex; gap:10px; flex-wrap:wrap; }

  /* ─ STATS ─ */
  .stats { display:grid; grid-template-columns:repeat(3,1fr); border-top:1px solid var(--border); border-bottom:1px solid var(--border); }
  .stat.clickable { cursor:pointer; transition:background 0.12s; }
  .stat.clickable:active { background:var(--off); }
  @media (hover:hover) { .stat.clickable:hover { background:var(--off); } }
  .stat  { padding:12px 0; text-align:center; border-right:1px solid var(--border); }
  .stat:last-child { border-right:none; }
  .stat-n { font-size:19px; font-weight:700; color:var(--dark); letter-spacing:-0.5px; }
  .stat-l { font-size:10px; font-weight:600; color:var(--muted); letter-spacing:0.5px; text-transform:uppercase; margin-top:2px; }

  /* ─ HOME QUICK LINKS ─ */
  .sec-label { font-size:11px; font-weight:600; letter-spacing:1px; text-transform:uppercase; color:var(--muted); margin:24px 0 12px; }
  .ql-list { display:flex; flex-direction:column; gap:10px; }
  .ql-item { display:flex; align-items:center; gap:14px; padding:16px; cursor:pointer; transition:transform 0.12s, box-shadow 0.12s; background:var(--white); border-radius:var(--r); box-shadow:var(--shadow-sm); }
  .ql-item:active { transform:scale(0.98); }
  @media (hover:hover) { .ql-item:hover { box-shadow:var(--shadow-md); transform:translateY(-1px); } }
  .ql-icon  { font-size:21px; width:44px; height:44px; border-radius:11px; background:var(--light); display:flex; align-items:center; justify-content:center; flex-shrink:0; }
  .ql-body  { flex:1; min-width:0; }
  .ql-title { font-size:14.5px; font-weight:700; color:var(--dark); margin-bottom:1px; letter-spacing:-0.1px; }
  .ql-desc  { font-size:12.5px; color:var(--muted); line-height:1.4; }
  .ql-chev  { font-size:16px; color:var(--border); flex-shrink:0; }

  /* ─ FILTERS ─ */
  .filter-bar { background:var(--white); border-bottom:1px solid var(--border); padding:10px var(--pad); display:flex; gap:8px; flex-wrap:wrap; align-items:center; }
  .loc-select { background:var(--off); border:1px solid var(--border); border-radius:7px; padding:7px 24px 7px 10px; font-family:var(--font); font-size:12px; font-weight:500; color:var(--dark); outline:none; cursor:pointer; -webkit-appearance:none; appearance:none; background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6' fill='none'%3E%3Cpath d='M1 1l4 4 4-4' stroke='%23999' stroke-width='1.5' stroke-linecap='round'/%3E%3C/svg%3E"); background-repeat:no-repeat; background-position:right 8px center; min-height:34px; transition:border-color 0.12s; }
  .loc-select:focus { border-color:var(--dark); }
  .loc-select.on { border-color:var(--dark); background-color:var(--white); font-weight:600; }

  /* ─ CHIPS ─ */
  .chips-wrap { overflow-x:auto; scrollbar-width:none; margin:0 calc(-1 * var(--pad)); padding:0 var(--pad) 12px; }
  .chips-wrap::-webkit-scrollbar { display:none; }
  .chip-row { display:flex; gap:7px; min-width:max-content; }
  .chip { display:flex; align-items:center; gap:5px; background:var(--off); border:1px solid var(--border); border-radius:999px; padding:6px 12px; font-size:12px; font-weight:500; color:var(--body); cursor:pointer; transition:all 0.12s; min-height:34px; white-space:nowrap; }
  .chip:active { opacity:0.7; }
  .chip.on { background:var(--dark); border-color:var(--dark); color:#fff; }
  .chip-n  { font-size:10px; opacity:0.6; }
  .chip.on .chip-n { opacity:0.7; }

  /* ─ SEARCH ─ */
  .search-wrap { position:relative; margin-bottom:12px; }
  .search-icon { position:absolute; left:11px; top:50%; transform:translateY(-50%); color:var(--muted); font-size:13px; pointer-events:none; }
  .search-wrap input { width:100%; background:var(--off); border:1px solid var(--border); border-radius:var(--r); padding:10px 12px 10px 32px; font-family:var(--font); font-size:16px; color:var(--dark); outline:none; transition:border-color 0.12s; -webkit-appearance:none; }
  .search-wrap input:focus { border-color:var(--dark); background:var(--white); }
  .search-wrap input::placeholder { color:var(--muted); font-size:13px; }

  /* ─ TAGS ─ */
  .tags { display:flex; gap:5px; flex-wrap:wrap; margin-bottom:7px; }
  .tag  { background:var(--light); color:var(--muted); font-size:10px; font-weight:600; padding:2px 7px; border-radius:4px; }

  /* ─ BUTTONS ─ */
  /* ─ BUTTONS — single design system for all primary CTAs ─
     Every button shares: height, padding, font, radius, icon spacing,
     and hover/active/focus/disabled behavior. Color is the only thing
     that changes between variants. */
  .btn {
    font-family:var(--font); font-size:15px; font-weight:600; letter-spacing:-0.1px;
    border-radius:var(--r-sm); padding:12px 22px; min-height:46px;
    border:none; cursor:pointer; line-height:1;
    display:inline-flex; align-items:center; justify-content:center; gap:7px;
    white-space:nowrap; -webkit-tap-highlight-color:transparent;
    transition:background-color 0.15s, box-shadow 0.15s, transform 0.1s, opacity 0.15s;
  }
  .btn:active { transform:scale(0.97); }
  .btn:focus-visible { outline:none; box-shadow:0 0 0 3px rgba(212,134,43,0.35); }
  .btn:disabled, .btn[disabled] { opacity:0.4; cursor:not-allowed; transform:none; box-shadow:none; }

  /* Primary — the platform's single highest-emphasis CTA style.
     A deepened amber (darker than the brand accent) so white text clears
     WCAG AA contrast (4.5:1+) while still reading as "on-brand". */
  .btn-primary {
    background:#9C5F1A; color:#fff;
  }
  @media (hover:hover) { .btn-primary:hover { background:#834F15; } }
  .btn-primary:active { background:#704512; }
  .btn-primary:focus-visible { box-shadow:0 0 0 3px rgba(156,95,26,0.3); }

  .btn-dark   { background:var(--dark);  color:#fff; }
  @media (hover:hover) { .btn-dark:hover { background:#000; } }
  .btn-outline { background:var(--off); color:var(--dark); }
  @media (hover:hover) { .btn-outline:hover { background:var(--light); } }
  .btn-red    { background:var(--red);   color:#fff; }
  @media (hover:hover) { .btn-red:hover { background:#a8332a; } }
  .btn-red:focus-visible { box-shadow:0 0 0 3px rgba(192,57,43,0.3); }
  .btn-green  { background:var(--green); color:#fff; }
  @media (hover:hover) { .btn-green:hover { background:#256640; } }
  .btn-blue   { background:var(--blue);  color:#fff; }
  @media (hover:hover) { .btn-blue:hover { background:#1d4ed8; } }
  .btn-sm  { padding:8px 15px; font-size:13px; min-height:38px; border-radius:10px; }
  .btn-full { width:100%; justify-content:center; }
  /* Full-width on mobile only — for page-header CTAs that shouldn't stretch edge-to-edge on desktop */
  .btn-full-mobile { width:100%; justify-content:center; }
  @media (min-width:768px) { .btn-full-mobile { width:auto; } }

  /* ─ ANIMAL CARDS ─ */
  .a-list { display:grid; grid-template-columns:1fr; gap:16px; }
  @media (min-width:560px)  { .a-list { grid-template-columns:repeat(auto-fill, minmax(240px, 1fr)); } }
  @media (min-width:1100px) { .a-list { grid-template-columns:repeat(auto-fill, minmax(260px, 1fr)); } }
  .acard  { background:var(--white); border:none; border-radius:var(--r-lg); overflow:hidden; cursor:pointer; transition:transform 0.15s, box-shadow 0.15s; display:flex; flex-direction:column; box-shadow:var(--shadow-sm); }
  .acard:active { opacity:0.92; transform:scale(0.99); }
  @media (hover:hover) { .acard:hover { box-shadow:var(--shadow-md); transform:translateY(-1px); } }
  .acard-img { width:100%; aspect-ratio:4/3; flex-shrink:0; display:flex; align-items:center; justify-content:center; font-size:52px; position:relative; background:var(--off); }
  .acard-body { padding:16px 18px 18px; flex:1; display:flex; flex-direction:column; justify-content:center; min-width:0; }
  .acard-name { font-size:17px; font-weight:700; color:var(--dark); margin-bottom:3px; letter-spacing:-0.3px; }
  .acard-meta { font-size:12.5px; color:var(--muted); margin-bottom:8px; }
  .acard-foot { display:flex; justify-content:space-between; align-items:center; margin-top:auto; padding-top:6px; }
  .acard-loc  { font-size:11.5px; color:var(--muted); }
  .abadge { position:absolute; font-size:10.5px; font-weight:600; padding:4px 10px; border-radius:999px; backdrop-filter:blur(6px); }
  .ab-red  { top:12px; right:12px; background:rgba(192,57,43,0.92);  color:#fff; }
  .ab-grn  { top:12px; right:12px; background:rgba(45,122,79,0.92); color:#fff; }
  .ab-sp   { top:12px; left:12px;  background:rgba(0,0,0,0.5); color:#fff; }
  .ab-fo   { bottom:12px; left:12px; background:rgba(45,122,79,0.9); color:#fff; }

  /* home mini card */
  .mini-row { display:flex; gap:14px; overflow-x:auto; padding-bottom:4px; scrollbar-width:none; margin:0 calc(-1 * var(--pad)); padding-left:var(--pad); padding-right:var(--pad); }
  .mini-row::-webkit-scrollbar { display:none; }
  .mini-card { flex-shrink:0; width:168px; background:var(--white); border:none; border-radius:var(--r); overflow:hidden; cursor:pointer; transition:transform 0.12s, box-shadow 0.12s; box-shadow:var(--shadow-sm); }
  .mini-card:active { opacity:0.9; transform:scale(0.98); }
  @media (hover:hover) { .mini-card:hover { box-shadow:var(--shadow-md); } }

  /* ─ LOST & FOUND ─ */
  .lf-list { display:flex; flex-direction:column; gap:14px; }
  .lf-card { background:var(--white); border:none; border-radius:var(--r); padding:16px 18px; cursor:pointer; transition:transform 0.12s, box-shadow 0.12s; box-shadow:var(--shadow-sm); }
  .lf-card:active { opacity:0.92; transform:scale(0.99); }
  @media (hover:hover) { .lf-card:hover { box-shadow:var(--shadow-md); transform:translateY(-1px); } }
  .lf-card.reunited { opacity:0.5; }
  .lf-top  { display:flex; align-items:flex-start; gap:14px; margin-bottom:10px; }
  .lf-emo  { font-size:36px; width:72px; height:72px; border-radius:var(--r-sm); background:var(--off); display:flex; align-items:center; justify-content:center; flex-shrink:0; position:relative; }
  .lf-type { position:absolute; bottom:-5px; right:-5px; font-size:9px; font-weight:700; padding:2px 6px; border-radius:4px; text-transform:uppercase; white-space:nowrap; }
  .lf-lost { background:#fdecea; color:var(--red); }
  .lf-found { background:#e8f5e9; color:var(--green); }
  .lf-reunited { background:#e8f0ff; color:var(--blue); }
  .lf-name { font-size:15px; font-weight:700; color:var(--dark); margin-bottom:2px; letter-spacing:-0.2px; }
  .lf-meta { font-size:12px; color:var(--muted); margin-bottom:3px; }
  .lf-desc { font-size:12.5px; color:var(--muted); line-height:1.55; margin-bottom:10px; }
  .lf-foot { display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:6px; }
  .lf-loc  { font-size:11px; color:var(--muted); }
  .lf-contact { font-size:11px; font-weight:600; color:var(--dark); }
  .reward-pill { font-size:10px; font-weight:700; background:rgba(212,134,43,0.12); color:var(--amber); padding:2px 8px; border-radius:999px; }

  /* ─ SITTER CARDS ─ */
  .sitter-list { display:flex; flex-direction:column; gap:14px; }
  .sitter-card { background:var(--white); border:none; border-radius:var(--r); padding:18px; transition:transform 0.12s, box-shadow 0.12s; cursor:pointer; box-shadow:var(--shadow-sm); }
  .sitter-card:active { opacity:0.92; transform:scale(0.99); }
  @media (hover:hover) { .sitter-card:hover { box-shadow:var(--shadow-md); transform:translateY(-1px); } }
  .sitter-top    { display:flex; gap:14px; align-items:flex-start; margin-bottom:10px; }
  .sitter-avatar { font-size:28px; width:56px; height:56px; border-radius:50%; background:var(--off); border:none; display:flex; align-items:center; justify-content:center; flex-shrink:0; }
  .sitter-name   { font-size:15px; font-weight:700; color:var(--dark); margin-bottom:2px; letter-spacing:-0.2px; }
  .sitter-loc    { font-size:12px; color:var(--muted); margin-bottom:3px; }
  .sitter-stars  { font-size:11px; color:var(--amber); }
  .sitter-price  { font-size:13px; font-weight:700; color:var(--dark); margin-left:auto; text-align:right; white-space:nowrap; }
  .sitter-avail  { font-size:10px; color:var(--muted); text-align:right; margin-top:1px; }
  .sitter-bio    { font-size:12.5px; color:var(--muted); line-height:1.55; margin-bottom:10px; }
  .svc-wrap { display:flex; gap:5px; flex-wrap:wrap; margin-bottom:10px; }
  .svc-tag  { background:var(--off); border:none; color:var(--body); font-size:10.5px; font-weight:500; padding:3px 10px; border-radius:999px; }
  .sitter-foot { display:flex; gap:8px; justify-content:space-between; align-items:center; border-top:1px solid var(--border); padding-top:12px; margin-top:2px; }
  .sitter-yard { font-size:11px; color:var(--muted); }

  /* ─ ADOPTER CARDS ─ */
  .p-list { display:flex; flex-direction:column; gap:12px; }
  .pcard  { background:var(--white); border-radius:var(--r); box-shadow:var(--shadow-sm); padding:16px 18px; display:flex; gap:14px; align-items:flex-start; }
  .pav    { font-size:26px; width:50px; height:50px; border-radius:var(--r-sm); background:var(--off); display:flex; align-items:center; justify-content:center; flex-shrink:0; }
  .pname  { font-size:15px; font-weight:700; color:var(--dark); margin-bottom:2px; letter-spacing:-0.2px; }
  .plook  { font-size:12px; color:var(--muted); margin-bottom:6px; }
  .plook strong { color:var(--dark); }
  .pdesc  { font-size:12.5px; color:var(--muted); line-height:1.5; margin-bottom:6px; }

  /* ─ REPORT CARDS ─ */
  .r-list { display:flex; flex-direction:column; gap:14px; }
  .rcard  { background:var(--white); border:none; border-radius:var(--r); padding:16px 18px; box-shadow:var(--shadow-sm); }
  .rcard.helped   { box-shadow:0 0 0 1.5px rgba(37,99,235,0.25), var(--shadow-sm); }
  .rcard.resolved { opacity:0.55; }
  .r-icon  { font-size:28px; flex-shrink:0; position:relative; }
  .r-title { font-size:14px; font-weight:700; color:var(--dark); margin-bottom:2px; letter-spacing:-0.2px; }
  .r-desc  { font-size:12.5px; color:var(--muted); line-height:1.5; margin-bottom:8px; }
  .r-meta  { display:flex; gap:10px; flex-wrap:wrap; margin-bottom:6px; }
  .r-mi    { font-size:10px; color:var(--muted); }

  /* volunteer list on report card */
  .r-volunteers { display:flex; flex-direction:column; gap:4px; margin-top:6px; }
  .r-vol-item { display:flex; align-items:center; gap:6px; font-size:11px; color:var(--dark); }
  .r-vol-dot  { width:6px; height:6px; border-radius:50%; background:var(--blue); flex-shrink:0; }
  .r-vol-eta  { color:var(--muted); }

  /* report card action row */
  .r-actions { display:flex; gap:8px; align-items:center; justify-content:space-between; margin-top:10px; padding-top:10px; border-top:1px solid var(--border); flex-wrap:wrap; }
  .r-status-badge { display:inline-flex; align-items:center; gap:5px; }

  .spill { font-size:10px; font-weight:600; padding:2px 8px; border-radius:4px; }
  .sp-a  { background:rgba(192,57,43,0.1);  color:var(--red);   }
  .sp-p  { background:rgba(212,134,43,0.12); color:var(--amber); }
  .sp-h  { background:rgba(37,99,235,0.1);  color:var(--blue);  }
  .sp-r  { background:rgba(45,122,79,0.1);  color:var(--green); }

  /* ─ FORMS ─ */
  .fg { margin-bottom:16px; }
  .flabel { display:block; font-size:13px; font-weight:600; color:var(--dark); letter-spacing:-0.1px; margin-bottom:7px; }
  .fi,.fs,.fta { width:100%; background:var(--off); border:none; border-radius:var(--r-sm); padding:13px 14px; font-family:var(--font); font-size:16px; color:var(--dark); outline:none; transition:box-shadow 0.15s, background 0.15s; -webkit-appearance:none; appearance:none; box-shadow:0 0 0 1.5px transparent inset; }
  .fi:focus,.fs:focus,.fta:focus { background:var(--white); box-shadow:0 0 0 2px var(--dark) inset; }
  .fi::placeholder,.fta::placeholder { color:#b3b3b6; }
  .fta { resize:vertical; min-height:88px; font-size:15px; }
  .frow { display:grid; grid-template-columns:1fr 1fr; gap:12px; }
  @media (max-width:480px) { .frow { grid-template-columns:1fr; } }

  /* ─ SELECTABLE OPTION CARDS — custom Apple-style indicator, no native checkbox/radio look ─ */
  .opt-group { display:flex; flex-direction:column; gap:8px; }
  .opt-item  {
    display:flex; align-items:center; gap:12px; background:var(--off); border:1.5px solid transparent;
    border-radius:var(--r-sm); padding:13px 14px; cursor:pointer; min-height:50px; transition:all 0.15s;
    position:relative;
  }
  .opt-item:active { transform:scale(0.99); }
  .opt-item.on { border-color:var(--dark); background:var(--white); box-shadow:var(--shadow-sm); }
  /* Hide the native input entirely — it still handles state/click via the wrapping <label> */
  .opt-item input { position:absolute; opacity:0; width:0; height:0; pointer-events:none; }
  /* Custom indicator, drawn purely in CSS: empty ring by default, filled + checkmark when selected */
  .opt-item::before {
    content:""; flex-shrink:0; width:20px; height:20px; border-radius:50%;
    border:1.5px solid #d1d1d4; background:var(--white); transition:all 0.15s;
    order:99; /* indicator sits at the end, like iOS settings rows */
  }
  .opt-item.on::before {
    border-color:var(--dark); background:var(--dark);
    background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16'%3E%3Cpath fill='none' stroke='%23fff' stroke-width='2' stroke-linecap='round' stroke-linejoin='round' d='M3.5 8.5l3 3 6-6.5'/%3E%3C/svg%3E");
    background-repeat:no-repeat; background-position:center;
  }
  .opt-item > div:last-child { flex:1; min-width:0; }
  .opt-item .pc-icon { display:flex; align-items:center; justify-content:center; flex-shrink:0; border-radius:11px; background:var(--light); }
  .opt-label { font-size:14.5px; font-weight:600; color:var(--dark); flex:1; }
  .opt-hint  { font-size:12px; color:var(--muted); margin-top:2px; font-weight:400; }

  /* ─ PURPOSE CHIPS — compact grid variant of opt-item, used for multi-select "what applies" rows ─ */
  .purpose-chip {
    display:flex; flex-direction:column; align-items:center; justify-content:center; gap:8px;
    background:var(--off); border:1.5px solid transparent; border-radius:var(--r-sm);
    padding:14px 10px; cursor:pointer; transition:all 0.15s; text-align:center; position:relative;
    flex:1 1 96px; min-height:88px;
  }
  .purpose-chip:active { transform:scale(0.97); }
  .purpose-chip input { position:absolute; opacity:0; width:0; height:0; pointer-events:none; }
  .purpose-chip .pc-icon { font-size:21px; width:42px; height:42px; border-radius:11px; background:var(--light); display:flex; align-items:center; justify-content:center; flex-shrink:0; }
  .purpose-chip .pc-label { font-size:12.5px; font-weight:600; color:var(--dark); }
  .purpose-chip.on { background:var(--white); box-shadow:var(--shadow-sm); }
  .purpose-chip.on::after {
    content:""; position:absolute; top:8px; right:8px; width:18px; height:18px; border-radius:50%;
    background-color:var(--dark);
    background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16'%3E%3Cpath fill='none' stroke='%23fff' stroke-width='2.2' stroke-linecap='round' stroke-linejoin='round' d='M3.5 8.5l3 3 6-6.5'/%3E%3C/svg%3E");
    background-repeat:no-repeat; background-position:center;
    box-shadow:0 0 0 2px var(--white);
  }
  .purpose-chip.chip-lost.on   { border-color:var(--red); }
  .purpose-chip.chip-found.on  { border-color:var(--green); }
  .purpose-chip.chip-help.on   { border-color:var(--red); }
  .purpose-chip.chip-foster.on { border-color:var(--blue); }
  .purpose-chip.chip-adopt.on  { border-color:var(--amber); }

  .loc-row   { display:flex; gap:8px; }
  .loc-row .fi { flex:1; }
  .loc-btn   { background:var(--dark); color:#fff; border:none; border-radius:var(--r-sm); padding:10px 12px; font-size:17px; cursor:pointer; flex-shrink:0; min-height:44px; }
  .type-row  { display:flex; gap:7px; flex-wrap:wrap; }
  .tbtn { font-size:20px; padding:8px 10px; border:none; border-radius:12px; background:var(--off); cursor:pointer; min-height:44px; min-width:44px; transition:all 0.12s; }
  .tbtn.on { background:var(--dark); }
  .photo-drop { border:1.5px dashed #d1d1d4; border-radius:var(--r-sm); padding:26px; text-align:center; cursor:pointer; background:var(--off); }
  .photo-drop:active { border-color:var(--dark); }
  .photo-prev { height:88px; border-radius:12px; border:none; background:var(--off); display:flex; align-items:center; justify-content:center; font-size:40px; margin-bottom:10px; }
  .err       { font-size:13px; color:var(--red); margin-top:5px; font-weight:800; display:flex; align-items:center; gap:5px; letter-spacing:0.1px; animation:errShake 0.32s ease; }
  .err::before { content:"⚠"; font-size:13px; line-height:1; }
  @keyframes errShake { 0%,100%{transform:translateX(0)} 20%,60%{transform:translateX(-4px)} 40%,80%{transform:translateX(4px)} }
  .fg .err ~ * , .fg.has-err .fi { }
  .fi.fi-err, .fta.fi-err { border-color:var(--red) !important; box-shadow:0 0 0 3px rgba(220,53,69,0.14); }
  .opt-group.opt-err { outline:2px solid rgba(220,53,69,0.35); outline-offset:3px; border-radius:12px; }
  .info-pill { display:inline-flex; align-items:center; gap:5px; background:rgba(45,122,79,0.08); color:var(--green); font-size:12px; font-weight:600; padding:4px 10px; border-radius:999px; margin-bottom:14px; }
  .divider   { height:1px; background:var(--border); margin:20px 0; }
  .toggle-btn { padding:6px 12px; border-radius:999px; border:1px solid var(--border); font-size:12px; font-weight:500; cursor:pointer; background:var(--off); color:var(--body); transition:all 0.12s; font-family:var(--font); }
  .toggle-btn.on { background:var(--dark); border-color:var(--dark); color:#fff; }

  /* ─ SHEET MODAL ─ */
  /* Sürüm damgası — bilerek silik; aradığında görürsün, aramadığında fark etmezsin.
     Alt boşluk sabit bottom-nav'ı temizlemeli, yoksa damga menünün arkasında kalır. */
  .build-stamp { text-align:center; font-size:10px; color:var(--muted); opacity:0.45; letter-spacing:0.3px; user-select:all;
                 padding:18px 0 calc(var(--nav-h) + 14px + env(safe-area-inset-bottom,0px)); }
  @media (min-width:768px) { .build-stamp { padding-bottom:22px; } }

  html.sheet-open, html.sheet-open body { overflow:hidden; overscroll-behavior:none; }
  .sheet-overlay { position:fixed; inset:0; z-index:200; background:rgba(0,0,0,0.3); display:flex; align-items:flex-end; overflow:hidden; }
  @media (min-width:640px) { .sheet-overlay { align-items:center; justify-content:center; padding:24px; } }
  /* The sheet is bottom-anchored, so anything taller than the overlay spills off
     the TOP and clips its own header. On iOS Safari vh counts the browser chrome
     as visible space, making 92vh taller than what the user can actually see —
     hence the cut-off. dvh tracks the real viewport, and the 100% cap keeps the
     sheet inside the overlay no matter which unit the browser honours. */
  .sheet { background:var(--white); border-radius:22px 22px 0 0; width:100%; max-height:92vh; max-height:min(92dvh, 100%); display:flex; flex-direction:column; overflow:hidden; animation:slideUp 0.25s cubic-bezier(0.32,0.72,0,1); }
  @media (min-width:640px) { .sheet { border-radius:20px; max-width:580px; max-height:88vh; max-height:min(88dvh, 100%); animation:fadeScale 0.18s ease; } }
  @keyframes loadbar { 0%{transform:scaleX(0);transform-origin:left} 50%{transform:scaleX(1);transform-origin:left} 51%{transform:scaleX(1);transform-origin:right} 100%{transform:scaleX(0);transform-origin:right} }
  @keyframes slideUp   { from{transform:translateY(100%)} to{transform:translateY(0)} }
  @keyframes fadeScale { from{opacity:0;transform:scale(0.97)} to{opacity:1;transform:scale(1)} }
  .sh-handle { width:36px; height:4px; background:var(--border); border-radius:2px; margin:10px auto; flex-shrink:0; }
  @media (min-width:640px) { .sh-handle { display:none; } }
  .sh-hd    { display:flex; align-items:center; justify-content:space-between; padding:0 20px 14px; border-bottom:1px solid var(--border); flex-shrink:0; }
  .sh-title { font-size:15px; font-weight:600; color:var(--dark); letter-spacing:-0.2px; }
  .sh-close { background:var(--light); border:none; border-radius:6px; width:28px; height:28px; font-size:13px; color:var(--muted); display:flex; align-items:center; justify-content:center; cursor:pointer; }
  .sh-body  { flex:1; overflow-y:auto; padding:20px; -webkit-overflow-scrolling:touch; }
  .sh-foot  { padding:14px 20px; border-top:1px solid var(--border); display:flex; justify-content:space-between; align-items:center; flex-shrink:0; padding-bottom:max(14px,env(safe-area-inset-bottom)); background:var(--white); }
  .app-strip { display:flex; align-items:center; gap:10px; padding:12px 20px; border-bottom:1px solid var(--border); flex-shrink:0; flex-wrap:wrap; }
  .app-strip-emoji { font-size:26px; width:42px; height:42px; border-radius:8px; background:var(--off); display:flex; align-items:center; justify-content:center; flex-shrink:0; }
  .app-strip-name  { font-size:13px; font-weight:600; color:var(--dark); }
  .app-strip-meta  { font-size:11px; color:var(--muted); }
  .app-strip-note  { font-size:11px; color:var(--muted); background:var(--off); border-radius:6px; padding:5px 9px; margin-left:auto; max-width:170px; line-height:1.5; }
  .step-bar   { padding:10px 16px; border-bottom:1px solid var(--border); flex-shrink:0; }
  .step-track { display:flex; align-items:center; }
  .s-item  { display:flex; flex-direction:column; align-items:center; gap:3px; flex:1; }
  .s-item.click { cursor:pointer; }
  .s-circle { width:22px; height:22px; border-radius:50%; border:1.5px solid var(--border); background:var(--white); display:flex; align-items:center; justify-content:center; font-size:10px; font-weight:600; color:var(--muted); position:relative; z-index:1; transition:all 0.15s; }
  .s-item.done   .s-circle { background:var(--dark); border-color:var(--dark); color:#fff; }
  .s-item.active .s-circle { background:var(--dark); border-color:var(--dark); color:#fff; }
  .s-lbl  { font-size:9px; font-weight:600; color:var(--muted); }
  .s-item.active .s-lbl { color:var(--dark); }
  .s-line { flex:1; height:1.5px; background:var(--border); margin-top:-14px; z-index:0; }
  .s-line.done { background:var(--dark); }
  .step-count { font-size:11px; color:var(--muted); }
  .rev-sec { background:var(--off); border-radius:8px; padding:12px; margin-bottom:10px; }
  .rev-ttl { font-size:10px; font-weight:600; color:var(--muted); text-transform:uppercase; letter-spacing:0.5px; margin-bottom:6px; }
  .rev-row { display:flex; justify-content:space-between; gap:8px; margin-bottom:4px; }
  .rev-row:last-child { margin-bottom:0; }
  .rk { font-size:12px; color:var(--muted); flex-shrink:0; }
  .rv { font-size:12px; font-weight:500; color:var(--dark); text-align:right; max-width:200px; }
  .success { text-align:center; padding:24px 12px; }
  .suc-i { font-size:44px; margin-bottom:10px; }
  .suc-t { font-size:20px; font-weight:700; color:var(--dark); margin-bottom:8px; letter-spacing:-0.3px; }
  .suc-d { font-size:13px; color:var(--muted); line-height:1.7; margin:0 auto 14px; max-width:300px; }
  .suc-ref { background:var(--off); border:1px solid var(--border); border-radius:8px; padding:9px 15px; display:inline-block; margin-bottom:18px; }
  .suc-ref-l { font-size:10px; font-weight:600; color:var(--muted); text-transform:uppercase; letter-spacing:0.5px; margin-bottom:2px; }
  .suc-ref-c { font-size:18px; font-weight:700; color:var(--dark); letter-spacing:-0.3px; }
  .suc-steps { display:flex; flex-direction:column; gap:8px; text-align:left; margin:0 auto 18px; max-width:290px; }
  .suc-step  { display:flex; align-items:flex-start; gap:8px; font-size:12px; color:var(--muted); line-height:1.5; }
  .suc-step-n { background:var(--dark); color:#fff; font-weight:700; font-size:10px; width:17px; height:17px; border-radius:50%; display:flex; align-items:center; justify-content:center; flex-shrink:0; margin-top:1px; }
  .d-thumb { border-radius:10px; height:140px; display:flex; align-items:center; justify-content:center; font-size:64px; margin-bottom:12px; background:var(--off); }
  .d-name  { font-size:20px; font-weight:700; color:var(--dark); margin-bottom:2px; letter-spacing:-0.3px; }
  .d-sub   { font-size:12px; color:var(--muted); margin-bottom:10px; }
  .d-pills { display:flex; gap:6px; flex-wrap:wrap; margin-bottom:8px; }
  .d-pill  { background:var(--off); border:1px solid var(--border); font-size:11px; font-weight:500; color:var(--body); padding:4px 10px; border-radius:6px; }
  .d-desc  { font-size:13px; color:var(--muted); line-height:1.7; margin:10px 0 16px; }
  .d-acts  { display:flex; flex-direction:column; gap:8px; }
  .emerg-bar { background:var(--red); color:#fff; padding:9px var(--pad); font-size:12px; font-weight:600; text-align:center; line-height:1.5; }
  .inote { font-size:12px; color:var(--muted); background:var(--off); border-radius:8px; padding:10px 13px; margin-bottom:16px; line-height:1.6; border:1px solid var(--border); }
  .inote strong { color:var(--dark); }
  .toast { position:fixed; bottom:calc(var(--nav-h) + 10px); left:50%; transform:translateX(-50%) translateY(18px); z-index:500; background:var(--dark); color:#fff; padding:9px 16px; border-radius:8px; font-size:13px; font-weight:500; pointer-events:none; opacity:0; transition:all 0.2s ease; white-space:nowrap; box-shadow:0 4px 14px rgba(0,0,0,0.2); }
  .toast.show { opacity:1; transform:translateX(-50%) translateY(0); }
  @media (min-width:768px) { .toast { bottom:auto; top:62px; } }

  /* ─ ETA OPTION BUTTONS ─ */
  .eta-grid { display:flex; flex-direction:column; gap:8px; }
  .eta-btn { display:flex; align-items:center; gap:12px; background:var(--off); border:1px solid var(--border); border-radius:var(--r); padding:13px 16px; cursor:pointer; transition:all 0.12s; text-align:left; font-family:var(--font); min-height:52px; }
  .eta-btn:hover { border-color:var(--dark); background:var(--white); }
  .eta-btn:active { opacity:0.8; }
  .eta-icon { font-size:22px; flex-shrink:0; }
  .eta-label { font-size:14px; font-weight:600; color:var(--dark); }
  .eta-sub   { font-size:11px; color:var(--muted); margin-top:1px; }

  /* helped upload */
  .helped-note { font-size:12px; color:var(--muted); background:var(--off); border:1px solid var(--border); border-radius:8px; padding:10px 13px; margin-bottom:16px; line-height:1.6; }
  .helped-note strong { color:var(--dark); }

  /* ─ GLOBAL POST FAB — single, unmistakable entry point for every posting action ─ */
  .fab-post {
    position:fixed; right:18px; bottom:calc(var(--nav-h) + 18px); z-index:150;
    width:54px; height:54px; border-radius:50%; border:none;
    background:var(--amber); color:#fff; cursor:pointer;
    display:flex; align-items:center; justify-content:center;
    box-shadow:0 4px 14px rgba(212,134,43,0.45);
    transition:transform 0.15s, box-shadow 0.15s;
    will-change:transform; backface-visibility:hidden;
  }
  .fab-post:active { transform:scale(0.93); }
  @media (hover:hover) { .fab-post:hover { box-shadow:0 6px 18px rgba(212,134,43,0.55); } }
  @media (min-width:768px) { .fab-post { bottom:24px; } }

  /* ─ POST CHOOSER CARDS ─ */
  .chooser-card { display:flex; align-items:center; gap:14px; width:100%; background:var(--white); border:1px solid var(--border); border-radius:var(--r); padding:14px; cursor:pointer; text-align:left; font-family:var(--font); transition:all 0.12s; min-height:64px; }
  .chooser-card:active { opacity:0.75; }
  @media (hover:hover) { .chooser-card:hover { border-color:#ccc; box-shadow:0 3px 12px rgba(0,0,0,0.07); } }
  .chooser-icon { width:42px; height:42px; border-radius:10px; display:flex; align-items:center; justify-content:center; font-size:20px; flex-shrink:0; }
  .chooser-title { font-size:14px; font-weight:600; color:var(--dark); margin-bottom:2px; }
  .chooser-desc  { font-size:11.5px; color:var(--muted); line-height:1.4; }
  .chooser-chev  { font-size:18px; color:var(--border); flex-shrink:0; }

  /* ─ PURPOSE BADGES — animal-first: every card shows all active purposes at once ─ */
  .purpose-badge { font-size:9.5px; font-weight:700; padding:2px 7px; border-radius:4px; letter-spacing:0.2px; }
  .purpose-lost   { background:rgba(192,57,43,0.12);  color:var(--red);   }
  .purpose-found  { background:rgba(45,122,79,0.12);  color:var(--green); }
  .purpose-help   { background:rgba(192,57,43,0.12);  color:var(--red);   }
  .purpose-foster { background:rgba(37,99,235,0.12);  color:var(--blue);  }
  .purpose-adopt  { background:rgba(212,134,43,0.14); color:var(--amber); }
`;

// ─────────────────────────────────────────────────────────────────────────────
// ROOT
// ─────────────────────────────────────────────────────────────────────────────
export default function App() {
  // ── sheet scroll lock ──
  // Sheets are rendered from a dozen different places, so rather than wiring each
  // one up we watch for any .sheet-overlay in the DOM. Without the lock the page
  // behind keeps scrolling on iOS, which expands/collapses the address bar and
  // shifts the fixed overlay — that is what clips the top of an open sheet.
  useEffect(() => {
    const sync = () => {
      const open = !!document.querySelector(".sheet-overlay");
      document.documentElement.classList.toggle("sheet-open", open);
    };
    const obs = new MutationObserver(sync);
    obs.observe(document.body, { childList:true, subtree:true });
    sync();
    return () => { obs.disconnect(); document.documentElement.classList.remove("sheet-open"); };
  }, []);

  // ── language ──
  // Açılış adresi. Dil öneki varsa (/tr/... , /en/...) o dil kesindir; öneksiz
  // gelindiyse tespit devreye girer ve adres dilli sürüme yazılır.
  const initialRoute = typeof window === "undefined" ? { lang:null, tab:"home", sub:null, seg:"" }
                                                     : parseLocation(window.location.pathname);

  // Başlangıç dili önceliği: adresteki önek > kullanıcının elle seçimi >
  // saat diliminden çıkan bölgenin dili (TR/KKTC → tr, Kıbrıs ve Körfez → en).
  const [lang, setLang] = useState(() => {
    if (initialRoute.lang) return initialRoute.lang;
    try {
      const saved = localStorage.getItem("paweero_lang");
      if (saved === "tr" || saved === "en") return saved;
    } catch (e) {}
    return INITIAL_SETUP ? INITIAL_SETUP.lang : "en";
  });
  const t = T[lang];  // translation shortcut

  // Hero etiketi ülkeleri tek tek sayar ve COUNTRIES'ten türetilir — yeni bir ülke
  // eklendiğinde elle güncellenmesi gereken bir metin kalmasın diye.
  const countryList = COUNTRIES.filter(c => c !== "All Countries")
                               .map(c => locLabel(c, lang))
                               .join(" · ");

  // Dili elle değiştirmek için sarmalayıcı: seçim localStorage'a kaydedilir
  // böylece otomatik konum tespiti bunu ezmez.
  const changeLang = (l) => {
    try { localStorage.setItem("paweero_lang", l); } catch (e) {}
    setLang(l);
  };

  // ── navigation ──
  // Açılış görünümü adresten gelir: /tr/animals/foster doğrudan o listeyi açar.
  const [tab, setTab]         = useState(initialRoute.tab);
  const [animalSub, setASub]  = useState(initialRoute.tab === "animals" && initialRoute.sub ? initialRoute.sub : "adopt");
  const [lfSub, setLFSub]     = useState("board");    // board | post
  const [helpSub, setHelpSub] = useState(initialRoute.tab === "help" && initialRoute.sub ? initialRoute.sub : "active");
  const [lfTypeFilter, setLFType] = useState("all");  // all | lost | found
  // (ownerSub removed — Owners section deleted)

  // ── filters ──
  const [species, setSpecies]     = useState("All");
  const [search, setSearch]       = useState("");
  // Ülke filtresi saat diliminden çıkan bölgeyle açılır; tespit yoksa hepsi.
  const [fCountry, setFC]         = useState(INITIAL_COUNTRY || "All Countries");
  const [fProvince, setFP]        = useState("All Provinces");
  const [fCity, setFCi]           = useState("All Cities");
  // (svcFilter/sitterCity removed — Owners section deleted)

  // Konum seçimi kimin elinde: kullanıcı elle değiştirdiyse ya da GPS kesin
  // konum verdiyse, sonradan gelen IP tahmini bunların üstüne yazmaz.
  const manualLocRef  = useRef(false);
  const preciseLocRef = useRef(false);
  // Form varsayılanları da bölgeyi izler (IP tespiti saat dilimini düzeltirse güncellenir).
  const [formCountry, setFormCountry]   = useState(FORM_COUNTRY);
  const [formProvince, setFormProvince] = useState(FORM_PROVINCE);
  const markManualLoc = () => { manualLocRef.current = true; };

  // ── Konuma göre otomatik dil + ülke seçimi ──
  // Saat dilimi tahmini ilk boyamada zaten uygulandı; buradaki IP sorgusu onu
  // doğrular. VPN, seyahat ya da yanlış ayarlı saat dilimi durumlarını yakalar.
  useEffect(() => {
    let cancelled = false;
    // Adreste dil öneki varsa dil zaten kesindir; elle seçim de IP'yi ezer.
    let langLocked = !!initialRoute.lang;
    try {
      const saved = localStorage.getItem("paweero_lang");
      langLocked = langLocked || saved === "tr" || saved === "en";
    } catch (e) {}

    (async () => {
      try {
        const res = await fetch("https://ipapi.co/json/");
        if (!res.ok) return;
        const data = await res.json();
        if (cancelled || !data || !data.country_code) return;

        const country = ISO_COUNTRY[data.country_code] || null;
        const setup   = country ? COUNTRY_META[country] : null;
        if (country === INITIAL_COUNTRY) return; // saat dilimi zaten doğruymuş

        if (!langLocked) setLang(setup ? setup.lang : "en");

        // GPS kesin konumu ya da kullanıcının kendi seçimi varsa dokunma.
        if (!manualLocRef.current && !preciseLocRef.current) {
          setFC(country || "All Countries");
          setFP("All Provinces");
          setFCi("All Cities");
          // Formlar hâlâ ilk tahmindeyse onları da düzelt.
          const fresh = country ? { country, province:setup.province }
                                : { country:FORM_COUNTRY, province:FORM_PROVINCE };
          setFormCountry(fresh.country);
          setFormProvince(fresh.province);
          const retarget = (f, ck, pk) =>
            f[ck] === FORM_COUNTRY && f[pk] === FORM_PROVINCE
              ? { ...f, [ck]:fresh.country, [pk]:fresh.province }
              : f;
          setRf(f => retarget(f, "rCountry", "rProvince"));
          setLFForm(f => retarget(f, "lfCountry", "lfProvince"));
        }
      } catch (e) {
        // IP tespiti başarısız olursa saat dilimi tahmini geçerli kalır
      }
    })();

    return () => { cancelled = true; };
  }, []);

  // Adresteki ilan kimliği henüz kayda bağlanmadıysa burada bekler. URL senkronu
  // bu süre boyunca adrese dokunmaz — yoksa /animals'a sadeleşir ve hangi ilanın
  // istendiği bilgisi kaybolur, dolayısıyla 404 da tespit edilemez.
  const [pendingSeg, setPendingSeg] = useState(initialRoute.seg || "");

  // ── modal state ──
  const [detailAnimal, setDetailA]  = useState(null);
  const [detailSitter, setDetailS]  = useState(null);
  const [detailLF, setDetailLF]     = useState(null);
  const [detailReport, setDetailReport] = useState(null);

  // ── URL senkronu ──
  // Adres, görünüm durumundan türetilir: sekme, alt sekme ve açık ilan. Derine
  // inerken (ilan açılırken) geçmişe yeni kayıt eklenir, yukarı çıkarken mevcut
  // kayıt değiştirilir — böylece geri tuşu beklendiği gibi davranır.
  const here = typeof window === "undefined" ? "/" : (window.location.pathname.replace(/\/+$/, "") || "/");
  // "notfound" durumunda adres olduğu gibi korunur — 404 sayfası kendi adresinde
  // durmalı, sessizce /animals'a düşerse Google yine soft 404 görür.
  const currentPath = (tab === "notfound" || pendingSeg) ? here
                    : detailAnimal ? itemPath(lang, "animals",   detailAnimal, detailAnimal.name)
                    : detailLF     ? itemPath(lang, "lostfound", detailLF,     detailLF.name)
                    : detailReport ? itemPath(lang, "help",      detailReport, detailReport.title?.en || detailReport.title)
                    : tabPath(lang, tab, tab === "animals" ? animalSub : tab === "help" ? helpSub : null);

  useEffect(() => {
    if (typeof window === "undefined" || tab === "notfound" || pendingSeg) return;
    const here = window.location.pathname.replace(/\/+$/, "") || "/";
    if (here === currentPath) return;
    const depth = (s) => s.split("/").filter(Boolean).length;
    const method = depth(currentPath) > depth(here) ? "pushState" : "replaceState";
    window.history[method]({}, "", currentPath + window.location.hash);
  }, [currentPath, pendingSeg]);


  // ── Dinamik drawer yüksekliği (görsel en/boy oranına göre) ──
  // Dikey (portrait) görseller → 85vh, yatay/kare → 70vh
  const [detailAHeight, setDetailAHeight]   = useState(70);
  const [detailLFHeight, setDetailLFHeight] = useState(70);
  const [detailReportHeight, setDetailReportHeight] = useState(70);

  useEffect(() => {
    if (!detailAnimal) { setDetailAHeight(70); return; }
    const url = detailAnimal.photo_url || (detailAnimal.photo_urls && detailAnimal.photo_urls[0]) || null;
    getDrawerHeightByImageAspectRatio(url).then(setDetailAHeight);
  }, [detailAnimal]);

  useEffect(() => {
    if (!detailLF) { setDetailLFHeight(70); return; }
    const url = detailLF.photo_url || (detailLF.photo_urls && detailLF.photo_urls[0]) || null;
    getDrawerHeightByImageAspectRatio(url).then(setDetailLFHeight);
  }, [detailLF]);

  useEffect(() => {
    if (!detailReport) { setDetailReportHeight(70); return; }
    const url = detailReport.photo_url || (detailReport.photo_urls && detailReport.photo_urls[0]) || null;
    getDrawerHeightByImageAspectRatio(url).then(setDetailReportHeight);
  }, [detailReport]);
  const [takeActionFor, setTakeActionFor] = useState(null); // animal object — unified Foster/Help/Sighting/Claim sheet
  const [applyFor, setApplyFor] = useState(null); // animal object — dedicated full 5-step Adopt application

  // ── data state ──
  const [reports, setReports] = useState([]);
  const [lfItems, setLFItems] = useState([]);
  const [sitters, setSitters] = useState([]);
  const [animals, setAnimals] = useState(ANIMALS);

  // Geri/ileri tuşu: adresi tekrar duruma çevir.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const onPop = () => {
      const r = parseLocation(window.location.pathname);
      if (r.lang) setLang(r.lang);
      setTab(r.tab);
      if (r.tab === "animals" && r.sub) setASub(r.sub);
      if (r.tab === "help"    && r.sub) setHelpSub(r.sub);
      setDetailA(null); setDetailLF(null); setDetailReport(null);
      setPendingSeg("");
      if (r.seg) {
        const a = animals.find(x => matchesSeg(x, r.seg));   if (a) return setDetailA(a);
        const l = lfItems.find(x => matchesSeg(x, r.seg));   if (l) return setDetailLF(l);
        const p = reports.find(x => matchesSeg(x, r.seg));   if (p) return setDetailReport(p);
      }
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, [animals, lfItems, reports]);
  const [dbLoading, setDbLoading] = useState(true);
  const [photos, setPhotos]   = useState([]);
  const [lfPhotos, setLFPhotos] = useState([]);
  const [rf, setRf]           = useState({ title:"", location:"", desc:"", type:"Injured", animal:"", rCountry:FORM_COUNTRY, rProvince:FORM_PROVINCE, rCity:"", rAddress:"" });
  const [lfForm, setLFForm]   = useState({ type:"lost", name:"", species:"Dog", breed:"", color:"", area:"", city:"", contact:"", reward:"", desc:"", lfCountry:FORM_COUNTRY, lfProvince:FORM_PROVINCE, lfAddress:"" });

  // ── Supabase: veri çek ──
  const loadFromDB = async () => {
    setDbLoading(true);
    try {
      const client = await getDb();
      // Raporları çek
      const { data: rData, error: rErr } = await client
        .from("reports")
        .select(`*, volunteers(*)`)
        .order("created_at", { ascending: false });

      if (rErr) console.error("Reports error:", rErr);
      if (rData) {
        if (rData.length > 0) {
          setReports(rData.map(r => ({
            id: r.id,
            emoji: r.emoji || "🐾",
            title: { en: r.title, tr: r.title },
            desc:  { en: r.description || "", tr: r.description || "" },
            location: r.location,
            time: { en: new Date(r.created_at).toLocaleDateString("en"), tr: new Date(r.created_at).toLocaleDateString("tr") },
            status: r.status,
            reporter: r.reporter_name || "Anonymous",
            reporterPhone: r.reporter_phone || "",
            reporterPref: r.reporter_pref || "email",
            photo_url: r.photo_url || (r.photo_urls && r.photo_urls[0]) || null,
            photo_urls: r.photo_urls || (r.photo_url ? [r.photo_url] : []),
            volunteers: (r.volunteers || []).map(v => ({ name: v.name, eta: v.eta, etaOrder: v.eta_order })),
          })));
        } else {
          setReports(REPORTS_SEED); // DB boşsa seed göster
        }
      }

      // Kayıp & bulunan ilanlarını çek
      const { data: lfData, error: lfErr } = await client
        .from("lf_listings")
        .select("*")
        .order("created_at", { ascending: false });

      if (lfErr) console.error("LF error:", lfErr);
      if (lfData) {
        if (lfData.length > 0) {
          setLFItems(lfData.map(item => ({
            id: item.id,
            type: item.type,
            emoji: item.species === "Dog" ? "🐕" : item.species === "Cat" ? "🐈" : item.species === "Rabbit" ? "🐇" : "🐾",
            name: item.name || "Unknown",
            species: { en: item.species || "", tr: item.species || "" },
            breed:   { en: item.breed || "", tr: item.breed || "" },
            color:   { en: item.color || "", tr: item.color || "" },
            area: item.area || "",
            city: item.city || "",
            date: { en: new Date(item.created_at).toLocaleDateString("en"), tr: new Date(item.created_at).toLocaleDateString("tr") },
            contact: item.contact || "",
            contact_email: item.contact_email || "",
            contact_phone: item.contact_phone || "",
            contact_pref: item.contact_pref || "email",
            reward: { en: item.reward || "", tr: item.reward || "" },
            desc: { en: item.desc_en || "", tr: item.desc_tr || "" },
            status: item.status || "open",
            photo_url: item.photo_url || (item.photo_urls && item.photo_urls[0]) || null,
            photo_urls: item.photo_urls || (item.photo_url ? [item.photo_url] : []),
          })));
        } else {
          setLFItems(LF_SEED); // DB boşsa seed göster
        }
      }

      // Sitterleri çek
      const { data: sData, error: sErr } = await client
        .from("sitters")
        .select("*")
        .order("created_at", { ascending: false });

      if (sErr) console.error("Sitters error:", sErr);
      if (sData) {
        if (sData.length > 0) {
          const dbSitters = sData.map(s => ({
            id: s.id,
            name: s.name,
            emoji: "👤",
            city: s.city || "",
            area: s.area || "",
            rating: s.rating || 0,
            reviews: s.review_count || 0,
            price: { en: s.price || "", tr: s.price || "" },
            services: { en: s.services || [], tr: s.services || [] },
            accepts: s.accepts || [],
            hasYard: s.has_yard || false,
            maxPets: s.max_pets || 1,
            availability: { en: s.availability || "", tr: s.availability || "" },
            bio: { en: s.bio || "", tr: s.bio || "" },
            contact_email: s.contact_email || "",
            contact_phone: s.contact_phone || "",
            contact_pref: s.contact_pref || "email",
          }));
          // DB sitterlarını seed ile birleştir (seed her zaman gösterilsin)
          setSitters([...dbSitters, ...SITTERS_SEED]);
        } else {
          setSitters(SITTERS_SEED);
        }
      }

      // Hayvanları çek — sadece approved/active olanlar
      const { data: aData, error: aErr } = await client
        .from("animals")
        .select("*")
        .eq("status", "active")
        .order("created_at", { ascending: false });

      if (aErr) console.error("Animals error:", aErr);
      if (aData && aData.length > 0) {
        const dbAnimals = aData.map(a => {
          const healthTags = { en: [], tr: [] };
          if (a.is_neutered === "yes") { healthTags.en.push("Neutered/Spayed"); healthTags.tr.push("Kısırlaştırıldı"); }
          if (a.vaccinated_parasite === "yes") { healthTags.en.push("Parasite Treated"); healthTags.tr.push("Parazit Aşılı"); }
          if (a.vaccinated_rabies === "yes") { healthTags.en.push("Rabies Vaccinated"); healthTags.tr.push("Kuduz Aşılı"); }
          return {
            id: a.id,
            name: a.name || "",
            emoji: a.emoji || "🐾",
            species:  { en: a.species || "", tr: a.species || "" },
            breed:    { en: a.breed   || "", tr: a.breed   || "" },
            age:      { en: a.age     || "", tr: a.age     || "" },
            gender:   { en: a.gender  || "", tr: a.gender  || "" },
            country:  a.country  || "",
            province: a.province || "",
            city:     a.city     || "",
            tags:     healthTags,
            urgent:   a.urgent   || false,
            isNew:    a.is_new   || false,
            canFoster: a.can_foster || false,
            canAdopt:  a.can_adopt  !== false,
            needsHelp: a.needs_help || false,
            helpSituation: a.help_situation || "",
            helpUrgency: a.help_urgency || "",
            isLost: a.is_lost || false,
            isFound: a.is_found || false,
            colour: a.colour || "",
            lostLastSeenLocation: a.lost_last_seen_location || "",
            lostCollarAccessories: a.lost_collar_accessories || "",
            lostIdentifyingCharacteristics: a.lost_identifying_characteristics || "",
            foundHow: a.found_how || "",
            foundIdentifyingCharacteristics: a.found_identifying_characteristics || "",
            desc:     { en: a.desc_en || "", tr: a.desc_tr || "" },
            photo_url: a.photo_url || (a.photo_urls && a.photo_urls[0]) || null,
            photo_urls: a.photo_urls || (a.photo_url ? [a.photo_url] : []),
            submitter_email: a.submitter_email || "",
            contactPhone: a.contact_phone || "",
            contactPref: a.contact_pref || "email",
            isNeutered: a.is_neutered || "unknown",
            vaccinatedParasite: a.vaccinated_parasite || "unknown",
            vaccinatedRabies: a.vaccinated_rabies || "unknown",
          };
        });
        // DB hayvanlarını seed ile birleştir
        setAnimals([...dbAnimals, ...ANIMALS]);
      } else {
        setAnimals(ANIMALS);
      }

    } catch (err) {
      console.error("Supabase yükleme hatası:", err);
      // Hata durumunda seed datayı göster
      setReports(REPORTS_SEED);
      setLFItems(LF_SEED);
      setSitters(SITTERS_SEED);
    }
    setDbLoading(false);
  };

  useEffect(() => {
    loadFromDB();
  }, []);

  // ── Adresten ilan aç ──
  // Veriler yüklendikten sonra çalışır: /animals/12-luna gibi yol adresini ya da
  // eski ?animal=12 bağlantılarını açık ilana çevirir. Eski biçim korunuyor çünkü
  // WhatsApp'ta paylaşılmış linkler hâlâ dolaşımda; URL senkronu onları sessizce
  // yeni adrese yazar, yani eski link tıklanınca canonical adrese dönüşür.
  const deepLinkDone = useRef(false);
  useEffect(() => {
    if (typeof window === "undefined" || deepLinkDone.current) return;
    if (!animals.length && !lfItems.length && !reports.length) return;

    const route = { ...parseLocation(window.location.pathname), seg: pendingSeg };
    const params = new URLSearchParams(window.location.search);
    const open = (seg, kind) => {
      if (!seg) return false;
      if (kind !== "lf" && kind !== "report") {
        const a = animals.find(x => matchesSeg(x, seg));
        if (a && (kind === "animal" || route.tab === "animals")) { setTab("animals"); setDetailA(a); return true; }
      }
      if (kind !== "animal" && kind !== "report") {
        const l = lfItems.find(x => matchesSeg(x, seg));
        if (l && (kind === "lf" || route.tab === "lostfound")) { setTab("lostfound"); setDetailLF(l); return true; }
      }
      if (kind !== "animal" && kind !== "lf") {
        const p = reports.find(x => matchesSeg(x, seg));
        if (p && (kind === "report" || route.tab === "help")) { setTab("help"); setDetailReport(p); return true; }
      }
      return false;
    };

    const hit = open(route.seg, null)
             || open(params.get("animal"), "animal")
             || open(params.get("lf"),     "lf")
             || open(params.get("report"), "report");
    if (hit) { deepLinkDone.current = true; setPendingSeg(""); return; }
    if (!route.seg && !params.toString()) { deepLinkDone.current = true; return; }

    // Adreste bir ilan kimliği var ama kayıt yok — silinmiş ya da uydurma. Veri
    // yüklenmesi bittiyse bu gerçek bir 404; hâlâ yükleniyorsa beklemeye devam.
    if (route.seg && !dbLoading) { deepLinkDone.current = true; setPendingSeg(""); setTab("notfound"); }
  }, [animals, lfItems, reports, dbLoading, pendingSeg]);

  // ── Sayfa başlığı / açıklaması / canonical ──
  useEffect(() => {
    if (typeof window === "undefined") return;
    const L = lang === "tr" ? "tr" : "en";
    const crumbHome = { name: L === "tr" ? "Ana Sayfa" : "Home", path: "/" };

    if (detailAnimal) {
      const a = detailAnimal;
      const where = [a.city, a.province].filter(Boolean).join(", ");
      const breed = a.breed?.[L] || a.breed?.en || "";
      applyPageMeta({
        title: `${a.name}${breed ? " — " + breed : ""}${where ? ", " + where : ""} | Paweero`,
        desc: (a.desc?.[L] || a.desc?.en || "").slice(0, 300) ||
              (L === "tr" ? `${a.name} sahiplenilmeyi bekliyor.` : `${a.name} is waiting for a home.`),
        path: currentPath, image: a.photo_urls?.[0] || a.photo_url || undefined, lang: L,
      });
      applyBreadcrumb([crumbHome, { name: L === "tr" ? "Hayvanlar" : "Animals", path: "/animals" },
                       { name: a.name, path: currentPath }]);
      return;
    }
    if (detailLF || detailReport) {
      const it = detailLF || detailReport;
      const isLF = !!detailLF;
      const name = isLF ? (it.name || (L === "tr" ? "Kayıp hayvan" : "Lost pet")) : (it.title?.[L] || it.title?.en || it.title);
      applyPageMeta({
        title: `${name} | Paweero`,
        desc: (it.desc?.[L] || it.desc?.en || "").slice(0, 300) || PAGE_META[isLF ? "lostfound" : "help"][L].desc,
        path: currentPath, image: it.photo_urls?.[0] || it.photo_url || undefined, lang: L,
      });
      applyBreadcrumb([crumbHome,
        isLF ? { name: L === "tr" ? "Kayıp & Bulunan" : "Lost & Found", path: "/lost-found" }
             : { name: L === "tr" ? "Yardım" : "Help", path: "/help" },
        { name, path: currentPath }]);
      return;
    }

    if (tab === "notfound") {
      const m = PAGE_META.notfound[L];
      // noindex ama follow: sayfayı indeksleme, üzerindeki linkleri yine de izle.
      applyPageMeta({ title:m.title, desc:m.desc, path:currentPath, lang:L, noindex:true });
      applyBreadcrumb(null);
      return;
    }
    const activeSub = tab === "animals" ? animalSub : tab === "help" ? helpSub : null;
    const subKey = activeSub && activeSub !== DEFAULT_SUB[tab] ? `${tab}/${activeSub}` : null;
    const meta = (subKey && SUB_META[subKey] ? SUB_META[subKey] : (PAGE_META[tab] || PAGE_META.home))[L];
    applyPageMeta({ title: meta.title, desc: meta.desc, path: currentPath, lang: L });
    applyBreadcrumb(tab === "home" ? null
      : [crumbHome, { name: meta.title.split(" | ")[0], path: currentPath }]);
  }, [tab, animalSub, helpSub, detailAnimal, detailLF, detailReport, lang, currentPath]);

  // If the browser already has location permission granted (from a previous visit),
  // silently pre-select the nearest province/country without prompting again.
  useEffect(() => {
    if (!navigator.geolocation) return;
    if (navigator.permissions?.query) {
      navigator.permissions.query({ name: "geolocation" }).then((status) => {
        if (status.state === "granted") {
          navigator.geolocation.getCurrentPosition(
            (pos) => {
              const { latitude, longitude } = pos.coords;
              const province = findNearestProvince(latitude, longitude);
              const country  = province ? findCountryForProvince(province) : null;
              if (country && province) {
                preciseLocRef.current = true; // GPS kesin — IP tahmini bunu ezemez
                setFC(country);
                setFP(province);
              }
            },
            () => {}, // permission already granted but failed silently — no UI noise
            { timeout: 6000 }
          );
        }
      }).catch(() => {});
    }
  }, []);

  const [toast, setToast] = useState({ show:false, msg:"" });

  const [helpedFor, setHelpedFor] = useState(null);
  const [helpProof, setHelpProof] = useState(null);
  const [etaFor, setEtaFor]       = useState(null);   // report to volunteer for
  const [contactDrawerFor, setContactDrawerFor] = useState(null); // reporter contact info to show after ETA confirm
  // (myName removed — volunteer identity is now the verified contactInfo.email)
  const [showReportForm, setShowReportForm] = useState(false);
  const [showCreateReport, setShowCreateReport] = useState(false);

  // ── Email OTP verification ──
  const [contactModal, setContactModal] = useState(null); // { onConfirm }
  const [contactInfo, setContactInfo]   = useState({ email:"", phone:"", contactPref:"email" });
  const [contactErr, setContactErr]     = useState({});
  const [otpStep, setOtpStep]           = useState("email"); // "email" | "otp"
  const [otpCode, setOtpCode]           = useState("");
  const [otpSending, setOtpSending]     = useState(false);
  const [otpVerifying, setOtpVerifying] = useState(false);

  const requireContact = (onConfirm) => {
    // If already verified this session, skip
    if (contactInfo.email && contactInfo.verified) {
      console.log("[requireContact] Already verified, calling onConfirm directly");
      onConfirm(contactInfo);
    } else {
      console.log("[requireContact] Not verified — opening OTP modal");
      setOtpStep("email");
      setOtpCode("");
      setContactErr({});
      setContactModal({ onConfirm });
    }
  };

  const sendOtp = async () => {
    if (!contactInfo.email || !contactInfo.email.includes("@")) {
      setContactErr({ email: lang==="tr"?"Geçerli e-posta girin":"Please enter a valid email" });
      return;
    }
    setContactErr({});
    setOtpSending(true);
    const { error } = await (await getDb()).auth.signInWithOtp({
      email: contactInfo.email,
      options: { shouldCreateUser: true }
    });
    setOtpSending(false);
    if (error) {
      setContactErr({ email: lang==="tr"?"Kod gönderilemedi, tekrar dene":"Failed to send code, please try again" });
    } else {
      setOtpStep("otp");
      say(lang==="tr"?"Doğrulama kodu gönderildi":"Verification code sent");
    }
  };

  const verifyOtp = async () => {
    if (!otpCode || otpCode.length < 6) {
      setContactErr({ otp: lang==="tr"?"6 haneli kodu girin":"Please enter the 6-digit code" });
      return;
    }
    setOtpVerifying(true);
    const { error } = await (await getDb()).auth.verifyOtp({
      email: contactInfo.email,
      token: otpCode,
      type: "email"
    });
    setOtpVerifying(false);
    if (error) {
      setContactErr({ otp: lang==="tr"?"Kod yanlış veya süresi dolmuş":"Invalid or expired code" });
    } else {
      setContactInfo(f => ({ ...f, verified: true }));
      const fn = contactModal.onConfirm;
      setContactModal(null);
      fn({ ...contactInfo, verified: true });
    }
  };

  // (fileRef removed — MultiPhotoUpload manages its own file input ref)
  // (lfFileRef removed — MultiPhotoUpload manages its own file input ref)
  const helpProofRef = useRef();

  const say   = (msg) => { setToast({ show:true, msg }); setTimeout(() => setToast({ show:false, msg:"" }), 2800); };
  const goTab = (t)   => { deepLinkDone.current = true; setPendingSeg(""); setTab(t); setSearch(""); setSpecies("All"); setDetailA(null); setDetailLF(null); setDetailReport(null); };


  // filtered animals
  const filtered = animals.filter(a => {
    const okS  = species === "All" || a.species.en === species;
    const okQ  = !search || a.name.toLowerCase().includes(search.toLowerCase()) || (a.breed?.en||"").toLowerCase().includes(search.toLowerCase());
    const okC  = fCountry  === "All Countries"  || normCountry(a.country)  === fCountry;
    const okP  = fProvince === "All Provinces"  || a.province === fProvince;
    const okCi = fCity     === "All Cities"     || a.city     === fCity;
    const okType = animalSub === "foster"
      ? a.canFoster === true
      : (a.canAdopt !== false); // adopt tab shows all except foster-only
    return okS && okQ && okC && okP && okCi && okType;
  });

  // Lost & Found — filtered by type AND the global location filter.
  // lf_listings.city actually stores the province (set at submission time),
  // and area holds the neighbourhood/open-address text.
  const filteredLF = lfItems.filter(item => {
    const okType = lfTypeFilter === "all" || item.type === lfTypeFilter;
    const okP    = fProvince === "All Provinces" || item.city === fProvince;
    const okCi   = fCity     === "All Cities"    || (item.area || "").toLowerCase().includes(fCity.toLowerCase());
    return okType && okP && okCi;
  });

  // Help/Reports — filtered by the global location filter.
  // reports.location is a free-text string (e.g. "Street, Area, Province, Country"),
  // so we match it loosely against the selected province/city.
  const filteredReports = reports.filter(r => {
    const loc = (r.location || "").toLowerCase();
    const okCo = fCountry  === "All Countries"  ||
                 (COUNTRY_ALIASES[fCountry] || [fCountry.toLowerCase()]).some(a => loc.includes(a));
    const okP  = fProvince === "All Provinces"  || loc.includes(fProvince.toLowerCase());
    const okCi = fCity     === "All Cities"     || loc.includes(fCity.toLowerCase());
    return okCo && okP && okCi;
  });

  // Animal listings posted with the "Help" purpose selected also show up here,
  // reshaped into the same card format as classic standalone reports.
  // A listing can be Adopt + Foster + Help all at once — it isn't removed from
  // the Help tab just because it's also adoptable.
  const helpFromAnimals = animals.filter(a => {
    if (!a.needsHelp) return false;
    const okCo = fCountry  === "All Countries"  || normCountry(a.country)  === fCountry;
    const okP  = fProvince === "All Provinces"  || a.province === fProvince;
    const okCi = fCity     === "All Cities"     || a.city     === fCity;
    return okCo && okP && okCi;
  }).map(a => ({
    id: `animal-${a.id}`,
    emoji: a.emoji,
    title: { en: a.name, tr: a.name },
    desc: a.desc,
    location: [a.city, a.province, a.country].filter(Boolean).join(", "),
    time: { en: "", tr: "" },
    status: "active",
    reporter: a.submitter_email || "",
    reporterPhone: a.contactPhone || "",
    reporterPref: a.contactPref || "email",
    photo_url: a.photo_url,
    photo_urls: a.photo_urls,
    volunteers: [],
    fromAnimalListing: true,
    animalRef: a,
  }));

  const helpItems = [...filteredReports, ...helpFromAnimals];

  // location filter bar (reused in Adopt & Foster)
  const [locating, setLocating] = useState(false);

  const useMyLocation = () => {
    if (!navigator.geolocation) {
      say(lang==="tr" ? "Tarayıcınız konum desteklemiyor" : "Your browser doesn't support location");
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        const province = findNearestProvince(latitude, longitude);
        const country  = province ? findCountryForProvince(province) : null;
        if (country && province) {
          preciseLocRef.current = true;
          setFC(country);
          setFP(province);
          setFCi("All Cities");
          say(`📍 ${province}${lang==="tr" ? " seçildi" : " selected"}`);
        } else {
          say(lang==="tr" ? "Konum bulunamadı" : "Couldn't determine your location");
        }
        setLocating(false);
      },
      () => {
        setLocating(false);
        say(lang==="tr" ? "Konum izni verilmedi" : "Location permission denied");
      },
      { timeout: 8000 }
    );
  };

  const LocFilters = () => (
    <div className="filter-bar">
      <button
        style={{
          background:"var(--off)", border:"1px solid var(--border)", borderRadius:7,
          padding:"7px 10px", fontSize:14, cursor: locating ? "default" : "pointer",
          minHeight:34, minWidth:34, flexShrink:0, display:"flex", alignItems:"center", justifyContent:"center",
          opacity: locating ? 0.6 : 1,
        }}
        onClick={useMyLocation}
        disabled={locating}
        title={lang==="tr" ? "Konumumu kullan" : "Use my location"}
      >
        {locating ? "…" : "📍"}
      </button>
      <select className={`loc-select ${fCountry !== "All Countries" ? "on" : ""}`} value={fCountry} onChange={e => { markManualLoc(); setFC(e.target.value); setFP("All Provinces"); setFCi("All Cities"); }}>
        {COUNTRIES.map(c => <option key={c} value={c}>{locLabel(c, lang)}</option>)}
      </select>
      <select className={`loc-select ${fProvince !== "All Provinces" ? "on" : ""}`} value={fProvince} onChange={e => { markManualLoc(); setFP(e.target.value); setFCi("All Cities"); }}>
        {(PROVINCES[fCountry] || ["All Provinces"]).map(p => <option key={p} value={p}>{locLabel(p, lang)}</option>)}
      </select>
      <select className={`loc-select ${fCity !== "All Cities" ? "on" : ""}`} value={fCity} onChange={e => { markManualLoc(); setFCi(e.target.value); }}>
        {(CITIES[fProvince] || ["All Cities"]).map(c => <option key={c} value={c}>{locLabel(c, lang)}</option>)}
      </select>
    </div>
  );

  return (
    <>
      <style>{CSS}</style>

      {/* TOPBAR */}
      <header className="topbar">
        <div className="logo" style={{ cursor:"pointer" }} onClick={() => goTab("home")}><div className="logo-dot" />{t.appName}</div>
        <nav className="desk-nav">
          {TABS.map(tb => (
            <button key={tb.id} className={`dnav ${tab === tb.id ? "on" : ""} ${tb.id === "help" ? "red" : ""}`} onClick={() => goTab(tb.id)}>
              {t[tb.id === "lostfound" ? "lostFound" : tb.id] || tb.label}
            </button>
          ))}
        </nav>
        <div className="lang-sel">
          <button className={`lang-btn ${lang==="en"?"on":""}`} onClick={()=>changeLang("en")}>EN</button>
          <button className={`lang-btn ${lang==="tr"?"on":""}`} onClick={()=>changeLang("tr")}>TR</button>
        </div>
      </header>

      <div className="app">
        {dbLoading && (
          <div style={{ position:"fixed", top:0, left:0, right:0, height:3, background:"var(--amber)", zIndex:999, animation:"loadbar 1.5s ease-in-out infinite" }} />
        )}

        {/* ══════════════════════════ NOT FOUND ═════════════════════════════ */}
        {tab === "notfound" && (
          <div className="wrap" style={{ paddingTop:64, paddingBottom:64, textAlign:"center", maxWidth:520 }}>
            <div style={{ fontSize:52, lineHeight:1, marginBottom:18 }}>🐾</div>
            <h1 style={{ fontSize:24, fontWeight:700, color:"var(--dark)", letterSpacing:"-0.5px", marginBottom:10 }}>
              {lang==="tr" ? "Sayfa bulunamadı" : "Page not found"}
            </h1>
            <p style={{ fontSize:14, color:"var(--muted)", lineHeight:1.65, marginBottom:26 }}>
              {lang==="tr"
                ? "Aradığın sayfa ya da ilan artık mevcut değil. İlan sahiplendirilmiş, çözülmüş ya da kaldırılmış olabilir."
                : "The page or listing you are looking for is no longer available. It may have been adopted, resolved or removed."}
            </p>
            <div style={{ display:"flex", gap:10, justifyContent:"center", flexWrap:"wrap" }}>
              <button className="btn btn-dark" onClick={() => goTab("home")}>
                {lang==="tr" ? "Ana sayfaya dön" : "Back to home"}
              </button>
              <button className="btn" style={{ border:"1px solid var(--border)", background:"var(--white)" }} onClick={() => goTab("animals")}>
                {lang==="tr" ? "Hayvanlara göz at" : "Browse animals"}
              </button>
            </div>
          </div>
        )}

        {/* ══════════════════════════════ HOME ══════════════════════════════ */}
        {tab === "home" && <>
          <div className="hero">
            <div className="hero-inner">
              <div className="hero-text">
                <div className="hero-label">{countryList}</div>
                <h1 className="hero-h1">{t.heroH1}<br /><em>{t.heroH1Em}</em></h1>
                <p className="hero-p">{t.heroP}</p>
                <div className="hero-cta">
                  <button className="btn btn-red" style={{ padding:"15px 28px", fontSize:15 }} onClick={() => setShowCreateReport(true)}>{t.postAnimal}</button>
                </div>
              </div>
              <div className="hero-media">
                <img src={HERO_IMAGE} alt={lang==="tr" ? "Sahiplendirilmiş bir kedi ve bir köpek" : "An adopted cat and dog"} onError={(e) => { e.currentTarget.closest(".hero-media").style.display = "none"; }} />
              </div>
            </div>
          </div>

          <div className="stats">
            {(() => {
              const waitingCount = animals.filter(a => a.canAdopt !== false || a.canFoster === true).length;
              const rescueCount  = reports.filter(r => r.status === "active").length;
              const helpedCount  = reports.filter(r => r.status === "helped" || r.status === "resolved").length;
              const statDefs = [
                { n: waitingCount, l: t.waiting, onClick: () => goTab("animals") },
                { n: rescueCount,  l: t.rescues, onClick: () => { goTab("help"); setHelpSub("active"); } },
                { n: helpedCount,  l: t.helped || (lang==="tr"?"Yardım Edildi":"Helped"), onClick: () => { goTab("help"); setHelpSub("helped"); } },
              ];
              return statDefs.map(s => (
                <div key={s.l} className="stat clickable" onClick={s.onClick}>
                  <div className="stat-n">{s.n}</div>
                  <div className="stat-l">{s.l}</div>
                </div>
              ));
            })()}
          </div>

          <div className="wrap">
            <div className="sec-label">{t.browseByGoal}</div>
            <div className="ql-list">
              {[
                { icon:"🏡", title:t.adoptTitle,    desc:t.adoptDesc,    tab:"animals",   sub:() => setASub("adopt"),   color:"var(--amber)", bg:"rgba(212,134,43,0.12)" },
                { icon:"🤝", title:t.fosterTitle,   desc:t.fosterDesc,   tab:"animals",   sub:() => setASub("foster"),  color:"var(--blue)",  bg:"rgba(37,99,235,0.12)"  },
                { icon:"🔍", title:t.lostFoundTitle, desc:t.lostFoundDesc,tab:"lostfound", sub:() => {},                 color:"var(--green)", bg:"rgba(45,122,79,0.12)" },
                { icon:"🚨", title:t.helpTitle,     desc:t.helpDesc,     tab:"help",      sub:() => {},                 color:"var(--red)",   bg:"rgba(192,57,43,0.12)" },
              ].map((f,i) => (
                <div key={i} className="ql-item" style={{ borderLeft:`3px solid ${f.color}` }} onClick={() => { f.sub(); goTab(f.tab); }}>
                  <div className="ql-icon" style={{ background:f.bg }}>{f.icon}</div>
                  <div className="ql-body"><div className="ql-title">{f.title}</div><div className="ql-desc">{f.desc}</div></div>
                  <div className="ql-chev">›</div>
                </div>
              ))}
            </div>

            <div className="divider" />
            <div className="sec-label">{t.recentlyAdded}</div>
            <div className="mini-row">
              {animals.map(a => <MiniCard key={a.id} a={a} lang={lang} onClick={() => setDetailA(a)} />)}
            </div>
          </div>
        </>}

        {/* ══════════════════════════════ ANIMALS ═══════════════════════════ */}
        {tab === "animals" && <>
          <div className="ph">
            <div className="ph-title">{t.animals}</div>
            <div className="ph-sub">{lang==="tr" ? "Sahiplenmek veya geçici bakım için hayvan bul." : "Find a pet to adopt or foster."}</div>
            <div className="stabs">
              <button className={`stab ${animalSub === "adopt"  ? "on" : ""}`} onClick={() => setASub("adopt")}>{t.adopt}</button>
              <button className={`stab ${animalSub === "foster" ? "on" : ""}`} onClick={() => setASub("foster")}>{t.foster}</button>
              <button className={`stab ${animalSub === "post"   ? "on" : ""}`} onClick={() => setASub("post")}>
                {lang==="tr" ? "🐾 Hayvan Ekle" : "🐾 Post Animal"}
              </button>
            </div>
          </div>

          {/* Global location filter — applies to Adopt, Foster, Lost & Found, and Help.
              Hidden only on the Post Animal sub-tab since that's a submission form, not a listing view. */}
          {animalSub !== "post" && <LocFilters />}

          {/* Species chips — only meaningful for adopt/foster listings */}
          {animalSub !== "post" && (
          <div style={{ background:"#fff", borderBottom:"1px solid #ebebeb", padding:"10px 16px 0" }}>
            <div className="chips-wrap" style={{ margin:0, padding:"0 0 10px" }}>
              <div className="chip-row">
                {SPECIES.map(s => {
                  const pool = animalSub === "foster" ? ANIMALS.filter(a => a.canFoster) : ANIMALS;
                  const cnt  = s.l === "All" ? pool.length : pool.filter(a => a.species.en === s.l).length;
                  return (
                    <button key={s.l} className={`chip ${species === s.l ? "on" : ""}`} onClick={() => setSpecies(s.l)}>
                      {s.e} {s.l} <span className="chip-n">{cnt}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
          )}

          <div className="wrap" style={{ paddingTop:14 }}>
            {animalSub === "post" && (
              <PostAnimalForm lang={lang} t={t} defaultCountry={formCountry} defaultProvince={formProvince} onSubmit={async (name, newAnimal) => {
                // Redirect to the most relevant tab based on which purposes were selected.
                // A listing can serve multiple purposes at once — this just decides where
                // to land the user right after posting, not which tabs the listing appears in.
                if (newAnimal?.canAdopt) { setASub("adopt"); }
                else if (newAnimal?.canFoster) { setASub("foster"); }
                else if (newAnimal?.needsHelp) { setTab("help"); }
                // Show the new listing immediately at the top, even while it's the only thing visible
                if (newAnimal) {
                  setAnimals(prev => [newAnimal, ...prev.filter(a => a.id !== newAnimal.id)]);
                }
                say(`✓ ${name} ${lang==="tr"?"eklendi — listede görünüyor":"submitted — now showing in listings"}`);
                // Refresh from DB in the background to stay in sync; new entry is already visible above
                await loadFromDB();
                // Re-apply the optimistic entry on top in case loadFromDB ordering differs
                if (newAnimal) {
                  setAnimals(prev => [newAnimal, ...prev.filter(a => a.id !== newAnimal.id)]);
                }
              }} requireContact={requireContact} />
            )}
            {animalSub !== "post" && (<>
            {animalSub === "foster" && (
              <div className="inote"><strong>{lang==="tr"?"Geçici bakım nedir?":"What is fostering?"}</strong> {t.fosterNote}</div>
            )}
            <div className="search-wrap">
              <span className="search-icon">🔍</span>
              <input placeholder={t.searchPlaceholder} value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            {(() => {
              return filtered.length > 0
                ? <div className="a-list">{filtered.map(a => <ACard key={a.id} a={a} mode={animalSub} lang={lang} onClick={() => setDetailA(a)} />)}</div>
                : <div style={{ textAlign:"center", padding:"40px 0", color:"var(--muted)", fontSize:13 }}>{t.noAnimalsFound}</div>;
            })()}
            </>)}
          </div>
        </>}

        {/* ══════════════════════════════ LOST & FOUND ══════════════════════ */}
        {tab === "lostfound" && <>
          <div className="ph">
            <div className="ph-title">{t.lostFound}</div>
            <div className="ph-sub">{t.lostFoundSub}</div>
            <div className="stabs">
              <button className={`stab ${lfSub === "board" ? "on" : ""}`} onClick={() => setLFSub("board")}>
                {t.browse} <span style={{ fontSize:11, color:"var(--muted)", marginLeft:4 }}>({filteredLF.filter(i=>i.status==="open").length} {t.openListings})</span>
              </button>
              <button className={`stab ${lfSub === "post" ? "on" : ""}`} onClick={() => setLFSub("post")}>
                {t.postListing}
              </button>
            </div>
          </div>

          {/* Global location filter — same selection as Animals page, applies here too */}
          {lfSub === "board" && <LocFilters />}

          {lfSub === "board" && (
            <div className="wrap" style={{ paddingTop:16 }}>
              <div style={{ display:"flex", gap:8, marginBottom:14 }}>
                {[["all", t.allListings],["lost", t.lostFilter],["found", t.foundFilter]].map(([v,l]) => (
                  <button key={v} className={`chip ${lfTypeFilter === v ? "on" : ""}`} onClick={() => setLFType(v)}>{l}</button>
                ))}
              </div>

              {filteredLF.length > 0 ? (
                <div className="a-list">
                  {filteredLF.map(item => {
                    const displayName = item.name === "Unknown"
                      ? (lang==="tr" ? `Bulunan ${item.species.tr}` : `Found ${item.species.en}`)
                      : item.name;
                    const adapted = {
                      id: item.id,
                      photo_url: item.photo_url,
                      emoji: item.emoji,
                      name: displayName,
                      species: item.species,
                      breed: item.breed,
                      age: { en:"", tr:"" },
                      gender: { en:"", tr:"" },
                      city: item.area,
                      province: item.city,
                      tags: { en:[], tr:[] },
                      desc: item.desc,
                      isLost: item.type === "lost" && item.status !== "reunited",
                      isFound: item.type === "found",
                      needsHelp:false, canFoster:false, canAdopt:false,
                      urgent:false, isNew:false,
                    };
                    return <ACard key={item.id} a={adapted} lang={lang} onClick={() => setDetailLF(item)} />;
                  })}
                </div>
              ) : (() => {
                // Contextual empty state — tone and illustration depend on which tab is active.
                // "Lost" with zero results is good news (framed positively).
                // "Found" and "All" with zero results invite the user to help, without sounding celebratory.
                const empty = {
                  lost:  { emoji:"🎉", title: t.lfEmptyLostTitle,  desc: t.lfEmptyLostDesc,  cta: t.lfEmptyLostCta,  newType:"lost"  },
                  found: { emoji:"🔍", title: t.lfEmptyFoundTitle, desc: t.lfEmptyFoundDesc, cta: t.lfEmptyFoundCta, newType:"found" },
                  all:   { emoji:"🐾", title: t.lfEmptyAllTitle,   desc: t.lfEmptyAllDesc,   cta: t.lfEmptyAllCta,   newType:"lost"  },
                }[lfTypeFilter] || {};

                return (
                  <div style={{ textAlign:"center", padding:"48px 20px", maxWidth:380, margin:"0 auto" }}>
                    <div style={{ fontSize:48, marginBottom:14 }}>{empty.emoji}</div>
                    <div style={{ fontSize:15, fontWeight:700, color:"var(--dark)", marginBottom:8, lineHeight:1.4 }}>{empty.title}</div>
                    <div style={{ fontSize:13, color:"var(--muted)", lineHeight:1.65, marginBottom:20 }}>{empty.desc}</div>
                    <button
                      className="btn btn-dark"
                      onClick={() => { setLFForm(f => ({ ...f, type: empty.newType })); setLFSub("post"); }}
                    >
                      + {empty.cta}
                      </button>
                    </div>
                  );
                })()}
            </div>
          )}

          {lfSub === "post" && (
            <div className="wrap" style={{ paddingTop:16 }}>
              <div className="inote">{t.postLostFoundNote}</div>

              <div className="fg">
                <label className="flabel">{t.listingType}</label>
                <div style={{ display:"flex", gap:8 }}>
                  {[["lost", t.iLostMyPet],["found", t.iFoundAnAnimal]].map(([v,l]) => (
                    <label key={v} className={`opt-item ${lfForm.type === v ? "on" : ""}`} style={{ flex:1 }}>
                      <input type="radio" name="lftype" checked={lfForm.type === v} onChange={() => setLFForm(f => ({ ...f, type:v }))} />
                      <div className="opt-label" style={{ fontSize:12 }}>{l}</div>
                    </label>
                  ))}
                </div>
              </div>

              {lfForm.type === "lost" && (
                <div className="fg"><label className="flabel">{t.petName}</label><input className="fi" placeholder={lang==="tr"?"örn. Max":"e.g. Max"} value={lfForm.name} onChange={e => setLFForm(f => ({ ...f, name:e.target.value }))} /></div>
              )}

              <div className="frow">
                <div className="fg"><label className="flabel">{t.species} *</label>
                  <select className="fs" value={lfForm.species} onChange={e => setLFForm(f => ({ ...f, species:e.target.value }))}>
                    {lang==="tr"
                      ? <><option>Köpek</option><option>Kedi</option><option>Tavşan</option><option>Kuş</option><option>Hamster</option><option>Diğer</option></>
                      : <><option>Dog</option><option>Cat</option><option>Rabbit</option><option>Bird</option><option>Hamster</option><option>Other</option></>}
                  </select>
                </div>
                <div className="fg"><label className="flabel">{t.breed}</label><input className="fi" placeholder={lang==="tr"?"örn. Labrador":"e.g. Labrador"} value={lfForm.breed} onChange={e => setLFForm(f => ({ ...f, breed:e.target.value }))} /></div>
              </div>

              <div className="frow">
                <div className="fg"><label className="flabel">{t.colour}</label><input className="fi" placeholder={lang==="tr"?"örn. Siyah & beyaz":"e.g. Black & white"} value={lfForm.color} onChange={e => setLFForm(f => ({ ...f, color:e.target.value }))} /></div>
                <div className="fg"><label className="flabel">{lang==="tr"?"Ülke *":"Country *"}</label>
                  <select className="fs" value={lfForm.lfCountry} onChange={e => setLFForm(f => ({ ...f, lfCountry:e.target.value, lfProvince:"", city:"" }))}>
                    {COUNTRIES.filter(c=>c!=="All Countries").map(c => <option key={c} value={c}>{locLabel(c, lang)}</option>)}
                  </select>
                </div>
              </div>

              <div className="frow">
                <div className="fg"><label className="flabel">{t.cityField}</label>
                  <select className="fs" value={lfForm.lfProvince} onChange={e => setLFForm(f => ({ ...f, lfProvince:e.target.value, city:"" }))}>
                    <option value="">{lang==="tr"?"İl / Bölge seç":"Select province"}</option>
                    {(PROVINCES[lfForm.lfCountry] || []).filter(p=>p!=="All Provinces").map(p => <option key={p} value={p}>{locLabel(p, lang)}</option>)}
                  </select>
                </div>
                <div className="fg"><label className="flabel">{t.areaField}</label>
                  <select className="fs" value={lfForm.city} onChange={e => setLFForm(f => ({ ...f, city:e.target.value, area:e.target.value }))}>
                    <option value="">{lang==="tr"?"Semt / İlçe seç":"Select area"}</option>
                    {(CITIES[lfForm.lfProvince] || []).filter(c=>c!=="All Cities").map(c => <option key={c} value={c}>{locLabel(c, lang)}</option>)}
                  </select>
                </div>
              </div>

              <div className="fg"><label className="flabel">{lang==="tr"?"Açık Adres":"Open Address"}</label>
                <input className="fi" placeholder={lang==="tr"?"Sokak, bina no, tarif…":"Street, building no, landmark…"} value={lfForm.lfAddress} onChange={e => setLFForm(f => ({ ...f, lfAddress:e.target.value }))} />
              </div>

              <div className="fg"><label className="flabel">{t.yourContact}</label><input className="fi" placeholder={t.contactPlaceholder} value={lfForm.contact} onChange={e => setLFForm(f => ({ ...f, contact:e.target.value }))} /></div>

              {lfForm.type === "lost" && (
                <div className="fg"><label className="flabel">{t.reward}</label><input className="fi" placeholder={rewardHint(formCountry, lfForm.lfProvince || formProvince, lang)} value={lfForm.reward} onChange={e => setLFForm(f => ({ ...f, reward:e.target.value }))} /></div>
              )}

              <div className="fg"><label className="flabel">{t.descriptionField}</label>
                <textarea className="fta" placeholder={lfForm.type === "lost" ? t.descLostPlaceholder : t.descFoundPlaceholder} value={lfForm.desc} onChange={e => setLFForm(f => ({ ...f, desc:e.target.value }))} />
              </div>

              <div className="fg">
                <label className="flabel">{lang==="tr"?"Fotoğraflar * (1–5)":"Photos * (1–5)"}</label>
                <MultiPhotoUpload photos={lfPhotos} setPhotos={setLFPhotos} folder="lf" lang={lang} t={t} maxPhotos={5} />
              </div>

              <button className="btn btn-dark btn-full" onClick={() => requireContact(async (contact) => {
                if(!lfForm.lfProvince || !lfForm.city || !lfForm.desc) { say(lang==="tr"?"Lütfen tüm zorunlu alanları doldurun":"Please fill all required fields"); return; }
                if(lfPhotos.length === 0) { alert(lang==="tr"?"Lütfen en az 1 fotoğraf yükleyin — hayvanı tanımlamaya yardımcı olur":"Please upload at least 1 photo — it helps identify the animal"); return; }
                const fullArea = [lfForm.lfAddress, lfForm.city].filter(Boolean).join(", ");
                const { error } = await (await getDb()).from("lf_listings").insert([{
                  type: lfForm.type,
                  name: lfForm.name || null,
                  species: lfForm.species,
                  breed: lfForm.breed || null,
                  color: lfForm.color || null,
                  area: fullArea,
                  city: lfForm.lfProvince,
                  contact: contact.contactPref === "phone" ? contact.phone : contact.email,
                  contact_email: contact.email,
                  contact_phone: contact.phone || null,
                  contact_pref: contact.contactPref || "email",
                  reward: lfForm.reward || null,
                  desc_en: lfForm.desc,
                  desc_tr: lfForm.desc,
                  status: "open",
                  photo_url: lfPhotos[0] || null,
                  photo_urls: lfPhotos,
                }]);
                if (error) { say(lang==="tr"?"Hata oluştu, tekrar dene":"Error occurred, please try again"); return; }
                setLFForm({ type:"lost", name:"", species:"Dog", breed:"", color:"", area:"", city:"", contact:"", reward:"", desc:"", lfCountry:FORM_COUNTRY, lfProvince:FORM_PROVINCE, lfAddress:"" });
                setLFPhotos([]); setLFSub("board");
                say(lfForm.type === "lost" ? t.postLost : t.postFound);
                await loadFromDB();
              })}>
                {lfForm.type === "lost" ? t.postLost : t.postFound}
              </button>
            </div>
          )}
        </>}

        {/* ══════════════════════════════ HELP ══════════════════════════════ */}
        {tab === "help" && <>
          <div className="ph" style={{ position:"sticky" }}>
            <div className="ph-title">{t.helpAnimals}</div>
            <div className="ph-sub" style={{ paddingBottom:14 }}>{t.helpSub}</div>

            {/* Primary CTA — sized and elevated to stand out as THE action on this page */}
            <button className="btn btn-red btn-full-mobile" style={{ marginBottom:16, padding:"13px 28px" }} onClick={() => setShowReportForm(true)}>
              🚨 {lang==="tr"?"Yardım İste":"Report an Animal in Need"}
            </button>

            <div className="stabs">
              <button className={`stab ${helpSub === "active" ? "on" : ""}`} onClick={() => setHelpSub("active")}>
                {t.activeReports} <span style={{ fontSize:11, color:"var(--muted)", marginLeft:4 }}>({helpItems.filter(r => r.status === "active").length})</span>
              </button>
              <button className={`stab ${helpSub === "helped" ? "on" : ""}`} onClick={() => setHelpSub("helped")}>
                {t.helpedTab} <span style={{ fontSize:11, color:"var(--muted)", marginLeft:4 }}>({helpItems.filter(r => r.status === "helped" || r.status === "resolved").length})</span>
              </button>
            </div>
          </div>

          {/* Global location filter — same selection as Animals page, applies here too */}
          <LocFilters />

          <div className="wrap" style={{ paddingTop:16 }}>
            {helpSub === "active" && (
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:14 }}>
                <div style={{ fontSize:13, fontWeight:600, color:"var(--dark)" }}>
                  {t.activeReports}
                  <span style={{ fontWeight:400, color:"var(--muted)", marginLeft:6 }}>
                    ({helpItems.filter(r => r.status === "active").length} {t.needingHelp})
                  </span>
                </div>
              </div>
            )}
            {helpSub === "helped" && (
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:14 }}>
                <div style={{ fontSize:13, fontWeight:600, color:"var(--dark)" }}>
                  {t.helpedTab}
                  <span style={{ fontWeight:400, color:"var(--muted)", marginLeft:6 }}>
                    ({helpItems.filter(r => r.status === "helped" || r.status === "resolved").length} {t.helpedAnimals})
                  </span>
                </div>
              </div>
            )}

            {/* ── Reports list — filtered by active sub-tab ── */}
            <div className="a-list" style={{ marginBottom:24 }}>
              {[...helpItems]
                .filter(r => helpSub === "active" ? r.status === "active" : (r.status === "helped" || r.status === "resolved"))
                .sort((a,b) => {
                  const order = { active:0, helped:1, resolved:2 };
                  return (order[a.status]??1) - (order[b.status]??1);
                })
                .map(r => {
                  const isVolunteer = contactInfo.email && r.volunteers?.some(v => v.name === contactInfo.email);
                  const rTitle = typeof r.title === "object" ? (r.title[lang] || r.title.en || "") : (r.title || "");
                  const rDesc  = typeof r.desc  === "object" ? (r.desc[lang]  || r.desc.en  || "") : (r.desc  || "");
                  const rTime  = typeof r.time  === "object" ? (r.time[lang]  || r.time.en  || "") : (r.time  || "");
                  return (
                    <div key={r.id} className={`acard ${r.status === "resolved" ? "resolved" : ""}`} style={r.status==="resolved"?{opacity:0.55}:undefined}>
                      {/* Same big-image header language as every other card in the app */}
                      <div className="acard-img" style={{ overflow:"hidden", cursor:"pointer" }} onClick={() => setDetailReport(r)}>
                        {r.photo_url
                          ? <img src={r.photo_url} alt={r.title?.[lang] || r.title?.en || (lang==="tr"?"Bildirilen hayvan":"Reported animal")} loading="lazy" style={{ width:"100%", height:"100%", objectFit:"cover" }} />
                          : <img src={FALLBACK_IMAGE} alt="" aria-hidden="true" loading="lazy" style={{ width:"56%", height:"56%", objectFit:"contain", opacity:0.5 }} />
                        }
                        {r.photo_urls?.length > 1 && (
                          <span className="abadge ab-sp">+{r.photo_urls.length - 1}</span>
                        )}
                      </div>
                      <div className="acard-body">
                        <div style={{ display:"flex", justifyContent:"space-between", gap:6, flexWrap:"wrap", marginBottom:2 }}>
                          <div className="acard-name">{rTitle}</div>
                          <span className={`spill ${r.status === "active" ? "sp-a" : r.status === "helped" ? "sp-h" : r.status === "resolved" ? "sp-r" : "sp-p"}`}>
                            {r.status}
                          </span>
                        </div>
                        <div className="tags" style={{ marginBottom:5 }}>
                          <span className="purpose-badge purpose-help">{lang==="tr"?"Yardım Gerekiyor":"Needs Help"}</span>
                          {r.fromAnimalListing && r.animalRef?.canAdopt  && <span className="purpose-badge purpose-adopt">{lang==="tr"?"Sahiplenilebilir":"Adoptable"}</span>}
                          {r.fromAnimalListing && r.animalRef?.canFoster && <span className="purpose-badge purpose-foster">{lang==="tr"?"Geçici Bakım":"Foster"}</span>}
                        </div>
                        <div className="acard-meta" style={{ marginBottom:8 }}>{rDesc}</div>
                        <div className="r-meta" style={{ marginBottom:10 }}>
                          <span className="r-mi">📍 {r.location}</span>
                          <span className="r-mi">{rTime}</span>
                          {!r.fromAnimalListing && <span className="r-mi">{t.reportedBy} {r.reporter}</span>}
                        </div>

                        {/* Volunteer list — sorted by etaOrder (closest first), Coordinating last */}
                        {r.volunteers?.length > 0 && (
                          <div className="r-volunteers" style={{ marginBottom:10 }}>
                            <div style={{ fontSize:10, fontWeight:600, color:"var(--muted)", textTransform:"uppercase", letterSpacing:"0.5px", marginBottom:4 }}>
                              {r.volunteers.length} {t.volunteersResponding}
                            </div>
                            {[...r.volunteers]
                              .sort((a,b) => (a.etaOrder??99) - (b.etaOrder??99))
                              .map((v, i) => {
                                const opt = ETA_OPTIONS.find(o => o.label === v.eta);
                                const displayEta = lang === "tr" ? (opt?.labelTR || v.eta) : v.eta;
                                const isMe = contactInfo.email && v.name === contactInfo.email;
                                const displayName = isMe
                                  ? (lang==="tr" ? "Sen" : "You")
                                  : (lang==="tr" ? "Bir gönüllü" : "A volunteer");
                                return (
                                  <div key={i} className="r-vol-item">
                                    <div className="r-vol-dot" style={{ background: v.etaOrder === 99 ? "var(--amber)" : "var(--blue)" }} />
                                    <span style={{ fontWeight:600 }}>{displayName}</span>
                                    <span className="r-vol-eta">· {displayEta}</span>
                                  </div>
                                );
                              })}
                          </div>
                        )}

                        {/* Action row */}
                        {r.status !== "resolved" && (
                          <div className="r-actions" style={{ marginBottom:10, flexWrap:"wrap" }}>
                            {r.fromAnimalListing ? (
                              <>
                                {r.animalRef?.canAdopt && (
                                  <button className="btn btn-dark btn-sm" onClick={() => setApplyFor(r.animalRef)}>
                                    {t.applyAdopt}
                                  </button>
                                )}
                                {(r.animalRef?.canFoster || r.animalRef?.needsHelp || r.animalRef?.isLost || r.animalRef?.isFound) && (
                                  <button className="btn btn-outline btn-sm" onClick={() => setTakeActionFor(r.animalRef)}>
                                    {getSingleActionLabel(r.animalRef, lang) || t.takeAction}
                                  </button>
                                )}
                              </>
                            ) : (<>
                              {!isVolunteer && r.status !== "helped" && (
                                <button className="btn btn-outline btn-sm" onClick={() => setEtaFor(r)}>
                                  {t.iCanHelp}
                                </button>
                              )}
                              {isVolunteer && r.status !== "helped" && (
                                <>
                                  <div style={{ fontSize:11, color:"var(--blue)", fontWeight:600 }}>
                                    {t.youAreResponding} — {(() => { const v=r.volunteers.find(v=>v.name===contactInfo.email); const opt=ETA_OPTIONS.find(o=>o.label===v?.eta); return lang==="tr"?(opt?.labelTR||v?.eta):v?.eta; })()}
                                  </div>
                                  <button className="btn btn-blue btn-sm" onClick={() => { setHelpedFor(r); setHelpProof(null); }}>
                                    {t.markAsHelped}
                                  </button>
                                </>
                              )}
                              {r.status === "helped" && (
                                <div style={{ fontSize:11, color:"var(--blue)", fontWeight:500 }}>{t.animalHasBeenHelped}</div>
                              )}
                          </>)}
                        </div>
                      )}

                      {/* WhatsApp share — available on every report */}
                      <div style={{ marginTop:10, display:"flex", justifyContent:"flex-end" }}>
                        <WhatsAppShareButton lang={lang} t={t} text={
                          `🚨 ${lang==="tr"?"Yardıma ihtiyacı olan hayvan":"Animal in need of help"}: ${typeof r.title === "object" ? (r.title[lang] || r.title.en || "") : (r.title || "")}\n` +
                          `📍 ${r.location}\n` +
                          `${typeof r.desc === "object" ? (r.desc[lang] || r.desc.en || "") : (r.desc || "")}\n\n` +
                          `${lang==="tr"?"Paweero'da görüntüle":"View on Paweero"}: ${typeof window!=="undefined"?`${SITE_URL}${itemPath(lang, "help", r, r.title?.en || r.title)}`:""}`
                        } />
                      </div>
                    </div>
                    </div>
                  );
                })}
              {helpItems.filter(r => helpSub === "active" ? r.status === "active" : (r.status === "helped" || r.status === "resolved")).length === 0 && (
                <div style={{ textAlign:"center", padding:"40px 0", color:"var(--muted)", fontSize:13 }}>
                  {helpSub === "active"
                    ? (lang==="tr"?"Şu anda aktif ihbar yok.":"No active reports right now.")
                    : (lang==="tr"?"Henüz yardım edilen hayvan yok.":"No animals helped yet.")}
                </div>
              )}
            </div>

          </div>
        </>}

      {/* ── SUBMIT REPORT MODAL/DRAWER ── */}
      {showReportForm && !contactModal && (
        <div className="sheet-overlay" onClick={() => setShowReportForm(false)}>
          <div className="sheet" onClick={e => e.stopPropagation()}>
            <div className="sh-handle" />
            <div className="sh-hd">
              <div className="sh-title">{t.submitReportTitle}</div>
              <button className="sh-close" onClick={() => setShowReportForm(false)}>✕</button>
            </div>
            <div className="sh-body">
              <div className="inote" style={{ borderColor:"rgba(192,57,43,0.25)", background:"rgba(192,57,43,0.05)" }}>
                <strong style={{ color:"var(--red)" }}>🚨 {t.helpFormRedirectNote}</strong>
                <div style={{ marginTop:8, display:"flex", flexDirection:"column", gap:4 }}>
                  <span style={{ fontSize:11, color:"var(--muted)", fontWeight:600 }}>{t.helpFormWrongPlace}</span>
                  <button
                    style={{ background:"none", border:"none", padding:0, textAlign:"left", fontSize:12, fontWeight:600, color:"var(--amber)", cursor:"pointer", textDecoration:"underline" }}
                    onClick={() => { setShowReportForm(false); setTab("animals"); setASub("post"); }}
                  >{t.helpFormRedirectAdopt}</button>
                  <button
                    style={{ background:"none", border:"none", padding:0, textAlign:"left", fontSize:12, fontWeight:600, color:"var(--amber)", cursor:"pointer", textDecoration:"underline" }}
                    onClick={() => { setShowReportForm(false); setTab("lostfound"); setLFSub("post"); }}
                  >{t.helpFormRedirectLF}</button>
                </div>
              </div>
              <div className="fg"><label className="flabel">{t.animalType}</label>
                <div className="type-row">{["🐕","🐈","🐦","🐄","🐎","🐾"].map(e => <button key={e} className={`tbtn ${rf.animal === e ? "on" : ""}`} onClick={() => setRf(f => ({ ...f, animal:e }))}>{e}</button>)}</div>
              </div>
              <div className="fg"><label className="flabel">{t.situation}</label>
                <select className="fs" value={rf.type} onChange={e => setRf(f => ({ ...f, type:e.target.value }))}>
                  {lang==="tr"
                    ? <><option>Yaralı</option><option>Terk edilmiş</option><option>Hasta</option><option>Başıboş / Kayıp</option><option>İstismar / İhmal</option><option>Diğer</option></>
                    : <><option>Injured</option><option>Abandoned</option><option>Sick</option><option>Stray / Lost</option><option>Abuse / Neglect</option><option>Other</option></>}
                </select>
              </div>
              <div className="fg"><label className="flabel">{t.titleField}</label>
                <input className="fi" placeholder={lang==="tr"?"örn. Bağdat Cad. yaralı köpek":"e.g. Injured dog on Bağdat Ave"} value={rf.title} onChange={e => setRf(f => ({ ...f, title:e.target.value }))} />
              </div>
              <div className="fg"><label className="flabel">{t.locationField}</label>
                <div className="frow">
                  <select className="fs" value={rf.rCountry} onChange={e => setRf(f => ({ ...f, rCountry:e.target.value, rProvince:"", rCity:"" }))}>
                    {COUNTRIES.filter(c=>c!=="All Countries").map(c => <option key={c} value={c}>{locLabel(c, lang)}</option>)}
                  </select>
                  <select className="fs" value={rf.rProvince} onChange={e => setRf(f => ({ ...f, rProvince:e.target.value, rCity:"" }))}>
                    <option value="">{lang==="tr"?"İl / Bölge seç":"Select province"}</option>
                    {(PROVINCES[rf.rCountry] || []).filter(p=>p!=="All Provinces").map(p => <option key={p} value={p}>{locLabel(p, lang)}</option>)}
                  </select>
                </div>
                <div className="frow" style={{ marginTop:10 }}>
                  <select className="fs" value={rf.rCity} onChange={e => setRf(f => ({ ...f, rCity:e.target.value }))}>
                    <option value="">{lang==="tr"?"Semt / İlçe seç":"Select area"}</option>
                    {(CITIES[rf.rProvince] || []).filter(c=>c!=="All Cities").map(c => <option key={c} value={c}>{locLabel(c, lang)}</option>)}
                  </select>
                  <input className="fi" placeholder={lang==="tr"?"Açık adres (sokak, bina no...)":"Open address (street, building no...)"} value={rf.rAddress} onChange={e => setRf(f => ({ ...f, rAddress:e.target.value }))} />
                </div>
              </div>
              <div className="fg"><label className="flabel">{t.description}</label>
                <textarea className="fta" placeholder={lang==="tr"?"Görünür yaralar? Hayvan ne zamandan beri orada?":"Visible injuries? How long has the animal been there?"} value={rf.desc} onChange={e => setRf(f => ({ ...f, desc:e.target.value }))} />
              </div>
              <div className="fg">
                <label className="flabel">{lang==="tr"?"Fotoğraflar * (1–5)":"Photos * (1–5)"}</label>
                <MultiPhotoUpload photos={photos} setPhotos={setPhotos} folder="reports" lang={lang} t={t} maxPhotos={5} />
              </div>
              <button className="btn btn-red btn-full" onClick={() => requireContact(async (contact) => {
                if(!rf.title || !rf.rProvince || !rf.rCity) { say(lang==="tr"?"Lütfen başlık, il ve semt seçin":"Please fill title, province and area"); return; }
                if(photos.length === 0) { alert(lang==="tr"?"Lütfen hayvanın en az 1 fotoğrafını yükleyin":"Please upload at least 1 photo of the animal"); return; }
                const fullLocation = [rf.rAddress, rf.rCity, rf.rProvince, rf.rCountry].filter(Boolean).join(", ");
                const { error } = await (await getDb()).from("reports").insert([{
                  emoji: rf.animal || "🐾",
                  title: rf.title,
                  description: rf.desc || "",
                  location: fullLocation,
                  reporter_name: contact.email,
                  reporter_phone: contact.phone || null,
                  reporter_pref: contact.contactPref || "email",
                  status: "active",
                  photo_url: photos[0] || null,
                  photo_urls: photos,
                }]);
                if (error) { say(lang==="tr"?"Hata oluştu, tekrar dene":"Error occurred, please try again"); return; }

                // Also publish this animal as a "found" listing in Lost & Found,
                // so a posted animal automatically appears under the Found tab too.
                const speciesFromEmoji = { "🐕":"Dog", "🐈":"Cat", "🐦":"Bird", "🐄":"Cattle", "🐎":"Horse" }[rf.animal] || "Other";
                const lfArea = [rf.rAddress, rf.rCity].filter(Boolean).join(", ");
                const lfDesc = [rf.title, rf.desc].filter(Boolean).join(" — ");
                await (await getDb()).from("lf_listings").insert([{
                  type: "found",
                  name: null,
                  species: speciesFromEmoji,
                  breed: null,
                  color: null,
                  area: lfArea,
                  city: rf.rProvince,
                  contact: contact.contactPref === "phone" ? contact.phone : contact.email,
                  contact_email: contact.email,
                  contact_phone: contact.phone || null,
                  contact_pref: contact.contactPref || "email",
                  reward: null,
                  desc_en: lfDesc,
                  desc_tr: lfDesc,
                  status: "open",
                  photo_url: photos[0] || null,
                  photo_urls: photos,
                }]);

                setRf({ title:"", location:"", desc:"", type:"Injured", animal:"", rCountry:FORM_COUNTRY, rProvince:FORM_PROVINCE, rCity:"", rAddress:"" });
                setPhotos([]); setShowReportForm(false);
                say(lang==="tr"?"İhbar gönderildi — kurtarma ekibi bildirildi":"Report submitted — responders notified");
                await loadFromDB();
              })}>{t.submitReport}</button>
            </div>
          </div>
        </div>
      )}
              </div>

      {/* ── EMAIL OTP VERIFICATION MODAL ── */}
      {contactModal && (
        <div className="sheet-overlay" style={{ zIndex:260 }} onClick={() => { if(!otpSending && !otpVerifying) setContactModal(null); }}>
          <div className="sheet" onClick={e => e.stopPropagation()}>
            <div className="sh-handle" />
            <div className="sh-hd">
              <div className="sh-title">
                {otpStep === "email"
                  ? (lang==="tr"?"İletişim Bilgileri":"Contact Details")
                  : (lang==="tr"?"E-posta Doğrulama":"Email Verification")}
              </div>
              <button className="sh-close" onClick={() => setContactModal(null)}>✕</button>
            </div>
            <div className="sh-body">
              {otpStep === "email" ? <>
                <div className="inote">
                  {lang==="tr"
                    ? "İlanınızı yayınlamak için e-posta adresinizi doğrulamamız gerekiyor."
                    : "We need to verify your email before publishing your listing."}
                </div>

                {/* Email - zorunlu */}
                <div className="fg">
                  <label className="flabel">{lang==="tr"?"E-posta *":"Email *"}</label>
                  <input className="fi" type="email" placeholder="ornek@email.com"
                    value={contactInfo.email}
                    onChange={e => setContactInfo(f => ({ ...f, email:e.target.value }))} />
                  {contactErr.email && <div className="err">{contactErr.email}</div>}
                </div>

                {/* Telefon - opsiyonel */}
                <div className="fg">
                  <label className="flabel">{lang==="tr"?"Telefon (opsiyonel)":"Phone (optional)"}</label>
                  <input className="fi" type="tel" placeholder={phoneHint(formCountry, formProvince)}
                    value={contactInfo.phone}
                    onChange={e => setContactInfo(f => ({ ...f, phone:e.target.value }))} />
                </div>

                {/* İletişim tercihi */}
                <div className="fg">
                  <label className="flabel">{lang==="tr"?"İletişim Tercihi":"Preferred Contact Method"}</label>
                  <div style={{ display:"flex", gap:8 }}>
                    {[
                      { val:"email", label:lang==="tr"?"E-posta":"Email", icon:"✉️" },
                      { val:"phone", label:lang==="tr"?"Telefon":"Phone", icon:"📞", disabled:!contactInfo.phone },
                    ].map(opt => (
                      <label key={opt.val} className={`opt-item ${contactInfo.contactPref===opt.val?"on":""} ${opt.disabled?"":""}`}
                        style={{ flex:1, opacity: opt.disabled ? 0.4 : 1 }}>
                        <input type="radio" name="cpref" disabled={opt.disabled}
                          checked={contactInfo.contactPref===opt.val}
                          onChange={() => !opt.disabled && setContactInfo(f => ({ ...f, contactPref:opt.val }))} />
                        <div className="opt-label">{opt.icon} {opt.label}</div>
                      </label>
                    ))}
                  </div>
                  <div style={{ fontSize:11, color:"var(--muted)", marginTop:6 }}>
                    {lang==="tr"
                      ? "İlanınıza ulaşmak isteyen kişiler bu yöntemi kullanacak."
                      : "People who want to reach you will use this method."}
                  </div>
                </div>

                <button className="btn btn-dark btn-full" onClick={sendOtp} disabled={otpSending}>
                  {otpSending
                    ? (lang==="tr"?"Gönderiliyor...":"Sending...")
                    : (lang==="tr"?"Doğrulama Kodu Gönder":"Send Verification Code")}
                </button>
              </> : <>
                <div className="inote">
                  {lang==="tr"
                    ? `${contactInfo.email} adresine 6 haneli doğrulama kodu gönderildi.`
                    : `A 6-digit verification code was sent to ${contactInfo.email}.`}
                </div>
                <div className="fg">
                  <label className="flabel">{lang==="tr"?"Doğrulama Kodu *":"Verification Code *"}</label>
                  <input className="fi" type="number" placeholder="123456"
                    maxLength={6}
                    value={otpCode}
                    onChange={e => setOtpCode(e.target.value.slice(0,6))}
                    style={{ fontSize:22, letterSpacing:8, textAlign:"center" }} />
                  {contactErr.otp && <div className="err">{contactErr.otp}</div>}
                </div>
                <button className="btn btn-dark btn-full" onClick={verifyOtp} disabled={otpVerifying} style={{ marginBottom:10 }}>
                  {otpVerifying
                    ? (lang==="tr"?"Doğrulanıyor...":"Verifying...")
                    : (lang==="tr"?"Doğrula ve Devam Et":"Verify & Continue")}
                </button>
                <button className="btn btn-outline btn-full" onClick={() => { setOtpStep("email"); setOtpCode(""); setContactErr({}); }}>
                  {lang==="tr"?"← E-postayı Değiştir":"← Change Email"}
                </button>
              </>}
            </div>
          </div>
        </div>
      )}

      {/* GLOBAL "+" POST BUTTON — the single entry point for creating an animal report.
          No module choice, no chooser — this opens the one unified form directly,
          which itself lets the user multi-select every purpose that applies. */}
      <button
        className="fab-post"
        onClick={() => setShowCreateReport(true)}
        title={t.postFabLabel}
      >
        <span style={{ fontSize:24, lineHeight:1 }}>+</span>
      </button>

      {/* CREATE AN ANIMAL REPORT SHEET — one entry point, one animal record,
          multiple purposes selected inside PostAnimalForm itself. */}
      {showCreateReport && !contactModal && (
        <div className="sheet-overlay" onClick={() => setShowCreateReport(false)}>
          <div className="sheet" onClick={e => e.stopPropagation()}>
            <div className="sh-handle" />
            <div className="sh-hd">
              <div className="sh-title">{lang==="tr"?"Hayvan Raporu Oluştur":"Create an Animal Report"}</div>
              <button className="sh-close" onClick={() => setShowCreateReport(false)}>✕</button>
            </div>
            <div className="sh-body">
              <PostAnimalForm lang={lang} t={t} defaultCountry={formCountry} defaultProvince={formProvince} requireContact={requireContact} onSubmit={async (name, newAnimal) => {
                setShowCreateReport(false);
                // Land the user on whichever browse tab best matches what they selected.
                if (newAnimal?.isLost || newAnimal?.isFound) { setTab("lostfound"); }
                else if (newAnimal?.needsHelp) { setTab("help"); }
                else if (newAnimal?.canAdopt) { setTab("animals"); setASub("adopt"); }
                else if (newAnimal?.canFoster) { setTab("animals"); setASub("foster"); }
                if (newAnimal) {
                  setAnimals(prev => [newAnimal, ...prev.filter(a => a.id !== newAnimal.id)]);
                }
                say(`✓ ${name} ${lang==="tr"?"eklendi — listede görünüyor":"submitted — now showing in listings"}`);
                await loadFromDB();
                if (newAnimal) {
                  setAnimals(prev => [newAnimal, ...prev.filter(a => a.id !== newAnimal.id)]);
                }
              }} />
            </div>
          </div>
        </div>
      )}

      {/* BUILD STAMP — hangi sürümün yayında olduğunu panele girmeden görebilmek için */}
      <div className="build-stamp">
        build {__BUILD_INFO__.commit} · {__BUILD_INFO__.at.slice(0, 16).replace("T", " ")} UTC
      </div>

      {/* BOTTOM NAV */}
      <nav className="bottom-nav">
        {TABS.map(tb => (
          <button key={tb.id} className={`tab-btn ${tab === tb.id ? "on" : ""} ${tb.id === "help" ? "red" : ""}`} onClick={() => goTab(tb.id)}>
            <div className="tab-icon">{tb.icon}</div>
            <div className="tab-label">{t[tb.id === "lostfound" ? "lostFound" : tb.id] || tb.label}</div>
            <div className="tab-bar" />
          </button>
        ))}
      </nav>

      {/* ANIMAL DETAIL SHEET */}
      {detailAnimal && (
        <div className="sheet-overlay" onClick={() => setDetailA(null)}>
          <div className="sheet" style={{ maxHeight:`${detailAHeight}vh` }} onClick={e => e.stopPropagation()}>
            <div className="sh-handle" />
            <div className="sh-hd"><div className="sh-title">{t.animalProfile}</div><button className="sh-close" onClick={() => setDetailA(null)}>✕</button></div>
            <div className="sh-body">
              <ImageCarousel photos={detailAnimal.photo_urls} emoji={detailAnimal.emoji} alt={[detailAnimal.name, detailAnimal.breed?.[lang], detailAnimal.city].filter(Boolean).join(", ")} height={detailAHeight >= 85 ? 360 : 220} fit={detailAHeight >= 85 ? "contain" : "cover"} />
              <div className="d-name">{detailAnimal.name}</div>
              <div className="d-sub">{detailAnimal.breed[lang]} · {detailAnimal.species[lang]}</div>
              <div className="d-pills">
                <span className="d-pill">🎂 {detailAnimal.age[lang]}</span>
                <span className="d-pill">{detailAnimal.gender.en === "Male" ? "♂" : "♀"} {detailAnimal.gender[lang]}</span>
                <span className="d-pill">📍 {detailAnimal.city}, {detailAnimal.province}</span>
              </div>
              <div className="tags">{detailAnimal.tags[lang].map(tg => <span key={tg} className="tag">{tg}</span>)}</div>
              <div className="d-desc">{detailAnimal.desc[lang]}</div>
              <div className="d-acts">
                {detailAnimal.canAdopt && (
                  <button className="btn btn-dark btn-full" onClick={() => { setApplyFor(detailAnimal); setDetailA(null); }}>{t.applyAdopt}</button>
                )}
                {(detailAnimal.canFoster || detailAnimal.needsHelp || detailAnimal.isLost || detailAnimal.isFound) && (
                  <button className={`btn btn-full ${detailAnimal.canAdopt ? "btn-outline" : "btn-dark"}`} onClick={() => { setTakeActionFor(detailAnimal); setDetailA(null); }}>{getSingleActionLabel(detailAnimal, lang) || t.takeAction}</button>
                )}
                <WhatsAppShareButton lang={lang} t={t} text={
                  `🐾 ${detailAnimal.name} — ${detailAnimal.breed[lang]} · ${detailAnimal.age[lang]} · ${detailAnimal.gender[lang]}\n` +
                  `📍 ${detailAnimal.city}, ${detailAnimal.province}\n` +
                  `${detailAnimal.desc?.[lang] || ""}\n\n` +
                  `${lang==="tr"?"Paweero'da görüntüle":"View on Paweero"}: ${typeof window!=="undefined"?`${SITE_URL}${itemPath(lang, "animals", detailAnimal, detailAnimal.name)}`:""}`
                } />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* LOST & FOUND DETAIL SHEET */}
      {detailLF && (
        <div className="sheet-overlay" onClick={() => setDetailLF(null)}>
          <div className="sheet" style={{ maxHeight:`${detailLFHeight}vh` }} onClick={e => e.stopPropagation()}>
            <div className="sh-handle" />
            <div className="sh-hd">
              <div className="sh-title">{detailLF.type === "lost" ? t.lostPetSheet : t.foundAnimalSheet}</div>
              <button className="sh-close" onClick={() => setDetailLF(null)}>✕</button>
            </div>
            <div className="sh-body">
              <ImageCarousel photos={detailLF.photo_urls} emoji={detailLF.emoji} alt={[detailLF.name, detailLF.breed?.[lang], detailLF.area].filter(Boolean).join(", ")} height={detailLFHeight >= 85 ? 360 : 220} fit={detailLFHeight >= 85 ? "contain" : "cover"} />
              <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:4 }}>
                <div className="d-name">{detailLF.name === "Unknown" ? (lang==="tr"?`Bulunan ${detailLF.species.tr}`:`Found ${detailLF.species.en}`) : detailLF.name}</div>
                <span className={`lf-type ${detailLF.status === "reunited" ? "lf-reunited" : detailLF.type === "lost" ? "lf-lost" : "lf-found"}`} style={{ position:"static" }}>
                  {detailLF.status === "reunited" ? t.reunited : detailLF.type === "lost" ? (lang==="tr"?"Kayıp":"Lost") : (lang==="tr"?"Bulunan":"Found")}
                </span>
              </div>
              <div className="d-sub">{detailLF.species[lang]} · {detailLF.breed[lang]} · {detailLF.color[lang]}</div>
              <div className="d-pills">
                <span className="d-pill">📍 {detailLF.area}, {detailLF.city}</span>
                <span className="d-pill">🕐 {detailLF.date[lang]}</span>
                {detailLF.reward[lang] && <span className="d-pill" style={{ color:"var(--amber)", fontWeight:700 }}>{lang==="tr"?"Ödül":"Reward"}: {detailLF.reward[lang]}</span>}
              </div>
              <div className="d-desc">{detailLF.desc[lang]}</div>
              <div className="d-acts">
                {detailLF.status !== "reunited" && (
                  <button className="btn btn-dark btn-full" onClick={() => { setDetailLF(null); say(t.contactCopied); }}>📞 {t.contactInfo} {detailLF.contact}</button>
                )}
                <WhatsAppShareButton lang={lang} t={t} text={
                  `${detailLF.type === "found"
                    ? (lang==="tr"?"🐾 Bulunan hayvan":"🐾 Found animal")
                    : (lang==="tr"?"🐾 Kayıp hayvan":"🐾 Lost animal")}: ${detailLF.name === "Unknown" ? detailLF.species[lang] : detailLF.name}\n` +
                  `📍 ${[detailLF.area, detailLF.city].filter(Boolean).join(", ")}\n` +
                  `${detailLF.desc[lang] || ""}\n\n` +
                  `${lang==="tr"?"Paweero'da görüntüle":"View on Paweero"}: ${typeof window!=="undefined"?`${SITE_URL}${itemPath(lang, "lostfound", detailLF, detailLF.name)}`:""}`
                } />
                <button className="btn btn-outline btn-full" onClick={() => setDetailLF(null)}>{t.close}</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* REPORT DETAIL SHEET (gallery view) */}
      {detailReport && (
        <div className="sheet-overlay" onClick={() => setDetailReport(null)}>
          <div className="sheet" style={{ maxHeight:`${detailReportHeight}vh` }} onClick={e => e.stopPropagation()}>
            <div className="sh-handle" />
            <div className="sh-hd">
              <div className="sh-title">{detailReport.title[lang] || detailReport.title}</div>
              <button className="sh-close" onClick={() => setDetailReport(null)}>✕</button>
            </div>
            <div className="sh-body">
              <ImageCarousel photos={detailReport.photo_urls} emoji={detailReport.emoji} alt={detailReport.title?.[lang] || detailReport.title?.en || ""} height={detailReportHeight >= 85 ? 360 : 220} fit={detailReportHeight >= 85 ? "contain" : "cover"} />
              <div className="d-pills">
                <span className="d-pill">📍 {detailReport.location}</span>
                <span className="d-pill">🕐 {detailReport.time[lang] || detailReport.time}</span>
                <span className={`d-pill spill ${detailReport.status === "active" ? "sp-a" : detailReport.status === "helped" ? "sp-h" : detailReport.status === "resolved" ? "sp-r" : "sp-p"}`}>
                  {detailReport.status}
                </span>
              </div>
              <div className="d-desc">{detailReport.desc[lang] || detailReport.desc}</div>

              {/* Status indicator and help actions */}
              {detailReport.status === "helped" && (
                <div style={{ fontSize:12, color:"var(--blue)", fontWeight:500, marginBottom:12, padding:"8px 12px", background:"var(--light)", borderRadius:8, textAlign:"center" }}>
                  {t.animalHasBeenHelped}
                </div>
              )}

              <div className="d-acts">
                {detailReport.status === "active" && (() => {
                  const isVolunteer = contactInfo.email && detailReport.volunteers?.some(v => v.name === contactInfo.email);
                  return !isVolunteer ? (
                    <button className="btn btn-dark btn-full" onClick={() => { setEtaFor(detailReport); setDetailReport(null); }}>
                      {t.iCanHelp}
                    </button>
                  ) : (
                    <button className="btn btn-blue btn-full" onClick={() => { setHelpedFor(detailReport); setHelpProof(null); setDetailReport(null); }}>
                      {t.markAsHelped}
                    </button>
                  );
                })()}
                <WhatsAppShareButton lang={lang} t={t} text={
                  `🚨 ${lang==="tr"?"Yardıma ihtiyacı olan hayvan":"Animal in need of help"}: ${detailReport.title[lang]||detailReport.title}\n` +
                  `📍 ${detailReport.location}\n` +
                  `${detailReport.desc[lang]||detailReport.desc||""}\n\n` +
                  `${lang==="tr"?"Paweero'da görüntüle":"View on Paweero"}: ${typeof window!=="undefined"?`${SITE_URL}${itemPath(lang, "help", detailReport, detailReport.title?.en || detailReport.title)}`:""}`
                } />
                <button className="btn btn-outline btn-full" onClick={() => setDetailReport(null)}>{t.close}</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SITTER DETAIL SHEET */}
      {detailSitter && (
        <div className="sheet-overlay" onClick={() => setDetailS(null)}>
          <div className="sheet" onClick={e => e.stopPropagation()}>
            <div className="sh-handle" />
            <div className="sh-hd"><div className="sh-title">{t.sitterProfile}</div><button className="sh-close" onClick={() => setDetailS(null)}>✕</button></div>
            <div className="sh-body">
              <div style={{ textAlign:"center", marginBottom:16 }}>
                <div style={{ fontSize:48, marginBottom:8 }}>{detailSitter.emoji}</div>
                <div style={{ fontSize:18, fontWeight:700, color:"var(--dark)", marginBottom:2 }}>{detailSitter.name}</div>
                <div style={{ fontSize:12, color:"var(--muted)", marginBottom:6 }}>📍 {detailSitter.area}, {detailSitter.city}</div>
                <div style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:5 }}>
                  <span style={{ color:"var(--amber)", fontSize:13 }}>{"★".repeat(Math.round(detailSitter.rating))}</span>
                  <span style={{ fontSize:13, fontWeight:700 }}>{detailSitter.rating}</span>
                  <span style={{ fontSize:12, color:"var(--muted)" }}>({detailSitter.reviews} {lang==="tr"?"yorum":"reviews"})</span>
                </div>
              </div>
              <div style={{ fontSize:13, color:"var(--muted)", lineHeight:1.7, marginBottom:14 }}>{detailSitter.bio[lang]}</div>
              <div className="svc-wrap" style={{ marginBottom:14 }}>{detailSitter.services[lang].map(sv => <span key={sv} className="svc-tag">{sv}</span>)}</div>
              <div className="rev-sec">
                {[[lang==="tr"?"Ücret":"Price",detailSitter.price[lang]],[lang==="tr"?"Müsaitlik":"Availability",detailSitter.availability[lang]],[lang==="tr"?"Maks. hayvan":"Max pets",`${detailSitter.maxPets}`],[lang==="tr"?"Dış alan":"Outdoor space",detailSitter.hasYard?(lang==="tr"?"Var":"Yes"):(lang==="tr"?"Yok":"No")],[lang==="tr"?"Kabul ediyor":"Accepts",detailSitter.accepts.join(", ")]].map(([k,v]) => (
                  <div key={k} className="rev-row"><span className="rk">{k}</span><span className="rv">{v}</span></div>
                ))}
              </div>
              <div className="d-acts" style={{ marginTop:14 }}>
                <button className="btn btn-dark btn-full" onClick={() => {
                  if (detailSitter.contact_pref === "phone" && detailSitter.contact_phone) {
                    window.location.href = `tel:${detailSitter.contact_phone}`;
                  } else if (detailSitter.contact_email) {
                    window.location.href = `mailto:${detailSitter.contact_email}?subject=${lang==="tr"?"Rezervasyon İsteği":"Booking Request"} - ${detailSitter.name}`;
                  } else {
                    setDetailS(null); say(`📨 ${t.bookingRequestSent} ${detailSitter.name}!`);
                  }
                }}>{t.sendRequest}</button>
                <button className="btn btn-outline btn-full" onClick={() => setDetailS(null)}>{t.close}</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAKE ACTION SHEET — unified Foster / Help / Sighting / Claim, multi-select, one submission */}
      {takeActionFor && (
        <TakeActionSheet animal={takeActionFor} lang={lang} t={t} onClose={() => setTakeActionFor(null)} />
      )}

      {/* ADOPT APPLICATION SHEET — dedicated full 5-step screening process, kept separate
          because adoption warrants a more thorough application than a quick action. */}
      {applyFor && (
        <AppSheet animal={applyFor} mode="adopt" lang={lang} t={t} onClose={() => setApplyFor(null)} />
      )}

      {/* ETA PICKER SHEET */}
      {etaFor && (
        <div className="sheet-overlay" onClick={() => setEtaFor(null)}>
          <div className="sheet" onClick={e => e.stopPropagation()}>
            <div className="sh-handle" />
            <div className="sh-hd">
              <div className="sh-title">{t.iCanHelpSheet}</div>
              <button className="sh-close" onClick={() => setEtaFor(null)}>✕</button>
            </div>
            <div className="sh-body">
              <div style={{ fontSize:13, fontWeight:600, color:"var(--dark)", marginBottom:4 }}>{etaFor.emoji} {etaFor.title[lang]||etaFor.title}</div>
              <div style={{ fontSize:11, color:"var(--muted)", marginBottom:18 }}>📍 {etaFor.location}</div>
              <div style={{ fontSize:13, color:"var(--muted)", marginBottom:16, lineHeight:1.6 }}>{t.chooseEta}</div>
              <div className="eta-grid">
                {ETA_OPTIONS.map(opt => (
                  <button key={opt.label} className="eta-btn" onClick={() => requireContact(async (contact) => {
                    const { error } = await (await getDb()).from("volunteers").insert([{
                      report_id: etaFor.id,
                      name: contact.email,
                      eta: opt.label,
                      eta_order: opt.order,
                    }]);
                    if (!error) {
                      // ── Rapor sahibine gönüllü bildirimi gönder (notify-owner Edge Function) ──
                      // Bir gönüllü yardıma geldiğinde ihbarı açan kişiye e-posta gider.
                      try {
                        const reporterEmail = (etaFor.reporter && /\S+@\S+\.\S+/.test(etaFor.reporter))
                          ? etaFor.reporter
                          : null;
                        const notifyPayload = {
                          ownerEmail:     reporterEmail,   // notify-owner bu alanı alıcı olarak kullanır
                          reporterEmail:  reporterEmail,
                          lang:           lang,
                          mode:           "volunteer",
                          animalName:     etaFor.title?.[lang] || etaFor.title || "",
                          reportTitle:    etaFor.title?.[lang] || etaFor.title || "",
                          reportLocation: etaFor.location || "",
                          volunteerEmail: contact.email,
                          volunteerPhone: contact.phone || "",
                          eta:            lang==="tr" ? (opt.labelTR || opt.label) : opt.label,
                        };
                        console.log("[notify-owner][volunteer] Gönderilen bildirim yükü:", notifyPayload);
                        if (reporterEmail) {
                          const { data: vData, error: vErr } = await (await getDb()).functions.invoke("notify-owner", { body: notifyPayload });
                          if (vErr) {
                            console.error("[notify-owner][volunteer] Bildirim HATASI:", vErr);
                          } else {
                            console.log("[notify-owner][volunteer] Bildirim başarıyla gönderildi:", vData);
                          }
                        } else {
                          console.warn("[notify-owner][volunteer] Rapor sahibinin geçerli e-postası yok, bildirim atlandı.");
                        }
                      } catch (err) {
                        console.error("[notify-owner][volunteer] Bildirim gönderilemedi (exception):", err);
                      }
                      setEtaFor(null);
                      say("✓ " + (lang==="tr" ? opt.labelTR : opt.label));
                      // Straight into the contact drawer — a volunteer who just committed
                      // to an ETA should be able to reach the reporter immediately.
                      setContactDrawerFor({
                        title: etaFor.title?.[lang] || etaFor.title || "",
                        location: etaFor.location || "",
                        reporterEmail: etaFor.reporter || "",
                        reporterPhone: etaFor.reporterPhone || "",
                        reporterPref: etaFor.reporterPref || "email",
                        eta: lang==="tr" ? opt.labelTR : opt.label,
                      });
                      await loadFromDB();
                    } else {
                      setEtaFor(null);
                      say(lang==="tr"?"Hata oluştu":"Error occurred");
                    }
                  })}>
                    <div className="eta-icon">{opt.icon}</div>
                    <div>
                      <div className="eta-label">{lang==="tr" ? opt.labelTR : opt.label}</div>
                      <div className="eta-sub">{lang==="tr" ? opt.subTR : opt.sub}</div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CONTACT DRAWER — opens automatically right after a volunteer confirms an ETA,
          so they can immediately reach the person who reported the animal. */}
      {contactDrawerFor && (
        <div className="sheet-overlay" onClick={() => setContactDrawerFor(null)}>
          <div className="sheet" onClick={e => e.stopPropagation()}>
            <div className="sh-handle" />
            <div className="sh-hd">
              <div className="sh-title">{lang==="tr"?"İhbar Sahibiyle İletişime Geç":"Contact the Reporter"}</div>
              <button className="sh-close" onClick={() => setContactDrawerFor(null)}>✕</button>
            </div>
            <div className="sh-body">
              <div className="info-pill">✓ {contactDrawerFor.eta}</div>
              <div style={{ fontSize:14, fontWeight:600, color:"var(--dark)", marginBottom:4 }}>{contactDrawerFor.title}</div>
              <div style={{ fontSize:12, color:"var(--muted)", marginBottom:20 }}>📍 {contactDrawerFor.location}</div>
              <div style={{ fontSize:13, color:"var(--muted)", marginBottom:16, lineHeight:1.6 }}>
                {lang==="tr"
                  ? "Yola çıkmadan önce ihbar sahibine haber vermek ister misin? Konum detayı veya hayvanın son durumu hakkında bilgi alabilirsin."
                  : "Want to give the reporter a heads-up before you head out? You can confirm the exact location or get the latest on the animal's condition."}
              </div>
              <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
                {contactDrawerFor.reporterPhone && (
                  <button className="btn btn-dark btn-full" onClick={() => { window.location.href = `tel:${contactDrawerFor.reporterPhone}`; }}>
                    📞 {lang==="tr"?"Ara":"Call"} {contactDrawerFor.reporterPhone}
                  </button>
                )}
                {contactDrawerFor.reporterEmail && contactDrawerFor.reporterEmail.includes("@") && (
                  <button className="btn btn-outline btn-full" onClick={() => { window.location.href = `mailto:${contactDrawerFor.reporterEmail}?subject=${encodeURIComponent((lang==="tr"?"Yardım geliyorum: ":"Help is on the way: ") + contactDrawerFor.title)}`; }}>
                    ✉️ {lang==="tr"?"E-posta Gönder":"Send Email"}
                  </button>
                )}
                {!contactDrawerFor.reporterPhone && !(contactDrawerFor.reporterEmail && contactDrawerFor.reporterEmail.includes("@")) && (
                  <div style={{ fontSize:12, color:"var(--muted)", textAlign:"center", padding:"12px 0" }}>
                    {lang==="tr" ? "İhbar sahibi için iletişim bilgisi bulunamadı." : "No contact details available for this reporter."}
                  </div>
                )}
                <button className="btn btn-outline btn-full" onClick={() => setContactDrawerFor(null)}>{t.close}</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* HELPED PROOF SHEET */}
      {helpedFor && (
        <div className="sheet-overlay" onClick={() => setHelpedFor(null)}>
          <div className="sheet" onClick={e => e.stopPropagation()}>
            <div className="sh-handle" />
            <div className="sh-hd">
              <div className="sh-title">{t.markAsHelped}</div>
              <button className="sh-close" onClick={() => setHelpedFor(null)}>✕</button>
            </div>
            <div className="sh-body">
              <div style={{ fontSize:15, fontWeight:600, color:"var(--dark)", marginBottom:6 }}>{helpedFor.emoji} {helpedFor.title[lang]||helpedFor.title}</div>
              <div style={{ fontSize:12, color:"var(--muted)", marginBottom:16 }}>📍 {helpedFor.location}</div>
              <div className="helped-note">
                <strong>{t.proofRequired}</strong> {t.proofNote}
              </div>
              {helpProof ? (
                <>
                  <div className="photo-prev" style={{ marginBottom:10 }}>
                    <img src={helpProof} alt={lang==="tr"?"Yüklenen yardım kanıtı önizlemesi":"Uploaded proof preview"} style={{width:"100%",height:"100%",objectFit:"cover",borderRadius:8}} />
                  </div>
                  <div style={{ fontSize:12, color:"var(--green)", fontWeight:600, marginBottom:16 }}>{t.photoUploaded}</div>
                  <button className="btn btn-dark btn-full" style={{ marginBottom:8 }} onClick={async () => {
                    const { error } = await (await getDb()).from("reports").update({ status:"helped", photo_url: helpProof }).eq("id", helpedFor.id);
                    setHelpedFor(null); setHelpProof(null);
                    if (!error) {
                      say("✓ " + (lang==="tr"?"Yardım edildi olarak işaretlendi":"Marked as helped — thank you!"));
                      await loadFromDB();
                    } else {
                      say(lang==="tr"?"Hata oluştu":"Error occurred");
                    }
                  }}>{t.confirmHelped}</button>
                  <button className="btn btn-outline btn-full" onClick={() => setHelpProof(null)}>{t.replacePhoto}</button>
                </>
              ) : (
                <>
                  <div className="photo-drop" onClick={() => helpProofRef.current.click()}>
                    <div style={{ fontSize:26, marginBottom:6 }}>📷</div>
                    <div style={{ fontSize:13, fontWeight:600, color:"var(--dark)", marginBottom:3 }}>{t.uploadProof}</div>
                    <div style={{ fontSize:11, color:"var(--muted)" }}>{t.proofHint}</div>
                  </div>
                  <input ref={helpProofRef} type="file" accept="image/*" style={{ display:"none" }} onChange={async e => {
                    const file = e.target.files[0];
                    if (!file) return;
                    say(lang==="tr"?"Yükleniyor...":"Uploading...");
                    const result = await uploadPhoto(file, "proofs");
                    if (result.error === "inappropriate" || result.error === "not_animal") { alert(photoErrorMsg(result.error, lang)); return; }
                    if (result.error) { say("Upload failed"); return; }
                    setHelpProof(result.url);
                  }} />
                  <div style={{ fontSize:11, color:"var(--muted)", textAlign:"center", marginTop:14 }}>{t.noPhotoNoHelp}</div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      <div className={`toast ${toast.show ? "show" : ""}`}>{toast.msg}</div>
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// COMPONENTS
// ─────────────────────────────────────────────────────────────────────────────

function MiniCard({ a, lang, onClick }) {
  return (
    <div className="mini-card" onClick={onClick}>
      <div style={{ height:126, background:"var(--off)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:44, position:"relative", overflow:"hidden" }}>
        {a.photo_url
          ? <img src={a.photo_url} alt={[a.name, a.breed?.[lang], a.city].filter(Boolean).join(", ")} loading="lazy" style={{ width:"100%", height:"100%", objectFit:"cover" }} />
          : <img src={FALLBACK_IMAGE} alt="" aria-hidden="true" loading="lazy" style={{ width:"50%", height:"50%", objectFit:"contain", opacity:0.5 }} />
        }
      </div>
      <div style={{ padding:"8px 10px" }}>
        <div style={{ fontSize:12, fontWeight:600, color:"var(--dark)", marginBottom:1 }}>{a.name}</div>
        <div style={{ fontSize:10, color:"var(--muted)", marginBottom:2 }}>{a.species[lang]} · {a.age[lang]}</div>
        <div style={{ fontSize:10, color:"var(--muted)" }}>📍 {a.city}</div>
      </div>
    </div>
  );
}

function ACard({ a, mode, lang, onClick }) {
  const metaParts = [a.breed?.[lang], a.age?.[lang], a.gender?.[lang]].filter(Boolean);
  return (
    <div className="acard" onClick={onClick}>
      <div className="acard-img" style={{ overflow:"hidden" }}>
        {a.photo_url
          ? <img src={a.photo_url} alt={[a.name, a.breed?.[lang], a.city].filter(Boolean).join(", ")} loading="lazy" style={{ width:"100%", height:"100%", objectFit:"cover" }} />
          : <img src={FALLBACK_IMAGE} alt="" aria-hidden="true" loading="lazy" style={{ width:"56%", height:"56%", objectFit:"contain", opacity:0.5 }} />
        }
        {a.species?.[lang] && <span className="abadge ab-sp">{a.species[lang]}</span>}
        {mode === "foster"  && <span className="abadge ab-fo">{lang==="tr"?"Geçici":"Foster"}</span>}
      </div>
      <div className="acard-body">
        <div className="acard-name">{a.name}</div>
        {metaParts.length > 0 && <div className="acard-meta">{metaParts.join(" · ")}</div>}
        <div className="tags" style={{ marginBottom:5 }}>
          {[
            a.isLost    && { label: lang==="tr"?"Kayıp":"Lost",           cls:"purpose-lost" },
            a.isFound   && { label: lang==="tr"?"Bulunan":"Found",        cls:"purpose-found" },
            a.needsHelp && { label: lang==="tr"?"Yardım Gerekiyor":"Needs Help", cls:"purpose-help" },
            a.canFoster && { label: lang==="tr"?"Geçici Bakım":"Foster",  cls:"purpose-foster" },
            a.canAdopt  && { label: lang==="tr"?"Sahiplenilebilir":"Adoptable", cls:"purpose-adopt" },
          ].filter(Boolean).map(p => <span key={p.cls} className={`purpose-badge ${p.cls}`}>{p.label}</span>)}
        </div>
        {a.tags?.[lang]?.length > 0 && <div className="tags">{a.tags[lang].slice(0,2).map(tg => <span key={tg} className="tag">{tg}</span>)}</div>}
        <div className="acard-foot">
          <span className="acard-loc">📍 {[a.city, a.province].filter(Boolean).join(", ")}</span>
          <div style={{ display:"flex", alignItems:"center", gap:8 }}>
            <WhatsAppShareButton lang={lang} text={
              `🐾 ${a.name}${metaParts.length ? " — " + metaParts.join(" · ") : ""}\n` +
              `📍 ${[a.city, a.province].filter(Boolean).join(", ")}\n` +
              `${a.desc?.[lang] || ""}\n\n` +
              `${lang==="tr"?"Paweero'da görüntüle":"View on Paweero"}: ${typeof window!=="undefined"?`${SITE_URL}${itemPath(lang, "animals", a, a.name)}`:""}`
            } />
            <span style={{ fontSize:11, fontWeight:600, color:"var(--muted)" }}>{lang==="tr"?"Gör →":"View →"}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── TAKE ACTION SHEET ────────────────────────────────────────────────────
// Replaces the old "pick one path" Adopt/Foster flow. A single listing can
// serve Adopt + Foster + Help at once, and a person can register interest in
// any combination of them in one submission — each becomes its own record
// downstream (Adoption Interest / Foster Interest / Help Offer), all linked
// back to the same listing.
function TakeActionSheet({ animal, lang, t, onClose }) {
  // Adopt is intentionally excluded here — it now has its own dedicated,
  // full 5-step screening flow (AdoptAppSheet), separate from this
  // condensed multi-select sheet for Foster / Help / Sighting / Claim.
  const availablePurposes = {
    adopt: false,
    foster: !!animal.canFoster,
    help: !!animal.needsHelp,
    sighting: !!animal.isLost,
    claim: !!animal.isFound,
  };

  const [purposes, setPurposes] = useState({ adopt:false, foster:false, help:false, sighting:false, claim:false });
  const togglePurpose = (key) => setPurposes(p => ({ ...p, [key]: !p[key] }));

  const [form, setForm] = useState({
    firstName:"", lastName:"", email:"", phone:"",
    // adopt-specific (condensed)
    homeType:"", ownRent:"", hasYard:"", hasChildren:"", whyAdopt:"",
    // foster-specific
    availableFrom:"", fosterDuration:"", canProvideCare:"", fosterNotes:"",
    // help-specific
    helpType:"", helpAvailability:"", helpMessage:"",
    // sighting-specific (lost animal spotted)
    sightingLocation:"", sightingWhen:"", sightingMessage:"",
    // claim-specific (found animal — this might be my pet)
    claimMessage:"",
    agree:false,
  });
  const set = (k,v) => setForm(f => ({ ...f, [k]:v }));

  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [refCode] = useState(genRef);

  const req = lang==="tr" ? "Zorunlu" : "Required";
  const sel = lang==="tr" ? "Lütfen seçin" : "Please select";
  const E = (k) => errors[k] ? <div className="err">{errors[k]}</div> : null;

  const Opt = ({ name, value, label, hint, checked, onChange }) => (
    <label className={`opt-item ${checked===value?"on":""}`}>
      <input type="radio" checked={checked===value} onChange={onChange} />
      <div><div className="opt-label">{label}</div>{hint&&<div className="opt-hint">{hint}</div>}</div>
    </label>
  );

  const validate = () => {
    const e = {};
    const anyPurpose = purposes.adopt || purposes.foster || purposes.help || purposes.sighting || purposes.claim;
    if (!anyPurpose) { e._purpose = t.selectAtLeastOnePurpose; return e; }
    if (!form.firstName.trim()) e.firstName = req;
    if (!form.lastName.trim())  e.lastName  = req;
    if (!form.email.includes("@")) e.email = (lang==="tr"?"Geçerli e-posta girin":"Valid email required");
    if (!form.phone.trim())     e.phone    = req;
    if (purposes.adopt) {
      if (!form.homeType) e.homeType = sel;
      if (!form.ownRent)  e.ownRent  = sel;
      if (!form.hasYard)  e.hasYard  = sel;
      if (!form.whyAdopt.trim()) e.whyAdopt = req;
    }
    if (purposes.foster) {
      if (!form.availableFrom.trim()) e.availableFrom = req;
      if (!form.canProvideCare) e.canProvideCare = sel;
    }
    if (purposes.help) {
      if (!form.helpType) e.helpType = sel;
    }
    if (purposes.sighting) {
      if (!form.sightingLocation.trim()) e.sightingLocation = req;
    }
    if (!form.agree) e.agree = req;
    return e;
  };

  const submit = async () => {
    const e = validate();
    if (Object.keys(e).length) { setErrors(e); return; }
    setErrors({});
    setSubmitting(true);

    const selectedTypes = [];
    if (purposes.adopt)    selectedTypes.push("adopt");
    if (purposes.foster)   selectedTypes.push("foster");
    if (purposes.help)     selectedTypes.push("help_offer");
    if (purposes.sighting) selectedTypes.push("sighting");
    if (purposes.claim)    selectedTypes.push("claim");

    try {
      // One independent record per selected purpose — not squashed into a single field.
      for (const type of selectedTypes) {
        const base = {
          ref_code: refCode,
          mode: type,
          animal_id: animal.id,
          animal_name: animal.name,
          listing_owner_email: animal.submitter_email,
          first_name: form.firstName, last_name: form.lastName,
          applicant_email: form.email, phone: form.phone,
          status: "pending",
        };
        const extra =
          type === "adopt" ? {
            home_type: form.homeType, own_rent: form.ownRent, has_yard: form.hasYard,
            has_children: form.hasChildren, why_adopt: form.whyAdopt,
          } :
          type === "foster" ? {
            long_term_plan: form.availableFrom + (form.fosterDuration ? ` (${form.fosterDuration})` : ""),
            had_pets_before: form.canProvideCare, why_adopt: form.fosterNotes,
          } :
          type === "sighting" ? {
            why_adopt: `${lang==="tr"?"Görülen konum":"Seen at"}: ${form.sightingLocation}${form.sightingWhen ? " · " + form.sightingWhen : ""}${form.sightingMessage ? "\n" + form.sightingMessage : ""}`,
          } :
          type === "claim" ? {
            why_adopt: form.claimMessage || "",
          } :
          { // help_offer
            why_adopt: `${form.helpType}${form.helpAvailability ? " · " + form.helpAvailability : ""}${form.helpMessage ? "\n" + form.helpMessage : ""}`,
          };
        await (await getDb()).from("applications").insert([{ ...base, ...extra }]);
      }

      // Single combined notification to the poster listing everything that was selected.
      await (await getDb()).functions.invoke("notify-owner", {
        body: {
          mode: "multi_action",
          purposes: selectedTypes,
          ownerEmail: animal.submitter_email,
          lang, animalName: animal.name, refCode,
          applicantName: `${form.firstName} ${form.lastName}`,
          applicantEmail: form.email, applicantPhone: form.phone,
          homeType: form.homeType, ownRent: form.ownRent, hasYard: form.hasYard,
          hasChildren: form.hasChildren, whyAdopt: form.whyAdopt,
          availableFrom: form.availableFrom, fosterDuration: form.fosterDuration,
          canProvideCare: form.canProvideCare, fosterNotes: form.fosterNotes,
          helpType: form.helpType, helpAvailability: form.helpAvailability, helpMessage: form.helpMessage,
          sightingLocation: form.sightingLocation, sightingWhen: form.sightingWhen, sightingMessage: form.sightingMessage,
          claimMessage: form.claimMessage,
        },
      });
    } catch (err) {
      console.error("Take Action gönderilemedi:", err);
    }

    setSubmitting(false);
    setSubmitted(true);
  };

  const purposeLabel = { adopt: t.purposeAdopt, foster: t.purposeFoster, help: t.purposeHelp, sighting: (lang==="tr"?"Gördüm":"I Saw This Animal"), claim: (lang==="tr"?"Benim Hayvanım Olabilir":"This Might Be My Pet") };

  return (
    <div className="sheet-overlay" onClick={onClose}>
      <div className="sheet" onClick={e=>e.stopPropagation()}>
        <div className="sh-handle" />
        <div className="sh-hd">
          <div className="sh-title">{getSingleActionLabel(animal, lang) || t.takeAction}</div>
          <button className="sh-close" onClick={onClose}>✕</button>
        </div>

        {!submitted ? <>
          <div className="app-strip">
            <div className="app-strip-emoji">{animal.emoji}</div>
            <div>
              <div className="app-strip-name">{animal.name}</div>
              <div className="app-strip-meta">{animal.breed?.[lang] || ""} · {animal.city}, {animal.province}</div>
            </div>
          </div>

          <div className="sh-body">
            <div style={{ fontSize:13, color:"var(--muted)", marginBottom:6 }}>
              {t.takeActionSub_pre} <strong style={{ color:"var(--dark)" }}>{animal.name}</strong>?
            </div>
            <div style={{ fontSize:11.5, color:"var(--muted)", marginBottom:14 }}>{t.takeActionSelectPurpose}</div>

            {/* Purpose multi-select — only purposes this listing actually supports are shown */}
            <div style={{ display:"flex", gap:8, flexWrap:"wrap", marginBottom:8 }}>
              {["sighting","claim","adopt","foster","help"].filter(k => availablePurposes[k]).map(k => {
                const icon = { sighting:"🔍", claim:"📍", adopt:"🏡", foster:"🤝", help:"🚨" }[k];
                return (
                  <label key={k} className={`opt-item ${purposes[k]?"on":""}`} style={{ flex:"1 1 140px" }}>
                    <input type="checkbox" checked={purposes[k]} onChange={() => togglePurpose(k)} />
                    <div className="pc-icon" style={{ width:38, height:38, fontSize:18, marginRight:2 }}>{icon}</div>
                    <div>
                      <div className="opt-label">{purposeLabel[k]}</div>
                      <div className="opt-hint">{k==="adopt"?t.purposeAdoptDesc:k==="foster"?t.purposeFosterDesc:k==="help"?t.purposeHelpDesc:k==="sighting"?(lang==="tr"?"Bu hayvanı bir yerde gördün":"You spotted this animal somewhere"):(lang==="tr"?"Bu hayvanın sahibi olabilirsin":"You might be the owner")}</div>
                    </div>
                  </label>
                );
              })}
            </div>
            {errors._purpose && <div className="err">{errors._purpose}</div>}

            {(purposes.adopt || purposes.foster || purposes.help || purposes.sighting || purposes.claim) && <>
              <div className="divider" />

              {/* Contact — asked once, shared across every selected purpose */}
              <div style={{ fontSize:13, fontWeight:600, marginBottom:10 }}>{t.taContactTitle}</div>
              <div className="frow">
                <div className="fg">
                  <label className="flabel">{t.firstName}</label>
                  <input className="fi" placeholder={lang==="tr"?"Zeynep":"Jane"} value={form.firstName} onChange={e=>set("firstName",e.target.value)} />
                  {E("firstName")}
                </div>
                <div className="fg">
                  <label className="flabel">{t.lastName}</label>
                  <input className="fi" placeholder={lang==="tr"?"Yılmaz":"Mwangi"} value={form.lastName} onChange={e=>set("lastName",e.target.value)} />
                  {E("lastName")}
                </div>
              </div>
              <div className="fg">
                <label className="flabel">{t.email}</label>
                <input className="fi" type="email" placeholder="ornek@email.com" value={form.email} onChange={e=>set("email",e.target.value)} />
                {E("email")}
              </div>
              <div className="fg">
                <label className="flabel">{t.phoneField}</label>
                <input className="fi" placeholder={phoneHint(FORM_COUNTRY, FORM_PROVINCE)} value={form.phone} onChange={e=>set("phone",e.target.value)} />
                {E("phone")}
              </div>

              {/* Adopt block — condensed screening */}
              {purposes.adopt && <>
                <div className="divider" />
                <div style={{ fontSize:13, fontWeight:600, marginBottom:10, color:"var(--amber)" }}>🏠 {t.taAdoptSection}</div>
                <div className="fg"><label className="flabel">{t.homeType}</label>
                  <div className="opt-group">
                    <Opt checked={form.homeType} value="apartment" label={t.apartment} hint={t.apartmentHint} onChange={()=>set("homeType","apartment")} />
                    <Opt checked={form.homeType} value="house" label={t.house} hint={t.houseHint} onChange={()=>set("homeType","house")} />
                    <Opt checked={form.homeType} value="farmhouse" label={t.farmhouse} onChange={()=>set("homeType","farmhouse")} />
                  </div>{E("homeType")}
                </div>
                <div className="fg"><label className="flabel">{t.ownRentQ}</label>
                  <div className="opt-group">
                    <Opt checked={form.ownRent} value="own" label={t.own} onChange={()=>set("ownRent","own")} />
                    <Opt checked={form.ownRent} value="rent" label={t.rent} hint={t.rentHint} onChange={()=>set("ownRent","rent")} />
                  </div>{E("ownRent")}
                </div>
                <div className="fg"><label className="flabel">{t.outdoorQ}</label>
                  <div className="opt-group">
                    <Opt checked={form.hasYard} value="yes_fenced" label={t.fenced} onChange={()=>set("hasYard","yes_fenced")} />
                    <Opt checked={form.hasYard} value="yes_unfenced" label={t.unfenced} onChange={()=>set("hasYard","yes_unfenced")} />
                    <Opt checked={form.hasYard} value="no" label={t.noOutdoor} onChange={()=>set("hasYard","no")} />
                  </div>{E("hasYard")}
                </div>
                <div className="fg"><label className="flabel">{t.childrenQ}</label>
                  <div className="opt-group">
                    <Opt checked={form.hasChildren} value="no" label={t.noChildren} onChange={()=>set("hasChildren","no")} />
                    <Opt checked={form.hasChildren} value="yes" label={t.yesLive} onChange={()=>set("hasChildren","yes")} />
                  </div>
                </div>
                <div className="fg"><label className="flabel">{t.whyAdopt_adopt} {animal.name}?</label>
                  <textarea className="fta" placeholder={t.whyPlaceholder} value={form.whyAdopt} onChange={e=>set("whyAdopt",e.target.value)} />
                  {E("whyAdopt")}
                </div>
              </>}

              {/* Foster block */}
              {purposes.foster && <>
                <div className="divider" />
                <div style={{ fontSize:13, fontWeight:600, marginBottom:10, color:"var(--green)" }}>🛏️ {t.taFosterSection}</div>
                <div className="frow">
                  <div className="fg">
                    <label className="flabel">{lang==="tr"?"Ne Zaman Başlayabilirsin? *":"Available From *"}</label>
                    <input className="fi" placeholder={lang==="tr"?"örn. Hemen":"e.g. Immediately"} value={form.availableFrom} onChange={e=>set("availableFrom",e.target.value)} />
                    {E("availableFrom")}
                  </div>
                  <div className="fg">
                    <label className="flabel">{lang==="tr"?"Süre":"Duration"}</label>
                    <input className="fi" placeholder={lang==="tr"?"örn. 2–4 hafta":"e.g. 2–4 weeks"} value={form.fosterDuration} onChange={e=>set("fosterDuration",e.target.value)} />
                  </div>
                </div>
                <div className="fg"><label className="flabel">{lang==="tr"?"Bakım Verebilir misin? *":"Can You Provide Care? *"}</label>
                  <div className="opt-group">
                    <Opt checked={form.canProvideCare} value="yes" label={lang==="tr"?"Evet, uygun alanım var":"Yes, I have a suitable space"} onChange={()=>set("canProvideCare","yes")} />
                    <Opt checked={form.canProvideCare} value="not_sure" label={lang==="tr"?"Emin değilim":"Not sure — let's discuss"} onChange={()=>set("canProvideCare","not_sure")} />
                  </div>{E("canProvideCare")}
                </div>
                <div className="fg"><label className="flabel">{lang==="tr"?"Not (opsiyonel)":"Notes (optional)"}</label>
                  <textarea className="fta" style={{minHeight:60}} value={form.fosterNotes} onChange={e=>set("fosterNotes",e.target.value)} />
                </div>
              </>}

              {/* Help block */}
              {purposes.help && <>
                <div className="divider" />
                <div style={{ fontSize:13, fontWeight:600, marginBottom:10, color:"var(--red)" }}>🆘 {t.taHelpSection}</div>
                <div className="fg"><label className="flabel">{t.helpTypeQ}</label>
                  <select className="fs" value={form.helpType} onChange={e=>set("helpType",e.target.value)}>
                    <option value="">{sel}</option>
                    <option value="financial">{t.helpTypeFinancial}</option>
                    <option value="transport">{t.helpTypeTransport}</option>
                    <option value="shelter">{t.helpTypeShelter}</option>
                    <option value="medical">{t.helpTypeMedical}</option>
                    <option value="supplies">{t.helpTypeSupplies}</option>
                    <option value="other">{t.helpTypeOther}</option>
                  </select>
                  {E("helpType")}
                </div>
                <div className="fg"><label className="flabel">{t.helpAvailability}</label>
                  <input className="fi" placeholder={t.helpAvailabilityPh} value={form.helpAvailability} onChange={e=>set("helpAvailability",e.target.value)} />
                </div>
                <div className="fg"><label className="flabel">{t.helpMessage}</label>
                  <textarea className="fta" style={{minHeight:60}} placeholder={t.helpMessagePh} value={form.helpMessage} onChange={e=>set("helpMessage",e.target.value)} />
                </div>
              </>}

              {/* Sighting block — shown when reporting a sighting of a lost animal */}
              {purposes.sighting && <>
                <div className="divider" />
                <div style={{ fontSize:13, fontWeight:600, marginBottom:10, color:"var(--red)" }}>🔴 {lang==="tr"?"Görülme Bilgisi":"Sighting Details"}</div>
                <div className="fg"><label className="flabel">{lang==="tr"?"Nerede Gördün? *":"Where Did You See It? *"}</label>
                  <input className="fi" placeholder={lang==="tr"?"örn. Bağdat Caddesi, Kadıköy":"e.g. Bağdat Avenue, Kadıköy"} value={form.sightingLocation} onChange={e=>set("sightingLocation",e.target.value)} />
                  {E("sightingLocation")}
                </div>
                <div className="fg"><label className="flabel">{lang==="tr"?"Ne Zaman?":"When?"}</label>
                  <input className="fi" placeholder={lang==="tr"?"örn. Bugün öğleden sonra":"e.g. This afternoon"} value={form.sightingWhen} onChange={e=>set("sightingWhen",e.target.value)} />
                </div>
                <div className="fg"><label className="flabel">{lang==="tr"?"Ek Bilgi":"Additional Info"}</label>
                  <textarea className="fta" style={{minHeight:60}} placeholder={lang==="tr"?"Hayvanın durumu, hangi yöne gittiği…":"Animal's condition, which direction it went…"} value={form.sightingMessage} onChange={e=>set("sightingMessage",e.target.value)} />
                </div>
              </>}

              {/* Claim block — shown when someone thinks a found animal is theirs */}
              {purposes.claim && <>
                <div className="divider" />
                <div style={{ fontSize:13, fontWeight:600, marginBottom:10, color:"var(--green)" }}>📍 {lang==="tr"?"Sahiplik Bilgisi":"Ownership Details"}</div>
                <div className="fg"><label className="flabel">{lang==="tr"?"Bu hayvanın senin olduğunu düşünüyorsan, ayırt edici özelliklerini anlat":"If you believe this is your pet, describe identifying details"}</label>
                  <textarea className="fta" style={{minHeight:70}} placeholder={lang==="tr"?"örn. Tasmasındaki künye, doğum lekesi, davranışı…":"e.g. Collar tag details, birthmark, behaviour…"} value={form.claimMessage} onChange={e=>set("claimMessage",e.target.value)} />
                </div>
              </>}

              <div className="divider" />
              <div className="fg">
                <label style={{display:"flex",alignItems:"flex-start",gap:10,cursor:"pointer"}}>
                  <input type="checkbox" style={{marginTop:3,accentColor:"var(--dark)",width:15,height:15,flexShrink:0}} checked={form.agree} onChange={e=>set("agree",e.target.checked)} />
                  <span style={{fontSize:12,color:"var(--muted)",lineHeight:1.6}}>{t.declaration}</span>
                </label>
                {E("agree")}
              </div>
            </>}
          </div>

          <div className="sh-foot">
            <span className="step-count">
              {[purposes.sighting&&purposeLabel.sighting, purposes.claim&&purposeLabel.claim, purposes.adopt&&t.purposeAdopt, purposes.foster&&t.purposeFoster, purposes.help&&t.purposeHelp].filter(Boolean).join(" + ") || "—"}
            </span>
            <button className="btn btn-dark btn-sm" onClick={submit} disabled={submitting}>
              {submitting ? t.taSubmitting : t.taSubmit}
            </button>
          </div>
        </> : (
          <div className="sh-body">
            <div className="success">
              <div className="suc-i">✓</div>
              <div className="suc-t">{t.taSuccessTitle}</div>
              <div className="suc-d">{t.taSuccessDesc}</div>
              <div className="suc-ref"><div className="suc-ref-l">{t.refLabel}</div><div className="suc-ref-c">{refCode}</div></div>
              <div style={{ fontSize:12, color:"var(--muted)", marginBottom:18 }}>
                {t.taSuccessFor}{" "}
                <strong style={{ color:"var(--dark)" }}>
                  {[purposes.sighting&&purposeLabel.sighting, purposes.claim&&purposeLabel.claim, purposes.adopt&&t.purposeAdopt, purposes.foster&&t.purposeFoster, purposes.help&&t.purposeHelp].filter(Boolean).join(" · ")}
                </strong>
              </div>
              <button className="btn btn-dark btn-full" style={{maxWidth:240,margin:"0 auto"}} onClick={onClose}>{t.done}</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function AppSheet({ animal, mode, lang, t, onClose }) {
  if (mode === "foster") {
    return <FosterAppSheet animal={animal} lang={lang} t={t} onClose={onClose} />;
  }
  return <AdoptAppSheet animal={animal} mode={mode} lang={lang} t={t} onClose={onClose} />;
}

// ─── ADOPT APPLICATION — full multi-step screening form ─────────────────────
function AdoptAppSheet({ animal, mode, lang, t, onClose }) {
  // ENHANCEMENT: Step 2 validation with error field focus and scrolling
  const [focusFirstError, setFocusFirstError] = useState(false);
  
  const [step, setStep]     = useState(1);
  const [app, setApp]       = useState(EMPTY_APP);
  const [errors, setErr]    = useState({});
  const [submitted, setSub] = useState(false);
  const [refCode]           = useState(genRef);

  const set = (k, v) => setApp(a => ({ ...a, [k]:v }));
  const req = lang==="tr" ? "Zorunlu" : "Required";
  const sel = lang==="tr" ? "Lütfen seçin" : "Please select";

  const validate = (s) => {
    const e = {};
    if(s===1) { if(!app.firstName.trim())e.firstName=req; if(!app.lastName.trim())e.lastName=req; if(!app.email.includes("@"))e.email=(lang==="tr"?"Geçerli e-posta girin":"Valid email required"); if(!app.phone.trim())e.phone=req; if(!app.age.trim())e.age=req; if(!app.occupation.trim())e.occupation=req; }
    if(s===2) { if(!app.homeType)e.homeType=sel; if(!app.ownRent)e.ownRent=sel; if(!app.hasYard)e.hasYard=sel; if(!app.hasChildren)e.hasChildren=sel; if(!app.householdSize.trim())e.householdSize=req; }
    if(s===3) { if(!app.hoursHome)e.hoursHome=sel; if(!app.activityLevel)e.activityLevel=sel; if(!app.travelFreq)e.travelFreq=sel; }
    if(s===4) { if(!app.hadPetsBefore)e.hadPetsBefore=sel; if(!app.whyAdopt.trim())e.whyAdopt=req; if(!app.longTermPlan.trim())e.longTermPlan=req; if(!app.agree)e.agree=req; }
    return e;
  };

  const next = async () => {
    const e=validate(step);
    if(Object.keys(e).length){
      setErr(e);
      setFocusFirstError(true);
      // İlk hatalı alana otomatik kaydır ve odaklan
      setTimeout(() => {
        const sheetEl = document.querySelector(".sheet .sh-body");
        const firstErr = sheetEl ? sheetEl.querySelector(".err") : document.querySelector(".sheet .err");
        if (firstErr) {
          firstErr.scrollIntoView({ behavior: "smooth", block: "center" });
          const group = firstErr.closest(".fg");
          const field = group && group.querySelector("input, textarea, select");
          if (field) { try { field.focus({ preventScroll: true }); } catch { field.focus(); } }
        }
      }, 60);
      return;
    }
    setErr({});
    setFocusFirstError(false);
    if(step<5){ setStep(s=>s+1); return; }
    // Son adım — Supabase'e kaydet
    try {
      await (await getDb()).from("applications").insert([{
        ref_code: refCode,
        mode: mode,
        animal_id: animal.id,
        animal_name: animal.name,
        listing_owner_email: animal.submitter_email,
        first_name: app.firstName, last_name: app.lastName,
        applicant_email: app.email, phone: app.phone,
        age: app.age, occupation: app.occupation,
        home_type: app.homeType, own_rent: app.ownRent,
        has_yard: app.hasYard, has_children: app.hasChildren,
        children_ages: app.childrenAges, household_size: app.householdSize,
        hours_home: app.hoursHome, activity_level: app.activityLevel,
        travel_freq: app.travelFreq, pet_care: app.petCare,
        allergies: app.allergies, had_pets_before: app.hadPetsBefore,
        current_pet_details: app.currentPetDetails, current_pets: app.currentPets,
        vet_reference: app.vetReference, why_adopt: app.whyAdopt,
        long_term_plan: app.longTermPlan, status: "pending",
      }]);
    } catch(err) { console.error("Başvuru kaydedilemedi:", err); }

    // ── E-posta gönder (notify-owner Edge Function) ──
    try {
      // DEBUG LOG: gönderilecek e-posta yükünü konsola yaz
      const emailPayload = {
        ownerEmail:       animal.submitter_email,
        lang:             lang,
        mode:             mode,
        animalName:       animal.name || "",
        refCode:          refCode,
        applicantName:    `${app.firstName} ${app.lastName}`,
        applicantEmail:   app.email,
        applicantPhone:   app.phone,
        age:              app.age,
        occupation:       app.occupation,
        homeType:         app.homeType,
        ownRent:          app.ownRent,
        hasYard:          app.hasYard,
        hasChildren:      app.hasChildren,
        childrenAges:     app.childrenAges,
        householdSize:    app.householdSize,
        hoursHome:        app.hoursHome,
        activityLevel:    app.activityLevel,
        travelFreq:       app.travelFreq,
        petCare:          app.petCare,
        allergies:        app.allergies,
        hadPetsBefore:    app.hadPetsBefore,
        currentPets:      app.currentPets,
        currentPetDetails:app.currentPetDetails,
        vetReference:     app.vetReference,
        whyAdopt:         app.whyAdopt,
        longTermPlan:     app.longTermPlan,
      };
      console.log("[notify-owner] Gönderilen e-posta yükü:", emailPayload);

      const { data: emailData, error: emailError } = await (await getDb()).functions.invoke("notify-owner", {
        body: emailPayload,
      });

      if (emailError) {
        console.error("[notify-owner] E-posta gönderim HATASI:", emailError);
        console.log("[notify-owner] Başarısız olan yük:", emailPayload);
      } else {
        console.log("[notify-owner] E-posta bildirimi başarıyla gönderildi:", emailData);
      }
    } catch(err) {
      console.error("[notify-owner] E-posta gönderilemedi (exception):", err);
    }

    setSub(true);
  };
  const E = (k) => errors[k] ? <div className="err">{errors[k]}</div> : null;
  const Opt = ({ name, value, label, hint }) => (
    <label className={`opt-item ${app[name]===value?"on":""}`}>
      <input type="radio" name={name} checked={app[name]===value} onChange={()=>set(name,value)}/>
      <div><div className="opt-label">{label}</div>{hint&&<div className="opt-hint">{hint}</div>}</div>
    </label>
  );

  const STEPS_T = [{id:1,title:t.personalSection},{id:2,title:t.homeSection},{id:3,title:t.lifestyleSection},{id:4,title:t.experienceSection},{id:5,title:lang==="tr"?"İncele":"Review"}];
  const sheetTitle = mode==="foster" ? t.fosterAppTitle : t.applyTitle;
  const applyingLabel = mode==="foster" ? (lang==="tr"?"Geçici bakım:":"Fostering:") : (lang==="tr"?"Sahiplenme:":"Adopting:");
  const reviewedNote = lang==="tr" ? "3–5 iş günü içinde incelenir" : "Reviewed in 3–5 business days";

  return (
    <div className="sheet-overlay" onClick={onClose}>
      <div className="sheet" onClick={e=>e.stopPropagation()}>
        <div className="sh-handle"/>
        <div className="sh-hd"><div className="sh-title">{sheetTitle}</div><button className="sh-close" onClick={onClose}>✕</button></div>

        {!submitted ? <>
          <div className="app-strip">
            <div className="app-strip-emoji">{animal.emoji}</div>
            <div><div className="app-strip-name">{applyingLabel} {animal.name}</div><div className="app-strip-meta">{animal.breed[lang]} · {animal.city}, {animal.province}</div></div>
            <div className="app-strip-note">{reviewedNote}</div>
          </div>
          <div className="step-bar">
            <div className="step-track">
              {STEPS_T.map((s,i)=>(
                <div key={s.id} style={{display:"flex",alignItems:"center",flex:1}}>
                  <div className={`s-item ${step>s.id?"done click":step===s.id?"active":""}`} style={{flex:"none"}} onClick={()=>step>s.id&&setStep(s.id)}>
                    <div className="s-circle">{step>s.id?"✓":s.id}</div>
                    <div className="s-lbl">{s.title}</div>
                  </div>
                  {i<STEPS_T.length-1&&<div className={`s-line ${step>s.id?"done":""}`}/>}
                </div>
              ))}
            </div>
          </div>
          <div className="sh-body">
            {step===1&&<><div style={{fontSize:15,fontWeight:600,marginBottom:3}}>{t.personalInfo}</div><div style={{fontSize:12,color:"var(--muted)",marginBottom:16}}>{t.personalInfoSub}</div>
              <div className="frow"><div className="fg"><label className="flabel">{t.firstName}</label><input className="fi" placeholder={lang==="tr"?"Zeynep":"Jane"} value={app.firstName} onChange={e=>set("firstName",e.target.value)}/>{E("firstName")}</div><div className="fg"><label className="flabel">{t.lastName}</label><input className="fi" placeholder={lang==="tr"?"Yılmaz":"Mwangi"} value={app.lastName} onChange={e=>set("lastName",e.target.value)}/>{E("lastName")}</div></div>
              <div className="fg"><label className="flabel">{t.email}</label><input className="fi" type="email" placeholder="ornek@email.com" value={app.email} onChange={e=>set("email",e.target.value)}/>{E("email")}</div>
              <div className="fg"><label className="flabel">{t.phoneField}</label><input className="fi" placeholder={phoneHint(FORM_COUNTRY, FORM_PROVINCE)} value={app.phone} onChange={e=>set("phone",e.target.value)}/>{E("phone")}</div>
              <div className="frow"><div className="fg"><label className="flabel">{t.ageField2}</label><input className="fi" placeholder="28" value={app.age} onChange={e=>set("age",e.target.value)}/>{E("age")}</div><div className="fg"><label className="flabel">{t.occupationField}</label><input className="fi" placeholder={lang==="tr"?"Öğretmen":"Teacher"} value={app.occupation} onChange={e=>set("occupation",e.target.value)}/>{E("occupation")}</div></div>
            </>}
            {step===2&&<><div style={{fontSize:15,fontWeight:600,marginBottom:3}}>{t.homeTitle}</div><div style={{fontSize:12,color:"var(--muted)",marginBottom:16}}>{t.homeSub}</div>
              <div className={`fg ${errors.homeType?"has-err":""}`}><label className="flabel">{t.homeType}</label><div className={`opt-group ${errors.homeType?"opt-err":""}`}><Opt name="homeType" value="apartment" label={t.apartment} hint={t.apartmentHint}/><Opt name="homeType" value="house" label={t.house} hint={t.houseHint}/><Opt name="homeType" value="farmhouse" label={t.farmhouse} hint={t.farmhouseHint}/><Opt name="homeType" value="other" label={t.other}/></div>{E("homeType")}</div>
              <div className={`fg ${errors.ownRent?"has-err":""}`}><label className="flabel">{t.ownRentQ}</label><div className={`opt-group ${errors.ownRent?"opt-err":""}`}><Opt name="ownRent" value="own" label={t.own}/><Opt name="ownRent" value="rent" label={t.rent} hint={t.rentHint}/></div>{E("ownRent")}</div>
              <div className={`fg ${errors.hasYard?"has-err":""}`}><label className="flabel">{t.outdoorQ}</label><div className={`opt-group ${errors.hasYard?"opt-err":""}`}><Opt name="hasYard" value="yes_fenced" label={t.fenced}/><Opt name="hasYard" value="yes_unfenced" label={t.unfenced}/><Opt name="hasYard" value="no" label={t.noOutdoor}/></div>{E("hasYard")}</div>
              <div className={`fg ${errors.hasChildren?"has-err":""}`}><label className="flabel">{t.childrenQ}</label><div className={`opt-group ${errors.hasChildren?"opt-err":""}`}><Opt name="hasChildren" value="no" label={t.noChildren}/><Opt name="hasChildren" value="yes" label={t.yesLive}/><Opt name="hasChildren" value="visit" label={t.yesVisit}/></div>{E("hasChildren")}</div>
              {(app.hasChildren==="yes"||app.hasChildren==="visit")&&<div className="fg"><label className="flabel">{t.childAges}</label><input name="childrenAges" className="fi" placeholder={lang==="tr"?"örn. 4, 7, 12":"e.g. 4, 7, 12"} value={app.childrenAges} onChange={e=>set("childrenAges",e.target.value)}/></div>}
              <div className="fg"><label className="flabel">{t.householdSize}</label><input name="householdSize" className={`fi ${errors.householdSize?"fi-err":""}`} placeholder="3" value={app.householdSize} onChange={e=>set("householdSize",e.target.value)}/>{E("householdSize")}</div>
            </>}
            {step===3&&<><div style={{fontSize:15,fontWeight:600,marginBottom:3}}>{t.lifestyleTitle}</div><div style={{fontSize:12,color:"var(--muted)",marginBottom:16}}>{t.lifestyleSub}</div>
              <div className="fg"><label className="flabel">{t.hoursQ}</label><div className="opt-group"><Opt name="hoursHome" value="0-4" label={t.h04} hint={t.h04hint}/><Opt name="hoursHome" value="4-8" label={t.h48} hint={t.h48hint}/><Opt name="hoursHome" value="8-12" label={t.h812} hint={t.h812hint}/><Opt name="hoursHome" value="12+" label={t.h12} hint={t.h12hint}/></div>{E("hoursHome")}</div>
              <div className="fg"><label className="flabel">{t.activityQ}</label><div className="opt-group"><Opt name="activityLevel" value="low" label={t.relaxed} hint={t.relaxedHint}/><Opt name="activityLevel" value="moderate" label={t.moderate} hint={t.moderateHint}/><Opt name="activityLevel" value="high" label={t.veryActive} hint={t.veryActiveHint}/></div>{E("activityLevel")}</div>
              <div className="fg"><label className="flabel">{t.travelQ}</label><div className="opt-group"><Opt name="travelFreq" value="rarely" label={t.rarely}/><Opt name="travelFreq" value="monthly" label={t.monthly}/><Opt name="travelFreq" value="weekly" label={t.weeklyMore}/></div>{E("travelFreq")}</div>
              {app.travelFreq!=="rarely"&&<div className="fg"><label className="flabel">{t.petCareQ}</label><input className="fi" placeholder={t.petCarePlaceholder} value={app.petCare} onChange={e=>set("petCare",e.target.value)}/></div>}
              <div className="fg"><label className="flabel">{t.allergiesQ}</label><input className="fi" placeholder={t.allergiesPlaceholder} value={app.allergies} onChange={e=>set("allergies",e.target.value)}/></div>
            </>}
            {step===4&&<><div style={{fontSize:15,fontWeight:600,marginBottom:3}}>{t.experienceTitle}</div><div style={{fontSize:12,color:"var(--muted)",marginBottom:16}}>{t.experienceSub_adopt} {animal.name}.</div>
              <div className="fg"><label className="flabel">{t.hadPetsQ}</label><div className="opt-group"><Opt name="hadPetsBefore" value="yes_current" label={t.yesCurrent}/><Opt name="hadPetsBefore" value="yes_past" label={t.yesPast}/><Opt name="hadPetsBefore" value="no" label={t.noFirst}/></div>{E("hadPetsBefore")}</div>
              {app.hadPetsBefore==="yes_current"&&<div className="fg"><label className="flabel">{t.currentPetsDesc}</label><textarea className="fta" placeholder={t.currentPetsPlaceholder} value={app.currentPetDetails} onChange={e=>set("currentPetDetails",e.target.value)}/></div>}
              {app.hadPetsBefore==="yes_past"&&<div className="fg"><label className="flabel">{t.pastPetsDesc}</label><textarea className="fta" placeholder={t.pastPetsPlaceholder} value={app.currentPets} onChange={e=>set("currentPets",e.target.value)}/></div>}
              <div className="fg"><label className="flabel">{t.vetRef}</label><input className="fi" placeholder={t.vetPlaceholder} value={app.vetReference} onChange={e=>set("vetReference",e.target.value)}/></div>
              <div className="fg"><label className="flabel">{mode==="foster"?t.whyAdopt_foster:t.whyAdopt_adopt} {animal.name}?</label><textarea className="fta" placeholder={t.whyPlaceholder} value={app.whyAdopt} onChange={e=>set("whyAdopt",e.target.value)}/>{E("whyAdopt")}</div>
              <div className="fg"><label className="flabel">{t.longTermQ}</label><textarea className="fta" placeholder={t.longTermPlaceholder} value={app.longTermPlan} onChange={e=>set("longTermPlan",e.target.value)}/>{E("longTermPlan")}</div>
              <div className="fg"><label style={{display:"flex",alignItems:"flex-start",gap:10,cursor:"pointer"}}>
                <input type="checkbox" style={{marginTop:3,accentColor:"var(--dark)",width:15,height:15,flexShrink:0}} checked={app.agree} onChange={e=>set("agree",e.target.checked)}/>
                <span style={{fontSize:12,color:"var(--muted)",lineHeight:1.6}}>{t.declaration}</span>
              </label>{E("agree")}</div>
            </>}
            {step===5&&<><div style={{fontSize:15,fontWeight:600,marginBottom:3}}>{t.reviewTitle}</div><div style={{fontSize:12,color:"var(--muted)",marginBottom:14}}>{t.reviewSub}</div>
              {[
                {title:t.personalSection,rows:[[t.nameLabel,`${app.firstName} ${app.lastName}`],[t.emailLabel,app.email],[t.phoneLabel,app.phone],[t.ageLabel,app.age],[t.occupationLabel,app.occupation]]},
                {title:t.homeSection,rows:[[t.homeTypeLabel,app.homeType],[t.ownRentLabel,app.ownRent],[t.outdoorLabel,app.hasYard],[t.childrenLabel,app.hasChildren],[t.householdLabel,app.householdSize]]},
                {title:t.lifestyleSection,rows:[[t.hoursLabel,app.hoursHome],[t.activityLabel,app.activityLevel],[t.travelLabel,app.travelFreq]]},
                {title:t.experienceSection,rows:[[t.hadPetsLabel,app.hadPetsBefore],[t.whyLabel,app.whyAdopt?.slice(0,55)+"…"]]},
              ].map(sec=>(
                <div key={sec.title} className="rev-sec"><div className="rev-ttl">{sec.title}</div>{sec.rows.map(([k,v])=><div key={k} className="rev-row"><span className="rk">{k}</span><span className="rv">{v||"—"}</span></div>)}</div>
              ))}
              <div className="inote">{t.confirmNote_pre} <strong>{app.email}</strong>. {t.confirmNote_post}</div>
            </>}
          </div>
          <div className="sh-foot">
            <span className="step-count">{lang==="tr"?`${step}. adım / ${STEPS_T.length}`:`Step ${step} of ${STEPS_T.length}`}</span>
            <div style={{display:"flex",gap:8}}>
              {step>1&&<button className="btn btn-outline btn-sm" onClick={()=>{setErr({});setStep(s=>s-1);}}>{t.stepBack}</button>}
              <button className="btn btn-dark btn-sm" onClick={next}>{step<5?t.stepContinue:t.stepSubmit}</button>
            </div>
          </div>
        </> : (
          <div className="sh-body">
            <div className="success">
              <div className="suc-i">✓</div>
              <div className="suc-t">{t.appSubmitted}</div>
              <div className="suc-d">{t.appSubmittedDesc_pre} {app.firstName}. {mode==="foster"?t.appSubmittedDesc_foster:t.appSubmittedDesc_adopt} <strong>{animal.name}</strong>{t.appSubmittedDesc_post?` ${t.appSubmittedDesc_post}`:""}</div>
              <div className="suc-ref"><div className="suc-ref-l">{t.refLabel}</div><div className="suc-ref-c">{refCode}</div></div>
              <div className="suc-steps">
                {[[t.appStep1,t.appStep1d],[t.appStep2,t.appStep2d],[t.appStep3,`${t.appStep3d_pre} ${app.email} ${t.appStep3d_post}`],[mode==="adopt"?t.appStep4_adopt:t.appStep4_foster,mode==="adopt"?t.appStep4d_adopt:t.appStep4d_foster]].map(([st,sd],i)=>(
                  <div key={i} className="suc-step"><div className="suc-step-n">{i+1}</div><div><strong style={{color:"var(--dark)"}}>{st}</strong><br/>{sd}</div></div>
                ))}
              </div>
              <button className="btn btn-dark btn-full" style={{maxWidth:240,margin:"0 auto"}} onClick={onClose}>{t.done}</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── FOSTER APPLICATION — short, single-screen form ─────────────────────────
// Deliberately lighter than the Adopt flow: just enough info to evaluate
// someone's ability to provide short-term temporary care.
function FosterAppSheet({ animal, lang, t, onClose }) {
  const [app, setApp]       = useState(EMPTY_FOSTER_APP);
  const [errors, setErr]    = useState({});
  const [submitted, setSub] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [refCode]           = useState(genRef);

  const set = (k, v) => setApp(a => ({ ...a, [k]: v }));
  const req = lang==="tr" ? "Zorunlu" : "Required";
  const sel = lang==="tr" ? "Lütfen seçin" : "Please select";
  const E = (k) => errors[k] ? <div className="err">{errors[k]}</div> : null;

  const Opt = ({ name, value, label, hint }) => (
    <label className={`opt-item ${app[name]===value?"on":""}`}>
      <input type="radio" name={name} checked={app[name]===value} onChange={()=>set(name,value)}/>
      <div><div className="opt-label">{label}</div>{hint&&<div className="opt-hint">{hint}</div>}</div>
    </label>
  );

  const validate = () => {
    const e = {};
    if (!app.firstName.trim()) e.firstName = req;
    if (!app.lastName.trim())  e.lastName  = req;
    if (!app.email.includes("@")) e.email = (lang==="tr"?"Geçerli e-posta girin":"Valid email required");
    if (!app.phone.trim())    e.phone     = req;
    if (!app.canProvideCare)  e.canProvideCare = sel;
    if (!app.availableFrom.trim()) e.availableFrom = req;
    if (!app.agree)           e.agree     = req;
    return e;
  };

  const submit = async () => {
    const e = validate();
    if (Object.keys(e).length) { setErr(e); return; }
    setErr({});
    setSubmitting(true);
    try {
      await (await getDb()).from("applications").insert([{
        ref_code: refCode,
        mode: "foster",
        animal_id: animal.id,
        animal_name: animal.name,
        listing_owner_email: animal.submitter_email,
        first_name: app.firstName, last_name: app.lastName,
        applicant_email: app.email, phone: app.phone,
        had_pets_before: app.hasPetExperience,
        current_pet_details: app.experienceNote,
        long_term_plan: app.availableFrom + (app.fosterDuration ? ` (${app.fosterDuration})` : ""),
        why_adopt: app.notes,
        status: "pending",
      }]);
    } catch (err) {
      console.error("Foster başvurusu kaydedilemedi:", err);
    }

    // ── E-posta gönder (notify-owner Edge Function) ──
    try {
      await (await getDb()).functions.invoke("notify-owner", {
        body: {
          ownerEmail:        animal.submitter_email,
          lang:              lang,
          mode:              "foster",
          animalName:        animal.name || "",
          refCode:           refCode,
          applicantName:     `${app.firstName} ${app.lastName}`,
          applicantEmail:    app.email,
          applicantPhone:    app.phone,
          hasPetExperience:  app.hasPetExperience,
          experienceNote:    app.experienceNote,
          availableFrom:     app.availableFrom,
          fosterDuration:    app.fosterDuration,
          canProvideCare:    app.canProvideCare,
          notes:             app.notes,
        },
      });
    } catch (err) {
      console.error("E-posta gönderilemedi:", err);
    }

    setSubmitting(false);
    setSub(true);
  };

  return (
    <div className="sheet-overlay" onClick={onClose}>
      <div className="sheet" onClick={e=>e.stopPropagation()}>
        <div className="sh-handle"/>
        <div className="sh-hd">
          <div className="sh-title">{t.fosterAppTitle}</div>
          <button className="sh-close" onClick={onClose}>✕</button>
        </div>

        {!submitted ? <>
          <div className="app-strip">
            <div className="app-strip-emoji">{animal.emoji}</div>
            <div>
              <div className="app-strip-name">{lang==="tr"?"Geçici bakım:":"Fostering:"} {animal.name}</div>
              <div className="app-strip-meta">{animal.breed[lang]} · {animal.city}, {animal.province}</div>
            </div>
            <div className="app-strip-note">{lang==="tr" ? "Genellikle 1–2 gün içinde dönüş yapılır" : "Usually reviewed within 1–2 days"}</div>
          </div>

          <div className="sh-body">
            <div style={{ fontSize:15, fontWeight:600, marginBottom:3 }}>
              {lang==="tr" ? "Geçici Bakım Başvurusu" : "Foster Application"}
            </div>
            <div style={{ fontSize:12, color:"var(--muted)", marginBottom:18 }}>
              {lang==="tr"
                ? "Sadece geçici bakım için gereken temel bilgiler — 2 dakikadan kısa sürer."
                : "Just the essentials for temporary care — takes less than 2 minutes."}
            </div>

            {/* Contact details */}
            <div className="frow">
              <div className="fg">
                <label className="flabel">{t.firstName}</label>
                <input className="fi" placeholder={lang==="tr"?"Zeynep":"Jane"} value={app.firstName} onChange={e=>set("firstName",e.target.value)} />
                {E("firstName")}
              </div>
              <div className="fg">
                <label className="flabel">{t.lastName}</label>
                <input className="fi" placeholder={lang==="tr"?"Yılmaz":"Mwangi"} value={app.lastName} onChange={e=>set("lastName",e.target.value)} />
                {E("lastName")}
              </div>
            </div>
            <div className="fg">
              <label className="flabel">{t.email}</label>
              <input className="fi" type="email" placeholder="ornek@email.com" value={app.email} onChange={e=>set("email",e.target.value)} />
              {E("email")}
            </div>
            <div className="fg">
              <label className="flabel">{t.phoneField}</label>
              <input className="fi" placeholder={phoneHint(FORM_COUNTRY, FORM_PROVINCE)} value={app.phone} onChange={e=>set("phone",e.target.value)} />
              {E("phone")}
            </div>

            <div className="divider" />

            {/* Brief experience — optional */}
            <div className="fg">
              <label className="flabel">{lang==="tr" ? "Hayvan Deneyimi (opsiyonel)" : "Animal Experience (optional)"}</label>
              <div className="opt-group">
                <Opt name="hasPetExperience" value="yes_current" label={lang==="tr"?"Şu anda hayvanım var":"I currently have pets"} />
                <Opt name="hasPetExperience" value="yes_past"    label={lang==="tr"?"Daha önce hayvanım oldu":"I've had pets before"} />
                <Opt name="hasPetExperience" value="no"          label={lang==="tr"?"Bu ilk olur":"This would be my first"} />
              </div>
            </div>
            {app.hasPetExperience && app.hasPetExperience !== "no" && (
              <div className="fg">
                <textarea
                  className="fta"
                  style={{ minHeight:60 }}
                  placeholder={lang==="tr" ? "Kısaca anlat (isteğe bağlı)" : "Briefly describe (optional)"}
                  value={app.experienceNote}
                  onChange={e=>set("experienceNote", e.target.value)}
                />
              </div>
            )}

            <div className="divider" />

            {/* Availability */}
            <div className="frow">
              <div className="fg">
                <label className="flabel">{lang==="tr" ? "Ne Zaman Başlayabilirsin? *" : "Available From *"}</label>
                <input className="fi" placeholder={lang==="tr" ? "örn. Hemen / 15 Temmuz" : "e.g. Immediately / July 15"} value={app.availableFrom} onChange={e=>set("availableFrom", e.target.value)} />
                {E("availableFrom")}
              </div>
              <div className="fg">
                <label className="flabel">{lang==="tr" ? "Ne Kadar Süre Bakabilirsin?" : "How Long Can You Foster?"}</label>
                <input className="fi" placeholder={lang==="tr" ? "örn. 2–4 hafta" : "e.g. 2–4 weeks"} value={app.fosterDuration} onChange={e=>set("fosterDuration", e.target.value)} />
              </div>
            </div>

            {/* Ability to provide care */}
            <div className="fg">
              <label className="flabel">{lang==="tr" ? "Geçici Bakım Verebilir misin? *" : "Can You Provide Temporary Care? *"}</label>
              <div className="opt-group">
                <Opt name="canProvideCare" value="yes" label={lang==="tr"?"Evet, uygun bir alanım var":"Yes, I have a suitable space"} />
                <Opt name="canProvideCare" value="yes_other_pets" label={lang==="tr"?"Evet, ama evde başka hayvan var":"Yes, but I have other pets at home"} />
                <Opt name="canProvideCare" value="not_sure" label={lang==="tr"?"Emin değilim, konuşalım":"Not sure — let's discuss"} />
              </div>
              {E("canProvideCare")}
            </div>

            {/* Notes */}
            <div className="fg">
              <label className="flabel">{lang==="tr" ? "Notlar (opsiyonel)" : "Notes for the Shelter (optional)"}</label>
              <textarea
                className="fta"
                style={{ minHeight:70 }}
                placeholder={lang==="tr" ? "Bilmemiz gereken bir şey var mı?" : "Anything else we should know?"}
                value={app.notes}
                onChange={e=>set("notes", e.target.value)}
              />
            </div>

            <div className="fg">
              <label style={{display:"flex",alignItems:"flex-start",gap:10,cursor:"pointer"}}>
                <input type="checkbox" style={{marginTop:3,accentColor:"var(--dark)",width:15,height:15,flexShrink:0}} checked={app.agree} onChange={e=>set("agree", e.target.checked)} />
                <span style={{fontSize:12,color:"var(--muted)",lineHeight:1.6}}>{t.declaration}</span>
              </label>
              {E("agree")}
            </div>
          </div>

          <div className="sh-foot">
            <span className="step-count">{lang==="tr" ? "Tek adım" : "Single step"}</span>
            <button className="btn btn-dark btn-sm" onClick={submit} disabled={submitting}>
              {submitting ? (lang==="tr"?"Gönderiliyor...":"Submitting...") : t.stepSubmit}
            </button>
          </div>
        </> : (
          <div className="sh-body">
            <div className="success">
              <div className="suc-i">✓</div>
              <div className="suc-t">{t.appSubmitted}</div>
              <div className="suc-d">
                {t.appSubmittedDesc_pre} {app.firstName}. {t.appSubmittedDesc_foster} <strong>{animal.name}</strong>{t.appSubmittedDesc_post?` ${t.appSubmittedDesc_post}`:""}
              </div>
              <div className="suc-ref"><div className="suc-ref-l">{t.refLabel}</div><div className="suc-ref-c">{refCode}</div></div>
              <div className="suc-steps">
                {[
                  [t.appStep1, t.appStep1d],
                  [t.appStep2, t.appStep2d],
                  [t.appStep3, `${t.appStep3d_pre} ${app.email} ${t.appStep3d_post}`],
                  [t.appStep4_foster, t.appStep4d_foster],
                ].map(([st,sd],i)=>(
                  <div key={i} className="suc-step"><div className="suc-step-n">{i+1}</div><div><strong style={{color:"var(--dark)"}}>{st}</strong><br/>{sd}</div></div>
                ))}
              </div>
              <button className="btn btn-dark btn-full" style={{maxWidth:240,margin:"0 auto"}} onClick={onClose}>{t.done}</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function RehomeForm({ lang, t, onSubmit, requireContact }) {
  const [f, setF] = useState({ name:"", species:"Dog", age:"", reason:"" });
  const [rehomePhoto, setRehomePhoto] = useState(null);
  const rehomeFileRef = useRef();
  const sp = lang==="tr"
    ? ["Köpek","Kedi","Tavşan","Kuş","Diğer"]
    : ["Dog","Cat","Rabbit","Bird","Other"];
  return (
    <div>
      <div style={{ fontSize:15, fontWeight:600, marginBottom:4 }}>{t.rehomeTitle2}</div>
      <div style={{ fontSize:12, color:"var(--muted)", marginBottom:18, lineHeight:1.6 }}>{t.rehomeNote}</div>
      <div className="frow">
        <div className="fg"><label className="flabel">{t.petName}</label><input className="fi" placeholder={lang==="tr"?"Pamuk":"Buddy"} value={f.name} onChange={e => setF(x => ({ ...x, name:e.target.value }))} /></div>
        <div className="fg"><label className="flabel">{t.species}</label><select className="fs" value={f.species} onChange={e => setF(x => ({ ...x, species:e.target.value }))}>{sp.map(s=><option key={s}>{s}</option>)}</select></div>
      </div>
      <div className="fg"><label className="flabel">{t.ageField}</label><input className="fi" placeholder={lang==="tr"?"2 yaş":"2 years"} value={f.age} onChange={e => setF(x => ({ ...x, age:e.target.value }))} /></div>
      <div className="fg"><label className="flabel">{t.reasonField}</label><textarea className="fta" placeholder={t.reasonPlaceholder} value={f.reason} onChange={e => setF(x => ({ ...x, reason:e.target.value }))} /></div>
      <div className="fg">
        <label className="flabel">{t.photo} *</label>
        {rehomePhoto && <div className="photo-prev"><img src={rehomePhoto} alt={lang==="tr"?"Yüklenen hayvan fotoğrafı önizlemesi":"Uploaded animal photo preview"} style={{width:"100%",height:"100%",objectFit:"cover",borderRadius:8}} /></div>}
        <div className="photo-drop" onClick={() => rehomeFileRef.current.click()}>
          <div style={{ fontSize:22, marginBottom:5 }}>📷</div>
          <div style={{ fontSize:12, fontWeight:500, color:"var(--muted)" }}>{rehomePhoto ? "✓ Photo uploaded" : t.uploadPhoto}</div>
          <div style={{ fontSize:11, color:"var(--muted)", marginTop:2 }}>{t.photoHint}</div>
        </div>
        <input ref={rehomeFileRef} type="file" accept="image/*" style={{ display:"none" }} onChange={async e => {
          const file = e.target.files[0];
          if (!file) return;
          const result = await uploadPhoto(file, "rehome");
          if (result.error === "inappropriate" || result.error === "not_animal") { alert(photoErrorMsg(result.error, lang)); return; }
          if (result.error) { alert("Upload failed. Please try again."); return; }
          setRehomePhoto(result.url);
        }} />
      </div>
      <button className="btn btn-dark btn-full" onClick={() => {
        if(!f.name) return;
        if(!rehomePhoto) { alert(lang==="tr"?"Lütfen fotoğraf yükleyin":"Please upload a photo"); return; }
        requireContact(async () => {
          await (await getDb()).from("rehome_listings").insert([{ pet_name:f.name, species:f.species, age:f.age, reason:f.reason, photo_url:rehomePhoto }]);
          onSubmit(f.name);
          setF({ name:"", species:"Dog", age:"", reason:"" });
          setRehomePhoto(null);
        });
      }}>{t.submitListing}</button>
    </div>
  );
}

// ─── IMAGE CAROUSEL (swipeable gallery with dot pagination) ────────────────
function ImageCarousel({ photos, emoji, height = 220, fit = "cover", alt = "" }) {
  const [idx, setIdx] = useState(0);
  const [lightbox, setLightbox] = useState(false);
  const touchStartX = useRef(null);
  const list = (photos && photos.length > 0) ? photos : null;

  if (!list) {
    return (
      <div className="d-thumb" style={{ height }}>
        <img src={FALLBACK_IMAGE} alt="" aria-hidden="true" style={{ width:"40%", height:"40%", objectFit:"contain", opacity:0.5 }} />
      </div>
    );
  }

  const goTo = (i) => setIdx(Math.max(0, Math.min(list.length - 1, i)));

  const onTouchStart = (e) => { touchStartX.current = e.touches[0].clientX; };
  const onTouchEnd = (e) => {
    if (touchStartX.current === null) return;
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    if (Math.abs(dx) > 40) {
      if (dx < 0) goTo(idx + 1); else goTo(idx - 1);
    }
    touchStartX.current = null;
  };

  return (
    <div style={{ position:"relative", marginBottom:12 }}>
      <div
        style={{ height, borderRadius:10, overflow:"hidden", background:"var(--off)", position:"relative", cursor:"zoom-in" }}
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
      >
        <img
          src={list[idx]}
          alt={alt ? `${alt} — ${idx + 1}/${list.length}` : ""}
          onClick={() => setLightbox(true)}
          style={{ width:"100%", height:"100%", objectFit:fit, display:"block" }}
        />

        {list.length > 1 && (
          <>
            <button
              type="button"
              onClick={() => goTo(idx - 1)}
              disabled={idx === 0}
              style={{
                position:"absolute", top:"50%", left:8, transform:"translateY(-50%)",
                width:30, height:30, borderRadius:"50%", border:"none",
                background:"rgba(0,0,0,0.45)", color:"#fff", fontSize:14,
                display:"flex", alignItems:"center", justifyContent:"center",
                cursor:"pointer", opacity: idx===0 ? 0.35 : 1,
              }}
            >‹</button>
            <button
              type="button"
              onClick={() => goTo(idx + 1)}
              disabled={idx === list.length - 1}
              style={{
                position:"absolute", top:"50%", right:8, transform:"translateY(-50%)",
                width:30, height:30, borderRadius:"50%", border:"none",
                background:"rgba(0,0,0,0.45)", color:"#fff", fontSize:14,
                display:"flex", alignItems:"center", justifyContent:"center",
                cursor:"pointer", opacity: idx===list.length-1 ? 0.35 : 1,
              }}
            >›</button>

            {/* image count badge */}
            <div style={{
              position:"absolute", top:8, right:8, background:"rgba(0,0,0,0.55)", color:"#fff",
              fontSize:11, fontWeight:600, padding:"2px 8px", borderRadius:999,
            }}>
              {idx + 1} / {list.length}
            </div>
          </>
        )}

        {/* expand hint icon */}
        <div style={{
          position:"absolute", bottom:8, right:8, background:"rgba(0,0,0,0.45)", color:"#fff",
          width:26, height:26, borderRadius:"50%", display:"flex", alignItems:"center", justifyContent:"center",
          fontSize:13, pointerEvents:"none",
        }}>⛶</div>
      </div>

      {list.length > 1 && (
        <div style={{ display:"flex", justifyContent:"center", gap:6, marginTop:8 }}>
          {list.map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => goTo(i)}
              style={{
                width: i===idx ? 8 : 6, height: i===idx ? 8 : 6, borderRadius:"50%", border:"none",
                background: i===idx ? "var(--amber)" : "var(--border)",
                cursor:"pointer", padding:0, transition:"all 0.15s",
              }}
            />
          ))}
        </div>
      )}

      {/* FULL-SCREEN LIGHTBOX */}
      {lightbox && (
        <div
          onClick={() => setLightbox(false)}
          style={{
            position:"fixed", inset:0, zIndex:1000, background:"rgba(0,0,0,0.92)",
            display:"flex", alignItems:"center", justifyContent:"center",
          }}
        >
          <button
            type="button"
            onClick={() => setLightbox(false)}
            style={{
              position:"absolute", top:16, right:16, width:38, height:38, borderRadius:"50%",
              background:"rgba(255,255,255,0.15)", color:"#fff", border:"none", fontSize:18,
              display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer",
            }}
          >✕</button>

          <img
            src={list[idx]}
            alt={alt ? `${alt} — ${idx + 1}/${list.length}` : ""}
            onClick={e => e.stopPropagation()}
            onTouchStart={onTouchStart}
            onTouchEnd={onTouchEnd}
            style={{ maxWidth:"92vw", maxHeight:"86vh", objectFit:"contain", display:"block" }}
          />

          {list.length > 1 && (
            <>
              <button
                type="button"
                onClick={e => { e.stopPropagation(); goTo(idx - 1); }}
                disabled={idx === 0}
                style={{
                  position:"absolute", top:"50%", left:16, transform:"translateY(-50%)",
                  width:42, height:42, borderRadius:"50%", border:"none",
                  background:"rgba(255,255,255,0.15)", color:"#fff", fontSize:20,
                  display:"flex", alignItems:"center", justifyContent:"center",
                  cursor:"pointer", opacity: idx===0 ? 0.3 : 1,
                }}
              >‹</button>
              <button
                type="button"
                onClick={e => { e.stopPropagation(); goTo(idx + 1); }}
                disabled={idx === list.length - 1}
                style={{
                  position:"absolute", top:"50%", right:16, transform:"translateY(-50%)",
                  width:42, height:42, borderRadius:"50%", border:"none",
                  background:"rgba(255,255,255,0.15)", color:"#fff", fontSize:20,
                  display:"flex", alignItems:"center", justifyContent:"center",
                  cursor:"pointer", opacity: idx===list.length-1 ? 0.3 : 1,
                }}
              >›</button>
              <div style={{
                position:"absolute", bottom:20, left:"50%", transform:"translateX(-50%)",
                background:"rgba(255,255,255,0.15)", color:"#fff", fontSize:12, fontWeight:600,
                padding:"4px 12px", borderRadius:999,
              }}>
                {idx + 1} / {list.length}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

// ─── MULTI PHOTO UPLOAD (1–5 images, moderated, reorderable) ────────────────
function MultiPhotoUpload({ photos, setPhotos, folder, lang, t, maxPhotos = 5 }) {
  const fileRef = useRef();
  const [uploading, setUploading] = useState(false);
  const dragIndex = useRef(null);

  const handleFiles = async (files) => {
    const remaining = maxPhotos - photos.length;
    if (remaining <= 0) {
      alert(lang==="tr" ? `En fazla ${maxPhotos} fotoğraf yükleyebilirsiniz.` : `You can upload up to ${maxPhotos} photos.`);
      return;
    }
    const toUpload = Array.from(files).slice(0, remaining);
    setUploading(true);
    for (const file of toUpload) {
      const result = await uploadPhoto(file, folder);
      if (result.error === "inappropriate" || result.error === "not_animal") {
        alert(photoErrorMsg(result.error, lang));
        continue; // skip this one, keep trying the rest
      }
      if (result.error) {
        alert(lang==="tr" ? "Yükleme başarısız oldu" : "Upload failed");
        continue;
      }
      setPhotos(prev => [...prev, result.url].slice(0, maxPhotos));
    }
    setUploading(false);
  };

  const removePhoto = (idx) => {
    setPhotos(prev => prev.filter((_, i) => i !== idx));
  };

  const movePhoto = (from, to) => {
    setPhotos(prev => {
      const arr = [...prev];
      const [moved] = arr.splice(from, 1);
      arr.splice(to, 0, moved);
      return arr;
    });
  };

  return (
    <div>
      {photos.length > 0 && (
        <div style={{ display:"flex", gap:8, flexWrap:"wrap", marginBottom:10 }}>
          {photos.map((url, idx) => (
            <div
              key={url+idx}
              draggable
              onDragStart={() => { dragIndex.current = idx; }}
              onDragOver={e => e.preventDefault()}
              onDrop={() => { if (dragIndex.current !== null && dragIndex.current !== idx) movePhoto(dragIndex.current, idx); dragIndex.current = null; }}
              style={{
                position:"relative", width:84, height:84, borderRadius:8, overflow:"hidden",
                border: idx===0 ? "2px solid var(--amber)" : "1px solid var(--border)",
                flexShrink:0, cursor:"grab",
              }}
            >
              <img src={url} alt={`${lang==="tr"?"Yüklenen fotoğraf":"Uploaded photo"} ${idx+1}`} style={{ width:"100%", height:"100%", objectFit:"cover", display:"block" }} />
              {idx === 0 && (
                <div style={{ position:"absolute", bottom:0, left:0, right:0, background:"rgba(212,134,43,0.92)", color:"#fff", fontSize:9, fontWeight:700, textAlign:"center", padding:"2px 0" }}>
                  {lang==="tr"?"KAPAK":"COVER"}
                </div>
              )}
              <button
                type="button"
                onClick={() => removePhoto(idx)}
                style={{
                  position:"absolute", top:3, right:3, width:20, height:20, borderRadius:"50%",
                  background:"rgba(0,0,0,0.65)", color:"#fff", border:"none", fontSize:12,
                  display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer", lineHeight:1,
                }}
              >✕</button>
            </div>
          ))}
        </div>
      )}

      {photos.length < maxPhotos && (
        <div className="photo-drop" onClick={() => fileRef.current.click()}>
          <div style={{ fontSize:22, marginBottom:5 }}>📷</div>
          <div style={{ fontSize:12, fontWeight:500, color:"var(--muted)" }}>
            {uploading
              ? (lang==="tr"?"Yükleniyor...":"Uploading...")
              : (photos.length === 0
                  ? t.uploadPhoto
                  : (lang==="tr" ? `Daha fazla ekle (${photos.length}/${maxPhotos})` : `Add more (${photos.length}/${maxPhotos})`))}
          </div>
          <div style={{ fontSize:11, color:"var(--muted)", marginTop:2 }}>
            {lang==="tr" ? `En fazla ${maxPhotos} fotoğraf · ${t.photoHint}` : `Up to ${maxPhotos} photos · ${t.photoHint}`}
          </div>
        </div>
      )}

      <input
        ref={fileRef} type="file" accept="image/*" multiple
        style={{ display:"none" }}
        onChange={e => { if (e.target.files?.length) handleFiles(e.target.files); e.target.value = ""; }}
      />

      {photos.length > 1 && (
        <div style={{ fontSize:11, color:"var(--muted)", marginTop:6 }}>
          {lang==="tr" ? "📌 Sürükleyerek sıralayabilirsiniz. İlk fotoğraf kapak görseli olur." : "📌 Drag to reorder. The first photo becomes the cover image."}
        </div>
      )}
    </div>
  );
}


function PostAnimalForm({ lang, t, onSubmit, requireContact, defaultCountry = FORM_COUNTRY, defaultProvince = FORM_PROVINCE }) {
  const [f, setF] = useState({
    name:"", species:"Dog", breed:"", age:"", gender:"Female", colour:"",
    country:defaultCountry, province:defaultProvince, city:"",
    canFoster:false, canAdopt:true, needsHelp:false, isLost:false, isFound:false,
    helpSituation:"", helpUrgency:"", desc:"",
    lostLastSeenLocation:"", lostLastSeenAt:"", lostCollarAccessories:"", lostIdentifyingCharacteristics:"",
    foundLocation:"", foundHow:"", foundIdentifyingCharacteristics:"",
    isNeutered:"", vaccinatedParasite:"", vaccinatedRabies:"",
  });
  const [photos, setPhotos] = useState([]);
  const [formError, setFormError] = useState("");
  const errorRef = useRef(null);

  const showError = (msg) => {
    setFormError(msg);
    setTimeout(() => errorRef.current?.scrollIntoView({ behavior:"smooth", block:"center" }), 50);
  };

  const sp = lang==="tr"
    ? ["Köpek","Kedi","Tavşan","Kuş","Hamster","Diğer"]
    : ["Dog","Cat","Rabbit","Bird","Hamster","Other"];

  const spMap = {"Köpek":"Dog","Kedi":"Cat","Tavşan":"Rabbit","Kuş":"Bird","Hamster":"Hamster","Diğer":"Other"};

  return (
    <div>
      <div style={{ fontSize:13.5, color:"var(--muted)", marginBottom:22, lineHeight:1.6 }}>
        {lang==="tr"
          ? "Hayvan bilgilerini bir kez gir. Aynı ilan sahiplenme, geçici bakım, yardım, kayıp ve/veya bulunan amaçlarına aynı anda hizmet edebilir."
          : "Enter the animal's details once. A single report can serve adoption, foster, help, lost, and/or found purposes at the same time."}
      </div>

      {/* Purpose — multi-select, NOT mutually exclusive.
          "What applies to this animal?" not "pick one listing type". */}
      <div className="fg">
        <label className="flabel">{lang==="tr"?"Bu Hayvan İçin Ne Geçerli?":"What Applies to This Animal?"}</label>
        <div style={{ fontSize:12.5, color:"var(--muted)", marginBottom:10 }}>
          {lang==="tr" ? "Birden fazlasını seçebilirsin." : "You can select more than one."}
        </div>
        <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
          <label className={`purpose-chip chip-lost ${f.isLost?"on":""}`}>
            <input type="checkbox" checked={f.isLost} onChange={e => setF(x=>({...x, isLost:e.target.checked}))} />
            <div className="pc-icon">🔍</div>
            <div className="pc-label">{lang==="tr"?"Kayıp":"Lost"}</div>
          </label>
          <label className={`purpose-chip chip-found ${f.isFound?"on":""}`}>
            <input type="checkbox" checked={f.isFound} onChange={e => setF(x=>({...x, isFound:e.target.checked}))} />
            <div className="pc-icon">📍</div>
            <div className="pc-label">{lang==="tr"?"Bulunan":"Found"}</div>
          </label>
          <label className={`purpose-chip chip-help ${f.needsHelp?"on":""}`}>
            <input type="checkbox" checked={f.needsHelp} onChange={e => setF(x=>({...x, needsHelp:e.target.checked}))} />
            <div className="pc-icon">🚨</div>
            <div className="pc-label">{lang==="tr"?"Yardım":"Help"}</div>
          </label>
          <label className={`purpose-chip chip-foster ${f.canFoster?"on":""}`}>
            <input type="checkbox" checked={f.canFoster} onChange={e => setF(x=>({...x, canFoster:e.target.checked}))} />
            <div className="pc-icon">🤝</div>
            <div className="pc-label">{lang==="tr"?"Geçici Bakım":"Foster"}</div>
          </label>
          <label className={`purpose-chip chip-adopt ${f.canAdopt?"on":""}`}>
            <input type="checkbox" checked={f.canAdopt} onChange={e => setF(x=>({...x, canAdopt:e.target.checked}))} />
            <div className="pc-icon">🏡</div>
            <div className="pc-label">{lang==="tr"?"Sahiplenme":"Adopt"}</div>
          </label>
        </div>
      </div>

      {/* Dynamically revealed — only shown when "Lost" purpose is selected */}
      {f.isLost && (
        <div className="fg" style={{ background:"rgba(192,57,43,0.05)", border:"1px solid rgba(192,57,43,0.2)", borderRadius:"var(--r)", padding:14 }}>
          <label className="flabel" style={{ color:"var(--red)" }}>🔴 {lang==="tr"?"Kayıp Detayları":"Lost Details"}</label>
          <div className="fg" style={{ marginTop:6, marginBottom:8 }}>
            <label className="flabel">{lang==="tr"?"En Son Görüldüğü Yer":"Last Seen Location"}</label>
            <input className="fi" placeholder={lang==="tr"?"örn. Kadıköy Moda sahili":"e.g. Near Moda beach"} value={f.lostLastSeenLocation} onChange={e=>setF(x=>({...x,lostLastSeenLocation:e.target.value}))} />
          </div>
          <div className="fg" style={{ marginBottom:8 }}>
            <label className="flabel">{lang==="tr"?"Tasma / Aksesuar":"Collar / Accessories"}</label>
            <input className="fi" placeholder={lang==="tr"?"örn. Mavi tasma, künye var":"e.g. Blue collar with tag"} value={f.lostCollarAccessories} onChange={e=>setF(x=>({...x,lostCollarAccessories:e.target.value}))} />
          </div>
          <div className="fg" style={{ marginBottom:0 }}>
            <label className="flabel">{lang==="tr"?"Ayırt Edici Özellikler":"Identifying Characteristics"}</label>
            <input className="fi" placeholder={lang==="tr"?"örn. Sol kulağında beyaz leke":"e.g. White patch on left ear"} value={f.lostIdentifyingCharacteristics} onChange={e=>setF(x=>({...x,lostIdentifyingCharacteristics:e.target.value}))} />
          </div>
        </div>
      )}

      {/* Dynamically revealed — only shown when "Found" purpose is selected */}
      {f.isFound && (
        <div className="fg" style={{ background:"rgba(45,122,79,0.05)", border:"1px solid rgba(45,122,79,0.2)", borderRadius:"var(--r)", padding:14 }}>
          <label className="flabel" style={{ color:"var(--green)" }}>📍 {lang==="tr"?"Bulunan Hayvan Detayları":"Found Details"}</label>
          <div className="fg" style={{ marginTop:6, marginBottom:8 }}>
            <label className="flabel">{lang==="tr"?"Nerede / Nasıl Bulundu":"Where / How Found"}</label>
            <input className="fi" placeholder={lang==="tr"?"örn. Sokakta tek başına dolaşırken":"e.g. Wandering alone on the street"} value={f.foundHow} onChange={e=>setF(x=>({...x,foundHow:e.target.value}))} />
          </div>
          <div className="fg" style={{ marginBottom:0 }}>
            <label className="flabel">{lang==="tr"?"Ayırt Edici Özellikler":"Identifying Characteristics"}</label>
            <input className="fi" placeholder={lang==="tr"?"örn. Ön patisinde yara var":"e.g. Injured front paw"} value={f.foundIdentifyingCharacteristics} onChange={e=>setF(x=>({...x,foundIdentifyingCharacteristics:e.target.value}))} />
          </div>
        </div>
      )}
      {f.needsHelp && (
        <div className="fg" style={{ background:"rgba(192,57,43,0.05)", border:"1px solid rgba(192,57,43,0.2)", borderRadius:"var(--r)", padding:14 }}>
          <label className="flabel" style={{ color:"var(--red)" }}>{lang==="tr"?"Yardım Detayları":"Help Details"}</label>
          <div className="frow" style={{ marginTop:6 }}>
            <div className="fg" style={{ marginBottom:8 }}>
              <label className="flabel">{lang==="tr"?"Durum *":"Situation *"}</label>
              <select className="fs" value={f.helpSituation} onChange={e=>setF(x=>({...x,helpSituation:e.target.value}))}>
                <option value="">{lang==="tr"?"Seçin":"Select"}</option>
                {lang==="tr"
                  ? <><option>Yaralı</option><option>Hasta</option><option>Terk edilmiş</option><option>İstismar / İhmal</option><option>Diğer</option></>
                  : <><option>Injured</option><option>Sick</option><option>Abandoned</option><option>Abuse / Neglect</option><option>Other</option></>}
              </select>
            </div>
            <div className="fg" style={{ marginBottom:0 }}>
              <label className="flabel">{lang==="tr"?"Aciliyet":"Urgency"}</label>
              <select className="fs" value={f.helpUrgency} onChange={e=>setF(x=>({...x,helpUrgency:e.target.value}))}>
                <option value="">{lang==="tr"?"Seçin":"Select"}</option>
                {lang==="tr"
                  ? <><option value="critical">Kritik — hemen yardım gerekiyor</option><option value="moderate">Orta — bugün içinde</option><option value="stable">Stabil — acil değil</option></>
                  : <><option value="critical">Critical — needs help now</option><option value="moderate">Moderate — within today</option><option value="stable">Stable — not urgent</option></>}
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Basic info */}
      <div className="frow">
        <div className="fg">
          <label className="flabel">{lang==="tr"?"Hayvanın Adı *":"Animal Name *"}</label>
          <input className="fi" placeholder={lang==="tr"?"örn. Luna":"e.g. Luna"} value={f.name} onChange={e=>setF(x=>({...x,name:e.target.value}))} />
        </div>
        <div className="fg">
          <label className="flabel">{lang==="tr"?"Tür *":"Species *"}</label>
          <select className="fs" value={f.species} onChange={e=>setF(x=>({...x,species:e.target.value}))}>
            {sp.map(s=><option key={s}>{s}</option>)}
          </select>
        </div>
      </div>

      <div className="frow">
        <div className="fg">
          <label className="flabel">{lang==="tr"?"Irk":"Breed"}</label>
          <input className="fi" placeholder={lang==="tr"?"örn. Golden Mix":"e.g. Golden Mix"} value={f.breed} onChange={e=>setF(x=>({...x,breed:e.target.value}))} />
        </div>
        <div className="fg">
          <label className="flabel">{lang==="tr"?"Yaş":"Age"}</label>
          <input className="fi" placeholder={lang==="tr"?"örn. 2 yaş":"e.g. 2 years"} value={f.age} onChange={e=>setF(x=>({...x,age:e.target.value}))} />
        </div>
      </div>

      <div className="frow">
        <div className="fg">
          <label className="flabel">{lang==="tr"?"Cinsiyet":"Gender"}</label>
          <div style={{ display:"flex", gap:8 }}>
            {[["Female", lang==="tr"?"Dişi":"Female","♀"],["Male",lang==="tr"?"Erkek":"Male","♂"]].map(([v,l,i])=>(
              <label key={v} className={`opt-item ${f.gender===v?"on":""}`} style={{ flex:1 }}>
                <input type="radio" name="gender" checked={f.gender===v} onChange={()=>setF(x=>({...x,gender:v}))} />
                <div className="opt-label">{i} {l}</div>
              </label>
            ))}
          </div>
        </div>
        <div className="fg">
          <label className="flabel">{lang==="tr"?"Renk":"Colour"}</label>
          <input className="fi" placeholder={lang==="tr"?"örn. Siyah-beyaz":"e.g. Black & white"} value={f.colour} onChange={e=>setF(x=>({...x,colour:e.target.value}))} />
        </div>
      </div>

      {/* Location */}
      <div className="frow">
        <div className="fg">
          <label className="flabel">{lang==="tr"?"Ülke *":"Country *"}</label>
          <select className="fs" value={f.country} onChange={e=>setF(x=>({...x,country:e.target.value,province:"",city:""}))}>
            {COUNTRIES.filter(c=>c!=="All Countries").map(c=><option key={c} value={c}>{locLabel(c, lang)}</option>)}
          </select>
        </div>
        <div className="fg">
          <label className="flabel">{lang==="tr"?"İl / Bölge *":"Province *"}</label>
          <select className="fs" value={f.province} onChange={e=>setF(x=>({...x,province:e.target.value,city:""}))}>
            <option value="">{lang==="tr"?"Seçin":"Select"}</option>
            {(PROVINCES[f.country] || []).filter(p=>p!=="All Provinces").map(p=><option key={p} value={p}>{locLabel(p, lang)}</option>)}
          </select>
        </div>
      </div>

      <div className="frow">
        <div className="fg">
          <label className="flabel">{lang==="tr"?"Semt / İlçe *":"Area *"}</label>
          <select className="fs" value={f.city} onChange={e=>setF(x=>({...x,city:e.target.value}))}>
            <option value="">{lang==="tr"?"Seçin":"Select"}</option>
            {(CITIES[f.province] || []).filter(c=>c!=="All Cities").map(c=><option key={c} value={c}>{locLabel(c, lang)}</option>)}
          </select>
        </div>
        <div className="fg">
          <label className="flabel">{lang==="tr"?"Açık Adres":"Open Address"}</label>
          <input className="fi" placeholder={lang==="tr"?"Sokak, bina no…":"Street, building no…"} value={f.address || ""} onChange={e=>setF(x=>({...x,address:e.target.value}))} />
        </div>
      </div>

      {/* Health info */}
      <div className="fg">
        <label className="flabel">{lang==="tr"?"Sağlık Bilgileri":"Health Information"}</label>
        <div style={{ display:"flex", flexDirection:"column", gap:8 }}>

          {/* Neutered/spayed */}
          <div>
            <div style={{ fontSize:12, color:"var(--muted)", marginBottom:5 }}>{lang==="tr"?"Kısırlaştırıldı mı?":"Neutered / Spayed?"}</div>
            <div style={{ display:"flex", gap:8 }}>
              {[["yes",lang==="tr"?"Evet":"Yes"],["no",lang==="tr"?"Hayır":"No"],["unknown",lang==="tr"?"Bilinmiyor":"Unknown"]].map(([v,l])=>(
                <label key={v} className={`opt-item ${f.isNeutered===v?"on":""}`} style={{ flex:1, padding:"8px 10px" }}>
                  <input type="radio" name="neutered" checked={f.isNeutered===v} onChange={()=>setF(x=>({...x,isNeutered:v}))} />
                  <div className="opt-label" style={{ fontSize:12 }}>{l}</div>
                </label>
              ))}
            </div>
          </div>

          {/* Parasite vaccination */}
          <div>
            <div style={{ fontSize:12, color:"var(--muted)", marginBottom:5 }}>{lang==="tr"?"İç/Dış Parazit Aşısı Var mı?":"Internal/External Parasite Treatment?"}</div>
            <div style={{ display:"flex", gap:8 }}>
              {[["yes",lang==="tr"?"Evet":"Yes"],["no",lang==="tr"?"Hayır":"No"],["unknown",lang==="tr"?"Bilinmiyor":"Unknown"]].map(([v,l])=>(
                <label key={v} className={`opt-item ${f.vaccinatedParasite===v?"on":""}`} style={{ flex:1, padding:"8px 10px" }}>
                  <input type="radio" name="parasite" checked={f.vaccinatedParasite===v} onChange={()=>setF(x=>({...x,vaccinatedParasite:v}))} />
                  <div className="opt-label" style={{ fontSize:12 }}>{l}</div>
                </label>
              ))}
            </div>
          </div>

          {/* Rabies vaccination */}
          <div>
            <div style={{ fontSize:12, color:"var(--muted)", marginBottom:5 }}>{lang==="tr"?"Kuduz Aşısı Var mı?":"Rabies Vaccination?"}</div>
            <div style={{ display:"flex", gap:8 }}>
              {[["yes",lang==="tr"?"Evet":"Yes"],["no",lang==="tr"?"Hayır":"No"],["unknown",lang==="tr"?"Bilinmiyor":"Unknown"]].map(([v,l])=>(
                <label key={v} className={`opt-item ${f.vaccinatedRabies===v?"on":""}`} style={{ flex:1, padding:"8px 10px" }}>
                  <input type="radio" name="rabies" checked={f.vaccinatedRabies===v} onChange={()=>setF(x=>({...x,vaccinatedRabies:v}))} />
                  <div className="opt-label" style={{ fontSize:12 }}>{l}</div>
                </label>
              ))}
            </div>
          </div>

        </div>
      </div>

      {/* Description */}
      <div className="fg">
        <label className="flabel">{lang==="tr"?"Açıklama *":"Description *"}</label>
        <textarea className="fta" placeholder={lang==="tr"?"Hayvanın karakteri, sağlık durumu, geçmişi…":"Animal's personality, health, history…"} value={f.desc} onChange={e=>setF(x=>({...x,desc:e.target.value}))} />
      </div>

      {/* Photos — 1 to 5, mandatory */}
      <div className="fg">
        <label className="flabel">{lang==="tr"?"Fotoğraflar * (1–5)":"Photos * (1–5)"}</label>
        <MultiPhotoUpload photos={photos} setPhotos={setPhotos} folder="animals" lang={lang} t={t} maxPhotos={5} />
      </div>

      {formError && (
        <div ref={errorRef} style={{ background:"rgba(192,57,43,0.08)", border:"1.5px solid var(--red)", borderRadius:"var(--r-sm)", padding:"12px 14px", marginBottom:16, display:"flex", alignItems:"flex-start", gap:8 }}>
          <span style={{ fontSize:16, flexShrink:0 }}>⚠️</span>
          <span style={{ fontSize:13, color:"var(--red)", fontWeight:600, lineHeight:1.5 }}>{formError}</span>
        </div>
      )}

      <button className="btn btn-dark btn-full" onClick={() => {
        setFormError("");
        if (!f.name) { showError(lang==="tr"?"Hayvanın adını girin":"Please enter animal name"); return; }
        if (!f.city) { showError(lang==="tr"?"Şehir girin":"Please enter city"); return; }
        if (!f.desc) { showError(lang==="tr"?"Açıklama girin":"Please enter description"); return; }
        if (photos.length === 0) { showError(lang==="tr"?"Lütfen en az 1 fotoğraf yükleyin":"Please upload at least 1 photo"); return; }
        if (!f.canAdopt && !f.canFoster && !f.needsHelp && !f.isLost && !f.isFound) { showError(lang==="tr"?"En az bir seçenek işaretle: Kayıp, Bulunan, Yardım, Geçici Bakım veya Sahiplenme":"Please select at least one: Lost, Found, Help, Foster, or Adopt"); return; }
        if (f.needsHelp && !f.helpSituation) { showError(lang==="tr"?"Lütfen yardım durumunu seçin":"Please select the help situation"); return; }
        if (!f.isNeutered || !f.vaccinatedParasite || !f.vaccinatedRabies) { showError(lang==="tr"?"Lütfen sağlık bilgilerinin tamamını doldurun":"Please fill in all health information"); return; }
        requireContact(async (contact) => {
          try {
          const speciesEn = spMap[f.species] || f.species;
          const fullDesc = f.address ? `${f.desc}\n📍 ${f.address}` : f.desc;
          const emoji = speciesEn==="Dog"?"🐕":speciesEn==="Cat"?"🐈":speciesEn==="Rabbit"?"🐇":speciesEn==="Bird"?"🐦":speciesEn==="Hamster"?"🐹":"🐾";
          const insertPayload = {
            name: f.name,
            emoji,
            species: speciesEn,
            breed: f.breed || null,
            age: f.age || null,
            gender: f.gender,
            colour: f.colour || null,
            country: f.country,
            province: f.province || "",
            city: f.city,
            can_foster: f.canFoster,
            can_adopt: f.canAdopt,
            needs_help: f.needsHelp,
            help_situation: f.needsHelp ? f.helpSituation : null,
            help_urgency: f.needsHelp ? (f.helpUrgency || null) : null,
            is_lost: f.isLost,
            lost_last_seen_location: f.isLost ? (f.lostLastSeenLocation || null) : null,
            lost_collar_accessories: f.isLost ? (f.lostCollarAccessories || null) : null,
            lost_identifying_characteristics: f.isLost ? (f.lostIdentifyingCharacteristics || null) : null,
            is_found: f.isFound,
            found_how: f.isFound ? (f.foundHow || null) : null,
            found_identifying_characteristics: f.isFound ? (f.foundIdentifyingCharacteristics || null) : null,
            desc_en: fullDesc,
            desc_tr: fullDesc,
            photo_url: photos[0],
            photo_urls: photos,
            submitter_email: contact.email,
            contact_phone: contact.phone || null,
            contact_pref: contact.contactPref || "email",
            status: "active",
            urgent: f.needsHelp && f.helpUrgency === "critical",
            is_new: true,
            is_neutered: f.isNeutered || null,
            vaccinated_parasite: f.vaccinatedParasite || null,
            vaccinated_rabies: f.vaccinatedRabies || null,
          };
          console.log("[PostAnimalForm] Submitting payload:", insertPayload);
          const { data, error } = await (await getDb()).from("animals").insert([insertPayload]).select();
          console.log("[PostAnimalForm] Insert result:", { data, error });
          if (error) {
            console.error("Animal insert error:", error);
            showError((lang==="tr"?"Kayıt hatası: ":"Insert error: ") + error.message);
            return;
          }
          // Build the mapped object the rest of the app expects, so it can be shown immediately
          const inserted = data?.[0];
          const newAnimal = inserted ? {
            id: inserted.id,
            name: inserted.name || "",
            emoji: inserted.emoji || emoji,
            species:  { en: inserted.species || speciesEn, tr: inserted.species || speciesEn },
            breed:    { en: inserted.breed   || "", tr: inserted.breed   || "" },
            age:      { en: inserted.age     || "", tr: inserted.age     || "" },
            gender:   { en: inserted.gender  || "", tr: inserted.gender  || "" },
            colour:   inserted.colour || "",
            country:  inserted.country  || "",
            province: inserted.province || "",
            city:     inserted.city     || "",
            tags:     { en: [], tr: [] },
            urgent:   inserted.urgent   || false,
            isNew:    inserted.is_new   || false,
            canFoster: inserted.can_foster || false,
            canAdopt:  inserted.can_adopt  !== false,
            needsHelp: inserted.needs_help || false,
            helpSituation: inserted.help_situation || "",
            helpUrgency: inserted.help_urgency || "",
            isLost: inserted.is_lost || false,
            isFound: inserted.is_found || false,
            lostLastSeenLocation: inserted.lost_last_seen_location || "",
            foundHow: inserted.found_how || "",
            desc:     { en: inserted.desc_en || "", tr: inserted.desc_tr || "" },
            photo_url: inserted.photo_url || (inserted.photo_urls && inserted.photo_urls[0]) || null,
            photo_urls: inserted.photo_urls || (inserted.photo_url ? [inserted.photo_url] : []),
            isNeutered: inserted.is_neutered || "unknown",
            vaccinatedParasite: inserted.vaccinated_parasite || "unknown",
            vaccinatedRabies: inserted.vaccinated_rabies || "unknown",
            submitter_email: inserted.submitter_email || "",
          } : null;
          onSubmit(f.name, newAnimal);
          setF({ name:"", species:"Dog", breed:"", age:"", gender:"Female", colour:"", country:defaultCountry, province:defaultProvince, city:"", address:"", canFoster:false, canAdopt:true, needsHelp:false, isLost:false, isFound:false, helpSituation:"", helpUrgency:"", lostLastSeenLocation:"", lostCollarAccessories:"", lostIdentifyingCharacteristics:"", foundHow:"", foundIdentifyingCharacteristics:"", desc:"", isNeutered:"", vaccinatedParasite:"", vaccinatedRabies:"" });
          setPhotos([]);
          } catch (err) {
            console.error("[PostAnimalForm] Unexpected error during submit:", err);
            showError((lang==="tr"?"Beklenmeyen bir hata oluştu: ":"An unexpected error occurred: ") + (err?.message || String(err)));
          }
        });
      }}>{lang==="tr"?"Raporu Gönder":"Submit Report"}</button>
    </div>
  );
}


function ProfileForm({ lang, t, onSubmit }) {
  const [f, setF] = useState({ name:"", looking:"Dog", desc:"" });
  const sp = lang==="tr"
    ? ["Köpek","Kedi","Tavşan","Küçük hayvan","Herhangi"]
    : ["Dog","Cat","Rabbit","Any small pet","Any"];
  return (
    <div>
      <div className="info-pill">{t.freeToPost}</div>
      <div style={{ fontSize:15, fontWeight:600, marginBottom:4 }}>{t.adoptionProfile}</div>
      <div style={{ fontSize:12, color:"var(--muted)", marginBottom:18, lineHeight:1.6 }}>{t.adoptionProfileNote}</div>
      <div className="frow">
        <div className="fg"><label className="flabel">{t.yourName}</label><input className="fi" placeholder={lang==="tr"?"Yılmaz Ailesi":"The Wanjiku Family"} value={f.name} onChange={e => setF(x => ({ ...x, name:e.target.value }))} /></div>
        <div className="fg"><label className="flabel">{t.lookingForLabel}</label><select className="fs" value={f.looking} onChange={e => setF(x => ({ ...x, looking:e.target.value }))}>{sp.map(s=><option key={s}>{s}</option>)}</select></div>
      </div>
      <div className="fg"><label className="flabel">{t.aboutHome}</label><textarea className="fta" placeholder={t.aboutHomePlaceholder} value={f.desc} onChange={e => setF(x => ({ ...x, desc:e.target.value }))} /></div>
      <button className="btn btn-dark btn-full" onClick={async () => {
        if(!f.name) return;
        await (await getDb()).from("adoption_profiles").insert([{ name:f.name, looking_for:f.looking, description:f.desc }]);
        onSubmit(f.name);
        setF({ name:"", looking:"Dog", desc:"" });
      }}>{t.postProfileBtn}</button>
    </div>
  );
}

function RegisterSitterForm({ lang, t, onSubmit, requireContact }) {
  const [f, setF] = useState({ name:"", city:"", area:"", price:"", availability:"", bio:"", services:[], accepts:[], hasYard:"" });
  const toggle = (key, val) => setF(x => ({ ...x, [key]: x[key].includes(val) ? x[key].filter(v => v !== val) : [...x[key], val] }));
  const svcs = lang==="tr"
    ? ["Köpek bakımı","Kedi bakımı","Köpek gezisi","Pansiyon","Küçük hayvan bakımı"]
    : ["Dog sitting","Cat sitting","Dog walking","Boarding","Small pet sitting"];
  const pets = lang==="tr"
    ? ["Köpek","Kedi","Tavşan","Kuş","Hamster"]
    : ["Dog","Cat","Rabbit","Bird","Hamster"];
  const yesLabel = lang==="tr" ? "Evet" : "Yes";
  const noLabel  = lang==="tr" ? "Hayır" : "No";
  return (
    <div>
      <div className="inote"><strong>{lang==="tr"?"Bakıcı ağımıza katıl.":"Join our sitter network."}</strong> {t.sitterRegNote}</div>
      <div className="frow">
        <div className="fg"><label className="flabel">{t.yourName}</label><input className="fi" placeholder={lang==="tr"?"Zeynep K.":"Grace N."} value={f.name} onChange={e => setF(x => ({ ...x, name:e.target.value }))} /></div>
        <div className="fg"><label className="flabel">{t.cityInput}</label><input className="fi" placeholder={lang==="tr"?"İstanbul":"Nairobi"} value={f.city} onChange={e => setF(x => ({ ...x, city:e.target.value }))} /></div>
      </div>
      <div className="frow">
        <div className="fg"><label className="flabel">{t.neighbourhood}</label><input className="fi" placeholder={lang==="tr"?"Beşiktaş":"Kilimani"} value={f.area} onChange={e => setF(x => ({ ...x, area:e.target.value }))} /></div>
        <div className="fg"><label className="flabel">{t.pricePerDay}</label><input className="fi" placeholder={priceHint(FORM_COUNTRY, FORM_PROVINCE, lang)} value={f.price} onChange={e => setF(x => ({ ...x, price:e.target.value }))} /></div>
      </div>
      <div className="fg">
        <label className="flabel">{t.servicesOffered}</label>
        <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
          {svcs.map(s => <button key={s} className={`toggle-btn ${f.services.includes(s)?"on":""}`} onClick={() => toggle("services",s)}>{s}</button>)}
        </div>
      </div>
      <div className="fg">
        <label className="flabel">{t.animalsAccepted}</label>
        <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
          {pets.map(p => <button key={p} className={`toggle-btn ${f.accepts.includes(p)?"on":""}`} onClick={() => toggle("accepts",p)}>{p}</button>)}
        </div>
      </div>
      <div className="fg">
        <label className="flabel">{lang==="tr"?"Dış alan var mı?":"Outdoor Space?"}</label>
        <div style={{ display:"flex", gap:8 }}>
          {[yesLabel, noLabel].map(v => (
            <label key={v} className={`opt-item ${f.hasYard===v?"on":""}`} style={{ flex:1 }}>
              <input type="radio" name="sy" checked={f.hasYard===v} onChange={() => setF(x => ({ ...x, hasYard:v }))} />
              <div className="opt-label">{v}</div>
            </label>
          ))}
        </div>
      </div>
      <div className="fg"><label className="flabel">{t.availability}</label><input className="fi" placeholder={t.availPlaceholder} value={f.availability} onChange={e => setF(x => ({ ...x, availability:e.target.value }))} /></div>
      <div className="fg"><label className="flabel">{t.aboutYou}</label><textarea className="fta" placeholder={t.aboutYouPlaceholder} value={f.bio} onChange={e => setF(x => ({ ...x, bio:e.target.value }))} /></div>
      <button className="btn btn-dark btn-full" onClick={() => {
        if(!f.name || !f.city) return;
        requireContact(async (contact) => {
          await (await getDb()).from("sitters").insert([{
            name: f.name, city: f.city, area: f.area,
            price: f.price, services: f.services, accepts: f.accepts,
            has_yard: f.hasYard === (lang==="tr"?"Evet":"Yes"),
            availability: f.availability, bio: f.bio,
            contact_email: contact.email,
            contact_phone: contact.phone || null,
            contact_pref: contact.contactPref || "email",
          }]);
          onSubmit(f.name);
          setF({ name:"", city:"", area:"", price:"", availability:"", bio:"", services:[], accepts:[], hasYard:"" });
        });
      }}>{t.registerSitter}</button>
    </div>
  );
}
