-- ============================================================================
-- Paweero — TEK SEFERDE KURULUM
--
-- Supabase paneli → SQL Editor → yeni sorgu → HEPSİNİ yapıştır → Run.
-- Telefondan da yapılabilir: supabase.com/dashboard → proje → SQL Editor.
--
-- Bu dosya üç ayrı dosyanın birleşimi:
--   1) rls-policies.sql   — kişisel verileri korur, silmeyi kapatır  (ÖNEMLİ)
--   2) removal-reason.sql — ilanı neden kaldırdığını kaydeder
--   3) seems-lost.sql     — bildirimi kayıp/bulundu ilanına bağlar
--
-- Tekrar tekrar çalıştırılabilir: politikalar önce siliniyor, kolonlar
-- "if not exists" ile ekleniyor. Yarıda kalırsa baştan çalıştırman yeterli.
--
-- Bittikten sonra siteyi aç ve şunları dene — üçü de çalışmalı:
--   • ilan ver   • bir bildirime gönüllü ol   • kendi ilanını kaldır
-- ============================================================================


-- ════════════════════════════════════════════════════════════════════════════
-- BÖLÜM 1 — GÜVENLİK (RLS)
-- ════════════════════════════════════════════════════════════════════════════

-- ── 1. HERKESE AÇIK İLAN TABLOLARI ─────────────────────────────────────────
-- Bunlar sitede zaten herkese gösteriliyor; okuma serbest kalmalı.
-- Yazma da serbest kalıyor (bugünkü davranış), ama silme kapanıyor.

alter table public.reports      enable row level security;
alter table public.animals      enable row level security;
alter table public.lf_listings  enable row level security;
alter table public.sitters      enable row level security;

drop policy if exists "reports_read" on public.reports;
create policy "reports_read"      on public.reports     for select to anon, authenticated using (true);
drop policy if exists "animals_read" on public.animals;
create policy "animals_read"      on public.animals     for select to anon, authenticated using (true);
drop policy if exists "lf_read" on public.lf_listings;
create policy "lf_read"           on public.lf_listings for select to anon, authenticated using (true);
drop policy if exists "sitters_read" on public.sitters;
create policy "sitters_read"      on public.sitters     for select to anon, authenticated using (true);

drop policy if exists "reports_insert" on public.reports;
create policy "reports_insert"    on public.reports     for insert to anon, authenticated with check (true);
drop policy if exists "animals_insert" on public.animals;
create policy "animals_insert"    on public.animals     for insert to anon, authenticated with check (true);
drop policy if exists "lf_insert" on public.lf_listings;
create policy "lf_insert"         on public.lf_listings for insert to anon, authenticated with check (true);
drop policy if exists "sitters_insert" on public.sitters;
create policy "sitters_insert"    on public.sitters     for insert to anon, authenticated with check (true);

-- ── GÜNCELLEME ─────────────────────────────────────────────────────────────
-- İhbarı "yardım edildi" işaretlemeyi ilanı açan değil, YARDIM EDEN yapıyor.
-- Bu bilinçli bir ürün kararı, o yüzden sahip şartı koyamayız; doğrulanmış
-- kullanıcı olmak yeterli. Anonim biri artık ihbar kapatamaz.
-- Bunun bedeli: doğrulanmış bir kullanıcı teknik olarak başkasının ihbarını da
-- güncelleyebilir. Uygulama yalnızca kendi ihbarına düğme gösteriyor; daha sıkısı
-- gerekirse kolon bazlı kontrol için trigger yazmak gerekir.
drop policy if exists "reports_update_auth" on public.reports;
create policy "reports_update_auth" on public.reports for update to authenticated
  using (true) with check (true);

-- Hayvan ilanı ve kayıp/bulundu ilanı yalnızca SAHİBİ tarafından değiştirilebilir.
-- E-posta oturum token'ından okunuyor, istemciden gelen filtreye güvenilmiyor.
drop policy if exists "animals_update_own" on public.animals;
create policy "animals_update_own" on public.animals for update to authenticated
  using (submitter_email = auth.jwt() ->> 'email')
  with check (submitter_email = auth.jwt() ->> 'email');

