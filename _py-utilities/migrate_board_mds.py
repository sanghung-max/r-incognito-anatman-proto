
# python migrate_board_mds.py --dry-run
# python migrate_board_mds.py
# pdf: 



import re
import argparse
from pathlib import Path

# Valid board identifiers
BOARD_NAMES = [f"board-{i}" for i in list("123456789ABCM")]

def get_filename(path_str: str) -> str:
    """Extracts filename from a given path string, removing surrounding quotes."""
    clean_str = path_str.strip('\'" ')
    return Path(clean_str).name

def update_frontmatter(content: str, board_folder_name: str) -> str:
    """
    Parses and transforms the frontmatter of a markdown file based on asset rules.
    """
    # Split frontmatter from body
    fm_match = re.match(r"^---\n(.*?)\n---\n(.*)$", content, re.DOTALL)
    if not fm_match:
        return content

    fm_text = fm_match.group(1)
    body_text = fm_match.group(2)

    lines = fm_text.splitlines()
    updated_lines = []
    
    # 1. Parse item type first
    item_type = None
    for line in lines:
        type_match = re.match(r"^type:\s*[\"']?(\w+)[\"']?", line.strip())
        if type_match:
            item_type = type_match.group(1)
            break

    # 2. Process line by line
    for line in lines:
        stripped = line.strip()

        # Remove icon_lucide
        if stripped.startswith("icon_lucide:"):
            continue

        # Handle img_color line
        if stripped.startswith("img_color:"):
            val = line.split(":", 1)[1].strip()
            filename = get_filename(val)

            if item_type in ["pdf", "audio", "video"]:
                # Replace img_color with img_thumb
                updated_lines.append(f"img_thumb: assets/{board_folder_name}/img_thumb/{filename}")
            else:
                # img / folder: update img_color and append img_thumb
                updated_lines.append(f"img_color: assets/{board_folder_name}/img_color/{filename}")
                updated_lines.append(f"img_thumb: assets/{board_folder_name}/img_thumb/{filename}")
            continue

        # Handle audio path
        if stripped.startswith("audio:"):
            val = line.split(":", 1)[1].strip()
            filename = get_filename(val)
            updated_lines.append(f"audio: assets/{board_folder_name}/audio/{filename}")
            continue

        # Handle video path
        if stripped.startswith("video:"):
            val = line.split(":", 1)[1].strip()
            filename = get_filename(val)
            updated_lines.append(f"video: assets/{board_folder_name}/videos/{filename}")
            continue

        # Handle pdf paths: supports both 'pdf:' and 'pdf_1:', 'pdf_2:', etc.
        pdf_match = re.match(r"^(pdf(?:_\d+)?):\s*(.+)$", stripped)
        if pdf_match:
            key, val = pdf_match.group(1), pdf_match.group(2)
            filename = get_filename(val)
            updated_lines.append(f"{key}: assets/{board_folder_name}/pdfs/{filename}")
            continue

        # Handle pdf thumbnail paths: supports both 'pdf_thumbnail:' and 'pdf_1_thumbnail:', etc.
        pdf_thumb_match = re.match(r"^(pdf(?:_\d+)?_thumbnail):\s*(.+)$", stripped)
        if pdf_thumb_match:
            key, val = pdf_thumb_match.group(1), pdf_thumb_match.group(2)
            filename = get_filename(val)
            
            # Common undergrad covers check (starts with A-A or A-B)
            if filename.startswith("A-A") or filename.startswith("A-B"):
                updated_lines.append(f"{key}: assets/common/img_thumb/{filename}")
            else:
                updated_lines.append(f"{key}: assets/{board_folder_name}/img_thumb/{filename}")
            continue

        # Keep all other frontmatter fields unchanged
        updated_lines.append(line)

    new_fm = "\n".join(updated_lines)
    return f"---\n{new_fm}\n---\n{body_text}"


def process_markdown_files(root_dir: Path, dry_run: bool = False):
    """Scans board folders and updates markdown files."""
    modified_count = 0
    total_files = 0

    for board_name in BOARD_NAMES:
        board_path = root_dir / board_name
        if not board_path.exists():
            continue

        md_files = list(board_path.glob("**/*.md"))
        for md_file in md_files:
            total_files += 1
            content = md_file.read_text(encoding="utf-8")
            updated_content = update_frontmatter(content, board_name)

            if content != updated_content:
                modified_count += 1
                if dry_run:
                    print(f"[DRY-RUN] Would update: {md_file.relative_to(root_dir)}")
                else:
                    md_file.write_text(updated_content, encoding="utf-8")
                    print(f"Updated: {md_file.relative_to(root_dir)}")

    status = "Previewed" if dry_run else "Processed"
    print(f"\n✨ {status} {modified_count}/{total_files} Markdown files across board directories.")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(
        description="Migrate frontmatter paths in board Markdown files."
    )
    parser.add_argument(
        "--root", "-r",
        type=Path,
        default=Path("."),
        help="Root path containing board-* directories (default: current directory)."
    )
    parser.add_argument(
        "--dry-run", "-d",
        action="store_true",
        help="Perform a dry run without overwriting files."
    )

    args = parser.parse_args()
    process_markdown_files(args.root, dry_run=args.dry_run)