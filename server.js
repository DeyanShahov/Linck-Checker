const express = require('express');
const fetch = require('node-fetch');
const app = express();
const port = 3000;

// CORS middleware for local development
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') {
        res.sendStatus(200);
    } else {
        next();
    }
});

// Middleware for parsing JSON
app.use(express.json());

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ status: 'ok', message: 'Link checker server is running' });
});

// Link checking endpoint
app.get('/check', async (req, res) => {
    const url = req.query.url;
    const startTime = Date.now();

    if (!url) {
        return res.status(400).json({
            error: 'URL parameter is required',
            status: 0,
            responseTime: Date.now() - startTime
        });
    }

    try {
        // Validate URL format
        new URL(url);

        // Make direct HTTP request (HEAD for efficiency, fallback to GET)
        let response;
        let method = 'HEAD';

        try {
            response = await fetch(url, {
                method: 'HEAD',
                timeout: 10000,
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
                    'Accept': '*/*'
                }
            });
        } catch (headError) {
            // Fallback to GET if HEAD is not supported
            method = 'GET';
            response = await fetch(url, {
                method: 'GET',
                timeout: 15000,
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
                    'Accept': '*/*'
                }
            });
        }

        const responseTime = Date.now() - startTime;

        // Return comprehensive response data
        res.json({
            url: url,
            status: response.status,
            ok: response.ok,
            statusText: response.statusText,
            method: method,
            responseTime: responseTime,
            headers: Object.fromEntries(response.headers.entries()),
            contentType: response.headers.get('content-type'),
            contentLength: response.headers.get('content-length'),
            // For GET requests, we can check if there's actual content
            hasContent: method === 'GET' ? true : null
        });

    } catch (error) {
        const responseTime = Date.now() - startTime;

        res.json({
            url: url,
            error: error.message,
            errorType: error.name,
            status: 0,
            responseTime: responseTime,
            method: 'direct'
        });
    }
});

// Batch checking endpoint (optional optimization)
app.post('/check-batch', async (req, res) => {
    const urls = req.body.urls;

    if (!Array.isArray(urls)) {
        return res.status(400).json({ error: 'URLs must be an array' });
    }

    if (urls.length > 50) {
        return res.status(400).json({ error: 'Maximum 50 URLs per batch' });
    }

    const results = [];

    for (const url of urls) {
        const startTime = Date.now();

        try {
            new URL(url);

            const response = await fetch(url, {
                method: 'HEAD',
                timeout: 8000,
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                }
            });

            results.push({
                url: url,
                status: response.status,
                ok: response.ok,
                responseTime: Date.now() - startTime,
                method: 'HEAD'
            });

        } catch (error) {
            results.push({
                url: url,
                error: error.message,
                status: 0,
                responseTime: Date.now() - startTime,
                method: 'direct'
            });
        }

        // Small delay between requests to be respectful
        await new Promise(resolve => setTimeout(resolve, 100));
    }

    res.json({ results });
});

// Error handling middleware
app.use((error, req, res, next) => {
    console.error('Server error:', error);
    res.status(500).json({
        error: 'Internal server error',
        message: error.message
    });
});

// Start server
app.listen(port, 'localhost', () => {
    console.log(`🔗 Link Checker Server running at http://localhost:${port}`);
    console.log(`📊 Health check: http://localhost:${port}/health`);
    console.log(`🔍 Single check: http://localhost:${port}/check?url=https://example.com`);
    console.log(`📦 Batch check: POST http://localhost:${port}/check-batch with { "urls": ["url1", "url2"] }`);
});

// Graceful shutdown
process.on('SIGINT', () => {
    console.log('\n🛑 Shutting down Link Checker Server...');
    process.exit(0);
});

process.on('SIGTERM', () => {
    console.log('\n🛑 Shutting down Link Checker Server...');
    process.exit(0);
});
