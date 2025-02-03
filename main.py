from flask import Flask,Response, render_template, request, jsonify, redirect, url_for, session
import sqlite3
from werkzeug.security import check_password_hash, generate_password_hash

# Flask uygulaması
app = Flask(__name__)
app.secret_key = 'gizli_anahtar'

@app.after_request
def set_csp(response: Response):
    response.headers["Content-Security-Policy"] = "script-src 'self' 'unsafe-inline' https://m.stripe.network; worker-src 'self' blob:;"
    return response

# Veritabanı bağlantı fonksiyonu
def sql_baglanti():
    conn = sqlite3.connect('ogrenciler.db')
    conn.row_factory = sqlite3.Row
    return conn

# Ana Sayfa Rotası
@app.route('/')
def giris_ekrani():
    return render_template('ana_ekran.html')


# Akademisyen Girişi
@app.route('/akademisyen_giris', methods=['GET', 'POST'])
def akademisyen_giris():
    if request.method == 'POST':
        kullanici_adi = request.form['kullanici-adi']
        sifre = request.form['sifre']

        conn = sql_baglanti()
        akademisyen = conn.execute(
            'SELECT * FROM akademisyen_kullanicilar WHERE kullanici_adi = ?',
            (kullanici_adi,)
        ).fetchone()

        if akademisyen:
            # Şifre doğrulama: hashlenmiş ya da düz metin
            if check_password_hash(akademisyen['sifre'], sifre) or akademisyen['sifre'] == sifre:
                # Eğer şifre düz metinse, hashleyip güncelle
                if akademisyen['sifre'] == sifre: 
                    hashed_password = generate_password_hash(sifre)
                    conn.execute(
                        'UPDATE akademisyen_kullanicilar SET sifre = ? WHERE kullanici_adi = ?',
                        (hashed_password, kullanici_adi)
                    )
                    conn.commit()

                # Oturum bilgilerini ayarla
                session.clear()
                session['kullanici_adi'] = kullanici_adi
                session['akademisyen_adi'] = akademisyen['akademisyen_adı']
                conn.close()
                return redirect(url_for('main_akademisyen'))
            else:
                conn.close()
                return render_template('akademisyen_giris.html', error="Geçersiz kullanıcı adı veya şifre")
        else:
            conn.close()
            return render_template('akademisyen_giris.html', error="Geçersiz kullanıcı adı veya şifre")

    return render_template('akademisyen_giris.html')

#Akademisyen Şifre Değiştirme
@app.route('/api/sifre_degistir', methods=['POST'])
def sifre_degistir():
    if 'kullanici_adi' not in session:
        return jsonify({'success': False, 'message': 'Giriş yapmanız gerekiyor.'}), 401

    data = request.get_json()
    eski_sifre = data.get('eskiSifre')
    yeni_sifre = data.get('yeniSifre')

    # Alanların boş olmaması kontrolü
    if not eski_sifre or not yeni_sifre:
        return jsonify({'success': False, 'message': 'Tüm alanları doldurun.'}), 400

    # Veritabanı bağlantısı
    conn = sql_baglanti()
    kullanici_adi = session['kullanici_adi']

    # Kullanıcı bilgilerini getir
    akademisyen = conn.execute(
        'SELECT sifre FROM akademisyen_kullanicilar WHERE kullanici_adi = ?',
        (kullanici_adi,)
    ).fetchone()

    # Eski şifre kontrolü
    if not akademisyen:
        conn.close()
        return jsonify({'success': False, 'message': 'Kullanıcı bulunamadı.'}), 404

    # Şifre doğrulama
    if not check_password_hash(akademisyen['sifre'], eski_sifre):
        conn.close()
        return jsonify({'success': False, 'message': 'Eski şifreniz yanlış.'}), 400

    # Yeni şifreyi hashle
    yeni_hashed_sifre = generate_password_hash(yeni_sifre)

    try:
        # Şifreyi güncelle
        conn.execute(
            'UPDATE akademisyen_kullanicilar SET sifre = ? WHERE kullanici_adi = ?',
            (yeni_hashed_sifre, kullanici_adi)
        )
        conn.commit()
    except Exception as e:
        conn.rollback()
        conn.close()
        return jsonify({'success': False, 'message': f'Bir hata oluştu: {str(e)}'}), 500
    finally:
        conn.close()

    return jsonify({'success': True, 'message': 'Şifreniz başarıyla değiştirildi.'})




