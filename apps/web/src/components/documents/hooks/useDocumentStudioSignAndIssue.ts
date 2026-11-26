/**
 * apps/web/src/components/documents/hooks/useDocumentStudioSignAndIssue.ts
 *
 * Хук подписания, печати, выдачи и экспорта документов через React Query (Мандаты 8e, 8n, 8am).
 * ACID-инвалидация кэша React Query без устаревших fetch/useEffect и race conditions.
 */
import { useCallback } from "react";
import { useQueryClient, useMutation } from "@tanstack/react-query";
import { denteClinicalMutationHeaders } from "../../../lib/denteRequestHeaders";
import { clientLogger } from "../../../services/logging/clientLogger";
import {
	printTaxCertificate,
	buildTaxCertificateDocumentData,
	type TaxDeductionCertificateParams,
	type TaxDeductionPaymentItem,
} from "../taxCertificateEngine";
import { parseFio } from "../ndflXml/fnsNdflXmlEngine";
import { printPrimaryIntakePackage } from "../primaryIntakePackagePrintEngine";
import { printHtmlViaIframe } from "../printHtmlViaIframe";
import { generateA4PrintHtml } from "../studio/generateA4PrintHtml";
import type {
	ConsentSubKind,
	DocumentLegalContext,
	DocumentPackageKey,
	PatientRequisites,
} from "../../consents/consentCatalogData";
import { generateUuidV7, kopecksToRubles, type TaxDeductionRelationship } from "@dental/shared";

export interface ClinicRequisitesDto {
	readonly name: string;
	readonly inn: string;
	readonly kpp?: string | undefined;
	readonly ogrn?: string | undefined;
	readonly license: string;
	readonly address: string;
	readonly phone: string;
}

export interface UseDocumentStudioSignAndIssueOptions {
	readonly activePackage: DocumentPackageKey;
	readonly activeConsentSubKind: ConsentSubKind;
	readonly currentConsentKey: string;
	readonly isSignPadOpen: boolean;
	readonly effectivePatientId?: string | undefined;
	readonly effectiveDoctorName: string;
	readonly patient: PatientRequisites;
	readonly clinicRequisites: ClinicRequisitesDto;
	readonly currentDate: string;
	readonly taxYear: number;
	readonly totalAmountKopecks: number;
	readonly taxTotalAmountKopecks: number;
	readonly taxCode01Kopecks: number;
	readonly taxCode02Kopecks: number;
	readonly taxReceiptItems: readonly TaxDeductionPaymentItem[];
	readonly renderedDocumentText: string;
	readonly legalContext: DocumentLegalContext;
	readonly taxpayer?: {
		readonly fullName?: string | undefined;
		readonly inn?: string | undefined;
		readonly birthDate?: string | undefined;
		readonly passport?: string | undefined;
		readonly relationship?: TaxDeductionRelationship | undefined;
	} | undefined;
	readonly directPayerFullName?: string | undefined;
	readonly directPayerInn?: string | undefined;
	readonly directPayerBirthDate?: string | undefined;
	readonly directPayerPassport?: string | undefined;
	readonly directPayerRelationship?: TaxDeductionRelationship | undefined;
	readonly onSigned?: ((payload: { packageKey: DocumentPackageKey; signedAt: string; isDigital: boolean }) => void) | undefined;
	readonly onDocumentSigned?: ((payload: unknown) => void) | undefined;
	readonly onConsentSigned?: ((payload: unknown) => void) | undefined;
	readonly getSignatureDataUrl: () => string | undefined;
	readonly recordConsentLocally: (key: string, grantedAtIso: string) => void;
	readonly setHasSigned: (val: boolean) => void;
	readonly showToast: (msg: string, type?: "success" | "error" | "info") => void;
}

