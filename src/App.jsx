import { useState, useRef, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";

// ─── SUPABASE ─────────────────────────────────────────────────────────────────
const SUPABASE_URL = "https://uyuqcpttdbejaakbwzyl.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV5dXFjcHR0ZGJlamFha2J3enlsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg0Mjk2NTgsImV4cCI6MjA5NDAwNTY1OH0.y8dJOe0yyWeKeaUU9PfPxnGn6b-2yHyG84LBdqaNH9k";
const db = createClient(SUPABASE_URL, SUPABASE_KEY);

// ─────────────────────────────────────────────────────────────────────────────
// DATA
// ─────────────────────────────────────────────────────────────────────────────

const ANIMALS = [
  { id:1, name:"Luna",   emoji:"🐕", species:{en:"Dog",    tr:"Köpek"},   breed:{en:"Golden Retriever Mix",    tr:"Golden Retriever Mix"},    age:{en:"2 yrs",    tr:"2 yaş"},    gender:{en:"Female",tr:"Dişi"}, country:"Türkiye",      province:"İstanbul",   city:"Beşiktaş", tags:{en:["Vaccinated","Spayed","Kid-friendly"],    tr:["Aşılı","Kısırlaştırıldı","Çocuk dostu"]}, urgent:false, isNew:true,  canFoster:true,  desc:{en:"Luna is a gentle, playful girl who loves everyone she meets. Great with children and other dogs.",                              tr:"Luna sakin, sevecen bir köpek. Çocuklarla ve diğer köpeklerle çok iyi geçiniyor."} },
  { id:2, name:"Mochi",  emoji:"🐈", species:{en:"Cat",    tr:"Kedi"},    breed:{en:"Domestic Shorthair",      tr:"Tekir"},                    age:{en:"4 mos",    tr:"4 aylık"}, gender:{en:"Male",  tr:"Erkek"}, country:"Türkiye",      province:"İzmir",      city:"Konak",    tags:{en:["Vaccinated","Playful","Indoor"],          tr:["Aşılı","Oyuncu","İç mekan"]},             urgent:true,  isNew:false, canFoster:true,  desc:{en:"Mochi is a tiny bundle of energy! Found as a stray kitten, now healthy and ready for his forever family.",                   tr:"Mochi sokaktan kurtarılmış minik bir yavru. Sağlığına kavuştu, sıcak bir yuva bekliyor."} },
  { id:3, name:"Rocky",  emoji:"🐇", species:{en:"Rabbit", tr:"Tavşan"},  breed:{en:"Holland Lop",             tr:"Hollanda Lop"},             age:{en:"1 yr",     tr:"1 yaş"},    gender:{en:"Male",  tr:"Erkek"}, country:"Türkiye",      province:"Ankara",     city:"Çankaya",  tags:{en:["Neutered","Litter-trained","Gentle"],     tr:["Kısırlaştırıldı","Evcil","Sakin"]},       urgent:false, isNew:false, canFoster:false, desc:{en:"Rocky is a calm and gentle rabbit. Perfect for a quiet household.",                                                          tr:"Rocky sakin, uysal bir tavşan. Sessiz bir eve çok uygun."} },
  { id:4, name:"Bella",  emoji:"🐕", species:{en:"Dog",    tr:"Köpek"},   breed:{en:"German Shepherd",         tr:"Alman Çoban Köpeği"},       age:{en:"3 yrs",    tr:"3 yaş"},    gender:{en:"Female",tr:"Dişi"}, country:"BAE",          province:"Dubai",      city:"Jumeirah", tags:{en:["Trained","Vaccinated","Active"],          tr:["Eğitimli","Aşılı","Aktif"]},              urgent:false, isNew:true,  canFoster:false, desc:{en:"Bella is smart and loyal. Needs an active family with outdoor space.",                                                       tr:"Bella zeki ve sadık bir köpek. Dış alanı olan aktif bir aile için ideal."} },
  { id:5, name:"Cleo",   emoji:"🐈", species:{en:"Cat",    tr:"Kedi"},    breed:{en:"Siamese Mix",             tr:"Siyam Mix"},                age:{en:"6 yrs",    tr:"6 yaş"},    gender:{en:"Female",tr:"Dişi"}, country:"Kuzey Kıbrıs", province:"Girne",      city:"Girne",    tags:{en:["Senior","Calm","Vaccinated"],             tr:["Yaşlı","Sakin","Aşılı"]},                 urgent:true,  isNew:false, canFoster:true,  desc:{en:"Cleo is a senior cat who loves peaceful spots. She deserves a forever home.",                                                tr:"Cleo huzurlu bir köşe seven yaşlı bir kedi. Kalıcı bir yuva hak ediyor."} },
  { id:6, name:"Peanut", emoji:"🐹", species:{en:"Hamster",tr:"Hamster"}, breed:{en:"Syrian Hamster",          tr:"Suriye Hamster"},           age:{en:"6 mos",    tr:"6 aylık"}, gender:{en:"Male",  tr:"Erkek"}, country:"BAE",          province:"Abu Dhabi",  city:"Al Reem",  tags:{en:["Healthy","Friendly"],                    tr:["Sağlıklı","Uysal"]},                      urgent:false, isNew:false, canFoster:true,  desc:{en:"Peanut comes with cage and accessories. Easy to care for.",                                                                  tr:"Peanut kafesi ve aksesuarlarıyla birlikte verilecek."} },
  { id:7, name:"Atlas",  emoji:"🐕", species:{en:"Dog",    tr:"Köpek"},   breed:{en:"Kangal Mix",              tr:"Kangal Mix"},               age:{en:"4 yrs",    tr:"4 yaş"},    gender:{en:"Male",  tr:"Erkek"}, country:"Türkiye",      province:"Ankara",     city:"Keçiören", tags:{en:["Vaccinated","Stray","Large breed"],       tr:["Aşılı","Sahipsiz","Büyük cüsse"]},        urgent:true,  isNew:false, canFoster:true,  desc:{en:"Atlas was rescued from the street. Big and gentle, needs a home with a large garden.",                                       tr:"Atlas sokaktan alındı. Büyük ve sevecen, geniş bahçeli bir eve ihtiyacı var."} },
  { id:8, name:"Zara",   emoji:"🐈", species:{en:"Cat",    tr:"Kedi"},    breed:{en:"Van Cat",                 tr:"Van Kedisi"},               age:{en:"2 yrs",    tr:"2 yaş"},    gender:{en:"Female",tr:"Dişi"}, country:"Türkiye",      province:"Van",        city:"İpekyolu", tags:{en:["Vaccinated","Spayed","Active"],           tr:["Aşılı","Kısırlaştırıldı","Aktif"]},       urgent:false, isNew:true,  canFoster:true,  desc:{en:"Zara is a Van Cat, Turkey's iconic breed. Loves water and has an energetic personality.",                                    tr:"Zara Türkiye'nin simgesi Van kedisi. Suyu seven, enerjik bir karakter."} },
  { id:9, name:"Max",    emoji:"🐕", species:{en:"Dog",    tr:"Köpek"},   breed:{en:"Labrador Mix",            tr:"Labrador Mix"},             age:{en:"1 yr",     tr:"1 yaş"},    gender:{en:"Male",  tr:"Erkek"}, country:"Kuzey Kıbrıs", province:"Lefkoşa",    city:"Lefkoşa",  tags:{en:["Vaccinated","Playful","Young"],           tr:["Aşılı","Oyuncu","Genç"]},                 urgent:false, isNew:true,  canFoster:true,  desc:{en:"Max is an energetic and affectionate young dog. Loves running in open spaces.",                                              tr:"Max enerjik ve sevecen genç bir köpek. Açık alanda koşmayı çok seviyor."} },
];

const COUNTRIES = ["All Countries","Türkiye","Kuzey Kıbrıs","BAE"];
const PROVINCES = {
  "All Countries":  ["All Provinces"],
  "Türkiye":        ["All Provinces","İstanbul","Ankara","İzmir","Antalya","Bursa","Adana","Gaziantep","Van","Mersin","Muğla"],
  "Kuzey Kıbrıs":  ["All Provinces","Lefkoşa","Gazimağusa","Girne","Güzelyurt","İskele"],
  "BAE":            ["All Provinces","Dubai","Abu Dhabi","Sharjah","Ajman","Ras Al Khaimah","Fujairah"],
};
const CITIES = {
  "All Provinces":    ["All Cities"],
  "İstanbul":         ["All Cities","Beşiktaş","Kadıköy","Üsküdar","Şişli","Beyoğlu","Sarıyer","Bakırköy","Maltepe","Pendik","Ataşehir"],
  "Ankara":           ["All Cities","Çankaya","Keçiören","Mamak","Sincan","Etimesgut","Yenimahalle","Altındağ"],
  "İzmir":            ["All Cities","Konak","Karşıyaka","Bornova","Buca","Çiğli","Gaziemir","Bayraklı"],
  "Antalya":          ["All Cities","Muratpaşa","Kepez","Konyaaltı","Alanya","Manavgat","Serik"],
  "Bursa":            ["All Cities","Osmangazi","Nilüfer","Yıldırım","Gemlik","İnegöl"],
  "Adana":            ["All Cities","Seyhan","Çukurova","Yüreğir","Sarıçam"],
  "Gaziantep":        ["All Cities","Şehitkamil","Şahinbey","Nizip"],
  "Van":              ["All Cities","İpekyolu","Tuşba","Edremit"],
  "Mersin":           ["All Cities","Yenişehir","Mezitli","Toroslar","Akdeniz"],
  "Muğla":            ["All Cities","Bodrum","Fethiye","Marmaris","Milas","Datça"],
  "Lefkoşa":          ["All Cities","Lefkoşa","Alayköy","Haspolat"],
  "Gazimağusa":       ["All Cities","Gazimağusa","İskele","Yeniboğaziçi"],
  "Girne":            ["All Cities","Girne","Alsancak","Lapta","Karaoğlanoğlu"],
  "Güzelyurt":        ["All Cities","Güzelyurt","Gemikonağı","Serhatköy"],
  "İskele":           ["All Cities","İskele","Yeni Erenköy","Dipkarpaz"],
  "Dubai":            ["All Cities","Jumeirah","Deira","Bur Dubai","Dubai Marina","JLT","Business Bay","Downtown Dubai","Al Quoz","Mirdif"],
  "Abu Dhabi":        ["All Cities","Al Reem","Yas Island","Khalifa City","Al Raha","Saadiyat","Mussafah","Al Ain"],
  "Sharjah":          ["All Cities","Al Nahda","Al Majaz","Muwaileh","Al Khan"],
  "Ajman":            ["All Cities","Ajman City","Al Nuaimiyah","Al Rashidiya"],
  "Ras Al Khaimah":   ["All Cities","RAK City","Al Hamra","Khuzam"],
  "Fujairah":         ["All Cities","Fujairah City","Dibba"],
};

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
  { id:"owners",   icon:"🏠", label:"Owners"       },
  { id:"help",     icon:"🚨", label:"Help"         },
];

