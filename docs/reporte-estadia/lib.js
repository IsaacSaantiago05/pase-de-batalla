// Utilidades de formato para el reporte de estadía (guía UPRR):
// carta, márgenes 3/2.5/2.5/2.5 cm, Arial 11, interlineado 1.5, texto justificado.
const fs = require('fs');
const d = require('docx');
const {
  Paragraph, TextRun, Table, TableRow, TableCell, WidthType, ShadingType, AlignmentType,
  ImageRun, HeadingLevel, SequentialIdentifier, BorderStyle, VerticalAlign, LevelFormat,
} = d;

const FONT = 'Arial';
const BODY = 22;   // 11 pt
const SMALL = 20;  // 10 pt (pies de figura, tabla, numeración)
const CELL = 18;   // 9 pt (contenido de tablas)
const LINE15 = 360;
const TEXT_WIDTH = 9122; // 21.59 cm - 3 cm - 2.5 cm  (DXA)

// Términos en otro idioma: cursiva (guía: "palabras en idioma diferente al español").
const EN = /\b(stock|backend|frontend|framework|frameworks|token|tokens|endpoint|endpoints|middleware|rate limiting|commit|commits|pull request|pull requests|stack|dashboard|dashboards|software|snapshot|lockForUpdate|drag and drop|feature branches|feature branch|merge|hosting|lazy loading|Bearer|throttle|seeders|seeder|Form Requests|Form Request|Eloquent|Resources)\b/gi;

function styled(text, base) {
  const out = [];
  let last = 0, m;
  EN.lastIndex = 0;
  while ((m = EN.exec(text)) !== null) {
    if (m.index > last) out.push(new TextRun({ text: text.slice(last, m.index), ...base }));
    out.push(new TextRun({ text: m[0], ...base, italics: true }));
    last = m.index + m[0].length;
  }
  if (last < text.length) out.push(new TextRun({ text: text.slice(last), ...base }));
  return out;
}

// Mini-marcado: **negrita**, *cursiva*, [[pendiente por completar]] (resaltado amarillo).
function runs(text, size = BODY, extra = {}) {
  const base = { font: FONT, size, ...extra };
  const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*|\[\[[^\]]+\]\])/g).filter((s) => s !== '');
  const out = [];
  for (const p of parts) {
    if (p.startsWith('**')) out.push(...styled(p.slice(2, -2), { ...base, bold: true }));
    else if (p.startsWith('[[')) out.push(new TextRun({ text: '[' + p.slice(2, -2) + ']', ...base, shading: { type: ShadingType.CLEAR, fill: 'FFFF00', color: 'auto' } }));
    else if (p.startsWith('*')) out.push(new TextRun({ text: p.slice(1, -1), ...base, italics: true }));
    else out.push(...styled(p, base));
  }
  return out;
}

// Párrafo de cuerpo: justificado, interlineado 1.5.
function P(text, o = {}) {
  return new Paragraph({
    alignment: o.align ?? AlignmentType.JUSTIFIED,
    spacing: { lineRule: 'auto', line: o.single ? 240 : LINE15, after: o.after ?? 120, before: o.before ?? 0 },
    indent: o.indent,
    keepNext: o.keepNext,
    pageBreakBefore: o.pageBreakBefore,
    children: runs(text, o.size ?? BODY, o.run ?? {}),
  });
}

function H1(text, o = {}) {
  reg.outline.push({ kind: 'h', level: 1, text });
  return new Paragraph({
    heading: HeadingLevel.HEADING_1,
    alignment: o.left ? AlignmentType.LEFT : AlignmentType.CENTER,
    pageBreakBefore: true,
    spacing: { before: 0, after: 240 },
    keepNext: true,
    children: [new TextRun({ text, font: FONT, size: 24, bold: true })],
  });
}
const H2 = (text) => reg.outline.push({ kind: 'h', level: 2, text }) && new Paragraph({
  heading: HeadingLevel.HEADING_2, alignment: AlignmentType.LEFT, keepNext: true,
  spacing: { before: 240, after: 120 }, children: [new TextRun({ text, font: FONT, size: 24, bold: true })],
});
const H3 = (text) => reg.outline.push({ kind: 'h', level: 3, text }) && new Paragraph({
  heading: HeadingLevel.HEADING_3, alignment: AlignmentType.LEFT, keepNext: true,
  spacing: { before: 200, after: 100 }, children: [new TextRun({ text, font: FONT, size: 22, bold: true, italics: true })],
});

// Listas con un solo tipo de viñeta y sangría izquierda.
function bullets(items) {
  return items.map((t) => new Paragraph({
    numbering: { reference: 'bullets', level: 0 },
    alignment: AlignmentType.JUSTIFIED,
    spacing: { lineRule: 'auto', line: LINE15, after: 60 },
    children: runs(t),
  }));
}
function numbered(ref, items) {
  return items.map((t) => new Paragraph({
    numbering: { reference: ref, level: 0 },
    alignment: AlignmentType.JUSTIFIED,
    spacing: { lineRule: 'auto', line: LINE15, after: 60 },
    children: runs(t),
  }));
}

