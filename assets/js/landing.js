/**
 * SevaSetuHub – Landing Page Logic
 * landing.js
 *
 * All page-specific functionality for the customer-facing landing page.
 * Supports i18n via SevaI18n.t() for all dynamic (JS-rendered) strings.
 */

'use strict';

/* ════════════════════════════════════════════════════════════════════════
   DEMO DATA
   TODO: Replace demo data with Google Apps Script API calls

   Future API Integration Points:
   - getServiceCategories() → /api/services/categories
   - getPopularServices()   → /api/services/popular
   - getOffers()            → /api/offers/active
   - searchServices()       → /api/services/search?service=X&location=Y

   i18n note: text fields are i18n key references, not hardcoded strings.
   The render functions call SevaI18n.t(key) at render time, so they
   automatically update whenever the language changes.
════════════════════════════════════════════════════════════════════════ */

/** Service category definitions. `i18nKey` maps to `categories.<id>.*` */
const demoServiceCategories = [
    { id: 'ac',          icon: 'bi-snow2',         color: '#0891b2' },
    { id: 'cleaning',    icon: 'bi-stars',         color: '#7c3aed' },
    { id: 'plumbing',    icon: 'bi-droplet-half',  color: '#0284c7' },
    { id: 'electrical',  icon: 'bi-lightning-charge', color: '#d97706' },
    { id: 'pest',        icon: 'bi-shield-check',  color: '#059669' },
    { id: 'fabrication', icon: 'bi-tools',          color: '#dc2626' },
    { id: 'maintenance', icon: 'bi-gear',           color: '#475569' },
    { id: 'more',        icon: 'bi-plus-circle',   color: '#0891b2' },
];

/** Popular services. `i18nKey` maps to `popular.services.<key>` */
const demoPopularServices = [
    {
        id: 'ps1', i18nKey: 'ac_general',
        icon: 'bi-snow2',            iconBg: 'linear-gradient(135deg,#e0f2fe,#bae6fd)', iconColor: '#0891b2',
        startingPrice: 499,          rating: 4.8, ratingCount: 312,
    },
    {
        id: 'ps2', i18nKey: 'ac_repair',
        icon: 'bi-wrench-adjustable', iconBg: 'linear-gradient(135deg,#dbeafe,#bfdbfe)', iconColor: '#1d4ed8',
        startingPrice: 349,          rating: 4.7, ratingCount: 218,
    },
    {
        id: 'ps3', i18nKey: 'deep_cleaning',
        icon: 'bi-stars',            iconBg: 'linear-gradient(135deg,#ede9fe,#ddd6fe)', iconColor: '#7c3aed',
        startingPrice: 1499,         rating: 4.9, ratingCount: 489,
    },
    {
        id: 'ps4', i18nKey: 'office_cleaning',
        icon: 'bi-building',         iconBg: 'linear-gradient(135deg,#f0fdf4,#dcfce7)', iconColor: '#16a34a',
        startingPrice: 1999,         rating: 4.6, ratingCount: 134,
    },
    {
        id: 'ps5', i18nKey: 'plumbing_repair',
        icon: 'bi-droplet-half',     iconBg: 'linear-gradient(135deg,#e0f2fe,#bae6fd)', iconColor: '#0284c7',
        startingPrice: 299,          rating: 4.7, ratingCount: 276,
    },
    {
        id: 'ps6', i18nKey: 'electrical_repair',
        icon: 'bi-lightning-charge', iconBg: 'linear-gradient(135deg,#fef3c7,#fde68a)', iconColor: '#b45309',
        startingPrice: 399,          rating: 4.8, ratingCount: 195,
    },
    {
        id: 'ps7', i18nKey: 'pest_control',
        icon: 'bi-shield-check',     iconBg: 'linear-gradient(135deg,#d1fae5,#a7f3d0)', iconColor: '#059669',
        startingPrice: 799,          rating: 4.9, ratingCount: 367,
    },
    {
        id: 'ps8', i18nKey: 'tank_cleaning',
        icon: 'bi-water',            iconBg: 'linear-gradient(135deg,#cffafe,#a5f3fc)', iconColor: '#0e7490',
        startingPrice: 599,          rating: 4.6, ratingCount: 142,
    },
];

