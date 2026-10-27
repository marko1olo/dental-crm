import { and, eq } from "drizzle-orm";
import { db } from "../../../db/client.js";
import { users } from "../../../db/schema.js";
import { verifyCredential } from "../../../utils/cryptoHelper.js";

export const SIMPLE_PIN_PREFIX = "PIN:";
export const SIMPLE_PIN_EP_MARK = "SIMPLE_PIN_EP";
export const SHIFT_SESSION_SIGNATURE = "SHIFT_SESSION";

export const DIARY_PIN_USER_REQUIRED_MESSAGE =
	"Простую подпись по ПИН-коду может поставить только сотрудник, вошедший в смену. Войдите в смену заново и повторите подписание.";
export const DIARY_PIN_NOT_SET_MESSAGE =
	"У вашей учётной записи не задан ПИН-код сотрудника. Подпишите дневник в 1 клик учётной записью врача или задайте ПИН в настройках персонала.";
export const DIARY_PIN_INVALID_MESSAGE =
	"ПИН-код не принят. Проверьте раскладку и введите ПИН-код сотрудника заново.";

export const DENTAL_SPECIALTY_LABELS: Record<string, string> = {
	therapist: "терапия", orthopedist: "ортопедия", surgeon: "хирургия",
	orthodontist: "ортодонтия", periodontist: "пародонтология", hygienist: "гигиена",
	pediatric: "детская", implantologist: "имплантация", radiologist: "рентген",
	universal: "универсально",
};

export type SimplePinResolve =
	| { ok: true; stored: string | null }
	| { ok: false; code: "PinRequired" | "PinInvalid" | "PinNotSet" | "UserRequired" | "PepDoctorForbidden"; message: string };

export type DiarySigningFailureCode =
	| "NotFound" | "NotSaved" | "AlreadyLocked" | "InsufficientStock"
	| "Icd10Required" | "Icd10Invalid" | "ToothRequired" | "ToothInvalid"
	| "PinRejected" | "PepDoctorForbidden";

export class DiarySigningError extends Error {
	constructor(readonly code: DiarySigningFailureCode, message: string) {
		super(message);
		this.name = "DiarySigningError";
	}
}

export type DiaryDbTransaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

/**
 * Верификация подписи: сессионная в 1 клик, ПИН-код сотрудника или УКЭП.
 */
export async function resolveSignatureForStorage(params: {
	pkcs7Signature: string | null | undefined;
	userId: string | null;
	organizationId: string;
	diaryHashForMark?: string | null;
	executor?: Pick<DiaryDbTransaction, "select">;
}): Promise<SimplePinResolve> {
	const raw = typeof params.pkcs7Signature === "string" ? params.pkcs7Signature : null;
	if (raw == null || raw.length === 0) return { ok: true, stored: null };

	const hashPrefix = typeof params.diaryHashForMark === "string" && params.diaryHashForMark.length > 0
		? params.diaryHashForMark.slice(0, 12) : "";

	if (raw === SHIFT_SESSION_SIGNATURE) {
		if (!params.userId) return { ok: false, code: "UserRequired", message: DIARY_PIN_USER_REQUIRED_MESSAGE };
		return { ok: true, stored: `${SIMPLE_PIN_EP_MARK}|${params.userId}|${new Date().toISOString()}|${hashPrefix}` };
	}

	if (raw.startsWith(SIMPLE_PIN_PREFIX)) {
		if (!params.userId) return { ok: false, code: "UserRequired", message: DIARY_PIN_USER_REQUIRED_MESSAGE };
		const pin = raw.slice(SIMPLE_PIN_PREFIX.length).trim();
		if (!/^\d{4}$/.test(pin)) return { ok: false, code: "PinInvalid", message: DIARY_PIN_INVALID_MESSAGE };

		const queryExecutor = params.executor ?? db;
		const [userRow] = await queryExecutor.select({ pinCodeHash: users.pinCodeHash }).from(users)
			.where(and(eq(users.id, params.userId), eq(users.organizationId, params.organizationId))).limit(1);
		if (!userRow?.pinCodeHash) return { ok: false, code: "PinNotSet", message: DIARY_PIN_NOT_SET_MESSAGE };

		const verified = await verifyCredential(pin, userRow.pinCodeHash);
		if (!verified) return { ok: false, code: "PinInvalid", message: DIARY_PIN_INVALID_MESSAGE };
		return { ok: true, stored: `${SIMPLE_PIN_EP_MARK}|${params.userId}|${new Date().toISOString()}|${hashPrefix}` };
	}

	return { ok: true, stored: raw };
}

export function formatDoctorSpecialtyLabel(raw: unknown): string | null {
	const codes: string[] = Array.isArray(raw)
		? raw.map((x) => (typeof x === "string" ? x.trim() : "")).filter(Boolean)
		: typeof raw === "string" && raw.trim() ? [raw.trim()] : [];
	if (codes.length === 0) return null;
	const meaningful = codes.filter((c) => c !== "universal");
	const list = meaningful.length > 0 ? meaningful : codes;
	const labels = list.map((c) => DENTAL_SPECIALTY_LABELS[c] ?? c);
	const joined = labels.join(", ").trim();
	return joined.length > 0 ? joined : null;
}

export function redactLegacyPinSignature(value: string | null | undefined): string | null {
	if (typeof value !== "string" || value.length === 0) return value ?? null;
	if (value.startsWith(SIMPLE_PIN_PREFIX)) return `${SIMPLE_PIN_EP_MARK}|redacted-legacy`;
	return value;
}
