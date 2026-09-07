import os
import re
from datetime import datetime
from PIL import Image
from PIL.ExifTags import TAGS, GPSTAGS
import wikipediaapi

# --- Configuration ---
AUTHOR_DEFAULT = "R. Incognito"
LOCATION_DEFAULT = "USA"
IMAGE_ASSETS_PATH = "./assets/images/zenith-nadir"


# Initialize Wikipedia API with user agent
wiki_en = wikipediaapi.Wikipedia(user_agent="AstrophotoArchiver/1.0", language="en")
wiki_zh = wikipediaapi.Wikipedia(user_agent="AstrophotoArchiver/1.0", language="zh")

def parse_filename(filename):
    """
    Extracts ID, Date, and Object/Title from patterns like:
    5-C__0017_2026-01-10-m45.jpg
    """
    base_name = os.path.splitext(filename)[0]
    
    # Regex to capture: ID (5-C__0017), Date (2026-01-10), Target (m45)
    pattern = r"^([A-Za-z0-9\-_]+)_(\d{4}-\d{2}-\d{2})-(.+)$"
    match = re.match(pattern, base_name)
    
    if match:
        node_id = match.group(1)
        date_str = match.group(2)
        target = match.group(3)
        return node_id, date_str, target, base_name
    
    return "UNKNOWN_ID", "UNKNOWN_DATE", "UNKNOWN_TARGET", base_name

def extract_exif(image_path):
    """
    Extracts exposure, ISO, focal length, and camera model from JPG EXIF data.
    """
    exif_data = {}
    try:
        with Image.open(image_path) as img:
            info = img._getexif()
            if info:
                for tag, value in info.items():
                    decoded = TAGS.get(tag, tag)
                    exif_data[decoded] = value
    except Exception as e:
        print(f"Error reading EXIF for {image_path}: {e}")
        
    camera = exif_data.get("Model", "Unknown Telescope/Camera")
    iso = exif_data.get("ISOSpeedRatings", "N/A")
    focal_length = exif_data.get("FocalLength", "N/A")
    
    # Exposure time formatting
    exposure = exif_data.get("ExposureTime", "N/A")
    if isinstance(exposure, tuple) or hasattr(exposure, 'numerator'):
        exposure_str = f"{exposure}s"
    else:
        exposure_str = f"{exposure}s" if exposure != "N/A" else "N/A"

    return {
        "camera": camera,
        "iso": iso,
        "focal_length": f"{focal_length}mm" if focal_length != "N/A" else "N/A",
        "exposure": exposure_str
    }

def normalize_target_for_wiki(raw_target):
    """
    Normalizes targets like 'm13', 'm-13', or 'messier13' into 'Messier 13' / 'Messier-13'
    for unambiguous Wikipedia searching.
    """
    target = raw_target.strip().lower()
    
    # Map common prefixes to full standard titles
    catalog_map = {
        r"^m[-_]?(\d+)$": r"Messier \1",
        r"^ic[-_]?(\d+)$": r"IC \1",
        r"^ngc[-_]?(\d+)$": r"NGC \1",
        r"^c[-_]?(\d+)$": r"Caldwell \1",
        r"^b[-_]?(\d+)$": r"Barnard \1",
        r"^sh2[-_]?(\d+)$": r"Sharpless \1",
    }
    
    for pattern, replacement in catalog_map.items():
        if re.match(pattern, target):
            return re.sub(pattern, replacement, target)
            
    # If no catalog prefix matched (e.g., 'pleiades'), return formatted string
    return raw_target.replace("-", " ").replace("_", " ").title()


def get_wiki_summaries(target_name):
    """
    Fetches English and Chinese summaries from Wikipedia.
    """
    page_en = wiki_en.page(target_name)
    page_zh = wiki_zh.page(target_name)
    
    summary_en = page_en.summary[0:800] + "..." if page_en.exists() else "(English Wikipedia summary unavailable)"
    summary_zh = page_zh.summary[0:800] + "..." if page_zh.exists() else "(Chinese Wikipedia summary unavailable)"
    
    title_en = page_en.title if page_en.exists() else target_name
    title_zh = page_zh.title if page_zh.exists() else target_name

    return title_en, title_zh, summary_en, summary_zh

