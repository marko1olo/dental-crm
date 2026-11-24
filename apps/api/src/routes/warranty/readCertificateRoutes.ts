import { createHash } from "node:crypto";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { and, desc, eq, or, sql } from "drizzle-orm";
import { db } from "../../db/client.js";
import {
	clinics,
	labItems,
	labOrders,
	organizations,
	patientImplantInstallations,
	warrantyCertificates,
} from "../../db/schema.js";
import { requireClinicalReadContext } from "../../accessGuard.js";
import { isValidUuid, LAB_WORK_TYPE_LABELS_RU } from "@dental/shared";

async function resolvePublicCertificate(certNum: string) {
	// 1. Поиск в реестре оформленных гарантийных сертификатов
	let [cert] = await db
		.select()
		.from(warrantyCertificates)
		.where(eq(warrantyCertificates.certificateNumber, certNum))
		.limit(1);

	// 2. Сквозной фоллбек по паспортам имплантатов (patientImplantInstallations)
	if (!cert) {
		const isUuid = isValidUuid(certNum);
		const [inst] = await db
			.select()
			.from(patientImplantInstallations)
			.where(
				or(
					isUuid ? eq(patientImplantInstallations.id, certNum) : sql`false`,
					sql`('IMP-PASSPORT-' || ${patientImplantInstallations.toothNumberFdi} || '-' || upper(substring(${patientImplantInstallations.id}::text, 1, 8))) = ${certNum}`,
					eq(patientImplantInstallations.serialNumber, certNum),
					eq(patientImplantInstallations.lotNumber, certNum),
				),
			)
			.limit(1);

		if (inst) {
			const canonicalPassportId = `IMP-PASSPORT-${inst.toothNumberFdi}-${inst.id.slice(0, 8).toUpperCase()}`;
			const expDate = new Date(inst.installedAt.getTime());
			expDate.setFullYear(expDate.getFullYear() + 10);
			const recallDate = new Date(inst.installedAt.getTime() + 180 * 24 * 60 * 60 * 1000);
			const integritySha256 = createHash("sha256")
				.update(
					JSON.stringify({
						orgId: inst.organizationId,
						patientId: inst.patientId,
						canonicalPassportId,
						brand: inst.implantBrand,
						lot: inst.lotNumber,
						sn: inst.serialNumber,
						installedAt: inst.installedAt,
					}),
				)
				.digest("hex");

			const implantItemsPayload = [
				{
					toothNumber: String(inst.toothNumberFdi),
					clinicalWorkTitle: `Дентальный имплантат ${inst.implantBrand} Ø${inst.implantDiameterMm}×${inst.implantLengthMm} мм`,
					materialName: "Медицинский титан Grade 4 / Roxolid",
					manufacturer: inst.implantBrand,
					vitaShade: "—",
					lotNumber: inst.lotNumber || "б/н",
					serviceCode804n: "A16.07.054",
				},
			];

			const [registered] = await db
				.insert(warrantyCertificates)
				.values({
					organizationId: inst.organizationId,
					patientId: inst.patientId,
					visitId: inst.visitId || null,
					certificateNumber: canonicalPassportId,
					status: "active",
					itemsJson: implantItemsPayload,
					warrantyMonths: 120,
					serviceLifeMonths: 240,
					issuedAt: inst.installedAt,
					expiresAt: expDate,
					nextRecallDate: recallDate,
					integritySha256,
					notes: `Гарантийный паспорт имплантата ${canonicalPassportId} (${inst.implantBrand} #${inst.toothNumberFdi}).`,
					createdAt: new Date(),
					updatedAt: new Date(),
				})
				.onConflictDoUpdate({
					target: warrantyCertificates.certificateNumber,
					set: {
						status: "active",
						itemsJson: implantItemsPayload,
						warrantyMonths: 120,
						serviceLifeMonths: 240,
						expiresAt: expDate,
						nextRecallDate: recallDate,
						integritySha256,
						updatedAt: new Date(),
					},
				})
				.returning();

			cert = registered ?? undefined;
		}
	}

	// 3. Сквозной фоллбек по ортопедическим нарядам ЗТЛ (labOrders)
	if (!cert) {
		const isUuid = isValidUuid(certNum);
		const [order] = await db
			.select()
			.from(labOrders)
			.where(
				or(
					isUuid ? eq(labOrders.id, certNum) : sql`false`,
					eq(labOrders.orderNumber, certNum),
					sql`('WP-' || upper(substring(replace(${labOrders.organizationId}::text, '-', ''), 1, 6)) || '-' || ${labOrders.orderNumber}) = ${certNum}`,
				),
			)
			.limit(1);

		if (order && order.patientId) {
			const items = await db
				.select()
				.from(labItems)
				.where(and(eq(labItems.labOrderId, order.id), eq(labItems.organizationId, order.organizationId)));

			const baseDate = order.completedAt ?? order.createdAt;
			const baseYear = baseDate ? new Date(baseDate).getFullYear() : new Date().getFullYear();
			const formattedOrderNum = order.orderNumber && (order.orderNumber.startsWith("ЛАБ-") || order.orderNumber.startsWith("ЗТЛ-") || order.orderNumber.startsWith("ЛО-"))
				? order.orderNumber
				: (order.orderNumber ? `ЛО-${baseYear}-${order.orderNumber}` : `ЗТЛ-${baseYear}-${order.id.slice(0, 6).toUpperCase()}`);
			const orgShortHash = order.organizationId.replace(/-/g, "").slice(0, 6).toUpperCase();
			const certificateNumber = certNum.startsWith("WP-") ? certNum : `WP-${orgShortHash}-${formattedOrderNum}`;
			const batchCode = `LOT-${baseYear}-${order.id.slice(0, 8).toUpperCase()}`;

			const restorationType = items[0]?.restorationType
				? (LAB_WORK_TYPE_LABELS_RU[items[0].restorationType as keyof typeof LAB_WORK_TYPE_LABELS_RU] || items[0].restorationType)
				: "Анатомическая коронка / мостовидный протез";
			const frameworkMaterial = order.material || "Конструкционный стоматологический материал";
			const shade = order.colorVita || "По прейскуранту";

			const itemsPayload = items.length > 0
				? items.map((it) => {
						const toothVal = it.toothFdi ? String(it.toothFdi) : (order.toothFdi || "—");
						const matVal = it.material || frameworkMaterial;
						const shadeVal = it.shadeFinal || shade;
						const workType = it.restorationType
							? (LAB_WORK_TYPE_LABELS_RU[it.restorationType as keyof typeof LAB_WORK_TYPE_LABELS_RU] || it.restorationType)
							: restorationType;
						return {
							toothNumber: toothVal,
							clinicalWorkTitle: workType,
							materialName: matVal,
							manufacturer: order.laboratoryName || "Цифровая зуботехническая лаборатория CAD/CAM",
							vitaShade: shadeVal,
							lotNumber: batchCode,
							labOrderNumber: formattedOrderNum,
						};
					})
				: [
						{
							toothNumber: order.toothFdi || "—",
							clinicalWorkTitle: restorationType,
							materialName: frameworkMaterial,
							manufacturer: order.laboratoryName || "Цифровая зуботехническая лаборатория CAD/CAM",
							vitaShade: shade,
							lotNumber: batchCode,
							labOrderNumber: formattedOrderNum,
						},
					];

			const now = new Date();
			const expDate = new Date(now.getTime());
			expDate.setFullYear(expDate.getFullYear() + 2);
			const recallDate = new Date(now.getTime() + 180 * 24 * 60 * 60 * 1000);

			const integritySha256 = createHash("sha256")
				.update(
					JSON.stringify({
						orgId: order.organizationId,
						patientId: order.patientId,
						certificateNumber,
						items: itemsPayload,
						batchCode,
					}),
				)
				.digest("hex");

			const [registered] = await db
				.insert(warrantyCertificates)
				.values({
					organizationId: order.organizationId,
					patientId: order.patientId,
					visitId: order.appointmentId || null,
					certificateNumber,
					status: "active",
					itemsJson: itemsPayload,
					warrantyMonths: 24,
					serviceLifeMonths: 60,
					issuedAt: order.installedAt || order.completedAt || now,
					expiresAt: expDate,
					nextRecallDate: recallDate,
					integritySha256,
					notes: `Гарантийный паспорт ортопедической конструкции ${certificateNumber}. Наряд ЗТЛ: ${formattedOrderNum}.`,
					createdAt: now,
					updatedAt: now,
				})
				.onConflictDoUpdate({
					target: warrantyCertificates.certificateNumber,
					set: {
						status: "active",
						itemsJson: itemsPayload,
						warrantyMonths: 24,
						serviceLifeMonths: 60,
						expiresAt: expDate,
						nextRecallDate: recallDate,
						integritySha256,
						updatedAt: now,
					},
				})
				.returning();

			cert = registered ?? undefined;
		}
	}

	return cert ?? null;
}

