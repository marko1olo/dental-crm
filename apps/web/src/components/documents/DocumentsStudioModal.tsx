/**
 * apps/web/src/components/documents/DocumentsStudioModal.tsx
 *
 * Единая каноническая студия документов, согласий (ИДС) и справок DENTE CRM (SSOT).
 * Объединяет клинические документы и согласия в неразрывный рабочий контур (Мандаты 8e, 8n, 8am).
 * Ровно 1 Primary CTA кнопка #0d9488 (Мандат 8am), ZERO disabled кнопок (Мандат 8e, Автономия врача).
 * Apple HIG: Bottom Sheet на тач-экранах, тактильный хэндл 36x5px, тач-таргеты >= 44x44px.
 * Мандат 8wy: Полная изоляция боевого режима от демо-мокапов. В проде без пациента — чистый стейт.
 * Целевой размер фасада: 320–380 строк (Sweet Spot Mandate 8b, строго <= 420 строк).
 */

import React, { useState, useMemo, useCallback } from "react";
import { isDemoShowcaseMode } from "../../lib/demoMode";
import { denteAdminSecretRequestHeaders } from "../../lib/denteRequestHeaders";
import {
	printTaxCertificate,
	buildTaxCertificateDocumentData,
	resolveTaxDeductionCategory,
} from "./taxCertificateEngine";
import {
	DEFAULT_CLINIC_REQUISITES,
	DEMO_SAMPLE_PATIENT,
	DEMO_SAMPLE_SERVICES,
	EMPTY_PATIENT_REQUISITES,
	EMPTY_SERVICES,
	type ConsentSubKind,
	type DocumentLegalContext,
	type DocumentPackageKey,
	type DocumentServiceItem,
	type PatientRequisites,
	formatKopecksToRubles,
	generateCardExtractTemplate,
	generateContractTemplate,
	generateInformedConsentTemplate,
	generateIntakePackageTemplate,
	generateTaxCertificateTemplate,
	sumKopecks,
} from "../consents/consentCatalogData";
import {
	DocumentsStudioHeader,
	DocumentsStudioFooter,
	DocumentsPackageSelector,
	ConsentSignersRow,
	useCanvasSigner,
	usePatientConsents,
} from "./studio";
import "./documentsStudio.css";

export type DocumentTemplateKey = DocumentPackageKey | "contract" | "act" | "consent" | "tax_deduction";
export type TaxDeductionTab = "form" | "checks" | "family" | "xml" | "registry";

export interface DocumentsStudioModalProps {
	readonly isOpen: boolean;
	readonly onClose: () => void;
	readonly patientContext?: {
		readonly id?: string | undefined;
		readonly fullName?: string | undefined;
		readonly birthDate?: string | undefined;
		readonly passport?: string | undefined;
		readonly phone?: string | undefined;
		readonly address?: string | undefined;
		readonly inn?: string | undefined;
		readonly [key: string]: unknown;
	} | undefined;
	readonly patient?: {
		readonly id?: string | undefined;
		readonly fullName?: string | undefined;
		readonly birthDate?: string | undefined;
		readonly passport?: string | undefined;
		readonly phone?: string | undefined;
		readonly address?: string | undefined;
		readonly inn?: string | undefined;
		readonly snils?: string | undefined;
		readonly [key: string]: unknown;
	} | undefined;
	readonly patientId?: string | undefined;
	readonly patientName?: string | undefined;
	readonly patientBirthDate?: string | undefined;
	readonly patientInn?: string | undefined;
	readonly patientSnils?: string | undefined;
	readonly doctorName?: string | undefined;
	readonly doctorFullName?: string | undefined;
	readonly isMinorPatient?: boolean | undefined;
	readonly initialTemplate?: DocumentTemplateKey | undefined;
	readonly initialDocId?: string | undefined;
	readonly initialTab?: string | undefined;
	readonly selectedYear?: number | undefined;
	readonly initialYear?: number | undefined;
	readonly payments?: readonly unknown[] | undefined;
	readonly allPayments?: readonly unknown[] | undefined;
	readonly clinicProfileDraft?: {
		readonly clinicName?: string | undefined;
		readonly legalName?: string | undefined;
		readonly inn?: string | undefined;
		readonly kpp?: string | undefined;
		readonly ogrn?: string | undefined;
		readonly address?: string | undefined;
		readonly phone?: string | undefined;
		readonly medicalLicenseNumber?: string | undefined;
		readonly directorFullName?: string | undefined;
		readonly [key: string]: unknown;
	} | undefined;
	readonly clinicName?: string | undefined;
	readonly clinicInn?: string | undefined;
	readonly clinicKpp?: string | undefined;
	readonly clinicOgrn?: string | undefined;
	readonly clinicAddress?: string | undefined;
	readonly clinicLicenseNumber?: string | undefined;
	readonly clinicLicenseDate?: string | undefined;
	readonly services?: readonly DocumentServiceItem[] | undefined;
	readonly diagnosisRu?: string | undefined;
	readonly anamnesisRu?: string | undefined;
	readonly epicrisisRu?: string | undefined;
	readonly onSigned?: ((payload: { packageKey: DocumentPackageKey; signedAt: string; isDigital: boolean }) => void) | undefined;
	readonly onDocumentSigned?: ((payload: unknown) => void) | undefined;
	readonly onConsentSigned?: ((payload: unknown) => void) | undefined;
	readonly [key: string]: unknown;
}

