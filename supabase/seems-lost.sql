-- ─────────────────────────────────────────────────────────────────────────────
-- "SAHİPLİ GÖRÜNÜYOR" — BİLDİRİMİ KAYIP & BULUNDU'YA DA DÜŞÜRME
--
-- Supabase → SQL Editor → yapıştır → Run. Tek seferlik, tekrarı zararsız.
--
-- Bildirim formundaki "Sahipli görünüyor — kayıp olabilir" seçeneği işaretlenince
-- aynı hayvan Kayıp & Bulundu'da "bulundu" ilanı olarak da yayınlanıyor. Aşağıdaki
-- kolon o ilanı kaynak bildirime bağlar: bildirim kaldırılınca ilan da kalkar,
-- geri alınınca ilan da geri gelir.
--
-- Kolon olmadan uygulama yine çalışır — ilan bağlantısız açılır, sadece bildirimle
-- birlikte kalkmaz.
-- ─────────────────────────────────────────────────────────────────────────────

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

-- Kontrol
select column_name, data_type
from information_schema.columns
where table_schema = 'public' and table_name = 'lf_listings'
  and column_name = 'source_report_id';
