import type {
	Dashboard,
	Patient,
	StaffRole,
} from "@dental/shared";
import type { AppView, SettingsTab } from "../../../utils/routeUtils";

/**
 * Статус экстренного триажа и безопасности пациента (CITO / Аллергии / Острая боль).
 */
export interface AppLogicEmergencyTriage {
	hasCriticalAllergy: boolean;
	criticalAllergies: string[];
	isCitoVisit: boolean;
	hasAcutePain: boolean;
	emergencyTriageSeverity: "critical" | "warning" | "normal";
	emergencyBannerText: string | null;
}

/**
 * Синхронизация глубоких ссылок роутинга и состояния истории браузера.
 */
export interface AppLogicNavigationSyncState {
	currentHash: string;
	syncViewFromHash: (hash: string) => void;
	navigateWithDeepLink: (view: AppView, tab?: SettingsTab | string) => void;
}

/**
 * Звуковые оповещения рабочего пространства клиники.
 */
export interface AppLogicSoundNotifications {
	muted: boolean;
	setMuted: (muted: boolean) => void;
	testOnlineBookingSound: () => void;
	testSlotEndSound: () => void;
}

/**
 * Глобальные метаданные рабочего места врача и регистратора.
 */
export interface AppLogicGlobalWorkspaceMeta {
	activeQueueRole: StaffRole;
	legalMissingFields: string[];
	legalReadinessPercent: number;
}
