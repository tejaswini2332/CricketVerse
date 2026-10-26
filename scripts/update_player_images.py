import json
import os

def update_player_images():
    data_path = "server/data/players_2000_2026.json"
    with open(data_path, "r", encoding="utf-8") as f:
        players = json.load(f)

    # Known star player photo map
    photo_map = {
        "virat kohli": "/images/players/virat_kohli.jpg",
        "rohit sharma": "/images/players/rohit_sharma.jpg",
        "ms dhoni": "/images/players/ms_dhoni.jpg",
        "jasprit bumrah": "/images/players/jasprit_bumrah.jpg",
        "hardik pandya": "/images/players/hardik_pandya.jpg",
        "ravindra jadeja": "/images/players/ravindra_jadeja.jpg",
        "suryakumar yadav": "/images/players/suryakumar_yadav.jpg",
        "shubman gill": "/images/players/shubman_gill.jpg",
        "rishabh pant": "/images/players/rishabh_pant.jpg",
        "kl rahul": "/images/players/kl_rahul.jpg",
        "mohammed shami": "/images/players/mohammed_shami.jpg",
        "kuldeep yadav": "/images/players/kuldeep_yadav.jpg",
        "axar patel": "/images/players/axar_patel.jpg",
        "rashid khan": "/images/players/rashid_khan.jpg",
        "pat cummins": "/images/players/pat_cummins.jpg"
    }

    star_count = 0
    avatar_count = 0

    for p in players:
        clean_name = p["name"].lower().strip()
        if clean_name in photo_map:
            p["avatar"] = photo_map[clean_name]
            star_count += 1
        else:
            p["avatar"] = f"/api/avatar/{p['id']}.svg"
            avatar_count += 1

    with open(data_path, "w", encoding="utf-8") as f:
        json.dump(players, f, indent=2)

    print(f"Updated {len(players)} players: {star_count} star photos, {avatar_count} dynamic avatar URIs.")

if __name__ == "__main__":
    update_player_images()
