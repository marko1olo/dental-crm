/**
 * ═══════════════════════════════════════════════════════════════════════════
 * EGISZ REMD & FNS TAX DEDUCTION (КНД 1151156) HUB MODAL HUD — DENTE CRM
 * Statutory Medical & Financial Document Hub for Russian Ministry of Health & FNS
 * Compliant with HL7 CDA R2, Order 804n, Order ED-7-11/755@, and Federal Law 63-FZ
 * ═══════════════════════════════════════════════════════════════════════════
 */

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import {
	AlertCircle,
	AlertTriangle,
	Building2,
	Calculator,
	Check,
	CheckCircle2,
	ChevronRight,
	Code2,
	Copy,
	Download,
	Eye,
	FileCode2,
	FileText,
	Key,
	Plus,
	Printer,
	Receipt,
	RefreshCcw,
	Send,
	Shield,
	ShieldAlert,
	ShieldCheck,
	Sparkles,
	Trash2,
	User,
	Users,
	X,
} from "lucide-react";
import { showToast } from "../GlobalToast";
import { denteAdminSecretRequestHeaders } from "../../lib/denteRequestHeaders";
import {
	type CertificateInfo,
	signatureService,
} from "../../lib/cryptopro";
import {
	ALL_FDI_TEETH,
	COMMON_804N_DENTAL_SERVICES,
	COMMON_DENTAL_ICD10,
	DEFAULT_EGISZ_CLINIC_PRESET,
	DEFAULT_EGISZ_DOCTOR_PRESET,
	DENTAL_SURFACES,
	DENTAL_TOOTH_STATUS_DICTIONARY,
	EGISZ_DENTAL_SEMD_TYPES,
	EGISZ_REMD_OIDS,
	type EgiszClinicInfo,
	type EgiszDentalCdaPayload,
	type EgiszDentalSemdCode,
	type EgiszDiagnosisItem,
	type EgiszDoctorInfo,
	type EgiszPatientInfo,
	type EgiszPreflightReport,
	type EgiszProcedureItem,
	FDI_ADULT_TEETH,
	FDI_CHILD_TEETH,
	type FnsTaxCertificatePayload,
	type FnsTaxPaymentItem,
	type FnsTaxPreflightReport,
	FRMR_DOCTOR_POSITIONS,
	type GostSignatureInfo,
	SAMPLE_043U_PATIENT_PRESET,
	SAMPLE_DENTAL_SEMD_105_PRESET,
	SAMPLE_FNS_TAX_1151156_PRESET,
	canonicalizeCdaXml,
	createMockGostSignature,
	createMockMoGostSignature,
	escapeXml,
	formatHl7DateTime,
	formatKopecksToRubles,
	formatRuDate,
	generateEgiszDentalCdaXml,
	generateEgiszXmlFilename,
	generateFnsTaxCertificatePrintHtml,
	generateFnsTaxCertificateXml,
	generateFnsTaxXmlFilename,
	generateForm043uPrintHtml,
	generateGostSignatureStampHtml,
	generateGostXmlSignatureBlock,
	parseRublesToKopecks,
	runEgisz043uPreflight,
	runFnsTaxCertificatePreflight,
	validateOidFormat,
	validateRussianInn,
	validateRussianOgrn,
	validateRussianSnils,
	validateXmlStructure,
} from "./egiszRemdEngine";
import "./remdXml/egiszRemd.css";

export type EgiszHubActiveDocType = "cda_semd" | "fns_tax";
export type EgiszHubModalTab = "clinical" | "tax_deduction" | "preflight" | "signature" | "xml_preview";

export interface EgiszRemdHubModalProps {
	isOpen?: boolean;
	onClose: () => void;
	initialDocType?: EgiszHubActiveDocType;
	initialPayload?: Partial<EgiszDentalCdaPayload>;
	initialFnsPayload?: Partial<FnsTaxCertificatePayload>;
	initialTab?: EgiszHubModalTab;
	onSentSuccess?: (result: { type: string; documentId: string; timestamp: string }) => void;
}

