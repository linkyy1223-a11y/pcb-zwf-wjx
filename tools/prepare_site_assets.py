from __future__ import annotations

import json
import re
from collections import defaultdict
from pathlib import Path

from PIL import Image, ImageOps


SOURCE_DIR = Path(__file__).resolve().parent.parent
OUTPUT_DIR = SOURCE_DIR / "assets" / "photos"
DATA_PATH = SOURCE_DIR / "story-data.js"
MAX_EDGE = 1600
QUALITY = 82


GROUP_META = {
    1: {"title": "初见", "note": "故事还没有开始，你已经出现在我的镜头里。"},
    2: {"title": "听见你", "note": "原来心动不只发生在看见你的那一刻。"},
    3: {"title": "想靠近", "note": "我开始认真寻找每一个能更了解你的机会。"},
    4: {"title": "默默喜欢", "note": "那时你还不熟悉我，我的目光却已经跟了你很久。"},
    5: {"title": "笨拙地努力", "note": "想把歌唱好一点，也想离你更近一点。"},
    6: {
        "title": "心动确认",
        "note": "看到你照片的那一眼，我确定我的心跳漏了一拍。第一次心动的时候，我给他起了“小笼包”这个外号，很可爱，小脚步碎碎的，小脑袋笨笨的。",
    },
    7: {"title": "你看见我了", "note": "你第一次拍我、回应我，普通的一天忽然有了光。"},
    8: {"title": "日常里的偏爱", "note": "饮料、衣服和替你拿东西，都是没说出口的喜欢。"},
    9: {"title": "小小的我们", "note": "喜欢慢慢变成了可以互相打趣的亲近。"},
    10: {"title": "第一次并肩看世界", "note": "第一次合照，第一次爬山，也是第一次觉得幸福有了形状。"},
    11: {"title": "镜头里的你", "note": "你睡着、偷笑、发呆的样子，我都想偷偷记住。"},
    12: {"title": "第一次正式约会", "note": "一场电影、一次并肩，足够让我开心很久。"},
    13: {"title": "想把你记久一点", "note": "相机记录下来的每一帧，都想换成往后的漫长岁月。"},
    14: {"title": "不甘心的喜欢", "note": "有过沮丧，也有过犹豫，但只要是你，我还是不想放弃。"},
    15: {"title": "藏着心事的手链", "note": "有些礼物是为了靠近，有些触碰是心跳的借口。"},
    16: {"title": "第一次牵手", "note": "潍河边的散步很安静，手心里却藏着很大的勇气。"},
    17: {"title": "国庆的夜", "note": "你愿意在夜里出来见我，我开始相信答案正在靠近。"},
    18: {"title": "忍不住靠近", "note": "续上的不只是一首歌的时间，还有那一刻的心动。"},
    19: {"title": "十月六日", "note": "从这一天开始，我们不再只是彼此故事里的旁观者。"},
    20: {
        "title": "第一对戒指",
        "note": "戒指是我想与你圆满余生的承诺。小小的圆环不是终点，是我们想一起走下去的证据。",
    },
    21: {"title": "往后余生", "note": "前面是相遇相知，后面还很长，想和你一起慢慢写。"},
}

PHOTO_ORDER_OVERRIDES = {
    14: [1, 0],
    19: [1, 0],
}

CAPTION_REPLACEMENTS = {
    "我看见王晨跟你都在花花": "我看见王晨跟你都在画画",
    "可爱的小内八，这是我还好奇这小小的内八里面的小玉足是什么样的呢":
        "可爱的小内八，这时我还在好奇，这小小的内八里面的小玉足是什么样的呢",
    "这是我们的第一队戒指": "这是我们的第一对戒指",
}


def caption_from_name(path: Path) -> str:
    stem = path.stem
    caption = re.sub(r"^\d+", "", stem).strip(" ，,。")
    if not caption:
        return "这一天，照片替我们记住了那些没有写下来的话。"
    for old, new in CAPTION_REPLACEMENTS.items():
        caption = caption.replace(old, new)
    return caption


def main() -> int:
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    source_images = sorted(
        [
            path
            for path in SOURCE_DIR.iterdir()
            if path.is_file() and path.suffix.lower() in {".jpg", ".jpeg", ".png", ".webp"}
        ],
        key=lambda path: (int(re.match(r"\d+", path.name).group()), path.name),
    )

    groups: dict[int, list[dict[str, object]]] = defaultdict(list)
    group_indexes: dict[int, int] = defaultdict(int)

    for path in source_images:
        group = int(re.match(r"\d+", path.name).group())
        group_indexes[group] += 1
        with Image.open(path) as opened:
            image = ImageOps.exif_transpose(opened).convert("RGB")
            image.thumbnail((MAX_EDGE, MAX_EDGE), Image.Resampling.LANCZOS)
            output_name = f"{group:02d}-{group_indexes[group]:02d}.webp"
            output_path = OUTPUT_DIR / output_name
            image.save(output_path, "WEBP", quality=QUALITY, method=6)
            width, height = image.size

        groups[group].append(
            {
                "src": f"assets/photos/{output_name}",
                "caption": caption_from_name(path),
                "width": width,
                "height": height,
            }
        )

    story = []
    for group in sorted(groups):
        order = PHOTO_ORDER_OVERRIDES.get(group)
        if order:
            groups[group] = [groups[group][index] for index in order]
        meta = GROUP_META[group]
        story.append(
            {
                "group": group,
                "title": meta["title"],
                "note": meta["note"],
                "photos": groups[group],
            }
        )

    payload = {
        "title": "赵维凤与王嘉轩",
        "subtitle": "从惊鸿一瞥，到余生漫长",
        "totalPhotos": len(source_images),
        "chapters": story,
    }
    DATA_PATH.write_text(
        "window.STORY_DATA = "
        + json.dumps(payload, ensure_ascii=False, indent=2)
        + ";\n",
        encoding="utf-8",
    )

    print(f"Optimized {len(source_images)} photos into {OUTPUT_DIR}")
    print(f"Wrote story data to {DATA_PATH}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
