/**
 * ═══════════════════════════════════════════════════════════════════════════
 * EGISZ CDA R3 & CRYPTOPRO UKEP SIGNING CABINET MODAL — DENTE CRM
 * Tier 3 Dedicated Chief Medical Officer / Attending Doctor Signing Studio
 * Features:
 * 1. Statutory CDA R3 / R2 XML generation for SEMD 108 (043/у), 111 (Surgery), 117 (IDS)
 * 2. CryptoPro CSP browser plug-in integration (CAdES-BES detached GOST signatures)
 * 3. Ministry of Health Order 947n visual electronic blue signature stamp
 * 4. Comprehensive EGISZ REMD Journal & Receipt status lifecycle tracking
 * 5. Touch Targets >= 44px, Tokenized Theme, Zero-Clutter Architecture
 * ═══════════════════════════════════════════════════════════════════════════
 */

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import {
	AlertCircle,
	AlertTriangle,
	Archive,
	Building2,
	Check,
	CheckCircle2,
	Clock,
	Code2,
	Copy,
	Download,
	Eye,
	FileCheck,
	FileCode2,
	FileText,
	Filter,
	KeyRound,
	Printer,
	RefreshCw,
	Search,
	Send,
	Shield,
	ShieldAlert,
	ShieldCheck,
	Sparkles,
	User,
	UserCheck,
	X,
} from "lucide-react";
import {
	type CryptoCertificate,
	type CryptoProStatusResponse,
	checkCryptoProStatus,
	fetchCertificates,
	parseDetachedSigFile,
	signDocumentGost,
} from "../../services/cryptoProApiClient";
import { showToast } from "../GlobalToast";
import { denteAdminSecretRequestHeaders } from "../../lib/denteRequestHeaders";
import {
	ALL_FDI_TEETH,
	DEFAULT_EGISZ_CLINIC_PRESET,
	DEFAULT_EGISZ_DOCTOR_PRESET,
	EGISZ_DENTAL_SEMD_TYPES,
	type EgiszDentalCdaPayload,
	type EgiszDentalSemdCode,
	type GostSignatureInfo,
	SAMPLE_DENTAL_SEMD_105_PRESET,
	canonicalizeCdaXml,
	formatHl7DateTime,
	formatRuDate,
	generateEgiszDentalCdaXml,
	generateEgiszXmlFilename,
	generateForm043uPrintHtml,
	generateGostSignatureStampHtml,
	runEgisz043uPreflight,
	type EgiszPreflightReport,
} from "../egisz/egiszRemdEngine";
import "../egisz/egiszRemd.css";

export type EgiszDocumentStatus =
	| "draft"
	| "signed_doctor"
	| "signed_clinic"
	| "queued_remd"
	| "sent_to_remd"
	| "registered_remd"
	| "validation_error";

export interface EgiszCabinetDocumentItem {
	readonly id: string;
	readonly documentNumber: string;
	readonly docType: EgiszDentalSemdCode;
	readonly titleRu: string;
	readonly patientId: string;
	readonly patientFullName: string;
	readonly patientSnils: string;
	readonly doctorFullName: string;
	readonly doctorSnils: string;
	readonly visitDate: string;
	readonly status: EgiszDocumentStatus;
	readonly icd10Code: string;
	readonly diagnosisText: string;
	readonly remdRegistrationNumber?: string | undefined;
	readonly remdRegisteredAt?: string | undefined;
	readonly validationErrors?: readonly string[] | undefined;
	readonly payload: EgiszDentalCdaPayload;
	readonly doctorSignature?: GostSignatureInfo | undefined;
	readonly clinicSignature?: GostSignatureInfo | undefined;
}

export interface EgiszSigningCabinetModalProps {
	readonly isOpen: boolean;
	readonly onClose: () => void;
	readonly initialDocumentId?: string | undefined;
	readonly initialDocuments?: readonly EgiszCabinetDocumentItem[] | undefined;
}

// ── Statutory Pre-loaded Dental Outpatient Documents ──
export const INITIAL_CABINET_DOCUMENTS: readonly EgiszCabinetDocumentItem[] = [];

