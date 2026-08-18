"""Render the selvedge invitation with a scan-tested QR matrix."""

from __future__ import annotations

import math
import json
import sys
from pathlib import Path

from PIL import Image, ImageDraw, ImageEnhance, ImageFilter, ImageFont


ROOT = Path(__file__).resolve().parent.parent
FABRIC = ROOT / "public" / "fabric-ivory-original.jpg"
FONTS = Path("C:/Windows/Fonts")

W, H = 1800, 1200
ESPRESSO = "#241813"
MADDAR = "#9A4235"
BRASS = "#AE7D3E"
IVORY = (247, 241, 232)


def font(name: str, size: int) -> ImageFont.FreeTypeFont:
    return ImageFont.truetype(str(FONTS / name), size)


def fabric_background() -> Image.Image:
    with Image.open(FABRIC) as original:
        image = original.convert("RGB")
        crop_height = int(image.width / (W / H))
        top = int((image.height - crop_height) * 0.35)
        image = image.crop((0, top, image.width, top + crop_height)).resize((W, H), Image.Resampling.LANCZOS)
    image = ImageEnhance.Color(image).enhance(0.40)
    image = ImageEnhance.Contrast(image).enhance(0.78)
    image = ImageEnhance.Brightness(image).enhance(1.15)
    image = Image.blend(image, Image.new("RGB", (W, H), (244, 235, 220)), 0.38)
    return image.filter(ImageFilter.GaussianBlur(0.25))


def draw_spaces_mark(draw: ImageDraw.ImageDraw, x: int, y: int, box: int) -> None:
    colors = ["#731D1B", "#A54D54", "#CC6871", "#C66F4D", "#B57B55", "#4A2A22"]
    letter_font = font("georgiab.ttf", int(box * 0.42))
    for index, (letter, color) in enumerate(zip("SPACES", colors)):
        left = x + index * (box + 4)
        draw.rectangle((left, y, left + box, y + box), fill=color)
        bounding = draw.textbbox((0, 0), letter, font=letter_font)
        draw.text((left + (box - (bounding[2] - bounding[0])) / 2, y + (box - (bounding[3] - bounding[1])) / 2 - 4), letter, fill="#FFFDF8", font=letter_font)


def in_finder(row: int, col: int, size: int) -> bool:
    return (row < 7 and col < 7) or (row < 7 and col >= size - 7) or (row >= size - 7 and col < 7)


def draw_finder(draw: ImageDraw.ImageDraw, x: float, y: float, module: float) -> None:
    draw.rounded_rectangle((x, y, x + 7 * module, y + 7 * module), radius=module * 0.65, fill=ESPRESSO)
    draw.rounded_rectangle((x + module, y + module, x + 6 * module, y + 6 * module), radius=module * 0.38, fill=IVORY)
    draw.rounded_rectangle((x + 2 * module, y + 2 * module, x + 5 * module, y + 5 * module), radius=module * 0.30, fill=ESPRESSO)


def draw_qr(draw: ImageDraw.ImageDraw, matrix: list[list[bool]], x: int, y: int, size: int) -> None:
    matrix_size = len(matrix)
    module = size / (matrix_size + 8)
    code_x = x + 4 * module
    code_y = y + 4 * module
    for row, row_data in enumerate(matrix):
        for col, active in enumerate(row_data):
            if not active or in_finder(row, col, matrix_size):
                continue
            left = code_x + col * module
            top = code_y + row * module
            draw.rounded_rectangle((left, top, left + module, top + module), radius=module * 0.34, fill=ESPRESSO)
    draw_finder(draw, code_x, code_y, module)
    draw_finder(draw, code_x + (matrix_size - 7) * module, code_y, module)
    draw_finder(draw, code_x, code_y + (matrix_size - 7) * module, module)


