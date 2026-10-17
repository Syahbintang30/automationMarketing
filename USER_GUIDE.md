# Panduan Penggunaan Lengkap (User Guide)
## Wardell Lead Engine — AI Lead Generation & Outreach Automation

Buku panduan ini dibuat khusus untuk memandu pengguna/operator dalam menjalankan dan menggunakan setiap fitur pada sistem **Wardell Lead Engine**, baik melalui **Bot Terminal (CLI)** maupun **Tampilan Web Dashboard**.

---

## 📌 Daftar Isi
1. [Langkah Awal: Menjalankan Aplikasi](#1-langkah-awal-menjalankan-aplikasi)
2. [Fitur 1: Bot Scraper Otomatis ke Excel / CSV (Terminal)](#fitur-1-bot-scraper-otomatis-ke-excel--csv-terminal)
3. [Fitur 2: Halaman Dashboard & Statistik](#fitur-2-halaman-dashboard--statistik)
4. [Fitur 3: Manajemen Kampanye (Campaigns)](#fitur-3-manajemen-kampanye-campaigns)
5. [Fitur 4: Manajemen Leads & Ekspor Spreadsheet](#fitur-4-manajemen-leads--ekspor-spreadsheet)
6. [Fitur 5: Pembuatan Draf Email AI & Review Draf](#fitur-5-pembuatan-draf-email-ai--review-draf)
7. [Fitur 6: Antrean Pengiriman (Sending Queue) & Kontrol Pause](#fitur-6-antrean-pengiriman-sending-queue--kontrol-pause)
8. [Fitur 7: Daftar Blokir & Opt-Out (Suppression List)](#fitur-7-daftar-blokir--opt-out-suppression-list)
9. [Fitur 8: Pengaturan Integrasi & Akun Gmail](#fitur-8-pengaturan-integrasi--akun-gmail)
10. [FAQ & Solusi Kendala Umum](#10-faq--solusi-kendala-umum)

---

## 1. Langkah Awal: Menjalankan Aplikasi

Aplikasi memiliki dua mode penggunaan:
* **Mode Bot Terminal:** Cocok jika Anda hanya butuh data mentah ke Excel/CSV secepat mungkin.
* **Mode Web Dashboard:** Cocok untuk mengatur kampanye, melihat statistik visual, mengedit draf email AI, dan memantau status pengiriman.

### Membuka Web Dashboard:
1. Buka terminal di folder project:
   ```bash
   # Terminal 1 - Menjalankan Backend API:
   npm run dev:backend
   ```
2. Buka tab terminal baru:
   ```bash
   # Terminal 2 - Menjalankan Tampilan Web:
   npm run dev:frontend
   ```
3. Buka browser ke alamat: **`http://localhost:5173`**
4. **Akun Login Bawaan:**
   * **Email:** `admin@wardell.tech`
   * **Password:** `WardellAdmin2026!`

---

## Fitur 1: Bot Scraper Otomatis ke Excel / CSV (Terminal)

Fitur ini memungkinkan Anda melakukan scraping data bisnis dan kontak resmi langsung dari terminal tanpa perlu membuka browser.

### Cara Menjalankan:
Cukup ketik perintah di terminal:
```bash
npm run bot
```

### Mengatur Target Daerah dan Kategori Sendiri:
Tambahkan parameter sesuai target pencarian Anda:

```bash
npm run bot -- --province="[Nama Provinsi]" --city="[Nama Kota]" --category="[Jenis Bisnis]" --limit=[Jumlah Data] --format=[xlsx atau csv]
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
