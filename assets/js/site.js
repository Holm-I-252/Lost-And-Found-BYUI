// Shared behaviour for every FoundIt page: icons, header, menu, colour theme,
// scroll reveals, item cards and the item details dialog.
(function () {
    const FoundIt = (window.FoundIt = window.FoundIt || {});
    const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
    FoundIt.reducedMotion = reducedMotion;

    // ---------- Icons ----------

    const ICONS = {
        search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
        pin: '<path d="M12 21s-7-6.2-7-11.5a7 7 0 1 1 14 0C19 14.8 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.5"/>',
        calendar: '<rect x="3.5" y="5" width="17" height="15.5" rx="2.5"/><path d="M3.5 10h17M8 3v4M16 3v4"/>',
        clock: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>',
        sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2.5v2M12 19.5v2M4.6 4.6 6 6M18 18l1.4 1.4M2.5 12h2M19.5 12h2M4.6 19.4 6 18M18 6l1.4-1.4"/>',
        moon: '<path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z"/>',
        menu: '<path d="M4 7h16M4 12h16M4 17h16"/>',
        close: '<path d="M6 6l12 12M18 6 6 18"/>',
        arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>',
        map: '<path d="M9 4 3.5 6v14L9 18l6 2 5.5-2V4L15 6 9 4z"/><path d="M9 4v14M15 6v14"/>',
        grid: '<rect x="4" y="4" width="6.5" height="6.5" rx="1.5"/><rect x="13.5" y="4" width="6.5" height="6.5" rx="1.5"/><rect x="4" y="13.5" width="6.5" height="6.5" rx="1.5"/><rect x="13.5" y="13.5" width="6.5" height="6.5" rx="1.5"/>',
        link: '<path d="M10 14a4.5 4.5 0 0 0 6.4 0l3-3a4.5 4.5 0 0 0-6.4-6.4l-1 1"/><path d="M14 10a4.5 4.5 0 0 0-6.4 0l-3 3a4.5 4.5 0 0 0 6.4 6.4l1-1"/>',
        check: '<path d="m5 12.5 4.5 4.5L19 7.5"/>',
        plus: '<path d="M12 5v14M5 12h14"/>',
        heart: '<path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z"/>',
        shield: '<path d="M12 3 5 6v5.5c0 4.4 3 8 7 9.5 4-1.5 7-5.1 7-9.5V6l-7-3z"/><path d="m9 12 2 2 4-4"/>',
        box: '<path d="M3.5 7.5 12 3l8.5 4.5v9L12 21l-8.5-4.5z"/><path d="M3.5 7.5 12 12l8.5-4.5M12 12v9"/>',
        message: '<path d="M5 5h14a1.5 1.5 0 0 1 1.5 1.5v9A1.5 1.5 0 0 1 19 17h-9l-4.5 3.5V17H5a1.5 1.5 0 0 1-1.5-1.5v-9A1.5 1.5 0 0 1 5 5z"/>',
        sliders: '<path d="M4 7h9M17 7h3M4 17h3M11 17h9"/><circle cx="15" cy="7" r="2"/><circle cx="9" cy="17" r="2"/>',
        refresh: '<path d="M19.5 12a7.5 7.5 0 1 1-2.2-5.3L19.5 9"/><path d="M19.5 4v5h-5"/>'
    };

    function icon(name, extraClass) {
        return `<svg class="icon${extraClass ? ' ' + extraClass : ''}" viewBox="0 0 24 24" aria-hidden="true">${ICONS[name] || ''}</svg>`;
    }
    FoundIt.icon = icon;

    // Turns <i data-icon="search"></i> placeholders in the HTML into real icons.
    function hydrateIcons(root) {
        root.querySelectorAll('i[data-icon]').forEach(el => {
            el.outerHTML = icon(el.dataset.icon, el.className);
        });
    }

    // ---------- Theme ----------

    function currentTheme() {
        return document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light';
    }

    function paintThemeButtons() {
        const dark = currentTheme() === 'dark';
        document.querySelectorAll('[data-theme-toggle]').forEach(button => {
            button.innerHTML = icon(dark ? 'sun' : 'moon');
            button.setAttribute('aria-label', dark ? 'Switch to light mode' : 'Switch to dark mode');
        });
    }

    function setTheme(theme) {
        document.documentElement.dataset.theme = theme;
        try {
            localStorage.setItem('foundit-theme', theme);
        } catch (error) {
            // Private mode: the theme just won't be remembered.
        }
        paintThemeButtons();
        document.dispatchEvent(new CustomEvent('foundit:theme', { detail: theme }));
    }

    // ---------- Header and menu ----------

    function setUpHeader() {
        const header = document.querySelector('.site-header');
        if (!header) return;
        const menuButton = header.querySelector('[data-menu-toggle]');
        const nav = document.getElementById('site-nav');
        const phone = matchMedia('(max-width: 760px)');

        // On phones the header slides away while scrolling down and comes back on the way up.
        const setHidden = hidden => {
            header.classList.toggle('is-hidden', hidden);
            document.documentElement.classList.toggle('header-hidden', hidden);
        };
        let lastY = window.scrollY;
        const onScroll = () => {
            const y = window.scrollY;
            header.classList.toggle('is-scrolled', y > 12);
            const menuOpen = nav && nav.classList.contains('is-open');
            if (phone.matches && !menuOpen && y > 140 && y > lastY + 4) setHidden(true);
            else if (y < lastY - 4 || y <= 140 || !phone.matches) setHidden(false);
            lastY = y;
        };
        window.addEventListener('scroll', onScroll, { passive: true });
        onScroll();

        if (!menuButton || !nav) return;

        const setMenu = open => {
            nav.classList.toggle('is-open', open);
            header.classList.toggle('menu-open', open);
            document.documentElement.classList.toggle('menu-open', open);
            if (open) setHidden(false);
            menuButton.setAttribute('aria-expanded', String(open));
            menuButton.innerHTML = icon(open ? 'close' : 'menu');
            menuButton.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
        };
        setMenu(false);
        menuButton.addEventListener('click', () => setMenu(!nav.classList.contains('is-open')));
        document.addEventListener('keydown', event => {
            if (event.key === 'Escape' && nav.classList.contains('is-open')) setMenu(false);
        });
        nav.addEventListener('click', event => {
            if (event.target.closest('a')) setMenu(false);
        });
        // A tap anywhere outside the open menu closes it.
        document.addEventListener('click', event => {
            if (nav.classList.contains('is-open') && !nav.contains(event.target) && !menuButton.contains(event.target)) setMenu(false);
        });
    }

    // Drag a bottom sheet down by its top edge to close it (phones).
    function swipeToClose(handle, sheet, close) {
        if (!handle || !sheet) return;
        let startY = null;
        let distance = 0;
        handle.addEventListener(
            'touchstart',
            event => {
                if (sheet.scrollTop > 0) return;
                startY = event.touches[0].clientY;
                distance = 0;
                sheet.style.transition = 'none';
            },
            { passive: true }
        );
        handle.addEventListener(
            'touchmove',
            event => {
                if (startY === null) return;
                distance = Math.max(0, event.touches[0].clientY - startY);
                sheet.style.transform = `translateY(${distance}px)`;
            },
            { passive: true }
        );
        handle.addEventListener('touchend', () => {
            if (startY === null) return;
            startY = null;
            sheet.style.transition = '';
            sheet.style.transform = '';
            if (distance > 90) close();
        });
    }
    FoundIt.swipeToClose = swipeToClose;

    // ---------- Motion ----------

    // Elements with data-reveal fade up the first time they scroll into view.
    function reveal(root) {
        const items = (root || document).querySelectorAll('[data-reveal]:not(.is-visible)');
        if (reducedMotion || !('IntersectionObserver' in window)) {
            items.forEach(el => el.classList.add('is-visible'));
            return;
        }
        const observer = new IntersectionObserver(
            entries => {
                entries.forEach(entry => {
                    if (!entry.isIntersecting) return;
                    entry.target.classList.add('is-visible');
                    observer.unobserve(entry.target);
                });
            },
            { rootMargin: '0px 0px -6% 0px' }
        );
        items.forEach(el => observer.observe(el));
    }
    FoundIt.reveal = reveal;

    function countUp(el, to) {
        if (reducedMotion) {
            el.textContent = to;
            return;
        }
        const start = performance.now();
        const duration = 1300;
        const step = now => {
            const t = Math.min(1, (now - start) / duration);
            el.textContent = Math.round(to * (1 - Math.pow(1 - t, 3)));
            if (t < 1) requestAnimationFrame(step);
        };
        requestAnimationFrame(step);
    }
    FoundIt.countUp = countUp;

    // Cards with data-tilt lean toward the mouse and catch a soft glare.
    function setUpTilt() {
        if (reducedMotion || !matchMedia('(hover: hover) and (pointer: fine)').matches) return;
        document.addEventListener(
            'pointermove',
            event => {
                const card = event.target.closest && event.target.closest('[data-tilt]');
                if (!card) return;
                const rect = card.getBoundingClientRect();
                const x = (event.clientX - rect.left) / rect.width - 0.5;
                const y = (event.clientY - rect.top) / rect.height - 0.5;
                card.style.setProperty('--rx', `${(-y * 6).toFixed(2)}deg`);
                card.style.setProperty('--ry', `${(x * 8).toFixed(2)}deg`);
                card.style.setProperty('--mx', `${((x + 0.5) * 100).toFixed(1)}%`);
                card.style.setProperty('--my', `${((y + 0.5) * 100).toFixed(1)}%`);
            },
            { passive: true }
        );
        document.addEventListener('pointerout', event => {
            const card = event.target.closest && event.target.closest('[data-tilt]');
            if (card && !card.contains(event.relatedTarget)) {
                card.style.removeProperty('--rx');
                card.style.removeProperty('--ry');
            }
        });
    }

    // The progress line on the "How to claim" timeline fills as you scroll.
    function setUpTimeline() {
        const timeline = document.querySelector('[data-timeline]');
        if (!timeline) return;
        const update = () => {
            const rect = timeline.getBoundingClientRect();
            const progress = Math.min(1, Math.max(0, (window.innerHeight * 0.62 - rect.top) / rect.height));
            timeline.style.setProperty('--progress', `${(progress * 100).toFixed(1)}%`);
            timeline.querySelectorAll('.t-step').forEach(step => {
                const top = step.getBoundingClientRect().top;
                step.classList.toggle('is-reached', top < window.innerHeight * 0.62);
            });
        };
        window.addEventListener('scroll', update, { passive: true });
        window.addEventListener('resize', update);
        update();
    }

    // ---------- Toast ----------

    function toast(message) {
        let el = document.querySelector('.toast');
        if (!el) {
            el = document.createElement('div');
            el.className = 'toast';
            el.setAttribute('role', 'status');
            document.body.appendChild(el);
        }
        el.textContent = message;
        el.classList.add('is-visible');
        clearTimeout(el.hideTimer);
        el.hideTimer = setTimeout(() => el.classList.remove('is-visible'), 2600);
    }
    FoundIt.toast = toast;

    // ---------- Item cards ----------

    function badge(text, className) {
        const span = document.createElement('span');
        span.className = `badge ${className}`;
        span.textContent = text;
        return span;
    }

    function badgesFor(report) {
        const list = [badge(report.type === 'lost' ? 'Lost' : 'Found', `badge--${report.type}`)];
        if (report.resolved) list.push(badge(report.status, 'badge--resolved'));
        if (report.sample) list.push(badge('Sample', 'badge--sample'));
        return list;
    }

    // Shows the photo once it loads; if the link is broken the emoji stays.
    function addPhoto(container, src, alt) {
        const img = new Image();
        img.alt = alt;
        img.loading = 'lazy';
        img.decoding = 'async';
        img.addEventListener('load', () => container.classList.add('has-photo'));
        img.addEventListener('error', () => img.remove());
        img.src = src;
        container.prepend(img);
    }

    function placeLabel(report) {
        if (report.building) return report.building.short;
        return report.location || 'Somewhere on campus';
    }

    // Builds one card. Everything people typed goes in with textContent, never as HTML.
    function renderCard(report, index) {
        const card = document.createElement('a');
        card.className = `item-card${report.resolved ? ' is-resolved' : ''}`;
        card.href = `items.html#item=${report.id}`;
        card.dataset.id = report.id;
        card.setAttribute('data-reveal', '');
        card.setAttribute('data-tilt', '');
        card.style.setProperty('--i', String((index || 0) % 8));
        card.style.setProperty('--hue', String(report.category.hue));
        card.innerHTML = `
            <div class="item-card__media"><span class="item-card__emoji" aria-hidden="true"></span></div>
            <div class="item-card__badges"></div>
            <div class="item-card__body">
                <h2 class="item-card__title"></h2>
                <p class="item-card__desc"></p>
                <div class="item-card__meta">
                    <span class="meta-place">${icon('pin')}<span></span></span>
                    <span class="meta-when">${icon('clock')}<span></span></span>
                </div>
            </div>`;
        const media = card.querySelector('.item-card__media');
        card.querySelector('.item-card__emoji').textContent = report.emoji;
        if (report.image) addPhoto(media, report.image, report.item);
        card.querySelector('.item-card__badges').append(...badgesFor(report));
        card.querySelector('.item-card__title').textContent = report.item;
        card.querySelector('.item-card__desc').textContent = report.description || 'No description yet.';
        card.querySelector('.meta-place span').textContent = placeLabel(report);
        card.querySelector('.meta-when span').textContent = `${report.type === 'lost' ? 'Lost' : 'Found'} ${FoundIt.timeAgo(report.when) || 'recently'}`;
        return card;
    }
    FoundIt.renderCard = renderCard;
    FoundIt.placeLabel = placeLabel;

    // ---------- Item details dialog ----------

    let dialog;

    function ensureDialog() {
        if (dialog) return dialog;
        dialog = document.createElement('dialog');
        dialog.className = 'item-dialog';
        dialog.setAttribute('aria-labelledby', 'itemDialogTitle');
        dialog.innerHTML = `
            <span class="item-dialog__grabber" aria-hidden="true"></span>
            <div class="item-dialog__media"><span class="item-dialog__emoji" aria-hidden="true"></span></div>
            <button type="button" class="item-dialog__close" data-close aria-label="Close details">${icon('close')}</button>
            <div class="item-dialog__body">
                <div class="item-dialog__badges"></div>
                <h2 id="itemDialogTitle"></h2>
                <p class="item-dialog__desc"></p>
                <dl class="details"></dl>
                <div class="item-dialog__actions"></div>
                <p class="item-dialog__note"></p>
            </div>`;
        document.body.appendChild(dialog);
        dialog.addEventListener('click', event => {
            // A click on the dialog itself (not its content) is a click on the backdrop.
            if (event.target === dialog || event.target.closest('[data-close]')) dialog.close();
        });
        dialog.addEventListener('close', () => {
            document.documentElement.classList.remove('dialog-open');
            document.dispatchEvent(new CustomEvent('foundit:dialogclose'));
        });
        // On phones the details open as a bottom sheet; pull the picture down to close it.
        swipeToClose(dialog.querySelector('.item-dialog__media'), dialog, () => dialog.close());
        return dialog;
    }

    function actionLink(text, href, iconName, className) {
        const a = document.createElement('a');
        a.className = className;
        a.href = href;
        a.innerHTML = icon(iconName);
        a.append(text);
        return a;
    }

    function actionButton(text, iconName, className) {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = className;
        button.innerHTML = icon(iconName);
        button.append(text);
        return button;
    }

    function itemUrl(report) {
        const url = new URL('items.html', window.location.href);
        url.search = '';
        url.hash = `item=${report.id}`;
        return url.href;
    }

    function copyLink(report) {
        const link = itemUrl(report);
        const fallback = () => window.prompt('Copy this link:', link);
        if (navigator.clipboard && window.isSecureContext) {
            navigator.clipboard.writeText(link).then(() => toast('Link copied. Share it with a friend!'), fallback);
        } else {
            fallback();
        }
    }

    function openItem(report, options) {
        const { onMap } = options || {};
        const d = ensureDialog();
        d.style.setProperty('--hue', String(report.category.hue));

        const media = d.querySelector('.item-dialog__media');
        media.querySelectorAll('img').forEach(img => img.remove());
        media.classList.remove('has-photo');
        d.querySelector('.item-dialog__emoji').textContent = report.emoji;
        if (report.image) addPhoto(media, report.image, report.item);

        d.querySelector('.item-dialog__badges').replaceChildren(...badgesFor(report), badge(report.category.label, 'badge--category'));
        d.querySelector('h2').textContent = report.item;
        d.querySelector('.item-dialog__desc').textContent = report.description || 'No description was given.';

        const lost = report.type === 'lost';
        const rows = [
            [lost ? 'Last seen' : 'Found at', report.location || 'Not given'],
            ['Building', report.building ? report.building.name : ''],
            [lost ? 'Date lost' : 'Date found', FoundIt.formatDate(report.happenedAt)],
            ['Reported', report.reportedAt ? `${FoundIt.formatDate(report.reportedAt)} (${FoundIt.timeAgo(report.reportedAt)})` : ''],
            ['Status', report.status],
            ...report.extras.map(field => [field.label, field.value])
        ];
        const details = d.querySelector('.details');
        details.replaceChildren();
        rows.filter(([, value]) => value).forEach(([label, value]) => {
            const dt = document.createElement('dt');
            dt.textContent = label;
            const dd = document.createElement('dd');
            dd.textContent = value;
            details.append(dt, dd);
        });

        const actions = d.querySelector('.item-dialog__actions');
        actions.replaceChildren();
        if (lost) actions.append(actionLink('I found this', 'report.html?type=found', 'check', 'btn btn--primary'));
        else actions.append(actionLink('This is mine', 'claim.html', 'heart', 'btn btn--primary'));
        if (onMap && report.building) {
            const mapButton = actionButton('Show on map', 'map', 'btn btn--ghost');
            mapButton.addEventListener('click', () => {
                d.close();
                onMap(report);
            });
            actions.append(mapButton);
        }
        const copyButton = actionButton('Copy link', 'link', 'btn btn--ghost');
        copyButton.addEventListener('click', () => copyLink(report));
        actions.append(copyButton);

        d.querySelector('.item-dialog__note').textContent = report.sample
            ? 'This is a sample item that shows how the board works.'
            : lost
            ? 'Seen it somewhere? Report it as found and tell us where it is now.'
            : 'Think it’s yours? Be ready to describe a detail that isn’t listed here.';

        if (!d.open) d.showModal();
        document.documentElement.classList.add('dialog-open');
    }
    FoundIt.openItem = openItem;

    // ---------- Start ----------

    document.addEventListener('DOMContentLoaded', () => {
        hydrateIcons(document);
        paintThemeButtons();
        document.querySelectorAll('[data-theme-toggle]').forEach(button => {
            button.addEventListener('click', () => setTheme(currentTheme() === 'dark' ? 'light' : 'dark'));
        });
        setUpHeader();
        setUpTilt();
        setUpTimeline();
        reveal(document);
    });
})();
