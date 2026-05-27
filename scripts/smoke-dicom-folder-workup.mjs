import { existsSync } from "node:fs";
import { mkdir, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { createRequire } from "node:module";
import { pathToFileURL } from "node:url";

process.env.DENTAL_STATE_PERSISTENCE = "off";

const imagingRoutesPath = path.resolve("apps/api/dist/routes/imaging.js");
if (!existsSync(imagingRoutesPath)) {
  throw new Error("Build the API first: npm run build");
}

const fixtureRoot = path.join(os.tmpdir(), `dental-crm-synthetic-dicom-${process.pid}`);
const sliceCount = Number(process.env.SMOKE_DICOM_SLICES ?? 48);
const imageWidth = 32;
const imageHeight = 32;

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function paddedDicomValue(vr, value) {
  const buffer = Buffer.isBuffer(value) ? value : Buffer.from(String(value), "latin1");
  if (buffer.length % 2 === 0) return buffer;
  const pad = vr === "UI" ? 0x00 : 0x20;
  return Buffer.concat([buffer, Buffer.from([pad])]);
}

function dicomElement(group, element, vr, value) {
  const payload = paddedDicomValue(vr, value);
  const longVr = new Set(["OB", "OD", "OF", "OL", "OV", "OW", "SQ", "UC", "UR", "UT", "UN"]);
  const header = Buffer.alloc(longVr.has(vr) ? 12 : 8);
  header.writeUInt16LE(group, 0);
  header.writeUInt16LE(element, 2);
  header.write(vr, 4, 2, "ascii");
  if (longVr.has(vr)) {
    header.writeUInt16LE(0, 6);
    header.writeUInt32LE(payload.length, 8);
  } else {
    header.writeUInt16LE(payload.length, 6);
  }
  return Buffer.concat([header, payload]);
}

function us(value) {
  const buffer = Buffer.alloc(2);
  buffer.writeUInt16LE(value, 0);
  return buffer;
}

function syntheticPixels(sliceNumber) {
  const pixels = Buffer.alloc(imageWidth * imageHeight * 2);
  for (let y = 0; y < imageHeight; y += 1) {
    for (let x = 0; x < imageWidth; x += 1) {
      const radial = Math.hypot(x - imageWidth / 2, y - imageHeight / 2);
      const value = Math.max(0, Math.min(4095, Math.round(3600 - radial * 95 + sliceNumber * 9)));
      pixels.writeUInt16LE(value, (y * imageWidth + x) * 2);
    }
  }
  return pixels;
}

function buildSyntheticDicom(sliceNumber) {
  const studyUid = "1.2.826.0.1.3680043.10.54321.20260518.1";
  const seriesUid = "1.2.826.0.1.3680043.10.54321.20260518.2";
  const sopUid = `${seriesUid}.${sliceNumber}`;
  const preamble = Buffer.alloc(132, 0);
  preamble.write("DICM", 128, "ascii");

  return Buffer.concat([
    preamble,
    dicomElement(0x0002, 0x0010, "UI", "1.2.840.10008.1.2.1"),
    dicomElement(0x0008, 0x0018, "UI", sopUid),
    dicomElement(0x0008, 0x0020, "DA", "20260518"),
    dicomElement(0x0008, 0x0060, "CS", "CT"),
    dicomElement(0x0008, 0x1030, "LO", "Synthetic dental CBCT no PHI"),
    dicomElement(0x0008, 0x103e, "LO", "Synthetic mandibular CT stack"),
    dicomElement(0x0010, 0x0010, "PN", "SYNTHETIC^NO_PHI"),
    dicomElement(0x0020, 0x000d, "UI", studyUid),
    dicomElement(0x0020, 0x000e, "UI", seriesUid),
    dicomElement(0x0020, 0x0013, "IS", String(sliceNumber)),
    dicomElement(0x0028, 0x0002, "US", us(1)),
    dicomElement(0x0028, 0x0004, "CS", "MONOCHROME2"),
    dicomElement(0x0028, 0x0010, "US", us(imageHeight)),
    dicomElement(0x0028, 0x0011, "US", us(imageWidth)),
    dicomElement(0x0028, 0x0100, "US", us(16)),
    dicomElement(0x0028, 0x0101, "US", us(12)),
    dicomElement(0x0028, 0x0103, "US", us(0)),
    dicomElement(0x0028, 0x1050, "DS", "2048"),
    dicomElement(0x0028, 0x1051, "DS", "4096"),
    dicomElement(0x0028, 0x1052, "DS", "0"),
    dicomElement(0x0028, 0x1053, "DS", "1"),
    dicomElement(0x7fe0, 0x0010, "OW", syntheticPixels(sliceNumber))
  ]);
}

async function createSyntheticDicomFolder() {
  await mkdir(fixtureRoot, { recursive: true });
  for (let index = 1; index <= sliceCount; index += 1) {
    const filePath = path.join(fixtureRoot, `slice_${String(index).padStart(3, "0")}.dcm`);
    await writeFile(filePath, buildSyntheticDicom(index));
  }
}

async function postJson(app, url, payload, expectedStatus = 200) {
  const response = await app.inject({
    method: "POST",
    url,
    headers: { "content-type": "application/json" },
    payload: JSON.stringify(payload)
  });
  if (response.statusCode !== expectedStatus) {
    throw new Error(`${url} returned ${response.statusCode}: ${response.body.slice(0, 800)}`);
  }
  return response.json();
}

const diagnosticClient = {
  deviceMemoryGb: 32,
  hardwareConcurrency: 16,
  webgl2Supported: true,
  webglVendor: "NVIDIA",
  webglRenderer: "NVIDIA RTX synthetic smoke",
  maxTextureSize: 16384,
  max3dTextureSize: 4096,
  maxRenderbufferSize: 16384,
  devicePixelRatio: 1,
  offscreenCanvasSupported: true,
  webWorkerSupported: true,
  indexedDbSupported: true,
  storageQuotaMb: 16384,
  storageUsageMb: 256,
  online: false,
  userAgent: "dental-crm-synthetic-dicom-smoke",
  platform: "win32"
};

const lowPowerClient = {
  deviceMemoryGb: 2,
  hardwareConcurrency: 2,
  webgl2Supported: false,
  webglVendor: "synthetic",
  webglRenderer: "software",
  maxTextureSize: 2048,
  max3dTextureSize: null,
  maxRenderbufferSize: 2048,
  devicePixelRatio: 1,
  offscreenCanvasSupported: false,
  webWorkerSupported: true,
  indexedDbSupported: true,
  storageQuotaMb: 1024,
  storageUsageMb: 128,
  online: false,
  userAgent: "dental-crm-synthetic-dicom-low-power",
  platform: "win32"
};

await createSyntheticDicomFolder();

try {
  const apiRequire = createRequire(pathToFileURL(path.resolve("apps/api/package.json")).href);
  const Fastify = apiRequire("fastify");
  const { registerImagingRoutes } = await import(pathToFileURL(imagingRoutesPath).href);
  const app = Fastify({ logger: false });
  await registerImagingRoutes(app);
  await app.ready();

  try {
    const folderRequest = {
      folderPath: fixtureRoot,
      recursive: false,
      sourceName: "synthetic-no-phi-cbct-folder",
      maxFiles: sliceCount + 8,
      maxHeaderBytes: 64 * 1024
    };

    const preview = await postJson(app, "/api/imaging/dicom/folder-series-preview", folderRequest);
    assert(preview.filesFound === sliceCount, `expected ${sliceCount} files, got ${preview.filesFound}`);
    assert(preview.filesParsed === sliceCount, `expected ${sliceCount} parsed files, got ${preview.filesParsed}`);
    assert(preview.preview.totalSeries === 1, `expected one grouped series, got ${preview.preview.totalSeries}`);

    const series = preview.preview.series[0];
    assert(series, "missing preview series");
    assert(series.modality === "CT", `expected CT modality, got ${series.modality}`);
    assert(series.kind === "cbct", `expected cbct kind, got ${series.kind}`);
    assert(series.recommendedViewer === "cbct_mpr", `expected cbct_mpr viewer, got ${series.recommendedViewer}`);
    assert(series.mprReadiness.volumeCandidate, "series should be a volume candidate");
    assert(series.mprReadiness.canOpenMpr, "series should be MPR-ready");
    assert(series.mprReadiness.canBuildPanoramic, "48-slice synthetic stack should allow panoramic draft planning");
    for (const projection of ["axial", "coronal", "sagittal", "oblique", "panoramic_reconstruction"]) {
      assert(series.mprReadiness.projections.includes(projection), `missing projection ${projection}`);
    }
    for (const tool of ["window_level", "slice_scroll", "rotate_axes", "oblique_planes", "panoramic_curve", "external_open"]) {
      assert(series.mprReadiness.tools.includes(tool), `missing MPR tool ${tool}`);
    }

    const firstFrame = await postJson(app, "/api/imaging/dicom/first-frame-preview", {
      folderPath: fixtureRoot,
      recursive: false,
      maxFiles: 8,
      maxFileBytes: 1024 * 1024,
      maxPreviewEdge: 256
    });
    assert(firstFrame.status === "ready", `first frame preview not ready: ${firstFrame.status}`);
    assert(firstFrame.folderPath === "redacted-local-dicom-folder", "first-frame response should redact local folder path");
    assert(firstFrame.imageDataUrl?.startsWith("data:image/png;base64,"), "first-frame response should contain PNG data URL");
    assert(firstFrame.width === imageWidth && firstFrame.height === imageHeight, "unexpected first-frame preview size");

    const diagnosticWorkup = await postJson(app, "/api/imaging/dicom/folder-workup-plan", {
      ...folderRequest,
      client: diagnosticClient
    });
    assert(diagnosticWorkup.selectedSeriesCount === 1, "diagnostic workup should plan one series");
    const diagnosticPlan = diagnosticWorkup.plans[0];
    assert(diagnosticPlan, "missing diagnostic plan");
    assert(!diagnosticPlan.doctorBlocking, "diagnostic plan should not block the doctor workflow");
    assert(diagnosticPlan.recommendedPath === "open_mpr", `expected open_mpr path, got ${diagnosticPlan.recommendedPath}`);
    assert(diagnosticPlan.readiness.canOpenInBrowser, "diagnostic client should open MPR in browser");
    assert(diagnosticPlan.renderCachePlan.tasks.some((task) => task.kind === "metadata_index"), "missing metadata index task");
    assert(diagnosticPlan.renderCachePlan.tasks.some((task) => task.kind === "thumbnail_first"), "missing thumbnail-first task");
    assert(diagnosticPlan.renderCachePlan.tasks.some((task) => task.kind === "derive_mpr_plane"), "missing linked MPR task");
    assert(diagnosticPlan.renderCachePlan.tasks.some((task) => task.kind === "derive_panoramic_curve"), "missing panoramic draft task");
    assert(
      ["single_3d_texture", "bricked_3d_textures", "stack_2d_textures"].includes(diagnosticPlan.renderCachePlan.textureStrategy),
      `unexpected diagnostic texture strategy ${diagnosticPlan.renderCachePlan.textureStrategy}`
    );

    const lowPowerWorkup = await postJson(app, "/api/imaging/dicom/folder-workup-plan", {
      ...folderRequest,
      client: lowPowerClient
    });
    const lowPowerPlan = lowPowerWorkup.plans[0];
    assert(lowPowerPlan, "missing low-power plan");
    assert(!lowPowerPlan.doctorBlocking, "low-power plan should keep metadata recoverable, not block the doctor");
    assert(lowPowerPlan.recommendedPath === "external_viewer", `expected external_viewer path, got ${lowPowerPlan.recommendedPath}`);
    assert(lowPowerPlan.readiness.shouldUseExternalViewer, "low-power client should use external viewer handoff");
    assert(lowPowerPlan.renderCachePlan.tasks.some((task) => task.kind === "external_handoff"), "missing external handoff task");

    const workbench = await postJson(app, "/api/imaging/dicom/viewer-workbench-manifest", {
      viewerKind: "cornerstone3d",
      target: "cornerstone3d",
      series: diagnosticPlan.series,
      client: diagnosticClient,
      annotations: [],
      allowExternalHandoff: true
    });
    assert(workbench.version === "dental-crm-dicom-workbench-v1", "unexpected workbench manifest version");
    assert(!workbench.doctorBlocking, "workbench manifest should not block the doctor workflow");
    assert(workbench.launchManifest.launchMode === "local_manifest", `unexpected launch mode ${workbench.launchManifest.launchMode}`);
    assert(workbench.toolStateBundle.viewports.length >= 4, "expected linked MPR/panoramic viewports");

    const saved = await postJson(
      app,
      "/api/imaging/dicom/workbench-bundles",
      {
        manifest: workbench,
        clientSavedAt: new Date("2026-05-18T00:00:00.000Z").toISOString(),
        seriesKey: "synthetic-no-phi-cbct-smoke"
      },
      201
    );
    const savedText = JSON.stringify(saved);
    assert(saved.bundle.pixelPolicy === "metadata_and_tool_state_only_no_pixels", "server bundle must not store DICOM pixels");
    assert(!savedText.includes(fixtureRoot), "saved server bundle leaked the raw synthetic local folder path");
    assert(savedText.includes("redacted-local-dicom-path:"), "saved server bundle should contain redacted local DICOM references");
    assert(!savedText.includes("data:image/png;base64,"), "server bundle should not persist pixel preview data URLs");

    console.log(
      JSON.stringify({
        filesParsed: preview.filesParsed,
        totalSeries: preview.preview.totalSeries,
        recommendedViewer: series.recommendedViewer,
        projections: series.mprReadiness.projections,
        diagnostic: {
          recommendedPath: diagnosticPlan.recommendedPath,
          textureStrategy: diagnosticPlan.renderCachePlan.textureStrategy,
          qualityMode: diagnosticPlan.renderCachePlan.qualityMode,
          taskKinds: diagnosticPlan.renderCachePlan.tasks.map((task) => task.kind)
        },
        lowPower: {
          recommendedPath: lowPowerPlan.recommendedPath,
          textureStrategy: lowPowerPlan.renderCachePlan.textureStrategy,
          taskKinds: lowPowerPlan.renderCachePlan.tasks.map((task) => task.kind)
        },
        firstFrame: {
          status: firstFrame.status,
          size: `${firstFrame.width}x${firstFrame.height}`,
          folderPath: firstFrame.folderPath
        },
        savedBundle: {
          pixelPolicy: saved.bundle.pixelPolicy,
          pathRedacted: savedText.includes("redacted-local-dicom-path:")
        }
      })
    );
  } finally {
    await app.close();
  }
} finally {
  await rm(fixtureRoot, { recursive: true, force: true, maxRetries: 5, retryDelay: 250 });
}
