import { randomInt } from "node:crypto";
import { and, eq, lt } from "drizzle-orm";
import { appointmentActionCodes } from "../../db/communicationsSchema.js";
import {
	type TenantDb,
	withSuperuserBypass,
	withTenantCtx,
} from "../../db/rls.js";

type AppointmentAction = "confirm" | "cancel" | "reschedule";

const CODE_ALPHABET =
	"ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";
const CODE_LENGTH = 10;

export function generateActionCode(length = CODE_LENGTH): string {
	let code = "";
	for (let index = 0; index < length; index += 1) {
		code += CODE_ALPHABET.charAt(randomInt(CODE_ALPHABET.length));
	}
	return code;
}

export function actionCodeExpiry(
	appointmentStartsAt: Date,
	now = new Date(),
): Date {
	const graceMs = 6 * 60 * 60 * 1000;
	const candidate = new Date(appointmentStartsAt.getTime() + graceMs);
	const floor = new Date(now.getTime() + 60 * 60 * 1000);
	return candidate > floor ? candidate : floor;
}

export function readPublicBaseUrl(
	env: NodeJS.ProcessEnv = process.env,
): string | null {
	const raw = env.DENTE_PUBLIC_BASE_URL?.trim();
	if (!raw) return null;
	try {
		const parsed = new URL(raw);
		if (parsed.protocol !== "https:" && parsed.protocol !== "http:")
			return null;
		return `${parsed.protocol}//${parsed.host}`;
	} catch {
		return null;
	}
}

export function actionLinkFor(baseUrl: string, code: string): string {
	return `${baseUrl}/api/p/${code}`;
}

export type AppointmentActionLinks = {
	readonly confirmLink: string;
	readonly cancelLink: string;
	readonly rescheduleLink?: string | undefined;
};

export async function issueAppointmentActionLinks(
	input: {
		readonly organizationId: string;
		readonly appointmentId: string;
		readonly startsAt: Date;
	},
	now = new Date(),
	env: NodeJS.ProcessEnv = process.env,
	tx?: TenantDb,
): Promise<AppointmentActionLinks | null> {
	const baseUrl = readPublicBaseUrl(env);
	if (!baseUrl) return null;

	const expiresAt = actionCodeExpiry(input.startsAt, now);
	const run = async (tenantTx: TenantDb) => {
		const confirmCode = await issueCode(
			tenantTx,
			input.organizationId,
			input.appointmentId,
			"confirm",
			expiresAt,
		);
		const cancelCode = await issueCode(
			tenantTx,
			input.organizationId,
			input.appointmentId,
			"cancel",
			expiresAt,
		);
		const rescheduleCode = await issueCode(
			tenantTx,
			input.organizationId,
			input.appointmentId,
			"reschedule",
			expiresAt,
		);
		if (!confirmCode || !cancelCode) return null;

		return {
			confirmLink: actionLinkFor(baseUrl, confirmCode),
			cancelLink: actionLinkFor(baseUrl, cancelCode),
			rescheduleLink: rescheduleCode
				? actionLinkFor(baseUrl, rescheduleCode)
				: undefined,
		};
	};

	return tx ? run(tx) : withTenantCtx(input.organizationId, run);
}

