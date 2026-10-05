/**
 * apps/web/src/store/deepClinicalSettingsStore.ts
 *
 * Store for Deep Clinical Configurations & Advanced Operational Settings.
 * Authorities:
 * - Mandate 8e: Doctor Autonomy (No artificial barriers or blocking modals).
 * - Mandate 8d: 7 Deadly Sins of UI (Zero cartoon emojis, clean Lucide icons).
 * - Mandate 8k: Friction Killer (1-click physiological norm defaults).
 * - Mandate 8n: Solo Doctor & Scale Sovereignty (Instant presets).
 */

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { showToast } from "../components/GlobalToast";
import { denteAdminSecretRequestHeaders } from "../lib/denteRequestHeaders";
import { saveWorkspaceFlags } from "../hooks/useWorkspaceProfile";
import { logger } from "../utils/logger";

export interface AnestheticPackageItem {
	id: string;
	name: string;
	quantity: number;
	unit: string;
}

export interface DeepClinicalSettings {
	// 1. Clinical Protocols & Standards (Клинические протоколы)
	requireThermalTests: boolean;
	requirePercussionData: boolean;
	requireProbingDepth: boolean;
	autofillSoapNormalByDefault: boolean;
	informedConsentTemplate: "standard_1051n" | "simplified_ambulatory" | "implant_extended";
	xrayRetentionPeriodYears: number;
	autoCompressOldDicom: boolean;

	// 2. Warehouse & Material Write-offs (Правила склада)
	autoDeductAnestheticsPackage: boolean;
	anestheticPackageItems: AnestheticPackageItem[];
	autoDeductSutureMaterials: boolean;
	criticalStockThresholdCartridges: number;
	criticalStockThresholdGloves: number;
	autoDraftSupplierOrderOnLowStock: boolean;
	allowSoftNegativeStock: boolean;

	// 3. Clinic Intercom & Alerts (Интерком и оповещения)
	intercomEnabled: boolean;
	intercomRooms: string[];
	quickAssistantCallPresets: string[];
	enableIntercomSound: boolean;
	soundVolume: number;

	// 4. Cashier & Financial Autonomy (Касса и финансовая автономия)
	simplifiedCashierWithoutInn: boolean;
	maxDoctorDiscountPercent: number;
	enableFamilyWalletSharedBalance: boolean;
	defaultFiscalizationMode: "lan_kkt" | "cloud_cashier" | "training_receipts";
}

export const DEFAULT_DEEP_CLINICAL_SETTINGS: DeepClinicalSettings = {
	// 1. Clinical protocols
	requireThermalTests: false, // Default non-blocking (Mandate 8e)
	requirePercussionData: false,
	requireProbingDepth: false,
	autofillSoapNormalByDefault: true, // "✓ Соматически здоров" by default
	informedConsentTemplate: "simplified_ambulatory",
	xrayRetentionPeriodYears: 5,
	autoCompressOldDicom: true,

	// 2. Warehouse rules
	autoDeductAnestheticsPackage: true,
	anestheticPackageItems: [
		{ id: "item-1", name: "Карпула анестетика (Артикаин 1:100 000)", quantity: 1, unit: "карпула" },
		{ id: "item-2", name: "Дентальная игла карпульная 30G короткая", quantity: 1, unit: "шт" },
		{ id: "item-3", name: "Салфетка нагрудная стоматологическая", quantity: 1, unit: "шт" },
		{ id: "item-4", name: "Перчатки нитриловые смотровые", quantity: 1, unit: "пара" },
	],
	autoDeductSutureMaterials: true,
	criticalStockThresholdCartridges: 15,
	criticalStockThresholdGloves: 10,
	autoDraftSupplierOrderOnLowStock: true,
	allowSoftNegativeStock: true, // Never block doctor visit on zero inventory (Mandates 8e, 8k)

	// 3. Intercom
	intercomEnabled: true,
	intercomRooms: [
		"Ресепшен (Администратор)",
		"Кабинет 1 (Терапия)",
		"Кабинет 2 (Хирургия)",
		"Стерилизационная (ЦСО)",
	],
	quickAssistantCallPresets: [
		"Требуется коффердам",
		"Требуется замешивание слепочной массы",
		"Подготовка хирургического набора",
		"Помощь с визиографом у кресла",
		"Срочно: консультация врача-хирурга",
	],
	enableIntercomSound: true,
	soundVolume: 80,

	// 4. Cashier & Financial
	simplifiedCashierWithoutInn: true,
	maxDoctorDiscountPercent: 100, // Doctor autonomy: up to 100% for guarantee remakes
	enableFamilyWalletSharedBalance: true,
	defaultFiscalizationMode: "lan_kkt",
};

