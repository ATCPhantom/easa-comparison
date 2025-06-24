import os
import json

BASE_DIR = 'json'  # json/category/subfolder/file.json
OUTPUT_FILE = 'data/structure.json'

def generate_structure():
    structure = {}

    for category in os.listdir(BASE_DIR):
        category_path = os.path.join(BASE_DIR, category)
        if not os.path.isdir(category_path):
            continue

        structure[category] = {}

        for subfolder in os.listdir(category_path):
            subfolder_path = os.path.join(category_path, subfolder)
            if not os.path.isdir(subfolder_path):
                continue

            json_files = [f for f in os.listdir(subfolder_path) if f.endswith('.json')]
            if json_files:
                structure[category][subfolder] = sorted(json_files)

    os.makedirs(os.path.dirname(OUTPUT_FILE), exist_ok=True)

    with open(OUTPUT_FILE, 'w', encoding='utf-8') as f:
        json.dump(structure, f, indent=2)

    print(f"Structure written to {OUTPUT_FILE}")

if __name__ == '__main__':
    generate_structure()
