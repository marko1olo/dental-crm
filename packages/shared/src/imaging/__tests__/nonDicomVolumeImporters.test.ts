/**
 * packages/shared/src/imaging/__tests__/nonDicomVolumeImporters.test.ts
 * Comprehensive unit tests for Sirona Galileos and Morita OneVolume
 * Native Non-DICOM Volume Importers.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import * as zlib from "node:zlib";
import {
  detectVolumeFormat,
  matchGalileos,
  matchOneVolume,
  parseGalileos,
  parseGalileosHeader,
  parseNonDicomVolume,
  parseOneVolume,
  parseOneVolumeHeader,
  safeGunzip,
  VOLUME_IMPORT_LIMITS,
} from "../volumeImporters/index.js";

/** Helper to create gzip compressed Uint8Array */
function gzipBytes(data: Uint8Array): Uint8Array {
  const compressed = zlib.gzipSync(data);
  return new Uint8Array(compressed);
}

/** Helper to generate a 2-byte little-endian uint16 array buffer */
function uint16Buffer(values: number[]): Uint8Array {
  const buf = new Uint8Array(values.length * 2);
  const dv = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
  for (let i = 0; i < values.length; i++) {
    const v = values[i];
    if (v !== undefined) {
      dv.setUint16(i * 2, v, true);
    }
  }
  return buf;
}

/** Helper to generate a 2-byte little-endian int16 array buffer */
function int16Buffer(values: number[]): Uint8Array {
  const buf = new Uint8Array(values.length * 2);
  const dv = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
  for (let i = 0; i < values.length; i++) {
    const v = values[i];
    if (v !== undefined) {
      dv.setInt16(i * 2, v, true);
    }
  }
  return buf;
}

describe("Sirona Galileos Volume Importer", () => {
  it("detects Galileos folder structure via matchGalileos", () => {
    const validFiles = [
      { name: "scan_01_vol_0" },
      { name: "scan_01_vol_0_000" },
      { name: "scan_01_vol_0_001" },
    ];
    assert.strictEqual(matchGalileos(validFiles), true);
    assert.strictEqual(detectVolumeFormat(validFiles), "galileos");

    assert.strictEqual(matchGalileos([{ name: "scan_01_vol_0" }]), false);
    assert.strictEqual(matchGalileos([{ name: "scan_01_vol_0_000" }]), false);
    assert.strictEqual(matchGalileos([{ name: "other.dcm" }]), false);
  });

  it("parses XML header and sets geometry fallbacks with warnings", () => {
    const xml = `
      <volume>
        <sizex>16</sizex>
        <sizey>12</sizey>
        <voxelsize>0.25</voxelsize>
        <maxvalue>4095</maxvalue>
        <patient_name>Ivanov^Ivan</patient_name>
        <patient_id>PT-12345</patient_id>
      </volume>
    `;
    const meta = parseGalileosHeader(xml, 2);
    assert.strictEqual(meta.cols, 16);
    assert.strictEqual(meta.rows, 12);
    assert.strictEqual(meta.depth, 2);
    assert.strictEqual(meta.spacing, 0.25);
    assert.strictEqual(meta.maxValue, 4095);
    assert.strictEqual(meta.patientName, "Ivanov^Ivan");
    assert.strictEqual(meta.patientId, "PT-12345");
    assert.strictEqual(meta.warnings.length, 0);

    // Fallback when fields are missing
    const emptyXml = "<vol></vol>";
    const metaFallback = parseGalileosHeader(emptyXml, 10);
    assert.strictEqual(metaFallback.cols, 512);
    assert.strictEqual(metaFallback.rows, 512);
    assert.strictEqual(metaFallback.spacing, 0.16);
    assert.strictEqual(metaFallback.maxValue, 4095);
    assert.ok(metaFallback.warnings.length >= 3);
  });

  it("decompresses gzip and parses full Galileos volume dataset", async () => {
    const cols = 4;
    const rows = 3;
    const sliceLen = cols * rows; // 12 samples

    const xml = `<vol><sizex>${cols}</sizex><sizey>${rows}</sizey><spacing>0.20</spacing><max>2000</max></vol>`;
    const xmlGzip = gzipBytes(new TextEncoder().encode(xml));

    const slice0Raw = uint16Buffer([100, 150, 200, 250, 300, 350, 400, 450, 500, 550, 600, 650]);
    const slice1Raw = uint16Buffer([700, 750, 800, 850, 900, 950, 1000, 1050, 1100, 1150, 1200, 1250]);

    const files = [
      { name: "test_vol_0", buffer: xmlGzip },
      { name: "test_vol_0_000", buffer: gzipBytes(slice0Raw) },
      { name: "test_vol_0_001", buffer: gzipBytes(slice1Raw) },
    ];

    const volume = await parseGalileos(files);
    assert.strictEqual(volume.format, "galileos");
    assert.deepStrictEqual(volume.dimensions, [4, 3, 2]);
    assert.deepStrictEqual(volume.spacing, [0.2, 0.2, 0.2]);
    assert.strictEqual(volume.data.length, 24);
    assert.strictEqual(volume.data[0], 100);
    assert.strictEqual(volume.data[11], 650);
    assert.strictEqual(volume.data[12], 700);
    assert.strictEqual(volume.data[23], 1250);
    assert.strictEqual(volume.minValue, 100);
    assert.strictEqual(volume.maxValue, 1250);
    assert.strictEqual(volume.modality, "CT");
  });

  it("rejects truncated or malformed Galileos slice files", async () => {
    const xml = "<vol><sizex>16</sizex><sizey>16</sizey></vol>"; // expects 16*16*2 = 512 bytes
    const xmlGzip = gzipBytes(new TextEncoder().encode(xml));
    const truncatedSlice = gzipBytes(new Uint8Array(64));

    const files = [
      { name: "test_vol_0", buffer: xmlGzip },
      { name: "test_vol_0_000", buffer: truncatedSlice },
    ];

    await assert.rejects(
      async () => parseGalileos(files),
      /too short/
    );
  });
});

