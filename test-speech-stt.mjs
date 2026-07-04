import fs from "fs";
import { spawn } from "child_process";

const port = 3055;
const apiProcess = spawn("npm", ["run", "dev", "-w", "@dental/api"], {
  env: { ...process.env, PORT: port.toString(), DENTAL_SPEECH_PROVIDER: "demo" },
  shell: true
});

console.log(`Starting API server on port ${port}...`);
apiProcess.stdout.pipe(process.stdout);
apiProcess.stderr.pipe(process.stderr);

const delay = ms => new Promise(res => setTimeout(res, ms));

async function runTest() {
  console.log("Waiting 5 seconds for server to boot...");
  await delay(5000);

  let serverUp = false;
  for (let i = 0; i < 30; i++) {
    try {
      await fetch(`http://localhost:4100/api/health`);
      serverUp = true;
      break;
    } catch (e) {
      console.log("Server not up yet on 4100, retrying...");
      await delay(2000);
    }
  }

  if (!serverUp) {
    console.error("Server did not boot in time.");
    apiProcess.kill();
    process.exit(1);
  }

  try {
    const audioData = fs.readFileSync("test_speech.wav");
    const audioBase64 = audioData.toString("base64");
    const payload = {
      recordingId: "test-rec-" + Date.now(),
      chunkIndex: 0,
      mimeType: "audio/wav",
      audioBase64: audioBase64,
      language: "ru",
      source: "settings_lab",
      durationMs: 5000
    };
    
    console.log("Sending POST to /api/speech/transcribe-chunk...");
    
    const res = await fetch(`http://localhost:4100/api/speech/transcribe-chunk`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    
    const text = await res.text();
    console.log(`Response status: ${res.status}`);
    console.log(`Response body: ${text}`);

  } catch (err) {
    console.error("Test failed:", err);
  } finally {
    apiProcess.kill();
    process.exit(0);
  }
}

runTest();