# Akademisyen Ana Sayfa Rotası
@app.route('/main_akademisyen')
def main_akademisyen():
    if 'kullanici_adi' not in session:
        return redirect(url_for('akademisyen_giris'))

    return render_template('main_akademisyen.html')


# Akademisyenin Dersini Alan Öğrenciler
@app.route('/api/ders_ogrencileri', methods=['GET'])
def get_ders_ogrencileri():
    if 'kullanici_adi' not in session:
        return jsonify({'error': 'Oturum süresi doldu, lütfen tekrar giriş yapın'}), 401

    kullanici_adi = session['kullanici_adi']
    conn = sql_baglanti()

    # Kullanıcı adından akademisyen adını al
    akademisyen = conn.execute(
        'SELECT akademisyen_adı FROM akademisyen_kullanicilar WHERE kullanici_adi = ?',
        (kullanici_adi,)
    ).fetchone()

    if not akademisyen:
        conn.close()
        return jsonify({'error': 'Akademisyen bulunamadı.'}), 404

    akademisyen_adi = akademisyen['akademisyen_adı']

    # Akademisyene ait öğrenciler
    ders_ogrencileri = conn.execute('''
        SELECT ogrenci_num, isim, soyisim, ders_kodu 
        FROM ogrenci_ders_kayit 
        WHERE akademisyen = ?
    ''', (akademisyen_adi,)).fetchall()
    conn.close()

    # JSON formatında veri döndür
    return jsonify([dict(row) for row in ders_ogrencileri])


# Akademisyen Yeni Ders Eklemesi
@app.route('/api/akademisyen_yeni_ders', methods=['POST'])
def akademisyen_yeni_ders():
    if 'kullanici_adi' not in session:
        return jsonify({'error': 'Oturum süresi doldu, lütfen tekrar giriş yapın'}), 401

    data = request.get_json()
    ders_kodu = data.get('ders_kodu')
    ders_ismi = data.get('ders_ismi')
    gun_saat = data.get('gun_saat')
    grup_ismi = data.get('grup_ismi')

    if not (ders_kodu and ders_ismi and gun_saat and grup_ismi):
        return jsonify({'success': False, 'message': 'Tüm alanlar doldurulmalıdır'}), 400

    conn = sql_baglanti()

    # Akademisyen bilgisi
    akademisyen_adi = session.get('akademisyen_adi')

    # Dersin zaten mevcut olup olmadığını kontrol et
    existing_ders = conn.execute(
        'SELECT * FROM alinabilen_dersler WHERE ders_kodu = ?',
        (ders_kodu,)
    ).fetchone()

    if existing_ders:
        conn.close()
        return jsonify({'success': False, 'message': 'Bu ders zaten mevcut'}), 400

    try:
        # Alınabilir dersler listesine ekle
        conn.execute(
            'INSERT INTO alinabilen_dersler (ders_kodu, ders_ismi, akademisyen, gun_saat, grup_ismi) VALUES (?, ?, ?, ?, ?)',
            (ders_kodu, ders_ismi, akademisyen_adi, gun_saat, grup_ismi)
        )
        conn.commit()
    except Exception as e:
        conn.rollback()
        conn.close()
        return jsonify({'success': False, 'message': f'Hata: {str(e)}'}), 500
    finally:
        conn.close()

    return jsonify({'success': True, 'message': 'Ders başarıyla eklendi'}), 200

# Akademisyenin Derslerini Getir
@app.route('/api/akademisyen_dersler', methods=['GET'])
def akademisyen_dersler():
    if 'kullanici_adi' not in session:
        return jsonify({'error': 'Oturum süresi doldu, lütfen tekrar giriş yapın'}), 401

    akademisyen = session.get('akademisyen_adi')
    conn = sql_baglanti()
    dersler = conn.execute('''
    SELECT id, ders_kodu, ders_ismi, gun_saat, grup_ismi
    FROM alinabilen_dersler
    WHERE akademisyen = ?
    ''', (akademisyen,)).fetchall()

    conn.close()

    return jsonify([dict(ders) for ders in dersler])