describe("Morita OneVolume (CT_0.vol) Importer", () => {
  it("detects Morita OneVolume via matchOneVolume", () => {
    assert.strictEqual(matchOneVolume([{ name: "CT_0.vol" }]), true);
    assert.strictEqual(matchOneVolume([{ name: "CT_0.VOL" }]), true);
    assert.strictEqual(matchOneVolume([{ name: "study/series/CT_0.vol" }]), true);
    assert.strictEqual(matchOneVolume([{ name: "image.dcm" }]), false);
    assert.strictEqual(detectVolumeFormat([{ name: "CT_0.vol" }]), "onevolume");
  });

  it("parses Morita OneVolume XML header", () => {
    const xml = `
      <OneVolume>
        <sizex>8</sizex>
        <sizey>6</sizey>
        <sizez>4</sizez>
        <gridspacing>0.125</gridspacing>
        <slope>1.0</slope>
        <intercept>-1024</intercept>
        <patientName>Petrov^Petr</patientName>
      </OneVolume>
    `;
    const meta = parseOneVolumeHeader(xml);
    assert.strictEqual(meta.cols, 8);
    assert.strictEqual(meta.rows, 6);
    assert.strictEqual(meta.depth, 4);
    assert.strictEqual(meta.spacing, 0.125);
    assert.strictEqual(meta.slope, 1.0);
    assert.strictEqual(meta.intercept, -1024);
    assert.strictEqual(meta.patientName, "Petrov^Petr");
  });

  it("parses full Morita CT_0.vol binary container with sentinel mapping", async () => {
    const cols = 2;
    const rows = 2;
    const depth = 2;
    const totalVoxels = cols * rows * depth; // 8 voxels

    const xml = `<vol><sizex>${cols}</sizex><sizey>${rows}</sizey><sizez>${depth}</sizez><spacing>0.15</spacing><slope>1</slope><intercept>0</intercept></vol>`;
    const xmlBytes = new TextEncoder().encode(xml);

    // Build binary container:
    // 4-byte prefix + "JmVolumeVersion=1" + optional null (1 byte) + 4-byte uint32 xmlLen + xmlBytes + 36-byte CArray3D + int16 payload
    const marker = "JmVolumeVersion=1";
    const markerBytes = new TextEncoder().encode(marker);
    const boundsSize = 36;

    // Voxel data: include normal voxels and sentinel -32768
    const rawVoxelValues = [
      -32768, 150, 300, 450, // slice 0: includes sentinel
      600, -32768, 900, 1200, // slice 1: includes sentinel
    ];
    const payloadBytes = int16Buffer(rawVoxelValues);

    const totalLen =
      4 +
      markerBytes.length +
      1 + // null byte
      4 + // xmlLen
      xmlBytes.length +
      boundsSize +
      payloadBytes.length;

    const container = new Uint8Array(totalLen);
    const dv = new DataView(container.buffer);

    let offset = 0;
    // 4-byte prefix
    container.set([0x00, 0x01, 0x02, 0x03], offset);
    offset += 4;

    // JmVolumeVersion=1
    container.set(markerBytes, offset);
    offset += markerBytes.length;

    // null byte
    container[offset] = 0;
    offset += 1;

    // 4-byte little endian xml length
    dv.setUint32(offset, xmlBytes.length, true);
    offset += 4;

    // XML bytes
    container.set(xmlBytes, offset);
    offset += xmlBytes.length;

    // 36-byte CArray3D dummy bounds
    offset += boundsSize;

    // Payload bytes
    container.set(payloadBytes, offset);

    const volume = await parseOneVolume({ name: "CT_0.vol", buffer: container });

    assert.strictEqual(volume.format, "onevolume");
    assert.deepStrictEqual(volume.dimensions, [2, 2, 2]);
    assert.deepStrictEqual(volume.spacing, [0.15, 0.15, 0.15]);
    assert.strictEqual(volume.data.length, 8);

    // Verify background sentinel -32768 was mapped to -1000 HU
    assert.strictEqual(volume.data[0], VOLUME_IMPORT_LIMITS.BACKGROUND_SENTINEL_HU);
    assert.strictEqual(volume.data[1], 150);
    assert.strictEqual(volume.data[5], VOLUME_IMPORT_LIMITS.BACKGROUND_SENTINEL_HU);
    assert.strictEqual(volume.data[7], 1200);

    assert.strictEqual(volume.minValue, 150);
    assert.strictEqual(volume.maxValue, 1200);
    assert.strictEqual(volume.seriesDescription, "OneVolume CT");
  });

  it("throws clear error when JmVolumeVersion marker is missing", async () => {
    const corrupted = new Uint8Array([0x00, 0x01, 0x02, 0x03, 0x04, 0x05]);
    await assert.rejects(
      async () => parseOneVolume({ name: "CT_0.vol", buffer: corrupted }),
      /version marker 'JmVolumeVersion=1' not found/
    );
  });
});

describe("Unified Non-DICOM Importer Engine", () => {
  it("routes automatically via parseNonDicomVolume", async () => {
    const cols = 2;
    const rows = 2;
    const xml = `<vol><sizex>${cols}</sizex><sizey>${rows}</sizey></vol>`;
    const files = [
      { name: "scan_vol_0", buffer: gzipBytes(new TextEncoder().encode(xml)) },
      { name: "scan_vol_0_000", buffer: gzipBytes(uint16Buffer([10, 20, 30, 40])) },
    ];

    const vol = await parseNonDicomVolume(files);
    assert.strictEqual(vol.format, "galileos");
    assert.deepStrictEqual(vol.dimensions, [2, 2, 1]);
  });

  it("throws on unknown format", async () => {
    await assert.rejects(
      async () => parseNonDicomVolume([{ name: "unknown.bin", buffer: new Uint8Array(10) }]),
      /Unrecognized volume format/
    );
  });

  it("enforces safe gunzip decompression budget", async () => {
    const hugePlain = new Uint8Array(2048);
    const compressed = gzipBytes(hugePlain);
    await assert.rejects(
      async () => safeGunzip(compressed, 1024), // budget only 1024
      /budget/
    );
  });
});
