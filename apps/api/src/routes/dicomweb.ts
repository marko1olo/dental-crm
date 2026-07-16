import fs from "node:fs/promises";
import path from "node:path";
import { eq } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import { db } from "../db/client.js";
import { imagingInstances } from "../db/schema.js";

export async function registerDicomwebRoutes(app: FastifyInstance) {
	// Simple WADO-URI mock for local development and demonstration
	app.get(
		"/api/dicomweb/studies/:studyUid/series/:seriesUid/instances/:instanceUid",
		async (request, reply) => {
			const { instanceUid } = request.params as any;

			try {
				const instance = await db.query.imagingInstances.findFirst({
					where: eq(imagingInstances.dicomSopInstanceUid, instanceUid),
				});

				let targetPath: string;

				if (instance && instance.storagePath) {
					targetPath = path.resolve(process.cwd(), instance.storagePath);
				} else {
					// Fallback for development if the instance is not in the database
					targetPath = path.resolve(process.cwd(), "../../.data/dicom/test.dcm");
				}

				const buffer = await fs.readFile(targetPath);
				reply.header("Content-Type", "application/dicom");
				reply.header("Content-Length", buffer.length);
				// Browsers may need CORS for cornerstone loader
				reply.header("Access-Control-Allow-Origin", "*");
				return reply.send(buffer);
			} catch (e) {
				app.log.error(`DICOM file not found for instance ${instanceUid}: ${e}`);
				reply.status(404).send({
					error: "DICOM file not found.",
				});
			}
		},
	);
}
