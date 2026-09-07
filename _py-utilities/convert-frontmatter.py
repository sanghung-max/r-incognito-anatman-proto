import os
import re
from pathlib import Path
import frontmatter

# Defined key order with page properties moved to the end
PREFERRED_KEY_ORDER = [
    'id',
    'type',
    'parent_nodes',
    'children_nodes',
    'title_en',
    'title_zh',
    'authors',
    'time',
    'location',
    'description_en',
    'description_zh',
    'ui_render',
    'display_priority',
    'language',
    'tags',
    'img_color',
    'img_mono',
    'pdf',
    'pdf_thumbnail',
    'video',
    'audio',
    # Page-specific properties moved to the bottom
    'page_pattern',
    'page_thumbnail_pattern',
    'page_start',
    'page_end'
]

# Prefixes to consolidate into inline arrays
TARGET_PREFIXES = ['parent_node', 'children_node', 'author', 'person']

def process_frontmatter_file(file_path):
    post = frontmatter.load(file_path)
    metadata = post.metadata
    
    modified = False

    # 2. Consolidate numbered keys (e.g. parent_node_1 -> parent_nodes)
    for prefix in TARGET_PREFIXES:
        pattern = re.compile(rf'^{prefix}_\d+$')
        matching_keys = sorted([k for k in metadata.keys() if pattern.match(k)])
        
        if matching_keys:
            array_values = []
            for k in matching_keys:
                val = metadata[k]
                if val and str(val).strip():
                    array_values.append(str(val).strip())
                del metadata[k]
            
            # Map plural key names
            if prefix == 'person':
                plural_key = 'people_mentioned'
            elif prefix == 'parent_node':
                plural_key = 'parent_nodes'
            elif prefix == 'children_node':
                plural_key = 'children_nodes'
            else:
                plural_key = f"{prefix}s"
            
            metadata[plural_key] = array_values
            modified = True

    # 3. Re-order metadata keys based on PREFERRED_KEY_ORDER
    ordered_metadata = {}
    
    # First, pull keys that match PREFERRED_KEY_ORDER
    for key in PREFERRED_KEY_ORDER:
        if key in metadata:
            ordered_metadata[key] = metadata.pop(key)
            
    # Second, append any remaining custom fields so nothing is ever lost/deleted
    for remaining_key, val in metadata.items():
        ordered_metadata[remaining_key] = val

    # Update post metadata
    post.metadata = ordered_metadata

    # 4. Save file back with sort_keys=False
    new_content = frontmatter.dumps(post, sort_keys=False)
    
    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(new_content)
    print(f"Updated (ordered): {file_path.name}")

def batch_convert_vault(vault_path):
    path = Path(vault_path)
    for md_file in path.rglob("*.md"):
        if ".obsidian" in str(md_file) or "template" in md_file.name.lower():
            continue
        process_frontmatter_file(md_file)

if __name__ == "__main__":
    VAULT_DIRECTORY = "./"
    batch_convert_vault(VAULT_DIRECTORY)