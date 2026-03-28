import re
from datetime import date
from app.models.ghana_card_record import GhanaCardRecord

_SEED_RECORDS = [
    dict(card_number="GHA-123456789-0", first_name="Kofi", last_name="Mensah", other_names="Asante", date_of_birth=date(1990, 5, 15), gender="Male", region="Ashanti", district="Kumasi Metropolitan"),
    dict(card_number="GHA-234567890-1", first_name="Ama", last_name="Asante", other_names="Adjoa", date_of_birth=date(1985, 8, 22), gender="Female", region="Greater Accra", district="Accra Metropolitan"),
    dict(card_number="GHA-345678901-2", first_name="Kwame", last_name="Osei", other_names="Bonsu", date_of_birth=date(1992, 11, 30), gender="Male", region="Western", district="Sekondi-Takoradi"),
    dict(card_number="GHA-456789012-3", first_name="Akosua", last_name="Adusei", other_names=None, date_of_birth=date(1988, 3, 10), gender="Female", region="Eastern", district="New Juaben Municipal"),
    dict(card_number="GHA-567890123-4", first_name="Yaw", last_name="Darko", other_names="Boateng", date_of_birth=date(1995, 7, 4), gender="Male", region="Central", district="Cape Coast Metropolitan"),
    dict(card_number="GHA-678901234-5", first_name="Abena", last_name="Kusi", other_names=None, date_of_birth=date(1983, 12, 19), gender="Female", region="Volta", district="Ho Municipal"),
    dict(card_number="GHA-789012345-6", first_name="Kweku", last_name="Amponsah", other_names="Nkrumah", date_of_birth=date(1998, 2, 28), gender="Male", region="Northern", district="Tamale Metropolitan"),
    dict(card_number="GHA-890123456-7", first_name="Efua", last_name="Boateng", other_names="Esi", date_of_birth=date(1975, 9, 8), gender="Female", region="Ashanti", district="Oforikrom Municipal"),
    dict(card_number="GHA-901234567-8", first_name="Nana", last_name="Agyemang", other_names="Kofi", date_of_birth=date(2000, 6, 21), gender="Male", region="Greater Accra", district="Adentan Municipal"),
    dict(card_number="GHA-012345678-9", first_name="Adwoa", last_name="Frimpong", other_names=None, date_of_birth=date(1993, 4, 14), gender="Female", region="Brong-Ahafo", district="Sunyani Municipal"),
    dict(card_number="GHA-111222333-1", first_name="Kojo", last_name="Appiah", other_names="Kwabena", date_of_birth=date(1987, 1, 5), gender="Male", region="Western North", district="Sefwi Wiawso"),
    dict(card_number="GHA-222333444-2", first_name="Esi", last_name="Antwi", other_names=None, date_of_birth=date(1996, 10, 31), gender="Female", region="Oti", district="Jasikan"),
    dict(card_number="GHA-333444555-3", first_name="Kofi", last_name="Barimah", other_names="Kwabena", date_of_birth=date(1982, 7, 17), gender="Male", region="Upper East", district="Bolgatanga Municipal"),
    dict(card_number="GHA-444555666-4", first_name="Maame", last_name="Adu", other_names="Akua", date_of_birth=date(1979, 11, 23), gender="Female", region="Upper West", district="Wa Municipal"),
    dict(card_number="GHA-555666777-5", first_name="Fiifi", last_name="Quaye", other_names=None, date_of_birth=date(2001, 3, 9), gender="Male", region="Greater Accra", district="La Dade-Kotopon Municipal"),
    dict(card_number="GHA-666777888-6", first_name="Araba", last_name="Cobbah", other_names="Enyonam", date_of_birth=date(1991, 5, 27), gender="Female", region="Central", district="Mfantsiman Municipal"),
    dict(card_number="GHA-777888999-7", first_name="Kwabena", last_name="Amoah", other_names=None, date_of_birth=date(1984, 8, 3), gender="Male", region="Ashanti", district="Asokwa Municipal"),
    dict(card_number="GHA-888999000-8", first_name="Akua", last_name="Acheampong", other_names="Serwaa", date_of_birth=date(1999, 12, 12), gender="Female", region="Eastern", district="Kwahu West Municipal"),
    dict(card_number="GHA-999000111-9", first_name="Yaw", last_name="Asante", other_names="Ofori", date_of_birth=date(1972, 4, 1), gender="Male", region="Savannah", district="Damongo"),
    dict(card_number="GHA-100200300-0", first_name="Abiba", last_name="Mohammed", other_names=None, date_of_birth=date(1994, 6, 18), gender="Female", region="Northern", district="Sagnarigu Municipal"),
    dict(card_number="GHA-200300400-1", first_name="Ekow", last_name="Egyir", other_names="Nsiah", date_of_birth=date(1989, 9, 25), gender="Male", region="Central", district="Abura-Asebu-Kwamankese"),
    dict(card_number="GHA-300400500-2", first_name="Afia", last_name="Sarpong", other_names=None, date_of_birth=date(1997, 2, 14), gender="Female", region="Ashanti", district="Asante Akim Central Municipal"),
    dict(card_number="GHA-400500600-3", first_name="Kwesi", last_name="Atta", other_names="Biney", date_of_birth=date(1980, 10, 7), gender="Male", region="Western", district="Ahanta West"),
    dict(card_number="GHA-500600700-4", first_name="Akosua", last_name="Owusu", other_names="Dankwa", date_of_birth=date(1986, 7, 29), gender="Female", region="Greater Accra", district="Kpone-Katamanso"),
    dict(card_number="GHA-600700800-5", first_name="Nii", last_name="Quartey", other_names="Laryea", date_of_birth=date(1976, 1, 11), gender="Male", region="Greater Accra", district="Ayawaso West Municipal"),
]


def normalize_card(value: str) -> str:
    return re.sub(r"[\s]", "", (value or "").upper())


def seed_nia_data(db):
    if db.query(GhanaCardRecord).count() > 0:
        return
    for rec in _SEED_RECORDS:
        db.add(GhanaCardRecord(
            card_number=rec["card_number"],
            first_name=rec["first_name"],
            last_name=rec["last_name"],
            other_names=rec.get("other_names"),
            date_of_birth=rec["date_of_birth"],
            gender=rec["gender"],
            nationality="Ghanaian",
            region=rec.get("region"),
            district=rec.get("district"),
            is_active=True,
        ))
    db.commit()
