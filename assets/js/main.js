// Create Bubbles
        const container = document.getElementById('bubble-container');
        for (let i = 0; i < 20; i++) {
            const bubble = document.createElement('div');
            bubble.className = 'bubble';
            const size = Math.random() * 60 + 20 + 'px';
            bubble.style.width = size;
            bubble.style.height = size;
            bubble.style.left = Math.random() * 100 + '%';
            bubble.style.animationDuration = Math.random() * 10 + 10 + 's';
            bubble.style.animationDelay = Math.random() * 5 + 's';
            container.appendChild(bubble);
        }

        // Mobile Nav Active State on Scroll
        const sections = document.querySelectorAll('section');
        const navItems = document.querySelectorAll('.nav-item-m');

        window.addEventListener('scroll', () => {
            let current = "";
            sections.forEach(section => {
                const sectionTop = section.offsetTop;
                if (pageYOffset >= sectionTop - 100) {
                    current = section.getAttribute('id');
                }
            });

            navItems.forEach(item => {
                item.classList.remove('active');
                if (item.getAttribute('href').includes(current)) {
                    item.classList.add('active');
                }
            });
        });

        // loader
        setTimeout(() => {
            loader.style.opacity = "0";        
            loader.style.pointerEvents = "none";
            setTimeout(() => {
                loader.style.display = "none";
            }, 600);
        }, 1200);
       
        //contact subject
        const form = document.getElementById("enquiryForm");
        const userNameInput = document.getElementById("userName");
        const subjectInput = document.getElementById("formSubject");

        // Guarded: on pages/forms where these ids don't exist, skip
        // silently instead of throwing and blocking the rest of main.js.
        if (form && userNameInput && subjectInput) {
            form.addEventListener("submit", () => {
                const name = userNameInput.value.trim() || "Anonymous";
                subjectInput.value = `New Enquiry from ${name}`;
            });
        }
// =====================================================
// Search Property - loads REAL listings.
//
// Two sources are merged, newest first:
//   1) LOCAL_STORAGE_KEY — properties saved on this device via
//      add-property.html (works right now, no server needed;
//      that's what actually persists the photos you upload there).
//   2) PROPERTYCRM_LISTING_API_URL — your PropertyCRM backend, once
//      it's hosted on a real domain with a public "list approved
//      properties" endpoint returning JSON like:
//      [{ "title": "...", "type": "Plot / Land",
//         "purpose": "For Sale", "location": "...", "district": "...",
//         "price": "...", "photos": ["https://.../1.jpg", "https://.../2.jpg"],
//         "video": "https://.../clip.mp4" }]
// Until that endpoint is live, only the locally-saved properties show.
// Once PROPERTYCRM_LISTING_CONFIGURED is true, both sources are shown
// together automatically — no other change needed.
// =====================================================
const IS_LOCAL_DEV = ['localhost', '127.0.0.1'].includes(location.hostname);
const PROPERTYCRM_LISTING_API_URL = IS_LOCAL_DEV
    ? 'http://localhost/PropertyCRM/api/public/property-list.php'
    : 'https://mediumslateblue-butterfly-616701.hostingersite.com/api/public/property-list.php';
const PROPERTYCRM_LISTING_CONFIGURED = true; // set to true once the URL above is live
const LOCAL_STORAGE_KEY = 'bsrp_local_properties'; // must match add-property.html

