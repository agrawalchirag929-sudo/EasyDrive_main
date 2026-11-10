"""
EasyDrive Car Image Processing Pipeline (tools/process_cars.py)
---------------------------------------------------------------
Processes raw studio car captures into uniform 800x500 WebP images:
1. Samples frame colour from pixel (3, 3).
2. Detects inner rectangle: bounding box of pixels whose maximum per-channel difference
   from the frame colour is > 3.
3. Insets that box by 3px on every side.
4. Crops to that inset box.
5. Samples backdrop colour as the median RGB of a 20x20 patch at 12px inside the crop's
   top-left corner.
6. Centers crop on a 16:10 canvas filled with that backdrop colour (canvas width = crop width / 0.92,
   canvas height = width / 1.6).
7. Resizes to 800x500 and saves as WebP quality 85 to client/assets/cars/<slug>.webp.
8. Prints frame colour, backdrop colour, crop box, and output size for every car, and
   the median backdrop colour of all 12 images as a hex value.
"""

import os
import sys
from pathlib import Path
from PIL import Image
import numpy as np

# Explicit map of source filenames to canonical car slugs matching cars.json
SOURCE_MAPPING = {
    "01_maruti_swift.jpg": "maruti-swift",
    "02_honda_city.jpg": "honda-city",
    "03_hyundai_creta.jpg": "hyundai-creta",
    "04_mahindra_thar.jpg": "mahindra-thar",
    "05_mahindra_xuv700.jpg": "mahindra-xuv700",
    "06_toyota_innova_crysta.jpg": "toyota-innova-crysta",
    "07_tata_nexon_ev.jpg": "tata-nexon-ev",
    "08_hyundai_i20.jpg": "hyundai-i20",
    "09_hyundai_verna.jpg": "hyundai-verna",
    "10_toyota_fortuner.jpg": "toyota-fortuner",
    "11_mg_zs_ev.jpg": "mg-zs-ev",
    "12_mercedes_benz_c_class.jpg": "mercedes-c-class",
}

def resolve_slug(filename: str) -> str:
    """Resolves filename to standard slug."""
    if filename in SOURCE_MAPPING:
        return SOURCE_MAPPING[filename]
    stem = Path(filename).stem
    return stem.replace("_", "-")

def process_car_image(src_path: Path, dest_path: Path, slug: str) -> tuple[int, int, int]:
    """
    Processes a single source image into standard 800x500 WebP.
    Returns the sampled backdrop colour (R, G, B).
    """
    im = Image.open(src_path).convert("RGB")
    
    # 1. Read frame colour from pixel (3, 3)
    frame_color = im.getpixel((3, 3))
    
    # 2. Inner rectangle = bounding box of pixels whose maximum per-channel
    # difference from frame colour > 3
    arr = np.array(im, dtype=np.int16)
    frame_arr = np.array(frame_color, dtype=np.int16)
    diff = np.abs(arr - frame_arr)
    max_diff = np.max(diff, axis=2)
    mask = max_diff > 3
    
    mask_img = Image.fromarray((mask * 255).astype(np.uint8))
    raw_bbox = mask_img.getbbox()
    if not raw_bbox:
        raw_bbox = (0, 0, im.width, im.height)
        
    # 3. Inset that box by 3px on every side
    x0, y0, x1, y1 = raw_bbox
    crop_box = (
        max(0, x0 + 3),
        max(0, y0 + 3),
        min(im.width, x1 - 3),
        min(im.height, y1 - 3)
    )
    
    # 4. Crop to that box
    cropped = im.crop(crop_box)
    cw, ch = cropped.size
    
    # 5. Sample backdrop colour as median RGB of a 20x20 patch at 12px inside crop's top-left corner
    patch = np.array(cropped)[12:32, 12:32]
    med_channel = np.median(patch, axis=(0, 1))
    backdrop_color = tuple(int(round(c)) for c in med_channel)
    
    # 6. Create 16:10 canvas filled with backdrop colour
    # canvas width = crop width / 0.92, canvas height = width / 1.6
    canvas_w = int(round(cw / 0.92))
    canvas_h = int(round(canvas_w / 1.6))
    
    canvas = Image.new("RGB", (canvas_w, canvas_h), color=backdrop_color)
    paste_x = (canvas_w - cw) // 2
    paste_y = (canvas_h - ch) // 2
    canvas.paste(cropped, (paste_x, paste_y))
    
    # 7. Resize to 800x500 and save as WebP quality 85 (overwrite)
    final_img = canvas.resize((800, 500), Image.Resampling.LANCZOS)
    dest_path.parent.mkdir(parents=True, exist_ok=True)
    final_img.save(dest_path, "WEBP", quality=85)
    
    output_size = final_img.size
    
    # Print for every car: frame colour, backdrop colour, crop box, output size
    print(f"[{slug}]")
    print(f"  Frame colour:    RGB{frame_color} (#{frame_color[0]:02X}{frame_color[1]:02X}{frame_color[2]:02X})")
    print(f"  Backdrop colour: RGB{backdrop_color} (#{backdrop_color[0]:02X}{backdrop_color[1]:02X}{backdrop_color[2]:02X})")
    print(f"  Crop box:        {crop_box} (Crop size: {cw}x{ch})")
    print(f"  Output size:     {output_size[0]}x{output_size[1]} ({dest_path.name})\n")
    
    return backdrop_color

def main():
    repo_root = Path(__file__).resolve().parent.parent
    src_dir = repo_root / "client" / "assets" / "cars" / "_source"
    dest_dir = repo_root / "client" / "assets" / "cars"
    
    if not src_dir.exists():
        print(f"Error: Source directory {src_dir} not found!", file=sys.stderr)
        sys.exit(1)
        
    print("=================================================================")
    print("EasyDrive Fleet Image Processing Pipeline (Phase 1h)")
    print(f"Source: {src_dir}")
    print(f"Destination: {dest_dir}")
    print("=================================================================\n")
    
    all_backdrops = []
    processed_count = 0
    
    # Process files in sorted order
    for filename in sorted(os.listdir(src_dir)):
        if not filename.lower().endswith((".jpg", ".jpeg", ".png", ".webp")):
            continue
            
        slug = resolve_slug(filename)
        src_file = src_dir / filename
        dest_file = dest_dir / f"{slug}.webp"
        
        backdrop = process_car_image(src_file, dest_file, slug)
        all_backdrops.append(backdrop)
        processed_count += 1
        
    if all_backdrops:
        arr_backdrops = np.array(all_backdrops)
        median_all = np.median(arr_backdrops, axis=0)
        median_rgb = tuple(int(round(c)) for c in median_all)
        median_hex = f"#{median_rgb[0]:02X}{median_rgb[1]:02X}{median_rgb[2]:02X}"
        
        print("=================================================================")
        print(f"Processed {processed_count} car images successfully.")
        print(f"Median Backdrop RGB: {median_rgb}")
        print(f"Median Backdrop Hex: {median_hex}")
        print("=================================================================")

if __name__ == "__main__":
    main()