/** Offer definitions. `i18nKey` maps to `offers.items.<key>.*` */
const demoOffers = [
    { id: 'off1', i18nKey: 'summer',  code: 'SUMMER20',  validUntil: '31 Aug 2026' },
    { id: 'off2', i18nKey: 'clean',   code: 'CLEAN500',  validUntil: '30 Sep 2026' },
    { id: 'off3', i18nKey: 'welcome', code: 'WELCOME10', validUntil: '31 Dec 2026' },
];

/* ════════════════════════════════════════════════════════════════════════
   HELPER – safely call SevaI18n.t() even before i18n is ready
════════════════════════════════════════════════════════════════════════ */

function _(key, fallback) {
    if (typeof SevaI18n !== 'undefined') return SevaI18n.t(key, fallback);
    return fallback || key;
}

/* ════════════════════════════════════════════════════════════════════════
   RENDER FUNCTIONS
════════════════════════════════════════════════════════════════════════ */

/**
 * Renders service category cards into the services grid.
 * Uses i18n for card title, description, and explore link text.
 * TODO: Replace demoServiceCategories with getServiceCategories() API call
 */
function renderServiceCategories() {
    const grid = document.getElementById('services-grid');
    if (!grid) return;

    const exploreLabel = _('services.explore', 'Explore');

    const html = demoServiceCategories.map((cat, i) => {
        const name = _(`categories.${cat.id}.name`, cat.id);
        const desc = _(`categories.${cat.id}.desc`, '');
        return `
        <button
            class="service-category-card animate-on-scroll delay-${Math.min(i + 1, 6)}"
            onclick="handleCategoryClick('${cat.id}', '${_escapeAttr(name)}')"
            aria-label="${_escapeAttr(exploreLabel + ' ' + name)}"
            data-category-id="${cat.id}"
        >
            <div class="card-icon-wrap">
                <i class="bi ${cat.icon}" aria-hidden="true"></i>
            </div>
            <h3 class="card-title">${_escapeHtml(name)}</h3>
            <p class="card-desc">${_escapeHtml(desc)}</p>
            <span class="card-link" aria-hidden="true">
                ${_escapeHtml(exploreLabel)} <i class="bi bi-arrow-right"></i>
            </span>
        </button>`;
    }).join('');

    grid.innerHTML = html;
    SevaAnimations.init();
}

/**
 * Renders popular service cards.
 * TODO: Replace demoPopularServices with getPopularServices() API call
 */
function renderPopularServices() {
    const grid = document.getElementById('popular-services-grid');
    if (!grid) return;

    const startingFrom = _('popular.starting_from', 'Starting from');
    const bookNow      = _('popular.book_now', 'Book Now');

    const html = demoPopularServices.map((svc, i) => {
        const name = _(`popular.services.${svc.i18nKey}`, svc.i18nKey);
        const priceFormatted = svc.startingPrice.toLocaleString('en-IN');
        return `
        <article class="popular-service-card animate-on-scroll delay-${Math.min(i + 1, 6)}">
            <div class="service-icon-area" style="background: ${svc.iconBg};" aria-hidden="true">
                <i class="bi ${svc.icon}" style="color: ${svc.iconColor}; font-size: 3rem;"></i>
            </div>
            <div class="service-body">
                <h3 class="service-name">${_escapeHtml(name)}</h3>
                <div class="service-meta">
                    <div class="service-price">
                        ${_escapeHtml(startingFrom)} <strong>₹${priceFormatted}</strong>
                    </div>
                    <div class="service-rating" title="${svc.rating} out of 5">
                        <i class="bi bi-star-fill" aria-hidden="true"></i>
                        ${svc.rating}
                        <span style="color: var(--text-muted); font-weight: 400;">(${svc.ratingCount})</span>
                    </div>
                </div>
                <button
                    class="btn btn-primary btn-sm btn-book"
                    onclick="handleBookService('${svc.id}', '${_escapeAttr(name)}')"
                    aria-label="${_escapeAttr(bookNow + ' ' + name + ' ₹' + priceFormatted)}"
                >
                    <i class="bi bi-calendar-check" aria-hidden="true"></i>
                    ${_escapeHtml(bookNow)}
                </button>
            </div>
        </article>`;
    }).join('');

    grid.innerHTML = html;
    SevaAnimations.init();
}

