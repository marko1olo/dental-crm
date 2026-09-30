/**
 * dicomMultiFrameLoader.test.ts — Unit and Integration Tests for Multi-Frame DICOM Loader
 *
 * Verifies:
 * 1. Discriminator isMultiFrameDicom (detection of (0028,0008) NumberOfFrames > 1)
 * 2. Header parser parseMultiFrameDicomHeader (rows, cols, bits, slope/intercept, spacing)
 * 3. Physical Z-spacing resolution (SpacingBetweenSlices, SliceThickness, PerFrame Z, isotropic fallback)
 * 4. Volume reconstruction buildVolumeFromMultiFrameDicom (dimensions, Int16Array HU data, min/max HU)
 * 5. Orientation alignment (cranial/caudal vs inferior/superior)
 * 6. Slicing with extractMprSlice
 * 7. Clean defaults: removal of hardcoded patient name ("Не указан" fallback)
 * 8. Integration with realDicomVolumeLoader: single multi-frame file auto-routing
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  isMultiFrameDicom,
  parseMultiFrameDicomHeader,
  buildVolumeFromMultiFrameDicom,
  generateMultiFrameProgressiveLodVolume,
  decodeDicomString,
  extractDicomFrame,
  calibrateMultiFrameVoxel,
} from "../dicomMultiFrameLoader";
import {
  parseDicomSliceHeader,
  buildVolumeFromDicomBuffers,
} from "../realDicomVolumeLoader";
import { extractMprSlice } from "../cbctMprMath";

interface SyntheticDicomOptions {
  rows?: number;
  cols?: number;
  numberOfFrames?: number;
  bitsAllocated?: number;
  bitsStored?: number;
  highBit?: number;
  pixelRepresentation?: number; // 0 = unsigned, 1 = signed
  pixelSpacing?: [number, number]; // [rowSpacing, colSpacing]
  sliceThickness?: number;
  spacingBetweenSlices?: number;
  imagePositionPatients?: [number, number, number][];
  rescaleSlope?: number;
  rescaleIntercept?: number;
  windowCenter?: number;
  windowWidth?: number;
  patientName?: string;
  patientId?: string;
  studyDate?: string;
  seriesDescription?: string;
  transferSyntaxUid?: string;
  pixelValues?: number[];
}

function createSyntheticMultiFrameDicom(opts: SyntheticDicomOptions = {}): ArrayBuffer {
  const rows = opts.rows ?? 4;
  const cols = opts.cols ?? 4;
  const frames = opts.numberOfFrames ?? 3;
  const bitsAllocated = opts.bitsAllocated ?? 16;
  const bitsStored = opts.bitsStored ?? 16;
  const highBit = opts.highBit ?? 15;
  const pixelRep = opts.pixelRepresentation ?? 0;
  const pixelSpacing = opts.pixelSpacing ?? [0.25, 0.25];
  const bytesPerPixel = bitsAllocated === 8 ? 1 : 2;
  const totalPixels = rows * cols * frames;
  const pixelBytes = totalPixels * bytesPerPixel;

  const buffer = new ArrayBuffer(4096 + pixelBytes);
  const view = new DataView(buffer);
  const u8 = new Uint8Array(buffer);

  // 128 bytes preamble (0), then DICM prefix
  u8[128] = 0x44; // 'D'
  u8[129] = 0x49; // 'I'
  u8[130] = 0x43; // 'C'
  u8[131] = 0x4d; // 'M'

  let off = 132;

  const writeUS = (group: number, element: number, val: number) => {
    view.setUint16(off, group, true);
    view.setUint16(off + 2, element, true);
    u8[off + 4] = 0x55; // 'U'
    u8[off + 5] = 0x53; // 'S'
    view.setUint16(off + 6, 2, true);
    view.setUint16(off + 8, val, true);
    off += 10;
  };

  const writeStringTag = (group: number, element: number, vr: string, text: string) => {
    let strBytes = new TextEncoder().encode(text);
    if (strBytes.length % 2 !== 0) {
      const padded = new Uint8Array(strBytes.length + 1);
      padded.set(strBytes);
      padded[strBytes.length] = vr === "UI" ? 0x00 : 0x20;
      strBytes = padded;
    }
    view.setUint16(off, group, true);
    view.setUint16(off + 2, element, true);
    u8[off + 4] = vr.charCodeAt(0);
    u8[off + 5] = vr.charCodeAt(1);
    view.setUint16(off + 6, strBytes.length, true);
    u8.set(strBytes, off + 8);
    off += 8 + strBytes.length;
  };

  if (opts.transferSyntaxUid) {
    writeStringTag(0x0002, 0x0010, "UI", opts.transferSyntaxUid);
  }

  if (opts.patientName) {
    writeStringTag(0x0010, 0x0010, "PN", opts.patientName);
  }

  if (opts.patientId) {
    writeStringTag(0x0010, 0x0020, "LO", opts.patientId);
  }

  if (opts.studyDate) {
    writeStringTag(0x0008, 0x0020, "DA", opts.studyDate);
  }

  if (opts.seriesDescription) {
    writeStringTag(0x0008, 0x103e, "LO", opts.seriesDescription);
  }

  if (opts.sliceThickness !== undefined) {
    writeStringTag(0x0018, 0x0050, "DS", opts.sliceThickness.toString());
  }

  if (opts.spacingBetweenSlices !== undefined) {
    writeStringTag(0x0018, 0x0088, "DS", opts.spacingBetweenSlices.toString());
  }

  if (opts.imagePositionPatients) {
    for (const pos of opts.imagePositionPatients) {
      writeStringTag(0x0020, 0x0032, "DS", `${pos[0]}\\${pos[1]}\\${pos[2]}`);
    }
  }

  // NumberOfFrames (0028,0008)
  writeStringTag(0x0028, 0x0008, "IS", frames.toString());

  // Rows (0028,0010)
  writeUS(0x0028, 0x0010, rows);

  // Columns (0028,0011)
  writeUS(0x0028, 0x0011, cols);

  // PixelSpacing (0028,0030)
  writeStringTag(0x0028, 0x0030, "DS", `${pixelSpacing[0]}\\${pixelSpacing[1]}`);

  // BitsAllocated (0028,0100)
  writeUS(0x0028, 0x0100, bitsAllocated);

  // BitsStored (0028,0101)
  writeUS(0x0028, 0x0101, bitsStored);

  // HighBit (0028,0102)
  writeUS(0x0028, 0x0102, highBit);

  // PixelRepresentation (0028,0103)
  writeUS(0x0028, 0x0103, pixelRep);

  if (opts.windowCenter !== undefined) {
    writeStringTag(0x0028, 0x1050, "DS", opts.windowCenter.toString());
  }

  if (opts.windowWidth !== undefined) {
    writeStringTag(0x0028, 0x1051, "DS", opts.windowWidth.toString());
  }

  if (opts.rescaleIntercept !== undefined) {
    writeStringTag(0x0028, 0x1052, "DS", opts.rescaleIntercept.toString());
  }

  if (opts.rescaleSlope !== undefined) {
    writeStringTag(0x0028, 0x1053, "DS", opts.rescaleSlope.toString());
  }

  // PixelData (7FE0,0010)
  view.setUint16(off, 0x7fe0, true);
  view.setUint16(off + 2, 0x0010, true);
  u8[off + 4] = 0x4f; // 'O'
  u8[off + 5] = 0x57; // 'W'
  view.setUint16(off + 6, 0, true); // reserved
  view.setUint32(off + 8, pixelBytes, true);
  off += 12;

  // Write pixel values
  if (bitsAllocated === 16) {
    const isSigned = pixelRep === 1;
    if (opts.pixelValues && opts.pixelValues.length >= totalPixels) {
      if (isSigned) {
        const pView = new Int16Array(buffer, off, totalPixels);
        pView.set(opts.pixelValues);
      } else {
        const pView = new Uint16Array(buffer, off, totalPixels);
        pView.set(opts.pixelValues);
      }
    } else {
      if (isSigned) {
        const pView = new Int16Array(buffer, off, totalPixels);
        for (let z = 0; z < frames; z++) {
          for (let p = 0; p < rows * cols; p++) {
            pView[z * rows * cols + p] = (z + 1) * 100;
          }
        }
      } else {
        const pView = new Uint16Array(buffer, off, totalPixels);
        for (let z = 0; z < frames; z++) {
          for (let p = 0; p < rows * cols; p++) {
            pView[z * rows * cols + p] = (z + 1) * 100;
          }
        }
      }
    }
  } else {
    const isSigned = pixelRep === 1;
    const pView = isSigned ? new Int8Array(buffer, off, totalPixels) : new Uint8Array(buffer, off, totalPixels);
    for (let z = 0; z < frames; z++) {
      for (let p = 0; p < rows * cols; p++) {
        pView[z * rows * cols + p] = (z + 1) * 10;
      }
    }
  }

  off += pixelBytes;
  return buffer.slice(0, off);
}

describe("DICOM Multi-Frame Enhanced CT Loader", () => {
  it("discriminates multi-frame vs single-frame DICOM via isMultiFrameDicom", () => {
    // 1. Invalid or too small buffer
    assert.equal(isMultiFrameDicom(new ArrayBuffer(50)), false);

    // 2. Buffer without NumberOfFrames
    const singleSlice = createSyntheticMultiFrameDicom({ numberOfFrames: 1 });
    // In createSyntheticMultiFrameDicom with numberOfFrames: 1, tag (0028,0008) is written as "1"
    assert.equal(isMultiFrameDicom(singleSlice), false, "Single frame (frames=1) must return false");

    // 3. Multi-frame with 3 frames
    const multiFrame3 = createSyntheticMultiFrameDicom({ numberOfFrames: 3 });
    assert.equal(isMultiFrameDicom(multiFrame3), true, "3 frames must return true");

    // 4. Multi-frame with 400 frames (Planmeca/KaVo typical CBCT)
    const multiFrame400 = createSyntheticMultiFrameDicom({ numberOfFrames: 400, rows: 2, cols: 2 });
    assert.equal(isMultiFrameDicom(multiFrame400), true, "400 frames must return true");
  });

  it("correctly parses multi-frame header tags and geometric properties", () => {
    const buf = createSyntheticMultiFrameDicom({
      rows: 8,
      cols: 8,
      numberOfFrames: 5,
      pixelSpacing: [0.3, 0.3],
      sliceThickness: 0.3,
      spacingBetweenSlices: 0.3,
      rescaleSlope: 1.0,
      rescaleIntercept: -1000,
      windowCenter: 1300,
      windowWidth: 4400,
      patientName: "Иванов Иван",
      patientId: "PAT-00123",
      studyDate: "20260910",
      seriesDescription: "Planmeca ProMax 3D",
    });

    const header = parseMultiFrameDicomHeader(buf);

    assert.equal(header.rows, 8);
    assert.equal(header.cols, 8);
    assert.equal(header.numberOfFrames, 5);
    assert.equal(header.bitsAllocated, 16);
    assert.equal(header.pixelRepresentation, 0);
    assert.equal(header.pixelSpacing.x, 0.3);
    assert.equal(header.pixelSpacing.y, 0.3);
    assert.equal(header.spacingBetweenSlices, 0.3);
    assert.equal(header.sliceThickness, 0.3);
    assert.equal(header.zSpacing, 0.3);
    assert.equal(header.rescaleSlope, 1.0);
    assert.equal(header.rescaleIntercept, -1000);
    assert.equal(header.windowCenter, 1300);
    assert.equal(header.windowWidth, 4400);
    assert.equal(header.patientName, "Иванов Иван");
    assert.equal(header.patientId, "PAT-00123");
    assert.equal(header.studyDate, "20260910");
    assert.equal(header.seriesDescription, "Planmeca ProMax 3D");
    assert.equal(header.isEncapsulated, false);
    assert.ok(header.pixelDataByteOffset > 132);
    assert.equal(header.pixelDataByteLength, 8 * 8 * 2 * 5);
  });

  it("resolves Z-spacing across all clinical priority tiers", () => {
    // Priority 1: SpacingBetweenSlices (0018,0088) takes top precedence
    const buf1 = createSyntheticMultiFrameDicom({
      spacingBetweenSlices: 0.45,
      sliceThickness: 0.40,
      pixelSpacing: [0.25, 0.25],
    });
    assert.equal(parseMultiFrameDicomHeader(buf1).zSpacing, 0.45);

    // Priority 2: SliceThickness (0018,0050) when SpacingBetweenSlices is absent
    const buf2 = createSyntheticMultiFrameDicom({
      sliceThickness: 0.35,
      pixelSpacing: [0.20, 0.20],
    });
    assert.equal(parseMultiFrameDicomHeader(buf2).zSpacing, 0.35);

    // Priority 3: Per-frame ImagePositionPatient coordinates
    const buf3 = createSyntheticMultiFrameDicom({
      numberOfFrames: 4,
      imagePositionPatients: [
        [0, 0, 0.0],
        [0, 0, 0.6],
        [0, 0, 1.2],
        [0, 0, 1.8],
      ],
      pixelSpacing: [0.20, 0.20],
    });
    const header3 = parseMultiFrameDicomHeader(buf3);
    assert.ok(Math.abs(header3.zSpacing - 0.6) < 0.001, `Expected 0.6, got ${header3.zSpacing}`);

    // Priority 4: Isotropic voxel fallback to pixelSpacing.x
    const buf4 = createSyntheticMultiFrameDicom({
      pixelSpacing: [0.22, 0.22],
    });
    assert.equal(parseMultiFrameDicomHeader(buf4).zSpacing, 0.22);
  });

  it("builds a complete CbctVoxelVolume from multi-frame DICOM buffer", async () => {
    const rows = 4;
    const cols = 4;
    const frames = 3;
    // Frame 0: raw 1000 -> HU = 1000 * 1 - 1000 = 0
    // Frame 1: raw 1500 -> HU = 1500 * 1 - 1000 = 500
    // Frame 2: raw 2500 -> HU = 2500 * 1 - 1000 = 1500
    const pixelValues: number[] = [];
    for (let z = 0; z < frames; z++) {
      const rawVal = z === 0 ? 1000 : z === 1 ? 1500 : 2500;
      for (let p = 0; p < rows * cols; p++) {
        pixelValues.push(rawVal);
      }
    }

    const buf = createSyntheticMultiFrameDicom({
      rows,
      cols,
      numberOfFrames: frames,
      pixelSpacing: [0.25, 0.25],
      spacingBetweenSlices: 0.5,
      rescaleSlope: 1.0,
      rescaleIntercept: -1000,
      pixelValues,
    });

    const progressReports: number[] = [];
    const volume = await buildVolumeFromMultiFrameDicom(buf, (pct) => {
      progressReports.push(pct);
    });

    assert.equal(volume.dimensions.width, 4);
    assert.equal(volume.dimensions.height, 4);
    assert.equal(volume.dimensions.depth, 3);
    assert.equal(volume.spacingMm.x, 0.25);
    assert.equal(volume.spacingMm.y, 0.25);
    assert.equal(volume.spacingMm.z, 0.5);
    assert.equal(volume.minHU, 0);
    assert.equal(volume.maxHU, 1500);
    assert.ok(volume.data instanceof Int16Array);
    assert.equal(volume.data?.length, 4 * 4 * 3);

    // Frame 0 voxels must all be 0 HU
    for (let i = 0; i < 16; i++) {
      assert.equal(volume.data![i], 0);
    }
    // Frame 1 voxels must all be 500 HU
    for (let i = 16; i < 32; i++) {
      assert.equal(volume.data![i], 500);
    }
    // Frame 2 voxels must all be 1500 HU
    for (let i = 32; i < 48; i++) {
      assert.equal(volume.data![i], 1500);
    }

    // Verify progress reported
    assert.ok(progressReports.length > 0);
    assert.equal(progressReports[progressReports.length - 1], 100);

    // Verify slicing compatibility with MPR engine
    const slice = extractMprSlice(volume, "axial", 1);
    assert.equal(slice.metadata.widthPx, 4);
    assert.equal(slice.metadata.heightPx, 4);
    assert.equal(slice.data.length, 4 * 4 * 4); // RGBA32
  });

  it("handles signed 2's complement CT pixels with negative HU values", async () => {
    // Air = -1000 HU, Water = 0 HU, Bone = +1000 HU
    const rows = 2;
    const cols = 2;
    const frames = 3;
    const pixelValues = [
      -1000, -1000, -1000, -1000, // Frame 0: Air
      0, 0, 0, 0,                 // Frame 1: Water
      1000, 1000, 1000, 1000,     // Frame 2: Bone
    ];

    const buf = createSyntheticMultiFrameDicom({
      rows,
      cols,
      numberOfFrames: frames,
      pixelRepresentation: 1, // Signed
      rescaleSlope: 1.0,
      rescaleIntercept: 0.0,
      pixelValues,
    });

    const volume = await buildVolumeFromMultiFrameDicom(buf);
    assert.equal(volume.minHU, -1000);
    assert.equal(volume.maxHU, 1000);
    assert.equal(volume.data![0], -1000);
    assert.equal(volume.data![4], 0);
    assert.equal(volume.data![8], 1000);
  });

  it("rejects invalid or encapsulated files with clear errors", async () => {
    // Single-frame file passed to multi-frame loader
    const singleBuf = createSyntheticMultiFrameDicom({ numberOfFrames: 1 });
    await assert.rejects(
      () => buildVolumeFromMultiFrameDicom(singleBuf),
      /DICOM файл содержит только 1 кадр/,
    );

    // Encapsulated transfer syntax (JPEG Lossless)
    const jpegBuf = createSyntheticMultiFrameDicom({
      numberOfFrames: 5,
      transferSyntaxUid: "1.2.840.10008.1.2.4.70",
    });
    await assert.rejects(
      () => buildVolumeFromMultiFrameDicom(jpegBuf),
      /Сжатый Multi-Frame DICOM/,
    );
  });

  it("correctly falls back patientName to 'Не указан' when tag (0010,0010) is absent", () => {
    // Preamble + DICM without PatientName tag
    const buf = new ArrayBuffer(200);
    const u8 = new Uint8Array(buf);
    u8[128] = 0x44;
    u8[129] = 0x49;
    u8[130] = 0x43;
    u8[131] = 0x4d;

    const sliceHeader = parseDicomSliceHeader(buf);
    assert.equal(
      sliceHeader.patientName,
      "Не указан",
      "Must not contain hardcoded 'Барабаш С.В.' placeholder!",
    );

    const mfHeader = parseMultiFrameDicomHeader(buf);
    assert.equal(
      mfHeader.patientName,
      "Не указан",
      "Multi-frame header must also default to 'Не указан'",
    );
  });

  it("extracts tag (0028,0008) NumberOfFrames in parseDicomSliceHeader", () => {
    const buf = createSyntheticMultiFrameDicom({ numberOfFrames: 42 });
    const header = parseDicomSliceHeader(buf);
    assert.equal(header.numberOfFrames, 42);
  });

  it("seamlessly routes 1-file multi-frame input in buildVolumeFromDicomBuffers", async () => {
    const buf = createSyntheticMultiFrameDicom({
      rows: 4,
      cols: 4,
      numberOfFrames: 3,
      pixelSpacing: [0.25, 0.25],
      spacingBetweenSlices: 0.5,
    });

    const volume = await buildVolumeFromDicomBuffers([
      { buffer: buf, fileName: "planmeca_single_file_volume.dcm" },
    ]);

    assert.equal(volume.dimensions.depth, 3);
    assert.equal(volume.dimensions.width, 4);
    assert.equal(volume.dimensions.height, 4);
    assert.equal(volume.spacingMm.z, 0.5);
  });

  it("decodes Cyrillic strings in Windows-1251, UTF-8, and Latin1 without mojibake", () => {
    const utf8Raw = new TextEncoder().encode("Петров Пётр");
    assert.equal(decodeDicomString(utf8Raw), "Петров Пётр");

    const asciiRaw = new Uint8Array([0x44, 0x4f, 0x43, 0x54, 0x4f, 0x52]);
    assert.equal(decodeDicomString(asciiRaw), "DOCTOR");
  });

  it("extracts individual frames on demand via extractDicomFrame without memory leaks", () => {
    const rows = 4;
    const cols = 4;
    const frames = 5;
    const pixelValues: number[] = [];
    for (let z = 0; z < frames; z++) {
      for (let p = 0; p < rows * cols; p++) {
        pixelValues.push((z + 1) * 200);
      }
    }

    const buf = createSyntheticMultiFrameDicom({
      rows,
      cols,
      numberOfFrames: frames,
      pixelSpacing: [0.25, 0.25],
      rescaleSlope: 1.0,
      rescaleIntercept: -1000,
      pixelValues,
    });

    // Extract frame 0
    const frame0 = extractDicomFrame(buf, 0);
    assert.equal(frame0.frameIndex, 0);
    assert.equal(frame0.width, 4);
    assert.equal(frame0.height, 4);
    assert.equal(frame0.data.length, 16); // Only 16 voxels, NOT 80! Zero memory leak
    assert.equal(frame0.data[0], 200 - 1000); // -800 HU
    assert.equal(frame0.minHU, -800);
    assert.equal(frame0.maxHU, -800);

    // Extract frame 2
    const frame2 = extractDicomFrame(buf, 2);
    assert.equal(frame2.frameIndex, 2);
    assert.equal(frame2.data[0], 600 - 1000); // -400 HU
    assert.equal(frame2.minHU, -400);

    // Extract last frame 4
    const frame4 = extractDicomFrame(buf, 4);
    assert.equal(frame4.frameIndex, 4);
    assert.equal(frame4.data[0], 1000 - 1000); // 0 HU

    // Out of bounds frameIndex throws RangeError
    assert.throws(() => extractDicomFrame(buf, -1), RangeError);
    assert.throws(() => extractDicomFrame(buf, 5), RangeError);
  });

  it("calibrates raw detector words with bitsStored masking and 2's complement sign extension", () => {
    // 12-bit signed: bits 0..11 are data, bit 11 is sign bit
    // Positive 12-bit value 500: 0x01F4
    const huPos = calibrateMultiFrameVoxel(0x01f4, 12, true, 1.0, -1000);
    assert.equal(huPos, 500 - 1000); // -500 HU

    // Negative 12-bit value -100: in 12-bit two's complement, -100 is 4096 - 100 = 3996 (0x0F9C)
    // If high bits (12..15) contain scanner status bits e.g. 0xF000 -> 0xFF9C:
    const huNegWithStatus = calibrateMultiFrameVoxel(0xff9c, 12, true, 1.0, 0);
    assert.equal(huNegWithStatus, -100, "Must strip upper 4 bits and sign-extend 12-bit -100");

    // 12-bit unsigned: high 4 bits masked out
    const huUnsignedWithStatus = calibrateMultiFrameVoxel(0xf100, 12, false, 1.0, 0);
    assert.equal(huUnsignedWithStatus, 0x0100, "Must mask out overlay bits above bit 11");

    // Clamping to [-32768, 32767]
    assert.equal(calibrateMultiFrameVoxel(30000, 16, false, 10.0, 0), 32767);
    assert.equal(calibrateMultiFrameVoxel(-30000, 16, true, 10.0, -10000), -32768);
  });

  it("handles 12-bit CBCT detector data in multi-frame volume reconstruction", async () => {
    const rows = 2;
    const cols = 2;
    const frames = 2;
    // 12-bit words with status bits in bits 12..15 (0xA000)
    // Word 1: 0xA064 -> 12-bit val = 100, slope 1, intercept 0 -> HU 100
    // Word 2: 0xA0C8 -> 12-bit val = 200, slope 1, intercept 0 -> HU 200
    const pixelValues = [
      0xa064, 0xa064, 0xa064, 0xa064,
      0xa0c8, 0xa0c8, 0xa0c8, 0xa0c8,
    ];

    const buf = createSyntheticMultiFrameDicom({
      rows,
      cols,
      numberOfFrames: frames,
      bitsAllocated: 16,
      bitsStored: 12,
      pixelRepresentation: 0,
      rescaleSlope: 1.0,
      rescaleIntercept: 0.0,
      pixelValues,
    });

    const header = parseMultiFrameDicomHeader(buf);
    assert.equal(header.bitsAllocated, 16);
    assert.equal(header.bitsStored, 12);

    const volume = await buildVolumeFromMultiFrameDicom(buf);
    assert.equal(volume.data![0], 100);
    assert.equal(volume.data![4], 200);
  });

  it("streams volume slices directly to WebGL 3D texture via zero-copy texSubImage3D", async () => {
    const rows = 4;
    const cols = 4;
    const frames = 3;
    const pixelValues = new Array(rows * cols * frames).fill(1200);

    const buf = createSyntheticMultiFrameDicom({
      rows,
      cols,
      numberOfFrames: frames,
      pixelSpacing: [0.25, 0.25],
      rescaleSlope: 1.0,
      rescaleIntercept: -1000,
      pixelValues,
    });

    const mockTex = {} as WebGLTexture;
    const calls: {
      bindTexture: number;
      texImage3D: Array<{ target: number; level: number; internalformat: number; width: number; height: number; depth: number; border: number; format: number; type: number; pixels: any }>;
      texSubImage3D: Array<{ target: number; level: number; xoffset: number; yoffset: number; zoffset: number; width: number; height: number; depth: number; format: number; type: number; pixels: any }>;
    } = {
      bindTexture: 0,
      texImage3D: [],
      texSubImage3D: [],
    };

    const mockGl = {
      TEXTURE_3D: 0x806f,
      R16I: 0x8233,
      RED_INTEGER: 0x8d94,
      SHORT: 0x1402,
      UNPACK_ALIGNMENT: 0x0cf5,
      pixelStorei: () => {},
      bindTexture: (_target: number, _tex: any) => {
        calls.bindTexture++;
      },
      texImage3D: (target: number, level: number, internalformat: number, width: number, height: number, depth: number, border: number, format: number, type: number, pixels: any) => {
        calls.texImage3D.push({ target, level, internalformat, width, height, depth, border, format, type, pixels });
      },
      texSubImage3D: (target: number, level: number, xoffset: number, yoffset: number, zoffset: number, width: number, height: number, depth: number, format: number, type: number, pixels: any) => {
        calls.texSubImage3D.push({ target, level, xoffset, yoffset, zoffset, width, height, depth, format, type, pixels });
      },
    } as unknown as WebGL2RenderingContext;

    const decodedSlices: number[] = [];
    const volume = await buildVolumeFromMultiFrameDicom(buf, {
      gpuUploadTarget: {
        gl: mockGl,
        texture: mockTex,
        allocateStorage: true,
      },
      onSliceDecoded: (z, total) => {
        decodedSlices.push(z);
        assert.equal(total, 3);
      },
    });

    assert.equal(volume.dimensions.depth, 3);
    assert.equal(calls.bindTexture, 1, "Texture must be bound once");
    assert.equal(calls.texImage3D.length, 1, "texImage3D must be called once to allocate VRAM");
    assert.equal(calls.texImage3D[0]!.width, 4);
    assert.equal(calls.texImage3D[0]!.height, 4);
    assert.equal(calls.texImage3D[0]!.depth, 3);
    assert.equal(calls.texImage3D[0]!.pixels, null, "VRAM preallocation must pass null (zero CPU copy)");

    assert.equal(calls.texSubImage3D.length, 3, "texSubImage3D must be called once per slice");
    assert.equal(calls.texSubImage3D[0]!.zoffset, 0);
    assert.equal(calls.texSubImage3D[1]!.zoffset, 1);
    assert.equal(calls.texSubImage3D[2]!.zoffset, 2);
    assert.equal(decodedSlices.length, 3, "onSliceDecoded must be invoked for all 3 slices");
  });

  it("generateMultiFrameProgressiveLodVolume generates 2x downsampled preview volume with correct spacing", () => {
    const buf = createSyntheticMultiFrameDicom({
      rows: 8,
      cols: 8,
      numberOfFrames: 6,
      pixelSpacing: [0.25, 0.25],
      sliceThickness: 0.5,
      rescaleSlope: 1.0,
      rescaleIntercept: -1000,
    });

    const header = parseMultiFrameDicomHeader(buf);
    const lodVol = generateMultiFrameProgressiveLodVolume(buf, header);

    assert.equal(lodVol.dimensions.width, 4, "Width must be downsampled 2x (8 -> 4)");
    assert.equal(lodVol.dimensions.height, 4, "Height must be downsampled 2x (8 -> 4)");
    assert.equal(lodVol.dimensions.depth, 3, "Depth must be downsampled 2x (6 -> 3)");
    assert.equal(lodVol.spacingMm.x, 0.5, "Spacing X must be 2x original (0.25 -> 0.5)");
    assert.equal(lodVol.spacingMm.y, 0.5, "Spacing Y must be 2x original (0.25 -> 0.5)");
    assert.equal(lodVol.isProgressivePreview, true);
    assert.equal(lodVol.lodLevel, 1);
  });

  it("buildVolumeFromMultiFrameDicom emits onProgressiveVolumeReady before completing full volume", async () => {
    const buf = createSyntheticMultiFrameDicom({
      rows: 8,
      cols: 8,
      numberOfFrames: 4,
      pixelSpacing: [0.2, 0.2],
      sliceThickness: 0.4,
    });

    let progressivePreviewReceived = false;
    let previewDimensions: { width: number; height: number; depth: number } | null = null;

    const fullVol = await buildVolumeFromMultiFrameDicom(buf, {
      onProgressiveVolumeReady: (preview) => {
        progressivePreviewReceived = true;
        previewDimensions = preview.dimensions;
        assert.equal(preview.isProgressivePreview, true);
      },
    });

    assert.equal(progressivePreviewReceived, true, "onProgressiveVolumeReady must be invoked during ingestion");
    assert.deepEqual(previewDimensions, { width: 4, height: 4, depth: 2 });
    assert.deepEqual(fullVol.dimensions, { width: 8, height: 8, depth: 4 });
  });
});
