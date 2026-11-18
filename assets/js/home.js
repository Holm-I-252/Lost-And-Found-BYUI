// Home page: typing placeholder, floating items that follow the mouse,
// live stats, the newest reports and the campus map.
(function () {
    const FoundIt = window.FoundIt;
    const config = window.FOUNDIT_CONFIG || {};
    const MIN_CARDS = 8;

    // Cycles example searches through the placeholder, like someone typing.
    function typePlaceholder(input) {
        const examples = ['car keys', 'AirPods', 'a blue backpack', 'my student ID', 'a Hydro Flask', 'a black beanie'];
        if (FoundIt.reducedMotion) {
            input.placeholder = `Try “${examples[0]}”`;
            return;
        }
        let word = 0;
        let letters = 0;
        let deleting = false;
        const tick = () => {
            const text = examples[word];
            letters += deleting ? -1 : 1;
            input.placeholder = `Try “${text.slice(0, letters)}”`;
            let delay = deleting ? 45 : 95;
            if (!deleting && letters === text.length) {
                deleting = true;
                delay = 1700;
            } else if (deleting && letters === 0) {
                deleting = false;
                word = (word + 1) % examples.length;
                delay = 350;
            }
            setTimeout(tick, delay);
        };
        tick();
    }

    // Floating item bubbles drift a little toward the mouse, each at its own depth.
    function setUpParallax() {
        const floaters = document.querySelectorAll('.floater');
        if (FoundIt.reducedMotion || !matchMedia('(hover: hover) and (pointer: fine)').matches) return;
        window.addEventListener(
            'pointermove',
            event => {
                const x = event.clientX / window.innerWidth - 0.5;
                const y = event.clientY / window.innerHeight - 0.5;
                floaters.forEach(el => {
                    const depth = Number(el.dataset.depth || 20);
                    el.style.setProperty('--px', `${(-x * depth).toFixed(1)}px`);
                    el.style.setProperty('--py', `${(-y * depth).toFixed(1)}px`);
                });
            },
            { passive: true }
        );
    }

    function setStats(reports) {
        const real = reports.filter(report => !report.sample);
        const places = new Set(real.filter(report => report.building).map(report => report.building.name));
        FoundIt.countUp(document.querySelector('[data-stat="reports"]'), real.length);
        FoundIt.countUp(document.querySelector('[data-stat="places"]'), places.size);
        const newest = real.map(report => report.reportedAt).filter(Boolean).sort((a, b) => b - a)[0];
        const latest = document.querySelector('[data-stat="latest"]');
        latest.textContent = newest ? FoundIt.timeAgo(newest) : '–';
        if (newest) document.getElementById('liveLine').textContent = `Newest report ${FoundIt.timeAgo(newest)}`;
    }

    function showRecent(reports) {
        const grid = document.getElementById('recentGrid');
        let shown = reports.slice(0, MIN_CARDS);
        if (shown.length < MIN_CARDS) {
            // Top up with clearly marked samples so the section never looks empty.
            shown = shown.concat(FoundIt.sampleReports().slice(0, MIN_CARDS - shown.length));
            document.getElementById('sampleNotice').hidden = false;
        }
        grid.replaceChildren(...shown.map((report, i) => FoundIt.renderCard(report, i)));
        FoundIt.reveal(grid);

        // Cards open the details right here; ctrl/cmd-click still opens the Browse page.
        const byId = new Map(shown.map(report => [report.id, report]));
        grid.addEventListener('click', event => {
            const card = event.target.closest('.item-card');
            if (!card || event.metaKey || event.ctrlKey || event.shiftKey || event.button !== 0) return;
            event.preventDefault();
            FoundIt.openItem(byId.get(card.dataset.id));
        });
        return shown;
    }

    function showMap(reports) {
        const element = document.getElementById('homeMap');
        const campusMap = FoundIt.createMap(element, {
            onSelect: report => FoundIt.openItem(report),
            zoom: 16,
            lockOnTouch: true
        });
        if (campusMap) campusMap.update(reports, true);
    }

    function showError(grid) {
        const box = document.createElement('div');
        box.className = 'empty-state';
        box.style.gridColumn = '1 / -1';
        box.innerHTML = '<div class="empty-state__art" aria-hidden="true">📡</div><h3>We couldn’t reach the board</h3><p>Check your connection and refresh the page.</p>';
        grid.replaceChildren(box);
    }

    document.addEventListener('DOMContentLoaded', () => {
        const input = document.getElementById('heroQuery');
        const form = document.getElementById('heroSearch');
        typePlaceholder(input);
        input.addEventListener('input', () => form.classList.toggle('is-typing', input.value.trim() !== ''));
        setUpParallax();

        FoundIt.loadReports()
            .then(({ reports, errors }) => {
                if (errors.length) console.warn('FoundIt:', ...errors);
                setStats(reports);
                const shown = showRecent(reports);
                showMap(shown.length > reports.length ? shown : reports);
            })
            .catch(error => {
                console.error('FoundIt:', error);
                showError(document.getElementById('recentGrid'));
                showMap(FoundIt.sampleReports());
            });

        if (!config.lostItemsCsv) console.warn('FoundIt: no lost-items sheet set in config.js');
    });
})();
