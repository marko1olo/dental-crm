declare module "fastify" {
	interface FastifyRequest {
		user?: { id: string; role?: string; organizationId?: string; [key: string]: unknown };
	}
}

export * from "./types/diaryMessages.js";
export * from "./types/diaryAuth.js";
export * from "./types/diarySchemas.js";
