"""Run one Numbeo update and atomically publish a complete world-map snapshot."""

import os
from pathlib import Path
import signal
import sys
from tempfile import TemporaryDirectory
import traceback


def run_once(storage=None) -> str | None:
    # These paths must be set before importing modules that resolve them at import time.
    with TemporaryDirectory(prefix="qcross-numbeo-") as temporary:
        root = Path(temporary)
        data_dir = root / "data"
        maps_dir = root / "maps"
        os.environ["NUMBEO_DATA_DIR"] = str(data_dir)
        os.environ["NUMBEO_MAPS_DIR"] = str(maps_dir)

        from Parsing import initialize_data_dir
        from maps import COUNTRY_MAP_VERSION, build_maps
        from numbeo import collect_daily, mark_daily_published, prepare_exports
        from storage import WorldMapStorage

        storage = storage or WorldMapStorage()
        hydrated = storage.hydrate(data_dir, maps_dir)
        if not hydrated:
            initialize_data_dir(data_dir)
            print("Bucket is empty; seeded Numbeo files from the repository.", flush=True)

        source = data_dir / "numbeo.csv"
        changed = collect_daily(source)
        country_map = maps_dir / "countries_rental_yield.html"
        map_is_current = (
            country_map.is_file()
            and f'content="{COUNTRY_MAP_VERSION}"' in country_map.read_text(encoding="utf-8")
        )
        if hydrated and not changed and map_is_current:
            print("Today's Numbeo update is already published.", flush=True)
            return None

        if hydrated and not changed:
            print("Country map renderer changed; rebuilding the published snapshot.", flush=True)

        prepare_exports(source)
        build_maps()
        mark_daily_published(source)
        version = storage.publish(data_dir, maps_dir)
        print(f"Published complete world-map snapshot {version}.", flush=True)
        return version


def report_signal(signum, _frame) -> None:
    print(f"Railway Numbeo job received signal {signal.Signals(signum).name}", file=sys.stderr, flush=True)
    sys.stdout.flush()
    sys.stderr.flush()
    raise SystemExit(128 + signum)


if __name__ == "__main__":
    signal.signal(signal.SIGTERM, report_signal)
    signal.signal(signal.SIGINT, report_signal)
    try:
        run_once()
    except SystemExit as exc:
        traceback.print_exc()
        print(f"Railway Numbeo job received SystemExit: code={exc.code!r}", file=sys.stderr, flush=True)
        raise
    except Exception as exc:
        traceback.print_exc()
        print(f"Railway Numbeo job failed; previous maps remain published: {exc}", file=sys.stderr, flush=True)
        raise SystemExit(1) from exc
