import re
from pathlib import Path

def clean_html_to_markdown(file_path):
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()

    # 1. Remove outer wrapper flex divs
    content = re.sub(r'<div style="display:\s*flex[^>]*>', '', content)
    content = re.sub(r'<div style="flex:\s*1[^>]*" markdown="1">', '', content)
    content = re.sub(r'</div>', '', content)

    # 2. Clean up multiple blank lines left behind
    content = re.sub(r'\n\s*\n\s*\n+', '\n\n', content)

    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(content.strip() + '\n')

# Example usage for your vault folder:
vault_folder = Path(".")
for md_file in vault_folder.rglob("*.md"):
     clean_html_to_markdown(md_file)