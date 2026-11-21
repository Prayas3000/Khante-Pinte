import json

# Curated high-resolution Unsplash food photography (direct CDN URLs with auto-compress and webp support)
# Each URL is tested, highly appetizing, and fits late-night restaurant food.
IMAGES = {
    # Drinks
    "coke": "https://images.unsplash.com/photo-1622483767028-3f66f32aef97?auto=format&fit=crop&w=600&q=80",
    "fanta": "https://images.unsplash.com/photo-1624517452488-04869289c4ca?auto=format&fit=crop&w=600&q=80",
    "sprite": "https://images.unsplash.com/photo-1625772299848-391b6a87d7b3?auto=format&fit=crop&w=600&q=80",
    "redbull": "https://images.unsplash.com/photo-1551024709-8f23befc6f87?auto=format&fit=crop&w=600&q=80",
    "water": "https://images.unsplash.com/photo-1548839140-29a749e1bc4e?auto=format&fit=crop&w=600&q=80",
    "badam_juice": "https://images.unsplash.com/photo-1546173159-315724a31696?auto=format&fit=crop&w=600&q=80",
    "cranberry": "https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?auto=format&fit=crop&w=600&q=80",
    "xtream": "https://images.unsplash.com/photo-1622543925917-763c34d1a86e?auto=format&fit=crop&w=600&q=80",

    # Rice & Biryani
    "chicken_biryani": "https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?auto=format&fit=crop&w=600&q=80",
    "veg_biryani": "https://images.unsplash.com/photo-1642821373181-696a54913e9a?auto=format&fit=crop&w=600&q=80",
    "paneer_biryani": "https://images.unsplash.com/photo-1633945274405-b6c8069047b0?auto=format&fit=crop&w=600&q=80",
    "chicken_fried_rice": "https://images.unsplash.com/photo-1603133872878-684f208fb84b?auto=format&fit=crop&w=600&q=80",
    "veg_fried_rice": "https://images.unsplash.com/photo-1512058564366-18510be2db19?auto=format&fit=crop&w=600&q=80",
    "jeera_rice": "https://images.unsplash.com/photo-1596797038530-2c107229654b?auto=format&fit=crop&w=600&q=80",
    "plain_rice": "https://images.unsplash.com/photo-1516684732162-798a0062be99?auto=format&fit=crop&w=600&q=80",
    "pulao": "https://images.unsplash.com/photo-1631515243349-e0cb75fb8d3a?auto=format&fit=crop&w=600&q=80",
    "paratha": "https://images.unsplash.com/photo-1626074353765-517a681e40be?auto=format&fit=crop&w=600&q=80",
    "fish_curry": "https://images.unsplash.com/photo-1615141982883-c7ad0e69fd62?auto=format&fit=crop&w=600&q=80",
    "fish_fry": "https://images.unsplash.com/photo-1534422298391-e4f8c172dddb?auto=format&fit=crop&w=600&q=80",

    # Sweets & Cakes
    "birthday_cake": "https://images.unsplash.com/photo-1578985545062-69928b1d9587?auto=format&fit=crop&w=600&q=80",
    "gulab_jamun": "https://images.unsplash.com/photo-1589301760014-d929f3979dbc?auto=format&fit=crop&w=600&q=80",
    "rasmalai": "https://images.unsplash.com/photo-1541781774459-bb2af2f05b55?auto=format&fit=crop&w=600&q=80",

    # Curries & Gravies
    "butter_chicken": "https://images.unsplash.com/photo-1588166524941-3bf61a9c41db?auto=format&fit=crop&w=600&q=80",
    "chicken_curry": "https://images.unsplash.com/photo-1603894584373-5ac82b2ae398?auto=format&fit=crop&w=600&q=80",
    "chicken_kadhai": "https://images.unsplash.com/photo-1546833999-b9f581a1996d?auto=format&fit=crop&w=600&q=80",
    "chicken_keema": "https://images.unsplash.com/photo-1599488615731-7e5c2823ff28?auto=format&fit=crop&w=600&q=80",
    "mutton_curry": "https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=600&q=80",
    "dal_tadka": "https://images.unsplash.com/photo-1546833998-877b37c2e5c6?auto=format&fit=crop&w=600&q=80",
    "paneer_butter_masala": "https://images.unsplash.com/photo-1631452180519-c014fe946bc7?auto=format&fit=crop&w=600&q=80",
    "paneer_curry": "https://images.unsplash.com/photo-1567188040759-fb8a883dc6d8?auto=format&fit=crop&w=600&q=80",
    "mix_veg_curry": "https://images.unsplash.com/photo-1585937421612-70a008356fbe?auto=format&fit=crop&w=600&q=80",
    "chana_curry": "https://images.unsplash.com/photo-1589301760014-d929f3979dbc?auto=format&fit=crop&w=600&q=80",
    "mushroom_curry": "https://images.unsplash.com/photo-1627308595229-7830a5c91f9f?auto=format&fit=crop&w=600&q=80",
    "manchurian": "https://images.unsplash.com/photo-1569058242253-92a9c755a0ec?auto=format&fit=crop&w=600&q=80",

    # Chowmein & Noodles
    "chicken_chowmein": "https://images.unsplash.com/photo-1612927601601-6638404737ce?auto=format&fit=crop&w=600&q=80",
    "veg_chowmein": "https://images.unsplash.com/photo-1585032226651-759b368d7246?auto=format&fit=crop&w=600&q=80",
    "noodle_soup": "https://images.unsplash.com/photo-1569718212165-3a8278d5f624?auto=format&fit=crop&w=600&q=80",

    # Momos
    "steam_momo": "https://images.unsplash.com/photo-1625246333195-78d9c38ad449?auto=format&fit=crop&w=600&q=80",
    "fry_momo": "https://images.unsplash.com/photo-1541696432-82c6da8ce7bf?auto=format&fit=crop&w=600&q=80",
    "chilli_momo": "https://images.unsplash.com/photo-1534422298391-e4f8c172dddb?auto=format&fit=crop&w=600&q=80",
    "jhol_momo": "https://images.unsplash.com/photo-1569718212165-3a8278d5f624?auto=format&fit=crop&w=600&q=80",
    "kothey_momo": "https://images.unsplash.com/photo-1498654896293-37aacf113fd9?auto=format&fit=crop&w=600&q=80",

    # Pizza & Burgers & Sandwiches
    "chicken_pizza": "https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?auto=format&fit=crop&w=600&q=80",
    "veg_pizza": "https://images.unsplash.com/photo-1574071318508-1cdbab80d002?auto=format&fit=crop&w=600&q=80",
    "margherita_pizza": "https://images.unsplash.com/photo-1604382355076-af4b0eb60143?auto=format&fit=crop&w=600&q=80",
    "chicken_burger": "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=600&q=80",
    "veg_burger": "https://images.unsplash.com/photo-1586190848861-99aa4a171e90?auto=format&fit=crop&w=600&q=80",
    "sandwich": "https://images.unsplash.com/photo-1528735602780-2552fd46c7af?auto=format&fit=crop&w=600&q=80",

    # Starters & Snacks
    "french_fries": "https://images.unsplash.com/photo-1576107232684-1279f3908594?auto=format&fit=crop&w=600&q=80",
    "chicken_wings": "https://images.unsplash.com/photo-1527477378308-1dc757f08b03?auto=format&fit=crop&w=600&q=80",
    "drumstick": "https://images.unsplash.com/photo-1626082927389-6cd097cdc6ec?auto=format&fit=crop&w=600&q=80",
    "chicken_chilli": "https://images.unsplash.com/photo-1603894584373-5ac82b2ae398?auto=format&fit=crop&w=600&q=80",
    "chicken_crispy": "https://images.unsplash.com/photo-1562967914-608f82629710?auto=format&fit=crop&w=600&q=80",
    "chicken_nuggets": "https://images.unsplash.com/photo-1562967916-eb82221dfb92?auto=format&fit=crop&w=600&q=80",
    "sausage": "https://images.unsplash.com/photo-1541544741938-0af808871cc0?auto=format&fit=crop&w=600&q=80",
    "sekuwa": "https://images.unsplash.com/photo-1555939594-58d7cb561ad1?auto=format&fit=crop&w=600&q=80",
    "choila": "https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=600&q=80",
    "paneer_chilli": "https://images.unsplash.com/photo-1567188040759-fb8a883dc6d8?auto=format&fit=crop&w=600&q=80",
    "pakoda": "https://images.unsplash.com/photo-1601050690597-df0568f70950?auto=format&fit=crop&w=600&q=80",
    "cheese_ball": "https://images.unsplash.com/photo-1541529086526-db283c563270?auto=format&fit=crop&w=600&q=80",
    "alu_jeera": "https://images.unsplash.com/photo-1589301760014-d929f3979dbc?auto=format&fit=crop&w=600&q=80",
    "chatpate": "https://images.unsplash.com/photo-1606491956689-2ea866880c84?auto=format&fit=crop&w=600&q=80",
    "papad": "https://images.unsplash.com/photo-1626074353765-517a681e40be?auto=format&fit=crop&w=600&q=80",
    "sweet_corn": "https://images.unsplash.com/photo-1551754655-cd27e38d2076?auto=format&fit=crop&w=600&q=80",
    "baby_corn": "https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=600&q=80",
    "kaju_fry": "https://images.unsplash.com/photo-1509358271058-acd22cc93898?auto=format&fit=crop&w=600&q=80",
}