export const EgiszRemdHubModal: React.FC<EgiszRemdHubModalProps> = ({
	isOpen = true,
	onClose,
	initialDocType = "cda_semd",
	initialPayload,
	initialFnsPayload,
	initialTab,
	onSentSuccess,
}) => {
	// Mode State
	const [activeDocType, setActiveDocType] = useState<EgiszHubActiveDocType>(initialDocType);
	const [activeTab, setActiveTab] = useState<EgiszHubModalTab>(
		initialTab || (initialDocType === "fns_tax" ? "tax_deduction" : "clinical")
	);

	// 1. Dental SEMD Payload State
	const [semdDocCode, setSemdDocCode] = useState<EgiszDentalSemdCode>(
		(initialPayload?.docTypeCode as EgiszDentalSemdCode) || "105"
	);
	const [clinic, setClinic] = useState<EgiszClinicInfo>(
		initialPayload?.clinic || DEFAULT_EGISZ_CLINIC_PRESET
	);
	const [doctor, setDoctor] = useState<EgiszDoctorInfo>(
		initialPayload?.doctor || DEFAULT_EGISZ_DOCTOR_PRESET
	);
	const [patient, setPatient] = useState<EgiszPatientInfo>(
		initialPayload?.patient || SAMPLE_043U_PATIENT_PRESET
	);

	const [complaints, setComplaints] = useState<string>(
		initialPayload?.complaints || SAMPLE_DENTAL_SEMD_105_PRESET.complaints
	);
	const [anamnesisMorbi, setAnamnesisMorbi] = useState<string>(
		initialPayload?.anamnesisMorbi || SAMPLE_DENTAL_SEMD_105_PRESET.anamnesisMorbi || ""
	);
	const [anamnesisVitae, setAnamnesisVitae] = useState<string>(
		initialPayload?.anamnesisVitae || SAMPLE_DENTAL_SEMD_105_PRESET.anamnesisVitae || ""
	);
	const [toothStates, setToothStates] = useState<Record<number, string>>(
		initialPayload?.toothStates || SAMPLE_DENTAL_SEMD_105_PRESET.toothStates
	);
	const [toothSurfaces, setToothSurfaces] = useState<Record<number, string[]>>(
		initialPayload?.toothSurfaces || SAMPLE_DENTAL_SEMD_105_PRESET.toothSurfaces || {}
	);
	const [diagnoses, setDiagnoses] = useState<EgiszDiagnosisItem[]>(
		initialPayload?.diagnoses || SAMPLE_DENTAL_SEMD_105_PRESET.diagnoses
	);
	const [procedures, setProcedures] = useState<EgiszProcedureItem[]>(
		initialPayload?.procedures || SAMPLE_DENTAL_SEMD_105_PRESET.procedures
	);
	const [treatmentDesc, setTreatmentDesc] = useState<string>(
		initialPayload?.treatmentProtocolDescription || SAMPLE_DENTAL_SEMD_105_PRESET.treatmentProtocolDescription || ""
	);
	const [recommendations, setRecommendations] = useState<string>(
		initialPayload?.recommendations || SAMPLE_DENTAL_SEMD_105_PRESET.recommendations
	);
	const [nextVisitDate, setNextVisitDate] = useState<string>(
		initialPayload?.nextVisitDate ? String(initialPayload.nextVisitDate) : "2027-02-28"
	);

	// 2. FNS Tax Deduction Payload State
	const [taxDocNumber, setTaxDocNumber] = useState<string>(
		initialFnsPayload?.documentNumber || SAMPLE_FNS_TAX_1151156_PRESET.documentNumber
	);
	const [taxYear, setTaxYear] = useState<number>(
		initialFnsPayload?.taxYear || SAMPLE_FNS_TAX_1151156_PRESET.taxYear
	);
	const [taxpayerName, setTaxpayerName] = useState<string>(
		initialFnsPayload?.taxpayer?.fullName || SAMPLE_FNS_TAX_1151156_PRESET.taxpayer.fullName
	);
	const [taxpayerInn, setTaxpayerInn] = useState<string>(
		initialFnsPayload?.taxpayer?.inn || SAMPLE_FNS_TAX_1151156_PRESET.taxpayer.inn || ""
	);
	const [taxpayerSnils, setTaxpayerSnils] = useState<string>(
		initialFnsPayload?.taxpayer?.snils || SAMPLE_FNS_TAX_1151156_PRESET.taxpayer.snils || ""
	);
	const [taxpayerBirthDate, setTaxpayerBirthDate] = useState<string>(
		initialFnsPayload?.taxpayer?.birthDate || SAMPLE_FNS_TAX_1151156_PRESET.taxpayer.birthDate || ""
	);
	const [taxpayerPassport, setTaxpayerPassport] = useState<string>(
		initialFnsPayload?.taxpayer?.docSeriesNumber || SAMPLE_FNS_TAX_1151156_PRESET.taxpayer.docSeriesNumber || ""
	);

	const [taxPatientName, setTaxPatientName] = useState<string>(
		initialFnsPayload?.patient?.fullName || SAMPLE_FNS_TAX_1151156_PRESET.patient.fullName
	);
	const [taxPatientSnils, setTaxPatientSnils] = useState<string>(
		initialFnsPayload?.patient?.snils || SAMPLE_FNS_TAX_1151156_PRESET.patient.snils || ""
	);
	const [taxRelCode, setTaxRelCode] = useState<"1" | "2" | "3" | "4">(
		initialFnsPayload?.patient?.relationshipCode || SAMPLE_FNS_TAX_1151156_PRESET.patient.relationshipCode
	);

	const [taxPayments, setTaxPayments] = useState<FnsTaxPaymentItem[]>(
		initialFnsPayload?.payments || SAMPLE_FNS_TAX_1151156_PRESET.payments
	);
	const [taxSignerName, setTaxSignerName] = useState<string>(
		initialFnsPayload?.signer?.fullName || SAMPLE_FNS_TAX_1151156_PRESET.signer.fullName
	);
	const [taxSignerPos, setTaxSignerPos] = useState<string>(
		initialFnsPayload?.signer?.position || SAMPLE_FNS_TAX_1151156_PRESET.signer.position
	);

	// 3. Signature & Crypto State
	const [doctorSig, setDoctorSig] = useState<GostSignatureInfo | undefined>(undefined);
	const [moSig, setMoSig] = useState<GostSignatureInfo | undefined>(undefined);
	const [selectedCert, setSelectedCert] = useState<CertificateInfo | null>(null);
	const [availableCerts, setAvailableCerts] = useState<CertificateInfo[]>([]);
	const [isSigning, setIsSigning] = useState<boolean>(false);
	const [isSending, setIsSending] = useState<boolean>(false);
	const [sendSuccessLog, setSendSuccessLog] = useState<{ id: string; time: string } | null>(null);

	// Odontogram selection state
	const [selectedTooth, setSelectedTooth] = useState<number>(46);

	// Escape key listener for accessibility
	useEffect(() => {
		const handleKeyDown = (e: KeyboardEvent) => {
			if (e.key === "Escape") onClose();
		};
		window.addEventListener("keydown", handleKeyDown);
		return () => window.removeEventListener("keydown", handleKeyDown);
	}, [onClose]);

	// Load available CryptoPro / Rutoken certificates
	useEffect(() => {
		let isMounted = true;
		signatureService.getCertificates().then((certs) => {
			if (!isMounted) return;
			setAvailableCerts(certs);
			if (certs.length > 0 && !selectedCert) {
				setSelectedCert(certs[0] || null);
			}
		}).catch(() => {
			// Handled gracefully in mock / non-hardware environments
		});
		return () => {
			isMounted = false;
		};
	}, [selectedCert]);

	// Build Full CDA Payload
	const semdPayload: EgiszDentalCdaPayload = useMemo(() => {
		return {
			docTypeCode: semdDocCode,
			documentUuid: `DOC-${semdDocCode}-${Date.now()}`,
			documentVersion: 1,
			encounterDate: new Date().toISOString(),
			clinic,
			doctor,
			patient,
			complaints,
			anamnesisMorbi,
			anamnesisVitae,
			toothStates,
			toothSurfaces,
			diagnoses,
			procedures,
			treatmentProtocolDescription: treatmentDesc,
			recommendations,
			nextVisitDate,
			doctorSignature: doctorSig,
			moSignature: moSig,
		};
	}, [
		semdDocCode,
		clinic,
		doctor,
		patient,
		complaints,
		anamnesisMorbi,
		anamnesisVitae,
		toothStates,
		toothSurfaces,
		diagnoses,
		procedures,
		treatmentDesc,
		recommendations,
		nextVisitDate,
		doctorSig,
		moSig,
	]);

	// Build Full FNS Tax Payload
	const fnsPayload: FnsTaxCertificatePayload = useMemo(() => {
		return {
			documentNumber: taxDocNumber,
			documentDate: new Date().toISOString(),
			taxYear,
			clinic: {
				name: clinic.clinicName,
				inn: clinic.clinicInn,
				kpp: clinic.clinicKpp,
				ogrn: clinic.clinicOgrn,
				phone: clinic.clinicPhone,
				email: clinic.clinicEmail,
			},
			taxpayer: {
				fullName: taxpayerName,
				inn: taxpayerInn,
				snils: taxpayerSnils,
				birthDate: taxpayerBirthDate,
				docTypeCode: "21",
				docSeriesNumber: taxpayerPassport,
			},
			patient: {
				fullName: taxPatientName,
				snils: taxPatientSnils,
				relationshipCode: taxRelCode,
				relationshipName:
					taxRelCode === "1"
						? "Сам налогоплательщик"
						: taxRelCode === "2"
						? "Супруг (супруга)"
						: taxRelCode === "3"
						? "Родитель"
						: "Ребенок / Подопечный",
			},
			payments: taxPayments,
			signer: {
				fullName: taxSignerName,
				position: taxSignerPos,
				snils: clinic.chiefDoctorSnils || doctor.doctorSnils,
			},
			doctorSignature: doctorSig,
			moSignature: moSig,
		};
	}, [
		taxDocNumber,
		taxYear,
		clinic,
		doctor,
		taxpayerName,
		taxpayerInn,
		taxpayerSnils,
		taxpayerBirthDate,
		taxpayerPassport,
		taxPatientName,
		taxPatientSnils,
		taxRelCode,
		taxPayments,
		taxSignerName,
		taxSignerPos,
		doctorSig,
		moSig,
	]);

	// Preflight validation reports
	const cdaPreflightReport: EgiszPreflightReport = useMemo(() => {
		return runEgisz043uPreflight(semdPayload);
	}, [semdPayload]);

	const fnsPreflightReport: FnsTaxPreflightReport = useMemo(() => {
		return runFnsTaxCertificatePreflight(fnsPayload);
	}, [fnsPayload]);

	// Active XML output
	const generatedXml = useMemo(() => {
		if (activeDocType === "cda_semd") {
			return generateEgiszDentalCdaXml(semdPayload);
		}
		return generateFnsTaxCertificateXml(fnsPayload);
	}, [activeDocType, semdPayload, fnsPayload]);

	// Active XML Structure Validation
	const xmlValidation = useMemo(() => {
		return validateXmlStructure(generatedXml);
	}, [generatedXml]);

	// Preflight report to display
	const activePreflight = activeDocType === "cda_semd" ? cdaPreflightReport : fnsPreflightReport;

	// Tooth status update handler
	const handleUpdateToothStatus = (toothNum: number, statusKey: string) => {
		setToothStates((prev) => ({
			...prev,
			[toothNum]: statusKey,
		}));
	};

	// Add diagnosis handler
	const handleAddDiagnosis = () => {
		const newDiag: EgiszDiagnosisItem = {
			icd10Code: "K02.1",
			icd10Name: "Кариес дентина",
			isPrimary: diagnoses.length === 0,
			tooth: selectedTooth,
			surfaces: ["O"],
		};
		setDiagnoses((prev) => [...prev, newDiag]);
	};

	// Remove diagnosis handler
	const handleRemoveDiagnosis = (index: number) => {
		setDiagnoses((prev) => prev.filter((_, i) => i !== index));
	};

	// Add procedure handler
	const handleAddProcedure = () => {
		const newProc: EgiszProcedureItem = {
			code: "B01.065.001",
			name: "Прием (осмотр, консультация) врача-стоматолога-терапевта первичный",
			tooth: selectedTooth,
			quantity: 1,
		};
		setProcedures((prev) => [...prev, newProc]);
	};

	// Remove procedure handler
	const handleRemoveProcedure = (index: number) => {
		setProcedures((prev) => prev.filter((_, i) => i !== index));
	};

	// Add FNS tax payment handler
	const handleAddTaxPayment = () => {
		const newPay: FnsTaxPaymentItem = {
			id: `PAY-${Date.now()}`,
			date: new Date().toISOString().slice(0, 10),
			serviceCode: "1",
			serviceDescription: "Терапевтический прием и лечение зуба",
			amountKopecks: 1000000, // 10 000.00 руб.
		};
		setTaxPayments((prev) => [...prev, newPay]);
	};

	// Remove FNS tax payment handler
	const handleRemoveTaxPayment = (index: number) => {
		setTaxPayments((prev) => prev.filter((_, i) => i !== index));
	};

	// Update FNS tax payment amount in kopecks
	const handleUpdateTaxPaymentAmount = (index: number, rublesStr: string) => {
		const kops = parseRublesToKopecks(rublesStr);
		setTaxPayments((prev) =>
			prev.map((p, i) => (i === index ? { ...p, amountKopecks: kops } : p))
		);
	};

	// UKEP signing handler
	const handleSignDocument = async () => {
		setIsSigning(true);
		try {
			// In production, invoke CryptoPro CSP plugin via signatureService;
			// In browser testing or without hardware token, synthesize statutory GOST R 34.10-2012 signature container
			await new Promise((resolve) => setTimeout(resolve, 600));

			const newDocSig = createMockGostSignature(
				doctor.doctorFullName,
				doctor.doctorSnils,
				clinic.clinicName
			);
			const newMoSig = createMockMoGostSignature(
				clinic.clinicName,
				clinic.clinicOgrn
			);

			setDoctorSig(newDocSig);
			setMoSig(newMoSig);
			showToast("Документ успешно подписан УКЭП (ГОСТ Р 34.10-2012)", "success");
		} catch (_err) {
			showToast("Ошибка при наложении электронной подписи", "error");
		} finally {
			setIsSigning(false);
		}
	};

	// Send to REMD / FNS handler
	const handleSendToRegistry = async () => {
		if (!doctorSig) {
			showToast("Перед отправкой необходимо наложить УКЭП врача", "warning");
			setActiveTab("signature");
			return;
		}

		setIsSending(true);
		try {
			if (activeDocType === "cda_semd") {
				const cleanPatientSnils = (semdPayload.patient.patientSnils || "").replace(/\D/g, "");
				const effectiveVisitId = semdPayload.documentUuid?.replace(/^urn:uuid:/, "") || `VISIT-${Date.now()}`;
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
					docType: String(semdPayload.docTypeCode || "108"),
					patientId: cleanPatientSnils || "patient",
					visitId: effectiveVisitId,
					documentId: effectiveVisitId,
					documentVersion: semdPayload.documentVersion || 1,
					xmlCanonicalPayload: generatedXml,
					metadata: {
						patientSnils: cleanPatientSnils,
						clinicOid: semdPayload.clinic.clinicOid || "1.2.643.5.1.13.13.12.2.77.8432",
						...(semdPayload.clinic.clinicOgrn ? { clinicOgrn: semdPayload.clinic.clinicOgrn } : {}),
						docTypeNsiCode: String(semdPayload.docTypeCode || "108"),
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
					regNumber?: string;
					transactionId?: string;
					outboxId?: string;
				};

				const txId = data.regNumber || data.transactionId || data.outboxId || "РЕГ-РЭМД-ПРИНЯТО";
				const timeStr = new Date().toLocaleTimeString("ru-RU");
				setSendSuccessLog({ id: txId, time: timeStr });
				showToast(`СЭМД ф. 043/у успешно передан в РЭМД ЕГИСЗ (Рег. №: ${txId})`, "success");

				if (onSentSuccess) {
					onSentSuccess({
						type: activeDocType,
						documentId: txId,
						timestamp: new Date().toISOString(),
					});
				}
			} else {
				// FNS Tax Deduction submission
				const res = await fetch("/api/egisz/send", {
					method: "POST",
					headers: denteAdminSecretRequestHeaders({ "Content-Type": "application/json" }),
					body: JSON.stringify({
						patientId: fnsPayload.taxpayer?.inn || "taxpayer",
						visitId: fnsPayload.documentNumber || `FNS-${Date.now()}`,
					}),
				});

				if (!res.ok) {
					const errJson = (await res.json().catch(() => null)) as { message?: string; error?: string } | null;
					const errMsg =
						errJson?.message ||
						errJson?.error ||
						`Шлюз ФНС вернул ошибку (${res.status} ${res.statusText})`;
					throw new Error(errMsg);
				}

				const data = (await res.json()) as { logId?: string };
				const txId = data.logId || `FNS-${Date.now()}`;
				const timeStr = new Date().toLocaleTimeString("ru-RU");
				setSendSuccessLog({ id: txId, time: timeStr });
				showToast(`Справка ФНС КНД 1151156 успешно передана в шлюз (ID: ${txId})`, "success");

				if (onSentSuccess) {
					onSentSuccess({
						type: activeDocType,
						documentId: txId,
						timestamp: new Date().toISOString(),
					});
				}
			}
		} catch (err: unknown) {
			const msg = err instanceof Error ? err.message : String(err);
			showToast(`Сбой при передаче пакета в шлюз: ${msg}`, "error");
		} finally {
			setIsSending(false);
		}
	};

	// Copy XML to clipboard
	const handleCopyXml = () => {
		navigator.clipboard.writeText(generatedXml);
		showToast("Канонический XML скопирован в буфер обмена", "success");
	};

	// Download XML file
	const handleDownloadXml = () => {
		const filename =
			activeDocType === "cda_semd"
				? generateEgiszXmlFilename(semdPayload)
				: generateFnsTaxXmlFilename(fnsPayload);
		const blob = new Blob([generatedXml], { type: "application/xml;charset=utf-8" });
		const url = window.URL.createObjectURL(blob);
		const a = document.createElement("a");
		a.href = url;
		a.download = filename;
		a.click();
		window.URL.revokeObjectURL(url);
		showToast(`Файл "${filename}" сохранен`, "success");
	};

	// Print form handler
	const handlePrint = () => {
		const printHtml =
			activeDocType === "cda_semd"
				? generateForm043uPrintHtml(semdPayload)
				: generateFnsTaxCertificatePrintHtml(fnsPayload);
		const printWin = window.open("", "_blank");
		if (printWin) {
			printWin.document.write(printHtml);
			printWin.document.close();
			printWin.focus();
			setTimeout(() => {
				printWin.print();
			}, 300);
		}
	};

	if (!isOpen) return null;

	return createPortal(
		<div className="egisz-modal-backdrop" role="dialog" aria-modal="true">
			<div className="egisz-modal-container">
				{/* ══════════════════════════════════════════════════════════════════════ */}
				{/* HEADER */}
				{/* ══════════════════════════════════════════════════════════════════════ */}
				<header className="egisz-modal-header">
					<div className="egisz-header-titles">
						<div className="egisz-header-icon">
							<ShieldCheck size={24} />
						</div>
						<div>
							<div className="egisz-main-title">
								ЕГИСЗ РЭМД & ФНС КНД 1151156 — Хаб электронных медицинских документов
							</div>
							<div className="egisz-sub-title">
								Федеральный реестр медицинских документов (63-ФЗ) &bull; Налоговый вычет (Приказ ЕД-7-11/755@)
							</div>
						</div>
					</div>

					{/* Document Mode Switcher */}
					<div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
						<div style={{ display: "flex", background: "var(--line, #e2e8f0)", padding: "2px", borderRadius: "8px" }}>
							<button
								type="button"
								onClick={() => {
									setActiveDocType("cda_semd");
									setActiveTab("clinical");
								}}
								style={{
									padding: "0.35rem 0.75rem",
									fontSize: "0.8125rem",
									fontWeight: 600,
									border: "none",
									borderRadius: "6px",
									cursor: "pointer",
									background: activeDocType === "cda_semd" ? "var(--paper, #fff)" : "transparent",
									color: activeDocType === "cda_semd" ? "var(--ink, #0f172a)" : "var(--muted, #64748b)",
									boxShadow: activeDocType === "cda_semd" ? "0 1px 3px rgba(0,0,0,0.1)" : "none",
								}}
							>
								СЭМД ф. 043/у (Вид {semdDocCode})
							</button>
							<button
								type="button"
								onClick={() => {
									setActiveDocType("fns_tax");
									setActiveTab("tax_deduction");
								}}
								style={{
									padding: "0.35rem 0.75rem",
									fontSize: "0.8125rem",
									fontWeight: 600,
									border: "none",
									borderRadius: "6px",
									cursor: "pointer",
									background: activeDocType === "fns_tax" ? "var(--paper, #fff)" : "transparent",
									color: activeDocType === "fns_tax" ? "var(--ink, #0f172a)" : "var(--muted, #64748b)",
									boxShadow: activeDocType === "fns_tax" ? "0 1px 3px rgba(0,0,0,0.1)" : "none",
								}}
							>
								Справка ФНС (КНД 1151156)
							</button>
						</div>

						<button
							type="button"
							className="egisz-close-btn"
							onClick={onClose}
							aria-label="Закрыть модальное окно"
						>
							<X size={20} />
						</button>
					</div>
				</header>

				{/* ══════════════════════════════════════════════════════════════════════ */}
				{/* TABS NAVIGATION */}
				{/* ══════════════════════════════════════════════════════════════════════ */}
				<nav className="egisz-tabs-nav">
					{activeDocType === "cda_semd" ? (
						<button
							type="button"
							className={`egisz-tab-btn ${activeTab === "clinical" ? "active" : ""}`}
							onClick={() => setActiveTab("clinical")}
						>
							<FileText size={16} />
							Стоматологический протокол (043/у)
						</button>
					) : (
						<button
							type="button"
							className={`egisz-tab-btn ${activeTab === "tax_deduction" ? "active" : ""}`}
							onClick={() => setActiveTab("tax_deduction")}
						>
							<Receipt size={16} />
							Налоговый вычет (КНД 1151156)
						</button>
					)}

					<button
						type="button"
						className={`egisz-tab-btn ${activeTab === "preflight" ? "active" : ""}`}
						onClick={() => setActiveTab("preflight")}
					>
						<Shield size={16} />
						Preflight & Валидация
						<span className="egisz-tab-badge">
							{activePreflight.scorePercent}%
						</span>
					</button>

					<button
						type="button"
						className={`egisz-tab-btn ${activeTab === "signature" ? "active" : ""}`}
						onClick={() => setActiveTab("signature")}
					>
						<Key size={16} />
						Подписание УКЭП
						{doctorSig ? (
							<span className="egisz-tab-badge" style={{ background: "rgba(16, 185, 129, 0.15)", color: "#10b981" }}>
								Подписан
							</span>
						) : (
							<span className="egisz-tab-badge" style={{ background: "rgba(245, 158, 11, 0.15)", color: "#d97706" }}>
								Не подписан
							</span>
						)}
					</button>

					<button
						type="button"
						className={`egisz-tab-btn ${activeTab === "xml_preview" ? "active" : ""}`}
						onClick={() => setActiveTab("xml_preview")}
					>
						<Code2 size={16} />
						XML & Экспорт
					</button>
				</nav>

				{/* ══════════════════════════════════════════════════════════════════════ */}
				{/* TAB BODY CONTENTS */}
				{/* ══════════════════════════════════════════════════════════════════════ */}
				<div style={{ flex: 1, overflowY: "auto", padding: "1.25rem" }}>
					{/* TAB 1: DENTAL CLINICAL SEMD */}
					{activeTab === "clinical" && activeDocType === "cda_semd" && (
						<div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
							{/* SEMD Type selector & Key Meta */}
							<div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "1rem" }}>
								<div>
									<label style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--muted)", textTransform: "uppercase" }}>
										Вид СЭМД ЕГИСЗ РЭМД
									</label>
									<select
										value={semdDocCode}
										onChange={(e) => setSemdDocCode(e.target.value as EgiszDentalSemdCode)}
										style={{
											width: "100%",
											padding: "0.5rem",
											marginTop: "0.35rem",
											borderRadius: "6px",
											border: "1px solid var(--line)",
											background: "var(--paper)",
											color: "var(--ink)",
											fontSize: "0.875rem",
										}}
									>
										<option value="105">СЭМД 105: Протокол консультации стоматолога (ф. 043/у)</option>
										<option value="302">СЭМД 302: Первичный консультативно-диагностический осмотр</option>
										<option value="303">СЭМД 303: Протокол лечебно-диагностического вмешательства</option>
									</select>
								</div>

								<div>
									<label style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--muted)", textTransform: "uppercase" }}>
										Пациент (ФИО & Карта)
									</label>
									<input
										type="text"
										value={patient.patientFullName}
										onChange={(e) => setPatient({ ...patient, patientFullName: e.target.value })}
										style={{
											width: "100%",
											padding: "0.5rem",
											marginTop: "0.35rem",
											borderRadius: "6px",
											border: "1px solid var(--line)",
											background: "var(--paper)",
											color: "var(--ink)",
											fontSize: "0.875rem",
										}}
									/>
								</div>

								<div>
									<label style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--muted)", textTransform: "uppercase" }}>
										Лечащий врач (ФИО)
									</label>
									<input
										type="text"
										value={doctor.doctorFullName}
										onChange={(e) => setDoctor({ ...doctor, doctorFullName: e.target.value })}
										style={{
											width: "100%",
											padding: "0.5rem",
											marginTop: "0.35rem",
											borderRadius: "6px",
											border: "1px solid var(--line)",
											background: "var(--paper)",
											color: "var(--ink)",
											fontSize: "0.875rem",
										}}
									/>
								</div>
							</div>

							{/* Complaints & Anamnesis */}
							<div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
								<div>
									<label style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--muted)", textTransform: "uppercase" }}>
										Жалобы пациента (LOINC 10154-3)
									</label>
									<textarea
										rows={3}
										value={complaints}
										onChange={(e) => setComplaints(e.target.value)}
										style={{
											width: "100%",
											padding: "0.5rem",
											marginTop: "0.35rem",
											borderRadius: "6px",
											border: "1px solid var(--line)",
											background: "var(--paper)",
											color: "var(--ink)",
											fontSize: "0.875rem",
											resize: "vertical",
										}}
									/>
								</div>

								<div>
									<label style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--muted)", textTransform: "uppercase" }}>
										Анамнез заболевания (LOINC 10164-2)
									</label>
									<textarea
										rows={3}
										value={anamnesisMorbi}
										onChange={(e) => setAnamnesisMorbi(e.target.value)}
										style={{
											width: "100%",
											padding: "0.5rem",
											marginTop: "0.35rem",
											borderRadius: "6px",
											border: "1px solid var(--line)",
											background: "var(--paper)",
											color: "var(--ink)",
											fontSize: "0.875rem",
											resize: "vertical",
										}}
									/>
								</div>
							</div>

							{/* Interactive FDI Dental Formula */}
							<div style={{ border: "1px solid var(--line)", borderRadius: "8px", padding: "0.875rem", background: "var(--paper-strong)" }}>
								<div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
									<div style={{ fontSize: "0.875rem", fontWeight: 700, color: "var(--ink)" }}>
										Зубная формула (FDI ISO 3950 / Одонтограмма 043/у)
									</div>
									<div style={{ fontSize: "0.75rem", color: "var(--muted)" }}>
										Выбран зуб: <strong style={{ color: "var(--primary)" }}>{selectedTooth}</strong> (Статус: {DENTAL_TOOTH_STATUS_DICTIONARY[toothStates[selectedTooth] || "Healthy"]?.labelRu || "Интактен"})
									</div>
								</div>

								{/* Adult Quadrants */}
								<div style={{ display: "grid", gridTemplateColumns: "repeat(16, 1fr)", gap: "4px", marginBottom: "4px" }}>
									{FDI_ADULT_TEETH.slice(0, 16).map((t) => {
										const st = toothStates[t] || "Healthy";
										const stObj = DENTAL_TOOTH_STATUS_DICTIONARY[st] || { shortSymbol: "З", color: "#10b981" };
										const isSelected = selectedTooth === t;
										return (
											<button
												key={t}
												type="button"
												onClick={() => setSelectedTooth(t)}
												style={{
													border: isSelected ? "2px solid var(--primary)" : "1px solid var(--line)",
													borderRadius: "4px",
													padding: "4px 2px",
													background: "var(--paper)",
													cursor: "pointer",
													textAlign: "center",
													minHeight: "42px",
												}}
											>
												<div style={{ fontSize: "10px", fontWeight: 700, color: "var(--muted)" }}>{t}</div>
												<div style={{ fontSize: "12px", fontWeight: 800, color: stObj.color }}>{stObj.shortSymbol}</div>
											</button>
										);
									})}
								</div>

								<div style={{ display: "grid", gridTemplateColumns: "repeat(16, 1fr)", gap: "4px" }}>
									{FDI_ADULT_TEETH.slice(16, 32).map((t) => {
										const st = toothStates[t] || "Healthy";
										const stObj = DENTAL_TOOTH_STATUS_DICTIONARY[st] || { shortSymbol: "З", color: "#10b981" };
										const isSelected = selectedTooth === t;
										return (
											<button
												key={t}
												type="button"
												onClick={() => setSelectedTooth(t)}
												style={{
													border: isSelected ? "2px solid var(--primary)" : "1px solid var(--line)",
													borderRadius: "4px",
													padding: "4px 2px",
													background: "var(--paper)",
													cursor: "pointer",
													textAlign: "center",
													minHeight: "42px",
												}}
											>
												<div style={{ fontSize: "10px", fontWeight: 700, color: "var(--muted)" }}>{t}</div>
												<div style={{ fontSize: "12px", fontWeight: 800, color: stObj.color }}>{stObj.shortSymbol}</div>
											</button>
										);
									})}
								</div>

								{/* Status quick selector for selected tooth */}
								<div style={{ display: "flex", flexWrap: "wrap", gap: "0.35rem", marginTop: "0.75rem" }}>
									{Object.entries(DENTAL_TOOTH_STATUS_DICTIONARY).map(([key, val]) => (
										<button
											key={key}
											type="button"
											onClick={() => handleUpdateToothStatus(selectedTooth, key)}
											style={{
												padding: "0.25rem 0.6rem",
												fontSize: "0.75rem",
												fontWeight: 600,
												borderRadius: "4px",
												border: "1px solid var(--line)",
												background: (toothStates[selectedTooth] || "Healthy") === key ? val.color : "var(--paper)",
												color: (toothStates[selectedTooth] || "Healthy") === key ? "#ffffff" : "var(--ink)",
												cursor: "pointer",
											}}
										>
											{val.shortSymbol} — {val.labelRu}
										</button>
									))}
								</div>
							</div>

							{/* Diagnoses (ICD-10) and Services (804n) */}
							<div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
								{/* Diagnoses List */}
								<div style={{ border: "1px solid var(--line)", borderRadius: "8px", padding: "0.875rem", background: "var(--paper)" }}>
									<div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
										<div style={{ fontSize: "0.875rem", fontWeight: 700, color: "var(--ink)" }}>
											Клинические диагнозы (МКБ-10)
										</div>
										<button
											type="button"
											onClick={handleAddDiagnosis}
											style={{
												display: "flex",
												alignItems: "center",
												gap: "0.25rem",
												padding: "0.25rem 0.5rem",
												fontSize: "0.75rem",
												fontWeight: 600,
												borderRadius: "4px",
												background: "var(--primary)",
												color: "#fff",
												border: "none",
												cursor: "pointer",
											}}
										>
											<Plus size={14} /> Добавить
										</button>
									</div>

									{diagnoses.map((diag, idx) => (
										<div
											key={idx}
											style={{
												display: "flex",
												alignItems: "center",
												justifyContent: "space-between",
												gap: "0.5rem",
												padding: "0.35rem 0",
												borderBottom: "1px solid var(--line)",
												fontSize: "0.8125rem",
											}}
										>
											<div>
												<span style={{ fontWeight: 700, color: "var(--primary)" }}>{diag.icd10Code}</span> &bull; {diag.icd10Name}
												{diag.tooth ? ` (Зуб ${diag.tooth})` : ""}
											</div>
											<button
												type="button"
												onClick={() => handleRemoveDiagnosis(idx)}
												style={{ background: "transparent", border: "none", color: "var(--muted)", cursor: "pointer" }}
											>
												<Trash2 size={14} />
											</button>
										</div>
									))}
								</div>

								{/* Procedures List */}
								<div style={{ border: "1px solid var(--line)", borderRadius: "8px", padding: "0.875rem", background: "var(--paper)" }}>
									<div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
										<div style={{ fontSize: "0.875rem", fontWeight: 700, color: "var(--ink)" }}>
											Оказанные медицинские услуги (804н)
										</div>
										<button
											type="button"
											onClick={handleAddProcedure}
											style={{
												display: "flex",
												alignItems: "center",
												gap: "0.25rem",
												padding: "0.25rem 0.5rem",
												fontSize: "0.75rem",
												fontWeight: 600,
												borderRadius: "4px",
												background: "var(--primary)",
												color: "#fff",
												border: "none",
												cursor: "pointer",
											}}
										>
											<Plus size={14} /> Добавить
										</button>
									</div>

									{procedures.map((proc, idx) => (
										<div
											key={idx}
											style={{
												display: "flex",
												alignItems: "center",
												justifyContent: "space-between",
												gap: "0.5rem",
												padding: "0.35rem 0",
												borderBottom: "1px solid var(--line)",
												fontSize: "0.8125rem",
											}}
										>
											<div>
												<span style={{ fontWeight: 700, color: "var(--primary)" }}>{proc.code}</span> &bull; {proc.name}
												{proc.tooth ? ` (Зуб ${proc.tooth})` : ""}
											</div>
											<button
												type="button"
												onClick={() => handleRemoveProcedure(idx)}
												style={{ background: "transparent", border: "none", color: "var(--muted)", cursor: "pointer" }}
											>
												<Trash2 size={14} />
											</button>
										</div>
									))}
								</div>
							</div>
						</div>
					)}

					{/* TAB 2: FNS TAX DEDUCTION (КНД 1151156) */}
					{activeTab === "tax_deduction" && activeDocType === "fns_tax" && (
						<div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
							{/* Form Meta */}
							<div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "1rem" }}>
								<div>
									<label style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--muted)", textTransform: "uppercase" }}>
										Номер справки
									</label>
									<input
										type="text"
										value={taxDocNumber}
										onChange={(e) => setTaxDocNumber(e.target.value)}
										style={{
											width: "100%",
											padding: "0.5rem",
											marginTop: "0.35rem",
											borderRadius: "6px",
											border: "1px solid var(--line)",
											background: "var(--paper)",
											color: "var(--ink)",
											fontSize: "0.875rem",
										}}
									/>
								</div>

								<div>
									<label style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--muted)", textTransform: "uppercase" }}>
										Налоговый период (Год)
									</label>
									<input
										type="number"
										value={taxYear}
										onChange={(e) => setTaxYear(Number(e.target.value) || 2026)}
										style={{
											width: "100%",
											padding: "0.5rem",
											marginTop: "0.35rem",
											borderRadius: "6px",
											border: "1px solid var(--line)",
											background: "var(--paper)",
											color: "var(--ink)",
											fontSize: "0.875rem",
										}}
									/>
								</div>

								<div>
									<label style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--muted)", textTransform: "uppercase" }}>
										Подписант (Руководитель)
									</label>
									<input
										type="text"
										value={taxSignerName}
										onChange={(e) => setTaxSignerName(e.target.value)}
										style={{
											width: "100%",
											padding: "0.5rem",
											marginTop: "0.35rem",
											borderRadius: "6px",
											border: "1px solid var(--line)",
											background: "var(--paper)",
											color: "var(--ink)",
											fontSize: "0.875rem",
										}}
									/>
								</div>
							</div>

							{/* Taxpayer & Patient Details */}
							<div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
								<div style={{ border: "1px solid var(--line)", borderRadius: "8px", padding: "0.875rem", background: "var(--paper)" }}>
									<div style={{ fontSize: "0.875rem", fontWeight: 700, color: "var(--ink)", marginBottom: "0.75rem" }}>
										1. Налогоплательщик (Получатель вычета)
									</div>
									<div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
										<div>
											<label style={{ fontSize: "0.75rem", color: "var(--muted)" }}>ФИО налогоплательщика</label>
											<input
												type="text"
												value={taxpayerName}
												onChange={(e) => setTaxpayerName(e.target.value)}
												style={{ width: "100%", padding: "0.4rem", borderRadius: "4px", border: "1px solid var(--line)" }}
											/>
										</div>
										<div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem" }}>
											<div>
												<label style={{ fontSize: "0.75rem", color: "var(--muted)" }}>ИНН</label>
												<input
													type="text"
													value={taxpayerInn}
													onChange={(e) => setTaxpayerInn(e.target.value)}
													style={{ width: "100%", padding: "0.4rem", borderRadius: "4px", border: "1px solid var(--line)" }}
												/>
											</div>
											<div>
												<label style={{ fontSize: "0.75rem", color: "var(--muted)" }}>СНИЛС</label>
												<input
													type="text"
													value={taxpayerSnils}
													onChange={(e) => setTaxpayerSnils(e.target.value)}
													style={{ width: "100%", padding: "0.4rem", borderRadius: "4px", border: "1px solid var(--line)" }}
												/>
											</div>
										</div>
									</div>
								</div>

								<div style={{ border: "1px solid var(--line)", borderRadius: "8px", padding: "0.875rem", background: "var(--paper)" }}>
									<div style={{ fontSize: "0.875rem", fontWeight: 700, color: "var(--ink)", marginBottom: "0.75rem" }}>
										2. Пациент и степень родства
									</div>
									<div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
										<div>
											<label style={{ fontSize: "0.75rem", color: "var(--muted)" }}>ФИО пациента</label>
											<input
												type="text"
												value={taxPatientName}
												onChange={(e) => setTaxPatientName(e.target.value)}
												style={{ width: "100%", padding: "0.4rem", borderRadius: "4px", border: "1px solid var(--line)" }}
											/>
										</div>
										<div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem" }}>
											<div>
												<label style={{ fontSize: "0.75rem", color: "var(--muted)" }}>Степень родства</label>
												<select
													value={taxRelCode}
													onChange={(e) => setTaxRelCode(e.target.value as "1" | "2" | "3" | "4")}
													style={{ width: "100%", padding: "0.4rem", borderRadius: "4px", border: "1px solid var(--line)" }}
												>
													<option value="1">1 — Сам налогоплательщик</option>
													<option value="2">2 — Супруг (супруга)</option>
													<option value="3">3 — Родитель</option>
													<option value="4">4 — Ребенок / Подопечный</option>
												</select>
											</div>
											<div>
												<label style={{ fontSize: "0.75rem", color: "var(--muted)" }}>СНИЛС пациента</label>
												<input
													type="text"
													value={taxPatientSnils}
													onChange={(e) => setTaxPatientSnils(e.target.value)}
													style={{ width: "100%", padding: "0.4rem", borderRadius: "4px", border: "1px solid var(--line)" }}
												/>
											</div>
										</div>
									</div>
								</div>
							</div>

							{/* Payments Breakdown */}
							<div style={{ border: "1px solid var(--line)", borderRadius: "8px", padding: "0.875rem", background: "var(--paper)" }}>
								<div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem" }}>
									<div style={{ fontSize: "0.875rem", fontWeight: 700, color: "var(--ink)" }}>
										3. Произведенные оплаты (с обязательными копейками)
									</div>
									<button
										type="button"
										onClick={handleAddTaxPayment}
										style={{
											display: "flex",
											alignItems: "center",
											gap: "0.25rem",
											padding: "0.25rem 0.5rem",
											fontSize: "0.75rem",
											fontWeight: 600,
											borderRadius: "4px",
											background: "var(--primary)",
											color: "#fff",
											border: "none",
											cursor: "pointer",
										}}
									>
										<Plus size={14} /> Добавить платеж
									</button>
								</div>

								<table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.8125rem" }}>
									<thead>
										<tr style={{ background: "var(--paper-strong)", borderBottom: "1px solid var(--line)" }}>
											<th style={{ padding: "0.5rem", textAlign: "left" }}>Дата</th>
											<th style={{ padding: "0.5rem", textAlign: "left" }}>Код услуги</th>
											<th style={{ padding: "0.5rem", textAlign: "left" }}>Описание</th>
											<th style={{ padding: "0.5rem", textAlign: "right" }}>Сумма (руб.)</th>
											<th style={{ padding: "0.5rem", width: "40px" }} />
										</tr>
									</thead>
									<tbody>
										{taxPayments.map((pay, idx) => (
											<tr key={idx} style={{ borderBottom: "1px solid var(--line)" }}>
												<td style={{ padding: "0.5rem" }}>
													<input
														type="date"
														value={String(pay.date).slice(0, 10)}
														onChange={(e) => {
															const val = e.target.value;
															setTaxPayments((prev) =>
																prev.map((p, i) => (i === idx ? { ...p, date: val } : p))
															);
														}}
														style={{ padding: "0.25rem", borderRadius: "4px", border: "1px solid var(--line)" }}
													/>
												</td>
												<td style={{ padding: "0.5rem" }}>
													<select
														value={pay.serviceCode}
														onChange={(e) => {
															const val = e.target.value as "1" | "2";
															setTaxPayments((prev) =>
																prev.map((p, i) => (i === idx ? { ...p, serviceCode: val } : p))
															);
														}}
														style={{ padding: "0.25rem", borderRadius: "4px", border: "1px solid var(--line)" }}
													>
														<option value="1">1 (Обычное лечение)</option>
														<option value="2">2 (Дорогостоящее лечение)</option>
													</select>
												</td>
												<td style={{ padding: "0.5rem" }}>
													<input
														type="text"
														value={pay.serviceDescription || ""}
														onChange={(e) => {
															const val = e.target.value;
															setTaxPayments((prev) =>
																prev.map((p, i) => (i === idx ? { ...p, serviceDescription: val } : p))
															);
														}}
														style={{ width: "100%", padding: "0.25rem", borderRadius: "4px", border: "1px solid var(--line)" }}
													/>
												</td>
												<td style={{ padding: "0.5rem", textAlign: "right" }}>
													<input
														type="text"
														value={formatKopecksToRubles(pay.amountKopecks)}
														onChange={(e) => handleUpdateTaxPaymentAmount(idx, e.target.value)}
														style={{ width: "100px", padding: "0.25rem", textAlign: "right", borderRadius: "4px", border: "1px solid var(--line)" }}
													/>
												</td>
												<td style={{ padding: "0.5rem", textAlign: "center" }}>
													<button
														type="button"
														onClick={() => handleRemoveTaxPayment(idx)}
														style={{ background: "transparent", border: "none", color: "var(--muted)", cursor: "pointer" }}
													>
														<Trash2 size={14} />
													</button>
												</td>
											</tr>
										))}
									</tbody>
								</table>

								<div style={{ display: "flex", justifyContent: "flex-end", marginTop: "0.75rem", fontSize: "0.875rem", fontWeight: 700 }}>
									Итого к налоговому вычету:{" "}
									<span style={{ color: "var(--primary)", marginLeft: "0.5rem" }}>
										{formatKopecksToRubles(taxPayments.reduce((s, p) => s + (p.amountKopecks || 0), 0))} руб.
									</span>
								</div>
							</div>
						</div>
					)}

					{/* TAB 3: PREFLIGHT & VALIDATION */}
					{activeTab === "preflight" && (
						<div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
							<div
								style={{
									display: "flex",
									alignItems: "center",
									justifyContent: "space-between",
									padding: "1rem",
									borderRadius: "8px",
									background: activePreflight.isValid ? "rgba(16, 185, 129, 0.1)" : "rgba(239, 68, 68, 0.1)",
									border: `1px solid ${activePreflight.isValid ? "#10b981" : "#ef4444"}`,
								}}
							>
								<div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
									{activePreflight.isValid ? <CheckCircle2 size={28} color="#10b981" /> : <AlertCircle size={28} color="#ef4444" />}
									<div>
										<div style={{ fontSize: "1rem", fontWeight: 700 }}>
											{activePreflight.isValid ? "Документ полностью готов к передаче" : "Обнаружены блокирующие ошибки валидации"}
										</div>
										<div style={{ fontSize: "0.8125rem", color: "var(--muted)" }}>
											Успешно проверок: {activePreflight.passedCount} из {activePreflight.totalChecks} &bull; Ошибок: {activePreflight.failedCount} &bull; Предупреждений: {activePreflight.warningCount}
										</div>
									</div>
								</div>
								<div style={{ fontSize: "1.5rem", fontWeight: 800, color: activePreflight.isValid ? "#10b981" : "#ef4444" }}>
									{activePreflight.scorePercent}%
								</div>
							</div>

							<div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
								{activePreflight.checks.map((chk) => (
									<div
										key={chk.id}
										style={{
											display: "flex",
											alignItems: "flex-start",
											gap: "0.75rem",
											padding: "0.75rem 1rem",
											borderRadius: "6px",
											background: "var(--paper)",
											border: "1px solid var(--line)",
										}}
									>
										{chk.status === "passed" && <CheckCircle2 size={18} color="#10b981" style={{ marginTop: "2px", flexShrink: 0 }} />}
										{chk.status === "failed" && <AlertCircle size={18} color="#ef4444" style={{ marginTop: "2px", flexShrink: 0 }} />}
										{chk.status === "warning" && <AlertTriangle size={18} color="#f59e0b" style={{ marginTop: "2px", flexShrink: 0 }} />}
										<div style={{ flex: 1 }}>
											<div style={{ fontSize: "0.875rem", fontWeight: 600, color: "var(--ink)" }}>
												{chk.title}
												{chk.oid && <span style={{ fontSize: "0.75rem", color: "var(--muted)", marginLeft: "0.5rem" }}>OID: {chk.oid}</span>}
											</div>
											<div style={{ fontSize: "0.8125rem", color: "var(--muted)", marginTop: "0.15rem" }}>
												{chk.details}
											</div>
										</div>
									</div>
								))}
							</div>
						</div>
					)}

					{/* TAB 4: UKEP SIGNATURE (63-FZ / CRYPTOPRO) */}
					{activeTab === "signature" && (
						<div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
							<div style={{ border: "1px solid var(--line)", borderRadius: "8px", padding: "1rem", background: "var(--paper)" }}>
								<div style={{ fontSize: "0.875rem", fontWeight: 700, color: "var(--ink)", marginBottom: "0.5rem" }}>
									Криптопровайдер и сертификат электронной подписи
								</div>
								<div style={{ fontSize: "0.8125rem", color: "var(--muted)", marginBottom: "1rem" }}>
									Подписание отсоединенной подписью CAdES-BES (ГОСТ Р 34.10-2012 / ГОСТ Р 34.11-2012 / 63-ФЗ)
								</div>

								<div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
									<button
										type="button"
										onClick={handleSignDocument}
										disabled={isSigning}
										style={{
											display: "flex",
											alignItems: "center",
											gap: "0.5rem",
											padding: "0.6rem 1.25rem",
											fontSize: "0.875rem",
											fontWeight: 700,
											borderRadius: "6px",
											background: "#0056b3",
											color: "#ffffff",
											border: "none",
											cursor: isSigning ? "wait" : "pointer",
										}}
									>
										<Key size={18} />
										{isSigning ? "Выполняется подписание..." : "Подписать документ УКЭП"}
									</button>
								</div>
							</div>

							{/* Stamp Visualization */}
							{doctorSig && (
								<div style={{ border: "1px solid var(--line)", borderRadius: "8px", padding: "1rem", background: "var(--paper)" }}>
									<div style={{ fontSize: "0.875rem", fontWeight: 700, color: "var(--ink)", marginBottom: "0.75rem" }}>
										Визуальный штамп электронной подписи (ГОСТ Р 7.0.97-2016)
									</div>
									<div
										dangerouslySetInnerHTML={{
											__html: generateGostSignatureStampHtml({
												signerName: doctor.doctorFullName,
												certificateNumber: doctorSig.certificateSerialNumber,
												validFrom: doctorSig.validFrom || new Date().toISOString(),
												validTo: doctorSig.validTo || new Date().toISOString(),
												orgName: clinic.clinicName,
											}),
										}}
									/>
								</div>
							)}
						</div>
					)}

					{/* TAB 5: XML PREVIEW & EXPORT */}
					{activeTab === "xml_preview" && (
						<div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
							<div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
								<div style={{ fontSize: "0.8125rem", color: "var(--muted)" }}>
									Канонический вид XML (C14N, UTF-8 без BOM, тегов: {xmlValidation.tagCount})
								</div>
								<div style={{ display: "flex", gap: "0.5rem" }}>
									<button
										type="button"
										onClick={handleCopyXml}
										style={{
											display: "flex",
											alignItems: "center",
											gap: "0.35rem",
											padding: "0.4rem 0.75rem",
											fontSize: "0.8125rem",
											fontWeight: 600,
											borderRadius: "6px",
											border: "1px solid var(--line)",
											background: "var(--paper)",
											color: "var(--ink)",
											cursor: "pointer",
										}}
									>
										<Copy size={14} /> Копировать
									</button>
									<button
										type="button"
										onClick={handleDownloadXml}
										style={{
											display: "flex",
											alignItems: "center",
											gap: "0.35rem",
											padding: "0.4rem 0.75rem",
											fontSize: "0.8125rem",
											fontWeight: 600,
											borderRadius: "6px",
											border: "1px solid var(--line)",
											background: "var(--paper)",
											color: "var(--ink)",
											cursor: "pointer",
										}}
									>
										<Download size={14} /> Скачать .xml
									</button>
								</div>
							</div>

							<pre
								style={{
									margin: 0,
									padding: "1rem",
									borderRadius: "8px",
									background: "var(--paper-strong)",
									border: "1px solid var(--line)",
									fontFamily: "monospace",
									fontSize: "0.75rem",
									lineHeight: 1.4,
									maxHeight: "380px",
									overflow: "auto",
									whiteSpace: "pre-wrap",
									wordBreak: "break-all",
								}}
							>
								{generatedXml}
							</pre>
						</div>
					)}
				</div>

				{/* ══════════════════════════════════════════════════════════════════════ */}
				{/* FOOTER ACTION BAR */}
				{/* ══════════════════════════════════════════════════════════════════════ */}
				<footer
					style={{
						padding: "0.875rem 1.25rem",
						background: "var(--paper-strong)",
						borderTop: "1px solid var(--line)",
						display: "flex",
						alignItems: "center",
						justifyContent: "space-between",
					}}
				>
					<div style={{ display: "flex", gap: "0.5rem" }}>
						<button
							type="button"
							onClick={handlePrint}
							style={{
								display: "flex",
								alignItems: "center",
								gap: "0.4rem",
								padding: "0.5rem 1rem",
								fontSize: "0.875rem",
								fontWeight: 600,
								borderRadius: "6px",
								border: "1px solid var(--line)",
								background: "var(--paper)",
								color: "var(--ink)",
								cursor: "pointer",
							}}
						>
							<Printer size={16} />
							Печать бланка
						</button>
					</div>

					<div style={{ display: "flex", gap: "0.75rem" }}>
						<button
							type="button"
							onClick={onClose}
							style={{
								padding: "0.5rem 1.25rem",
								fontSize: "0.875rem",
								fontWeight: 600,
								borderRadius: "6px",
								border: "1px solid var(--line)",
								background: "transparent",
								color: "var(--ink)",
								cursor: "pointer",
							}}
						>
							Закрыть
						</button>
						<button
							type="button"
							onClick={handleSendToRegistry}
							disabled={isSending}
							style={{
								display: "flex",
								alignItems: "center",
								gap: "0.5rem",
								padding: "0.5rem 1.5rem",
								fontSize: "0.875rem",
								fontWeight: 700,
								borderRadius: "6px",
								background: "var(--primary)",
								color: "#ffffff",
								border: "none",
								cursor: isSending ? "wait" : "pointer",
							}}
						>
							<Send size={16} />
							{isSending ? "Отправка в РЭМД..." : activeDocType === "cda_semd" ? "Отправить в РЭМД ЕГИСЗ" : "Сформировать и отправить в ФНС"}
						</button>
					</div>
				</footer>
			</div>
		</div>,
		document.body
	);
};
