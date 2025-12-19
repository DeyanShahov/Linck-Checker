// ==========================
// SERVER COMMUNICATION
// ==========================

async function checkServerHealth() {
    try {
        const response = await fetch(`${SERVER_BASE_URL}/health`, {
            timeout: 3000
        });
        const data = await response.json();

        if (data.status === 'ok') {
            serverOnline = true;
            updateServerStatus(true, 'Сървърът работи');
            return true;
        }
    } catch (error) {
        console.warn('Server health check failed:', error);
    }

    serverOnline = false;
    updateServerStatus(false, 'Сървърът не е достъпен');
    return false;
}

function updateServerStatus(online, message) {
    const statusEl = document.getElementById('server-status');
    const iconEl = document.getElementById('status-icon');
    const textEl = document.getElementById('status-text');

    if (online) {
        statusEl.className = 'server-status online';
        iconEl.textContent = '🟢';
    } else {
        statusEl.className = 'server-status offline';
        iconEl.textContent = '🔴';
    }

    textEl.textContent = message;
}

async function checkLinkViaServer(link) {
    const startTime = Date.now();

    try {
        const response = await fetch(`${SERVER_BASE_URL}/check?url=${encodeURIComponent(link.url)}`, {
            timeout: CHECK_CONFIG.requestTimeout
        });

        if (!response.ok) {
            throw new Error(`Server responded with ${response.status}`);
        }

        const data = await response.json();
        const responseTime = Date.now() - startTime;

        // Enhanced success validation based on server response
        const isSuccess = isValidSuccessStatus(data.status, link.url, data);

        return {
            ...link,
            status: isSuccess ? 'success' : 'error',
            statusCode: data.status,
            responseTime: data.responseTime,
            method: `server-${data.method}`,
            serverData: data,
            note: data.statusText || (data.error ? `Error: ${data.error}` : null)
        };

    } catch (error) {
        return {
            ...link,
            status: 'error',
            statusCode: null,
            responseTime: Date.now() - startTime,
            error: error.message,
            method: 'server-error'
        };
    }
}

// ==========================
// BLOGSPOT API
// ==========================

async function fetchBlogspotData(url) {
    const cleanUrl = url.replace(/\/$/, '');
    const callbackName = 'jsonpCallback' + Date.now();
    const script = document.createElement('script');

    return new Promise((resolve, reject) => {
        window[callbackName] = (json) => {
            if (!json.feed || !json.feed.entry) {
                reject(new Error('Невалиден формат на данните от Blogger'));
                return;
            }

            const posts = json.feed.entry.map(entry => {
                const id = entry.id.$t.split('.post-')[1];
                const linkObj = entry.link.find(l => l.rel === 'alternate');
                const url = linkObj ? linkObj.href : null;
                const content = entry.content ? entry.content.$t : '';
                const title = entry.title.$t;

                return {
                    id: id,
                    title: title,
                    url: url,
                    content: content,
                    date: entry.published.$t.slice(0, 10)
                };
            });

            resolve(posts);
            delete window[callbackName];
            document.head.removeChild(script);
        };

        const maxResults = CHECK_CONFIG.maxPosts;
        script.src = `${cleanUrl}/feeds/posts/default?alt=json-in-script&callback=${callbackName}&max-results=${maxResults}`;
        script.onerror = () => {
            reject(new Error('Неуспешно зареждане на данните от Blogger'));
            delete window[callbackName];
            document.head.removeChild(script);
        };

        document.head.appendChild(script);
    });
}

// ==========================
// LINK CHECKER
// ==========================

async function checkLink(link) {
    // Check if server is online
    if (!serverOnline) {
        return {
            ...link,
            status: 'error',
            statusCode: null,
            responseTime: 0,
            error: 'Локалният сървър не е достъпен',
            method: 'server-offline'
        };
    }

    return await checkLinkViaServer(link);
}

function isValidSuccessStatus(statusCode, url, serverData) {
    // More lenient criteria for success
    if (statusCode >= 200 && statusCode < 300) {
        return true; // Standard success codes
    }

    // 403 Forbidden is often a false positive for working sites
    if (statusCode === 403) {
        return true;
    }

    // 401 Unauthorized but some sites work
    if (statusCode === 401) {
        return true;
    }

    // If we get any content at all, consider it successful
    if (serverData && (serverData.hasContent || serverData.contentLength > 0)) {
        return true;
    }

    return false;
}

async function checkLinksBatch(links) {
    const batches = [];

    for (let i = 0; i < links.length; i += CHECK_CONFIG.batchSize) {
        batches.push(links.slice(i, i + CHECK_CONFIG.batchSize));
    }

    let checkedCount = 0;

    for (const batch of batches) {
        const promises = batch.map(link => checkLink(link));
        const results = await Promise.allSettled(promises);

        results.forEach((result, index) => {
            const linkIndex = allLinks.indexOf(batch[index]);
            if (result.status === 'fulfilled') {
                Object.assign(allLinks[linkIndex], result.value);
            } else {
                Object.assign(allLinks[linkIndex], {
                    status: 'error',
                    statusCode: null,
                    error: 'Check failed'
                });
            }
        });

        checkedCount += batch.length;
        updateProgress(checkedCount, links.length);
        updateStats(links);
        renderResults();

        // Delay between batches
        if (CHECK_CONFIG.batchDelay > 0) {
            await new Promise(resolve => setTimeout(resolve, CHECK_CONFIG.batchDelay));
        }
    }
}