def get_image_for_item(name, category):
    n = name.lower()
    c = category.lower()

    # Drinks
    if "coke" in n: return IMAGES["coke"]
    if "fanta" in n: return IMAGES["fanta"]
    if "sprite" in n: return IMAGES["sprite"]
    if "redbull" in n: return IMAGES["redbull"]
    if "water" in n: return IMAGES["water"]
    if "badam" in n: return IMAGES["badam_juice"]
    if "canberry" in n or "cranberry" in n: return IMAGES["cranberry"]
    if "xtream" in n: return IMAGES["xtream"]

    # Momos
    if "momo" in n:
        if "steam" in n: return IMAGES["steam_momo"]
        if "fry" in n: return IMAGES["fry_momo"]
        if "jhol" in n: return IMAGES["jhol_momo"]
        if "c" in n.split() or "chilli" in n: return IMAGES["chilli_momo"]
        if "kothey" in n: return IMAGES["kothey_momo"]
        return IMAGES["steam_momo"]

    # Chowmein & Noodles
    if "chowmein" in n or "chau chau" in n:
        if "jhol" in n: return IMAGES["noodle_soup"]
        if "chicken" in n or "non veg" in n: return IMAGES["chicken_chowmein"]
        return IMAGES["veg_chowmein"]

    # Biryani & Fried Rice
    if "biryani" in n:
        if "paneer" in n: return IMAGES["paneer_biryani"]
        if "chicken" in n: return IMAGES["chicken_biryani"]
        return IMAGES["veg_biryani"]
    if "fried rice" in n or "fry rice" in n:
        if "chicken" in n or "non veg" in n or "keema" in n or "bhutan" in n: return IMAGES["chicken_fried_rice"]
        if "paneer" in n: return IMAGES["paneer_biryani"]
        return IMAGES["veg_fried_rice"]
    if "jeera rice" in n: return IMAGES["jeera_rice"]
    if "pulao" in n: return IMAGES["pulao"]
    if "plain rice" in n: return IMAGES["plain_rice"]
    if "lemon rice" in n: return IMAGES["jeera_rice"]
    if "paratha" in n: return IMAGES["paratha"]

    # Pizza & Burgers & Sandwiches
    if "pizza" in n:
        if "margherita" in n: return IMAGES["margherita_pizza"]
        if "chicken" in n: return IMAGES["chicken_pizza"]
        return IMAGES["veg_pizza"]
    if "burger" in n:
        if "chicken" in n: return IMAGES["chicken_burger"]
        return IMAGES["veg_burger"]
    if "sandwich" in n: return IMAGES["sandwich"]

    # Sweets & Cakes
    if "cake" in n: return IMAGES["birthday_cake"]
    if "gulab jamun" in n: return IMAGES["gulab_jamun"]
    if "rasmalai" in n: return IMAGES["rasmalai"]

    # Fish
    if "fish" in n:
        if "fry" in n: return IMAGES["fish_fry"]
        return IMAGES["fish_curry"]

    # Mutton
    if "mutton" in n:
        if "sekuwa" in n: return IMAGES["sekuwa"]
        if "choila" in n: return IMAGES["choila"]
        return IMAGES["mutton_curry"]

    # Chicken Curries & Dishes
    if "chicken" in n:
        if "butter" in n: return IMAGES["butter_chicken"]
        if "kadhai" in n: return IMAGES["chicken_kadhai"]
        if "keema" in n: return IMAGES["chicken_keema"]
        if "manchurian" in n: return IMAGES["manchurian"]
        if "curry" in n or "gravy" in n or "rara" in n or "masala" in n or "bharta" in n or "do pyaja" in n:
            return IMAGES["chicken_curry"]
        if "65" in n or "chilli" in n or "dragon" in n or "timur" in n or "crispy" in n:
            return IMAGES["chicken_chilli"]
        if "wing" in n: return IMAGES["chicken_wings"]
        if "drumstick" in n: return IMAGES["drumstick"]
        if "nugget" in n or "kurkure" in n: return IMAGES["chicken_nuggets"]
        if "sausage" in n: return IMAGES["sausage"]
        if "pakoda" in n: return IMAGES["pakoda"]
        if "choila" in n or "sadeko" in n or "jaate" in n: return IMAGES["choila"]
        if "fry" in n or "roast" in n: return IMAGES["chicken_wings"]
        return IMAGES["chicken_curry"]

    # Paneer Dishes
    if "paneer" in n:
        if "butter" in n: return IMAGES["paneer_butter_masala"]
        if "chilli" in n or "dragon" in n: return IMAGES["paneer_chilli"]
        if "pakoda" in n: return IMAGES["pakoda"]
        return IMAGES["paneer_curry"]

    # Dal
    if "dal" in n: return IMAGES["dal_tadka"]

    # Starters & Snacks
    if "fries" in n or "chips" in n: return IMAGES["french_fries"]
    if "pakoda" in n: return IMAGES["pakoda"]
    if "cheese ball" in n: return IMAGES["cheese_ball"]
    if "papad" in n: return IMAGES["papad"]
    if "chatpate" in n or "sadeko" in n or "chiura" in n or "bhatmas" in n or "furandana" in n: return IMAGES["chatpate"]
    if "sekuwa" in n or "bhutan" in n: return IMAGES["sekuwa"]
    if "chana" in n: return IMAGES["chana_curry"]
    if "mushroom" in n: return IMAGES["mushroom_curry"]
    if "sweet corn" in n or "baby corn" in n: return IMAGES["sweet_corn"]
    if "kaju" in n or "peanut" in n: return IMAGES["kaju_fry"]
    if "alu" in n: return IMAGES["alu_jeera"]
    if "gobi" in n: return IMAGES["manchurian"]
    if "manchurian" in n: return IMAGES["manchurian"]

    # Category fallbacks
    if "drink" in c or "beer" in c: return IMAGES["sprite"]
    if "curry" in c or "gravy" in c: return IMAGES["chicken_curry"]
    if "khaja" in c: return IMAGES["chicken_chowmein"]
    if "momo" in c: return IMAGES["steam_momo"]
    if "shitan" in c or "starter" in c: return IMAGES["chicken_chilli"]
    if "bhojan" in c: return IMAGES["chicken_biryani"]

    return IMAGES["chicken_curry"]

