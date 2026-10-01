import bcrypt from 'bcryptjs';
import { randomBytes } from 'node:crypto';
import { existsSync, writeFileSync } from 'node:fs';
import readline from 'node:readline/promises';
import { stdin, stdout } from 'node:process';

function askForPassword(prompt) {
	if (!stdin.isTTY || typeof stdin.setRawMode !== 'function') {
		throw new Error('Run this command in an interactive terminal to enter the password securely.');
	}
	return new Promise((resolve, reject) => {
		stdout.write(prompt);
		stdin.setRawMode(true);
		stdin.resume();
		let password = '';
		const onData = chunk => {
			for (const character of chunk.toString()) {
				if (character === '\u0003') {
					stdin.setRawMode(false);
					stdin.off('data', onData);
					stdout.write('\n');
					reject(new Error('Setup cancelled.'));
					return;
				}
				if (character === '\r' || character === '\n') {
					stdin.setRawMode(false);
					stdin.off('data', onData);
					stdout.write('\n');
					resolve(password);
					return;
				}
				if (character === '\u007f' || character === '\b') password = password.slice(0, -1);
				else if (character >= ' ') password += character;
			}
		};
		stdin.on('data', onData);
	});
}

if (existsSync('.env')) {
	console.error('.env already exists. Remove or edit it manually if you are resetting the admin account.');
	process.exit(1);
}

const terminal = readline.createInterface({ input: stdin, output: stdout });
try {
	terminal.close();
	const password = await askForPassword('Admin password (minimum 12 characters): ');
	if (password.length < 12) throw new Error('Choose a password with at least 12 characters.');
	const confirmation = await askForPassword('Confirm password: ');
	if (password !== confirmation) throw new Error('Passwords do not match.');
	const passwordHash = await bcrypt.hash(password, 12);
	const values = [
		`SESSION_SECRET=${randomBytes(48).toString('hex')}`,
		'ADMIN_USERNAME=admin',
		`ADMIN_PASSWORD_HASH=${passwordHash}`,
		'NODE_ENV=development'
	].join('\n') + '\n';
	writeFileSync('.env', values, { mode: 0o600, flag: 'wx' });
	console.log('Admin login configured in the ignored .env file. Start the app with "npm start".');
} catch (error) {
	terminal.close();
	console.error(error.message);
	process.exitCode = 1;
}