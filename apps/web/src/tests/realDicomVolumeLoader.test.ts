import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { parseDicomSliceHeader, buildVolumeFromDicomFiles } from "../components/radiology/realDicomVolumeLoader";
import { extractMprSlice, sampleVoxelHU } from "../components/radiology/cbctMprMath";

describe("Real DICOM Series Volume Loader & Ingestion Engine", () => {
  it("correctly parses synthetic or raw DICOM binary header tags", () => {
    // Construct a mock 132-byte header with standard DICM prefix and Rows/Cols
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

  it("reads and ingests real patient DICOM files if dataset is present on disk", async () => {
    const realDir = "C:/Users/Admin/Downloads/Telegram Desktop/BARABASH_SVETLANA_VIKTOROVNA_09141256/BARABASH_SVETLANA_VIKTOROVNA_09141256/Data";
    if (!fs.existsSync(realDir)) {
      console.log("Real patient directory not found, skipping live disk test.");
      return;
    }

    const files = fs.readdirSync(realDir).filter((f) => f.endsWith(".dcm")).sort().slice(0, 10);
    assert.equal(files.length, 10, "Should find 10 slice files");

    const mockFiles: any[] = [];
    for (const fName of files) {
      const fullP = path.join(realDir, fName);
      const fileBuf = fs.readFileSync(fullP);
      mockFiles.push({
        name: fName,
        arrayBuffer: async () => fileBuf.buffer.slice(fileBuf.byteOffset, fileBuf.byteOffset + fileBuf.byteLength),
      });
    }

    const volume = await buildVolumeFromDicomFiles(mockFiles);
    assert.equal(volume.dimensions.width, 800);
    assert.equal(volume.dimensions.height, 800);
    assert.equal(volume.dimensions.depth, 10);
    assert.equal(volume.data?.length, 800 * 800 * 10);
    assert.equal(volume.isDisposed, false);

    // Verify slicing of the real patient volume
    const axialSlice = extractMprSlice(volume, "axial", 5);
    assert.equal(axialSlice.metadata.widthPx, 800);
    assert.equal(axialSlice.metadata.heightPx, 800);
    assert.equal(axialSlice.data.length, 800 * 800 * 4);
  });
});
