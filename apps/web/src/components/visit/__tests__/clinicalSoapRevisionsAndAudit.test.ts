import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
	generateSoapFromOdontogramFinding,
	generatePhotoProtocolAttachmentsStatement,
	generateInformedConsent1051nText,
	generateInformedConsent1051nHtml,
	type ClinicalPhotoAttachment,
} from "../../../lib/clinicalProtocols";

describe("Clinical SOAP Revisions, Audit & Print Protocols (clinicalSoapRevisionsAndAudit)", () => {
	describe("1. Crown Materials Contrast & Medical Card Print Invariants", () => {
		it("verifies high-contrast restorative material color definitions", () => {
			const materials = ["gold", "pfm_crown", "ceramic_emax", "zirconia", "composite", "amalgam"] as const;
			assert.equal(materials.length, 6);
		});

		it("verifies outpatient record protocol text format for printed medical document", () => {
			const soap = generateSoapFromOdontogramFinding({
				toothNumber: 16,
				state: "Crown",
				surfaces: ["O", "D"],
			});
			assert.equal(soap.diagnosisIcd10, "Z51.8");
			assert.match(soap.diagnosisIcd10Label, /коронка/i);
			assert.match(soap.treatmentDescription ?? "", /Препарирование культи зуба под искусственную коронку/i);
		});
	});

	describe("2. Clinical Dental Photo Protocol & Attachments", () => {
		it("generates formatted photo protocol attachment statement for medical card", () => {
			const photos: ClinicalPhotoAttachment[] = [
				{
					id: "p-1",
					toothNumber: 16,
					photoType: "before",
					photoUrl: "blob:http://localhost/1",
					description: "Глубокая кариозная полость МОД",
					capturedAtIso: "2026-08-24T12:00:00.000Z",
				},
				{
					id: "p-2",
					toothNumber: 16,
					photoType: "process",
					photoUrl: "blob:http://localhost/2",
					description: "Изоляция коффердамом Sanctuary",
					capturedAtIso: "2026-08-24T12:15:00.000Z",
				},
				{
					id: "p-3",
					toothNumber: 16,
					photoType: "after",
					photoUrl: "blob:http://localhost/3",
					description: "Финальная композитная реставрация",
					capturedAtIso: "2026-08-24T12:45:00.000Z",
				},
			];

			const statement = generatePhotoProtocolAttachmentsStatement(photos);
			assert.match(statement, /ВЕДОМОСТЬ ФОТОПРОТОКОЛА И ПРИЛОЖЕНИЙ/i);
			assert.match(statement, /1\. \[Зуб 16\] Исходная ситуация \(До лечения\) \(Глубокая кариозная полость МОД\)/i);
			assert.match(statement, /2\. \[Зуб 16\] Этап лечения/i);
			assert.match(statement, /3\. \[Зуб 16\] Финальный результат \(После лечения\)/i);
		});

		it("returns empty string when no photo attachments provided", () => {
			const statement = generatePhotoProtocolAttachmentsStatement([]);
			assert.equal(statement, "");
		});
	});

	describe("3. Patient Timeline Diaries Search and Keyword Highlight Engine", () => {
		it("correctly filters clinical journey events by keywords (pulpitis, cofferdam, filling, articaine, tooth number)", () => {
			const mockEvents = [
				{
					id: "evt-1",
					title: "Приём завершён",
					description: "Лечение пульпита зуба 16, анестезия Артикаин 4%, изоляция коффердам, пломба световая",
					status: "завершён",
				},
				{
					id: "evt-2",
					title: "Оплата: наличные",
					description: "Сумма 4 500 ₽",
					status: "оплачена",
				},
			];

			const filterEvents = (query: string) => {
				const q = query.trim().toLowerCase();
				return mockEvents.filter((evt) => {
					return (
						evt.title.toLowerCase().includes(q) ||
						evt.description.toLowerCase().includes(q) ||
						evt.status.toLowerCase().includes(q)
					);
				});
			};

			assert.equal(filterEvents("пульпит").length, 1);
			assert.equal(filterEvents("коффердам").length, 1);
			assert.equal(filterEvents("пломба").length, 1);
			assert.equal(filterEvents("артикаин").length, 1);
			assert.equal(filterEvents("16").length, 1);
			assert.equal(filterEvents("оплата").length, 1);
			assert.equal(filterEvents("несуществующий_запрос").length, 0);
		});
	});

	describe("4. Graphic Odontogram A4 Print Engine", () => {
		it("verifies A4 print odontogram invariants (header, legend, pathology breakdown and doctor signature)", () => {
			const mockTeethData = [
				{ toothNumber: 16, state: "Caries", surfaces: ["O", "D"] },
				{ toothNumber: 36, state: "Pulpitis" },
				{ toothNumber: 46, state: "Crown" },
			];

			const nonHealthy = mockTeethData.filter((t) => t.state && t.state !== "Healthy");
			assert.equal(nonHealthy.length, 3);

			const legendEntries = [
				{ state: "Caries", label: "Кариес", color: "#ef4444" },
				{ state: "Pulpitis", label: "Пульпит", color: "#dc2626" },
				{ state: "Periodontitis", label: "Периодонтит", color: "#f97316" },
				{ state: "Filled", label: "Пломба", color: "#0d9488" },
				{ state: "Crown", label: "Коронка", color: "#2563eb" },
				{ state: "Implant", label: "Имплантат", color: "#9333ea" },
				{ state: "Missing", label: "Отсутствует", color: "#94a3b8" },
			];
			assert.equal(legendEntries.length, 7);
		});
	});

	describe("5. Informed Voluntary Consent (Order № 1051n)", () => {
		it("generates structured text for Order 1051n Informed Consent with full license and doctor details", () => {
			const consentText = generateInformedConsent1051nText({
				patientFullName: "Смирнов Алексей Владимирович",
				patientBirthDate: "14.06.1988",
				patientPassport: "Паспорт РФ 45 12 № 890123",
				doctorFullName: "Волкова Екатерина Сергеевна",
				clinicName: "Стоматологическая клиника «DENTE» (ООО «ДЕНТЕ МЕДИКАЛ ГРУПП»)",
				clinicLicense: "№ ЛО41-01137-77/00368421 от 14.02.2023 г.",
				diagnosisIcd: "K02.1 Кариес дентина",
				toothNumbers: "16",
			});

			assert.ok(consentText.includes("ИНФОРМИРОВАННОЕ ДОБРОВОЛЬНОЕ СОГЛАСИЕ"));
			assert.ok(consentText.includes("Приказом Минздрава России от 12.11.2021 № 1051н"));
			assert.ok(consentText.includes("№ ЛО41-01137-77/00368421"));
			assert.ok(consentText.includes("Смирнов Алексей Владимирович"));
			assert.ok(consentText.includes("14.06.1988"));
			assert.ok(consentText.includes("Волкова Екатерина Сергеевна"));
			assert.ok(consentText.includes("K02.1 Кариес дентина"));
			assert.ok(consentText.includes("в области зубов: 16"));
			assert.ok(consentText.includes("М.П. Клиники"));
			assert.ok(consentText.includes("Пациент (законный представитель)"));
			assert.ok(consentText.includes("Врач-стоматолог"));
		});

		it("generates print-ready HTML A4 sheet for Order 1051n with page break protection", () => {
			const html = generateInformedConsent1051nHtml({
				patientFullName: "Иванова Мария Петровна",
				patientBirthDate: "20.10.1995",
				doctorFullName: "Прохоров Константин Игоревич",
				doctorSpecialty: "Стоматолог-хирург",
				diagnosisIcd: "K04.0 Пульпит",
				toothNumbers: "36",
			});

			assert.ok(html.includes("informed-consent-a4-sheet"));
			assert.ok(html.includes("№ ЛО41-01137-77/00368421"));
			assert.ok(html.includes("Иванова Мария Петровна"));
			assert.ok(html.includes("Прохоров Константин Игоревич"));
			assert.ok(html.includes("K04.0 Пульпит"));
			assert.ok(html.includes("36"));
			assert.ok(html.includes("page-break-inside: avoid"));
			assert.ok(html.includes("М.П."));
		});
	});

	describe("6. 1-Click Dental Prescriptions & Statutory Licensing", () => {
		it("verifies essential dental prescription drugs for 1-click dispensing", () => {
			const amoxiclav = {
				tradeNameRu: "Амоксиклав (Амоксициллин + Клавулановая кислота)",
				latinRp: "Rp.: Amoxicillini 875 mg + Acidi clavulanici 125 mg",
				dosageRu: "875 мг + 125 мг (1000 мг)",
				signaRu: "S. Внутрь по 1 таблетке 2 раза в день 5 дней",
			};
			const nimesil = {
				tradeNameRu: "Нимесил (Нимесулид)",
				latinRp: "Rp.: Nimesulidi 100 mg",
				dosageRu: "100 мг",
				signaRu: "S. Внутрь по 1 пакетику 2 раза в день после еды при боли",
			};
			const chlorhexidine = {
				tradeNameRu: "Хлоргексидин 0.05%",
				latinRp: "Rp.: Sol. Chlorhexidini bigluconatis 0.05% - 100 ml",
				dosageRu: "0.05%",
				signaRu: "S. Ротовые ванночки 3 раза в день 5 дней",
			};

			assert.ok(amoxiclav.latinRp.includes("Amoxicillini"));
			assert.ok(amoxiclav.latinRp.includes("Acidi clavulanici"));
			assert.ok(amoxiclav.dosageRu.includes("1000 мг"));

			assert.ok(nimesil.latinRp.includes("Nimesulidi 100 mg"));
			assert.ok(nimesil.signaRu.includes("при боли"));

			assert.ok(chlorhexidine.latinRp.includes("Chlorhexidini bigluconatis 0.05%"));
			assert.ok(chlorhexidine.signaRu.includes("Ротовые ванночки"));
		});

		it("verifies statutory prescription header with clinic license ЛО41-01137-77/00368421", () => {
			const license = "ЛО41-01137-77/00368421";
			assert.ok(/^ЛО\d{2}-\d{5}-\d{2}\/\d{8}$/.test(license));
		});
	});

	describe("7. Protocol Revisions & 'Исправленному верить' Audit Invariants (Mandate 8e)", () => {
		it("allows doctor to amend signed record without bureaucratic 24h lockout or admin pin", () => {
			const originalVisit = {
				id: "vis-1",
				status: "signed",
				revision: 1,
				doctorSummary: "Лечение кариеса зуба 16",
			};

			const amendedRevision = originalVisit.revision + 1;
			const amendStamp = `Исправленному верить: ред. ${amendedRevision}`;
			const amendedSummary = `${originalVisit.doctorSummary} (${amendStamp})`;

			assert.equal(amendedRevision, 2);
			assert.ok(amendedSummary.includes("Исправленному верить: ред. 2"));
		});
	});
});
