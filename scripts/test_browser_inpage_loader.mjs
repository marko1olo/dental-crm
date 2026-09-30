import { chromium } from 'playwright';

async function run() {
  const browser = await chromium.launch({
    headless: true,
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--ignore-gpu-blocklist', '--use-gl=angle', '--enable-webgl']
  });
  const page = await browser.newPage();

  page.on('console', msg => console.log('[PAGE CONSOLE]', msg.type(), msg.text()));
  page.on('pageerror', err => console.error('[PAGE ERROR]', err.message));

  console.log('Testing in-page fetch and build...');
  await page.goto('http://127.0.0.1:5173/radiology/demo_cbct/manifest.json');

  const res = await page.evaluate(async () => {
    const t0 = performance.now();
    const manifestRes = await fetch('/radiology/demo_cbct/manifest.json');
    const manifest = await manifestRes.json();
    console.log(`Manifest loaded: ${manifest.slices.length} slices`);

    // Fetch array buffers in chunks of 32
    const buffers = [];
    const chunkSize = 32;
    for (let c = 0; c < manifest.slices.length; c += chunkSize) {
      const chunk = manifest.slices.slice(c, c + chunkSize);
      const chunkRes = await Promise.all(chunk.map(async (name) => {
        const r = await fetch(`/radiology/demo_cbct/${name}`);
        const ab = await r.arrayBuffer();
        return { name, buffer: ab };
      }));
      buffers.push(...chunkRes);
    }
    console.log(`Loaded ${buffers.length} buffers in ${(performance.now() - t0).toFixed(0)} ms`);

    const tParse = performance.now();
    // Parse headers
    function parseHeader(buf) {
      const view = new DataView(buf);
      const len = buf.byteLength;
      let rows = 600, cols = 600, pixelSpacing = 0.25, sliceLocationZ = 0, instanceNumber = 1;
      let pixelDataOffset = -1, pixelDataLength = 0;

      for (let i = 128; i < Math.min(len - 8, 131072); i += 2) {
        if (pixelDataOffset > 0 && i >= pixelDataOffset - 4) break;
        const g = view.getUint16(i, true);
        const e = view.getUint16(i + 2, true);
        if (g === 0) continue;

        const c0 = view.getUint8(i + 4);
        const c1 = view.getUint8(i + 5);
        const isExp = c0 >= 65 && c0 <= 90 && c1 >= 65 && c1 <= 90;
        const vr = isExp ? String.fromCharCode(c0, c1) : "";

        let tagLen = 0, tagValOff = 0;
        if (isExp) {
          if (["OB", "OW", "OF", "OD", "OL", "OV", "SV", "UV", "SQ", "UC", "UR", "UT", "UN"].includes(vr)) {
            tagLen = view.getUint32(i + 8, true);
            tagValOff = i + 12;
          } else {
            tagLen = view.getUint16(i + 6, true);
            tagValOff = i + 8;
          }
        } else {
          tagLen = view.getUint32(i + 4, true);
          tagValOff = i + 8;
        }

        if (tagLen < 0 || tagValOff + tagLen > len) continue;

        if (g === 0x0028 && e === 0x0010) rows = view.getUint16(tagValOff, true);
        else if (g === 0x0028 && e === 0x0011) cols = view.getUint16(tagValOff, true);
        else if (g === 0x0020 && e === 0x0013) {
          try {
            const s = new TextDecoder('ascii').decode(new Uint8Array(buf, tagValOff, tagLen)).trim();
            const n = parseInt(s, 10);
            if (!isNaN(n)) instanceNumber = n;
          } catch {}
        } else if (g === 0x0020 && e === 0x0032) {
          try {
            const s = new TextDecoder('ascii').decode(new Uint8Array(buf, tagValOff, tagLen)).trim();
            const pts = s.split('\\').map(p => parseFloat(p.trim()));
            if (pts.length >= 3 && !isNaN(pts[2])) sliceLocationZ = pts[2];
          } catch {}
        } else if (g === 0x7fe0 && e === 0x0010) {
          pixelDataOffset = tagValOff;
          pixelDataLength = tagLen;
          break;
        }
      }

      if (pixelDataOffset === -1) {
        pixelDataOffset = len - rows * cols * 2;
        pixelDataLength = rows * cols * 2;
      }

      return { rows, cols, sliceLocationZ, instanceNumber, pixelDataOffset, pixelDataLength };
    }

    const validEntries = [];
    for (const b of buffers) {
      const h = parseHeader(b.buffer);
      if (h.rows === 600 && h.cols === 600) {
        validEntries.push({ header: h, buffer: b.buffer, name: b.name });
      }
    }

    // Sort by Z
    validEntries.sort((a, b) => a.header.sliceLocationZ - b.header.sliceLocationZ);
    console.log(`Parsed & sorted ${validEntries.length} valid 600x600 slices in ${(performance.now() - tParse).toFixed(0)} ms`);

    const tAlloc = performance.now();
    const width = 600, height = 600, depth = validEntries.length;
    const sliceCount = width * height;
    const voxelData = new Int16Array(width * height * depth);

    for (let z = 0; z < depth; z++) {
      const entry = validEntries[z];
      const raw = new Uint16Array(entry.buffer, entry.header.pixelDataOffset, sliceCount);
      const base = z * sliceCount;
      for (let i = 0; i < sliceCount; i++) {
        voxelData[base + i] = raw[i] - 1000;
      }
    }
    console.log(`Voxel buffer built in ${(performance.now() - tAlloc).toFixed(0)} ms. Total voxels: ${voxelData.length}`);

    return {
      slices: validEntries.length,
      width, height, depth,
      totalTimeMs: performance.now() - t0
    };
  });

  console.log('Result:', res);
  await browser.close();
}

run().catch(e => console.error(e));