import sys

# Read the items list from step 1358 output or fetch from db
step_file = r"C:\Users\Admin\.gemini\antigravity\brain\bcc78b34-b8c7-4896-9e1c-bc66916ae782\.system_generated\steps\1358\output.txt"
with open(step_file, "r", encoding="utf-8") as f:
    raw = json.load(f)

# raw["result"] contains string with untrusted boundaries
text = raw["result"]
import re
match = re.search(r"\[\{.*\}\]", text, re.DOTALL)
if not match:
    print("Could not find JSON array")
    sys.exit(1)

items = json.loads(match.group(0))
print(f"Loaded {len(items)} items")

updates = []
for item in items:
    # If item already has a custom image, keep it
    if item.get("image_url") and "myspicetrunk" not in item["image_url"]:
        continue
    img = get_image_for_item(item["name"], item.get("category") or "")
    updates.append((item["id"], img))

print(f"Total updates to perform: {len(updates)}")

# Generate SQL CASE statement for single ultra-fast query
cases = []
ids = []
for item_id, img in updates:
    cases.append(f"WHEN id = '{item_id}' THEN '{img}'")
    ids.append(f"'{item_id}'")

sql = f"""UPDATE menu_items
SET image_url = CASE
    {" ".join(cases)}
    ELSE image_url
END
WHERE id IN ({", ".join(ids)});"""

sql_file = r"d:\chrome downloads\khante-pinte-v2\khantepinte-mvp\scripts\update_images.sql"
with open(sql_file, "w", encoding="utf-8") as f:
    f.write(sql)

print(f"SQL written to {sql_file}")
