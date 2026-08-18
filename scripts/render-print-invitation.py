"""Render a one-sided 148 x 99 mm invitation with 3 mm bleed.

The QR is intentionally drawn as vector modules rather than embedded as a raster
image. Its code area stays flat and high contrast; the textile framing never
enters the required quiet zone.
"""

from __future__ import annotations

import json
import os
import shutil
import sys
from pathlib import Path

from PIL import Image, ImageEnhance, ImageFilter
from reportlab.lib.colors import Color, HexColor
from reportlab.lib.units import mm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfgen import canvas


def hex_color(value: str, alpha: float = 1.0) -> Color:
    color = HexColor(value)
    return Color(color.red, color.green, color.blue, alpha=alpha)


ROOT = Path(__file__).resolve().parent.parent
WINDOWS_FONTS = Path("C:/Windows/Fonts")

pdfmetrics.registerFont(TTFont("Garamond", str(WINDOWS_FONTS / "GARA.TTF")))
pdfmetrics.registerFont(TTFont("GaramondItalic", str(WINDOWS_FONTS / "GARAIT.TTF")))
pdfmetrics.registerFont(TTFont("Georgia", str(WINDOWS_FONTS / "georgia.ttf")))
pdfmetrics.registerFont(TTFont("GeorgiaItalic", str(WINDOWS_FONTS / "georgiai.ttf")))


def prepare_background(source: Path, target: Path, width: int, height: int) -> None:
    """Create a muted but still tactile crop from the real ivory fabric photograph."""
    with Image.open(source) as original:
        image = original.convert("RGB")
        desired_ratio = width / height
        image_ratio = image.width / image.height
        if image_ratio > desired_ratio:
            crop_width = int(image.height * desired_ratio)
            left = int((image.width - crop_width) * 0.47)
            crop = image.crop((left, 0, left + crop_width, image.height))
        else:
            crop_height = int(image.width / desired_ratio)
            top = int((image.height - crop_height) * 0.35)
            crop = image.crop((0, top, image.width, top + crop_height))

        crop = crop.resize((width, height), Image.Resampling.LANCZOS)
        crop = ImageEnhance.Color(crop).enhance(0.44)
        crop = ImageEnhance.Contrast(crop).enhance(0.76)
        crop = ImageEnhance.Brightness(crop).enhance(1.15)
        warmth = Image.new("RGB", crop.size, (244, 235, 220))
        crop = Image.blend(crop, warmth, 0.38)
        crop = crop.filter(ImageFilter.GaussianBlur(radius=0.20))
        crop.save(target, quality=93, subsampling=0, dpi=(300, 300))


def draw_spaces_mark(pdf: canvas.Canvas, x: float, y: float, module: float) -> None:
    colours = ["#731D1B", "#A54D54", "#CC6871", "#C66F4D", "#B57B55", "#4A2A22"]
    pdf.setFont("Helvetica-Bold", module * 0.46)
    for index, (letter, colour) in enumerate(zip("SPACES", colours)):
        left = x + index * (module + 1.25)
        pdf.setFillColor(HexColor(colour))
        pdf.rect(left, y, module, module, stroke=0, fill=1)
        pdf.setFillColor(HexColor("#FFFDF8"))
        pdf.drawCentredString(left + module / 2, y + module * 0.285, letter)


def in_finder(row: int, column: int, size: int) -> bool:
    return (
        row < 7 and column < 7
        or row < 7 and column >= size - 7
        or row >= size - 7 and column < 7
    )


def draw_finder(pdf: canvas.Canvas, x: float, y: float, module: float) -> None:
    # Square finder eyes deliberately stay conventional; they make fast scanning
    # much more forgiving than a fully decorative QR.
    pdf.setFillColor(HexColor("#281A15"))
    pdf.roundRect(x, y, module * 7, module * 7, module * 0.6, stroke=0, fill=1)
    pdf.setFillColor(HexColor("#FBF7EF"))
    pdf.roundRect(x + module, y + module, module * 5, module * 5, module * 0.36, stroke=0, fill=1)
    pdf.setFillColor(HexColor("#281A15"))
    pdf.roundRect(x + module * 2, y + module * 2, module * 3, module * 3, module * 0.28, stroke=0, fill=1)


