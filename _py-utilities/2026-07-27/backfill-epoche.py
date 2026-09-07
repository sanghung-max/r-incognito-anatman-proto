from dotenv import load_dotenv
load_dotenv()  # Automatically loads variables from .env into os.environ
import os
import re
import time
from PIL import Image
from google import genai

# --- Configuration ---
IMAGE_DIR = "assets/images/reflexive-jpg"
OUTPUT_DIR = "./reflexive_md"
IMAGE_ASSETS_PATH = "assets/images/reflexive"

client = genai.Client()

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
                    model='gemini-2.0-flash', 
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

if __name__ == "__main__":
    process_missing_epoches()