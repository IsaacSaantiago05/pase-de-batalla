// Renderiza los diagramas de figuras.html a PNG (carpeta figuras/). Requiere Playwright con Chromium.
const { chromium } = require('playwright');
const path = require('path');
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ deviceScaleFactor: 2 });
  await p.goto('file://' + path.join(__dirname, 'figuras.html'));
  for (const id of ['f1', 'f2', 'f2b', 'f3', 'f4', 'f5', 'f6']) {
    await p.locator('#' + id).screenshot({ path: path.join(__dirname, 'figuras', id + '.png') });
  }
  await b.close();
})();