def generate_markdown(jpg_path, output_dir="output_md"):
    filename = os.path.basename(jpg_path)
    node_id, date_str, raw_target, base_name = parse_filename(filename)
    target_name = normalize_target_for_wiki(raw_target)
    
    # Calculate parent_node_1 dynamically from node_id
    # parent_node = node_id.split("_")[0] + "0" + node_id.split("_")[1] if "__" in node_id else "UNKNOWN"
    parent_node ="5-0__C000"
    # Get Metadata
    exif = extract_exif(jpg_path)
    title_en, title_zh, vista_en, vista_zh = get_wiki_summaries(target_name)
    
    webp_path = f"{IMAGE_ASSETS_PATH}/{base_name}.webp"

    md_content = f"""---
id: "{node_id}"  
type: "img" 
parent_node_1: "{parent_node}"
parent_node_2:

title_en: "{title_en}"
title_zh: "{title_zh}"

author_1: "{AUTHOR_DEFAULT}"

time: "{date_str}"
location: "{LOCATION_DEFAULT}"

ui_render: true
display_priority: false

img_color: {webp_path}  

---

## 觀景 / vista
<div style="display: flex; gap: 24px; align-items: flex-start;">
<div style="flex: 1;" markdown="1">

*({vista_zh})*

</div>
<div style="flex: 1; color: #a0a0a0;" markdown="1">

*({vista_en})*

</div>
</div>

---

## 亂語 / text
<div style="display: flex; gap: 24px; align-items: flex-start;">
<div style="flex: 1;" markdown="1">

*(Chinese background context / text details)*

</div>
<div style="flex: 1; color: #a0a0a0;" markdown="1">

*(English background context / text details)*

</div>
</div>

---

## 懸置 / epoché
<div style="display: flex; gap: 24px; align-items: flex-start;">
<div style="flex: 1;" markdown="1">

*(Chinese epoché description)*

</div>
<div style="flex: 1; color: #a0a0a0;" markdown="1">

*(English translation goes here...)*

</div>
</div>

---

## 理解 / wissen
<div style="display: flex; gap: 24px; align-items: flex-start;">
<div style="flex: 1;" markdown="1">

*(Chinese Popperian/Bayesian analysis)*

</div>
<div style="flex: 1; color: #a0a0a0;" markdown="1">

* (photo taken with {exif['camera']} ISO-{exif['iso']} Focal Length {exif['focal_length']} Exposure Time {exif['exposure']}. Simple Post-Processing)*

</div>
</div>

---

## 詮釋 / interpret
<div style="display: flex; gap: 24px; align-items: flex-start;">
<div style="flex: 1;" markdown="1">

*(Chinese hermeneutics)*

</div>
<div style="flex: 1; color: #a0a0a0;" markdown="1">

*(English translation)*

</div>
</div>

---

## 拆建 / deconstruct
<div style="display: flex; gap: 24px; align-items: flex-start;">
<div style="flex: 1;" markdown="1">

*(Chinese deconstructionist criticism)*

</div>
<div style="flex: 1; color: #a0a0a0;" markdown="1">

*(English translation)*

</div>
</div>

---

## 評語 / ai expert critics
<div style="display: flex; gap: 24px; align-items: flex-start;">
<div style="flex: 1;" markdown="1">

*(Chinese AI criticism)*

</div>
<div style="flex: 1; color: #a0a0a0;" markdown="1">

*(English translation)*

</div>
</div>

---
"""

    os.makedirs(output_dir, exist_ok=True)
    out_filename = os.path.join(output_dir, f"{node_id}-{date_str}-{raw_target}.md")
    with open(out_filename, "w", encoding="utf-8") as f:
        f.write(md_content)
    print(f"Generated: {out_filename}")

# --- Batch Execution ---
if __name__ == "__main__":

# Path to directory containing your original JPGs
    IMAGE_DIRECTORY = "./assets/images/zenith-nadir-jpg" 
    
    if os.path.exists(IMAGE_DIRECTORY):
        for fname in os.listdir(IMAGE_DIRECTORY):
            if fname.lower().endswith((".jpg", ".jpeg")):
                generate_markdown(os.path.join(IMAGE_DIRECTORY, fname))
    else:
        print(f"Directory '{IMAGE_DIRECTORY}' not found. Please create it and place your JPGs inside.")