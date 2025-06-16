import os
import json

BASE_DIR = 'xml'  # Your regulation folders live here
OUTPUT_FILE = 'data/structure.json'  # Output destination

def generate_structure():
    structure = {}

    for folder in os.listdir(BASE_DIR):
        folder_path = os.path.join(BASE_DIR, folder)
        if os.path.isdir(folder_path):
            json_files = [f for f in os.listdir(folder_path) if f.endswith('.json')]
            if json_files:
                structure[folder] = sorted(json_files)

    os.makedirs(os.path.dirname(OUTPUT_FILE), exist_ok=True)

    with open(OUTPUT_FILE, 'w', encoding='utf-8') as f:
        json.dump(structure, f, indent=2)

    print(f"Structure written to {OUTPUT_FILE}")

if __name__ == '__main__':
    generate_structure()
