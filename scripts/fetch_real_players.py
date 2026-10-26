import urllib.request
import json
import os

PLAYERS = [
    ("Virat Kohli", "virat_kohli.jpg"),
    ("Jasprit Bumrah", "jasprit_bumrah.jpg"),
    ("Rohit Sharma", "rohit_sharma.jpg"),
    ("Hardik Pandya", "hardik_pandya.jpg"),
    ("Rishabh Pant", "rishabh_pant.jpg"),
    ("Ravindra Jadeja", "ravindra_jadeja.jpg"),
    ("Suryakumar Yadav", "suryakumar_yadav.jpg"),
    ("Rashid Khan (cricketer)", "rashid_khan.jpg"),
    ("Heinrich Klaasen", "heinrich_klaasen.jpg"),
    ("Pat Cummins", "pat_cummins.jpg"),
    ("Shubman Gill", "shubman_gill.jpg"),
    ("Mohammed Shami", "mohammed_shami.jpg"),
    ("Axar Patel", "axar_patel.jpg"),
    ("Kuldeep Yadav", "kuldeep_yadav.jpg"),
    ("Rinku Singh", "rinku_singh.jpg"),
]

output_dir = "public/images/players"
os.makedirs(output_dir, exist_ok=True)

headers = {"User-Agent": "CricketVerseAcademicDApp/1.0 (contact@cricketverse.edu)"}

for player_title, filename in PLAYERS:
    out_path = os.path.join(output_dir, filename)
    if os.path.exists(out_path) and os.path.getsize(out_path) > 10000:
        print(f"Already exists: {filename} ({os.path.getsize(out_path)} bytes)")
        continue

    url_title = urllib.parse.quote(player_title)
    api_url = f"https://en.wikipedia.org/w/api.php?action=query&titles={url_title}&prop=pageimages&format=json&pithumbsize=600"
    
    req = urllib.request.Request(api_url, headers=headers)
    try:
        with urllib.request.urlopen(req) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            pages = data.get("query", {}).get("pages", {})
            for pid, page in pages.items():
                if "thumbnail" in page:
                    img_url = page["thumbnail"]["source"]
                    print(f"Downloading {player_title} -> {img_url}")
                    img_req = urllib.request.Request(img_url, headers=headers)
                    with urllib.request.urlopen(img_req) as img_resp:
                        with open(out_path, "wb") as f:
                            f.write(img_resp.read())
                    print(f"Saved: {out_path} ({os.path.getsize(out_path)} bytes)")
                    break
                else:
                    print(f"No thumbnail found for {player_title}")
    except Exception as e:
        print(f"Error fetching {player_title}: {e}")
