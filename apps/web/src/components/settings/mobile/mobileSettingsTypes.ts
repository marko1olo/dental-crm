import type React from "react";

export interface MobileSettingsAppLogicBag {
	dashboard?: {
		clinicName?: string | undefined;
		serviceCatalog?: readonly unknown[] | undefined;
		clinicSettings?: {
			profile?: {
				mode?: string | null | undefined;
				clinicName?: string | undefined;
			} | undefined;
			staff?: readonly unknown[] | undefined;
			chairs?: readonly unknown[] | undefined;
		} | undefined;
	} | undefined;
	[key: string]: unknown;
}

export interface MobileSettingsRootViewProps {
	readonly appLogic: MobileSettingsAppLogicBag;
	readonly onSelectSection: (sectionId: string) => void;
}

export interface SettingItem {
	id: string;
	title: string;
	subtitle: string;
	icon: React.ComponentType<{ size?: number; className?: string }>;
	iconBg: string;
	iconColor: string;
	badge?: string;
}

export interface SettingGroup {
	id: string;
	header: string;
	items: SettingItem[];
}

export const SETTING_CATEGORIES = [
	{ id: "all", label: "Все" },
	{ id: "clinic_org", label: "Клиника" },
	{ id: "prices_services", label: "Прейскурант" },
	{ id: "staff_team", label: "Персонал" },
	{ id: "clinical_standards", label: "Стандарты" },
	{ id: "integrations_sync", label: "Интеграции" },
] as const;