const APP_STEPS = [{id:1,title:"Personal"},{id:2,title:"Home"},{id:3,title:"Lifestyle"},{id:4,title:"Experience"},{id:5,title:"Review"}];
const EMPTY_APP = { firstName:"",lastName:"",email:"",phone:"",age:"",occupation:"",homeType:"",ownRent:"",hasYard:"",hasChildren:"",childrenAges:"",householdSize:"",hoursHome:"",activityLevel:"",travelFreq:"",petCare:"",allergies:"",hadPetsBefore:"",currentPetDetails:"",currentPets:"",vetReference:"",whyAdopt:"",longTermPlan:"",agree:false };
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
    appName:"Pawero", tagline:"Turkey · Northern Cyprus · UAE", lang:"EN",
    home:"Home", animals:"Animals", lostFound:"Lost & Found", owners:"Owners", help:"Help",
    // hero
    heroH1:"Every animal deserves", heroH1Em:"a loving home.",
    heroP:"Adopt, foster, find a pet sitter, post a lost & found, or report animals in distress.",
    browseAnimals:"Browse Animals", reportAnimal:"Report Animal in Need",
    // stats
    adopted:"Adopted", waiting:"Waiting", rescues:"Rescues", shelters:"Shelters",
    // home quick links
    browseByGoal:"Browse by goal",
    adoptTitle:"Adopt a Pet",              adoptDesc:"Browse rescued animals and submit an adoption application.",
    fosterTitle:"Foster an Animal",        fosterDesc:"Provide a temporary home. We cover all vet costs.",
    lostFoundTitle:"Lost & Found",         lostFoundDesc:"Report a lost pet or view found animals.",
    sittingTitle:"Pet Sitting & Boarding", sittingDesc:"Find trusted sitters near you, or register as one.",
    rehomeTitle:"Rehome Your Pet",         rehomeDesc:"List your pet so loving families can find them.",
    helpTitle:"Help an Animal",            helpDesc:"Spotted an injured or abandoned animal? Report it fast.",
    recentlyAdded:"Recently added",
    // animals tab
    adopt:"Adopt", foster:"Foster", postProfile:"📋 Post Adoption Profile",
    findPet:"Find a pet to adopt or foster.",
    fosterWhat:"What is fostering?",
    fosterNote:"You temporarily care for an animal (2–8 weeks) while we find a permanent home. Pawero covers all vet costs.",
    searchPlaceholder:"Search by name or breed…",
    noAnimalsFound:"No animals found.",
    applyAdopt:"Apply to Adopt", applyFoster:"Apply to Foster",
    animalProfile:"Animal Profile",
    // lost & found tab
    lostFoundSub:"Reuniting pets with their owners.",
    browse:"Browse", postListing:"+ Post a Listing",
    openListings:"open", allListings:"All listings", lostFilter:"🔴 Lost", foundFilter:"🟢 Found",
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
    sitterRegNote:"Join our sitter network. Set your own rates and hours. Pet owners in your area will find and book you through Pawero.",
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
    declaration:"I confirm all information is truthful. Pawero may conduct a home visit and may reject any application without providing a reason.",
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
    appName:"Pawero", tagline:"Türkiye · Kuzey Kıbrıs · BAE", lang:"TR",
    home:"Ana Sayfa", animals:"Hayvanlar", lostFound:"Kayıp & Bulunan", owners:"Sahipler", help:"Yardım",
    // hero
    heroH1:"Her hayvan hak ediyor", heroH1Em:"sevgi dolu bir yuva.",
    heroP:"Sahiplen, geçici bakım ver, bakıcı bul, kayıp ilanı ver ya da tehlikedeki hayvanları bildir.",
    browseAnimals:"Hayvanlara Göz At", reportAnimal:"Tehlikedeki Hayvan Bildir",
    // istatistikler
    adopted:"Sahiplenilen", waiting:"Bekleyen", rescues:"Kurtarma", shelters:"Barınak",
    // hızlı bağlantılar
    browseByGoal:"Ne yapmak istiyorsun?",
    adoptTitle:"Hayvan Sahiplen",          adoptDesc:"Kurtarılmış hayvanlara göz at ve sahiplenme başvurusu gönder.",
    fosterTitle:"Geçici Bakım Ver",        fosterDesc:"Geçici bir yuva sun. Veteriner masraflarını biz karşılıyoruz.",
    lostFoundTitle:"Kayıp & Bulunan",      lostFoundDesc:"Kayıp ilanı ver ya da bulunan hayvanları görüntüle.",
    sittingTitle:"Petsitter & Pansiyonat", sittingDesc:"Yakınındaki güvenilir bakıcıları bul ya da bakıcı olarak kayıt ol.",
    rehomeTitle:"Hayvanını Yeni Yuvaya",   rehomeDesc:"Hayvanını listele, ona sevgi dolu bir aile bulsun.",
    helpTitle:"Hayvana Yardım Et",         helpDesc:"Yaralı ya da terk edilmiş bir hayvan mı gördün? Hemen bildir.",
    recentlyAdded:"Son eklenenler",
    // hayvanlar sekmesi
    adopt:"Sahiplen", foster:"Geçici Bakım", postProfile:"📋 Sahiplenme Profili Oluştur",
    findPet:"Sahiplenmek veya geçici bakım için hayvan bul.",
    fosterWhat:"Geçici bakım nedir?",
    fosterNote:"Kalıcı yuva bulana kadar 2–8 hafta boyunca hayvana geçici bakım verirsin. Tüm veteriner masrafları Pawero'a aittir.",
    searchPlaceholder:"İsim veya ırk ile ara…",
    noAnimalsFound:"Hayvan bulunamadı.",
    applyAdopt:"Sahiplenme Başvurusu", applyFoster:"Geçici Bakım Başvurusu",
    animalProfile:"Hayvan Profili",
    // kayıp & bulunan sekmesi
    lostFoundSub:"Hayvanları sahipleriyle buluşturuyoruz.",
    browse:"İlanlar", postListing:"+ İlan Ver",
    openListings:"açık", allListings:"Tüm ilanlar", lostFilter:"🔴 Kayıp", foundFilter:"🟢 Bulunan",
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
    sitterRegNote:"Bakıcı ağımıza katıl. Kendi saatlerini ve ücretini belirle. Yakınındaki hayvan sahipleri seni Pawero üzerinden bulup rezervasyon yapacak.",
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
    declaration:"Tüm bilgilerin doğru olduğunu onaylıyorum. Pawero ev ziyareti yapabilir ve herhangi bir başvuruyu gerekçe göstermeksizin reddedebilir.",
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
    --white:#fff; --off:#f9f9f9; --border:#ebebeb; --light:#f3f3f3;
    --muted:#999; --body:#333; --dark:#111;
    --amber:#d4862b; --red:#c0392b; --green:#2d7a4f; --blue:#2563eb;
    /* Aptos Display first, then system fallbacks, then web fallback */
    --font:'Aptos Display','Aptos','Plus Jakarta Sans','Segoe UI Variable Display','Segoe UI',system-ui,-apple-system,sans-serif;
    --pad:16px; --nav-h:62px; --top-h:52px; --r:10px;
  }
  html { scroll-behavior:smooth; }
  body { font-family:var(--font); background:var(--white); color:var(--body); font-size:14px; line-height:1.5; -webkit-font-smoothing:antialiased; overflow-x:hidden; }

  /* ─ TOPBAR ─ */
  .topbar { position:sticky; top:0; z-index:100; height:var(--top-h); background:var(--white); border-bottom:1px solid var(--border); display:flex; align-items:center; justify-content:space-between; padding:0 var(--pad); }
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
  .bottom-nav { position:fixed; bottom:0; left:0; right:0; z-index:100; height:var(--nav-h); background:var(--white); border-top:1px solid var(--border); display:flex; justify-content:space-around; align-items:center; padding-bottom:env(safe-area-inset-bottom,0); }
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
  .hero { padding:36px var(--pad) 32px; border-bottom:1px solid var(--border); }
  .hero-label { font-size:11px; font-weight:600; letter-spacing:1.5px; text-transform:uppercase; color:var(--muted); margin-bottom:10px; }
  .hero-h1 { font-size:clamp(24px,5vw,36px); font-weight:700; color:var(--dark); line-height:1.15; margin-bottom:10px; letter-spacing:-0.5px; }
  .hero-h1 em { color:var(--amber); font-style:italic; }
  .hero-p  { font-size:13px; color:var(--muted); max-width:420px; line-height:1.7; margin-bottom:22px; }
  .hero-cta { display:flex; gap:10px; flex-wrap:wrap; }

  /* ─ STATS ─ */
  .stats { display:grid; grid-template-columns:repeat(4,1fr); border-bottom:1px solid var(--border); }
  .stat  { padding:12px 0; text-align:center; border-right:1px solid var(--border); }
  .stat:last-child { border-right:none; }
  .stat-n { font-size:19px; font-weight:700; color:var(--dark); letter-spacing:-0.5px; }
  .stat-l { font-size:10px; font-weight:600; color:var(--muted); letter-spacing:0.5px; text-transform:uppercase; margin-top:2px; }

  /* ─ HOME QUICK LINKS ─ */
  .sec-label { font-size:11px; font-weight:600; letter-spacing:1px; text-transform:uppercase; color:var(--muted); margin:24px 0 12px; }
  .ql-list { display:flex; flex-direction:column; }
  .ql-item { display:flex; align-items:center; gap:14px; padding:14px 0; border-bottom:1px solid var(--border); cursor:pointer; transition:opacity 0.12s; }
  .ql-item:first-child { border-top:1px solid var(--border); }
  .ql-item:active { opacity:0.6; }
  @media (hover:hover) { .ql-item:hover { opacity:0.7; } }
  .ql-icon  { font-size:20px; width:42px; height:42px; border-radius:9px; background:var(--light); display:flex; align-items:center; justify-content:center; flex-shrink:0; }
  .ql-body  { flex:1; min-width:0; }
  .ql-title { font-size:14px; font-weight:600; color:var(--dark); margin-bottom:1px; }
  .ql-desc  { font-size:12px; color:var(--muted); line-height:1.4; }
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
  .btn { font-family:var(--font); font-size:14px; font-weight:600; border-radius:var(--r); padding:11px 20px; cursor:pointer; transition:all 0.12s; border:1px solid transparent; display:inline-flex; align-items:center; gap:6px; white-space:nowrap; line-height:1; min-height:44px; -webkit-tap-highlight-color:transparent; letter-spacing:-0.1px; }
  .btn:active { opacity:0.8; transform:scale(0.98); }
  .btn-dark   { background:var(--dark);  color:#fff;         border-color:var(--dark);   }
  .btn-outline { background:var(--white); color:var(--dark); border-color:var(--border); }
  .btn-red    { background:var(--red);   color:#fff;         border-color:var(--red);    }
  .btn-green  { background:var(--green); color:#fff;         border-color:var(--green);  }
  .btn-blue   { background:var(--blue);  color:#fff;         border-color:var(--blue);   }
  .btn-sm  { padding:7px 13px; font-size:12px; min-height:36px; border-radius:7px; }
  .btn-full { width:100%; justify-content:center; }

  /* ─ ANIMAL CARDS ─ */
  .a-list { display:flex; flex-direction:column; gap:10px; }
  .acard  { background:var(--white); border:1px solid var(--border); border-radius:var(--r); overflow:hidden; cursor:pointer; transition:all 0.15s; display:flex; flex-direction:row; align-items:stretch; }
  .acard:active { opacity:0.8; transform:scale(0.99); }
  @media (hover:hover) { .acard:hover { border-color:#ccc; box-shadow:0 3px 12px rgba(0,0,0,0.07); } }
  .acard-img { width:88px; flex-shrink:0; display:flex; align-items:center; justify-content:center; font-size:40px; position:relative; background:var(--off); }
  .acard-body { padding:12px 14px; flex:1; display:flex; flex-direction:column; justify-content:center; min-width:0; }
  .acard-name { font-size:14px; font-weight:600; color:var(--dark); margin-bottom:2px; letter-spacing:-0.1px; }
  .acard-meta { font-size:11px; color:var(--muted); margin-bottom:6px; }
  .acard-foot { display:flex; justify-content:space-between; align-items:center; margin-top:auto; padding-top:4px; }
  .acard-loc  { font-size:10px; color:var(--muted); }
  .abadge { position:absolute; font-size:9px; font-weight:600; padding:2px 6px; border-radius:3px; }
  .ab-red  { top:6px; right:6px; background:var(--red);   color:#fff; }
  .ab-grn  { top:6px; right:6px; background:var(--green); color:#fff; }
  .ab-sp   { top:6px; left:6px;  background:rgba(0,0,0,0.55); color:#fff; }
  .ab-fo   { bottom:6px; left:6px; background:rgba(45,122,79,0.85); color:#fff; }

  /* home mini card */
  .mini-row { display:flex; gap:10px; overflow-x:auto; padding-bottom:4px; scrollbar-width:none; margin:0 calc(-1 * var(--pad)); padding-left:var(--pad); padding-right:var(--pad); }
  .mini-row::-webkit-scrollbar { display:none; }
  .mini-card { flex-shrink:0; width:132px; background:var(--white); border:1px solid var(--border); border-radius:var(--r); overflow:hidden; cursor:pointer; transition:all 0.12s; }
  .mini-card:active { opacity:0.75; }

  /* ─ LOST & FOUND ─ */
  .lf-list { display:flex; flex-direction:column; gap:10px; }
  .lf-card { background:var(--white); border:1px solid var(--border); border-radius:var(--r); padding:14px 16px; cursor:pointer; transition:all 0.12s; }
  .lf-card:active { opacity:0.8; }
  @media (hover:hover) { .lf-card:hover { border-color:#ccc; box-shadow:0 3px 12px rgba(0,0,0,0.07); } }
  .lf-card.reunited { opacity:0.5; }
  .lf-top  { display:flex; align-items:flex-start; gap:12px; margin-bottom:8px; }
  .lf-emo  { font-size:32px; width:52px; height:52px; border-radius:10px; background:var(--off); display:flex; align-items:center; justify-content:center; flex-shrink:0; position:relative; }
  .lf-type { position:absolute; bottom:-5px; right:-5px; font-size:9px; font-weight:700; padding:2px 6px; border-radius:4px; text-transform:uppercase; white-space:nowrap; }
  .lf-lost { background:#fdecea; color:var(--red); }
  .lf-found { background:#e8f5e9; color:var(--green); }
  .lf-reunited { background:#e8f0ff; color:var(--blue); }
  .lf-name { font-size:14px; font-weight:600; color:var(--dark); margin-bottom:2px; }
  .lf-meta { font-size:11px; color:var(--muted); margin-bottom:3px; }
  .lf-desc { font-size:12px; color:var(--muted); line-height:1.55; margin-bottom:8px; }
  .lf-foot { display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:6px; }
  .lf-loc  { font-size:11px; color:var(--muted); }
  .lf-contact { font-size:11px; font-weight:600; color:var(--dark); }
  .reward-pill { font-size:10px; font-weight:700; background:rgba(212,134,43,0.12); color:var(--amber); padding:2px 8px; border-radius:4px; }

  /* ─ SITTER CARDS ─ */
  .sitter-list { display:flex; flex-direction:column; gap:10px; }
  .sitter-card { background:var(--white); border:1px solid var(--border); border-radius:var(--r); padding:16px; transition:all 0.12s; cursor:pointer; }
  .sitter-card:active { opacity:0.8; }
  @media (hover:hover) { .sitter-card:hover { border-color:#ccc; box-shadow:0 3px 12px rgba(0,0,0,0.07); } }
  .sitter-top    { display:flex; gap:12px; align-items:flex-start; margin-bottom:8px; }
  .sitter-avatar { font-size:26px; width:48px; height:48px; border-radius:50%; background:var(--off); border:1.5px solid var(--border); display:flex; align-items:center; justify-content:center; flex-shrink:0; }
  .sitter-name   { font-size:14px; font-weight:600; color:var(--dark); margin-bottom:2px; }
  .sitter-loc    { font-size:11px; color:var(--muted); margin-bottom:3px; }
  .sitter-stars  { font-size:11px; color:var(--amber); }
  .sitter-price  { font-size:13px; font-weight:700; color:var(--dark); margin-left:auto; text-align:right; white-space:nowrap; }
  .sitter-avail  { font-size:10px; color:var(--muted); text-align:right; margin-top:1px; }
  .sitter-bio    { font-size:12px; color:var(--muted); line-height:1.55; margin-bottom:8px; }
  .svc-wrap { display:flex; gap:5px; flex-wrap:wrap; margin-bottom:8px; }
  .svc-tag  { background:var(--off); border:1px solid var(--border); color:var(--body); font-size:10px; font-weight:500; padding:2px 8px; border-radius:999px; }
  .sitter-foot { display:flex; gap:8px; justify-content:space-between; align-items:center; border-top:1px solid var(--border); padding-top:10px; margin-top:2px; }
  .sitter-yard { font-size:11px; color:var(--muted); }

  /* ─ ADOPTER CARDS ─ */
  .p-list { display:flex; flex-direction:column; gap:1px; background:var(--border); border-radius:var(--r); overflow:hidden; border:1px solid var(--border); }
  .pcard  { background:var(--white); padding:14px 16px; display:flex; gap:12px; align-items:flex-start; }
  .pav    { font-size:24px; width:42px; height:42px; border-radius:8px; background:var(--off); display:flex; align-items:center; justify-content:center; flex-shrink:0; }
  .pname  { font-size:14px; font-weight:600; color:var(--dark); margin-bottom:2px; }
  .plook  { font-size:11px; color:var(--muted); margin-bottom:5px; }
  .plook strong { color:var(--dark); }
  .pdesc  { font-size:12px; color:var(--muted); line-height:1.5; margin-bottom:6px; }

  /* ─ REPORT CARDS ─ */
  .r-list { display:flex; flex-direction:column; gap:10px; }
  .rcard  { background:var(--white); border:1px solid var(--border); border-left:3px solid var(--red); border-radius:var(--r); padding:14px 16px; }
  .rcard.helped   { border-left-color:var(--blue); }
  .rcard.resolved { border-left-color:var(--green); opacity:0.55; }
  .r-icon  { font-size:28px; flex-shrink:0; }
  .r-title { font-size:13px; font-weight:600; color:var(--dark); margin-bottom:2px; letter-spacing:-0.1px; }
  .r-desc  { font-size:12px; color:var(--muted); line-height:1.5; margin-bottom:6px; }
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
  .fg { margin-bottom:14px; }
  .flabel { display:block; font-size:11px; font-weight:600; color:var(--muted); letter-spacing:0.5px; text-transform:uppercase; margin-bottom:5px; }
  .fi,.fs,.fta { width:100%; background:var(--off); border:1px solid var(--border); border-radius:var(--r); padding:10px 12px; font-family:var(--font); font-size:16px; color:var(--dark); outline:none; transition:border-color 0.12s; -webkit-appearance:none; appearance:none; }
  .fi:focus,.fs:focus,.fta:focus { border-color:var(--dark); background:var(--white); }
  .fta { resize:vertical; min-height:84px; font-size:14px; }
  .frow { display:grid; grid-template-columns:1fr 1fr; gap:10px; }
  @media (max-width:480px) { .frow { grid-template-columns:1fr; } }
  .opt-group { display:flex; flex-direction:column; gap:7px; }
  .opt-item  { display:flex; align-items:center; gap:10px; background:var(--off); border:1px solid var(--border); border-radius:var(--r); padding:11px 13px; cursor:pointer; min-height:46px; transition:all 0.12s; }
  .opt-item:active { opacity:0.7; }
  .opt-item.on { border-color:var(--dark); background:var(--white); }
  .opt-item input { accent-color:var(--dark); width:15px; height:15px; flex-shrink:0; }
  .opt-label { font-size:13px; font-weight:500; color:var(--dark); }
  .opt-hint  { font-size:11px; color:var(--muted); margin-top:1px; }
  .loc-row   { display:flex; gap:8px; }
  .loc-row .fi { flex:1; }
  .loc-btn   { background:var(--dark); color:#fff; border:none; border-radius:var(--r); padding:10px 12px; font-size:17px; cursor:pointer; flex-shrink:0; min-height:44px; }
  .type-row  { display:flex; gap:7px; flex-wrap:wrap; }
  .tbtn { font-size:20px; padding:8px 10px; border:1px solid var(--border); border-radius:8px; background:var(--off); cursor:pointer; min-height:44px; min-width:44px; transition:all 0.12s; }
  .tbtn.on { border-color:var(--dark); background:var(--dark); }
  .photo-drop { border:1.5px dashed var(--border); border-radius:var(--r); padding:22px; text-align:center; cursor:pointer; background:var(--off); }
  .photo-drop:active { border-color:var(--dark); }
  .photo-prev { height:80px; border-radius:8px; border:1px solid var(--border); background:var(--off); display:flex; align-items:center; justify-content:center; font-size:40px; margin-bottom:10px; }
  .err       { font-size:11px; color:var(--red); margin-top:3px; font-weight:600; }
  .info-pill { display:inline-flex; align-items:center; gap:5px; background:rgba(45,122,79,0.08); color:var(--green); font-size:12px; font-weight:600; padding:4px 10px; border-radius:999px; margin-bottom:14px; }
  .divider   { height:1px; background:var(--border); margin:20px 0; }
  .toggle-btn { padding:6px 12px; border-radius:999px; border:1px solid var(--border); font-size:12px; font-weight:500; cursor:pointer; background:var(--off); color:var(--body); transition:all 0.12s; font-family:var(--font); }
  .toggle-btn.on { background:var(--dark); border-color:var(--dark); color:#fff; }

  /* ─ SHEET MODAL ─ */
  .sheet-overlay { position:fixed; inset:0; z-index:200; background:rgba(0,0,0,0.3); display:flex; align-items:flex-end; }
  @media (min-width:640px) { .sheet-overlay { align-items:center; justify-content:center; } }
  .sheet { background:var(--white); border-radius:16px 16px 0 0; width:100%; max-height:92vh; display:flex; flex-direction:column; overflow:hidden; animation:slideUp 0.25s cubic-bezier(0.32,0.72,0,1); }
  @media (min-width:640px) { .sheet { border-radius:14px; max-width:580px; max-height:88vh; animation:fadeScale 0.18s ease; } }
  @keyframes loadbar { 0%{transform:scaleX(0);transform-origin:left} 50%{transform:scaleX(1);transform-origin:left} 51%{transform:scaleX(1);transform-origin:right} 100%{transform:scaleX(0);transform-origin:right} }
  @keyframes slideUp   { from{transform:translateY(100%)} to{transform:translateY(0)} }
  @keyframes fadeScale { from{opacity:0;transform:scale(0.97)} to{opacity:1;transform:scale(1)} }
  .sh-handle { width:36px; height:4px; background:var(--border); border-radius:2px; margin:10px auto; flex-shrink:0; }
  @media (min-width:640px) { .sh-handle { display:none; } }
  .sh-hd    { display:flex; align-items:center; justify-content:space-between; padding:0 16px 12px; border-bottom:1px solid var(--border); flex-shrink:0; }
  .sh-title { font-size:15px; font-weight:600; color:var(--dark); letter-spacing:-0.2px; }
  .sh-close { background:var(--light); border:none; border-radius:6px; width:28px; height:28px; font-size:13px; color:var(--muted); display:flex; align-items:center; justify-content:center; cursor:pointer; }
  .sh-body  { flex:1; overflow-y:auto; padding:16px; -webkit-overflow-scrolling:touch; }
  .sh-foot  { padding:12px 16px; border-top:1px solid var(--border); display:flex; justify-content:space-between; align-items:center; flex-shrink:0; padding-bottom:max(12px,env(safe-area-inset-bottom)); background:var(--white); }
  .app-strip { display:flex; align-items:center; gap:10px; padding:10px 16px; border-bottom:1px solid var(--border); flex-shrink:0; flex-wrap:wrap; }
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
`;

// ─────────────────────────────────────────────────────────────────────────────
// ROOT
// ─────────────────────────────────────────────────────────────────────────────
export default function App() {
  // ── language ──
  const [lang, setLang] = useState("en");
  const t = T[lang];  // translation shortcut

  // ── navigation ──
  const [tab, setTab]         = useState("home");
  const [animalSub, setASub]  = useState("adopt");    // adopt | foster | profile
  const [lfSub, setLFSub]     = useState("board");    // board | post
  const [lfTypeFilter, setLFType] = useState("all");  // all | lost | found
  const [ownerSub, setOSub]   = useState("sitting");  // sitting | register | rehome | families | profile

  // ── filters ──
  const [species, setSpecies]     = useState("All");
  const [search, setSearch]       = useState("");
  const [fCountry, setFC]         = useState("All Countries");
  const [fProvince, setFP]        = useState("All Provinces");
  const [fCity, setFCi]           = useState("All Cities");
  const [svcFilter, setSvcF]      = useState("All Services");
  const [sitterCity, setSitterCity] = useState("All");

  // ── modal state ──
  const [detailAnimal, setDetailA]  = useState(null);
  const [detailSitter, setDetailS]  = useState(null);
  const [detailLF, setDetailLF]     = useState(null);
  const [applyFor, setApplyFor]     = useState(null);
  const [fosterFor, setFosterFor]   = useState(null);

  // ── data state ──
  const [reports, setReports] = useState(REPORTS_SEED);
  const [lfItems, setLFItems] = useState(LF_SEED);
  const [sitters, setSitters] = useState(SITTERS_SEED);
  const [animals, setAnimals] = useState(ANIMALS);
  const [dbLoading, setDbLoading] = useState(true);
  const [photo, setPhoto]     = useState(null);
  const [lfPhoto, setLFPhoto] = useState(null);
  const [rf, setRf]           = useState({ title:"", location:"", desc:"", type:"Injured", animal:"" });
  const [lfForm, setLFForm]   = useState({ type:"lost", name:"", species:"Dog", breed:"", color:"", area:"", city:"", contact:"", reward:"", desc:"" });

  // ── Supabase: veri çek ──
  const loadFromDB = async () => {
    setDbLoading(true);
    try {
      // Raporları çek
      const { data: rData, error: rErr } = await db
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
            volunteers: (r.volunteers || []).map(v => ({ name: v.name, eta: v.eta, etaOrder: v.eta_order })),
          })));
        } else {
          setReports(REPORTS_SEED); // DB boşsa seed göster
        }
      }

      // Kayıp & bulunan ilanlarını çek
      const { data: lfData, error: lfErr } = await db
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
            reward: { en: item.reward || "", tr: item.reward || "" },
            desc: { en: item.desc_en || "", tr: item.desc_tr || "" },
            status: item.status || "open",
          })));
        } else {
          setLFItems(LF_SEED); // DB boşsa seed göster
        }
      }

      // Sitterleri çek
      const { data: sData, error: sErr } = await db
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
          }));
          // DB sitterlarını seed ile birleştir (seed her zaman gösterilsin)
          setSitters([...dbSitters, ...SITTERS_SEED]);
        } else {
          setSitters(SITTERS_SEED);
        }
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

  const [toast, setToast] = useState({ show:false, msg:"" });

  const [helpedFor, setHelpedFor] = useState(null);
  const [helpProof, setHelpProof] = useState(null);
  const [etaFor, setEtaFor]       = useState(null);   // report to volunteer for
  const [myName]                  = useState("You");   // in real app: logged-in user
  const [showReportForm, setShowReportForm] = useState(false);

  const fileRef   = useRef();
  const lfFileRef = useRef();
  const helpProofRef = useRef();

  const say   = (msg) => { setToast({ show:true, msg }); setTimeout(() => setToast({ show:false, msg:"" }), 2800); };
  const goTab = (t)   => { setTab(t); setSearch(""); setSpecies("All"); setFC("All Countries"); setFP("All Provinces"); setFCi("All Cities"); };

  // filtered animals
  const filtered = animals.filter(a => {
    const okS  = species === "All" || a.species.en === species;
    const okQ  = !search || a.name.toLowerCase().includes(search.toLowerCase()) || (a.breed?.en||"").toLowerCase().includes(search.toLowerCase());
    const okC  = fCountry  === "All Countries"  || a.country  === fCountry;
    const okP  = fProvince === "All Provinces"  || a.province === fProvince;
    const okCi = fCity     === "All Cities"     || a.city     === fCity;
    return okS && okQ && okC && okP && okCi;
  });

  const filteredSitters = sitters.filter(s =>
    (sitterCity === "All" || s.city === sitterCity) &&
    (svcFilter === "All Services" || (s.services?.en || s.services || []).includes(svcFilter))
  );

  const filteredLF = lfItems.filter(item =>
    lfTypeFilter === "all" || item.type === lfTypeFilter
  );

  const sitterCities = ["All", ...Array.from(new Set(sitters.map(s => s.city)))];

  // location filter bar (reused in Adopt & Foster)
  const LocFilters = () => (
    <div className="filter-bar">
      <select className={`loc-select ${fCountry !== "All Countries" ? "on" : ""}`} value={fCountry} onChange={e => { setFC(e.target.value); setFP("All Provinces"); setFCi("All Cities"); }}>
        {COUNTRIES.map(c => <option key={c}>{c}</option>)}
      </select>
      <select className={`loc-select ${fProvince !== "All Provinces" ? "on" : ""}`} value={fProvince} onChange={e => { setFP(e.target.value); setFCi("All Cities"); }}>
        {(PROVINCES[fCountry] || ["All Provinces"]).map(p => <option key={p}>{p}</option>)}
      </select>
      <select className={`loc-select ${fCity !== "All Cities" ? "on" : ""}`} value={fCity} onChange={e => setFCi(e.target.value)}>
        {(CITIES[fProvince] || ["All Cities"]).map(c => <option key={c}>{c}</option>)}
      </select>
    </div>
  );

  return (
    <>
      <style>{CSS}</style>

      {/* TOPBAR */}
      <header className="topbar">
        <div className="logo"><div className="logo-dot" />{t.appName}</div>
        <nav className="desk-nav">
          {TABS.map(tb => (
            <button key={tb.id} className={`dnav ${tab === tb.id ? "on" : ""} ${tb.id === "help" ? "red" : ""}`} onClick={() => goTab(tb.id)}>
              {t[tb.id === "lostfound" ? "lostFound" : tb.id] || tb.label}
            </button>
          ))}
        </nav>
        <div className="lang-sel">
          <button className={`lang-btn ${lang==="en"?"on":""}`} onClick={()=>setLang("en")}>EN</button>
          <button className={`lang-btn ${lang==="tr"?"on":""}`} onClick={()=>setLang("tr")}>TR</button>
        </div>
      </header>

      <div className="app">
        {dbLoading && (
          <div style={{ position:"fixed", top:0, left:0, right:0, height:3, background:"var(--amber)", zIndex:999, animation:"loadbar 1.5s ease-in-out infinite" }} />
        )}

        {/* ══════════════════════════════ HOME ══════════════════════════════ */}
        {tab === "home" && <>
          <div className="hero">
            <div className="hero-label">{t.tagline}</div>
            <h1 className="hero-h1">{t.heroH1}<br /><em>{t.heroH1Em}</em></h1>
            <p className="hero-p">{t.heroP}</p>
            <div className="hero-cta">
              <button className="btn btn-dark" onClick={() => goTab("animals")}>{t.browseAnimals}</button>
              <button className="btn btn-outline" onClick={() => goTab("help")}>🚨 {t.reportAnimal}</button>
            </div>
          </div>

          <div className="stats">
            {[[247,t.adopted],[58,t.waiting],[32,t.rescues],[14,t.shelters]].map(([n,l]) => (
              <div key={l} className="stat"><div className="stat-n">{n}</div><div className="stat-l">{l}</div></div>
            ))}
          </div>

          <div className="wrap">
            <div className="sec-label">{t.browseByGoal}</div>
            <div className="ql-list">
              {[
                { icon:"🏡", title:t.adoptTitle,    desc:t.adoptDesc,    tab:"animals",   sub:() => setASub("adopt")   },
                { icon:"🤝", title:t.fosterTitle,   desc:t.fosterDesc,   tab:"animals",   sub:() => setASub("foster")  },
                { icon:"🔍", title:t.lostFoundTitle, desc:t.lostFoundDesc,tab:"lostfound", sub:() => {}                },
                { icon:"🛋️", title:t.sittingTitle,  desc:t.sittingDesc,  tab:"owners",    sub:() => setOSub("sitting") },
                { icon:"🔄", title:t.rehomeTitle,   desc:t.rehomeDesc,   tab:"owners",    sub:() => setOSub("rehome")  },
                { icon:"🚨", title:t.helpTitle,     desc:t.helpDesc,     tab:"help",      sub:() => {}                 },
              ].map((f,i) => (
                <div key={i} className="ql-item" onClick={() => { f.sub(); goTab(f.tab); }}>
                  <div className="ql-icon">{f.icon}</div>
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
              <button className={`stab ${animalSub === "adopt"   ? "on" : ""}`} onClick={() => setASub("adopt")}>{t.adopt}</button>
              <button className={`stab ${animalSub === "foster"  ? "on" : ""}`} onClick={() => setASub("foster")}>{t.foster}</button>
              <button className={`stab ${animalSub === "profile" ? "on" : ""}`} onClick={() => setASub("profile")}>{t.postProfile}</button>
            </div>
          </div>

          {/* Shared: species chips + location filters — only for adopt/foster */}
          {animalSub !== "profile" && (
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
          {animalSub !== "profile" && <LocFilters />}

          <div className="wrap" style={{ paddingTop:14 }}>
            {animalSub === "profile" && (
              <ProfileForm lang={lang} t={t} onSubmit={n => say(`✓ ${n} ${lang==="tr"?"profili yayınlandı":"profile posted"}`)} />
            )}
            {animalSub !== "profile" && (<>
            {animalSub === "foster" && (
              <div className="inote"><strong>{lang==="tr"?"Geçici bakım nedir?":"What is fostering?"}</strong> {t.fosterNote}</div>
            )}
            <div className="search-wrap">
              <span className="search-icon">🔍</span>
              <input placeholder={t.searchPlaceholder} value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            {(() => {
              const list = animalSub === "foster"
                ? filtered.filter(a => a.canFoster)
                : filtered;
              return list.length > 0
                ? <div className="a-list">{list.map(a => <ACard key={a.id} a={a} mode={animalSub} lang={lang} onClick={() => setDetailA(a)} />)}</div>
                : <div style={{ textAlign:"center", padding:"40px 0", color:"var(--muted)", fontSize:13 }}>No animals found.</div>;
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
                {t.browse} <span style={{ fontSize:11, color:"var(--muted)", marginLeft:4 }}>({lfItems.filter(i=>i.status==="open").length} {t.openListings})</span>
              </button>
              <button className={`stab ${lfSub === "post" ? "on" : ""}`} onClick={() => setLFSub("post")}>
                {t.postListing}
              </button>
            </div>
          </div>

          {lfSub === "board" && (
            <div className="wrap" style={{ paddingTop:16 }}>
              <div style={{ display:"flex", gap:8, marginBottom:14 }}>
                {[["all", t.allListings],["lost", t.lostFilter],["found", t.foundFilter]].map(([v,l]) => (
                  <button key={v} className={`chip ${lfTypeFilter === v ? "on" : ""}`} onClick={() => setLFType(v)}>{l}</button>
                ))}
              </div>

              <div className="lf-list">
                {filteredLF.map(item => (
                  <div key={item.id} className={`lf-card ${item.status === "reunited" ? "reunited" : ""}`} onClick={() => setDetailLF(item)}>
                    <div className="lf-top">
                      <div className="lf-emo">
                        {item.emoji}
                        <span className={`lf-type ${item.status === "reunited" ? "lf-reunited" : item.type === "lost" ? "lf-lost" : "lf-found"}`}>
                          {item.status === "reunited" ? t.reunited : item.type === "lost" ? (lang==="tr"?"Kayıp":"Lost") : (lang==="tr"?"Bulunan":"Found")}
                        </span>
                      </div>
                      <div style={{ flex:1, minWidth:0 }}>
                        <div className="lf-name">{item.name === "Unknown" ? (lang==="tr"?`Bulunan ${item.species.tr}`:`Found ${item.species.en}`) : item.name}</div>
                        <div className="lf-meta">{item.species[lang]} · {item.breed[lang]} · {item.color[lang]}</div>
                        <div className="lf-meta">📍 {item.area}, {item.city} · {item.date[lang]}</div>
                      </div>
                      {item.reward[lang] && <span className="reward-pill">{lang==="tr"?"Ödül":"Reward"}: {item.reward[lang]}</span>}
                    </div>
                    <div className="lf-desc">{item.desc[lang]}</div>
                    <div className="lf-foot">
                      <span className="lf-contact">📞 {item.contact}</span>
                      {item.status !== "reunited" && (
                        <button className="btn btn-sm btn-outline" onClick={e => { e.stopPropagation(); say(t.contactCopied); }}>{t.contact}</button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
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
                <div className="fg"><label className="flabel">{t.cityField}</label><input className="fi" placeholder={lang==="tr"?"örn. İstanbul":"e.g. Nairobi"} value={lfForm.city} onChange={e => setLFForm(f => ({ ...f, city:e.target.value }))} /></div>
              </div>

              <div className="fg"><label className="flabel">{t.areaField}</label>
                <div className="loc-row">
                  <input className="fi" placeholder={lang==="tr"?"örn. Beşiktaş":"e.g. Westlands"} value={lfForm.area} onChange={e => setLFForm(f => ({ ...f, area:e.target.value }))} />
                  <button className="loc-btn" onClick={() => { setLFForm(f => ({ ...f, area:"Westlands", city:"Nairobi" })); say(t.locationDetected); }}>📍</button>
                </div>
              </div>

              <div className="fg"><label className="flabel">{t.yourContact}</label><input className="fi" placeholder={t.contactPlaceholder} value={lfForm.contact} onChange={e => setLFForm(f => ({ ...f, contact:e.target.value }))} /></div>

              {lfForm.type === "lost" && (
                <div className="fg"><label className="flabel">{t.reward}</label><input className="fi" placeholder={lang==="tr"?"örn. 1.000 TL":"e.g. KES 5,000"} value={lfForm.reward} onChange={e => setLFForm(f => ({ ...f, reward:e.target.value }))} /></div>
              )}

              <div className="fg"><label className="flabel">{t.descriptionField}</label>
                <textarea className="fta" placeholder={lfForm.type === "lost" ? t.descLostPlaceholder : t.descFoundPlaceholder} value={lfForm.desc} onChange={e => setLFForm(f => ({ ...f, desc:e.target.value }))} />
              </div>

              <div className="fg">
                <label className="flabel">{t.photo}</label>
                {lfPhoto && <div className="photo-prev">{lfPhoto}</div>}
                <div className="photo-drop" onClick={() => lfFileRef.current.click()}>
                  <div style={{ fontSize:22, marginBottom:5 }}>📷</div>
                  <div style={{ fontSize:12, fontWeight:500, color:"var(--muted)" }}>{t.uploadPhoto}</div>
                  <div style={{ fontSize:11, color:"var(--muted)", marginTop:2 }}>{t.photoHint}</div>
                </div>
                <input ref={lfFileRef} type="file" accept="image/*" style={{ display:"none" }} onChange={e => { if(e.target.files[0]) { const em=["🐕","🐈","🐾","🐦","🐇"]; setLFPhoto(em[Math.floor(Math.random()*em.length)]); say(t.photoUploaded2); }}} />
              </div>

              <button className="btn btn-dark btn-full" onClick={async () => {
                if(!lfForm.area || !lfForm.city || !lfForm.contact || !lfForm.desc) { say(lang==="tr"?"Lütfen tüm zorunlu alanları doldurun":"Please fill all required fields"); return; }
                const { error } = await db.from("lf_listings").insert([{
                  type: lfForm.type,
                  name: lfForm.name || null,
                  species: lfForm.species,
                  breed: lfForm.breed || null,
                  color: lfForm.color || null,
                  area: lfForm.area,
                  city: lfForm.city,
                  contact: lfForm.contact,
                  reward: lfForm.reward || null,
                  desc_en: lfForm.desc,
                  desc_tr: lfForm.desc,
                  status: "open",
                }]);
                if (error) { say(lang==="tr"?"Hata oluştu, tekrar dene":"Error occurred, please try again"); return; }
                setLFForm({ type:"lost", name:"", species:"Dog", breed:"", color:"", area:"", city:"", contact:"", reward:"", desc:"" });
                setLFPhoto(null); setLFSub("board");
                say(lfForm.type === "lost" ? t.postLost : t.postFound);
                await loadFromDB();
              }}>
                {lfForm.type === "lost" ? t.postLost : t.postFound}
              </button>
            </div>
          )}
        </>}

        {/* ══════════════════════════════ OWNERS ════════════════════════════ */}
        {tab === "owners" && <>
          <div className="ph">
            <div className="ph-title">{t.forOwners}</div>
            <div className="ph-sub">{t.forOwnersSub}</div>
            <div className="stabs">
              <button className={`stab ${ownerSub === "sitting"  ? "on" : ""}`} onClick={() => setOSub("sitting")}>{t.petSitting}</button>
              <button className={`stab ${ownerSub === "register" ? "on" : ""}`} onClick={() => setOSub("register")}>{t.becomeSitter}</button>
              <button className={`stab ${ownerSub === "rehome"   ? "on" : ""}`} onClick={() => setOSub("rehome")}>{t.rehomeTab}</button>
              <button className={`stab ${ownerSub === "families" ? "on" : ""}`} onClick={() => setOSub("families")}>{t.findFamilies}</button>
            </div>
          </div>

          <div className="wrap" style={{ paddingTop:18 }}>

            {ownerSub === "sitting" && <>
              <div style={{ display:"flex", gap:8, flexWrap:"wrap", marginBottom:10 }}>
                <span style={{ fontSize:11, fontWeight:600, color:"var(--muted)", textTransform:"uppercase", letterSpacing:"0.5px", alignSelf:"center" }}>{t.cityLabel}</span>
                {sitterCities.map(c => <button key={c} className={`chip ${sitterCity === c ? "on" : ""}`} onClick={() => setSitterCity(c)} style={{ minHeight:32, padding:"5px 12px", fontSize:11 }}>{c === "All" ? (lang==="tr"?"Tümü":"All") : c}</button>)}
              </div>
              <div style={{ display:"flex", gap:8, flexWrap:"wrap", marginBottom:16 }}>
                <span style={{ fontSize:11, fontWeight:600, color:"var(--muted)", textTransform:"uppercase", letterSpacing:"0.5px", alignSelf:"center" }}>{t.serviceLabel}</span>
                {SVC_TYPES.map(s => <button key={s} className={`chip ${svcFilter === s ? "on" : ""}`} onClick={() => setSvcF(s)} style={{ minHeight:32, padding:"5px 12px", fontSize:11 }}>{s}</button>)}
              </div>
              <div style={{ fontSize:11, color:"var(--muted)", fontWeight:500, marginBottom:12 }}>{filteredSitters.length} {t.sittersFound}</div>
              {filteredSitters.length > 0 ? (
                <div className="sitter-list">
                  {filteredSitters.map(s => (
                    <div key={s.id} className="sitter-card" onClick={() => setDetailS(s)}>
                      <div className="sitter-top">
                        <div className="sitter-avatar">{s.emoji}</div>
                        <div style={{ flex:1 }}>
                          <div className="sitter-name">{s.name}</div>
                          <div className="sitter-loc">📍 {s.area}, {s.city}</div>
                          <div style={{ display:"flex", alignItems:"center", gap:5 }}>
                            <span className="sitter-stars">{"★".repeat(Math.round(s.rating))}</span>
                            <span style={{ fontSize:12, fontWeight:600 }}>{s.rating}</span>
                            <span style={{ fontSize:11, color:"var(--muted)" }}>({s.reviews})</span>
                          </div>
                        </div>
                        <div>
                          <div className="sitter-price">{s.price[lang]}</div>
                          <div className="sitter-avail">{s.availability[lang]}</div>
                        </div>
                      </div>
                      <div className="sitter-bio">{s.bio[lang]}</div>
                      <div className="svc-wrap">{s.services[lang].map(sv => <span key={sv} className="svc-tag">{sv}</span>)}</div>
                      <div className="sitter-foot">
                        <div>
                          <div style={{ fontSize:11, color:"var(--muted)", marginBottom:2 }}>{t.accepts} <strong style={{ color:"var(--dark)" }}>{s.accepts.join(", ")}</strong></div>
                          <div className="sitter-yard">{s.hasYard ? t.hasYard : t.noYard} · {t.maxPets} {s.maxPets}</div>
                        </div>
                        <button className="btn btn-dark btn-sm" onClick={e => { e.stopPropagation(); say(`📨 ${t.bookingRequestSent} ${s.name}!`); }}>{t.book}</button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ textAlign:"center", padding:"40px 0", color:"var(--muted)", fontSize:13 }}>{t.noSittersFound}</div>
              )}
            </>}

            {ownerSub === "register" && (
              <RegisterSitterForm lang={lang} t={t} onSubmit={async (name) => {
                say(`✓ ${name} ${lang==="tr"?"bakıcı olarak kaydedildi!":"registered as a sitter!"}`);
                setOSub("sitting");
                await loadFromDB();
              }} />
            )}

            {ownerSub === "rehome" && (
              <RehomeForm lang={lang} t={t} onSubmit={async (n) => {
                say(`✓ ${n} ${lang==="tr"?"yeni yuva ilanı yayınlandı":"listed for rehoming"}`);
                await loadFromDB();
              }} />
            )}

            {ownerSub === "families" && (
              <div className="p-list">
                {ADOPTERS.map(p => (
                  <div key={p.id} className="pcard">
                    <div className="pav">{p.emoji}</div>
                    <div style={{ flex:1 }}>
                      <div style={{ display:"flex", justifyContent:"space-between", flexWrap:"wrap", gap:8 }}>
                        <div>
                          <div className="pname">{p.name}</div>
                          <div className="plook">{t.lookingFor} <strong>{p.looking[lang]}</strong> · 📍 {p.city}</div>
                        </div>
                        <button className="btn btn-outline btn-sm" onClick={() => say(t.contactRequest)}>{t.contact}</button>
                      </div>
                      <div className="pdesc">{p.desc[lang]}</div>
                      <div className="tags">{p.tags[lang].map(tg => <span key={tg} className="tag">{tg}</span>)}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}

          </div>
        </>}

        {/* ══════════════════════════════ HELP ══════════════════════════════ */}
        {tab === "help" && <>
          <div className="emerg-bar">{t.emergencyBar}</div>
          <div className="ph" style={{ position:"sticky" }}>
            <div className="ph-title">{t.helpAnimals}</div>
            <div className="ph-sub" style={{ marginBottom:0, paddingBottom:12 }}>{t.helpSub}</div>
          </div>

          <div className="wrap" style={{ paddingTop:16 }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:14 }}>
              <div style={{ fontSize:13, fontWeight:600, color:"var(--dark)" }}>
                {t.activeReports}
                <span style={{ fontWeight:400, color:"var(--muted)", marginLeft:6 }}>
                  ({reports.filter(r => r.status === "active").length} {t.needingHelp})
                </span>
              </div>
            </div>

            {/* ── Reports list — active first, then helped, then resolved ── */}
            <div className="r-list" style={{ marginBottom:24 }}>
              {[...reports]
                .sort((a,b) => {
                  const order = { active:0, helped:1, resolved:2 };
                  return (order[a.status]??1) - (order[b.status]??1);
                })
                .map(r => {
                  const isVolunteer = r.volunteers?.some(v => v.name === myName);
                  return (
                    <div key={r.id} className={`rcard ${r.status === "helped" ? "helped" : r.status === "resolved" ? "resolved" : ""}`}>
                      {/* Top row: icon + title + status pill */}
                      <div style={{ display:"flex", gap:10, alignItems:"flex-start" }}>
                        <div className="r-icon">{r.emoji}</div>
                        <div style={{ flex:1, minWidth:0 }}>
                          <div style={{ display:"flex", justifyContent:"space-between", gap:6, flexWrap:"wrap", marginBottom:3 }}>
                            <div className="r-title">{r.title[lang]||r.title}</div>
                            <span className={`spill ${r.status === "active" ? "sp-a" : r.status === "helped" ? "sp-h" : r.status === "resolved" ? "sp-r" : "sp-p"}`}>
                              {r.status}
                            </span>
                          </div>
                          <div className="r-desc">{r.desc[lang]||r.desc}</div>
                          <div className="r-meta">
                            <span className="r-mi">📍 {r.location}</span>
                            <span className="r-mi">{r.time[lang]||r.time}</span>
                            <span className="r-mi">{t.reportedBy} {r.reporter}</span>
                          </div>
                        </div>
                      </div>

                      {/* Volunteer list — sorted by etaOrder (closest first), Coordinating last */}
                      {r.volunteers?.length > 0 && (
                        <div className="r-volunteers">
                          <div style={{ fontSize:10, fontWeight:600, color:"var(--muted)", textTransform:"uppercase", letterSpacing:"0.5px", marginBottom:4 }}>
                            {r.volunteers.length} {t.volunteersResponding}
                          </div>
                          {[...r.volunteers]
                            .sort((a,b) => (a.etaOrder??99) - (b.etaOrder??99))
                            .map((v, i) => {
                              const opt = ETA_OPTIONS.find(o => o.label === v.eta);
                              const displayEta = lang === "tr" ? (opt?.labelTR || v.eta) : v.eta;
                              return (
                                <div key={i} className="r-vol-item">
                                  <div className="r-vol-dot" style={{ background: v.etaOrder === 99 ? "var(--amber)" : "var(--blue)" }} />
                                  <span style={{ fontWeight:600 }}>{v.name}</span>
                                  <span className="r-vol-eta">· {displayEta}</span>
                                </div>
                              );
                            })}
                        </div>
                      )}

                      {/* Action row */}
                      {r.status !== "resolved" && (
                        <div className="r-actions">
                          {!isVolunteer && r.status !== "helped" && (
                            <button className="btn btn-outline btn-sm" onClick={() => setEtaFor(r)}>
                              {t.iCanHelp}
                            </button>
                          )}
                          {isVolunteer && r.status !== "helped" && (
                            <>
                              <div style={{ fontSize:11, color:"var(--blue)", fontWeight:600 }}>
                                {t.youAreResponding} — {(() => { const v=r.volunteers.find(v=>v.name===myName); const opt=ETA_OPTIONS.find(o=>o.label===v?.eta); return lang==="tr"?(opt?.labelTR||v?.eta):v?.eta; })()}
                              </div>
                              <button className="btn btn-blue btn-sm" onClick={() => { setHelpedFor(r); setHelpProof(null); }}>
                                {t.markAsHelped}
                              </button>
                            </>
                          )}
                          {r.status === "helped" && (
                            <div style={{ fontSize:11, color:"var(--blue)", fontWeight:500 }}>{t.animalHasBeenHelped}</div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
            </div>

            {/* ── CTA to submit new report ── */}
            {!showReportForm ? (
              <div style={{ borderTop:"1px solid var(--border)", paddingTop:20, textAlign:"center" }}>
                <div style={{ fontSize:13, color:"var(--muted)", marginBottom:12 }}>{t.notListedAbove}</div>
                <button className="btn btn-red btn-full" onClick={() => setShowReportForm(true)}>{t.submitNewReport}</button>
              </div>
            ) : (
              <div style={{ borderTop:"1px solid var(--border)", paddingTop:20 }}>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16 }}>
                  <div style={{ fontSize:14, fontWeight:600, color:"var(--dark)" }}>{lang==="tr"?"İhbar Gönder":"Submit a Report"}</div>
                  <button className="btn btn-outline btn-sm" onClick={() => setShowReportForm(false)}>{t.cancel}</button>
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
                <div className="fg"><label className="flabel">{t.titleField}</label><input className="fi" placeholder={lang==="tr"?"örn. Moi Caddesi'nde yaralı köpek":"e.g. Injured dog on Moi Avenue"} value={rf.title} onChange={e => setRf(f => ({ ...f, title:e.target.value }))} /></div>
                <div className="fg"><label className="flabel">{t.locationField}</label>
                  <div className="loc-row">
                    <input className="fi" placeholder={lang==="tr"?"Sokak, semt, şehir":"Street, area, city"} value={rf.location} onChange={e => setRf(f => ({ ...f, location:e.target.value }))} />
                    <button className="loc-btn" onClick={() => { setRf(f => ({ ...f, location:"Kenyatta Ave, Nairobi (GPS)" })); say("📍 " + (lang==="tr"?"Konum algılandı":"Location detected")); }}>📍</button>
                  </div>
                </div>
                <div className="fg"><label className="flabel">{t.description}</label><textarea className="fta" placeholder={lang==="tr"?"Görünür yaralar? Hayvan ne zamandan beri orada?":"Visible injuries? How long has the animal been there?"} value={rf.desc} onChange={e => setRf(f => ({ ...f, desc:e.target.value }))} /></div>
                <div className="fg">
                  <label className="flabel">{t.photo}</label>
                  {photo && <div className="photo-prev">{photo}</div>}
                  <div className="photo-drop" onClick={() => fileRef.current.click()}>
                    <div style={{ fontSize:22, marginBottom:5 }}>📷</div>
                    <div style={{ fontSize:12, fontWeight:500, color:"var(--muted)" }}>{t.uploadPhoto}</div>
                    <div style={{ fontSize:11, color:"var(--muted)", marginTop:2 }}>{t.photoHint}</div>
                  </div>
                  <input ref={fileRef} type="file" accept="image/*" style={{ display:"none" }} onChange={e => { if(e.target.files[0]) { const em=["🐕","🐈","🐾","🐦","🐇","🐹"]; setPhoto(em[Math.floor(Math.random()*em.length)]); say(lang==="tr"?"Fotoğraf yüklendi":"Photo uploaded"); }}} />
                </div>
                <button className="btn btn-red btn-full" onClick={async () => {
                  if(!rf.title || !rf.location) { say(lang==="tr"?"Lütfen başlık ve konum girin":"Please fill title and location"); return; }
                  const { error } = await db.from("reports").insert([{
                    emoji: rf.animal || "🐾",
                    title: rf.title,
                    description: rf.desc || "",
                    location: rf.location,
                    reporter_name: myName,
                    status: "active",
                  }]);
                  if (error) { say(lang==="tr"?"Hata oluştu, tekrar dene":"Error occurred, please try again"); return; }
                  setRf({ title:"", location:"", desc:"", type:"Injured", animal:"" });
                  setPhoto(null); setShowReportForm(false);
                  say(lang==="tr"?"İhbar gönderildi — kurtarma ekibi bildirildi":"Report submitted — responders notified");
                  await loadFromDB();
                }}>{t.submitReport}</button>
              </div>
            )}
          </div>
        </>}
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
          <div className="sheet" onClick={e => e.stopPropagation()}>
            <div className="sh-handle" />
            <div className="sh-hd"><div className="sh-title">{t.animalProfile}</div><button className="sh-close" onClick={() => setDetailA(null)}>✕</button></div>
            <div className="sh-body">
              <div className="d-thumb">{detailAnimal.emoji}</div>
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
                <button className="btn btn-dark btn-full" onClick={() => { setApplyFor(detailAnimal); setDetailA(null); }}>{t.applyAdopt}</button>
                {detailAnimal.canFoster && <button className="btn btn-green btn-full" onClick={() => { setFosterFor(detailAnimal); setDetailA(null); }}>{t.applyFoster}</button>}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* LOST & FOUND DETAIL SHEET */}
      {detailLF && (
        <div className="sheet-overlay" onClick={() => setDetailLF(null)}>
          <div className="sheet" onClick={e => e.stopPropagation()}>
            <div className="sh-handle" />
            <div className="sh-hd">
              <div className="sh-title">{detailLF.type === "lost" ? t.lostPetSheet : t.foundAnimalSheet}</div>
              <button className="sh-close" onClick={() => setDetailLF(null)}>✕</button>
            </div>
            <div className="sh-body">
              <div className="d-thumb">{detailLF.emoji}</div>
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
                <button className="btn btn-outline btn-full" onClick={() => setDetailLF(null)}>{t.close}</button>
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
                <button className="btn btn-dark btn-full" onClick={() => { setDetailS(null); say(`📨 ${t.bookingRequestSent} ${detailSitter.name}!`); }}>{t.sendRequest}</button>
                <button className="btn btn-outline btn-full" onClick={() => setDetailS(null)}>{t.close}</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ADOPTION / FOSTER SHEET */}
      {(applyFor || fosterFor) && (
        <AppSheet animal={applyFor || fosterFor} mode={applyFor ? "adopt" : "foster"} lang={lang} t={t} onClose={() => { setApplyFor(null); setFosterFor(null); }} />
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
                  <button key={opt.label} className="eta-btn" onClick={async () => {
                    const { error } = await db.from("volunteers").insert([{
                      report_id: etaFor.id,
                      name: myName,
                      eta: opt.label,
                      eta_order: opt.order,
                    }]);
                    setEtaFor(null);
                    if (!error) {
                      say("✓ " + (lang==="tr" ? opt.labelTR : opt.label));
                      await loadFromDB();
                    } else {
                      say(lang==="tr"?"Hata oluştu":"Error occurred");
                    }
                  }}>
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
                  <div className="photo-prev" style={{ marginBottom:10 }}>{helpProof}</div>
                  <div style={{ fontSize:12, color:"var(--green)", fontWeight:600, marginBottom:16 }}>{t.photoUploaded}</div>
                  <button className="btn btn-dark btn-full" style={{ marginBottom:8 }} onClick={async () => {
                    const { error } = await db.from("reports").update({ status:"helped" }).eq("id", helpedFor.id);
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
                  <input ref={helpProofRef} type="file" accept="image/*" style={{ display:"none" }} onChange={e => { if(e.target.files[0]) { const em=["🐕","🐈","🐾","🐦","🐇","🐹"]; setHelpProof(em[Math.floor(Math.random()*em.length)]); }}} />
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
      <div style={{ height:84, background:"var(--off)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:36, position:"relative" }}>
        {a.emoji}
        {a.urgent          && <span className="abadge ab-red">{lang==="tr"?"Acil":"Urgent"}</span>}
        {!a.urgent&&a.isNew && <span className="abadge ab-grn">{lang==="tr"?"Yeni":"New"}</span>}
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
  return (
    <div className="acard" onClick={onClick}>
      <div className="acard-img">
        {a.emoji}
        {a.urgent           && <span className="abadge ab-red">{lang==="tr"?"Acil":"Urgent"}</span>}
        {!a.urgent&&a.isNew && <span className="abadge ab-grn">{lang==="tr"?"Yeni":"New"}</span>}
        <span className="abadge ab-sp">{a.species[lang]}</span>
        {mode === "foster"  && <span className="abadge ab-fo">{lang==="tr"?"Geçici":"Foster"}</span>}
      </div>
      <div className="acard-body">
        <div className="acard-name">{a.name}</div>
        <div className="acard-meta">{a.breed[lang]} · {a.age[lang]} · {a.gender[lang]}</div>
        <div className="tags">{a.tags[lang].slice(0,2).map(tg => <span key={tg} className="tag">{tg}</span>)}</div>
        <div className="acard-foot">
          <span className="acard-loc">📍 {a.city}, {a.province}</span>
          <span style={{ fontSize:11, fontWeight:600, color:"var(--muted)" }}>{lang==="tr"?"Gör →":"View →"}</span>
        </div>
      </div>
    </div>
  );
}

function AppSheet({ animal, mode, lang, t, onClose }) {
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
    if(Object.keys(e).length){setErr(e);return;}
    setErr({});
    if(step<5){ setStep(s=>s+1); return; }
    // Son adım — Supabase'e kaydet
    try {
      await db.from("applications").insert([{
        ref_code: refCode,
        mode: mode,
        first_name: app.firstName, last_name: app.lastName,
        email: app.email, phone: app.phone,
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
              <div className="fg"><label className="flabel">{t.phoneField}</label><input className="fi" placeholder="+90 5XX XXX XX XX" value={app.phone} onChange={e=>set("phone",e.target.value)}/>{E("phone")}</div>
              <div className="frow"><div className="fg"><label className="flabel">{t.ageField2}</label><input className="fi" placeholder="28" value={app.age} onChange={e=>set("age",e.target.value)}/>{E("age")}</div><div className="fg"><label className="flabel">{t.occupationField}</label><input className="fi" placeholder={lang==="tr"?"Öğretmen":"Teacher"} value={app.occupation} onChange={e=>set("occupation",e.target.value)}/>{E("occupation")}</div></div>
            </>}
            {step===2&&<><div style={{fontSize:15,fontWeight:600,marginBottom:3}}>{t.homeTitle}</div><div style={{fontSize:12,color:"var(--muted)",marginBottom:16}}>{t.homeSub}</div>
              <div className="fg"><label className="flabel">{t.homeType}</label><div className="opt-group"><Opt name="homeType" value="apartment" label={t.apartment} hint={t.apartmentHint}/><Opt name="homeType" value="house" label={t.house} hint={t.houseHint}/><Opt name="homeType" value="farmhouse" label={t.farmhouse} hint={t.farmhouseHint}/><Opt name="homeType" value="other" label={t.other}/></div>{E("homeType")}</div>
              <div className="fg"><label className="flabel">{t.ownRentQ}</label><div className="opt-group"><Opt name="ownRent" value="own" label={t.own}/><Opt name="ownRent" value="rent" label={t.rent} hint={t.rentHint}/></div>{E("ownRent")}</div>
              <div className="fg"><label className="flabel">{t.outdoorQ}</label><div className="opt-group"><Opt name="hasYard" value="yes_fenced" label={t.fenced}/><Opt name="hasYard" value="yes_unfenced" label={t.unfenced}/><Opt name="hasYard" value="no" label={t.noOutdoor}/></div>{E("hasYard")}</div>
              <div className="fg"><label className="flabel">{t.childrenQ}</label><div className="opt-group"><Opt name="hasChildren" value="no" label={t.noChildren}/><Opt name="hasChildren" value="yes" label={t.yesLive}/><Opt name="hasChildren" value="visit" label={t.yesVisit}/></div>{E("hasChildren")}</div>
              {(app.hasChildren==="yes"||app.hasChildren==="visit")&&<div className="fg"><label className="flabel">{t.childAges}</label><input className="fi" placeholder={lang==="tr"?"örn. 4, 7, 12":"e.g. 4, 7, 12"} value={app.childrenAges} onChange={e=>set("childrenAges",e.target.value)}/></div>}
              <div className="fg"><label className="flabel">{t.householdSize}</label><input className="fi" placeholder="3" value={app.householdSize} onChange={e=>set("householdSize",e.target.value)}/>{E("householdSize")}</div>
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

function RehomeForm({ lang, t, onSubmit }) {
  const [f, setF] = useState({ name:"", species:"Dog", age:"", reason:"" });
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
      <button className="btn btn-dark btn-full" onClick={async () => {
        if(!f.name) return;
        await db.from("rehome_listings").insert([{ pet_name:f.name, species:f.species, age:f.age, reason:f.reason }]);
        onSubmit(f.name);
        setF({ name:"", species:"Dog", age:"", reason:"" });
      }}>{t.submitListing}</button>
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
        await db.from("adoption_profiles").insert([{ name:f.name, looking_for:f.looking, description:f.desc }]);
        onSubmit(f.name);
        setF({ name:"", looking:"Dog", desc:"" });
      }}>{t.postProfileBtn}</button>
    </div>
  );
}

function RegisterSitterForm({ lang, t, onSubmit }) {
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
        <div className="fg"><label className="flabel">{t.pricePerDay}</label><input className="fi" placeholder={lang==="tr"?"örn. 300 TL/gün":"KES 800/day"} value={f.price} onChange={e => setF(x => ({ ...x, price:e.target.value }))} /></div>
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
      <button className="btn btn-dark btn-full" onClick={async () => {
        if(!f.name || !f.city) return;
        await db.from("sitters").insert([{
          name: f.name, city: f.city, area: f.area,
          price: f.price, services: f.services, accepts: f.accepts,
          has_yard: f.hasYard === (lang==="tr"?"Evet":"Yes"),
          availability: f.availability, bio: f.bio,
        }]);
        onSubmit(f.name);
        setF({ name:"", city:"", area:"", price:"", availability:"", bio:"", services:[], accepts:[], hasYard:"" });
      }}>{t.registerSitter}</button>
    </div>
  );
}
