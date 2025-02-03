from werkzeug.security import generate_password_hash, check_password_hash
import sqlite3

# Şifre hashleme ve doğrulama işlevleri
def hash_password(password):
    """Bir şifreyi hashler."""
    return generate_password_hash(password)

def verify_password(hashed_password, password):
    """Hashlenmiş bir şifre ile girilen şifreyi doğrular."""
    return check_password_hash(hashed_password, password)

def update_passwords_for_table(table_name, column_name, default_password, db_path='ogrenciler.db'):
    """
    Belirli bir tablodaki tüm kullanıcılar için varsayılan şifreyi hashleyip günceller.
    """
    try:
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()

        # Varsayılan şifreyi hashle
        hashed_password = hash_password(default_password)

        # Şifrelerin güncellenmesi
        cursor.execute(f'''
            UPDATE {table_name}
            SET {column_name} = ?
            WHERE {column_name} = ?
        ''', (hashed_password, default_password))
        conn.commit()

        print(f"{table_name} tablosundaki şifreler başarıyla hashlenmiş şekilde güncellendi.")
    except sqlite3.Error as e:
        print(f"{table_name} tablosunda hata oluştu: {str(e)}")
    finally:
        conn.close()

# Öğrenciler ve akademisyenler için varsayılan şifreyi hashleyip güncelle
update_passwords_for_table(
    table_name='ogrenciler',
    column_name='sifre',
    default_password='123456'  # Varsayılan öğrenci şifresi
)

update_passwords_for_table(
    table_name='akademisyen_kullanicilar',
    column_name='sifre',
    default_password='password123',  # Varsayılan akademisyen şifresi
    db_path='ogrenciler.db'
)

print("Tüm şifreler başarıyla hashlenmiş şekilde güncellendi.")
