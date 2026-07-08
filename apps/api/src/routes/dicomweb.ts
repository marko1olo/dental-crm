import type { FastifyInstance } from "fastify";
import path from "node:path";
import fs from "node:fs/promises";
import { db } from "../db/client.js";
import { imagingInstances } from "../db/schema.js";
import { eq } from "drizzle-orm";

export async function registerDicomwebRoutes(app: FastifyInstance) {
  // Simple WADO-URI mock for local development and demonstration
  app.get("/api/dicomweb/studies/:studyUid/series/:seriesUid/instances/:instanceUid", async (request, reply) => {
    const { instanceUid } = request.params as any;
    
    // In a real application, we would find the instance in DB
    // const instance = await db.query.imagingInstances.findFirst({
    //   where: eq(imagingInstances.dicomSopInstanceUid, instanceUid)
    // });
    
    // For local MVP / Development, we'll try to serve a test DICOM file
    const fallbackPath = path.resolve(process.cwd(), "../../.data/dicom/test.dcm");
    
    try {
       const buffer = await fs.readFile(fallbackPath);
       reply.header("Content-Type", "application/dicom");
       reply.header("Content-Length", buffer.length);
       // Removed explicit wildcard CORS header. Rely on Fastify CORS plugin configuration instead.
       return reply.send(buffer);
    } catch (e) {
       app.log.error(`DICOM file not found at ${fallbackPath}`);
       reply.status(404).send({ error: "DICOM file not found. Ensure .data/dicom/test.dcm exists for MVP." });
    }
  });
}
