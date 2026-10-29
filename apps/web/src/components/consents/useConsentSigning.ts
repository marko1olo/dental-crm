import { useMemo, useCallback } from "react";
import { showToast } from "../GlobalToast.js";
import { denteAdminSecretRequestHeaders } from "../../lib/denteRequestHeaders.js";
import { isDemoShowcaseMode } from "../../lib/demoMode.js";
import {
	generatePaperSignatureSvg,
	type SignatureVectorData,
	calculateBoundingBox,
	exportSignatureToSvg,
	generateConsentIntegrityHash,
} from "./signaturePadMath.js";
import { generateSmsPepSignatureSvg } from "./consentIntegrityHash.js";
import { generatePdfA1bDocument, downloadConsentPdfA } from "./consentPdfAEngine.js";
import {
	getConsentTemplate,
	renderConsentTemplate,
	type ConsentTemplateKey,
	type ConsentTemplate,
	type ConsentSubstitutionContext,
	type ConsentPackageKey,
	getAllConsentPackages,
	getConsentPackage,
} from "./consentTemplates.js";
import { CONSENT_KEY_TO_DOCUMENT_KIND } from "../visit/consents/visitConsentTypes.js";
import { buildStructuredPayloadForConsent } from "./consentModal/executor/structuredPayloadBuilder.js";
import type {
	VerificationMethod,
	SignatureStroke,
	SignaturePoint,
	InformedConsentPatientInfo,
	InformedConsentModalProps,
	SignedConsentPayload,
} from "./consentModal/types.js";

function isValidUuid(id: string | null | undefined): boolean {
	if (!id) return false;
	return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
}

export interface UseConsentSigningParams {
	props: InformedConsentModalProps & {
		doctorFullName?: string | null | undefined;
		defaultConsentKind?: string | undefined;
		onSigned?: ((signatureDataUrl: string, consentKind: string) => void) | undefined;
		onPrintBlank?: ((consentKind?: string) => void) | undefined;
	};
	effectiveContext: ConsentSubstitutionContext;
	substitutionContext: ConsentSubstitutionContext;
	activeMode: "packages" | "single";
	currentPackage: { code: string; title: string; templateKeys: readonly ConsentTemplateKey[] };
	activeDocKey: ConsentTemplateKey;
	currentTemplate: ConsentTemplate;
	rendered: { fullTextContent: string };
	integrityRecord: { hash: string };
	verificationMethod: VerificationMethod;
	strokes: SignatureStroke[];
	currentPoints: SignaturePoint[];
	smsOtpCode: string;
	paperScanFile: File | null;
	isClosedOrSigned: boolean;
	effectiveWatermark: string;
	onClose: () => void;
	isSubmitting: boolean;
	setIsSubmitting: (submitting: boolean) => void;
	setPaperOriginalConfirmed: (confirmed: boolean) => void;
}

