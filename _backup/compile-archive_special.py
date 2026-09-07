import os
import json
import re
import yaml  # PyYAML handles lists, booleans, and nested structures seamlessly

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

# Includes board-0 so it gets auto-discovered alongside all other boards
BOARDS = [
    "board-0", "board-1", "board-2", "board-3", "board-4", "board-5", 
    "board-6", "board-7", "board-8", "board-9", "board-A", "board-B", "board-C", "board-M"
]

def normalize_asset_path(path_str):
    """Normalize asset paths for SPA root rendering (strips leading ../ or ./)"""
    if not path_str or not isinstance(path_str, str):
        return path_str
    # Strip any leading ../ or ./ sequences
    return re.sub(r"^(\.\./|\./)+", "", path_str)

def parse_markdown_frontmatter(filepath):
    """Extract and parse frontmatter using PyYAML."""
    if not os.path.exists(filepath):
        return {}
    
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
        
    frontmatter_match = re.match(r'^---\s*\n(.*?)\n---\s*\n', content, re.DOTALL)
    if frontmatter_match:
        yaml_text = frontmatter_match.group(1)
        try:
            return yaml.safe_load(yaml_text) or {}
        except yaml.YAMLError as e:
            print(f"[Warning] Error parsing YAML in {filepath}: {e}")
            return {}
    return {}

def discover_archive_assets():
    archive_data = {}

    for board in BOARDS:
        board_path = os.path.join(BASE_DIR, board)
        if not os.path.exists(board_path):
            continue

        for root, _, files in os.walk(board_path):
            for file in files:
                if file.endswith('.md'):
                    md_rel_path = os.path.relpath(os.path.join(root, file), BASE_DIR).replace('\\', '/')
                    
                    # Extract Node ID from file name (e.g., "0-0__0000" or "5-C__0001")
                    node_id_match = re.match(r'^([0-9A-ZM]+-[0-9A-ZM]+(?:__[0-9A-FA-Z]+)?)', file)
                    if not node_id_match:
                        continue
                    
                    node_id = node_id_match.group(1)
                    fm = parse_markdown_frontmatter(os.path.join(root, file))
                    
                    # Extract children or children_nodes as a true Python list
                    children = fm.get("children_nodes") or fm.get("children") or []
                    if not isinstance(children, list):
                        children = [children]

                    # Base Node structure built from parsed YAML
                    node = {
                        "id": fm.get("id", node_id),
                        "board_id": board,
                        "children": children,
                        "md_path": md_rel_path,
                        "title_en": fm.get("title_en", ""),
                        "title_zh": fm.get("title_zh", ""),
                        "type": fm.get("type", "folder")
                    }

                    # Explicitly pass through Age alongside other UI/metadata fields
                    for key in [
                        "age", 
                        "description_en", 
                        "description_zh", 
                        "ui_render", 
                        "icon_lucide", 
                        "page_start", 
                        "page_end"
                    ]:
                        if key in fm:
                            node[key] = fm[key]

                    # Clean & normalize all media asset paths
                    if fm.get("img_color"):
                        node["img_color"] = normalize_asset_path(fm["img_color"])
                    if fm.get("img_mono"):
                        node["img_mono"] = normalize_asset_path(fm["img_mono"])

                    if fm.get("pdf_src") or fm.get("pdf_path") or fm.get("pdf"):
                        pdf_src = normalize_asset_path(fm.get("pdf_src") or fm.get("pdf_path") or fm.get("pdf"))
                        thumb = normalize_asset_path(fm.get("thumbnail") or fm.get("img_color") or "")
                        node["pdf_manifest"] = [{"src": pdf_src, "thumbnail": thumb}]

                    if fm.get("video"):
                        node["video"] = normalize_asset_path(fm["video"])

                    if fm.get("audio"):
                        node["audio"] = normalize_asset_path(fm["audio"])

                    if fm.get("page_pattern"):
                        node["page_pattern"] = normalize_asset_path(fm["page_pattern"])
                    if fm.get("page_thumbnail_pattern"):
                        node["page_thumbnail_pattern"] = normalize_asset_path(fm["page_thumbnail_pattern"])

                    if fm.get("gallery") and isinstance(fm["gallery"], list):
                        node["gallery"] = [normalize_asset_path(item) for item in fm["gallery"]]

                    archive_data[node["id"]] = node

    # Write compiled JSON structure into archive_data.js at BASE_DIR root
    output_path = os.path.join(BASE_DIR, "archive_data.js")
    with open(output_path, "w", encoding="utf-8") as f:
        f.write("// Auto-generated by compile_archive.py\n")
        f.write("window.ARCHIVE_DATA = ")
        f.write(json.dumps(archive_data, indent=2, ensure_ascii=False))
        f.write(";\n")

    print(f"Successfully compiled {len(archive_data)} nodes into {output_path}")

if __name__ == "__main__":
    discover_archive_assets()