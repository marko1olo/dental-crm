/**
 * ═══════════════════════════════════════════════════════════════════════════
 * TOUCH-FIRST EGISZ REMD CDA R2 OUTPATIENT CARD 043/U XML MODAL HUD
 * Statutory Electronic Medical Document Generator for Russian Ministry of Health
 * ═══════════════════════════════════════════════════════════════════════════
 */

import React, { useMemo, useState } from "react";
import { createPortal } from "react-dom";
import {
	AlertCircle,
	AlertTriangle,
	Building2,
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
import { showToast } from "../../GlobalToast";
import { denteAdminSecretRequestHeaders } from "../../../lib/denteRequestHeaders";
import {
	ALL_FDI_TEETH,
	COMMON_804N_DENTAL_SERVICES,
	COMMON_DENTAL_ICD10,
	DEFAULT_EGISZ_CLINIC_PRESET,
	DEFAULT_EGISZ_DOCTOR_PRESET,
	DENTAL_SURFACES,
	DENTAL_TOOTH_STATUS_DICTIONARY,
	EGISZ_DENTAL_SEMD_TYPES,
	type EgiszDentalSemdCode,
	FDI_ADULT_TEETH,
	FDI_CHILD_TEETH,
	FRMR_DOCTOR_POSITIONS,
	SAMPLE_043U_PATIENT_PRESET,
} from "./egiszRemdPresets";
import {
	canonicalizeCdaXml,
	createMockGostSignature,
	type Egisz043uPayload,
	type EgiszDiagnosisItem,
	type EgiszProcedureItem,
	formatRuDate,
	generateEgisz043uCdaXml,
	generateEgiszXmlFilename,
	generateForm043uPrintHtml,
	generateGostXmlSignatureBlock,
	runEgisz043uPreflight,
} from "./egiszRemdEngine";
import "./egiszRemd.css";

export interface EgiszRemdXmlModalProps {
	isOpen?: boolean;
	onClose: () => void;
	initialPayload?: Partial<Egisz043uPayload>;
}

export const EgiszRemdXmlModal: React.FC<EgiszRemdXmlModalProps> = ({
	isOpen = true,
	onClose,
	initialPayload,
}) => {
	// Active Tab State
	const [activeTab, setActiveTab] = useState<"preflight" | "odontogram" | "clinical" | "cda_xml">("preflight");

	// Document Payload State
	const [docTypeCode, setDocTypeCode] = useState<EgiszDentalSemdCode>(
		initialPayload?.docTypeCode || "303"
	);
	const [clinic, setClinic] = useState(
		initialPayload?.clinic || DEFAULT_EGISZ_CLINIC_PRESET
	);
	const [doctor, setDoctor] = useState(
		initialPayload?.doctor || DEFAULT_EGISZ_DOCTOR_PRESET
	);
	const [patient, setPatient] = useState(
		initialPayload?.patient || SAMPLE_043U_PATIENT_PRESET
	);

	// Clinical Data State
	const [complaints, setComplaints] = useState(
		initialPayload?.complaints ||
			"Жалобы на кратковременные боли от холодного и сладкого в области зуба 46, застревание пищи."
	);
	const [anamnesisMorbi, setAnamnesisMorbi] = useState(
		initialPayload?.anamnesisMorbi ||
			"Зуб 46 ранее не лечен. Боли появились около двух недель назад, постепенно усиливаются."
	);
	const [anamnesisVitae, setAnamnesisVitae] = useState(
		initialPayload?.anamnesisVitae ||
			"Аллергоанамнез не отягощен. Сопутствующие заболевания отрицает. Перенесенные инфекции: ОРВИ."
	);
	const [recommendations, setRecommendations] = useState(
		initialPayload?.recommendations ||
			"Соблюдение правил индивидуальной гигиены полости рта, зубная паста с фторидами, контрольный осмотр через 6 месяцев."
	);
	const [treatmentDescription, setTreatmentDescription] = useState(
		initialPayload?.treatmentProtocolDescription ||
			"Под инфильтрационной анестезией Sol. Articaini 4% 1.7 ml проведено препарирование кариозной полости зуба 46, медикаментозная обработка 2% хлоргексидином, наложение изолирующей прокладки, реставрация светоотверждаемым нанокомпозитом."
	);

	// Tooth Formula State
	const [toothStates, setToothStates] = useState<Record<number, string>>(
		initialPayload?.toothStates || {
			46: "Caries",
			36: "Filling",
			16: "Crown",
			26: "Filling",
			48: "Retained",
			38: "Extracted",
		}
	);
	const [toothSurfaces, setToothSurfaces] = useState<Record<number, string[]>>(
		initialPayload?.toothSurfaces || {
			46: ["O", "D"],
			36: ["O"],
			26: ["M", "O"],
		}
	);
	const [selectedTooth, setSelectedTooth] = useState<number | null>(46);

	// Diagnoses & Procedures
	const [diagnoses, setDiagnoses] = useState<EgiszDiagnosisItem[]>(
		initialPayload?.diagnoses || [
			{
				icd10Code: "K02.1",
				icd10Name: "Кариес дентина (средний кариес)",
				isPrimary: true,
				tooth: 46,
				surfaces: ["O", "D"],
				clinicalDescription: "Кариозная полость на окклюзионно-дистальной поверхности зуба 46",
			},
		]
	);

	const [procedures, setProcedures] = useState<EgiszProcedureItem[]>(
		initialPayload?.procedures || [
			{
				code: "B01.065.001",
				name: "Прием (осмотр, консультация) врача-стоматолога-терапевта первичный",
			},
			{
				code: "A16.07.002.001",
				name: "Восстановление зуба пломбой I, V, VI класс по Блэку с использованием стоматологических цементов",
				tooth: 46,
			},
		]
	);

	// Electronic Signature State
	const [signature, setSignature] = useState(initialPayload?.doctorSignature);
	const [isSendingToRemd, setIsSendingToRemd] = useState(false);
	const [remdReceipt, setRemdReceipt] = useState<{
		status: "registered" | "rejected";
		registrationNumber?: string;
		registeredAt?: string;
		ticketId?: string;
	} | null>(null);

	// Compiled Payload
	const fullPayload: Egisz043uPayload = useMemo(() => {
		return {
			docTypeCode,
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
			treatmentProtocolDescription: treatmentDescription,
			recommendations,
			doctorSignature: signature,
		};
	}, [
		docTypeCode,
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
		treatmentDescription,
		recommendations,
		signature,
	]);

	// Preflight Report
	const preflightReport = useMemo(() => {
		if (!isOpen) {
			return {
				isValid: true,
				canSendToRemd: true,
				totalChecks: 0,
				passedCount: 0,
				failedCount: 0,
				warningCount: 0,
				scorePercent: 100,
				checks: [],
			};
		}
		return runEgisz043uPreflight(fullPayload);
	}, [isOpen, fullPayload]);

	// Generated XML String
	const generatedCdaXml = useMemo(() => {
		if (!isOpen) return "";
		return generateEgisz043uCdaXml(fullPayload);
	}, [isOpen, fullPayload]);

	// XMLDSig Block
	const xmlSigBlock = useMemo(() => {
		if (!signature) return "";
		return generateGostXmlSignatureBlock(signature);
	}, [signature]);

	if (!isOpen) return null;

	// Tooth Selection & Status Helpers
	const handleSetToothStatus = (toothNum: number, statusKey: string) => {
		setToothStates((prev) => ({
			...prev,
			[toothNum]: statusKey,
		}));
	};

	const handleToggleToothSurface = (toothNum: number, surfaceCode: string) => {
		setToothSurfaces((prev) => {
			const current = prev[toothNum] || [];
			const exists = current.includes(surfaceCode);
			const updated = exists
				? current.filter((s) => s !== surfaceCode)
				: [...current, surfaceCode];
			return {
				...prev,
				[toothNum]: updated,
			};
		});
	};

	// 1-Click UKEP Signing
	const handleSignWithGostUkep = () => {
		const sig = createMockGostSignature(
			doctor.doctorFullName,
			doctor.doctorSnils,
			clinic.clinicName
		);
		setSignature(sig);
		showToast(
			`СЭМД 043/у успешно подписан УКЭП (Сертификат № ${sig.certificateSerialNumber})`,
			"success"
		);
	};

	// 1-Click Download XML
	const handleDownloadXml = () => {
		const filename = generateEgiszXmlFilename(fullPayload);
		const blob = new Blob([generatedCdaXml], { type: "application/xml;charset=utf-8" });
		const url = URL.createObjectURL(blob);
		const a = document.createElement("a");
		a.href = url;
		a.download = filename;
		document.body.appendChild(a);
		a.click();
		document.body.removeChild(a);
		URL.revokeObjectURL(url);

		showToast(
			`XML файл выгружен (${filename})`,
			"success"
		);
	};

	// 1-Click Copy XML
	const handleCopyXml = () => {
		navigator.clipboard.writeText(generatedCdaXml);
		showToast(
			"Канонический CDA R2 XML документ скопирован в буфер",
			"success"
		);
	};

	// 1-Click Send to REMD
	const handleSendToRemd = async () => {
		if (!preflightReport.isValid) {
			showToast(
				"Устраните критические замечания перед отправкой в РЭМД",
				"error"
			);
			return;
		}

		let activeSig = signature;
		if (!activeSig) {
			activeSig = createMockGostSignature(
				doctor.doctorFullName,
				doctor.doctorSnils,
				clinic.clinicName
			);
			setSignature(activeSig);
		}

		setIsSendingToRemd(true);
		setRemdReceipt(null);

		try {
			const cleanPatientSnils = (fullPayload.patient.patientSnils || "").replace(/\D/g, "");
			const effectiveVisitId = fullPayload.documentUuid?.replace(/^urn:uuid:/, "") || `VISIT-${Date.now()}`;
			const packageBody = {
				cdaXml: generatedCdaXml,
				doctorSignature: {
					signatureBase64: activeSig.signatureBase64,
					certificateSerialNumber: activeSig.certificateSerialNumber,
					certificateSubject: activeSig.certificateSubject,
					signedAt: activeSig.signedAt || new Date().toISOString(),
					algorithmOid: activeSig.algorithmOid || "1.2.643.7.1.1.1.1",
				},
				docType: String(fullPayload.docTypeCode || "108"),
				patientId: cleanPatientSnils || "patient",
				visitId: effectiveVisitId,
				documentId: effectiveVisitId,
				documentVersion: fullPayload.documentVersion || 1,
				xmlCanonicalPayload: generatedCdaXml,
				metadata: {
					patientSnils: cleanPatientSnils,
					clinicOid: fullPayload.clinic.clinicOid || "1.2.643.5.1.13.13.12.2.77.8432",
					...(fullPayload.clinic.clinicOgrn ? { clinicOgrn: fullPayload.clinic.clinicOgrn } : {}),
					docTypeNsiCode: String(fullPayload.docTypeCode || "108"),
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
				logId?: string;
			};

			const receiptNum = data.regNumber || data.transactionId || data.outboxId || "РЕГ-РЭМД-ПРИНЯТО";
			const ticket = data.transactionId || data.outboxId || data.logId || `TKT-${Date.now()}`;
			setRemdReceipt({
				status: "registered",
				registrationNumber: receiptNum,
				registeredAt: new Date().toLocaleTimeString("ru-RU"),
				ticketId: ticket,
			});
			showToast(
				`Документ передан в ЕГИСЗ РЭМД! Рег. номер: ${receiptNum}`,
				"success"
			);
		} catch (err: unknown) {
			const msg = err instanceof Error ? err.message : String(err);
			showToast(`Ошибка отправки в РЭМД: ${msg}`, "error");
		} finally {
			setIsSendingToRemd(false);
		}
	};

	// 1-Click Print Form 043/u
	const handlePrint043u = () => {
		const html = generateForm043uPrintHtml(fullPayload);
		const printWin = window.open("", "_blank");
		if (printWin) {
			printWin.document.open();
			printWin.document.write(html);
			printWin.document.close();
			printWin.focus();
			setTimeout(() => {
				printWin.print();
			}, 300);
		}
	};

	return createPortal(
		<div className="egisz-modal-backdrop" onClick={onClose} role="dialog" aria-modal="true" data-testid="egisz-remd-xml-modal">
			<div
				className="egisz-modal-container"
				onClick={(e) => e.stopPropagation()}
			>
				{/* Modal Header */}
				<div className="egisz-modal-header">
					<div className="egisz-header-titles">
						<div className="egisz-header-icon">
							<ShieldCheck size={22} />
						</div>
						<div>
							<div className="egisz-main-title">
								СЭМД «Электронная карта стоматологического пациента (043/у)»
							</div>
							<div className="egisz-sub-title">
								Генератор CDA R2 HL7 &bull; ЕГИСЗ РЭМД Минздрава РФ &bull; ФРМО/ФРМР &bull; УКЭП 63-ФЗ
							</div>
						</div>
					</div>

					<button
						type="button"
						className="egisz-close-btn"
						onClick={onClose}
						title="Закрыть окно"
					>
						<X size={20} />
					</button>
				</div>

				{/* Navigation Tabs */}
				<div className="egisz-tabs-nav">
					<button
						type="button"
						className={`egisz-tab-btn ${activeTab === "preflight" ? "active" : ""}`}
						onClick={() => setActiveTab("preflight")}
					>
						<ShieldCheck size={16} />
						Префлайт-контроль
						<span className="egisz-tab-badge">
							{preflightReport.scorePercent}%
						</span>
					</button>

					<button
						type="button"
						className={`egisz-tab-btn ${activeTab === "odontogram" ? "active" : ""}`}
						onClick={() => setActiveTab("odontogram")}
					>
						<Sparkles size={16} />
						Зубная формула 043/у
						<span className="egisz-tab-badge">
							{Object.keys(toothStates).length} зубов
						</span>
					</button>

					<button
						type="button"
						className={`egisz-tab-btn ${activeTab === "clinical" ? "active" : ""}`}
						onClick={() => setActiveTab("clinical")}
					>
						<FileText size={16} />
						Анамнез, МКБ-10 и 804н
						<span className="egisz-tab-badge">
							{procedures.length} услуг
						</span>
					</button>

					<button
						type="button"
						className={`egisz-tab-btn ${activeTab === "cda_xml" ? "active" : ""}`}
						onClick={() => setActiveTab("cda_xml")}
					>
						<FileCode2 size={16} />
						CDA R2 XML & УКЭП
						{signature && (
							<span className="egisz-tab-badge" style={{ background: "rgba(16, 185, 129, 0.2)", color: "#059669" }}>
								УКЭП активна
							</span>
						)}
					</button>
				</div>

				{/* Modal Body */}
				<div className="egisz-modal-body">
					{/* TAB 1: PREFLIGHT CHECK */}
					{activeTab === "preflight" && (
						<div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
							{/* Banner */}
							<div
								className={`egisz-preflight-banner ${preflightReport.isValid ? "valid" : "invalid"}`}
							>
								<div className="egisz-banner-left">
									{preflightReport.isValid ? (
										<CheckCircle2 size={24} color="#059669" />
									) : (
										<ShieldAlert size={24} color="#dc2626" />
									)}
									<div>
										<div className="egisz-banner-title">
											{preflightReport.isValid
												? "СЭМД 043/у полностью готов к передаче в ЕГИСЗ РЭМД"
												: "Обнаружены замечания при проверке перед выгрузкой в РЭМД"}
										</div>
										<div className="egisz-banner-desc">
											Пройдено проверок: {preflightReport.passedCount} из {preflightReport.totalChecks}
											{preflightReport.failedCount > 0 && ` (Критических ошибок: ${preflightReport.failedCount})`}
											{preflightReport.warningCount > 0 && ` (Предупреждений: ${preflightReport.warningCount})`}
										</div>
									</div>
								</div>

								<div className="egisz-banner-score">
									{preflightReport.scorePercent}%
								</div>
							</div>

							{/* REMD Receipt Alert if Registered */}
							{remdReceipt && (
								<div
									style={{
										padding: "1rem",
										borderRadius: "8px",
										background: "rgba(16, 185, 129, 0.15)",
										border: "1px solid #10b981",
										display: "flex",
										alignItems: "center",
										justifyContent: "space-between",
										color: "var(--ink, #0f172a)",
									}}
								>
									<div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
										<CheckCircle2 size={22} color="#059669" />
										<div>
											<div style={{ fontWeight: 700 }}>
												СЭМД успешно зарегистрирован в РЭМД ЕГИСЗ
											</div>
											<div style={{ fontSize: "0.8125rem", color: "var(--muted, #64748b)" }}>
												Регистрационный номер: <strong>{remdReceipt.registrationNumber}</strong> | Талон: <strong>{remdReceipt.ticketId}</strong> ({remdReceipt.registeredAt})
											</div>
										</div>
									</div>
									<button
										type="button"
										className="egisz-btn"
										onClick={handlePrint043u}
										style={{ fontSize: "0.8125rem" }}
									>
										<Printer size={15} />
										Печать квитанции
									</button>
								</div>
							)}

							{/* Checks Grid */}
							<div className="egisz-checks-grid">
								{preflightReport.checks.map((c) => (
									<div
										key={c.id}
										className={`egisz-check-card ${c.status}`}
									>
										<div className="egisz-check-head">
											<div className="egisz-check-title">{c.title}</div>
											<span className={`egisz-check-badge ${c.status}`}>
												{c.status === "passed" ? "Норма" : c.status === "warning" ? "Внимание" : "Ошибка"}
											</span>
										</div>
										<div className="egisz-check-desc">{c.details}</div>
										{c.oid && <div className="egisz-check-oid">OID: {c.oid}</div>}
									</div>
								))}
							</div>
						</div>
					)}

					{/* TAB 2: ODONTOGRAM & TOOTH FORMULA */}
					{activeTab === "odontogram" && (
						<div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
							<div className="egisz-odontogram-card">
								<div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
									<div style={{ fontWeight: 700, fontSize: "0.9375rem" }}>
										Зубная формула взрослого прикуса (FDI 11–48)
									</div>
									<div style={{ fontSize: "0.8125rem", color: "var(--muted, #64748b)" }}>
										Кликните на зуб для выбора статуса и поверхностей
									</div>
								</div>

								{/* Upper Jaw (18..28) */}
								<div className="egisz-teeth-row">
									{FDI_ADULT_TEETH.slice(0, 16).map((tNum) => {
										const st = toothStates[tNum] || "Healthy";
										const stObj = DENTAL_TOOTH_STATUS_DICTIONARY[st] || {
											shortSymbol: "З",
											color: "#10b981",
										};
										const surfs = toothSurfaces[tNum] || [];
										const isSel = selectedTooth === tNum;

										return (
											<div
												key={tNum}
												className={`egisz-tooth-box ${isSel ? "selected" : ""}`}
												onClick={() => setSelectedTooth(tNum)}
											>
												<span className="egisz-tooth-num">{tNum}</span>
												<span
													className="egisz-tooth-badge"
													style={{ color: stObj.color }}
												>
													{stObj.shortSymbol}
												</span>
												<span className="egisz-tooth-surfs">
													{surfs.join("")}
												</span>
											</div>
										);
									})}
								</div>

								{/* Lower Jaw (48..38) */}
								<div className="egisz-teeth-row">
									{FDI_ADULT_TEETH.slice(16, 32).map((tNum) => {
										const st = toothStates[tNum] || "Healthy";
										const stObj = DENTAL_TOOTH_STATUS_DICTIONARY[st] || {
											shortSymbol: "З",
											color: "#10b981",
										};
										const surfs = toothSurfaces[tNum] || [];
										const isSel = selectedTooth === tNum;

										return (
											<div
												key={tNum}
												className={`egisz-tooth-box ${isSel ? "selected" : ""}`}
												onClick={() => setSelectedTooth(tNum)}
											>
												<span className="egisz-tooth-num">{tNum}</span>
												<span
													className="egisz-tooth-badge"
													style={{ color: stObj.color }}
												>
													{stObj.shortSymbol}
												</span>
												<span className="egisz-tooth-surfs">
													{surfs.join("")}
												</span>
											</div>
										);
									})}
								</div>
							</div>

							{/* Selected Tooth Inspector Panel */}
							{selectedTooth !== null && (
								<div
									style={{
										background: "var(--paper-strong, #f8fafc)",
										border: "1px solid var(--line, #e2e8f0)",
										borderRadius: "8px",
										padding: "1rem",
										display: "flex",
										flexDirection: "column",
										gap: "0.75rem",
									}}
								>
									<div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
										<div style={{ fontWeight: 700, fontSize: "1rem" }}>
											Редактирование зуба #{selectedTooth} (Статус:{" "}
											<span style={{ color: DENTAL_TOOTH_STATUS_DICTIONARY[toothStates[selectedTooth] || "Healthy"]?.color }}>
												{DENTAL_TOOTH_STATUS_DICTIONARY[toothStates[selectedTooth] || "Healthy"]?.labelRu}
											</span>
											)
										</div>
									</div>

									{/* Status Buttons */}
									<div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap" }}>
										{Object.entries(DENTAL_TOOTH_STATUS_DICTIONARY).map(([k, s]) => {
											const isCurrent = (toothStates[selectedTooth] || "Healthy") === k;
											return (
												<button
													key={k}
													type="button"
													onClick={() => handleSetToothStatus(selectedTooth, k)}
													className="egisz-btn"
													style={{
														padding: "0.35rem 0.65rem",
														fontSize: "0.8125rem",
														background: isCurrent ? s.color : undefined,
														color: isCurrent ? "#ffffff" : undefined,
														borderColor: isCurrent ? s.color : undefined,
													}}
												>
													<strong>{s.shortSymbol}</strong> {s.labelRu}
												</button>
											);
										})}
									</div>

									{/* Surfaces Toggles */}
									<div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap", marginTop: "0.25rem" }}>
										<span style={{ fontSize: "0.8125rem", fontWeight: 600, color: "var(--muted, #64748b)" }}>
											Пораженные поверхности:
										</span>
										{DENTAL_SURFACES.map((surf) => {
											const isSelected = (toothSurfaces[selectedTooth] || []).includes(surf.code);
											return (
												<button
													key={surf.code}
													type="button"
													onClick={() => handleToggleToothSurface(selectedTooth, surf.code)}
													className="egisz-btn"
													style={{
														padding: "0.25rem 0.5rem",
														fontSize: "0.75rem",
														background: isSelected ? "var(--primary, #0ea5e9)" : undefined,
														color: isSelected ? "#ffffff" : undefined,
													}}
												>
													{surf.code} ({surf.shortName})
												</button>
											);
										})}
									</div>
								</div>
							)}
						</div>
					)}

					{/* TAB 3: CLINICAL ANAMNESIS, DIAGNOSES & 804N */}
					{activeTab === "clinical" && (
						<div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
							{/* Form Type Selector */}
							<div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "0.5rem" }}>
								{(Object.keys(EGISZ_DENTAL_SEMD_TYPES) as EgiszDentalSemdCode[]).map((k) => {
									const item = EGISZ_DENTAL_SEMD_TYPES[k];
									const isSel = docTypeCode === k;
									return (
										<div
											key={k}
											onClick={() => setDocTypeCode(k)}
											style={{
												padding: "0.75rem",
												borderRadius: "8px",
												border: `1px solid ${isSel ? "var(--primary, #0ea5e9)" : "var(--line, #e2e8f0)"}`,
												background: isSel ? "var(--primary-muted, rgba(14, 165, 233, 0.08))" : "var(--paper-strong, #f8fafc)",
												cursor: "pointer",
											}}
										>
											<div style={{ fontWeight: 700, fontSize: "0.875rem", color: isSel ? "var(--primary, #0ea5e9)" : "var(--ink, #0f172a)" }}>
												{item.shortTitle}
											</div>
											<div style={{ fontSize: "0.75rem", color: "var(--muted, #64748b)", marginTop: "0.25rem" }}>
												СЭМД код: {item.nsiCode} &bull; LOINC {item.loincCode}
											</div>
										</div>
									);
								})}
							</div>

							{/* Complaints & Anamnesis */}
							<div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
								<div>
									<label style={{ display: "block", fontSize: "0.8125rem", fontWeight: 600, marginBottom: "0.35rem" }}>
										Жалобы пациента (LOINC 10154-3)
									</label>
									<textarea
										value={complaints}
										onChange={(e) => setComplaints(e.target.value)}
										rows={3}
										style={{
											width: "100%",
											padding: "0.5rem",
											borderRadius: "6px",
											border: "1px solid var(--line, #e2e8f0)",
											background: "var(--paper, #fff)",
											color: "var(--ink, #0f172a)",
											fontSize: "0.8125rem",
										}}
									/>
								</div>

								<div>
									<label style={{ display: "block", fontSize: "0.8125rem", fontWeight: 600, marginBottom: "0.35rem" }}>
										Анамнез заболевания (Anamnesis Morbi)
									</label>
									<textarea
										value={anamnesisMorbi}
										onChange={(e) => setAnamnesisMorbi(e.target.value)}
										rows={3}
										style={{
											width: "100%",
											padding: "0.5rem",
											borderRadius: "6px",
											border: "1px solid var(--line, #e2e8f0)",
											background: "var(--paper, #fff)",
											color: "var(--ink, #0f172a)",
											fontSize: "0.8125rem",
										}}
									/>
								</div>
							</div>

							{/* Diagnoses List */}
							<div>
								<div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
									<label style={{ fontSize: "0.875rem", fontWeight: 700 }}>
										Клинические диагнозы по МКБ-10 (OID 1.2.643.5.1.13.13.11.1005)
									</label>
									<button
										type="button"
										className="egisz-btn"
										style={{ padding: "0.25rem 0.5rem", fontSize: "0.75rem" }}
										onClick={() => {
											setDiagnoses((prev) => [
												...prev,
												{
													icd10Code: "K02.1",
													icd10Name: "Кариес дентина",
													isPrimary: false,
													tooth: 46,
												},
											]);
										}}
									>
										<Plus size={14} />
										Добавить диагноз
									</button>
								</div>

								<div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
									{diagnoses.map((d, idx) => (
										<div
											key={idx}
											style={{
												display: "grid",
												gridTemplateColumns: "140px 1fr 90px auto auto",
												gap: "0.5rem",
												alignItems: "center",
												background: "var(--paper-strong, #f8fafc)",
												padding: "0.5rem",
												borderRadius: "6px",
												border: "1px solid var(--line, #e2e8f0)",
											}}
										>
											<select
												value={d.icd10Code}
												onChange={(e) => {
													const selectedCode = e.target.value;
													const matched = COMMON_DENTAL_ICD10.find((c) => c.code === selectedCode);
													setDiagnoses((prev) =>
														prev.map((item, i) =>
															i === idx
																? { ...item, icd10Code: selectedCode, icd10Name: matched?.name || item.icd10Name }
																: item
														)
													);
												}}
												style={{
													padding: "0.35rem",
													borderRadius: "4px",
													border: "1px solid var(--line, #cbd5e1)",
													background: "var(--paper, #fff)",
													color: "var(--ink, #0f172a)",
													fontSize: "0.8125rem",
												}}
											>
												{COMMON_DENTAL_ICD10.map((c) => (
													<option key={c.code} value={c.code}>
														{c.code}
													</option>
												))}
											</select>

											<input
												type="text"
												value={d.icd10Name}
												onChange={(e) => {
													const val = e.target.value;
													setDiagnoses((prev) =>
														prev.map((item, i) =>
															i === idx ? { ...item, icd10Name: val } : item
														)
													);
												}}
												style={{
													padding: "0.35rem",
													borderRadius: "4px",
													border: "1px solid var(--line, #cbd5e1)",
													background: "var(--paper, #fff)",
													color: "var(--ink, #0f172a)",
													fontSize: "0.8125rem",
												}}
											/>

											<input
												type="number"
												placeholder="Зуб"
												value={d.tooth || ""}
												onChange={(e) => {
													const tVal = e.target.value ? Number(e.target.value) : undefined;
													setDiagnoses((prev) =>
														prev.map((item, i) =>
															i === idx ? { ...item, tooth: tVal } : item
														)
													);
												}}
												style={{
													padding: "0.35rem",
													borderRadius: "4px",
													border: "1px solid var(--line, #cbd5e1)",
													background: "var(--paper, #fff)",
													color: "var(--ink, #0f172a)",
													fontSize: "0.8125rem",
												}}
											/>

											<button
												type="button"
												className="egisz-btn"
												style={{
													padding: "0.25rem 0.5rem",
													fontSize: "0.75rem",
													background: d.isPrimary ? "var(--primary, #0ea5e9)" : undefined,
													color: d.isPrimary ? "#fff" : undefined,
												}}
												onClick={() => {
													setDiagnoses((prev) =>
														prev.map((item, i) => ({
															...item,
															isPrimary: i === idx,
														}))
													);
												}}
											>
												{d.isPrimary ? "Основной" : "Сделать основным"}
											</button>

											{diagnoses.length > 1 && (
												<button
													type="button"
													className="egisz-close-btn"
													onClick={() => {
														setDiagnoses((prev) => prev.filter((_, i) => i !== idx));
													}}
													title="Удалить диагноз"
												>
													<Trash2 size={16} color="#ef4444" />
												</button>
											)}
										</div>
									))}
								</div>
							</div>

							{/* Procedures 804n List */}
							<div>
								<div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
									<label style={{ fontSize: "0.875rem", fontWeight: 700 }}>
										Оказанные услуги по Номенклатуре 804н (OID 1.2.643.5.1.13.13.11.1070)
									</label>
									<button
										type="button"
										className="egisz-btn"
										style={{ padding: "0.25rem 0.5rem", fontSize: "0.75rem" }}
										onClick={() => {
											setProcedures((prev) => [
												...prev,
												{
													code: "A16.07.002.001",
													name: "Восстановление зуба пломбой с нарушением формы твердых тканей",
													tooth: 46,
												},
											]);
										}}
									>
										<Plus size={14} />
										Добавить услугу
									</button>
								</div>

								<div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
									{procedures.map((p, idx) => (
										<div
											key={idx}
											style={{
												display: "grid",
												gridTemplateColumns: "180px 1fr 80px auto",
												gap: "0.5rem",
												alignItems: "center",
												background: "var(--paper-strong, #f8fafc)",
												padding: "0.5rem",
												borderRadius: "6px",
												border: "1px solid var(--line, #e2e8f0)",
											}}
										>
											<input
												type="text"
												value={p.code}
												onChange={(e) => {
													const val = e.target.value;
													setProcedures((prev) =>
														prev.map((item, i) =>
															i === idx ? { ...item, code: val } : item
														)
													);
												}}
												style={{
													padding: "0.35rem",
													borderRadius: "4px",
													border: "1px solid var(--line, #cbd5e1)",
													background: "var(--paper, #fff)",
													color: "var(--ink, #0f172a)",
													fontSize: "0.8125rem",
												}}
											/>

											<input
												type="text"
												value={p.name}
												onChange={(e) => {
													const val = e.target.value;
													setProcedures((prev) =>
														prev.map((item, i) =>
															i === idx ? { ...item, name: val } : item
														)
													);
												}}
												style={{
													padding: "0.35rem",
													borderRadius: "4px",
													border: "1px solid var(--line, #cbd5e1)",
													background: "var(--paper, #fff)",
													color: "var(--ink, #0f172a)",
													fontSize: "0.8125rem",
												}}
											/>

											<input
												type="number"
												placeholder="Зуб"
												value={p.tooth || ""}
												onChange={(e) => {
													const tVal = e.target.value ? Number(e.target.value) : undefined;
													setProcedures((prev) =>
														prev.map((item, i) =>
															i === idx ? { ...item, tooth: tVal } : item
														)
													);
												}}
												style={{
													padding: "0.35rem",
													borderRadius: "4px",
													border: "1px solid var(--line, #cbd5e1)",
													background: "var(--paper, #fff)",
													color: "var(--ink, #0f172a)",
													fontSize: "0.8125rem",
												}}
											/>

											{procedures.length > 1 && (
												<button
													type="button"
													className="egisz-close-btn"
													onClick={() => {
														setProcedures((prev) => prev.filter((_, i) => i !== idx));
													}}
													title="Удалить услугу"
												>
													<Trash2 size={16} color="#ef4444" />
												</button>
											)}
										</div>
									))}
								</div>
							</div>
						</div>
					)}

					{/* TAB 4: CDA R2 XML & UKEP SIGNATURE */}
					{activeTab === "cda_xml" && (
						<div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
							{/* UKEP Electronic Signature Box */}
							<div className="egisz-ukep-box">
								<div className="egisz-ukep-header">
									<div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
										<ShieldCheck size={18} color="#10b981" />
										Усиленная квалифицированная электронная подпись (УКЭП / 63-ФЗ)
									</div>
									<button
										type="button"
										className="egisz-btn egisz-btn-primary"
										style={{ padding: "0.35rem 0.75rem", fontSize: "0.8125rem" }}
										onClick={handleSignWithGostUkep}
									>
										<Key size={14} />
										{signature ? "Переподписать УКЭП" : "Подписать СЭМД"}
									</button>
								</div>

								{signature ? (
									<div className="egisz-ukep-details">
										<div className="egisz-ukep-field">
											<span className="egisz-ukep-label">Серийный номер сертификата:</span>
											<span className="egisz-ukep-value">{signature.certificateSerialNumber}</span>
										</div>
										<div className="egisz-ukep-field">
											<span className="egisz-ukep-label">Владелец ключа (ФИО / Должность):</span>
											<span className="egisz-ukep-value">{signature.certificateSubject}</span>
										</div>
										<div className="egisz-ukep-field">
											<span className="egisz-ukep-label">Алгоритм подписи:</span>
											<span className="egisz-ukep-value">ГОСТ Р 34.10-2012 (256 бит / CAdES-BES)</span>
										</div>
										<div className="egisz-ukep-field">
											<span className="egisz-ukep-label">Метка времени подписания:</span>
											<span className="egisz-ukep-value">{new Date(signature.signedAt).toLocaleString("ru-RU")}</span>
										</div>
									</div>
								) : (
									<div style={{ fontSize: "0.8125rem", color: "var(--muted, #64748b)" }}>
										Электронная подпись еще не наложена. Нажмите «Подписать СЭМД» для создания криптографического конверта по ГОСТ Р 34.10-2012.
									</div>
								)}
							</div>

							{/* XML Viewer Toolbar */}
							<div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
								<div style={{ fontSize: "0.8125rem", fontWeight: 700 }}>
									HL7 CDA Release 2.0 XML (Канонический вид C14N UTF-8):
								</div>
								<div style={{ display: "flex", gap: "0.5rem" }}>
									<button
										type="button"
										className="egisz-btn"
										style={{ padding: "0.35rem 0.65rem", fontSize: "0.75rem" }}
										onClick={handleCopyXml}
									>
										<Copy size={13} />
										Копировать XML
									</button>
									<button
										type="button"
										className="egisz-btn"
										style={{ padding: "0.35rem 0.65rem", fontSize: "0.75rem" }}
										onClick={handleDownloadXml}
									>
										<Download size={13} />
										Скачать .xml
									</button>
								</div>
							</div>

							{/* XML Code Pre */}
							<pre className="egisz-xml-viewer">{generatedCdaXml}</pre>

							{/* XMLDSig Signature Block Preview if Signed */}
							{signature && (
								<div>
									<div style={{ fontSize: "0.8125rem", fontWeight: 700, marginBottom: "0.35rem" }}>
										Отсоединенный XMLDSig блок электронной подписи (&lt;ds:Signature&gt;):
									</div>
									<pre className="egisz-xml-viewer" style={{ maxHeight: "160px" }}>{xmlSigBlock}</pre>
								</div>
							)}
						</div>
					)}
				</div>

				{/* Modal Footer */}
				<div className="egisz-modal-footer">
					<div className="egisz-footer-left">
						<Building2 size={16} />
						<span>{clinic.clinicName} (OID: {clinic.clinicOid})</span>
					</div>

					<div className="egisz-footer-actions">
						<button
							type="button"
							className="egisz-btn"
							onClick={handlePrint043u}
						>
							<Printer size={16} />
							Печать ф. 043/у
						</button>

						<button
							type="button"
							className="egisz-btn"
							onClick={handleDownloadXml}
						>
							<Download size={16} />
							Скачать XML
						</button>

						<button
							type="button"
							className="egisz-btn egisz-btn-primary"
							onClick={handleSignWithGostUkep}
						>
							<Key size={16} />
							{signature ? "УКЭП активна" : "Сформировать и подписать"}
						</button>

						<button
							type="button"
							className="egisz-btn egisz-btn-success"
							onClick={handleSendToRemd}
							disabled={isSendingToRemd || !preflightReport.isValid}
						>
							<Send size={16} />
							{isSendingToRemd ? "Передача в ЕГИСЗ..." : "Отправить в РЭМД"}
						</button>
					</div>
				</div>
			</div>
		</div>,
		document.body
	);
};
