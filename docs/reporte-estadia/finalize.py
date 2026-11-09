#!/usr/bin/env python3
"""Sustituye los marcadores @@TOC_*@@ por campos TOC de Word con entradas en caché
(texto + número de página), de modo que los índices se vean aun sin actualizar campos."""
import json, re, sys, zipfile
from xml.sax.saxutils import escape

src, outline_path, pages_path, dst = sys.argv[1:5]
outline = json.load(open(outline_path, encoding='utf-8'))
pages = {} if pages_path == '-' else json.load(open(pages_path, encoding='utf-8'))
clean = lambda s: re.sub(r'\[\[|\]\]|\*', '', s)
WIDTH = 9122
RPR = '<w:rPr><w:rFonts w:ascii="Arial" w:hAnsi="Arial" w:cs="Arial"/><w:sz w:val="22"/></w:rPr>'

def build(entries, instr):
    out = []
    for i, (text, page, level) in enumerate(entries):
        ind = {1: 0, 2: 360, 3: 720}[level]
        head = ''
        if i == 0:
            head = ('<w:r><w:fldChar w:fldCharType="begin"/></w:r>'
                    f'<w:r><w:instrText xml:space="preserve"> {instr} </w:instrText></w:r>'
                    '<w:r><w:fldChar w:fldCharType="separate"/></w:r>')
        tail = '<w:r><w:fldChar w:fldCharType="end"/></w:r>' if i == len(entries) - 1 else ''
        out.append(
            '<w:p><w:pPr>'
            f'<w:tabs><w:tab w:val="right" w:leader="dot" w:pos="{WIDTH}"/></w:tabs>'
            '<w:spacing w:before="0" w:after="40" w:line="240" w:lineRule="auto"/>'
            f'<w:ind w:left="{ind}" w:right="567" w:hanging="0"/></w:pPr>'
            f'{head}<w:r>{RPR}<w:t xml:space="preserve">{escape(text)}</w:t></w:r>'
            f'<w:r>{RPR}<w:tab/></w:r><w:r>{RPR}<w:t>{page}</w:t></w:r>{tail}</w:p>')
    return ''.join(out)

def page_of(i):
    return pages.get(str(i), 1)

heads = [(clean(e['text']), page_of(i), e['level']) for i, e in enumerate(outline) if e['kind'] == 'h']
figs = [(f"Figura {e['n']}. {clean(e['title'])}", page_of(i), 1) for i, e in enumerate(outline) if e['kind'] == 'cap' and e['label'] == 'Figura']
tabs = [(f"Tabla {e['n']}. {clean(e['title'])}", page_of(i), 1) for i, e in enumerate(outline) if e['kind'] == 'cap' and e['label'] == 'Tabla']
blocks = {
    'contenido': build(heads, 'TOC \\o "1-3" \\h \\z \\u'),
    'figuras': build(figs, 'TOC \\h \\z \\c "Figura"'),
    'tablas': build(tabs, 'TOC \\h \\z \\c "Tabla"'),
}
zin = zipfile.ZipFile(src)
zout = zipfile.ZipFile(dst, 'w', zipfile.ZIP_DEFLATED)
for item in zin.infolist():
    if item.filename.endswith('/'):
        continue  # sin entradas de carpeta en el zip
    data = zin.read(item.filename)
    if item.filename == 'word/document.xml':
        xml = data.decode('utf-8')
        for kind, block in blocks.items():
            pat = re.compile(r'<w:p(?:\s[^>]*)?>(?:(?!</w:p>).)*?@@TOC_' + kind + r'@@(?:(?!</w:p>).)*?</w:p>', re.S)
            xml, n = pat.subn(lambda m: block, xml)
            if n != 1:
                sys.exit(f'marcador {kind}: {n} coincidencias')
        data = xml.encode('utf-8')
    zout.writestr(item.filename, data)
zout.close()
print('finalizado', dst, '| entradas:', len(heads), len(figs), len(tabs))
