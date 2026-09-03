import assert from "node:assert/strict";
import { describe, test } from "node:test";
import {
	BASE_INFORMED_CONSENT_PRESET,
	CLINICAL_CONSENT_PRESETS,
	PAID_CONTRACT_736_PRESET,
	PERSONAL_DATA_EGISZ_CONSENT_PRESET,
	documentKindMetadata,
	documentKindSchema,
} from "@dental/shared";
import { useDocumentStore } from "../store/documentStore";
import {
	DOCUMENT_PACKAGES,
	DOCUMENT_PACKAGE_LIST,
	type DocumentPackageId,
	buildDocumentPackageStatePatch,
	getDocumentPackage,
	isDocumentPackageId,
} from "../utils/documentPackages";

describe("Быстрые пакетные генераторы документов (Quick Document Packages)", () => {
	test("Спецификация и валидность всех 4 пакетов документов", () => {
		const expectedPackages: DocumentPackageId[] = [
			"primary",
			"clinical",
			"tax",
			"hospital",
		];
		assert.equal(
			DOCUMENT_PACKAGE_LIST.length,
			4,
			"В системе должно быть ровно 4 быстрых пакета документов",
		);

		for (const pkgId of expectedPackages) {
			assert.ok(
				DOCUMENT_PACKAGES[pkgId],
				`Пакет ${pkgId} должен быть объявлен в DOCUMENT_PACKAGES`,
			);
			const pkg = getDocumentPackage(pkgId);
			assert.ok(pkg.title.length > 0, `Пакет ${pkgId} должен иметь непустой заголовок`);
			assert.ok(
				pkg.shortTitle.length > 0,
				`Пакет ${pkgId} должен иметь непустой короткий заголовок`,
			);
			assert.ok(
				pkg.description.length > 0,
				`Пакет ${pkgId} должен иметь подробное описание`,
			);
			assert.ok(pkg.icon.length > 0, `Пакет ${pkgId} должен иметь иконку`);
			assert.ok(pkg.badge.length > 0, `Пакет ${pkgId} должен иметь бейдж`);
			assert.ok(
				pkg.documentKinds.length >= 4,
				`Пакет ${pkgId} должен содержать как минимум 4 документа (содержит: ${pkg.documentKinds.length})`,
			);
			assert.ok(
				pkg.documentKinds.includes(pkg.primaryKind),
				`primaryKind (${pkg.primaryKind}) должен входить в список documentKinds пакета ${pkgId}`,
			);

			// Проверка каждого документа в пакете
			for (const kind of pkg.documentKinds) {
				const parseRes = documentKindSchema.safeParse(kind);
				assert.ok(
					parseRes.success,
					`Тип документа ${kind} в пакете ${pkgId} должен быть зарегистрирован в схеме DocumentKind`,
				);
				assert.ok(
					documentKindMetadata[kind],
					`Тип документа ${kind} в пакете ${pkgId} должен иметь метаданные в documentKindMetadata`,
				);
			}

			// Проверка структуры items
			assert.equal(
				pkg.items.length,
				pkg.documentKinds.length,
				`Количество items должно совпадать с documentKinds в пакете ${pkgId}`,
			);
			for (const item of pkg.items) {
				assert.ok(
					pkg.documentKinds.includes(item.kind),
					`Item ${item.kind} должен присутствовать в documentKinds пакета ${pkgId}`,
				);
				assert.ok(item.title.length > 0, `Item ${item.kind} должен иметь title`);
				assert.ok(
					item.shortTitle.length > 0,
					`Item ${item.kind} должен иметь shortTitle`,
				);
				assert.ok(
					item.description.length > 0,
					`Item ${item.kind} должен иметь description`,
				);
			}
		}
	});

	test("Вспомогательные утилиты isDocumentPackageId и getDocumentPackage", () => {
		assert.equal(isDocumentPackageId("primary"), true);
		assert.equal(isDocumentPackageId("clinical"), true);
		assert.equal(isDocumentPackageId("tax"), true);
		assert.equal(isDocumentPackageId("hospital"), true);
		assert.equal(isDocumentPackageId("unknown_pkg"), false);
		assert.equal(isDocumentPackageId(null), false);
		assert.equal(isDocumentPackageId(undefined), false);
		assert.equal(isDocumentPackageId(123), false);

		assert.equal(getDocumentPackage("primary").id, "primary");
		assert.equal(getDocumentPackage("clinical").id, "clinical");
		assert.equal(getDocumentPackage("tax").id, "tax");
		assert.equal(getDocumentPackage("hospital").id, "hospital");
	});

	test("Интеграция со стором: Исходное состояние и доступность пакетов", () => {
		const state = useDocumentStore.getState();
		assert.equal(
			state.activeDocumentPackage,
			null,
			"Изначально activeDocumentPackage должен быть null",
		);
		assert.ok(
			typeof state.setActiveDocumentPackage === "function",
			"Стор должен предоставлять функцию setActiveDocumentPackage",
		);
		assert.ok(
			typeof state.applyDocumentPackage === "function",
			"Стор должен предоставлять функцию applyDocumentPackage",
		);
		assert.ok(
			state.documentPackages,
			"Стор должен содержать словарь documentPackages",
		);
		assert.equal(Object.keys(state.documentPackages).length, 4);
	});

	test("Применение Первичного пакета (primary): заполнение ИДС 1051н, ПДн 152-ФЗ, договора ПП 736 и анкеты", () => {
		useDocumentStore.getState().resetDocumentForms();

		useDocumentStore.getState().applyDocumentPackage("primary", {
			doctorFullName: "Терапевт Смирнова А.В.",
		});

		const state = useDocumentStore.getState();
		assert.equal(state.activeDocumentPackage, "primary");
		assert.equal(state.selectedDocumentKind, "patient_intake_questionnaire");

		// ИДС 1051н
		assert.equal(
			state.informedConsentIntervention,
			BASE_INFORMED_CONSENT_PRESET.intervention,
		);
		assert.equal(
			state.informedConsentDiagnosisOrIndication,
			BASE_INFORMED_CONSENT_PRESET.diagnosisOrIndication,
		);
		assert.equal(
			state.informedConsentExpectedBenefit,
			BASE_INFORMED_CONSENT_PRESET.expectedBenefit,
		);
		assert.equal(
			state.informedConsentAnesthesia,
			BASE_INFORMED_CONSENT_PRESET.plannedAnesthesia,
		);
		assert.equal(
			state.informedConsentMaterialNotes,
			BASE_INFORMED_CONSENT_PRESET.materialOrMedicationNotes,
		);
		assert.equal(
			state.informedConsentDoctorFullName,
			"Терапевт Смирнова А.В.",
		);
		assert.equal(state.informedConsentQuestionsAnswered, true);
		assert.equal(state.informedConsentRisksUnderstood, true);
		assert.equal(state.informedConsentWithdrawUnderstood, true);

		// ПДн 152-ФЗ
		assert.equal(
			state.personalDataPurposes,
			PERSONAL_DATA_EGISZ_CONSENT_PRESET.purposes.join("\n"),
		);
		assert.equal(
			state.personalDataCategories,
			PERSONAL_DATA_EGISZ_CONSENT_PRESET.categories.join("\n"),
		);
		assert.equal(state.personalDataVoluntaryConsentConfirmed, true);
		assert.equal(state.personalDataMedicalProcessingAcknowledged, true);

		// Договор ПП РФ 736
		assert.equal(state.paidContractClinicInfoConfirmed, true);
		assert.equal(state.paidContractServiceListConfirmed, true);
		assert.equal(state.paidContractPaidBasisConfirmed, true);
		assert.equal(state.paidContractWrittenChangesConfirmed, true);
		assert.equal(state.paidContractDoctorFullName, "Терапевт Смирнова А.В.");
		assert.equal(
			state.paidContractPaymentTerms,
			PAID_CONTRACT_736_PRESET.paymentTerms,
		);

		// Фотопротокол и анкета
		assert.equal(state.photoVideoClinicalRecordUseConfirmed, true);
		assert.equal(state.photoVideoEducationUseAllowed, true);
		assert.equal(state.intakeAccuracyConfirmed, true);
	});

	test("Применение Клинического пакета (clinical): заполнение процедурного согласия и памятки после приема", () => {
		useDocumentStore.getState().resetDocumentForms();

		useDocumentStore.getState().applyDocumentPackage("clinical", {
			doctorFullName: "Хирург-имплантолог Ковалев Д.М.",
			procedureType: "therapy_endo_restoration",
		});

		const state = useDocumentStore.getState();
		assert.equal(state.activeDocumentPackage, "clinical");
		assert.equal(state.selectedDocumentKind, "dental_medical_card_043u");

		const procPreset = CLINICAL_CONSENT_PRESETS.therapy_endo_restoration;
		assert.equal(state.procedureConsentProcedureType, "therapy_endo_restoration");
		assert.equal(
			state.procedureConsentProcedureName,
			procPreset.procedureName,
		);
		assert.equal(
			state.procedureConsentDiagnosisOrIndication,
			procPreset.diagnosisOrIndication,
		);
		assert.equal(
			state.procedureConsentAnesthesia,
			procPreset.plannedAnesthesia,
		);
		assert.equal(
			state.procedureConsentMaterials,
			procPreset.materialsAndSystems,
		);
		assert.equal(
			state.procedureConsentDoctorFullName,
			"Хирург-имплантолог Ковалев Д.М.",
		);
		assert.equal(state.procedureConsentLocalFormAttached, true);
		assert.equal(state.procedureConsentQuestionsAnswered, true);
		assert.equal(state.procedureConsentExactProcedureConfirmed, true);
		assert.equal(state.procedureConsentRisksUnderstood, true);

		// Памятка после приема
		assert.equal(state.postVisitCareTopic, "filling_restoration");
		assert.ok(state.postVisitHygieneInstructions.length > 0);
		assert.ok(state.postVisitRestrictions.length > 0);
		assert.ok(state.postVisitUrgentWarningSigns.length > 0);
	});

	test("Применение Налогового пакета (tax): настройка справки ФНС 1151156, заявления и квитанции", () => {
		useDocumentStore.getState().resetDocumentForms();

		useDocumentStore.getState().applyDocumentPackage("tax", {
			patientFullName: "Соколов Андрей Сергеевич",
			taxYear: 2025,
		});

		const state = useDocumentStore.getState();
		assert.equal(state.activeDocumentPackage, "tax");
		assert.equal(state.selectedDocumentKind, "tax_deduction_certificate");
		assert.equal(state.taxDocumentYear, 2025);

		// Заявление на вычет
		assert.equal(
			state.taxApplicationTaxpayerFullName,
			"Соколов Андрей Сергеевич",
		);
		assert.equal(state.taxApplicationForm, "standard");
		assert.equal(state.taxApplicationDeliveryChannel, "in_person");
		assert.equal(state.taxApplicationRelationship, "self");
		assert.equal(state.taxApplicationDuplicateWarningAccepted, true);

		// Квитанция об оплате
		assert.equal(state.paymentReceiptTaxSupportRequested, true);
		assert.equal(state.paymentReceiptPaymentsVerified, true);
		assert.equal(state.paymentReceiptPayerVerified, true);
		assert.equal(state.paymentReceiptFiscalNoticeConfirmed, true);
		assert.equal(
			state.paymentReceiptPayerFullName,
			"Соколов Андрей Сергеевич",
		);
		assert.ok(
			state.paymentReceiptPurpose.includes("2025"),
			"Назначение платежа в квитанции должно содержать выбранный налоговый год",
		);
	});

	test("Применение Госпитального пакета (hospital): направление на снимок, выписка 027/у и расписка выдачи", () => {
		useDocumentStore.getState().resetDocumentForms();

		useDocumentStore.getState().applyDocumentPackage("hospital");

		const state = useDocumentStore.getState();
		assert.equal(state.activeDocumentPackage, "hospital");
		assert.equal(state.selectedDocumentKind, "xray_cbct_referral");

		// Амбулаторная карта 025/у
		assert.equal(state.outpatient025uOfficialForm274nChecked, true);
		assert.equal(state.outpatient025uThirdPartyDataChecked, true);

		// Справка о посещении
		assert.equal(state.attendanceDiagnosisDisclosureExcluded, true);
		assert.equal(state.attendanceNotSickLeaveAcknowledged, true);
		assert.ok(
			state.attendancePurpose.includes("стационар"),
			"Цель справки должна указывать на стационар/ЛПУ",
		);

		// Расписка о выдаче документов
		assert.equal(state.releaseChannel, "paper");
		assert.equal(state.releaseThirdPartyDataChecked, true);
		assert.equal(state.releaseRecipientAuthority, "пациент лично");
		assert.ok(
			state.releaseDocumentTypes.includes("Выписка"),
			"Виды документов расписки должны включать выписку",
		);

		// Запрос копий
		assert.equal(state.copyRequestIncludeDicomSourceData, true);
		assert.equal(state.copyRequestIdentityVerified, true);
		assert.equal(state.copyRequestThirdPartyDataChecked, true);
	});

	test("Навигационный цикл: Сброс стора очищает activeDocumentPackage и восстанавливает дефолты", () => {
		// 1. Применяем клинический пакет
		useDocumentStore.getState().applyDocumentPackage("clinical");
		assert.equal(useDocumentStore.getState().activeDocumentPackage, "clinical");
		assert.equal(
			useDocumentStore.getState().procedureConsentQuestionsAnswered,
			true,
		);

		// 2. Сбрасываем формы
		useDocumentStore.getState().resetDocumentForms();
		const afterReset = useDocumentStore.getState();
		assert.equal(
			afterReset.activeDocumentPackage,
			null,
			"После resetDocumentForms activeDocumentPackage должен быть сброшен в null",
		);
		assert.equal(
			afterReset.procedureConsentQuestionsAnswered,
			false,
			"Чекбокс процедуры должен вернуться в false",
		);
		assert.equal(
			afterReset.informedConsentQuestionsAnswered,
			true,
			"Чекбокс ИДС должен вернуться в true по умолчанию для печати в 1 клик",
		);
	});

	test("Навигационный цикл: Переключение документов внутри пакета и смена пакетов", () => {
		useDocumentStore.getState().resetDocumentForms();

		// Выбираем Налоговый пакет
		useDocumentStore.getState().applyDocumentPackage("tax", { taxYear: 2026 });
		assert.equal(useDocumentStore.getState().activeDocumentPackage, "tax");
		assert.equal(
			useDocumentStore.getState().selectedDocumentKind,
			"tax_deduction_certificate",
		);

		// Переключаемся на другой документ внутри налогового пакета (заявление)
		useDocumentStore.getState().setSelectedDocumentKind("tax_deduction_application");
		assert.equal(
			useDocumentStore.getState().selectedDocumentKind,
			"tax_deduction_application",
		);
		assert.equal(useDocumentStore.getState().activeDocumentPackage, "tax");

		// Переключаемся на Госпитальный пакет
		useDocumentStore.getState().applyDocumentPackage("hospital");
		assert.equal(useDocumentStore.getState().activeDocumentPackage, "hospital");
		assert.equal(
			useDocumentStore.getState().selectedDocumentKind,
			"xray_cbct_referral",
		);

		// Переключаемся на выписку внутри госпитального пакета
		useDocumentStore.getState().setSelectedDocumentKind("medical_record_extract");
		assert.equal(
			useDocumentStore.getState().selectedDocumentKind,
			"medical_record_extract",
		);
	});

	test("buildDocumentPackageStatePatch: чистая генерация патча без сайд-эффектов", () => {
		const primaryPatch = buildDocumentPackageStatePatch("primary", {
			doctorFullName: "Д-р Кузнецов",
		});
		assert.equal(primaryPatch.selectedDocumentKind, "patient_intake_questionnaire");
		assert.equal(primaryPatch.informedConsentDoctorFullName, "Д-р Кузнецов");
		assert.equal(primaryPatch.informedConsentQuestionsAnswered, true);

		const clinicalPatch = buildDocumentPackageStatePatch("clinical");
		assert.equal(clinicalPatch.selectedDocumentKind, "dental_medical_card_043u");
		assert.equal(clinicalPatch.procedureConsentExactProcedureConfirmed, true);

		const taxPatch = buildDocumentPackageStatePatch("tax", { taxYear: 2024 });
		assert.equal(taxPatch.selectedDocumentKind, "tax_deduction_certificate");
		assert.equal(taxPatch.taxDocumentYear, 2024);

		const hospitalPatch = buildDocumentPackageStatePatch("hospital");
		assert.equal(hospitalPatch.selectedDocumentKind, "xray_cbct_referral");
		assert.equal(hospitalPatch.attendanceDiagnosisDisclosureExcluded, true);
	});
});
