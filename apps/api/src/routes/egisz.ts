import type { FastifyInstance } from "fastify";

export default async function registerEgiszRoutes(app: FastifyInstance) {
	app.get("/api/clinical/egisz-status-stub", async () => ({ ok: true }));
}
