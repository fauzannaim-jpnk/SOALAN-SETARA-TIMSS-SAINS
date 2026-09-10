/**
 * ============================================================================
 * BACKEND LOG MASUK MURID & LOG PENGGUNAAN
 * Bank Soalan Interaktif TIMSS — JPNK Kedah, Sektor Pembelajaran
 * ============================================================================
 *
 * SATU Web App ini digunakan bersama oleh KEDUA-DUA laman web
 * (Matematik & Sains). Ia menyambungkan laman web statik di GitHub Pages
 * kepada Google Sheet yang menyimpan (a) senarai murid untuk pengesahan
 * log masuk, dan (b) log penggunaan bahan interaktif.
 *
 * CARA PASANG
 * ----------------------------------------------------------------------
 * 1. Buka Google Sheet yang mengandungi data murid (sheet "D3" dengan
 *    lajur: ID_pelajar, Nama murid, Nama sekolah, Kod sekolah, PPD —
 *    iaitu fail DATA_MURID_D3.xlsx yang diimport/upload ke Google Sheets).
 *
 * 2. Tambah SATU sheet baharu dalam Google Sheet yang sama, namakan
 *    tepat-tepat: Log Penggunaan
 *    (Biarkan kosong — kod ini akan tambah baris tajuk secara automatik
 *    pada kali pertama ada murid buka soalan.)
 *
 * 3. Extensions > Apps Script. Padam semua kod contoh sedia ada dalam
 *    fail Code.gs, dan tampal SEMUA kod dalam fail ini menggantikannya.
 *
 * 4. Klik "Deploy" (butang biru di kanan atas) > "New deployment".
 *      - Klik ikon gear ⚙ di sebelah "Select type" > pilih "Web app".
 *      - Description: (bebas, cth. "API Log Masuk TIMSS")
 *      - Execute as: Me (akaun awak)
 *      - Who has access: Anyone
 *    Klik "Deploy". Google akan minta kebenaran (authorize) — ikut
 *    langkah, pilih akaun Google awak, klik "Advanced" > "Go to
 *    (nama projek) (unsafe)" jika perlu, klik "Allow".
 *
 * 5. Selepas deploy, satu URL akan diberikan (berakhir dengan /exec).
 *    SALIN URL tersebut.
 *
 * 6. Tampal URL itu dalam fail index.html KEDUA-DUA laman web
 *    (Matematik & Sains) — cari baris:
 *      webAppUrl: "GANTI_DENGAN_URL_WEB_APP_ANDA"
 *    dan gantikan teks "GANTI_DENGAN_URL_WEB_APP_ANDA" dengan URL
 *    sebenar (kekalkan tanda petik).
 *
 * 7. Setiap kali kod dalam Code.gs ini dikemaskini pada masa hadapan,
 *    perlu buat "New deployment" semula (bukan sekadar simpan) supaya
 *    perubahan berkuat kuasa pada URL Web App.
 *
 * PENTING — bila TAMBAH/UBAH data murid (cth. tambah murid Tingkatan 1):
 *    Kod ini simpan senarai murid dalam "cache" (ingatan sementara) selama
 *    6 jam supaya log masuk lebih pantas semasa ramai murid guna serentak.
 *    Ini bermakna murid BAHARU yang ditambah ke sheet tidak akan dikesan
 *    serta-merta — sehingga 6 jam, ATAU sehingga awak muat semula cache
 *    secara manual: buka Google Sheet ini > menu "TIMSS Kedah" (di sebelah
 *    menu Help) > "Muat Semula Cache Data Murid". Buat ini SETIAP KALI
 *    lepas tambah/ubah baris dalam sheet data murid supaya perubahan
 *    berkuat kuasa serta-merta. (Kalau menu "TIMSS Kedah" tak muncul,
 *    tutup dan buka semula Google Sheet ini sekali.)
 * ============================================================================
 */

// Nama sheet data murid (sheet yang mengandungi ID_pelajar, Nama murid, dll.)
var NAMA_SHEET_MURID = 'D3';

// Nama sheet log penggunaan (akan dicipta automatik jika belum wujud)
var NAMA_SHEET_LOG = 'Log Penggunaan';