# Akademisyenin Dersini Sil
@app.route('/api/akademisyen_ders_sil/<int:ders_id>', methods=['DELETE'])
def akademisyen_ders_sil(ders_id):
    if 'kullanici_adi' not in session:
        return jsonify({'error': 'Oturum süresi doldu, lütfen tekrar giriş yapın'}), 401

    akademisyen = session.get('akademisyen_adi')
    conn = sql_baglanti()

    # Ders , Oturumdaki akademisyenin mi ?
    ders = conn.execute('SELECT * FROM alinabilen_dersler WHERE id = ? AND akademisyen = ?', (ders_id, akademisyen)).fetchone()
    if not ders:
        conn.close()
        return jsonify({'success': False, 'message': 'Ders bulunamadı veya bu ders size ait değil.'}), 404

    try:
        # Ders kaydını sil
        conn.execute('DELETE FROM alinabilen_dersler WHERE id = ?', (ders_id,))
        conn.execute('DELETE FROM ogrenci_ders_kayit WHERE ders_kodu = ?', (ders['ders_kodu'],))
        conn.commit()
    except Exception as e:
        conn.rollback()
        return jsonify({'success': False, 'message': f'Silme sırasında bir hata oluştu: {str(e)}'}), 500
    finally:
        conn.close()

    return jsonify({'success': True, 'message': 'Ders başarıyla silindi'}), 200

# Dersi alan öğrenciyi silme 
@app.route('/api/ders_ogrencisi_sil/<string:ogrenci_num>/<string:ders_kodu>', methods=['DELETE'])
def ders_ogrencisi_sil(ogrenci_num, ders_kodu):
    if 'kullanici_adi' not in session:
        return jsonify({'success': False, 'message': 'Yetkilendirme hatası.'}), 401

    conn = sql_baglanti()
    try:
        # Öğrenciyi ve ders kaydını sil
        conn.execute(
            'DELETE FROM ogrenci_ders_kayit WHERE ogrenci_num = ? AND ders_kodu = ?',
            (ogrenci_num, ders_kodu)
        )
        conn.execute(
            'DELETE FROM dersler WHERE ogrenci_num = ? AND ders_kodu = ?',
            (ogrenci_num, ders_kodu)
        )
        conn.commit()
        return jsonify({'success': True, 'message': 'Öğrenci başarıyla silindi.'})
    except Exception as e:
        conn.rollback()
        return jsonify({'success': False, 'message': f'Hata: {str(e)}'})
    finally:
        conn.close()

#Derse Öğrenci Kaydı
@app.route('/api/ogrenci_ekle', methods=['POST'])
def ogrenci_ekle():
    data = request.get_json()
    ogrenci_num = data.get('ogrenci_num')
    isim = data.get('isim')
    soyisim = data.get('soyisim')
    ders_kodu = data.get('ders_kodu')

    # Varsayılan bir şifre belirleyin
    varsayilan_sifre = "123456"

    conn = sql_baglanti()

    try:
        # Öğrenci var mı kontrol et
        existing_student = conn.execute(
            'SELECT * FROM ogrenciler WHERE ogrenci_num = ?',
            (ogrenci_num,)
        ).fetchone()

        if not existing_student:
            # Eğer öğrenci kayıtlı değilse
            hashed_password = generate_password_hash(varsayilan_sifre)  
            conn.execute(
                'INSERT INTO ogrenciler (ogrenci_num, isim, soyisim, sifre) VALUES (?, ?, ?, ?)',
                (ogrenci_num, isim, soyisim, hashed_password)
            )

        # Ders kaydı kontrolü
        existing_record = conn.execute(
            'SELECT * FROM ogrenci_ders_kayit WHERE ogrenci_num = ? AND ders_kodu = ?',
            (ogrenci_num, ders_kodu)
        ).fetchone()

        if existing_record:
            return jsonify({'success': False, 'message': 'Bu öğrenci zaten mevcut.'}), 400

        # Ders kaydını ekle
        akademisyen = session.get('akademisyen_adi')
        conn.execute(
            'INSERT INTO ogrenci_ders_kayit (ogrenci_num, isim, soyisim, ders_kodu, akademisyen) VALUES (?, ?, ?, ?, ?)',
            (ogrenci_num, isim, soyisim, ders_kodu, akademisyen)
        )

        # Dersler tablosuna ekle
        ders = conn.execute(
            'SELECT * FROM alinabilen_dersler WHERE ders_kodu = ?',
            (ders_kodu,)
        ).fetchone()

        if ders:
            conn.execute(
                'INSERT INTO dersler (ogrenci_num, ders_kodu, ders_ismi, akademisyen, gun_saat) VALUES (?, ?, ?, ?, ?)',
                (ogrenci_num, ders['ders_kodu'], ders['ders_ismi'], ders['akademisyen'], ders['gun_saat'])
            )

        conn.commit()

    except Exception as e:
        conn.rollback()
        return jsonify({'success': False, 'message': f'Hata: {str(e)}'}), 500
    finally:
        conn.close()

    return jsonify({'success': True, 'message': 'Öğrenci başarıyla eklendi.'}), 200

