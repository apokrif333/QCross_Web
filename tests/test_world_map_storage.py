"""Storage tests use an in-memory S3 client and never contact Numbeo or AWS."""

from io import BytesIO
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
        self.fail_upload = None

    def get_object(self, *, Bucket, Key):
        if Key not in self.objects:
            raise ClientError({"Error": {"Code": "NoSuchKey", "Message": "missing"}}, "GetObject")
        return {"Body": BytesIO(self.objects[Key])}

    def download_file(self, bucket, key, path):
        Path(path).write_bytes(self.objects[key])

    def upload_file(self, path, bucket, key):
        if key.endswith(self.fail_upload or "\0"):
            raise RuntimeError("upload failed")
        self.objects[key] = Path(path).read_bytes()

    def put_object(self, *, Bucket, Key, Body, **_kwargs):
        self.objects[Key] = Body


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


if __name__ == "__main__":
    unittest.main()
