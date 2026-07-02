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
    awaitWriteFinish: {
      stabilityThreshold: 2000,
      pollInterval: 100
    }
  });

  watcher.on("add", async (filePath) => {
    console.log(`[Watchdog] New file detected: ${filePath}`);
    try {
      // Basic check if it's an image
      const ext = path.extname(filePath).toLowerCase();
      if (![".png", ".jpg", ".jpeg", ".tiff", ".bmp"].includes(ext)) {
        console.log(`[Watchdog] Ignored non-image file: ${filePath}`);
        return;
      }

      // We need a patient. Let's just pick the first patient for demo purposes
      // In a real scenario, the dropzone might have subfolders by patient ID or parse metadata
      const defaultPatient = patients[0];
      if (!defaultPatient) {
        console.error("[Watchdog] No patients found in DB, cannot create study.");
        return;
      }

      // Create a new study
      const title = `Auto-Imported X-Ray (${path.basename(filePath)})`;
      const study = createImagingStudy({
        patientId: defaultPatient.id,
        kind: "opg", // Default to panoramic or 2d_intraoral
        title,
        sourceKind: "folder_watch",
        sourceName: "Watchdog Dropzone"
      });

      // Assign the storage path directly so the visionAnalyzer can read it later
      study.storagePath = filePath;
      
      // Persist in mock DB
      imagingStudies.push(study);
      console.log(`[Watchdog] Created imaging study ${study.id} for file ${path.basename(filePath)}`);

      // Automatically trigger AI analysis, exactly as requested by user
      const fileBytes = fs.readFileSync(filePath);
      const base64 = fileBytes.toString("base64");
      const mime = ext === ".png" ? "image/png" : "image/jpeg";
      const dataUrl = `data:${mime};base64,${base64}`;

      console.log(`[Watchdog] Starting AI analysis for study ${study.id}...`);
      const analysisResult = await analyzeImagingStudy(dataUrl);
      
      study.aiSummary = analysisResult.summary;
      
      // Assuming toothUpdates property exists on the frontend side, we just attach it
      // as `aiToothUpdates` or similar, to mirror what the /analyze route does.
      (study as any).aiToothUpdates = analysisResult.toothUpdates;
      
      console.log(`[Watchdog] AI analysis complete for study ${study.id}`);

    } catch (err) {
      console.error(`[Watchdog] Error processing file ${filePath}:`, err);
    }
  });

  watcher.on("error", error => console.error(`[Watchdog] Watcher error: ${error}`));
}
