"""Storage tests use an in-memory S3 client and never contact Numbeo or AWS."""

from contextlib import redirect_stderr
from datetime import datetime, timedelta, timezone
from io import BytesIO, StringIO
import json
from pathlib import Path
import sys
from tempfile import TemporaryDirectory
import unittest

from botocore.exceptions import ClientError


sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "legacy" / "world-rent"))
from Parsing import initialize_data_dir  # noqa: E402
from storage import DATA_FILES, MAP_FILES, WorldMapStorage, object_key  # noqa: E402


class MemoryS3:
    def __init__(self):
        self.objects = {}
        self.modified = {}
        self.clock = 0
        self.fail_upload = None
        self.fail_delete = False
        self.deleted = []

    def store(self, key, body):
        self.objects[key] = body
        self.modified[key] = datetime(2026, 1, 1, tzinfo=timezone.utc) + timedelta(seconds=self.clock)
        self.clock += 1

    def get_object(self, *, Bucket, Key):
        if Key not in self.objects:
            raise ClientError({"Error": {"Code": "NoSuchKey", "Message": "missing"}}, "GetObject")
        return {"Body": BytesIO(self.objects[Key])}

    def download_file(self, bucket, key, path):
        Path(path).write_bytes(self.objects[key])

    def upload_file(self, path, bucket, key):
        if key.endswith(self.fail_upload or "\0"):
            raise RuntimeError("upload failed")
        self.store(key, Path(path).read_bytes())

    def put_object(self, *, Bucket, Key, Body, **_kwargs):
        self.store(Key, Body)

    def list_objects_v2(self, *, Bucket, Prefix, ContinuationToken=None):
        keys = sorted(key for key in self.objects if key.startswith(Prefix))
        offset = int(ContinuationToken or 0)
        page = keys[offset:offset + 4]
        result = {
            "Contents": [{"Key": key, "LastModified": self.modified[key]} for key in page],
            "IsTruncated": offset + 4 < len(keys),
        }
        if result["IsTruncated"]:
            result["NextContinuationToken"] = str(offset + 4)
        return result

    def delete_objects(self, *, Bucket, Delete):
        if self.fail_delete:
            raise RuntimeError("delete failed")
        for item in Delete["Objects"]:
            key = item["Key"]
            self.deleted.append(key)
            self.objects.pop(key, None)
            self.modified.pop(key, None)
        return {}


class StorageTests(unittest.TestCase):
    def setUp(self):
        self.temp = TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        self.data = self.root / "data"
        self.maps = self.root / "maps"
        self.client = MemoryS3()
        self.storage = WorldMapStorage(self.client, bucket="test-bucket", prefix="world-map")

    def test_empty_bucket_seeds_bundled_data_without_overwriting_existing_files(self):
        self.assertFalse(self.storage.hydrate(self.data, self.maps))
        initialize_data_dir(self.data)
        for name in DATA_FILES[:3]:
            self.assertTrue((self.data / name).is_file())
        (self.data / "numbeo.csv").write_text("newer data", encoding="utf-8")
        initialize_data_dir(self.data)
        self.assertEqual((self.data / "numbeo.csv").read_text(encoding="utf-8"), "newer data")

    def test_complete_snapshot_hydrates_and_rejects_unknown_artifact_names(self):
        self.data.mkdir()
        self.maps.mkdir()
        for name in DATA_FILES:
            (self.data / name).write_text(name, encoding="utf-8")
        for name in MAP_FILES:
            (self.maps / name).write_text(name, encoding="utf-8")
        version = self.storage.publish(self.data, self.maps)
        self.assertEqual(self.storage.current_version(), version)
        with self.assertRaises(ValueError):
            object_key("world-map", version, "maps", "secret.html")
        restored_data = self.root / "restored-data"
        restored_maps = self.root / "restored-maps"
        self.assertTrue(self.storage.hydrate(restored_data, restored_maps))
        self.assertEqual((restored_maps / MAP_FILES[0]).read_text(encoding="utf-8"), MAP_FILES[0])

    def test_country_renderer_version_is_published_with_the_snapshot(self):
        self.data.mkdir()
        self.maps.mkdir()
        for name in DATA_FILES:
            (self.data / name).write_text(name, encoding="utf-8")
        for name in MAP_FILES:
            (self.maps / name).write_text(name, encoding="utf-8")
        (self.maps / "countries_rental_yield.html").write_text(
            '<meta name="qcm-map-version" content="maplibre-country-v1" />', encoding="utf-8"
        )
        self.storage.publish(self.data, self.maps)
        manifest = json.loads(self.client.objects[self.storage.manifest_key])
        self.assertEqual(manifest["countryMapVersion"], "maplibre-country-v1")

    def test_failed_upload_keeps_previous_snapshot_current(self):
        self.data.mkdir()
        self.maps.mkdir()
        for name in DATA_FILES:
            (self.data / name).write_text("old", encoding="utf-8")
        for name in MAP_FILES:
            (self.maps / name).write_text("old", encoding="utf-8")
        previous = self.storage.publish(self.data, self.maps)
        (self.maps / MAP_FILES[1]).write_text("new", encoding="utf-8")
        self.client.fail_upload = MAP_FILES[1]
        with self.assertRaisesRegex(RuntimeError, "upload failed"):
            self.storage.publish(self.data, self.maps)
        self.assertEqual(self.storage.current_version(), previous)
        self.assertEqual(self.client.deleted, [])
        partial_keys = set(self.client.objects) - {
            self.storage.manifest_key,
            *(object_key("world-map", previous, group, name)
              for group, names in (("data", DATA_FILES), ("maps", MAP_FILES))
              for name in names),
        }
        self.assertTrue(partial_keys)
        self.client.fail_upload = None
        self.storage.publish(self.data, self.maps)
        self.assertTrue(partial_keys.issubset(self.client.deleted))

    def test_publish_retains_only_latest_seven_complete_versions(self):
        self.data.mkdir()
        self.maps.mkdir()
        for name in DATA_FILES:
            (self.data / name).write_text(name, encoding="utf-8")
        for name in MAP_FILES:
            (self.maps / name).write_text(name, encoding="utf-8")

        versions = [self.storage.publish(self.data, self.maps) for _ in range(9)]
        self.assertEqual(self.storage.current_version(), versions[-1])
        for version in versions[:2]:
            self.assertFalse(any(key.startswith(f"world-map/versions/{version}/") for key in self.client.objects))
        for version in versions[2:]:
            self.assertEqual(
                sum(key.startswith(f"world-map/versions/{version}/") for key in self.client.objects),
                len(DATA_FILES) + len(MAP_FILES),
            )

    def test_cleanup_failure_does_not_fail_published_snapshot(self):
        self.data.mkdir()
        self.maps.mkdir()
        for name in DATA_FILES:
            (self.data / name).write_text(name, encoding="utf-8")
        for name in MAP_FILES:
            (self.maps / name).write_text(name, encoding="utf-8")
        for _ in range(7):
            self.storage.publish(self.data, self.maps)

        self.client.fail_delete = True
        log = StringIO()
        with redirect_stderr(log):
            active = self.storage.publish(self.data, self.maps)
        self.assertEqual(self.storage.current_version(), active)
        self.assertIn("World-map version cleanup failed", log.getvalue())
        self.assertEqual(self.client.deleted, [])


if __name__ == "__main__":
    unittest.main()
