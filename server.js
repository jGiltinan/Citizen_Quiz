require('dotenv').config();

// 1. Import only what we need for a standard HTTP server
const { createServer } = require('http');
const { parse } = require('url');
const next = require('next');

const dev = process.env.NODE_ENV !== 'production';
const app = next({ dev });
const handle = app.getRequestHandler();

// 2. DELETE the fs and httpsOptions. We don't need them.
// const fs = require('fs');
// const httpsOptions = { ... }

app.prepare().then(() => {
    // 3. Create a simple HTTP server (No options object as the first argument)
    createServer((req, res) => {
        const parsedUrl = parse(req.url, true);
        handle(req, res, parsedUrl);
    }).listen(3000, (err) => {
        if (err) throw err;
        console.log('> Ready on http://localhost:3000');
    });
});
