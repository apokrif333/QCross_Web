# Quantum Cross Management

## Local website

From the repository root:

```powershell
npm ci
npm run dev
```

Open http://localhost:3000. After dependencies are installed, only `npm run dev` is needed.
The website uses the bundled maps when S3 storage is not configured.

## Project layout

- `app/`, `components/`, `lib/`, `workers/`: website routes, UI, shared logic and Monte Carlo worker.
- `public/`: images, certificates and the two HTML maps served by the website.
- `legacy/world-rent/`: Numbeo collection, map generation and Railway publishing.
- `legacy/world-rent/files/`: source CSV data, coordinate cache and country geometry. The local daily state records scraper progress and must be retained.
- `tests/`: website and data-pipeline tests.
- `drafts/`: approved design references, original artwork and the Monte Carlo source workbook.
- `documents/presentations/`: completed PDF and editable PowerPoint documents.

`node_modules/` and `.venv/` are local dependency environments. `.next/`, Python bytecode and TypeScript build metadata are generated caches and are excluded from Git.
Use the system temporary directory for one-off previews and validation intermediates; place completed documents in `documents/`.

## Validation and deployment

```powershell
npm run lint
npm test
npm run build
```

For Python tests, use the interpreter configured for this project in PyCharm:

```powershell
.\.venv\Scripts\python.exe -B -m unittest discover -s tests -p "test_*.py"
```

See [DEPLOYMENT.md](DEPLOYMENT.md) for production configuration and manual Numbeo updates. `Parsing.py` refreshes data and maps; the website itself starts through npm.