#Öğrenci Girişi
@app.route('/ogrenci_giris', methods=['GET', 'POST'])
def ogrenci_giris():
    if request.method == 'POST':
        ogrenci_num = request.form['ogrenci_num']
        sifre = request.form['sifre']

        conn = sql_baglanti()
        ogrenci = conn.execute(
            'SELECT * FROM ogrenciler WHERE ogrenci_num = ?',
            (ogrenci_num,)
        ).fetchone()

        if not ogrenci or not check_password_hash(ogrenci['sifre'], sifre) :
            conn.close()
            return render_template('ogrenci_giris.html', error="Öğrenci Numarası veya Şifre Hatalı !")



        # Oturum bilgilerini ayarla
        session['ogrenci_num'] = ogrenci['ogrenci_num']
        session['ogrenci_isim'] = ogrenci['isim']
        session['ogrenci_soyisim'] = ogrenci['soyisim']

        conn.close()
        return redirect(url_for('main_ogrenci'))

    return render_template('ogrenci_giris.html')



#Öğrenci Şifre Değiştirme
@app.route('/api/ogrenci_sifre_degistir', methods=['POST'])
def ogrenci_sifre_degistir():
    if 'ogrenci_num' not in session:
        return jsonify({'success': False, 'message': 'Giriş yapmanız gerekiyor.'}), 401

    data = request.get_json()  # İstemciden gelen JSON verisi
    eski_sifre = data.get('eskiSifre')
    yeni_sifre = data.get('yeniSifre')

    # Alanların boş olmaması kontrolü
    if not eski_sifre or not yeni_sifre:
        return jsonify({'success': False, 'message': 'Tüm alanları doldurun.'}), 400

    conn = sql_baglanti()
    ogrenci_num = session['ogrenci_num']

    # Öğrencinin mevcut şifresini veritabanından al
    ogrenci = conn.execute(
        'SELECT sifre FROM ogrenciler WHERE ogrenci_num = ?',
        (ogrenci_num,)
    ).fetchone()

    if not ogrenci:
        conn.close()
        return jsonify({'success': False, 'message': 'Öğrenci bulunamadı.'}), 404

    # Eski şifreyi doğrula
    if not check_password_hash(ogrenci['sifre'], eski_sifre):
        conn.close()
        return jsonify({'success': False, 'message': 'Eski şifreniz yanlış.'}), 400

    # Yeni şifreyi hashle
    yeni_hashed_sifre = generate_password_hash(yeni_sifre)

    try:
        # Veritabanında şifreyi güncelle
        conn.execute(
            'UPDATE ogrenciler SET sifre = ? WHERE ogrenci_num = ?',
            (yeni_hashed_sifre, ogrenci_num)
        )
        conn.commit()
    except Exception as e:
        conn.rollback()
        conn.close()
        return jsonify({'success': False, 'message': f'Bir hata oluştu: {str(e)}'}), 500
    finally:
        conn.close()

    return jsonify({'success': True, 'message': 'Şifreniz başarıyla değiştirildi.'})

# Öğrenci Ana Sayfa Rotası 
@app.route('/main_ogrenci')
def main_ogrenci():
    if 'ogrenci_num' not in session:
        return redirect(url_for('ogrenci_giris'))
    return render_template('main_ogrenci.html')

@app.route('/api/alinabilen_dersler', methods=['GET'])
def alinabilen_dersler():
    if 'ogrenci_num' not in session:
        return jsonify({'error': 'Oturum süresi doldu, lütfen tekrar giriş yapın'}), 401

    conn = sql_baglanti()
    ogrenci_num = session.get('ogrenci_num')

    try:
        # Öğrencinin daha önce eklediği dersler
        eklenmis_dersler = conn.execute(
            'SELECT ders_kodu FROM dersler WHERE ogrenci_num = ?',
            (ogrenci_num,)
        ).fetchall()
        eklenmis_ders_kodlari = {ders['ders_kodu'] for ders in eklenmis_dersler}

        # Alınabilen dersleri getir 
        if eklenmis_ders_kodlari:
            placeholders = ', '.join(['?'] * len(eklenmis_ders_kodlari))
            alinabilir_dersler = conn.execute(
                f'SELECT * FROM alinabilen_dersler WHERE ders_kodu NOT IN ({placeholders})',
                tuple(eklenmis_ders_kodlari)
            ).fetchall()
        else:
            alinabilir_dersler = conn.execute('SELECT * FROM alinabilen_dersler').fetchall()

        # JSON formatında alınabilir dersleri döndür
        result = [
            {
                'id': ders['id'],
                'ders_kodu': ders['ders_kodu'],
                'ders_ismi': ders['ders_ismi'],
                'grup_ismi': ders['grup_ismi'],
                'akademisyen': ders['akademisyen']
            }
            for ders in alinabilir_dersler
        ]

        return jsonify(result), 200
    except Exception as e:
        print(f"Alınabilir dersler API hata: {e}")
        return jsonify({'error': 'Bir hata oluştu, lütfen tekrar deneyin.'}), 500
    finally:
        conn.close()