export const NO_PATIENT_SELECTED_PLACEHOLDER =
	"[Пациент не выбран. Выберите пациента в CRM для автоматического заполнения договора и ИДС]";

export const DocumentsStudioModal: React.FC<DocumentsStudioModalProps> = ({
	isOpen,
	onClose,
	patientContext,
	patient: directPatient,
	patientId: directPatientId,
	patientName: directPatientName,
	patientBirthDate: directPatientBirthDate,
	patientInn: directPatientInn,
	patientSnils: directPatientSnils,
	doctorName: directDoctorName,
	doctorFullName: directDoctorFullName,
	initialTemplate = "intake",
	initialDocId,
	selectedYear,
	initialYear,
	payments,
	clinicProfileDraft,
	clinicName: directClinicName,
	clinicInn: directClinicInn,
	clinicKpp: directClinicKpp,
	clinicOgrn: directClinicOgrn,
	clinicAddress: directClinicAddress,
	clinicLicenseNumber: directClinicLicenseNumber,
	services,
	diagnosisRu,
	anamnesisRu,
	epicrisisRu,
	onSigned,
	onDocumentSigned,
	onConsentSigned,
}) => {
	const isDemo = isDemoShowcaseMode();

	const resolvedInitialPackage = useMemo<DocumentPackageKey>(() => {
		if (initialTemplate === "contract") return "intake";
		if (initialTemplate === "act") return "card_extract";
		if (initialTemplate === "consent" || initialDocId) return "informed_consent";
		if (initialTemplate === "tax_deduction" || initialTemplate === "tax_certificate") return "tax_certificate";
		return (initialTemplate as DocumentPackageKey) || "intake";
	}, [initialTemplate, initialDocId]);

	const [activePackage, setActivePackage] = useState<DocumentPackageKey>(resolvedInitialPackage);
	const [activeConsentSubKind, setActiveConsentSubKind] = useState<ConsentSubKind>(
		(initialDocId as ConsentSubKind) || "therapy",
	);
	const [taxYear, setTaxYear] = useState<number>(selectedYear || initialYear || 2026);
	const [isSignPadOpen, setIsSignPadOpen] = useState<boolean>(false);
	const [hasSigned, setHasSigned] = useState<boolean>(false);
	const [toastNotice, setToastNotice] = useState<string | null>(null);
	const [toastType, setToastType] = useState<"success" | "error" | "info">("info");

	const {
		canvasRef,
		startDrawing,
		draw,
		stopDrawing,
		clearCanvas,
		getSignatureDataUrl,
	} = useCanvasSigner(() => setHasSigned(false));

	const effectivePatientId = patientContext?.id || directPatient?.id || directPatientId;
	const { patientConsentsMap, recordConsentLocally } = usePatientConsents(isOpen, effectivePatientId);

	const currentConsentKey = useMemo<string>(() => {
		if (activePackage === "informed_consent") return activeConsentSubKind;
		return activePackage;
	}, [activePackage, activeConsentSubKind]);

	const existingConsent = patientConsentsMap[currentConsentKey] || patientConsentsMap[activePackage];

	const signedAtTimeStr = useMemo(() => {
		if (!existingConsent?.grantedAt) return null;
		return new Date(existingConsent.grantedAt).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });
	}, [existingConsent]);

	const effectiveHasSigned = hasSigned || Boolean(existingConsent);
	const signedStatusLabel = signedAtTimeStr ? `Подписано пациентом в ${signedAtTimeStr}` : hasSigned ? "Подписано" : undefined;

	const patient: PatientRequisites = useMemo(() => {
		if (patientContext) {
			return {
				fullName: patientContext.fullName || directPatientName || "",
				birthDate: patientContext.birthDate || directPatientBirthDate || "",
				passport: patientContext.passport || "",
				address: patientContext.address || "",
				phone: patientContext.phone || "",
				...(patientContext.inn || directPatientInn ? { inn: patientContext.inn || directPatientInn } : {}),
			};
		}
		if (directPatient) {
			return {
				fullName: directPatient.fullName || directPatientName || "",
				birthDate: directPatient.birthDate || directPatientBirthDate || "",
				passport: directPatient.passport || "",
				address: directPatient.address || "",
				phone: directPatient.phone || "",
				...(directPatient.inn || directPatientInn ? { inn: directPatient.inn || directPatientInn } : {}),
			};
		}
		if (directPatientName || directPatientBirthDate || directPatientInn) {
			return {
				fullName: directPatientName || "",
				birthDate: directPatientBirthDate || "",
				passport: "",
				address: "",
				phone: "",
				...(directPatientInn ? { inn: directPatientInn } : {}),
			};
		}
		return isDemo ? DEMO_SAMPLE_PATIENT : EMPTY_PATIENT_REQUISITES;
	}, [patientContext, directPatient, directPatientName, directPatientBirthDate, directPatientInn, isDemo]);

	const currentDate = useMemo(() => {
		return new Date().toLocaleDateString("ru-RU", { day: "2-digit", month: "2-digit", year: "numeric" });
	}, []);

	const effectiveDoctorName = directDoctorFullName || directDoctorName || (isDemo ? "Смирнова Елена Сергеевна" : "______________________");

	const clinicRequisites = useMemo(() => {
		return {
			name: clinicProfileDraft?.legalName || clinicProfileDraft?.clinicName || directClinicName || DEFAULT_CLINIC_REQUISITES.name,
			inn: clinicProfileDraft?.inn || directClinicInn || DEFAULT_CLINIC_REQUISITES.inn,
			kpp: clinicProfileDraft?.kpp || directClinicKpp || DEFAULT_CLINIC_REQUISITES.kpp,
			ogrn: clinicProfileDraft?.ogrn || directClinicOgrn || DEFAULT_CLINIC_REQUISITES.ogrn,
			license: clinicProfileDraft?.medicalLicenseNumber || directClinicLicenseNumber || DEFAULT_CLINIC_REQUISITES.license,
			address: clinicProfileDraft?.address || directClinicAddress || DEFAULT_CLINIC_REQUISITES.address,
			phone: clinicProfileDraft?.phone || DEFAULT_CLINIC_REQUISITES.phone,
		};
	}, [clinicProfileDraft, directClinicName, directClinicInn, directClinicKpp, directClinicOgrn, directClinicLicenseNumber, directClinicAddress]);

	// Адаптация переданных платежей для расчета справок ФНС
	const paymentServices: readonly DocumentServiceItem[] = useMemo(() => {
		if (Array.isArray(payments) && payments.length > 0) {
			return payments.map(
				(
					pmt: {
						amountKopecks?: number | null;
						amountRub?: number | string | null;
						amount?: number | string | null;
						code804n?: string | null;
						serviceName?: string | null;
						description?: string | null;
						receiptNumber?: string | null;
					},
					idx: number,
				) => {
					const amtKopecks =
						typeof pmt.amountKopecks === "number"
							? pmt.amountKopecks
							: Math.round(Number(pmt.amountRub || pmt.amount || 0) * 100);
					return {
						code: pmt.code804n || `PAY-${idx + 1}`,
						title:
							pmt.serviceName ||
							pmt.description ||
							`Оплата медицинских услуг (чек №${pmt.receiptNumber || idx + 1})`,
						quantity: 1,
						priceKopecks: amtKopecks,
						amountKopecks: amtKopecks,
					};
				},
			);
		}
		return [];
	}, [payments]);

	const effectiveServices: readonly DocumentServiceItem[] = useMemo(() => {
		if (paymentServices.length > 0) return paymentServices;
		if (services && services.length > 0) return services;
		return isDemo ? DEMO_SAMPLE_SERVICES : EMPTY_SERVICES;
	}, [paymentServices, services, isDemo]);

	const totalAmountKopecks = useMemo(() => sumKopecks(effectiveServices), [effectiveServices]);

	const { code01Kopecks, code02Kopecks } = useMemo(() => {
		let c1 = 0;
		let c2 = 0;
		for (const s of effectiveServices) {
			const cat = resolveTaxDeductionCategory(s.code, s.title);
			const amt = s.amountKopecks || (s.priceKopecks * (s.quantity || 1)) || 0;
			if (cat === "2") {
				c2 += amt;
			} else {
				c1 += amt;
			}
		}
		if (c1 === 0 && c2 === 0 && totalAmountKopecks > 0) {
			c1 = totalAmountKopecks;
		}
		return { code01Kopecks: c1, code02Kopecks: c2 };
	}, [effectiveServices, totalAmountKopecks]);

	const clinicalTexts = useMemo(() => ({
		diagnosis: diagnosisRu !== undefined ? diagnosisRu : (isDemo ? "К02.1 Кариес дентина зуба 4.6. Интактный зубной ряд." : ""),
		anamnesis: anamnesisRu !== undefined ? anamnesisRu : (isDemo ? "Жалобы на кратковременные боли от температурных раздражителей. Аллергоанамнез чист." : ""),
		epicrisis: epicrisisRu !== undefined ? epicrisisRu : (isDemo ? "Кариозная полость санирована, анатомия восстановлена. Гарантия клиники: 12 месяцев." : ""),
	}), [diagnosisRu, anamnesisRu, epicrisisRu, isDemo]);

	const legalContext: DocumentLegalContext = useMemo(() => ({
		clinic: clinicRequisites,
		patient,
		doctor: { fullName: effectiveDoctorName, specialty: "Врач-стоматолог терапевт" },
		documentNumber: isDemo
			? "КЛ-2026/894"
			: (effectivePatientId ? `Д-2026/${effectivePatientId.slice(0, 6)}` : "БЛ-2026/001"),
		documentDate: currentDate,
		taxYear,
		services: effectiveServices,
		totalAmountKopecks,
		diagnosisRu: clinicalTexts.diagnosis,
		anamnesisRu: clinicalTexts.anamnesis,
		epicrisisRu: clinicalTexts.epicrisis,
		consentSubKind: activeConsentSubKind,
	}), [clinicRequisites, patient, effectiveDoctorName, isDemo, effectivePatientId, currentDate, taxYear, effectiveServices, totalAmountKopecks, clinicalTexts, activeConsentSubKind]);

	const hasNoConfirmedPayments = (Array.isArray(payments) && payments.length === 0) && (!effectiveServices || effectiveServices.length === 0);

	// Генерация текста текущего документа в зависимости от выбранного пакета
	const renderedDocumentText = useMemo(() => {
		if (!isDemo && !patient.fullName.trim() && !hasNoConfirmedPayments) {
			return NO_PATIENT_SELECTED_PLACEHOLDER;
		}
		switch (activePackage) {
			case "informed_consent":
				return generateInformedConsentTemplate(legalContext, activeConsentSubKind);
			case "tax_certificate": {
				const baseText = generateTaxCertificateTemplate(legalContext);
				const codeBreakdown = `\n[РАЗДЕЛЕНИЕ ПО КОДАМ УСЛУГ ДЛЯ ФНС]:\nКод 1 (стандартные медицинские услуги): ${formatKopecksToRubles(code01Kopecks)}\nКод 2 (дорогостоящее лечение): ${formatKopecksToRubles(code02Kopecks)}\n`;
				const emptyNote = hasNoConfirmedPayments ? "\n[Нет подтвержденных фискальных оплат за указанный налоговый период. Формируется чистый бланк со штампом клиники]\n" : "";
				return `Справка для налогового вычета (ФНС) · КНД 1151156\n${baseText}${codeBreakdown}${emptyNote}`;
			}
			case "card_extract":
				return generateCardExtractTemplate(legalContext);
			default:
				return generateIntakePackageTemplate(legalContext);
		}
	}, [isDemo, patient.fullName, hasNoConfirmedPayments, activePackage, legalContext, activeConsentSubKind, code01Kopecks, code02Kopecks]);

	const showToast = useCallback((msg: string, type: "success" | "error" | "info" = "info") => {
		setToastNotice(msg);
		setToastType(type);
		setTimeout(() => {
			setToastNotice(null);
			setToastType("info");
		}, 3200);
	}, []);

	const handleDownloadTxt = useCallback(() => {
		const blob = new Blob([renderedDocumentText], { type: "text/plain;charset=utf-8" });
		const url = URL.createObjectURL(blob);
		const a = document.createElement("a");
		a.href = url;
		const nameSlug = patient.fullName ? patient.fullName.replace(/\s+/g, "_") : "unspecified_patient";
		a.download = `${activePackage}_${nameSlug}.txt`;
		a.click();
		URL.revokeObjectURL(url);
		showToast("Документ экспортирован в файл");
	}, [renderedDocumentText, activePackage, patient.fullName, showToast]);

	const handleSendMessenger = useCallback(() => {
		const nameGreeting = patient.fullName ? `, ${patient.fullName}` : "";
		const text = encodeURIComponent(`Здравствуйте${nameGreeting}! Ваш пакет документов клиники «ДЕНТЕ»: готов к ознакомлению.`);
		const phoneClean = (patient.phone || "").replace(/\D/g, "");
		const url = phoneClean ? `https://wa.me/${phoneClean}?text=${text}` : `https://wa.me/?text=${text}`;
		window.open(url, "_blank");
		showToast("Ссылка сформирована для WhatsApp");
	}, [patient.fullName, patient.phone, showToast]);

	const handlePrintBlank = useCallback(() => {
		if (activePackage === "tax_certificate") {
			printTaxCertificate(
				buildTaxCertificateDocumentData({
					documentNumber: `БЛ-${taxYear}/001`,
					issueDateIso: new Date().toISOString(),
					taxYear,
					clinicName: clinicRequisites.name,
					clinicInn: clinicRequisites.inn,
					clinicOgrn: clinicRequisites.ogrn,
					clinicLicense: clinicRequisites.license,
					clinicAddress: clinicRequisites.address,
					doctorFullName: effectiveDoctorName,
					patient: {
						fullName: patient.fullName || "____________________________________",
						birthDate: patient.birthDate || "____.____.________",
						passport: patient.passport || "серия _____ № ___________",
						inn: patient.inn || undefined,
					},
					receiptsCount: 0,
					totalAmountKopecks: 0,
					code01Kopecks: 0,
					code02Kopecks: 0,
				}),
			);
			showToast("Чистый бланк справки для налогового вычета отправлен на печать", "success");
		} else {
			window.print();
			showToast("Чистый бланк отправлен на печать", "success");
		}
	}, [activePackage, taxYear, clinicRequisites, effectiveDoctorName, patient, showToast]);

	const handlePaperConfirm = useCallback(() => {
		setHasSigned(true);
		const nowIso = new Date().toISOString();
		recordConsentLocally(currentConsentKey, nowIso);
		onConsentSigned?.({
			verificationMethod: "paper_signed",
			paperOriginalStored: true,
			status: "signed_paper",
			signedAt: nowIso,
			patientName: patient.fullName,
		});
		showToast("Подписание на бумаге подтверждено и зарегистрировано в истории", "success");
	}, [currentConsentKey, recordConsentLocally, onConsentSigned, patient.fullName, showToast]);

	const handleDownloadXml = useCallback(() => {
		const blob = new Blob([`<FNS_TAX_DEDUCTION_KND1151156 Year="${taxYear}" Patient="${patient.fullName}" Inn="${patient.inn || ''}" TotalKopecks="${totalAmountKopecks}" Code1="${code01Kopecks}" Code2="${code02Kopecks}" />`], { type: "application/xml;charset=utf-8" });
		const url = URL.createObjectURL(blob);
		const a = document.createElement("a");
		a.href = url;
		a.download = `FNS_1151156_${taxYear}_${patient.inn || 'draft'}.xml`;
		a.click();
		URL.revokeObjectURL(url);
		showToast("XML-файл справки выгружен для ТКС", "success");
	}, [taxYear, patient.fullName, patient.inn, totalAmountKopecks, code01Kopecks, code02Kopecks, showToast]);

	const handleDownloadNoMedopl = useCallback(() => {
		const blob = new Blob([`<NO_MEDOPL_5_01 Version="5.01" Year="${taxYear}" Clinic="${clinicRequisites.name}" Inn="${clinicRequisites.inn}" Count="1" Total="${totalAmountKopecks}" />`], { type: "application/xml;charset=utf-8" });
		const url = URL.createObjectURL(blob);
		const a = document.createElement("a");
		a.href = url;
		a.download = `NO_MEDOPL_${taxYear}_${clinicRequisites.inn}.xml`;
		a.click();
		URL.revokeObjectURL(url);
		showToast("Файл электронного реестра NO_MEDOPL (5.01) выгружен", "success");
	}, [taxYear, clinicRequisites.name, clinicRequisites.inn, totalAmountKopecks, showToast]);

	const handlePrimarySignAndPrint = useCallback(async () => {
		setHasSigned(true);
		const now = new Date();
		const nowStr = now.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });
		const nowIso = now.toISOString();
		const isDigital = isSignPadOpen;
		const signatureType = isDigital ? "digital_canvas" : "paper_scanned";

		onSigned?.({
			packageKey: activePackage,
			signedAt: nowStr,
			isDigital,
		});
		onDocumentSigned?.({
			packageKey: activePackage,
			signedAt: nowIso,
			status: "signed",
		});
		onConsentSigned?.({
			verificationMethod: isDigital ? "tablet_stylus" : "paper_signed",
			signedAt: nowIso,
			status: "signed",
		});

		// Единый канонический флоу: регистрация документа в generated_documents и выдача (/issue)
		if (effectivePatientId) {
			const signatureDataUrl = isDigital ? getSignatureDataUrl() : undefined;
			const docKind = activePackage === "informed_consent"
				? "informed_consent"
				: activePackage === "tax_certificate"
					? "tax_deduction_certificate"
					: activePackage === "card_extract"
						? "completed_works_act"
						: "paid_medical_services_contract";

			const docTitle = activePackage === "informed_consent"
				? `Информированное согласие: ${activeConsentSubKind}`
				: activePackage === "tax_certificate"
					? `Справка для налогового вычета за ${taxYear} г.`
					: activePackage === "card_extract"
						? "Выписка из медицинской карты"
						: "Договор на оказание платных медицинских услуг";

			const headers = denteAdminSecretRequestHeaders({ "Content-Type": "application/json" });
			const createPayload: Record<string, unknown> = {
				patientId: effectivePatientId,
				kind: docKind,
				title: docTitle,
				totalAmountRub: totalAmountKopecks > 0 ? totalAmountKopecks / 100 : 0,
			};
			if (activePackage === "tax_certificate") {
				createPayload.taxYear = taxYear;
				if (patient.inn) createPayload.taxPayerInn = patient.inn;
			}

			void fetch("/api/documents", {
				method: "POST",
				headers,
				body: JSON.stringify(createPayload),
			})
				.then(async (res) => {
					if (res.ok) {
						const createdDoc = await res.json();
						if (createdDoc?.id) {
							await fetch(`/api/documents/${encodeURIComponent(createdDoc.id)}/issue`, {
								method: "POST",
								headers,
								body: JSON.stringify({
									signatureAttestation: {
										staffFullName: effectiveDoctorName || "Врач-стоматолог",
										staffRole: "врач",
										signedAt: nowIso,
										verificationMethod: isDigital ? "tablet_stylus" : "paper_signed",
									},
								}),
							});
						}
						recordConsentLocally(currentConsentKey, nowIso);
					} else {
						console.warn("[DocumentsStudioModal] Ошибка регистрации документа в реестре:", res.status);
					}
				})
				.catch((err) => {
					console.warn("[DocumentsStudioModal] Сбой сети при регистрации документа:", err);
				});

			// Синхронизация согласия в истории пациента
			const consentPayload = {
				consentType: currentConsentKey,
				kind: activePackage === "informed_consent" ? "procedure_specific_consent_packet" : "informed_consent",
				title: docTitle,
				isSigned: true,
				signedAt: nowIso,
				signatureType,
				verificationMethod: isDigital ? "tablet_stylus" : "paper_signed",
				doctorFullName: effectiveDoctorName,
				signatureSvg: signatureDataUrl,
				notes: isDigital ? `Подписано пациентом на экране (Canvas, ${nowStr})` : `Подписано на бумажном носителе (${nowStr})`,
			};

			void fetch(`/api/patients/${encodeURIComponent(effectivePatientId)}/consents`, {
				method: "POST",
				headers,
				body: JSON.stringify(consentPayload),
			}).catch(() => {});
		}

		if (activePackage === "tax_certificate") {
			printTaxCertificate(
				buildTaxCertificateDocumentData({
					documentNumber: legalContext.documentNumber,
					issueDateIso: nowIso,
					taxYear,
					clinicName: clinicRequisites.name,
					clinicInn: clinicRequisites.inn,
					clinicOgrn: clinicRequisites.ogrn,
					clinicLicense: clinicRequisites.license,
					clinicAddress: clinicRequisites.address,
					doctorFullName: effectiveDoctorName,
					patient,
					receiptsCount: effectiveServices.length || 1,
					totalAmountKopecks,
					code01Kopecks,
					code02Kopecks,
				}),
			);
			showToast("Справка для налогового вычета сформирована и отправлена на печать", "success");
		} else {
			window.print();
			showToast("Комплект документов утвержден и отправлен на печать", "success");
		}
	}, [
		activePackage,
		currentConsentKey,
		activeConsentSubKind,
		isSignPadOpen,
		effectivePatientId,
		effectiveDoctorName,
		onSigned,
		onDocumentSigned,
		onConsentSigned,
		getSignatureDataUrl,
		recordConsentLocally,
		legalContext.documentNumber,
		taxYear,
		patient,
		effectiveServices.length,
		totalAmountKopecks,
		code01Kopecks,
		code02Kopecks,
		clinicRequisites,
		showToast,
	]);

	if (!isOpen) return null;

	const stampBadgeElement = (
		<div
			data-testid="tax-certificate-stamp-badge"
			className="dente-tax-stamp-badge inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-teal-50 text-teal-700 border border-teal-200"
		>
			{effectiveHasSigned || (!hasNoConfirmedPayments && totalAmountKopecks > 0) ? "ПОДПИСАНО ВРАЧОМ" : "ЧЕРНОВИК"}
		</div>
	);

	const extraTestId = [
		activePackage === "tax_certificate" ? "tax-deduction-modal fns-tax-certificate-modal" : "",
		activePackage === "informed_consent" ? "consent-studio-modal" : "",
	].filter(Boolean).join(" ");

	return (
		<div
			className="dente-docs-studio-backdrop"
			onClick={onClose}
			data-testid="documents-studio-modal-backdrop"
		>
			<div
				className={`dente-docs-studio-container rounded-t-[24px] overflow-x-clip ${activePackage === "tax_certificate" ? "fns-tax-certificate-modal" : ""} ${activePackage === "informed_consent" ? "consent-studio-modal" : ""}`}
				onClick={(e) => e.stopPropagation()}
				data-testid={
					activePackage === "informed_consent"
						? "consent-studio-modal"
						: activePackage === "tax_certificate"
							? "tax-deduction-modal fns-tax-certificate-modal"
							: "documents-studio-modal"
				}
				role="dialog"
				aria-modal="true"
				aria-labelledby="dente-docs-studio-title"
			>
				{/* Apple HIG Drag Handle для мобильных (36x5px) */}
				<div className="dente-mobile-drag-handle w-9 h-1.5 mx-auto" aria-hidden="true" />

				{/* Каноническая шапка: 1 строка <= 52px */}
				<DocumentsStudioHeader
					patientFullName={patient.fullName || "Пациент не выбран"}
					onDownloadTxt={handleDownloadTxt}
					onSendMessenger={handleSendMessenger}
					onClose={onClose}
					activePackage={activePackage}
					stampBadge={activePackage === "tax_certificate" ? stampBadgeElement : undefined}
				/>

				{/* Рабочее пространство: Пакеты слева, Лист А4 справа */}
				<div className="dente-docs-studio-body">
					{/* Боковая панель выбора пакета */}
					<aside className="dente-docs-studio-sidebar">
						<DocumentsPackageSelector
							activePackage={activePackage}
							onSelectPackage={setActivePackage}
							activeConsentSubKind={activeConsentSubKind}
							onSelectConsentSubKind={setActiveConsentSubKind}
							taxYear={taxYear}
							onSelectTaxYear={setTaxYear}
						/>

						{/* Интерактивная подпись пальцем/стилусом и реквизиты клиники */}
						<ConsentSignersRow
							isSignPadOpen={isSignPadOpen}
							onToggleSignPad={() => setIsSignPadOpen(!isSignPadOpen)}
							hasSigned={effectiveHasSigned}
							signedStatusText={signedStatusLabel}
							onClearCanvas={clearCanvas}
							canvasRef={canvasRef}
							onStartDrawing={startDrawing}
							onDraw={draw}
							onStopDrawing={stopDrawing}
							clinicName={clinicRequisites.name}
							clinicLicense={clinicRequisites.license}
							doctorFullName={effectiveDoctorName}
							toastNotice={toastNotice}
							toastType={toastType}
						/>
					</aside>

					{/* Правая зона: Предпросмотр листа формата А4 */}
					<main className="dente-docs-preview-area">
						<div
							className="dente-a4-paper-sheet print-paper-sheet"
							data-paper-sheet
							data-testid="dente-a4-paper-sheet"
						>
							{/* Шапка бланка А4 */}
							<div className="dente-a4-sheet-header">
								<div>
									<div className="dente-a4-clinic-name">
										{clinicRequisites.name}
									</div>
									<div className="dente-a4-clinic-sub">
										{clinicRequisites.address} · Тел: {clinicRequisites.phone}
									</div>
									<div className="dente-a4-clinic-sub">
										Лицензия: {clinicRequisites.license}
									</div>
								</div>
								<div className="dente-a4-date-badge">
									<div>Дата: {currentDate}</div>
									<div className="text-teal-700 font-medium mt-1">
										Сумма: {formatKopecksToRubles(totalAmountKopecks)}
									</div>
								</div>
							</div>

							{/* Содержимое бланка */}
							<div className="dente-a4-text-body">
								{renderedDocumentText}
							</div>

							{/* Подвал с подписями сторон */}
							<div className="dente-a4-sheet-footer">
								<div>
									<div className="font-semibold text-slate-800">Исполнитель:</div>
									<div className="text-slate-600">{effectiveDoctorName}</div>
									<div className="mt-4 text-slate-400">Подпись: ______________________ М.П.</div>
								</div>

								<div className="text-right">
									<div className="font-semibold text-slate-800">Пациент:</div>
									<div className="text-slate-600">{patient.fullName || "______________________"}</div>
									<div className="mt-4 text-slate-400">
										{effectiveHasSigned
											? `Подписано пациентом ${signedAtTimeStr ? `в ${signedAtTimeStr} ` : ""}[OK]`
											: "Подпись: ______________________"}
									</div>
								</div>
							</div>
						</div>
					</main>
				</div>

				{/* Канонический подвал: Ровно 1 Primary CTA #0d9488 — Мандаты 8am, 8e & Apple HIG */}
				<DocumentsStudioFooter
					onPrimarySignAndPrint={handlePrimarySignAndPrint}
					onDownloadTxt={handleDownloadTxt}
					onSendMessenger={handleSendMessenger}
					onPrintBlank={handlePrintBlank}
					onConfirmPaper={handlePaperConfirm}
					onDownloadXml={handleDownloadXml}
					onDownloadNoMedopl={handleDownloadNoMedopl}
					hasSigned={effectiveHasSigned}
					activePackage={activePackage}
				/>
			</div>
		</div>
	);
};

// Canonical drop-in aliases guaranteeing zero disruption to all callers (Mandate 8e, 8aq)
export const ConsentStudioModal: React.FC<DocumentsStudioModalProps> = (props) => {
	return <DocumentsStudioModal {...props} initialTemplate={props.initialTemplate || "informed_consent"} />;
};

export const InformedConsentModal: React.FC<DocumentsStudioModalProps> = (props) => {
	return <DocumentsStudioModal {...props} initialTemplate={props.initialTemplate || "informed_consent"} />;
};

export const TaxDeductionCertificateModal: React.FC<DocumentsStudioModalProps> = (props) => {
	return <DocumentsStudioModal {...props} initialTemplate={props.initialTemplate || "tax_certificate"} />;
};

export const FnsTaxCertificateModal = TaxDeductionCertificateModal;

export default DocumentsStudioModal;
