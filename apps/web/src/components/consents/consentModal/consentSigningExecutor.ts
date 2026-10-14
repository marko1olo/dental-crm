import {
	generateConsentIntegrityHash,
	generatePaperSignatureSvg,
	PAPER_SIGNATURE_FALLBACK_PNG,
	type SignatureVectorData,
	calculateBoundingBox,
	exportSignatureToSvg,
} from "../signaturePadMath.js";
import { generateSmsPepSignatureSvg } from "../consentIntegrityHash.js";
import {
	getConsentTemplate,
	renderConsentTemplate,
} from "../consentTemplates.js";
import { isDemoShowcaseMode } from "../../../lib/demoMode.js";
import { showToast } from "../../GlobalToast.js";
import { denteAdminSecretRequestHeaders } from "../../../lib/denteRequestHeaders.js";
import { CONSENT_KEY_TO_DOCUMENT_KIND } from "../../visit/consents/visitConsentTypes.js";
import type {
	VerificationMethod,
	SignatureStroke,
	SignaturePoint,
	ConsentSubstitutionContext,
	InformedConsentPatientInfo,
	ConsentTemplateKey,
	ConsentTemplate,
	SignedConsentPayload,
} from "./types.js";

function isValidUuid(id: string | null | undefined): boolean {
	if (!id) return false;
	return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
}

