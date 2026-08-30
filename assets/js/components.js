/**
 * SevaSetuHub – Reusable UI Components
 * components.js
 *
 * Contains: Toast, Modal helpers, shared utilities
 */

'use strict';

/* ════════════════════════════════════════════════════════
   TOAST SYSTEM (5s Auto-close + Close Button)
   ════════════════════════════════════════════════════════ */
const SevaToast = (() => {
    let container;

    function getContainer() {
        if (!container) {
            container = document.getElementById('toast-container');
            if (!container) {
                container = document.createElement('div');
                container.id = 'toast-container';
                document.body.appendChild(container);
            }
        }
        return container;
    }

    /**
     * Show a toast notification.
     * @param {string} message  - Message text
     * @param {string} type     - 'success' | 'error' | 'info' | 'warning'
     * @param {number} duration - Auto-dismiss in ms (default 5000ms = 5s)
     */
    function show(message, type = 'success', duration = 5000) {
        const c = getContainer();

        const iconMap = {
            success: 'bi-check-circle-fill',
            error:   'bi-x-circle-fill',
            info:    'bi-info-circle-fill',
            warning: 'bi-exclamation-triangle-fill',
        };

        const toast = document.createElement('div');
        toast.className = `toast-item toast-${type}`;
        toast.setAttribute('role', 'alert');
        toast.setAttribute('aria-live', 'polite');
        toast.innerHTML = `
            <i class="bi ${iconMap[type] || 'bi-info-circle-fill'} toast-icon" aria-hidden="true"></i>
            <div class="toast-content">${message}</div>
            <button type="button" class="toast-close-btn" aria-label="Close notification" title="Close">&times;</button>
            <div class="toast-progress-bar" style="animation-duration: ${duration}ms;"></div>
        `;

        c.appendChild(toast);

        // Auto-remove after duration (default 5s)
        const timer = setTimeout(() => dismiss(toast), duration);

        // Close button click
        const closeBtn = toast.querySelector('.toast-close-btn');
        if (closeBtn) {
            closeBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                clearTimeout(timer);
                dismiss(toast);
            });
        }

        // Pause on hover
        toast.addEventListener('mouseenter', () => {
            const pb = toast.querySelector('.toast-progress-bar');
            if (pb) pb.style.animationPlayState = 'paused';
        });
        toast.addEventListener('mouseleave', () => {
            const pb = toast.querySelector('.toast-progress-bar');
            if (pb) pb.style.animationPlayState = 'running';
        });
    }

    function dismiss(toast) {
        if (!toast || !toast.parentNode || toast.classList.contains('toast-exit')) return;
        toast.classList.add('toast-exit');
        toast.addEventListener('animationend', () => {
            if (toast.parentNode) toast.remove();
        }, { once: true });
        // Fallback removal if animationend doesn't fire
        setTimeout(() => {
            if (toast.parentNode) toast.remove();
        }, 400);
    }

    return { show, dismiss };
})();

/* ════════════════════════════════════════════════════════
   CLIPBOARD UTILITY
   ════════════════════════════════════════════════════════ */
const SevaClipboard = (() => {
    /**
     * Copy text to clipboard with navigator.clipboard fallback.
     * @param {string} text
     * @returns {Promise<boolean>}
     */
    async function copy(text) {
        try {
            if (navigator.clipboard && window.isSecureContext) {
                await navigator.clipboard.writeText(text);
                return true;
            } else {
                // Fallback: execCommand (deprecated but still works in many browsers)
                const textarea = document.createElement('textarea');
                textarea.value = text;
                textarea.style.position = 'fixed';
                textarea.style.left = '-9999px';
                textarea.style.top  = '-9999px';
                document.body.appendChild(textarea);
                textarea.focus();
                textarea.select();
                const success = document.execCommand('copy');
                document.body.removeChild(textarea);
                return success;
            }
        } catch (err) {
            console.warn('[SevaClipboard] Copy failed:', err);
            return false;
        }
    }

    return { copy };
})();

/* ════════════════════════════════════════════════════════
   SMOOTH SCROLL UTILITY
   ════════════════════════════════════════════════════════ */
const SevaScroll = (() => {
    function scrollToSection(targetId) {
        const target = document.getElementById(targetId);
        if (!target) return;

        const navbarHeight = parseInt(
            getComputedStyle(document.documentElement).getPropertyValue('--navbar-height') || '72',
            10
        );

        const top = target.getBoundingClientRect().top + window.pageYOffset - navbarHeight - 12;

        window.scrollTo({ top, behavior: 'smooth' });
    }

    return { scrollToSection };
})();

/* ════════════════════════════════════════════════════════
   INTERSECTION OBSERVER (Scroll Animations)
   ════════════════════════════════════════════════════════ */
