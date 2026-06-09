function isValidLogin(login) {
    return /^[a-zA-Z0-9]{6,}$/.test(login);
}
function isValidPassword(password) {
    return password && password.length >= 8;
}

function showToast(message, type = 'error') {
    let container = document.querySelector('.toast-container');
    if (!container) {
        container = document.createElement('div');
        container.className = 'toast-container';
        document.body.appendChild(container);
    }
    const toast = document.createElement('div');
    toast.className = `toast-custom ${type}`;
    toast.innerText = message;
    container.appendChild(toast);
    setTimeout(() => toast.remove(), 4000);
}

window.alert = showToast;

async function logout() {
    await fetch('/logout');
    window.location.href = '/login.html';
}
async function adminLogout() {
    await fetch('/admin/logout');
    window.location.href = '/admin-login.html';
}

function initSlider() {
    const container = document.querySelector('.slider-container');
    if (!container) return;
    const slidesContainer = document.querySelector('.slides');
    const dotsContainer = document.getElementById('dots');
    if (!slidesContainer) return;

    let slides = Array.from(document.querySelectorAll('.slide'));
    if (slides.length === 0) return;

    let slideIndex = 0;
    let interval;

    function updateSlidesAndDots() {
        slidesContainer.style.transform = `translateX(-${slideIndex * 100}%)`;
        const dots = document.querySelectorAll('.dot');
        dots.forEach((dot, i) => {
            dot.classList.toggle('active', i === slideIndex);
        });
    }

    function showSlide(n) {
        slideIndex = (n + slides.length) % slides.length;
        updateSlidesAndDots();
    }

    function nextSlide() {
        slideIndex = (slideIndex + 1) % slides.length;
        updateSlidesAndDots();
    }

    function prevSlide() {
        slideIndex = (slideIndex - 1 + slides.length) % slides.length;
        updateSlidesAndDots();
    }

    if (dotsContainer && dotsContainer.children.length === 0) {
        for (let i = 0; i < slides.length; i++) {
            const dot = document.createElement('span');
            dot.classList.add('dot');
            if (i === 0) dot.classList.add('active');
            dot.addEventListener('click', () => {
                slideIndex = i;
                updateSlidesAndDots();
                resetInterval();
            });
            dotsContainer.appendChild(dot);
        }
    }

    const prevBtn = container.querySelector('.prev');
    const nextBtn = container.querySelector('.next');
    if (prevBtn) prevBtn.onclick = () => { prevSlide(); resetInterval(); };
    if (nextBtn) nextBtn.onclick = () => { nextSlide(); resetInterval(); };

    function startInterval() {
        if (interval) clearInterval(interval);
        interval = setInterval(() => nextSlide(), 3000);
    }
    function resetInterval() {
        if (interval) clearInterval(interval);
        startInterval();
    }

    startInterval();
    updateSlidesAndDots();
}

function setDateMask() {
    const dateInput = document.getElementById('lessonDate');
    if (!dateInput) return;
    dateInput.type = 'text';
    dateInput.placeholder = 'ДД.ММ.ГГГГ';
    dateInput.maxLength = 10;
    dateInput.addEventListener('input', function(e) {
        let value = this.value.replace(/\D/g, '');
        if (value.length > 2 && value.length <= 4) {
            value = value.slice(0,2) + '.' + value.slice(2);
        } else if (value.length > 4) {
            value = value.slice(0,2) + '.' + value.slice(2,4) + '.' + value.slice(4,8);
        }
        this.value = value;
    });
    dateInput.addEventListener('blur', function() {
        const parts = this.value.split('.');
        if (parts.length === 3) {
            const day = parts[0].padStart(2,'0');
            const month = parts[1].padStart(2,'0');
            let year = parts[2];
            if (year.length === 2) year = '20' + year;
            if (year.length === 4) {
                const iso = `${year}-${month}-${day}`;
                if (!isNaN(new Date(iso).getTime())) {
                    this.value = `${day}.${month}.${year}`;
                    return;
                }
            }
        }
        showToast('Введите корректную дату в формате ДД.ММ.ГГГГ', 'error');
    });
}

async function checkAuth() {
    const res = await fetch('/api/user');
    if (!res.ok) {
        window.location.href = '/login.html';
        return false;
    }
    return true;
}