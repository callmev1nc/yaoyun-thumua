"""
Render transparent logo PNGs + branded favicon from YAOYUN-Logo.pdf.

Strips the white background rectangle from the PDF content stream,
renders with alpha, auto-crops, and emits files at the required sizes.
"""

import io
import re
import struct
from pathlib import Path

import os

import fitz
import numpy as np
from fitz import Matrix
from PIL import Image

os.environ["PYTHONIOENCODING"] = "utf-8"

PROJECT = Path(r"D:\Project\Yao_Yun")
PDF_PATH = PROJECT / "YAOYUN-Logo.pdf"
PUBLIC = PROJECT / "yaoyun-thumua" / "public"
APP = PROJECT / "yaoyun-thumua" / "app"

# ── helpers ──────────────────────────────────────────────────────────


def alpha_trim(img: Image.Image) -> Image.Image:
    """Crop transparent borders from a PIL Image with alpha."""
    arr = np.array(img)
    alpha = arr[:, :, 3]
    rows = np.any(alpha > 0, axis=1)
    cols = np.any(alpha > 0, axis=0)
    y0, y1 = rows.argmax(), rows.size - rows[::-1].argmax()
    x0, x1 = cols.argmax(), cols.size - cols[::-1].argmax()
    return Image.fromarray(arr[y0:y1, x0:x1])


def render_transparent_master(pdf_path: Path, scale: float = 8) -> Image.Image:
    """
    Render PDF page with white background fills neutralised so
    we get a clean transparent image.
    """
    doc = fitz.open(pdf_path)
    page = doc[0]

    # Neutralise white-background rectangles in the content stream
    xrefs = page.get_contents()
    for xref in xrefs:
        raw = doc.xref_stream(xref)
        if raw is None:
            continue
        text = raw.decode("latin-1")
        # Replace "0 0 500 500 re f" with "0 0 500 500 re n" (no paint)
        new_text = re.sub(r"0\s+0\s+500\s+500\s+re\s+f\b", "0 0 500 500 re n", text)
        if new_text != text:
            doc.update_stream(xref, new_text.encode("latin-1"))

    # Render with alpha at high resolution
    mat = Matrix(scale, scale)
    pix = page.get_pixmap(matrix=mat, alpha=True)
    samples = pix.samples  # bytes in RGBA order
    w, h = pix.width, pix.height
    arr = np.frombuffer(samples, dtype=np.uint8).reshape(h, w, 4)
    img = Image.fromarray(arr)
    doc.close()
    return img


def detect_cloud_bbox(img: Image.Image) -> tuple[int, int, int, int]:
    """
    Auto-detect the blue cloud region only (excluding the text below).
    Uses the row where dark text pixels outnumber blue cloud pixels as
    the vertical cut-off, then trims horizontal transparent edges.
    """
    arr = np.array(img)
    r, g, b, a = arr[:, :, 0], arr[:, :, 1], arr[:, :, 2], arr[:, :, 3]
    h = arr.shape[0]

    # Find the first row where dark pixels dominate (text region)
    cut_row = h
    for row_idx in range(h):
        row_a = a[row_idx] > 0
        vis = row_a.sum()
        if vis == 0:
            continue
        # Bright blue cloud pixels
        bblue = (b[row_idx] > 130) & (g[row_idx] > 100) & (r[row_idx] < 100) & row_a
        # Dark text pixels (not bright blue)
        dark = (r[row_idx] < 60) & (g[row_idx] < 60) & (b[row_idx] < 80) & (~bblue) & row_a
        dark_ratio = dark.sum() / max(vis, 1)
        if dark_ratio > 0.25 and row_idx > 30:
            cut_row = row_idx
            break

    cloud_region = arr[:cut_row]
    cr, cg, cb, ca = cloud_region[:,:,0], cloud_region[:,:,1], cloud_region[:,:,2], cloud_region[:,:,3]
    bblue_region = (cb > 130) & (cg > 100) & (cr < 100) & (ca > 0)

    rows = np.any(bblue_region, axis=1)
    cols = np.any(bblue_region, axis=0)

    y0 = int(rows.argmax()) if rows.any() else 0
    y1 = int(rows.size - rows[::-1].argmax()) if rows.any() else h
    x0 = int(cols.argmax()) if cols.any() else 0
    x1 = int(cols.size - cols[::-1].argmax()) if cols.any() else arr.shape[1]

    return (x0, y0, x1, y1)


def make_ico_sizes(size: int) -> list[tuple[int, int]]:
    """Return standard .ico frame sizes up to *size*."""
    ico_sizes = [16, 24, 32, 48, 64, 96, 128, 256]
    return [(s, s) for s in ico_sizes if s <= size]


# ── main ─────────────────────────────────────────────────────────────


