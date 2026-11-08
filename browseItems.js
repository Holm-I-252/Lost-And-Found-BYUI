const url = "https://docs.google.com/spreadsheets/d/e/2PACX-1vSk_olPna8hpfvpOYkJm2DpirhrvF13S6AmL_1rGkoXNbBXeWkIwPttmy97hxM4DzaLGP-vbDxaRa8u/pub?gid=1959645353&single=true&output=csv";

function loadLostItems() {
    fetch(url)
        .then(response => response.text())
        .then(data => {
            const rows = data.split('\n').slice(1);
            const lostItemsContainer = document.getElementById('lostItems');
            rows.forEach(row => {
                const cols = row.split(',');
                const itemRow = document.createElement('tr');
                itemRow.classList.add('lost-item');
                itemRow.innerHTML = `
                
                    <td>${cols[0]}</td>
                    <td>${cols[1]}</td>
                    <td>${cols[2]}</td>
                    <td>${cols[3]}</td>
            
                `;
                lostItemsContainer.appendChild(itemRow);
            });
        });
}

document.addEventListener('DOMContentLoaded', loadLostItems);