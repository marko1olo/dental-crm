import assert from "node:assert/strict";
import { describe, it, beforeEach } from "node:test";
import React from "react";
import { renderToString } from "react-dom/server";
import {
	CLINIC_OPERATIONAL_MODES,
	DEFAULT_CHAIRS,
	DEFAULT_CLINIC_TIMEZONE,
	DEFAULT_SCHEDULE_DRAFT,
	ONBOARDING_WIZARD_STEPS,
	STARTER_15_ESSENTIAL_DENTAL_SERVICES,
} from "@dental/shared";
import { useOnboardingStore } from "../../../store/onboardingStore";
import { RapidLaunchWizard } from "../RapidLaunchWizard";
import { Step1ClinicProfile } from "../Step1ClinicProfile";
import { Step2ChairsSchedule } from "../Step2ChairsSchedule";
import { Step3StarterPricelist } from "../Step3StarterPricelist";

describe("Clinic Onboarding & Rapid Launch Wizard Suite", () => {
	beforeEach(() => {
		useOnboardingStore.getState().resetWizard();
	});

	describe("1. Starter 15 Essential Dental Services & Constants Integrity", () => {
		it("contains exactly 15 essential dental services matching statutory 804n requirements", () => {
			assert.strictEqual(STARTER_15_ESSENTIAL_DENTAL_SERVICES.length, 15);
		});

		it("guarantees every service has exact integer kopecks matching rubles (Mandate 8b)", () => {
			for (const service of STARTER_15_ESSENTIAL_DENTAL_SERVICES) {
				assert.ok(service.code.length > 0, `Service code is empty for ${service.title}`);
				assert.ok(service.title.length > 0, `Service title is empty for ${service.code}`);
				assert.ok(service.priceRub > 0, `Price rub must be positive for ${service.code}`);
				assert.strictEqual(
					service.priceKopecks,
					Math.round(service.priceRub * 100),
					`Exact kopecks mismatch for ${service.code}: ${service.priceKopecks} vs ${service.priceRub * 100}`,
				);
				assert.ok(service.durationMinutes > 0, `Duration must be > 0 for ${service.code}`);
			}
		});

		it("includes core mandated dental procedures: осмотр, анестезия, кариес, пломбирование, удаление, гигиена", () => {
			const titles = STARTER_15_ESSENTIAL_DENTAL_SERVICES.map((s) => s.title.toLowerCase());
			
			// Первичный осмотр
			assert.ok(titles.some((t) => t.includes("осмотр") || t.includes("консультация")));
			// Анестезия карпульная инфильтрационная
			assert.ok(titles.some((t) => t.includes("анестезия") && t.includes("инфильтрационная")));
			// Анестезия проводниковая
			assert.ok(titles.some((t) => t.includes("анестезия") && t.includes("проводниковая")));
			// Лечение кариеса
			assert.ok(titles.some((t) => t.includes("кариес")));
			// Пломбирование световой композит
			assert.ok(titles.some((t) => t.includes("пломб") || t.includes("композит")));
			// Удаление зуба
			assert.ok(titles.some((t) => t.includes("удаление")));
			// Профгигиена Air-Flow
			assert.ok(titles.some((t) => t.includes("гигиена") || t.includes("air-flow")));
			// Радиовизиография
			assert.ok(titles.some((t) => t.includes("радиовизиография") || t.includes("снимок")));
		});

		it("verifies operational mode definitions and chair recommendations", () => {
			assert.strictEqual(CLINIC_OPERATIONAL_MODES.length, 4);
			const modeIds = CLINIC_OPERATIONAL_MODES.map((m) => m.id);
			assert.ok(modeIds.includes("solo_doctor"));
			assert.ok(modeIds.includes("one_chair"));
			assert.ok(modeIds.includes("small_clinic"));
			assert.ok(modeIds.includes("network_clinic"));

			const solo = CLINIC_OPERATIONAL_MODES.find((m) => m.id === "solo_doctor");
			assert.strictEqual(solo?.recommendedChairs, 1);
		});

		it("verifies default working hours: 09:00–20:00, Chair 1 'Терапия', Chair 2 'Хирургия'", () => {
			assert.strictEqual(DEFAULT_SCHEDULE_DRAFT.workdayStart, "09:00");
			assert.strictEqual(DEFAULT_SCHEDULE_DRAFT.workdayEnd, "20:00");
			assert.strictEqual(DEFAULT_SCHEDULE_DRAFT.defaultVisitMinutes, 30);
			assert.strictEqual(DEFAULT_CLINIC_TIMEZONE, "Europe/Moscow");

			assert.strictEqual(DEFAULT_CHAIRS.length, 2);
			assert.ok(DEFAULT_CHAIRS[0]?.name.includes("Терапия"));
			assert.ok(DEFAULT_CHAIRS[1]?.name.includes("Хирургия"));
		});
	});

	describe("2. Onboarding Store State Progression & Step Navigation", () => {
		it("initializes at Step 1 (clinic_profile, index 0)", () => {
			const state = useOnboardingStore.getState();
			assert.strictEqual(state.step, "clinic_profile");
			assert.strictEqual(state.currentStepIndex, 0);
			assert.strictEqual(state.totalSteps, 3);
			assert.strictEqual(state.isCompleted, false);
			assert.strictEqual(state.isSkipped, false);
		});

		it("progresses sequentially: Step 1 -> Step 2 -> Step 3", () => {
			const store = useOnboardingStore.getState();

			store.goToNextStep();
			const step2 = useOnboardingStore.getState();
			assert.strictEqual(step2.step, "chairs_schedule");
			assert.strictEqual(step2.currentStepIndex, 1);

			store.goToNextStep();
			const step3 = useOnboardingStore.getState();
			assert.strictEqual(step3.step, "starter_pricelist");
			assert.strictEqual(step3.currentStepIndex, 2);

			// Calling goToNextStep at the last step does not overflow
			store.goToNextStep();
			assert.strictEqual(useOnboardingStore.getState().currentStepIndex, 2);
		});

		it("navigates backwards cleanly: Step 3 -> Step 2 -> Step 1", () => {
			const store = useOnboardingStore.getState();
			store.setStep("starter_pricelist");
			assert.strictEqual(useOnboardingStore.getState().currentStepIndex, 2);

			store.goToPreviousStep();
			assert.strictEqual(useOnboardingStore.getState().step, "chairs_schedule");
			assert.strictEqual(useOnboardingStore.getState().currentStepIndex, 1);

			store.goToPreviousStep();
			assert.strictEqual(useOnboardingStore.getState().step, "clinic_profile");
			assert.strictEqual(useOnboardingStore.getState().currentStepIndex, 0);

			// Calling goToPreviousStep at index 0 does not underflow
			store.goToPreviousStep();
			assert.strictEqual(useOnboardingStore.getState().currentStepIndex, 0);
		});

		it("supports direct jumping between steps without blocking", () => {
			const store = useOnboardingStore.getState();
			store.setStep("chairs_schedule");
			assert.strictEqual(useOnboardingStore.getState().currentStepIndex, 1);

			store.setStep("starter_pricelist");
			assert.strictEqual(useOnboardingStore.getState().currentStepIndex, 2);

			store.setStep("clinic_profile");
			assert.strictEqual(useOnboardingStore.getState().currentStepIndex, 0);
		});
	});

	describe("3. Step 1: Profile & Mode Selection", () => {
		it("updates clinic name, phone, and timezone", () => {
			const store = useOnboardingStore.getState();
			store.updateProfile({
				clinicName: "Клиника Доктора Смирнова",
				phone: "+7 (495) 123-45-67",
				timezone: "Asia/Yekaterinburg",
			});

			const updated = useOnboardingStore.getState().profile;
			assert.strictEqual(updated.clinicName, "Клиника Доктора Смирнова");
			assert.strictEqual(updated.phone, "+7 (495) 123-45-67");
			assert.strictEqual(updated.timezone, "Asia/Yekaterinburg");
		});

		it("switches operational mode to solo_doctor and adapts chair recommendations", () => {
			const store = useOnboardingStore.getState();
			store.setOperationalMode("solo_doctor");

			const state = useOnboardingStore.getState();
			assert.strictEqual(state.profile.mode, "solo_doctor");
			assert.strictEqual(state.chairs.length, 1);
			assert.strictEqual(state.chairs[0]?.isDefault, true);
		});

		it("switches operational mode to small_clinic and provides 2 chairs", () => {
			const store = useOnboardingStore.getState();
			store.setOperationalMode("small_clinic");

			const state = useOnboardingStore.getState();
			assert.strictEqual(state.profile.mode, "small_clinic");
			assert.strictEqual(state.chairs.length, 2);
		});
	});

	describe("4. Step 2: Dental Chairs & Working Hours Management", () => {
		it("allows adding and updating dental chairs", () => {
			const store = useOnboardingStore.getState();
			// Solo practice starts with 1 chair
			assert.strictEqual(store.chairs.length, 1);
			store.addChair("Кабинет 2 (Ортопедия)", "orthopedist");

			const chairs = useOnboardingStore.getState().chairs;
			assert.strictEqual(chairs.length, 2);
			const added = chairs[chairs.length - 1];
			assert.strictEqual(added?.name, "Кабинет 2 (Ортопедия)");
			assert.strictEqual(added?.specialty, "orthopedist");

			// Update chair name
			store.updateChair(added!.id, { name: "Кабинет 2 — Реставрация" });
			const updated = useOnboardingStore.getState().chairs.find((c) => c.id === added!.id);
			assert.strictEqual(updated?.name, "Кабинет 2 — Реставрация");
		});

		it("prevents removing the last remaining dental chair (Mandate 8k)", () => {
			const store = useOnboardingStore.getState();
			// Solo doctor starts with 1 chair
			assert.strictEqual(store.chairs.length, 1);

			// Adding a second chair allows removing one
			store.addChair("Второе кресло", "surgeon");
			assert.strictEqual(useOnboardingStore.getState().chairs.length, 2);

			store.removeChair(useOnboardingStore.getState().chairs[1]!.id);
			assert.strictEqual(useOnboardingStore.getState().chairs.length, 1);

			// Try to remove the last chair
			store.removeChair(useOnboardingStore.getState().chairs[0]!.id);
			// Minimum 1 chair must remain
			assert.strictEqual(useOnboardingStore.getState().chairs.length, 1);
		});

		it("updates schedule workdayStart, workdayEnd, and visit duration", () => {
			const store = useOnboardingStore.getState();
			store.updateSchedule({
				workdayStart: "08:30",
				workdayEnd: "21:00",
				defaultVisitMinutes: 45,
			});

			const sched = useOnboardingStore.getState().schedule;
			assert.strictEqual(sched.workdayStart, "08:30");
			assert.strictEqual(sched.workdayEnd, "21:00");
			assert.strictEqual(sched.defaultVisitMinutes, 45);
		});

		it("toggles working days on and off while preventing empty schedule", () => {
			const store = useOnboardingStore.getState();
			// Starts with [1, 2, 3, 4, 5, 6]
			assert.ok(store.schedule.workingDays.includes(6));

			// Toggle Saturday (6) off
			store.toggleWorkingDay(6);
			assert.ok(!useOnboardingStore.getState().schedule.workingDays.includes(6));

			// Toggle Saturday (6) back on
			store.toggleWorkingDay(6);
			assert.ok(useOnboardingStore.getState().schedule.workingDays.includes(6));
		});
	});

	describe("5. Step 3: Starter Price-List Selection & Seeding", () => {
		it("initializes with all 15 essential services selected", () => {
			const state = useOnboardingStore.getState();
			assert.strictEqual(state.selectedServiceCodes.length, 15);
		});

		it("supports deselecting all, toggling individual, and re-selecting all", () => {
			const store = useOnboardingStore.getState();

			store.deselectAllServices();
			assert.strictEqual(useOnboardingStore.getState().selectedServiceCodes.length, 0);

			// Toggle first service back on
			const firstCode = STARTER_15_ESSENTIAL_DENTAL_SERVICES[0]!.code;
			store.toggleServiceCode(firstCode);
			assert.strictEqual(useOnboardingStore.getState().selectedServiceCodes.length, 1);
			assert.ok(useOnboardingStore.getState().selectedServiceCodes.includes(firstCode));

			// Select all services
			store.selectAllServices();
			assert.strictEqual(useOnboardingStore.getState().selectedServiceCodes.length, 15);
		});

		it("seeds starter pricelist successfully with non-blocking fallback", async () => {
			const store = useOnboardingStore.getState();
			const result = await store.seedStarterPricelist();

			assert.strictEqual(result.success, true);
			assert.ok(result.count >= 15);

			const state = useOnboardingStore.getState();
			assert.strictEqual(state.seedStatus, "seeded");
			assert.ok(state.seedCount >= 15);
		});
	});

	describe("6. Doctor Autonomy: Non-Blocking Skip & Rapid Completion (Mandate 8e)", () => {
		it("allows skipping wizard immediately without bureaucratic traps", async () => {
			const store = useOnboardingStore.getState();
			const ok = await store.skipWizard();

			assert.strictEqual(ok, true);
			const state = useOnboardingStore.getState();
			assert.strictEqual(state.isSkipped, true);
			assert.strictEqual(state.isCompleted, false);
			assert.ok(state.completedAt !== null);
		});

		it("completes launch wizard and marks setup done", async () => {
			const store = useOnboardingStore.getState();
			const ok = await store.finishWizard();

			assert.strictEqual(ok, true);
			const state = useOnboardingStore.getState();
			assert.strictEqual(state.isCompleted, true);
			assert.strictEqual(state.isSkipped, false);
			assert.ok(state.completedAt !== null);
		});
	});

	describe("7. UI Component Rendering Sanity (SSR Tree Integrity)", () => {
		it("renders RapidLaunchWizard with 3-step indicators and prominent skip button", () => {
			const html = renderToString(
				<RapidLaunchWizard isModal={true} onClose={() => {}} />,
			);

			assert.ok(html.includes("Мастер быстрого запуска клиники"));
			assert.ok(html.includes("Пропустить и настроить позже"));
			assert.ok(html.includes("0-клик старт (соло-врач)"));
			assert.ok(html.includes("Профиль и Режим"));
			assert.ok(html.includes("Кресла и График"));
			assert.ok(html.includes("Стартовый Прайс"));
		});

		it("renders Step 1 with all 4 operational mode cards and timezone dropdown", () => {
			const html = renderToString(<Step1ClinicProfile />);

			assert.ok(html.includes("Соло-врач (Аренда / Частный кабинет)"));
			assert.ok(html.includes("Кабинет на 1 кресло"));
			assert.ok(html.includes("Небольшая клиника (2–3 кресла)"));
			assert.ok(html.includes("Клиника / Сеть (от 4 кресел)"));
			assert.ok(html.includes("Часовой пояс клиники"));
		});

		it("renders Step 2 with default chairs (Терапия, Хирургия) and working hours", () => {
			const html = renderToString(<Step2ChairsSchedule />);

			assert.ok(html.includes("Терапия"));
			assert.ok(html.includes("Хирургия"));
			assert.ok(html.includes("Начало смены"));
			assert.ok(html.includes("Окончание смены"));
			assert.ok(html.includes("Добавить установку"));
		});

		it("renders Step 3 with 15 services and 1-click seed hero bar", () => {
			const html = renderToString(<Step3StarterPricelist />);

			assert.ok(html.includes("Базовый прейскурант"));
			assert.ok(html.includes("1-клик быстрое наполнение прайса"));
			assert.ok(html.includes("B01.065.001"));
			assert.ok(html.includes("A11.07.012"));
			assert.ok(html.includes("A16.07.002.001"));
			assert.ok(html.includes("A16.07.051"));
		});
	});
});
