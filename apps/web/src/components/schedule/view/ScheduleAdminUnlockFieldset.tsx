/**
 * apps/web/src/components/schedule/view/ScheduleAdminUnlockFieldset.tsx
 * МАНДАТ 8e («Автономия врача») & МАНДАТ 8n («Суверенитет соло-практики»).
 *
 * Бюрократический капкан требования «админского секрета» для изменения расписания
 * полностью ликвидирован. Врач и персонал клиники имеют полный доступ к управлению
 * расписанием без блокировок и паролей. Компонент оставлен как no-op для обратной
 * совместимости импортов.
 */

export interface ScheduleAdminUnlockFieldsetProps {
	scheduleAdminSecretNeeded?: boolean;
	scheduleAdminSecretSession?: string;
	scheduleAdminSecretDraft?: string;
	setScheduleAdminSecretDraft?: (val: string) => void;
	scheduleAdminSecretReason?: string;
	adminSecretReady?: boolean;
	unlockScheduleAdminSession?: () => void;
	lockScheduleAdminSession?: () => void;
	showToast?: (msg: string, type?: "success" | "error" | "info" | "warning") => void;
}

export function ScheduleAdminUnlockFieldset(
	_props?: ScheduleAdminUnlockFieldsetProps,
): null {
	return null;
}

