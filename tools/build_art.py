#!/usr/bin/env python3
"""Copy the app's art into the site: the icon, flattened, and the friends as small WebPs.

    /opt/homebrew/bin/python3 tools/build_art.py [path/to/Malsori]

The app repo is the source (default ~/Documents/Developer/Malsori). Run it again whenever the
icon layers or a friend scene change there.
"""

import pathlib
import sys

from PIL import Image

SITE = pathlib.Path(__file__).resolve().parent.parent / "docs" / "assets"
APP = pathlib.Path(sys.argv[1] if len(sys.argv) > 1 else "~/Documents/Developer/Malsori").expanduser()
PAPER = (236, 229, 216)

# scene -> height in CSS pixels; written at twice that for sharp screens.
FRIENDS = {"welcome": 120, "speak": 96, "build": 108, "steps": 104, "key": 100, "read": 104, "peek": 64}


def icon():
    """The Icon Composer layers over the paper fill, with the soft top light iOS gives it."""
    size = 1024
    base = Image.new("RGB", (size, size), PAPER)
    light = Image.new("RGB", (size, size), (246, 241, 232))
    ramp = Image.linear_gradient("L").resize((size, size))      # white at the bottom
    flat = Image.composite(base, light, ramp).convert("RGBA")
    layers = APP / "Malsori" / "AppIcon.icon" / "Assets"
    for name in ("wordmark", "mari", "sori"):
        flat.alpha_composite(Image.open(layers / f"{name}.png").convert("RGBA"))
    flat = flat.convert("RGB")
    for px in (512, 180):
        flat.resize((px, px), Image.LANCZOS).save(SITE / f"icon-{px}.png", optimize=True)


def friends():
    source = APP / "Malsori" / "Assets.xcassets" / "Friends"
    for scene, height in FRIENDS.items():
        art = Image.open(source / f"friend_{scene}.imageset" / f"friend_{scene}.png").convert("RGBA")
        art = art.crop(art.getbbox())
        target = height * 2
        art = art.resize((round(art.width * target / art.height), target), Image.LANCZOS)
        art.save(SITE / f"friend-{scene}.webp", quality=86, method=6)
        print(f"friend-{scene}.webp {art.width // 2}×{height}")


if __name__ == "__main__":
    SITE.mkdir(parents=True, exist_ok=True)
    icon()
    friends()
    total = sum(f.stat().st_size for f in SITE.iterdir())
    print(f"docs/assets: {total / 1024:.0f} KB")
