# =========================================================================
# generate_data_updated.py
# Parses Obsidian frontmatter & body content into window.ARCHIVE_DATA
# Strips heavy text into assets/data/nodes/{node_id}.json for fast loading
# Enforces strict alphanumeric sorting (1..9, A, B, C, M) for board tiles
# =========================================================================

import os
import json
import re
import yaml

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
VAULT_ROOT = os.path.abspath(os.path.join(SCRIPT_DIR, "..")) if os.path.basename(SCRIPT_DIR) == "_py-utilities" else os.getcwd()

OUTPUT_FILE = os.path.join(VAULT_ROOT, "js", "archive_data.js")
NODE_DATA_DIR = os.path.join(VAULT_ROOT, "assets", "data", "nodes")

EXCLUDE_DIRS = {"_app", "_templates", "_py-utilities", "__pycache__", ".obsidian", ".git", "assets", "js"}

VALID_SECTION_KEYS = {
    "vista": "觀景 vista",
    "觀景": "觀景 vista",
    "觀景 / vista": "觀景 vista",
    "觀景 vista": "觀景 vista",
    
    "text": "亂語 text",
    "亂語": "亂語 text",
    "亂語 / text": "亂語 text",
    "亂語 text": "亂語 text",
    
    "epoche": "懸置 epoché",
    "epoché": "懸置 epoché",
    "懸置": "懸置 epoché",
    "懸置 / epoché": "懸置 epoché",
    "懸置 epoché": "懸置 epoché",
    
    "wissen": "理解 wissen",
    "理解": "理解 wissen",
    "理解 / wissen": "理解 wissen",
    "理解 wissen": "理解 wissen",
    
    "interpret": "詮釋 interpret",
    "詮釋": "詮釋 interpret",
    "詮釋 / interpret": "詮釋 interpret",
    "詮釋 interpret": "詮釋 interpret",
    
    "deconstruct": "拆建 deconstruct",
    "拆建": "拆建 deconstruct",
    "拆建 / deconstruct": "拆建 deconstruct",
    "拆建 deconstruct": "拆建 deconstruct",
    
    "ai-experts": "評語 ai-experts",
    "ai expert": "評語 ai-experts",
    "critics": "評語 ai-experts",
    "評語": "評語 ai-experts",
    "評語 / ai-experts": "評語 ai-experts",
    "評語 ai-experts": "評語 ai-experts"
}

# Preserve deterministic canonical section list
CANONICAL_SECTIONS = [
    "觀景 vista",
    "亂語 text",
    "懸置 epoché",
    "理解 wissen",
    "詮釋 interpret",
    "拆建 deconstruct",
    "評語 ai-experts"
]

def clean_path(path_str):
    if not path_str:
        return ""
    return str(path_str).strip().replace("\\", "/")

def alphanumeric_sort_key(node_id):
    first_part = re.split(r'[-_]', str(node_id))[0].strip()
    if first_part.isdigit():
        return (0, int(first_part), str(node_id))
    else:
        return (1, first_part.upper(), str(node_id))

