# parses all 5 pattern variants, automatically aggregates multi-part PDFs 
# (like pdf_1, pdf_2 or dynamic page sequences), 
# standardizes media path variables, and correctly preserves all metadata


import os
import json
import re
import yaml

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
VAULT_ROOT = os.path.abspath(os.path.join(SCRIPT_DIR, "..")) if os.path.basename(SCRIPT_DIR) == "_py-utilities" else os.getcwd()

OUTPUT_FILE = os.path.join(VAULT_ROOT, "js", "archive_data.js")
EXCLUDE_DIRS = {"_app", "_templates", "_py-utilities", "__pycache__", ".obsidian", ".git", "assets", "js"}

def parse_md_file(file_path):
    try:
        with open(file_path, "r", encoding="utf-8-sig") as f:
            content = f.read().strip()
    except Exception as e:
        print(f"⚠️ Could not read file {file_path}: {e}")
        return None

    # Robust multi-line frontmatter parser handling --- or ... delimiters
    if not content.startswith("---"):
        return None

    parts = re.split(r"^\s*(?:---|(?:\.\.\.))\s*$", content, maxsplit=2, flags=re.MULTILINE)
    if len(parts) < 2:
        return None

    yaml_str = parts[1]
    body_str = parts[2] if len(parts) > 2 else ""

    try:
        data = yaml.safe_load(yaml_str) or {}
    except Exception as e:
        print(f"❌ YAML Syntax Error in {file_path}: {e}")
        return None

    node_id = data.get("id")
    if not node_id:
        return None

    # Parse Markdown Body Sections
    sections = {}
    curr_sec = "intro"
    sections[curr_sec] = []
    for line in body_str.splitlines():
        if line.startswith("## "):
            curr_sec = line.replace("## ", "").strip()
            sections[curr_sec] = []
        else:
            sections[curr_sec].append(line)

    clean_sections = {k: "\n".join(v).strip() for k, v in sections.items() if "\n".join(v).strip()}

    # Capture dynamic multi-PDF keys (e.g., pdf_1, pdf_2, pdf_1_thumbnail, etc.)
    pdf_manifest = []
    pdf_keys = sorted([k for k in data.keys() if re.match(r"^pdf(_\d+)?$", str(k))])
    
    for key in pdf_keys:
        suffix = key.replace("pdf", "") # "" for 'pdf', "_1" for 'pdf_1'
        thumb_key = f"pdf{suffix}_thumbnail"
        pdf_manifest.append({
            "src": data.get(key),
            "thumbnail": data.get(thumb_key, data.get("pdf_thumbnail", ""))
        })

    # Collect multi-author metadata
    authors = [str(v) for k, v in data.items() if k.startswith("author_") and v]

    return {
        "id": str(node_id).strip(),
        "type": data.get("type", "node"),
        "title_en": data.get("title_en", ""),
        "title_zh": data.get("title_zh", ""),
        "age": data.get("age"),
        "description_en": data.get("description_en", ""),
        "description_zh": data.get("description_zh", ""),
        "authors": authors,
        "time": str(data.get("time", "")),
        "location": data.get("location", ""),
        "ui_render": data.get("ui_render", True),
        "display_priority": data.get("display_priority", False),
        
        # Primary Media Routing Fields
        "audio": data.get("audio", ""),
        "video": data.get("video", ""),
        "img_color": data.get("img_color", ""),
        "img_mono": data.get("img_mono", ""),
        
        # Standard Single/Multi PDF manifest
        "pdf_manifest": pdf_manifest,
        
        # Student Publication Dynamic Range Config
        "page_pattern": data.get("page_pattern", ""),
        "page_thumbnail_pattern": data.get("page_thumbnail_pattern", ""),
        "page_start": data.get("page_start", None),
        "page_end": data.get("page_end", None),
        
        "parents": [str(v) for k, v in data.items() if k.startswith("parent_node_") and v],
        "children": [str(v) for k, v in data.items() if k.startswith("children_node_") and v],
        "content_sections": clean_sections,
        "leaf_count": 0
    }

def compile_archive():
    raw_nodes = {}
    print(f"🔍 Scanning Vault Root: {VAULT_ROOT}")

    for root, dirs, files in os.walk(VAULT_ROOT):
        dirs[:] = [d for d in dirs if d not in EXCLUDE_DIRS]
        
        for file in files:
            if file.endswith(".md"):
                filepath = os.path.join(root, file)
                node = parse_md_file(filepath)
                if node:
                    raw_nodes[node["id"]] = node

    print(f"📦 Discovered {len(raw_nodes)} valid nodes.")

    # Reconcile parent-child connections
    for node_id, node in raw_nodes.items():
        for parent_id in node["parents"]:
            if parent_id in raw_nodes and node_id not in raw_nodes[parent_id]["children"]:
                raw_nodes[parent_id]["children"].append(node_id)

    # Export to _app/data.js
    os.makedirs(os.path.dirname(OUTPUT_FILE), exist_ok=True)
    with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
        f.write(f"window.ARCHIVE_DATA = {json.dumps(raw_nodes, indent=2, ensure_ascii=False)};")

    print(f"✅ Successfully compiled {len(raw_nodes)} nodes into {OUTPUT_FILE}")

if __name__ == "__main__":
    compile_archive()