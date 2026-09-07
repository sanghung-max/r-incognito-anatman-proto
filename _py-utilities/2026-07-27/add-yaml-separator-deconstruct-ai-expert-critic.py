import os
import re

directory = "./board-M"

# We look for an optional '---' separator, any newlines, and then your target headers.
# This pattern is completely fixed-width-safe because it doesn't use look-behinds.
target_pattern = r"(?:\n*(---\n+))?(##\s*(?:拆建\s*/\s*deconstruct|評語\s*/\s*ai\s*expert\s*critics))"

for filename in os.listdir(directory):
    if filename.endswith(".md"):
        filepath = os.path.join(directory, filename)
        with open(filepath, "r", encoding="utf-8") as f:
            content = f.read()

        def separator_replacer(match):
            # match.group(1) is the '---' separator if it already exists
            # match.group(2) is the actual Markdown header
            if match.group(1):
                # If '---' is already there, leave the match completely untouched
                return match.group(0)
            else:
                # If it's missing, prepend the '---' separator safely
                return f"\n\n---\n\n{match.group(2)}"

        # Run the replacement across the file
        updated_content = re.sub(target_pattern, separator_replacer, content, flags=re.IGNORECASE)
        
        if updated_content != content:
            with open(filepath, "w", encoding="utf-8") as f:
                f.write(updated_content)
            print(f"Fixed separator in: {filename}")