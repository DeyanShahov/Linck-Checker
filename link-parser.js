// ==========================
// LINK TYPE DETECTION
// ==========================

function detectLinkType(url) {
    // Images
    if (url.match(/\.(jpg|jpeg|png|gif|webp|svg|bmp|ico|tiff|avif)$/i)) {
        return 'image';
    }

    // Videos
    if (url.match(/\.(mp4|avi|mov|webm|mkv|flv|wmv|mpg|mpeg|m4v|3gp)$/i)) {
        return 'video';
    }

    // Audio
    if (url.match(/\.(mp3|wav|flac|aac|ogg|m4a|wma|opus)$/i)) {
        return 'audio';
    }

    // Documents
    if (url.match(/\.(pdf|doc|docx|xls|xlsx|ppt|pptx|txt|rtf|odt|ods|odp)$/i)) {
        return 'document';
    }

    // YouTube
    if (url.includes('youtube.com') || url.includes('youtu.be')) {
        return 'youtube';
    }

    // Vimeo
    if (url.includes('vimeo.com')) {
        return 'vimeo';
    }

    // Blogger images
    if (url.includes('blogger.googleusercontent.com') || url.includes('googleusercontent.com')) {
        return 'image';
    }

    // General web pages (HTTP/HTTPS URLs)
    if (url.startsWith('http')) {
        return 'webpage';
    }

    return 'unknown';
}

// ==========================
// ЛИНК ПАРСЕР
// ==========================

function extractLinksFromPosts(posts) {
    const links = new Map();
    const urlRegex = /https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)/g;

    posts.forEach(post => {
        // Extract all URLs from content
        const urls = post.content.match(urlRegex) || [];

        // Also extract from <a> and <img> tags more reliably
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = post.content;

        // Get links from <a> tags
        tempDiv.querySelectorAll('a[href]').forEach(a => {
            const href = a.getAttribute('href');
            if (href && (href.startsWith('http://') || href.startsWith('https://'))) {
                urls.push(href);
            }
        });

        // Get links from <img> tags
        tempDiv.querySelectorAll('img[src]').forEach(img => {
            const src = img.getAttribute('src');
            if (src && (src.startsWith('http://') || src.startsWith('https://'))) {
                urls.push(src);
            }
        });

        // Get links from <iframe> tags
        tempDiv.querySelectorAll('iframe[src]').forEach(iframe => {
            const src = iframe.getAttribute('src');
            if (src && (src.startsWith('http://') || src.startsWith('https://'))) {
                urls.push(src);
            }
        });

        urls.forEach(url => {
            try {
                const cleanUrl = new URL(url).href;
                if (!links.has(cleanUrl)) {
                    links.set(cleanUrl, {
                        url: cleanUrl,
                        status: 'pending',
                        statusCode: null,
                        responseTime: null,
                        source: post.title,
                        sourceUrl: post.url,
                        type: detectLinkType(cleanUrl) // Добавяме тип на линка
                    });
                }
            } catch (e) {
                // Invalid URL, skip
            }
        });
    });

    // Return all found links (no limits)
    return Array.from(links.values());
}
