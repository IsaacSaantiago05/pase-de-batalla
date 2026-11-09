# Reporte de estadía – Pase de Batalla

Borrador del reporte de estadía (formato de la guía de la UPRR) generado como archivo Word.

- `Reporte_Estadia_Pase_de_Batalla.docx`: documento listo para abrir y editar en Word.
  Los textos resaltados en amarillo son datos pendientes por completar.
- `figuras.html` y `figuras/`: diagramas del reporte (se renderizan a PNG con `node render-figuras.js`).
- `build.js` y `lib.js`: contenido y formato del documento. `make.sh` lo genera completo
  (requiere Node con el paquete `docx`, LibreOffice y Python con `pypdf`).
- `finalize.py` y `pages.py`: calculan e insertan los números de página de los índices.

Al abrir el `.docx` en Word, acepte la actualización de campos para refrescar índices y numeración.