const SevaAnimations = (() => {
    function init() {
        const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

        if (prefersReducedMotion) {
            document.querySelectorAll('.animate-on-scroll').forEach(el => {
                el.classList.add('is-visible');
            });
            return;
        }

        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        entry.target.classList.add('is-visible');
                        observer.unobserve(entry.target);
                    }
                });
            },
            { threshold: 0.12, rootMargin: '0px 0px -40px 0px' }
        );

        document.querySelectorAll('.animate-on-scroll').forEach(el => observer.observe(el));
    }

    return { init };
})();

/* ════════════════════════════════════════════════════════
   COUNTER ANIMATION
   ════════════════════════════════════════════════════════ */
const SevaCounter = (() => {
    function animateValue(el, start, end, duration, suffix = '') {
        let startTime = null;
        const step = (timestamp) => {
            if (!startTime) startTime = timestamp;
            const progress = Math.min((timestamp - startTime) / duration, 1);
            const eased = 1 - Math.pow(1 - progress, 3); // ease-out-cubic
            el.textContent = Math.floor(eased * (end - start) + start).toLocaleString('en-IN') + suffix;
            if (progress < 1) requestAnimationFrame(step);
        };
        requestAnimationFrame(step);
    }

    function init() {
        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        const el = entry.target;
                        const end = parseInt(el.dataset.target || el.textContent, 10);
                        const suffix = el.dataset.suffix || '';
                        animateValue(el, 0, end, 1800, suffix);
                        observer.unobserve(el);
                    }
                });
            },
            { threshold: 0.5 }
        );

        document.querySelectorAll('[data-counter]').forEach(el => observer.observe(el));
    }

    return { init };
})();

/* ════════════════════════════════════════════════════════
   DRIBBBLE-INSPIRED LIQUID / GOOEY LOADER ENGINE
   ════════════════════════════════════════════════════════ */
