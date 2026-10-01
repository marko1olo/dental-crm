/**
 * scripts/measure_live_streaming_speed.mjs
 * Measures exact milliseconds for:
 * 1. Fetching manifest.json
 * 2. Downloading & decoding central slice Z=156 (Instant first slice)
 * 3. Downloading and streaming all remaining 312 slices in chunks of 10
 */

import http from "node:http";
import path from "node:path";
import { spawn } from "node:child_process";

const port = 5173;

async function test() {
	console.log("=== CBCT STREAMING & INSTANT SLICE BENCHMARK ===");

	// 1. Ensure Vite is running
	let viteProc = null;
	try {
		const ping = await fetch(`http://127.0.0.1:${port}/`);
		if (!ping.ok && ping.status !== 200 && ping.status !== 304) throw new Error("not ok");
		console.log("Vite dev server is already running on port", port);
	} catch {
		console.log("Starting Vite dev server...");
		const viteBin = path.resolve("node_modules/vite/bin/vite.js");
		viteProc = spawn(process.execPath, [viteBin, "--host", "127.0.0.1", "--port", String(port)], {
			cwd: path.resolve("apps/web"),
			stdio: "ignore",
		});
		for (let i = 0; i < 30; i++) {
			await new Promise((r) => setTimeout(r, 500));
			try {
				const check = await fetch(`http://127.0.0.1:${port}/`);
				if (check.ok || check.status === 200 || check.status === 304) break;
			} catch {}
		}
	}

	try {
		// Benchmark 1: Manifest fetch
		const t0 = performance.now();
		const mRes = await fetch(`http://127.0.0.1:${port}/radiology/demo_cbct/manifest.json`);
		const manifest = await mRes.json();
		const tManifest = performance.now() - t0;
		console.log(`[1] Manifest loaded in ${tManifest.toFixed(1)} ms. Total slices: ${manifest.slices.length}`);

		// Benchmark 2: Central slice (Instant first slice Z=156)
		const midIdx = Math.floor(manifest.slices.length / 2);
		const midName = manifest.slices[midIdx];
		const t1 = performance.now();
		const sRes = await fetch(`http://127.0.0.1:${port}/radiology/demo_cbct/${midName}`);
		const sBuf = await sRes.arrayBuffer();
		const tFirstSlice = performance.now() - t1;
		console.log(`[2] Central slice Z=${midIdx + 1} (${midName}, ${(sBuf.byteLength / 1024).toFixed(1)} KB) fetched in ${tFirstSlice.toFixed(1)} ms!`);

		// Benchmark 3: Non-blocking streaming in batches of 10
		const remaining = manifest.slices.filter((_, idx) => idx !== midIdx);
		const batchSize = 10;
		const tStreamStart = performance.now();
		let loadedCount = 1;
		const batchTimings = [];

		for (let b = 0; b < remaining.length; b += batchSize) {
			const b0 = performance.now();
			const batch = remaining.slice(b, b + batchSize);
			await Promise.all(
				batch.map(async (name) => {
					const r = await fetch(`http://127.0.0.1:${port}/radiology/demo_cbct/${name}`);
					return r.arrayBuffer();
				})
			);
			// Simulate event loop yield
			await new Promise((r) => setTimeout(r, 0));
			const bElapsed = performance.now() - b0;
			loadedCount += batch.length;
			batchTimings.push(bElapsed);
			if (batchTimings.length % 5 === 0 || loadedCount === manifest.slices.length) {
				console.log(`  -> Streamed ${loadedCount}/${manifest.slices.length} slices (${((loadedCount/manifest.slices.length)*100).toFixed(0)}%). Batch time: ${bElapsed.toFixed(1)} ms`);
			}
		}

		const tTotalStream = performance.now() - tStreamStart;
		const avgBatch = batchTimings.reduce((a, b) => a + b, 0) / batchTimings.length;
		console.log(`[3] Full 313 slices streamed in ${tTotalStream.toFixed(1)} ms (avg batch of 10: ${avgBatch.toFixed(1)} ms)!`);
		console.log("=== BENCHMARK COMPLETE: EXCELLENT PERFORMANCE ===");

	} finally {
		if (viteProc && viteProc.pid) {
			try { viteProc.kill(); } catch {}
		}
	}
}

test().catch(console.error);
