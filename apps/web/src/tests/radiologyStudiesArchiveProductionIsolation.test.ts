import { describe, it } from "vitest";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { DEMO_SHOWCASE_ORG_ID } from "@dental/shared";
import { isDemoPatientId, isDemoShowcaseMode, setRuntimeDemoMode } from "../lib/demoMode";
import { DEMO_ARCHIVE_STUDIES } from "../components/radiology/archive/demoArchiveStudies";

const getWebRoot = () =>
	fs.existsSync(path.resolve(process.cwd(), "apps/web"))
		? path.resolve(process.cwd(), "apps/web")
		: process.cwd();

const getApiRoot = () =>
	fs.existsSync(path.resolve(process.cwd(), "apps/api"))
		? path.resolve(process.cwd(), "apps/api")
		: path.resolve(process.cwd(), "../api");

describe("Radiology Studies Archive & PACS Production Isolation Invariant (Red Team Mandate)", () => {
	it("verifies DEMO_ARCHIVE_STUDIES has zero leakage of legacy org ID 00000000-0000-0000-0000-000000000001", () => {
		assert.ok(DEMO_ARCHIVE_STUDIES.length >= 4, "DEMO_ARCHIVE_STUDIES has showcase items");

		for (const study of DEMO_ARCHIVE_STUDIES) {
			assert.notEqual(
				study.organizationId,
				"00000000-0000-0000-0000-000000000001",
				`Study ${study.id} must not use legacy fake org ID`,
			);
			assert.equal(
				study.organizationId,
				DEMO_SHOWCASE_ORG_ID,
				`Study ${study.id} must be strictly bound to DEMO_SHOWCASE_ORG_ID (${DEMO_SHOWCASE_ORG_ID})`,
			);
		}
	});

	it("verifies demoArchiveStudies.ts source code has 0 occurrences of fake org ID 00000000-0000-0000-0000-000000000001", () => {
		const filePath = path.resolve(getWebRoot(), "src/components/radiology/archive/demoArchiveStudies.ts");
		const source = fs.readFileSync(filePath, "utf-8");

		assert.equal(
			source.includes("00000000-0000-0000-0000-000000000001"),
			false,
			"demoArchiveStudies.ts must have zero occurrences of fake org ID",
		);
		assert.ok(
			source.includes("DEMO_SHOWCASE_ORG_ID"),
			"demoArchiveStudies.ts must import and use DEMO_SHOWCASE_ORG_ID",
		);
	});

	it("verifies PatientRadiologyTab.tsx source code binds DEMO_PATIENT_STUDIES strictly to DEMO_SHOWCASE_ORG_ID", () => {
		const filePath = path.resolve(getWebRoot(), "src/components/patients/tabs/PatientRadiologyTab.tsx");
		const source = fs.readFileSync(filePath, "utf-8");

		assert.equal(
			source.includes("00000000-0000-0000-0000-000000000001"),
			false,
			"PatientRadiologyTab.tsx must have zero occurrences of fake org ID",
		);
		assert.ok(
			source.includes("DEMO_SHOWCASE_ORG_ID"),
			"PatientRadiologyTab.tsx must import and use DEMO_SHOWCASE_ORG_ID",
		);
	});

	it("verifies RadiologyStudiesArchive source code never leaks demo studies in production and queries real DB API", () => {
		const filePath = path.resolve(getWebRoot(), "src/components/radiology/archive/RadiologyStudiesArchive.tsx");
		const source = fs.readFileSync(filePath, "utf-8");

		// No fake org ID
		assert.equal(
			source.includes("00000000-0000-0000-0000-000000000001"),
			false,
			"RadiologyStudiesArchive.tsx must not contain fake org ID",
		);

		// Queries real backend endpoints
		assert.ok(
			source.includes('"/api/radiology/studies"') || source.includes("'/api/radiology/studies'"),
			"RadiologyStudiesArchive must query /api/radiology/studies",
		);
		assert.ok(
			source.includes('"/api/imaging/studies"') || source.includes("'/api/imaging/studies'"),
			"RadiologyStudiesArchive must handle /api/imaging/studies",
		);

		// Fail-closed in catch/empty: never injects DEMO_ARCHIVE_STUDIES in production
		assert.ok(
			source.includes("setStudies(isDemoShowcaseMode() ? DEMO_ARCHIVE_STUDIES : []);"),
			"RadiologyStudiesArchive strictly falls back to empty array [] in production",
		);

		// Filters out showcase studies in production
		assert.ok(
			source.includes("s.organizationId !== DEMO_SHOWCASE_ORG_ID"),
			"RadiologyStudiesArchive filters out demo showcase studies in production",
		);

		// Honest EmptyState text present in source
		assert.ok(
			source.includes("Снимков пока нет. Загрузите DICOM или подключите датчик визиографа"),
			"RadiologyStudiesArchive must contain the required honest clinical EmptyState message",
		);
	});

	it("verifies RadiologyStudiesArchive renders honest EmptyState when archive is empty in production", async () => {
		const { RadiologyStudiesArchive } = await import(
			"../components/radiology/archive/RadiologyStudiesArchive"
		);

		// Ensure production mode
		setRuntimeDemoMode(false);
		assert.equal(isDemoShowcaseMode(), false);

		const html = renderToStaticMarkup(
			React.createElement(RadiologyStudiesArchive, {
				onUploadNew: () => {},
				onOpenDirectRvgCapture: () => {},
			}),
		);

		// Must render the empty state container
		assert.ok(html.includes('data-testid="archive-empty-state"'), "Must render archive-empty-state");

		// Must render the exact honest Russian empty state texts
		assert.ok(html.includes("Снимков пока нет"), "Must render 'Снимков пока нет' title");
		assert.ok(
			html.includes("Снимков пока нет. Загрузите DICOM или подключите датчик визиографа"),
			"Must render subtitle 'Снимков пока нет. Загрузите DICOM или подключите датчик визиографа'",
		);

		// Must provide call to action buttons
		assert.ok(html.includes('data-testid="btn-empty-upload-new"'), "Must render upload button in empty state");
		assert.ok(html.includes("Загрузить снимок / КТ"), "Must render 'Загрузить снимок / КТ'");
		assert.ok(html.includes('data-testid="btn-empty-scan-disk"'), "Must render scan disk button in empty state");
		assert.ok(html.includes("Поиск на диске"), "Must render 'Поиск на диске'");

		// Must NOT render any demo studies in the table in production empty state
		assert.equal(html.includes("Захаров Иван Дмитриевич"), false, "Must not leak demo patient 1");
		assert.equal(html.includes("Planmeca Romexis Hub"), false, "Must not leak demo PACS hub");
	});

	it("verifies RadiologyStudiesArchive renders DEMO_ARCHIVE_STUDIES in demo showcase mode", async () => {
		const { RadiologyStudiesArchive } = await import(
			"../components/radiology/archive/RadiologyStudiesArchive"
		);

		// Toggle demo mode on
		setRuntimeDemoMode(true);
		assert.equal(isDemoShowcaseMode(), true);

		const html = renderToStaticMarkup(
			React.createElement(RadiologyStudiesArchive, {
				onUploadNew: () => {},
				onOpenDirectRvgCapture: () => {},
			}),
		);

		// In demo mode, DEMO_ARCHIVE_STUDIES are rendered
		assert.ok(html.includes("Захаров Иван Дмитриевич"), "Demo mode renders demo patient Захаров");
		assert.ok(html.includes("Иванов Алексей Сергеевич"), "Demo mode renders demo patient Иванов");
		assert.ok(html.includes("Смирнова Елена Александровна"), "Demo mode renders demo patient Смирнова");

		// Reset runtime demo mode
		setRuntimeDemoMode(null);
	});

	it("verifies DirectRvgCaptureModal hides 'Показать демо-снимок' and avoids fake image fallback for real patients", async () => {
		const { DirectRvgCaptureModal } = await import(
			"../components/radiology/DirectRvgCaptureModal"
		);

		// Production mode
		setRuntimeDemoMode(false);
		assert.equal(isDemoShowcaseMode(), false);

		// 1. Real patient in production: no fake image, demo button hidden
		const realHtml = renderToStaticMarkup(
			React.createElement(DirectRvgCaptureModal, {
				isOpen: true,
				onClose: () => {},
				patientId: "real-patient-uuid-987",
				patientName: "Сидоров Петр Васильевич",
			}),
		);

		assert.ok(realHtml.includes('data-testid="rvg-empty-sensor-state"'), "Real patient starts in clean empty state");
		assert.equal(
			realHtml.includes('data-testid="btn-rvg-load-demo"'),
			false,
			"btn-rvg-load-demo must be completely hidden for real patients in production",
		);
		assert.equal(
			realHtml.includes("sample_rvg_tooth16.jpg"),
			false,
			"Real patient must not load sample_rvg_tooth16.jpg as fallback",
		);

		// 2. Demo patient or demo showcase mode: demo button is accessible
		setRuntimeDemoMode(true);
		const demoHtml = renderToStaticMarkup(
			React.createElement(DirectRvgCaptureModal, {
				isOpen: true,
				onClose: () => {},
				patientId: "sample_patient_1",
				patientName: "Тестовый Пациент",
			}),
		);

		assert.ok(
			demoHtml.includes('data-testid="btn-rvg-load-demo"') || demoHtml.includes("sample_rvg_tooth16.jpg"),
			"Demo mode enables demo scan loading",
		);

		setRuntimeDemoMode(null);
	});

	it("verifies backend API routes in studiesRoutes.ts register both /api/radiology/studies and /api/imaging/studies", () => {
		const studiesRoutesPath = path.resolve(getApiRoot(), "src/routes/imaging/studiesRoutes.ts");
		assert.ok(fs.existsSync(studiesRoutesPath), "studiesRoutes.ts exists on disk");

		const source = fs.readFileSync(studiesRoutesPath, "utf-8");

		// Endpoint parity checks
		assert.ok(
			source.includes('app.get("/api/imaging/studies", getStudiesHandler);') &&
			source.includes('app.get("/api/radiology/studies", getStudiesHandler);'),
			"Both GET /api/imaging/studies and /api/radiology/studies are registered to getStudiesHandler",
		);

		assert.ok(
			source.includes('app.post("/api/imaging/studies", createStudyHandler);') &&
			source.includes('app.post("/api/radiology/studies", createStudyHandler);'),
			"Both POST /api/imaging/studies and /api/radiology/studies are registered to createStudyHandler",
		);

		assert.ok(
			source.includes('app.patch("/api/imaging/studies/:id", updateStudyHandler);') &&
			source.includes('app.patch("/api/radiology/studies/:id", updateStudyHandler);'),
			"Both PATCH /api/imaging/studies/:id and /api/radiology/studies/:id are registered",
		);

		assert.ok(
			source.includes('app.post("/api/imaging/studies/:id/bind-patient", bindPatientHandler);') &&
			source.includes('app.post("/api/radiology/studies/:id/bind-patient", bindPatientHandler);'),
			"Both bind-patient routes are registered",
		);

		assert.ok(
			source.includes('app.post("/api/imaging/studies/:id/unbind-patient", unbindPatientHandler);') &&
			source.includes('app.post("/api/radiology/studies/:id/unbind-patient", unbindPatientHandler);'),
			"Both unbind-patient routes are registered",
		);

		assert.ok(
			source.includes('app.post("/api/imaging/studies/auto-bind-scan", autoBindHandler);') &&
			source.includes('app.post("/api/radiology/studies/auto-bind-scan", autoBindHandler);'),
			"Both auto-bind-scan routes are registered",
		);
	});
});
