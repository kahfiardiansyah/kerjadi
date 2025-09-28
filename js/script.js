document.addEventListener('DOMContentLoaded', function() {
    
    const auth = firebase.auth();
    const db = firebase.firestore();

    // FUNGSI BANTU UNTUK NOTIFIKASI TOAST
    const Toast = Swal.mixin({
        toast: true,
        position: 'top-end',
        showConfirmButton: false,
        timer: 3000,
        timerProgressBar: true,
        didOpen: (toast) => {
            toast.addEventListener('mouseenter', Swal.stopTimer)
            toast.addEventListener('mouseleave', Swal.resumeTimer)
        }
    });

    // =========================================================================
    // LOGIKA UNTUK HALAMAN REGISTER & LOGIN
    // =========================================================================
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        const loginBox = document.getElementById('loginBox');
        const registerBox = document.getElementById('registerBox');
        const showRegister = document.getElementById('showRegister');
        const showLogin = document.getElementById('showLogin');
        const registrationForm = document.getElementById('registrationForm');

        showRegister.addEventListener('click', (e) => { e.preventDefault(); loginBox.style.display = 'none'; registerBox.style.display = 'block'; });
        showLogin.addEventListener('click', (e) => { e.preventDefault(); registerBox.style.display = 'none'; loginBox.style.display = 'block'; });

        registrationForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const name = document.getElementById('name').value;
            const email = document.getElementById('registerEmail').value;
            const password = document.getElementById('registerPassword').value;

            auth.createUserWithEmailAndPassword(email, password)
                .then((userCredential) => {
                    const user = userCredential.user;
                    db.collection('users').doc(user.uid).set({
                        name: name,
                        email: email,
                        role: 'user',
                        saved: []
                    }).then(() => {
                        Toast.fire({ icon: 'success', title: 'Registrasi berhasil! Silakan masuk.' });
                        registrationForm.reset();
                        registerBox.style.display = 'none';
                        loginBox.style.display = 'block';
                    });
                })
                .catch((error) => { Swal.fire({ icon: 'error', title: 'Oops...', text: error.message }); });
        });

        loginForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const email = document.getElementById('loginEmail').value;
            const password = document.getElementById('loginPassword').value;
            auth.signInWithEmailAndPassword(email, password)
                .then((userCredential) => {
                    const user = userCredential.user;
                    db.collection('users').doc(user.uid).get().then(doc => {
                        if (doc.exists && doc.data().role === 'admin') {
                            window.location.href = 'admin.html';
                        } else {
                            window.location.href = 'main.html';
                        }
                    });
                })
                .catch((error) => {
                    Swal.fire({ icon: 'error', title: 'Login Gagal', text: error.message });
                });
        });
    }

    // =========================================================================
    // LOGIKA UNTUK MENU PROFIL
    // =========================================================================
    const userMenuItems = document.getElementById('user-menu-items');
    if (userMenuItems) {
        auth.onAuthStateChanged(user => {
            if (user) {
                const userRef = db.collection('users').doc(user.uid);
                userRef.get().then(doc => {
                    let menuHTML = '';
                    if (doc.exists) {
                        const userRole = doc.data().role;
                        if (userRole === 'admin') {
                            menuHTML = `<a class="dropdown-item fw-bold" href="admin.html">Dasbor Admin</a><a class="dropdown-item" href="main.html">Lihat Website</a><li><hr class="dropdown-divider"></li><a class="dropdown-item" href="#" id="logoutButton">Log Out</a>`;
                        } else if (userRole === 'owner') {
                            menuHTML = `<a class="dropdown-item" href="profile.html#profile-details">My Profile</a><a class="dropdown-item fw-bold" href="owner.html">Dasbor Pemilik</a><a class="dropdown-item" href="profile.html#saved">Saved</a><a class="dropdown-item" href="profile.html#history">History</a><li><hr class="dropdown-divider"></li><a class="dropdown-item" href="#" id="logoutButton">Log Out</a>`;
                        } else {
                            menuHTML = `<a class="dropdown-item" href="profile.html#profile-details">My Profile</a><a class="dropdown-item" href="#" id="become-owner-btn">Sewakan Kantor Anda</a><a class="dropdown-item" href="profile.html#saved">Saved</a><a class="dropdown-item" href="profile.html#history">History</a><li><hr class="dropdown-divider"></li><a class="dropdown-item" href="#" id="logoutButton">Log Out</a>`;
                        }
                    }
                    userMenuItems.innerHTML = menuHTML;
                    
                    const logoutButton = document.getElementById('logoutButton');
                    if(logoutButton) {
                        logoutButton.addEventListener('click', (e) => {
                            e.preventDefault();
                            auth.signOut().then(() => { window.location.href = 'index.html'; });
                        });
                    }

                    const becomeOwnerBtn = document.getElementById('become-owner-btn');
                    if (becomeOwnerBtn) {
                        becomeOwnerBtn.addEventListener('click', (e) => {
                            e.preventDefault();
                            Swal.fire({
                                title: 'Apakah Anda yakin?',
                                text: "Anda akan menjadi pemilik dan bisa menyewakan properti.",
                                icon: 'question',
                                showCancelButton: true,
                                confirmButtonColor: '#3085d6',
                                cancelButtonColor: '#d33',
                                confirmButtonText: 'Ya, saya yakin!'
                            }).then((result) => {
                                if (result.isConfirmed) {
                                    userRef.update({ role: 'owner' }).then(() => {
                                        Swal.fire('Selamat!', 'Anda sekarang adalah pemilik.', 'success')
                                        .then(() => window.location.reload());
                                    });
                                }
                            });
                        });
                    }
                });
            } else {
                userMenuItems.innerHTML = `<a class="dropdown-item fw-bold" href="register.html">Log in</a> <a class="dropdown-item" href="register.html">Sign up</a>`;
            }
        });
    }

    // =========================================================================
    // LOGIKA UNTUK HALAMAN UTAMA (main.html)
    // =========================================================================
    const experienceListContainer = document.getElementById('experience-list');
    if (experienceListContainer) {
        const searchForm = document.getElementById('search-form');
        const searchInput = document.getElementById('search-input');

        const loadOffices = (role, searchTerm = '') => {
            db.collection('offices').get().then((querySnapshot) => {
                experienceListContainer.innerHTML = ''; 
                let officesFound = false;
                if (querySnapshot.empty) {
                    experienceListContainer.innerHTML = "<p>Belum ada kantor yang tersedia.</p>";
                    return;
                }
                querySnapshot.forEach((doc) => {
                    const item = doc.data();
                    const title = (item.title || '').toLowerCase();
                    const city = (item.city || '').toLowerCase();
                    const location = (item.location || '').toLowerCase();
                    const term = searchTerm.toLowerCase();
                    if (title.includes(term) || city.includes(term) || location.includes(term)) {
                        officesFound = true;
                        
                        let ratingHTML = '<span class="text-muted">Baru</span>';
                        if (item.reviewCount > 0) {
                            const avgRating = (item.ratingSum / item.reviewCount).toFixed(1);
                            ratingHTML = `<i class="bi bi-star-fill text-danger"></i> ${avgRating} (${item.reviewCount} ulasan)`;
                        }

                        const saveButtonHTML = role !== 'admin' ? `<button class="btn btn-light btn-sm save-btn position-absolute top-0 end-0 m-2 rounded-circle"><i class="bi bi-heart"></i></button>` : '';
                        const cardHTML = `<div class="col-12 col-md-6 col-lg-3"><a href="details.html?id=${doc.id}" class="text-decoration-none text-dark"><div class="card border-0 experience-card" data-id="${doc.id}"><div class="position-relative"><img src="${item.image}" class="card-img-top rounded-3" alt="${item.title}">${saveButtonHTML}</div><div class="card-body px-0"><p class="card-text mb-1">${ratingHTML} · ${item.city || item.location}</p><h6 class="card-title">${item.title || 'Tanpa Judul'}</h6><p class="card-text">Mulai ${item.price || 'N/A'}</p></div></div></a></div>`;
                        experienceListContainer.innerHTML += cardHTML;
                    }
                });
                if (!officesFound) {
                    experienceListContainer.innerHTML = "<p class='mt-4 text-center'>Kantor yang Anda cari tidak ditemukan.</p>";
                }
                document.querySelectorAll('.save-btn').forEach(button => {
                    button.addEventListener('click', function(e) {
                        e.preventDefault();
                        e.stopPropagation();
                        const user = auth.currentUser;
                        if (!user) {
                            Toast.fire({ icon: 'warning', title: 'Anda harus login untuk menyimpan!' });
                            return;
                        }
                        const card = this.closest('.experience-card');
                        const officeId = card.dataset.id;
                        const userRef = db.collection('users').doc(user.uid);
                        userRef.update({
                            saved: firebase.firestore.FieldValue.arrayUnion(officeId)
                        }).then(() => {
                            Toast.fire({ icon: 'success', title: 'Kantor berhasil disimpan!' });
                            this.innerHTML = '<i class="bi bi-heart-fill text-danger"></i>';
                        }).catch((error) => {
                            console.error("Error saving item: ", error);
                        });
                    });
                });
            });
        };

        const initializePage = (searchTerm = '') => {
            auth.onAuthStateChanged(user => {
                let userRole = 'guest';
                if (user) {
                    db.collection('users').doc(user.uid).get().then(doc => {
                        if (doc.exists) userRole = doc.data().role;
                        loadOffices(userRole, searchTerm);
                    });
                } else {
                    loadOffices(userRole, searchTerm);
                }
            });
        };
        
        if (searchForm) {
            searchForm.addEventListener('submit', (e) => {
                e.preventDefault();
                const term = searchInput.value;
                initializePage(term);
            });
        }

        if (searchInput) {
            searchInput.addEventListener('input', () => {
                if (searchInput.value === '') {
                    initializePage(); 
                }
            });
        }
        initializePage();
    }

    // =========================================================================
    // LOGIKA UNTUK HALAMAN DETAIL (details.html)
    // =========================================================================
    const detailsContent = document.getElementById('details-content');
    if (detailsContent) {
        const params = new URLSearchParams(window.location.search);
        const officeId = params.get('id');
        if (!officeId) {
            detailsContent.innerHTML = '<p>Kantor tidak ditemukan (ID tidak ada di URL).</p>';
        } else {
            const loadReviews = () => {
                const reviewsList = document.getElementById('reviews-list');
                reviewsList.innerHTML = `<div class="text-center"><div class="spinner-border text-secondary" role="status"><span class="visually-hidden">Loading...</span></div><p class="mt-2">Memuat ulasan...</p></div>`;
                db.collection('offices').doc(officeId).collection('reviews').orderBy('timestamp', 'desc').get().then(snapshot => {
                    if (snapshot.empty) {
                        reviewsList.innerHTML = '<p>Belum ada ulasan untuk kantor ini. Jadilah yang pertama!</p>';
                        return;
                    }
                    reviewsList.innerHTML = '';
                    snapshot.forEach(doc => {
                        const review = doc.data();
                        let starsHTML = '';
                        for (let i = 1; i <= 5; i++) {
                            starsHTML += `<i class="bi bi-star${i <= review.rating ? '-fill' : ''} text-warning"></i>`;
                        }
                        reviewsList.innerHTML += `<div class="card mb-3"><div class="card-body"><div class="d-flex w-100 justify-content-between"><h6 class="mb-1">${review.userName || 'Anonim'}</h6><div>${starsHTML}</div></div><p class="mb-1">${review.comment}</p><small class="text-muted">${new Date(review.timestamp?.toDate()).toLocaleDateString('id-ID')}</small></div></div>`;
                    });
                });
            };

            const handleStarRating = () => {
                const stars = document.querySelectorAll('#rating-input i');
                const ratingValueInput = document.getElementById('rating-value');
                let currentRating = 0;
                const setStars = (rating) => {
                    stars.forEach(star => {
                        if (parseInt(star.dataset.value) <= rating) {
                            star.classList.replace('bi-star', 'bi-star-fill');
                            star.classList.replace('text-secondary', 'text-warning');
                        } else {
                            star.classList.replace('bi-star-fill', 'bi-star');
                            star.classList.replace('text-warning', 'text-secondary');
                        }
                    });
                };
                stars.forEach(star => {
                    star.addEventListener('mouseover', () => setStars(parseInt(star.dataset.value)));
                    star.addEventListener('mouseleave', () => setStars(currentRating));
                    star.addEventListener('click', () => {
                        currentRating = parseInt(star.dataset.value);
                        ratingValueInput.value = currentRating;
                    });
                });
            };

            const loadDetails = (user) => {
                db.collection('offices').doc(officeId).get().then(doc => {
                    if (doc.exists) {
                        const item = doc.data();
                        const bookButtonHTML = user && user.uid !== item.ownerId ? `<button class="btn btn-danger btn-lg w-100 mt-3" id="book-now-btn">Sewa Sekarang</button>` : '';
                        detailsContent.innerHTML = `<div class="col-md-7"><img src="${item.image}" class="img-fluid rounded-3" alt="${item.title}"></div><div class="col-md-5"><h2>${item.title || 'Tanpa Judul'}</h2><p class="text-muted"><i class="bi bi-geo-alt-fill"></i> ${item.city || item.location}</p><p>${item.description}</p><hr><h4>Mulai ${item.price}</h4>${bookButtonHTML}</div>`;
                        
                        // --- PERUBAHAN DI SINI: Mengaktifkan Peta dan Tombol Google Maps ---
                        if (typeof L !== 'undefined' && item.lat && item.lng) {
                            const map = L.map('map').setView([item.lat, item.lng], 16);
                            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);
                            L.marker([item.lat, item.lng]).addTo(map).bindPopup(`<b>${item.title}</b>`).openPopup();
                            
                            const gmapsBtn = document.getElementById('gmaps-direction-btn');
                            if (gmapsBtn) {
                                gmapsBtn.href = `https://www.google.com/maps/dir/?api=1&destination=${item.lat},${item.lng}`;
                            }
                        }

                        const reviewFormContainer = document.getElementById('review-form-container');
                        if (reviewFormContainer){
                            if (!user || user.uid === item.ownerId) {
                                reviewFormContainer.style.display = 'none';
                            }
                        }
                        
                        const bookNowBtn = document.getElementById('book-now-btn');
                        if (bookNowBtn) {
                            bookNowBtn.addEventListener('click', function() {
                                if (!user) {
                                    Toast.fire({ icon: 'warning', title: 'Anda harus login untuk memesan!' });
                                    setTimeout(() => { window.location.href = 'register.html' }, 2000);
                                    return;
                                }
                                localStorage.setItem('itemToBook', JSON.stringify({id: doc.id, ...item}));
                                window.location.href = 'payment.html';
                            });
                        }
                        loadReviews();
                        handleStarRating();
                    } else {
                        detailsContent.innerHTML = '<p>Kantor tidak ditemukan.</p>';
                    }
                }).catch(error => {
                    console.error("Error loading details:", error);
                    detailsContent.innerHTML = '<p>Terjadi error saat memuat data.</p>';
                });
            };

            const addReviewForm = document.getElementById('add-review-form');
            if(addReviewForm){
                addReviewForm.addEventListener('submit', (e) => {
                    e.preventDefault();
                    const user = auth.currentUser;
                    if (!user) {
                        Toast.fire({ icon: 'warning', title: 'Anda harus login untuk memberi ulasan!' });
                        return;
                    }
                    const rating = parseInt(document.getElementById('rating-value').value);
                    const comment = document.getElementById('review-text').value;
                    if (!rating || rating === 0) {
                        Toast.fire({ icon: 'error', title: 'Harap berikan rating bintang.' });
                        return;
                    }
                    db.collection('users').doc(user.uid).get().then(userDoc => {
                        const userName = userDoc.data().name;
                        const officeRef = db.collection('offices').doc(officeId);
                        const reviewRef = officeRef.collection('reviews').doc();
                        db.runTransaction((transaction) => {
                            return transaction.get(officeRef).then((officeDoc) => {
                                if (!officeDoc.exists) {
                                    throw "Dokumen kantor tidak ditemukan!";
                                }
                                const newReviewCount = (officeDoc.data().reviewCount || 0) + 1;
                                const newRatingSum = (officeDoc.data().ratingSum || 0) + rating;
                                transaction.update(officeRef, {
                                    reviewCount: newReviewCount,
                                    ratingSum: newRatingSum
                                });
                                transaction.set(reviewRef, {
                                    userId: user.uid,
                                    userName: userName,
                                    rating: rating,
                                    comment: comment,
                                    timestamp: firebase.firestore.FieldValue.serverTimestamp()
                                });
                            });
                        }).then(() => {
                            Toast.fire({ icon: 'success', title: 'Ulasan Anda berhasil dikirim!' });
                            addReviewForm.reset();
                            document.getElementById('rating-value').value = '0';
                            document.querySelectorAll('#rating-input i').forEach(star => {
                                 star.classList.replace('bi-star-fill', 'bi-star');
                                 star.classList.replace('text-warning', 'text-secondary');
                            });
                            loadReviews();
                        }).catch((error) => {
                            console.error("Gagal mengirim ulasan: ", error);
                            Swal.fire('Error', 'Gagal mengirim ulasan.', 'error');
                        });
                    });
                });
            }

            auth.onAuthStateChanged(user => {
                loadDetails(user);
            });
        }
    }

    // =========================================================================
    // LOGIKA UNTUK HALAMAN PROFIL (profile.html)
    // =========================================================================
    const profileTabContent = document.getElementById('profileTabContent');
    if (profileTabContent) {
        auth.onAuthStateChanged(user => {
            if (user) {
                const userRef = db.collection('users').doc(user.uid);
                
                const profileDetailsContainer = document.getElementById('profile-details');
                userRef.get().then(doc => {
                    if (doc.exists) {
                        const userData = doc.data();
                        profileDetailsContainer.innerHTML = `<h3>${userData.name}</h3><p class="text-muted">${userData.email}</p><p>Selamat datang di halaman profil Anda.</p>`;
                    }
                });

                const savedItemsContainer = document.getElementById('saved-items-container');
                userRef.get().then(doc => {
                    if (doc.exists && doc.data().saved && doc.data().saved.length > 0) {
                        savedItemsContainer.innerHTML = '';
                        const savedIds = doc.data().saved;
                        savedIds.forEach(officeId => {
                            db.collection('offices').doc(officeId).get().then(officeDoc => {
                                if (officeDoc.exists) {
                                    const item = officeDoc.data();
                                    savedItemsContainer.innerHTML += `<div class="col-12 col-md-6 col-lg-3"><div class="card border-0"><img src="${item.image}" class="card-img-top rounded-3" alt="${item.title}"><div class="card-body px-0"><p class="card-text mb-1"><i class="bi bi-geo-alt-fill"></i> ${item.location}</p><h6 class="card-title">${item.title}</h6><p class="card-text">${item.price}</p></div></div></div>`;
                                }
                            });
                        });
                    } else {
                        savedItemsContainer.innerHTML = '<p>Anda belum menyimpan kantor apa pun.</p>';
                    }
                });
                
                const historyContainer = document.getElementById('history');
                db.collection('bookings').where('userId', '==', user.uid).orderBy('bookingTimestamp', 'desc').get().then(querySnapshot => {
                    if (querySnapshot.empty) {
                        historyContainer.innerHTML = '<p>Tidak ada riwayat penyewaan.</p>';
                        return;
                    }
                    historyContainer.innerHTML = '<div class="list-group"></div>';
                    const historyListGroup = historyContainer.querySelector('.list-group');
                    querySnapshot.forEach(doc => {
                        const item = doc.data();
                        historyListGroup.innerHTML += `<a href="receipt.html?bookingId=${doc.id}" class="list-group-item list-group-item-action"><div class="d-flex w-100 justify-content-between"><h5 class="mb-1">${item.title}</h5><small>Disewa pada: ${item.bookingDate}</small></div><p class="mb-1">${item.location} - ${item.price}</p></a>`;
                    });
                });
            } else {
                window.location.href = 'register.html';
            }
        });

        const hash = window.location.hash;
        if (hash) {
            const tabToActivate = document.querySelector(`.nav-tabs button[data-bs-target="${hash}"]`);
            if (tabToActivate) { new bootstrap.Tab(tabToActivate).show(); }
        }
    }
    
    // =========================================================================
    // LOGIKA UNTUK HALAMAN PEMBAYARAN (payment.html)
    // =========================================================================
    const paymentPageContainer = document.getElementById('payment-page-container');
    if (paymentPageContainer) {
        auth.onAuthStateChanged(user => {
            if (user) {
                db.collection('users').doc(user.uid).get().then(doc => {
                    if(doc.exists){
                        const userData = doc.data();
                        document.getElementById('renter-name').value = userData.name;
                        document.getElementById('renter-email').value = userData.email;
                    }
                });
                const itemToBook = JSON.parse(localStorage.getItem('itemToBook'));
                if (!itemToBook) { window.location.href = 'main.html'; return; }
                document.getElementById('rental-price').textContent = itemToBook.price;
                document.getElementById('total-price').textContent = itemToBook.price;

                document.getElementById('pay-now-btn').addEventListener('click', function() {
                    const phoneNumber = document.getElementById('renter-phone').value;
                    if (!phoneNumber) { 
                        Toast.fire({ icon: 'warning', title: 'Harap masukkan nomor telepon Anda.' });
                        return;
                    }
                    
                    const bookingData = { 
                        ...itemToBook, 
                        userId: user.uid,
                        bookingDate: new Date().toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' }),
                        bookingTimestamp: firebase.firestore.FieldValue.serverTimestamp(),
                        renterPhone: phoneNumber
                    };
                    
                    db.collection('bookings').add(bookingData).then((docRef) => {
                        Swal.fire('Berhasil!', 'Pembayaran Anda telah dikonfirmasi.', 'success')
                        .then(() => {
                            localStorage.removeItem('itemToBook');
                            window.location.href = `receipt.html?bookingId=${docRef.id}`;
                        });
                    }).catch(error => { console.error("Error adding booking: ", error); Swal.fire('Gagal', 'Gagal menyimpan pesanan. Coba lagi.', 'error'); });
                });
            } else {
                window.location.href = 'register.html';
            }
        });
    }
    
    // =========================================================================
    // LOGIKA UNTUK HALAMAN BUKTI PEMBAYARAN (receipt.html)
    // =========================================================================
    const receiptContainer = document.getElementById('receipt-container');
    if (receiptContainer) {
        auth.onAuthStateChanged(user => {
            if (user) {
                const params = new URLSearchParams(window.location.search);
                const bookingId = params.get('bookingId');
                db.collection('bookings').doc(bookingId).get().then(doc => {
                    if (doc.exists) {
                        const booking = doc.data();
                        db.collection('users').doc(booking.userId).get().then(userDoc => {
                            const userData = userDoc.data();
                            receiptContainer.innerHTML = `<div class="card-header bg-success text-white"><h4 class="mb-0"><i class="bi bi-check-circle-fill"></i> Pembayaran Berhasil</h4></div><div class="card-body p-4"><p class="lead">Terima kasih, ${userData.name}. Pesanan Anda telah dikonfirmasi.</p><hr><h5>Detail Sewa</h5><div class="row"><div class="col-md-4"><img src="${booking.image}" class="img-fluid rounded-3"></div><div class="col-md-8"><p><strong>Produk:</strong> ${booking.title}</p><p><strong>Lokasi:</strong> ${booking.location}</p><p><strong>Harga:</strong> ${booking.price}</p></div></div><hr><h5>Detail Penyewa</h5><p><strong>Nomor Telepon:</strong> ${booking.renterPhone}</p><p><strong>Tanggal Disewa:</strong> ${booking.bookingDate}</p><p><strong>ID Sewa:</strong> #${doc.id}</p></div>`;
                        });
                    } else {
                        receiptContainer.innerHTML = '<p class="p-4">Detail pemesanan tidak ditemukan.</p>';
                    }
                });
            } else {
                window.location.href = 'register.html';
            }
        });
    }
    
    // =========================================================================
    // LOGIKA UNTUK HALAMAN PEMILIK (owner.html)
    // =========================================================================
    const addOfficeForm = document.getElementById('add-office-form');
    if (addOfficeForm) {
        const ownerOfficesList = document.getElementById('owner-offices-list');
        const ownerBookingsList = document.getElementById('owner-bookings-list');

        // --- BARU: Inisialisasi Peta Pemilih Lokasi ---
        const mapContainer = document.getElementById('add-map');
        let map = null;
        let marker = null;
        if (mapContainer) {
            const defaultCoords = [-6.2088, 106.8456]; // Jakarta
            map = L.map('add-map').setView(defaultCoords, 13);
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);
            marker = L.marker(defaultCoords, { draggable: true }).addTo(map);

            marker.on('dragend', function(e) {
                const latlng = e.target.getLatLng();
                document.getElementById('latitude').value = latlng.lat;
                document.getElementById('longitude').value = latlng.lng;
            });

            document.getElementById('latitude').value = defaultCoords[0];
            document.getElementById('longitude').value = defaultCoords[1];
        }
        
        const searchAddressBtn = document.getElementById('search-address-btn');
        if (searchAddressBtn) {
            searchAddressBtn.addEventListener('click', () => {
                const address = document.getElementById('address').value;
                const city = document.getElementById('city').value;
                const query = `${address}, ${city}`;

                if (!address && !city) {
                    Toast.fire({ icon: 'warning', title: 'Isi alamat atau kota terlebih dahulu!' });
                    return;
                }

                fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}`)
                    .then(response => response.json())
                    .then(data => {
                        if (data && data.length > 0) {
                            const lat = data[0].lat;
                            const lon = data[0].lon;
                            const newLatLng = new L.LatLng(lat, lon);
                            map.setView(newLatLng, 16);
                            marker.setLatLng(newLatLng);
                            document.getElementById('latitude').value = lat;
                            document.getElementById('longitude').value = lon;
                        } else {
                            Toast.fire({ icon: 'error', title: 'Alamat tidak ditemukan.' });
                        }
                    })
                    .catch(error => {
                        console.error('Error geocoding:', error);
                        Swal.fire('Error', 'Gagal mencari alamat.', 'error');
                    });
            });
        }

        const loadOwnerBookings = (ownerId) => {
            if (!ownerBookingsList) return;
            ownerBookingsList.innerHTML = `<div class="text-center mt-5"><div class="spinner-border text-secondary" role="status"><span class="visually-hidden">Loading...</span></div><p class="mt-2">Memuat pesanan...</p></div>`;
            
            db.collection('bookings').where('ownerId', '==', ownerId).orderBy('bookingTimestamp', 'desc').get().then(async (querySnapshot) => {
                if (querySnapshot.empty) {
                    ownerBookingsList.innerHTML = '<p class="text-muted">Belum ada pesanan yang masuk.</p>';
                    return;
                }

                ownerBookingsList.innerHTML = '';
                for (const doc of querySnapshot.docs) {
                    const booking = doc.data();
                    let renterName = 'Nama Tidak Ditemukan';

                    const userDoc = await db.collection('users').doc(booking.userId).get();
                    if (userDoc.exists) {
                        renterName = userDoc.data().name;
                    }

                    ownerBookingsList.innerHTML += `
                        <div class="list-group-item">
                            <div class="d-flex w-100 justify-content-between">
                                <h6 class="mb-1">Pesanan untuk: ${booking.title}</h6>
                                <small>${booking.bookingDate}</small>
                            </div>
                            <p class="mb-1">Dipesan oleh: <strong>${renterName}</strong> (${booking.renterPhone})</p>
                            <small>Total Bayar: ${booking.price}</small>
                        </div>
                    `;
                }
            }).catch(error => {
                console.error("Error loading bookings:", error);
                if (error.code === 'failed-precondition') {
                     ownerBookingsList.innerHTML = `<div class="alert alert-warning">Query membutuhkan indeks. Silakan klik link di Console (F12) untuk membuatnya.</div>`;
                }
            });
        };
        
        auth.onAuthStateChanged(user => {
            if (user) {
                db.collection('users').doc(user.uid).get().then(doc => {
                    if (!doc.exists || doc.data().role !== 'owner') {
                        window.location.href = 'main.html';
                        return;
                    }
                    loadOwnerOffices(user.uid);
                    loadOwnerBookings(user.uid);
                });

                addOfficeForm.addEventListener('submit', (e) => {
                    e.preventDefault();
                    const apiKey = '5e43898d4fb8147933d7b891113c23fc';
                    const imageFile = document.getElementById('image').files[0];
                    if (!imageFile) {
                        Toast.fire({ icon: 'warning', title: 'Silakan pilih sebuah gambar.' });
                        return;
                    }
                    const submitButton = addOfficeForm.querySelector('button[type="submit"]');
                    submitButton.disabled = true;
                    submitButton.textContent = 'Mengupload Gambar...';
                    const formData = new FormData();
                    formData.append('image', imageFile);
                    fetch(`https://api.imgbb.com/1/upload?key=${apiKey}`, {
                        method: 'POST',
                        body: formData
                    })
                    .then(response => response.json())
                    .then(result => {
                        if (result.success) {
                            const imageUrl = result.data.url;
                            const officeData = {
                                title: document.getElementById('title').value,
                                address: document.getElementById('address').value,
                                city: document.getElementById('city').value,
                                price: document.getElementById('price').value,
                                description: document.getElementById('description').value,
                                image: imageUrl,
                                ownerId: user.uid,
                                lat: parseFloat(document.getElementById('latitude').value),
                                lng: parseFloat(document.getElementById('longitude').value),
                                reviewCount: 0,
                                ratingSum: 0
                            };
                            return db.collection('offices').add(officeData);
                        } else {
                            throw new Error(result.error.message);
                        }
                    })
                    .then(() => {
                        Toast.fire({ icon: 'success', title: 'Kantor baru berhasil ditambahkan!' });
                        addOfficeForm.reset();
                        loadOwnerOffices(user.uid);
                    })
                    .catch(error => {
                        console.error("Error:", error);
                        Swal.fire({ icon: 'error', title: 'Gagal Menambahkan', text: error.message });
                    })
                    .finally(() => {
                        submitButton.disabled = false;
                        submitButton.textContent = 'Tambahkan Kantor';
                    });
                });
            } else {
                window.location.href = 'register.html';
            }
        });

        function loadOwnerOffices(ownerId) {
            ownerOfficesList.innerHTML = `<div class="text-center mt-5"><div class="spinner-border text-danger" role="status"><span class="visually-hidden">Loading...</span></div><p class="mt-2">Memuat kantor...</p></div>`;
            db.collection('offices').where('ownerId', '==', ownerId).get().then(querySnapshot => {
                if (querySnapshot.empty) {
                    ownerOfficesList.innerHTML = '<p class="text-muted">Anda belum menambahkan kantor.</p>';
                    return;
                }
                ownerOfficesList.innerHTML = '';
                querySnapshot.forEach(doc => {
                    const office = doc.data();
                    ownerOfficesList.innerHTML += `<div class="list-group-item d-flex gap-3 py-3"><img src="${office.image}" alt="${office.title}" style="width: 120px; height: 90px; object-fit: cover;" class="rounded"><div class="flex-grow-1"><div class="d-flex w-100 justify-content-between"><h6 class="mb-1">${office.title}</h6><div><a href="details.html?id=${doc.id}" class="btn btn-info btn-sm me-2">Lihat Ulasan</a><a href="edit-office.html?id=${doc.id}" class="btn btn-warning btn-sm me-2">Edit</a><button class="btn btn-danger btn-sm delete-office-btn" data-id="${doc.id}">Hapus</button></div></div><small class="text-muted">${office.city}</small></div></div>`;
                });
                document.querySelectorAll('.delete-office-btn').forEach(button => {
                    button.addEventListener('click', function() {
                        const officeId = this.dataset.id;
                        Swal.fire({
                            title: 'Hapus Kantor Ini?',
                            text: "Tindakan ini tidak dapat dibatalkan!",
                            icon: 'warning',
                            showCancelButton: true,
                            confirmButtonColor: '#d33',
                            confirmButtonText: 'Ya, hapus!'
                        }).then((result) => {
                            if (result.isConfirmed) {
                                db.collection('offices').doc(officeId).delete().then(() => {
                                    Toast.fire({ icon: 'success', title: 'Kantor berhasil dihapus.' });
                                    loadOwnerOffices(ownerId);
                                }).catch(error => console.error("Error removing document: ", error));
                            }
                        });
                    });
                });
            });
        }
    }

    // =========================================================================
    // LOGIKA UNTUK HALAMAN EDIT KANTOR (edit-office.html)
    // =========================================================================
    const editOfficeForm = document.getElementById('edit-office-form');
    if (editOfficeForm) {
        auth.onAuthStateChanged(user => {
            if (!user) {
                window.location.href = 'register.html';
                return;
            }
            const apiKey = '5e43898d4fb8147933d7b891113c23fc';
            const params = new URLSearchParams(window.location.search);
            const officeId = params.get('id');
            if (!officeId) {
                window.location.href = 'owner.html';
                return;
            }
            const titleInput = document.getElementById('title');
            const addressInput = document.getElementById('address');
            const cityInput = document.getElementById('city');
            const priceInput = document.getElementById('price');
            const imageInput = document.getElementById('image');
            const descriptionInput = document.getElementById('description');
            const submitButton = editOfficeForm.querySelector('button[type="submit"]');
            const officeRef = db.collection('offices').doc(officeId);
            let existingImageUrl = '';
            officeRef.get().then(doc => {
                if (doc.exists) {
                    if (doc.data().ownerId !== user.uid) {
                        window.location.href = 'owner.html';
                        return;
                    }
                    const data = doc.data();
                    titleInput.value = data.title;
                    addressInput.value = data.address;
                    cityInput.value = data.city;
                    priceInput.value = data.price;
                    descriptionInput.value = data.description;
                    existingImageUrl = data.image;
                } else {
                    window.location.href = 'owner.html';
                }
            });
            editOfficeForm.addEventListener('submit', (e) => {
                e.preventDefault();
                const newImageFile = imageInput.files[0];
                const updateFirestore = (imageUrl) => {
                    const updatedData = {
                        title: titleInput.value,
                        address: addressInput.value,
                        city: cityInput.value,
                        price: priceInput.value,
                        description: descriptionInput.value,
                        image: imageUrl
                    };
                    officeRef.update(updatedData)
                    .then(() => {
                        Toast.fire({ icon: 'success', title: 'Data berhasil diperbarui!' })
                        .then(() => {
                            window.location.href = 'owner.html';
                        });
                    })
                    .catch(error => {
                        console.error("Error updating document: ", error);
                        Swal.fire({ icon: 'error', title: 'Gagal Memperbarui', text: error.message });
                        submitButton.disabled = false;
                        submitButton.textContent = 'Simpan Perubahan';
                    });
                };
                submitButton.disabled = true;
                submitButton.textContent = 'Menyimpan...';
                if (newImageFile) {
                    submitButton.textContent = 'Mengupload Gambar Baru...';
                    const formData = new FormData();
                    formData.append('image', newImageFile);
                    fetch(`https://api.imgbb.com/1/upload?key=${apiKey}`, {
                        method: 'POST',
                        body: formData
                    })
                    .then(response => response.json())
                    .then(result => {
                        if (result.success) {
                            const newImageUrl = result.data.url;
                            updateFirestore(newImageUrl);
                        } else {
                            throw new Error(result.error.message);
                        }
                    })
                    .catch(error => {
                        console.error("Upload error:", error);
                        Swal.fire({ icon: 'error', title: 'Upload Gagal', text: error.message });
                        submitButton.disabled = false;
                        submitButton.textContent = 'Simpan Perubahan';
                    });
                } else {
                    updateFirestore(existingImageUrl);
                }
            });
        });
    }

    // =========================================================================
    // LOGIKA UNTUK HALAMAN ADMIN (admin.html)
    // =========================================================================
    const adminDashboard = document.getElementById('admin-dashboard');
    if (adminDashboard) {
        const usersList = document.getElementById('users-list');
        const bookingsList = document.getElementById('bookings-list');
        const officesListAdmin = document.getElementById('offices-list-admin');

        auth.onAuthStateChanged(user => {
            if (user) {
                db.collection('users').doc(user.uid).get().then(doc => {
                    if (!doc.exists || doc.data().role !== 'admin') {
                        window.location.href = 'main.html';
                        return;
                    }
                    loadAdminStats();
                    loadAllUsers();
                    loadAllBookings();
                    loadAllOfficesForAdmin();
                });
            } else {
                window.location.href = 'register.html';
            }
        });

        function loadAdminStats() {
            db.collection('users').get().then(snap => { document.getElementById('total-users').textContent = snap.size; });
            db.collection('users').where('role', '==', 'owner').get().then(snap => { document.getElementById('total-owners').textContent = snap.size; });
            db.collection('offices').get().then(snap => { document.getElementById('total-offices').textContent = snap.size; });
            db.collection('bookings').get().then(snap => { document.getElementById('total-bookings').textContent = snap.size; });
        }

        function loadAllUsers() {
            db.collection('users').get().then(querySnapshot => {
                usersList.innerHTML = '';
                querySnapshot.forEach(doc => {
                    const userData = doc.data();
                    const deleteButtonHTML = userData.role !== 'admin' ? `<button class="btn btn-outline-danger btn-sm delete-user-btn" data-id="${doc.id}">Hapus</button>` : '';
                    usersList.innerHTML += `<div class="list-group-item d-flex justify-content-between align-items-center"><div><h6 class="mb-1">${userData.name}</h6><small>${userData.email} | Peran: ${userData.role}</small></div>${deleteButtonHTML}</div>`;
                });

                document.querySelectorAll('.delete-user-btn').forEach(button => {
                    button.addEventListener('click', function() {
                        const userId = this.dataset.id;
                        Swal.fire({
                            title: 'Hapus Pengguna?',
                            text: "Data pengguna akan dihapus dari database.",
                            icon: 'warning',
                            showCancelButton: true,
                            confirmButtonColor: '#d33',
                            confirmButtonText: 'Ya, hapus!'
                        }).then((result) => {
                            if (result.isConfirmed) {
                                db.collection('users').doc(userId).delete().then(() => {
                                    Toast.fire({ icon: 'success', title: 'Data pengguna dihapus.' });
                                    loadAllUsers();
                                });
                            }
                        });
                    });
                });
            });
        }

        function loadAllBookings() {
            db.collection('bookings').orderBy('bookingTimestamp', 'desc').get().then(querySnapshot => {
                bookingsList.innerHTML = '';
                if(querySnapshot.empty){
                    bookingsList.innerHTML = `<p class="text-muted">Belum ada pesanan.</p>`;
                    return;
                }
                querySnapshot.forEach(doc => {
                    const bookingData = doc.data();
                    bookingsList.innerHTML += `<a href="receipt.html?bookingId=${doc.id}" class="list-group-item list-group-item-action"><div class="d-flex w-100 justify-content-between"><h6 class="mb-1">${bookingData.title}</h6><small>${bookingData.bookingDate}</small></div><small>ID Pesanan: ${doc.id}</small></a>`;
                });
            });
        }

        function loadAllOfficesForAdmin() {
            db.collection('offices').get().then(querySnapshot => {
                officesListAdmin.innerHTML = '';
                if(querySnapshot.empty){
                    officesListAdmin.innerHTML = `<p class="text-muted">Belum ada kantor yang ditambahkan.</p>`;
                    return;
                }
                querySnapshot.forEach(doc => {
                    const officeData = doc.data();
                    officesListAdmin.innerHTML += `<div class="list-group-item d-flex justify-content-between align-items-center"><div><h6 class="mb-1">${officeData.title}</h6><small>${officeData.city || officeData.location}</small></div><button class="btn btn-outline-danger btn-sm delete-office-btn" data-id="${doc.id}">Hapus</button></div>`;
                });
                document.querySelectorAll('.delete-office-btn').forEach(button => {
                    button.addEventListener('click', function() {
                        const officeId = this.dataset.id;
                        Swal.fire({
                            title: 'Hapus Kantor Ini?',
                            text: "Tindakan ini tidak dapat dibatalkan!",
                            icon: 'warning',
                            showCancelButton: true,
                            confirmButtonColor: '#d33',
                            confirmButtonText: 'Ya, hapus!'
                        }).then((result) => {
                            if (result.isConfirmed) {
                                db.collection('offices').doc(officeId).delete().then(() => {
                                    Toast.fire({ icon: 'success', title: 'Kantor berhasil dihapus.' });
                                    loadAllOfficesForAdmin();
                                }).catch(error => {
                                    console.error("Error removing document: ", error);
                                });
                            }
                        });
                    });
                });
            });
        }
    }
});