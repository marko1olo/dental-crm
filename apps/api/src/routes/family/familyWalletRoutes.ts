import { kopecksToNumericString, parseKopecks } from "@dental/shared";
import type { FastifyInstance } from "fastify";
import {
	requireResolvedOrganizationId,
	requireResolvedStaffOrAdminOrganizationId,
} from "../../accessGuard.js";
import {
	enforcePermissionWhenStaffKnown,
	getCachedRoleMatrixOverrides,
	roleHasPermission,
	roleHasPermissionWithOverrides,
} from "../../security/permissions.js";
import { getRequestIdentity } from "../../security/identity.js";
import { getClinicSettingsFromDb } from "../../db/settingsQuery.js";
import {
	FamilyWalletError,
	familyWalletService,
} from "../../services/familyWallet/FamilyWalletService.js";
import { generateFnsTaxCertificatesForFamilyLogic } from "../../services/familyWallet/familyFnsTaxService.js";
import type { FnsClinicInfo } from "@dental/shared";
import { getFamilyHistoryRecords } from "./familyBalanceService.js";
import { familyPaymentSchema } from "./familyFinanceTypes.js";

const UUID_REGEX =
	/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function extractHeaderKey(rawHeader: string | string[] | undefined): string | undefined {
	if (typeof rawHeader === "string") return rawHeader.trim();
	if (Array.isArray(rawHeader) && rawHeader.length > 0 && typeof rawHeader[0] === "string") {
		return rawHeader[0].trim();
	}
	return undefined;
}