// Kedudukan lajur (0 = lajur A) dalam sheet data murid
var LAJUR_MURID = {
  id: 0,          // ID_pelajar
  nama: 1,        // Nama murid
  sekolah: 2,     // Nama sekolah
  kodSekolah: 3,  // Kod sekolah
  ppd: 4          // PPD
};

var HEADER_LOG = [
  'Masa', 'ID Pelajar', 'Nama Murid', 'Sekolah', 'PPD',
  'Subjek', 'Topik Soalan', 'Guru', 'ID Soalan'
];

// ---------- Cache data murid (untuk laju & elak sesak semasa ramai log masuk serentak) ----------
// Setiap panggilan sahkanLogin() asalnya baca SEMULA seluruh sheet murid
// (30k+ baris) dari Google Sheets — ini perlahan (boleh ambil 1-3 saat)
// dan jadi punca sesak bila ratusan/ribuan murid log masuk dalam masa
// yang sama-sama (Apps Script hanya boleh proses ~30 permintaan serentak).
// Untuk kurangkan ini, senarai murid disimpan dalam CacheService (ingatan
// sementara pelayan Google) selepas kali pertama dibaca, supaya panggilan
// seterusnya jauh lebih pantas (tak perlu baca Sheet setiap kali).
//
// CacheService hadkan SETIAP kunci kepada maks 100KB, jadi data dipecahkan
// kepada beberapa "chunk" kecil (CACHE_CHUNK_SIZE baris setiap satu).
var CACHE_TTL_SAAT = 21600;       // 6 jam — had maksimum CacheService
var CACHE_CHUNK_SIZE = 500;       // bilangan baris murid setiap chunk cache
var CACHE_KEY_PREFIX = 'muridChunk_';
var CACHE_KEY_COUNT = 'muridChunkCount';

/**
 * Pulangkan senarai murid (array baris, TANPA baris tajuk) — dari cache
 * jika ada & lengkap, atau baca terus dari Sheet & bina semula cache jika
 * cache kosong/luput/tidak lengkap.
 */
function dapatkanSenaraiMurid() {
  var cache = CacheService.getScriptCache();
  var countStr = cache.get(CACHE_KEY_COUNT);
  if (countStr) {
    var count = parseInt(countStr, 10);
    var keys = [];
    for (var i = 0; i < count; i++) keys.push(CACHE_KEY_PREFIX + i);
    var chunks = cache.getAll(keys);
    var semuaAda = true;
    for (var j = 0; j < count; j++) {
      if (!chunks[CACHE_KEY_PREFIX + j]) { semuaAda = false; break; }
    }
    if (semuaAda) {
      var gabungan = [];
      for (var k = 0; k < count; k++) {
        gabungan = gabungan.concat(JSON.parse(chunks[CACHE_KEY_PREFIX + k]));
      }
      return gabungan;
    }
  }
  // Cache kosong / luput / tidak lengkap -> baca dari Sheet & bina semula cache
  return binaSemulaCacheMurid();
}

/**
 * Baca senarai murid TERUS dari Google Sheet (laluan perlahan — hanya
 * berlaku bila cache kosong/luput, iaitu lebih kurang sekali setiap 6 jam,
 * atau bila dipanggil terus melalui menu "Muat Semula Cache Data Murid").
 */
function binaSemulaCacheMurid() {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(NAMA_SHEET_MURID);
  if (!sheet) {
    throw new Error('Sheet data murid "' + NAMA_SHEET_MURID + '" tidak dijumpai.');
  }
  var data = sheet.getDataRange().getValues();
  var rows = data.slice(1); // buang baris tajuk

  var cache = CacheService.getScriptCache();
  var toPut = {};
  var count = 0;
  for (var i = 0; i < rows.length; i += CACHE_CHUNK_SIZE) {
    toPut[CACHE_KEY_PREFIX + count] = JSON.stringify(rows.slice(i, i + CACHE_CHUNK_SIZE));
    count++;
  }
  toPut[CACHE_KEY_COUNT] = String(count);

  // Simpan dalam kelompok kecil (elak had saiz permintaan putAll tunggal)
  var kunci = Object.keys(toPut);
  var SAIZ_KELOMPOK = 20;
  for (var b = 0; b < kunci.length; b += SAIZ_KELOMPOK) {
    var kelompok = {};
    for (var m = b; m < Math.min(b + SAIZ_KELOMPOK, kunci.length); m++) {
      kelompok[kunci[m]] = toPut[kunci[m]];
    }
    cache.putAll(kelompok, CACHE_TTL_SAAT);
  }
  return rows;
}

