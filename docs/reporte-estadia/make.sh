#!/usr/bin/env bash
# Genera Reporte_Estadia_Pase_de_Batalla.docx con índices que ya traen sus números de página.
set -euo pipefail
cd "$(dirname "$0")"
SK=$(ls -d /root/.claude/skills/synced/*/docx)
node build.js
python3 finalize.py build/base.docx build/outline.json - build/pass1.docx
(cd build && python3 "$SK/scripts/office/soffice.py" --headless --convert-to pdf pass1.docx >/dev/null 2>&1)
python3 pages.py build/pass1.pdf build/outline.json build/pages.json
python3 finalize.py build/base.docx build/outline.json build/pages.json Reporte_Estadia_Pase_de_Batalla.docx
cp Reporte_Estadia_Pase_de_Batalla.docx build/final.docx
(cd build && python3 "$SK/scripts/office/soffice.py" --headless --convert-to pdf final.docx >/dev/null 2>&1)
python3 pages.py build/final.pdf build/outline.json build/pages2.json
cmp -s build/pages.json build/pages2.json && echo "Índices consistentes con la paginación final" || echo "AVISO: la paginación cambió tras llenar los índices"
