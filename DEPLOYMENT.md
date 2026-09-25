# Production deployment

The Next.js site runs on Vercel. Its two world-map route handlers read complete map snapshots from a private S3-compatible Railway Storage Bucket. A separate Railway Cron container runs the existing Numbeo daily scraper once, generates both maps, publishes a complete snapshot, and exits. Monte Carlo stays in the browser Web Worker. No Python or Chromium is needed on Vercel.

## Vercel

1. Import the `QCross_Web` repository. Set Root Directory to the repository root (`/`), Framework Preset to **Next.js**, and Production Branch to `main`.
2. Use `npm ci` for installation and `npm run build` for the build. The build and local dev scripts select Next.js Webpack because the existing browser Web Worker is emitted as executable JavaScript there. The normal local and self-hosted commands are `npm run dev` and `npm start`; both start only Next.js. No Python install or start command is needed on Vercel.
3. Add the following variables to the **Production** environment when the Bucket is ready. They are server-only; do not prefix them with `NEXT_PUBLIC_`:

   | Variable | Value |
   | --- | --- |
   | `WORLD_MAP_S3_ENDPOINT` | Bucket Credentials → endpoint (base endpoint, without bucket name) |
   | `WORLD_MAP_S3_REGION` | Bucket Credentials → region (often `auto`) |
   | `WORLD_MAP_S3_BUCKET` | Bucket Credentials → S3 bucket name (`BUCKET`, not the display name) |
   | `WORLD_MAP_S3_ACCESS_KEY_ID` | Bucket Credentials → access key ID |
   | `WORLD_MAP_S3_SECRET_ACCESS_KEY` | Bucket Credentials → secret access key |
   | `WORLD_MAP_S3_PREFIX` | Optional; `world-map` by default. Must match Railway. |

   A deployment with these variables absent serves the bundled maps. After adding or changing Vercel variables, redeploy so the new deployment receives them.

The iframe URLs are `/api/world-map/countries` and `/api/world-map/cities`. Only those two routes read the Bucket. Responses are cached at the CDN for about one hour. On missing configuration or a storage read error, a short-lived redirect serves the existing files under `/maps/`.

## Railway Storage Bucket

1. Create a **private Bucket** in the Railway project. Use its Credentials tab for the endpoint, region, actual S3 bucket name, access key, and secret key. The display name is not necessarily the S3 bucket name.
2. Give the Cron service the same six `WORLD_MAP_S3_*` values using Railway variable references. For example, map `WORLD_MAP_S3_BUCKET` to the Bucket's `BUCKET` variable, `WORLD_MAP_S3_ENDPOINT` to `ENDPOINT`, `WORLD_MAP_S3_REGION` to `REGION`, and the two keys to `ACCESS_KEY_ID` and `SECRET_ACCESS_KEY`.
3. Copy the corresponding values into Vercel's server-only Production variables. Do not commit credentials.

New Railway Buckets use virtual-hosted S3 URLs, which is the default here. If the Bucket Credentials tab explicitly says path-style URLs, set optional `WORLD_MAP_S3_FORCE_PATH_STYLE=true` on both Vercel and Railway.

Objects are stored under `world-map/versions/<version>/data/` and `world-map/versions/<version>/maps/`, or under the configured prefix. `world-map/current.json` selects the last complete snapshot. The job uploads all four data/state files and both maps before changing that pointer. An incomplete upload leaves the previously published snapshot available; the static maps remain the final fallback. Older versions are retained for manual rollback and should be pruned deliberately if storage usage grows.

## Railway Cron

1. Create one service from the same repository and branch. Set Root Directory to `/legacy/world-rent`.
2. Select the **Dockerfile** builder. Railway detects `legacy/world-rent/Dockerfile` inside that root. The image installs Python, Chromium, and `requirements-cron.txt`; it does not build Next.js. No web domain or health endpoint is needed.
3. Start command: `python railway_cron.py` (the Dockerfile already sets this as `CMD`; leave the Railway override empty or set it to this exact command).
4. Configure the six `WORLD_MAP_S3_*` variables listed above and `NUMBEO_TIMEZONE=Asia/Almaty`. Optional existing scraper variable: `NUMBEO_PROXY`. `CHROMIUM_PATH=/usr/bin/chromium` is set by the Dockerfile and can be overridden. Leave `NUMBEO_PROXY_ATTEMPTS` unset; the existing daily scraper keeps its unlimited proxy rotation.
5. Configure one daily Cron schedule in the Railway service settings. Railway schedules use **UTC**; choose the UTC time that corresponds to the desired Almaty day. The job has no internal schedule, runs once per invocation, and exits after publishing. Railway skips a scheduled invocation if the previous one is still running, so allow enough time for the existing proxy rotation to finish.
6. For the first seed, trigger a one-off deployment/run of the Cron service in Railway or run its command manually in the service environment. With an empty Bucket, it copies the three bundled CSV files, runs the normal daily five-city update, generates both maps, then publishes the first snapshot. Later runs hydrate the complete stored snapshot and never replace it with bundled CSVs.

The job uses `NUMBEO_DATA_DIR` and `NUMBEO_MAPS_DIR` inside a temporary directory. The container filesystem is disposable; the Bucket holds `numbeo.csv`, `numbeo_cities.csv`, `numbeo_city_coordinates.csv`, `numbeo_daily_state.json`, and both HTML maps.

## Local development

`npm ci` then `npm run dev` starts only Next.js. With no S3 variables, the map routes use the bundled static maps. No Python or Bucket is needed to work on the website.

For a manual local update without Bucket credentials, use the project's Python environment, install `legacy/world-rent/requirements.txt`, and run `python legacy/world-rent/Parsing.py` once. This retains the existing local CSV/state and writes the bundled maps to `public/maps/`. It may take time while the existing proxy rotation finds a working proxy. For an exact rehearsal of the Railway job, provide the Bucket variables and run `python legacy/world-rent/railway_cron.py`; this publishes a new snapshot.

## Validation after deployment

Check `/`, `/about`, `/clients`, `/partners`, `/contact`, and `/insights/world-map` on desktop and mobile. Check both maps and city-map fullscreen, the contact modal/page, and the Monte Carlo calculator. For the fallback, test the map routes in an environment without Bucket variables (or with a missing object) and confirm they redirect to `/maps/` files. After the first Cron run, check both map routes again and confirm the Bucket snapshot is served. Review Cron logs for one completed five-city batch and a successful snapshot publication.
