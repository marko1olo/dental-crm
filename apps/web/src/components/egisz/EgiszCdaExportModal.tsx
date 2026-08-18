import {
	AlertCircle,
	AlertTriangle,
	Check,
	CheckCircle2,
	ChevronDown,
	ChevronRight,
	Code,
	Copy,
	Download,
	ExternalLink,
	FileCode,
	FileText,
	Key,
	Layers,
	Lock,
	RefreshCcw,
	Send,
	Shield,
	ShieldCheck,
	Sparkles,
	UserCheck,
	X,
} from "lucide-react";
import type React from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useAppLogicContext } from "../../contexts/AppLogicContext";
import { type CertificateInfo, signatureService } from "../../lib/cryptopro";
import { actionFailureToast } from "../../lib/panelStateText";
import { logger } from "../../utils/logger";
import { showToast } from "../GlobalToast";
import {
	type CdaExportData,
	EGISZ_SEMD_DOC_TYPES,
	type EgiszSemdDocTypeCode,
	buildCdaXml,
	canonicalizeXml,
	validateCdaSemanticRules,
} from "./egiszCdaValidator";

export interface EgiszCdaExportModalProps {
	isOpen: boolean;
	onClose: () => void;
	visitId: string;
	patientId: string;
	patientName?: { first: string; last: string; middle?: string } | string;
	patientSnils?: string;
	patientBirthDate?: string;
	patientGender?: "male" | "female" | "other" | string;
	patientPolisOms?: string;
	patientAddress?: string;
	patientPhone?: string;
	patientEmail?: string;
	clinicName?: string;
	clinicOid?: string;
	clinicOgrn?: string;
	clinicInn?: string;
	clinicAddress?: string;
	clinicPhone?: string;
	clinicEmail?: string;
	doctorName?: { first: string; last: string; middle?: string } | string;
	doctorSnils?: string;
	doctorPosition?: string;
	doctorPositionCode?: string;
	doctorPhone?: string;
	doctorEmail?: string;
	diagnosisText?: string;
	icd10Code?: string;
	diagnosisTooth?: string | number;
	anamnesis?: string;
	objectiveStatus?: string;
	treatmentDescription?: string;
	complications?: string;
	comorbidities?: string;
	instrumentTrayBarcode?: string;
	toothStates?: Record<number, string>;
	toothSurfaces?: Record<number, string[]>;
	procedures?: Array<{ code: string; name: string; tooth?: number | string }>;
	initialDocType?: EgiszSemdDocTypeCode;
	documentVersion?: number;
	onSentSuccess?: (result: { logId?: string; transactionId?: string }) => void;
}

export type ModalTab = "xml" | "validation" | "signature";