export function registerFamilyWalletRoutes(app: FastifyInstance) {
	// GET /api/finance/family/:familyGroupId/history
	app.get("/api/finance/family/:familyGroupId/history", async (req, reply) => {
		const organizationId = await requireResolvedOrganizationId(req, reply, "family finance history read");
		if (!organizationId) return;

		const { familyGroupId } = req.params as { familyGroupId: string };
		if (familyGroupId === "patient" || familyGroupId === "pay" || familyGroupId === "topup" || familyGroupId === "refund") {
			return reply.code(404).send({ error: "Family group not found" });
		}
		if (!UUID_REGEX.test(familyGroupId)) {
			return reply.code(400).send({
				error: "ValidationError",
				message: "Некорректный идентификатор семейной группы (ожидается UUID)",
			});
		}

		const records = await getFamilyHistoryRecords(familyGroupId, organizationId);
		if (!records) return reply.code(404).send({ error: "Family group not found" });
		return records;
	});

	// POST /api/finance/family/pay
	app.post("/api/finance/family/pay", async (req, reply) => {
		const organizationId = await requireResolvedStaffOrAdminOrganizationId(req, reply, "family finance payment");
		if (!organizationId) return;
		const identity = getRequestIdentity(req);
		const cachedOverrides = identity.organizationId
			? getCachedRoleMatrixOverrides(identity.organizationId)
			: null;
		const hasFinanceWrite = cachedOverrides
			? roleHasPermissionWithOverrides(identity.role, "finance.write", cachedOverrides)
			: roleHasPermission(identity.role, "finance.write");
		const hasClinicalWrite = cachedOverrides
			? roleHasPermissionWithOverrides(identity.role, "clinical.write", cachedOverrides)
			: roleHasPermission(identity.role, "clinical.write");
		const isDoctorRole =
			identity.role?.toLowerCase() === "doctor" ||
			identity.role?.toLowerCase() === "head_doctor";

		if (!hasFinanceWrite && !hasClinicalWrite && !isDoctorRole) {
			if (!enforcePermissionWhenStaffKnown(req, reply, "finance.write")) return;
		}

		const payParsed = familyPaymentSchema.safeParse(req.body);
		if (!payParsed.success) {
			return reply.code(400).send({
				error: "ValidationError",
				message: "Проверьте оплату: нужны patientId, familyGroupId и сумма больше нуля с точностью до копейки.",
			});
		}

		const headerKey = extractHeaderKey(req.headers["idempotency-key"] || req.headers["x-idempotency-key"]);
		const mutationId = payParsed.data.clientMutationId?.trim() || headerKey;
		if (!mutationId) {
			return reply.code(400).send({
				error: "ValidationError",
				message: "Ключ операции (clientMutationId или заголовок Idempotency-Key) обязателен для предотвращения двойных списаний.",
			});
		}

		try {
			const result = await familyWalletService.debit({
				organizationId,
				familyGroupId: payParsed.data.familyGroupId,
				patientId: payParsed.data.patientId,
				payerPatientId: payParsed.data.payerPatientId,
				amountRub: payParsed.data.amountRub,
				amountKopecks: payParsed.data.amountKopecks,
				serviceId: payParsed.data.serviceId,
				catalogItemId: payParsed.data.catalogItemId,
				discountRub: payParsed.data.discountRub,
				discountPercent: payParsed.data.discountPercent,
				clientMutationId: mutationId,
				documentId: payParsed.data.documentId,
				visitId: payParsed.data.visitId,
			});

			const finalBalKop =
				result.newBalanceKopecks != null
					? Number(result.newBalanceKopecks)
					: parseKopecks(result.newBalanceRub);
			return {
				payment: result.payment,
				newBalance: kopecksToNumericString(finalBalKop),
				duplicate: result.duplicate,
			};
		} catch (err: unknown) {
			const statusCode =
				typeof err === "object" && err !== null && "statusCode" in err && typeof (err as { statusCode?: unknown }).statusCode === "number"
					? ((err as { statusCode: number }).statusCode)
					: err instanceof FamilyWalletError
						? err.statusCode
						: 500;
			const message = err instanceof Error ? err.message : "Internal Server Error";
			return reply.code(statusCode).send({
				error: statusCode === 402 ? "InsufficientFunds" : statusCode === 403 ? "Forbidden" : statusCode === 409 ? "IdempotencyConflict" : statusCode === 404 ? "NotFound" : "PaymentFailed",
				message,
			});
		}
	});

	// GET /api/finance/family/:familyGroupId/tax-certificates
	app.get("/api/finance/family/:familyGroupId/tax-certificates", async (req, reply) => {
		const organizationId = await requireResolvedOrganizationId(
			req,
			reply,
			"family fns tax certificate read",
		);
		if (!organizationId) return;

		const { familyGroupId } = req.params as { familyGroupId: string };
		if (!UUID_REGEX.test(familyGroupId)) {
			return reply.code(400).send({
				error: "ValidationError",
				message: "Некорректный идентификатор семейной группы (ожидается UUID)",
			});
		}

		const query = req.query as {
			taxYear?: string;
			payerPatientId?: string;
		};
		const taxYear = query.taxYear?.trim() || String(new Date().getFullYear());
		const parsedTaxYear = Number.parseInt(taxYear, 10);
		if (!/^\d{4}$/.test(taxYear) || !Number.isInteger(parsedTaxYear) || parsedTaxYear < 2000 || parsedTaxYear > 2100) {
			return reply.code(400).send({
				error: "ValidationError",
				message: "Некорректный налоговый период (taxYear должен быть 4-значным годом, например 2025)",
			});
		}
		const payerPatientId = query.payerPatientId?.trim();
		if (payerPatientId && !UUID_REGEX.test(payerPatientId)) {
			return reply.code(400).send({
				error: "ValidationError",
				message: "Некорректный идентификатор плательщика payerPatientId (ожидается UUID)",
			});
		}

		try {
			const settings = await getClinicSettingsFromDb(organizationId);
			const profile = settings?.profile;
			const profileRecord = profile as (typeof profile & { chiefDoctorName?: string; directorName?: string }) | undefined;

			const inn = profile?.inn?.trim();
			const ogrn = profile?.ogrn?.trim();
			const clinicName = (profile?.legalName || profile?.clinicName)?.trim();
			const rawSignatory = (profile?.signatoryName || profileRecord?.chiefDoctorName || profileRecord?.directorName)?.trim();

			if (!inn || !ogrn || !clinicName || !rawSignatory) {
				return reply.code(422).send({
					error: "UnprocessableEntity",
					message: "Для выдачи справки об оплате медицинских услуг заполните реквизиты клиники и главного врача в Настройках",
				});
			}

			const signatoryFioParts = rawSignatory.split(/\s+/).filter(Boolean);
			if (signatoryFioParts.length < 2) {
				return reply.code(422).send({
					error: "UnprocessableEntity",
					message: "Для выдачи справки об оплате медицинских услуг заполните реквизиты клиники и главного врача в Настройках",
				});
			}

			const clinicInfo: FnsClinicInfo = {
				inn,
				...(profile?.kpp ? { kpp: profile.kpp.trim() } : {}),
				ogrn,
				name: clinicName,
			};

			const familyPart = signatoryFioParts[0] ?? "";
			const givenPart = signatoryFioParts[1] ?? "";
			const signatory = {
				signatoryRole: "1" as const,
				fullName: {
					family: familyPart,
					given: givenPart,
					...(signatoryFioParts[2] ? { patronymic: signatoryFioParts.slice(2).join(" ") } : {}),
				},
			};

			const certificates = await generateFnsTaxCertificatesForFamilyLogic({
				organizationId,
				familyGroupId,
				taxYear,
				clinic: clinicInfo,
				signatory,
				customPayerPatientId: payerPatientId || undefined,
			});

			return {
				familyGroupId,
				taxYear,
				count: certificates.length,
				certificates,
			};
		} catch (err: unknown) {
			const statusCode =
				err instanceof FamilyWalletError
					? err.statusCode
					: typeof err === "object" && err !== null && "statusCode" in err && typeof (err as { statusCode?: unknown }).statusCode === "number"
						? (err as { statusCode: number }).statusCode
						: 500;
			const message = err instanceof Error ? err.message : "Internal Server Error";
			return reply.code(statusCode).send({
				error: err instanceof FamilyWalletError ? err.code : "FamilyTaxCertificateError",
				message,
			});
		}
	});
}