def main():
    print("Rendering transparent master from PDF …")
    master = render_transparent_master(PDF_PATH, scale=8)
    print(f"  Master size: {master.width}×{master.height}")

    print("Trimming transparent borders …")
    master = alpha_trim(master)
    print(f"  Trimmed size: {master.width}×{master.height}")

    # ── 1. public/logo.png ── sidebar (h-8 ≈ 32px) + login (h-10/12) ──
    logo_512 = master.resize((512, 512), Image.LANCZOS)
    logo_512.save(PUBLIC / "logo.png", "PNG")
    print(f"  [OK] public/logo.png  (512x512)")

    # ── 2. public/forms/logo.png ── print docs (26 mm ≈ 1024px) ──
    logo_1024 = master.resize((1024, 1024), Image.LANCZOS)
    logo_1024.save(PUBLIC / "forms" / "logo.png", "PNG")
    print(f"  [OK] public/forms/logo.png  (1024x1024)")

    # ── 3. public/icon.png ── also keep branded (512px for consistency) ──
    logo_512.save(PUBLIC / "icon.png", "PNG")
    print(f"  [OK] public/icon.png  (512x512)")

    # ── 4. app/icon.png ── modern tab icon (cloud mark, 256px) ──
    print("Detecting cloud bbox for favicon crop …")
    crop = detect_cloud_bbox(master)
    print(f"  Cloud bbox: {crop}")
    cloud = master.crop(crop)
    # Pad to square
    sz = max(cloud.width, cloud.height)
    cloud_sq = Image.new("RGBA", (sz, sz), (0, 0, 0, 0))
    cloud_sq.paste(cloud, ((sz - cloud.width) // 2, 0))
    cloud_256 = cloud_sq.resize((256, 256), Image.LANCZOS)
    cloud_256.save(APP / "icon.png", "PNG")
    print(f"  [OK] app/icon.png  (256x256)")

    # ── 5. app/favicon.ico ── multi-resolution (PNG-format entries) ──
    ico_sizes = [16, 24, 32, 48, 64, 96, 128, 256]
    ico_frames = [cloud_sq.resize((s, s), Image.LANCZOS) for s in ico_sizes]
    # Encode each frame as PNG for ICO embedding
    ico_pngs = []
    for frame in ico_frames:
        buf = io.BytesIO()
        frame.save(buf, format="PNG")
        ico_pngs.append(buf.getvalue())
    count = len(ico_sizes)
    ico_data = struct.pack("<HHH", 0, 1, count)
    offset = 6 + count * 16
    for i, s in enumerate(ico_sizes):
        png = ico_pngs[i]
        ico_data += struct.pack(
            "<BBBBHHII",
            s if s < 256 else 0,
            s if s < 256 else 0,
            0, 0, 1, 32,
            len(png), offset,
        )
        offset += len(png)
    for png in ico_pngs:
        ico_data += png
    with open(APP / "favicon.ico", "wb") as f:
        f.write(ico_data)
    print(f"  [OK] app/favicon.ico  (multi-res: {ico_sizes})")

    # ── verification ─────────────────────────────────────────────────
    def check_transparency(path: Path, label: str):
        im = Image.open(path).convert("RGBA")
        arr = np.array(im)
        corners = [
            arr[0, 0, 3],
            arr[0, -1, 3],
            arr[-1, 0, 3],
            arr[-1, -1, 3],
        ]
        all_transparent = all(c == 0 for c in corners)
        ok = "OK" if all_transparent else "FAIL"
        print(f"  [{ok}] {label}: corners alpha = {corners}")

    print("\n-- Transparency verification --")
    check_transparency(PUBLIC / "logo.png", "public/logo.png")
    check_transparency(PUBLIC / "forms" / "logo.png", "public/forms/logo.png")
    check_transparency(PUBLIC / "icon.png", "public/icon.png")
    check_transparency(APP / "icon.png", "app/icon.png")
    # favicon.ico check: verify PNG entries
    try:
        with open(APP / "favicon.ico", "rb") as f:
            ico_raw = f.read()
        ico_count = struct.unpack("<H", ico_raw[4:6])[0]
        ico_ok = True
        for i in range(ico_count):
            entry = struct.unpack("<BBBBHHII", ico_raw[6+i*16:6+(i+1)*16])
            png_start = entry[7]
            if ico_raw[png_start:png_start+4] != b"\x89PNG":
                ico_ok = False
        print(f"  [OK] app/favicon.ico: {ico_count} frames" if ico_ok else "  [FAIL] app/favicon.ico: corrupt")
    except Exception as e:
        print(f"  [FAIL] app/favicon.ico: {e}")

    # Composite check onto blue swatch (login panel color)
    blue_bg = Image.new("RGBA", (200, 200), (50, 95, 145, 255))
    test = logo_512.resize((120, 120), Image.LANCZOS)
    blue_bg.paste(test, (40, 40), test)
    # Check no white rectangle — sample center of logo area
    arr_bg = np.array(blue_bg)
    center_region = arr_bg[80:120, 80:120]
    # If there's a white box, many pixels will be > 240 in all channels
    white_pixels = np.all(center_region[:, :, :3] > 240, axis=2)
    white_ratio = white_pixels.mean()
    if white_ratio < 0.05:
        print(f"  [OK] Blue-bg composite: no white rectangle (white_ratio={white_ratio:.3f})")
    else:
        print(f"  [WARN] Blue-bg composite: white_ratio={white_ratio:.3f}")

    print("\nDone – all assets generated.")


if __name__ == "__main__":
    main()
