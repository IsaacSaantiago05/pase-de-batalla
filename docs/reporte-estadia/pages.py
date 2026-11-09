#!/usr/bin/env python3
"""Calcula el número de página de cada entrada de índice a partir del PDF renderizado:
un encabezado o título de figura/tabla se ubica en la primera página (a partir de la anterior)
que contiene una línea idéntica a él; las líneas de los índices llevan puntos y número, así que no coinciden."""
import json, re, sys, unicodedata
from pypdf import PdfReader

pdf, outline_path, out = sys.argv[1:4]
outline = json.load(open(outline_path, encoding='utf-8'))
r = PdfReader(pdf)
norm = lambda s: re.sub(r'\s+', '', unicodedata.normalize('NFC', re.sub(r'\[\[|\]\]|\*', '', s)))

page_lines = []
for p in r.pages:
    page_lines.append([norm(l) for l in (p.extract_text() or '').split('\n') if l.strip()])

def find(needle, start):
    for p in range(start, len(page_lines) + 1):
        L = page_lines[p - 1]
        for k in range(len(L)):
            acc = ''
            for m in range(4):
                if k + m >= len(L):
                    break
                acc += L[k + m]
                if acc == needle:
                    return p
                if not needle.startswith(acc):
                    break
    return None

pages, cur = {}, 1
curF = curT = None
for i, e in enumerate(outline):
    if e['kind'] == 'h':
        p = find(norm(e['text']), cur)
        if p is None:
            sys.exit('sin página para el encabezado: ' + e['text'])
        pages[str(i)] = p
        cur = p
        if e['text'] == 'INTRODUCCIÓN':
            curF = curT = p
    else:
        needle = norm(f"{e['label']} {e['n']}. {e['title']}")
        start = curF if e['label'] == 'Figura' else curT
        p = find(needle, start)
        if p is None:
            sys.exit('sin página para: ' + needle)
        pages[str(i)] = p
        if e['label'] == 'Figura':
            curF = p
        else:
            curT = p
json.dump(pages, open(out, 'w'))
print('páginas calculadas:', len(pages), '| páginas del PDF:', len(r.pages))
