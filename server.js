import 'dotenv/config';
import bcrypt from 'bcryptjs';
import connectSqlite3 from 'connect-sqlite3';
import express from 'express';
import { rateLimit } from 'express-rate-limit';
import session from 'express-session';
import { mkdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const app = express();
const root = path.dirname(fileURLToPath(import.meta.url));
const dataDirectory = path.join(root, 'data');
const SQLiteStore = connectSqlite3(session);
const port = Number(process.env.PORT || 3000);

if (!process.env.SESSION_SECRET || process.env.SESSION_SECRET.length < 32) {
	console.error('Missing or weak SESSION_SECRET. Run "npm run setup-admin" first.');
	process.exit(1);
}

mkdirSync(dataDirectory, { recursive: true });
app.disable('x-powered-by');
app.set('trust proxy', 1);
app.use(express.json({ limit: '12kb' }));
app.use(session({
	name: 'shija.sid',
	secret: process.env.SESSION_SECRET,
	store: new SQLiteStore({ dir: dataDirectory, db: 'sessions.sqlite' }),
	resave: false,
	saveUninitialized: false,
	proxy: true,
	cookie: {
		httpOnly: true,
		secure: process.env.NODE_ENV === 'production',
		sameSite: 'strict',
		maxAge: 8 * 60 * 60 * 1000
	}
}));
app.use((request, response, next) => {
	response.set('Cache-Control', 'no-store');
	next();
});

const loginLimiter = rateLimit({
	windowMs: 15 * 60 * 1000,
	limit: 10,
	standardHeaders: 'draft-8',
	legacyHeaders: false
});

function sendPage(filename, response) {
	response.sendFile(path.join(root, filename));
}

function requireLogin(request, response, next) {
	if (!request.session.authenticated) return response.redirect(303, '/login');
	next();
}

app.get('/healthz', (request, response) => response.status(200).json({ ok: true }));
app.get('/login', (request, response) => {
	if (request.session.authenticated) return response.redirect('/');
	sendPage('login.html', response);
});
app.get('/login.html', (request, response) => response.redirect('/login'));
app.get('/shija-logo.png', (request, response) => sendPage('shija-logo.png', response));

app.get('/api/session', (request, response) => {
	if (!request.session.authenticated) return response.status(401).json({ authenticated: false });
	response.json({ authenticated: true });
});

app.post('/api/login', loginLimiter, async (request, response) => {
	const username = String(request.body?.username || '').trim().toLowerCase();
	const password = String(request.body?.password || '');
	const adminUsername = String(process.env.ADMIN_USERNAME || '').trim().toLowerCase();
	const passwordHash = process.env.ADMIN_PASSWORD_HASH || '';

	if (!adminUsername || !passwordHash) {
		return response.status(503).json({ message: 'Admin login is not configured on this server.' });
	}
	if (!username || !password) return response.status(400).json({ message: 'Enter your username and password.' });

	const passwordMatches = await bcrypt.compare(password, passwordHash);
	if (username !== adminUsername || !passwordMatches) {
		return response.status(401).json({ message: 'Username or password is incorrect.' });
	}

	try {
		await new Promise((resolve, reject) => request.session.regenerate(error => error ? reject(error) : resolve()));
		request.session.authenticated = true;
		await new Promise((resolve, reject) => request.session.save(error => error ? reject(error) : resolve()));
		response.json({ authenticated: true });
	} catch {
		response.status(500).json({ message: 'Could not start a secure session. Please try again.' });
	}
});

app.post('/api/logout', (request, response) => {
	if (!request.session) return response.sendStatus(204);
	request.session.destroy(() => {
		response.clearCookie('shija.sid', { httpOnly: true, sameSite: 'strict', secure: process.env.NODE_ENV === 'production' });
		response.sendStatus(204);
	});
});

app.get(['/', '/index.html'], requireLogin, (request, response) => sendPage('index.html', response));
app.use((request, response) => response.status(404).send('Not found'));

app.listen(port, '0.0.0.0', () => {
	console.log(`Shija Patient Records listening on port ${port}`);
});