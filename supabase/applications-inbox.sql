-- ─────────────────────────────────────────────────────────────────────────────
-- İLANIMA GELEN BAŞVURULAR
--
-- Supabase → SQL Editor → yapıştır → Run. Tekrar çalıştırmak zararsız.
--
-- Bugün başvuruyu yalnızca BAŞVURAN okuyabiliyor (applications_read_own).
-- İlan sahibi, kendi ilanına gelen başvuruyu uygulamada göremiyor; tek kopyası
-- e-postasında duruyor. Aşağıdaki iki politika ilan sahibine, SADECE kendi
-- ilanına gelen başvurular için okuma ve durum güncelleme yetkisi veriyor.
--
-- E-posta istemciden gelen bir filtreden değil, oturum token'ından okunuyor:
-- biri sorguyu değiştirse bile başkasının başvurusunu göremiyor.
-- ─────────────────────────────────────────────────────────────────────────────

drop policy if exists "applications_read_for_owner" on public.applications;
create policy "applications_read_for_owner" on public.applications for select to authenticated
  using (listing_owner_email = auth.jwt() ->> 'email');

drop policy if exists "applications_update_for_owner" on public.applications;
create policy "applications_update_for_owner" on public.applications for update to authenticated
  using      (listing_owner_email = auth.jwt() ->> 'email')
  with check (listing_owner_email = auth.jwt() ->> 'email');

-- Başvuru durumu: pending | reviewing | accepted | declined. Kolon zaten var
-- (kayıtlar "pending" ile açılıyor); eski satırlarda boş kalmışsa dolduruyoruz.
update public.applications set status = 'pending' where status is null or status = '';

-- İlan sahibi "Değerlendiriyorum" dediğinde ilanın kendisi de işaretleniyor:
-- karta "Başvuru değerlendiriliyor" rozeti düşüyor, ilana bakan başka biri de
-- sürecin işlediğini görüyor. İlan listede kalmaya devam ediyor.
alter table public.animals add column if not exists under_review boolean not null default false;

-- Kontrol
select policyname, cmd from pg_policies
 where schemaname = 'public' and tablename = 'applications'
 order by policyname;