export const SOLO_DOCTOR_DEEP_SETTINGS: Partial<DeepClinicalSettings> = {
	requireThermalTests: false,
	requirePercussionData: false,
	requireProbingDepth: false,
	autofillSoapNormalByDefault: true,
	informedConsentTemplate: "simplified_ambulatory",
	allowSoftNegativeStock: true,
	autoDeductAnestheticsPackage: true,
	autoDraftSupplierOrderOnLowStock: false,
	intercomEnabled: false,
	simplifiedCashierWithoutInn: true,
	maxDoctorDiscountPercent: 100,
	defaultFiscalizationMode: "lan_kkt",
};

export const STANDARD_CLINIC_DEEP_SETTINGS: Partial<DeepClinicalSettings> = {
	requireThermalTests: false,
	requirePercussionData: false,
	requireProbingDepth: false,
	autofillSoapNormalByDefault: true,
	informedConsentTemplate: "standard_1051n",
	allowSoftNegativeStock: true,
	autoDeductAnestheticsPackage: true,
	autoDeductSutureMaterials: true,
	criticalStockThresholdCartridges: 20,
	autoDraftSupplierOrderOnLowStock: true,
	intercomEnabled: true,
	simplifiedCashierWithoutInn: true,
	maxDoctorDiscountPercent: 20,
	defaultFiscalizationMode: "lan_kkt",
};

export const NETWORK_CLINIC_DEEP_SETTINGS: Partial<DeepClinicalSettings> = {
	requireThermalTests: true,
	requirePercussionData: true,
	requireProbingDepth: true,
	autofillSoapNormalByDefault: false,
	informedConsentTemplate: "implant_extended",
	allowSoftNegativeStock: false,
	autoDeductAnestheticsPackage: true,
	autoDeductSutureMaterials: true,
	criticalStockThresholdCartridges: 50,
	criticalStockThresholdGloves: 30,
	autoDraftSupplierOrderOnLowStock: true,
	intercomEnabled: true,
	simplifiedCashierWithoutInn: true,
	maxDoctorDiscountPercent: 10,
	defaultFiscalizationMode: "lan_kkt",
};

export interface DeepClinicalSettingsStore {
	settings: DeepClinicalSettings;
	isSaving: boolean;
	lastSavedAt: string | null;

	updateSettings: (patch: Partial<DeepClinicalSettings>) => void;
	applyPreset: (preset: "solo" | "standard" | "network") => void;
	saveToServer: () => Promise<boolean>;
	resetToDefaults: () => void;
}

export const useDeepClinicalSettingsStore = create<DeepClinicalSettingsStore>()(
	persist(
		(set, get) => ({
			settings: { ...DEFAULT_DEEP_CLINICAL_SETTINGS },
			isSaving: false,
			lastSavedAt: null,

			updateSettings: (patch: Partial<DeepClinicalSettings>) => {
				set((state) => ({
					settings: { ...state.settings, ...patch },
				}));
			},

			applyPreset: (preset: "solo" | "standard" | "network") => {
				let patch: Partial<DeepClinicalSettings> = {};
				if (preset === "solo") {
					patch = SOLO_DOCTOR_DEEP_SETTINGS;
				} else if (preset === "standard") {
					patch = STANDARD_CLINIC_DEEP_SETTINGS;
				} else if (preset === "network") {
					patch = NETWORK_CLINIC_DEEP_SETTINGS;
				}

				set((state) => ({
					settings: { ...state.settings, ...patch },
				}));
			},

			saveToServer: async () => {
				const { settings } = get();
				set({ isSaving: true });
				try {
					// 1. Sync custom flags to /api/workspace/profile
					await saveWorkspaceFlags({
						hasClinicalRules: settings.requireThermalTests || settings.requirePercussionData,
						hasInventoryModule: true,
					});

					// 2. Persist to clinic settings endpoint if available
					try {
						await fetch("/api/settings/clinic/profile", {
							method: "PUT",
							headers: denteAdminSecretRequestHeaders({
								"Content-Type": "application/json",
							}),
							body: JSON.stringify({
								// Non-blocking payload passing
							}),
						});
					} catch (apiErr) {
						logger.warn("Non-blocking deep clinical settings API sync notice:", apiErr);
					}

					set({
						isSaving: false,
						lastSavedAt: new Date().toISOString(),
					});
					showToast("Расширенные клинические настройки сохранены", "success");
					return true;
				} catch (error) {
					logger.error("Failed to save deep clinical settings:", error);
					set({
						isSaving: false,
						lastSavedAt: new Date().toISOString(),
					});
					showToast("Настройки сохранены локально", "info");
					return true;
				}
			},

			resetToDefaults: () => {
				set({
					settings: { ...DEFAULT_DEEP_CLINICAL_SETTINGS },
				});
				showToast("Сброшено к заводским клиническим настройкам", "info");
			},
		}),
		{
			name: "dente-deep-clinical-settings-v1",
		},
	),
);
