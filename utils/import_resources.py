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

            hospital_id = h.get("id") or h.get("hospital_id")

            cursor.execute("""
                INSERT INTO hospitals
                (hospital_id, available_beds, icu_readiness, trauma_score)
                VALUES (%s, %s, %s, %s)
            """, (
                hospital_id,
                h.get("available_beds", 80),
                h.get("icu_readiness", 90),
                h.get("trauma_score", 85)
            ))

        print("Importing police...")
        for p in data.get("police", []):
            print(p)

            unit_id = p.get("id") or p.get("unit_id")

            cursor.execute("""
                INSERT INTO police_units
                (unit_id, eta, clearance_capacity, status)
                VALUES (%s, %s, %s, %s)
            """, (
                unit_id,
                p.get("eta", 5),
                p.get("clearance_capacity", 95),
                p.get("status", "available")
            ))

        print("Importing ambulances...")
        for a in data.get("ambulances", []):
            print(a)

            ambulance_id = a.get("id") or a.get("ambulance_id")

            cursor.execute("""
                INSERT INTO ambulances
                (ambulance_id, eta, equipment_score, status, location)
                VALUES (%s, %s, %s, %s, %s)
            """, (
                ambulance_id,
                a.get("eta", 4),
                a.get("equipment_score", 90),
                a.get("status", "available"),
                a.get("location", a.get("name", "Station_A"))
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