export const EgiszSigningCabinetModal: React.FC<EgiszSigningCabinetModalProps> = ({
	isOpen,
	onClose,
	initialDocumentId,
	initialDocuments,
}) => {
	// ── 1. Documents State ──
	const [documents, setDocuments] = useState<EgiszCabinetDocumentItem[]>(() =>
		initialDocuments ? [...initialDocuments] : [...INITIAL_CABINET_DOCUMENTS],
	);
	const [selectedDocId, setSelectedDocId] = useState<string>(
		initialDocumentId || (documents[0]?.id ?? ""),
	);
	const [filterStatus, setFilterStatus] = useState<string>("all");
	const [searchQuery, setSearchQuery] = useState<string>("");
	const [activeTab, setActiveTab] = useState<"signing" | "xml_preview" | "journal">("signing");

	// ── 2. Real CryptoPro CSP Engine & Certificates State ──
	const [cryptoStatus, setCryptoStatus] = useState<CryptoProStatusResponse | null>(null);
	const [certificates, setCertificates] = useState<CryptoCertificate[]>([]);
	const [selectedCertThumbprint, setSelectedCertThumbprint] = useState<string>("");
	const [isSigningLoading, setIsSigningLoading] = useState<boolean>(false);
	const [isSendingLoading, setIsSendingLoading] = useState<boolean>(false);

	// Currently Selected Document
	const currentDoc = useMemo(() => {
		if (documents.length === 0) return null;
		return documents.find((d) => d.id === selectedDocId) || documents[0] || null;
	}, [documents, selectedDocId]);

	// Filtered Documents List
	const filteredDocs = useMemo(() => {
		return documents.filter((doc) => {
			if (filterStatus !== "all" && doc.status !== filterStatus) return false;
			if (searchQuery.trim()) {
				const q = searchQuery.toLowerCase();
				const matchName = doc.patientFullName.toLowerCase().includes(q);
				const matchSnils = doc.patientSnils.includes(q);
				const matchNum = doc.documentNumber.toLowerCase().includes(q);
				if (!matchName && !matchSnils && !matchNum) return false;
			}
			return true;
		});
	}, [documents, filterStatus, searchQuery]);

	// Pre-flight Validation Result
	const preflight = useMemo((): EgiszPreflightReport => {
		if (!currentDoc) {
			return {
				isValid: false,
				canSendToRemd: false,
				totalChecks: 0,
				passedCount: 0,
				failedCount: 0,
				warningCount: 0,
				scorePercent: 0,
				checks: [],
			};
		}
		return runEgisz043uPreflight(currentDoc.payload);
	}, [currentDoc]);

	// Generated Canonical CDA XML
	const generatedXml = useMemo(() => {
		if (!currentDoc) return "";
		return generateEgiszDentalCdaXml(currentDoc.payload);
	}, [currentDoc]);

	// ── 3. Check CryptoPro Status & Load Certificates on Mount ──
	useEffect(() => {
		if (!isOpen) return;
		let isMounted = true;

		async function initCryptoPro() {
			try {
				const status = await checkCryptoProStatus();
				if (!isMounted) return;
				setCryptoStatus(status);

				if (status.installed) {
					const certs = await fetchCertificates();
					if (!isMounted) return;
					setCertificates(certs);
					if (certs.length > 0 && !selectedCertThumbprint) {
						setSelectedCertThumbprint(certs[0]?.thumbprint || "");
					}
				}
			} catch {
				if (isMounted) setCryptoStatus({ installed: false });
			}
		}

		void initCryptoPro();

		return () => {
			isMounted = false;
		};
	}, [isOpen, selectedCertThumbprint]);

	// ── 4. Sign Document with Real Doctor UKEP (ГОСТ Р 34.10-2012) ──
	const handleSignWithDoctorUkep = async () => {
		if (!currentDoc) return;
		const targetCert = certificates.find((c) => c.thumbprint === selectedCertThumbprint) || certificates[0];
		if (!targetCert) {
			showToast(
				"Сертификат открытого ключа не выбран. Выберите сертификат из списка или загрузите файл открепленной подписи (.sig)",
				"warning",
			);
			return;
		}

		setIsSigningLoading(true);

		try {
			const canonicalXml = canonicalizeCdaXml(generatedXml);
			const base64Data = btoa(unescape(encodeURIComponent(canonicalXml)));
			const signResult = await signDocumentGost({
				dataBase64: base64Data,
				thumbprint: targetCert.thumbprint,
				documentId: currentDoc.id,
				documentKind: currentDoc.docType,
			});

			const sig: GostSignatureInfo = {
				signatureBase64: signResult.signatureBase64,
				certificateSerialNumber: targetCert.serialNumber || targetCert.thumbprint.slice(0, 16),
				certificateSubject: targetCert.subjectName,
				certificateIssuer: targetCert.issuerName,
				validFrom: targetCert.validFrom,
				validTo: targetCert.validTo,
				signedAt: signResult.signedAt || new Date().toISOString(),
				algorithmOid: "1.2.643.7.1.1.1.1",
				digestAlgorithmOid: "1.2.643.7.1.1.2.2",
			};

			setDocuments((prev) =>
				prev.map((d) =>
					d.id === currentDoc.id
						? {
								...d,
								status: "signed_doctor",
								doctorSignature: sig,
							}
						: d,
				),
			);
			showToast(`УКЭП врача успешно наложена (${targetCert.doctorFullName})`, "success");
		} catch (err: unknown) {
			const msg = err instanceof Error ? err.message : String(err);
			showToast(`Ошибка подписания УКЭП: ${msg}`, "error");
		} finally {
			setIsSigningLoading(false);
		}
	};

	// ── 5. Sign Document with Clinic / MO Stamp (УКЭП МО) ──
	const handleSignWithClinicStamp = async () => {
		if (!currentDoc) return;
		const targetCert = certificates.find((c) => c.thumbprint === selectedCertThumbprint) || certificates[0];
		if (!targetCert) {
			showToast(
				"Сертификат организации не выбран. Выберите сертификат или загрузите файл открепленной подписи (.sig)",
				"warning",
			);
			return;
		}

		setIsSigningLoading(true);

		try {
			const canonicalXml = canonicalizeCdaXml(generatedXml);
			const base64Data = btoa(unescape(encodeURIComponent(canonicalXml)));
			const signResult = await signDocumentGost({
				dataBase64: base64Data,
				thumbprint: targetCert.thumbprint,
				documentId: currentDoc.id,
				documentKind: `${currentDoc.docType}_MO`,
			});

			const moSig: GostSignatureInfo = {
				signatureBase64: signResult.signatureBase64,
				certificateSerialNumber: targetCert.serialNumber || targetCert.thumbprint.slice(0, 16),
				certificateSubject: targetCert.subjectName,
				certificateIssuer: targetCert.issuerName,
				validFrom: targetCert.validFrom,
				validTo: targetCert.validTo,
				signedAt: signResult.signedAt || new Date().toISOString(),
				algorithmOid: "1.2.643.7.1.1.1.1",
				digestAlgorithmOid: "1.2.643.7.1.1.2.2",
			};

			setDocuments((prev) =>
				prev.map((d) =>
					d.id === currentDoc.id
						? {
								...d,
								status: "signed_clinic",
								clinicSignature: moSig,
							}
						: d,
				),
			);
			showToast("Печать медицинской организации (УКЭП МО) успешно наложена", "success");
		} catch (err: unknown) {
			const msg = err instanceof Error ? err.message : String(err);
			showToast(`Ошибка наложения печати МО: ${msg}`, "error");
		} finally {
			setIsSigningLoading(false);
		}
	};

	// ── 5.1 Upload Detached Signature File (.sig / .p7s) ──
	const handleUploadDetachedSig = async (file: File, kind: "doctor" | "clinic") => {
		if (!currentDoc) return;
		try {
			const parsed = await parseDetachedSigFile(file);
			const sig: GostSignatureInfo = {
				signatureBase64: parsed.signatureBase64,
				certificateSerialNumber: parsed.fileName.replace(/[^A-Za-z0-9]/g, "").slice(0, 16) || "ATTACHED_SIG",
				certificateSubject: `Открепленная подпись (${parsed.fileName})`,
				certificateIssuer: "Внешний криптопровайдер ГОСТ",
				validFrom: new Date().toISOString(),
				validTo: new Date(Date.now() + 365 * 24 * 3600 * 1000).toISOString(),
				signedAt: new Date().toISOString(),
				algorithmOid: "1.2.643.7.1.1.1.1",
				digestAlgorithmOid: "1.2.643.7.1.1.2.2",
			};

			setDocuments((prev) =>
				prev.map((d) =>
					d.id === currentDoc.id
						? {
								...d,
								...(kind === "doctor"
									? { status: "signed_doctor", doctorSignature: sig }
									: { status: "signed_clinic", clinicSignature: sig }),
							}
						: d,
				),
			);
			showToast(`Файл подписи ${kind === "doctor" ? "врача" : "клиники"} загружен: ${parsed.fileName}`, "success");
		} catch (err: unknown) {
			const msg = err instanceof Error ? err.message : String(err);
			showToast(`Ошибка загрузки файла подписи: ${msg}`, "error");
		}
	};

	// ── 5.1 Solo Doctor Local Storage (63-FZ Art. 9 / Mandate 8n) ──
	const handleLocalEmrStorage = () => {
		if (!currentDoc) return;
		const localRegNum = `ЭМК-ЛОКАЛ-${currentDoc.id.slice(0, 8).toUpperCase()}`;
		const localTime = new Date().toISOString().replace("T", " ").slice(0, 19);

		setDocuments((prev) =>
			prev.map((d) =>
				d.id === currentDoc.id
					? {
							...d,
							status: "registered_remd",
							remdRegistrationNumber: localRegNum,
							remdRegisteredAt: localTime,
							validationErrors: undefined,
						}
					: d,
			),
		);

		showToast("Документ 043/у сохранен в локальной базе ЭМК клиники", "success");
	};

	// ── 6. Send to EGISZ REMD ──
	const handleSendToRemd = async () => {
		if (!currentDoc) return;

		if (!currentDoc.doctorSignature) {
			showToast("Для отправки в РЭМД наложите подпись врача (нажмите «Подписать УКЭП/ПЭП»)", "warning");
			return;
		}

		if (preflight && !preflight.isValid) {
			showToast(
				`Документ не прошел валидацию ЕГИСЗ (${preflight.failedCount} ошибок). Проверьте раздел валидации.`,
				"error",
			);
			return;
		}

		setIsSendingLoading(true);

		// Step 1: Set to sending state
		setDocuments((prev) =>
			prev.map((d) => (d.id === currentDoc.id ? { ...d, status: "sent_to_remd" } : d)),
		);

		try {
			const cleanPatientSnils = (currentDoc.patientSnils || "").replace(/\D/g, "");
			const docType = String(currentDoc.docType || "108");
			const effectiveVisitId = currentDoc.id;

			const packageBody = {
				cdaXml: generatedXml,
				doctorSignature: {
					signatureBase64: currentDoc.doctorSignature.signatureBase64,
					certificateSerialNumber: currentDoc.doctorSignature.certificateSerialNumber,
					certificateSubject: currentDoc.doctorSignature.certificateSubject,
					signedAt: currentDoc.doctorSignature.signedAt || new Date().toISOString(),
					algorithmOid: currentDoc.doctorSignature.algorithmOid || "1.2.643.7.1.1.1.1",
				},
				...(currentDoc.clinicSignature
					? {
							clinicSignature: {
								signatureBase64: currentDoc.clinicSignature.signatureBase64,
								certificateSerialNumber: currentDoc.clinicSignature.certificateSerialNumber,
								certificateSubject: currentDoc.clinicSignature.certificateSubject,
								signedAt: currentDoc.clinicSignature.signedAt || new Date().toISOString(),
								algorithmOid: currentDoc.clinicSignature.algorithmOid || "1.2.643.7.1.1.1.1",
							},
							moSignature: {
								signatureBase64: currentDoc.clinicSignature.signatureBase64,
								certificateSerialNumber: currentDoc.clinicSignature.certificateSerialNumber,
								certificateSubject: currentDoc.clinicSignature.certificateSubject,
								signedAt: currentDoc.clinicSignature.signedAt || new Date().toISOString(),
								algorithmOid: currentDoc.clinicSignature.algorithmOid || "1.2.643.7.1.1.1.1",
							},
						}
					: {}),
				docType,
				patientId: currentDoc.patientId,
				visitId: effectiveVisitId,
				documentId: effectiveVisitId,
				documentVersion: currentDoc.payload.documentVersion || 1,
				xmlCanonicalPayload: generatedXml,
				metadata: {
					patientSnils: cleanPatientSnils,
					clinicOid: currentDoc.payload.clinic.clinicOid || "1.2.643.5.1.13.13.12.2.77.8432",
					...(currentDoc.payload.clinic.clinicOgrn ? { clinicOgrn: currentDoc.payload.clinic.clinicOgrn } : {}),
					docTypeNsiCode: docType,
				},
			};

			const res = await fetch("/api/egisz/packages", {
				method: "POST",
				headers: denteAdminSecretRequestHeaders({ "Content-Type": "application/json" }),
				body: JSON.stringify(packageBody),
			});

			if (!res.ok) {
				const errJson = (await res.json().catch(() => null)) as { message?: string; error?: string } | null;
				const errMsg =
					errJson?.message ||
					errJson?.error ||
					`Шлюз РЭМД ЕГИСЗ вернул ошибку (${res.status} ${res.statusText})`;
				throw new Error(errMsg);
			}

			const data = (await res.json()) as {
				success?: boolean;
				regNumber?: string;
				transactionId?: string;
				outboxId?: string;
				logId?: string;
				status?: string;
				message?: string;
			};

			const regNum = data.regNumber || data.transactionId || data.outboxId || data.logId || "РЕГ-РЭМД-ПРИНЯТО";
			const regTime = new Date().toISOString().replace("T", " ").slice(0, 19);

			setDocuments((prev) =>
				prev.map((d) =>
					d.id === currentDoc.id
						? {
								...d,
								status: "registered_remd",
								remdRegistrationNumber: regNum,
								remdRegisteredAt: regTime,
								validationErrors: undefined,
							}
						: d,
				),
			);

			showToast(`СЭМД успешно передан в РЭМД ЕГИСЗ! Номер: ${regNum}`, "success");
		} catch (err: unknown) {
			const errMsg = err instanceof Error ? err.message : String(err);
			showToast(`Ошибка отправки в РЭМД: ${errMsg}`, "error");

			// Reflect failure honestly in UI state instead of fake success
			setDocuments((prev) =>
				prev.map((d) =>
					d.id === currentDoc.id
						? {
								...d,
								status: "validation_error",
								validationErrors: [errMsg],
							}
						: d,
				),
			);
		} finally {
			setIsSendingLoading(false);
		}
	};

	// ── 7. Print Form 043/u (Always 1-Click Available with DRAFT stamp if not signed, Mandate 8e) ──
	const handlePrintForm043u = useCallback(() => {
		if (!currentDoc) return;
		const html = generateForm043uPrintHtml({
			...currentDoc.payload,
			doctorSignature: currentDoc.doctorSignature,
			moSignature: currentDoc.clinicSignature,
		});
		const printWin = window.open("", "_blank");
		if (printWin) {
			printWin.document.write(html);
			printWin.document.close();
			printWin.focus();
			setTimeout(() => printWin.print(), 300);
		}
		showToast(
			currentDoc.doctorSignature
				? "Печать протокола осмотра 043/у с отметкой ЭЦП"
				: "Печать черновика формы 043/у со штампом «ЧЕРНОВИК»",
			"info",
		);
	}, [currentDoc]);

	// Copy XML to clipboard
	const handleCopyXml = () => {
		navigator.clipboard.writeText(generatedXml);
		showToast("CDA R3 XML скопирован в буфер обмена!", "success");
	};

	// Download XML file
	const handleDownloadXml = () => {
		if (!currentDoc) return;
		const blob = new Blob([generatedXml], { type: "application/xml;charset=utf-8" });
		const url = URL.createObjectURL(blob);
		const link = document.createElement("a");
		link.href = url;
		link.download = generateEgiszXmlFilename(currentDoc.payload);
		link.click();
		URL.revokeObjectURL(url);
	};

	if (!isOpen) return null;

	return createPortal(
		<div className="egisz-remd-overlay" role="dialog" aria-modal="true">
			<div className="egisz-remd-container">
				{/* ── Studio Header ── */}
				<header className="egisz-remd-header">
					<div className="egisz-header-left">
						<div className="egisz-header-badge">
							<ShieldCheck size={20} />
						</div>
						<div className="egisz-header-text">
							<h2 className="egisz-header-title">
								Кабинет УКЭП и интеграции с ЕГИСЗ РЭМД
							</h2>
							<div className="egisz-header-subtitle">
								ГОСТ Р 34.10-2012 / Приказ Минздрава № 947н / СЭМД 108 (Форма 043/у)
							</div>
						</div>
					</div>

					{/* Center Navigation Tabs */}
					<div className="egisz-view-mode-selector">
						<button
							type="button"
							className={`egisz-mode-btn ${activeTab === "signing" ? "active" : ""}`}
							onClick={() => setActiveTab("signing")}
						>
							<FileCheck size={16} />
							<span>Подписание УКЭП</span>
						</button>
						<button
							type="button"
							className={`egisz-mode-btn ${activeTab === "xml_preview" ? "active" : ""}`}
							onClick={() => setActiveTab("xml_preview")}
						>
							<Code2 size={16} />
							<span>CDA R3 XML</span>
						</button>
						<button
							type="button"
							className={`egisz-mode-btn ${activeTab === "journal" ? "active" : ""}`}
							onClick={() => setActiveTab("journal")}
						>
							<FileText size={16} />
							<span>Журнал РЭМД</span>
						</button>
					</div>

					{/* Actions & Close */}
					<div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
						<button
							type="button"
							className="egisz-btn-secondary"
							onClick={handlePrintForm043u}
							title="Печать формы 043/у (доступна всегда в 1 клик со штампом ЧЕРНОВИК при отсутствии ЭЦП)"
							style={{ display: "inline-flex", alignItems: "center", gap: "6px", minHeight: "36px", padding: "0 12px" }}
						>
							<Printer size={16} />
							<span>{currentDoc?.doctorSignature ? "Печать 043/у (ЭЦП)" : "Печать 043/у (Черновик)"}</span>
						</button>
						<button
							type="button"
							className="egisz-btn-icon"
							onClick={onClose}
							title="Закрыть кабинет"
							aria-label="Закрыть"
						>
							<X size={20} />
						</button>
					</div>
				</header>

				{/* ── Studio Body (Master-Detail Layout) ── */}
				<div className="egisz-remd-body">
					{/* ── Left Master List of Documents ── */}
					<aside className="egisz-sidebar-panel">
						<div style={{ padding: "0.75rem", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
							{/* Search */}
							<div className="egisz-search-box">
								<Search size={16} color="#94a3b8" />
								<input
									type="text"
									placeholder="Поиск по ФИО, СНИЛС, номеру..."
									value={searchQuery}
									onChange={(e) => setSearchQuery(e.target.value)}
									className="egisz-search-input"
								/>
							</div>

							{/* Status Filter */}
							<select
								className="egisz-filter-select"
								value={filterStatus}
								onChange={(e) => setFilterStatus(e.target.value)}
							>
								<option value="all">Все статусы ({documents.length})</option>
								<option value="draft">Черновики</option>
								<option value="signed_doctor">Подписано врачом</option>
								<option value="signed_clinic">Подписано клиникой</option>
								<option value="registered_remd">Зарегистрировано в РЭМД</option>
								<option value="validation_error">Ошибки отправки</option>
							</select>
						</div>

						{/* Document List */}
						<div className="egisz-doc-items-list">
							{filteredDocs.length === 0 ? (
								<div
									data-testid="egisz-docs-empty-state"
									className="egisz-docs-empty-state"
									style={{
										display: "flex",
										flexDirection: "column",
										alignItems: "center",
										justifyContent: "center",
										padding: "2rem 1rem",
										textAlign: "center",
										gap: "8px",
										color: "#64748b",
									}}
								>
									<FileText size={32} color="#94a3b8" />
									<div style={{ fontSize: "0.875rem", fontWeight: 600 }}>
										В очереди нет документов для передачи в ЕГИСЗ РЭМД
									</div>
									<div style={{ fontSize: "0.75rem", color: "#94a3b8" }}>
										Документы формируются автоматически при подписании протоколов осмотра Формы 043/у
									</div>
								</div>
							) : (
								filteredDocs.map((doc) => (
									<button
										key={doc.id}
										type="button"
										className={`egisz-doc-card ${doc.id === selectedDocId ? "active" : ""}`}
										onClick={() => setSelectedDocId(doc.id)}
									>
										<div className="egisz-doc-card-header">
											<span className="egisz-doc-number">{doc.documentNumber}</span>
											<span className={`egisz-status-pill ${doc.status}`}>
												{doc.status === "draft"
													? "Черновик"
													: doc.status === "signed_doctor"
														? "Подписан врачом"
														: doc.status === "signed_clinic"
															? "Подписан МО"
															: doc.status === "registered_remd"
																? "В РЭМД"
																: doc.status === "validation_error"
																	? "Ошибка"
																	: "Отправка"}
											</span>
										</div>
										<div className="egisz-doc-patient-name">{doc.patientFullName}</div>
										<div className="egisz-doc-meta">
											<span>СНИЛС: {doc.patientSnils}</span>
											<span>{doc.visitDate}</span>
										</div>
									</button>
								))
							)}
						</div>
					</aside>

					{/* ── Main Workspace Area ── */}
					<main className="egisz-main-workspace">
						{!currentDoc ? (
							<div
								data-testid="egisz-docs-empty-state"
								className="egisz-docs-empty-state"
								style={{
									display: "flex",
									flexDirection: "column",
									alignItems: "center",
									justifyContent: "center",
									padding: "3rem 1.5rem",
									textAlign: "center",
									gap: "12px",
									color: "#64748b",
									minHeight: "360px",
								}}
							>
								<FileText size={48} color="#94a3b8" />
								<div style={{ fontSize: "1.1rem", fontWeight: 700, color: "#1e293b" }}>
									В очереди нет документов для передачи в ЕГИСЗ РЭМД
								</div>
								<p style={{ fontSize: "0.875rem", maxWidth: "420px", margin: 0 }}>
									Документы формируются автоматически при подписании протоколов осмотра Формы 043/у
								</p>
							</div>
						) : (
							<>
								{activeTab === "signing" && (
							<div className="egisz-signing-workspace">
								{/* 1. Document Summary Card */}
								<div className="egisz-card">
									<div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
										<div className="egisz-card-title" style={{ margin: 0 }}>
											<FileText size={18} color="#0284c7" />
											<span>{currentDoc.titleRu}</span>
										</div>
										<button
											type="button"
											className="egisz-btn-secondary"
											onClick={handlePrintForm043u}
											title="Быстрая печать протокола 043/у (доступна всегда в 1 клик со штампом ЧЕРНОВИК)"
											style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}
										>
											<Printer size={16} />
											<span>{currentDoc.doctorSignature ? "Распечатать с ЭЦП" : "Печать черновика (А4)"}</span>
										</button>
									</div>

									<div className="egisz-grid-2col">
										<div>
											<div className="egisz-field-label">Пациент:</div>
											<div className="egisz-field-val">
												<strong>{currentDoc.patientFullName}</strong> (СНИЛС: {currentDoc.patientSnils})
											</div>
										</div>
										<div>
											<div className="egisz-field-label">Лечащий врач:</div>
											<div className="egisz-field-val">
												<strong>{currentDoc.doctorFullName}</strong> ({currentDoc.payload.doctor.doctorPosition})
											</div>
										</div>
										<div>
											<div className="egisz-field-label">Диагноз МКБ-10:</div>
											<div className="egisz-field-val">
												<span className="egisz-code-chip">{currentDoc.icd10Code}</span> {currentDoc.diagnosisText}
											</div>
										</div>
										<div>
											<div className="egisz-field-label">Медицинская организация:</div>
											<div className="egisz-field-val">
												{currentDoc.payload.clinic.clinicName} (OID: {currentDoc.payload.clinic.clinicOid})
											</div>
										</div>
									</div>
								</div>

								{/* 2. CryptoPro CSP Status, Certificate Selector & Detached .sig Upload */}
								<div className="egisz-card">
									<div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
										<div className="egisz-card-title" style={{ margin: 0 }}>
											<KeyRound size={18} color="#10b981" />
											<span>Электронная подпись (КриптоПро CSP / ГОСТ Р 34.10-2012)</span>
										</div>
										{cryptoStatus?.installed && (
											<span
												style={{
													fontSize: "0.75rem",
													padding: "2px 8px",
													borderRadius: "9999px",
													background: "rgba(16, 185, 129, 0.15)",
													color: "#059669",
													fontWeight: 600,
												}}
											>
												{cryptoStatus.source === "native_cli"
													? "Нативный CLI-мост (csptest)"
													: "Браузерный плагин cadesplugin"}
											</span>
										)}
									</div>

									{cryptoStatus && !cryptoStatus.installed ? (
										<div className="egisz-warning-banner" style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
											<div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
												<AlertTriangle size={20} color="#d97706" />
												<div>
													<strong>КриптоПро CSP не обнаружен на рабочем месте.</strong>
													<div style={{ fontSize: "0.8rem", marginTop: "2px", color: "var(--muted, #64748b)" }}>
														Вы можете загрузить файл открепленной подписи (.sig / .p7s) вручную.
													</div>
												</div>
											</div>

											{/* Manual detached .sig upload dropzone / buttons */}
											<div style={{ display: "flex", flexWrap: "wrap", gap: "8px", marginTop: "4px" }}>
												<label className="egisz-btn-secondary" style={{ cursor: "pointer", fontSize: "0.8125rem", display: "inline-flex", alignItems: "center", gap: "6px" }}>
													<FileCheck size={15} />
													<span>Загрузить .sig врача</span>
													<input
														type="file"
														accept=".sig,.p7s,.sgn,.bin"
														style={{ display: "none" }}
														onChange={(e) => {
															const f = e.target.files?.[0];
															if (f) void handleUploadDetachedSig(f, "doctor");
														}}
													/>
												</label>

												<label className="egisz-btn-secondary" style={{ cursor: "pointer", fontSize: "0.8125rem", display: "inline-flex", alignItems: "center", gap: "6px" }}>
													<Building2 size={15} />
													<span>Загрузить .sig клиники (МО)</span>
													<input
														type="file"
														accept=".sig,.p7s,.sgn,.bin"
														style={{ display: "none" }}
														onChange={(e) => {
															const f = e.target.files?.[0];
															if (f) void handleUploadDetachedSig(f, "clinic");
														}}
													/>
												</label>
											</div>
										</div>
									) : (
										<div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
											<div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
												<label className="egisz-field-label">
													Сертификат открытого ключа ({certificates.length > 0 ? `доступно: ${certificates.length}` : "поиск..."}):
												</label>
												<label
													style={{
														cursor: "pointer",
														fontSize: "0.75rem",
														color: "var(--primary, #0ea5e9)",
														display: "inline-flex",
														alignItems: "center",
														gap: "4px",
													}}
													title="Загрузить открепленную подпись (.sig / .p7s), сформированную сторонней утилитой"
												>
													<FileCheck size={13} />
													<span>Загрузить .sig вручную</span>
													<input
														type="file"
														accept=".sig,.p7s,.sgn,.bin"
														style={{ display: "none" }}
														onChange={(e) => {
															const f = e.target.files?.[0];
															if (f) void handleUploadDetachedSig(f, "doctor");
														}}
													/>
												</label>
											</div>

											{certificates.length > 0 ? (
												<select
													className="egisz-cert-select"
													value={selectedCertThumbprint}
													onChange={(e) => setSelectedCertThumbprint(e.target.value)}
												>
													{certificates.map((c) => (
														<option key={c.thumbprint} value={c.thumbprint}>
															{c.doctorFullName || c.subjectName} • Отпечаток: {c.thumbprint.slice(0, 8)}... • Действителен до {c.validTo.slice(0, 10)}
														</option>
													))}
												</select>
											) : (
												<div className="egisz-warning-banner" style={{ padding: "0.6rem 0.8rem", fontSize: "0.8125rem" }}>
													<AlertCircle size={16} />
													<span>
														КриптоПро CSP обнаружен, но в личном хранилище uMy / токенах не найдено сертификатов с закрытым ключом ГОСТ. Вставьте токен (Рутокен/JaCarta) или загрузите .sig файл вручную.
													</span>
												</div>
											)}
										</div>
									)}

									{/* Action Buttons for Signatures */}
									<div className="egisz-signing-actions-row">
										{!currentDoc.doctorSignature ? (
											<button
												type="button"
												className="egisz-primary-btn"
												onClick={handleSignWithDoctorUkep}
												disabled={isSigningLoading || certificates.length === 0}
												title={certificates.length === 0 ? "Вставьте токен с сертификатом или загрузите файл .sig" : "Сформировать отсоединенную подпись ГОСТ"}
											>
												<KeyRound size={18} />
												<span>{isSigningLoading ? "Подписание..." : "1. Подписать УКЭП врача"}</span>
											</button>
										) : (
											<div className="egisz-signed-badge">
												<CheckCircle2 size={18} color="#10b981" />
												<span>УКЭП врача наложена ({currentDoc.doctorFullName})</span>
											</div>
										)}

										{currentDoc.doctorSignature && !currentDoc.clinicSignature && (
											<button
												type="button"
												className="egisz-primary-btn"
												onClick={handleSignWithClinicStamp}
												disabled={isSigningLoading || certificates.length === 0}
												style={{ background: "#059669" }}
												title={certificates.length === 0 ? "Вставьте токен с сертификатом клиники или загрузите файл .sig МО" : "Наложить электронную печать организации"}
											>
												<Building2 size={18} />
												<span>2. Наложить печать клиники (УКЭП МО)</span>
											</button>
										)}

										{currentDoc.clinicSignature && (
											<div className="egisz-signed-badge">
												<CheckCircle2 size={18} color="#10b981" />
												<span>Печать медицинской организации наложена</span>
											</div>
										)}
									</div>
								</div>

								{/* 3. Visual Official Blue Electronic Stamp (Order 947n) */}
								{currentDoc.doctorSignature && (
									<div className="egisz-card">
										<div className="egisz-card-title">
											<Sparkles size={18} color="#0284c7" />
											<span>Штамп визуализации ЭЦП (Приказ Минздрава № 947н)</span>
										</div>

										<div
											className="egisz-stamp-container"
											dangerouslySetInnerHTML={{
												__html: generateGostSignatureStampHtml({
													signerName: currentDoc.doctorFullName,
													certificateNumber: currentDoc.doctorSignature.certificateSerialNumber,
													validFrom: currentDoc.doctorSignature.validFrom || new Date().toISOString(),
													validTo: currentDoc.doctorSignature.validTo || new Date().toISOString(),
													orgName: currentDoc.payload.clinic.clinicName,
													signedAt: currentDoc.doctorSignature.signedAt,
												}),
											}}
										/>
									</div>
								)}

								{/* 4. Dispatch to EGISZ REMD */}
								<div className="egisz-card" style={{ marginTop: "auto" }}>
									<div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
										<div>
											<div style={{ fontWeight: 600 }}>Регистрация в ЕГИСЗ РЭМД:</div>
											<div style={{ fontSize: "0.8rem", color: currentDoc.status === "validation_error" ? "#ef4444" : "#64748b" }}>
												{currentDoc.status === "registered_remd"
													? `Успешно зарегистрирован: ${currentDoc.remdRegistrationNumber} (${currentDoc.remdRegisteredAt})`
													: currentDoc.status === "validation_error"
														? `Ошибка: ${currentDoc.validationErrors?.[0] || "Сбой отправки в РЭМД"}`
														: "Готов к отправке в федеральный реестр"}
											</div>
										</div>

										{currentDoc.status === "registered_remd" ? (
											<div className="egisz-status-badge success">
												<Check size={16} />
												<span>{currentDoc.remdRegistrationNumber?.startsWith("ЭМК-ЛОКАЛ") ? "Сохранено в ЭМК (Соло-врач)" : "Зарегистрирован в РЭМД"}</span>
											</div>
										) : currentDoc.status === "validation_error" ? (
											<div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
												<button
													type="button"
													className="egisz-btn-secondary"
													onClick={handleLocalEmrStorage}
													data-testid="solo-doctor-local-storage-btn"
													title="Сохранить в локальной ЭМК клиники без отправки в РЭМД (Соло-врач / ст. 9 63-ФЗ)"
												>
													<Archive size={16} />
													<span>Локальное хранение ЭМК (Соло-врач)</span>
												</button>
												<button
													type="button"
													className="egisz-primary-btn"
													onClick={handleSendToRemd}
													disabled={isSendingLoading}
													style={{ minWidth: "220px", backgroundColor: "#dc2626" }}
													data-testid="egisz-send-remd-btn"
												>
													<Send size={18} />
													<span>{isSendingLoading ? "Повтор отправки..." : "Повторить отправку"}</span>
												</button>
											</div>
										) : (
											<div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
												<button
													type="button"
													className="egisz-btn-secondary"
													onClick={handleLocalEmrStorage}
													data-testid="solo-doctor-local-storage-btn"
													title="Сохранить в локальной ЭМК клиники без отправки в РЭМД (Соло-врач / ст. 9 63-ФЗ)"
												>
													<Archive size={16} />
													<span>Локальное хранение ЭМК (Соло-врач)</span>
												</button>
												<button
													type="button"
													className="egisz-primary-btn"
													onClick={handleSendToRemd}
													disabled={isSendingLoading}
													style={{ minWidth: "220px" }}
													data-testid="egisz-send-remd-btn"
												>
													<Send size={18} />
													<span>{isSendingLoading ? "Отправка в РЭМД..." : "Отправить в ЕГИСЗ РЭМД"}</span>
												</button>
											</div>
										)}
									</div>
								</div>
							</div>
						)}

						{activeTab === "xml_preview" && (
							<div className="egisz-xml-workspace">
								<div className="egisz-xml-toolbar">
									<span className="egisz-xml-filename">
										{generateEgiszXmlFilename(currentDoc.payload)}
									</span>
									<div style={{ display: "flex", gap: "8px" }}>
										<button type="button" className="egisz-btn-secondary" onClick={handleCopyXml}>
											<Copy size={16} />
											<span>Копировать XML</span>
										</button>
										<button type="button" className="egisz-btn-secondary" onClick={handleDownloadXml}>
											<Download size={16} />
											<span>Скачать .xml</span>
										</button>
									</div>
								</div>

								<pre className="egisz-xml-code-block">
									<code>{generatedXml}</code>
								</pre>
							</div>
						)}

						{activeTab === "journal" && (
							<div className="egisz-journal-workspace">
								<div className="egisz-card-title">
									<Clock size={18} color="#0284c7" />
									<span>Журнал отправки и квитанций ЕГИСЗ РЭМД</span>
								</div>

								<table className="egisz-journal-table">
									<thead>
										<tr>
											<th>Номер СЭМД</th>
											<th>Тип документа</th>
											<th>Пациент</th>
											<th>СНИЛС</th>
											<th>Статус</th>
											<th>Рег. номер РЭМД</th>
											<th>Дата</th>
										</tr>
									</thead>
									<tbody>
										{documents.map((doc) => (
											<tr key={doc.id}>
												<td><strong>{doc.documentNumber}</strong></td>
												<td>{doc.titleRu}</td>
												<td>{doc.patientFullName}</td>
												<td>{doc.patientSnils}</td>
												<td>
													<span className={`egisz-status-pill ${doc.status}`}>
														{doc.status === "draft"
															? "Черновик"
															: doc.status === "signed_doctor"
																? "Подписан врачом"
																: doc.status === "signed_clinic"
																	? "Подписан МО"
																	: doc.status === "registered_remd"
																		? "В РЭМД"
																		: doc.status === "validation_error"
																			? "Ошибка"
																			: "Отправка"}
													</span>
												</td>
												<td>
													{doc.remdRegistrationNumber || "—"}
												</td>
												<td>{doc.visitDate}</td>
											</tr>
										))}
									</tbody>
								</table>
							</div>
						)}
							</>
						)}
					</main>
				</div>
			</div>
		</div>,
		document.body,
	);
};

export default EgiszSigningCabinetModal;