/** Kosongkan cache data murid sepenuhnya. */
function kosongkanCacheMurid() {
  var cache = CacheService.getScriptCache();
  var countStr = cache.get(CACHE_KEY_COUNT);
  var keys = [CACHE_KEY_COUNT];
  if (countStr) {
    var count = parseInt(countStr, 10);
    for (var i = 0; i < count; i++) keys.push(CACHE_KEY_PREFIX + i);
  }
  cache.removeAll(keys);
}

/**
 * Dipanggil dari menu "TIMSS Kedah" dalam Google Sheet — kosongkan &
 * bina semula cache serta-merta (guna lepas tambah/ubah data murid).
 */
function muatSemulaCacheMurid() {
  kosongkanCacheMurid();
  var rows = binaSemulaCacheMurid();
  SpreadsheetApp.getUi().alert(
    'Cache data murid berjaya dimuat semula.\n\nJumlah rekod: ' + rows.length
  );
}

/** Menu tersuai dalam Google Sheet, muncul secara automatik bila sheet dibuka. */
function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('TIMSS Kedah')
    .addItem('Muat Semula Cache Data Murid', 'muatSemulaCacheMurid')
    .addToUi();
}

function doGet(e)  { return kendaliPermintaan(e); }
function doPost(e) { return kendaliPermintaan(e); }

function kendaliPermintaan(e) {
  var param = (e && e.parameter) || {};
  var tindakan = (param.action || '').toString();
  var hasil;
  try {
    if (tindakan === 'login') {
      hasil = sahkanLogin(param.id);
    } else if (tindakan === 'logUsage') {
      hasil = catatPenggunaan(param);
    } else {
      hasil = { success: false, message: 'Tindakan tidak dikenali.' };
    }
  } catch (err) {
    hasil = { success: false, message: 'Ralat pelayan: ' + err.message };
  }
  return keluaranJson(hasil);
}

function keluaranJson(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * Sahkan ID Pelajar terhadap sheet data murid.
 * Pulangkan {success:true, id, nama, sekolah, kodSekolah, ppd} jika sah,
 * atau {success:false, message} jika tidak.
 */
function sahkanLogin(idPelajar) {
  idPelajar = (idPelajar || '').toString().trim();
  if (!idPelajar) {
    return { success: false, message: 'Sila masukkan ID Pelajar.' };
  }

  var rows = dapatkanSenaraiMurid();
  for (var i = 0; i < rows.length; i++) {
    var row = rows[i];
    var idBaris = (row[LAJUR_MURID.id] || '').toString().trim();
    if (idBaris === idPelajar) {
      return {
        success: true,
        id: idBaris,
        nama: (row[LAJUR_MURID.nama] || '').toString().trim(),
        sekolah: (row[LAJUR_MURID.sekolah] || '').toString().trim(),
        kodSekolah: (row[LAJUR_MURID.kodSekolah] || '').toString().trim(),
        ppd: (row[LAJUR_MURID.ppd] || '').toString().trim()
      };
    }
  }
  return { success: false, message: 'ID Pelajar tidak dijumpai. Sila semak semula nombor yang dimasukkan.' };
}

/**
 * Catatkan SATU rekod penggunaan (dipanggil hanya apabila murid betul-betul
 * membuka satu soalan interaktif — bukan semasa log masuk).
 */
function catatPenggunaan(p) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(NAMA_SHEET_LOG);
  if (!sheet) {
    sheet = ss.insertSheet(NAMA_SHEET_LOG);
  }
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(HEADER_LOG);
    sheet.getRange(1, 1, 1, HEADER_LOG.length).setFontWeight('bold');
    sheet.setFrozenRows(1);
  }
  sheet.appendRow([
    new Date(),
    p.id || '',
    p.nama || '',
    p.sekolah || '',
    p.ppd || '',
    p.subjek || '',
    p.topik || '',
    p.guru || '',
    p.qid || ''
  ]);
  return { success: true };
}
