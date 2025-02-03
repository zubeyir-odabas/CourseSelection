document.addEventListener('DOMContentLoaded', function () {
    const body = document.body;

    // Akademisyen sayfası 
    if (!body.classList.contains('akademisyen-body')) return;

    const sidebar = document.getElementById('sidebar-wrapper'); // Sidebar
    const toggleButton = document.getElementById('sidebarToggle'); // 3 çizgi butonunu
    const content = document.querySelector('.container-fluid'); // Ana içerik alanı
    const navbar = document.querySelector('.navbar'); // Navbar

    // Sidebar öğeleri
    const dersOgrencileriSec = document.getElementById('dersOgrencileriSec'); // Dersi Alan Öğrenciler menüsü
    const yeniDersSec = document.getElementById('yeniDersSec'); // Yeni Ders Ekle menüsü
    const dersSilSec = document.getElementById('dersSilSec'); // Ders Sil menüsü
    const sifreDegistirSec = document.getElementById('sifreDegistirSec'); // Şifre Değiştir menüsü
    const yeniOgrenciSec = document.getElementById('yeniOgrenciSec'); // Yeni Öğrenci Ekle menüsü

    const dersOgrencileri = document.getElementById('ders-ogrencileri'); // Dersi Alan Öğrenciler 
    const yeniDers = document.getElementById('yeni-ders'); // Ders Ekleme 
    const dersSil = document.getElementById('ders-sil'); // Ders Silme
    const sifreDegistir = document.getElementById('sifre-degistir'); // Şifre Değiştirme
    const yeniOgrenci = document.getElementById('yeni-ogrenci'); // Öğrenci Ekleme

    // Tüm bölümleri gizleyen bir yardımcı fonksiyon
    function hideAllSections() {
        dersOgrencileri?.classList.add('d-none');
        yeniDers?.classList.add('d-none');
        dersSil?.classList.add('d-none');
        sifreDegistir?.classList.add('d-none');
        yeniOgrenci?.classList.add('d-none');

        dersOgrencileriSec?.classList.remove('active');
        yeniDersSec?.classList.remove('active');
        dersSilSec?.classList.remove('active');
        sifreDegistirSec?.classList.remove('active');
        yeniOgrenciSec?.classList.remove('active');
    }

    // Sidebar'daki Dersi Alan Öğrenciler butonuna tıklama olayı
    if (dersOgrencileriSec && dersOgrencileri) {
        dersOgrencileriSec.addEventListener('click', function () {
            hideAllSections();
            dersOgrencileri.classList.remove('d-none');
            dersOgrencileriSec.classList.add('active');
            loadStudentTable();
        });
    }

    // Sidebar'daki Yeni Ders Ekle butonuna tıklama olayı
    if (yeniDersSec && yeniDers) {
        yeniDersSec.addEventListener('click', function () {
            hideAllSections();
            yeniDers.classList.remove('d-none');
            yeniDersSec.classList.add('active');
        });
    }

    // Sidebar'daki Ders Sil butonuna tıklama olayı
    if (dersSilSec && dersSil) {
        dersSilSec.addEventListener('click', function () {
            hideAllSections();
            dersSil.classList.remove('d-none');
            dersSilSec.classList.add('active');
            loadDersSilTablo(); // Ders Sil tablosunu yükle
        });
    }

    // Sidebar'daki Şifre Değiştir butonuna tıklama olayı
    if (sifreDegistirSec && sifreDegistir) {
        sifreDegistirSec.addEventListener('click', function () {
            hideAllSections();
            sifreDegistir.classList.remove('d-none');
            sifreDegistirSec.classList.add('active');
        });
    }

    // Sidebar'daki Yeni Öğrenci Ekle butonuna tıklama olayı
    if (yeniOgrenciSec && yeniOgrenci) {
        yeniOgrenciSec.addEventListener('click', function () {
            hideAllSections();
            yeniOgrenci.classList.remove('d-none');
            yeniOgrenciSec.classList.add('active');
            loadDersKodlari(); // Ders kodlarını yükle
        });
    }

    // Sidebar aç/kapa işlevi
    if (toggleButton && sidebar) {
        toggleButton.addEventListener('click', function () {
            sidebar.classList.toggle('open'); // Sidebar açık/kapa
            content.classList.toggle('open'); // İçeriği sağa kaydır
            navbar.classList.toggle('open'); // Navbar'ı sağa kaydır
        });
    }

    // Ders kodlarını yükle
    function loadDersKodlari() {
        const dersKoduSelect = document.getElementById('dersKoduOgrenci'); // Güncellenmiş id
        if (!dersKoduSelect) {
            console.error('Ders kodu seçimi için <select> öğesi bulunamadı.');
            return;
        }

        dersKoduSelect.innerHTML = '<option value="" disabled selected>Bir ders seçin</option>';

        fetch('/api/akademisyen_dersler') // API çağrısı
            .then(response => response.json())
            .then(data => {
                if (data.length === 0) {
                    const option = document.createElement('option');
                    option.value = '';
                    option.textContent = 'Kayıtlı ders bulunamadı';
                    option.disabled = true;
                    dersKoduSelect.appendChild(option);
                    return;
                }

                data.forEach(ders => {
                    const option = document.createElement('option');
                    option.value = ders.ders_kodu;
                    option.textContent = `${ders.ders_kodu} - ${ders.ders_ismi}`;
                    dersKoduSelect.appendChild(option);
                });
            })
            .catch(error => {
                console.error('Ders kodları yüklenirken hata oluştu:', error);
                showErrorToast('Ders kodları yüklenirken bir hata oluştu.');
            });
    }

    // Yeni öğrenci ekleme işlevi
    const yeniOgrenciForm = document.getElementById('yeniOgrenciForm');
    if (yeniOgrenciForm) {
        yeniOgrenciForm.addEventListener('submit', function (e) {
            e.preventDefault();

            const ogrenciNum = document.getElementById('ogrenciNum').value.trim();
            const ogrenciIsim = document.getElementById('ogrenciIsim').value.trim();
            const ogrenciSoyisim = document.getElementById('ogrenciSoyisim').value.trim();
            const dersKodu = document.getElementById('dersKoduOgrenci').value; // Güncellenmiş id

            if (!ogrenciNum || !ogrenciIsim || !ogrenciSoyisim || !dersKodu) {
                showErrorToast('Lütfen tüm alanları doldurun.');
                return;
            }

            fetch('/api/ogrenci_ekle', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ogrenci_num: ogrenciNum,
                    isim: ogrenciIsim,
                    soyisim: ogrenciSoyisim,
                    ders_kodu: dersKodu
                })
            })
                .then(response => {
                    console.log('Gönderilen veriler:', {
                        ogrenci_num: ogrenciNum,
                        isim: ogrenciIsim,
                        soyisim: ogrenciSoyisim,
                        ders_kodu: dersKodu
                    });
                    return response.json();
                })
                .then(data => {
                    console.log('API yanıtı:', data);
                    if (data.success) {
                        showSuccessToast('Öğrenci başarıyla eklendi.');
                        yeniOgrenciForm.reset();
                    } else {
                        showErrorToast(data.message || 'Öğrenci eklenirken bir hata oluştu.');
                    }
                })
                .catch(error => {
                    console.error('Hata:', error);
                    showErrorToast('Bir hata oluştu. Lütfen tekrar deneyin.');
                });
            
        });
    }

    function showErrorToast(message) {
        const toastBody = document.querySelector('#errorToast .toast-body');
        if (toastBody) {
            toastBody.textContent = message || 'Bir hata oluştu.';
        }

        const errorToastElement = document.getElementById('errorToast');
        if (errorToastElement) {
            const errorToast = new bootstrap.Toast(errorToastElement);
            errorToast.show();
        } else {
            console.error('Error toast öğesi bulunamadı.');
        }
    }

    function showSuccessToast(message) {
        const toastBody = document.querySelector('#successToast .toast-body');
        if (toastBody) {
            toastBody.textContent = message || 'İşlem başarılı.';
        }

        const successToastElement = document.getElementById('successToast');
        if (successToastElement) {
            const successToast = new bootstrap.Toast(successToastElement);
            successToast.show();

            setTimeout(() => {
                successToast.hide();
            }, 3000);
        } else {
            console.error('Toast öğesi bulunamadı.');
        }
    }



    function loadStudentTable() {
        const tbody = document.querySelector('#ders-ogrencileri tbody');
        if (!tbody) {
            console.error('#ders-ogrencileri içinde tbody bulunamadı.');
            return;
        }
    
        fetch('/api/ders_ogrencileri')
            .then(response => response.json())
            .then(data => {
                tbody.innerHTML = '';
    
                if (data.length === 0) {
                    tbody.innerHTML = '<tr><td colspan="5" class="text-center text-muted">Kayıtlı öğrenci bulunamadı.</td></tr>';
                    return;
                }
    
                data.forEach(ogrenci => {
                    const row = document.createElement('tr');
                    row.innerHTML = `
                        <td>${ogrenci.ogrenci_num}</td>
                        <td>${ogrenci.isim}</td>
                        <td>${ogrenci.soyisim}</td>
                        <td>${ogrenci.ders_kodu}</td>
                        <td>
                            <button class="btn btn-danger btn-sm delete-ogrenci" 
                                    data-bs-toggle="modal" 
                                    data-bs-target="#ogrenciSilModal"
                                    data-num="${ogrenci.ogrenci_num}" 
                                    data-ders="${ogrenci.ders_kodu}">
                                <i class="fas fa-trash-alt"></i> Sil
                            </button>
                        </td>
                    `;
                    tbody.appendChild(row);
                });
    
                // Silme butonlarına olay dinleyici ekle
                addDeleteStudentListeners();
            })
            .catch(error => {
                console.error('Öğrenci tablosu yüklenirken hata oluştu:', error);
                showErrorToast('Öğrenci tablosu yüklenirken bir hata oluştu.');
            });
    }
    
    function loadDersSilTablo() {
        const tbody = document.getElementById('dersSilTablo');
        if (!tbody) {
            console.error('Tablo öğesi bulunamadı.');
            return;
        }

        fetch('/api/akademisyen_dersler') // Akademisyene ait dersleri getir
            .then(response => response.json())
            .then(data => {
                tbody.innerHTML = ''; // Tabloyu temizle
                data.forEach(ders => {
                    const tr = document.createElement('tr');
                    tr.innerHTML = `
                        <td>${ders.ders_kodu}</td>
                        <td>${ders.ders_ismi}</td>
                        <td>${ders.gun_saat}</td>
                        <td>${ders.grup_ismi}</td>
                        <td>
                            <button class="btn btn-danger btn-sm" data-id="${ders.id}">Sil</button>
                        </td>
                    `;
                    tbody.appendChild(tr);
                });
                addDeleteEventListeners(); // Silme butonları için olay dinleyicisi ekle
            })
            .catch(err => console.error('Dersler yüklenirken hata:', err));
    }

    function addDeleteEventListeners() {
        document.querySelectorAll('.btn-danger').forEach(button => {
            button.addEventListener('click', function () {
                const dersId = this.getAttribute('data-id');
                const silModal = new bootstrap.Modal(document.getElementById('silModal'));
                const silOnaylaButton = document.getElementById('silOnayla');

                silOnaylaButton.replaceWith(silOnaylaButton.cloneNode(true));
                const newSilOnaylaButton = document.getElementById('silOnayla');

                newSilOnaylaButton.addEventListener('click', function () {
                    fetch(`/api/akademisyen_ders_sil/${dersId}`, { method: 'DELETE' }) // Backend'e DELETE isteği gönder
                        .then(response => response.json())
                        .then(data => {
                            if (data.success) {
                                showSuccessToast('Ders başarıyla silindi.');
                                loadDersSilTablo(); // Tabloyu yeniden yükle
                                silModal.hide(); // Modal'ı kapat
                            } else {
                                showErrorToast(data.message || 'Ders silinirken bir hata oluştu.');
                            }
                        })
                        .catch(err => {
                            console.error('Ders silinirken hata oluştu:', err);
                            showErrorToast('Bir hata oluştu. Lütfen tekrar deneyin.');
                        });
                });

                silModal.show(); // Modalı göster
            });
        });
    }

    function addDeleteStudentListeners() {
        const deleteButtons = document.querySelectorAll('.delete-ogrenci');
        deleteButtons.forEach(button => {
            button.addEventListener('click', function () {
                const ogrenciNum = this.getAttribute('data-num');
                const dersKodu = this.getAttribute('data-ders');
                const silModal = new bootstrap.Modal(document.getElementById('ogrenciSilModal'));
                silModal.show();
    
                const silOnaylaButton = document.getElementById('ogrenciSilOnayla');
                silOnaylaButton.onclick = function () {
                    fetch(`/api/ders_ogrencisi_sil/${ogrenciNum}/${dersKodu}`, {
                        method: 'DELETE',
                    })
                        .then(response => response.json())
                        .then(data => {
                            if (data.success) {
                                const silModalInstance = bootstrap.Modal.getInstance(document.getElementById('ogrenciSilModal'));
                                silModalInstance.hide(); // Modal'ı kapat
                                document.body.classList.remove('modal-open'); // Arka planı temizle
                                document.querySelector('.modal-backdrop')?.remove(); // Modal arka planını kaldır
                                showSuccessToast('Öğrenci başarıyla silindi.');
                                loadStudentTable(); // Tabloyu güncelle
                            } else {
                                showErrorToast(data.message || 'Öğrenci silinirken bir hata oluştu.');
                            }
                        })
                        .catch(error => {
                            console.error('Öğrenci silinirken hata oluştu:', error);
                            showErrorToast('Bir hata oluştu. Lütfen tekrar deneyin.');
                        });
                };
            });
        });
    }
    

    



    // Sayfa yüklendiğinde öğrenci tablosunu yükle
    loadStudentTable();

    // Yeni Ders Ekleme Formu
    const yeniDersForm = document.getElementById('yeniDersForm');
    const dersAdiInput = document.getElementById('dersAdi');
    const dersKoduInput = document.getElementById('dersKodu');
    const gunSaatInput = document.getElementById('gunSaat');
    const grupAdiSelect = document.getElementById('grupAdi');

    if (yeniDersForm) {
        yeniDersForm.addEventListener('submit', function (e) {
            e.preventDefault(); // Sayfanın yenilenmesini engelle

            const dersAdi = dersAdiInput.value.trim();
            const dersKodu = dersKoduInput.value.trim();
            const gunSaat = gunSaatInput.value.trim();
            const grupAdi = grupAdiSelect.value;

            if (!dersAdi || !dersKodu || !gunSaat || !grupAdi) {
                alert('Lütfen tüm alanları doldurun.');
                return;
            }

            fetch('/api/akademisyen_yeni_ders', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ders_kodu: dersKodu,
                    ders_ismi: dersAdi,
                    gun_saat: gunSaat,
                    grup_ismi: grupAdi,
                }),
            })
                .then(response => response.json())
                .then(data => {
                    if (data.success) {
                        showSuccessToast('Ders başarıyla eklendi.');
                        yeniDersForm.reset(); // Formu temizle
                    } else {
                        alert(data.message || 'Ders eklenirken bir hata oluştu.');
                    }
                })
                .catch(error => console.error('Hata:', error));
        });
    }

    // Akademisyen Şifre Değiştirme 
    const sifreDegistirForm = document.getElementById('sifreDegistirForm');

    if (sifreDegistirForm) {
        sifreDegistirForm.addEventListener('submit', function (e) {
            e.preventDefault(); // Sayfanın yenilenmesini engelle

            const eskiSifre = document.getElementById('eskiSifre').value.trim();
            const yeniSifre = document.getElementById('yeniSifre').value.trim();
            const yeniSifreTekrar = document.getElementById('yeniSifreTekrar').value.trim();

            // Alanların dolu mu ?
            if (!eskiSifre || !yeniSifre || !yeniSifreTekrar) {
                showErrorToast('Lütfen tüm alanları doldurun.');
                return;
            }

            // Şifreler Eşleşti mi ?
            if (yeniSifre !== yeniSifreTekrar) {
                showErrorToast('Yeni şifreler eşleşmiyor.');
                return;
            }

            // Şifre değiştirme isteği
            fetch('/api/sifre_degistir', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    eskiSifre: eskiSifre,
                    yeniSifre: yeniSifre,
                }),
            })
                .then(response => response.json())
                .then(data => {
                    if (data.success) {
                        showSuccessToast('Şifreniz başarıyla değiştirildi.');
                        sifreDegistirForm.reset(); // Formu temizle
                    } else {
                        showErrorToast(data.message || 'Şifre değiştirme sırasında bir hata oluştu.');
                    }
                })
                .catch(error => {
                    console.error('Hata:', error);
                    showErrorToast('Bir hata oluştu. Lütfen tekrar deneyin.');
                });
        });
    }
});