def main(config: dict) -> None:
    output = Path(config["output"])
    output.parent.mkdir(parents=True, exist_ok=True)
    image = fabric_background()
    overlay = Image.new("RGBA", image.size, (248, 243, 234, 0))
    overlay_draw = ImageDraw.Draw(overlay)

    # Subtle vellum wash preserves the photograph but gives typography room.
    overlay_draw.rectangle((0, 0, W, H), fill=(249, 244, 235, 102))
    image = Image.alpha_composite(image.convert("RGBA"), overlay)
    draw = ImageDraw.Draw(image)

    left = 135
    draw.text((left, 107), "Indian Trading Company", fill=ESPRESSO, font=font("GARA.TTF", 60))
    draw.line((left, 230, left + 260, 230), fill=BRASS, width=2)
    draw_spaces_mark(draw, 1082, 110, 58)

    draw.text((left, 401), "A new chapter", fill=ESPRESSO, font=font("GARA.TTF", 129))
    draw.text((left + 7, 543), "unfolds.", fill=MADDAR, font=font("GARAIT.TTF", 143))

    # This is the only 'frame': a thread which makes the QR a destination in the
    # composition instead of a tool bolted onto it.
    thread = []
    for step in range(160):
        t = step / 159
        x = left + (1318 - left) * t
        y = 752 + math.sin(t * math.pi * 1.05) * 17 - t * 18
        thread.append((x, y))
    draw.line(thread, fill=BRASS, width=3)
    for x, y in thread[::12]:
        draw.ellipse((x - 1.5, y - 1.5, x + 1.5, y + 1.5), fill="#D8B578")

    # Event selvedge: the dense QR is balanced by a broad, tailored run of
    # information rather than a second visual card.
    draw.text((left, 833), "SPACES CONFERENCE  /  RANCHI", fill="#5B473B", font=font("georgiab.ttf", 21))
    draw.text((left, 875), "25", fill=ESPRESSO, font=font("GARA.TTF", 122))
    draw.text((278, 895), "AUGUST", fill=ESPRESSO, font=font("GARA.TTF", 45))
    draw.text((282, 950), "TUESDAY", fill="#5B473B", font=font("georgiab.ttf", 18))

    draw.line((505, 892, 505, 1006), fill=BRASS, width=2)
    draw.text((542, 895), "6:00 PM", fill=ESPRESSO, font=font("GARA.TTF", 47))
    draw.text((546, 950), "ONWARDS", fill="#5B473B", font=font("georgiab.ttf", 18))

    draw.line((755, 892, 755, 1006), fill=BRASS, width=2)
    draw.text((791, 895), "Lemon Tree Hotel", fill=ESPRESSO, font=font("GARA.TTF", 40))
    draw.text((795, 950), "CONFERENCE HALL  ·  7TH FLOOR", fill="#5B473B", font=font("georgiab.ttf", 15))

    # The code has no hard-edged container. This feathered plain-weave pool is
    # flat inside the QR quiet zone, then dissolves into the surrounding cloth.
    qr_x, qr_y, qr_size = 1312, 702, 360
    pool = Image.new("RGBA", image.size, (0, 0, 0, 0))
    pool_mask = Image.new("L", image.size, 0)
    pool_mask_draw = ImageDraw.Draw(pool_mask)
    pool_mask_draw.rounded_rectangle(
        (qr_x - 28, qr_y - 28, qr_x + qr_size + 28, qr_y + qr_size + 28),
        radius=28,
        fill=238,
    )
    pool_mask = pool_mask.filter(ImageFilter.GaussianBlur(radius=24))
    pool_color = Image.new("RGBA", image.size, (251, 247, 239, 0))
    pool_color.putalpha(pool_mask)
    pool = Image.alpha_composite(pool, pool_color)
    image = Image.alpha_composite(image, pool)
    draw = ImageDraw.Draw(image)
    draw_qr(draw, config["matrix"], qr_x, qr_y, qr_size)
    center_x, center_y = qr_x + qr_size / 2, qr_y + qr_size / 2

    # An understated selvedge is a continuation of the fabric edge, not a badge.
    baseline = 1090
    for index in range(19):
        x = qr_x + 10 + index * 17
        draw.line((x, baseline, x + 9, baseline), fill=BRASS, width=2)
    caption = "UNFOLD THE COMPLETE INVITATION"
    caption_font = font("georgiab.ttf", 17)
    bbox = draw.textbbox((0, 0), caption, font=caption_font)
    draw.text((center_x - (bbox[2] - bbox[0]) / 2, 1112), caption, fill="#5C493D", font=caption_font)

    # Discreet crop marks only, to keep the artboard's physical-card proportion visible.
    crop_color = "#705747"
    for x, y, dx, dy in [(28, 28, -1, -1), (W - 28, 28, 1, -1), (28, H - 28, -1, 1), (W - 28, H - 28, 1, 1)]:
        draw.line((x + dx * 10, y, x + dx * 35, y), fill=crop_color, width=1)
        draw.line((x, y + dy * 10, x, y + dy * 35), fill=crop_color, width=1)

    image.convert("RGB").save(output, quality=94, subsampling=0)
    print(output)


if __name__ == "__main__":
    with Path(sys.argv[1]).open("r", encoding="utf-8") as handle:
        main(json.load(handle))
