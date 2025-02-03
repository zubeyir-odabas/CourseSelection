document.addEventListener('DOMContentLoaded', function () {
    const sidebar = document.getElementById('sidebar-wrapper');
    const content = document.querySelector('.container-fluid');
    const navbar = document.querySelector('.navbar');

    const dersSecmeSec = document.getElementById('dersSecmeSec');
    const ogrenciSifreDegistirSec = document.getElementById('ogrenciSifreDegistirSec');

    const dersSecme = document.getElementById('ders-secme');
    const ogrenciSifreDegistir = document.getElementById('ogrenci-sifre-degistir');

    // Tüm sekmeleri gizlemek için
    function hideAllSections() {
        dersSecme?.classList.add('d-none');
        ogrenciSifreDegistir?.classList.add('d-none');

        dersSecmeSec?.classList.remove('active');
        ogrenciSifreDegistirSec?.classList.remove('active');
    }

    // Ders Seçme sekmesi
    if (dersSecmeSec && dersSecme) {
        dersSecmeSec.addEventListener('click', function () {
            hideAllSections();
            dersSecme.classList.remove('d-none');
            dersSecmeSec.classList.add('active');
        });
    }

    // Şifre Değiştirme sekmesi
    if (ogrenciSifreDegistirSec && ogrenciSifreDegistir) {
        ogrenciSifreDegistirSec.addEventListener('click', function () {
            hideAllSections();
            ogrenciSifreDegistir.classList.remove('d-none');
            ogrenciSifreDegistirSec.classList.add('active');
        });
    }

    // Sidebar aç/kapa
    const toggleButton = document.getElementById('sidebarToggle');
    if (toggleButton && sidebar) {
        toggleButton.addEventListener('click', function () {
            sidebar.classList.toggle('open');
            content.classList.toggle('open');
            navbar.classList.toggle('open');
        });
    }

    function loadDersler() {
        const tbody = document.querySelector('#derslerTablosu tbody');
        if (!tbody) {
            console.error('Ders tablosu bulunamadı.');
            return;
        }
        fetch('/api/dersler', { method: 'GET' })
            .then(response => response.json())
            .then(data => {
                tbody.innerHTML = '';
                if (!data || data.length === 0) {
                    const row = document.createElement('tr');
                    row.innerHTML = '<td colspan="6">Hiç ders bulunamadı.</td>';
                    tbody.appendChild(row);
                    return;
                }
                data.forEach(ders => {
                    const tr = document.createElement('tr');
                    tr.innerHTML = `
                        <td>${ders.ders_kodu}</td>
                        <td>${ders.ders_ismi}</td>
                        <td>${ders.akademisyen}</td>
                        <td>${ders.gun_saat}</td>
                        <td>${ders.grup_ismi}</td>
                        <td>
                            <button class="btn btn-danger btn-sm delete-ders" data-id="${ders.id}">Sil</button>
                        </td>
                    `;
                    tbody.appendChild(tr);
                });
                addDeleteEventListeners();
            })
            .catch(error => {
                console.error('Dersler yüklenirken bir hata oluştu:', error);
            });
    }

    function addDeleteEventListeners() {
        const deleteButtons = document.querySelectorAll('.delete-ders');
        deleteButtons.forEach(button => {
            button.addEventListener('click', function () {
                const dersId = this.getAttribute('data-id');
                const silModal = new bootstrap.Modal(document.getElementById('silModal'));
                silModal.show();

                const silOnaylaButton = document.getElementById('silOnayla');
                silOnaylaButton.onclick = function () {
                    fetch(`/api/dersler/${dersId}`, { method: 'DELETE' })
                        .then(response => response.json())
                        .then(data => {
                            if (data.success) {
                                loadDersler(); // Tabloyu güncelle
                                silModal.hide(); // Modal'ı kapat
                                showSuccessToast('Ders başarıyla silindi.');
                            } else {
                                showErrorToast('Ders silinirken bir hata oluştu.');
                            }
                        })
                        .catch(error => {
                            console.error('Ders silinirken bir hata oluştu:', error);
                        });
                };
            });
        });
    }

    function loadAlinabilenDersler() {
        fetch('/api/alinabilen_dersler')
            .then(response => response.json())
            .then(data => {
                const select = document.getElementById('alinabilenDersler');
                if (!select) {
                    console.error('Ders seçme alanı bulunamadı.');
                    return;
                }
                select.innerHTML = '';
                if (!data || data.length === 0) {
                    const option = document.createElement('option');
                    option.value = '';
                    option.textContent = 'Hiç ders bulunamadı.';
                    select.appendChild(option);
                    return;
                }

                data.forEach(ders => {
                    const option = document.createElement('option');
                    option.value = ders.id;
                    option.textContent = `${ders.ders_kodu} - ${ders.ders_ismi} (${ders.akademisyen})`;
                    select.appendChild(option);
                });
            })
            .catch(error => {
                console.error('Alınabilir dersler yüklenirken bir hata oluştu:', error);
            });
    }

    const dersForm = document.getElementById('dersForm');
    if (dersForm) {
        dersForm.addEventListener('submit', function (e) {
            e.preventDefault();
            const selectedDers = document.getElementById('alinabilenDersler').value;

            if (!selectedDers) {
                showErrorToast('Lütfen bir ders seçin.');
                return;
            }

            fetch('/api/dersler', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ders_id: selectedDers }),
            })
                .then(response => response.json())
                .then(data => {
                    if (data.success) {
                        const modal = bootstrap.Modal.getInstance(document.getElementById('dersModal'));
                        modal.hide(); // Modal'ı kapat
                        loadDersler(); // Tabloyu güncelle
                        showSuccessToast('Ders başarıyla eklendi.');
                    } else {
                        showErrorToast('Ders eklenirken bir hata oluştu.');
                    }
                })
                .catch(error => {
                    console.error('Ders ekleme sırasında bir hata oluştu:', error);
                });
        });
    }

    const addDersBtn = document.getElementById('addDersBtn');
    if (addDersBtn) {
        addDersBtn.addEventListener('click', function () {
            const modal = new bootstrap.Modal(document.getElementById('dersModal'));
            modal.show();
            loadAlinabilenDersler();
        });
    }

    loadDersler();

    // Öğrenci Şifre Değiştirme 
    const sifreDegistirForm = document.getElementById('sifreDegistirForm');

    if (sifreDegistirForm) {
        sifreDegistirForm.addEventListener('submit', function (e) {
            e.preventDefault();

            const eskiSifre = document.getElementById('eskiSifre').value.trim();
            const yeniSifre = document.getElementById('yeniSifre').value.trim();
            const yeniSifreTekrar = document.getElementById('yeniSifreTekrar').value.trim();

            if (!eskiSifre || !yeniSifre || !yeniSifreTekrar) {
                showErrorToast('Lütfen tüm alanları doldurun.');
                return;
            }

            if (yeniSifre !== yeniSifreTekrar) {
                showErrorToast('Yeni şifreler eşleşmiyor.');
                return;
            }

            fetch('/api/ogrenci_sifre_degistir', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ eskiSifre, yeniSifre }),
            })
                .then(response => response.json())
                .then(data => {
                    if (data.success) {
                        showSuccessToast('Şifreniz başarıyla değiştirildi.');
                        sifreDegistirForm.reset();
                    } else {
                        showErrorToast(data.message || 'Bir hata oluştu.');
                    }
                })
                .catch(error => {
                    console.error('Hata:', error);
                    showErrorToast('Bir hata oluştu. Lütfen tekrar deneyin.');
                });
        });
    }

    // Toast Gösterim Fonksiyonları
    function showSuccessToast(message) {
        const toastBody = document.querySelector('#successToast .toast-body');
        if (toastBody) {
            toastBody.textContent = message || 'İşlem başarılı.';
        }

        const successToast = new bootstrap.Toast(document.getElementById('successToast'));
        successToast.show();
    }

    function showErrorToast(message) {
        const toastBody = document.querySelector('#errorToast .toast-body');
        if (toastBody) {
            toastBody.textContent = message || 'Bir hata oluştu.';
        }

        const errorToast = new bootstrap.Toast(document.getElementById('errorToast'));
        errorToast.show();
    }
});
