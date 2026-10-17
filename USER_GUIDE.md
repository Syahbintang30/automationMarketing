# Panduan Penggunaan Lengkap (User Guide)
## Google Maps Scraper, Screening & Cold Call Hub

Panduan praktis untuk operator/pengguna dalam melakukan **scraping data instansi pemerintah dan perusahaan dari Google Maps**, melakukan **screening cold call** langsung di web, dan melakukan **export ke file Excel (.xlsx)** siap pakai.

---

## 📌 Alur Kerja Cepat (Workflow)

```
[1. Ketik Keyword di GMaps Scraper]  -->  [2. Scraper Menarik Data Real]
                                                      │
[4. Export ke Excel (.xlsx)]         <--  [3. Screening & Catat Hasil Cold Call]
```

---

## 🚀 Cara 1: Menggunakan Web Dashboard (Rekomendasi)

Tampilan visual memudahkan Anda melihat nomor telepon, klik untuk langsung telepon, memberikan status screening, menulis catatan hasil pembicaraan, dan export ke Excel.

### 1. Buka Aplikasi di Browser:
Pastikan server berjalan, lalu buka:
👉 **`http://localhost:5173`**

Pilih menu **🗺️ GMaps & Cold Call** di bilah navigasi sebelah kiri.

### 2. Tarik Data Baru dari Google Maps:
1. Di kotak pencarian **"Tarik Data Baru dari Google Maps"**, ketik target Anda:
   * Contoh Instansi Pemerintah: `"dinas perhubungan bandung"`, `"dinas kesehatan jawa barat"`, `"kantor walikota surabaya"`
   * Contoh Perusahaan / Bisnis: `"pt kontraktor jakarta"`, `"pabrik manufaktur cikarang"`, `"perusahaan logistik semarang"`
2. Pilih **Jumlah Target** (10, 20, 30, atau 50 data).
3. Klik tombol **"🚀 Mulai Scraping"**.
4. Sistem membuka browser Google Chrome di background, mengambil data real (Nama, Nomor Telepon, Alamat, Kategori, Rating, Link Maps), dan otomatis menyimpannya ke database.

### 3. Screening Data & Cold Calling Langsung di Tabel:
* **📞 Panggilan Telepon Cepat:** Klik nomor telepon (berwarna biru muda) untuk langsung melakukan panggilan via softphone/ponsel Anda. Ada tombol salin 📋 untuk copy-paste nomor dengan cepat.
* **📋 Update Status Cold Call:** Klik dropdown status per baris:
  * ⏳ *Belum Dihubungi* (Status awal)
  * 🎯 *Tertarik / Prospek* (Target potensial)
  * 📞 *Follow Up* (Minta dihubungi lagi)
  * 📵 *Tidak Diangkat / Sibuk*
  * ❌ *Nomor Salah / Tutup*
  * 🚫 *Bukan Target* (Untuk disaring)
* **📝 Tulis Catatan Cold Call:** Ketik langsung di kolom catatan (contoh: *"Bicara dengan Pak Hendra bagian Pengadaan, minta proposal dikirim hari Senin"*). Cukup tekan `Enter` atau klik di luar kotak, catatan tersimpan otomatis.
* **🗑️ Buang yang Bukan Target:** Centang data yang tidak relevan, lalu klik tombol merah **"🗑️ Hapus yang Dipilih (Screening)"**.

### 4. Export ke Excel (.xlsx) Siap Pakai:
1. Klik tombol hijau **"📊 Export Excel (.xlsx)"** di pojok kanan atas.
2. File Excel langsung terunduh rapi dengan kolom:
   * `No`
   * `Nama Instansi / Perusahaan`
   * `📞 Nomor Telepon`
   * `Status Cold Call`
   * `Catatan Cold Call`
   * `Kategori`
   * `Kota / Kab & Provinsi`
   * `Alamat Lengkap`
   * `Website`
   * `Rating & Ulasan`
   * `Link Google Maps`

---

## 💻 Cara 2: Menggunakan Terminal / Command Line (Bot CLI)

Bagi yang ingin scraping super cepat langsung menghasilkan file Excel tanpa buka browser:

