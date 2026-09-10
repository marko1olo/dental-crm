/**
 * ═══════════════════════════════════════════════════════════════════════════
 * EGISZ REMD UKEP SIGNING STUDIO MODAL — DENTE DENTAL CRM
 * Russian Ministry of Health (ЕГИСЗ РЭМД / Форма 043/у) & 63-FZ / Order 947n
 * CryptoPro CSP Browser Plug-in Integration with Interactive SEMD Blue Stamp
 * ═══════════════════════════════════════════════════════════════════════════
 */

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import {
	AlertCircle,
	AlertTriangle,
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
	KeyRound,
	Printer,
	RefreshCw,
	Send,
	Shield,
	ShieldAlert,
	ShieldCheck,
	Sparkles,
	User,
	UserCheck,
	X,
} from "lucide-react";
import { showToast } from "../GlobalToast";
import { denteAdminSecretRequestHeaders } from "../../lib/denteRequestHeaders";
import {
	type CertificateInfo,
	signatureService,
} from "../../lib/cryptopro";
import {
	type CryptoProCertificate,
	checkCryptoProPlugin,
	getPersonalCertificates,
	signBase64WithCertificate,
} from "../../utils/cryptoPro";
import {
	ALL_FDI_TEETH,
	DEFAULT_EGISZ_CLINIC_PRESET,
	DEFAULT_EGISZ_DOCTOR_PRESET,
	DENTAL_TOOTH_STATUS_DICTIONARY,
	EGISZ_DENTAL_SEMD_TYPES,
	type EgiszDentalCdaPayload,
	type EgiszDentalSemdCode,
	type GostSignatureInfo,
	SAMPLE_DENTAL_SEMD_105_PRESET,
	canonicalizeCdaXml,
	escapeXml,
	formatHl7DateTime,
	formatRuDate,
	generateEgiszDentalCdaXml,
	generateEgiszXmlFilename,
	generateForm043uPrintHtml,
	generateGostSignatureStampHtml,
	generateGostXmlSignatureBlock,
	runEgisz043uPreflight,
} from "./egiszRemdEngine";
import "./egiszRemd.css";

export interface EgiszRemdSigningModalProps {
	isOpen: boolean;
	onClose: () => void;
	payload?: EgiszDentalCdaPayload | undefined;
	documentId?: string | undefined;
	patientId?: string | undefined;
	visitId?: string | undefined;
	onSigned?: (
		updatedPayload: EgiszDentalCdaPayload,
		signatures: {
			doctorSignature?: GostSignatureInfo | undefined;
			moSignature?: GostSignatureInfo | undefined;
		},
	) => void;
	onSentToRemd?: (result: {
		success: boolean;
		remdDocId?: string | undefined;
		regNumber?: string | undefined;
		error?: string | undefined;
	}) => void;
}

