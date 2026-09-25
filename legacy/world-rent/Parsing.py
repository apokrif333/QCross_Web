"""Refresh up to five Numbeo cities per day and publish both maps."""

import argparse
from contextlib import contextmanager
import os
from pathlib import Path
import shutil
import sys
import time

from maps import build_maps
from numbeo import collect_daily, mark_daily_published, prepare_exports


BASE_DIR = Path(__file__).parent
DATA_DIR = Path(os.environ.get("NUMBEO_DATA_DIR", BASE_DIR / "files")).resolve()
SOURCE_DATA = DATA_DIR / "numbeo.csv"
WORKER_LOCK = SOURCE_DATA.with_name("numbeo_worker.lock")


def initialize_data_dir(data_dir: Path = DATA_DIR) -> None:
    """Seed an external persistent directory without overwriting saved updates."""
    data_dir.mkdir(parents=True, exist_ok=True)
    bundled = BASE_DIR / "files"
    if data_dir.resolve() == bundled.resolve():
        return
    for name in ("numbeo.csv", "numbeo_cities.csv", "numbeo_city_coordinates.csv"):
        target = data_dir / name
        if not target.exists():
            shutil.copy2(bundled / name, target)


def main() -> None:
    initialize_data_dir()
    if collect_daily(SOURCE_DATA):
        prepare_exports(SOURCE_DATA)
        build_maps()
        mark_daily_published(SOURCE_DATA)


@contextmanager
def single_worker():
    """Hold an OS file lock so two site processes cannot run the daily job."""
    WORKER_LOCK.parent.mkdir(parents=True, exist_ok=True)
    with WORKER_LOCK.open("a+b") as lock_file:
        lock_file.seek(0)
        if not lock_file.read(1):
            lock_file.seek(0)
            lock_file.write(b"1")
            lock_file.flush()
        lock_file.seek(0)
        try:
            if os.name == "nt":
                import msvcrt
                msvcrt.locking(lock_file.fileno(), msvcrt.LK_NBLCK, 1)
            else:
                import fcntl
                fcntl.flock(lock_file.fileno(), fcntl.LOCK_EX | fcntl.LOCK_NB)
        except OSError as exc:
            raise RuntimeError("Another Numbeo worker is already running") from exc
        try:
            yield
        finally:
            lock_file.seek(0)
            if os.name == "nt":
                msvcrt.locking(lock_file.fileno(), msvcrt.LK_UNLCK, 1)
            else:
                fcntl.flock(lock_file.fileno(), fcntl.LOCK_UN)


def run_worker() -> None:
    while True:
        try:
            main()
        except (RuntimeError, ValueError, OSError) as exc:
            print(f"Numbeo daily update failed: {exc}", file=sys.stderr, flush=True)
        time.sleep(3600)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--worker", action="store_true", help="Stay running with the site and check hourly")
    args = parser.parse_args()
    try:
        with single_worker():
            if args.worker:
                run_worker()
            else:
                main()
    except (RuntimeError, ValueError) as exc:
        raise SystemExit(str(exc)) from exc
    except KeyboardInterrupt:
        print("Numbeo worker stopped.")
        raise SystemExit(130)
