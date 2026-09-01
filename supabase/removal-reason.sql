-- ─────────────────────────────────────────────────────────────────────────────
-- İLANI KALDIRMA SEBEBİ + YUVALANANLAR SAYACI
--
-- Supabase → SQL Editor → yeni sorgu → hepsini yapıştır → Run.
-- Tek seferlik; tekrar çalıştırmak zarar vermez (if not exists).
--
-- Uygulama "Kaldır" düğmesine basıldığında sebebi soruyor:
--   yuvalandı              → status = 'adopted'  (ana sayfada sayılıyor)
--   artık iletişimde değil → status = 'removed'
--   (acil bildirimde tek sebep var: artık erişimim yok → 'removed')
--
-- Sebep aşağıdaki kolona yazılıyor. Kolon yoksa uygulama yine de çalışır,
-- sebebi kaydedemez — bu dosyayı çalıştırınca kaydetmeye başlar.
-- ─────────────────────────────────────────────────────────────────────────────

alter table public.animals     add column if not exists removed_reason text;
alter table public.lf_listings add column if not exists removed_reason text;
alter table public.reports     add column if not exists removed_reason text;

-- Ana sayfadaki "Yuvalandı" sayacı ve yuvasına kavuşanlar şeridi
-- status = 'adopted' satırlarını okuyor; listeler status = 'active' istiyor.
-- Bu indeks ikisini de hızlandırır.
create index if not exists animals_status_idx on public.animals (status);

-- Kontrol: her tabloda kolon duruyor mu?
select table_name, column_name
from information_schema.columns
where table_schema = 'public'
  and column_name = 'removed_reason'
order by table_name;
