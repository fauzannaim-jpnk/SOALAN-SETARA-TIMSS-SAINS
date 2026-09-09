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

  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(NAMA_SHEET_MURID);
  if (!sheet) {
    return { success: false, message: 'Sheet data murid "' + NAMA_SHEET_MURID + '" tidak dijumpai.' };
  }

  var data = sheet.getDataRange().getValues();
  for (var i = 1; i < data.length; i++) {
    var row = data[i];
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
