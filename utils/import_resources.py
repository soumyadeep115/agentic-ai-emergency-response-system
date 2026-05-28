import json
from utils.db import get_connection


def import_resources():
    with open("frontend/src/data/resources.json", "r") as file:
        data = json.load(file)

    conn = get_connection()
    cursor = conn.cursor()

    try:
        cursor.execute("TRUNCATE TABLE hospitals")
        cursor.execute("TRUNCATE TABLE police_units")
        cursor.execute("TRUNCATE TABLE ambulances")
        cursor.execute("TRUNCATE TABLE repair_shops")
        cursor.execute("TRUNCATE TABLE tow_services")

        print("Importing hospitals...")
        for h in data.get("hospitals", []):
            print(h)
            cursor.execute("""
                INSERT INTO hospitals
                (hospital_id, name, available_beds, icu_readiness, trauma_score, latitude, longitude)
                VALUES (%s, %s, %s, %s, %s, %s, %s)
            """, (
                h.get("id"),
                h.get("name"),
                h.get("available_beds", 80),
                h.get("icu_readiness", 90),
                h.get("trauma_score", 85),
                h.get("latitude"),
                h.get("longitude")
            ))

        print("Importing police...")
        for p in data.get("police", []):
            print(p)
            cursor.execute("""
                INSERT INTO police_units
                (unit_id, name, eta, clearance_capacity, status, latitude, longitude)
                VALUES (%s, %s, %s, %s, %s, %s, %s)
            """, (
                p.get("id"),
                p.get("name"),
                p.get("eta", 5),
                p.get("clearance_capacity", 95),
                p.get("status", "available"),
                p.get("latitude"),
                p.get("longitude")
            ))

        print("Importing ambulances...")
        for a in data.get("ambulances", []):
            print(a)
            cursor.execute("""
                INSERT INTO ambulances
                (ambulance_id, name, eta, equipment_score, status, location, latitude, longitude)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
            """, (
                a.get("id"),
                a.get("name"),
                a.get("eta", 4),
                a.get("equipment_score", 90),
                a.get("status", "available"),
                a.get("name", "Station_A"),   # location kept as text for NetworkX fallback
                a.get("latitude"),
                a.get("longitude")
            ))

        print("Importing repair shops...")
        for shop in data.get("repair_shops", []):
            print(shop)
            cursor.execute("""
                INSERT INTO repair_shops
                (id, name, latitude, longitude, status)
                VALUES (%s, %s, %s, %s, %s)
            """, (
                shop["id"],
                shop["name"],
                shop["latitude"],
                shop["longitude"],
                shop.get("status", "available")
            ))

        print("Importing tow services...")
        for tow in data.get("tow_services", []):
            print(tow)
            cursor.execute("""
                INSERT INTO tow_services
                (id, name, latitude, longitude, status)
                VALUES (%s, %s, %s, %s, %s)
            """, (
                tow["id"],
                tow["name"],
                tow["latitude"],
                tow["longitude"],
                tow.get("status", "available")
            ))

        conn.commit()
        print("Resources imported successfully")

    except Exception as e:
        conn.rollback()
        print("IMPORT ERROR:", e)

    finally:
        cursor.close()
        conn.close()


if __name__ == "__main__":
    import_resources()