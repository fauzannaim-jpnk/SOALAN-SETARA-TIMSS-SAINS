# Bank Soalan Interaktif TIMSS — Sains (JPNK Kedah)

Laman web statik berasingan untuk bank soalan interaktif TIMSS subjek **Sains**.
297 soalan, sumbangan guru-guru seluruh negeri Kedah.

## Cara Deploy ke GitHub Pages

1. Cipta repositori GitHub BAHARU (cth. `bank-soalan-sains-timss-kedah`) — **berasingan**
   daripada repo Matematik.
2. Muat naik SEMUA fail dalam folder ini (`index.html`, `style.css`, `app.js`,
   `questions.json`) terus ke ROOT repositori tersebut.
3. Settings → Pages → Source: **Deploy from a branch**, branch `main`, folder `/ (root)` → Save.
4. Tunggu 1-2 minit. Laman akan hidup di:
   `https://<nama-akaun-github>.github.io/bank-soalan-sains-timss-kedah/`

## Kemas kini data

Edit `questions.json` — setiap soalan ialah satu objek `{id, guru, sekolah, topik, slug, html}`.
`id` mesti unik dalam fail ini.

## Sistem Log Masuk Murid & Log Penggunaan

Laman ini kini memerlukan murid **log masuk dengan ID Pelajar** sebelum
senarai soalan dipaparkan. Log masuk dan log penggunaan dikongsi dengan
laman **Matematik** — jadi hanya SATU backend (Google Sheet + Apps Script)
perlu disediakan dan digunakan oleh KEDUA-DUA laman web.

Fail backend: `Code.gs` (dihantar berasingan bersama laman web ini).
Ikut arahan pemasangan LENGKAP di bahagian atas fail `Code.gs` itu:

1. Import `DATA_MURID_D3.xlsx` ke satu Google Sheet (sheet bernama `D3`).
2. Tambah sheet kosong bernama `Log Penggunaan` dalam Google Sheet yang sama.
3. Tampal kod `Code.gs` dalam Extensions > Apps Script, kemudian Deploy
   sebagai Web App (Execute as: Me, Who has access: Anyone).
4. Salin URL Web App (`.../exec`) yang diberikan.
5. Buka `index.html` laman ini, cari baris:
   ```
   webAppUrl: "GANTI_DENGAN_URL_WEB_APP_ANDA"
   ```
   Gantikan `GANTI_DENGAN_URL_WEB_APP_ANDA` dengan URL Web App sebenar.
   **Buat perkara sama pada `index.html` laman Matematik** (guna URL yang SAMA).

Selepas ini:
- Murid perlu masukkan ID Pelajar untuk log masuk — sistem akan
  mengesahkan terhadap sheet `D3` dan memaparkan nama & sekolah murid.
- Log masuk dikongsi merentasi laman Matematik & Sains (murid tidak
  perlu log masuk dua kali) selagi kedua-dua laman dihoskan di bawah
  akaun GitHub Pages yang sama.
- Setiap kali murid membuka satu soalan interaktif (bukan sekadar log
  masuk), satu baris akan dicatat secara automatik dalam sheet
  **"Log Penggunaan"** (Masa, ID Pelajar, Nama Murid, Sekolah, PPD,
  Subjek, Topik Soalan, Guru, ID Soalan) — boleh disemak terus dalam
  Google Sheet bila-bila masa.
- Murid boleh klik **"Log Keluar"** dalam panel kiri untuk membolehkan
  murid lain log masuk pada komputer/peranti yang sama.
