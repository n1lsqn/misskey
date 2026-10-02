/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { Agent, createServer } from 'node:http';
import { once } from 'node:events';
import { expect, test } from 'vitest';
import { HttpRequestService } from '@/core/HttpRequestService.js';

test('redirect error mode does not send a request to the redirect destination', async () => {
	let destinationRequests = 0;
	const server = createServer((req, res) => {
		if (req.url === '/redirect') {
			res.writeHead(302, { Location: '/destination' });
			res.end();
		} else {
			destinationRequests++;
			res.end('{}');
		}
	});
	const agent = new Agent();
	server.listen(0, '127.0.0.1');
	await once(server, 'listening');
	try {
		const address = server.address();
		if (address == null || typeof address === 'string') throw new Error('Expected a TCP test server');
		const service = Object.create(HttpRequestService.prototype) as HttpRequestService;
		Object.assign(service, { config: { userAgent: 'misskey-test' } });
		Object.defineProperty(service, 'getAgentByUrl', { value: () => agent });
		const url = `http://127.0.0.1:${address.port}/redirect`;
		await expect(service.send(url, { redirect: 'error', timeout: 1000 })).rejects.toThrow();
		expect(destinationRequests).toBe(0);
		// Existing callers retain the default redirect behavior.
		await service.send(url, { timeout: 1000 });
		expect(destinationRequests).toBe(1);
	} finally {
		agent.destroy();
		server.closeAllConnections();
		await new Promise<void>(resolve => server.close(() => resolve()));
	}
});