export const EgiszRemdSigningModal: React.FC<EgiszRemdSigningModalProps> = ({
	isOpen,
	onClose,
	payload = SAMPLE_DENTAL_SEMD_105_PRESET,
	documentId,
	patientId,
	visitId,
	onSigned,
	onSentToRemd,
}) => {
	// Active document payload with attached signatures
	const [activePayload, setActivePayload] = useState<EgiszDentalCdaPayload>(payload);
	const [doctorSig, setDoctorSig] = useState<GostSignatureInfo | undefined>(payload.doctorSignature);
	const [moSig, setMoSig] = useState<GostSignatureInfo | undefined>(undefined);

	// CryptoPro Plugin Detection & Certificates
	const [isPluginChecking, setIsPluginChecking] = useState<boolean>(true);
	const [isPluginAvailable, setIsPluginAvailable] = useState<boolean>(false);
	const [certificates, setCertificates] = useState<CryptoProCertificate[]>([]);
	const [selectedCertThumbprint, setSelectedCertThumbprint] = useState<string>("");

	// UI Tabs: 'document' (Interactive Medical Sheet) | 'xml' (Raw CDA XML) | 'preflight' (Checks)
	const [activeTab, setActiveTab] = useState<"document" | "xml" | "preflight">("document");

	// Processing states
	const [isSigningDoctor, setIsSigningDoctor] = useState<boolean>(false);
	const [isSigningMo, setIsSigningMo] = useState<boolean>(false);
	const [isSendingRemd, setIsSendingRemd] = useState<boolean>(false);
	const [remdRegistration, setRemdRegistration] = useState<{
		regNumber: string;
		remdDocId: string;
		registeredAt: string;
	} | null>(null);

	// Sync payload updates when prop changes
	useEffect(() => {
		if (payload) {
			setActivePayload(payload);
			setDoctorSig(payload.doctorSignature);
		}
	}, [payload]);

	// Auto-detect CryptoPro CSP plugin and load personal certificates
	const loadCryptoProState = useCallback(async () => {
		setIsPluginChecking(true);
		try {
			const hasPlugin = await checkCryptoProPlugin();
			setIsPluginAvailable(hasPlugin);

			if (hasPlugin) {
				const certs = await getPersonalCertificates();
				setCertificates(certs);
				if (certs.length > 0 && !selectedCertThumbprint) {
					setSelectedCertThumbprint(certs[0]?.thumbprint || "");
				}
			} else {
				setCertificates([]);
				setSelectedCertThumbprint("");
			}
		} catch (error) {
			console.warn("[CryptoPro] Plugin detection error:", error);
			setIsPluginAvailable(false);
			setCertificates([]);
			setSelectedCertThumbprint("");
		} finally {
			setIsPluginChecking(false);
		}
	}, [selectedCertThumbprint]);

	// Detached signature (.sig / .p7s) file upload handler
	const handleUploadDetachedSig = (
		e: React.ChangeEvent<HTMLInputElement>,
		target: "doctor" | "mo",
	) => {
		const file = e.target.files?.[0];
		if (!file) return;
		const reader = new FileReader();
		reader.onload = () => {
			const buf = reader.result as ArrayBuffer;
			const bytes = new Uint8Array(buf);
			let binary = "";
			for (let i = 0; i < bytes.byteLength; i++) {
				binary += String.fromCharCode(bytes[i]!);
			}
			const base64 = btoa(binary);
			const sigInfo: GostSignatureInfo = {
				signatureBase64: base64,
				certificateSerialNumber: `DETACHED-${file.name.slice(0, 16)}`,
				certificateSubject:
					target === "doctor"
						? (activePayload.doctor.doctorFullName || "Врач")
						: (activePayload.clinic.clinicName || "Медицинская организация"),
				certificateIssuer: "Открепленная подпись (.sig / .p7s)",
				signedAt: new Date().toISOString(),
				algorithmOid: "1.2.643.7.1.1.1.1",
				digestAlgorithmOid: "1.2.643.7.1.1.2.2",
				signatureValueHex: file.name,
			};

			if (target === "doctor") {
				setDoctorSig(sigInfo);
				const updated = { ...activePayload, doctorSignature: sigInfo };
				setActivePayload(updated);
				showToast(`Открепленная УКЭП врача загружена: ${file.name}`, "success");
				onSigned?.(updated, { doctorSignature: sigInfo, moSignature: moSig });
			} else {
				setMoSig(sigInfo);
				showToast(`Открепленная УКЭП организации загружена: ${file.name}`, "success");
				onSigned?.(activePayload, { doctorSignature: doctorSig, moSignature: sigInfo });
			}
		};
		reader.readAsArrayBuffer(file);
	};

	useEffect(() => {
		if (isOpen) {
			loadCryptoProState();
		}
	}, [isOpen, loadCryptoProState]);

	// Keyboard shortcut for closing (Escape)
	useEffect(() => {
		const handleKeyDown = (e: KeyboardEvent) => {
			if (e.key === "Escape" && isOpen) {
				onClose();
			}
		};
		window.addEventListener("keydown", handleKeyDown);
		return () => window.removeEventListener("keydown", handleKeyDown);
	}, [isOpen, onClose]);

	// Preflight validation report
	const preflightReport = useMemo(() => {
		return runEgisz043uPreflight({
			...activePayload,
			doctorSignature: doctorSig,
		});
	}, [activePayload, doctorSig]);

	// Generated CDA R2 XML
	const generatedXml = useMemo(() => {
		const baseXml = generateEgiszDentalCdaXml({
			...activePayload,
			doctorSignature: doctorSig,
		});
		return baseXml;
	}, [activePayload, doctorSig]);

	// Selected certificate object
	const selectedCert = useMemo(() => {
		return certificates.find((c) => c.thumbprint === selectedCertThumbprint) || certificates[0];
	}, [certificates, selectedCertThumbprint]);

	// 1-Click Action: Sign with Doctor Qualified Electronic Signature (УКЭП врача)
	const handleSignDoctor = async () => {
		if (!isPluginAvailable || !selectedCert) {
			showToast(
				"Плагин КриптоПро CSP не установлен / Сертификат не выбран. Установите плагин или загрузите файл .sig / .p7s",
				"error",
			);
			return;
		}
		setIsSigningDoctor(true);
		try {
			const xmlToSign = canonicalizeCdaXml(generatedXml);
			const base64Content = btoa(unescape(encodeURIComponent(xmlToSign)));
			const pkcs7Base64 = await signBase64WithCertificate(
				base64Content,
				selectedCert.thumbprint,
			);

			const sigInfo: GostSignatureInfo = {
				signatureBase64: pkcs7Base64,
				certificateSerialNumber: selectedCert.thumbprint.slice(0, 16).toUpperCase(),
				certificateSubject: selectedCert.subjectName,
				certificateIssuer: selectedCert.issuerName,
				validFrom: selectedCert.validFrom,
				validTo: selectedCert.validTo,
				signedAt: new Date().toISOString(),
				algorithmOid: "1.2.643.7.1.1.1.1", // GOST R 34.10-2012 (256-bit)
				digestAlgorithmOid: "1.2.643.7.1.1.2.2", // GOST R 34.11-2012 (256-bit)
				signatureValueHex: selectedCert.thumbprint.toUpperCase(),
			};

			setDoctorSig(sigInfo);
			const updated = { ...activePayload, doctorSignature: sigInfo };
			setActivePayload(updated);

			showToast(
				`Документ СЭМД успешно подписан УКЭП врача (${sigInfo.certificateSerialNumber})`,
				"success",
			);

			onSigned?.(updated, { doctorSignature: sigInfo, moSignature: moSig });
		} catch (err: unknown) {
			const msg = err instanceof Error ? err.message : String(err);
			showToast(`Ошибка подписания УКЭП врача: ${msg}`, "error");
		} finally {
			setIsSigningDoctor(false);
		}
	};

	// 1-Click Action: Sign with Organization Qualified Electronic Signature (УКЭП МО / Главный врач)
	const handleSignMo = async () => {
		if (!isPluginAvailable || !selectedCert) {
			showToast(
				"Плагин КриптоПро CSP не установлен / Сертификат не выбран. Установите плагин или загрузите файл .sig / .p7s",
				"error",
			);
			return;
		}
		setIsSigningMo(true);
		try {
			const xmlToSign = canonicalizeCdaXml(generatedXml);
			const base64Content = btoa(unescape(encodeURIComponent(xmlToSign)));
			const pkcs7Base64 = await signBase64WithCertificate(
				base64Content,
				selectedCert.thumbprint,
			);

			const sigInfo: GostSignatureInfo = {
				signatureBase64: pkcs7Base64,
				certificateSerialNumber: selectedCert.thumbprint.slice(0, 16).toUpperCase(),
				certificateSubject: selectedCert.subjectName,
				certificateIssuer: selectedCert.issuerName,
				validFrom: selectedCert.validFrom,
				validTo: selectedCert.validTo,
				signedAt: new Date().toISOString(),
				algorithmOid: "1.2.643.7.1.1.1.1",
				digestAlgorithmOid: "1.2.643.7.1.1.2.2",
				signatureValueHex: selectedCert.thumbprint.toUpperCase(),
			};

			setMoSig(sigInfo);
			showToast(
				`УКЭП медицинской организации наложена (${sigInfo.certificateSerialNumber})`,
				"success",
			);

			onSigned?.(activePayload, { doctorSignature: doctorSig, moSignature: sigInfo });
		} catch (err: unknown) {
			const msg = err instanceof Error ? err.message : String(err);
			showToast(`Ошибка подписания УКЭП организации: ${msg}`, "error");
		} finally {
			setIsSigningMo(false);
		}
	};

	// 1-Click Action: Send signed package to EGISZ REMD Gateway
	const handleSendToRemd = async () => {
		if (!doctorSig) {
			showToast("Для отправки в РЭМД требуется наложение УКЭП врача!", "error");
			return;
		}

		if (!preflightReport.isValid) {
			showToast(
				`Документ не прошел валидацию ЕГИСЗ (${preflightReport.failedCount} ошибок). Проверьте раздел проверок.`,
				"error",
			);
			setActiveTab("preflight");
			return;
		}

		setIsSendingRemd(true);
		try {
			const cleanPatientSnils = (activePayload.patient.patientSnils || "").replace(/\D/g, "");
			const effectiveVisitId = visitId || documentId || activePayload.documentUuid?.replace(/^urn:uuid:/, "") || "";
			const effectivePatientId = patientId || activePayload.patient.patientSnils || "patient";
			const docType = String(activePayload.docTypeCode || "108");

			const packageBody = {
				cdaXml: generatedXml,
				doctorSignature: {
					signatureBase64: doctorSig.signatureBase64,
					certificateSerialNumber: doctorSig.certificateSerialNumber,
					certificateSubject: doctorSig.certificateSubject,
					signedAt: doctorSig.signedAt || new Date().toISOString(),
					algorithmOid: doctorSig.algorithmOid || "1.2.643.7.1.1.1.1",
				},
				...(moSig
					? {
							clinicSignature: {
								signatureBase64: moSig.signatureBase64,
								certificateSerialNumber: moSig.certificateSerialNumber,
								certificateSubject: moSig.certificateSubject,
								signedAt: moSig.signedAt || new Date().toISOString(),
								algorithmOid: moSig.algorithmOid || "1.2.643.7.1.1.1.1",
							},
							moSignature: {
								signatureBase64: moSig.signatureBase64,
								certificateSerialNumber: moSig.certificateSerialNumber,
								certificateSubject: moSig.certificateSubject,
								signedAt: moSig.signedAt || new Date().toISOString(),
								algorithmOid: moSig.algorithmOid || "1.2.643.7.1.1.1.1",
							},
						}
					: {}),
				docType,
				patientId: effectivePatientId,
				visitId: effectiveVisitId,
				documentId: effectiveVisitId,
				documentVersion: activePayload.documentVersion || 1,
				xmlCanonicalPayload: generatedXml,
				metadata: {
					patientSnils: cleanPatientSnils,
					clinicOid: activePayload.clinic.clinicOid || "1.2.643.5.1.13.13.12.2.77.8432",
					...(activePayload.clinic.clinicOgrn ? { clinicOgrn: activePayload.clinic.clinicOgrn } : {}),
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

			const regNumber = data.regNumber || data.transactionId || data.outboxId || data.logId || "РЕГ-РЭМД-ПРИНЯТО";
			const remdDocId = data.transactionId || data.outboxId || data.logId || `DOC-${effectiveVisitId}`;
			const regInfo = {
				regNumber,
				remdDocId,
				registeredAt: new Date().toISOString(),
			};

			setRemdRegistration(regInfo);
			showToast(
				`СЭМД успешно передан в РЭМД ЕГИСЗ! Номер: ${regNumber}`,
				"success",
			);

			onSentToRemd?.({
				success: true,
				regNumber,
				remdDocId,
			});
		} catch (err: unknown) {
			const msg = err instanceof Error ? err.message : String(err);
			showToast(`Ошибка отправки в РЭМД: ${msg}`, "error");
			onSentToRemd?.({
				success: false,
				error: msg,
			});
		} finally {
			setIsSendingRemd(false);
		}
	};

	// 1-Click Action: Download XML File
	const handleDownloadXml = () => {
		const filename = generateEgiszXmlFilename(activePayload);
		const blob = new Blob([generatedXml], { type: "application/xml;charset=utf-8" });
		const url = URL.createObjectURL(blob);
		const a = document.createElement("a");
		a.href = url;
		a.download = filename;
		document.body.appendChild(a);
		a.click();
		document.body.removeChild(a);
		URL.revokeObjectURL(url);
		showToast(`Файл ${filename} сохранен`, "info");
	};

	// 1-Click Action: Download Detached .p7s Signature File
	const handleDownloadSignature = () => {
		if (!doctorSig?.signatureBase64) {
			showToast("Электронная подпись врача еще не сформирована", "error");
			return;
		}
		const filename = `${generateEgiszXmlFilename(activePayload)}.p7s`;
		const blob = new Blob([doctorSig.signatureBase64], { type: "application/pkcs7-signature" });
		const url = URL.createObjectURL(blob);
		const a = document.createElement("a");
		a.href = url;
		a.download = filename;
		document.body.appendChild(a);
		a.click();
		document.body.removeChild(a);
		URL.revokeObjectURL(url);
		showToast(`Открепленная подпись ${filename} сохранена`, "info");
	};

	// 1-Click Action: Copy XML to Clipboard
	const handleCopyXml = async () => {
		try {
			await navigator.clipboard.writeText(generatedXml);
			showToast("XML документ скопирован в буфер обмена", "success");
		} catch {
			showToast("Не удалось скопировать XML", "error");
		}
	};

	// 1-Click Action: Print Document with Electronic Signature Stamp
	const handlePrint = () => {
		const printHtml = generateForm043uPrintHtml({
			...activePayload,
			doctorSignature: doctorSig,
		});
		const printWindow = window.open("", "_blank", "width=850,height=900");
		if (printWindow) {
			printWindow.document.open();
			printWindow.document.write(printHtml);
			printWindow.document.close();
			printWindow.focus();
			setTimeout(() => {
				printWindow.print();
			}, 300);
		}
	};

	if (!isOpen) return null;

	const docDef = EGISZ_DENTAL_SEMD_TYPES[activePayload.docTypeCode as EgiszDentalSemdCode] || {
		title: "Протокол консультации стоматолога (ф. 043/у)",
		shortTitle: "СЭМД 105",
		nsiCode: "105",
	};

	const modalContent = (
		<div
			className="egisz-signing-backdrop"
			onClick={(e) => {
				if (e.target === e.currentTarget) onClose();
			}}
			role="dialog"
			aria-modal="true"
			aria-labelledby="egisz-signing-title"
		>
			<div className="egisz-signing-modal">
				{/* Modal Header */}
				<header className="egisz-modal-header">
					<div className="egisz-header-left">
						<div className="egisz-header-icon-badge teal">
							<ShieldCheck size={24} />
						</div>
						<div className="egisz-header-title-group">
							<h2 id="egisz-signing-title" className="egisz-modal-title">
								Подписание СЭМД УКЭП (Приказ Минздрава № 947н / 63-ФЗ)
							</h2>
							<div className="egisz-modal-subtitle">
								{docDef.title} • Пациент: {activePayload.patient.patientFullName} (карта № {activePayload.patient.cardNumber || "б/н"})
							</div>
						</div>
					</div>

					<button
						type="button"
						className="egisz-close-icon-btn"
						onClick={onClose}
						aria-label="Закрыть модальное окно"
					>
						<X size={20} />
					</button>
				</header>

				{/* CryptoPro CSP Plug-in Status Bar */}
				<div
					className={`egisz-plugin-status-bar ${isPluginAvailable && certificates.length > 0 ? "connected" : "warning"}`}
				>
					<div className="egisz-plugin-status-left">
						<span
							className={`egisz-status-dot ${isPluginAvailable && certificates.length > 0 ? "green" : "amber"}`}
						/>
						{isPluginChecking ? (
							<span>Определение КриптоПро ЭЦП Browser Plug-in...</span>
						) : isPluginAvailable && certificates.length > 0 ? (
							<span>
								КриптоПро CSP Plug-in подключен • Обнаружено сертификатов: {certificates.length}
							</span>
						) : (
							<span>
								Плагин КриптоПро CSP не установлен / Сертификат не выбран
							</span>
						)}
					</div>

					<div className="egisz-plugin-status-right">
						<button
							type="button"
							className="egisz-btn sm"
							onClick={loadCryptoProState}
							disabled={isPluginChecking}
							title="Проверить плагин КриптоПро"
						>
							<RefreshCw size={13} className={isPluginChecking ? "animate-spin" : ""} />
							Проверить плагин
						</button>
					</div>
				</div>

				{/* Two-Pane Body Layout */}
				<div className="egisz-signing-body">
					{/* Left Sidebar: Certificate Selector & Preflight Status */}
					<aside className="egisz-signing-sidebar">
						<div>
							<div className="egisz-section-label">
								<span>Сертификаты ЭЦП (ГОСТ)</span>
								<KeyRound size={14} />
							</div>

							<div className="egisz-cert-list">
								{certificates.length === 0 ? (
									<div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded text-xs text-amber-600 dark:text-amber-400 space-y-2">
										<div className="font-semibold flex items-center gap-1.5">
											<AlertTriangle size={14} />
											Плагин КриптоПро CSP не установлен / Сертификат не выбран
										</div>
										<p className="text-[11px] leading-relaxed text-muted">
											Для наложения УКЭП установите плагин КриптоПро ЭЦП Browser Plug-in и вставьте токен (Рутокен/JaCarta), либо загрузите готовую открепленную подпись (.sig / .p7s).
										</p>
										<div className="flex flex-col gap-1.5 pt-1">
											<button
												type="button"
												className="egisz-btn sm w-full justify-center"
												onClick={loadCryptoProState}
												disabled={isPluginChecking}
											>
												<RefreshCw size={12} className={isPluginChecking ? "animate-spin" : ""} />
												Проверить плагин КриптоПро
											</button>
											<label className="egisz-btn sm w-full justify-center cursor-pointer">
												<FileCode2 size={12} />
												Загрузить .sig / .p7s (Врач)
												<input
													type="file"
													accept=".sig,.p7s,.sgn,.bin"
													className="hidden"
													onChange={(e) => handleUploadDetachedSig(e, "doctor")}
												/>
											</label>
											<label className="egisz-btn sm w-full justify-center cursor-pointer">
												<Building2 size={12} />
												Загрузить .sig / .p7s (МО)
												<input
													type="file"
													accept=".sig,.p7s,.sgn,.bin"
													className="hidden"
													onChange={(e) => handleUploadDetachedSig(e, "mo")}
												/>
											</label>
										</div>
									</div>
								) : (
									certificates.map((cert) => {
									const isSelected = cert.thumbprint === selectedCertThumbprint;
									const isDoctor = cert.subjectName.toLowerCase().includes("врач") ||
										cert.name.includes("Иванов") ||
										cert.name.includes("Смирнова") ||
										!cert.subjectName.includes("OGRN");

									return (
										<button
											type="button"
											key={cert.thumbprint}
											className={`egisz-cert-card ${isSelected ? "selected" : ""}`}
											onClick={() => setSelectedCertThumbprint(cert.thumbprint)}
										>
											<div className="egisz-cert-head">
												<span className="egisz-cert-owner">
													{cert.name || cert.subjectName}
												</span>
												<span
													className={`egisz-cert-badge ${cert.isValid ? "active" : "expired"}`}
												>
													{cert.isValid ? "Действителен" : "Истек"}
												</span>
											</div>

											<div className="egisz-cert-snils">
												<strong>Роль:</strong> {isDoctor ? "УКЭП врача" : "УКЭП организации"}
											</div>

											<div className="egisz-cert-issuer">
												<strong>УЦ:</strong> {cert.issuerName.slice(0, 48)}...
											</div>

											<div className="egisz-cert-validity">
												с {formatRuDate(cert.validFrom)} по {formatRuDate(cert.validTo)}
											</div>

											<div className="egisz-cert-thumbprint">
												Отпечаток: {cert.thumbprint.slice(0, 18)}...
											</div>
										</button>
									);
								})
								)}
							</div>
						</div>

						{/* Preflight Quick Status Card */}
						<div className="egisz-stat-tile">
							<div className="egisz-stat-label">Готовность к РЭМД ЕГИСЗ</div>
							<div
								className={`egisz-stat-val ${preflightReport.isValid ? "green" : "red"}`}
							>
								{preflightReport.scorePercent}%
							</div>
							<div style={{ fontSize: "11px", color: "var(--muted, #64748b)" }}>
								{preflightReport.passedCount} из {preflightReport.totalChecks} проверок пройдено
								{preflightReport.failedCount > 0 && ` (${preflightReport.failedCount} блокирующих ошибок)`}
							</div>
						</div>

						{/* Signatures Status Card */}
						<div className="egisz-stat-tile">
							<div className="egisz-stat-label">Статус подписей документа</div>
							<div style={{ display: "flex", flexDirection: "column", gap: "6px", marginTop: "4px" }}>
								<div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "12px" }}>
									{doctorSig ? (
										<CheckCircle2 size={15} color="#10b981" />
									) : (
										<Clock size={15} color="#f59e0b" />
									)}
									<span>УКЭП врача: {doctorSig ? "Наложена" : "Ожидает"}</span>
								</div>

								<div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "12px" }}>
									{moSig ? (
										<CheckCircle2 size={15} color="#10b981" />
									) : (
										<Clock size={15} color="#94a3b8" />
									)}
									<span>УКЭП МО: {moSig ? "Наложена" : "Не наложена"}</span>
								</div>

								{remdRegistration && (
									<div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "12px", color: "#059669", fontWeight: "bold" }}>
										<Sparkles size={15} />
										<span>РЭМД: {remdRegistration.regNumber}</span>
									</div>
								)}
							</div>
						</div>
					</aside>

					{/* Right Main Pane: Interactive Document Preview with Blue Stamp */}
					<main className="egisz-signing-main">
						{/* View Switcher Tabs */}
						<div className="egisz-doc-view-tabs">
							<button
								type="button"
								className={`egisz-doc-tab-btn ${activeTab === "document" ? "active" : ""}`}
								onClick={() => setActiveTab("document")}
							>
								<FileText size={15} />
								Печатный бланк СЭМД ф. 043/у
							</button>

							<button
								type="button"
								className={`egisz-doc-tab-btn ${activeTab === "xml" ? "active" : ""}`}
								onClick={() => setActiveTab("xml")}
							>
								<Code2 size={15} />
								HL7 CDA R2 XML
							</button>

							<button
								type="button"
								className={`egisz-doc-tab-btn ${activeTab === "preflight" ? "active" : ""}`}
								onClick={() => setActiveTab("preflight")}
							>
								<FileCheck size={15} />
								Проверки Минздрава ({preflightReport.passedCount}/{preflightReport.totalChecks})
							</button>
						</div>

						{/* TAB 1: Medical Paper Sheet with Blue Stamp */}
						{activeTab === "document" && (
							<div className="egisz-paper-sheet">
								<div className="egisz-paper-header">
									<div className="egisz-paper-mo-title">
										{activePayload.clinic.clinicName}
									</div>
									<div className="egisz-paper-mo-sub">
										ОГРН: {activePayload.clinic.clinicOgrn} | ИНН: {activePayload.clinic.clinicInn} | OID ФРМО: {activePayload.clinic.clinicOid}
									</div>
									<div className="egisz-paper-doc-title">
										МЕДИЦИНСКАЯ КАРТА СТОМАТОЛОГИЧЕСКОГО ПАЦИЕНТА (ФОРМА № 043/У)
									</div>
									<div className="egisz-paper-semd-code">
										Вид СЭМД ЕГИСЗ РЭМД: {docDef.title} (Код {docDef.nsiCode})
									</div>
								</div>

								{/* Patient Summary */}
								<div>
									<div>
										<strong>Пациент:</strong> {activePayload.patient.patientFullName} &nbsp;&nbsp;|&nbsp;&nbsp;
										<strong>Дата рождения:</strong> {formatRuDate(activePayload.patient.patientBirthDate)} &nbsp;&nbsp;|&nbsp;&nbsp;
										<strong>СНИЛС:</strong> {activePayload.patient.patientSnils || "—"}
									</div>
									<div>
										<strong>Номер карты:</strong> {activePayload.patient.cardNumber || "б/н"} &nbsp;&nbsp;|&nbsp;&nbsp;
										<strong>Дата приема:</strong> {formatRuDate(activePayload.encounterDate)} &nbsp;&nbsp;|&nbsp;&nbsp;
										<strong>Полис ОМС:</strong> {activePayload.patient.patientPolisOms || "—"}
									</div>
								</div>

								{/* Clinical Sections */}
								<div>
									<div className="egisz-paper-section-title">1. ЖАЛОБЫ И АНАМНЕЗ</div>
									<div><strong>Жалобы:</strong> {activePayload.complaints || "Не предъявляет"}</div>
									<div><strong>Анамнез заболевания:</strong> {activePayload.anamnesisMorbi || "Без особенностей"}</div>
								</div>

								<div>
									<div className="egisz-paper-section-title">2. КЛИНИЧЕСКИЙ ДИАГНОЗ (МКБ-10)</div>
									<ul style={{ margin: "4px 0", paddingLeft: "20px" }}>
										{activePayload.diagnoses.map((d, i) => (
											<li key={`${d.icd10Code}-${i}`}>
												<strong>{d.isPrimary ? "[Основной] " : "[Сопутствующий] "}</strong>
												{d.icd10Code} — {d.icd10Name}
												{d.tooth && ` (зуб ${d.tooth})`}
											</li>
										))}
									</ul>
								</div>

								<div>
									<div className="egisz-paper-section-title">3. ОКАЗАННЫЕ МЕДИЦИНСКИЕ УСЛУГИ (НОМЕНКЛАТУРА 804Н)</div>
									<ul style={{ margin: "4px 0", paddingLeft: "20px" }}>
										{activePayload.procedures.map((p, i) => (
											<li key={`${p.code}-${i}`}>
												<code>{p.code}</code> — {p.name}
												{p.tooth && ` (зуб ${p.tooth})`}
											</li>
										))}
									</ul>
								</div>

								<div>
									<div className="egisz-paper-section-title">4. ПРОТОКОЛ ЛЕЧЕНИЯ И РЕКОМЕНДАЦИИ</div>
									<div>{activePayload.treatmentProtocolDescription || "Лечение проведено по протоколу."}</div>
									<div style={{ marginTop: "4px" }}>
										<strong>Назначения:</strong> {activePayload.recommendations || "Индивидуальная гигиена полости рта."}
									</div>
								</div>

								{/* OFFICIAL BLUE ELECTRONIC SIGNATURE STAMP SECTION (Order 947n) */}
								<div className="gost-stamps-wrapper">
									{/* Doctor UKEP Stamp */}
									{doctorSig ? (
										<div className="gost-stamp-blue">
											<div className="gost-stamp-header">
												<ShieldCheck size={13} />
												ДОКУМЕНТ ПОДПИСАН ЭЛЕКТРОННОЙ ПОДПИСЬЮ
											</div>
											<div className="gost-stamp-row">
												<span className="gost-stamp-lbl">Сертификат:</span>
												<span className="gost-stamp-val gost-stamp-mono">
													{doctorSig.certificateSerialNumber}
												</span>
											</div>
											<div className="gost-stamp-row">
												<span className="gost-stamp-lbl">Владелец:</span>
												<span className="gost-stamp-val">
													{activePayload.doctor.doctorFullName} (СНИЛС: {activePayload.doctor.doctorSnils})
												</span>
											</div>
											<div className="gost-stamp-row">
												<span className="gost-stamp-lbl">Организация:</span>
												<span className="gost-stamp-val">
													{activePayload.clinic.clinicName}
												</span>
											</div>
											<div className="gost-stamp-row">
												<span className="gost-stamp-lbl">Действителен:</span>
												<span className="gost-stamp-val">
													с {formatRuDate(doctorSig.validFrom)} по {formatRuDate(doctorSig.validTo)}
												</span>
											</div>
											<div className="gost-stamp-row">
												<span className="gost-stamp-lbl">Подписан:</span>
												<span className="gost-stamp-val">
													{new Date(doctorSig.signedAt).toLocaleString("ru-RU")} (ГОСТ Р 34.10-2012)
												</span>
											</div>
										</div>
									) : (
										<div className="gost-stamp-pending-box">
											<UserCheck size={24} color="#94a3b8" />
											<div><strong>Ожидает наложения УКЭП врача</strong></div>
											<div style={{ fontSize: "11px" }}>
												Нажмите кнопку «Подписать УКЭП врача» ниже
											</div>
										</div>
									)}

									{/* Organization UKEP Stamp */}
									{moSig ? (
										<div className="gost-stamp-blue">
											<div className="gost-stamp-header">
												<Building2 size={13} />
												ПОДПИСЬ МЕДИЦИНСКОЙ ОРГАНИЗАЦИИ
											</div>
											<div className="gost-stamp-row">
												<span className="gost-stamp-lbl">Сертификат:</span>
												<span className="gost-stamp-val gost-stamp-mono">
													{moSig.certificateSerialNumber}
												</span>
											</div>
											<div className="gost-stamp-row">
												<span className="gost-stamp-lbl">Владелец:</span>
												<span className="gost-stamp-val">
													{activePayload.clinic.clinicName} (ОГРН: {activePayload.clinic.clinicOgrn})
												</span>
											</div>
											<div className="gost-stamp-row">
												<span className="gost-stamp-lbl">Действителен:</span>
												<span className="gost-stamp-val">
													с {formatRuDate(moSig.validFrom)} по {formatRuDate(moSig.validTo)}
												</span>
											</div>
											<div className="gost-stamp-row">
												<span className="gost-stamp-lbl">Подписан:</span>
												<span className="gost-stamp-val">
													{new Date(moSig.signedAt).toLocaleString("ru-RU")} (ГОСТ Р 34.10-2012)
												</span>
											</div>
										</div>
									) : (
										<div className="gost-stamp-pending-box">
											<Building2 size={24} color="#94a3b8" />
											<div><strong>УКЭП организации (опционально)</strong></div>
											<div style={{ fontSize: "11px" }}>
												Подпись главного врача / клиники
											</div>
										</div>
									)}
								</div>
							</div>
						)}

						{/* TAB 2: Raw CDA XML View */}
						{activeTab === "xml" && (
							<div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
								<div style={{ display: "flex", justifyContent: "flex-end", gap: "6px" }}>
									<button
										type="button"
										className="egisz-btn sm"
										onClick={handleCopyXml}
									>
										<Copy size={13} />
										Копировать XML
									</button>
								</div>
								<div className="egisz-code-box">{generatedXml}</div>
							</div>
						)}

						{/* TAB 3: Preflight Checks */}
						{activeTab === "preflight" && (
							<div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
								{preflightReport.checks.map((chk) => (
									<div
										key={chk.id}
										className="egisz-check-card"
										style={{
											borderLeft: `4px solid ${
												chk.status === "passed"
													? "#10b981"
													: chk.status === "failed"
													? "#ef4444"
													: "#f59e0b"
											}`,
										}}
									>
										<div className="egisz-check-head">
											<span className="egisz-check-title">{chk.title}</span>
											<span
												className={`egisz-check-badge ${
													chk.status === "passed"
														? "passed"
														: chk.status === "failed"
														? "failed"
														: "warning"
												}`}
											>
												{chk.status === "passed"
													? "Пройдено"
													: chk.status === "failed"
													? "Ошибка"
													: "Предупреждение"}
											</span>
										</div>
										<div className="egisz-check-desc">{chk.details}</div>
										{chk.oid && <div className="egisz-check-oid">OID: {chk.oid}</div>}
									</div>
								))}
							</div>
						)}
					</main>
				</div>

				{/* Modal Footer with 1-Click Action Buttons */}
				<footer className="egisz-modal-footer">
					<div className="egisz-btn-group">
						<button
							type="button"
							className="egisz-btn"
							onClick={handlePrint}
							title="Распечатать медицинский бланк со штампом ЭП"
						>
							<Printer size={15} />
							Печать со штампом
						</button>

						<button
							type="button"
							className="egisz-btn"
							onClick={handleDownloadXml}
							title="Скачать структурированный XML СЭМД"
						>
							<Download size={15} />
							Скачать XML
						</button>

						{doctorSig && (
							<button
								type="button"
								className="egisz-btn"
								onClick={handleDownloadSignature}
								title="Скачать открепленный файл подписи .p7s"
							>
								<FileCode2 size={15} />
								Скачать .p7s
							</button>
						)}
					</div>

					<div className="egisz-btn-group">
						{/* 1-Click: Sign Doctor UKEP */}
						<button
							type="button"
							className="egisz-btn primary"
							onClick={handleSignDoctor}
							disabled={isSigningDoctor}
						>
							<UserCheck size={16} />
							{isSigningDoctor ? "Подписание..." : "Подписать УКЭП врача"}
						</button>

						{/* 1-Click: Sign Organization UKEP */}
						<button
							type="button"
							className="egisz-btn teal"
							onClick={handleSignMo}
							disabled={isSigningMo}
						>
							<Building2 size={16} />
							{isSigningMo ? "Подписание МО..." : "Подписать УКЭП организации"}
						</button>

						{/* 1-Click: Send to REMD EGISZ */}
						<button
							type="button"
							className="egisz-btn emerald"
							onClick={handleSendToRemd}
							disabled={isSendingRemd || !doctorSig}
							title={
								!doctorSig
									? "Сначала подпишите документ УКЭП врача"
									: "Отправить подписанный пакет в РЭМД ЕГИСЗ"
							}
						>
							<Send size={16} />
							{isSendingRemd ? "Отправка в РЭМД..." : "Отправить в РЭМД ЕГИСЗ"}
						</button>
					</div>
				</footer>
			</div>
		</div>
	);

	return typeof document !== "undefined"
		? createPortal(modalContent, document.body)
		: modalContent;
};