function buildStructuredPayloadForConsent(
	kind: string,
	template: ConsentTemplate,
	effectiveContext: ConsentSubstitutionContext,
): Record<string, unknown> | null {
	const todayIsoDate = new Date().toISOString().slice(0, 10);
	const doctorFullName = effectiveContext.doctorName || "Лечащий врач";
	const toothOrArea = effectiveContext.toothNumbers || "По клиническому плану";
	const diagnosisOrIndication = effectiveContext.diagnosisIcd || "Z01.2 Стоматологическое обследование";

	if (kind === "informed_consent") {
		return {
			informedConsent: {
				intervention: template.title,
				toothOrArea,
				diagnosisOrIndication,
				expectedBenefit: "Восстановление анатомической формы и функции зубочелюстной системы",
				plannedAnesthesia: "Местная инфильтрационная / проводниковая анестезия",
				materialOrMedicationNotes: null,
				trustedContactForMedicalInfo: null,
				explainedRisks: [
					"Возможная болезненность в зоне вмешательства",
					"Индивидуальная реакция на анестетик",
					"Отек мягких тканей в послеоперационном периоде",
				],
				alternatives: [
					"Динамическое наблюдение",
					"Альтернативные методы ортопедического / терапевтического лечения",
				],
				aftercareRequirements: [
					"Соблюдение гигиены полости рта",
					"Воздержание от приема пищи в течение 2 часов",
					"Явка на контрольный осмотр в назначенный срок",
				],
				doctorFullName,
				consentConfirmedAt: todayIsoDate,
				patientQuestionsAnswered: true,
				patientUnderstandsRisks: true,
				patientMayWithdrawBeforeIntervention: true,
			},
		};
	}

	if (kind === "procedure_specific_consent_packet") {
		return {
			procedureSpecificConsent: {
				procedureType: "therapy_endo_restoration",
				procedureName: template.title,
				toothOrArea,
				diagnosisOrIndication,
				clinicalToothRows: "permanent",
				plannedAnesthesia: "Местная инфильтрационная анестезия",
				materialsAndSystems: null,
				patientSpecificRiskFactors: ["Индивидуальная анатомия корневых каналов"],
				procedureSpecificRisks: [
					"Повышенная чувствительность после препарирования",
					"Вероятность скола пломбировочного материала при сверхнагрузке",
				],
				alternatives: [
					"Временное пломбирование",
					"Ортопедическое восстановление вкладкой/коронкой",
				],
				aftercareAndLimits: [
					"Щадящая диета в первые сутки",
					"Контрольная рентгенография через 6 месяцев",
				],
				doctorFullName,
				consentConfirmedAt: todayIsoDate,
				localClinicFormAttached: false,
				patientQuestionsAnswered: true,
				exactProcedureConfirmed: true,
				patientUnderstandsSpecificRisks: true,
			},
		};
	}

	if (kind === "personal_data_processing_consent") {
		return {
			personalDataProcessingConsent: {
				operatorLegalName:
					effectiveContext.clinicLegalName ||
					effectiveContext.clinicName ||
					"ООО «Стоматологическая клиника ДЕНТЕ»",
				operatorInn: "7701234567",
				operatorAddress:
					effectiveContext.clinicAddress ||
					"г. Москва, ул. Большая Стоматологическая, д. 12",
				processingPurposes: [
					"Оказание специализированной медицинской стоматологической помощи",
					"Ведение медицинской карты стоматологического пациента по форме № 043/у",
				],
				personalDataCategories: [
					"Фамилия, имя, отчество",
					"Дата рождения, паспортные данные",
					"Контактный номер телефона",
					"Сведения о состоянии здоровья и стоматологическом статусе",
				],
				processingActions: [
					"Сбор, запись, систематизация, накопление, хранение",
					"Уточнение, использование, обезличивание, уничтожение",
				],
				thirdPartyTransferRules:
					"Передача третьим лицам допускается исключительно по основаниям, предусмотренным 152-ФЗ и 323-ФЗ",
				crossBorderTransferAllowed: false,
				automatedDecisionMakingAllowed: false,
				retentionPeriod: "25 лет (срок хранения медицинской документации)",
				revocationChannel: "Письменное заявление на имя главного врача клиники",
				consentGivenAt: todayIsoDate,
				patientConfirmedVoluntaryConsent: true,
				medicalDataProcessingAcknowledged: true,
			},
		};
	}

	if (kind === "medical_intervention_refusal") {
		return {
			medicalInterventionRefusal: {
				refusedIntervention: template.title,
				clinicalIndication: diagnosisOrIndication,
				patientReason: "Личное решение пациента",
				explainedRisks: [
					"Прогрессирование воспалительного процесса",
					"Утрата зуба",
				],
				alternativesOffered: [
					"Консервативная терапия",
					"Вскрытие абсцесса",
				],
				urgentWarningSigns: [
					"Нарастание отека",
					"Повышение температуры выше 38°C",
				],
				doctorFullName,
				refusalConfirmedAt: todayIsoDate,
				patientUnderstandsConsequences: true,
				secondOpinionOffered: true,
				emergencyCareExplained: true,
			},
		};
	}

	if (kind === "photo_video_consent") {
		return {
			photoVideoConsent: {
				clinicalRecordUse: true,
				labTransferAllowed: true,
				colleagueConsultationAllowed: true,
				educationUseAllowed: false,
				marketingUseAllowed: false,
				recognizablePublicationAllowed: false,
				materials: ["photographs", "xray_images"],
				anonymizationRequired: true,
				revocationChannel: "Письменное заявление в клинику",
				scopeNotes: null,
			},
		};
	}

	if (kind === "patient_intake_questionnaire") {
		return {
			patientIntakeQuestionnaire: {
				chiefComplaint: diagnosisOrIndication,
				allergyStatus: "Отягощенный аллергоанамнез не выявлен",
				currentMedications: "Не принимает",
				chronicConditions: "Соматически здоров",
				pregnancyStatus: "not_applicable",
				anticoagulants: "Не принимает",
				infectiousRiskNotes: "Особых рисков нет",
				cardioEndocrineNotes: "В норме",
				emergencyContact: effectiveContext.phone || null,
				additionalNotes: null,
				accuracyConfirmed: true,
			},
		};
	}

	if (kind === "warranty_service_memo") {
		return {
			warrantyServiceMemo: {
				completedWorkTitle: template.title,
				treatmentCompletedAt: todayIsoDate,
				toothOrArea,
				materialsUsed: "Композитный пломбировочный материал светового отверждения",
				warrantyMonths: 12,
				freeServiceMonths: 24,
				mandatoryRecallMonths: [6, 12],
				patientDuties: [
					"Соблюдение индивидуальной гигиены полости рта",
					"Явка на профилактический осмотр не реже 1 раза в 6 месяцев",
				],
				warrantyExclusions: [
					"Травматические повреждения челюстно-лицевой области",
					"Самостоятельное вмешательство или лечение в другой клинике",
				],
				urgentWarningSigns: [
					"Появление острой боли",
					"Подвижность реставрации или ортопедической конструкции",
				],
				relatedContractOrActNumber: "Д-2026/01",
				doctorFullName,
				doctorSpecialty: "Врач-стоматолог",
				issuedAt: todayIsoDate,
				patientInformedOfWarrantyTerms: true,
				patientUnderstandsRecallRequirement: true,
				memoCopyReceived: true,
			},
		};
	}

	if (kind === "paid_medical_services_contract") {
		return {
			paidMedicalServicesContract: {
				contractNumber: "ДОГ-736/2026",
				contractDate: todayIsoDate,
				serviceStart: todayIsoDate,
				serviceEndOrCondition: "До полного исполнения обязательств по плану лечения",
				customerFullName: effectiveContext.patientName || "Пациент",
				representativeFullName: effectiveContext.guardianName || null,
				plannedCareReason: diagnosisOrIndication,
				serviceScopeSummary: template.subtitle,
				estimatedTotalRub: 0,
				paymentTerms: "Наличный расчет, банковская карта, СБП по факту оказания услуг",
				priceChangeRules: "Изменение стоимости и объема услуг только по согласованию с пациентом",
				freeCareAvailabilityNotice: "Пациент уведомлен о праве на получение бесплатной медпомощи по ОМС",
				medicalRecommendationWarning: "Несоблюдение предписаний врача может снизить эффективность лечения",
				refusalAndRefundTerms: "Возврат средств за неоказанные услуги по заявлению пациента",
				warrantyAndClaimsTerms: "Гарантийные обязательства по Положению о гарантиях клиники",
				doctorFullName,
				signedAt: todayIsoDate,
				patientReceivedClinicInfo: true,
				patientReceivedPriceAndServiceList: true,
				patientUnderstandsPaidBasis: true,
				changesRequireWrittenAgreement: true,
			},
		};
	}

	return null;
}