/**
 * Renders special offer cards.
 * TODO: Replace demoOffers with getOffers() API call
 */
function renderOffers() {
    const grid = document.getElementById('offers-grid');
    if (!grid) return;

    const copyLabel   = _('offers.copy', 'Copy');
    const bookNow     = _('offers.book_now', 'Book Now');
    const validTill   = _('offers.valid_till', 'Valid till');

    const html = demoOffers.map((offer, i) => {
        const badge       = _(`offers.items.${offer.i18nKey}.badge`, offer.i18nKey);
        const title       = _(`offers.items.${offer.i18nKey}.title`, offer.i18nKey);
        const discount    = _(`offers.items.${offer.i18nKey}.discount`, '');
        const description = _(`offers.items.${offer.i18nKey}.description`, '');
        const service     = _(`offers.items.${offer.i18nKey}.service`, '');

        return `
        <article class="offer-card animate-on-scroll delay-${i + 1}" data-offer-id="${offer.id}">
            <div class="offer-badge">
                <i class="bi bi-tag-fill" aria-hidden="true"></i>
                ${_escapeHtml(badge)}
            </div>
            <div>
                <div class="offer-discount">${_escapeHtml(discount)}</div>
                <h3 class="offer-title">${_escapeHtml(title)}</h3>
            </div>
            <p class="offer-description">${_escapeHtml(description)}</p>
            <div class="offer-code-row" aria-label="Coupon code: ${offer.code}">
                <span class="coupon-code" aria-label="Coupon code ${offer.code}">${offer.code}</span>
                <button
                    class="btn btn-outline-primary btn-sm"
                    onclick="copyCouponCode('${offer.code}')"
                    aria-label="${_escapeAttr(copyLabel + ' ' + offer.code)}"
                    title="${_escapeAttr(copyLabel)}"
                >
                    <i class="bi bi-clipboard" aria-hidden="true"></i>
                    ${_escapeHtml(copyLabel)}
                </button>
            </div>
            <div class="offer-meta">
                <span>
                    <i class="bi bi-calendar3" aria-hidden="true"></i>
                    ${_escapeHtml(validTill)} ${offer.validUntil}
                </span>
                <span>
                    <i class="bi bi-tag" aria-hidden="true"></i>
                    ${_escapeHtml(service)}
                </span>
            </div>
            <div class="offer-actions">
                <button
                    class="btn btn-primary btn-sm flex-grow-1"
                    onclick="handleBookService(null, '${_escapeAttr(service)}')"
                    aria-label="${_escapeAttr(bookNow + ' ' + service)}"
                >
                    <i class="bi bi-calendar-check" aria-hidden="true"></i>
                    ${_escapeHtml(bookNow)}
                </button>
            </div>
        </article>`;
    }).join('');

    grid.innerHTML = html;
    SevaAnimations.init();
}

/**
 * Re-render all dynamic (JS-generated) sections.
 * Called once on init and again on every language change.
 */
function renderDynamicSections() {
    renderServiceCategories();
    renderPopularServices();
    renderOffers();
}

/* ════════════════════════════════════════════════════════════════════════
   XSS HELPERS
════════════════════════════════════════════════════════════════════════ */

