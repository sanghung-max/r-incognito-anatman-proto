from dotenv import load_dotenv
load_dotenv()  # Automatically loads variables from .env into os.environ
import os
import re
import time
from PIL import Image, ExifTags
from google import genai

# --- Configuration ---
IMAGE_DIR = "assets/images/reflexive-jpg"
OUTPUT_DIR = "./reflexive_md"
IMAGE_ASSETS_PATH = "assets/images/reflexive"

# Initialize Google GenAI client (uses GEMINI_API_KEY from environment)
client = genai.Client()

def parse_filename(filename):
    """
    Parses pattern: B-D__0001_1967-12-31-childhood-backyard-garden.jpg
    Returns: node_id, date_str, title_en, raw_title, base_name
    """
    base_name = os.path.splitext(filename)[0]
    pattern = r"^([A-Za-z0-9\-_]+)_(\d{4}-\d{2}-\d{2})-(.+)$"
    match = re.match(pattern, base_name)
    
    if match:
        node_id = match.group(1)
        date_str = match.group(2)
        raw_title = match.group(3)
        # Convert hyphenated name to space-delimited Title Case
        title_en = raw_title.replace("-", " ").replace("_", " ").title()
        return node_id, date_str, title_en, raw_title, base_name
    
    return "UNKNOWN_ID", "UNKNOWN_DATE", base_name.replace("-", " ").title(), base_name, base_name

def convert_to_degrees(value):
    """Convert GPS coordinates to decimal degrees."""
    d = float(value[0])
    m = float(value[1])
    s = float(value[2])
    return d + (m / 60.0) + (s / 3600.0)

def extract_metadata(image_path):
    """Extracts resolution, camera specs, EXIF, and GPS location data."""
    meta = {
        "dimensions": "Unknown",
        "date_taken": "N/A",
        "camera_make": "",
        "camera_model": "Unknown Camera",
        "f_stop": "N/A",
        "exposure": "N/A",
        "iso": "N/A",
        "focal_length": "N/A",
        "location": "N/A"
    }
    
    try:
        with Image.open(image_path) as img:
            meta["dimensions"] = f"{img.width}x{img.height} px"
            
            exif_raw = img._getexif()
            if not exif_raw:
                return meta
                
            exif = {ExifTags.TAGS.get(k, k): v for k, v in exif_raw.items()}
            
            meta["camera_make"] = str(exif.get("Make", "")).strip()
            meta["camera_model"] = str(exif.get("Model", "Unknown Camera")).strip()
            meta["date_taken"] = str(exif.get("DateTimeOriginal", "N/A"))
            
            if "FNumber" in exif:
                f_val = exif["FNumber"]
                meta["f_stop"] = f"f/{float(f_val):.1f}"
            if "ExposureTime" in exif:
                meta["exposure"] = f"{exif['ExposureTime']}s"
            if "ISOSpeedRatings" in exif:
                meta["iso"] = f"ISO-{exif['ISOSpeedRatings']}"
            if "FocalLength" in exif:
                meta["focal_length"] = f"{float(exif['FocalLength']):.0f}mm"
                
            # Parse GPS if present
            if "GPSInfo" in exif:
                gps_info = exif["GPSInfo"]
                gps_tags = {ExifTags.GPSTAGS.get(k, k): v for k, v in gps_info.items()}
                
                if "GPSLatitude" in gps_tags and "GPSLongitude" in gps_tags:
                    lat = convert_to_degrees(gps_tags["GPSLatitude"])
                    if gps_tags.get("GPSLatitudeRef") == "S":
                        lat = -lat
                    lon = convert_to_degrees(gps_tags["GPSLongitude"])
                    if gps_tags.get("GPSLongitudeRef") == "W":
                        lon = -lon
                    meta["location"] = f"{lat:.4f}° N, {lon:.4f}° E"
                    
    except Exception as e:
        print(f"  [EXIF Note] {e}")
        
    return meta

def analyze_image_with_gemini(image_path, max_retries=3):
    """Sends image to Gemini Flash with retry logic."""
    for attempt in range(1, max_retries + 1):
        try:
            with Image.open(image_path) as img:
                prompt = (
                    "Provide a brief, objective phenomenological description of this photograph "
                    "focusing on sensory details, light, framing, texture, and visual atmosphere. "
                    "Keep it concise (2-3 sentences max) without making assumptions about personal history or emotion."
                )
                
                # Using gemini-1.5-flash or gemini-2.0-flash for higher free RPM limits
                response = client.models.generate_content(
                    model='gemini-1.5-flash', 
                    contents=[prompt, img]
                )
                return response.text.strip().replace("\n", " ")

        except Exception as e:
            err_msg = str(e)
            if "429" in err_msg or "503" in err_msg or "RESOURCE_EXHAUSTED" in err_msg:
                wait_time = attempt * 15  # Backoff wait
                print(f"  [Quota Limit / Spike] Attempt {attempt}/{max_retries}. Waiting {wait_time}s...")
                time.sleep(wait_time)
            else:
                print(f"  [Gemini API Error] {e}")
                break

    return None # Return None if all retries fail

