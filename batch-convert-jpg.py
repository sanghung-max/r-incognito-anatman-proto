import os
import shutil
import glob
from pathlib import Path
from PIL import Image, ExifTags

# ==========================================
# USER-DEFINED PARAMETERS
# ==========================================
BOARD = "9"
FOLDER = "A"
STARTING_HEX = "1101"
AUTHORS = ["Frances Hung"]
PARENTS = ["9-0__A011"]
LOCATION = "USA"

# Subfolder destinations
JPG_SUBDIR = "jpg"
MD_SUBDIR = "ms"  # Matches Requirement 9 (Note: Example text references ./md)


def get_exif_date(image_path):
    """Extracts photo taken date (YYYY-MM-DD) from EXIF data. Defaults to 1970-01-01."""
    try:
        with Image.open(image_path) as img:
            exif_data = img._getexif()
            if exif_data:
                for tag, value in exif_data.items():
                    tag_name = ExifTags.TAGS.get(tag, tag)
                    if tag_name == "DateTimeOriginal":
                        # Format is usually "YYYY:MM:DD HH:MM:SS"
                        date_str = value.split(" ")[0].replace(":", "-")
                        return date_str
    except Exception as e:
        print(f"  [Warning] Could not read EXIF date for {image_path}: {e}")
    return "1970-01-01"


def get_exif_details(image_path):
    """Extracts detailed EXIF properties for the vista section."""
    details = {
        "Camera Maker": "N/A",
        "Camera Model": "N/A",
        "F-stop": "N/A",
        "Exposure time": "N/A",
        "ISO Speed": "N/A"
    }
    try:
        with Image.open(image_path) as img:
            exif_raw = img._getexif()
            if not exif_raw:
                return details
            
            exif = {ExifTags.TAGS.get(k, k): v for k, v in exif_raw.items() if k in ExifTags.TAGS}
            
            if "Make" in exif:
                details["Camera Maker"] = str(exif["Make"]).strip()
            if "Model" in exif:
                details["Camera Model"] = str(exif["Model"]).strip()
            if "FNumber" in exif:
                try:
                    f_num = float(exif["FNumber"])
                    details["F-stop"] = f"f/{f_num:g}"
                except Exception:
                    details["F-stop"] = str(exif["FNumber"])
            if "ExposureTime" in exif:
                try:
                    exp = float(exif["ExposureTime"])
                    if exp < 1 and exp > 0:
                        details["Exposure time"] = f"1/{int(round(1/exp))} sec."
                    else:
                        details["Exposure time"] = f"{exp} sec."
                except Exception:
                    details["Exposure time"] = str(exif["ExposureTime"])
            if "ISOSpeedRatings" in exif:
                details["ISO Speed"] = f"ISO-{exif['ISOSpeedRatings']}"
    except Exception as e:
        print(f"  [Warning] Could not read EXIF info for {image_path}: {e}")
        
    return details


def generate_md_content(doc_id, name_string, photo_date, exif_info, converted_jpg_filename):
    """Generates the Markdown frontmatter and sections."""
    title_en = name_string.replace("-", " ")
    
    parents_str = "\n".join([f"- {p}" for p in PARENTS])
    authors_str = "\n".join([f"- {a}" for a in AUTHORS])
    
    md_content = f"""---
id: {doc_id}
type: img
parents:
{parents_str}
title_en: {title_en}
title_zh:
authors:
{authors_str}
time: {photo_date}
location: {LOCATION}
ui_render: true
display_priority: false
img_color: assets/board-{BOARD}/img_color/{converted_jpg_filename[:-4]}.webp
img_thumb: assets/board-{BOARD}/img_thumb/{converted_jpg_filename[:-4]}.webp
---

## 觀景 / vista
Camera Maker: {exif_info['Camera Maker']}
Camera Model: {exif_info['Camera Model']}
F-stop: {exif_info['F-stop']}
Exposure time: {exif_info['Exposure time']}
ISO Speed: {exif_info['ISO Speed']}

---

## 亂語 / text

---

## 懸置 / epoché

---

## 理解 / wissen

---

## 詮釋 / interpret

---

## 拆建 / deconstruct

---

## 評語 / ai expert critics

---
"""
    return md_content


def main():
    script_dir = Path.cwd()
    
    # Create subdirectories if they don't exist
    jpg_dir = script_dir / JPG_SUBDIR
    md_dir = script_dir / MD_SUBDIR
    jpg_dir.mkdir(exist_ok=True)
    md_dir.mkdir(exist_ok=True)
    
    # Find all JPG/JPEG files directly in current folder (excluding subfolders)
    image_files = sorted([
        f for f in script_dir.iterdir() 
        if f.is_file() and f.suffix.lower() in [".jpg", ".jpeg"]
    ])
    
    if not image_files:
        print("No JPG images found in the working directory.")
        return

    current_hex_int = int(STARTING_HEX, 16)

    for img_path in image_files:
        filename = img_path.name
        
        # Parse requirement 1: <name-string>_<rest-of-fragment>.jpg
        if "_" not in filename:
            print(f"Skipping {filename}: Does not contain standard delimiter '_'")
            continue
            
        name_string = filename.split("_")[0]
        
        # Requirement 6: Hexadecimal ID padded to matching length
        hex_str = f"{current_hex_int:04X}"  # Upper-case hex
        doc_id = f"{BOARD}-{FOLDER}__{hex_str}"
        
        # Requirement 7: Photo date
        photo_date = get_exif_date(img_path)
        
        # Requirement 3: Converted filename format
        converted_basename = f"{doc_id}_{photo_date}-{name_string}"
        converted_jpg_name = f"{converted_basename}.jpg"
        converted_md_name = f"{converted_basename}.md"
        
        # Copy image to ./jpg subfolder
        dest_jpg_path = jpg_dir / converted_jpg_name
        shutil.copy2(img_path, dest_jpg_path)
        
        # Extract EXIF info and generate Markdown
        exif_info = get_exif_details(img_path)
        md_text = generate_md_content(doc_id, name_string, photo_date, exif_info, converted_jpg_name)
        
        # Save Markdown to ./ms subfolder
        dest_md_path = md_dir / converted_md_name
        with open(dest_md_path, "w", encoding="utf-8") as f:
            f.write(md_text)
            
        print(f"Processed: {filename} -> {JPG_SUBDIR}/{converted_jpg_name} & {MD_SUBDIR}/{converted_md_name}")
        
        # Increment sequence counter
        current_hex_int += 1

if __name__ == "__main__":
    main()