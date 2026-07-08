import { test } from "node:test";
import assert from "node:assert";
import Fastify from "fastify";
import cors from "@fastify/cors";
import { registerDicomwebRoutes } from "./dicomweb.js";
import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";

test("DICOM route does not return wildcard CORS", async (t) => {
  const app = Fastify();
  await app.register(cors, { origin: "http://example.com" });
  await registerDicomwebRoutes(app);

  // Setup a dummy dicom file so it doesn't return 404
  const testDir = path.join(os.tmpdir(), ".data", "dicom");
  await fs.mkdir(testDir, { recursive: true });
  await fs.writeFile(path.join(testDir, "test.dcm"), "dummy dicom content");

  // mock process.cwd for fallbackPath inside dicomweb.js
  const originalCwd = process.cwd;
  process.cwd = () => path.join(os.tmpdir(), "mock", "cwd");

  // Actually wait, dicomweb.js does:
  // const fallbackPath = path.resolve(process.cwd(), "../../.data/dicom/test.dcm");
  // so if cwd is /app/apps/api, it goes to /app/.data/dicom/test.dcm
  process.cwd = originalCwd; // Reset, let's just make sure the directory relative to cwd exists

  const actualTestDir = path.resolve(process.cwd(), "../../.data/dicom");
  try {
     await fs.mkdir(actualTestDir, { recursive: true });
     await fs.writeFile(path.join(actualTestDir, "test.dcm"), "dummy dicom content");
  } catch(e) {
     // Ignore permissions, it will return 404 but we can still check CORS
  }

  const response = await app.inject({
    method: "GET",
    url: "/api/dicomweb/studies/1/series/1/instances/1",
    headers: {
      origin: "http://example.com"
    }
  });

  // Since it might 404 if the file is missing, we still expect the CORS header to be correct
  assert.strictEqual(response.headers["access-control-allow-origin"], "http://example.com");
  assert.notStrictEqual(response.headers["access-control-allow-origin"], "*");
});
