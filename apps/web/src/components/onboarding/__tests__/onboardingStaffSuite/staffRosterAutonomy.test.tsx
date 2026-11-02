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

describe("Onboarding & Settings Staff Roster Autonomy (Mandate 8e)", () => {
	it("1. Staff add button in onboarding and settings is NOT disabled when staff name is empty (disabled === false)", () => {
		// Onboarding check
		const onboardingProps = createTestOnboardingProps({
			newStaffName: "",
			newStaffReadyToCreate: false,
		});
		const onboardingTree = OnboardingWizardModal(onboardingProps);
		const onboardingStaffBtn = findElement(
			onboardingTree,
			(n) =>
				n?.type === "button" &&
				Array.isArray(n?.props?.children) &&
				n.props.children.some(
					(c: any) =>
						typeof c === "string" && c.includes("Добавить сотрудника"),
				),
		);
		expect(onboardingStaffBtn).not.toBeNull();
		expect(onboardingStaffBtn.props.disabled).toBe(false);

		// Settings check via SSR markup
		const settingsProps = createTestSettingsProps({
			newStaffName: "",
			newStaffReadyToCreate: false,
			newStaffRole: "doctor",
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
		assert.ok(settingsHtml.includes('aria-label="Добавить сотрудника"'));
		assert.ok(!settingsHtml.includes('aria-label="Добавить сотрудника" disabled'));
	});

	it("2. Executing addStaffMember with empty name auto-populates safe default and does not block", () => {
		// Onboarding staff creation with empty name
		const setOnboardingStaffName = vi.fn();
		const addOnboardingStaff = vi.fn();
		const onboardingProps = createTestOnboardingProps({
			newStaffName: "",
			newStaffRole: "doctor",
			setNewStaffName: setOnboardingStaffName,
			addStaffMember: addOnboardingStaff,
		});
		const onboardingTree = OnboardingWizardModal(onboardingProps);
		const onboardingStaffBtn = findElement(
			onboardingTree,
			(n) =>
				n?.type === "button" &&
				Array.isArray(n?.props?.children) &&
				n.props.children.some(
					(c: any) =>
						typeof c === "string" && c.includes("Добавить сотрудника"),
				),
		);
		onboardingStaffBtn.props.onClick();
		expect(setOnboardingStaffName).toHaveBeenCalledWith("Врач-терапевт");
		expect(addOnboardingStaff).toHaveBeenCalledWith("doctor", "Врач-терапевт");
	});

	it("3. Staff touch targets meet Apple HIG >= 44px (minHeight >= 44px)", () => {
		const onboardingProps = createTestOnboardingProps();
		const onboardingTree = OnboardingWizardModal(onboardingProps);
		const onboardingStaffBtn = findElement(
			onboardingTree,
			(n) =>
				n?.type === "button" &&
				Array.isArray(n?.props?.children) &&
				n.props.children.some(
					(c: any) =>
						typeof c === "string" && c.includes("Добавить сотрудника"),
				),
		);

		expect(onboardingStaffBtn).not.toBeNull();
		expect(
			parseInt(onboardingStaffBtn.props.style?.minHeight, 10),
		).toBeGreaterThanOrEqual(44);

		// Settings buttons via SSR markup
		const settingsProps = createTestSettingsProps({
			newStaffName: "",
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

	it("4. Adding assistant or administrator with empty name auto-generates role-appropriate label without blocking", () => {
		const setOnboardingStaffName = vi.fn();
		const addOnboardingStaff = vi.fn();
		const onboardingProps = createTestOnboardingProps({
			newStaffName: "",
			newStaffRole: "assistant",
			setNewStaffName: setOnboardingStaffName,
			addStaffMember: addOnboardingStaff,
		});
		const onboardingTree = OnboardingWizardModal(onboardingProps);
		const onboardingStaffBtn = findElement(
			onboardingTree,
			(n) =>
				n?.type === "button" &&
				Array.isArray(n?.props?.children) &&
				n.props.children.some(
					(c: any) =>
						typeof c === "string" && c.includes("Добавить сотрудника"),
				),
		);
		onboardingStaffBtn.props.onClick();
		expect(setOnboardingStaffName).toHaveBeenCalledWith("Ассистент");
		expect(addOnboardingStaff).toHaveBeenCalledWith("assistant", "Ассистент");
	});
});
