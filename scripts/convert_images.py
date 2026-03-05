#!/usr/bin/env python3
"""
Convert images in static/assets/images/ to WebP.
Originals are preserved; compressed WebP copies are created alongside them.
References in data.py, templates, and JS files are updated to point to .webp versions.
"""

import sys
from pathlib import Path

try:
    from PIL import Image
except ImportError:
    print("Pillow not installed. Run: pip install Pillow")
    sys.exit(1)

try:
    from pillow_heif import register_heif_opener
    register_heif_opener()
    HEIC_SUPPORTED = True
except ImportError:
    HEIC_SUPPORTED = False

REPO_ROOT = Path(__file__).parent.parent
IMAGES_DIR = REPO_ROOT / "static" / "assets" / "images"
SOURCE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".heic", ".heif"}
REFERENCE_GLOBS = ["*.py", "templates/**/*.html", "static/**/*.js"]
WEBP_QUALITY = 85


def convert_images():
    converted = []
    skipped = []

    for src_path in IMAGES_DIR.rglob("*"):
        if src_path.suffix.lower() not in SOURCE_EXTENSIONS:
            continue

        webp_path = src_path.with_suffix(".webp")
        if webp_path.exists() and webp_path.stat().st_mtime >= src_path.stat().st_mtime:
            skipped.append(src_path)
            continue

        if src_path.suffix.lower() in (".heic", ".heif") and not HEIC_SUPPORTED:
            print(f"  SKIPPED (HEIC not supported): {src_path.relative_to(REPO_ROOT)} — run: pip install pillow-heif")
            continue

        try:
            with Image.open(src_path) as img:
                if img.mode in ("RGBA", "LA", "P"):
                    img = img.convert("RGBA")
                else:
                    img = img.convert("RGB")
                img.save(webp_path, "WEBP", quality=WEBP_QUALITY, method=6)
            converted.append((src_path, webp_path))
            print(f"  Converted: {src_path.relative_to(REPO_ROOT)} -> {webp_path.name}")
        except Exception as e:
            print(f"  ERROR converting {src_path}: {e}")

    return converted, skipped


def update_references(converted):
    if not converted:
        return []

    updated_files = []

    for ref_glob in REFERENCE_GLOBS:
        for ref_file in REPO_ROOT.glob(ref_glob):
            content = ref_file.read_text(encoding="utf-8")
            new_content = content

            for src_path, webp_path in converted:
                rel_src = str(src_path.relative_to(REPO_ROOT)).replace("\\", "/")
                rel_webp = str(webp_path.relative_to(REPO_ROOT)).replace("\\", "/")
                # Handle both "static/..." and "../static/..." path styles
                new_content = new_content.replace(rel_src, rel_webp)
                new_content = new_content.replace("../" + rel_src, "../" + rel_webp)

            if new_content != content:
                ref_file.write_text(new_content, encoding="utf-8")
                updated_files.append(ref_file)
                print(f"  Updated references in: {ref_file.relative_to(REPO_ROOT)}")

    return updated_files


if __name__ == "__main__":
    print("Converting images to WebP...")
    converted, skipped = convert_images()

    if skipped:
        print(f"  Skipped {len(skipped)} already-converted image(s)")

    if converted:
        print(f"\nUpdating references...")
        updated = update_references(converted)
        print(f"\nDone: {len(converted)} image(s) converted, {len(updated)} file(s) updated.")
    else:
        print("No new images to convert.")