async function issueCode(
	tx: TenantDb,
	organizationId: string,
	appointmentId: string,
	action: AppointmentAction,
	expiresAt: Date,
): Promise<string | null> {
	const existing = await tx
		.select({ code: appointmentActionCodes.code })
		.from(appointmentActionCodes)
		.where(
			and(
				eq(appointmentActionCodes.organizationId, organizationId),
				eq(appointmentActionCodes.appointmentId, appointmentId),
				eq(appointmentActionCodes.action, action),
			),
		)
		.limit(1);

	const firstExisting = existing[0];
	if (firstExisting) {
		await tx
			.update(appointmentActionCodes)
			.set({ expiresAt })
			.where(
				and(
					eq(appointmentActionCodes.organizationId, organizationId),
					eq(appointmentActionCodes.code, firstExisting.code),
				),
			);
		return firstExisting.code;
	}

	for (let attempt = 0; attempt < 5; attempt += 1) {
		const code = generateActionCode();
		const inserted = await tx
			.insert(appointmentActionCodes)
			.values({ code, organizationId, appointmentId, action, expiresAt })
			.onConflictDoNothing()
			.returning({ code: appointmentActionCodes.code });
		const firstInserted = inserted[0];
		if (firstInserted) return firstInserted.code;

		const concurrent = await tx
			.select({ code: appointmentActionCodes.code })
			.from(appointmentActionCodes)
			.where(
				and(
					eq(appointmentActionCodes.organizationId, organizationId),
					eq(appointmentActionCodes.appointmentId, appointmentId),
					eq(appointmentActionCodes.action, action),
				),
			)
			.limit(1);
		const firstConcurrent = concurrent[0];
		if (firstConcurrent) return firstConcurrent.code;
	}
	return null;
}

export type ResolvedActionCode = {
	readonly code: string;
	readonly organizationId: string;
	readonly appointmentId: string;
	readonly action: AppointmentAction;
	readonly expired: boolean;
	readonly usedAt: Date | null;
};

export async function resolveActionCode(
	rawCode: string,
	now = new Date(),
): Promise<ResolvedActionCode | null> {
	const code = rawCode.trim();
	if (code.length < 8 || code.length > 32 || !/^[A-Za-z0-9]+$/.test(code))
		return null;

	const [row] = await withSuperuserBypass(async (tx) =>
		tx
			.select()
			.from(appointmentActionCodes)
			.where(eq(appointmentActionCodes.code, code))
			.limit(1),
	);
	if (!row) return null;

	return {
		code: row.code,
		organizationId: row.organizationId,
		appointmentId: row.appointmentId,
		action:
			row.action === "cancel"
				? "cancel"
				: row.action === "reschedule"
					? "reschedule"
					: "confirm",
		expired: row.expiresAt.getTime() < now.getTime(),
		usedAt: row.usedAt,
	};
}

export async function markActionCodeUsed(
	code: string,
	now = new Date(),
	organizationId?: string,
	tx?: TenantDb,
): Promise<void> {
	const run = async (tenantTx: TenantDb) => {
		const condition = organizationId
			? and(
					eq(appointmentActionCodes.organizationId, organizationId),
					eq(appointmentActionCodes.code, code),
				)
			: eq(appointmentActionCodes.code, code);
		await tenantTx
			.update(appointmentActionCodes)
			.set({ usedAt: now })
			.where(condition);
	};

	if (tx) {
		await run(tx);
		return;
	}
	if (organizationId) {
		await withTenantCtx(organizationId, run);
		return;
	}
	const resolved = await resolveActionCode(code, now);
	if (!resolved) return;
	await withTenantCtx(resolved.organizationId, async (tenantTx) => {
		await tenantTx
			.update(appointmentActionCodes)
			.set({ usedAt: now })
			.where(
				and(
					eq(appointmentActionCodes.organizationId, resolved.organizationId),
					eq(appointmentActionCodes.code, code),
				),
			);
	});
}

export async function purgeExpiredActionCodes(
	olderThan: Date,
): Promise<number> {
	const staleOrganizations = await withSuperuserBypass(async (tx) =>
		tx
			.selectDistinct({ organizationId: appointmentActionCodes.organizationId })
			.from(appointmentActionCodes)
			.where(lt(appointmentActionCodes.expiresAt, olderThan)),
	);

	let removedTotal = 0;
	for (const { organizationId } of staleOrganizations) {
		const removed = await withTenantCtx(organizationId, async (tx) =>
			tx
				.delete(appointmentActionCodes)
				.where(
					and(
						eq(appointmentActionCodes.organizationId, organizationId),
						lt(appointmentActionCodes.expiresAt, olderThan),
					),
				)
				.returning({ code: appointmentActionCodes.code }),
		);
		removedTotal += removed.length;
	}
	return removedTotal;
}
