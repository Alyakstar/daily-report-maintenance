# Maintenance Daily Report — Supabase + GitHub Pages

Versi ini sudah tidak memakai localStorage untuk data report. Data disimpan di Supabase PostgreSQL dan foto di Supabase Storage.

## 1. Buat Supabase project
1. Buka https://supabase.com/dashboard
2. Create new project
3. Tunggu project ready

## 2. Buat database + bucket
1. Supabase Dashboard > SQL Editor > New query
2. Buka file `supabase/setup.sql`
3. Copy seluruh SQL, Run

> SQL ini memakai policy prototype public read/write agar cepat untuk demo. Untuk production perusahaan, tambahkan Supabase Auth dan policy per-user/role.

## 3. Ambil URL dan Publishable Key
Supabase Dashboard > Connect (atau Settings > API Keys).

Gunakan:
- Project URL
- Publishable key (`sb_publishable_...`) / legacy anon key bila project lama

JANGAN pakai secret key / service_role di frontend.

## 4. Jalankan lokal
Copy `.env.example` menjadi `.env`, lalu isi:

```env
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_xxxxx
```

Lalu:

```bash
npm install
npm run dev
```

## 5. Test sebelum deploy
1. Input Daily Report
2. Preview
3. Save to Supabase
4. Buka Report History
5. Refresh browser — data harus tetap ada
6. Buka Supabase > Table Editor > daily_reports — row harus muncul
7. Upload foto — cek Supabase > Storage > report-images

## 6. Push ke GitHub
Di terminal folder project:

```bash
git init
git add .
git commit -m "Initial daily report Supabase"
git branch -M main
git remote add origin https://github.com/USERNAME/NAMA-REPO.git
git push -u origin main
```

## 7. Tambahkan GitHub Secrets
Repository GitHub > Settings > Secrets and variables > Actions > New repository secret.

Buat dua secrets:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`

Isi dengan value yang sama seperti `.env` lokal.

## 8. Enable GitHub Pages
Repository > Settings > Pages > Build and deployment > Source = `GitHub Actions`.

File `.github/workflows/deploy.yml` sudah disediakan. Push ke `main` akan build dan deploy otomatis.

## Catatan routing
Project memakai `HashRouter` supaya route seperti Dashboard / Input / History tetap aman di GitHub Pages tanpa error 404 saat refresh.