/** Escape for safe innerHTML insertion. */
function _escapeHtml(str) {
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

/** Escape for safe HTML attribute values. */
function _escapeAttr(str) {
    return String(str).replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

/* ════════════════════════════════════════════════════════════════════════
   INTERACTION HANDLERS
════════════════════════════════════════════════════════════════════════ */

/**
 * Handle service category card clicks.
 * @param {string} categoryId
 * @param {string} categoryName
 */
function handleCategoryClick(categoryId, categoryName) {
    // TODO: Navigate to service listing page for this category
    // Future: window.location.href = `/services?category=${categoryId}`;
    showComingSoon(categoryName + ' ' + _('toast.coming_soon_suffix', 'booking will be available soon. Stay tuned!'));
}

/**
 * Handle book now button clicks.
 * @param {string|null} serviceId
 * @param {string} serviceName
 */
function handleBookService(serviceId, serviceName) {
    // TODO: Navigate to booking form with pre-selected service
    // Future: window.location.href = `/book?service=${serviceId}`;
    showComingSoon(serviceName + ' ' + _('toast.coming_soon_suffix', 'booking will be available soon.'));
}

/**
 * Show a "coming soon" informational toast.
 * @param {string} message
 */
function showComingSoon(message) {
    SevaToast.show(message, 'info', 4000);
}

/* ════════════════════════════════════════════════════════════════════════
   COUPON COPY
════════════════════════════════════════════════════════════════════════ */

/**
 * Copy a coupon code to clipboard and show feedback toast.
 * @param {string} code - Coupon code to copy
 */
async function copyCouponCode(code) {
    const success = await SevaClipboard.copy(code);
    if (success) {
        SevaToast.show(_('toast.copied', 'Coupon code copied!'), 'success', 3000);
    } else {
        SevaToast.show(_('toast.copy_failed', 'Could not copy automatically. Please copy manually.'), 'warning', 4000);
    }
}

/* ════════════════════════════════════════════════════════════════════════
   SERVICE SEARCH
════════════════════════════════════════════════════════════════════════ */

/**
 * Handle quick service search form submission.
 * TODO: Replace with API call to getServices(service, location)
 */
function handleServiceSearch() {
    const form = document.getElementById('service-search-form');
    if (!form) return;

    form.addEventListener('submit', function (e) {
        e.preventDefault();

        const serviceSelect  = document.getElementById('search-service');
        const locationSelect = document.getElementById('search-location');

        const selectedService  = serviceSelect  ? serviceSelect.value  : '';
        const selectedLocation = locationSelect ? locationSelect.value : '';

        // Validation
        if (!selectedService) {
            SevaToast.show(_('toast.select_service', 'Please select a service first.'), 'warning');
            serviceSelect && serviceSelect.focus();
            return;
        }

        if (!selectedLocation) {
            SevaToast.show(_('toast.select_location', 'Please select your location.'), 'warning');
            locationSelect && locationSelect.focus();
            return;
        }

        // TODO: Replace with actual API call
        // Future: fetchServices(selectedService, selectedLocation).then(renderResults);
        SevaToast.show(
            `Searching for <strong>${_escapeHtml(selectedService)}</strong> in <strong>${_escapeHtml(selectedLocation)}</strong>…`,
            'info',
            4000
        );

        // Scroll to services section as visual feedback
        setTimeout(() => {
            SevaScroll.scrollToSection('services');
        }, 600);
    });
}

/* ════════════════════════════════════════════════════════════════════════
   NAVBAR
════════════════════════════════════════════════════════════════════════ */

/**
 * Initialize mobile navigation toggle and navbar scroll behaviour.
 */
function initMobileNavigation() {
    const navbar   = document.getElementById('main-navbar');
    const collapse = document.getElementById('navbarCollapse');

    // Scroll-shadow
    if (navbar) {
        const handleScroll = () => {
            navbar.classList.toggle('scrolled', window.scrollY > 10);
        };
        window.addEventListener('scroll', handleScroll, { passive: true });
    }

    // Close nav on link click (mobile)
    if (collapse) {
        const navLinks = collapse.querySelectorAll('.nav-link');
        navLinks.forEach(link => {
            link.addEventListener('click', () => {
                const bsCollapse = bootstrap.Collapse.getInstance(collapse);
                if (bsCollapse) bsCollapse.hide();
            });
        });
    }

    // Active link on scroll (IntersectionObserver)
    const sections    = document.querySelectorAll('section[id]');
    const navLinkItems = document.querySelectorAll('.setu-navbar .nav-link[href^="#"]');

    if (sections.length && navLinkItems.length) {
        const sectionObserver = new IntersectionObserver(
            (entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        const id = entry.target.getAttribute('id');
                        navLinkItems.forEach(link => {
                            link.classList.remove('active');
                            if (link.getAttribute('href') === `#${id}`) {
                                link.classList.add('active');
                            }
                        });
                    }
                });
            },
            { rootMargin: '-40% 0px -55% 0px', threshold: 0 }
        );
        sections.forEach(s => sectionObserver.observe(s));
    }
}

