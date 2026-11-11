const url = "https://docs.google.com/spreadsheets/d/e/2PACX-1vSk_olPna8hpfvpOYkJm2DpirhrvF13S6AmL_1rGkoXNbBXeWkIwPttmy97hxM4DzaLGP-vbDxaRa8u/pub?gid=1959645353&single=true&output=csv";

// Labels used when the sheet's header row doesn't name a column.
const fallbackLabels = ['Date', 'Item', 'Description', 'Location'];

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

function loadLostItems() {
    fetch(url)
        .then(response => response.text())
        .then(data => {
            const [headers = [], ...rows] = parseCSV(data);
            const lostItemsContainer = document.getElementById('lostItems');
            rows.forEach(cols => {
                if (!cols.some(col => col.trim())) return; // skip blank lines so they don't show as "undefined"

                const itemRow = document.createElement('tr');
                itemRow.classList.add('lost-item');
                itemRow.tabIndex = 0;
                itemRow.setAttribute('role', 'button');
                itemRow.setAttribute('aria-label', `View details for ${cols[1] || 'this item'}`);

                for (let i = 0; i < 4; i++) {
                    const cell = document.createElement('td');
                    cell.textContent = cols[i] || '';
                    itemRow.appendChild(cell);
                }

                itemRow.addEventListener('click', () => openItemModal(headers, cols));
                itemRow.addEventListener('keydown', event => {
                    if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        openItemModal(headers, cols);
                    }
                });

                lostItemsContainer.appendChild(itemRow);
            });
        });
}

// Fills the modal with every column the sheet has for this item, so any
// extra details beyond the four table columns show up here too.
function openItemModal(headers, cols) {
    const modal = document.getElementById('itemModal');
    const details = document.getElementById('itemModalDetails');

    document.getElementById('itemModalTitle').textContent = cols[1] || 'Item details';
    details.replaceChildren();

    cols.forEach((value, i) => {
        if (i === 1 || !value.trim()) return; // item name is already the title
        const label = document.createElement('dt');
        label.textContent = (headers[i] && headers[i].trim()) || fallbackLabels[i] || `Detail ${i + 1}`;
        const content = document.createElement('dd');
        content.textContent = value.trim();
        details.append(label, content);
    });

    modal.showModal();
    document.body.classList.add('modal-open');
}

function setUpItemModal() {
    const modal = document.getElementById('itemModal');

    modal.querySelectorAll('[data-close-modal]').forEach(button => {
        button.addEventListener('click', () => modal.close());
    });

    // A click that lands on the dialog itself (not its content) is a backdrop click.
    modal.addEventListener('click', event => {
        if (event.target === modal) modal.close();
    });

    // Escape is handled by the browser for <dialog>; this just restores page scrolling.
    modal.addEventListener('close', () => document.body.classList.remove('modal-open'));
}

document.addEventListener('DOMContentLoaded', () => {
    setUpItemModal();
    loadLostItems();
});
