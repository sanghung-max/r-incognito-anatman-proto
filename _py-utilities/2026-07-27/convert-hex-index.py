import os
import glob

# ==================== CONFIGURATION ====================
TARGET_DIRECTORY = r"./assets/images/zenith-nadir"  # Update this to your folder path
FILE_EXTENSION = "*.jpg"                       # Change to "*.pdf" if reindexing documents
PREFIX = "5-C"                                  # Your node context prefix
DRY_RUN = True                                  # Set to False to actually rename the files
INDEX = 0x1                                     # set starting index, use 0x as prefix for hexidecimal
# =======================================================

def reindex_gallery_to_hex():
    search_pattern = os.path.join(TARGET_DIRECTORY, f"{PREFIX}__*{FILE_EXTENSION}")
    file_paths = glob.glob(search_pattern)
    
    if not file_paths:
        print(f"❌ No files found matching pattern: {PREFIX}__*{FILE_EXTENSION}")
        return

    # Sort files by their current filenames to maintain a baseline consistency
    file_paths.sort()

    print(f"📋 Found {len(file_paths)} files. Starting Hexadecimal Re-indexing...")
    if DRY_RUN:
        print("⚠️ RUNNING IN DRY-RUN MODE. NO FILES WILL BE CHANGED.\n")

    for index, old_path in enumerate(file_paths, start=INDEX):
        old_filename = os.path.basename(old_path)
        
        try:
            # Split using your double and single underscore architecture
            # Old format: B-D__xxxx_yyyy-mm-dd-name.webp
            parts = old_filename.split('_')
            
            # parts[0] is 'B-D'
            # parts[1] is empty because of the double underscore '__'
            # parts[2] is the old index 'xxxx'
            # parts[3] onwards is the 'yyyy-mm-dd-name.ext' block
            metadata_block = parts[3] 
        except IndexError:
            print(f"⚠️ Skipping file due to unexpected naming structure: {old_filename}")
            continue

        # Convert the current loop loop index to a 4-digit zero-padded Hex string
        # ':04X' converts to uppercase hex (e.g., 0001, 000A, )
        hex_index = f"{index:04X}"
        
        # Assemble the clean blueprint name
        new_filename = f"{PREFIX}__{hex_index}_{metadata_block}"
        new_path = os.path.join(TARGET_DIRECTORY, new_filename)
        
        if old_filename == new_filename:
            print(f" 🟩 [Unchanged] {old_filename}")
            continue

        print(f" 🔄 [Match] {old_filename}  --->  {new_filename}")
        
        if not DRY_RUN:
            os.rename(old_path, new_path)

    if DRY_RUN:
        print("\n✨ Dry-run complete. If the mapping looks perfect, set 'DRY_RUN = False' to rename files.")
    else:
        print("\n✅ Successfully re-indexed files to sequential Hexadecimal!")

if __name__ == "__main__":
    reindex_gallery_to_hex()