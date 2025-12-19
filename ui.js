// ==========================
// DOM ЕЛЕМЕНТИ
// ==========================

const elements = {
    blogspotUrl: document.getElementById('blogspot-url'),
    checkBtn: document.getElementById('check-btn'),
    refreshBrokenBtn: document.getElementById('refresh-broken-btn'),
    copyBrokenBtn: document.getElementById('copy-broken-btn'),
    clearBtn: document.getElementById('clear-btn'),
    messageContainer: document.getElementById('message-container'),
    statsSection: document.getElementById('stats-section'),
    progressSection: document.getElementById('progress-section'),
    resultsSection: document.getElementById('results-section'),
    totalCount: document.getElementById('total-count'),
    successCount: document.getElementById('success-count'),
    errorCount: document.getElementById('error-count'),
    pendingCount: document.getElementById('pending-count'),
    progressFill: document.getElementById('progress-fill'),
    progressText: document.getElementById('progress-text'),
    resultsList: document.getElementById('results-list')
};

// ==========================
// ОСНОВНИ UI ФУНКЦИИ
// ==========================

function showMessage(text, type = 'info') {
    const className = type === 'error' ? 'message-error' :
                   type === 'warning' ? 'message-warning' : 'message-success';
    elements.messageContainer.innerHTML = `<div class="message ${className}">${text}</div>`;

    // Auto-hide after 5 seconds
    setTimeout(() => {
        elements.messageContainer.innerHTML = '';
    }, 5000);
}

function updateStats(linksToCount = allLinks) {
    const total = linksToCount.length;
    const success = linksToCount.filter(l => l.status === 'success').length;
    const error = linksToCount.filter(l => l.status === 'error').length;
    const pending = linksToCount.filter(l => l.status === 'pending').length;

    elements.totalCount.textContent = total;
    elements.successCount.textContent = success;
    elements.errorCount.textContent = error;
    elements.pendingCount.textContent = pending;
}

function updateProgress(current, total) {
    const percentage = total > 0 ? (current / total) * 100 : 0;
    elements.progressFill.style.width = `${percentage}%`;
    elements.progressText.textContent = `Проверка: ${current} / ${total} линка (${Math.round(percentage)}%)`;
}

// ==========================
// UI ФУНКЦИИ
// ==========================

