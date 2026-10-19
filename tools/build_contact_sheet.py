from __future__ import annotations

import math
import re
import sys
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont, ImageOps


def main() -> int:
    source_dir = Path(sys.argv[1])
    output_path = Path(sys.argv[2])
    images = [
        path
        for path in source_dir.iterdir()
        if path.is_file() and path.suffix.lower() in {".jpg", ".jpeg", ".png", ".webp"}
    ]
    images.sort(key=lambda path: (int(re.match(r"\d+", path.name).group()), path.name))

    cell_width = 260
    cell_height = 220
    columns = 5
    rows = math.ceil(len(images) / columns)
    sheet = Image.new("RGB", (cell_width * columns, cell_height * rows), "#1c1418")
    draw = ImageDraw.Draw(sheet)
    font = ImageFont.load_default(size=16)

    for index, path in enumerate(images):
        image = ImageOps.exif_transpose(Image.open(path)).convert("RGB")
        image.thumbnail((cell_width - 16, cell_height - 46))
        x = (index % columns) * cell_width + (cell_width - image.width) // 2
        y = (index // columns) * cell_height + 8
        sheet.paste(image, (x, y))
        group = re.match(r"\d+", path.name).group()
        label = f"{group} - {index + 1:02d}"
        draw.rectangle(
            [
                (index % columns) * cell_width,
                (index // columns) * cell_height + cell_height - 34,
                (index % columns + 1) * cell_width,
                (index // columns + 1) * cell_height,
            ],
            fill="#1c1418",
        )
        draw.text(
            ((index % columns) * cell_width + 10, (index // columns) * cell_height + cell_height - 27),
            label,
            fill="#f7dfd7",
            font=font,
        )

    sheet.save(output_path, quality=88)
    print(output_path)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