def process_missing_epoches():
    """Scans generated .md files and backfills missing epoche descriptions."""
    if not os.path.exists(OUTPUT_DIR):
        print(f"Directory '{OUTPUT_DIR}' not found.")
        return

    md_files = [f for f in os.listdir(OUTPUT_DIR) if f.endswith(".md")]
    print(f"Found {len(md_files)} markdown files in '{OUTPUT_DIR}'. Checking for missing epoche descriptions...\n")

    for idx, md_file in enumerate(md_files):
        md_path = os.path.join(OUTPUT_DIR, md_file)
        
        with open(md_path, "r", encoding="utf-8") as f:
            content = f.read()

        # Check if the epoche section is unpopulated
        placeholder = "Phenomenological description to be added manually."
        if placeholder in content:
            # Extract node_id and find corresponding source image file
            node_id = md_file.split("-")[0]  # e.g., B-D__0023
            
            # Find matching image in IMAGE_DIR
            matching_img = None
            for fname in os.listdir(IMAGE_DIR):
                if fname.startswith(node_id) and fname.lower().endswith((".jpg", ".jpeg", ".png", ".webp")):
                    matching_img = os.path.join(IMAGE_DIR, fname)
                    break

            if matching_img:
                print(f"Backfilling epoché for: {md_file}...")
                new_epoche = analyze_image_with_gemini(matching_img)
                
                if new_epoche:
                    # Replace placeholder with generated epoché description
                    updated_content = content.replace(f"*({placeholder})*", f"*({new_epoche})*")
                    updated_content = updated_content.replace(placeholder, new_epoche)
                    
                    with open(md_path, "w", encoding="utf-8") as f:
                        f.write(updated_content)
                    print(f"  -> Successfully updated {md_file}!")
                else:
                    print(f"  -> Skipped {md_file} (Gemini call failed).")

                # Pause 5 seconds between backfill calls to respect rate limits
                time.sleep(5)

def build_wissen_string(meta, filename_date):
    """Builds the technical description string for wissen."""
    camera_str = f"{meta['camera_make']} {meta['camera_model']}".strip()
    
    details = [f"Resolution: {meta['dimensions']}"]
    if camera_str and camera_str != "Unknown Camera":
        details.append(f"Device: {camera_str}")
    if meta['f_stop'] != "N/A":
        details.append(meta['f_stop'])
    if meta['exposure'] != "N/A":
        details.append(meta['exposure'])
    if meta['iso'] != "N/A":
        details.append(meta['iso'])
    if meta['focal_length'] != "N/A":
        details.append(meta['focal_length'])
    if meta['location'] != "N/A":
        details.append(f"Coordinates: {meta['location']}")
    if meta['date_taken'] != "N/A":
        details.append(f"Digital Capture Date: {meta['date_taken']}")
    
    return f"photo metadata: {', '.join(details)}. Subject contextual date: {filename_date}."

def generate_md_file(jpg_path):
    filename = os.path.basename(jpg_path)
    print(f"Processing: {filename}...")
    
    node_id, date_str, title_en, raw_title, base_name = parse_filename(filename)
    
    # Parent node reference (e.g. 1-0__0000 or board ID)
    parent_node = "1-0__0000" 
    
    # Extract metadata and generate Gemini description
    meta = extract_metadata(jpg_path)
    wissen_technical = build_wissen_string(meta, date_str)
    epoche_baseline = analyze_image_with_gemini(jpg_path)
    
    webp_path = f"{IMAGE_ASSETS_PATH}/{base_name}.webp"

    md_content = f"""---
id: "{node_id}"  
type: "img" 
parent_node_1: "{parent_node}"
parent_node_2:

title_en: "{title_en}"
title_zh: ""

author_1: "R. Incognito"

time: "{date_str}"
location: "USA"

ui_render: true
display_priority: false

img_color: {webp_path}  

---

## 觀景 / vista
<div style="display: flex; gap: 24px; align-items: flex-start;">
<div style="flex: 1;" markdown="1">

*(Chinese visual description goes here...)*

</div>
<div style="flex: 1; color: #a0a0a0;" markdown="1">

*(English visual description goes here...)*

</div>
</div>

---

## 亂語 / text
<div style="display: flex; gap: 24px; align-items: flex-start;">
<div style="flex: 1;" markdown="1">

*(Chinese background context)*

</div>
<div style="flex: 1; color: #a0a0a0;" markdown="1">

*(English background context)*

</div>
</div>

---

## 懸置 / epoché
<div style="display: flex; gap: 24px; align-items: flex-start;">
<div style="flex: 1;" markdown="1">

*(Chinese epoché description)*

</div>
<div style="flex: 1; color: #a0a0a0;" markdown="1">

*({epoche_baseline})*

</div>
</div>

---

## 理解 / wissen
<div style="display: flex; gap: 24px; align-items: flex-start;">
<div style="flex: 1;" markdown="1">

*(Chinese analysis)*

</div>
<div style="flex: 1; color: #a0a0a0;" markdown="1">

* ({wissen_technical}) *

</div>
</div>

---

## 詮釋 / interpret
<div style="display: flex; gap: 24px; align-items: flex-start;">
<div style="flex: 1;" markdown="1">

*(Chinese hermeneutics)*

</div>
<div style="flex: 1; color: #a0a0a0;" markdown="1">

*(English hermeneutics)*

</div>
</div>

---

## 拆建 / deconstruct
<div style="display: flex; gap: 24px; align-items: flex-start;">
<div style="flex: 1;" markdown="1">

*(Chinese deconstructive critique)*

</div>
<div style="flex: 1; color: #a0a0a0;" markdown="1">

*(English deconstructive critique)*

</div>
</div>

---

## 評語 / ai expert critics
<div style="display: flex; gap: 24px; align-items: flex-start;">
<div style="flex: 1;" markdown="1">

*(Chinese AI criticism)*

</div>
<div style="flex: 1; color: #a0a0a0;" markdown="1">

*(English AI criticism)*

</div>
</div>

---
"""

    os.makedirs(OUTPUT_DIR, exist_ok=True)
    # Output file follows f"{node_id}-{raw_title}.md" format
    out_filename = os.path.join(OUTPUT_DIR, f"{node_id}-{raw_title}.md")
    
    with open(out_filename, "w", encoding="utf-8") as f:
        f.write(md_content)
    print(f" -> Generated: {out_filename}")

if __name__ == "__main__":
    process_missing_epoches()