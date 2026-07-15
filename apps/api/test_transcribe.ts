import { readFileSync } from "node:fs";
import { loadAdditionalServerEnv } from "./src/env/loadServerEnv.js";
import { setupProxyAndTunnels } from "./src/server.js";
import { transcribeSpeechChunk } from "./src/speech/gateway.js";

loadAdditionalServerEnv();

async function run() {
	await setupProxyAndTunnels();
	console.log("Started test with proxy");
	const audio = readFileSync("../../test_dictation.wav");
	const base64 = audio.toString("base64");

	try {
		const res = await transcribeSpeechChunk({
			recordingId: "test_run_" + Date.now(),
			chunkIndex: 0,
			mimeType: "audio/wav",
			audioBase64: base64,
			durationMs: 8000,
			language: "ru",
			source: "visit",
			patientId: "test_pat",
			visitId: "test_vis",
			specialty: "universal",
			clientRecordedAt: new Date().toISOString(),
		});
		console.log("\n--- FULL RESULT ---");
		console.log(JSON.stringify(res.chunk, null, 2));
		console.log("--------------\n");
	} catch (err) {
		console.error("Error:", err);
	}
}

run();
