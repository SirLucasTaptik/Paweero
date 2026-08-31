-- ============================================================================
-- Paweero — Row Level Security politikaları
--
-- Neden: RLS kapalıyken herkese açık anon anahtarı her tabloda tam yetkilidir.
-- O anahtar tarayıcıya gönderilen JS paketinin içinde, yani gizli değil. Şu an
-- isteyen herkes her satırı okuyabilir, değiştirebilir ve SİLEBİLİR.
--
-- Bu dosya uygulamanın MEVCUT davranışını korur; yalnızca gerçekten tehlikeli
-- olanı kapatır:
--   1. Başvuru tablolarının okunmasını tamamen engeller (kişisel veri)
--   2. Silmeyi her yerde engeller
--   3. Güncellemeyi yalnızca doğrulanmış kullanıcılara bırakır
--
-- Supabase paneli → SQL Editor'e yapıştırıp çalıştır. Sonrasında siteyi açıp
-- ilan girmeyi ve bir ihbara gönüllü olmayı dene — ikisi de çalışmalı.
-- ============================================================================


-- ── 1. HERKESE AÇIK İLAN TABLOLARI ─────────────────────────────────────────
-- Bunlar sitede zaten herkese gösteriliyor; okuma serbest kalmalı.
-- Yazma da serbest kalıyor (bugünkü davranış), ama silme kapanıyor.

alter table public.reports      enable row level security;
alter table public.animals      enable row level security;
alter table public.lf_listings  enable row level security;
alter table public.sitters      enable row level security;

create policy "reports_read"      on public.reports     for select to anon, authenticated using (true);
create policy "animals_read"      on public.animals     for select to anon, authenticated using (true);
create policy "lf_read"           on public.lf_listings for select to anon, authenticated using (true);
create policy "sitters_read"      on public.sitters     for select to anon, authenticated using (true);

create policy "reports_insert"    on public.reports     for insert to anon, authenticated with check (true);
create policy "animals_insert"    on public.animals     for insert to anon, authenticated with check (true);
create policy "lf_insert"         on public.lf_listings for insert to anon, authenticated with check (true);
create policy "sitters_insert"    on public.sitters     for insert to anon, authenticated with check (true);

-- Güncelleme: uygulamada tek bir yer var — bir ihbarı "yardım edildi" işaretlemek.
-- Doğrulanmış kullanıcıyla sınırlıyoruz; anonim biri artık ihbar kapatamaz.
create policy "reports_update_auth" on public.reports for update to authenticated
  using (true) with check (true);

-- DELETE için hiçbir politika yok → RLS açıkken silme tamamen reddedilir.


-- ── 2. GÖNÜLLÜLER ──────────────────────────────────────────────────────────
-- İhbar kartında gösteriliyor (reports sorgusu içinde iç içe okunuyor),
-- o yüzden okuma açık olmalı.
alter table public.volunteers enable row level security;
create policy "volunteers_read"   on public.volunteers for select to anon, authenticated using (true);
create policy "volunteers_insert" on public.volunteers for insert to anon, authenticated with check (true);


-- ── 3. KİŞİSEL VERİ TABLOLARI — OKUMA TAMAMEN KAPALI ───────────────────────
-- applications: sahiplenme başvurusu. Ad, soyad, telefon, adres, meslek,
--   çocukların yaşları, hane bilgisi, veteriner referansı.
-- adoption_profiles / rehome_listings: benzer şekilde kişisel.
--
-- Uygulama bu tabloları HİÇ okumuyor, sadece yazıyor. Dolayısıyla select
-- politikası tanımlamıyoruz: kimse okuyamaz. Sen panelden (service_role ile)
-- görmeye devam edersin.

alter table public.applications       enable row level security;
alter table public.adoption_profiles  enable row level security;
alter table public.rehome_listings    enable row level security;

create policy "applications_insert"      on public.applications      for insert to anon, authenticated with check (true);
create policy "adoption_profiles_insert" on public.adoption_profiles for insert to anon, authenticated with check (true);
create policy "rehome_insert"            on public.rehome_listings   for insert to anon, authenticated with check (true);


-- ── KONTROL ────────────────────────────────────────────────────────────────
-- Çalıştırdıktan sonra bununla doğrula: rowsecurity sütunu hepsinde true olmalı.
select tablename, rowsecurity
from pg_tables
where schemaname = 'public'
order by tablename;
