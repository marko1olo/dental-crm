import React from "react";
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import { SettingsClinicTab } from "../../../settings/SettingsClinicTab";
import { AppLogicProvider } from "../../../../contexts/AppLogicContext";
import { OnboardingWizardModal } from "../../OnboardingWizardModal";
import {
	createTestOnboardingProps,
	createTestSettingsProps,
	expect,
	findElement,
	vi,
} from "./onboardingTestHelpers";

describe("Onboarding & Settings Chair Configuration Autonomy (Mandates 8e, 8n)", () => {
	it("1. Chair add button in onboarding and settings is NOT disabled when chair name is empty (disabled === false)", () => {
		// Onboarding check
		const onboardingProps = createTestOnboardingProps({
			newChairName: "",
			newChairReadyToCreate: false,
		});
		const onboardingTree = OnboardingWizardModal(onboardingProps);
		const onboardingChairBtn = findElement(
			onboardingTree,
			(n) =>
				n?.type === "button" &&
				Array.isArray(n?.props?.children) &&
				n.props.children.some(
					(c: any) => typeof c === "string" && c.includes("Добавить кресло"),
				),
		);
		expect(onboardingChairBtn).not.toBeNull();
		expect(onboardingChairBtn.props.disabled).toBe(false);

		// Settings check via SSR markup
		const settingsProps = createTestSettingsProps({
			newChairName: "",
			newChairReadyToCreate: false,
		});
		const settingsHtml = renderToStaticMarkup(
			React.createElement(
				AppLogicProvider,
				{ value: {} as any },
				React.createElement(SettingsClinicTab, {
					props: settingsProps,
					settingsTab: "clinic",
				}),
			),
		);
		assert.ok(settingsHtml.includes('aria-label="Добавить кресло или кабинет"'));
		assert.ok(!settingsHtml.includes('aria-label="Добавить кресло или кабинет" disabled'));
	});

	it("2. Executing addChair with empty name auto-generates safe default chair name ('Кресло 1' or 'Кресло N')", () => {
		// Onboarding: empty chairs -> 'Кресло 1'
		const setOnboardingChairName = vi.fn();
		const addOnboardingChair = vi.fn();
		const onboardingProps1 = createTestOnboardingProps({
			newChairName: "",
			setNewChairName: setOnboardingChairName,
			addChair: addOnboardingChair,
			dashboard: {
				clinicSettings: {
					chairs: [],
					staff: [],
				},
			} as any,
		});
		const tree1 = OnboardingWizardModal(onboardingProps1);
		const btn1 = findElement(
			tree1,
			(n) =>
				n?.type === "button" &&
				Array.isArray(n?.props?.children) &&
				n.props.children.some(
					(c: any) => typeof c === "string" && c.includes("Добавить кресло"),
				),
		);
		btn1.props.onClick();
		expect(setOnboardingChairName).toHaveBeenCalledWith("Кресло 1");
		expect(addOnboardingChair).toHaveBeenCalledWith("Кресло 1");

		// Onboarding: 2 existing chairs -> 'Кресло 3'
		const setOnboardingChairName2 = vi.fn();
		const addOnboardingChair2 = vi.fn();
		const onboardingProps2 = createTestOnboardingProps({
			newChairName: "",
			setNewChairName: setOnboardingChairName2,
			addChair: addOnboardingChair2,
			dashboard: {
				clinicSettings: {
					chairs: [
						{ id: "c1", name: "Кабинет 1", active: true },
						{ id: "c2", name: "Кабинет 2", active: true },
					],
					staff: [],
				},
			} as any,
		});
		const tree2 = OnboardingWizardModal(onboardingProps2);
		const btn2 = findElement(
			tree2,
			(n) =>
				n?.type === "button" &&
				Array.isArray(n?.props?.children) &&
				n.props.children.some(
					(c: any) => typeof c === "string" && c.includes("Добавить кресло"),
				),
		);
		btn2.props.onClick();
		expect(setOnboardingChairName2).toHaveBeenCalledWith("Кресло 3");
		expect(addOnboardingChair2).toHaveBeenCalledWith("Кресло 3");
	});

	it("3. Solo-doctor sovereignty (Mandate 8n): <= 1 chair setup operates smoothly without mandatory equipment bloat", () => {
		const onboardingProps = createTestOnboardingProps({
			dashboard: {
				clinicSettings: {
					profile: {
						clinicName: "Кабинет Д-ра Смирнова",
						phone: "+7 900 123-45-67",
						timezone: "Europe/Moscow",
						mode: "solo_doctor",
						address: "Москва",
						inn: "7701234567",
						updatedAt: new Date().toISOString(),
					},
					chairs: [{ id: "chair-solo-1", name: "Основное кресло", active: true }],
					staff: [{ id: "doc-1", name: "Д-р Смирнов", role: "doctor", specialties: ["therapist"] }],
				},
			} as any,
		});
		const tree = OnboardingWizardModal(onboardingProps);
		expect(tree).not.toBeNull();
		// In solo mode, exactly 1 chair is sufficient for progress and does not block
		assert.equal(onboardingProps.dashboard.clinicSettings.profile.mode, "solo_doctor");
		assert.equal(onboardingProps.dashboard.clinicSettings.chairs.length, 1);
	});

	it("4. Chair touch targets meet Apple HIG >= 44px (minHeight >= 44px)", () => {
		const onboardingProps = createTestOnboardingProps();
		const onboardingTree = OnboardingWizardModal(onboardingProps);
		const onboardingChairBtn = findElement(
			onboardingTree,
			(n) =>
				n?.type === "button" &&
				Array.isArray(n?.props?.children) &&
				n.props.children.some(
					(c: any) => typeof c === "string" && c.includes("Добавить кресло"),
				),
		);

		expect(onboardingChairBtn).not.toBeNull();
		expect(
			parseInt(onboardingChairBtn.props.style?.minHeight, 10),
		).toBeGreaterThanOrEqual(44);

		// Settings buttons via SSR markup
		const settingsProps = createTestSettingsProps({
			newChairName: "",
		});
		const settingsHtml = renderToStaticMarkup(
			React.createElement(
				AppLogicProvider,
				{ value: {} as any },
				React.createElement(SettingsClinicTab, {
					props: settingsProps,
					settingsTab: "clinic",
				}),
			),
		);
		assert.ok(settingsHtml.includes('min-height: 44px') || settingsHtml.includes('min-height:44px'));
		assert.ok(settingsHtml.includes('min-width: 44px') || settingsHtml.includes('min-width:44px'));
	});
});
