"""S3-compatible storage for complete, versioned world-map snapshots."""

import json
import os
from pathlib import Path
import sys
from uuid import UUID, uuid4

import boto3
from botocore.config import Config
from botocore.exceptions import ClientError


DATA_FILES = (
    "numbeo.csv",
    "numbeo_cities.csv",
    "numbeo_city_coordinates.csv",
    "numbeo_daily_state.json",
)
MAP_FILES = ("countries_rental_yield.html", "cities_rental_yield.html")


def object_key(prefix: str, version: str, group: str, name: str) -> str:
    if group not in ("data", "maps") or name not in (DATA_FILES if group == "data" else MAP_FILES):
        raise ValueError(f"Unsupported world-map object: {group}/{name}")
    UUID(version)
    return f"{prefix.strip('/')}/versions/{version}/{group}/{name}"


class WorldMapStorage:
    def __init__(self, client=None, bucket: str | None = None, prefix: str | None = None):
        self.bucket = bucket or os.environ["WORLD_MAP_S3_BUCKET"]
        self.prefix = (prefix if prefix is not None else os.environ.get("WORLD_MAP_S3_PREFIX", "world-map")).strip("/")
        if not self.prefix or ".." in self.prefix.split("/"):
            raise ValueError("WORLD_MAP_S3_PREFIX must be a nonempty object prefix")
        if client is None:
            addressing_style = "path" if os.environ.get("WORLD_MAP_S3_FORCE_PATH_STYLE", "").lower() == "true" else "virtual"
            client = boto3.client(
                "s3",
                endpoint_url=os.environ["WORLD_MAP_S3_ENDPOINT"],
                region_name=os.environ["WORLD_MAP_S3_REGION"],
                aws_access_key_id=os.environ["WORLD_MAP_S3_ACCESS_KEY_ID"],
                aws_secret_access_key=os.environ["WORLD_MAP_S3_SECRET_ACCESS_KEY"],
                config=Config(s3={"addressing_style": addressing_style}),
            )
        self.client = client

    @property
    def manifest_key(self) -> str:
        return f"{self.prefix}/current.json"

    def current_version(self) -> str | None:
        try:
            response = self.client.get_object(Bucket=self.bucket, Key=self.manifest_key)
        except ClientError as exc:
            code = exc.response.get("Error", {}).get("Code")
            if code in ("NoSuchKey", "404", "NotFound"):
                return None
            raise
        version = json.loads(response["Body"].read())["version"]
        UUID(version)
        return version

    def hydrate(self, data_dir: Path, maps_dir: Path) -> bool:
        """Download the last complete snapshot; False means the bucket is empty."""
        version = self.current_version()
        if version is None:
            return False
        for group, directory, names in (("data", data_dir, DATA_FILES), ("maps", maps_dir, MAP_FILES)):
            directory.mkdir(parents=True, exist_ok=True)
            for name in names:
                self.client.download_file(
                    self.bucket, object_key(self.prefix, version, group, name), str(directory / name)
                )
        return True

    def cleanup_old_versions(self, current_version: str) -> None:
        """Keep the active snapshot and the six newest other complete snapshots."""
        if self.current_version() != current_version:
            return
        versions_prefix = f"{self.prefix}/versions/"
        required = {f"data/{name}" for name in DATA_FILES} | {f"maps/{name}" for name in MAP_FILES}
        versions = {}
        token = None
        while True:
            request = {"Bucket": self.bucket, "Prefix": versions_prefix}
            if token:
                request["ContinuationToken"] = token
            response = self.client.list_objects_v2(**request)
            for item in response.get("Contents", []):
                key = item["Key"]
                version, separator, name = key[len(versions_prefix):].partition("/")
                if not separator:
                    continue
                try:
                    UUID(version)
                except ValueError:
                    continue
                entry = versions.setdefault(version, {"keys": [], "names": set(), "updated": item["LastModified"]})
                entry["keys"].append(key)
                entry["names"].add(name)
                entry["updated"] = max(entry["updated"], item["LastModified"])
            if not response.get("IsTruncated"):
                break
            token = response.get("NextContinuationToken")
            if not token:
                raise RuntimeError("S3 version listing was truncated without a continuation token")

        if current_version not in versions or not required.issubset(versions[current_version]["names"]):
            raise RuntimeError("Active world-map snapshot is missing from the S3 listing")

        completed = sorted(
            (version for version, entry in versions.items() if required.issubset(entry["names"])),
            key=lambda version: versions[version]["updated"],
            reverse=True,
        )
        keep = {current_version}
        for version in completed:
            if len(keep) == 7:
                break
            keep.add(version)

        active_updated = versions[current_version]["updated"]
        for version, entry in versions.items():
            if version in keep or entry["updated"] > active_updated:
                continue
            if self.current_version() != current_version:
                return
            keys = entry["keys"]
            for offset in range(0, len(keys), 1000):
                result = self.client.delete_objects(
                    Bucket=self.bucket,
                    Delete={"Objects": [{"Key": key} for key in keys[offset:offset + 1000]], "Quiet": True},
                )
                if result.get("Errors"):
                    raise RuntimeError(f"S3 could not delete old world-map version {version}: {result['Errors']}")

    def publish(self, data_dir: Path, maps_dir: Path) -> str:
        """Switch the public snapshot only after every artifact has uploaded."""
        artifacts = [("data", data_dir, DATA_FILES), ("maps", maps_dir, MAP_FILES)]
        for _, directory, names in artifacts:
            for name in names:
                path = directory / name
                if not path.is_file() or path.stat().st_size == 0:
                    raise FileNotFoundError(f"Missing or empty world-map artifact: {path}")
        version = str(uuid4())
        for group, directory, names in artifacts:
            for name in names:
                self.client.upload_file(
                    str(directory / name), self.bucket, object_key(self.prefix, version, group, name)
                )
        manifest = {"version": version}
        country_map = (maps_dir / "countries_rental_yield.html").read_text(encoding="utf-8")
        if 'content="maplibre-country-v2"' in country_map:
            manifest["countryMapVersion"] = "maplibre-country-v2"
        self.client.put_object(
            Bucket=self.bucket,
            Key=self.manifest_key,
            Body=json.dumps(manifest).encode("utf-8"),
            ContentType="application/json",
            CacheControl="no-cache",
        )
        try:
            self.cleanup_old_versions(version)
        except Exception as exc:
            print(f"World-map version cleanup failed after publishing {version}: {exc}", file=sys.stderr, flush=True)
        return version
