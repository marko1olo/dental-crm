import { createReadStream } from "node:fs";
import fs from "node:fs/promises";
import path from "node:path";
export async function registerDicomwebRoutes(app) {
    // Simple WADO-URI mock for local development and demonstration
    app.get("/api/dicomweb/studies/:studyUid/series/:seriesUid/instances/:instanceUid", async (request, reply) => {
        const { instanceUid } = request.params;
        const fallbackPath = path.resolve(process.cwd(), "../../.data/dicom/test.dcm");
        try {
            const stat = await fs.stat(fallbackPath);
            reply.header("Content-Type", "application/dicom");
            reply.header("Content-Length", stat.size);
            reply.header("Access-Control-Allow-Origin", "*");
            return reply.send(createReadStream(fallbackPath));
        }
        catch (e) {
            app.log.error(`DICOM file not found for instance ${instanceUid} at ${fallbackPath}`);
            return reply.status(404).send({ error: "DICOM file not found. Ensure .data/dicom/test.dcm exists for MVP." });
        }
    });
}
