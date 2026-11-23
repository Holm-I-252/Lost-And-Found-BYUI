// Loads lost and found reports from the team's published Google Sheets and turns
// every row into a "report" object the pages can show, filter and put on the map.
(function () {
    const FoundIt = (window.FoundIt = window.FoundIt || {});
    const config = window.FOUNDIT_CONFIG || {};

    // ---------- CSV ----------

    // Splits CSV text into rows of fields, handling quoted fields that contain
    // commas, line breaks, or escaped quotes ("") the way Google Sheets exports them.
    function parseCSV(text) {
        const rows = [];
        let row = [];
        let field = '';
        let inQuotes = false;

        for (let i = 0; i < text.length; i++) {
            const char = text[i];
            if (inQuotes) {
                if (char === '"' && text[i + 1] === '"') {
                    field += '"';
                    i++;
                } else if (char === '"') {
                    inQuotes = false;
                } else {
                    field += char;
                }
            } else if (char === '"') {
                inQuotes = true;
            } else if (char === ',') {
                row.push(field);
                field = '';
            } else if (char === '\n' || char === '\r') {
                if (char === '\r' && text[i + 1] === '\n') i++;
                row.push(field);
                rows.push(row);
                row = [];
                field = '';
            } else {
                field += char;
            }
        }
        if (field || row.length) {
            row.push(field);
            rows.push(row);
        }
        return rows;
    }

    // Finds a column by its header, trying each pattern in order, so the site keeps
    // working if the form's questions are renamed a little or reordered.
    function findColumn(headers, patterns, fallbackIndex) {
        for (const pattern of patterns) {
            const index = headers.findIndex(header => pattern.test(header.trim()));
            if (index !== -1) return index;
        }
        return fallbackIndex;
    }

    // Columns that hold someone's contact details are never shown on the site,
    // even if a sheet with them gets published by mistake.
    const PRIVATE_COLUMN = /^(your\s+)?(full\s+)?(name|e-?mail|email address|phone|phone number)\b|contact/i;

    // ---------- Dates ----------

    // Reads dates the way Google Sheets writes them (11/7/2026, 11/7/2026 19:55:11)
    // and the YYYY-MM-DD format used by date inputs. Returns null if it can't tell.
    function parseDate(text) {
        const value = (text || '').trim();
        let match = value.match(/^(\d{4})-(\d{1,2})-(\d{1,2})(?:[ T](\d{1,2}):(\d{2})(?::(\d{2}))?)?/);
        if (match) return new Date(+match[1], match[2] - 1, +match[3], +(match[4] || 0), +(match[5] || 0), +(match[6] || 0));
        match = value.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:\s+(\d{1,2}):(\d{2})(?::(\d{2}))?)?/);
        if (match) return new Date(+match[3], match[1] - 1, +match[2], +(match[4] || 0), +(match[5] || 0), +(match[6] || 0));
        return null;
    }

    function formatDate(date) {
        if (!date) return '';
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    }

    const relativeTime = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });

    // "today", "yesterday", "3 days ago", "2 weeks ago"…
    function timeAgo(date) {
        if (!date) return '';
        const days = Math.round((startOfDay(date) - startOfDay(new Date())) / 86400000);
        if (days === 0) {
            const hours = Math.round((date - new Date()) / 3600000);
            return hours >= -1 ? 'just now' : relativeTime.format(hours, 'hour');
        }
        if (Math.abs(days) < 7) return relativeTime.format(days, 'day');
        if (Math.abs(days) < 30) return relativeTime.format(Math.round(days / 7), 'week');
        if (Math.abs(days) < 365) return relativeTime.format(Math.round(days / 30), 'month');
        return relativeTime.format(Math.round(days / 365), 'year');
    }

    function startOfDay(date) {
        return new Date(date.getFullYear(), date.getMonth(), date.getDate());
    }

    // ---------- Categories ----------

    // The first category whose word shows up in the item name (then the description) wins.
    const CATEGORIES = [
        { key: 'tech', label: 'Phones & tech', emoji: '📱', hue: 212, words: ['phone', 'iphone', 'android', 'samsung', 'pixel', 'airpods', 'airpod', 'earbuds', 'headphones', 'headset', 'laptop', 'macbook', 'chromebook', 'ipad', 'tablet', 'charger', 'cable', 'calculator', 'ti-84', 'apple watch', 'smartwatch', 'kindle', 'mouse', 'usb', 'camera'] },
        { key: 'keys', label: 'Keys', emoji: '🔑', hue: 40, words: ['key', 'keys', 'keychain', 'lanyard', 'fob'] },
        { key: 'wallets', label: 'Wallets & IDs', emoji: '👛', hue: 345, words: ['wallet', 'purse', 'id', 'card', 'cards', 'license', 'credit', 'debit', 'student id'] },
        { key: 'bags', label: 'Bags', emoji: '🎒', hue: 152, words: ['backpack', 'bag', 'tote', 'duffel', 'pouch', 'lunchbox'] },
        { key: 'clothing', label: 'Clothing', emoji: '🧥', hue: 265, words: ['hat', 'cap', 'beanie', 'jacket', 'coat', 'hoodie', 'sweater', 'sweatshirt', 'shirt', 'scarf', 'glove', 'gloves', 'mittens', 'shoe', 'shoes', 'boots'] },
        { key: 'bottles', label: 'Bottles', emoji: '💧', hue: 190, words: ['bottle', 'hydro flask', 'hydroflask', 'flask', 'tumbler', 'stanley', 'owala', 'yeti', 'mug', 'cup'] },
        { key: 'school', label: 'Books & school', emoji: '📚', hue: 24, words: ['book', 'books', 'textbook', 'notebook', 'binder', 'planner', 'folder', 'scriptures', 'pencil', 'pen'] },
        { key: 'accessories', label: 'Accessories', emoji: '👓', hue: 300, words: ['glasses', 'sunglasses', 'ring', 'necklace', 'bracelet', 'earring', 'earrings', 'jewelry', 'watch', 'umbrella'] }
    ];
    const OTHER = { key: 'other', label: 'Other', emoji: '📦', hue: 205, words: [] };

    function words(text) {
        return ' ' + (text || '').toLowerCase().replace(/[^a-z0-9-]+/g, ' ').trim() + ' ';
    }

    // A closer picture for common items; anything else uses its category's emoji.
    const ITEM_EMOJI = [
        [['airpods', 'airpod', 'earbuds', 'headphones', 'headset'], '🎧'],
        [['laptop', 'macbook', 'chromebook'], '💻'],
        [['charger', 'cable'], '🔌'],
        [['calculator', 'ti-84'], '🧮'],
        [['camera'], '📷'],
        [['id', 'license', 'card'], '🪪'],
        [['hat', 'cap', 'beanie'], '🧢'],
        [['glove', 'gloves', 'mittens'], '🧤'],
        [['scarf'], '🧣'],
        [['shoe', 'shoes', 'boots'], '👟'],
        [['notebook', 'planner', 'binder'], '📓'],
        [['glasses'], '👓'],
        [['ring'], '💍'],
        [['watch', 'smartwatch'], '⌚'],
        [['umbrella'], '☂️'],
        [['purse', 'tote'], '👜']
    ];

    function itemEmoji(item) {
        const text = words(item);
        const match = ITEM_EMOJI.find(([keys]) => keys.some(key => text.includes(' ' + key + ' ')));
        return match ? match[1] : '';
    }

    function detectCategory(item, description) {
        for (const text of [words(item), words(description)]) {
            const found = CATEGORIES.find(category => category.words.some(word => text.includes(' ' + word + ' ')));
            if (found) return found;
        }
        return OTHER;
    }

    // ---------- Buildings ----------

    function normalizePlace(text) {
        return ' ' + (text || '').toLowerCase().replace(/&/g, ' and ').replace(/[^a-z0-9]+/g, ' ').trim() + ' ';
    }

    const BUILDINGS = (window.FOUNDIT_BUILDINGS || []).map(building => ({
        ...building,
        keys: building.aliases.map(normalizePlace)
    }));

    function findBuilding(location) {
        const text = normalizePlace(location);
        if (!text.trim()) return null;
        return BUILDINGS.find(building => building.keys.some(key => text.includes(key))) || null;
    }

    // ---------- Photos ----------

    // Accepts any http(s) link (or a path on this site, for the samples);
    // Google Drive share links become their thumbnail URL.
    function imageUrl(link) {
        const value = (link || '').trim();
        if (!value) return '';
        let url;
        try {
            url = new URL(value, window.location.href);
        } catch (error) {
            return '';
        }
        if (url.protocol !== 'https:' && url.protocol !== 'http:') return '';
        const drive = value.match(/drive\.google\.com\/(?:file\/d\/|open\?id=|uc\?(?:export=\w+&)?id=)([\w-]{10,})/);
        if (drive) return `https://drive.google.com/thumbnail?id=${drive[1]}&sz=w900`;
        return url.href;
    }

    // ---------- Reports ----------

    function hash(text) {
        let value = 5381;
        for (let i = 0; i < text.length; i++) value = ((value << 5) + value + text.charCodeAt(i)) | 0;
        return (value >>> 0).toString(36);
    }

    function makeReport(fields) {
        const report = {
            type: fields.type,
            item: (fields.item || '').trim() || 'Unnamed item',
            description: (fields.description || '').trim(),
            location: (fields.location || '').trim(),
            happenedAt: fields.happenedAt || null,
            reportedAt: fields.reportedAt || null,
            image: imageUrl(fields.image),
            status: (fields.status || '').trim(),
            extras: fields.extras || [],
            sample: Boolean(fields.sample)
        };
        report.id = (report.sample ? 's' : report.type[0]) + hash([fields.idSeed || '', report.item, report.location].join('|'));
        report.category = detectCategory(report.item, report.description);
        report.emoji = itemEmoji(report.item) || report.category.emoji;
        report.building = findBuilding(report.location);
        report.resolved = /return|claim|picked|reunit|resolved|closed|found/i.test(report.status);
        // When it was lost / found, falling back to when it was reported.
        report.when = report.happenedAt || report.reportedAt;
        report.searchText = [report.item, report.description, report.location, report.building ? report.building.name + ' ' + report.building.short : '', report.category.label]
            .join(' ')
            .toLowerCase();
        return report;
    }

    function toReports(csvText, type) {
        const [headers = [], ...rows] = parseCSV(csvText);
        const col = {
            time: findColumn(headers, [/timestamp/i], 0),
            item: findColumn(headers, [/^item$/i, /^item name/i, /^what/i], 1),
            description: findColumn(headers, [/description/i], 2),
            location: findColumn(headers, [/^location/i, /^where (was|did you)/i], 3),
            date: findColumn(headers, [/^date/i], -1),
            image: findColumn(headers, [/image|photo|picture/i], -1),
            status: findColumn(headers, [/status/i], -1)
        };
        const used = new Set(Object.values(col));

        return rows
            .filter(cols => cols.some(value => value.trim()))
            .map(cols => {
                // Any other public column (like "Where is the item now?") is kept for the details view.
                const extras = headers
                    .map((label, i) => ({ label: label.trim(), value: (cols[i] || '').trim() }))
                    .filter((field, i) => !used.has(i) && field.label && field.value && !PRIVATE_COLUMN.test(field.label));
                return makeReport({
                    type,
                    idSeed: cols[col.time],
                    item: cols[col.item],
                    description: cols[col.description],
                    location: cols[col.location],
                    happenedAt: col.date >= 0 ? parseDate(cols[col.date]) : null,
                    reportedAt: parseDate(cols[col.time]),
                    image: col.image >= 0 ? cols[col.image] : '',
                    status: col.status >= 0 ? cols[col.status] : '',
                    extras
                });
            });
    }

    function newestFirst(a, b) {
        return (b.reportedAt || b.when || 0) - (a.reportedAt || a.when || 0);
    }

    // ---------- Reports sent from this browser ----------

    // The Report page sends each report to its Google Form and also keeps a copy here,
    // so it shows on the board right away instead of waiting for the published sheet
    // (and the found-item sheet isn't published yet). Only the public fields are kept:
    // never the finder's name or email.
    const LOCAL_KEY = 'foundit-my-reports';

    function readLocal() {
        try {
            const list = JSON.parse(localStorage.getItem(LOCAL_KEY) || '[]');
            return Array.isArray(list) ? list.filter(entry => entry && (entry.type === 'lost' || entry.type === 'found')) : [];
        } catch (error) {
            return [];
        }
    }

    function writeLocal(list) {
        try {
            localStorage.setItem(LOCAL_KEY, JSON.stringify(list));
            return true;
        } catch (error) {
            return false;
        }
    }

    function localToReport(entry) {
        const reportedAt = new Date(entry.submittedAt);
        const report = makeReport({
            type: entry.type,
            idSeed: entry.submittedAt,
            item: entry.item,
            description: entry.description,
            location: entry.location,
            happenedAt: parseDate(entry.date),
            reportedAt: isNaN(reportedAt) ? null : reportedAt,
            image: entry.image,
            extras: Array.isArray(entry.extras) ? entry.extras : []
        });
        report.mine = true;
        return report;
    }

    // Saves a report sent from the Report page and returns it, ready to show.
    function saveLocalReport(fields) {
        const entry = {
            type: fields.type,
            item: fields.item || '',
            description: fields.description || '',
            location: fields.location || '',
            date: fields.date || '',
            image: fields.image || '',
            extras: fields.extras || [],
            submittedAt: new Date().toISOString()
        };
        const report = localToReport(entry);
        report.savedHere = writeLocal(readLocal().concat(entry));
        return report;
    }

    function sameReport(a, b) {
        const same = (x, y) => (x || '').trim().toLowerCase() === (y || '').trim().toLowerCase();
        const day = date => (date ? startOfDay(date).getTime() : null);
        return a.type === b.type && same(a.item, b.item) && same(a.location, b.location) && day(a.happenedAt) === day(b.happenedAt);
    }

    // Adds this browser's own reports to the ones from the sheets. Once a report
    // also shows up in a published sheet, the local copy is dropped so it isn't listed twice.
    function mergeLocal(sheetReports) {
        const entries = readLocal();
        if (!entries.length) return sheetReports;
        const keep = [];
        const local = [];
        entries.forEach(entry => {
            const report = localToReport(entry);
            if (sheetReports.some(other => sameReport(report, other))) return;
            keep.push(entry);
            local.push(report);
        });
        if (keep.length !== entries.length) writeLocal(keep);
        return sheetReports.concat(local);
    }

    // Fetches every published sheet in config.js. A sheet that fails is skipped
    // (and listed in `errors`) so one broken link doesn't empty the whole board.
    async function loadReports() {
        const sources = [['lost', config.lostItemsCsv], ['found', config.foundItemsCsv]].filter(([, url]) => url);
        const results = await Promise.allSettled(
            sources.map(async ([type, url]) => {
                const response = await fetch(url);
                if (!response.ok) throw new Error(`${type} sheet: HTTP ${response.status}`);
                return toReports(await response.text(), type);
            })
        );
        const reports = mergeLocal(results.filter(result => result.status === 'fulfilled').flatMap(result => result.value));
        const errors = results.filter(result => result.status === 'rejected').map(result => result.reason);
        return { reports: reports.sort(newestFirst), errors, hasFoundSheet: Boolean(config.foundItemsCsv) };
    }

    // ---------- Sample items ----------

    // Clearly marked sample reports, so the board can be previewed before it fills up.
    const SAMPLES = [
        { type: 'lost', item: 'Car keys', description: 'Car key fob and a silver house key on a blue BYU-Idaho lanyard.', location: 'McKay Library, 2nd floor', daysAgo: 1, image: 'assets/img/samples/keys.jpg' },
        { type: 'found', item: 'Black backpack', description: 'Black backpack with a blue Y patch on the front pocket.', location: 'Manwaring Center food court', daysAgo: 2, image: 'assets/img/samples/backpack.jpg', extras: [{ label: 'Where is the item now?', value: 'I still have it' }] },
        { type: 'found', item: 'Brown leather wallet', description: 'Tan bifold wallet with a snap tab. No cash inside.', location: 'STC, 1st floor', daysAgo: 3, image: 'assets/img/samples/wallet.jpg', extras: [{ label: 'Where is the item now?', value: 'Turned in to a front desk' }] },
        { type: 'lost', item: 'AirPods Pro case', description: 'White case with a small gold star sticker on the back.', location: 'Hart Building, weight room', daysAgo: 4 },
        { type: 'lost', item: 'Hydro Flask', description: '32 oz, sage green, covered in national park stickers.', location: 'Romney Building', daysAgo: 6 },
        { type: 'found', item: 'Black beanie', description: 'Knit beanie with a small pom-pom, left on a bench.', location: 'Outside the Spori Building', daysAgo: 8 },
        { type: 'lost', item: 'Student ID card', description: 'Student ID in a clear sleeve with a bus pass.', location: 'I-Center', daysAgo: 9 },
        { type: 'found', item: 'TI-84 calculator', description: 'Graphing calculator, initials scratched on the back.', location: 'Smith Building, 2nd floor', daysAgo: 12 },
        { type: 'lost', item: 'Silver ring', description: 'Thin silver band with a small engraving inside.', location: 'Taylor Building', daysAgo: 15, status: 'Returned to owner' },
        { type: 'found', item: 'Umbrella', description: 'Large black umbrella with a wooden handle.', location: 'Kimball Building entrance', daysAgo: 21 }
    ];

    function sampleReports() {
        const today = new Date();
        return SAMPLES.map(sample => {
            const date = new Date(today.getFullYear(), today.getMonth(), today.getDate() - sample.daysAgo, 12);
            return makeReport({ ...sample, idSeed: sample.item, happenedAt: date, reportedAt: date, sample: true });
        });
    }

    FoundIt.parseCSV = parseCSV;
    FoundIt.parseDate = parseDate;
    FoundIt.formatDate = formatDate;
    FoundIt.timeAgo = timeAgo;
    FoundIt.startOfDay = startOfDay;
    FoundIt.categories = CATEGORIES.concat(OTHER);
    FoundIt.buildings = BUILDINGS;
    FoundIt.loadReports = loadReports;
    FoundIt.saveLocalReport = saveLocalReport;
    FoundIt.sampleReports = sampleReports;
    FoundIt.newestFirst = newestFirst;
})();