export function registerReadCertificateRoutes(app: FastifyInstance) {
	const handleGetPatientCertificates = async (
		request: FastifyRequest<{ Params: { patientId: string } }>,
		reply: FastifyReply,
	) => {
		const context = await requireClinicalReadContext(
			request,
			reply,
			"warranty certificates read",
		);
		if (!context) return;

		const patientId = (request.params as { patientId?: string }).patientId?.trim();
		if (!patientId || !isValidUuid(patientId)) {
			return reply.code(400).send({
				error: "ValidationError",
				message: "Идентификатор пациента должен быть валидным UUID",
			});
		}

		const list = await db
			.select()
			.from(warrantyCertificates)
			.where(
				and(
					eq(warrantyCertificates.organizationId, context.organizationId),
					eq(warrantyCertificates.patientId, patientId),
				),
			)
			.orderBy(desc(warrantyCertificates.issuedAt));

		return reply.send({
			success: true,
			certificates: list,
		});
	};

	app.get<{ Params: { patientId: string } }>(
		"/api/warranty/certificates/:patientId",
		handleGetPatientCertificates,
	);

	app.get<{ Params: { patientId: string } }>(
		"/api/warranty/patient/:patientId",
		handleGetPatientCertificates,
	);

	app.get<{ Querystring: { certNumber?: string; cert?: string } }>(
		"/api/public/warranty/check",
		async (request, reply) => {
			const certNum = (request.query?.certNumber || request.query?.cert || "")?.trim();
			if (!certNum) {
				return reply.code(400).send({
					error: "MissingCertificateNumber",
					message: "Укажите номер гарантийного сертификата",
				});
			}

			const cert = await resolvePublicCertificate(certNum);

			if (!cert) {
				return reply.code(404).send({
					error: "CertificateNotFound",
					message: `Гарантийный паспорт ${certNum} не найден в реестре клиники.`,
				});
			}

			const [[clinicOrg], [clinicRow]] = await Promise.all([
				db
					.select({
						name: organizations.name,
						legalAddress: organizations.legalAddress,
						medicalLicenseNumber: organizations.medicalLicenseNumber,
						email: organizations.email,
						website: organizations.website,
					})
					.from(organizations)
					.where(eq(organizations.id, cert.organizationId))
					.limit(1),
				db
					.select({
						phone: clinics.phone,
					})
					.from(clinics)
					.where(eq(clinics.organizationId, cert.organizationId))
					.limit(1),
			]);

			return reply.code(200).send({
				success: true,
				certificate: {
					certificateNumber: cert.certificateNumber,
					status: cert.status,
					clinicName: clinicOrg?.name || "Стоматологическая клиника ДЕНТЕ",
					clinicLegalName: clinicOrg?.name || "ООО «Стоматологическая клиника ДЕНТЕ»",
					clinicPhone: clinicRow?.phone || "",
					clinicAddress: clinicOrg?.legalAddress || "",
					clinicWebsite: clinicOrg?.website || "",
					clinicLicenseNumber: clinicOrg?.medicalLicenseNumber || "",
					warrantyMonths: cert.warrantyMonths,
					serviceLifeMonths: cert.serviceLifeMonths,
					issuedAt: cert.issuedAt,
					expiresAt: cert.expiresAt,
					nextRecallDate: cert.nextRecallDate,
					items: cert.itemsJson,
					integritySha256: cert.integritySha256,
					notes: cert.notes,
				},
			});
		},
	);

	app.get<{ Params: { certificateNumber: string } }>(
		"/api/public/warranty/:certificateNumber",
		async (request, reply) => {
			const certNum = request.params.certificateNumber?.trim();
			if (!certNum) {
				return reply.code(400).send({
					error: "MissingCertificateNumber",
					message: "Укажите номер гарантийного сертификата",
				});
			}

			const cert = await resolvePublicCertificate(certNum);

			if (!cert) {
				return reply.code(404).send({
					error: "CertificateNotFound",
					message: `Гарантийный паспорт ${certNum} не найден в реестре клиники. Проверьте правильность введенного номера или отсканируйте актуальный QR-код.`,
				});
			}

			const [[clinicOrg], [clinicRow]] = await Promise.all([
				db
					.select({
						name: organizations.name,
						legalAddress: organizations.legalAddress,
						medicalLicenseNumber: organizations.medicalLicenseNumber,
						email: organizations.email,
						website: organizations.website,
					})
					.from(organizations)
					.where(eq(organizations.id, cert.organizationId))
					.limit(1),
				db
					.select({
						phone: clinics.phone,
					})
					.from(clinics)
					.where(eq(clinics.organizationId, cert.organizationId))
					.limit(1),
			]);

			return reply.code(200).send({
				success: true,
				certificate: {
					certificateNumber: cert.certificateNumber,
					status: cert.status,
					clinicName: clinicOrg?.name || "Стоматологическая клиника ДЕНТЕ",
					clinicLegalName: clinicOrg?.name || "ООО «Стоматологическая клиника ДЕНТЕ»",
					clinicPhone: clinicRow?.phone || "",
					clinicAddress: clinicOrg?.legalAddress || "",
					clinicWebsite: clinicOrg?.website || "",
					clinicLicenseNumber: clinicOrg?.medicalLicenseNumber || "",
					warrantyMonths: cert.warrantyMonths,
					serviceLifeMonths: cert.serviceLifeMonths,
					issuedAt: cert.issuedAt,
					expiresAt: cert.expiresAt,
					nextRecallDate: cert.nextRecallDate,
					items: cert.itemsJson,
					integritySha256: cert.integritySha256,
					notes: cert.notes,
				},
			});
		},
	);
}