drop policy if exists "lf_update_own" on public.lf_listings;
create policy "lf_update_own" on public.lf_listings for update to authenticated
  using (contact_email = auth.jwt() ->> 'email')
  with check (contact_email = auth.jwt() ->> 'email');

-- DELETE için hiçbir politika yok → silme her yerde reddedilir. Uygulamadaki
-- "Kaldır" düğmesi kaydı silmiyor, status alanını "removed" yapıyor: ilana
-- yapılmış başvurular kopmuyor ve işlem geri alınabilir.


-- ── 2. GÖNÜLLÜLER ──────────────────────────────────────────────────────────
-- İhbar kartında gösteriliyor (reports sorgusu içinde iç içe okunuyor),
-- o yüzden okuma açık olmalı.
alter table public.volunteers enable row level security;
drop policy if exists "volunteers_read" on public.volunteers;
create policy "volunteers_read"   on public.volunteers for select to anon, authenticated using (true);
drop policy if exists "volunteers_insert" on public.volunteers;
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

drop policy if exists "applications_insert" on public.applications;
create policy "applications_insert"      on public.applications      for insert to anon, authenticated with check (true);

-- Tek istisna: "Hesabım → Başvurularım" ekranı kullanıcının KENDİ başvurularını
-- listeliyor. Politika e-postayı oturum token'ından okur, istemciden gelen
-- filtreye güvenmez — yani biri sorguyu değiştirse bile başkasının başvurusunu
-- göremez.
drop policy if exists "applications_read_own" on public.applications;
create policy "applications_read_own" on public.applications for select to authenticated
  using (applicant_email = auth.jwt() ->> 'email');
drop policy if exists "adoption_profiles_insert" on public.adoption_profiles;
create policy "adoption_profiles_insert" on public.adoption_profiles for insert to anon, authenticated with check (true);
drop policy if exists "rehome_insert" on public.rehome_listings;
create policy "rehome_insert"            on public.rehome_listings   for insert to anon, authenticated with check (true);





-- ════════════════════════════════════════════════════════════════════════════
-- BÖLÜM 2 — KALDIRMA SEBEBİ
-- ════════════════════════════════════════════════════════════════════════════

alter table public.animals     add column if not exists removed_reason text;
alter table public.lf_listings add column if not exists removed_reason text;
alter table public.reports     add column if not exists removed_reason text;

-- Ana sayfadaki "Yuvalandı" sayacı ve yuvasına kavuşanlar şeridi
-- status = 'adopted' satırlarını okuyor; listeler status = 'active' istiyor.
-- Bu indeks ikisini de hızlandırır.
create index if not exists animals_status_idx on public.animals (status);


-- ════════════════════════════════════════════════════════════════════════════
-- BÖLÜM 3 — BİLDİRİM ↔ KAYIP & BULUNDU BAĞLANTISI
-- ════════════════════════════════════════════════════════════════════════════

-- Kolon tipi reports.id ile aynı olsun (bigint mi uuid mi, şemaya göre değişir).
do $$
declare id_type text;
begin
  if exists (select 1 from information_schema.columns
             where table_schema = 'public' and table_name = 'lf_listings'
               and column_name = 'source_report_id') then
    return;
  end if;
  select data_type into id_type from information_schema.columns
   where table_schema = 'public' and table_name = 'reports' and column_name = 'id';
  execute format('alter table public.lf_listings add column source_report_id %s',
                 coalesce(id_type, 'bigint'));
end $$;

create index if not exists lf_source_report_idx on public.lf_listings (source_report_id);


-- ════════════════════════════════════════════════════════════════════════════
-- KONTROL — hepsi yerinde mi?
-- ════════════════════════════════════════════════════════════════════════════

select 'politika' as ne, tablename as nerede, policyname as ad
  from pg_policies where schemaname = 'public'
union all
select 'kolon', table_name, column_name
  from information_schema.columns
 where table_schema = 'public'
   and column_name in ('removed_reason', 'source_report_id')
order by ne, nerede, ad;
