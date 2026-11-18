// Browse page: loads every report, then filters by what / where / when,
// category and lost-or-found, shown as cards or on the campus map.
// The filters live in the URL, so a filtered view can be shared as a link.
(function () {
    const FoundIt = window.FoundIt;
    const config = window.FOUNDIT_CONFIG || {};
    const $ = id => document.getElementById(id);

    const DEFAULTS = { q: '', where: '', when: '', from: '', to: '', cat: '', type: '', sort: 'new', view: 'grid', samples: false };
    const state = { ...DEFAULTS };
    let realReports = [];
    let reports = [];
    let campusMap = null;
    const cards = new Map(); // report id → card, so cards that stay visible don't re-animate

    // ---------- URL ----------

    function readUrl() {
        const params = new URLSearchParams(window.location.search);
        Object.keys(DEFAULTS).forEach(key => {
            if (!params.has(key)) return;
            state[key] = key === 'samples' ? params.get(key) === '1' : params.get(key);
        });
    }

    function writeUrl() {
        const params = new URLSearchParams();
        Object.keys(DEFAULTS).forEach(key => {
            if (state[key] === DEFAULTS[key]) return;
            params.set(key, state[key] === true ? '1' : state[key]);
        });
        const query = params.toString();
        history.replaceState(null, '', `${window.location.pathname}${query ? `?${query}` : ''}${window.location.hash}`);
    }

    // ---------- Filtering ----------

    function dateRange() {
        if (state.when === '') return null;
        if (state.when === 'custom') {
            let from = FoundIt.parseDate(state.from);
            let to = FoundIt.parseDate(state.to);
            if (!from && !to) return null;
            if (from && to && from > to) [from, to] = [to, from];
            if (to) to = new Date(to.getFullYear(), to.getMonth(), to.getDate(), 23, 59, 59);
            return { from, to };
        }
        const today = FoundIt.startOfDay(new Date());
        return { from: new Date(today.getFullYear(), today.getMonth(), today.getDate() - Number(state.when)), to: null };
    }

    function matches(report, range, terms) {
        if (state.type && report.type !== state.type) return false;
        if (state.cat && report.category.key !== state.cat) return false;
        if (state.where === 'other' && report.building) return false;
        if (state.where && state.where !== 'other' && (!report.building || report.building.short !== state.where)) return false;
        if (!terms.every(term => report.searchText.includes(term))) return false;
        if (range) {
            if (!report.when) return false;
            if (range.from && report.when < range.from) return false;
            if (range.to && report.when > range.to) return false;
        }
        return true;
    }

    function filtered() {
        const range = dateRange();
        const terms = state.q.toLowerCase().split(/\s+/).filter(Boolean);
        const order = state.sort === 'old' ? 1 : -1;
        return reports
            .filter(report => matches(report, range, terms))
            .sort((a, b) => order * ((a.when || 0) - (b.when || 0)));
    }

    // ---------- Controls ----------

    function setPressed(selector, attribute, value) {
        document.querySelectorAll(selector).forEach(button => {
            button.setAttribute('aria-pressed', String(button.getAttribute(attribute) === value));
        });
    }

    // "Where" lists only buildings that actually have reports, busiest first.
    function buildWhereOptions() {
        const select = $('fWhere');
        const counts = new Map();
        let other = 0;
        reports.forEach(report => {
            if (report.building) counts.set(report.building.short, (counts.get(report.building.short) || 0) + 1);
            else other++;
        });
        const options = [new Option('Anywhere on campus', '')];
        [...counts.entries()]
            .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
            .forEach(([name, count]) => options.push(new Option(`${name} (${count})`, name)));
        if (other) options.push(new Option(`Other places (${other})`, 'other'));
        if (state.where && !options.some(option => option.value === state.where)) {
            options.push(new Option(state.where, state.where));
        }
        select.replaceChildren(...options);
        select.value = state.where;
    }

    function buildCategoryChips() {
        const box = $('categoryChips');
        const counts = new Map();
        reports.forEach(report => counts.set(report.category.key, (counts.get(report.category.key) || 0) + 1));
        const chip = (key, label) => {
            const button = document.createElement('button');
            button.type = 'button';
            button.className = 'chip';
            button.dataset.cat = key;
            button.setAttribute('aria-pressed', String(state.cat === key));
            button.textContent = label;
            if (key) {
                const count = document.createElement('span');
                count.className = 'chip__count';
                count.textContent = counts.get(key);
                button.append(' ', count);
            }
            return button;
        };
        const list = [chip('', 'All items')];
        FoundIt.categories.forEach(category => {
            if (counts.has(category.key)) list.push(chip(category.key, `${category.emoji} ${category.label}`));
        });
        box.replaceChildren(...list);
    }

    function syncControls() {
        $('fWhat').value = state.q;
        $('fWhen').value = state.when;
        $('fFrom').value = state.from;
        $('fTo').value = state.to;
        $('fSort').value = state.sort;
        $('fSamples').checked = state.samples;
        $('dateRange').hidden = state.when !== 'custom';
        setPressed('[data-type]', 'data-type', state.type);
        setPressed('[data-view]', 'data-view', state.view);
        setPressed('#categoryChips .chip', 'data-cat', state.cat);

        // The phone "Filters" button shows how many filters (besides the search) are on.
        const active = ['where', 'when', 'cat', 'type'].filter(key => state[key] !== '').length;
        $('filtersCount').hidden = active === 0;
        $('filtersCount').textContent = active;
    }

    function setReports() {
        reports = state.samples ? realReports.concat(FoundIt.sampleReports()) : realReports.slice();
        buildWhereOptions();
        buildCategoryChips();
        $('samplesNotice').hidden = !state.samples;
    }

    // ---------- Rendering ----------

    function renderCount(list) {
        const box = $('resultsCount');
        const strong = document.createElement('strong');
        strong.textContent = list.length;
        const label = list.length === reports.length ? ` report${list.length === 1 ? '' : 's'}` : ` of ${reports.length} reports match`;
        box.replaceChildren(strong, label);
        $('showResults').textContent = list.length ? `Show ${list.length} item${list.length === 1 ? '' : 's'}` : 'No matches yet';
    }

    // ---------- Filters sheet (phones) ----------

    function setSheet(open) {
        const panel = $('filters');
        panel.classList.toggle('is-open', open);
        $('sheetBackdrop').classList.toggle('is-visible', open);
        document.documentElement.classList.toggle('sheet-open', open);
        $('filtersToggle').setAttribute('aria-expanded', String(open));
        if (open) panel.scrollTop = 0;
    }

    function renderGrid(list) {
        const grid = $('itemGrid');
        const next = list.map((report, i) => {
            let card = cards.get(report.id);
            if (!card) {
                card = FoundIt.renderCard(report, i);
                cards.set(report.id, card);
            }
            return card;
        });
        grid.replaceChildren(...next);
        FoundIt.reveal(grid);
    }

    function renderMap(list) {
        if (!campusMap) {
            campusMap = FoundIt.createMap($('browseMap'), { onSelect: openReport });
            if (!campusMap) return;
        }
        campusMap.refresh();
        const pins = campusMap.update(list, true);
        const unplaced = list.filter(report => !report.building).length;
        const note = $('mapNote');
        note.hidden = !unplaced;
        note.querySelector('span').textContent = `${unplaced} matching report${unplaced === 1 ? '' : 's'} ${unplaced === 1 ? 'doesn’t' : 'don’t'} name a campus building we know, so ${unplaced === 1 ? 'it isn’t' : 'they aren’t'} on the map. Switch to Cards to see ${unplaced === 1 ? 'it' : 'them'}.`;
        return pins;
    }

    function render() {
        // The sticky filter bar would cover the top of the map, so it only sticks over cards.
        document.body.classList.toggle('is-map-view', state.view === 'map');
        const list = filtered();
        renderCount(list);
        const empty = list.length === 0;
        $('emptyState').hidden = !empty;
        $('gridView').hidden = state.view !== 'grid' || empty;
        $('mapView').hidden = state.view !== 'map' || empty;
        if (empty) return;
        if (state.view === 'map') renderMap(list);
        else renderGrid(list);
    }

    function update(changes) {
        Object.assign(state, changes);
        syncControls();
        writeUrl();
        render();
    }

    // ---------- Item details ----------

    function openReport(report) {
        history.replaceState(null, '', `${window.location.pathname}${window.location.search}#item=${report.id}`);
        FoundIt.openItem(report, {
            onMap: target => {
                update({ view: 'map' });
                if (campusMap) campusMap.focus(target.building.name);
            }
        });
    }

    function openFromHash() {
        const match = window.location.hash.match(/item=([\w-]+)/);
        if (!match) return;
        const report = reports.find(item => item.id === match[1]);
        if (report) openReport(report);
    }

    // ---------- Wiring ----------

    function wire() {
        let typing;
        $('fWhat').addEventListener('input', event => {
            clearTimeout(typing);
            typing = setTimeout(() => update({ q: event.target.value.trim() }), 120);
        });
        $('fWhere').addEventListener('change', event => update({ where: event.target.value }));
        $('fWhen').addEventListener('change', event => update({ when: event.target.value }));
        $('fFrom').addEventListener('change', event => update({ from: event.target.value }));
        $('fTo').addEventListener('change', event => update({ to: event.target.value }));
        $('fSort').addEventListener('change', event => update({ sort: event.target.value }));
        $('fSamples').addEventListener('change', event => {
            state.samples = event.target.checked;
            setReports();
            update({});
        });
        $('filters').addEventListener('submit', event => {
            event.preventDefault();
            // "Search" on a phone keyboard just closes the keyboard; results already update as you type.
            document.activeElement.blur();
        });
        $('filters').addEventListener('reset', event => {
            event.preventDefault();
            update({ q: '', where: '', when: '', from: '', to: '', cat: '', type: '' });
        });
        document.querySelector('[data-clear]').addEventListener('click', () => update({ q: '', where: '', when: '', from: '', to: '', cat: '', type: '' }));
        $('categoryChips').addEventListener('click', event => {
            const chip = event.target.closest('.chip');
            if (chip) update({ cat: chip.dataset.cat === state.cat ? '' : chip.dataset.cat });
        });
        document.querySelectorAll('[data-type]').forEach(button => button.addEventListener('click', () => update({ type: button.dataset.type })));
        document.querySelectorAll('[data-view]').forEach(button => button.addEventListener('click', () => update({ view: button.dataset.view })));

        $('itemGrid').addEventListener('click', event => {
            const card = event.target.closest('.item-card');
            if (!card || event.metaKey || event.ctrlKey || event.shiftKey || event.button !== 0) return;
            event.preventDefault();
            const report = reports.find(item => item.id === card.dataset.id);
            if (report) openReport(report);
        });
        document.addEventListener('foundit:dialogclose', () => {
            history.replaceState(null, '', `${window.location.pathname}${window.location.search}`);
        });

        // Press "/" anywhere to jump to the search box.
        document.addEventListener('keydown', event => {
            if (event.key !== '/' || event.target.closest('input, select, textarea')) return;
            event.preventDefault();
            $('fWhat').focus();
        });

        $('filtersToggle').addEventListener('click', () => setSheet(true));
        document.querySelectorAll('[data-close-filters]').forEach(button => button.addEventListener('click', () => setSheet(false)));
        $('sheetBackdrop').addEventListener('click', () => setSheet(false));
        document.addEventListener('keydown', event => {
            if (event.key === 'Escape' && $('filters').classList.contains('is-open')) setSheet(false);
        });
        matchMedia('(max-width: 700px)').addEventListener('change', event => {
            if (!event.matches) setSheet(false);
        });
        FoundIt.swipeToClose(document.querySelector('.sheet-head'), $('filters'), () => setSheet(false));
    }

    document.addEventListener('DOMContentLoaded', () => {
        readUrl();
        syncControls();
        wire();

        const hashIsSample = /item=s/.test(window.location.hash);
        const urlSetSamples = new URLSearchParams(window.location.search).has('samples');

        FoundIt.loadReports()
            .then(({ reports: loaded, errors }) => {
                if (errors.length) console.warn('FoundIt:', ...errors);
                realReports = loaded;
                // Show samples when the board is still nearly empty (see config.js), or when a sample was linked.
                if (!urlSetSamples) state.samples = hashIsSample || realReports.length < (config.showSamplesWhenFewerThan ?? 4);
            })
            .catch(error => {
                console.error('FoundIt:', error);
                realReports = [];
                state.samples = true;
                FoundIt.toast('Couldn’t load the live board, showing samples');
            })
            .finally(() => {
                setReports();
                syncControls();
                render();
                openFromHash();
            });
    });
})();
