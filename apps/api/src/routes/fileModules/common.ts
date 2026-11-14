import path from "node:path";

export const UPLOADS_DIR = path.join(process.cwd(), "uploads");

export type MultipartFilePayload = {
	filename: string;
	mimetype: string;
	file: NodeJS.ReadableStream;
	fields?: Record<string, { value?: string }>;
};

declare module "fastify" {
	interface FastifyRequest {
		file?: () => Promise<MultipartFilePayload | undefined>;
	}
}
