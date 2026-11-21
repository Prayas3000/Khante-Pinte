import csv
import json

step_file = r"C:\Users\Admin\.gemini\antigravity\brain\bcc78b34-b8c7-4896-9e1c-bc66916ae782\.system_generated\steps\1358\output.txt"
with open(step_file, "r", encoding="utf-8") as f:
    raw = json.load(f)

import re
match = re.search(r"\[\{.*\}\]", raw["result"], re.DOTALL)
items = json.loads(match.group(0))

from populate_menu_images import get_image_for_item

csv_path = r"d:\chrome downloads\khante-pinte-v2\khantepinte-mvp\khante_pinte_176_menu_images_updated.csv"
with open(csv_path, "w", newline="", encoding="utf-8") as f:
    writer = csv.writer(f)
    writer.writerow(["category", "menu_item", "image_url", "status"])
    for item in items:
        img = item.get("image_url")
        if not img or "myspicetrunk" in img:
            img = get_image_for_item(item["name"], item.get("category") or "")
        writer.writerow([item.get("category"), item["name"], img, "ACTIVE"])

print(f"Wrote updated CSV with {len(items)} items to {csv_path}")
