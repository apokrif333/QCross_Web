"""Map path discovery must work both in the repository and in a flat Cron image."""

import os
from pathlib import Path
from tempfile import TemporaryDirectory
import unittest
from unittest.mock import patch


SOURCE = Path(__file__).resolve().parents[1] / "legacy" / "world-rent" / "maps.py"


def load_maps_with_file(module_path: Path) -> dict:
    namespace = {"__file__": str(module_path), "__name__": "isolated_maps_paths"}
    exec(compile(SOURCE.read_text(encoding="utf-8"), str(SOURCE), "exec"), namespace)
    return namespace


class MapPathTests(unittest.TestCase):
    def test_explicit_maps_directory_imports_at_filesystem_root(self):
        with TemporaryDirectory() as temporary:
            data_dir = Path(temporary) / "data"
            maps_dir = Path(temporary) / "maps"
            root_file = Path(Path.cwd().anchor) / "maps.py"
            with patch.dict(os.environ, {"NUMBEO_DATA_DIR": str(data_dir), "NUMBEO_MAPS_DIR": str(maps_dir)}):
                module = load_maps_with_file(root_file)
            self.assertEqual(module["BASE_DIR"], root_file.parent)
            self.assertEqual(module["FILES_DIR"], data_dir.resolve())
            self.assertEqual(module["MAPS_DIR"], maps_dir.resolve())

    def test_repository_fallback_still_targets_public_maps(self):
        with patch.dict(os.environ):
            os.environ.pop("NUMBEO_MAPS_DIR", None)
            module = load_maps_with_file(SOURCE)
        self.assertEqual(module["MAPS_DIR"], SOURCE.parents[2] / "public" / "maps")


if __name__ == "__main__":
    unittest.main()