// Registro de numeración: el orden declarado debe coincidir con el orden del documento.
const reg = { figs: [], tabs: [], figSeen: [], tabSeen: [], outline: [] };
function declare(figs, tabs) { reg.figs = figs; reg.tabs = tabs; }
function F(key) { const i = reg.figs.indexOf(key); if (i < 0) throw new Error('figura no declarada ' + key); return 'Figura ' + (i + 1); }
function T(key) { const i = reg.tabs.indexOf(key); if (i < 0) throw new Error('tabla no declarada ' + key); return 'Tabla ' + (i + 1); }

function caption(label, key, title, keepNext) {
  const seen = label === 'Figura' ? reg.figSeen : reg.tabSeen;
  const list = label === 'Figura' ? reg.figs : reg.tabs;
  if (list[seen.length] !== key) throw new Error(`${label} fuera de orden: esperaba ${list[seen.length]} y llegó ${key}`);
  seen.push(key);
  const n = seen.length;
  reg.outline.push({ kind: 'cap', label, n, title });
  if (title.split(/\s+/).length > 30) throw new Error('título de más de 30 palabras: ' + title);
  return new Paragraph({
    alignment: AlignmentType.CENTER, keepNext, spacing: { lineRule: 'auto', line: 240, before: 120, after: 120 },
    children: [
      new TextRun({ text: label + ' ', font: FONT, size: SMALL }),
      new d.SimpleField(`SEQ ${label} \\* ARABIC`, String(n)),
      ...runs('. ' + title, SMALL),
    ],
  });
}

const BORDER = { style: BorderStyle.SINGLE, size: 4, color: '808080' };
const BORDERS = { top: BORDER, bottom: BORDER, left: BORDER, right: BORDER };

// Tabla con título arriba, tipografía Arial 9 pt, encabezado sombreado.
function table(key, title, widths, header, rows, o = {}) {
  const total = widths.reduce((a, b) => a + b, 0);
  if (total !== TEXT_WIDTH) throw new Error(`anchos de ${key} suman ${total}, deben sumar ${TEXT_WIDTH}`);
  const cell = (txt, i, head) => new TableCell({
    width: { size: widths[i], type: WidthType.DXA },
    borders: BORDERS,
    verticalAlign: VerticalAlign.CENTER,
    shading: head ? { fill: 'D9E2F3', type: ShadingType.CLEAR, color: 'auto' } : undefined,
    margins: { top: 50, bottom: 50, left: 80, right: 80 },
    children: String(txt).split('\n').map((line) => new Paragraph({
      alignment: head || (o.center && o.center.includes(i)) ? AlignmentType.CENTER : AlignmentType.LEFT,
      spacing: { lineRule: 'auto', line: 240, after: 0 },
      children: runs(line, o.size ?? CELL, head ? { bold: true } : {}),
    })),
  });
  return [
    caption('Tabla', key, title, true),
    new Table({
      width: { size: total, type: WidthType.DXA },
      columnWidths: widths,
      rows: [
        new TableRow({ tableHeader: true, cantSplit: true, children: header.map((h, i) => cell(h, i, true)) }),
        ...rows.map((r) => new TableRow({ cantSplit: true, children: r.map((c, i) => cell(c, i, false)) })),
      ],
    }),
    new Paragraph({ spacing: { after: 160 }, children: [] }),
  ];
}

// Figura (imagen PNG) con título abajo.
function figure(key, title, file, opts = {}) {
  const png = fs.readFileSync(file);
  const wpx = png.readUInt32BE(16), hpx = png.readUInt32BE(20); // IHDR
  const maxW = opts.maxW ?? 600;
  const w = Math.min(maxW, wpx);
  const h = Math.round(hpx * (w / wpx));
  return [
    new Paragraph({
      alignment: AlignmentType.CENTER, keepNext: true, spacing: { before: 120, after: 60 },
      children: [new ImageRun({ type: 'png', data: png, transformation: { width: w, height: h },
        altText: { title: key, description: title, name: key } })],
    }),
    caption('Figura', key, title, false),
  ];
}

// Marcador visible para figuras que el equipo debe aportar.
function figurePlaceholder(key, title, note) {
  return [
    new Paragraph({
      alignment: AlignmentType.CENTER, keepNext: true, spacing: { before: 120, after: 60 },
      children: runs('[[' + note + ']]', BODY),
    }),
    caption('Figura', key, title, false),
  ];
}

const tocPlaceholder = (kind) => new Paragraph({ children: [new TextRun({ text: '@@TOC_' + kind + '@@', font: FONT, size: BODY })] });
module.exports = { reg, tocPlaceholder, d, FONT, BODY, SMALL, CELL, LINE15, TEXT_WIDTH, runs, P, H1, H2, H3, bullets, numbered, declare, F, T, caption, table, figure, figurePlaceholder, BORDER };