export function useConsentSigning(params: UseConsentSigningParams) {
	const {
		props,
		effectiveContext,
		substitutionContext,
		activeMode,
		currentPackage,
		activeDocKey,
		currentTemplate,
		rendered,
		integrityRecord,
		verificationMethod,
		strokes,
		currentPoints,
		smsOtpCode,
		paperScanFile,
		isClosedOrSigned,
		effectiveWatermark,
		onClose,
		isSubmitting,
		setIsSubmitting,
		setPaperOriginalConfirmed,
	} = params;

	const effectivePatientId = props.patientId || props.patient?.id;

	const isSigningReady = useMemo(() => {
		if (verificationMethod === "tablet_stylus") {
			return strokes.length > 0 || currentPoints.length > 0;
		}
		if (verificationMethod === "sms_otp") {
			return Boolean(smsOtpCode && smsOtpCode.trim().length === 4);
		}
		return true;
	}, [verificationMethod, strokes.length, currentPoints.length, smsOtpCode]);

	// Генерация медиа подписи (SVG, VectorData)
	const buildSignatureMedia = useCallback((resolvedMethod: VerificationMethod) => {
		let svg = "";
		if (resolvedMethod === "tablet_stylus") {
			svg = exportSignatureToSvg(strokes, 400, 140, { strokeColor: "#0f172a" });
		} else if (resolvedMethod === "sms_otp") {
			svg = generateSmsPepSignatureSvg({
				patientFullName: effectiveContext.patientName || undefined,
				phoneMasked: String(substitutionContext.phone || props.patient?.phone || ""),
				timestampIso: new Date().toISOString(),
				integrityHash: integrityRecord.hash,
				clinicName: effectiveContext.clinicName || (isDemoShowcaseMode() ? "ООО «Стоматологическая клиника ДЕНТЕ»" : "«________________________________________»"),
			});
		} else {
			svg = generatePaperSignatureSvg({
				date: effectiveContext.date || new Date().toLocaleDateString("ru-RU"),
				clinicName: effectiveContext.clinicName || (isDemoShowcaseMode() ? "ООО «Стоматологическая клиника ДЕНТЕ»" : "«________________________________________»"),
				patientFullName: effectiveContext.patientName || undefined,
				scanFileName: paperScanFile?.name || null,
				scanFileSizeBytes: paperScanFile?.size || null,
			});
		}

		const vectorData: SignatureVectorData = {
			strokes: resolvedMethod === "tablet_stylus" ? strokes : [],
			bounds: resolvedMethod === "tablet_stylus" && strokes.length > 0 ? calculateBoundingBox(strokes) : { minX: 0, minY: 0, maxX: 0, maxY: 0, width: 0, height: 0 },
			timestamp: Date.now(),
			pointCount: resolvedMethod === "tablet_stylus" ? strokes.reduce((acc, s) => acc + s.points.length, 0) : 0,
			integrityHash: integrityRecord.hash,
		};

		return { svg, vectorData };
	}, [strokes, effectiveContext, substitutionContext, props.patient, integrityRecord.hash, paperScanFile]);

	// Сохранение документа в Fastify API
	const persistDocumentToBackend = useCallback(async (
		tplKey: ConsentTemplateKey,
		tpl: ConsentTemplate,
		payload: SignedConsentPayload,
		svg: string,
		method: VerificationMethod,
	) => {
		if (!effectivePatientId || !isValidUuid(effectivePatientId)) return;

		try {
			const docKind = CONSENT_KEY_TO_DOCUMENT_KIND[tplKey] || "informed_consent";
			const docPayload = buildStructuredPayloadForConsent(docKind, tpl, effectiveContext);

			const createRes = await fetch("/api/documents", {
				method: "POST",
				headers: denteAdminSecretRequestHeaders({ "Content-Type": "application/json" }),
				body: JSON.stringify({
					patientId: effectivePatientId,
					visitId: props.visitId && isValidUuid(props.visitId) ? props.visitId : undefined,
					kind: docKind,
					title: tpl.title,
					signatureSvg: svg || undefined,
					payload: docPayload,
				}),
			});

			if (createRes.ok) {
				const created = (await createRes.json()) as { id?: string; document?: { id?: string } };
				const docId = created.id || created.document?.id;
				if (docId) {
					await fetch(`/api/documents/${encodeURIComponent(docId)}/issue`, {
						method: "POST",
						headers: denteAdminSecretRequestHeaders({ "Content-Type": "application/json" }),
						body: JSON.stringify({
							signatureSvg: svg || undefined,
							signatureAttestation: {
								mode: method === "tablet_stylus" ? "tablet_stylus" : method === "sms_otp" ? "sms_otp" : "paper_signed",
								signedAt: payload.signedAt || new Date().toISOString(),
								recipientFullName: effectiveContext.patientName || "Пациент",
								recipientRole: "patient",
								staffFullName: effectiveContext.doctorName || "Врач-стоматолог",
								staffRole: "doctor",
								identityChecked: true,
								documentOpenedAndChecked: true,
								recipientSigned: true,
								clinicRepresentativeSigned: true,
								note: payload.statusText,
							},
						}),
					});
				}
			}

			// Фиксация в таймлайне согласий пациента
			await fetch(`/api/patients/${encodeURIComponent(effectivePatientId)}/consents`, {
				method: "POST",
				headers: denteAdminSecretRequestHeaders({ "Content-Type": "application/json" }),
				body: JSON.stringify({
					templateKey: tplKey,
					code: tpl.code,
					title: tpl.title,
					fullTextContent: payload.fullTextContent,
					patientName: effectiveContext.patientName,
					birthDate: effectiveContext.birthDate,
					passport: effectiveContext.passport,
					doctorName: effectiveContext.doctorName,
					clinicName: effectiveContext.clinicName,
					diagnosisIcd: effectiveContext.diagnosisIcd,
					toothNumbers: effectiveContext.toothNumbers,
					signatureSvg: svg || "",
					signaturePngBase64: payload.signaturePngBase64,
					vectorData: payload.vectorData,
					integrityHash: payload.integrityHash,
					signedAt: payload.signedAt,
					verificationMethod: method,
					smsOtpCode: payload.smsOtpCode,
					attachedToForm043u: true,
					visitId: props.visitId,
				}),
			});
		} catch (err) {
			console.warn("Backend consent API offline or local mode:", err);
		}
	}, [effectivePatientId, effectiveContext, props.visitId]);

	// Подтверждение подписания (Мандаты 8e, 8n)
	const handleConfirmSign = useCallback(async (forcedMethod?: VerificationMethod): Promise<boolean> => {
		if (isSubmitting) return false;
		setIsSubmitting(true);

		try {
			let resolvedMethod = forcedMethod || verificationMethod;
			if (resolvedMethod === "tablet_stylus" && strokes.length === 0 && currentPoints.length === 0) {
				resolvedMethod = "paper_physical";
				setPaperOriginalConfirmed(true);
				showToast("Подтверждено как бумажный оригинал в медицинской карте пациента (1 клик)", "info");
			}
			if (resolvedMethod === "sms_otp" && (!smsOtpCode || smsOtpCode.trim().length < 4)) {
				showToast("Введите 4-значный код подтверждения из СМС", "error");
				setIsSubmitting(false);
				return false;
			}

			const { svg, vectorData } = buildSignatureMedia(resolvedMethod);

			if (activeMode === "packages") {
				const signedPayloads: SignedConsentPayload[] = [];
				for (const tplKey of currentPackage.templateKeys) {
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
						strokes: resolvedMethod === "tablet_stylus" ? strokes : [],
						verificationMethod: resolvedMethod,
						smsOtpCode: resolvedMethod === "sms_otp" ? smsOtpCode : null,
					});

					const pld: SignedConsentPayload = {
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
						signaturePngBase64: "",
						vectorData: { ...vectorData, integrityHash: docHashRecord.hash },
						integrityHash: docHashRecord.hash,
						signedAt: new Date().toISOString(),
						verificationMethod: resolvedMethod,
						smsOtpCode: resolvedMethod === "sms_otp" ? smsOtpCode : null,
						attachedToForm043u: true,
						paperOriginalStored: resolvedMethod === "paper_physical",
						scanFileName: paperScanFile?.name || null,
						packageCode: currentPackage.code,
						packageTitle: currentPackage.title,
						statusText: resolvedMethod === "paper_physical"
							? (paperScanFile ? `Скан пакета прикреплен («${paperScanFile.name}»)` : "Бумажные оригиналы подписаны пациентом (хранятся в карте)")
							: "Подписано в составе пакета",
					};

					signedPayloads.push(pld);
					await persistDocumentToBackend(tplKey, tpl, pld, svg, resolvedMethod);
				}

				if (props.onPackageSigned) props.onPackageSigned(signedPayloads);
				if (props.onConsentSigned && signedPayloads[0]) props.onConsentSigned(signedPayloads[0]);
			} else {
				const pld: SignedConsentPayload = {
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
					signaturePngBase64: "",
					vectorData,
					integrityHash: integrityRecord.hash,
					signedAt: new Date().toISOString(),
					verificationMethod: resolvedMethod,
					smsOtpCode: resolvedMethod === "sms_otp" ? smsOtpCode : null,
					attachedToForm043u: true,
					paperOriginalStored: resolvedMethod === "paper_physical",
					scanFileName: paperScanFile?.name || null,
					statusText: resolvedMethod === "paper_physical"
						? (paperScanFile ? `Скан бланка прикреплен («${paperScanFile.name}»)` : "Бумажный оригинал подписан пациентом (хранится в карте)")
						: "Подписано пациентом",
				};

				await persistDocumentToBackend(activeDocKey, currentTemplate, pld, svg, resolvedMethod);

				if (props.onConsentSigned) props.onConsentSigned(pld);
			}

			if (props.onConsentConfirmed) {
				props.onConsentConfirmed({
					consentType: activeMode === "packages" ? currentPackage.code : activeDocKey,
					intervention: currentTemplate.title,
					toothOrArea: effectiveContext.toothNumbers || "По плану лечения",
					confirmedAt: new Date().toISOString(),
					integrityHash: integrityRecord.hash,
				});
			}

			if (props.onSigned) {
				props.onSigned(svg, activeDocKey);
			}

			showToast("Согласие успешно подписано и зафиксировано в архиве", "success");
			onClose();
			return true;
		} finally {
			setIsSubmitting(false);
		}
	}, [
		isSubmitting,
		verificationMethod,
		strokes,
		currentPoints,
		smsOtpCode,
		buildSignatureMedia,
		activeMode,
		currentPackage,
		effectiveContext,
		substitutionContext,
		paperScanFile,
		persistDocumentToBackend,
		props,
		activeDocKey,
		currentTemplate,
		rendered,
		integrityRecord.hash,
		onClose,
		setIsSubmitting,
		setPaperOriginalConfirmed,
	]);

	// Печать бланка или пакета
	const handlePrint = useCallback(() => {
		if (typeof window !== "undefined") {
			window.print();
		}
	}, []);

	// Печать чистого бланка с прочерками
	const handlePrintBlank = useCallback(() => {
		if (props.onPrintBlank) {
			props.onPrintBlank(activeDocKey);
			return;
		}
		if (typeof window !== "undefined") {
			window.print();
		}
	}, [props, activeDocKey]);

	// Скачивание ISO PDF/A-1b
	const handleDownloadPdfA = useCallback(() => {
		try {
			const pdfBytes = generatePdfA1bDocument({
				documentTitle: currentTemplate.title,
				documentText: rendered.fullTextContent,
				integrityHash: integrityRecord.hash,
				patientName: effectiveContext.patientName || "Пациент",
				doctorName: effectiveContext.doctorName || "Лечащий врач",
				clinicName: effectiveContext.clinicName || "Стоматологическая клиника",
				verificationMethod,
				strokes,
			});

			downloadConsentPdfA(`Согласие_${currentTemplate.code}_${effectiveContext.patientName || "пациент"}.pdf`, pdfBytes);
			showToast("Документ PDF/A успешно сформирован", "info");
		} catch (err) {
			console.error("PDF/A error:", err);
			showToast("Ошибка при экспорте PDF/A", "error");
		}
	}, [currentTemplate, rendered.fullTextContent, integrityRecord.hash, effectiveContext, verificationMethod, strokes]);

	// Копирование сводки в буфер
	const handleCopyPatientSummary = useCallback(() => {
		const text = `Информированное согласие: ${currentTemplate.title}\nПациент: ${effectiveContext.patientName}\nВрач: ${effectiveContext.doctorName}\nДата: ${effectiveContext.date}\nХэш целостности: ${integrityRecord.hash}`;
		if (typeof navigator !== "undefined" && navigator.clipboard) {
			navigator.clipboard.writeText(text);
			showToast("Сводка согласия скопирована в буфер обмена", "info");
			return true;
		}
		return false;
	}, [currentTemplate.title, effectiveContext, integrityRecord.hash]);

	const handleCopyHash = useCallback(() => {
		if (typeof navigator !== "undefined" && navigator.clipboard) {
			navigator.clipboard.writeText(integrityRecord.hash);
			showToast("Хэш SHA-256 скопирован", "info");
		}
	}, [integrityRecord.hash]);

	return {
		isSigningReady,
		handleConfirmSign,
		handlePrint,
		handlePrintBlank,
		handleDownloadPdfA,
		handleCopyPatientSummary,
		handleCopyHash,
	};
}
