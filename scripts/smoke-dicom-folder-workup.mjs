import { existsSync, readFileSync } from "node:fs";
import { mkdir, open, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { createRequire } from "node:module";
import { pathToFileURL } from "node:url";

process.env.DENTAL_STATE_PERSISTENCE = "off";

const imagingRoutesPath = path.resolve("apps/api/dist/routes/imaging.js");
if (!existsSync(imagingRoutesPath)) {
  throw new Error("Build the API first: npm run build");
}
const imagingRoutesSource = readFileSync("apps/api/src/routes/imaging.ts", "utf8");

const fixtureRoot = path.join(os.tmpdir(), `dental-crm-synthetic-dicom-${process.pid}`);
const sliceCount = Number(process.env.SMOKE_DICOM_SLICES ?? 48);
const imageWidth = 32;
const imageHeight = 32;

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function assertUniqueSliceOrder(stage, message) {
  assert(stage, `${message}: missing stage`);
  assert(stage.sliceOrder.length > 0, `${message}: empty slice order`);
  assert(new Set(stage.sliceOrder).size === stage.sliceOrder.length, `${message}: duplicate slices`);
}

function assertStageSliceOrderInsideRange(stage, fileCount, message) {
  assertUniqueSliceOrder(stage, message);
  assert(
    stage.sliceOrder.every((slice) => Number.isInteger(slice) && slice >= 0 && slice < fileCount),
    `${message}: slice order outside series`
  );
  if (stage.sliceStart !== null && stage.sliceEnd !== null) {
    assert(
      stage.sliceOrder.every((slice) => slice >= stage.sliceStart && slice <= stage.sliceEnd),
      `${message}: slice order outside stage window`
    );
  }
}

function assertNoSliceOrderOverlap(leftStage, rightStage, message) {
  assertUniqueSliceOrder(leftStage, `${message}: left`);
  assertUniqueSliceOrder(rightStage, `${message}: right`);
  const leftSlices = new Set(leftStage.sliceOrder);
  assert(rightStage.sliceOrder.every((slice) => !leftSlices.has(slice)), `${message}: overlapping slice prefetch`);
}

function assertProgressiveStagesBounded(plan, message) {
  for (const stage of plan.progressiveStages) {
    assert(stage.sliceOrder.length <= 128, `${message}: ${stage.id} slice order exceeded adapter request bound`);
    assert(new Set(stage.sliceOrder).size === stage.sliceOrder.length, `${message}: ${stage.id} has duplicate slices`);
    assert(stage.maxResidentSlices <= plan.progressiveSliceWindowCap, `${message}: ${stage.id} exceeded render-plan resident cap`);
  }
}

function syntheticViewerState(sliceIndex) {
  return {
    mode: "mpr",
    activeTool: "pan",
    activeQuickActionId: null,
    windowPreset: "bone",
    windowCenter: null,
    windowWidth: null,
    brightness: 1,
    contrast: 1,
    inverted: false,
    rotationDeg: 0,
    flipHorizontal: false,
    zoom: 1,
    panX: 0,
    panY: 0,
    sliceIndex,
    projection: "axial",
    axisDeg: 0,
    slabMm: 1,
    crosshair: true,
    linkedPlanes: true,
    implantPlan: null
  };
}

assert(imagingRoutesSource.includes("parseImagingPayload("), "imaging routes must own public payload validation copy");
assert(!imagingRoutesSource.includes("zipPreviewByteLimit"), "ZIP DICOM metadata preview must not reject large regular archives by total ZIP size");
assert(imagingRoutesSource.includes("chooseDicomAdjacentWindow"), "DICOM progressive planning must choose adjacent windows from both sides of the active window");
for (const rawRouteParse of [
  "imagingImportPreviewRequestSchema.parse(request.body)",
  "dicomSeriesPreviewRequestSchema.parse(request.body)",
  "dicomWebConnectorCheckRequestSchema.parse(request.body)",
  "dicomViewerLaunchManifestRequestSchema.parse(request.body)",
  "dicomViewerToolStateBundleRequestSchema.parse(request.body)",
  "dicomRenderCachePlanRequestSchema.parse(request.body)",
  "dicomWorkstationReadinessRequestSchema.parse(request.body)",
  "dicomViewerWorkbenchManifestRequestSchema.parse(request.body)",
  "saveDicomWorkbenchBundleRequestSchema.parse(request.body)",
  "dicomLocalFolderDiscoveryRequestSchema.parse(request.body)",
  "localImagingOrganizerRequestSchema.parse(request.body)",
  "dicomFolderSeriesPreviewRequestSchema.parse(request.body)",
  "dicomFirstFramePreviewRequestSchema.parse(request.body)",
  "dicomFolderWorkupPlanRequestSchema.parse(request.body)",
  "imagingFolderScanRequestSchema.parse(request.body)",
  "saveImagingViewerSessionRequestSchema.parse(request.body)",
  "createImagingStudySchema.parse(request.body)"
]) {
  assert(!imagingRoutesSource.includes(rawRouteParse), `imaging route must not leak raw zod validation through ${rawRouteParse}`);
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

function crc32(buffer) {
  let crc = 0xffffffff;
  for (const byte of buffer) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) {
      crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function dosTimeDate(date = new Date("2026-05-18T00:00:00.000Z")) {
  const time = (date.getHours() << 11) | (date.getMinutes() << 5) | Math.floor(date.getSeconds() / 2);
  const dosDate = ((date.getFullYear() - 1980) << 9) | ((date.getMonth() + 1) << 5) | date.getDate();
  return { time, dosDate };
}

function buildStoredZip(entries) {
  const localParts = [];
  const centralParts = [];
  let offset = 0;
  const { time, dosDate } = dosTimeDate();

  for (const entry of entries) {
    const name = Buffer.from(entry.name, "utf8");
    const content = entry.content;
    const checksum = crc32(content);
    const localHeader = Buffer.alloc(30);
    localHeader.writeUInt32LE(0x04034b50, 0);
    localHeader.writeUInt16LE(20, 4);
    localHeader.writeUInt16LE(0x0800, 6);
    localHeader.writeUInt16LE(0, 8);
    localHeader.writeUInt16LE(time, 10);
    localHeader.writeUInt16LE(dosDate, 12);
    localHeader.writeUInt32LE(checksum, 14);
    localHeader.writeUInt32LE(content.length, 18);
    localHeader.writeUInt32LE(content.length, 22);
    localHeader.writeUInt16LE(name.length, 26);
    localHeader.writeUInt16LE(0, 28);
    localParts.push(localHeader, name, content);

    const centralHeader = Buffer.alloc(46);
    centralHeader.writeUInt32LE(0x02014b50, 0);
    centralHeader.writeUInt16LE(20, 4);
    centralHeader.writeUInt16LE(20, 6);
    centralHeader.writeUInt16LE(0x0800, 8);
    centralHeader.writeUInt16LE(0, 10);
    centralHeader.writeUInt16LE(time, 12);
    centralHeader.writeUInt16LE(dosDate, 14);
    centralHeader.writeUInt32LE(checksum, 16);
    centralHeader.writeUInt32LE(content.length, 20);
    centralHeader.writeUInt32LE(content.length, 24);
    centralHeader.writeUInt16LE(name.length, 28);
    centralHeader.writeUInt16LE(0, 30);
    centralHeader.writeUInt16LE(0, 32);
    centralHeader.writeUInt16LE(0, 34);
    centralHeader.writeUInt16LE(0, 36);
    centralHeader.writeUInt32LE(0, 38);
    centralHeader.writeUInt32LE(offset, 42);
    centralParts.push(centralHeader, name);
    offset += localHeader.length + name.length + content.length;
  }

  const centralDirectoryOffset = offset;
  const centralDirectory = Buffer.concat(centralParts);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(0, 4);
  end.writeUInt16LE(0, 6);
  end.writeUInt16LE(entries.length, 8);
  end.writeUInt16LE(entries.length, 10);
  end.writeUInt32LE(centralDirectory.length, 12);
  end.writeUInt32LE(centralDirectoryOffset, 16);
  end.writeUInt16LE(0, 20);

  return Buffer.concat([...localParts, centralDirectory, end]);
}

async function writeStoredZipWithCentralDirectoryOffset(filePath, entries, centralDirectoryOffset) {
  const handle = await open(filePath, "w");
  const centralParts = [];
  let offset = 0;
  const { time, dosDate } = dosTimeDate();

  try {
    for (const entry of entries) {
      const name = Buffer.from(entry.name, "utf8");
      const content = entry.content;
      const checksum = crc32(content);
      const localHeader = Buffer.alloc(30);
      localHeader.writeUInt32LE(0x04034b50, 0);
      localHeader.writeUInt16LE(20, 4);
      localHeader.writeUInt16LE(0x0800, 6);
      localHeader.writeUInt16LE(0, 8);
      localHeader.writeUInt16LE(time, 10);
      localHeader.writeUInt16LE(dosDate, 12);
      localHeader.writeUInt32LE(checksum, 14);
      localHeader.writeUInt32LE(content.length, 18);
      localHeader.writeUInt32LE(content.length, 22);
      localHeader.writeUInt16LE(name.length, 26);
      localHeader.writeUInt16LE(0, 28);
      await handle.write(localHeader, 0, localHeader.length, offset);
      await handle.write(name, 0, name.length, offset + localHeader.length);
      await handle.write(content, 0, content.length, offset + localHeader.length + name.length);

      const centralHeader = Buffer.alloc(46);
      centralHeader.writeUInt32LE(0x02014b50, 0);
      centralHeader.writeUInt16LE(20, 4);
      centralHeader.writeUInt16LE(20, 6);
      centralHeader.writeUInt16LE(0x0800, 8);
      centralHeader.writeUInt16LE(0, 10);
      centralHeader.writeUInt16LE(time, 12);
      centralHeader.writeUInt16LE(dosDate, 14);
      centralHeader.writeUInt32LE(checksum, 16);
      centralHeader.writeUInt32LE(content.length, 20);
      centralHeader.writeUInt32LE(content.length, 24);
      centralHeader.writeUInt16LE(name.length, 28);
      centralHeader.writeUInt16LE(0, 30);
      centralHeader.writeUInt16LE(0, 32);
      centralHeader.writeUInt16LE(0, 34);
      centralHeader.writeUInt16LE(0, 36);
      centralHeader.writeUInt32LE(0, 38);
      centralHeader.writeUInt32LE(offset, 42);
      centralParts.push(centralHeader, name);
      offset += localHeader.length + name.length + content.length;
    }

    if (centralDirectoryOffset < offset) throw new Error("centralDirectoryOffset must be after local ZIP entries");
    await handle.truncate(centralDirectoryOffset);
    const centralDirectory = Buffer.concat(centralParts);
    await handle.write(centralDirectory, 0, centralDirectory.length, centralDirectoryOffset);
    const end = Buffer.alloc(22);
    end.writeUInt32LE(0x06054b50, 0);
    end.writeUInt16LE(0, 4);
    end.writeUInt16LE(0, 6);
    end.writeUInt16LE(entries.length, 8);
    end.writeUInt16LE(entries.length, 10);
    end.writeUInt32LE(centralDirectory.length, 12);
    end.writeUInt32LE(centralDirectoryOffset, 16);
    end.writeUInt16LE(0, 20);
    await handle.write(end, 0, end.length, centralDirectoryOffset + centralDirectory.length);
  } finally {
    await handle.close();
  }
}

async function createSyntheticDicomFolder() {
  await mkdir(fixtureRoot, { recursive: true });
  for (let index = 1; index <= sliceCount; index += 1) {
    const filePath = path.join(fixtureRoot, `slice_${String(index).padStart(3, "0")}.dcm`);
    await writeFile(filePath, buildSyntheticDicom(index));
  }
  const zipEntries = Array.from({ length: 6 }, (_, index) => ({
    name: `zip_slice_${String(index + 1).padStart(3, "0")}.dcm`,
    content: buildSyntheticDicom(index + 1)
  }));
  await writeFile(path.join(fixtureRoot, "synthetic_cbct_zip_series.zip"), buildStoredZip(zipEntries));
  await writeStoredZipWithCentralDirectoryOffset(
    path.join(fixtureRoot, "synthetic_large_offset_cbct.zip"),
    [
      {
        name: "large_offset_slice_001.dcm",
        content: buildSyntheticDicom(7)
      }
    ],
    260 * 1024 * 1024
  );
  await writeFile(path.join(fixtureRoot, "ct_skull_surface.obj"), "# synthetic CT skull surface metadata smoke\n");
  await writeFile(path.join(fixtureRoot, "mandible_bone_surface.stl"), "solid synthetic_mandible_surface\nendsolid synthetic_mandible_surface\n");
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

async function requestJson(app, method, url, payload) {
  return app.inject({
    method,
    url,
    headers: { "content-type": "application/json" },
    payload: JSON.stringify(payload)
  });
}

function assertRouteValidationResponse(response, label, expectedMessage) {
  assert(response.statusCode === 400, `${label} must fail with 400, got ${response.statusCode}: ${response.body.slice(0, 400)}`);
  const body = response.json();
  assert(body?.message === expectedMessage, `${label} must return operator-readable validation copy`);
  assert(!("issues" in body), `${label} must not expose raw zod issues`);
  assert(!("path" in body), `${label} must not expose raw validation path`);
  assert(!("code" in body), `${label} must not expose raw validation code`);
  assert(
    !/ZodError|too_small|invalid_type|rawText|sourceName|folderPath|maxFiles|maxFolders|series|client|manifest|viewerState|annotations|endpointUrl|patientId|kind|title|request\.body|safeParse/i.test(
      response.body
    ),
    `${label} must not expose schema fields or parser tokens`
  );
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
  runtimeSurfaceHint: "desktop_web",
  desktopShellBridgeSupported: false,
  directoryPickerSupported: true,
  directoryHandlePersistence: "session_only",
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
  runtimeSurfaceHint: "desktop_web",
  desktopShellBridgeSupported: false,
  directoryPickerSupported: true,
  directoryHandlePersistence: "session_only",
  userAgent: "dental-crm-synthetic-dicom-low-power",
  platform: "win32"
};

const mobileClient = {
  deviceMemoryGb: 8,
  hardwareConcurrency: 8,
  webgl2Supported: true,
  webglVendor: "Apple",
  webglRenderer: "Apple mobile synthetic smoke",
  maxTextureSize: 8192,
  max3dTextureSize: 1024,
  maxRenderbufferSize: 8192,
  devicePixelRatio: 3,
  offscreenCanvasSupported: true,
  webWorkerSupported: true,
  indexedDbSupported: true,
  storageQuotaMb: 4096,
  storageUsageMb: 512,
  online: true,
  runtimeSurfaceHint: "mobile_web",
  desktopShellBridgeSupported: false,
  directoryPickerSupported: false,
  directoryHandlePersistence: "unsupported",
  userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) Mobile dental-crm-smoke",
  platform: "iPhone"
};

const desktopAppClient = {
  ...diagnosticClient,
  online: false,
  runtimeSurfaceHint: "desktop_app",
  desktopShellBridgeSupported: true,
  userAgent: "Dental CRM Desktop App Electron synthetic smoke",
  platform: "win32 desktop-app"
};

await createSyntheticDicomFolder();

try {
  const apiRequire = createRequire(pathToFileURL(path.resolve("apps/api/package.json")).href);
  const Fastify = apiRequire("fastify");
  const { registerImagingRoutes } = await import(pathToFileURL(imagingRoutesPath).href);
  const app = Fastify({ logger: false });
  app.setErrorHandler((error, _request, reply) => {
    if (error?.name === "ZodError" && Array.isArray(error.issues)) {
      return reply.code(400).send({ error: "ValidationError", issues: error.issues });
    }
    return reply.send(error);
  });
  await registerImagingRoutes(app);
  await app.ready();

  try {
    const invalidRouteCases = [
      {
        method: "POST",
        url: "/api/imaging/imports/preview",
        payload: { rawText: " " },
        label: "blank imaging import preview",
        message: "Предпросмотр снимков не построен: передайте непустой текст или таблицу источника снимков."
      },
      {
        method: "POST",
        url: "/api/imaging/dicom/series-preview",
        payload: { rawText: "" },
        label: "blank dicom series preview",
        message: "Предпросмотр DICOM-серии не построен: передайте непустой список метаданных серии."
      },
      {
        method: "POST",
        url: "/api/imaging/dicomweb/check",
        payload: { endpointUrl: "not-url" },
        label: "invalid dicomweb check",
        message: "Проверка DICOMweb не выполнена: передайте корректный адрес сервиса и параметры доступа."
      },
      {
        method: "POST",
        url: "/api/imaging/dicom/viewer-launch-manifest",
        payload: {},
        label: "blank viewer launch manifest",
        message: "Пакет открытия просмотра не построен: передайте выбранную серию и состояние просмотра."
      },
      {
        method: "POST",
        url: "/api/imaging/dicom/viewer-tool-state",
        payload: {},
        label: "blank viewer tool state",
        message: "Пакет инструментов просмотра не построен: передайте выбранную серию, состояние и разметку."
      },
      {
        method: "POST",
        url: "/api/imaging/dicom/render-cache-plan",
        payload: {},
        label: "blank render cache plan",
        message: "План кэша просмотра не построен: передайте серию и план мощности устройства."
      },
      {
        method: "POST",
        url: "/api/imaging/dicom/workstation-readiness",
        payload: {},
        label: "blank workstation readiness",
        message: "Проверка готовности рабочего места не выполнена: передайте серию и сведения об устройстве."
      },
      {
        method: "POST",
        url: "/api/imaging/dicom/viewer-workbench-manifest",
        payload: {},
        label: "blank viewer workbench manifest",
        message: "Рабочий пакет просмотра не построен: передайте серию, устройство и состояние просмотра."
      },
      {
        method: "POST",
        url: "/api/imaging/dicom/workbench-bundles",
        payload: {},
        label: "blank workbench bundle save",
        message: "Набор просмотра не сохранен: передайте сформированный рабочий пакет просмотра."
      },
      {
        method: "POST",
        url: "/api/imaging/dicom/local-folder-discovery",
        payload: { maxFolders: 0 },
        label: "invalid local dicom folder discovery",
        message: "Поиск папок снимков не запущен: проверьте корни поиска и лимиты обхода."
      },
      {
        method: "POST",
        url: "/api/imaging/local-organizer/scan-preview",
        payload: { maxFolders: 0 },
        label: "invalid local imaging organizer",
        message: "Разбор локальных снимков не запущен: проверьте корни поиска и лимиты обхода."
      },
      {
        method: "POST",
        url: "/api/imaging/dicom/folder-series-preview",
        payload: {},
        label: "blank folder series preview",
        message: "Предпросмотр папки DICOM не построен: выберите папку снимков и безопасные лимиты чтения."
      },
      {
        method: "POST",
        url: "/api/imaging/dicom/first-frame-preview",
        payload: {},
        label: "blank first frame preview",
        message: "Первый кадр DICOM не построен: выберите папку снимков и безопасные лимиты чтения."
      },
      {
        method: "POST",
        url: "/api/imaging/dicom/folder-workup-plan",
        payload: {},
        label: "blank folder workup plan",
        message: "План работы с папкой DICOM не построен: выберите папку снимков и передайте сведения об устройстве."
      },
      {
        method: "POST",
        url: "/api/imaging/imports/commit",
        payload: { rawText: " " },
        label: "blank imaging import commit",
        message: "Импорт снимков не выполнен: повторно передайте ту же непустую выгрузку перед записью."
      },
      {
        method: "POST",
        url: "/api/imaging/folders/scan-preview",
        payload: {},
        label: "blank imaging folder scan",
        message: "Сканирование папки снимков не запущено: выберите папку и безопасные лимиты чтения."
      },
      {
        method: "POST",
        url: "/api/imaging/studies",
        payload: {},
        label: "blank imaging study create",
        message: "Снимок не создан: выберите пациента, вид снимка и название."
      }
    ];
    for (const routeCase of invalidRouteCases) {
      const response = await requestJson(app, routeCase.method, routeCase.url, routeCase.payload);
      assertRouteValidationResponse(response, routeCase.label, routeCase.message);
    }

    const studiesResponse = await app.inject({ method: "GET", url: "/api/imaging/studies" });
    assert(studiesResponse.statusCode === 200, `imaging studies list failed: ${studiesResponse.statusCode}`);
    const existingStudy = studiesResponse.json()[0];
    if (existingStudy?.id) {
      const invalidViewerSession = await requestJson(app, "PUT", `/api/imaging/studies/${existingStudy.id}/viewer-session`, {});
      assertRouteValidationResponse(
        invalidViewerSession,
        "blank imaging viewer session save",
        "Сеанс просмотра снимка не сохранен: передайте состояние просмотра и разметку."
      );
    }

    const folderRequest = {
      folderPath: fixtureRoot,
      recursive: false,
      sourceName: "synthetic-no-phi-cbct-folder",
      maxFiles: sliceCount + 8,
      maxHeaderBytes: 64 * 1024
    };

    const preview = await postJson(app, "/api/imaging/dicom/folder-series-preview", folderRequest);
    assert(preview.filesFound === sliceCount + 2, `expected ${sliceCount + 2} files including ZIP archives, got ${preview.filesFound}`);
    assert(preview.filesParsed === sliceCount + 7, `expected ${sliceCount + 7} parsed files including ZIP slices, got ${preview.filesParsed}`);
    assert(preview.preview.totalSeries === 1, `expected one grouped series, got ${preview.preview.totalSeries}`);
    assert(preview.rawText.includes("synthetic_cbct_zip_series.zip::zip_slice_001.dcm"), "ZIP-contained DICOM virtual path missing from manifest");
    assert(
      preview.rawText.includes("synthetic_large_offset_cbct.zip::large_offset_slice_001.dcm"),
      "large regular ZIP DICOM virtual path missing from manifest"
    );

    const series = preview.preview.series[0];
    assert(series, "missing preview series");
    assert(series.modality === "CT", `expected CT modality, got ${series.modality}`);
    assert(series.kind === "cbct", `expected cbct kind, got ${series.kind}`);
    assert(series.recommendedViewer === "cbct_mpr", `expected cbct_mpr viewer, got ${series.recommendedViewer}`);
    assert(series.mprReadiness.volumeCandidate, "series should be a volume candidate");
    assert(series.mprReadiness.canOpenMpr, "series should be MPR-ready");
    assert(series.mprReadiness.canBuildPanoramic, "48-slice synthetic stack should allow panoramic draft planning");
    assert(series.imageRows === imageHeight, `expected DICOM rows ${imageHeight}, got ${series.imageRows}`);
    assert(series.imageColumns === imageWidth, `expected DICOM columns ${imageWidth}, got ${series.imageColumns}`);
    assert(series.bitsAllocated === 16, `expected 16-bit DICOM pixels, got ${series.bitsAllocated}`);
    assert(series.samplesPerPixel === 1, `expected one sample per pixel, got ${series.samplesPerPixel}`);
    assert(
      series.estimatedPixelBytes === (sliceCount + 7) * imageWidth * imageHeight * 2,
      `expected geometry-derived pixel bytes, got ${series.estimatedPixelBytes}`
    );
    for (const projection of ["axial", "coronal", "sagittal", "oblique", "panoramic_reconstruction"]) {
      assert(series.mprReadiness.projections.includes(projection), `missing projection ${projection}`);
    }
    for (const tool of ["window_level", "slice_scroll", "rotate_axes", "oblique_planes", "panoramic_curve", "external_open"]) {
      assert(series.mprReadiness.tools.includes(tool), `missing MPR tool ${tool}`);
    }

    const russianTablePreview = await postJson(app, "/api/imaging/dicom/series-preview", {
      sourceName: "russian-klkt-table",
      sourceKind: "dicom_file",
      rawText: [
        "Пациент;Телефон;Модальность;StudyInstanceUID;SeriesInstanceUID;InstanceNumber;SeriesDescription;Дата;Путь",
        "Иванова Марина Сергеевна;+7 927 111-22-33;КЛКТ;1.2.643.5.1.20260512.1;1.2.643.5.1.20260512.1.3;1;КТ нижней челюсти;12.05.2026;D:\\KLKT\\ivanova_2026_05_12\\IMG0001.dcm",
        "Иванова Марина Сергеевна;+7 927 111-22-33;КЛКТ;1.2.643.5.1.20260512.1;1.2.643.5.1.20260512.1.3;2;КТ нижней челюсти;12.05.2026;D:\\KLKT\\ivanova_2026_05_12\\IMG0002.dcm"
      ].join("\n")
    });
    assert(russianTablePreview.totalRows === 2, `expected 2 Russian table rows, got ${russianTablePreview.totalRows}`);
    assert(russianTablePreview.totalSeries === 1, `expected one Russian table series, got ${russianTablePreview.totalSeries}`);
    const russianSeries = russianTablePreview.series[0];
    assert(russianSeries, "missing Russian table preview series");
    assert(russianSeries.patientName === "Иванова Марина Сергеевна", `unexpected Russian table patient ${russianSeries.patientName}`);
    assert(russianSeries.kind === "cbct", `expected Russian КЛКТ kind to normalize to cbct, got ${russianSeries.kind}`);
    assert(russianSeries.modality === "CBCT", `expected Russian КЛКТ modality to normalize to CBCT, got ${russianSeries.modality}`);
    assert(russianSeries.studyInstanceUid === "1.2.643.5.1.20260512.1", "Russian table StudyInstanceUID was not parsed");
    assert(russianSeries.seriesInstanceUid === "1.2.643.5.1.20260512.1.3", "Russian table SeriesInstanceUID was not parsed");
    assert(russianSeries.fileCount === 2, `expected 2 Russian table files, got ${russianSeries.fileCount}`);
    assert(russianSeries.mprReadiness.volumeCandidate, "Russian КЛКТ table must be treated as a volume candidate");
    assert(!russianSeries.mprReadiness.canOpenMpr, "two-row Russian КЛКТ table must not pretend to be MPR-ready");
    assert(
      russianSeries.mprReadiness.blockers.some((blocker) => blocker.includes("минимум 8 срезов")),
      "short Russian КЛКТ table must explain the missing slice count"
    );
    assert(
      russianSeries.recommendedViewer === "external_dicom",
      `expected short Russian КЛКТ table to recommend external_dicom, got ${russianSeries.recommendedViewer}`
    );
    assert(russianSeries.capturedAt === "2026-05-12", `expected normalized Russian date, got ${russianSeries.capturedAt}`);

    const russianAliasPreview = await postJson(app, "/api/imaging/dicom/series-preview", {
      sourceName: "russian-klkt-human-headers",
      sourceKind: "dicom_file",
      rawText: [
        "ФИО пациента;Номер телефона;Вид исследования;UID исследования;UID серии;Номер среза;Описание серии;Дата исследования;Путь к файлу",
        "Иванова Марина Сергеевна;+7 927 111-22-33;КЛКТ;1.2.643.5.1.20260513.1;1.2.643.5.1.20260513.1.3;1;КЛКТ нижней челюсти;13.05.2026;D:\\KLKT\\ivanova_2026_05_13\\IMG0001.dcm",
        "Иванова Марина Сергеевна;+7 927 111-22-33;КЛКТ;1.2.643.5.1.20260513.1;1.2.643.5.1.20260513.1.3;2;КЛКТ нижней челюсти;13.05.2026;D:\\KLKT\\ivanova_2026_05_13\\IMG0002.dcm"
      ].join("\n")
    });
    assert(russianAliasPreview.totalRows === 2, `expected 2 human-header rows, got ${russianAliasPreview.totalRows}`);
    assert(russianAliasPreview.totalSeries === 1, `expected one human-header series, got ${russianAliasPreview.totalSeries}`);
    const russianAliasSeries = russianAliasPreview.series[0];
    assert(russianAliasSeries, "missing human-header Russian series");
    assert(russianAliasSeries.kind === "cbct", `expected human-header КЛКТ kind cbct, got ${russianAliasSeries.kind}`);
    assert(russianAliasSeries.studyInstanceUid === "1.2.643.5.1.20260513.1", "human-header Study UID was not parsed");
    assert(russianAliasSeries.seriesInstanceUid === "1.2.643.5.1.20260513.1.3", "human-header Series UID was not parsed");
    assert(russianAliasSeries.capturedAt === "2026-05-13", `expected human-header normalized date, got ${russianAliasSeries.capturedAt}`);
    assert(russianAliasSeries.firstFilePath?.includes("ivanova_2026_05_13"), "human-header file path was not parsed");

    const largeGeometryRows = Array.from({ length: 8 }, (_unused, rowIndex) => {
      const instance = rowIndex + 1;
      return [
        "Synthetic Large CT",
        "cbct",
        "CT",
        "1.2.826.0.1.3680043.10.54321.20260518.large.study",
        "1.2.826.0.1.3680043.10.54321.20260518.large.series",
        String(instance),
        "Large 1024 synthetic stack",
        "1024",
        "1024",
        "16",
        "1",
        String(1024 * 1024 * 2),
        "2026-05-18",
        `D:\\KLKT\\large_geometry\\IMG${String(instance).padStart(4, "0")}.dcm`
      ].join(";");
    });
    const largeGeometryPreview = await postJson(app, "/api/imaging/dicom/series-preview", {
      sourceName: "large-geometry-dicom-table",
      sourceKind: "dicom_file",
      rawText: [
        "patient;kind;modality;StudyInstanceUID;SeriesInstanceUID;InstanceNumber;SeriesDescription;Rows;Columns;BitsAllocated;SamplesPerPixel;EstimatedPixelBytes;date;file",
        ...largeGeometryRows
      ].join("\n")
    });
    const largeGeometrySeries = largeGeometryPreview.series[0];
    assert(largeGeometrySeries, "missing large-geometry series");
    assert(largeGeometrySeries.fileCount === 8, `expected 8 large-geometry slices, got ${largeGeometrySeries.fileCount}`);
    assert(largeGeometrySeries.imageRows === 1024, `expected 1024 large-geometry rows, got ${largeGeometrySeries.imageRows}`);
    assert(largeGeometrySeries.imageColumns === 1024, `expected 1024 large-geometry columns, got ${largeGeometrySeries.imageColumns}`);
    assert(largeGeometrySeries.bitsAllocated === 16, `expected 16-bit large-geometry pixels, got ${largeGeometrySeries.bitsAllocated}`);
    assert(largeGeometrySeries.samplesPerPixel === 1, `expected one large-geometry sample, got ${largeGeometrySeries.samplesPerPixel}`);
    assert(largeGeometrySeries.estimatedPixelBytes === 8 * 1024 * 1024 * 2, `unexpected large-geometry pixel bytes ${largeGeometrySeries.estimatedPixelBytes}`);
    assert(largeGeometrySeries.mprReadiness.resourcePolicy.estimatedMemoryMb >= 21, "large-geometry resource policy must scale from pixel bytes");
    const largeGeometryReadiness = await postJson(app, "/api/imaging/dicom/workstation-readiness", {
      series: largeGeometrySeries,
      client: diagnosticClient
    });
    assert(largeGeometryReadiness.renderPlan.estimatedGpuMemoryMb >= 21, "large-geometry render plan must scale GPU memory from pixel bytes");
    assert(largeGeometryReadiness.runtimeProfile.surface === "desktop_web", `expected desktop web runtime, got ${largeGeometryReadiness.runtimeProfile.surface}`);
    assert(largeGeometryReadiness.runtimeProfile.executionLane === "browser_mpr", `expected browser MPR lane, got ${largeGeometryReadiness.runtimeProfile.executionLane}`);
    assert(largeGeometryReadiness.renderPlan.qualityMode !== "diagnostic_full", "desktop browser must not claim diagnostic-full pixel rendering");
    assert(
      largeGeometryReadiness.renderPlan.diagnosticPixelPolicy === "browser_preview_not_diagnostic",
      `desktop browser CT policy must be planning preview, got ${largeGeometryReadiness.renderPlan.diagnosticPixelPolicy}`
    );
    assert(largeGeometryReadiness.renderPlan.memoryBudgetClass === "workstation", `desktop browser memory class must stop at workstation, got ${largeGeometryReadiness.renderPlan.memoryBudgetClass}`);
    assert(largeGeometryReadiness.renderPlan.hardwareQualityWeight > 0 && largeGeometryReadiness.renderPlan.hardwareQualityWeight <= 0.82, `desktop browser quality weight must be capped below diagnostic authority, got ${largeGeometryReadiness.renderPlan.hardwareQualityWeight}`);
    assert(largeGeometryReadiness.renderPlan.progressiveSliceWindowCap <= 128, `desktop browser slice window cap must stay workstation-bounded, got ${largeGeometryReadiness.renderPlan.progressiveSliceWindowCap}`);
    assert(
      largeGeometryReadiness.checks.some((check) => check.id === "ct_memory_policy"),
      "workstation readiness must expose CT memory/pixel policy check"
    );

    const mobileReadiness = await postJson(app, "/api/imaging/dicom/workstation-readiness", {
      series: largeGeometrySeries,
      client: mobileClient
    });
    assert(mobileReadiness.runtimeProfile.surface === "mobile_web", `expected mobile runtime, got ${mobileReadiness.runtimeProfile.surface}`);
    assert(mobileReadiness.runtimeProfile.executionLane === "browser_preview", `expected mobile browser preview lane, got ${mobileReadiness.runtimeProfile.executionLane}`);
    assert(mobileReadiness.runtimeProfile.mobileConstrained, "mobile runtime must be marked constrained");
    assert(!mobileReadiness.canOpenInBrowser, "mobile runtime must not claim full browser MPR");
    assert(mobileReadiness.shouldUseExternalViewer, "mobile runtime should route full CT to external/PC review");
    assert(mobileReadiness.renderPlan.progressiveSliceWindowCap === 1, `mobile external CT policy must not reserve browser slice windows, got ${mobileReadiness.renderPlan.progressiveSliceWindowCap}`);

    const desktopAppReadiness = await postJson(app, "/api/imaging/dicom/workstation-readiness", {
      series: largeGeometrySeries,
      client: desktopAppClient
    });
    assert(desktopAppReadiness.runtimeProfile.surface === "desktop_app", `expected desktop app runtime, got ${desktopAppReadiness.runtimeProfile.surface}`);
    assert(desktopAppReadiness.runtimeProfile.networkMode === "offline_local", `expected offline local runtime, got ${desktopAppReadiness.runtimeProfile.networkMode}`);
    assert(desktopAppReadiness.runtimeProfile.executionLane === "desktop_app_mpr", `expected desktop app MPR lane, got ${desktopAppReadiness.runtimeProfile.executionLane}`);
    assert(desktopAppReadiness.renderPlan.qualityMode === "diagnostic_full", `explicit desktop app bridge may use diagnostic_full policy, got ${desktopAppReadiness.renderPlan.qualityMode}`);
    assert(desktopAppReadiness.renderPlan.memoryBudgetClass === "diagnostic", `explicit desktop app bridge must unlock diagnostic memory class, got ${desktopAppReadiness.renderPlan.memoryBudgetClass}`);
    assert(
      desktopAppReadiness.renderPlan.progressiveSliceWindowCap > largeGeometryReadiness.renderPlan.progressiveSliceWindowCap,
      `explicit desktop app bridge must allow a larger CT slice window than desktop web, got ${desktopAppReadiness.renderPlan.progressiveSliceWindowCap}`
    );

    const spoofedDesktopAppReadiness = await postJson(app, "/api/imaging/dicom/workstation-readiness", {
      series: largeGeometrySeries,
      client: {
        ...desktopAppClient,
        desktopShellBridgeSupported: false,
        runtimeSurfaceHint: "desktop_app"
      }
    });
    assert(
      spoofedDesktopAppReadiness.runtimeProfile.surface === "desktop_web",
      `desktop-app UA without bridge must stay desktop web, got ${spoofedDesktopAppReadiness.runtimeProfile.surface}`
    );
    assert(
      spoofedDesktopAppReadiness.runtimeProfile.executionLane !== "desktop_app_mpr",
      "desktop-app UA without bridge must not unlock desktop app MPR"
    );

    const offlineRemoteSeries = { ...largeGeometrySeries, sourceKind: "dicomweb", sourceName: "offline-pacs-smoke", firstFilePath: null };
    const offlineRemoteReadiness = await postJson(app, "/api/imaging/dicom/workstation-readiness", {
      series: offlineRemoteSeries,
      client: diagnosticClient
    });
    assert(
      offlineRemoteReadiness.runtimeProfile.networkMode === "offline_remote_blocked",
      `expected offline remote block, got ${offlineRemoteReadiness.runtimeProfile.networkMode}`
    );
    assert(offlineRemoteReadiness.runtimeProfile.executionLane === "metadata_only", "offline remote DICOMweb must stay metadata-only");
    assert(offlineRemoteReadiness.renderPlan.textureStrategy === "metadata_only", "offline remote DICOMweb must not plan texture loading");
    const offlineRemoteCachePlan = await postJson(app, "/api/imaging/dicom/render-cache-plan", {
      series: offlineRemoteSeries,
      renderPlan: offlineRemoteReadiness.renderPlan
    });
    assert(
      offlineRemoteCachePlan.tasks.every((task) => task.kind === "metadata_index"),
      "offline remote cache plan must not create decode/upload tasks"
    );
    assert(
      offlineRemoteCachePlan.progressiveStages.every((stage) => stage.kind === "metadata_only"),
      "offline remote progressive plan must stay metadata-only"
    );

    const archiveOnlyRows = Array.from({ length: 8 }, (_unused, rowIndex) => {
      const instance = rowIndex + 1;
      return [
        "Synthetic Archive CT",
        "cbct",
        "CT",
        "1.2.826.0.1.3680043.10.54321.20260518.archive.study",
        "1.2.826.0.1.3680043.10.54321.20260518.archive.series",
        String(instance),
        "Archive-only synthetic stack",
        "512",
        "512",
        "16",
        "1",
        String(512 * 512 * 2),
        "2026-05-18",
        `D:\\KLKT\\archive_only\\synthetic_archive_cbct.zip::IMG${String(instance).padStart(4, "0")}.dcm`
      ].join(";");
    });
    const archiveOnlyPreview = await postJson(app, "/api/imaging/dicom/series-preview", {
      sourceName: "archive-only-dicom-table",
      sourceKind: "dicom_file",
      rawText: [
        "patient;kind;modality;StudyInstanceUID;SeriesInstanceUID;InstanceNumber;SeriesDescription;Rows;Columns;BitsAllocated;SamplesPerPixel;EstimatedPixelBytes;date;file",
        ...archiveOnlyRows
      ].join("\n")
    });
    const archiveOnlySeries = archiveOnlyPreview.series[0];
    assert(archiveOnlySeries, "missing archive-only DICOM series");
    assert(archiveOnlySeries.fileCount === 8, `expected 8 archive-only slices, got ${archiveOnlySeries.fileCount}`);
    assert(archiveOnlySeries.firstFilePath?.includes("synthetic_archive_cbct.zip::IMG0001.dcm"), "archive-only series must preserve virtual ZIP entry path");
    assert(archiveOnlySeries.mprReadiness.volumeCandidate, "archive-only CT must still be recognized as a volume candidate");
    assert(!archiveOnlySeries.mprReadiness.canOpenMpr, "archive-only ZIP virtual entries must not claim browser MPR readiness");
    assert(
      archiveOnlySeries.mprReadiness.blockers.some((blocker) => blocker.includes("ZIP")),
      "archive-only readiness must explain ZIP pixel access blocker"
    );
    assert(archiveOnlySeries.mprReadiness.recommendedLayout === "external_only", `expected archive-only external layout, got ${archiveOnlySeries.mprReadiness.recommendedLayout}`);
    assert(archiveOnlySeries.mprReadiness.projections.length === 0, "archive-only virtual ZIP entries must not expose local MPR projections");
    assert(
      archiveOnlySeries.mprReadiness.tools.length === 1 && archiveOnlySeries.mprReadiness.tools[0] === "external_open",
      `archive-only virtual ZIP tools must stay external-only, got ${archiveOnlySeries.mprReadiness.tools.join(",")}`
    );
    assert(
      archiveOnlySeries.mprReadiness.resourcePolicy.loadStrategy === "external_handoff",
      `archive-only resource policy must use external handoff, got ${archiveOnlySeries.mprReadiness.resourcePolicy.loadStrategy}`
    );
    assert(
      archiveOnlySeries.mprReadiness.resourcePolicy.cacheMode === "metadata_only",
      `archive-only resource policy must stay metadata-only, got ${archiveOnlySeries.mprReadiness.resourcePolicy.cacheMode}`
    );
    const archiveOnlyReadiness = await postJson(app, "/api/imaging/dicom/workstation-readiness", {
      series: archiveOnlySeries,
      client: diagnosticClient
    });
    assert(archiveOnlyReadiness.runtimeProfile.executionLane === "metadata_only", `archive-only runtime must stay metadata-only, got ${archiveOnlyReadiness.runtimeProfile.executionLane}`);
    assert(!archiveOnlyReadiness.runtimeProfile.canUseLocalFiles, "archive-only virtual ZIP entries must not be treated as local files");
    assert(!archiveOnlyReadiness.runtimeProfile.canUseBrowserMpr, "archive-only virtual ZIP entries must not enable browser MPR");
    assert(
      archiveOnlyReadiness.renderPlan.textureStrategy === "external_viewer" || archiveOnlyReadiness.renderPlan.textureStrategy === "metadata_only",
      `archive-only render plan must stay external/metadata-only, got ${archiveOnlyReadiness.renderPlan.textureStrategy}`
    );
    const archiveOnlyCachePlan = await postJson(app, "/api/imaging/dicom/render-cache-plan", {
      series: archiveOnlySeries,
      renderPlan: archiveOnlyReadiness.renderPlan
    });
    assert(
      archiveOnlyCachePlan.tasks.every((task) => task.kind === "external_handoff" || task.kind === "metadata_index"),
      "archive-only cache plan must not create browser decode/upload tasks"
    );
    assert(
      archiveOnlyCachePlan.progressiveStages.every((stage) => stage.kind === "external_handoff" || stage.kind === "metadata_only"),
      "archive-only progressive stages must stay external/metadata-only"
    );
    const archiveOnlyWorkbench = await postJson(app, "/api/imaging/dicom/viewer-workbench-manifest", {
      viewerKind: "cornerstone3d",
      target: "cornerstone3d",
      series: archiveOnlySeries,
      client: diagnosticClient,
      annotations: [],
      viewerState: null,
      allowExternalHandoff: true
    });
    assert(
      archiveOnlyWorkbench.launchManifest.launchMode === "external_handoff",
      `archive-only workbench must use external handoff, got ${archiveOnlyWorkbench.launchManifest.launchMode}`
    );
    assert(
      archiveOnlyWorkbench.launchManifest.dataSource.kind === "external_viewer",
      `archive-only data source must be external viewer, got ${archiveOnlyWorkbench.launchManifest.dataSource.kind}`
    );
    assert(
      archiveOnlyWorkbench.launchManifest.launchMode !== "local_manifest",
      "archive-only workbench must not emit a local manifest for virtual ZIP entries"
    );
    assert(
      archiveOnlyWorkbench.toolStateBundle.viewports.every((viewport) => viewport.viewportType === "stack" && viewport.volumeId === null && viewport.referencedImageId === null),
      "archive-only tool state must not expose volume viewports or local dicomfile references"
    );
    for (const volumeTool of ["implant_axis", "nerve_canal", "panoramic_curve", "measure_area", "measure_volume", "bone_density_probe", "surgical_guide"]) {
      const config = archiveOnlyWorkbench.toolStateBundle.tools.find((tool) => tool.crmTool === volumeTool);
      assert(config?.mode === "disabled", `archive-only virtual ZIP tool ${volumeTool} must be disabled, got ${config?.mode}`);
    }

    const largeGeometryCachePlan = await postJson(app, "/api/imaging/dicom/render-cache-plan", {
      series: largeGeometrySeries,
      renderPlan: largeGeometryReadiness.renderPlan
    });
    assert(
      largeGeometryCachePlan.interactionPhases.some((phase) => phase.id === "interactive_navigation"),
      "large-geometry cache plan must include an interactive navigation phase"
    );
    assert(
      largeGeometryCachePlan.interactionPhases.some((phase) => phase.id === "idle_refine"),
      "large-geometry cache plan must include an idle refinement phase"
    );
    const largeProgressiveKinds = largeGeometryCachePlan.progressiveStages.map((stage) => stage.kind);
    assert(largeProgressiveKinds.includes("seed_slices"), "large-geometry progressive plan must seed orientation slices");
    assert(largeProgressiveKinds.includes("interleaved_decimation"), "large-geometry progressive plan must include interleaved decimation");
    assert(largeProgressiveKinds.includes("active_window"), "large-geometry progressive plan must include active-window loading");
    assert(largeProgressiveKinds.includes("idle_refine"), "large-geometry progressive plan must include idle refinement");
    assert(
      largeGeometryCachePlan.progressiveStages.some((stage) => stage.kind === "interleaved_decimation" && stage.decimationFactor > 1),
      "interleaved progressive stage must use a real decimation factor"
    );
    const interleavedStage = largeGeometryCachePlan.progressiveStages.find((stage) => stage.kind === "interleaved_decimation");
    assert(interleavedStage?.cornerstoneRequestType === "interaction", "interleaved stage must use interaction request type");
    assert(interleavedStage?.cancelGroupId, "interleaved stage must expose a cancel group");
    assert(interleavedStage?.requiresStageIds.includes("seed-orientation-slices"), "interleaved stage must depend on seeded orientation");
    assert(interleavedStage?.sliceOrder.length > 0, "interleaved stage must expose executable slice order");
    assert(interleavedStage.sliceOrder.length <= 128, "interleaved stage slice order must stay bounded");
    assert(
      interleavedStage.sliceOrder.every((slice) => Number.isInteger(slice) && slice >= 0 && slice < largeGeometrySeries.fileCount),
      "interleaved stage slice order must stay inside the series"
    );
    const noWorkerReadiness = await postJson(app, "/api/imaging/dicom/workstation-readiness", {
      series: largeGeometrySeries,
      client: {
        ...diagnosticClient,
        offscreenCanvasSupported: false,
        webWorkerSupported: false
      }
    });
    const noWorkerCachePlan = await postJson(app, "/api/imaging/dicom/render-cache-plan", {
      series: largeGeometrySeries,
      renderPlan: noWorkerReadiness.renderPlan
    });
    assert(noWorkerCachePlan.workerCount === 0, `no-worker cache plan must report workerCount=0, got ${noWorkerCachePlan.workerCount}`);
    assert(noWorkerCachePlan.decodeConcurrency === 1, `no-worker cache plan must keep decodeConcurrency=1, got ${noWorkerCachePlan.decodeConcurrency}`);
    assert(
      noWorkerCachePlan.progressiveStages.every((stage) => stage.target !== "web_worker" && stage.target !== "offscreen_canvas"),
      "no-worker progressive stages must not target workers or OffscreenCanvas"
    );
    assert(
      noWorkerCachePlan.warnings.some((warning) => warning.includes("Фоновая подготовка КТ-срезов недоступна")),
      "no-worker cache plan must warn about reduced background preparation"
    );
    assert(noWorkerReadiness.renderPlan.progressiveSliceWindowCap <= 24, `no-worker readiness must cap CT slice windows, got ${noWorkerReadiness.renderPlan.progressiveSliceWindowCap}`);

    const capStressRows = Array.from({ length: 96 }, (_unused, rowIndex) => {
      const instance = rowIndex + 1;
      return [
        "Synthetic Cap Stress CT",
        "cbct",
        "CT",
        "1.2.826.0.1.3680043.10.54321.20260518.cap.study",
        "1.2.826.0.1.3680043.10.54321.20260518.cap.series",
        String(instance),
        "Cap stress synthetic stack",
        "512",
        "512",
        "16",
        "1",
        String(512 * 512 * 2),
        "2026-05-18",
        `D:\\KLKT\\cap_stress\\IMG${String(instance).padStart(4, "0")}.dcm`
      ].join(";");
    });
    const capStressPreview = await postJson(app, "/api/imaging/dicom/series-preview", {
      sourceName: "cap-stress-dicom-table",
      sourceKind: "dicom_file",
      rawText: [
        "patient;kind;modality;StudyInstanceUID;SeriesInstanceUID;InstanceNumber;SeriesDescription;Rows;Columns;BitsAllocated;SamplesPerPixel;EstimatedPixelBytes;date;file",
        ...capStressRows
      ].join("\n")
    });
    const capStressSeries = capStressPreview.series[0];
    assert(capStressSeries, "missing cap-stress DICOM series");
    const capStressReadiness = await postJson(app, "/api/imaging/dicom/workstation-readiness", {
      series: capStressSeries,
      client: {
        ...diagnosticClient,
        offscreenCanvasSupported: false,
        webWorkerSupported: false
      }
    });
    assert(capStressReadiness.renderPlan.progressiveSliceWindowCap <= 24, `cap-stress no-worker readiness must cap slice windows, got ${capStressReadiness.renderPlan.progressiveSliceWindowCap}`);
    assert(
      capStressReadiness.renderPlan.targetSliceBatch <= capStressReadiness.renderPlan.progressiveSliceWindowCap,
      "render plan target batch must obey progressive slice window cap"
    );
    const capStressCachePlan = await postJson(app, "/api/imaging/dicom/render-cache-plan", {
      series: capStressSeries,
      renderPlan: capStressReadiness.renderPlan
    });
    assert(
      capStressCachePlan.visibleSliceBudget <= capStressReadiness.renderPlan.progressiveSliceWindowCap,
      "render-cache visible slice budget must obey progressive slice window cap"
    );
    assert(
      capStressCachePlan.maxResidentSlices <= capStressReadiness.renderPlan.progressiveSliceWindowCap,
      "render-cache resident slice budget must obey progressive slice window cap"
    );
    assert(
      capStressCachePlan.progressiveStages.every((stage) => stage.maxResidentSlices <= capStressReadiness.renderPlan.progressiveSliceWindowCap),
      "every progressive stage must obey the CT slice window cap"
    );
    assertProgressiveStagesBounded(capStressCachePlan, "cap-stress progressive stages");

    const nearRightEdgeSlice = 75;
    const nearRightEdgeCachePlan = await postJson(app, "/api/imaging/dicom/render-cache-plan", {
      series: capStressSeries,
      renderPlan: capStressReadiness.renderPlan,
      viewerState: syntheticViewerState(nearRightEdgeSlice)
    });
    assert(nearRightEdgeCachePlan.activeSliceIndex === nearRightEdgeSlice, `near-right-edge active slice drifted to ${nearRightEdgeCachePlan.activeSliceIndex}`);
    assert(
      nearRightEdgeCachePlan.firstWindowStart > 0 && nearRightEdgeCachePlan.firstWindowEnd < capStressSeries.fileCount - 1,
      "near-right-edge smoke must keep both adjacent sides available"
    );
    const nearRightActiveStage = nearRightEdgeCachePlan.progressiveStages.find((stage) => stage.kind === "active_window");
    const nearRightAdjacentStage = nearRightEdgeCachePlan.progressiveStages.find((stage) => stage.kind === "adjacent_window");
    assertStageSliceOrderInsideRange(nearRightActiveStage, capStressSeries.fileCount, "near-right active window");
    assertStageSliceOrderInsideRange(nearRightAdjacentStage, capStressSeries.fileCount, "near-right adjacent window");
    assert(nearRightActiveStage.sliceOrder[0] === nearRightEdgeSlice, "active window must request the selected center slice first");
    assert(
      nearRightAdjacentStage.sliceStart === nearRightEdgeCachePlan.firstWindowEnd + 1,
      `near-right adjacent prefetch must choose the useful right-side neighbor, got ${nearRightAdjacentStage.sliceStart}-${nearRightAdjacentStage.sliceEnd}`
    );
    const nearRightAdjacentCenter = Math.floor((nearRightAdjacentStage.sliceStart + nearRightAdjacentStage.sliceEnd) / 2);
    assert(
      nearRightAdjacentStage.sliceOrder[0] === nearRightAdjacentCenter,
      "adjacent window must request its center slice first"
    );
    assertNoSliceOrderOverlap(nearRightActiveStage, nearRightAdjacentStage, "near-right active and adjacent windows");
    assertProgressiveStagesBounded(nearRightEdgeCachePlan, "near-right progressive stages");
    const nearRightAdjacentTask = nearRightEdgeCachePlan.tasks.find((task) => task.id === "build-adjacent-brick");
    assert(nearRightAdjacentTask, "near-right bricked plan must include adjacent brick prefetch");
    assert(
      nearRightAdjacentTask.sliceStart === nearRightAdjacentStage.sliceStart && nearRightAdjacentTask.sliceEnd === nearRightAdjacentStage.sliceEnd,
      "adjacent brick task must follow the same neighbor window as progressive prefetch"
    );
    assert(
      nearRightAdjacentTask.estimatedMemoryMb <= nearRightEdgeCachePlan.gpuMemoryBudgetMb,
      "adjacent brick task must stay under the cache-plan GPU memory budget"
    );

    const seriesEndSlice = capStressSeries.fileCount - 1;
    const seriesEndCachePlan = await postJson(app, "/api/imaging/dicom/render-cache-plan", {
      series: capStressSeries,
      renderPlan: capStressReadiness.renderPlan,
      viewerState: syntheticViewerState(seriesEndSlice)
    });
    const seriesEndActiveStage = seriesEndCachePlan.progressiveStages.find((stage) => stage.kind === "active_window");
    const seriesEndAdjacentStage = seriesEndCachePlan.progressiveStages.find((stage) => stage.kind === "adjacent_window");
    assertStageSliceOrderInsideRange(seriesEndActiveStage, capStressSeries.fileCount, "series-end active window");
    assertStageSliceOrderInsideRange(seriesEndAdjacentStage, capStressSeries.fileCount, "series-end adjacent window");
    assert(seriesEndCachePlan.firstWindowEnd === seriesEndSlice, "series-end active window must include the final slice");
    assert(
      seriesEndActiveStage.sliceEnd - seriesEndActiveStage.sliceStart + 1 === Math.min(seriesEndCachePlan.visibleSliceBudget, capStressSeries.fileCount),
      "series-end active window must stay full-sized when enough earlier slices exist"
    );
    assert(
      seriesEndAdjacentStage.sliceEnd === seriesEndCachePlan.firstWindowStart - 1,
      "series-end adjacent prefetch must fall back to the previous neighbor window"
    );
    assertNoSliceOrderOverlap(seriesEndActiveStage, seriesEndAdjacentStage, "series-end active and adjacent windows");
    assertProgressiveStagesBounded(seriesEndCachePlan, "series-end progressive stages");

    const localOrganizer = await postJson(app, "/api/imaging/local-organizer/scan-preview", {
      rootPaths: [fixtureRoot],
      maxDepth: 0,
      maxFolders: 4,
      maxFilesPerFolder: sliceCount + 8,
      maxCandidates: 4,
      includeDentalModels: true,
      includeDicom: true
    });
    const organizerCase = localOrganizer.cases[0];
    assert(organizerCase, "local organizer must detect the mixed DICOM/model smoke case");
    assert(organizerCase.recommendedAction === "mixed_case_workup", `expected mixed case workup, got ${organizerCase.recommendedAction}`);
    const organizerModelRoles = organizerCase.modelCandidates.map((model) => model.role);
    assert(organizerModelRoles.includes("skull_surface"), "local organizer must classify CT skull surface models");
    assert(organizerModelRoles.includes("mandible_surface"), "local organizer must classify mandibular bone surface models");
    assert(organizerCase.modelWorkbenchManifest.version === "dental-crm-model-workbench-v1", "model workbench manifest missing version");
    assert(organizerCase.modelWorkbenchManifest.totalModels >= 2, "model workbench manifest must include model candidates");
    assert(organizerCase.modelWorkbenchManifest.ctSurfaceModels >= 2, "model workbench manifest must count CT surface models");
    assert(organizerCase.modelWorkbenchManifest.recommendedTarget === "local_bridge", "CT surface model workbench must recommend local bridge");
    const skullWorkbenchItem = organizerCase.modelWorkbenchManifest.items.find((item) => item.role === "skull_surface");
    assert(skullWorkbenchItem, "model workbench manifest must include skull surface item");
    assert(skullWorkbenchItem.loadTarget === "local_bridge", "skull surface model must route to local bridge");
    assert(skullWorkbenchItem.pairingHint === "same_folder_ct_series", "skull surface model must pair with same-folder CT series");
    assert(skullWorkbenchItem.ctSurfaceManifest, "skull surface model must expose CT surface manifest");
    assert(skullWorkbenchItem.ctSurfaceManifest.readiness === "pending_local_bridge", `skull CT surface readiness must be pending_local_bridge, got ${skullWorkbenchItem.ctSurfaceManifest.readiness}`);
    assert(skullWorkbenchItem.ctSurfaceManifest.containsMeshGeometry === false, "CT surface manifest must not embed mesh geometry");
    assert(skullWorkbenchItem.ctSurfaceManifest.registrationStatus === "same_folder_inferred", "same-folder CT surface pairing must be explicit");
    assert(skullWorkbenchItem.ctSurfaceManifest.sourceSeriesRef?.folderFingerprint === organizerCase.folderFingerprint, "CT surface manifest must carry the redacted folder fingerprint");
    const mandibleWorkbenchItem = organizerCase.modelWorkbenchManifest.items.find((item) => item.role === "mandible_surface");
    assert(mandibleWorkbenchItem?.ctSurfaceManifest?.readiness === "pending_local_bridge", "mandible CT surface must wait for local bridge validation");
    const zipModelWorkbenchItem = organizerCase.modelWorkbenchManifest.items.find((item) => item.format === "zip_archive");
    assert(zipModelWorkbenchItem, "model workbench manifest must keep ZIP candidates as model metadata");
    assert(zipModelWorkbenchItem.loadTarget === "metadata_only", "ZIP model candidate must stay metadata-only");
    assert(zipModelWorkbenchItem.ctSurfaceManifest === null, "ZIP model candidate must not expose a CT surface manifest without validated mesh role");

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
    assert(firstFrame.selectableFileCount === 8, `expected 8 selectable first-frame files, got ${firstFrame.selectableFileCount}`);

    const selectedFrame = await postJson(app, "/api/imaging/dicom/first-frame-preview", {
      folderPath: fixtureRoot,
      recursive: false,
      maxFiles: 8,
      maxFileBytes: 1024 * 1024,
      maxPreviewEdge: 256,
      preferredFileIndex: 6
    });
    assert(selectedFrame.status === "ready", `selected first-frame preview not ready: ${selectedFrame.status}`);
    assert(selectedFrame.requestedFileIndex === 6, `expected requested frame index 6, got ${selectedFrame.requestedFileIndex}`);
    assert(selectedFrame.sourceFileIndex === 6, `expected selected frame index 6, got ${selectedFrame.sourceFileIndex}`);
    assert(selectedFrame.selectableFileCount === 8, "selected first-frame response should keep stack count");
    assert(selectedFrame.folderPath === "redacted-local-dicom-folder", "selected first-frame response should redact local folder path");
    assert(selectedFrame.imageDataUrl?.startsWith("data:image/png;base64,"), "selected first-frame response should contain PNG data URL");

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
      diagnosticPlan.renderCachePlan.interactionPhases.some((phase) => phase.id === "interactive_navigation"),
      "diagnostic plan must expose the interactive navigation phase"
    );
    assert(
      diagnosticPlan.renderCachePlan.interactionPhases.some((phase) => phase.id === "idle_refine"),
      "diagnostic plan must expose the idle refinement phase"
    );
    assert(
      diagnosticPlan.renderCachePlan.progressiveStages.some((stage) => stage.kind === "interleaved_decimation"),
      "diagnostic plan must expose interleaved progressive loading"
    );
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
    assert(
      lowPowerPlan.renderCachePlan.interactionPhases.some((phase) => phase.id === "external_review"),
      "low-power plan must expose the external review phase"
    );
    assert(
      lowPowerPlan.renderCachePlan.progressiveStages.every((stage) => stage.kind === "external_handoff"),
      "low-power progressive plan must stay in external handoff"
    );

    const workbench = await postJson(app, "/api/imaging/dicom/viewer-workbench-manifest", {
      viewerKind: "cornerstone3d",
      target: "cornerstone3d",
      series: diagnosticPlan.series,
      client: diagnosticClient,
      annotations: [],
      viewerState: {
        mode: "mpr",
        activeTool: "measure_distance",
        activeQuickActionId: "nerve_canal",
        windowPreset: "bone",
        windowCenter: null,
        windowWidth: null,
        brightness: 1,
        contrast: 1,
        inverted: false,
        rotationDeg: 0,
        flipHorizontal: false,
        zoom: 1,
        panX: 0,
        panY: 0,
        sliceIndex: 12,
        projection: "axial",
        axisDeg: 5,
        slabMm: 3,
        crosshair: true,
        linkedPlanes: true,
        implantPlan: null
      },
      allowExternalHandoff: true
    });
    assert(workbench.version === "dental-crm-dicom-workbench-v1", "unexpected workbench manifest version");
    assert(!workbench.doctorBlocking, "workbench manifest should not block the doctor workflow");
    assert(workbench.launchManifest.launchMode === "local_manifest", `unexpected launch mode ${workbench.launchManifest.launchMode}`);
    assert(workbench.toolStateBundle.viewports.length >= 4, "expected linked MPR/panoramic viewports");
    assert(
      workbench.toolStateBundle.viewports.every((viewport) => viewport.sliceIndex === 12),
      "expected linked MPR viewports to carry the selected slice index"
    );
    assert(workbench.toolStateBundle.activeQuickActionId === "nerve_canal", "workbench must preserve active CT quick-action identity");
    assert(workbench.toolStateBundle.implantPlan === null, "expected empty CT implant plan to be explicit in tool-state bundle");
    const activePlanningTasks = workbench.toolStateBundle.planningTasks.filter((task) => task.status === "active");
    assert(
      activePlanningTasks.some((task) => task.kind === "nerve_canal"),
      "exact CT quick-action identity must mark the clinical nerve-canal task active"
    );
    assert(
      !activePlanningTasks.some((task) => task.kind === "distance_measurement"),
      "shared distance tool must not steal active status from the exact CT quick-action route"
    );
    const planningTaskKinds = workbench.toolStateBundle.planningTasks.map((task) => task.kind);
    for (const kind of [
      "panoramic_reconstruction",
      "cross_section_curve",
      "distance_measurement",
      "angle_measurement",
      "area_roi",
      "volume_roi",
      "implant_axis",
      "implant_library",
      "nerve_canal",
      "bone_density_probe",
      "surgical_guide"
    ]) {
      assert(planningTaskKinds.includes(kind), `missing CT planning task ${kind}`);
    }
    assert(
      workbench.toolStateBundle.planningTasks.some((task) => task.kind === "implant_library" && task.implantPlan === null),
      "expected implant library task to carry an explicit empty implant plan"
    );
    assert(
      workbench.toolStateBundle.planningTasks.some((task) => task.kind === "panoramic_reconstruction" && task.status !== "blocked"),
      "expected complete synthetic CBCT stack to allow panoramic reconstruction planning"
    );

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
        geometry: {
          rows: series.imageRows,
          columns: series.imageColumns,
          bitsAllocated: series.bitsAllocated,
          estimatedPixelBytes: series.estimatedPixelBytes
        },
        projections: series.mprReadiness.projections,
        largeGeometry: {
          estimatedPixelBytes: largeGeometrySeries.estimatedPixelBytes,
          memoryMb: largeGeometrySeries.mprReadiness.resourcePolicy.estimatedMemoryMb,
          renderMemoryMb: largeGeometryReadiness.renderPlan.estimatedGpuMemoryMb,
          phases: largeGeometryCachePlan.interactionPhases.map((phase) => phase.id),
          progressiveStages: largeGeometryCachePlan.progressiveStages.map((stage) => `${stage.kind}:${stage.decimationFactor}`),
          progressiveOrder: largeGeometryCachePlan.progressiveStages.map((stage) => `${stage.kind}:${stage.sliceOrder.length}`),
          runtime: largeGeometryReadiness.runtimeProfile,
          mobileRuntime: mobileReadiness.runtimeProfile,
          desktopAppRuntime: desktopAppReadiness.runtimeProfile,
          offlineRemoteRuntime: offlineRemoteReadiness.runtimeProfile
        },
        localOrganizer: {
          recommendedAction: organizerCase.recommendedAction,
          modelRoles: organizerModelRoles,
          modelTarget: organizerCase.modelWorkbenchManifest.recommendedTarget,
          modelPairing: skullWorkbenchItem.pairingHint
        },
        russianTable: {
          totalRows: russianTablePreview.totalRows,
          totalSeries: russianTablePreview.totalSeries,
          kind: russianSeries.kind,
          modality: russianSeries.modality,
          recommendedViewer: russianSeries.recommendedViewer
        },
        russianHumanHeaders: {
          totalRows: russianAliasPreview.totalRows,
          totalSeries: russianAliasPreview.totalSeries,
          kind: russianAliasSeries.kind,
          capturedAt: russianAliasSeries.capturedAt
        },
        diagnostic: {
          recommendedPath: diagnosticPlan.recommendedPath,
          textureStrategy: diagnosticPlan.renderCachePlan.textureStrategy,
          qualityMode: diagnosticPlan.renderCachePlan.qualityMode,
          taskKinds: diagnosticPlan.renderCachePlan.tasks.map((task) => task.kind),
          phases: diagnosticPlan.renderCachePlan.interactionPhases.map((phase) => phase.id)
        },
        lowPower: {
          recommendedPath: lowPowerPlan.recommendedPath,
          textureStrategy: lowPowerPlan.renderCachePlan.textureStrategy,
          taskKinds: lowPowerPlan.renderCachePlan.tasks.map((task) => task.kind),
          phases: lowPowerPlan.renderCachePlan.interactionPhases.map((phase) => phase.id)
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