Cukup jalankan di terminal:
```bash
# Contoh 1: Tarik dinas kesehatan bandung
npm run bot -- "dinas kesehatan bandung" --limit=20

# Contoh 2: Tarik pabrik manufaktur cikarang
npm run bot -- "pabrik manufaktur cikarang" --limit=30

# Contoh 3: Output format CSV
npm run bot -- "pt kontraktor jakarta" --csv
```

File Excel hasil scraping langsung tersimpan otomatis di folder:
📂 `backend/exports/gmaps_[nama_pencarian]_[tanggal].xlsx`

---
```

#### Contoh-Contoh Perintah Siap Pakai:
* **Mencari Hotel & Resto di Bandung format Excel:**
  ```bash
  npm run bot -- --province="Jawa Barat" --city="Kota Bandung" --category="Hotel & Resto" --limit=30 --format=xlsx
  ```
* **Mencari Software House / IT di Jakarta Pusat format CSV:**
  ```bash
  npm run bot -- --province="DKI Jakarta" --city="Jakarta Pusat" --category="Software House" --limit=25 --format=csv
  ```
* **Mencari Klinik & Rumah Sakit di Surabaya:**
  ```bash
  npm run bot -- --province="Jawa Timur" --city="Kota Surabaya" --category="Klinik" --limit=20 --format=xlsx
  ```

### Di Mana File Hasilnya Tersimpan?
File Excel/CSV otomatis disimpan di folder:
👉 **`backend/exports/`**  
*(Nama file berisi nama provinsi dan jam unduh, contoh: `leads_Jawa_Barat_2026-10-17.xlsx`)*.

---

## Fitur 2: Halaman Dashboard & Statistik

Halaman pertama saat Anda membuka Web Dashboard di browser.

### Apa yang Bisa Anda Lakukan di Sini?
1. **Melihat Kartu Metrik Utama (KPI):**
   * **Total Leads Discovered:** Jumlah keseluruhan bisnis yang berhasil ditemukan dan tersimpan di database.
   * **Drafts Awaiting Approval:** Jumlah draf email buatan AI yang sedang menunggu persetujuan Anda.
   * **Emails Dispatched:** Total email yang sudah berhasil terkirim.
   * **Suppressed / Opt-Out:** Jumlah kontak yang meminta berhenti berlangganan (otomatis diblokir demi kepatuhan UU PDP).
2. **Melihat Distribusi Daerah & Kategori:**
   * Grafik persentase persebaran leads per provinsi (Jawa Barat, DKI Jakarta, Jawa Timur, dll.).
   * Grafik kelompok bisnis (Software House, Hotel, Cafe, Manufaktur, dll.).
3. **Tombol "Export Leads (Excel)":**
   * Klik tombol ini di pojok kanan atas untuk langsung mengunduh seluruh database leads ke file Excel `.xlsx`.

---

## Fitur 3: Manajemen Kampanye (Campaigns)

Menu **Campaigns** digunakan untuk membuat strategi pencarian terarah berdasarkan wilayah geografis dan penawaran layanan Wardell Tech.

### Cara Membuat Kampanye Baru:
1. Klik menu **"Campaigns"** di sidebar kiri.
2. Klik tombol biru **"➕ New Campaign"** di pojok kanan atas.
3. Isi formulir yang muncul:
   * **Campaign Name:** Nama kampanye Anda (contoh: *Penawaran Website UMKM Kuliner Bandung*).
   * **Target Province:** Pilih provinsi target (contoh: *Jawa Barat*).
   * **Target City / Regency:** Masukkan nama kota/kabupaten (contoh: *Kota Bandung*).
   * **Business Category:** Masukkan jenis usaha target (contoh: *Cafe, Restoran, Bakery*).
   * **Wardell Tech Service Offering:** Layanan yang ingin ditawarkan (contoh: *Pembuatan Website Profil Perusahaan Modern & Sistem Kasir Online*).
   * **Daily Email Send Limit:** Batas maksimal pengiriman per hari (disarankan 25-30 email/hari agar akun email aman).
4. Klik **"Create Campaign"**.

### Cara Menjalankan Scraping dari Kampanye:
* Pada tabel kampanye, klik tombol **"🔍 Scrape"**.
* Sistem akan otomatis mencari bisnis sesuai kota dan kategori yang Anda tentukan di kampanye tersebut.

### Cara Generate Email AI dari Kampanye:
* Klik tombol **"🤖 Draft"** pada kampanye tersebut.
* AI akan otomatis membaca data profil bisnis yang sudah ditemukan dan menulis draf email penawaran yang dipersonalisasi.

### Cara Menghentikan / Menjeda Kampanye:
* Klik tombol **"⏸ Pause"** untuk menghentikan sementara pengiriman email kampanye ini.
* Klik **"▶ Resume"** untuk mengaktifkannya kembali.

---

## Fitur 4: Manajemen Leads & Ekspor Spreadsheet

Menu **Leads & Provenance** adalah tempat Anda melihat, menyaring, dan mengunduh seluruh data calon klien yang sudah terkumpul.

### Cara Menyaring & Mencari Data Leads:
1. Masuk ke menu **"Leads & Provenance"**.
2. Gunakan kolom filter di bagian atas:
   * **Search Business / Email:** Ketik nama PT/CV atau alamat email untuk mencari data spesifik.
   * **Province:** Filter berdasarkan provinsi (misal: *Jawa Barat*).
   * **City:** Filter berdasarkan kota (misal: *Bandung*).
   * **Outreach Status:** Filter berdasarkan status komunikasi (*NOT_CONTACTED*, *AWAITING_APPROVAL*, *SENT*, *OPTED_OUT*).

### Memeriksa Asal-Usul Data (Provenance):
* Setiap lead menampilkan label verifikasi:
  * **VERIFIED (Hijau):** Email resmi ditemukan langsung di halaman kontak website resmi perusahaan.
  * **UNVERIFIED (Kuning):** Email bersumber dari direktori publik dan belum diverifikasi ulang di websitenya.
* Klik tautan **"Provenance Link ↗"** untuk membuka langsung URL halaman web tempat email tersebut ditemukan.

### Cara Ekspor ke Excel atau CSV:
* Klik tombol **"📊 Export Excel (XLSX)"** untuk mengunduh format Excel lengkap dengan tabel yang sudah rapi dan berwarna.
* Klik tombol **"📄 Export CSV"** jika Anda membutuhkan format teks CSV.
* *Catatan Keamanan:* Semua teks otomatis diproteksi dari formula injection (aman dibuka di Excel tanpa risiko virus formula).

---

## Fitur 5: Pembuatan Draf Email AI & Review Draf

Sistem mengadopsi prinsip **Human-in-the-Loop** (Wajib Persetujuan Manusia). AI **TIDAK AKAN PERNAH** mengirim email sendiri tanpa persetujuan Anda.

### Cara Mereview dan Mengedit Email:
1. Klik menu **"Email Review"** di sidebar.
2. Di sebelah kiri, Anda akan melihat daftar antrean draf email yang dibuat AI.
3. Klik salah satu bisnis di daftar kiri untuk melihat isi emailnya di panel kanan.
4. Periksa:
   * **Email Subject:** Judul email yang dibuat AI. Anda bisa langsung mengedit teksnya jika dirasa kurang pas.
   * **Email Body:** Isi pesan email dalam Bahasa Indonesia. Anda bebas menambah, mengurangi, atau memoles kalimatnya di kotak teks tersebut.
   * **Bagian Bawah:** Pastikan tautan berhenti berlangganan (*unsubscribe*) tetap ada demi kepatuhan hukum.
5. Klik **"💾 Save Changes"** jika Anda melakukan perubahan teks.

### Cara Menyetujui (Approve):
* Jika email sudah sesuai, klik tombol hijau **"✓ Approve & Move to Queue"**.
* Draf ini sekarang berstatus `APPROVED` dan siap masuk ke antrean pengiriman.

### Cara Menolak (Reject):
* Jika bisnis tersebut ternyata tidak cocok untuk ditawari, klik tombol merah **"✕ Reject Draft"**.
* Masukkan alasan penolakan (misal: *Bisnis sudah punya website canggih*). Email ini tidak akan dikirim.

---

## Fitur 6: Antrean Pengiriman (Sending Queue) & Kontrol Pause

Menu **Sending Queue** berfungsi untuk memantau proses pengiriman email ke klien serta menjadi "rem darurat" pengiriman.

### Cara Mengirimkan Email yang Sudah Disetujui:
1. Pastikan Anda sudah menyetujui minimal 1 draf di menu *Email Review*.
2. Klik menu **"Sending Queue"**.
3. Klik tombol biru **"⚡ Process Queue Now"**.
4. Sistem akan menjalankan 7 lapis pengecekan keamanan:
   * Memastikan kampanye tidak sedang di-pause.
   * Memastikan penerima belum pernah dikirimi email yang sama (anti-spam duplikat).
   * Memastikan penerima tidak ada di daftar blokir (Suppression List).
   * Memastikan tidak melebihi kuota harian kampanye.
   * Jika sistem dalam mode `DRY_RUN=true`, email disimulasikan secara aman tanpa menyentuh inbox klien asli.
5. Anda akan menerima pop-up laporan: berapa email yang berhasil terkirim, berapa yang dilewati, dan berapa yang diblokir.

### Tombol Rem Darurat (Pause Global Sending):
* Jika Anda ingin menghentikan seluruh aktivitas pengiriman email di semua kampanye sekaligus, klik tombol merah **"⏸ Pause Global Sending"**.
* Saat tombol ini aktif, tidak ada satu pun email yang bisa keluar.
* Untuk mengaktifkan kembali, klik **"▶ Resume Global Sending"**.

---

## Fitur 7: Daftar Blokir & Opt-Out (Suppression List)

Fitur ini menjamin kepatuhan terhadap **UU Pelindungan Data Pribadi (UU PDP No. 27/2022)** dan **UU ITE**.

### Bagaimana Sistem Ini Bekerja?
1. **Otomatis melalui Link Email:**
   * Di setiap email yang dikirim, ada tautan resmi:
     `.../api/v1/opt-out?email=...&token=...`
   * Jika penerima mengklik link tersebut, sistem akan langsung memasukkan email mereka ke daftar blokir dan menampilkan halaman konfirmasi berhenti berlangganan dalam Bahasa Indonesia.
   * Di masa depan, meskipun bot melakukan scraping ulang dan menemukan email yang sama, bot **tidak akan pernah** memasukkannya ke antrean pengiriman lagi.
2. **Manual oleh Operator:**
   * Masuk ke menu **"Suppression List"**.
   * Klik tombol **"➕ Add Manual Suppression"**.
   * Masukkan alamat email yang ingin di-blacklist dan alasannya (misal: *Komplain via WhatsApp / Permintaan telepon*).
   * Klik **"Add to Suppression List"**.

---

## Fitur 8: Pengaturan Integrasi & Akun Gmail

Menu **Integrations** menampilkan status koneksi pihak ketiga:
1. **Gmail API (OAuth 2.0):**
   * Menampilkan apakah akun Gmail pengirim sudah terhubung atau belum.
   * Semua token login Google yang tersimpan di database telah dienkripsi dengan standar **AES-256-GCM** sehingga aman dari pencurian.
2. **Google Places API (New):**
   * Menampilkan status kepatuhan integrasi Google Maps Platform.
3. **AI Generation Engine:**
   * Menampilkan status provider AI (Google Gemini 1.5 Flash atau OpenAI).
4. **Database & Redis:**
   * Menampilkan status kesehatan database PostgreSQL lokal dan antrean BullMQ.

---

## 10. FAQ & Solusi Kendala Umum

#### Q1: "Apakah bot aman dari pemblokiran saat scraping?"
* **A:** Sangat aman. Bot membaca file `robots.txt` situs web terlebih dahulu dan menggunakan jeda waktu alami (*rate limit*) serta User-Agent resmi.

#### Q2: "Apakah aman membuka file Excel hasil ekspor di komputer Windows/Mac?"
* **A:** Sangat aman. Sistem memiliki fitur sterilisasi formula injection. Teks bisnis yang diawali karakter seperti `=`, `+`, `-`, `@` otomatis dinetralkan sehingga tidak akan memicu virus makro atau eksekusi formula jahat di Excel.

#### Q3: "Bagaimana cara mengganti kata sandi admin?"
* **A:** Anda dapat menjalankan seed ulang atau mengubah password hash di database PostgreSQL menggunakan bcrypt. Password default awal adalah `WardellAdmin2026!`.

#### Q4: "Di mana saya bisa melihat riwayat pengiriman email yang gagal?"
* **A:** Buka menu **Sending Queue**, lihat kolom *Dispatch Status*. Jika ada email gagal, keterangan error spesifik (misal: *Domain email tidak aktif*) akan ditampilkan dengan warna merah di bawah status pengiriman.