(function propertySearchInit() {
    const resultsGrid = document.getElementById('propertyResults');
    const noPropertyMsg = document.getElementById('noPropertyMsg');
    const filterBar = document.getElementById('propertyFilterBar');
    if (!resultsGrid || !filterBar) return; // section not on this page

    let liveProperties = [];
    let cardUid = 0;
    const AUTOPLAY_MS = 3500;
    const autoplayTimers = new Map();

    function loadLocalProperties() {
        try {
            const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
            const arr = raw ? JSON.parse(raw) : [];
            // newest saved property first
            return Array.isArray(arr) ? arr.slice().reverse() : [];
        } catch (err) {
            console.warn('Could not read locally saved properties:', err);
            return [];
        }
    }

    // ---- Media: multiple photos run in a small cursor/arrow carousel;
    // any video sits paused on its poster frame by default (muted,
    // controls, no autoplay) until the visitor taps play themselves. ----
    function slidesMarkup(property) {
        const photos = (property.photos && property.photos.length) ? property.photos : [];
        const slides = photos.map((src, i) =>
            `<div class="pm-slide"><img src="${src}" alt="${property.title || 'Property'} photo ${i + 1}" loading="lazy"></div>`
        );
        if (property.video) {
            const poster = photos[0] || '';
            slides.push(`<div class="pm-slide pm-slide-video"><video class="w-100 h-100" src="${property.video}"
                        poster="${poster}" controls muted playsinline preload="metadata"></video></div>`);
        }
        if (slides.length === 0) {
            slides.push(`<div class="pm-slide"><img src="" alt="${property.title || 'Property'}"></div>`);
        }
        return slides.join('');
    }

    function mediaMarkup(property, uid) {
        const total = (property.photos ? property.photos.length : 0) + (property.video ? 1 : 0);
        const showControls = total > 1;
        const dots = showControls
            ? Array.from({ length: total }).map((_, i) => `<span class="pm-dot${i === 0 ? ' active' : ''}" data-i="${i}"></span>`).join('')
            : '';
        return `
            <div class="pm-carousel" id="${uid}" data-idx="0" data-count="${total}">
                <div class="pm-track">${slidesMarkup(property)}</div>
                ${showControls ? `
                <button type="button" class="pm-arrow pm-prev" aria-label="Previous photo"><i class="bi bi-chevron-left"></i></button>
                <button type="button" class="pm-arrow pm-next" aria-label="Next photo"><i class="bi bi-chevron-right"></i></button>
                <div class="pm-dots">${dots}</div>` : ''}
            </div>`;
    }

    function cardMarkup(property) {
        const uid = 'pmCarousel' + (cardUid++);
        const location = property.location || [property.address, property.city].filter(Boolean).join(', ');
        const district = property.district || '';
        return `
        <div class="col-12 col-sm-6 col-md-4 property-item" data-type="${property.type}">
            <div class="property-card">
                <div class="property-media">
                    <span class="purpose-badge">${property.purpose || ''}</span>
                    <span class="media-type-badge">${property.type || ''}</span>
                    ${mediaMarkup(property, uid)}
                </div>
                <div class="property-body">
                    <h5>${property.title || 'Property'}</h5>
                    <div class="property-location"><i class="bi bi-geo-alt"></i> ${location}</div>
                    ${district ? `<div class="property-district"><i class="bi bi-signpost-2"></i> ${district} District</div>` : ''}
                    <div class="property-price">${property.price || ''}</div>
                    <a href="./book.html" class="btn btn-enquire">Enquire Now</a>
                </div>
            </div>
        </div>`;
    }

    // ---- Carousel navigation (arrows / dots act like the "cursor" run
    // through the photos) plus a gentle autoplay that pauses on hover
    // and never fights a video the visitor is actively watching. ----
    function goToSlide(carouselEl, index) {
        const track = carouselEl.querySelector('.pm-track');
        const count = track.children.length;
        if (!count) return;
        const i = ((index % count) + count) % count;
        track.style.transform = `translateX(-${i * 100}%)`;
        carouselEl.dataset.idx = i;
        carouselEl.querySelectorAll('.pm-dot').forEach((d, di) => d.classList.toggle('active', di === i));
    }

    function stopAutoplay(carouselEl) {
        const timer = autoplayTimers.get(carouselEl);
        if (timer) clearInterval(timer);
        autoplayTimers.delete(carouselEl);
    }

    function startAutoplay(carouselEl) {
        stopAutoplay(carouselEl);
        if (Number(carouselEl.dataset.count || 0) < 2) return;
        const timer = setInterval(() => {
            const playingVideo = carouselEl.querySelector('video');
            if (playingVideo && !playingVideo.paused) return; // don't fight a video in play
            goToSlide(carouselEl, Number(carouselEl.dataset.idx || 0) + 1);
        }, AUTOPLAY_MS);
        autoplayTimers.set(carouselEl, timer);
    }

    resultsGrid.addEventListener('click', (e) => {
        const arrow = e.target.closest('.pm-arrow');
        if (arrow) {
            e.stopPropagation();
            const carouselEl = arrow.closest('.pm-carousel');
            const step = arrow.classList.contains('pm-next') ? 1 : -1;
            goToSlide(carouselEl, Number(carouselEl.dataset.idx || 0) + step);
            return;
        }
        const dot = e.target.closest('.pm-dot');
        if (dot) {
            e.stopPropagation();
            goToSlide(dot.closest('.pm-carousel'), Number(dot.dataset.i));
            return;
        }
        if (e.target.closest('video')) return; // let the visitor control the video
        const card = e.target.closest('.property-card');
        if (!card) return;
        if (e.target.closest('a')) return; // let the Enquire link work normally
        window.location.href = './book.html';
    });

    // Pause autoplay while the visitor is hovering/browsing a card's photos
    resultsGrid.addEventListener('mouseenter', (e) => {
        const carouselEl = e.target.closest && e.target.closest('.pm-carousel');
        if (carouselEl) stopAutoplay(carouselEl);
    }, true);
    resultsGrid.addEventListener('mouseleave', (e) => {
        const carouselEl = e.target.closest && e.target.closest('.pm-carousel');
        if (carouselEl) startAutoplay(carouselEl);
    }, true);

    function renderList(list) {
        autoplayTimers.forEach((timer) => clearInterval(timer));
        autoplayTimers.clear();

        resultsGrid.innerHTML = list.map(cardMarkup).join('');
        noPropertyMsg.classList.toggle('d-none', list.length > 0);
        if (list.length === 0) {
            noPropertyMsg.innerHTML = `No properties listed yet. <a href="./book.html" class="text-warning">Register your property</a> to be the first one shown here.`;
        }

        resultsGrid.querySelectorAll('.pm-carousel').forEach((c) => {
            c.dataset.idx = '0';
            startAutoplay(c);
        });
    }

    function applyFilter(filter) {
        const list = filter === 'All'
            ? liveProperties
            : liveProperties.filter(p => p.type === filter);
        renderList(list);
    }

    function applyActiveFilter() {
        const activeChip = filterBar.querySelector('.filter-chip.active');
        applyFilter(activeChip ? activeChip.dataset.filter : 'All');
    }

    async function loadLiveProperties() {
        const localProps = loadLocalProperties();

        if (!PROPERTYCRM_LISTING_CONFIGURED) {
            liveProperties = localProps;
            applyActiveFilter();
            return;
        }

        resultsGrid.innerHTML = `<p class="text-center text-white-50 w-100 py-4"><i class="bi bi-arrow-repeat"></i> Loading properties...</p>`;
        try {
            const res = await fetch(PROPERTYCRM_LISTING_API_URL);
            if (!res.ok) throw new Error('Bad response from PropertyCRM');
            const data = await res.json();
            const apiProps = Array.isArray(data) ? data : (data.properties || []);
            liveProperties = [...localProps, ...apiProps];
        } catch (err) {
            console.warn('Could not load live properties from PropertyCRM:', err);
            liveProperties = localProps;
        }
        applyActiveFilter();
    }

    filterBar.addEventListener('click', (e) => {
        const chip = e.target.closest('.filter-chip');
        if (!chip) return;
        filterBar.querySelectorAll('.filter-chip').forEach(c => c.classList.remove('active'));
        chip.classList.add('active');
        applyFilter(chip.dataset.filter);
    });

    // Reload every time the modal opens, so a property just saved in
    // add-property.html shows up immediately without a page refresh.
    const modalEl = document.getElementById('searchPropertyModal');
    if (modalEl) {
        modalEl.addEventListener('shown.bs.modal', loadLiveProperties);
    }
})();
