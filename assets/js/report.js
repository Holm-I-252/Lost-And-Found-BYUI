// Report page: pick "lost" or "found", then the matching Google Form opens below.
// Forms load only when chosen, and the choice is kept in the URL (?type=found).
// found_items.html reuses this file: its frame has data-autoload, so the form opens right away.
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

    function loadForm(type) {
        const frame = document.querySelector(`[data-form="${type}"]`);
        if (!frame || frame.dataset.ready) return;
        frame.dataset.ready = 'true';
        if (!FORMS[type]) {
            comingSoon(frame, type);
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