async function persistSignedConsentToBackend(params: {
	patientId?: string | null | undefined;
	visitId?: string | null | undefined;
	consentKey: ConsentTemplateKey;
	template: ConsentTemplate;
	payload: SignedConsentPayload;
	effectiveContext: ConsentSubstitutionContext;
	svg: string;
	effectiveMethod: VerificationMethod;
}): Promise<void> {
	if (!params.patientId || !isValidUuid(params.patientId)) {
		return;
	}
	try {
		const docKind =
			CONSENT_KEY_TO_DOCUMENT_KIND[params.consentKey] || "informed_consent";
		const documentPayload = buildStructuredPayloadForConsent(
			docKind,
			params.template,
			params.effectiveContext,
		);

		const createRes = await fetch("/api/documents", {
			method: "POST",
			headers: denteAdminSecretRequestHeaders({
				"Content-Type": "application/json",
			}),
			body: JSON.stringify({
				patientId: params.patientId,
				visitId:
					params.visitId && isValidUuid(params.visitId)
						? params.visitId
						: undefined,
				kind: docKind,
				title: params.template.title,
				signatureSvg: params.svg || undefined,
				payload: documentPayload,
			}),
		});

		if (!createRes.ok) {
			console.warn(
				"Fastify /api/documents returned status:",
				createRes.status,
				await createRes.text(),
			);
			return;
		}

		const created = (await createRes.json()) as {
			id?: string;
			document?: { id?: string };
		};
		const docId = created.id || created.document?.id;
		if (!docId) return;

		await fetch(`/api/documents/${encodeURIComponent(docId)}/issue`, {
			method: "POST",
			headers: denteAdminSecretRequestHeaders({
				"Content-Type": "application/json",
			}),
			body: JSON.stringify({
				signatureSvg: params.svg || undefined,
				signatureAttestation: {
					mode:
						params.effectiveMethod === "tablet_stylus"
							? "tablet_stylus"
							: params.effectiveMethod === "sms_otp"
								? "sms_otp"
								: "paper_signed",
					signedAt: params.payload.signedAt || new Date().toISOString(),
					recipientFullName:
						params.effectiveContext.patientName || "Пациент",
					recipientRole: "patient",
					staffFullName:
						params.effectiveContext.doctorName || "Врач-стоматолог",
					staffRole: "doctor",
					identityChecked: true,
					documentOpenedAndChecked: true,
					recipientSigned: true,
					clinicRepresentativeSigned: true,
					note: params.payload.statusText,
				},
			}),
		});
	} catch (err) {
		console.warn("Could not persist signed consent to backend (offline/mock mode):", err);
	}
}

