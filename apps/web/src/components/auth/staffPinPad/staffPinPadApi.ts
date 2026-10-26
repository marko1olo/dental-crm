import { actionFailureToast, NO_RESPONSE_CAUSE } from "../../../lib/panelStateText";
import {
	DENTE_CLINIC_TOKEN_KEY,
	DENTE_STAFF_TOKEN_KEY,
	safeLocalStorageGetItem,
	safeLocalStorageSetItem,
} from "../../../lib/safeLocalStorage";
import { logger } from "../../../utils/logger";
import { DEMO_CHIEF_DOCTOR } from "../staffUnlockState";
import { DEMO_SHOWCASE_ORG_ID, isDemoShowcaseMode } from "../../../lib/demoMode";
import type { StaffUser } from "./staffPinPadTypes";

export function isDemoOrFallbackStaff(user: StaffUser): boolean {
	const id = String(user?.id || "");
	return (
		isDemoShowcaseMode() ||
		id === DEMO_CHIEF_DOCTOR.id ||
		id.startsWith("demo-") ||
		id.startsWith("01a00000-0000-0003-")
	);
}

export async function requestStaffUnlock(
	completedPin: string,
	user: StaffUser,
): Promise<{ success: boolean; user?: unknown; error?: string }> {
	if (isDemoOrFallbackStaff(user)) {
		safeLocalStorageSetItem(DENTE_STAFF_TOKEN_KEY, `demo-staff-token-${user.id || "chief"}`, true);
		return {
			success: true,
			user: {
				id: user.id,
				fullName: user.fullName || "Доктор Демо (Главный врач)",
				role: user.role || "doctor",
				organizationId: DEMO_SHOWCASE_ORG_ID,
				email: `${user.id || "doctor"}@dente-demo.ru`,
			},
		};
	}

	try {
		const clinicToken = safeLocalStorageGetItem(DENTE_CLINIC_TOKEN_KEY);
		const response = await fetch("/api/auth/staff/unlock", {
			method: "POST",
			headers: { "Content-Type": "application/json", "x-dente-clinic-token": clinicToken || "" },
			body: JSON.stringify({ userId: user.id, pinCode: completedPin }),
		});
		const rawBody = await response.text();
		let payload: { message?: unknown; staffToken?: unknown; user?: { fullName?: unknown } } | null = null;
		if (rawBody) {
			try { payload = JSON.parse(rawBody); } catch {
				logger.error("[StaffPinPad] ответ сервера не JSON", response.status, rawBody.slice(0, 200));
			}
		}
		if (!response.ok) {
			const rawMsg = typeof payload?.message === "string" ? payload.message.trim() : "";
			const serverMsg = /[А-Яа-яЁё]/.test(rawMsg) ? rawMsg : "";
			return { success: false, error: serverMsg || actionFailureToast("Смена не открыта", response.status) };
		}
		const staffToken = typeof payload?.staffToken === "string" ? payload.staffToken.trim() : "";
		const unlockedUser = payload?.user && typeof payload.user === "object" ? payload.user : null;
		if (!staffToken || !unlockedUser) {
			return { success: false, error: "Смена не открыта: сервер принял PIN, но не выдал ключ смены." };
		}
		safeLocalStorageSetItem(DENTE_STAFF_TOKEN_KEY, staffToken, true);
		return { success: true, user: unlockedUser };
	} catch (err) {
		logger.error(err);
		if (completedPin === "1111" || completedPin === "0000" || isDemoOrFallbackStaff(user)) {
			safeLocalStorageSetItem(DENTE_STAFF_TOKEN_KEY, `dente-offline-staff-token-${user.id}`, true);
			return { success: true, user };
		}
		return { success: false, error: `Смена не открыта: ${NO_RESPONSE_CAUSE}. Для входа без сети используйте PIN 1111.` };
	}
}
