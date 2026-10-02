import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {
  parseDicomSliceHeader,
  buildVolumeFromDicomFiles,
  buildVolumeFromDicomBuffers,
  buildVolumeFromDicomweb,
  buildDicomwebWadoUrl,
  buildCornerstoneWadoImageId,
} from "../components/radiology/realDicomVolumeLoader";
import { extractMprSlice } from "../components/radiology/cbctMprMath";
import {
  autoDetectDentalArch,
  findOcclusalZPlane,
} from "../components/radiology/dentalCurveEngine";

describe("Real DICOM Series Volume Loader & Ingestion Engine", () => {
  it("correctly parses synthetic or raw DICOM binary header tags", () => {
    const buf = new ArrayBuffer(200);
    const view = new DataView(buf);

    // Preamble + DICM
    view.setUint8(128, 0x44); // 'D'
    view.setUint8(129, 0x49); // 'I'
    view.setUint8(130, 0x43); // 'C'
    view.setUint8(131, 0x4D); // 'M'

    const header = parseDicomSliceHeader(buf);
    assert.equal(header.rows, 800);
    assert.equal(header.cols, 800);
    assert.equal(header.pixelSpacing.x, 0.20);
    assert.equal(header.pixelSpacing.y, 0.20);
  });

  it("parses live KaVo OP300 CBCT slice fixture (kavo_op300_cbct_slice.dcm)", () => {
    const fixturePath = "C:/Clinic_MVP/dental-crm/apps/web/public/radiology/kavo_op300_cbct_slice.dcm";
    assert.ok(fs.existsSync(fixturePath), "Fixture must exist on disk");

    const buf = fs.readFileSync(fixturePath);
    const arrayBuf = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
    const header = parseDicomSliceHeader(arrayBuf);

    assert.equal(header.rows, 468, "Rows should match KaVo OP300 resolution");
    assert.equal(header.cols, 468, "Cols should match KaVo OP300 resolution");
    assert.equal(header.bitsAllocated, 16, "16-bit CT acquisition");
    assert.equal(Math.round(header.pixelSpacing.x * 100) / 100, 0.32, "PixelSpacing X = 0.32 mm");
    assert.equal(Math.round(header.pixelSpacing.y * 100) / 100, 0.32, "PixelSpacing Y = 0.32 mm");
    assert.equal(header.rescaleSlope, 1, "Rescale slope should be 1");
    assert.equal(header.rescaleIntercept, -1000, "Rescale intercept should be -1000 HU");
    assert.equal(header.windowCenter, 1556, "WindowCenter = 1556");
    assert.equal(header.windowWidth, 3113, "WindowWidth = 3113");
    assert.equal(header.pixelDataByteOffset, 4784, "PixelData byte offset should be 4784");
    assert.equal(header.pixelDataByteLength, 468 * 468 * 2, "PixelData length should be 438,048 bytes");
    assert.equal(header.pixelDataByteOffset + header.pixelDataByteLength, buf.length, "Pixel data must span to EOF");
  });

  it("parses anonymized KaVo OP300 CBCT slice fixture from shared packages", () => {
    const fixturePath = "C:/Clinic_MVP/dental-crm/packages/shared/test-fixtures/kavo_op300_cbct_slice_anonymized.dcm";
    assert.ok(fs.existsSync(fixturePath), "Shared fixture must exist on disk");

    const buf = fs.readFileSync(fixturePath);
    const arrayBuf = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
    const header = parseDicomSliceHeader(arrayBuf);

    assert.equal(header.rows, 468);
    assert.equal(header.cols, 468);
    assert.equal(header.bitsAllocated, 16);
    assert.equal(header.rescaleIntercept, -1000);
  });

  it("parses real clinical CBCT patient dataset (Zakharov Ivan Dmitrievich)", async () => {
    const realDir = "C:/Users/Admin/Downloads/_Organized_Downloads/08_Проекты_и_Папки/_Organized/Folder_Medical_DICOM_Cases/Захаров Иван Дмитриевич КЛКТ 8х15 29.07.25/Захаров Иван Дмитриевич КЛКТ 8х15 29.07.25/IMGDATA/20250729/S0000001";
    if (!fs.existsSync(realDir)) {
      console.log("Real clinical case directory not found, skipping.");
      return;
    }

    const firstSlicePath = path.join(realDir, "I0000001.dcm");
    assert.ok(fs.existsSync(firstSlicePath), "First slice file must exist");

    const buf = fs.readFileSync(firstSlicePath);
    const arrayBuf = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
    const header = parseDicomSliceHeader(arrayBuf);

    assert.equal(header.rows, 600, "Slice rows should be 600");
    assert.equal(header.cols, 600, "Slice cols should be 600");
    assert.equal(header.bitsAllocated, 16, "16-bit CT acquisition");
    assert.equal(header.pixelSpacing.x, 0.25, "Pixel spacing X = 0.25 mm");
    assert.equal(header.pixelSpacing.y, 0.25, "Pixel spacing Y = 0.25 mm");
    assert.equal(header.rescaleIntercept, -1000, "Rescale intercept = -1000 HU");
    assert.equal(header.pixelDataByteOffset + header.pixelDataByteLength, buf.length, "Pixel data must span to EOF");

    // Build volume from 5 real slices
    const sliceFiles = fs.readdirSync(realDir).filter((f) => f.endsWith(".dcm")).sort().slice(0, 5);
    assert.equal(sliceFiles.length, 5, "5 slices selected for volume ingestion");

    const items = sliceFiles.map((fName) => {
      const sBuf = fs.readFileSync(path.join(realDir, fName));
      return {
        buffer: sBuf.buffer.slice(sBuf.byteOffset, sBuf.byteOffset + sBuf.byteLength),
        fileName: fName,
      };
    });

    let progressCalls = 0;
    const volume = await buildVolumeFromDicomBuffers(items, (pct, msg) => {
      progressCalls++;
      assert.ok(pct >= 0 && pct <= 100);
      assert.ok(typeof msg === "string");
    });

    assert.ok(progressCalls > 0, "Progress callback should be invoked");
    assert.equal(volume.dimensions.width, 600);
    assert.equal(volume.dimensions.height, 600);
    assert.equal(volume.dimensions.depth, 5);
    assert.equal(volume.spacingMm.x, 0.25);
    assert.equal(volume.spacingMm.y, 0.25);
    assert.equal(volume.isDisposed, false);
    assert.ok(volume.data instanceof Int16Array, "Volume data must be Int16Array");
    assert.equal(volume.data.length, 600 * 600 * 5, "Voxel count must equal 600*600*5");

    // Verify 2D MPR axial reslicing
    const axialSlice = extractMprSlice(volume, "axial", 2);
    assert.equal(axialSlice.metadata.widthPx, 600);
    assert.equal(axialSlice.metadata.heightPx, 600);
    assert.equal(axialSlice.data.length, 600 * 600 * 4, "RGBA slice buffer length");
  });

  it("generates correct DICOMweb WADO-RS URLs and Cornerstone wadouri imageIds", () => {
    const studyUid = "1.2.840.113619.2.55.3.12345";
    const seriesUid = "1.2.840.113619.2.55.3.67890";
    const instanceUid = "1.2.840.113619.2.55.3.99999";

    const localWadoUrl = buildDicomwebWadoUrl(studyUid, seriesUid, instanceUid);
    assert.equal(
      localWadoUrl,
      `/api/dicomweb/studies/${encodeURIComponent(studyUid)}/series/${encodeURIComponent(seriesUid)}/instances/${encodeURIComponent(instanceUid)}`,
    );

    const remoteWadoUrl = buildDicomwebWadoUrl(studyUid, seriesUid, instanceUid, "https://pacs.clinic.local:4100/");
    assert.equal(
      remoteWadoUrl,
      `https://pacs.clinic.local:4100/api/dicomweb/studies/${encodeURIComponent(studyUid)}/series/${encodeURIComponent(seriesUid)}/instances/${encodeURIComponent(instanceUid)}`,
    );

    const imageId = buildCornerstoneWadoImageId(studyUid, seriesUid, instanceUid, "http://localhost:4100");
    assert.ok(imageId.startsWith("wadouri:http://localhost:4100/api/dicomweb/studies/"));
    assert.ok(imageId.endsWith(encodeURIComponent(instanceUid)));
  });

  it("buildVolumeFromDicomweb fetches metadata and instances via mocked WADO-RS endpoints", async () => {
    const studyUid = "1.2.3.4.5";
    const seriesUid = "1.2.3.4.5.1";
    const sop1 = "1.2.3.4.5.1.1";
    const sop2 = "1.2.3.4.5.1.2";

    // Read real slice file as dummy frame buffer
    const fixturePath = "C:/Clinic_MVP/dental-crm/apps/web/public/radiology/kavo_op300_cbct_slice.dcm";
    const realBuf = fs.readFileSync(fixturePath);

    const originalFetch = globalThis.fetch;
    const requestedUrls: string[] = [];

    globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
      const urlStr = String(input);
      requestedUrls.push(urlStr);

      if (urlStr.includes("/metadata")) {
        return {
          ok: true,
          status: 200,
          json: async () => [
            { "00080018": { Value: [sop1] } },
            { "00080018": { Value: [sop2] } },
          ],
        } as unknown as Response;
      }

      if (urlStr.includes(`/instances/${sop1}`) || urlStr.includes(`/instances/${sop2}`)) {
        return {
          ok: true,
          status: 200,
          arrayBuffer: async () => realBuf.buffer.slice(realBuf.byteOffset, realBuf.byteOffset + realBuf.byteLength),
        } as unknown as Response;
      }

      return { ok: false, status: 404 } as unknown as Response;
    }) as typeof fetch;

    try {
      const vol = await buildVolumeFromDicomweb(studyUid, seriesUid, {
        baseUrl: "https://pacs.clinic.dente:4100",
        headers: { "x-custom-auth": "secret" },
      });

      assert.equal(vol.dimensions.width, 468);
      assert.equal(vol.dimensions.height, 468);
      assert.equal(vol.dimensions.depth, 2);
      assert.ok(requestedUrls.some((u) => u.includes("/metadata")));
      assert.ok(requestedUrls.some((u) => u.includes(sop1)));
      assert.ok(requestedUrls.some((u) => u.includes(sop2)));
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it("buildVolumeFromDicomweb propagates Authorization headers and downloads slices concurrently", async () => {
    const studyUid = "1.2.3.4.999";
    const seriesUid = "1.2.3.4.999.1";
    const sops = Array.from({ length: 12 }, (_, i) => `1.2.3.4.999.1.${i + 1}`);

    const fixturePath = "C:/Clinic_MVP/dental-crm/apps/web/public/radiology/kavo_op300_cbct_slice.dcm";
    const realBuf = fs.readFileSync(fixturePath);

    const originalFetch = globalThis.fetch;
    const recordedHeaders: Array<Record<string, string>> = [];
    let activeConcurrentRequests = 0;
    let maxObservedConcurrency = 0;

    globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
      const urlStr = String(input);
      const headers = (init?.headers ?? {}) as Record<string, string>;
      recordedHeaders.push(headers);

      if (urlStr.includes("/metadata")) {
        return {
          ok: true,
          status: 200,
          json: async () => sops.map((sop) => ({ "00080018": { Value: [sop] } })),
        } as unknown as Response;
      }

      activeConcurrentRequests++;
      if (activeConcurrentRequests > maxObservedConcurrency) {
        maxObservedConcurrency = activeConcurrentRequests;
      }

      // Small async delay to allow concurrent workers to overlap
      await new Promise((r) => setTimeout(r, 20));

      activeConcurrentRequests--;

      return {
        ok: true,
        status: 200,
        arrayBuffer: async () => realBuf.buffer.slice(realBuf.byteOffset, realBuf.byteOffset + realBuf.byteLength),
      } as unknown as Response;
    }) as typeof fetch;

    try {
      const vol = await buildVolumeFromDicomweb(studyUid, seriesUid, {
        baseUrl: "https://pacs.clinic.dente:4100",
        headers: { Authorization: "Bearer test-jwt-token-12345" },
        concurrency: 6,
      });

      assert.equal(vol.dimensions.width, 468);
      assert.equal(vol.dimensions.height, 468);
      // Concurrency must have allowed multiple requests in flight simultaneously (>= 2 and <= 6)
      assert.ok(maxObservedConcurrency >= 2, `Expected concurrent downloads (observed ${maxObservedConcurrency})`);
      assert.ok(maxObservedConcurrency <= 6, `Concurrency ceiling violated (${maxObservedConcurrency} > 6)`);

      // Verify Authorization header was sent on metadata and instance requests
      assert.ok(recordedHeaders.length >= 13);
      for (const h of recordedHeaders) {
        assert.equal(h.Authorization, "Bearer test-jwt-token-12345");
      }
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it("builds and auto-centers 3D CBCT volume from 50-slice demo dataset (Zakharov I.D.)", async () => {
    const demoDir = path.resolve(process.cwd(), "apps/web/public/radiology/demo_cbct");
    assert.ok(fs.existsSync(demoDir), "Demo CBCT directory must exist");

    const manifestPath = path.join(demoDir, "manifest.json");
    assert.ok(fs.existsSync(manifestPath), "Manifest file must exist");

    const manifestRaw = fs.readFileSync(manifestPath, "utf-8");
    const manifest = JSON.parse(manifestRaw) as {
      patientName: string;
      sliceCount: number;
      slices: string[];
    };

    assert.ok(manifest.slices.length >= 50, `Manifest must list at least 50 slices (got ${manifest.slices.length})`);
    assert.equal(manifest.sliceCount, manifest.slices.length);
    assert.ok(manifest.patientName.includes("Захаров"));

    // Verify all slice files exist
    for (const sliceName of manifest.slices) {
      assert.ok(fs.existsSync(path.join(demoDir, sliceName)), `Slice ${sliceName} must exist`);
    }

    // Build volume from all slices
    const items = manifest.slices.map((sliceName) => {
      const buf = fs.readFileSync(path.join(demoDir, sliceName));
      return {
        buffer: buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength),
        fileName: sliceName,
      };
    });

    const volume = await buildVolumeFromDicomBuffers(items);

    // Verify volume dimensions & voxel depth >= 40
    assert.ok(volume.dimensions.depth >= 40, `Depth must be >= 40 (got ${volume.dimensions.depth})`);
    assert.equal(volume.dimensions.depth, manifest.slices.length);
    assert.equal(volume.dimensions.width, 600);
    assert.equal(volume.dimensions.height, 600);

    // Verify voxel spacing (0.25 mm)
    assert.equal(volume.spacingMm.x, 0.25);
    assert.equal(volume.spacingMm.y, 0.25);
    assert.ok(Math.abs(volume.spacingMm.z - 0.25) < 0.01, `Spacing Z must be ~0.25 mm (got ${volume.spacingMm.z})`);

    // Verify HU range (bone & enamel densities)
    assert.equal(volume.minHU, -1000);
    assert.ok(volume.maxHU >= 2000, `Max HU should capture enamel/cortical bone (got ${volume.maxHU})`);

    // Verify dental arch auto-detection and occlusal plane
    const arch = autoDetectDentalArch(volume, "mandible");
    assert.equal(arch.anchors.length, 16, "Dental arch should have 16 FDI tooth anchors");
    assert.ok(arch.totalArcLengthMm > 80 && arch.totalArcLengthMm < 160, `Arch length should be anatomical (got ${arch.totalArcLengthMm})`);

    const occlusalZ = findOcclusalZPlane(volume, "mandible");
    assert.ok(Number.isFinite(occlusalZ), "Occlusal Z plane must be a finite number");

    // Verify crosshair centering on anterior arch midpoint
    const midIdx = Math.floor(arch.splinePointsMm.length / 2);
    const midPoint = arch.splinePointsMm[midIdx];
    assert.ok(midPoint, "Midpoint of arch spline must exist");
    assert.ok(Math.abs(midPoint.x) < 25, `Midpoint X should be near anatomical midline (got ${midPoint.x})`);

    // Verify 2D MPR axial reslicing works on the 50-slice volume
    const axialSlice = extractMprSlice(volume, "axial", 25);
    assert.equal(axialSlice.metadata.widthPx, 600);
    assert.equal(axialSlice.metadata.heightPx, 600);
    assert.equal(axialSlice.data.length, 600 * 600 * 4);
  });
});
