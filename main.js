// ==========================
// ОСНОВНИ КОНТРОЛИ
// ==========================

async function startChecking() {
    if (isChecking || appState !== 'idle') return;

    // Check server status before starting
    const serverOk = await checkServerHealth();
    if (!serverOk) {
        showMessage('❌ Локалният сървър не е достъпен. Стартирайте: node server.js', 'error');
        return;
    }

    const url = elements.blogspotUrl.value.trim();
    if (!url) {
        showMessage('Моля, въведете валиден Blogspot URL', 'error');
        return;
    }

    isChecking = true;
    elements.checkBtn.disabled = true;
    elements.checkBtn.textContent = '⏳ Анализиране...';

    try {
        // Fetch posts
        const posts = await fetchBlogspotData(url);

        if (posts.length === 0) {
            showMessage('Не са намерени публикации в указания блог', 'warning');
            return;
        }

        // Extract links
        allLinks = extractLinksFromPosts(posts);

        if (allLinks.length === 0) {
            showMessage('Не са намерени линкове в публикациите', 'warning');
            return;
        }

        showMessage(`Намерени са ${allLinks.length} линка за проверка`, 'info');

        // Show analysis instead of directly checking
        showLinkAnalysis();

    } catch (error) {
        console.error('Error:', error);
        showMessage(`Грешка: ${error.message}`, 'error');
    } finally {
        isChecking = false;
        elements.checkBtn.disabled = false;
        elements.checkBtn.textContent = '🔍 Провери линковете';
    }
}

async function startActualChecking() {
    if (isChecking || appState !== 'analysis') return;

    const linksToCheck = getLinksToCheck();
    if (linksToCheck.length === 0) {
        showMessage('Няма линкове за проверка с избраните типове', 'warning');
        return;
    }

    appState = 'checking';
    isChecking = true;

    // Hide analysis, show checking UI
    document.getElementById('analysis-section').classList.add('hidden');
    elements.statsSection.classList.remove('hidden');
    elements.progressSection.classList.remove('hidden');
    elements.resultsSection.classList.remove('hidden');

    // Update button
    document.getElementById('start-checking-btn').disabled = true;
    document.getElementById('start-checking-btn').textContent = '🚀 Проверява се...';

    try {
        showMessage(`Започва проверка на ${linksToCheck.length} линка...`, 'info');

        // Reset status for links to be checked
        linksToCheck.forEach(link => {
            link.status = 'pending';
            link.statusCode = null,
            link.responseTime = null,
            link.error = null
        });

        updateStats(linksToCheck);
        renderResults();

        // Start checking
        await checkLinksBatch(linksToCheck);

        // Show control buttons
        elements.refreshBrokenBtn.classList.remove('hidden');
        elements.copyBrokenBtn.classList.remove('hidden');

        const errorCount = allLinks.filter(l => l.status === 'error').length;

        if (errorCount > 0) {
            showMessage(`Проверката завърши! Намерени са ${errorCount} счупени линка.`, 'warning');
        } else {
            showMessage('Проверката завърши! Всички линкове работят коректно.', 'success');
        }

    } catch (error) {
        console.error('Error:', error);
        showMessage(`Грешка при проверката: ${error.message}`, 'error');
    } finally {
        isChecking = false;
        document.getElementById('start-checking-btn').disabled = false;
        document.getElementById('start-checking-btn').textContent = '🚀 Започни проверка';
    }
}

function getLinksToCheck() {
    if (selectedTypes.includes('all')) {
        return [...allLinks];
    }

    return allLinks.filter(link => selectedTypes.includes(link.type));
}

// ==========================
// ДОПОЛНИТЕЛНИ ФУНКЦИИ
// ==========================

async function refreshBrokenLinks() {
    const brokenLinks = allLinks.filter(l => l.status === 'error');
    if (brokenLinks.length === 0) {
        showMessage('Няма счупени линкове за обновяване', 'info');
        return;
    }

    showMessage(`Повторна проверка на ${brokenLinks.length} счупени линка...`, 'info');

    // Reset broken links to pending
    brokenLinks.forEach(link => {
        link.status = 'pending';
        link.statusCode = null,
        link.responseTime = null,
        link.error = null
    });

    updateStats();
    renderResults();

    // Check only the broken links
    await checkLinksBatch(brokenLinks);

    const stillBroken = brokenLinks.filter(l => l.status === 'error').length;
    const fixed = brokenLinks.length - stillBroken;

    if (fixed > 0) {
        showMessage(`Поправени ${fixed} линка, ${stillBroken} все още счупени`, 'success');
    } else {
        showMessage('Нито един линк не беше поправен', 'warning');
    }
}

function copyBrokenLinks() {
    const brokenLinks = allLinks.filter(l => l.status === 'error');
    if (brokenLinks.length === 0) {
        showMessage('Няма счупени линкове за копиране', 'warning');
        return;
    }

    const brokenUrls = brokenLinks.map(link => link.url).join('\n');

    navigator.clipboard.writeText(brokenUrls).then(() => {
        showMessage(`Копирани са ${brokenLinks.length} счупени линка в клипборда`, 'success');
    }).catch(() => {
        showMessage('Неуспешно копиране в клипборда', 'error');
    });
}

function clearResults() {
    if (isChecking) return;

    allLinks = [];
    currentFilter = 'all';

    elements.statsSection.classList.add('hidden');
    elements.progressSection.classList.add('hidden');
    elements.resultsSection.classList.add('hidden');
    elements.refreshBrokenBtn.classList.add('hidden');
    elements.copyBrokenBtn.classList.add('hidden');

    elements.progressFill.style.width = '0%';
    elements.progressText.textContent = 'Подготовка...';

    updateStats();
    renderResults();

    showMessage('Резултатите са изчистени', 'info');
}

// ==========================
// ИНИЦИАЛИЗАЦИЯ
// ==========================

async function init() {
    // Check server status on load
    await checkServerHealth();

    // Check server status every 30 seconds
    setInterval(checkServerHealth, 30000);

    elements.checkBtn.addEventListener('click', startChecking);
    elements.refreshBrokenBtn.addEventListener('click', refreshBrokenLinks);
    elements.copyBrokenBtn.addEventListener('click', copyBrokenLinks);
    elements.clearBtn.addEventListener('click', clearResults);

    // Analysis section buttons
    document.getElementById('start-checking-btn').addEventListener('click', startActualChecking);
    document.getElementById('restart-analysis-btn').addEventListener('click', restartAnalysis);

    // Type selection buttons
    document.querySelectorAll('.type-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const type = e.target.closest('.type-btn').dataset.type;
            handleTypeSelection(type);
        });
    });

    // Filter buttons
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');
            currentFilter = e.target.dataset.filter;
            currentPage = 1; // Reset to first page when filter changes
            renderResults();
        });
    });

    // Pagination buttons
    document.getElementById('prev-page').addEventListener('click', () => {
        if (currentPage > 1) {
            currentPage--;
            renderResults();
        }
    });

    document.getElementById('next-page').addEventListener('click', () => {
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
        const totalPages = Math.ceil(filteredLinks.length / itemsPerPage);
        if (currentPage < totalPages) {
            currentPage++;
            renderResults();
        }
    });

    // Enter key support
    elements.blogspotUrl.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && !isChecking) {
            startChecking();
        }
    });
}

// Initialize the application
init();
