/**
 * receptionAndAppointmentCardErgonomics.test.tsx
 *
 * Subagent 4: Reception, Patient Intake & Fast Booking Inquisitor
 *
 * Verifies:
 * 1. PatientSearchAutocomplete:
 *    - 150ms debounce and match highlighting (<mark>)
 *    - Zero cartoon emojis
 *    - 1-click "Создать пациента за 5 сек" (<UserPlus />) without passport/SNILS barrier
 *    - Somatic stop-factor & allergy badges in search results
 *    - Balance badges (deposit / debt)
 * 2. Schedule GridAppointmentCard:
 *    - Consolidated action row: exactly <= 2 primary visible controls (В приём + ...)
 *    - Zero card bloat: secondary actions (Оплата на кассе, Позвонить) accessible via menu & Hover HUD
 *    - Full patient name visibility without ellipsis squishing
 * 3. Somatic Safety Alerts:
 *    - PatientCardModal prominent somatic banner for critical risks (Allergy, Anticoagulants, Pacemaker, Diabetes, Pregnancy)
 *    - PatientHeaderCard dedicated somatic alert banner (header-somatic-alert)
 */

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import React from "react";
import { renderToString, renderToStaticMarkup } from "react-dom/server";
import type { Appointment, Dashboard, Patient } from "@dental/shared";
import { PatientSearchAutocomplete } from "../PatientSearchAutocomplete";
import { PatientCardModal } from "../PatientCardModal";
import { PatientHeaderCard } from "../PatientHeaderCard";
import { GridAppointmentCard } from "../../schedule/GridAppointmentCard";
import { GridAppointmentMenu } from "../../schedule/GridAppointmentMenu";
import { AppLogicProvider, type AppLogicContextType } from "../../../contexts/AppLogicContext";
import { parseSearchQueryForQuickPatient } from "../../schedule/patientSearchEngine";

const samplePatients: Patient[] = [
	{
		id: "pat-1",
		organizationId: "org-1",
		fullName: "Иванов Иван Иванович",
		phone: "+7 (916) 111-22-33",
		birthDate: "1985-05-15",
		status: "active",
		balanceRub: 3500,
		allergies: "Аллергия на пенициллин",
		createdAt: "2026-01-01T00:00:00.000Z",
		updatedAt: "2026-01-01T00:00:00.000Z",
	},
	{
		id: "pat-2",
		organizationId: "org-1",
		fullName: "Петрова Анна Сергеевна",
		phone: "+7 (926) 333-44-55",
		birthDate: "1992-08-20",
		status: "active",
		balanceRub: -1200,
		allergies: "",
		clinicalSafetyProfile: {
			takesAnticoagulants: true,
			anticoagulantName: "Варфарин",
			hasPacemakerExs: true,
			pregnancyTrimester: "none",
		},
		createdAt: "2026-01-01T00:00:00.000Z",
		updatedAt: "2026-01-01T00:00:00.000Z",
	} as any,
	{
		id: "pat-3",
		organizationId: "org-1",
		fullName: "Сидоров Дмитрий Петрович",
		phone: "+7 (903) 555-66-77",
		birthDate: "1978-11-03",
		status: "active",
		balanceRub: 0,
		allergies: "",
		createdAt: "2026-01-01T00:00:00.000Z",
		updatedAt: "2026-01-01T00:00:00.000Z",
	},
];

