# python script to convert parent_node_x, children_node_X and author_x to inline arrays
# parents, children, authors
# py -m inline_array_frontmatter ./path/to/markdown/files


import os
import re
import sys

# Regex patterns matching target numbered fields to aggregate
TARGET_PATTERNS = {
    "parents": re.compile(r"^parent(?:_node)?_\d+$", re.IGNORECASE),
    "children": re.compile(r"^children(?:_node)?_\d+$", re.IGNORECASE),
    "authors": re.compile(r"^author_\d+$", re.IGNORECASE),
}

def process_file(file_path):
    with open(file_path, "r", encoding="utf-8") as f:
        content = f.read()

    # Split YAML frontmatter from body text
    match = re.match(r"^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$", content)
    if not match:
        print(f"[SKIP] No YAML frontmatter found in: {file_path}")
        return

    raw_yaml = match.group(1)
    body = match.group(2)

    lines = raw_yaml.splitlines()
    new_frontmatter_lines = []

    collected_arrays = {
        "parents": [],
        "children": [],
        "authors": []
    }

    modified = False

    for line in lines:
        # Match key-value pair lines
        kv_match = re.match(r"^([a-zA-Z0-9_-]+):\s*(.*)$", line)

        if kv_match:
            key = kv_match.group(1).strip()
            val = kv_match.group(2).strip()

            # Remove trailing comment if present
            comment_idx = val.find("#")
            if comment_idx != -1:
                val = val[:comment_idx].strip()

            # Unquote string values
            val = val.strip("\"'")

            # Check if key matches parent_node_X, children_node_X, or author_X
            if TARGET_PATTERNS["parents"].match(key):
                if val:
                    collected_arrays["parents"].append(val)
                modified = True
                continue

            if TARGET_PATTERNS["children"].match(key):
                if val:
                    collected_arrays["children"].append(val)
                modified = True
                continue

            if TARGET_PATTERNS["authors"].match(key):
                if val:
                    collected_arrays["authors"].append(val)
                modified = True
                continue

        # Keep all other lines intact
        new_frontmatter_lines.append(line)

    # If no numbered keys were found, skip writing
    if not modified:
        return

    # Insert consolidated inline arrays after 'id:' or 'type:'
    final_lines = []
    inserted_arrays = False

    for line in new_frontmatter_lines:
        final_lines.append(line)

        if not inserted_arrays and (line.startswith("id:") or line.startswith("type:")):
            for field_key in ["parents", "children", "authors"]:
                arr = collected_arrays[field_key]
                if arr:
                    if len(arr) == 1:
                        formatted_val = f'"{arr[0]}"'
                    else:
                        formatted_items = ", ".join(f'"{item}"' for item in arr)
                        formatted_val = f'[{formatted_items}]'
                    
                    final_lines.append(f"{field_key}: {formatted_val}")
            inserted_arrays = True

    # Re-assemble final markdown content
    updated_content = f"---\n{'\n'.join(final_lines)}\n---\n{body}"
    with open(file_path, "w", encoding="utf-8") as f:
        f.write(updated_content)

    print(f"[UPDATED] {file_path}")

def scan_and_process_dir(target_dir):
    if not os.path.exists(target_dir):
        print(f"Directory not found: {target_dir}")
        return

    for root, _, files in os.walk(target_dir):
        for file in files:
            if file.endswith(".md"):
                full_path = os.path.join(root, file)
                process_file(full_path)

if __name__ == "__main__":
    target_directory = sys.argv[1] if len(sys.argv) > 1 else "./content"
    print(f"Starting frontmatter migration in: {target_directory}")
    scan_and_process_dir(target_directory)
    print("Migration complete!")