#  Ders Ekleme 
@app.route('/api/dersler', methods=['GET', 'POST'])
def ders_ekle():
    if 'ogrenci_num' not in session:
        return jsonify({'error': 'Oturum süresi doldu, lütfen tekrar giriş yapın'}), 401

    if request.method == 'GET':
        conn = sql_baglanti()
        ogrenci_num = session.get('ogrenci_num')
        dersler = conn.execute('''
            SELECT c.*, ac.grup_ismi
            FROM dersler c
            JOIN alinabilen_dersler ac ON c.ders_kodu = ac.ders_kodu
            WHERE ogrenci_num = ?
        ''', (ogrenci_num,)).fetchall()
        conn.close()
        return jsonify([dict(ders) for ders in dersler])

    elif request.method == 'POST':
        data = request.get_json()
        ders_id = data.get('ders_id')

        if not ders_id:
            return jsonify({'success': False, 'message': 'Ders ID belirtilmedi'}), 400

        conn = sql_baglanti()
        ders = conn.execute('SELECT * FROM alinabilen_dersler WHERE id = ?', (ders_id,)).fetchone()
        if ders:
            ogrenci_num = session.get('ogrenci_num')
            isim = session.get('ogrenci_isim')
            soyisim = session.get('ogrenci_soyisim')

            # Aynı ders daha önce eklenmiş mi kontrol et
            existing_ders = conn.execute(
                'SELECT * FROM dersler WHERE ogrenci_num = ? AND ders_kodu = ?',
                (ogrenci_num, ders['ders_kodu'])
            ).fetchone()

            if not existing_ders:
                # Öğrenci ders kaydını ekle
                conn.execute(
                    'INSERT INTO dersler (ogrenci_num, ders_kodu, ders_ismi, akademisyen, gun_saat) VALUES (?, ?, ?, ?, ?)',
                    (ogrenci_num, ders['ders_kodu'], ders['ders_ismi'], ders['akademisyen'], ders['gun_saat'])
                )
                # Akademisyenin öğrencileri görebilmesi için kayıt ekle
                conn.execute(
                    'INSERT INTO ogrenci_ders_kayit (ogrenci_num, isim, soyisim, ders_kodu, akademisyen) VALUES (?, ?, ?, ?, ?)',
                    (ogrenci_num, isim, soyisim, ders['ders_kodu'], ders['akademisyen'])
                )
                conn.commit()
        conn.close()
        return jsonify({'success': True}), 200

# Ders Silme API
@app.route('/api/dersler/<int:ders_id>', methods=['DELETE'])
def ders_sil(ders_id):
    if 'ogrenci_num' not in session:
        return jsonify({'error': 'Oturum süresi doldu, lütfen tekrar giriş yapın'}), 401

    conn = sql_baglanti()
    ogrenci_num = session.get('ogrenci_num')

    # Silinmek istenen dersin varlığını kontrol et
    ders = conn.execute(
        'SELECT * FROM dersler WHERE id = ? AND ogrenci_num = ?',
        (ders_id, ogrenci_num)
    ).fetchone()

    if not ders:
        conn.close()
        return jsonify({'success': False, 'message': 'Ders bulunamadı'}), 404

    # İlgili ders ve akademisyen bilgisi
    ders_kodu = ders['ders_kodu']
    akademisyen = ders['akademisyen']

    # Dersi sil
    conn.execute('DELETE FROM dersler WHERE id = ? AND ogrenci_num = ?', (ders_id, ogrenci_num))

    # Akademisyenin tablosundan bu öğrenciyi sil
    conn.execute('DELETE FROM ogrenci_ders_kayit WHERE ogrenci_num = ? AND ders_kodu = ? AND akademisyen = ?',
                 (ogrenci_num, ders_kodu, akademisyen))

    conn.commit()
    conn.close()

    return jsonify({'success': True}), 200


# Çıkış Rotası
@app.route('/cikis')
def cikis():
    session.clear()
    return redirect(url_for('giris_ekrani'))


if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)