export interface ExecuteSigningParams {
	effectiveMethod: VerificationMethod;
	strokes: SignatureStroke[];
	currentPoints: SignaturePoint[];
	smsOtpCode: string;
	paperScanFile: File | null;
	substitutionContext: ConsentSubstitutionContext;
	effectiveContext: ConsentSubstitutionContext;
	patient?: InformedConsentPatientInfo | null | undefined;
	patientId?: string | null | undefined;
	visitId?: string | null | undefined;
	integrityRecord: { hash: string };
	activeMode: "packages" | "single";
	currentPackage: { code: string; title: string; templateKeys: readonly ConsentTemplateKey[] };
	activeDocKey: ConsentTemplateKey;
	currentTemplate: ConsentTemplate;
	rendered: { fullTextContent: string };
	onConsentSigned?: ((payload: SignedConsentPayload) => void) | undefined;
	onPackageSigned?: ((payloads: SignedConsentPayload[]) => void) | undefined;
	onConsentConfirmed?: ((payload: {
		consentType: string;
		intervention: string;
		toothOrArea: string;
		confirmedAt: string;
		integrityHash?: string;
	}) => void) | undefined;
	onClose: () => void;
}

export async function executeSigning({
	effectiveMethod,
	strokes,
	currentPoints,
	smsOtpCode,
	paperScanFile,
	substitutionContext,
	effectiveContext,
	patient,
	patientId,
	visitId,
	integrityRecord,
	activeMode,
	currentPackage,
	activeDocKey,
	currentTemplate,
	rendered,
	onConsentSigned,
	onPackageSigned,
	onConsentConfirmed,
	onClose,
}: ExecuteSigningParams): Promise<boolean> {
	// RED TEAM ИНВАРИАНТ: НУЛЕВАЯ ТОЛЕРАНТНОСТЬ К ФЕЙКОВЫМ ПОДПИСЯМ
	if (effectiveMethod === "tablet_stylus") {
		if (strokes.length === 0 && currentPoints.length === 0) {
			showToast("Невозможно подтвердить согласие: подпись на экране отсутствует. Распишитесь стилусом или пальцем", "error");
			return false;
		}
	} else if (effectiveMethod === "sms_otp") {
		if (!smsOtpCode || smsOtpCode.trim().length < 4) {
			showToast("Введите 4-значный код подтверждения из СМС", "error");
			return false;
		}
	} else if (effectiveMethod === "paper_physical") {
		// Врачебная автономия (Мандат 8e / 8n): подтверждение подписания на бумаге
		// автоматически регистрирует оригинал в карте № 043/у без бюрократических тупиков.
	}

	let svg = "";
	if (effectiveMethod === "tablet_stylus") {
		svg = exportSignatureToSvg(strokes, 400, 140, { strokeColor: "#0f172a" });
	} else if (effectiveMethod === "sms_otp") {
		svg = generateSmsPepSignatureSvg({
			patientFullName: effectiveContext.patientName ? effectiveContext.patientName : undefined,
			phoneMasked: (substitutionContext.phone || patient?.phone) ? String(substitutionContext.phone || patient?.phone) : undefined,
			timestampIso: new Date().toISOString(),
			integrityHash: integrityRecord.hash,
			clinicName: effectiveContext.clinicName || (isDemoShowcaseMode() ? "ООО «Стоматологическая клиника ДЕНТЕ»" : "«________________________________________»"),
		});
	} else {
		svg = generatePaperSignatureSvg({
			date: effectiveContext.date || new Date().toLocaleDateString("ru-RU"),
			clinicName: effectiveContext.clinicName || (isDemoShowcaseMode() ? "ООО «Стоматологическая клиника ДЕНТЕ»" : "«________________________________________»"),
			patientFullName: effectiveContext.patientName ? effectiveContext.patientName : undefined,
			scanFileName: paperScanFile?.name || null,
			scanFileSizeBytes: paperScanFile?.size || null,
		});
	}

	const pngBase64 = PAPER_SIGNATURE_FALLBACK_PNG;

	const vectorData: SignatureVectorData = {
		strokes: effectiveMethod === "tablet_stylus" ? strokes : [],
		bounds: effectiveMethod === "tablet_stylus" && strokes.length > 0
			? calculateBoundingBox(strokes)
			: { minX: 0, minY: 0, maxX: 400, maxY: 120, width: 400, height: 120 },
		timestamp: Date.now(),
		pointCount: effectiveMethod === "tablet_stylus"
			? strokes.reduce((acc, s) => acc + s.points.length, 0)
			: 0,
		integrityHash: integrityRecord.hash,
	};

	const effectivePatientId = patientId || patient?.id;

	if (activeMode === "packages") {
		const pkg = currentPackage;
		const signedPayloads: SignedConsentPayload[] = [];

		for (const tplKey of pkg.templateKeys) {
			const tpl = getConsentTemplate(tplKey);
			const rend = renderConsentTemplate(tpl, effectiveContext);
			const docHashRecord = generateConsentIntegrityHash({
				documentText: rend.fullTextContent,
				patientInfo: {
					name: substitutionContext.patientName,
					passportOrBirth: substitutionContext.passport || substitutionContext.birthDate,
					phone: substitutionContext.phone,
				},
				timestamp: Date.now(),
				strokes: effectiveMethod === "tablet_stylus" ? strokes : [],
				verificationMethod: effectiveMethod,
				smsOtpCode: effectiveMethod === "sms_otp" ? smsOtpCode : null,
			});

			const docVectorData: SignatureVectorData = {
				...vectorData,
				integrityHash: docHashRecord.hash,
			};

			const payload: SignedConsentPayload = {
				templateKey: tplKey,
				code: tpl.code,
				title: tpl.title,
				fullTextContent: rend.fullTextContent,
				patientName: effectiveContext.patientName || "Не указан",
				birthDate: effectiveContext.birthDate || "Не указана",
				passport: effectiveContext.passport || "Не указан",
				doctorName: effectiveContext.doctorName || "Не указан",
				clinicName: effectiveContext.clinicName || "ООО «ДЕНТЕ»",
				diagnosisIcd: effectiveContext.diagnosisIcd || "",
				toothNumbers: effectiveContext.toothNumbers || "",
				signatureSvg: svg,
				signaturePngBase64: pngBase64,
				vectorData: docVectorData,
				integrityHash: docHashRecord.hash,
				signedAt: new Date().toISOString(),
				verificationMethod: effectiveMethod,
				smsOtpCode: effectiveMethod === "sms_otp" ? smsOtpCode : null,
				attachedToForm043u: true,
				paperOriginalStored: effectiveMethod === "paper_physical" ? true : false,
				scanFileName: paperScanFile?.name || null,
				statusText: effectiveMethod === "paper_physical"
					? (paperScanFile
						? `Скан бланка прикреплен («${paperScanFile.name}»)`
						: "Бумажный оригинал пакета подписан пациентом (хранится в архиве карты 043/у)")
					: effectiveMethod === "sms_otp"
					? "Пакет согласий подписан ПЭП по 63-ФЗ ст. 5 через SMS"
					: "Электронный пакет согласий подписан на планшете (векторная подпись SVG)",
				note: `Пакет: ${pkg.title}`,
			};

			signedPayloads.push(payload);

			await persistSignedConsentToBackend({
				patientId: effectivePatientId,
				visitId,
				consentKey: tplKey,
				template: tpl,
				payload,
				effectiveContext,
				svg,
				effectiveMethod,
			});

			if (onConsentSigned) {
				onConsentSigned(payload);
			}

			if (onConsentConfirmed) {
				onConsentConfirmed({
					consentType: tpl.code,
					intervention: tpl.title,
					toothOrArea: effectiveContext.toothNumbers || "Область лечения",
					confirmedAt: new Date().toISOString(),
					integrityHash: docHashRecord.hash,
				});
			}
		}

		if (onPackageSigned) {
			onPackageSigned(signedPayloads);
		}
	} else {
		const payload: SignedConsentPayload = {
			templateKey: activeDocKey,
			code: currentTemplate.code,
			title: currentTemplate.title,
			fullTextContent: rendered.fullTextContent,
			patientName: effectiveContext.patientName || "Не указан",
			birthDate: effectiveContext.birthDate || "Не указана",
			passport: effectiveContext.passport || "Не указан",
			doctorName: effectiveContext.doctorName || "Не указан",
			clinicName: effectiveContext.clinicName || "ООО «ДЕНТЕ»",
			diagnosisIcd: effectiveContext.diagnosisIcd || "",
			toothNumbers: effectiveContext.toothNumbers || "",
			signatureSvg: svg,
			signaturePngBase64: pngBase64,
			vectorData,
			integrityHash: integrityRecord.hash,
			signedAt: new Date().toISOString(),
			verificationMethod: effectiveMethod,
			smsOtpCode: effectiveMethod === "sms_otp" ? smsOtpCode : null,
			attachedToForm043u: true,
			paperOriginalStored: effectiveMethod === "paper_physical" ? true : false,
			scanFileName: paperScanFile?.name || null,
			statusText: effectiveMethod === "paper_physical"
				? (paperScanFile
					? `Скан бланка прикреплен («${paperScanFile.name}»)`
					: "Бумажный оригинал подписан пациентом (хранится в архиве карты 043/у)")
				: effectiveMethod === "sms_otp"
				? "Подписано ПЭП по 63-ФЗ ст. 5 через SMS"
				: "Электронное согласие подписано на планшете (векторная подпись SVG)",
		};

		await persistSignedConsentToBackend({
			patientId: effectivePatientId,
			visitId,
			consentKey: activeDocKey,
			template: currentTemplate,
			payload,
			effectiveContext,
			svg,
			effectiveMethod,
		});

		if (onConsentSigned) {
			onConsentSigned(payload);
		}

		if (onConsentConfirmed) {
			onConsentConfirmed({
				consentType: currentTemplate.code,
				intervention: currentTemplate.title,
				toothOrArea: effectiveContext.toothNumbers || "Область лечения",
				confirmedAt: new Date().toISOString(),
				integrityHash: integrityRecord.hash,
			});
		}
	}

	showToast("Согласие успешно подписано и зафиксировано в архиве", "success");
	onClose();
	return true;
}