const SevaLoader = (() => {
    let overlayEl = null;

    function ensureGooeyFilter() {
        if (!document.getElementById('seva-gooey-svg-filter')) {
            const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
            svg.id = 'seva-gooey-svg-filter';
            svg.setAttribute('style', 'position:absolute;width:0;height:0;pointer-events:none;opacity:0;');
            svg.setAttribute('aria-hidden', 'true');
            svg.innerHTML = `
                <defs>
                    <filter id="seva-gooey-effect">
                        <feGaussianBlur in="SourceGraphic" stdDeviation="7" result="blur" />
                        <feColorMatrix in="blur" mode="matrix" values="
                            1 0 0 0 0
                            0 1 0 0 0
                            0 0 1 0 0
                            0 0 0 20 -8" result="goo" />
                        <feComposite in="SourceGraphic" in2="goo" operator="atop" />
                    </filter>
                </defs>
            `;
            document.body.appendChild(svg);
        }
    }

    function getOverlay() {
        ensureGooeyFilter();
        if (!overlayEl) {
            overlayEl = document.getElementById('seva-global-loader');
            if (!overlayEl) {
                overlayEl = document.createElement('div');
                overlayEl.id = 'seva-global-loader';
                overlayEl.className = 'seva-loader-overlay';
                overlayEl.setAttribute('role', 'status');
                overlayEl.setAttribute('aria-live', 'polite');
                overlayEl.innerHTML = `
                    <div class="seva-loader-card">
                        <div class="seva-liquid-stage">
                            <div class="seva-liquid-aura"></div>
                            <div class="seva-liquid-ring"></div>
                            <div class="seva-gooey-scene">
                                <div class="seva-liquid-core"></div>
                                <div class="seva-liquid-drop drop-1"></div>
                                <div class="seva-liquid-drop drop-2"></div>
                                <div class="seva-liquid-drop drop-3"></div>
                            </div>
                            <div class="seva-liquid-brand-symbol">
                                <i class="bi bi-patch-check-fill" id="seva-loader-icon"></i>
                            </div>
                        </div>

                        <div class="seva-loader-title" id="seva-loader-title">Connecting to SevaSetuHub</div>
                        <div class="seva-loader-subtitle" id="seva-loader-subtitle">Please wait while we process your request securely...</div>

                        <div class="seva-loader-status-pill">
                            <span class="seva-loader-pulse-dot"></span>
                            <span id="seva-loader-status">Processing</span>
                        </div>

                        <div class="seva-loader-progress-wrap" id="seva-loader-progress-wrap">
                            <div class="seva-loader-progress-bar" id="seva-loader-progress-bar"></div>
                        </div>
                    </div>
                `;
                document.body.appendChild(overlayEl);
            }
        }
        return overlayEl;
    }

    /**
     * Show the fullscreen Liquid Loader
     * @param {Object} options
     * @param {string} options.title - Header text
     * @param {string} options.subtitle - Description / subtext
     * @param {string} options.statusText - Pill badge status
     * @param {string} options.icon - Bootstrap icon class (e.g. 'bi-tools')
     * @param {number} [options.progress] - Optional percentage 0-100
     */
    function show(options = {}) {
        const overlay = getOverlay();
        const titleEl = overlay.querySelector('#seva-loader-title');
        const subEl = overlay.querySelector('#seva-loader-subtitle');
        const statusEl = overlay.querySelector('#seva-loader-status');
        const iconEl = overlay.querySelector('#seva-loader-icon');
        const progWrap = overlay.querySelector('#seva-loader-progress-wrap');
        const progBar = overlay.querySelector('#seva-loader-progress-bar');

        if (titleEl) titleEl.textContent = options.title || 'Connecting to SevaSetuHub';
        if (subEl) subEl.textContent = options.subtitle || 'Please wait while we process your request securely...';
        if (statusEl) statusEl.textContent = options.statusText || 'Processing';
        if (iconEl && options.icon) iconEl.className = `bi ${options.icon}`;

        if (typeof options.progress === 'number') {
            if (progWrap) progWrap.style.display = 'block';
            if (progBar) progBar.style.width = Math.min(100, Math.max(0, options.progress)) + '%';
        } else {
            if (progWrap) progWrap.style.display = 'none';
        }

        // Force reflow and add active class
        requestAnimationFrame(() => {
            overlay.classList.add('active');
        });
    }

    /**
     * Update active loader text / progress dynamically
     */
    function update(options = {}) {
        if (!overlayEl || !overlayEl.classList.contains('active')) return;
        const titleEl = overlayEl.querySelector('#seva-loader-title');
        const subEl = overlayEl.querySelector('#seva-loader-subtitle');
        const statusEl = overlayEl.querySelector('#seva-loader-status');
        const iconEl = overlayEl.querySelector('#seva-loader-icon');
        const progWrap = overlayEl.querySelector('#seva-loader-progress-wrap');
        const progBar = overlayEl.querySelector('#seva-loader-progress-bar');

        if (options.title && titleEl) titleEl.textContent = options.title;
        if (options.subtitle && subEl) subEl.textContent = options.subtitle;
        if (options.statusText && statusEl) statusEl.textContent = options.statusText;
        if (options.icon && iconEl) iconEl.className = `bi ${options.icon}`;

        if (typeof options.progress === 'number') {
            if (progWrap) progWrap.style.display = 'block';
            if (progBar) progBar.style.width = Math.min(100, Math.max(0, options.progress)) + '%';
        }
    }

    /**
     * Hide and dismiss the liquid loader
     */
    /* ════════════════════════════════════════════════════════
       GLOBAL TOP-BAR DATA FETCH / MANIPULATION PROGRESS BAR
       ════════════════════════════════════════════════════════ */
    let progressBarEl = null;
    let activeRequestCount = 0;
    let progressTimer = null;

    function getProgressBar() {
        if (!progressBarEl) {
            progressBarEl = document.getElementById('seva-top-progress-bar');
            if (!progressBarEl) {
                progressBarEl = document.createElement('div');
                progressBarEl.id = 'seva-top-progress-bar';
                document.body.appendChild(progressBarEl);
            }
        }
        return progressBarEl;
    }

    function startProgress() {
        activeRequestCount++;
        const bar = getProgressBar();
        bar.classList.add('active', 'pulsing');
        if (activeRequestCount === 1) {
            bar.style.width = '30%';
            if (progressTimer) clearInterval(progressTimer);
            let cur = 30;
            progressTimer = setInterval(() => {
                if (cur < 85) {
                    cur += Math.random() * 12;
                    bar.style.width = `${Math.min(cur, 85)}%`;
                }
            }, 180);
        }
    }

    function finishProgress() {
        activeRequestCount = Math.max(0, activeRequestCount - 1);
        if (activeRequestCount === 0) {
            if (progressTimer) {
                clearInterval(progressTimer);
                progressTimer = null;
            }
            const bar = getProgressBar();
            bar.style.width = '100%';
            bar.classList.remove('pulsing');
            setTimeout(() => {
                if (activeRequestCount === 0) {
                    bar.classList.remove('active');
                    setTimeout(() => {
                        if (activeRequestCount === 0) bar.style.width = '0%';
                    }, 300);
                }
            }, 250);
        }
    }

    /**
     * Hide and dismiss the liquid loader
     */
    function hide(delayMs = 0) {
        if (!overlayEl) return;
        setTimeout(() => {
            overlayEl.classList.remove('active');
        }, delayMs);
    }

    /**
     * Get HTML string for embedding inline in tables, cards, or containers
     */
    function getHtml(options = {}) {
        ensureGooeyFilter();
        const title = options.title || 'Loading latest records...';
        const subtitle = options.subtitle || 'Syncing data with cloud ledger';
        const icon = options.icon || 'bi-patch-check-fill';

        return `
            <div class="seva-liquid-inline">
                <div class="seva-liquid-stage">
                    <div class="seva-liquid-aura"></div>
                    <div class="seva-liquid-ring"></div>
                    <div class="seva-gooey-scene">
                        <div class="seva-liquid-core"></div>
                        <div class="seva-liquid-drop drop-1"></div>
                        <div class="seva-liquid-drop drop-2"></div>
                        <div class="seva-liquid-drop drop-3"></div>
                    </div>
                    <div class="seva-liquid-brand-symbol">
                        <i class="bi ${icon}"></i>
                    </div>
                </div>
                <div class="seva-liquid-inline-title">${title}</div>
                <div class="seva-liquid-inline-subtitle">${subtitle}</div>
            </div>
        `;
    }

    // Auto-inject filter when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', ensureGooeyFilter);
    } else {
        ensureGooeyFilter();
    }

    return { show, update, hide, getHtml, startProgress, finishProgress };
})();

