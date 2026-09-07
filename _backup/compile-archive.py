import os
import json
import re

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

# Includes board-0 so it gets auto-discovered
BOARDS = ["board-0", "board-1", "board-2", "board-3", "board-4", "board-5", 
          "board-6", "board-7", "board-8", "board-9", "board-A", "board-B", "board-C", "board-M"]

def parse_markdown_frontmatter(filepath):
    """Extract frontmatter metadata from markdown files including basic list support."""
    metadata = {}
    if not os.path.exists(filepath):
        return metadata
    
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
        
    frontmatter_match = re.match(r'^---\s*\n(.*?)\n---\s*\n', content, re.DOTALL)
    if frontmatter_match:
        yaml_text = frontmatter_match.group(1)
        current_list_key = None
        
        for line in yaml_text.splitlines():
            line_str = line.strip()
            if not line_str or line_str.startswith('#'):
                continue
            
            # Match list items (- item)
            if line_str.startswith('-') and current_list_key:
                val = line_str.lstrip('-').strip().strip('"\'')
                metadata[current_list_key].append(val)
            # Match Key: Value
            elif ':' in line:
                key, val = line.split(':', 1)
                key = key.strip()
                val = val.strip().strip('"\'')
                
                if val == '':  # Key for a list (e.g., children_nodes:)
                    metadata[key] = []
                    current_list_key = key
                else:
                    current_list_key = None
                    if val.lower() == 'true':
                        val = True
                    elif val.lower() == 'false':
                        val = False
                    metadata[key] = val

    return metadata

def discover_archive_assets():
    archive_data = {}

    # Iterate through all boards (including board-0)
    for board in BOARDS:
        board_path = os.path.join(BASE_DIR, board)
        if not os.path.exists(board_path):
            continue

        for root, _, files in os.walk(board_path):
            for file in files:
                if file.endswith('.md'):
                    md_rel_path = os.path.relpath(os.path.join(root, file), BASE_DIR).replace('\\', '/')
                    
                    # Extract Node ID from file name (e.g. "0-0__0000" or "5-C__0001")
                    node_id_match = re.match(r'^([0-9A-ZM]+-[0-9A-ZM]+(?:__[0-9A-FA-Z]+)?)', file)
                    if not node_id_match:
                        continue
                    
                    node_id = node_id_match.group(1)
                    frontmatter = parse_markdown_frontmatter(os.path.join(root, file))
                    
                    # Parse children or children_nodes array from frontmatter
                    children = frontmatter.get("children_nodes") or frontmatter.get("children") or []
                    
                    # Base Node object constructed straight from frontmatter
                    node = {
                        "id": node_id,
                        "board_id": board,
                        "children": children,
                        "md_path": md_rel_path,
                        "title_en": frontmatter.get("title_en", ""),
                        "title_zh": frontmatter.get("title_zh", ""),
                        "type": frontmatter.get("type", "folder")
                    }

                    # Carry over optional root/UI fields if present
                    if "description_en" in frontmatter: node["description_en"] = frontmatter["description_en"]
                    if "description_zh" in frontmatter: node["description_zh"] = frontmatter["description_zh"]
                    if "ui_render" in frontmatter: node["ui_render"] = frontmatter["ui_render"]
                    if "icon_lucide" in frontmatter: node["icon_lucide"] = frontmatter["icon_lucide"]

                    # Media Asset Injections
                    if node["type"] == "img" or frontmatter.get("img_color"):
                        node["img_color"] = frontmatter.get("img_color", f"assets/{board}/{node_id}.jpg")
                        node["img_mono"] = frontmatter.get("img_mono", f"assets/{board}/{node_id}_mono.jpg")
                    
                    elif node["type"] == "pdf":
                        pdf_src = frontmatter.get("pdf_src", f"assets/{board}/{node_id}.pdf")
                        thumb = frontmatter.get("thumbnail", f"assets/{board}/{node_id}_thumb.jpg")
                        node["pdf_manifest"] = [{"src": pdf_src, "thumbnail": thumb}]

                    elif node["type"] == "video":
                        node["video"] = frontmatter.get("video", f"assets/{board}/{node_id}.mp4")

                    elif node["type"] == "audio":
                        node["audio"] = frontmatter.get("audio", f"assets/{board}/{node_id}.mp3")

                    archive_data[node_id] = node

    # Save compile output
    output_path = os.path.join(BASE_DIR, "archive_data.js")
    with open(output_path, "w", encoding="utf-8") as f:
        f.write("// Auto-generated by compile_archive.py\n")
        f.write("window.ARCHIVE_DATA = ")
        f.write(json.dumps(archive_data, indent=2, ensure_ascii=False))
        f.write(";\n")

if __name__ == "__main__":
    discover_archive_assets()