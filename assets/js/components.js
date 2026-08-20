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

// Export globals
window.SevaToast      = SevaToast;
window.SevaClipboard  = SevaClipboard;
window.SevaScroll     = SevaScroll;
window.SevaAnimations = SevaAnimations;
window.SevaCounter    = SevaCounter;
