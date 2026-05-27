import json
from db import get_connection

def import_resources():
    with open("frontend/src/data/resources.json", "r") as file:
        data = json.load(file)

    conn = get_connection()
    cursor = conn.cursor()

    # Repair Shops
    for shop in data["repair_shops"]:
        cursor.execute("""
            INSERT INTO repair_shops (id, name, latitude, longitude, status)
            VALUES (%s, %s, %s, %s, %s)
            ON DUPLICATE KEY UPDATE
                name=%s,
                latitude=%s,
                longitude=%s,
                status=%s
        """, (
            shop["id"], shop["name"], shop["latitude"],
            shop["longitude"], shop["status"],
            shop["name"], shop["latitude"],
            shop["longitude"], shop["status"]
        ))

    # Tow Services
    for tow in data["tow_services"]:
        cursor.execute("""
            INSERT INTO tow_services (id, name, latitude, longitude, status)
            VALUES (%s, %s, %s, %s, %s)
            ON DUPLICATE KEY UPDATE
                name=%s,
                latitude=%s,
                longitude=%s,
                status=%s
        """, (
            tow["id"], tow["name"], tow["latitude"],
            tow["longitude"], tow["status"],
            tow["name"], tow["latitude"],
            tow["longitude"], tow["status"]
        ))

    conn.commit()
    cursor.close()
    conn.close()

    print("Resources imported successfully")


if __name__ == "__main__":
    import_resources()