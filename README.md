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