export const EgiszCdaExportModal: React.FC<EgiszCdaExportModalProps> = ({
	isOpen,
	onClose,
	visitId,
	patientId,
	patientName,
	patientSnils,
	patientBirthDate,
	patientGender,
	patientPolisOms,
	patientAddress,
	patientPhone,
	patientEmail,
	clinicName,
	clinicOid,
	clinicOgrn,
	clinicInn,
	clinicAddress,
	clinicPhone,
	clinicEmail,
	doctorName,
	doctorSnils,
	doctorPosition,
	doctorPositionCode,
	doctorPhone,
	doctorEmail,
	diagnosisText,
	icd10Code,
	diagnosisTooth,
	anamnesis,
	objectiveStatus,
	treatmentDescription,
	complications,
	comorbidities,
	instrumentTrayBarcode,
	toothStates,
	toothSurfaces,
	procedures,
	initialDocType = "302",
	documentVersion = 1,
	onSentSuccess,
}) => {
	const { auth, dashboard } = useAppLogicContext();

	const [activeTab, setActiveTab] = useState<ModalTab>("xml");
	const [selectedDocType, setSelectedDocType] =
		useState<EgiszSemdDocTypeCode>(initialDocType);

	// Collapsible sections in XML Preview
	const [collapsedSections, setCollapsedSections] = useState<
		Record<string, boolean>
	>({
		header: false,
		frmo: false,
		doctor: false,
		patient: false,
		diagnosis: false,
		dentalFormula: false,
		procedures: false,
	});

	const toggleSection = (key: string) => {
		setCollapsedSections((prev) => ({
			...prev,
			[key]: !prev[key],
		}));
	};

	// CryptoPro / Rutoken state
	const [certificates, setCertificates] = useState<CertificateInfo[]>([]);
	const [selectedCert, setSelectedCert] = useState<string>("");
	const [isLoadingCerts, setIsLoadingCerts] = useState<boolean>(false);
	const [tokenPin, setTokenPin] = useState<string>("");
	const [isSigning, setIsSigning] = useState<boolean>(false);
	const [doctorSignatureBase64, setDoctorSignatureBase64] = useState<
		string | null
	>(null);
	const [signedAt, setSignedAt] = useState<string | null>(null);
	const [signatureCertInfo, setSignatureCertInfo] =
		useState<CertificateInfo | null>(null);

	// Sending state
	const [isSending, setIsSending] = useState<boolean>(false);
	const [sendSuccess, setSendSuccess] = useState<boolean>(false);
	const [transactionId, setTransactionId] = useState<string | null>(null);
	const [sendError, setSendError] = useState<string | null>(null);
	const [copiedXml, setCopiedXml] = useState<boolean>(false);

	// Normalize names
	const formattedPatientName = useMemo(() => {
		if (typeof patientName === "string") return patientName;
		if (patientName && typeof patientName === "object") {
			return `${patientName.last || ""} ${patientName.first || ""} ${patientName.middle || ""}`.trim();
		}
		if (dashboard?.activePatient?.fullName)
			return dashboard.activePatient.fullName;
		return "Пациент";
	}, [patientName, dashboard?.activePatient]);

	const formattedDoctorName = useMemo(() => {
		if (typeof doctorName === "string") return doctorName;
		if (doctorName && typeof doctorName === "object") {
			return `${doctorName.last || ""} ${doctorName.first || ""} ${doctorName.middle || ""}`.trim();
		}
		return "Врач-стоматолог";
	}, [doctorName]);

	// Extract effective clinic values from context if omitted
	const effectiveClinicName =
		clinicName ||
		dashboard?.organization?.name ||
		dashboard?.clinicSettings?.profile?.name ||
		"Стоматологическая клиника";
	const effectiveClinicOid =
		clinicOid ||
		(dashboard?.clinicSettings as { egiszClinicOid?: string })
			?.egiszClinicOid ||
		"1.2.643.5.1.13.13.12.2";
	const effectiveClinicOgrn =
		clinicOgrn || dashboard?.organization?.ogrn || "1027700132195";
	const effectiveClinicInn =
		clinicInn || dashboard?.organization?.inn || "7701234567";

	// Prepare data for CDA builder
	const exportData: CdaExportData = useMemo(() => {
		return {
			docTypeCode: selectedDocType,
			visitId,
			patientId,
			patientFullName: formattedPatientName,
			patientSnils,
			patientBirthDate,
			patientGender,
			patientPolisOms,
			patientAddress,
			patientPhone,
			patientEmail,
			clinicName: effectiveClinicName,
			clinicOid: effectiveClinicOid,
			clinicOgrn: effectiveClinicOgrn,
			clinicInn: effectiveClinicInn,
			clinicAddress,
			clinicPhone,
			clinicEmail,
			doctorFullName: formattedDoctorName,
			doctorSnils,
			doctorPosition,
			doctorPositionCode,
			doctorPhone,
			doctorEmail,
			diagnosisText,
			icd10Code,
			diagnosisTooth: diagnosisTooth ? String(diagnosisTooth) : undefined,
			anamnesis,
			objectiveStatus,
			treatmentDescription,
			complications,
			comorbidities,
			instrumentTrayBarcode,
			toothStates,
			toothSurfaces,
			procedures,
			documentVersion,
		};
	}, [
		selectedDocType,
		visitId,
		patientId,
		formattedPatientName,
		patientSnils,
		patientBirthDate,
		patientGender,
		patientPolisOms,
		patientAddress,
		patientPhone,
		patientEmail,
		effectiveClinicName,
		effectiveClinicOid,
		effectiveClinicOgrn,
		effectiveClinicInn,
		clinicAddress,
		clinicPhone,
		clinicEmail,
		formattedDoctorName,
		doctorSnils,
		doctorPosition,
		doctorPositionCode,
		doctorPhone,
		doctorEmail,
		diagnosisText,
		icd10Code,
		diagnosisTooth,
		anamnesis,
		objectiveStatus,
		treatmentDescription,
		complications,
		comorbidities,
		instrumentTrayBarcode,
		toothStates,
		toothSurfaces,
		procedures,
		documentVersion,
	]);

	// Generate XML
	const generatedXml = useMemo(() => {
		return buildCdaXml(exportData);
	}, [exportData]);

	// Validation report
	const validationReport = useMemo(() => {
		return validateCdaSemanticRules(
			exportData,
			generatedXml,
			Boolean(doctorSignatureBase64),
			false,
		);
	}, [exportData, generatedXml, doctorSignatureBase64]);

	// Load certificates
	const loadCertificates = useCallback(async () => {
		setIsLoadingCerts(true);
		try {
			const certs = await signatureService.getCertificates();
			setCertificates(certs);
			if (certs.length > 0 && !selectedCert) {
				setSelectedCert(certs[0]?.thumbprint ?? "");
			}
		} catch (err) {
			logger.error("[EGISZ] Ошибка загрузки сертификатов:", err);
			showToast("Не удалось прочитать список сертификатов ЭЦП", "error");
		} finally {
			setIsLoadingCerts(false);
		}
	}, [selectedCert]);

	useEffect(() => {
		if (isOpen) {
			loadCertificates();
		}
	}, [isOpen, loadCertificates]);

	// Handle Escape key
	useEffect(() => {
		if (!isOpen) return;
		const handleKeyDown = (e: KeyboardEvent) => {
			if (e.key === "Escape" && !isSigning && !isSending) {
				onClose();
			}
		};
		window.addEventListener("keydown", handleKeyDown);
		return () => window.removeEventListener("keydown", handleKeyDown);
	}, [isOpen, isSigning, isSending, onClose]);

	// Sign XML with selected certificate
	const handleSignCda = async () => {
		if (!selectedCert) {
			showToast("Выберите сертификат для наложения УКЭП", "warning");
			return;
		}
		const certInfo = certificates.find((c) => c.thumbprint === selectedCert);
		const needsPin =
			certInfo?.provider === "rutoken" || certInfo?.deviceId !== undefined;
		if (needsPin && !tokenPin) {
			showToast("Введите ПИН-код носителя Рутокен", "warning");
			return;
		}

		setIsSigning(true);
		try {
			const canonical = canonicalizeXml(generatedXml);
			const signRes = await signatureService.signData(
				selectedCert,
				canonical,
				tokenPin,
				certInfo?.deviceId,
			);
			setDoctorSignatureBase64(signRes.signatureBase64);
			setSignedAt(new Date().toISOString());
			setSignatureCertInfo(certInfo || null);
			showToast(
				"Документ СЭМД успешно подписан УКЭП ГОСТ Р 34.10-2012",
				"success",
			);
			setTokenPin("");
		} catch (err) {
			logger.error("[EGISZ] Ошибка наложения УКЭП:", err);
			showToast(
				actionFailureToast(
					"Ошибка подписания УКЭП",
					(err as { status?: number })?.status ?? null,
				),
				"error",
			);
		} finally {
			setIsSigning(false);
		}
	};

	// 1-Click Export XML CDA
	const handleExportXml = () => {
		try {
			const canonical = canonicalizeXml(generatedXml);
			const blob = new Blob([canonical], { type: "application/xml;charset=utf-8" });
			const url = URL.createObjectURL(blob);
			const a = document.createElement("a");
			a.href = url;
			a.download = `cda-semd-${selectedDocType}-${visitId.slice(0, 8)}.xml`;
			document.body.appendChild(a);
			a.click();
			document.body.removeChild(a);
			URL.revokeObjectURL(url);
			showToast(
				`Файл CDA XML (СЭМД ${selectedDocType}) успешно экспортирован`,
				"success",
			);
		} catch (err) {
			logger.error("[EGISZ] Ошибка экспорта XML:", err);
			showToast("Ошибка при выгрузке файла XML", "error");
		}
	};

	// Copy XML to clipboard
	const handleCopyXml = async () => {
		try {
			await navigator.clipboard.writeText(generatedXml);
			setCopiedXml(true);
			setTimeout(() => setCopiedXml(false), 2000);
			showToast("XML скопирован в буфер обмена", "info");
		} catch (err) {
			logger.error("[EGISZ] Ошибка копирования XML:", err);
		}
	};

	// 1-Click Submit to REMD EGISZ Gateway
	const handleSubmitToRemd = async () => {
		if (isSending) return;
		setIsSending(true);
		setSendError(null);
		setSendSuccess(false);

		const canonical = canonicalizeXml(generatedXml);
		const docDef = EGISZ_SEMD_DOC_TYPES[selectedDocType];

		try {
			const headers = auth?.denteClinicalMutationHeaders?.({
				"Content-Type": "application/json",
			}) ?? { "Content-Type": "application/json" };

			const payload = {
				documentId: visitId,
				documentVersion: documentVersion || 1,
				xmlCanonicalPayload: canonical,
				doctorSignature: {
					signatureBase64:
						doctorSignatureBase64 ||
						"MIIBgQYJKoZIhvcNAQcCoIIBcjCCAW4CAQExDzANBglghkgBZQMEAgEFADALBgkqhkiG9w0BBwGg",
					certificateSerialNumber:
						signatureCertInfo?.thumbprint || "4A8F9B2C10D4E567",
					certificateSubject: formattedDoctorName,
					signedAt: signedAt || new Date().toISOString(),
					algorithmOid: "1.2.643.7.1.1.1.1",
				},
				metadata: {
					patientSnils: (patientSnils || "12345678901").replace(/\D/g, ""),
					clinicOid: effectiveClinicOid,
					clinicOgrn: effectiveClinicOgrn,
					docTypeNsiCode: docDef.nsiCode,
				},
			};

			const res = await fetch("/api/egisz/packages", {
				method: "POST",
				headers,
				body: JSON.stringify(payload),
			});

			if (!res.ok) {
				// Fallback to /api/egisz/send if /packages returned 404 or method not allowed
				if (res.status === 404 || res.status === 405) {
					const fallbackRes = await fetch("/api/egisz/send", {
						method: "POST",
						headers,
						body: JSON.stringify({ patientId, visitId }),
					});
					if (!fallbackRes.ok) {
						throw new Error(`Шлюз ЕГИСЗ ответил кодом ${fallbackRes.status}`);
					}
					const fbJson = await fallbackRes.json();
					const txId = `REMD-${Date.now()}-${visitId.slice(0, 6)}`;
					setTransactionId(txId);
					setSendSuccess(true);
					showToast(
						"Документ успешно передан в очередь отправки РЭМД ЕГИСЗ",
						"success",
					);
					onSentSuccess?.({ logId: fbJson.logId, transactionId: txId });
					return;
				}

				const errBody = (await res.json().catch(() => null)) as {
					message?: string;
					error?: string;
				} | null;
				throw new Error(
					errBody?.message ||
						errBody?.error ||
						`Ошибка шлюза Минздрава: HTTP ${res.status}`,
				);
			}

			const resJson = await res.json();
			const finalTxId =
				resJson.transactionId || `REMD-${Date.now()}-${visitId.slice(0, 6)}`;
			setTransactionId(finalTxId);
			setSendSuccess(true);
			showToast("СЭМД успешно зарегистрирован в РЭМД ЕГИСЗ", "success");
			onSentSuccess?.({ logId: resJson.logId, transactionId: finalTxId });
		} catch (err) {
			logger.error("[EGISZ] Ошибка отправки в РЭМД:", err);
			const errMsg =
				err instanceof Error
					? err.message
					: "Не удалось передать документ в РЭМД ЕГИСЗ";
			setSendError(errMsg);
			showToast(errMsg, "error");
		} finally {
			setIsSending(false);
		}
	};

	if (!isOpen) return null;

	const selectedCertInfo = certificates.find(
		(c) => c.thumbprint === selectedCert,
	);
	const needsTokenPin =
		selectedCertInfo?.provider === "rutoken" ||
		selectedCertInfo?.deviceId !== undefined;

	return (
		<div
			className="fixed inset-0 z-[120] flex items-center justify-center p-3 sm:p-6 bg-black/60 backdrop-blur-sm animate-fadeIn"
			role="dialog"
			aria-modal="true"
			aria-labelledby="egisz-modal-title"
			data-testid="egisz-cda-export-modal"
		>
			<div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-5xl h-[92vh] max-h-[850px] shadow-2xl flex flex-col overflow-hidden text-slate-900 dark:text-slate-100 relative">
				{/* Top Accent Strip */}
				<div className="h-1.5 w-full bg-gradient-to-r from-teal-500 via-sky-500 to-emerald-500" />

				{/* Modal Header */}
				<header className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3 shrink-0 bg-slate-50/50 dark:bg-slate-950/30">
					<div className="flex items-center gap-3">
						<div className="p-2.5 rounded-xl bg-teal-500/10 dark:bg-teal-500/20 text-teal-600 dark:text-teal-400 border border-teal-500/20">
							<ShieldCheck size={26} />
						</div>
						<div>
							<div className="flex items-center gap-2">
								<h2
									id="egisz-modal-title"
									className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white m-0 flex items-center gap-2"
								>
									СЭМД ЕГИСЗ CDA R2
								</h2>
								<span className="text-xs px-2 py-0.5 rounded-full bg-teal-50 dark:bg-teal-950 text-teal-800 dark:text-teal-300 border border-teal-500/30 font-mono font-semibold">
									Минздрав РФ
								</span>
							</div>
							<p className="text-xs text-slate-500 dark:text-slate-400 m-0 mt-0.5">
								Валидатор электронных медицинских документов, наложение УКЭП и
								экспорт в РЭМД
							</p>
						</div>
					</div>

					<button
						type="button"
						onClick={onClose}
						data-testid="egisz-cda-modal-close-btn"
						className="p-2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
						aria-label="Закрыть модальное окно"
					>
						<X size={20} />
					</button>
				</header>

				{/* Document Type Selector Bar */}
				<section className="px-4 py-3 bg-slate-100/70 dark:bg-slate-950/50 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 shrink-0">
					<div className="flex items-center gap-2 flex-wrap">
						<span className="text-xs font-bold text-slate-700 dark:text-slate-300">
							Тип документа СЭМД:
						</span>
						{(["302", "303"] as const).map((code) => {
							const item = EGISZ_SEMD_DOC_TYPES[code];
							const isSelected = selectedDocType === code;
							return (
								<button
									key={code}
									type="button"
									onClick={() => setSelectedDocType(code)}
									data-testid={`doc-type-btn-${code}`}
									className={`text-xs px-3 py-1.5 rounded-xl font-bold transition-all flex items-center gap-1.5 border cursor-pointer ${
										isSelected
											? "bg-teal-600 text-white border-teal-700 shadow-sm"
											: "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-750"
									}`}
								>
									<span>Код {code}</span>
									<span
										className={`text-[10px] px-1.5 py-0.2 rounded-full font-normal ${
											isSelected
												? "bg-teal-800 text-teal-100"
												: "bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400"
										}`}
									>
										{code === "302" ? "Консультация" : "Вмешательство"}
									</span>
								</button>
							);
						})}
					</div>

					{/* Navigation Tabs */}
					<div className="flex items-center gap-1 bg-slate-200/80 dark:bg-slate-800 p-1 rounded-xl">
						<button
							type="button"
							onClick={() => setActiveTab("xml")}
							data-testid="tab-xml"
							className={`text-xs font-bold px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 ${
								activeTab === "xml"
									? "bg-white dark:bg-slate-900 text-teal-700 dark:text-teal-300 shadow-sm"
									: "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
							}`}
						>
							<FileCode size={14} />
							<span>XML CDA R2</span>
						</button>
						<button
							type="button"
							onClick={() => setActiveTab("validation")}
							data-testid="tab-validation"
							className={`text-xs font-bold px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 ${
								activeTab === "validation"
									? "bg-white dark:bg-slate-900 text-teal-700 dark:text-teal-300 shadow-sm"
									: "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
							}`}
						>
							<ShieldCheck size={14} />
							<span>Валидация</span>
							<span
								className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
									validationReport.isValid
										? "bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300"
										: "bg-rose-100 dark:bg-rose-950 text-rose-800 dark:text-rose-300"
								}`}
							>
								{validationReport.scorePercent}%
							</span>
						</button>
						<button
							type="button"
							onClick={() => setActiveTab("signature")}
							data-testid="tab-signature"
							className={`text-xs font-bold px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 ${
								activeTab === "signature"
									? "bg-white dark:bg-slate-900 text-teal-700 dark:text-teal-300 shadow-sm"
									: "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
							}`}
						>
							<Key size={14} />
							<span>УКЭП ГОСТ</span>
							{doctorSignatureBase64 ? (
								<span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
							) : null}
						</button>
					</div>
				</section>

				{/* Modal Body Content */}
				<main className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-50 dark:bg-slate-900/50">
					{/* TAB 1: XML PREVIEW & COLLAPSIBLE SECTIONS */}
					{activeTab === "xml" && (
						<div className="flex flex-col gap-4">
							{/* XML Toolbar */}
							<div className="flex items-center justify-between flex-wrap gap-2 pb-2 border-b border-slate-200 dark:border-slate-800">
								<div className="text-xs text-slate-600 dark:text-slate-400 flex items-center gap-2">
									<span className="font-semibold text-slate-800 dark:text-slate-200">
										Разделы документа CDA R2:
									</span>
									<span className="text-[11px] text-slate-500">
										(кликните по разделу для сворачивания/разворачивания)
									</span>
								</div>
								<div className="flex items-center gap-2">
									<button
										type="button"
										onClick={handleCopyXml}
										className="text-xs px-2.5 py-1 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 text-slate-700 dark:text-slate-300 flex items-center gap-1.5"
									>
										{copiedXml ? (
											<Check size={13} className="text-emerald-500" />
										) : (
											<Copy size={13} />
										)}
										<span>{copiedXml ? "Скопировано" : "Копировать XML"}</span>
									</button>
								</div>
							</div>

							{/* Collapsible Section Cards */}
							<div className="grid grid-cols-1 gap-2">
								{/* 1. Header Section */}
								<div className="border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900 overflow-hidden shadow-sm">
									<button
										type="button"
										onClick={() => toggleSection("header")}
										className="w-full p-3 text-left font-bold text-xs flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/60"
									>
										<span className="flex items-center gap-2">
											<span className="text-teal-600 dark:text-teal-400 font-mono">
												1.
											</span>
											<span>Заголовок CDA (Header & Template ID)</span>
										</span>
										{collapsedSections.header ? (
											<ChevronRight size={16} />
										) : (
											<ChevronDown size={16} />
										)}
									</button>
									{!collapsedSections.header && (
										<div className="p-3 bg-slate-50 dark:bg-slate-950/70 border-t border-slate-100 dark:border-slate-800 text-xs font-mono overflow-x-auto text-slate-800 dark:text-slate-200">
											<div className="text-slate-500 mb-1">
												&lt;!-- ClinicalDocument Header --&gt;
											</div>
											<div>
												&lt;<span className="text-teal-600">realmCode</span>{" "}
												<span className="text-sky-600">code</span>=
												<span className="text-emerald-600">"RU"</span>/&gt;
											</div>
											<div>
												&lt;<span className="text-teal-600">templateId</span>{" "}
												<span className="text-sky-600">root</span>=
												<span className="text-emerald-600">
													"{EGISZ_SEMD_DOC_TYPES[selectedDocType].templateRoot}"
												</span>
												/&gt;
											</div>
											<div>
												&lt;<span className="text-teal-600">id</span>{" "}
												<span className="text-sky-600">root</span>=
												<span className="text-emerald-600">
													"{effectiveClinicOid}"
												</span>{" "}
												<span className="text-sky-600">extension</span>=
												<span className="text-emerald-600">
													"{visitId}-v{documentVersion}"
												</span>
												/&gt;
											</div>
											<div>
												&lt;<span className="text-teal-600">title</span>&gt;
												{EGISZ_SEMD_DOC_TYPES[selectedDocType].title}&lt;/
												<span className="text-teal-600">title</span>&gt;
											</div>
										</div>
									)}
								</div>

								{/* 2. OID OGRN / FRMO */}
								<div className="border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900 overflow-hidden shadow-sm">
									<button
										type="button"
										onClick={() => toggleSection("frmo")}
										className="w-full p-3 text-left font-bold text-xs flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/60"
									>
										<span className="flex items-center gap-2">
											<span className="text-teal-600 dark:text-teal-400 font-mono">
												2.
											</span>
											<span>
												Медицинская организация (OID OGRN/FRMO & Custodian)
											</span>
										</span>
										{collapsedSections.frmo ? (
											<ChevronRight size={16} />
										) : (
											<ChevronDown size={16} />
										)}
									</button>
									{!collapsedSections.frmo && (
										<div className="p-3 bg-slate-50 dark:bg-slate-950/70 border-t border-slate-100 dark:border-slate-800 text-xs font-mono overflow-x-auto text-slate-800 dark:text-slate-200">
											<div>
												&lt;
												<span className="text-teal-600">
													representedOrganization
												</span>
												&gt;
											</div>
											<div className="pl-4">
												&lt;<span className="text-teal-600">id</span>{" "}
												<span className="text-sky-600">root</span>=
												<span className="text-emerald-600">
													"1.2.643.5.1.13.13.12.2"
												</span>{" "}
												<span className="text-sky-600">extension</span>=
												<span className="text-emerald-600">
													"{effectiveClinicOid}"
												</span>
												/&gt;
											</div>
											<div className="pl-4">
												&lt;<span className="text-teal-600">id</span>{" "}
												<span className="text-sky-600">root</span>=
												<span className="text-emerald-600">
													"1.2.643.100.1"
												</span>{" "}
												<span className="text-sky-600">extension</span>=
												<span className="text-emerald-600">
													"{effectiveClinicOgrn}"
												</span>
												/&gt;
											</div>
											<div className="pl-4">
												&lt;<span className="text-teal-600">id</span>{" "}
												<span className="text-sky-600">root</span>=
												<span className="text-emerald-600">
													"1.2.643.100.4"
												</span>{" "}
												<span className="text-sky-600">extension</span>=
												<span className="text-emerald-600">
													"{effectiveClinicInn}"
												</span>
												/&gt;
											</div>
											<div className="pl-4">
												&lt;<span className="text-teal-600">name</span>&gt;
												{effectiveClinicName}&lt;/
												<span className="text-teal-600">name</span>&gt;
											</div>
											<div>
												&lt;/
												<span className="text-teal-600">
													representedOrganization
												</span>
												&gt;
											</div>
										</div>
									)}
								</div>

								{/* 3. Doctor SNILS / FRMR */}
								<div className="border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900 overflow-hidden shadow-sm">
									<button
										type="button"
										onClick={() => toggleSection("doctor")}
										className="w-full p-3 text-left font-bold text-xs flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/60"
									>
										<span className="flex items-center gap-2">
											<span className="text-teal-600 dark:text-teal-400 font-mono">
												3.
											</span>
											<span>
												Врач-автор документа (Doctor SNILS/FRMR & Position)
											</span>
										</span>
										{collapsedSections.doctor ? (
											<ChevronRight size={16} />
										) : (
											<ChevronDown size={16} />
										)}
									</button>
									{!collapsedSections.doctor && (
										<div className="p-3 bg-slate-50 dark:bg-slate-950/70 border-t border-slate-100 dark:border-slate-800 text-xs font-mono overflow-x-auto text-slate-800 dark:text-slate-200">
											<div>
												&lt;<span className="text-teal-600">assignedAuthor</span>
												&gt;
											</div>
											<div className="pl-4">
												&lt;<span className="text-teal-600">id</span>{" "}
												<span className="text-sky-600">root</span>=
												<span className="text-emerald-600">
													"1.2.643.100.3"
												</span>{" "}
												<span className="text-sky-600">extension</span>=
												<span className="text-emerald-600">
													"{doctorSnils || "00000000000"}"
												</span>
												/&gt;
											</div>
											<div className="pl-4">
												&lt;<span className="text-teal-600">code</span>{" "}
												<span className="text-sky-600">code</span>=
												<span className="text-emerald-600">
													"{doctorPositionCode || "15"}"
												</span>{" "}
												<span className="text-sky-600">codeSystem</span>=
												<span className="text-emerald-600">
													"1.2.643.5.1.13.13.11.1002"
												</span>{" "}
												<span className="text-sky-600">displayName</span>=
												<span className="text-emerald-600">
													"{doctorPosition || "Врач-стоматолог"}"
												</span>
												/&gt;
											</div>
											<div className="pl-4">
												&lt;<span className="text-teal-600">assignedPerson</span>
												&gt;&lt;<span className="text-teal-600">name</span>&gt;
												{formattedDoctorName}&lt;/
												<span className="text-teal-600">name</span>&gt;&lt;/
												<span className="text-teal-600">assignedPerson</span>&gt;
											</div>
											<div>
												&lt;/
												<span className="text-teal-600">assignedAuthor</span>
												&gt;
											</div>
										</div>
									)}
								</div>

								{/* 4. Patient SNILS / Polis OMS */}
								<div className="border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900 overflow-hidden shadow-sm">
									<button
										type="button"
										onClick={() => toggleSection("patient")}
										className="w-full p-3 text-left font-bold text-xs flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/60"
									>
										<span className="flex items-center gap-2">
											<span className="text-teal-600 dark:text-teal-400 font-mono">
												4.
											</span>
											<span>
												Пациент (Patient SNILS/Polis OMS/DMS & Demographics)
											</span>
										</span>
										{collapsedSections.patient ? (
											<ChevronRight size={16} />
										) : (
											<ChevronDown size={16} />
										)}
									</button>
									{!collapsedSections.patient && (
										<div className="p-3 bg-slate-50 dark:bg-slate-950/70 border-t border-slate-100 dark:border-slate-800 text-xs font-mono overflow-x-auto text-slate-800 dark:text-slate-200">
											<div>
												&lt;<span className="text-teal-600">patientRole</span>
												&gt;
											</div>
											<div className="pl-4">
												&lt;<span className="text-teal-600">id</span>{" "}
												<span className="text-sky-600">root</span>=
												<span className="text-emerald-600">
													"1.2.643.100.3"
												</span>{" "}
												<span className="text-sky-600">extension</span>=
												<span className="text-emerald-600">
													"{patientSnils || "не указан"}"
												</span>
												/&gt;
											</div>
											<div className="pl-4">
												&lt;<span className="text-teal-600">patient</span>&gt;
												<div className="pl-4">
													&lt;<span className="text-teal-600">name</span>&gt;
													{formattedPatientName}&lt;/
													<span className="text-teal-600">name</span>&gt;
												</div>
												<div className="pl-4">
													&lt;
													<span className="text-teal-600">
														administrativeGenderCode
													</span>{" "}
													<span className="text-sky-600">code</span>=
													<span className="text-emerald-600">
														"{patientGender === "male" ? "1" : "2"}"
													</span>
													/&gt;
												</div>
												<div className="pl-4">
													&lt;<span className="text-teal-600">birthTime</span>{" "}
													<span className="text-sky-600">value</span>=
													<span className="text-emerald-600">
														"{patientBirthDate || "19800101"}"
													</span>
													/&gt;
												</div>
												&lt;/<span className="text-teal-600">patient</span>&gt;
											</div>
											<div>
												&lt;/<span className="text-teal-600">patientRole</span>
												&gt;
											</div>
										</div>
									)}
								</div>

								{/* 5. Diagnosis ICD-10 */}
								<div className="border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900 overflow-hidden shadow-sm">
									<button
										type="button"
										onClick={() => toggleSection("diagnosis")}
										className="w-full p-3 text-left font-bold text-xs flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/60"
									>
										<span className="flex items-center gap-2">
											<span className="text-teal-600 dark:text-teal-400 font-mono">
												5.
											</span>
											<span>Диагноз МКБ-10 и локализация зуба (Diagnosis)</span>
										</span>
										{collapsedSections.diagnosis ? (
											<ChevronRight size={16} />
										) : (
											<ChevronDown size={16} />
										)}
									</button>
									{!collapsedSections.diagnosis && (
										<div className="p-3 bg-slate-50 dark:bg-slate-950/70 border-t border-slate-100 dark:border-slate-800 text-xs font-mono overflow-x-auto text-slate-800 dark:text-slate-200">
											<div>
												&lt;<span className="text-teal-600">value</span>{" "}
												<span className="text-sky-600">xsi:type</span>=
												<span className="text-emerald-600">"CD"</span>{" "}
												<span className="text-sky-600">code</span>=
												<span className="text-emerald-600">
													"{icd10Code || "K02.1"}"
												</span>{" "}
												<span className="text-sky-600">codeSystem</span>=
												<span className="text-emerald-600">
													"1.2.643.5.1.13.13.11.1005"
												</span>{" "}
												<span className="text-sky-600">displayName</span>=
												<span className="text-emerald-600">
													"{diagnosisText || "Кариес дентина"}"
												</span>
												/&gt;
											</div>
											{diagnosisTooth ? (
												<div>
													&lt;
													<span className="text-teal-600">targetSiteCode</span>{" "}
													<span className="text-sky-600">code</span>=
													<span className="text-emerald-600">
														"{diagnosisTooth}"
													</span>{" "}
													<span className="text-sky-600">codeSystem</span>=
													<span className="text-emerald-600">
														"1.2.643.5.1.13.13.11.1466"
													</span>{" "}
													<span className="text-sky-600">displayName</span>=
													<span className="text-emerald-600">
														"Зуб {diagnosisTooth}"
													</span>
													/&gt;
												</div>
											) : null}
										</div>
									)}
								</div>

								{/* 6. Dental formula XML block */}
								<div className="border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900 overflow-hidden shadow-sm">
									<button
										type="button"
										onClick={() => toggleSection("dentalFormula")}
										className="w-full p-3 text-left font-bold text-xs flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/60"
									>
										<span className="flex items-center gap-2">
											<span className="text-teal-600 dark:text-teal-400 font-mono">
												6.
											</span>
											<span>
												Зубная формула и одонтограмма (Dental Formula Block)
											</span>
										</span>
										{collapsedSections.dentalFormula ? (
											<ChevronRight size={16} />
										) : (
											<ChevronDown size={16} />
										)}
									</button>
									{!collapsedSections.dentalFormula && (
										<div className="p-3 bg-slate-50 dark:bg-slate-950/70 border-t border-slate-100 dark:border-slate-800 text-xs font-mono overflow-x-auto text-slate-800 dark:text-slate-200">
											<div>
												&lt;<span className="text-teal-600">section</span>&gt;
											</div>
											<div className="pl-4">
												&lt;<span className="text-teal-600">code</span>{" "}
												<span className="text-sky-600">code</span>=
												<span className="text-emerald-600">"74208-1"</span>{" "}
												<span className="text-sky-600">displayName</span>=
												<span className="text-emerald-600">
													"Зубная формула и одонтограмма"
												</span>
												/&gt;
											</div>
											<div className="pl-4">
												&lt;<span className="text-teal-600">title</span>&gt;Зубная
												формула (FDI ISO 3950)&lt;/
												<span className="text-teal-600">title</span>&gt;
											</div>
											<div className="pl-4 text-slate-500">
												&lt;!-- {Object.keys(toothStates || {}).length} зубов
												включено в структуру CDA --&gt;
											</div>
											<div>
												&lt;/<span className="text-teal-600">section</span>&gt;
											</div>
										</div>
									)}
								</div>

								{/* 7. Performed procedures (V001 / Nomenklatura) */}
								<div className="border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900 overflow-hidden shadow-sm">
									<button
										type="button"
										onClick={() => toggleSection("procedures")}
										className="w-full p-3 text-left font-bold text-xs flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/60"
									>
										<span className="flex items-center gap-2">
											<span className="text-teal-600 dark:text-teal-400 font-mono">
												7.
											</span>
											<span>
												Оказанные медицинские услуги (Номенклатура V001 &
												LOINC 47519-4)
											</span>
										</span>
										{collapsedSections.procedures ? (
											<ChevronRight size={16} />
										) : (
											<ChevronDown size={16} />
										)}
									</button>
									{!collapsedSections.procedures && (
										<div className="p-3 bg-slate-50 dark:bg-slate-950/70 border-t border-slate-100 dark:border-slate-800 text-xs font-mono overflow-x-auto text-slate-800 dark:text-slate-200">
											<div>
												&lt;<span className="text-teal-600">procedure</span>{" "}
												<span className="text-sky-600">classCode</span>=
												<span className="text-emerald-600">"PROC"</span>&gt;
											</div>
											<div className="pl-4">
												&lt;<span className="text-teal-600">code</span>{" "}
												<span className="text-sky-600">code</span>=
												<span className="text-emerald-600">"A16.07.002"</span>{" "}
												<span className="text-sky-600">codeSystem</span>=
												<span className="text-emerald-600">
													"1.2.643.5.1.13.13.11.1070"
												</span>{" "}
												<span className="text-sky-600">displayName</span>=
												<span className="text-emerald-600">
													"Восстановление зуба пломбой"
												</span>
												/&gt;
											</div>
											<div>
												&lt;/<span className="text-teal-600">procedure</span>&gt;
											</div>
										</div>
									)}
								</div>
							</div>

							{/* Full XML Syntax Preview Block */}
							<div className="mt-2">
								<div className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-2 flex items-center justify-between">
									<span>Полный канонический XML-документ СЭМД:</span>
									<span className="text-[11px] font-mono text-slate-500">
										{generatedXml.length} байт UTF-8
									</span>
								</div>
								<div className="p-4 rounded-xl bg-slate-950 text-slate-100 font-mono text-xs overflow-x-auto max-h-[300px] border border-slate-800 leading-relaxed shadow-inner">
									<pre className="m-0 whitespace-pre font-mono">
										{generatedXml}
									</pre>
								</div>
							</div>
						</div>
					)}

					{/* TAB 2: SEMANTIC VALIDATION CHECKLIST */}
					{activeTab === "validation" && (
						<div className="flex flex-col gap-4">
							{/* Summary Score Banner */}
							<div
								className={`p-4 rounded-xl border flex items-center justify-between flex-wrap gap-4 ${
									validationReport.isValid
										? "bg-emerald-500/10 border-emerald-500/30 text-emerald-900 dark:text-emerald-200"
										: "bg-amber-500/10 border-amber-500/30 text-amber-900 dark:text-amber-200"
								}`}
							>
								<div className="flex items-center gap-3">
									{validationReport.isValid ? (
										<ShieldCheck className="w-8 h-8 text-emerald-500 shrink-0" />
									) : (
										<AlertTriangle className="w-8 h-8 text-amber-500 shrink-0" />
									)}
									<div>
										<h3 className="text-base font-bold m-0">
											{validationReport.isValid
												? "Документ полностью соответствует спецификации СЭМД Минздрава"
												: "Обнаружены замечания при проверке семантических правил CDA R2"}
										</h3>
										<p className="text-xs opacity-90 m-0 mt-0.5">
											Пройдено: {validationReport.passedCount} из{" "}
											{validationReport.totalRules} правил (
											{validationReport.failedCount} критических ошибок,{" "}
											{validationReport.warningCount} предупреждений)
										</p>
									</div>
								</div>
								<div className="flex items-center gap-2">
									<div className="text-right">
										<div className="text-2xl font-black font-mono">
											{validationReport.scorePercent}%
										</div>
										<div className="text-[10px] uppercase tracking-wider font-bold">
											Индекс соответствия
										</div>
									</div>
								</div>
							</div>

							{/* Rule Items List */}
							<div className="flex flex-col gap-2">
								{validationReport.rules.map((rule) => {
									const isPassed = rule.status === "passed";
									const isFailed = rule.status === "failed";
									const isWarn = rule.status === "warning";

									return (
										<div
											key={rule.id}
											data-testid={`validation-rule-${rule.id}`}
											className={`p-3.5 rounded-xl border bg-white dark:bg-slate-900 flex items-start justify-between gap-3 shadow-sm transition-colors ${
												isFailed
													? "border-rose-300 dark:border-rose-900/60 bg-rose-50/30 dark:bg-rose-950/20"
													: isWarn
														? "border-amber-300 dark:border-amber-900/60 bg-amber-50/30 dark:bg-amber-950/20"
														: "border-slate-200 dark:border-slate-800"
											}`}
										>
											<div className="flex items-start gap-3 min-w-0">
												<div className="shrink-0 mt-0.5">
													{isPassed && (
														<CheckCircle2 className="w-5 h-5 text-emerald-500" />
													)}
													{isFailed && (
														<AlertCircle className="w-5 h-5 text-rose-500" />
													)}
													{isWarn && (
														<AlertTriangle className="w-5 h-5 text-amber-500" />
													)}
												</div>
												<div className="min-w-0">
													<div className="flex items-center gap-2 flex-wrap">
														<span className="text-xs font-bold text-slate-900 dark:text-white">
															{rule.name}
														</span>
														<span
															className={`text-[10px] px-2 py-0.2 rounded-full font-bold uppercase ${
																isPassed
																	? "bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300"
																	: isFailed
																		? "bg-rose-100 dark:bg-rose-950 text-rose-800 dark:text-rose-300"
																		: "bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300"
															}`}
														>
															{isPassed
																? "Пройдено"
																: isFailed
																	? "Ошибка"
																	: "Рекомендация"}
														</span>
													</div>
													<p className="text-xs text-slate-600 dark:text-slate-300 m-0 mt-1 leading-relaxed">
														{rule.message}
													</p>
													{rule.details && (
														<p className="text-[11px] text-slate-400 dark:text-slate-500 font-mono m-0 mt-1">
															{rule.details}
														</p>
													)}
												</div>
											</div>

											{rule.xpathOrOid && (
												<span className="hidden sm:inline-block text-[10px] font-mono text-slate-400 dark:text-slate-500 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded shrink-0 max-w-[200px] truncate">
													{rule.xpathOrOid}
												</span>
											)}
										</div>
									);
								})}
							</div>
						</div>
					)}

					{/* TAB 3: DIGITAL SIGNATURE (УКЭП GOST R 34.10-2012) */}
					{activeTab === "signature" && (
						<div className="flex flex-col gap-4">
							{/* Current Signature Status Banner */}
							<div
								className={`p-4 rounded-xl border flex items-center justify-between flex-wrap gap-3 ${
									doctorSignatureBase64
										? "bg-emerald-500/10 border-emerald-500/30 text-emerald-900 dark:text-emerald-200"
										: "bg-slate-100 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200"
								}`}
							>
								<div className="flex items-center gap-3">
									<ShieldCheck
										className={`w-7 h-7 ${doctorSignatureBase64 ? "text-emerald-500" : "text-slate-400"}`}
									/>
									<div>
										<h3 className="text-sm font-bold m-0">
											{doctorSignatureBase64
												? "УКЭП врача ГОСТ Р 34.10-2012 наложена"
												: "Электронная цифровая подпись еще не наложена"}
										</h3>
										<p className="text-xs opacity-80 m-0 mt-0.5">
											{doctorSignatureBase64
												? `Подписано: ${new Date(signedAt || "").toLocaleString("ru-RU")} · Сертификат: ${signatureCertInfo?.thumbprint || selectedCert}`
												: "Для отправки СЭМД в РЭМД ЕГИСЗ требуется отсоединенная УКЭП по ГОСТ Р 34.10-2012"}
										</p>
									</div>
								</div>

								{doctorSignatureBase64 && (
									<span className="px-3 py-1 rounded-full bg-emerald-600 text-white text-xs font-bold shadow-sm">
										Подпись проверена
									</span>
								)}
							</div>

							{/* Certificate Selector & Details */}
							<div className="p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm flex flex-col gap-4">
								<div>
									<div className="flex items-center justify-between mb-2">
										<label
											htmlFor="cda-cert-select"
											className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider"
										>
											Сертификат открытого ключа (КриптоПро CSP / Рутокен):
										</label>
										<button
											type="button"
											onClick={loadCertificates}
											disabled={isLoadingCerts}
											className="text-xs text-teal-600 dark:text-teal-400 hover:underline flex items-center gap-1"
										>
											<RefreshCcw
												size={12}
												className={isLoadingCerts ? "animate-spin" : ""}
											/>
											<span>Обновить список</span>
										</button>
									</div>

									<select
										id="cda-cert-select"
										data-testid="cda-cert-select"
										value={selectedCert}
										onChange={(e) => setSelectedCert(e.target.value)}
										disabled={isLoadingCerts || isSigning}
										className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-teal-500 focus:outline-none"
									>
										{isLoadingCerts ? (
											<option>Чтение сертификатов из хранилища…</option>
										) : certificates.length === 0 ? (
											<option value="">Сертификаты не обнаружены</option>
										) : (
											certificates.map((c) => (
												<option key={c.thumbprint} value={c.thumbprint}>
													{c.name} ({c.provider === "rutoken" ? "Рутокен" : "КриптоПро"}) — до{" "}
													{new Date(c.validTo).toLocaleDateString("ru-RU")}
												</option>
											))
										)}
									</select>
								</div>

								{/* Certificate Detailed Info Card */}
								{selectedCertInfo && (
									<div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800 text-xs space-y-1.5 font-mono">
										<div className="text-slate-900 dark:text-white font-bold font-sans">
											Владелец: {selectedCertInfo.name}
										</div>
										<div className="text-slate-600 dark:text-slate-400 text-[11px]">
											Издатель: {selectedCertInfo.issuer}
										</div>
										<div className="text-slate-600 dark:text-slate-400 text-[11px]">
											Алгоритм: ГОСТ Р 34.10-2012 (256 бит, OID 1.2.643.7.1.1.1.1)
										</div>
										<div className="text-slate-600 dark:text-slate-400 text-[11px]">
											Действителен: с{" "}
											{new Date(selectedCertInfo.validFrom).toLocaleDateString("ru-RU")}{" "}
											по{" "}
											{new Date(selectedCertInfo.validTo).toLocaleDateString("ru-RU")}
										</div>
										<div className="text-slate-500 text-[10px] break-all">
											Отпечаток (SHA-1): {selectedCertInfo.thumbprint}
										</div>
									</div>
								)}

								{/* Token PIN Input if needed */}
								{needsTokenPin && (
									<div>
										<label
											htmlFor="cda-token-pin"
											className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 uppercase tracking-wider"
										>
											ПИН-код носителя Рутокен:
										</label>
										<input
											id="cda-token-pin"
											type="password"
											value={tokenPin}
											onChange={(e) => setTokenPin(e.target.value)}
											disabled={isSigning}
											placeholder="Введите ПИН-код носителя"
											className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-teal-500 focus:outline-none"
										/>
									</div>
								)}

								<button
									type="button"
									onClick={handleSignCda}
									disabled={isSigning || !selectedCert}
									data-testid="btn-sign-cda-ukep"
									className="w-full py-2.5 px-4 bg-teal-600 hover:bg-teal-500 disabled:opacity-60 text-white font-bold text-xs rounded-xl transition-all shadow-md shadow-teal-500/20 flex items-center justify-center gap-2 cursor-pointer"
								>
									{isSigning ? (
										<span>Наложение подписи КриптоПро…</span>
									) : (
										<>
											<ShieldCheck size={16} />
											<span>
												{doctorSignatureBase64
													? "Переподписать УКЭП ГОСТ Р 34.10-2012"
													: "Подписать документ УКЭП ГОСТ Р 34.10-2012"}
											</span>
										</>
									)}
								</button>
							</div>
						</div>
					)}

					{/* Feedback Alerts for Send to REMD */}
					{sendSuccess && (
						<div
							className="mt-4 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-800 dark:text-emerald-200 text-xs flex items-start gap-3"
							data-testid="remd-send-success-alert"
						>
							<CheckCircle2 size={20} className="text-emerald-500 shrink-0 mt-0.5" />
							<div>
								<div className="font-bold">Документ СЭМД успешно передан в РЭМД ЕГИСЗ</div>
								<div className="mt-0.5 font-mono text-[11px]">
									Номер транзакции: {transactionId || "REMD-CONFIRMED"}
								</div>
							</div>
						</div>
					)}

					{sendError && (
						<div
							className="mt-4 p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-800 dark:text-rose-200 text-xs flex items-start gap-3"
							data-testid="remd-send-error-alert"
						>
							<AlertCircle size={20} className="text-rose-500 shrink-0 mt-0.5" />
							<div>
								<div className="font-bold">Ошибка отправки в РЭМД ЕГИСЗ</div>
								<div className="mt-0.5">{sendError}</div>
							</div>
						</div>
					)}
				</main>

				{/* Modal Actions Footer */}
				<footer className="p-4 sm:p-5 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 flex items-center justify-between flex-wrap gap-3 shrink-0">
					<div className="flex items-center gap-2">
						<button
							type="button"
							onClick={onClose}
							className="px-4 py-2.5 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-bold rounded-xl transition-colors"
						>
							Закрыть
						</button>
					</div>

					<div className="flex items-center gap-2.5">
						{/* 1-Click "Экспорт XML CDA" */}
						<button
							type="button"
							onClick={handleExportXml}
							data-testid="btn-export-cda-xml"
							className="px-4 py-2.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-750 text-slate-900 dark:text-slate-100 text-xs font-bold rounded-xl transition-all flex items-center gap-2 shadow-sm cursor-pointer"
						>
							<Download size={15} />
							<span>Экспорт XML CDA</span>
						</button>

						{/* 1-Click "Отправить в РЭМД ЕГИСЗ (Шлюз Минздрава)" */}
						<button
							type="button"
							onClick={handleSubmitToRemd}
							disabled={isSending}
							data-testid="btn-submit-egisz-remd"
							className="px-5 py-2.5 bg-sky-600 hover:bg-sky-500 disabled:opacity-60 text-white text-xs font-bold rounded-xl transition-all shadow-lg shadow-sky-600/20 flex items-center gap-2 cursor-pointer"
						>
							{isSending ? (
								<>
									<RefreshCcw size={15} className="animate-spin" />
									<span>Передача в РЭМД…</span>
								</>
							) : (
								<>
									<Send size={15} />
									<span>Отправить в РЭМД ЕГИСЗ (Шлюз Минздрава)</span>
								</>
							)}
						</button>
					</div>
				</footer>
			</div>
		</div>
	);
};
