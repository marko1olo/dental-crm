import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
	synthesizeClinicalDiary,
	synthesizeDiariesFromOdontogram,
	validateForm043uCompliance,
	getClinicalProtocolTemplate,
	deduceBlackClassFromSurfaces,
	isValidFdiToothNumber,
	formatStatutorySoapSummary,
	type ClinicalDiarySynthesisRequest,
	type FdiToothRecord,
	type VisitDiaryEntry043,
	STATUTORY_EMR_PROTOCOL_CATALOG,
	CORE_1CLICK_PRESETS,
	anestheticDrugLabels,
	blackCavityClassLabels,
} from "../components/emr/protocolGenerator/index";


describe("EMR Form 043/u Statutory Protocol Engine & Diary Synthesizer (Order № 834n)", () => {
	// ─────────────────────────────────────────────────────────────────────────
	// 1. THERAPY PROTOCOL SYNTHESIS (K02.1 - Caries)
	// ─────────────────────────────────────────────────────────────────────────
	describe("1. Therapy Protocol Synthesis (K02.1)", () => {
		it("synthesizes complete statutory SOAP diary for Class I occlusal caries", () => {
			const diary = synthesizeClinicalDiary({
				toothNumber: 16,
				icd10Code: "K02.1",
				surfaces: ["occlusal"],
				doctorFullName: "Волкова Екатерина Сергеевна",
				doctorSpecialty: "Врач-стоматолог-терапевт",
				dateStr: "2026-08-22",
			});

			assert.strictEqual(diary.toothNumber, "16");
			assert.strictEqual(diary.assessmentIcd10Code, "K02.1");
			assert.match(diary.assessmentDiagnosisText, /Кариес дентина/);
			assert.match(diary.assessmentDiagnosisText, /16/);

			// Subjective & Objective
			assert.match(diary.subjectiveComplaints, /16/);
			assert.match(diary.objectiveStatusLocalis, /16/);
			assert.match(diary.objectiveStatusLocalis, /Класс I по Блэку/);

			// Anesthesia: Septanest 1:100000 1.7ml
			assert.match(diary.anesthesiaDetails || "", /Септанест с адреналином 1:100000/);
			assert.match(diary.anesthesiaDetails || "", /1.7 мл/);

			// Procedure Protocol Steps
			const protocol = diary.procedureProtocol;
			assert.match(protocol, /коффердам|раббердам/i);
			assert.match(protocol, /Блэку/i);
			assert.match(protocol, /37%/);
			assert.match(protocol, /H3PO4/);
			assert.match(protocol, /OptiBond|адгезив/i);
			assert.match(protocol, /Filtek|Estelite|композит/i);
			assert.match(protocol, /Enhance|PoGo|полиров/i);
			assert.match(protocol, /Bausch|окклюзи/i);

			// Materials
			assert.match(diary.appliedMaterials || "", /Septanest/);
			assert.match(diary.appliedMaterials || "", /Коффердам/);
			assert.match(diary.appliedMaterials || "", /Filtek|Estelite/);

			// Doctor
			assert.strictEqual(diary.doctorFullName, "Волкова Екатерина Сергеевна");
		});

		it("deduces Black cavity classes correctly across different tooth quadrants and surfaces", () => {
			// Molar occlusal -> Class I
			assert.strictEqual(deduceBlackClassFromSurfaces(16, ["occlusal"]), "class_I");
			// Molar mesial + occlusal -> Class II
			assert.strictEqual(deduceBlackClassFromSurfaces(16, ["mesial", "occlusal"]), "class_II");
			assert.strictEqual(deduceBlackClassFromSurfaces(47, ["distal"]), "class_II");
			// Anterior incisor proximal without incisal angle -> Class III
			assert.strictEqual(deduceBlackClassFromSurfaces(11, ["mesial"]), "class_III");
			// Anterior incisor with incisal edge involvement -> Class IV
			assert.strictEqual(deduceBlackClassFromSurfaces(21, ["mesial", "occlusal"]), "class_IV");
			// Cervical / vestibular lesion -> Class V
			assert.strictEqual(deduceBlackClassFromSurfaces(13, ["vestibular"]), "class_V");
			assert.strictEqual(deduceBlackClassFromSurfaces(36, ["vestibular"]), "class_V");
		});
	});

	// ─────────────────────────────────────────────────────────────────────────
	// 2. ENDODONTICS PROTOCOL SYNTHESIS (K04.0 & K04.5)
	// ─────────────────────────────────────────────────────────────────────────
	describe("2. Endodontics Protocol Synthesis (K04.0 & K04.5)", () => {
		it("synthesizes full single-visit and multi-visit pulpitis endodontic protocol", () => {
			const diary = synthesizeClinicalDiary({
				toothNumber: 46,
				icd10Code: "K04.0",
				surfaces: ["occlusal", "distal"],
				rootCanalsCount: 3,
				doctorFullName: "Смирнов Алексей Владимирович",
				doctorSpecialty: "Врач-стоматолог-эндодонтист",
			});

			assert.strictEqual(diary.toothNumber, "46");
			assert.strictEqual(diary.assessmentIcd10Code, "K04.0");
			assert.match(diary.assessmentDiagnosisText, /пульпит/i);

			// Diagnostic tests
			assert.strictEqual(diary.percussionVertical, "positive_mild");
			assert.strictEqual(diary.thermalTestResponse, "lingering_sharp_pain");
			assert.strictEqual(diary.probingTenderness, "bleeding_orifice");
			assert.strictEqual(diary.eodMicroamperes, 35);

			// Endodontic stages
			const protocol = diary.procedureProtocol;
			assert.match(protocol, /коффердам/i);
			assert.match(protocol, /Endo-Z|доступ/i);
			assert.match(protocol, /апекслокатор/i);
			assert.match(protocol, /RVG|радиовизиограф/i);
			assert.match(protocol, /ProGlider/i);
			assert.match(protocol, /WaveOne|ProTaper/i);
			assert.match(protocol, /3% NaOCl|гипохлорит/i);
			assert.match(protocol, /17%|EDTA|ЭДТА/i);
			assert.match(protocol, /EndoActivator|ультразвук/i);
			assert.match(protocol, /горячей вертикальной|непрерывной волны/i);
			assert.match(protocol, /AH Plus/i);
		});

		it("synthesizes temporary intracanal calcium medication protocol stage for periodontitis K04.5", () => {
			const diary = synthesizeClinicalDiary({
				toothNumber: 26,
				icd10Code: "K04.5",
				rootCanalsCount: 3,
				endoVisitStage: "access_instrumentation_temporary_calcium",
				doctorFullName: "Смирнов Алексей Владимирович",
			});

			assert.strictEqual(diary.assessmentIcd10Code, "K04.5");
			assert.match(diary.procedureProtocol, /гидроксидом кальция|Кальсепт|Metapex/i);
			assert.match(diary.procedureProtocol, /Cavit|временная/i);
		});
	});

	// ─────────────────────────────────────────────────────────────────────────
	// 3. SURGERY PROTOCOL SYNTHESIS (K08.1)
	// ─────────────────────────────────────────────────────────────────────────
	describe("3. Surgery Protocol Synthesis (K08.1)", () => {
		it("synthesizes complete extraction protocol with curettage, hemostasis, and suturing", () => {
			const diary = synthesizeClinicalDiary({
				toothNumber: 38,
				icd10Code: "K08.1",
				doctorFullName: "Ковалев Дмитрий Игоревич",
				doctorSpecialty: "Врач-стоматолог-хирург",
			});

			assert.strictEqual(diary.toothNumber, "38");
			assert.strictEqual(diary.assessmentIcd10Code, "K08.1");

			const protocol = diary.procedureProtocol;
			assert.match(protocol, /синдесмотомия/i);
			assert.match(protocol, /элеватор/i);
			assert.match(protocol, /щипц/i);
			assert.match(protocol, /кюретаж/i);
			assert.match(protocol, /Альвостим|Spongostan|губк/i);
			assert.match(protocol, /Викрил 4-0|Vicryl|шов/i);
			assert.match(protocol, /гемостаз/i);

			// Post-operative home care recommendations
			assert.match(diary.homeCareRecommendations || "", /20 минут/);
			assert.match(diary.homeCareRecommendations || "", /Холод/);
			assert.match(diary.homeCareRecommendations || "", /ЗАПРЕЩАЕТСЯ/);
			assert.match(diary.homeCareRecommendations || "", /Нимесил/);
		});
	});

	// ─────────────────────────────────────────────────────────────────────────
	// 4. ORTHOPEDICS PROTOCOL SYNTHESIS (K08.1_ORTHO)
	// ─────────────────────────────────────────────────────────────────────────
	describe("4. Orthopedics Protocol Synthesis (K08.1_ORTHO)", () => {
		it("synthesizes complete crown preparation, 2-cord retraction, and scanning protocol", () => {
			const diary = synthesizeClinicalDiary({
				toothNumber: 24,
				icd10Code: "K08.1_ORTHO",
				doctorFullName: "Григорьев Артем Павлович",
				doctorSpecialty: "Врач-стоматолог-ортопед",
			});

			assert.strictEqual(diary.toothNumber, "24");
			const protocol = diary.procedureProtocol;
			assert.match(protocol, /уступ|Chamfer|0.5–1.0 мм/i);
			assert.match(protocol, /Ultrapack #000/i);
			assert.match(protocol, /ViscoStat|гемостатик/i);
			assert.match(protocol, /А-силикон|3D цифровое сканирование|Medit|3Shape/i);
			assert.match(protocol, /Protemp 4/i);
			assert.match(protocol, /TempBond NE/i);
		});
	});

	// ─────────────────────────────────────────────────────────────────────────
	// 5. PERIODONTICS PROTOCOL SYNTHESIS (K05.3)
	// ─────────────────────────────────────────────────────────────────────────
	describe("5. Periodontics Protocol Synthesis (K05.3)", () => {
		it("synthesizes ultrasonic scaling, Air-Flow, and Gracey curettage protocol", () => {
			const diary = synthesizeClinicalDiary({
				icd10Code: "K05.3",
				doctorFullName: "Морозова Анна Николаевна",
				doctorSpecialty: "Врач-стоматолог-пародонтолог",
			});

			assert.strictEqual(diary.assessmentIcd10Code, "K05.3");
			assert.match(diary.procedureProtocol, /EMS Piezon|ультразвуковой скейлинг/i);
			assert.match(diary.procedureProtocol, /Air-Flow/i);
			assert.match(diary.procedureProtocol, /Gracey|кюрет/i);
			assert.match(diary.procedureProtocol, /Метрогил Дента/i);
			assert.match(diary.procedureProtocol, /Septo-pack/i);
		});
	});

	// ─────────────────────────────────────────────────────────────────────────
	// 6. FDI TOOTH NUMBERING & ODONTOGRAM AUTO-SYNTHESIS
	// ─────────────────────────────────────────────────────────────────────────
	describe("6. FDI Tooth Validation & Odontogram Auto-Synthesis", () => {
		it("validates FDI tooth numbers correctly for permanent and primary dentition", () => {
			// Permanent valid: 11-18, 21-28, 31-38, 41-48
			assert.strictEqual(isValidFdiToothNumber(11), true);
			assert.strictEqual(isValidFdiToothNumber(18), true);
			assert.strictEqual(isValidFdiToothNumber(24), true);
			assert.strictEqual(isValidFdiToothNumber(36), true);
			assert.strictEqual(isValidFdiToothNumber(48), true);

			// Deciduous valid: 51-55, 61-65, 71-75, 81-85
			assert.strictEqual(isValidFdiToothNumber(51), true);
			assert.strictEqual(isValidFdiToothNumber(65), true);
			assert.strictEqual(isValidFdiToothNumber(73), true);
			assert.strictEqual(isValidFdiToothNumber(85), true);

			// Invalid teeth
			assert.strictEqual(isValidFdiToothNumber(19), false);
			assert.strictEqual(isValidFdiToothNumber(29), false);
			assert.strictEqual(isValidFdiToothNumber(56), false);
			assert.strictEqual(isValidFdiToothNumber(99), false);
			assert.strictEqual(isValidFdiToothNumber(0), false);
			assert.strictEqual(isValidFdiToothNumber(null), false);
		});

		it("synthesizes diaries for multiple affected teeth from an odontogram", () => {
			const sampleTeeth: FdiToothRecord[] = [
				{ toothNumber: 18, statusCode: "extracted_absent", surfaces: [], mobility: "none", furcationInvolvement: "none" },
				{ toothNumber: 17, statusCode: "healthy", surfaces: [], mobility: "none", furcationInvolvement: "none" },
				{ toothNumber: 16, statusCode: "caries_media", surfaces: ["occlusal", "mesial"], mobility: "none", furcationInvolvement: "none" },
				{ toothNumber: 15, statusCode: "pulpitis_acute", surfaces: ["occlusal"], rootCanalsCount: 2, mobility: "none", furcationInvolvement: "none" },
				{ toothNumber: 14, statusCode: "root_remnant", surfaces: [], mobility: "degree_2", furcationInvolvement: "none" },
				{ toothNumber: 13, statusCode: "crown_zirconia", surfaces: [], mobility: "none", furcationInvolvement: "none" },
			];

			const diaries = synthesizeDiariesFromOdontogram(
				sampleTeeth,
				{ fullName: "Доктор Иванов И.И.", specialty: "Врач-стоматолог общей практики" },
				"2026-08-22",
			);

			// 18 (extracted) and 17 (healthy) are skipped; 16 (caries), 15 (pulpitis), 14 (root), 13 (crown) generated
			assert.strictEqual(diaries.length, 4);

			const diary16 = diaries.find((d) => d.toothNumber === "16");
			assert.ok(diary16);
			assert.strictEqual(diary16.assessmentIcd10Code, "K02.1");

			const diary15 = diaries.find((d) => d.toothNumber === "15");
			assert.ok(diary15);
			assert.strictEqual(diary15.assessmentIcd10Code, "K04.0");

			const diary14 = diaries.find((d) => d.toothNumber === "14");
			assert.ok(diary14);
			assert.strictEqual(diary14.assessmentIcd10Code, "K08.1");

			const diary13 = diaries.find((d) => d.toothNumber === "13");
			assert.ok(diary13);
			assert.strictEqual(diary13.assessmentIcd10Code, "K08.1");
		});
	});

	// ─────────────────────────────────────────────────────────────────────────
	// 7. STATUTORY SEMANTIC AUDIT & COMPLIANCE (ORDER № 834n)
	// ─────────────────────────────────────────────────────────────────────────
	describe("7. Statutory Semantic Audit & Compliance (Order № 834n)", () => {
		it("certifies a compliant clinical diary with 100% score", () => {
			const validDiary = synthesizeClinicalDiary({
				toothNumber: 16,
				icd10Code: "K02.1",
				surfaces: ["occlusal"],
				doctorFullName: "Волкова Екатерина Сергеевна",
			});

			const report = validateForm043uCompliance(validDiary);
			assert.strictEqual(report.isCompliant, true);
			assert.strictEqual(report.complianceScore, 100);
			assert.strictEqual(report.criticalDefectsCount, 0);
			assert.strictEqual(report.semanticChecks.icd10Valid, true);
			assert.strictEqual(report.semanticChecks.fdiToothValid, true);
			assert.strictEqual(report.semanticChecks.diagnosisProtocolConsistent, true);
			assert.match(report.statutorySummaryText, /соответствует требованиям Приказа Минздрава/);
		});

		it("detects missing mandatory legal blocks and semantic violations", () => {
			// Defective diary: empty complaints, invalid ICD-10, missing doctor, endodontic diagnosis without endo protocol
			const defectiveDiary: VisitDiaryEntry043 = {
				id: "defective-1",
				entryDate: "2026-08-22",
				toothNumber: "99", // Invalid FDI
				subjectiveComplaints: "", // Missing complaints
				objectiveStatusLocalis: "зуб", // Too short objective
				assessmentDiagnosisText: "", // Missing text
				assessmentIcd10Code: "INVALID_CODE", // Invalid code
				procedureProtocol: "поставил пломбу", // Inconsistent with pulpitis & no endo
				doctorFullName: "", // Missing doctor
			};

			const report = validateForm043uCompliance(defectiveDiary);
			assert.strictEqual(report.isCompliant, false);
			assert.ok(report.criticalDefectsCount >= 3);
			assert.strictEqual(report.semanticChecks.icd10Valid, false);
			assert.strictEqual(report.semanticChecks.fdiToothValid, false);

			// Check reported defect types
			const defectKeys = report.issues.map((i) => i.blockKey);
			assert.ok(defectKeys.includes("complaints"));
			assert.ok(defectKeys.includes("objective_status"));
			assert.ok(defectKeys.includes("diagnosis"));
			assert.ok(defectKeys.includes("doctor_signature"));
		});

		it("audits full MedicalCardForm043uData structure completeness", () => {
			const fullCardMock = {
				formNumber: "043/у",
				passport: {
					medicalCardNumber: "СТ-2026-001",
					patientFullName: "Иванов Иван Иванович",
					patientBirthDate: "1985-04-12",
					patientIdentityDocument: "Паспорт РФ 45 10 123456",
				},
				anamnesis: {
					allergologicalHistory: "Аллергия на пенициллин, переносит артикаин хорошо",
					chiefComplaint: "Боли в зубе 16",
				},
				dentalStatus: {
					odontogramTeeth: [
						{ toothNumber: 16, statusCode: "caries_media", surfaces: ["occlusal"], mobility: "none", furcationInvolvement: "none" },
					],
				},
				visitDiaries: [
					synthesizeClinicalDiary({
						toothNumber: 16,
						icd10Code: "K02.1",
						doctorFullName: "Волкова Е.С.",
					}),
				],
			};

			const report = validateForm043uCompliance(fullCardMock);
			assert.strictEqual(report.isCompliant, true);
			assert.strictEqual(report.criticalDefectsCount, 0);
			assert.strictEqual(report.missingMandatoryBlocks.length, 0);
		});
	});

	// ─────────────────────────────────────────────────────────────────────────
	// 8. TEXT AND MARKDOWN FORMATTER
	// ─────────────────────────────────────────────────────────────────────────
	describe("8. SOAP Summary Formatter", () => {
		it("formats statutory SOAP diary into readable preview text", () => {
			const diary = synthesizeClinicalDiary({
				toothNumber: 21,
				icd10Code: "K02.1",
				surfaces: ["vestibular"],
				doctorFullName: "Петров П.П.",
				doctorSpecialty: "Врач-стоматолог-терапевт",
			});

			const formatted = formatStatutorySoapSummary(diary);
			assert.match(formatted, /ДНЕВНИК ПРИЁМА ФОРМЫ 043\/у/);
			assert.match(formatted, /\[Зуб 21\]/);
			assert.match(formatted, /S \(ЖАЛОБЫ\):/);
			assert.match(formatted, /O \(STATUS LOCALIS\):/);
			assert.match(formatted, /A \(ДИАГНОЗ МКБ-10\):/);
			assert.match(formatted, /P \(ПРОТОКОЛ ВМЕШАТЕЛЬСТВА\):/);
			assert.match(formatted, /Петров П\.П\./);
		});
	});

	// ─────────────────────────────────────────────────────────────────────────
	// 9. 1-CLICK PRESETS ENUMERATION & COMPLIANCE
	// ─────────────────────────────────────────────────────────────────────────
	describe("9. 1-Click Presets Enumeration & Statutory Validation", () => {
		it("validates all 6 core presets exist with valid codes and specialties", () => {
			const expectedPresetCodes = [
				"K02.1",
				"K04.0",
				"K04.5",
				"K08.1",
				"K08.1_ORTHO",
				"K05.3",
			];

			assert.strictEqual(CORE_1CLICK_PRESETS.length, 6);
			for (const expectedCode of expectedPresetCodes) {
				const found = CORE_1CLICK_PRESETS.find((p) => p.id === expectedCode);
				assert.ok(found, `Preset ${expectedCode} must exist in CORE_1CLICK_PRESETS`);
				assert.ok(found.title.length > 0);
				assert.ok(found.description.length > 0);
			}
		});

		it("synthesizes valid and compliant diaries for each of the 6 core presets", () => {
			for (const preset of CORE_1CLICK_PRESETS) {
				const diary = synthesizeClinicalDiary({
					toothNumber: preset.id === "K05.3" ? null : 16,
					icd10Code: preset.id,
					surfaces: ["occlusal"],
					doctorFullName: "Волкова Екатерина Сергеевна",
					doctorSpecialty: preset.specialty === "orthopedics" ? "Врач-стоматолог-ортопед" : "Врач-стоматолог",
				});

				assert.ok(diary.subjectiveComplaints.length > 0);
				assert.ok(diary.objectiveStatusLocalis.length > 0);
				assert.ok(diary.assessmentDiagnosisText.length > 0);
				assert.ok(diary.procedureProtocol.length > 0);
				assert.strictEqual(diary.doctorFullName, "Волкова Екатерина Сергеевна");

				const report = validateForm043uCompliance(diary);
				assert.strictEqual(report.isCompliant, true, `Preset ${preset.id} must produce compliant report: ${JSON.stringify(report.issues)}`);
				assert.strictEqual(report.criticalDefectsCount, 0);
			}
		});

	});
});