def draw_qr(pdf: canvas.Canvas, matrix: list[list[bool]], x: float, y: float, total_size: float) -> None:
    quiet_modules = 4
    size = len(matrix)
    module = total_size / (size + quiet_modules * 2)
    code_x = x + quiet_modules * module
    code_y = y + quiet_modules * module

    pdf.setFillColor(HexColor("#FBF7EF"))
    pdf.roundRect(x, y, total_size, total_size, 0.8 * mm, stroke=0, fill=1)
    pdf.setFillColor(HexColor("#281A15"))
    for row, row_data in enumerate(matrix):
        for column, active in enumerate(row_data):
            if not active or in_finder(row, column, size):
                continue
            draw_x = code_x + column * module
            draw_y = code_y + (size - row - 1) * module
            pdf.roundRect(draw_x, draw_y, module, module, module * 0.35, stroke=0, fill=1)

    finder_y = code_y + (size - 7) * module
    draw_finder(pdf, code_x, finder_y, module)
    draw_finder(pdf, code_x + (size - 7) * module, finder_y, module)
    draw_finder(pdf, code_x, code_y, module)


def draw_crop_marks(pdf: canvas.Canvas, bleed: float, trim_width: float, trim_height: float) -> None:
    pdf.setLineWidth(0.25)
    pdf.setStrokeColor(hex_color("#5B4334", 0.48))
    length = 2.2 * mm
    gap = 0.7 * mm
    positions = [(bleed, bleed), (bleed + trim_width, bleed), (bleed, bleed + trim_height), (bleed + trim_width, bleed + trim_height)]
    for x, y in positions:
        direction_x = -1 if x == bleed else 1
        direction_y = -1 if y == bleed else 1
        pdf.line(x + direction_x * gap, y, x + direction_x * (gap + length), y)
        pdf.line(x, y + direction_y * gap, x, y + direction_y * (gap + length))


