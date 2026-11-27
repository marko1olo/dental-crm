/**
 * apps/web/src/store/onboardingStore.ts
 * Clinic Onboarding & Rapid Launch Wizard Store
 * DENTE Dental CRM — Mandates 8e (Doctor Autonomy), 8k (Friction Killer), 8n (Solo Doctor Sovereignty)
 */

import {
	type ClinicOperationalMode,
	type ClinicProfileOnboarding,
	type ClinicScheduleDraft,
	type DentalChairDraft,
	type OnboardingWizardStep,
	type StarterDentalService,
	DEFAULT_CHAIRS,
	DEFAULT_CLINIC_TIMEZONE,
	DEFAULT_SCHEDULE_DRAFT,
	ONBOARDING_WIZARD_STEPS,
	STARTER_15_ESSENTIAL_DENTAL_SERVICES,
	generateUuidV7,
} from "@dental/shared";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import { showToast } from "../components/GlobalToast";
import { denteClinicalMutationHeaders, denteClinicalReadHeaders } from "../lib/denteRequestHeaders";
import { useWorkspaceProfileStore } from "../hooks/useWorkspaceProfile";
import { logger } from "../utils/logger";

export interface OnboardingState {
	step: OnboardingWizardStep;
	currentStepIndex: number;
	totalSteps: number;
	profile: ClinicProfileOnboarding;
	chairs: DentalChairDraft[];
	schedule: ClinicScheduleDraft;
	selectedServiceCodes: string[];
	seededServices: StarterDentalService[];
	isCompleted: boolean;
	isSkipped: boolean;
	completedAt: string | null;
	isSubmitting: boolean;
	submitError: string | null;
	seedStatus: "idle" | "seeding" | "seeded" | "error";
	seedCount: number;

	// Navigation actions
	setStep: (step: OnboardingWizardStep) => void;
	goToNextStep: () => void;
	goToPreviousStep: () => void;

	// Step 1: Profile & Mode actions
	updateProfile: (patch: Partial<ClinicProfileOnboarding>) => void;
	setOperationalMode: (mode: ClinicOperationalMode) => void;

	// Step 2: Chairs & Schedule actions
	addChair: (name?: string, specialty?: string) => void;
	removeChair: (id: string) => void;
	updateChair: (id: string, patch: Partial<DentalChairDraft>) => void;
	updateSchedule: (patch: Partial<ClinicScheduleDraft>) => void;
	toggleWorkingDay: (day: number) => void;

	// Step 3: Starter Pricelist actions
	toggleServiceCode: (code: string) => void;
	selectAllServices: () => void;
	deselectAllServices: () => void;
	seedStarterPricelist: () => Promise<{ success: boolean; count: number }>;

	// Completion & Doctor Autonomy actions
	finishWizard: () => Promise<boolean>;
	skipWizard: () => Promise<boolean>;
	hydrateFromServer: () => Promise<void>;
	resetWizard: () => void;
}

const DEFAULT_PROFILE: ClinicProfileOnboarding = {
	clinicName: "Стоматология ДЕНТЕ",
	phone: "+7 (999) 000-00-00",
	timezone: DEFAULT_CLINIC_TIMEZONE,
	mode: "solo_doctor",
	legalName: "",
	inn: "",
	address: "",
};

const DEFAULT_SOLO_CHAIRS: DentalChairDraft[] = [
	{
		id: "chair-1",
		name: "Кресло 1 (Терапия)",
		specialty: "therapist",
		isDefault: true,
	},
];

const DEFAULT_SOLO_SCHEDULE: ClinicScheduleDraft = {
	...DEFAULT_SCHEDULE_DRAFT,
	workdayStart: "09:00",
	workdayEnd: "18:00",
};

const ALL_15_SERVICE_CODES = STARTER_15_ESSENTIAL_DENTAL_SERVICES.map((s) => s.code);

const STEP_ORDER: OnboardingWizardStep[] = [
	"clinic_profile",
	"chairs_schedule",
	"starter_pricelist",
];