function renderResults() {
    const filteredLinks = allLinks.filter(link => {
        // First, check if we have selected specific types (not 'all')
        if (!selectedTypes.includes('all') && !selectedTypes.includes(link.type)) {
            return false; // Only show links from selected types
        }

        if (currentFilter === 'all') return true;

        // Check if it's a status filter (success, error, pending)
        if (['success', 'error', 'pending'].includes(currentFilter)) {
            return link.status === currentFilter;
        }

        // Check if it's a type filter (image, video, webpage, etc.)
        if (LINK_TYPES[currentFilter]) {
            return LINK_TYPES[currentFilter].filter(link);
        }

        return false;
    });

    if (filteredLinks.length === 0) {
        elements.resultsList.innerHTML = '<div style="padding: 20px; text-align: center; color: var(--ink-muted);">Няма линкове за показване с текущия филтър.</div>';
        return;
    }

    // Calculate pagination
    const totalPages = Math.ceil(filteredLinks.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = Math.min(startIndex + itemsPerPage, filteredLinks.length);
    const pageLinks = filteredLinks.slice(startIndex, endIndex);

    // Show/hide pagination controls
    const paginationEl = document.getElementById('pagination-controls');
    const pageInfoEl = document.getElementById('page-info');
    const prevBtn = document.getElementById('prev-page');
    const nextBtn = document.getElementById('next-page');

    if (totalPages > 1) {
        paginationEl.style.display = 'block';
        pageInfoEl.textContent = `Страница ${currentPage} от ${totalPages}`;
        prevBtn.disabled = currentPage === 1;
        nextBtn.disabled = currentPage === totalPages;
    } else {
        paginationEl.style.display = 'none';
    }

    elements.resultsList.innerHTML = pageLinks.map(link => {
        const statusClass = `status-${link.status}`;
        const statusIcon = link.status === 'success' ? '✓' :
                        link.status === 'error' ? '✗' : '⏳';

        const statusCodeText = link.statusCode ? `HTTP ${link.statusCode}` : '';
        const responseTimeText = link.responseTime ? `${link.responseTime}ms` : '';
        const methodText = link.method ? `<span>🔧 ${link.method}</span>` : '';
        const noteText = link.note ? `<span>📝 ${link.note}</span>` : '';

        // Get type icon and label
        const typeInfo = LINK_TYPES[link.type] || LINK_TYPES.unknown;
        const typeText = `<span>${typeInfo.icon} ${typeInfo.label}</span>`;

        return `
            <div class="link-item">
                <div class="status-icon ${statusClass}">${statusIcon}</div>
                <div class="link-content">
                    <div class="link-url">${escapeHtml(link.url)}</div>
                    <div class="link-info">
                        <span class="link-source">📄 ${escapeHtml(link.source)}</span>
                        ${typeText ? typeText : ''}
                        ${statusCodeText ? `<span>🔢 ${statusCodeText}</span>` : '' }
                        ${responseTimeText ? `<span>⏱️ ${responseTimeText}</span>` : ''}
                        ${methodText ? methodText : ''}
                        ${noteText ? noteText : ''}
                        ${link.error ? `<span style="color: var(--error)">⚠️ ${escapeHtml(link.error)}</span>` : ''}
                    </div>
                </div>
                <div class="link-actions">
                    <button class="action-btn" onclick="window.open('${escapeHtml(link.sourceUrl)}', '_blank')" title="Отиди на страницата с линка">🏠</button>
                    <button class="action-btn" onclick="window.open('${escapeHtml(link.url)}', '_blank')">🔗</button>
                    ${link.status === 'error' ? `<button class="action-btn" onclick="recheckLink('${link.url}')">🔄</button>` : ''}
                    ${link.status === 'success' && link.method ? `<button class="action-btn" onclick="showMethodInfo('${escapeHtml(link.method)}', '${escapeHtml(link.url)}')">ℹ️</button>` : ''}
                </div>
            </div>
        `;
    }).join('');
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// ==========================
// ДОПОЛНИТЕЛНИ UI ФУНКЦИИ
// ==========================

async function recheckLink(url) {
    const linkIndex = allLinks.findIndex(l => l.url === url);
    if (linkIndex === -1) return;

    const link = allLinks[linkIndex];
    allLinks[linkIndex] = { ...link, status: 'pending', statusCode: null, responseTime: null, error: null };

    updateStats();
    renderResults();

    try {
        const result = await checkLink(link);
        allLinks[linkIndex] = result;
        updateStats();
        renderResults();

        if (result.status === 'success') {
            showMessage(`Линкът е повторно проверен успешно`, 'success');
        } else {
            showMessage(`Линкът все още е счупен`, 'warning');
        }
    } catch (error) {
        allLinks[linkIndex] = { ...link, status: 'error', error: error.message };
        updateStats();
        renderResults();
        showMessage(`Грешка при повторната проверка: ${error.message}`, 'error');
    }
}

function showMethodInfo(method, url) {
    const methodInfo = {
        'server-HEAD': 'Директна проверка чрез локалния сървър (HEAD request)',
        'server-GET': 'Директна проверка чрез локалния сървър (GET fallback)',
        'server-error': 'Грешка при комуникация със сървъра'
    };

    const info = methodInfo[method] || `Метод: ${method}`;
    showMessage(`🔧 ${info}\n📎 URL: ${url}`, 'info');
}

// ==========================
// ANALYSIS FUNCTIONS
// ==========================

function showLinkAnalysis() {
    // Calculate link type statistics
    const typeStats = {};
    allLinks.forEach(link => {
        typeStats[link.type] = (typeStats[link.type] || 0) + 1;
    });

    // Update total count
    document.getElementById('analysis-total').textContent = allLinks.length;

    // Update individual type counts
    Object.keys(LINK_TYPES).forEach(type => {
        const countEl = document.getElementById(`type-count-${type}`);
        if (countEl) {
            if (type === 'all') {
                countEl.textContent = allLinks.length;
            } else {
                countEl.textContent = typeStats[type] || 0;
            }
        }
    });

    // Create breakdown items
    const breakdownEl = document.getElementById('analysis-breakdown');
    const breakdownItems = [];

    Object.entries(LINK_TYPES).forEach(([type, info]) => {
        if (type !== 'all') {
            const count = typeStats[type] || 0;
            if (count > 0) {
                breakdownItems.push(`
                    <div class="breakdown-item">
                        <span class="breakdown-icon">${info.icon}</span>
                        <span class="breakdown-text">${info.label}</span>
                        <span class="breakdown-count">${count}</span>
                    </div>
                `);
            }
        }
    });

    breakdownEl.innerHTML = breakdownItems.join('');

    // Show analysis section
    document.getElementById('analysis-section').classList.remove('hidden');
    appState = 'analysis';
}

function handleTypeSelection(type) {
    // Update selected types
    if (type === 'all') {
        selectedTypes = ['all'];
    } else {
        if (selectedTypes.includes('all')) {
            selectedTypes = [];
        }
        if (selectedTypes.includes(type)) {
            selectedTypes = selectedTypes.filter(t => t !== type);
            if (selectedTypes.length === 0) {
                selectedTypes = ['all'];
            }
        } else {
            selectedTypes.push(type);
        }
    }

    // Update UI
    document.querySelectorAll('.type-btn').forEach(btn => {
        const btnType = btn.dataset.type;
        if (selectedTypes.includes(btnType) || (btnType === 'all' && selectedTypes.includes('all'))) {
            btn.classList.add('selected');
        } else {
            btn.classList.remove('selected');
        }
    });
}

function restartAnalysis() {
    appState = 'idle';
    document.getElementById('analysis-section').classList.add('hidden');
    selectedTypes = ['all'];

    // Reset type buttons
    document.querySelectorAll('.type-btn').forEach(btn => {
        btn.classList.remove('selected');
        if (btn.dataset.type === 'all') {
            btn.classList.add('selected');
        }
    });
}