def parse_md_file(file_path):
    try:
        with open(file_path, "r", encoding="utf-8-sig") as f:
            content = f.read().strip()
    except Exception as e:
        print(f"⚠️ Could not read file {file_path}: {e}")
        return None

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

    node_id_str = str(node_id).strip()

    # =========================================================================
    # 1. Parse Body Sections & Clean Empty/Placeholder "---" Lines
    # =========================================================================
    sections = {sec: [] for sec in CANONICAL_SECTIONS}
    curr_sec = None

    for line in body_str.splitlines():
        if line.startswith("## "):
            header_title = line.replace("## ", "").strip().lower()
            matched_canonical_key = None
            for key, canonical in VALID_SECTION_KEYS.items():
                if key.lower() == header_title or key.lower() in header_title:
                    matched_canonical_key = canonical
                    break
            
            if matched_canonical_key:
                curr_sec = matched_canonical_key
            else:
                if curr_sec:
                    sections[curr_sec].append(line)
        else:
            if curr_sec:
                sections[curr_sec].append(line)

    # Sanitize parsed text: strip pure "---" dividers and format empty strings
    clean_sections = {}
    for sec_key, lines in sections.items():
        # Remove empty lines and horizontal rules used as markdown placeholders
        filtered_lines = [l for l in lines if l.strip() and l.strip() != "---"]
        text_content = "\n".join(filtered_lines).strip()
        
        # Guarantee empty string if no valid text exists
        clean_sections[sec_key] = text_content if text_content else ""

    has_real_content = any(bool(val) for val in clean_sections.values())

    # --- SAVE HEAVY TEXT TO ASSETS/DATA/NODES/{NODE_ID}.JSON ---
    if has_real_content:
        os.makedirs(NODE_DATA_DIR, exist_ok=True)
        node_file_path = os.path.join(NODE_DATA_DIR, f"{node_id_str}.json")
        with open(node_file_path, "w", encoding="utf-8") as f_node:
            json.dump({
                "id": node_id_str,
                "content_sections": clean_sections
            }, f_node, indent=2, ensure_ascii=False)

    # =========================================================================
    # 2. Extract Node Lists
    # =========================================================================
    def extract_node_list(data, primary_keys, legacy_prefix):
        results = []
        for key in primary_keys:
            val = data.get(key)
            if isinstance(val, list):
                results.extend([str(v).strip() for v in val if v])
            elif isinstance(val, str) and val.strip():
                results.append(val.strip())

        if not results:
            legacy_keys = sorted(
                [k for k in data.keys() if re.match(rf"^{legacy_prefix}(_\d+)?$", str(k))],
                key=lambda x: int(re.search(r"\d+", x).group()) if re.search(r"\d+", x) else 0
            )
            for k in legacy_keys:
                if data.get(k):
                    results.append(str(data[k]).strip())

        seen = set()
        deduped = []
        for item in results:
            if item not in seen:
                seen.add(item)
                deduped.append(item)
        return deduped

    parents = extract_node_list(data, ["parents", "parent_nodes", "parent"], "parent_node")
    children = extract_node_list(data, ["children", "children_nodes", "child"], "children_node")
    authors = extract_node_list(data, ["authors", "author"], "author")

    # =========================================================================
    # 3. PDF Manifest & Path Normalization
    # =========================================================================
    pdf_manifest = []
    if "pdfs" in data and isinstance(data["pdfs"], list):
        for item in data["pdfs"]:
            if isinstance(item, dict):
                pdf_manifest.append({
                    "src": clean_path(item.get("src", "")),
                    "thumbnail": clean_path(item.get("thumbnail", ""))
                })
            elif isinstance(item, str):
                pdf_manifest.append({"src": clean_path(item), "thumbnail": ""})
    else:
        pdf_keys = sorted(
            [k for k in data.keys() if re.match(r"^pdf(_\d+)?$", str(k))],
            key=lambda x: int(re.search(r"\d+", x).group()) if re.search(r"\d+", x) else 0
        )
        for key in pdf_keys:
            suffix = key.replace("pdf", "")
            thumb_key = f"pdf{suffix}_thumbnail"
            pdf_manifest.append({
                "src": clean_path(data.get(key, "")),
                "thumbnail": clean_path(data.get(thumb_key, data.get("pdf_thumbnail", "")))
            })

    # Return lightweight metadata dictionary for archive_data.js
    active_section_keys = [k for k, v in clean_sections.items() if v]

    return {
        "id": node_id_str,
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
        
        "audio": clean_path(data.get("audio", "")),
        "video": clean_path(data.get("video", "")),
        "img_color": clean_path(data.get("img_color", "")),
        "img_thumb": clean_path(data.get("img_thumb", "")),
        
        "pdf_manifest": pdf_manifest,
        
        "page_pattern": data.get("page_pattern", ""),
        "page_thumbnail_pattern": data.get("page_thumbnail_pattern", ""),
        "page_start": data.get("page_start", None),
        "page_end": data.get("page_end", None),
        
        "parents": parents,
        "children": children,
        "leaf_count": 0,
        
        "has_content": has_real_content,
        "section_keys": active_section_keys
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

    # 1. Reconcile parent-child connections
    for node_id, node in raw_nodes.items():
        for parent_id in node["parents"]:
            if parent_id in raw_nodes:
                parent_children = raw_nodes[parent_id]["children"]
                if node_id not in parent_children:
                    parent_children.append(node_id)

    # 2. Enforce strict numerical (1..9) then alpha (A..M) sort order
    for node_id, node in raw_nodes.items():
        if node["children"]:
            node["children"] = sorted(node["children"], key=alphanumeric_sort_key)

    # Export to js/archive_data.js
    os.makedirs(os.path.dirname(OUTPUT_FILE), exist_ok=True)
    with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
        f.write(f"window.ARCHIVE_DATA = {json.dumps(raw_nodes, indent=2, ensure_ascii=False)};")

    print(f"✅ Successfully compiled {len(raw_nodes)} nodes into {OUTPUT_FILE}")

if __name__ == "__main__":
    compile_archive()