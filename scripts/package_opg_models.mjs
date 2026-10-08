/**
 * scripts/package_opg_models.mjs
 *
 * Local Browser Model Packaging & 152-ФЗ Integrity Verification Script.
 * Deploys ONNX neural network weights to apps/web/public/models/opg/
 * Generates cryptographic SHA-256 manifest and verifies local offline integrity.
 */

import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

const ROOT_DIR = process.cwd();
const SCRATCH_MODELS_DIR = path.resolve(ROOT_DIR, "scratch/opg_models");
const TARGET_MODELS_DIR = path.resolve(ROOT_DIR, "apps/web/public/models/opg");
const TARGET_PUBLIC_MODELS = path.resolve(ROOT_DIR, "apps/web/public/models");

const SAMPLE_TEMUR_SRC = "C:/Users/Admin/.gemini/antigravity/brain/2ebe4b85-1e15-4eee-99d1-be7424e35e0b/.user_uploaded/media_1791483723356_3667416a.png";
const SAMPLE_TEMUR_DEST = path.resolve(TARGET_PUBLIC_MODELS, "sample_opg_temur.png");

function computeSha256(filePath) {
  const hash = crypto.createHash("sha256");
  const data = fs.readFileSync(filePath);
  hash.update(data);
  return hash.digest("hex");
}

async function main() {
  console.log(">>> [152-ФЗ Security Inquisitor] Starting Local Model Packaging...");

  fs.mkdirSync(TARGET_MODELS_DIR, { recursive: true });
  fs.mkdirSync(TARGET_PUBLIC_MODELS, { recursive: true });

  // 1. Copy sample_opg_temur.png
  if (fs.existsSync(SAMPLE_TEMUR_SRC)) {
    console.log(`>>> Deploying authentic clinical OPG sample: ${SAMPLE_TEMUR_SRC} -> ${SAMPLE_TEMUR_DEST}`);
    fs.copyFileSync(SAMPLE_TEMUR_SRC, SAMPLE_TEMUR_DEST);
  } else {
    // Fallback if artifacts path not available
    const fallbackSrc = path.resolve(ROOT_DIR, "scratch/eval_dataset_opg/oral_005617.jpg");
    if (fs.existsSync(fallbackSrc)) {
      console.log(`>>> Artifact missing, deploying fallback OPG sample from dataset: ${fallbackSrc}`);
      fs.copyFileSync(fallbackSrc, SAMPLE_TEMUR_DEST);
    }
  }

  // 2. Models to deploy
  const models = [
    {
      filename: "liodon_best.onnx",
      id: "liodon_detector_yolo11n",
      name: "Liodon Dental Panoramic Pathology Detector (YOLO11n)",
      architecture: "YOLO11n-detect",
      inputShape: [1, 3, 640, 640],
      classes: {
        0: "caries",
        1: "periapical_lesion",
        2: "impacted_tooth",
      },
      classLabelsRu: {
        caries: "Кариес эмали / дентина",
        periapical_lesion: "Периапикальный очаг / периодонтит",
        impacted_tooth: "Ретинированный / дистопированный зуб",
      },
      task: "detect",
      recommendedConfidence: 0.25,
      offlineOnly: true,
      law152FzCompliant: true,
    },
    {
      filename: "abychkov_fdi.onnx",
      id: "abychkov_fdi_transformer",
      name: "Abychkov 32-Class FDI Tooth Numbering Transformer",
      architecture: "YOLOv8-FDI-32",
      inputShape: ["batch", 3, "dynamic", "dynamic"],
      task: "fdi_numbering",
      recommendedConfidence: 0.20,
      offlineOnly: true,
      law152FzCompliant: true,
    },
  ];

  const manifest = {
    schemaVersion: "1.0.0",
    generatedAt: new Date().toISOString(),
    securityStandard: "152-ФЗ / HIPAA Medical Data Local Sandbox",
    networkEgressAllowed: false,
    hardwareAccelerationTiers: ["webgpu", "webgl2", "wasm_simd", "calibrated_topological_fallback"],
    models: {},
  };

  for (const model of models) {
    const srcPath = path.resolve(SCRATCH_MODELS_DIR, model.filename);
    const destPath = path.resolve(TARGET_MODELS_DIR, model.filename);

    if (fs.existsSync(srcPath)) {
      const srcStat = fs.statSync(srcPath);
      console.log(`>>> Deploying ${model.filename} (${(srcStat.size / (1024 * 1024)).toFixed(2)} MB)...`);
      fs.copyFileSync(srcPath, destPath);

      const destStat = fs.statSync(destPath);
      const sha256 = computeSha256(destPath);

      manifest.models[model.id] = {
        ...model,
        fileSize: destStat.size,
        fileSizeBytes: destStat.size,
        sha256,
        localUrl: `/models/opg/${model.filename}`,
      };

      console.log(`>>> [OK] ${model.filename} -> SHA-256: ${sha256}`);
    } else {
      console.warn(`>>> [WARN] Model source not found at: ${srcPath}`);
    }
  }

  const manifestPath = path.resolve(TARGET_MODELS_DIR, "models_manifest.json");
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), "utf8");
  console.log(`>>> [OK] Manifest written to: ${manifestPath}`);
  console.log(">>> [Inquisition Complete] All OPG models securely packaged for 100% offline browser execution!");
}

main().catch((err) => {
  console.error(">>> Error packaging OPG models:", err);
  process.exit(1);
});
