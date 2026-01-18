#!/usr/bin/env python3
"""
Geocode Harvard library addresses using Nominatim (OpenStreetMap).
Outputs library-coords.json with lat/lng for each library ID.

Usage: python geocode.py
"""

import csv
import json
import time
import urllib.request
import urllib.parse

INPUT_CSV = "public/libraries.csv"
OUTPUT_JSON = "public/library-coords.json"
NOMINATIM_URL = "https://nominatim.openstreetmap.org/search"

def geocode_address(address):
    """Query Nominatim for lat/lng of an address."""
    params = urllib.parse.urlencode({
        "q": address,
        "format": "json",
        "limit": 1
    })
    url = f"{NOMINATIM_URL}?{params}"

    req = urllib.request.Request(
        url,
        headers={"User-Agent": "HarvardLibrariesMap/1.0"}
    )

    with urllib.request.urlopen(req) as response:
        data = json.loads(response.read().decode())
        if data:
            return {
                "lat": float(data[0]["lat"]),
                "lng": float(data[0]["lon"])
            }
    return None

def main():
    coords = {}

    with open(INPUT_CSV, "r", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        libraries = list(reader)

    print(f"Geocoding {len(libraries)} libraries...")

    for i, lib in enumerate(libraries):
        lib_id = lib["Id"]
        address = lib["Address"]

        print(f"  [{i+1}/{len(libraries)}] {lib_id}...", end=" ", flush=True)

        result = geocode_address(address)
        if result:
            coords[lib_id] = result
            print(f"OK ({result['lat']:.4f}, {result['lng']:.4f})")
        else:
            print("FAILED - no results")

        # Rate limit: 1 request per second (Nominatim requirement)
        if i < len(libraries) - 1:
            time.sleep(1)

    with open(OUTPUT_JSON, "w", encoding="utf-8") as f:
        json.dump(coords, f, indent=2)

    print(f"\nWrote {len(coords)} coordinates to {OUTPUT_JSON}")

    failed = len(libraries) - len(coords)
    if failed:
        print(f"Warning: {failed} libraries failed to geocode")

if __name__ == "__main__":
    main()
