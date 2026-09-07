import os
import re

VAULT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
EXCLUDE_DIRS = {"_app", "_templates", "_py-utilities", "__pycache__", ".obsidian", ".git", "assets", "js"}

# Matches any string in parentheses containing "goes here...", with optional outer markdown asterisks
PLACEHOLDER_REGEX = re.compile(r"\*?\(\s*[^)]*goes\s*here\.{3}\s*\)\*?", re.IGNORECASE)

def clean_markdown_files():
    modified_count = 0
    
    for root, dirs, files in os.walk(VAULT_ROOT):
        dirs[:] = [d for d in dirs if d not in EXCLUDE_DIRS]
        for file in files:
            if file.endswith(".md"):
                file_path = os.path.join(root, file)
                
                with open(file_path, "r", encoding="utf-8-sig") as f:
                    content = f.read()
                
                # Strip out placeholder strings
                cleaned_content = PLACEHOLDER_REGEX.sub("", content)
                
                # Only write back if changes occurred
                if cleaned_content != content:
                    with open(file_path, "w", encoding="utf-8") as f:
                        f.write(cleaned_content)
                    modified_count += 1
                    print(f"🧹 Cleaned placeholders in: {file}")

    print(f"\n✅ Cleaned {modified_count} Markdown files in vault!")

if __name__ == "__main__":
    clean_markdown_files()