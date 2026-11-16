import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import type { Patient } from "@dental/shared";
import { PatientFamilyAndInsuranceWidget } from "../PatientFamilyAndInsuranceWidget";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const patientsDir = path.resolve(__dirname, "..");

describe("Red Team Inquisitor: Family Deposit & Representatives", () => {
	const mockPatient: Patient = {
		id: "pat-1",
		organizationId: "org-1",
		fullName: "Иванов Иван Иванович",
		phone: "+7 (999) 111-22-33",
		birthDate: "1985-05-12",
		gender: "male",
		status: "active",
		notes: null,
		email: null,
		administrativeProfile: null,
		balanceRub: 45000,
		balanceKopecks: 4500000,
		createdAt: new Date().toISOString(),
		updatedAt: new Date().toISOString(),
	};

	it("1. PatientFamilyAndInsuranceWidget displays family balance and finance triggers cleanly", () => {
		const html = renderToStaticMarkup(
			React.createElement(PatientFamilyAndInsuranceWidget, {
				patient: mockPatient,
				patientBalance: 45000,
			}),
		);

		assert.ok(
			html.includes("Финансы, семейный счёт") ||
			html.includes("Касса / Оплата") ||
			html.includes("patient-card-finance-btn"),
		);
	});

	it("2. PatientGeneralInfoTab embeds both PatientFamilyAndInsuranceWidget and PatientRepresentativesSection in family section", () => {
		const tabPath = path.resolve(patientsDir, "tabs/PatientGeneralInfoTab.tsx");
		const content = fs.readFileSync(tabPath, "utf-8");

		assert.ok(content.includes("<PatientFamilyAndInsuranceWidget"));
		assert.ok(content.includes("<PatientRepresentativesSection"));
	});
});