/* ════════════════════════════════════════════════════════
   UNIVERSAL BUTTON LOADER ENGINE (Screenshot 2 Spec)
   ════════════════════════════════════════════════════════ */
const SevaButton = (() => {
    /**
     * Set button loading state with spinner and text
     * @param {HTMLElement|jQuery|string} btn - Button element or selector
     * @param {boolean} isLoading - true to enable loading, false to reset
     * @param {string} [loadingText='Processing...'] - Text shown with spinner
     */
    function setLoading(btn, isLoading = true, loadingText = 'Processing...') {
        if (!btn) return;
        const $el = (window.jQuery && (btn instanceof window.jQuery || typeof btn === 'string' || btn instanceof HTMLElement)) ? window.jQuery(btn) : null;
        const domEl = $el && $el.length ? $el[0] : (typeof btn === 'string' ? document.querySelector(btn) : btn);
        if (!domEl) return;

        if (isLoading) {
            if (domEl.dataset.sevaIsLoading === 'true') return;
            
            // Save original attributes & HTML
            domEl.dataset.sevaIsLoading = 'true';
            domEl.dataset.sevaOrigHtml = domEl.innerHTML;
            domEl.dataset.sevaOrigDisabled = domEl.disabled ? 'true' : 'false';
            
            // Lock width to prevent layout jumping
            const currentWidth = domEl.getBoundingClientRect().width;
            if (currentWidth > 0 && !domEl.style.minWidth) {
                domEl.dataset.sevaOrigMinWidth = domEl.style.minWidth || '';
                domEl.style.minWidth = `${Math.ceil(currentWidth)}px`;
            }

            domEl.disabled = true;
            domEl.setAttribute('aria-busy', 'true');
            domEl.classList.add('btn-loading', 'is-loading');

            const textHtml = loadingText ? `<span class="btn-loading-text">${loadingText}</span>` : '';
            domEl.innerHTML = `<span class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>${textHtml}`;
        } else {
            if (domEl.dataset.sevaIsLoading !== 'true') return;

            domEl.classList.remove('btn-loading', 'is-loading');
            domEl.removeAttribute('aria-busy');
            
            if (domEl.dataset.sevaOrigHtml !== undefined) {
                domEl.innerHTML = domEl.dataset.sevaOrigHtml;
                delete domEl.dataset.sevaOrigHtml;
            }

            if (domEl.dataset.sevaOrigMinWidth !== undefined) {
                domEl.style.minWidth = domEl.dataset.sevaOrigMinWidth;
                delete domEl.dataset.sevaOrigMinWidth;
            } else {
                domEl.style.minWidth = '';
            }

            domEl.disabled = domEl.dataset.sevaOrigDisabled === 'true';
            delete domEl.dataset.sevaOrigDisabled;
            delete domEl.dataset.sevaIsLoading;
        }
    }

    function reset(btn) {
        setLoading(btn, false);
    }

    async function wrap(btn, loadingText, asyncFn) {
        setLoading(btn, true, loadingText);
        try {
            return await asyncFn();
        } finally {
            setLoading(btn, false);
        }
    }

    return { setLoading, reset, wrap };
})();

// Export globals
window.SevaToast      = SevaToast;
window.SevaClipboard  = SevaClipboard;
window.SevaScroll     = SevaScroll;
window.SevaAnimations = SevaAnimations;
window.SevaCounter    = SevaCounter;
window.SevaLoader     = SevaLoader;
window.SevaButton     = SevaButton;


