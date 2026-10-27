import {
	SanPiNSterilizationEngine,
	computePackagingExpirationDate,
	type SterilizationPackagingType,
} from "@dental/shared";
import type { FastifyReply, FastifyRequest } from "fastify";
import { requireResolvedStaffOrAdminOrganizationId } from "../../../../accessGuard.js";
import { generateBarcodeBodySchema } from "../sterilizationSchemas.js";

export async function handleGenerateBarcode(req: FastifyRequest, reply: FastifyReply) {
	const organizationId = await requireResolvedStaffOrAdminOrganizationId(
		req,
		reply,
		"generate barcode",
	);
	if (!organizationId) return;

	const parsed = generateBarcodeBodySchema.safeParse(req.body);
	if (!parsed.success) {
		return reply.code(400).send({
			error: "ValidationError",
			message: "Некорректные параметры для генерации штрихкода.",
			details: parsed.error.format(),
		});
	}
	const data = parsed.data;

	const now = new Date();
	const expiryDate =
		computePackagingExpirationDate(
			(data.packagingType as SterilizationPackagingType) || "kraft_heat_sealed",
			now,
		) || new Date(now.getTime() + 50 * 86400000);

	const barcode = SanPiNSterilizationEngine.generateSterilizationBarcode({
		cycleId: data.cycleId,
		trayCode: data.trayCode,
		expiryDate,
	});

	return reply.send({
		success: true,
		barcode,
		packagingType: data.packagingType,
		createdAt: now.toISOString(),
		expiresAt: expiryDate.toISOString(),
	});
}
