import JSZip from 'jszip';

// Fills the real UBP template (public/ubp-template.xlsx) so every color, border
// and column width stays exactly as in the bank's file.
//
// Style ids (s="...") come from the template's styles.xml:
//   even data rows = the template's row 18 pattern, odd data rows = row 19 pattern,
//   closing row    = the template's row 31 pattern, blank rows = style 3 / 4.
const EVEN = [16, 61, 60, 61, 62, 63, 63, 61, 67, 15]; // A..J
const ODD = [36, 65, 37, 38, 38, 39, 39, 65, 66, 15];
const CLOSE = [69, 69, 69, 69, 70, 69, 69, 69, 69, 3];
const BLANK = [3, 3, 3, 3, 4, 3, 3, 3, 3, 3];
const COLS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'];
const FIRST_DATA_ROW = 6;
const TEMPLATE_LAST_ROW = 31; // closing row of the original template

const xml = (s) => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const str = (ref, s, v) => `<c r="${ref}" s="${s}" t="inlineStr"><is><t xml:space="preserve">${xml(v)}</t></is></c>`;
const num = (ref, s, v) => `<c r="${ref}" s="${s}"><v>${v}</v></c>`;
const empty = (ref, s) => `<c r="${ref}" s="${s}"/>`;

const buildRow = (r, styles, values) => {
  const cells = COLS.map((col, i) => {
    const ref = `${col}${r}`;
    const v = values ? values[i] : undefined;
    if (v === undefined || v === '') return empty(ref, styles[i]);
    return typeof v === 'number' ? num(ref, styles[i], v) : str(ref, styles[i], v);
  }).join('');
  return `<row r="${r}" spans="1:17" ht="15.6" customHeight="1">${cells}</row>`;
};

/**
 * @param {ArrayBuffer} templateBuf  bytes of ubp-template.xlsx
 * @param {{remarks:string, sourceAccount:string, lines:{name:string, account:string, amount:number}[]}} data
 * @returns {Promise<Blob>}
 */
export const buildUbpXlsx = async (templateBuf, { remarks, sourceAccount, lines }) => {
  const zip = await JSZip.loadAsync(templateBuf);
  const path = 'xl/worksheets/sheet1.xml';
  let sheet = await zip.file(path).async('string');

  // header values (keep the template's cell styles)
  sheet = sheet.replace(/<c r="B1" s="(\d+)"[^>]*>.*?<\/c>/, (_, s) => str('B1', s, remarks));
  sheet = sheet.replace(/<c r="B3" s="(\d+)"[^>]*>.*?<\/c>/, (_, s) => str('B3', s, sourceAccount));

  // rebuild rows 6..last
  const closeRow = FIRST_DATA_ROW + lines.length;
  const lastRow = Math.max(TEMPLATE_LAST_ROW, closeRow);
  const rows = [];
  for (let r = FIRST_DATA_ROW; r <= lastRow; r++) {
    const i = r - FIRST_DATA_ROW;
    if (i < lines.length) {
      const l = lines[i];
      rows.push(buildRow(r, i % 2 === 0 ? EVEN : ODD, [
        '', l.name, String(l.account), '', '', Number(Number(l.amount).toFixed(2)), '', '2', 'Salary for Period', '',
      ]));
    } else if (r === closeRow) {
      rows.push(buildRow(r, CLOSE, null));
    } else {
      rows.push(buildRow(r, BLANK, null));
    }
  }

  const start = sheet.indexOf(`<row r="${FIRST_DATA_ROW}"`);
  const afterLast = sheet.indexOf(`<row r="${lastRow + 1}"`);
  const end = afterLast === -1 ? sheet.indexOf('</sheetData>') : afterLast;
  sheet = sheet.slice(0, start) + rows.join('') + sheet.slice(end);
  sheet = sheet.replace(/<dimension ref="[^"]*"\/>/, `<dimension ref="A1:Q${Math.max(1005, lastRow)}"/>`);

  zip.file(path, sheet);
  return zip.generateAsync({
    type: 'blob',
    mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    compression: 'DEFLATE',
  });
};