/* ════════════════════════════════════════════════════════════════════════
   SMOOTH SCROLLING
════════════════════════════════════════════════════════════════════════ */

/**
 * Attach smooth scroll to all anchor links that point to on-page sections.
 */
function initSmoothScrolling() {
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            const targetId = this.getAttribute('href').slice(1);
            if (!targetId) return;
            const target = document.getElementById(targetId);
            if (!target) return;
            e.preventDefault();
            SevaScroll.scrollToSection(targetId);
        });
    });
}

/* ════════════════════════════════════════════════════════════════════════
   FAQ ACCORDION
════════════════════════════════════════════════════════════════════════ */

function initFAQ() {
    // Bootstrap accordion handles collapse; no extra JS needed.
    // This function is kept as a hook for future enhancements.
}

/* ════════════════════════════════════════════════════════════════════════
   SCROLL ANIMATIONS
════════════════════════════════════════════════════════════════════════ */

function initScrollAnimations() {
    SevaAnimations.init();
}

/* ════════════════════════════════════════════════════════════════════════
   FLOATING ACTION BUTTON
════════════════════════════════════════════════════════════════════════ */

/**
 * Show/hide the mobile FAB based on hero section visibility.
 */
function initFAB() {
    const fab  = document.getElementById('fab-book');
    const hero = document.getElementById('hero');
    if (!fab || !hero) return;

    const observer = new IntersectionObserver(
        ([entry]) => {
            fab.style.display = entry.isIntersecting ? 'none' : 'flex';
        },
        { threshold: 0 }
    );
    observer.observe(hero);
}

/* ════════════════════════════════════════════════════════════════════════
   COUNTER ANIMATION (Statistics section)
════════════════════════════════════════════════════════════════════════ */

function initCounters() {
    SevaCounter.init();
}

/* ════════════════════════════════════════════════════════════════════════
   TOAST (re-exported for inline HTML use)
════════════════════════════════════════════════════════════════════════ */

function showToast(message, type = 'info', duration = 3500) {
    SevaToast.show(message, type, duration);
}

/* ════════════════════════════════════════════════════════════════════════
   LANGUAGE CHANGE HANDLER
   Listens for the custom event dispatched by i18n.js after switching lang.
════════════════════════════════════════════════════════════════════════ */

function initLangChangeListener() {
    document.addEventListener('setu:langchange', () => {
        // Re-render all JS-generated cards with updated strings
        renderDynamicSections();
        // Re-run smooth scroll (new anchors may have appeared)
        initSmoothScrolling();
    });
}

/* ════════════════════════════════════════════════════════════════════════
   INITIALISATION
════════════════════════════════════════════════════════════════════════ */

/**
 * Bootstrap all page functionality once the DOM and i18n are ready.
 */
function initLandingPage() {
    // Build language switcher widget in the navbar
    if (typeof SevaI18n !== 'undefined') {
        SevaI18n.onReady(() => {
            SevaI18n.buildSwitcher('lang-switcher');
            // Render dynamic sections after i18n strings are loaded
            renderDynamicSections();
        });
    } else {
        // i18n not available – render with English fallback strings
        renderDynamicSections();
    }

    // Bind interactions
    handleServiceSearch();
    initMobileNavigation();
    initSmoothScrolling();
    initFAQ();
    initScrollAnimations();
    initFAB();
    initCounters();
    initLangChangeListener();
}

// Run on DOM ready
if (typeof jQuery !== 'undefined') {
    $(document).ready(initLandingPage);
} else {
    document.addEventListener('DOMContentLoaded', initLandingPage);
}

// Expose functions globally for inline HTML handlers
window.handleCategoryClick = handleCategoryClick;
window.handleBookService   = handleBookService;
window.copyCouponCode      = copyCouponCode;
window.showComingSoon      = showComingSoon;
window.showToast           = showToast;