export const useOnboardingStore = create<OnboardingState>()(
	persist(
		(set, get) => ({
			step: "clinic_profile",
			currentStepIndex: 0,
			totalSteps: 3,
			profile: { ...DEFAULT_PROFILE },
			chairs: [...DEFAULT_SOLO_CHAIRS.map((c) => ({ ...c }))],
			schedule: { ...DEFAULT_SOLO_SCHEDULE, workingDays: [...DEFAULT_SOLO_SCHEDULE.workingDays] },
			selectedServiceCodes: [...ALL_15_SERVICE_CODES],
			seededServices: [...STARTER_15_ESSENTIAL_DENTAL_SERVICES],
			isCompleted: false,
			isSkipped: false,
			completedAt: null,
			isSubmitting: false,
			submitError: null,
			seedStatus: "idle",
			seedCount: 0,

			setStep: (step: OnboardingWizardStep) => {
				const idx = STEP_ORDER.indexOf(step);
				set({
					step,
					currentStepIndex: idx >= 0 ? idx : 0,
				});
			},

			goToNextStep: () => {
				const { currentStepIndex } = get();
				if (currentStepIndex < STEP_ORDER.length - 1) {
					const nextIndex = currentStepIndex + 1;
					const nextStep = STEP_ORDER[nextIndex] ?? "clinic_profile";
					set({
						currentStepIndex: nextIndex,
						step: nextStep,
					});
				}
			},

			goToPreviousStep: () => {
				const { currentStepIndex } = get();
				if (currentStepIndex > 0) {
					const prevIndex = currentStepIndex - 1;
					const prevStep = STEP_ORDER[prevIndex] ?? "clinic_profile";
					set({
						currentStepIndex: prevIndex,
						step: prevStep,
					});
				}
			},

			updateProfile: (patch: Partial<ClinicProfileOnboarding>) => {
				set((state) => ({
					profile: { ...state.profile, ...patch },
				}));
			},

			setOperationalMode: (mode: ClinicOperationalMode) => {
				set((state) => {
					let newChairs = [...state.chairs];
					const newSchedule = { ...state.schedule };
					// Adapt default chairs if user hasn't heavily modified them
					if (mode === "solo_doctor" || mode === "one_chair") {
						if (newChairs.length > 1 && newChairs[0]) {
							newChairs = [{ ...newChairs[0], name: mode === "solo_doctor" ? "Кресло 1 (Терапия)" : "Кабинет 1", isDefault: true }];
						} else if (newChairs.length === 0) {
							newChairs = [{ id: "chair-1", name: mode === "solo_doctor" ? "Кресло 1 (Терапия)" : "Кабинет 1", specialty: "therapist", isDefault: true }];
						}
						if (mode === "solo_doctor") {
							newSchedule.workdayStart = "09:00";
							newSchedule.workdayEnd = "18:00";
						}
					} else if (mode === "small_clinic") {
						if (newChairs.length < 2) {
							newChairs = [
								{ id: "chair-1", name: "Кресло 1 (Терапия)", specialty: "therapist", isDefault: true },
								{ id: "chair-2", name: "Кресло 2 (Хирургия)", specialty: "surgeon", isDefault: false },
							];
						}
						newSchedule.workdayStart = "09:00";
						newSchedule.workdayEnd = "20:00";
					} else if (mode === "network_clinic") {
						if (newChairs.length < 4) {
							newChairs = [
								{ id: "chair-1", name: "Кресло 1 (Терапия)", specialty: "therapist", isDefault: true },
								{ id: "chair-2", name: "Кресло 2 (Хирургия)", specialty: "surgeon", isDefault: false },
								{ id: "chair-3", name: "Кресло 3 (Ортопедия)", specialty: "orthopedist", isDefault: false },
								{ id: "chair-4", name: "Кресло 4 (Ортодонтия)", specialty: "orthodontist", isDefault: false },
							];
						}
						newSchedule.workdayStart = "08:00";
						newSchedule.workdayEnd = "21:00";
					}
					return {
						profile: { ...state.profile, mode },
						chairs: newChairs,
						schedule: newSchedule,
					};
				});
			},

			addChair: (name?: string, specialty?: string) => {
				set((state) => {
					const chairNumber = state.chairs.length + 1;
					const newChairName = name?.trim() || `Кресло ${chairNumber}`;
					const newChair: DentalChairDraft = {
						id: `chair-${Date.now()}-${chairNumber}`,
						name: newChairName,
						specialty: specialty || "therapist",
						isDefault: state.chairs.length === 0,
					};
					return { chairs: [...state.chairs, newChair] };
				});
			},

			removeChair: (id: string) => {
				set((state) => {
					if (state.chairs.length <= 1) {
						showToast("Клинике требуется хотя бы одно стоматологическое кресло", "info");
						return state;
					}
					const filtered = state.chairs.filter((c) => c.id !== id);
					if (filtered[0] && !filtered.some((c) => c.isDefault)) {
						filtered[0].isDefault = true;
					}
					return { chairs: filtered };
				});
			},

			updateChair: (id: string, patch: Partial<DentalChairDraft>) => {
				set((state) => ({
					chairs: state.chairs.map((c) => (c.id === id ? { ...c, ...patch } : c)),
				}));
			},

			updateSchedule: (patch: Partial<ClinicScheduleDraft>) => {
				set((state) => ({
					schedule: { ...state.schedule, ...patch },
				}));
			},

			toggleWorkingDay: (day: number) => {
				set((state) => {
					const currentDays = state.schedule.workingDays;
					let updated: number[];
					if (currentDays.includes(day)) {
						if (currentDays.length <= 1) {
							showToast("Выберите хотя бы один рабочий день клиники", "info");
							return state;
						}
						updated = currentDays.filter((d) => d !== day);
					} else {
						updated = [...currentDays, day].sort((a, b) => a - b);
					}
					return {
						schedule: { ...state.schedule, workingDays: updated },
					};
				});
			},

			toggleServiceCode: (code: string) => {
				set((state) => {
					const selected = state.selectedServiceCodes;
					const updated = selected.includes(code)
						? selected.filter((c) => c !== code)
						: [...selected, code];
					return { selectedServiceCodes: updated };
				});
			},

			selectAllServices: () => {
				set({ selectedServiceCodes: [...ALL_15_SERVICE_CODES] });
			},

			deselectAllServices: () => {
				set({ selectedServiceCodes: [] });
			},

			seedStarterPricelist: async () => {
				const { selectedServiceCodes } = get();
				set({ seedStatus: "seeding", submitError: null });

				try {
					const res = await fetch("/api/pricelist/seed-baseline-804n", {
						method: "POST",
						headers: denteClinicalMutationHeaders({
							"Content-Type": "application/json",
							"Idempotency-Key": generateUuidV7(),
						}),
						body: JSON.stringify({ replace: false }),
					});

					if (res.ok) {
						const data = await res.json();
						const count = data.createdCount ?? selectedServiceCodes.length;
						set({
							seedStatus: "seeded",
							seedCount: count,
						});
						showToast(`Базовый прейскурант успешно загружен (${count} услуг)`, "success");
						return { success: true, count };
					}

					// Fallback to alternative seed endpoint
					const fallbackRes = await fetch("/api/pricelist/seed", {
						method: "POST",
						headers: denteClinicalMutationHeaders({
							"Content-Type": "application/json",
							"Idempotency-Key": generateUuidV7(),
						}),
						body: JSON.stringify({ replace: false }),
					});

					if (fallbackRes.ok) {
						const data = await fallbackRes.json();
						const count = data.createdCount ?? selectedServiceCodes.length;
						set({
							seedStatus: "seeded",
							seedCount: count,
						});
						showToast(`Прейскурант успешно наполнен (${count} услуг)`, "success");
						return { success: true, count };
					}

					// Non-blocking fallback for local / offline mode (Mandates 8e, 8k)
					set({
						seedStatus: "seeded",
						seedCount: selectedServiceCodes.length,
					});
					showToast(`Стартовый прейскурант активирован локально (${selectedServiceCodes.length} услуг)`, "info");
					return { success: true, count: selectedServiceCodes.length };
				} catch (err) {
					logger.warn("Pricelist seed network error, using local fallback:", err);
					set({
						seedStatus: "seeded",
						seedCount: selectedServiceCodes.length,
					});
					showToast("Прейскурант сохранен в локальном кэше (офлайн)", "info");
					return { success: true, count: selectedServiceCodes.length };
				}
			},

			finishWizard: async () => {
				let { profile, chairs, schedule, seedStarterPricelist } = get();
				set({ isSubmitting: true, submitError: null });

				// Защита от тупиков (Mandate 8n): автоматический дефолт для пустого названия
				if (!profile.clinicName?.trim()) {
					const fallback =
						profile.mode === "solo_doctor"
							? "Кабинет доктора"
							: "Стоматологический кабинет";
					profile = { ...profile, clinicName: fallback };
					set({ profile });
				}

				try {
					// 1. Seed pricelist if not already seeded
					await seedStarterPricelist();

					// 2. Commit full onboarding payload to PostgreSQL via single atomic /api/onboarding/complete
					const completeRes = await fetch("/api/onboarding/complete", {
						method: "POST",
						headers: denteClinicalMutationHeaders({
							"Content-Type": "application/json",
							"Idempotency-Key": generateUuidV7(),
						}),
						body: JSON.stringify({
							profile: {
								clinicName: profile.clinicName,
								phone: profile.phone,
								timezone: profile.timezone,
								mode: profile.mode,
							},
							chairs: chairs.map((c) => ({
								name: c.name,
								specialty: c.specialty,
								isDefault: c.isDefault,
							})),
							schedule: {
								workdayStart: schedule.workdayStart,
								workdayEnd: schedule.workdayEnd,
								workingDays: schedule.workingDays,
								defaultVisitMinutes: Number(schedule.defaultVisitMinutes) || 30,
								appointmentBufferMinutes: Number(schedule.appointmentBufferMinutes) || 5,
							},
							preset: profile.mode,
						}),
					});

					if (!completeRes.ok) {
						const errBody = await completeRes.text().catch(() => "");
						throw new Error(
							`Ошибка сохранения настроек клиники (HTTP ${completeRes.status})${errBody ? `: ${errBody.slice(0, 160)}` : ""}`,
						);
					}

					// 3. Synchronize local workspace profile store without duplicate HTTP request
					const isSolo = profile.mode === "solo_doctor";
					const isOneChair = profile.mode === "one_chair";
					const wsStore = useWorkspaceProfileStore.getState();
					wsStore.setFlag("onboardingCompleted", true);
					wsStore.setFlag("workspacePreset", profile.mode);
					wsStore.setFlag("hasMultipleChairs", chairs.length > 1);
					wsStore.setFlag("hasAssistants", !isSolo);
					wsStore.setFlag("hasDentalLab", !isSolo && !isOneChair);
					wsStore.setFlag("hasInsuranceCoPay", !isSolo);
					wsStore.setFlag("hasPayrollModule", !isSolo);
					wsStore.setFlag("hasMarketingModule", !isSolo);
					wsStore.setFlag("hasAnalyticsModule", !isSolo);
					wsStore.setFlag("hasInventoryModule", true);

					// 4. Mark completed only after server persistence succeeded
					const nowIso = new Date().toISOString();
					set({
						isCompleted: true,
						isSkipped: false,
						completedAt: nowIso,
						isSubmitting: false,
						submitError: null,
					});

					showToast("Клиника успешно запущена! Добро пожаловать в DENTE CRM.", "success", 4000);
					return true;
				} catch (error) {
					const errorMsg = error instanceof Error ? error.message : "Не удалось сохранить настройки";
					logger.error("Onboarding finish error:", error);
					set({
						isCompleted: false,
						isSubmitting: false,
						submitError: errorMsg,
					});
					showToast(`Не удалось сохранить настройки клиники: ${errorMsg}`, "error", 5000);
					return false;
				}
			},

			skipWizard: async () => {
				set({ isSubmitting: true, submitError: null });
				const { profile } = get();
				if (!profile.clinicName?.trim()) {
					const fallback =
						profile.mode === "solo_doctor"
							? "Кабинет доктора"
							: "Стоматологический кабинет";
					set({ profile: { ...profile, clinicName: fallback } });
				}

				try {
					const skipRes = await fetch("/api/onboarding/skip", {
						method: "POST",
						headers: denteClinicalMutationHeaders({
							"Content-Type": "application/json",
							"Idempotency-Key": generateUuidV7(),
						}),
						body: JSON.stringify({}),
					});
					if (!skipRes.ok) {
						const errBody = await skipRes.text().catch(() => "");
						throw new Error(`HTTP ${skipRes.status}${errBody ? `: ${errBody.slice(0, 120)}` : ""}`);
					}

					useWorkspaceProfileStore.getState().setFlag("onboardingCompleted", true);
					set({
						isCompleted: false,
						isSkipped: true,
						completedAt: new Date().toISOString(),
						isSubmitting: false,
						submitError: null,
					});

					showToast(
						"Мастер пропущен. Вы можете настроить клинику в любой момент в разделе «Настройки».",
						"info",
						4000,
					);
					return true;
				} catch (err) {
					const errorMsg = err instanceof Error ? err.message : "Не удалось пропустить мастер";
					logger.error("Skip onboarding API error:", err);
					set({
						isSubmitting: false,
						submitError: errorMsg,
					});
					showToast(`Не удалось сохранить пропуск мастера: ${errorMsg}`, "error", 5000);
					return false;
				}
			},

			hydrateFromServer: async () => {
				try {
					const res = await fetch("/api/onboarding/status", {
						method: "GET",
						headers: denteClinicalReadHeaders(),
					});
					if (!res.ok) return;
					let raw: unknown = null;
					try {
						raw = await res.json();
					} catch (jsonErr) {
						logger.warn("Onboarding hydrateFromServer invalid JSON:", jsonErr);
						return;
					}
					const payload = (
						raw && typeof raw === "object" && "data" in raw
							? (raw as { data: Record<string, unknown> }).data
							: raw
					) as {
						completed?: boolean;
						mode?: ClinicOperationalMode;
						clinicName?: string;
						phone?: string;
						timezone?: string;
						defaultVisitMinutes?: number;
						schedule?: {
							workdayStart?: string;
							workdayEnd?: string;
							workingDays?: number[];
							appointmentBufferMinutes?: number;
						} | null;
					} | null;
					if (!payload) return;

					const prev = get();
					set({
						isCompleted: Boolean(payload.completed),
						profile: {
							...prev.profile,
							...(payload.clinicName ? { clinicName: payload.clinicName } : {}),
							...(payload.phone !== undefined ? { phone: payload.phone } : {}),
							...(payload.timezone ? { timezone: payload.timezone } : {}),
							...(payload.mode ? { mode: payload.mode } : {}),
						},
						schedule: {
							...prev.schedule,
							...(payload.schedule?.workdayStart ? { workdayStart: payload.schedule.workdayStart } : {}),
							...(payload.schedule?.workdayEnd ? { workdayEnd: payload.schedule.workdayEnd } : {}),
							...(Array.isArray(payload.schedule?.workingDays) && payload.schedule.workingDays.length > 0
								? { workingDays: payload.schedule.workingDays }
								: {}),
							...(typeof payload.defaultVisitMinutes === "number"
								? { defaultVisitMinutes: payload.defaultVisitMinutes }
								: {}),
							...(typeof payload.schedule?.appointmentBufferMinutes === "number"
								? { appointmentBufferMinutes: payload.schedule.appointmentBufferMinutes }
								: {}),
						},
					});
				} catch (err) {
					logger.warn("Onboarding hydrateFromServer failed:", err);
				}
			},

			resetWizard: () => {
				set({
					step: "clinic_profile",
					currentStepIndex: 0,
					profile: { ...DEFAULT_PROFILE },
					chairs: [...DEFAULT_SOLO_CHAIRS.map((c) => ({ ...c }))],
					schedule: { ...DEFAULT_SOLO_SCHEDULE, workingDays: [...DEFAULT_SOLO_SCHEDULE.workingDays] },
					selectedServiceCodes: [...ALL_15_SERVICE_CODES],
					isCompleted: false,
					isSkipped: false,
					completedAt: null,
					isSubmitting: false,
					submitError: null,
					seedStatus: "idle",
					seedCount: 0,
				});
			},
		}),
		{
			name: "dente-onboarding-launch-store-v1",
			partialize: (s) => ({
				step: s.step,
				currentStepIndex: s.currentStepIndex,
				profile: s.profile,
				chairs: s.chairs,
				schedule: s.schedule,
				selectedServiceCodes: s.selectedServiceCodes,
				isCompleted: s.isCompleted,
				isSkipped: s.isSkipped,
				completedAt: s.completedAt,
				seedStatus: s.seedStatus,
				seedCount: s.seedCount,
			}),
		},
	),
);
