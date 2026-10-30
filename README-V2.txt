PORTAL MULTIMEDIA SMKM4 — UPDATE & REDESIGN V3
==============================================

1. Struktur File Utama:
   - index.html + style.css : Landing page publik, galeri proyek (dilengkapi integrasi link Google Drive via atribut data-gdrive), dan showcase showreel video.
   - login.html + login.css + auth.js : Sistem autentikasi pengguna berbasis Firebase Auth & lookup role Firestore.
   - dashboard-absen.html + dashboard.css + dashboard.js : Panel dashboard absensi, grafik persentase kehadiran real-time, manajemen filter, dan ekspor data ExcelJS.
   - theme.css + motion.js + ui.js : Sistem visual obsidian, animasi transisi interaktif, toast notifikasi, dan custom modal konfirmasi.

2. Pembaruan & Fitur Terbaru (V3):
   - Integrasi link Google Drive aktif di card galeri proyek (contoh: Galeri Foto Paskibraka).
   - Pembaruan daftar spesifikasi hardware & software suite (kamera DSLR, CapCut, Lightroom, OBS Studio, Canva).
   - Penambahan sistem drawer administrator untuk input dan edit data absensi secara seamless.
   - Peningkatan responsivitas tampilan tabel data untuk perangkat mobile dan desktop.

3. Konfigurasi Sistem:
   - Sumber autentikasi dan database menggunakan Firebase Cloud Firestore & Authentication.
   - Pastikan menjalankan proyek melalui local server (Live Server / Vercel / Firebase Hosting) agar modul ES6 dan CDN berjalan normal tanpa diblokir browser.

CATETAN buat GitLens
1.Stage Semua File yang Diubah
  - git add .
2. Commit Perubahan dengan Pesan
  - git commit -m "NAMA FILE YG BERUBAH"
3. Push ke Repository GitHub (origin main)
  - git push origin main


# Portal Multimedia & Sistem Manajemen Kehadiran — SMKM 4 Jakarta (Redesign V3)

Dokumentasi dan catatan teknis resmi untuk pengembangan web Portal Multimedia SMK Muhammadiyah 4 Jakarta. Proyek ini memadukan halaman publik (landing page, showcase divisi, galeri karya interaktif) dengan sistem panel internal berbasis cloud (autentikasi dan absensi real-time).

---

## 1. Struktur Arsitektur & Modul File

### A. Halaman Publik & Landing Page
* **`index.html`**: Halaman utama portal yang mencakup:
  * **Navigasi Kapsul Mengambang (`#mainNav`)**: Menu responsif dengan dukungan *drawer* khusus perangkat mobile[cite: 36].
  * **Hero Section Dinamis**: Menampilkan pemutar latar belakang campuran (*mixed video & image crossfade*) otomatis pada layar desktop[cite: 36, 38].
  * **Metric Strip & Bento Grid Divisi**: Informasi statistik singkat serta 4 pilar keahlian utama (Film & Sinematografi, Multi-Cam & Streaming, Fotografi, dan Sistem Absensi)[cite: 36].
  * **Showreel Showcase & Galeri Proyek**: Pemutar video iframe YouTube dan arsip galeri dengan filter kategori serta atribut interaktif `data-gdrive` yang terhubung langsung ke Google Drive[cite: 36, 38].
  * **Infrastruktur Alat & Software**: Rincian perangkat keras (*hardware*) dan *software* suite produksi[cite: 36].
* **`app.js`**: Skrip pengendali interaksi halaman publik (navigasi mobile, lightbox modal galeri, filter kategori, dan *playlist* latar belakang hero)[cite: 38].
* **`style.css`**: Lembar gaya utama yang mengatur layout grid, efek *glassmorphism*, dan animasi transisi gulir[cite: 25].

### B. Sistem Autentikasi (`login.html` & `auth.js`)
* **`login.html`**: Halaman masuk dengan latar belakang orb interaktif dan tombol visibilitas kata sandi[cite: 37].
* **`auth.js`**: Mengelola proses verifikasi kredensial menggunakan Firebase Authentication dan pengecekan hak akses (*role lookup*) pada koleksi Firestore (`users/{uid}`) untuk menentukan status `admin` atau `member`[cite: 31, 39].

### C. Panel Dashboard Absensi (`dashboard-absen.html` & `dashboard.js`)
* **`dashboard-absen.html`**: Panel kontrol rekapitulasi kehadiran dengan fitur jam aktif real-time, bilah pencarian instan, filter bulan/tanggal, bento metric cards, tabel data modern, dan *admin drawer* (panel geser)[cite: 31, 35].
* **`dashboard.js`**: Otak logika dashboard yang menangani sinkronisasi data real-time via `onSnapshot` Firestore serta pembangkitan laporan instan ke format Excel menggunakan library `ExcelJS`[cite: 31].

### D. Sistem Pendukung Global
* **`ui.js`**: Sistem notifikasi *toast* mengambang (`window.toast`) dan modal konfirmasi kustom (`window.confirmModal`)[cite: 19].
* **`theme.css`**: Palet warna Obsidian, sistem tipografi (*Plus Jakarta Sans* & *JetBrains Mono*), dan kelas utilitas[cite: 24].
* **`motion.js`**: Interaksi animasi gulir (`IntersectionObserver`), efek kilau sorot (`glow-surface`), dan tombol bermagnet[cite: 20].

---

## 2. Aturan Keamanan & Konfigurasi Teknis
* **Firebase Security Rules**: Pastikan aturan keamanan Firestore membatasi akses tulis (*write/update/delete*) pada koleksi `absensi` hanya untuk pengguna dengan `role == "admin"`[cite: 26].
* **Lingkungan Menjalankan Proyek**: Karena menggunakan modul ES6 (`type="module"`) dan impor pustaka CDN, jalankan web melalui server lokal (seperti *Live Server* di VS Code) atau unggah ke platform hosting statis (Vercel, Netlify, Firebase Hosting) untuk menghindari pemblokiran protokol `file://` oleh browser[cite: 26].