import chokidar from "chokidar";
import fs from "node:fs";
import path from "node:path";
import { imagingStudies, patients, createImagingStudy } from "./sampleData.js";
import { analyzeImagingStudy } from "./ai/visionAnalyzer.js";

const WATCH_DIR = "C:\\Clinic_MVP\\Dropzone_XRay";

export function startWatchdog() {
  if (!fs.existsSync(WATCH_DIR)) {
    try {
      fs.mkdirSync(WATCH_DIR, { recursive: true });
      console.log(`[Watchdog] Created directory: ${WATCH_DIR}`);
    } catch (err) {
      console.error(`[Watchdog] Failed to create directory: ${WATCH_DIR}`, err);
      return;
    }
  }

  console.log(`[Watchdog] Starting directory watcher for: ${WATCH_DIR}`);

  const watcher = chokidar.watch(WATCH_DIR, {
    ignored: /(^|[\/\\])\../, // ignore dotfiles
    persistent: true,
    ignoreInitial: true,
    awaitWriteFinish: {
      stabilityThreshold: 2000,
      pollInterval: 100
    }
  });

  const queue: string[] = [];
  let processing = false;

  async function processQueue() {
    if (processing || queue.length === 0) return;
    processing = true;

    while (queue.length > 0) {
      const filePath = queue.shift()!;
      console.log(`[Watchdog] Processing file: ${filePath}`);
      try {
        const ext = path.extname(filePath).toLowerCase();
        if (![".png", ".jpg", ".jpeg", ".tiff", ".bmp"].includes(ext)) {
          console.log(`[Watchdog] Ignored non-image file: ${filePath}`);
          continue;
        }

        const defaultPatient = patients[0];
        if (!defaultPatient) {
          console.error("[Watchdog] No patients found in DB, cannot create study.");
          continue;
        }

        // Create a new study
        const title = `Auto-Imported X-Ray (${path.basename(filePath)})`;
        const study = createImagingStudy({
          patientId: defaultPatient.id,
          kind: "opg",
          title,
          sourceKind: "folder_watch",
          sourceName: "Watchdog Dropzone"
        });

        study.storagePath = filePath;
        imagingStudies.push(study);
        console.log(`[Watchdog] Created imaging study ${study.id} for file ${path.basename(filePath)}`);

        const fileBytes = fs.readFileSync(filePath);
        const base64 = fileBytes.toString("base64");
        const mime = ext === ".png" ? "image/png" : "image/jpeg";
        const dataUrl = `data:${mime};base64,${base64}`;

        console.log(`[Watchdog] Starting AI analysis for study ${study.id}...`);
        const analysisResult = await analyzeImagingStudy(dataUrl);
        
        study.aiSummary = analysisResult.summary;
        (study as any).aiToothUpdates = analysisResult.toothUpdates;
        
        console.log(`[Watchdog] AI analysis complete for study ${study.id}`);

      } catch (err) {
        console.error(`[Watchdog] Error processing file ${filePath}:`, err);
      }

      // Add a safety cooldown between sequential files to prevent API key limits
      await new Promise((resolve) => setTimeout(resolve, 3000));
    }

    processing = false;
  }

  watcher.on("add", (filePath) => {
    console.log(`[Watchdog] New file detected and queued: ${filePath}`);
    queue.push(filePath);
    processQueue();
  });

  watcher.on("error", error => console.error(`[Watchdog] Watcher error: ${error}`));
}
