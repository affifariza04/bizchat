# BizChat

AI Chatbot Layanan Pelanggan untuk UMKM — Tugas Besar (menuju UTS/UAS),
mata kuliah Manajemen Proyek dan Perubahan.

Dibuat general supaya bisa dipakai berbagai jenis usaha kecil-menengah
(retail, F&B, jasa) — bukan dikunci ke satu bisnis tertentu.

Backend Node.js/Express + knowledge base berbasis file JSON, dengan
fallback ke Gemini (Google AI) untuk pertanyaan di luar knowledge
base. Tanpa API key, aplikasi tetap jalan penuh — pertanyaan yang
tidak cocok otomatis "dieskalasi" ke staf (tersimpan di Dashboard).

## Menjalankan di komputer sendiri

Butuh Node.js versi 18 ke atas.

```bash
npm install
npm start
```

Buka `http://localhost:3000` di browser.

## Mengaktifkan AI (opsional, gratis)

1. Salin `.env.example` menjadi `.env`
2. Buka https://aistudio.google.com/apikey, login pakai akun Google, klik "Create API key" (gratis, tanpa kartu kredit)
3. Isi `GEMINI_API_KEY=...` di file `.env` dengan key yang didapat
4. Jalankan ulang `npm start`

Sidebar kiri akan menampilkan status "AI fallback: aktif" kalau key
terbaca dengan benar.

## Mengganti isi Knowledge Base untuk bisnis tertentu

Edit `data/kb.json` — isinya array kata kunci dan jawaban, contoh:

```json
{ "key": "garansi", "answer": "Produk kami bergaransi 7 hari untuk kerusakan pabrik." }
```

Atau edit langsung lewat halaman **Knowledge Base** di aplikasi (tombol "+ Tambah entri").

## Struktur project

```
bizchat/
├─ server.js          backend Express (API + serve frontend)
├─ public/
│  ├─ index.html       halaman app (Live Preview, Dashboard, Knowledge Base)
│  ├─ style.css        desain
│  └─ app.js           logic frontend (fetch ke API)
├─ data/
│  ├─ kb.json           knowledge base (bisa diedit manual atau lewat UI)
│  ├─ stats.json        statistik pemakaian
│  └─ escalations.json  antrean pertanyaan yang dieskalasi
└─ .env.example
```

## Deploy ke Render (gratis, no credit card)

1. Push folder ini ke repo GitHub baru
2. Buka render.com → Sign up pakai akun GitHub
3. Dashboard → New → Web Service → pilih repo `bizchat`
4. Build Command: `npm install` — Start Command: `npm start`
5. (Opsional) Tambahkan Environment Variable `GEMINI_API_KEY` biar AI aktif
6. Create Web Service — tunggu ±2 menit, dapat URL publik

Paket gratis Render "tidur" kalau tidak diakses 15 menit, nanti bangun
otomatis (agak lambat di request pertama) saat ada yang buka lagi —
cukup untuk demo tugas kuliah.

### Catatan keamanan sebelum hosting publik
- Jangan commit file `.env` ke git (sudah ada di `.gitignore`)
- `data/*.json` ditulis langsung oleh server — kalau trafik ramai, pertimbangkan migrasi ke database asli
- Belum ada autentikasi di halaman Dashboard/Knowledge Base — untuk demo kelas tidak masalah, tapi untuk produksi sungguhan perlu ditambah login admin
