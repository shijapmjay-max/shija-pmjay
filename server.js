import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const app = express();
const root = path.dirname(fileURLToPath(import.meta.url));
const port = Number(process.env.PORT || 3000);

app.disable('x-powered-by');
app.use((request, response, next) => {
	response.set('Cache-Control', 'no-store');
	next();
});

function sendPage(filename, response) {
	response.sendFile(path.join(root, filename));
}

app.get('/healthz', (request, response) => response.status(200).json({ ok: true }));
app.get('/shija-logo.png', (request, response) => sendPage('shija-logo.png', response));
app.get(['/login', '/login.html'], (request, response) => response.redirect(303, '/'));
app.get(['/', '/index.html'], (request, response) => sendPage('index.html', response));
app.use((request, response) => response.status(404).send('Not found'));

app.listen(port, '0.0.0.0', () => {
	console.log(`Shija Patient Records listening on port ${port}`);
});