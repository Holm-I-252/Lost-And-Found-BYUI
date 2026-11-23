// Report page: pick "lost" or "found", then the matching form opens below.
// The lost and found forms are built here in the site's own style. Each report is sent
// to the team's Google Form (so it lands in the response sheet) and saved in this browser,
// so it shows up on the Browse page right away.
// The choice is kept in the URL (?type=found).
// found_items.html reuses this file: its frame has data-autoload, so its Google Form opens right away.
(function () {
    const FoundIt = window.FoundIt;
    const config = window.FOUNDIT_CONFIG || {};
    const FORMS = { lost: config.lostForm, found: config.foundForm, confirm: config.confirmFoundForm };
    const TITLES = { lost: 'Lost item report form', found: 'Found item report form', confirm: 'Confirm you found your item form' };
    // Embedded Google Forms can't grow to fit, so each frame gets its form's measured height:
    // [wide screens, phones]. Forms get taller when the screen is narrow.
    const HEIGHTS = { lost: [1150, 1340], found: [2300, 2640], confirm: [1060, 1140] };
    const phone = matchMedia('(max-width: 600px)');

    function frameHeight(type) {
        return `${HEIGHTS[type][phone.matches ? 1 : 0]}px`;
    }

    function embedUrl(link) {
        const url = new URL(link);
        url.searchParams.set('embedded', 'true');
        return url.href;
    }

    // Shown instead of a form whose link isn't in config.js yet.
    function comingSoon(frame, type) {
        frame.classList.add('is-loaded');
        const box = document.createElement('div');
        box.className = 'coming-soon';
        box.innerHTML = `
            <div class="coming-soon__art" aria-hidden="true">🛠️</div>
            <h3>This form is almost ready</h3>
            <p></p>
            <a class="btn btn--primary" href="items.html">Browse the board</a>`;
        box.querySelector('p').textContent = type === 'found'
            ? 'Our team is finishing the found-item form. Until then, please keep the item safe or leave it at the front desk of the building where you found it, and check back soon.'
            : 'Our team is finishing this form. Please check back soon.';
        frame.appendChild(box);
    }

    // ---------- Site forms (lost and found) ----------

    const ENTRIES = { lost: config.lostFormEntries, found: config.foundFormEntries };
    const TURNED_IN = 'I turned it in (tell us where below)';
    const WHERE_NOW = [
        ['I still have it', 'I still have it'],
        [TURNED_IN, 'I turned it in'],
        ['I left it where I found it', 'I left it where I found it']
    ];

    function todayValue() {
        const now = new Date();
        const pad = n => String(n).padStart(2, '0');
        return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
    }

    function formHtml(type) {
        const lost = type === 'lost';
        const id = name => `${type}-${name}`;
        const whereNow = lost ? '' : `
            <fieldset class="rf-field rf-field--wide">
                <legend class="field-label">Where is the item now? <span class="rf-req">Required</span></legend>
                <div class="rf-options">
                    ${WHERE_NOW.map(([value, label], i) => `
                    <label class="rf-option"><input type="radio" name="whereNow" value="${value}" required${i === 0 ? ' checked' : ''}><span>${label}</span></label>`).join('')}
                </div>
            </fieldset>
            <div class="rf-field rf-field--wide" data-turned-in hidden>
                <label class="field-label" for="${id('turnedInAt')}">Where did you turn it in? <span class="rf-req">Required</span></label>
                <input class="input" id="${id('turnedInAt')}" name="turnedInAt" maxlength="120" placeholder="e.g., the front desk of the STC" disabled>
            </div>`;
        const contact = lost ? '' : `
            <div class="rf-private rf-field--wide">
                <p class="rf-private__title">${FoundIt.icon('shield')}Your contact info</p>
                <p class="rf-hint">Only the FoundIt team sees this, so we can connect you with the owner. It is never shown on the website.</p>
                <div class="rf-grid">
                    <div class="rf-field">
                        <label class="field-label" for="${id('name')}">Your name <span class="rf-req">Required</span></label>
                        <input class="input" id="${id('name')}" name="name" autocomplete="name" maxlength="80" required>
                    </div>
                    <div class="rf-field">
                        <label class="field-label" for="${id('email')}">Your email <span class="rf-req">Required</span></label>
                        <input class="input" id="${id('email')}" name="email" type="email" autocomplete="email" maxlength="120" required>
                    </div>
                </div>
            </div>`;
        return `
            <form class="report-form" novalidate>
                <div class="rf-grid">
                    <div class="rf-field">
                        <label class="field-label" for="${id('item')}">Item <span class="rf-req">Required</span></label>
                        <input class="input" id="${id('item')}" name="item" maxlength="80" required placeholder="e.g., Blue backpack, car keys">
                    </div>
                    <div class="rf-field">
                        <label class="field-label" for="${id('date')}">${lost ? 'Date lost' : 'Date found'} <span class="rf-req">Required</span></label>
                        <input class="input" id="${id('date')}" name="date" type="date" required max="${todayValue()}" value="${todayValue()}">
                    </div>
                    <div class="rf-field rf-field--wide">
                        <label class="field-label" for="${id('description')}">Description <span class="rf-req">Required</span></label>
                        <textarea class="input rf-textarea" id="${id('description')}" name="description" rows="4" maxlength="600" required placeholder="Color, brand, size, stickers or other marks."></textarea>
                        <p class="rf-hint">Don’t include card or ID numbers.${lost ? '' : ' Keep one detail to yourself so the real owner can prove it’s theirs.'}</p>
                    </div>
                    <div class="rf-field rf-field--wide">
                        <label class="field-label" for="${id('location')}">${lost ? 'Where did you last have it?' : 'Where did you find it?'} <span class="rf-req">Required</span></label>
                        <input class="input" id="${id('location')}" name="location" maxlength="120" required placeholder="Building and area, e.g., McKay Library, 2nd floor">
                    </div>
                    <div class="rf-field rf-field--wide">
                        <label class="field-label" for="${id('image')}">Photo link <span class="rf-optional">Optional</span></label>
                        <input class="input" id="${id('image')}" name="image" type="url" inputmode="url" maxlength="500" placeholder="https://drive.google.com/…">
                        <p class="rf-hint">Share it from Google Drive or Photos so anyone with the link can see it.</p>
                    </div>
                    ${whereNow}
                    ${contact}
                </div>
                <p class="rf-error" role="alert" hidden></p>
                <div class="rf-actions">
                    <button class="btn btn--primary" type="submit">${FoundIt.icon('check')}${lost ? 'Post my lost item' : 'Post the found item'}</button>
                    <p class="rf-hint">Everything above the contact info is public on the board.</p>
                </div>
            </form>`;
    }

    // Sends the answers to the Google Form, the same as filling it in on Google.
    // Google doesn't let other sites read its reply, so a sent request counts as done.
    function sendToGoogle(type, values) {
        const entries = ENTRIES[type];
        if (!FORMS[type] || !entries) return Promise.resolve(false);
        const body = new URLSearchParams();
        const add = (key, value) => {
            if (entries[key] && value) body.append(`entry.${entries[key]}`, value);
        };
        ['item', 'description', 'location', 'image', 'whereNow', 'turnedInAt', 'name', 'email'].forEach(key => add(key, values[key]));
        const [year, month, day] = values.date.split('-');
        if (entries.date) {
            body.append(`entry.${entries.date}_year`, year);
            body.append(`entry.${entries.date}_month`, String(Number(month)));
            body.append(`entry.${entries.date}_day`, String(Number(day)));
        }
        const url = FORMS[type].replace(/\/viewform.*$/, '/formResponse');
        return fetch(url, { method: 'POST', mode: 'no-cors', body }).then(() => true, () => false);
    }

    function showError(form, message) {
        const box = form.querySelector('.rf-error');
        box.textContent = message;
        box.hidden = !message;
    }

    function showDone(frame, report, sent) {
        const lost = report.type === 'lost';
        const box = document.createElement('div');
        box.className = 'coming-soon report-done';
        box.innerHTML = `
            <div class="coming-soon__art" aria-hidden="true">${lost ? '📣' : '🎉'}</div>
            <h3 tabindex="-1"></h3>
            <p></p>
            <div class="btn-row">
                <a class="btn btn--primary" data-see>${FoundIt.icon('arrow')}See it on the board</a>
                <button class="btn btn--ghost" type="button" data-again>${FoundIt.icon('refresh')}Report another item</button>
            </div>`;
        box.querySelector('h3').textContent = lost ? 'Your lost item is on the board' : 'Thanks! The found item is on the board';
        box.querySelector('p').textContent = (lost
            ? 'Finders can now match it on the Browse page. Check back for found items that look like yours.'
            : 'The owner can now find it on the Browse page. The FoundIt team will email you if someone claims it.')
            + (sent ? '' : ' We couldn’t reach Google Forms just now, so the team may not have it yet. It is still saved on this device.');
        box.querySelector('[data-see]').href = `items.html#item=${report.id}`;
        box.querySelector('[data-again]').addEventListener('click', () => {
            delete frame.dataset.ready;
            frame.replaceChildren();
            loadForm(report.type);
            frame.querySelector('input').focus();
        });
        frame.replaceChildren(box);
        box.querySelector('h3').focus();
    }

    function buildSiteForm(frame, type) {
        frame.classList.add('is-loaded', 'form-frame--site');
        frame.innerHTML = formHtml(type);
        const form = frame.querySelector('form');

        if (type === 'found') {
            const turnedIn = form.querySelector('[data-turned-in]');
            const turnedInInput = turnedIn.querySelector('input');
            form.addEventListener('change', event => {
                if (event.target.name !== 'whereNow') return;
                const on = event.target.value === TURNED_IN;
                turnedIn.hidden = !on;
                turnedInInput.disabled = !on;
                turnedInInput.required = on;
            });
        }

        form.addEventListener('input', () => {
            if (form.checkValidity()) showError(form, '');
        });

        form.addEventListener('submit', async event => {
            event.preventDefault();
            showError(form, '');
            form.querySelectorAll('input, textarea').forEach(field => {
                if (field.type !== 'radio' && field.type !== 'date') field.value = field.value.trim();
            });
            if (!form.checkValidity()) {
                showError(form, 'Please fill in the highlighted fields.');
                form.classList.add('was-checked');
                form.reportValidity();
                return;
            }
            const values = Object.fromEntries(new FormData(form));
            const button = form.querySelector('[type="submit"]');
            button.disabled = true;
            button.lastChild.textContent = 'Posting…';

            const sent = await sendToGoogle(type, values);
            const extras = [];
            if (type === 'found') {
                extras.push({ label: 'Where is the item now?', value: (WHERE_NOW.find(([value]) => value === values.whereNow) || [, values.whereNow])[1] });
                if (values.whereNow === TURNED_IN && values.turnedInAt) extras.push({ label: 'Where did you turn it in?', value: values.turnedInAt });
            }
            // Only public fields are saved in the browser: never the name or email.
            const report = FoundIt.saveLocalReport({
                type,
                item: values.item,
                description: values.description,
                location: values.location,
                date: values.date,
                image: values.image,
                extras
            });
            showDone(frame, report, sent);
        });
    }

    function loadForm(type) {
        const frame = document.querySelector(`[data-form="${type}"]`);
        if (!frame || frame.dataset.ready) return;
        frame.dataset.ready = 'true';
        if (!FORMS[type]) {
            comingSoon(frame, type);
            return;
        }
        if (ENTRIES[type]) {
            buildSiteForm(frame, type);
            return;
        }
        // A long form is easier to fill in on its own page, especially on a phone.
        const open = document.createElement('a');
        open.className = 'form-open-link';
        open.href = FORMS[type];
        open.target = '_blank';
        open.rel = 'noopener';
        open.innerHTML = FoundIt.icon('arrow');
        open.append('Open the form full screen');
        frame.before(open);

        const iframe = document.createElement('iframe');
        iframe.title = TITLES[type];
        iframe.src = embedUrl(FORMS[type]);
        iframe.dataset.type = type;
        iframe.style.height = frameHeight(type);
        iframe.addEventListener('load', () => frame.classList.add('is-loaded'));
        frame.appendChild(iframe);
    }

    function choose(type, scroll) {
        document.querySelectorAll('[data-choice]').forEach(button => {
            button.setAttribute('aria-pressed', String(button.dataset.choice === type));
        });
        document.getElementById('lostPanel').hidden = type !== 'lost';
        document.getElementById('foundPanel').hidden = type !== 'found';
        document.getElementById('pickHint').hidden = true;
        loadForm(type);
        history.replaceState(null, '', `${window.location.pathname}?type=${type}`);
        if (scroll) {
            const panel = document.getElementById(`${type}Panel`);
            panel.scrollIntoView({ behavior: FoundIt.reducedMotion ? 'auto' : 'smooth', block: 'start' });
        }
    }

    document.addEventListener('DOMContentLoaded', () => {
        document.querySelectorAll('[data-choice]').forEach(button => {
            button.addEventListener('click', () => choose(button.dataset.choice, true));
        });
        document.querySelectorAll('[data-form][data-autoload]').forEach(frame => loadForm(frame.dataset.form));
        const type = new URLSearchParams(window.location.search).get('type');
        if ((type === 'lost' || type === 'found') && document.getElementById('lostPanel')) choose(type, false);

        // Turning the phone (or resizing the window) changes how tall the forms are.
        phone.addEventListener('change', () => {
            document.querySelectorAll('.form-frame iframe[data-type]').forEach(iframe => {
                iframe.style.height = frameHeight(iframe.dataset.type);
            });
        });
    });
})();