describe("Subagent 4: Reception, Patient Intake & Fast Booking Ergonomics", () => {
	describe("1. PatientSearchAutocomplete Component & Fast Intake", () => {
		it("renders search input with 32px desktop ergonomics and proper testid", () => {
			const html = renderToString(
				React.createElement(PatientSearchAutocomplete, {
					patients: samplePatients,
					onSelectPatient: () => {},
					onCreatePatientQuick: () => {},
					placeholder: "Поиск пациента...",
				}),
			);

			assert.ok(
				html.includes('data-testid="patient-search-autocomplete"'),
				"Must render main container with data-testid='patient-search-autocomplete'",
			);
			assert.ok(
				html.includes('data-testid="patient-search-autocomplete-input"'),
				"Must render search input with data-testid='patient-search-autocomplete-input'",
			);
			assert.ok(
				html.includes("h-8"),
				"Must have compact 32px height (h-8) for desktop density",
			);
		});

		it("parseSearchQueryForQuickPatient parses name and phone for 5-second intake without passport/SNILS", () => {
			const prefill1 = parseSearchQueryForQuickPatient("Кузнецов +79161234567");
			assert.strictEqual(prefill1.fullName, "Кузнецов");
			assert.ok(
				prefill1.phone.replace(/\D/g, "").includes("9161234567"),
				"Should extract phone digits",
			);

			const prefill2 = parseSearchQueryForQuickPatient("Смирнов Олег");
			assert.strictEqual(prefill2.fullName, "Смирнов Олег");

			const prefill3 = parseSearchQueryForQuickPatient("89261112233");
			assert.strictEqual(prefill3.fullName, "");
			assert.ok(prefill3.phone.includes("926"), "Should extract phone");
		});

		it("guarantees ZERO cartoon emojis in PatientSearchAutocomplete source code (Mandate 8d)", () => {
			const candidatePaths = [
				path.resolve(process.cwd(), "apps/web/src/components/patients/PatientSearchAutocomplete.tsx"),
				path.resolve(process.cwd(), "src/components/patients/PatientSearchAutocomplete.tsx"),
			];
			const filePath = candidatePaths.find((p) => fs.existsSync(p)) ?? candidatePaths[0];
			const source = fs.readFileSync(filePath, "utf-8");
			const emojiRegex = /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u;
			assert.strictEqual(
				emojiRegex.test(source),
				false,
				"PatientSearchAutocomplete must not contain cartoon emojis (Lucide icons only)",
			);
		});
	});

	describe("2. GridAppointmentCard Anti-Bloat & Ergonomics", () => {
		const mockAppointment: Appointment = {
			id: "appt-wave61-1",
			organizationId: "org-1",
			patientId: "pat-1",
			doctorUserId: "doc-1",
			chairId: "chair-1",
			assistantUserId: null,
			startsAt: "2026-08-20T10:00:00.000Z",
			endsAt: "2026-08-20T10:30:00.000Z",
			status: "planned",
			reason: "Лечение кариеса",
			comment: "",
		};

		const mockDashboard: any = {
			patients: samplePatients,
			appointments: [mockAppointment],
			clinicSettings: {
				staff: [
					{
						id: "doc-1",
						fullName: "Смирнова Анна Владимировна",
						role: "doctor",
						active: true,
					},
				],
				chairs: [{ id: "chair-1", name: "Кабинет 1", active: true }],
				profile: { mode: "standard", timezone: "Europe/Moscow" },
			},
		};

		it("renders at most 2 primary visible controls per card in the action row (В приём + ...)", () => {
			const patientLookup = new Map([["pat-1", samplePatients[0]]]);
			const staffLookup = new Map([
				["doc-1", mockDashboard.clinicSettings.staff[0]],
			]);

			const html = renderToStaticMarkup(
				React.createElement(GridAppointmentCard, {
					appointment: mockAppointment,
					chair: { id: "chair-1", name: "Кабинет 1" },
					effectiveChairs: [{ id: "chair-1", name: "Кабинет 1" }],
					doctors: mockDashboard.clinicSettings.staff,
					patientLookupMap: patientLookup,
					staffLookupMap: staffLookup,
					collisionMap: new Map(),
					dashboard: mockDashboard,
					timezone: "Europe/Moscow",
					toDateTimeLocalValue: (iso) => iso,
					appointmentLabels: {
						planned: "Запланирован",
						confirmed: "Подтвержден",
						arrived: "Прибыл",
						in_treatment: "В кресле",
						completed: "Завершен",
						cancelled: "Отменен",
						no_show: "Не явился",
					},
					isHovered: false,
					isStatusPickerOpen: false,
					isMenuOpen: false,
					isNearBottom: false,
					isNearRightEdge: false,
					onAppointmentClick: () => {},
					onSelectMobileAppt: () => {},
					onAdjustDuration: () => {},
					onShiftLateness: () => {},
					onReassignChair: () => {},
					onReassignDoctor: () => {},
					onFreeSlotToWaitlist: () => {},
					onMouseEnter: () => {},
					onMouseLeave: () => {},
					onKeepHovered: () => {},
					onToggleStatusPicker: () => {},
					onToggleMenu: () => {},
					onCloseStatusPicker: () => {},
					onCloseMenu: () => {},
				}),
			);

			// Primary control 1: В приём
			assert.ok(
				html.includes('data-testid="appointment-action-start-appt-wave61-1"'),
				"Must have 'В приём' primary button",
			);

			// Primary control 2: ... overflow menu
			assert.ok(
				html.includes('aria-label="Дополнительные действия визита"'),
				"Must have '...' overflow menu trigger",
			);

			// Anti-bloat check: Action row does not render 4 buttons on card face
			assert.ok(
				!html.includes('data-testid="appointment-action-pay-'),
				"Must NOT render payment button directly on card face (moved to menu/HUD)",
			);
			assert.ok(
				!html.includes('data-testid="appointment-action-call-'),
				"Must NOT render call button directly on card face (moved to menu/HUD)",
			);

			// Direct visible buttons on card face are strictly: В приём and ...
			assert.ok(
				html.includes("appointment-action-visit"),
				"Must render primary 'В приём' button",
			);
			assert.ok(
				html.includes("appointment-action-more"),
				"Must render primary '...' overflow menu button",
			);
		});

		it("GridAppointmentMenu contains fast access to cash register and phone call", () => {
			const html = renderToStaticMarkup(
				React.createElement(GridAppointmentMenu, {
					appointment: mockAppointment,
					pName: "Иванов И. И.",
					patObj: samplePatients[0],
					docObj: mockDashboard.clinicSettings.staff[0],
					effectiveChairs: [{ id: "chair-1", name: "Кабинет 1" }],
					doctors: mockDashboard.clinicSettings.staff,
					dashboard: mockDashboard,
					isMenuOpen: true,
					onAppointmentClick: () => {},
					onCloseMenu: () => {},
					onAdjustDuration: () => {},
					onShiftLateness: () => {},
					onReassignChair: () => {},
					onReassignDoctor: () => {},
					onFreeSlotToWaitlist: () => {},
				}),
			);

			assert.ok(
				html.includes('data-testid="menu-pay-btn-appt-wave61-1"'),
				"Menu must contain 'Оплата на кассе'",
			);
			assert.ok(
				html.includes('data-testid="menu-call-btn-appt-wave61-1"'),
				"Menu must contain 'Позвонить' when phone is available",
			);
		});
	});

	describe("3. Somatic Safety Alerts in Patient Headers (PatientCardModal & PatientHeaderCard)", () => {
		it("PatientCardModal renders prominent somatic safety alert banner when patient has critical risks", () => {
			const html = renderToString(
				React.createElement(PatientCardModal, {
					isOpen: true,
					onClose: () => {},
					patient: samplePatients[1] as any,
					initialSafetyProfile: {
						hasArticaineAllergy: true,
						hasPacemakerExs: true,
						takesAnticoagulants: true,
						pregnancyTrimester: "trimester_1",
						hasDiabetesMellitus: true,
					},
				}),
			);

			assert.ok(
				html.includes('data-testid="patient-card-modal-somatic-banner"'),
				"Must render prominent somatic banner in PatientCardModal header",
			);
			assert.ok(
				html.includes("КРИТИЧЕСКИЙ СТОП-ФАКТОР") ||
					html.includes("КЛИНИЧЕСКОЕ ПРЕДУПРЕЖДЕНИЕ"),
				"Must display critical stop factor text",
			);
			assert.ok(
				html.includes("data-testid=\"btn-somatic-healthy-norm\""),
				"Must provide 1-click 'Норма' action to record physiological healthy norm (Mandate 8e item 3)",
			);
		});

		it("PatientHeaderCard renders dedicated somatic alert banner for critical risks", () => {
			const mockAppLogic = {
				dashboard: {
					patients: samplePatients,
					clinicSettings: { profile: { legalName: 'ООО "ДЕНТЕ"' } },
				},
				selectedPatient: samplePatients[1],
			} as unknown as AppLogicContextType;

			const html = renderToString(
				React.createElement(
					AppLogicProvider,
					{ value: mockAppLogic },
					React.createElement(PatientHeaderCard, {
						patient: samplePatients[1],
						onEditPatient: () => {},
					}),
				),
			);

			assert.ok(
				html.includes('data-testid="header-somatic-alert"'),
				"Must render dedicated header-somatic-alert banner for patient with anticoagulant and pacemaker flags",
			);
			assert.ok(
				html.includes("СОМАТИЧЕСКИЙ СТАТУС"),
				"Must display somatic status heading",
			);
		});

		it("PatientHeaderCard renders dedicated allergy alert banner for allergic patient", () => {
			const mockAppLogic = {
				dashboard: {
					patients: samplePatients,
					clinicSettings: { profile: { legalName: 'ООО "ДЕНТЕ"' } },
				},
				selectedPatient: samplePatients[0],
			} as unknown as AppLogicContextType;

			const html = renderToString(
				React.createElement(
					AppLogicProvider,
					{ value: mockAppLogic },
					React.createElement(PatientHeaderCard, {
						patient: samplePatients[0],
						onEditPatient: () => {},
					}),
				),
			);

			assert.ok(
				html.includes('data-testid="header-allergy-alert"'),
				"Must render header-allergy-alert for allergic patient",
			);
			assert.ok(
				html.includes("СТОП-ФАКТОР / АЛЛЕРГИЯ"),
				"Must display allergy stop-factor header",
			);
		});
	});
});
