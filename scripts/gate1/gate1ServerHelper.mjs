/**
 * scripts/gate1/gate1ServerHelper.mjs
 * Dev server lifecycle management for Gate 1 Playwright captures.
 * Mandate 8b <= 120 lines.
 */

import { spawn } from "node:child_process";
import path from "node:path";

export async function isPortResponding(url, timeoutMs = 2000) {
	try {
		const controller = new AbortController();
		const t = setTimeout(() => controller.abort(), timeoutMs);
		const res = await fetch(url, { signal: controller.signal });
		clearTimeout(t);
		return res.ok || res.status === 200 || res.status === 304;
	} catch {
		return false;
	}
}

export async function ensureViteServer(url) {
	const alive = await isPortResponding(url, 1500);
	if (alive) {
		console.log("[Vite] Detected active dev server on port 5173.");
		return null;
	}

	console.log("[Vite] Dev server not responding. Spawning on port 5173...");
	const viteBin = path.resolve("C:/Clinic_MVP/dental-crm/node_modules/vite/bin/vite.js");
	const webDir = path.resolve("C:/Clinic_MVP/dental-crm/apps/web");

	const proc = spawn(process.execPath, [viteBin, "--host", "127.0.0.1", "--port", "5173"], {
		cwd: webDir,
		stdio: "ignore",
	});

	let ready = false;
	for (let i = 0; i < 50; i++) {
		await new Promise((r) => setTimeout(r, 600));
		if (await isPortResponding(url, 1000)) {
			ready = true;
			console.log(`[Vite] Server successfully initialized and responding after ${(i + 1) * 600}ms.`);
			break;
		}
	}

	if (!ready) {
		try {
			proc.kill();
		} catch {}
		throw new Error("[FATAL] Vite dev server failed to start on port 5173 within 30s.");
	}

	return proc;
}
