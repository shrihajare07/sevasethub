/**
 * SevaSetuHub – Lightweight i18n Engine
 * assets/js/i18n.js
 *
 * Architecture:
 *  - data-i18n="key"             → sets element.textContent
 *  - data-i18n-html="key"        → sets element.innerHTML (trusted content only)
 *  - data-i18n-placeholder="key" → sets input/select placeholder attribute
 *  - data-i18n-aria="key"        → sets aria-label attribute
 *  - data-i18n-title="key"       → sets title attribute
 *
 * Adding a new language:
 *  1. Create assets/i18n/<code>.json
 *  2. Add one entry to SUPPORTED_LANGUAGES below
 *  3. Done — no HTML changes needed
 */

'use strict';

const SevaI18n = (() => {

    /* ══════════════════════════════════════════════════════
       CONFIGURATION
       Add new languages here. No other changes needed.
       ══════════════════════════════════════════════════════ */
    const SUPPORTED_LANGUAGES = {
        en: {
            name:       'English',
            nativeName: 'English',
            label:      'EN',
            flag:       '🇬🇧',
            dir:        'ltr',
            fontClass:  '',
        },
        mr: {
            name:       'Marathi',
            nativeName: 'मराठी',
            label:      'मराठी',
            flag:       '🇮🇳',
            dir:        'ltr',
            fontClass:  'lang-devanagari',
        },
        // To add Hindi later:
        // hi: {
        //     name:       'Hindi',
        //     nativeName: 'हिन्दी',
        //     label:      'हिन्दी',
        //     flag:       '🇮🇳',
        //     dir:        'ltr',
        //     fontClass:  'lang-devanagari',
        // },
    };

    const STORAGE_KEY      = 'setu_lang';
    const DEFAULT_LANG     = 'en';

    /**
     * Resolves the correct base path for i18n JSON files regardless of whether
     * the site is loaded from repo root (/), a subfolder (/frontend/), or a GitHub Pages URL (/repo-name/).
     */
    function getI18nBasePath() {
        const script = document.querySelector('script[src*="i18n.js"]');
        if (script) {
            const src = script.getAttribute('src');
            const idx = src.lastIndexOf('/js/i18n.js');
            if (idx !== -1) {
                return src.substring(0, idx) + '/i18n/';
            }
            if (src.includes('i18n.js')) {
                // If src is "assets/js/i18n.js" or "./assets/js/i18n.js"
                const dir = src.substring(0, src.lastIndexOf('/'));
                return dir.replace(/\/js$/, '/i18n/') + '/';
            }
        }
        return 'assets/i18n/';
    }

    // In-memory cache so we never re-fetch the same locale
    const cache = {};

    // Active translations object (flat dot-notation resolved)
    let _strings  = {};
    let _lang     = DEFAULT_LANG;
    let _ready    = false;

    // Callbacks registered before init completes
    const _readyCallbacks = [];

    /* ══════════════════════════════════════════════════════
       INTERNAL – Flatten nested JSON to dot-notation
       e.g. { nav: { home: "Home" } } → { "nav.home": "Home" }
       ══════════════════════════════════════════════════════ */
    function flatten(obj, prefix = '', result = {}) {
        for (const key of Object.keys(obj)) {
            const fullKey = prefix ? `${prefix}.${key}` : key;
            if (obj[key] !== null && typeof obj[key] === 'object' && !Array.isArray(obj[key])) {
                flatten(obj[key], fullKey, result);
            } else {
                result[fullKey] = String(obj[key]);
            }
        }
        return result;
    }

    /* ══════════════════════════════════════════════════════
       INTERNAL – Load a locale JSON file
       ══════════════════════════════════════════════════════ */
    async function loadLocale(lang) {
        if (cache[lang]) return cache[lang];

        const basePath = getI18nBasePath();
        const candidatePaths = [
            `${basePath}${lang}.json`,
            `assets/i18n/${lang}.json`,
            `./assets/i18n/${lang}.json`,
            `../assets/i18n/${lang}.json`
        ];

        // Deduplicate
        const pathsToTry = [...new Set(candidatePaths)];

        for (const path of pathsToTry) {
            try {
                const res = await fetch(path, { cache: 'default' });
                if (res.ok) {
                    const json = await res.json();
                    cache[lang] = flatten(json);
                    return cache[lang];
                }
            } catch (e) {
                // Try next candidate
            }
        }

        console.warn(`[SevaI18n] Could not load locale "${lang}" from paths:`, pathsToTry);
        return null;
    }

    /* ══════════════════════════════════════════════════════
       INTERNAL – Apply translations to the DOM
       ══════════════════════════════════════════════════════ */
    function applyTranslations() {
        // data-i18n → textContent
        document.querySelectorAll('[data-i18n]').forEach(el => {
            const key = el.getAttribute('data-i18n');
            const val = _strings[key];
            if (val !== undefined) el.textContent = val;
        });

        // data-i18n-html → innerHTML (only our own trusted strings)
        document.querySelectorAll('[data-i18n-html]').forEach(el => {
            const key = el.getAttribute('data-i18n-html');
            const val = _strings[key];
            if (val !== undefined) el.innerHTML = val;
        });

        // data-i18n-placeholder → placeholder attribute
        document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
            const key = el.getAttribute('data-i18n-placeholder');
            const val = _strings[key];
            if (val !== undefined) el.setAttribute('placeholder', val);
        });

        // data-i18n-aria → aria-label attribute
        document.querySelectorAll('[data-i18n-aria]').forEach(el => {
            const key = el.getAttribute('data-i18n-aria');
            const val = _strings[key];
            if (val !== undefined) el.setAttribute('aria-label', val);
        });

        // data-i18n-title → title attribute
        document.querySelectorAll('[data-i18n-title]').forEach(el => {
            const key = el.getAttribute('data-i18n-title');
            const val = _strings[key];
            if (val !== undefined) el.setAttribute('title', val);
        });

        // <select> option elements – update text of translated <option>s
        document.querySelectorAll('option[data-i18n]').forEach(el => {
            const key = el.getAttribute('data-i18n');
            const val = _strings[key];
            if (val !== undefined) el.textContent = val;
        });
    }

    /* ══════════════════════════════════════════════════════
       INTERNAL – Update <html> lang and dir + body font class
       ══════════════════════════════════════════════════════ */
    function applyLangAttrs(lang) {
        const config = SUPPORTED_LANGUAGES[lang] || SUPPORTED_LANGUAGES[DEFAULT_LANG];
        const html   = document.documentElement;

        html.setAttribute('lang', lang);
        html.setAttribute('dir',  config.dir);

        // Font class: remove all lang-* classes, apply new one
        document.body.classList.remove(
            ...Object.values(SUPPORTED_LANGUAGES)
                .map(l => l.fontClass)
                .filter(Boolean)
        );
        if (config.fontClass) {
            document.body.classList.add(config.fontClass);
        }

        // Update page <title> if translation exists
        const titleStr = _strings['meta.title'];
        if (titleStr) document.title = titleStr;

        // Update meta description
        const descEl = document.querySelector('meta[name="description"]');
        const descStr = _strings['meta.description'];
        if (descEl && descStr) descEl.setAttribute('content', descStr);
    }

    /* ══════════════════════════════════════════════════════
       INTERNAL – Update language switcher button states
       ══════════════════════════════════════════════════════ */
    function updateSwitcherUI(lang) {
        document.querySelectorAll('[data-lang-btn]').forEach(btn => {
            const btnLang = btn.getAttribute('data-lang-btn');
            btn.classList.toggle('lang-btn-active', btnLang === lang);
            btn.setAttribute('aria-pressed', String(btnLang === lang));
        });
    }

    /* ══════════════════════════════════════════════════════
       INTERNAL – Detect preferred language
       Priority: localStorage → browser → default
       ══════════════════════════════════════════════════════ */
    function detectLanguage() {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored && SUPPORTED_LANGUAGES[stored]) return stored;

        // Try browser language (e.g. "mr-IN" → "mr")
        const browserLangs = navigator.languages || [navigator.language || DEFAULT_LANG];
        for (const bl of browserLangs) {
            const code = bl.split('-')[0].toLowerCase();
            if (SUPPORTED_LANGUAGES[code]) return code;
        }

        return DEFAULT_LANG;
    }

    /* ══════════════════════════════════════════════════════
       PUBLIC API
       ══════════════════════════════════════════════════════ */

    /**
     * Translate a key. Returns the English fallback if key missing in current locale.
     * @param {string} key  Dot-notation key e.g. "nav.home"
     * @param {string} [fallback] Optional fallback text
     * @returns {string}
     */
    function t(key, fallback = '') {
        return _strings[key] !== undefined ? _strings[key] : (cache[DEFAULT_LANG]?.[key] || fallback || key);
    }

    /**
     * Get the currently active language code.
     * @returns {string}
     */
    function currentLang() {
        return _lang;
    }

    /**
     * Get the supported language config map.
     * @returns {Object}
     */
    function getSupportedLanguages() {
        return SUPPORTED_LANGUAGES;
    }

    /**
     * Switch the page to a new language.
     * @param {string} lang  Language code (e.g. "mr")
     * @param {boolean} [notify=true]  Show a toast notification
     */
    async function setLanguage(lang, notify = true) {
        if (!SUPPORTED_LANGUAGES[lang]) {
            console.warn(`[SevaI18n] Unsupported language: "${lang}"`);
            return;
        }

        // Always pre-load English as fallback
        if (!cache[DEFAULT_LANG]) {
            await loadLocale(DEFAULT_LANG);
        }

        const strings = await loadLocale(lang);
        if (!strings) {
            console.warn(`[SevaI18n] Falling back to "${DEFAULT_LANG}"`);
            _strings = cache[DEFAULT_LANG] || {};
            _lang    = DEFAULT_LANG;
        } else {
            // Merge: fallback keys from English fill any gaps in target locale
            _strings = Object.assign({}, cache[DEFAULT_LANG] || {}, strings);
            _lang    = lang;
        }

        localStorage.setItem(STORAGE_KEY, _lang);
        applyLangAttrs(_lang);
        applyTranslations();
        updateSwitcherUI(_lang);

        // Notify landing.js to re-render dynamic cards
        document.dispatchEvent(new CustomEvent('setu:langchange', { detail: { lang: _lang } }));

        if (notify && typeof SevaToast !== 'undefined') {
            const msg = t('lang.switched');
            SevaToast.show(msg, 'info', 2500);
        }
    }

    /**
     * Initialise i18n: detect language, load strings, apply to DOM.
     * Call once on DOMContentLoaded.
     */
    async function init() {
        const lang = detectLanguage();

        // Pre-load English baseline (always needed as fallback)
        await loadLocale(DEFAULT_LANG);

        // Load target locale (may be same as English)
        await setLanguage(lang, false);

        _ready = true;
        _readyCallbacks.forEach(cb => cb(_lang));
        _readyCallbacks.length = 0;
    }

    /**
     * Register a callback to run once i18n is ready.
     * If already ready, fires immediately.
     * @param {Function} cb
     */
    function onReady(cb) {
        if (_ready) {
            cb(_lang);
        } else {
            _readyCallbacks.push(cb);
        }
    }

    /* ══════════════════════════════════════════════════════
       LANGUAGE SWITCHER – Build the UI widget
       ══════════════════════════════════════════════════════ */
    function buildSwitcher(containerId) {
        const container = document.getElementById(containerId);
        if (!container) return;

        container.innerHTML = '';
        container.setAttribute('role', 'group');
        container.setAttribute('aria-label', t('lang.select_aria') || 'Select language');

        Object.entries(SUPPORTED_LANGUAGES).forEach(([code, config]) => {
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'lang-btn';
            btn.setAttribute('data-lang-btn', code);
            btn.setAttribute('aria-pressed', String(code === _lang));
            btn.setAttribute('title', config.nativeName);
            btn.setAttribute('aria-label', `Switch to ${config.name}`);
            btn.innerHTML = `<span class="lang-btn-label">${config.label}</span>`;

            btn.addEventListener('click', () => setLanguage(code, true));
            container.appendChild(btn);
        });

        updateSwitcherUI(_lang);
    }

    // ── Auto-init on DOM ready ────────────────────────────
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    return { t, currentLang, getSupportedLanguages, setLanguage, onReady, buildSwitcher };

})();

// Export globally
window.SevaI18n = SevaI18n;