def draw_invitation(config: dict) -> None:
    bleed = 3 * mm
    trim_width = 148 * mm
    trim_height = 99 * mm
    page_width = trim_width + bleed * 2
    page_height = trim_height + bleed * 2
    output_pdf = Path(config["outputPdf"])
    preview_path = Path(config["outputPreview"])
    working = Path(config["workingDirectory"])
    working.mkdir(parents=True, exist_ok=True)
    background_path = working / "muted-fabric-background.jpg"
    prepare_background(Path(config["fabricImage"]), background_path, 1820, 1240)

    pdf = canvas.Canvas(str(output_pdf), pagesize=(page_width, page_height), pageCompression=1)
    pdf.setTitle("Indian Trading Company - SPACES Conference Invitation")
    pdf.setAuthor("Indian Trading Company")
    pdf.setSubject("Print proof - replace QR destination before print")

    # Real cloth fills the entire bleeded edge, then a warm vellum wash creates a
    # calm reading field without hiding the weave.
    pdf.drawImage(str(background_path), 0, 0, width=page_width, height=page_height, mask="auto")
    pdf.setFillColor(hex_color("#F5EFE5", 0.54))
    pdf.rect(0, 0, page_width, page_height, stroke=0, fill=1)

    # The stitched textile edge is visual only; it never enters the QR quiet zone.
    x_left = bleed + 12.5 * mm
    y_top = bleed + trim_height - 12.5 * mm
    pdf.setStrokeColor(hex_color("#AE7D3E", 0.7))
    pdf.setLineWidth(0.45)
    pdf.line(x_left, y_top - 6.2 * mm, x_left + 22 * mm, y_top - 6.2 * mm)

    pdf.setFillColor(HexColor("#241813"))
    pdf.setFont("Garamond", 20.2)
    pdf.drawString(x_left, y_top, "Indian Trading Company")

    mark_x = x_left + 76.0 * mm
    mark_y = y_top - 2.4 * mm
    draw_spaces_mark(pdf, mark_x, mark_y, 5.3 * mm)

    # A short, decisive headline keeps the physical card like an invitation,
    # not a second brochure.
    headline_y = bleed + 57.5 * mm
    pdf.setFillColor(HexColor("#241813"))
    pdf.setFont("Garamond", 38)
    pdf.drawString(x_left, headline_y, "A new chapter")
    pdf.setFillColor(HexColor("#9A4235"))
    pdf.setFont("GaramondItalic", 41)
    pdf.drawString(x_left + 0.5 * mm, headline_y - 13.4 * mm, "unfolds.")

    # Fine thread leads the eye across to the scan point, without needing foil or embossing.
    thread_y = headline_y - 21.5 * mm
    pdf.setStrokeColor(hex_color("#AE7D3E", 0.78))
    pdf.setLineWidth(0.65)
    path = pdf.beginPath()
    path.moveTo(x_left, thread_y)
    path.curveTo(x_left + 30 * mm, thread_y - 2.5 * mm, 82 * mm, thread_y + 5 * mm, 101 * mm, thread_y + 1.4 * mm)
    pdf.drawPath(path, stroke=1, fill=0)

    # Event specifics: only the information a person needs before scanning.
    information_y = bleed + 16.2 * mm
    pdf.setFillColor(hex_color("#241813", 0.72))
    pdf.setFont("Helvetica-Bold", 6.8)
    pdf.drawString(x_left, information_y + 9.7 * mm, "SPACES CONFERENCE  /  RANCHI")
    pdf.setFillColor(HexColor("#241813"))
    pdf.setFont("Garamond", 15.3)
    pdf.drawString(x_left, information_y + 4.0 * mm, "Tuesday, 25 August 2026")
    pdf.setFont("Georgia", 7.1)
    pdf.drawString(x_left, information_y - 1.4 * mm, "6:00 PM onwards  ·  Lemon Tree Hotel, Ranchi")
    pdf.setFillColor(hex_color("#241813", 0.72))
    pdf.setFont("Helvetica-Bold", 5.35)
    pdf.drawString(x_left, information_y - 6.0 * mm, "CONFERENCE HALL, 7TH FLOOR")

    # QR label: controlled paper/selvedge treatment outside an untouched
    # high-contrast scan zone. Rounded data modules give it its bespoke character.
    label_x = bleed + 104.0 * mm
    label_y = bleed + 12.5 * mm
    label_width = 34.6 * mm
    label_height = 47.0 * mm
    pdf.setFillColor(hex_color("#F8F2E8", 0.94))
    pdf.roundRect(label_x, label_y, label_width, label_height, 1.2 * mm, stroke=0, fill=1)
    pdf.setStrokeColor(hex_color("#AE7D3E", 0.82))
    pdf.setLineWidth(0.55)
    pdf.roundRect(label_x + 1.4 * mm, label_y + 1.4 * mm, label_width - 2.8 * mm, label_height - 2.8 * mm, 0.75 * mm, stroke=1, fill=0)
    # small selvedge stitches along the lower edge
    pdf.setLineWidth(0.45)
    for stitch_x in range(0, 15):
        start_x = label_x + 3.6 * mm + stitch_x * 1.8 * mm
        pdf.line(start_x, label_y + 3.2 * mm, start_x + 0.95 * mm, label_y + 3.2 * mm)

    pdf.setFillColor(HexColor("#6F5541"))
    pdf.setFont("Helvetica-Bold", 5.45)
    pdf.drawCentredString(label_x + label_width / 2, label_y + label_height - 5.15 * mm, "OPEN YOUR DIGITAL INVITATION")
    draw_qr(pdf, config["matrix"], label_x + 2.3 * mm, label_y + 5.7 * mm, 30.0 * mm)

    pdf.setFillColor(hex_color("#6F5541", 0.88))
    pdf.setFont("Helvetica", 5.25)
    pdf.drawCentredString(label_x + label_width / 2, label_y + 1.75 * mm, "Details  ·  Directions  ·  Confirmation")

    draw_crop_marks(pdf, bleed, trim_width, trim_height)
    pdf.showPage()
    pdf.save()

    # A 2x print preview lets us review every aesthetic choice before it leaves
    # the workspace. The actual PDF remains vector for type and QR modules.
    import subprocess
    poppler_candidates = [
        os.environ.get("PDFTOPPM"),
        "C:/Users/Asus/.cache/codex-runtimes/codex-primary-runtime/dependencies/native/poppler/Library/bin/pdftoppm.exe",
        shutil.which("pdftoppm"),
    ]
    poppler = next((Path(candidate) for candidate in poppler_candidates if candidate and Path(candidate).exists()), None)
    if poppler is None:
        raise RuntimeError("pdftoppm is required to render the print-proof preview.")
    subprocess.run([
        str(poppler), "-png", "-r", "200", "-singlefile", str(output_pdf), str(preview_path.with_suffix(""))
    ], check=True)


if __name__ == "__main__":
    with Path(sys.argv[1]).open("r", encoding="utf-8") as handle:
        draw_invitation(json.load(handle))