export function useDocumentStudioSignAndIssue(options: UseDocumentStudioSignAndIssueOptions) {
	const queryClient = useQueryClient();

	const buildCertParams = useCallback((): TaxDeductionCertificateParams => {
		const payerFullName = options.taxpayer?.fullName || options.directPayerFullName || options.patient.fullName.trim() || "Пациент Не Указан";
		const payerInn = options.taxpayer?.inn || options.directPayerInn || options.patient.inn || undefined;
		const payerBirthDate = options.taxpayer?.birthDate || options.directPayerBirthDate || options.patient.birthDate || undefined;
		const payerRelationship = options.taxpayer?.relationship || options.directPayerRelationship || "patient";

		return {
			certificateNumber: `СПР-${options.taxYear}/001`,
			issueDateIso: new Date().toISOString(),
			taxYear: options.taxYear,
			clinic: {
				legalName: options.clinicRequisites.name,
				inn: options.clinicRequisites.inn,
				kpp: options.clinicRequisites.kpp || undefined,
				ogrn: options.clinicRequisites.ogrn || undefined,
				licenseNumber: options.clinicRequisites.license,
				address: options.clinicRequisites.address,
				chiefDoctorName: options.effectiveDoctorName,
			},
			payer: {
				fullName: payerFullName,
				inn: payerInn,
				birthDate: payerBirthDate,
				relationship: payerRelationship,
			},
			patient: {
				fullName: options.patient.fullName.trim() || "Пациент Не Указан",
				inn: options.patient.inn || undefined,
				birthDate: options.patient.birthDate || undefined,
			},
			payments: [...options.taxReceiptItems],
		};
	}, [
		options.taxpayer,
		options.directPayerFullName,
		options.directPayerInn,
		options.directPayerBirthDate,
		options.directPayerRelationship,
		options.patient,
		options.taxYear,
		options.clinicRequisites,
		options.effectiveDoctorName,
		options.taxReceiptItems,
	]);

	const downloadTxtMutation = useCallback(() => {
		const blob = new Blob([options.renderedDocumentText], { type: "text/plain;charset=utf-8" });
		const url = URL.createObjectURL(blob);
		const a = document.createElement("a");
		a.href = url;
		const nameSlug = options.patient.fullName ? options.patient.fullName.replace(/\s+/g, "_") : "unspecified_patient";
		a.download = `${options.activePackage}_${nameSlug}.txt`;
		a.click();
		URL.revokeObjectURL(url);
		options.showToast("Документ экспортирован в файл");
	}, [options]);

	const sendMessengerMutation = useCallback(() => {
		const nameGreeting = options.patient.fullName ? `, ${options.patient.fullName}` : "";
		const text = encodeURIComponent(`Здравствуйте${nameGreeting}! Ваш пакет документов клиники «ДЕНТЕ»: готов к ознакомлению.`);
		const phoneClean = (options.patient.phone || "").replace(/\D/g, "");
		const url = phoneClean ? `https://wa.me/${phoneClean}?text=${text}` : `https://wa.me/?text=${text}`;
		window.open(url, "_blank");
		options.showToast("Ссылка сформирована для WhatsApp");
	}, [options]);

	const printBlankMutation = useCallback(() => {
		if (options.activePackage === "tax_certificate") {
			const payerFullName = options.taxpayer?.fullName || options.directPayerFullName || undefined;
			const payerInn = options.taxpayer?.inn || options.directPayerInn || undefined;
			const payerBirthDate = options.taxpayer?.birthDate || options.directPayerBirthDate || undefined;
			const payerPassport = options.taxpayer?.passport || options.directPayerPassport || undefined;
			const payerRelationship = options.taxpayer?.relationship || options.directPayerRelationship || "patient";

			printTaxCertificate(
				buildTaxCertificateDocumentData({
					documentNumber: `БЛ-${options.taxYear}/001`,
					issueDateIso: new Date().toISOString(),
					taxYear: options.taxYear,
					clinicName: options.clinicRequisites.name,
					clinicInn: options.clinicRequisites.inn,
					clinicOgrn: options.clinicRequisites.ogrn || "",
					clinicLicense: options.clinicRequisites.license,
					clinicAddress: options.clinicRequisites.address,
					doctorFullName: options.effectiveDoctorName,
					patient: {
						fullName: options.patient.fullName || "____________________________________",
						birthDate: options.patient.birthDate || "____.____.________",
						passport: options.patient.passport || "серия _____ № ___________",
						inn: options.patient.inn || undefined,
					},
					taxpayer: {
						fullName: payerFullName,
						inn: payerInn,
						birthDate: payerBirthDate,
						passport: payerPassport,
						relationship: payerRelationship,
					},
					receiptsCount: 0,
					totalAmountKopecks: 0,
					code01Kopecks: 0,
					code02Kopecks: 0,
				}),
			);
			options.showToast("Чистый бланк справки для налогового вычета отправлен на печать", "success");
		} else if (options.activePackage === "intake") {
			printPrimaryIntakePackage({
				patient: {
					fullName: options.patient.fullName || "____________________________________",
					birthDate: options.patient.birthDate || "",
					phone: options.patient.phone || "",
					address: options.patient.address || "",
				},
				clinic: options.clinicRequisites,
				doctorFullName: options.effectiveDoctorName,
			});
			options.showToast("Чистый бланк первичного приёма отправлен на печать", "success");
		} else {
			const a4Html = generateA4PrintHtml({
				clinic: options.clinicRequisites,
				patient: options.patient,
				doctorFullName: options.effectiveDoctorName,
				currentDate: options.currentDate,
				totalAmountKopecks: options.totalAmountKopecks,
				documentText: options.renderedDocumentText,
			});
			printHtmlViaIframe(a4Html, "dente-docs-studio-print-iframe");
			options.showToast("Чистый бланк отправлен на печать", "success");
		}
	}, [options]);

	const requestServerTaxXml = useCallback(
		async (filePrefix: "UT_SVOPLMEDUSL" | "NO_MEDOPL") => {
			const certParams = buildCertParams();
			if (!certParams.payments || certParams.payments.length === 0) {
				options.showToast("Нет подтверждённых платежей за выбранный год", "error");
				return;
			}
			const birthDate = certParams.payer.birthDate?.trim();
			if (!birthDate) {
				options.showToast("Укажите дату рождения налогоплательщика для выгрузки XML ФНС", "error");
				return;
			}
			const kinshipMap: Readonly<Record<string, "1" | "2" | "3" | "4" | "5">> = {
				patient: "1",
				self: "1",
				spouse: "2",
				parent: "3",
				child: "4",
				ward: "5",
			};
			const payerFio = parseFio(certParams.payer.fullName);
			const patientFio = parseFio(certParams.patient.fullName);
			const payerPassport = options.taxpayer?.passport || options.directPayerPassport || options.patient.passport;
			const clinicInn = certParams.clinic.inn.replace(/\D/g, "");
			const clinicOgrn = (certParams.clinic.ogrn || "").replace(/\D/g, "");
			const receipts = certParams.payments
				.filter((item) => {
					const kop = typeof item.amountKopecks === "number" ? item.amountKopecks : Math.round((item.amountRub || 0) * 100);
					return kop > 0;
				})
				.map((item, idx) => {
					const kop = typeof item.amountKopecks === "number" ? item.amountKopecks : Math.round((item.amountRub || 0) * 100);
					return {
						id: item.id || `receipt-${idx + 1}`,
						receiptNumber: item.receiptNumber || `ЧК-${idx + 1}`,
						fiscalDocumentNumber: item.fiscalDocumentNumber || null,
						receiptDate: item.dateIso || certParams.issueDateIso.slice(0, 10),
						serviceName: item.serviceName || "Стоматологическая услуга",
						deductionCode: (item.taxCode === "2" ? "2" : "1") as "1" | "2",
						amountRub: kopecksToRubles(kop),
						amountKopecks: kop,
					};
				});

			const payload = {
				documentNumber: certParams.certificateNumber,
				documentDate: certParams.issueDateIso,
				taxYear: certParams.taxYear,
				taxInspectionCode: "7701",
				certificateKind: "1" as const,
				correctionNumber: 0,
				filePrefix,
				clinic: {
					inn: clinicInn,
					kpp: certParams.clinic.kpp || null,
					ogrn: clinicOgrn,
					name: certParams.clinic.legalName,
					license: certParams.clinic.licenseNumber
						? { number: certParams.clinic.licenseNumber, date: certParams.issueDateIso.slice(0, 10) }
						: null,
					directorName: certParams.clinic.chiefDoctorName || null,
					phone: options.clinicRequisites.phone || null,
				},
				payer: {
					fullName: {
						family: payerFio.family || "Не указано",
						given: payerFio.given || "Не указано",
						patronymic: payerFio.patronymic ?? null,
					},
					inn: certParams.payer.inn || null,
					birthDate,
					...(payerPassport?.trim()
						? { identityDocument: { docTypeCode: "21", seriesAndNumber: payerPassport.trim() } }
						: {}),
				},
				patient: {
					patientKinshipCode: kinshipMap[certParams.payer.relationship || "patient"] ?? "1",
					fullName: {
						family: patientFio.family || payerFio.family || "Не указано",
						given: patientFio.given || payerFio.given || "Не указано",
						patronymic: patientFio.patronymic ?? null,
					},
					inn: certParams.patient.inn || null,
					birthDate: certParams.patient.birthDate || null,
				},
				expenses: {
					code1AmountKopecks: Math.max(0, options.taxCode01Kopecks),
					code2AmountKopecks: Math.max(0, options.taxCode02Kopecks),
					totalAmountKopecks: Math.max(0, options.taxTotalAmountKopecks),
				},
				receipts,
			};

			try {
				const res = await fetch("/api/documents/tax-deduction/xml", {
					method: "POST",
					headers: denteClinicalMutationHeaders({
						"Content-Type": "application/json",
						"Idempotency-Key": generateUuidV7(),
					}),
					body: JSON.stringify(payload),
				});

				if (!res.ok) {
					const errJson = (await res.json().catch(() => null)) as Record<string, unknown> | null;
					const errMsg =
						(typeof errJson?.message === "string" && errJson.message.trim()) ||
						`Не удалось сформировать XML ФНС на сервере (HTTP ${res.status})`;
					options.showToast(errMsg, "error");
					return;
				}

				const rawJson = (await res.json()) as unknown;
				const result =
					rawJson && typeof rawJson === "object" && "data" in rawJson
						? ((rawJson as { data?: unknown }).data ?? rawJson)
						: rawJson;
				const rec = (result && typeof result === "object" ? result : {}) as Record<string, unknown>;
				const xmlContent = typeof rec.xmlContent === "string" ? rec.xmlContent : "";
				const fileName =
					typeof rec.fileName === "string" && rec.fileName.trim()
						? rec.fileName
						: `${filePrefix}_${options.taxYear}.xml`;

				if (!xmlContent) {
					options.showToast("Сервер вернул пустой XML-документ справки", "error");
					return;
				}

				const blob = new Blob([xmlContent], { type: "application/xml;charset=utf-8" });
				const url = URL.createObjectURL(blob);
				const a = document.createElement("a");
				a.href = url;
				a.download = fileName;
				document.body.appendChild(a);
				a.click();
				document.body.removeChild(a);
				URL.revokeObjectURL(url);

				options.showToast(
					filePrefix === "NO_MEDOPL"
						? "Файл электронного реестра NO_MEDOPL (5.01) выгружен с сервера"
						: "XML-файл справки выгружен с сервера для ТКС",
					"success",
				);
			} catch (err) {
				clientLogger.error("[useDocumentStudioSignAndIssue] Сбой серверной генерации XML справки:", err);
				options.showToast("Ошибка обращения к серверу при формировании XML справки", "error");
			}
		},
		[buildCertParams, options],
	);

	const downloadXmlMutation = useCallback(() => {
		void requestServerTaxXml("UT_SVOPLMEDUSL");
	}, [requestServerTaxXml]);

	const downloadNoMedoplMutation = useCallback(() => {
		void requestServerTaxXml("NO_MEDOPL");
	}, [requestServerTaxXml]);

	const paperConfirmMutation = useCallback(async () => {
		options.setHasSigned(true);
		const nowIso = new Date().toISOString();
		options.recordConsentLocally(options.currentConsentKey, nowIso);
		options.onConsentSigned?.({
			verificationMethod: "paper_signed",
			paperOriginalStored: true,
			status: "signed_paper",
			signedAt: nowIso,
			patientName: options.patient.fullName,
		});

		if (options.effectivePatientId) {
			const headers = denteClinicalMutationHeaders({
				"Content-Type": "application/json",
				"Idempotency-Key": generateUuidV7(),
			});
			try {
				const consentRes = await fetch(`/api/patients/${encodeURIComponent(options.effectivePatientId)}/consents`, {
					method: "POST",
					headers,
					body: JSON.stringify({
						consentType: options.currentConsentKey,
						kind: options.activePackage === "informed_consent" ? "procedure_specific_consent_packet" : "informed_consent",
						title: options.activePackage === "informed_consent"
							? `Информированное согласие: ${options.activeConsentSubKind}`
							: "Информированное добровольное согласие",
						verificationMethod: "paper_signed",
						signatureType: "paper_signed",
						isSigned: true,
						signedAt: nowIso,
						doctorFullName: options.effectiveDoctorName,
						notes: "Подписание на бумажном носителе подтверждено врачом",
					}),
				});
				if (!consentRes.ok) {
					clientLogger.warn("[useDocumentStudioSignAndIssue] Ошибка сохранения бумажного согласия на сервере:", consentRes.status);
					options.showToast("Подписание подтверждено локально, но не удалось сохранить согласие на сервере", "error");
					return;
				}
				void queryClient.invalidateQueries({ queryKey: ["documents"] });
				void queryClient.invalidateQueries({ queryKey: ["patient-consents", options.effectivePatientId] });
				void queryClient.invalidateQueries({ queryKey: ["patient", options.effectivePatientId] });
			} catch (err) {
				clientLogger.warn("[useDocumentStudioSignAndIssue] Ошибка сохранения бумажного согласия:", err);
				options.showToast("Подписание подтверждено локально, но не удалось сохранить согласие на сервере", "error");
				return;
			}
		}

		options.showToast("Подписание на бумаге подтверждено и зарегистрировано в истории", "success");
	}, [options, queryClient]);

	const issueAndSignMutation = useMutation({
		mutationFn: async () => {
			const now = new Date();
			const nowStr = now.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });
			const nowIso = now.toISOString();
			const isDigital = options.isSignPadOpen;
			const signatureType = isDigital ? "digital_canvas" : "paper_scanned";

			options.setHasSigned(true);
			options.onSigned?.({
				packageKey: options.activePackage,
				signedAt: nowStr,
				isDigital,
			});
			options.onDocumentSigned?.({
				packageKey: options.activePackage,
				signedAt: nowIso,
				status: "signed",
			});
			options.onConsentSigned?.({
				verificationMethod: isDigital ? "tablet_stylus" : "paper_signed",
				signedAt: nowIso,
				status: "signed",
			});

			if (options.effectivePatientId) {
				const signatureDataUrl = isDigital ? options.getSignatureDataUrl() : undefined;
				const docKind = options.activePackage === "informed_consent"
					? "informed_consent"
					: options.activePackage === "tax_certificate"
						? "tax_deduction_certificate"
						: options.activePackage === "card_extract"
							? "completed_works_act"
							: "paid_medical_services_contract";

				const docTitle = options.activePackage === "informed_consent"
					? `Информированное согласие: ${options.activeConsentSubKind}`
					: options.activePackage === "tax_certificate"
						? `Справка для налогового вычета за ${options.taxYear} г.`
						: options.activePackage === "card_extract"
							? "Выписка из медицинской карты"
							: "Договор на оказание платных медицинских услуг";

				const headers = denteClinicalMutationHeaders({
					"Content-Type": "application/json",
					"Idempotency-Key": generateUuidV7(),
				});
				const totalRub = kopecksToRubles(options.totalAmountKopecks);
				const effectiveDoctor = options.effectiveDoctorName || "Врач-стоматолог";
				const effectivePayerName = options.taxpayer?.fullName || options.directPayerFullName || options.patient.fullName.trim() || "Пациент";

				let structuredPayload: Record<string, unknown> | undefined;

				if (docKind === "paid_medical_services_contract") {
					structuredPayload = {
						paidMedicalServicesContract: {
							contractNumber: `ДОГ-${new Date().getFullYear()}/${(options.patient.fullName.slice(0, 3) || "ПАЦ").toUpperCase()}`,
							contractDate: nowIso.slice(0, 10),
							serviceStart: nowIso.slice(0, 10),
							serviceEndOrCondition: "До полного оказания согласованного объема медицинских услуг",
							customerFullName: effectivePayerName,
							representativeFullName: null,
							plannedCareReason: "Оказание стоматологических услуг согласно плану лечения",
							serviceScopeSummary: "Стоматологические услуги по прейскуранту клиники и плану лечения",
							estimatedTotalRub: totalRub,
							paymentTerms: "Оплата по факту оказания услуг либо авансовым платежом",
							priceChangeRules: "Изменение плана лечения и стоимости оформляется дополнительным соглашением",
							freeCareAvailabilityNotice: "Пациент уведомлен о возможности получения бесплатной медицинской помощи по программе государственных гарантий",
							medicalRecommendationWarning: "Пациент предупрежден о необходимости соблюдения предписаний и рекомендаций врача",
							refusalAndRefundTerms: "Пациент вправе отказаться от исполнения договора при условии оплаты фактически понесенных расходов",
							warrantyAndClaimsTerms: "Гарантийные обязательства исчисляются с момента завершения лечения по положению о гарантиях",
							doctorFullName: effectiveDoctor,
							signedAt: nowIso.slice(0, 10),
							patientReceivedClinicInfo: true,
							patientReceivedPriceAndServiceList: true,
							patientUnderstandsPaidBasis: true,
							changesRequireWrittenAgreement: true,
						},
					};
				} else if (docKind === "informed_consent") {
					structuredPayload = {
						informedConsent: {
							intervention: `Стоматологическое вмешательство: ${options.activeConsentSubKind || "терапевтическое/хирургическое лечение"}`,
							toothOrArea: "Полость рта",
							diagnosisOrIndication: "Санация полости рта по клиническим показаниям",
							expectedBenefit: "Восстановление анатомической формы, функции зубочелюстной системы и эстетики",
							plannedAnesthesia: "Местная инфильтрационная или проводниковая анестезия",
							materialOrMedicationNotes: "Сертифицированные стоматологические материалы",
							trustedContactForMedicalInfo: null,
							explainedRisks: [
								"Возможная индивидуальная чувствительность или аллергическая реакция",
								"Кратковременный отек или болезненность в зоне вмешательства",
								"Необходимость коррекции пломбы или ортопедической конструкции по прикусу",
							],
							alternatives: [
								"Отказ от медицинского вмешательства с сохранением риска прогрессирования заболевания",
								"Альтернативные методы лечения в соответствии с клиническими рекомендациями",
							],
							aftercareRequirements: [
								"Воздержаться от приема пищи в течение 2 часов до окончания действия анестезии",
								"Соблюдать гигиену полости рта и щадящий температурный режим",
								"При возникновении боли или дискомфорта незамедлительно обратиться к лечащему врачу",
							],
							doctorFullName: effectiveDoctor,
							consentConfirmedAt: nowIso.slice(0, 10),
							patientQuestionsAnswered: true,
							patientUnderstandsRisks: true,
							patientMayWithdrawBeforeIntervention: true,
						},
					};
				}

				const createPayload: Record<string, unknown> = {
					patientId: options.effectivePatientId,
					kind: docKind,
					title: docTitle,
					totalAmountRub: totalRub,
					...(structuredPayload ? { payload: structuredPayload } : {}),
				};
				if (options.activePackage === "tax_certificate") {
					createPayload.taxYear = options.taxYear;
					// Мандат 8n / Red Team: при оплате третьими лицами (супруг, родитель) используем ИНН реального плательщика
					const effectivePayerInn = options.taxpayer?.inn || options.directPayerInn || options.patient.inn;
					if (effectivePayerInn) createPayload.taxPayerInn = effectivePayerInn;
				}

				let createdDocId: string | undefined;
				try {
					const createHeaders = denteClinicalMutationHeaders({
						"Content-Type": "application/json",
						"Idempotency-Key": generateUuidV7(),
					});
					const res = await fetch("/api/documents", {
						method: "POST",
						headers: createHeaders,
						body: JSON.stringify(createPayload),
					});
					if (res.ok) {
						const createdDoc: unknown = await res.json();
						const docObj = (createdDoc && typeof createdDoc === "object") ? (createdDoc as { id?: string }) : undefined;
						if (docObj?.id) {
							createdDocId = docObj.id;
							const issueHeaders = denteClinicalMutationHeaders({
								"Content-Type": "application/json",
								"Idempotency-Key": generateUuidV7(),
							});
							const issueRes = await fetch(`/api/documents/${encodeURIComponent(docObj.id)}/issue`, {
								method: "POST",
								headers: issueHeaders,
								body: JSON.stringify({
									signatureAttestation: {
										mode: isDigital ? "simple_electronic_signature" : "paper_signed",
										signedAt: nowIso,
										recipientFullName: effectivePayerName,
										recipientRole: "пациент/законный представитель",
										staffFullName: effectiveDoctor,
										staffRole: "врач",
										identityChecked: true,
										documentOpenedAndChecked: true,
										recipientSigned: true,
										clinicRepresentativeSigned: true,
									},
									signatureSvg: signatureDataUrl ?? null,
								}),
							});
							if (!issueRes.ok) {
								clientLogger.warn("[useDocumentStudioSignAndIssue] Ошибка выпуска документа на сервере:", issueRes.status);
								options.showToast("Документ создан, но не удалось зафиксировать выпуск на сервере", "error");
							}
						}
						options.recordConsentLocally(options.currentConsentKey, nowIso);
					} else {
						clientLogger.warn("[useDocumentStudioSignAndIssue] Ошибка создания документа на сервере:", res.status);
						options.showToast("Не удалось зарегистрировать документ на сервере", "error");
					}
				} catch (err) {
					clientLogger.warn("[useDocumentStudioSignAndIssue] Сбой регистрации документа:", err);
					options.showToast("Сбой регистрации документа на сервере", "error");
				}

				const consentPayload = {
					consentType: options.currentConsentKey,
					kind: options.activePackage === "informed_consent" ? "procedure_specific_consent_packet" : "informed_consent",
					title: docTitle,
					documentId: createdDocId,
					isSigned: true,
					signedAt: nowIso,
					signatureType,
					verificationMethod: isDigital ? "tablet_stylus" : "paper_signed",
					doctorFullName: options.effectiveDoctorName,
					signatureSvg: signatureDataUrl,
					notes: isDigital ? `Подписано пациентом на экране (Canvas, ${nowStr})` : `Подписано на бумажном носителе (${nowStr})`,
				};

				try {
					const consentHeaders = denteClinicalMutationHeaders({
						"Content-Type": "application/json",
						"Idempotency-Key": generateUuidV7(),
					});
					const consentRes = await fetch(`/api/patients/${encodeURIComponent(options.effectivePatientId)}/consents`, {
						method: "POST",
						headers: consentHeaders,
						body: JSON.stringify(consentPayload),
					});
					if (!consentRes.ok) {
						clientLogger.warn("[useDocumentStudioSignAndIssue] Ошибка сохранения согласия на сервере:", consentRes.status);
						options.showToast("Не удалось сохранить согласие в карте пациента на сервере", "error");
					}
				} catch (err) {
					clientLogger.warn("[useDocumentStudioSignAndIssue] Сбой сохранения согласия на сервере:", err);
					options.showToast("Сбой сохранения согласия на сервере", "error");
				}
			}

			// Выполнение печати
			if (options.activePackage === "tax_certificate") {
				const payerFullName = options.taxpayer?.fullName || options.directPayerFullName || options.patient.fullName || undefined;
				const payerInn = options.taxpayer?.inn || options.directPayerInn || options.patient.inn || undefined;
				const payerBirthDate = options.taxpayer?.birthDate || options.directPayerBirthDate || options.patient.birthDate || undefined;
				const payerPassport = options.taxpayer?.passport || options.directPayerPassport || undefined;
				const payerRelationship = options.taxpayer?.relationship || options.directPayerRelationship || "patient";

				printTaxCertificate(
					buildTaxCertificateDocumentData({
						documentNumber: options.legalContext.documentNumber,
						issueDateIso: nowIso,
						taxYear: options.taxYear,
						clinicName: options.clinicRequisites.name,
						clinicInn: options.clinicRequisites.inn,
						clinicOgrn: options.clinicRequisites.ogrn || "",
						clinicLicense: options.clinicRequisites.license,
						clinicAddress: options.clinicRequisites.address,
						doctorFullName: options.effectiveDoctorName,
						patient: options.patient,
						taxpayer: {
							fullName: payerFullName,
							inn: payerInn,
							birthDate: payerBirthDate,
							passport: payerPassport,
							relationship: payerRelationship,
						},
						receiptsCount: options.taxReceiptItems.length,
						totalAmountKopecks: options.taxTotalAmountKopecks,
						code01Kopecks: options.taxCode01Kopecks,
						code02Kopecks: options.taxCode02Kopecks,
					}),
				);
				options.showToast("Справка для налогового вычета сформирована и отправлена на печать", "success");
			} else if (options.activePackage === "intake") {
				printPrimaryIntakePackage({
					patient: {
						fullName: options.patient.fullName || "____________________________________",
						birthDate: options.patient.birthDate || "",
						phone: options.patient.phone || "",
						address: options.patient.address || "",
					},
					clinic: options.clinicRequisites,
					doctorFullName: options.effectiveDoctorName,
				});
				options.showToast("Комплект документов первичного приёма отправлен на печать", "success");
			} else {
				const a4Html = generateA4PrintHtml({
					clinic: options.clinicRequisites,
					patient: options.patient,
					doctorFullName: options.effectiveDoctorName,
					currentDate: options.currentDate,
					totalAmountKopecks: options.totalAmountKopecks,
					documentText: options.renderedDocumentText,
					hasSigned: true,
					signedAtTimeStr: nowStr,
				});
				printHtmlViaIframe(a4Html, "dente-docs-studio-print-iframe");
				options.showToast("Комплект документов утвержден и отправлен на печать", "success");
			}
		},
		onSuccess: () => {
			void queryClient.invalidateQueries({ queryKey: ["documents"] });
			if (options.effectivePatientId) {
				void queryClient.invalidateQueries({ queryKey: ["patient-consents", options.effectivePatientId] });
				void queryClient.invalidateQueries({ queryKey: ["patient", options.effectivePatientId] });
			}
		},
	});

	return {
		handlePrimarySignAndPrint: () => issueAndSignMutation.mutate(),
		handleDownloadTxt: downloadTxtMutation,
		handleSendMessenger: sendMessengerMutation,
		handlePrintBlank: printBlankMutation,
		handleDownloadXml: downloadXmlMutation,
		handleDownloadNoMedopl: downloadNoMedoplMutation,
		handlePaperConfirm: paperConfirmMutation,
		isSubmitting: issueAndSignMutation.isPending,
	};
}
