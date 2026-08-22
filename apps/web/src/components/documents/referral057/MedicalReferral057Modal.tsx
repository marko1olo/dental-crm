/**
 * ═══════════════════════════════════════════════════════════════════════════
 * STATUTORY FORM 057/U-04 MEDICAL REFERRAL & ROUTING STUDIO MODAL
 * Приказ Минздравсоцразвития РФ от 22.11.2004 № 255
 * Форма № 057/у-04 «Направление на госпитализацию, восстановительное лечение,
 * обследование, консультацию»
 * ═══════════════════════════════════════════════════════════════════════════
 */

import {
	Activity,
	AlertCircle,
	Building2,
	Check,
	CheckCircle2,
	ChevronDown,
	Copy,
	Download,
	FileBadge,
	FileCheck,
	FileSpreadsheet,
	FileText,
	HeartPulse,
	Layers,
	Plus,
	Printer,
	QrCode,
	RotateCcw,
	Search,
	ShieldCheck,
	Sparkles,
	Stethoscope,
	Trash2,
	User,
	UserCheck,
	X,
	ZoomIn,
	ZoomOut,
} from "lucide-react";
import React, { useCallback, useId, useMemo, useState } from "react";
import {
	createDefaultReferral057Document,
	downloadReferralFile,
	exportReferralToJson,
	generateCode128Svg,
	generateDataMatrixSvg,
	renderStatutoryForm057uHtml,
	validateReferral057Document,
	type CreateReferral057Options,
	type Referral057ClinicalData,
	type Referral057DiagnosticTestRecord,
	type Referral057Document,
	type Referral057PatientData,
	type Referral057ReceivingInstitutionData,
	type Referral057SendingClinicData,
	type Referral057SignaturesData,
} from "./referral057Engine";
import {
	DEFAULT_DIAGNOSTIC_TESTS,
	PARTNER_HOSPITALS_CATALOG,
	REFERRAL_057_PROFILES,
	getPartnerHospitalPreset,
	getPaymentSourceLabelRu,
	getPurposeLabelRu,
	getReferralProfileDefinition,
	getUrgencyLabelRu,
	type Icd10DiagnosticTemplate,
	type Referral057ClinicalProfileId,
	type Referral057PaymentSource,
	type Referral057Purpose,
	type Referral057Urgency,
} from "./referral057Presets";
import "./referral057.css";

export interface MedicalReferral057ModalProps {
	readonly isOpen: boolean;
	readonly onClose: () => void;
	readonly patient?: Partial<Referral057PatientData> | undefined;
	readonly clinic?: Partial<Referral057SendingClinicData> | undefined;
	readonly receivingOrg?: Partial<Referral057ReceivingInstitutionData> | undefined;
	readonly initialProfile?: Referral057ClinicalProfileId | undefined;
	readonly initialIcd10Code?: string | undefined;
	readonly initialDiagnosisText?: string | undefined;
	readonly onSaveReferral?: ((doc: Referral057Document) => void) | undefined;
}

export type StudioTabKey = "routing" | "patient" | "diagnosis" | "tests" | "signatures";

export const MedicalReferral057Modal: React.FC<MedicalReferral057ModalProps> = ({
	isOpen,
	onClose,
	patient: incomingPatient,
	clinic: incomingClinic,
	receivingOrg: incomingReceivingOrg,
	initialProfile = "hospitalization_cmfs",
	initialIcd10Code,
	initialDiagnosisText,
	onSaveReferral,
}) => {
	// Active Tab State
	const [activeTab, setActiveTab] = useState<StudioTabKey>("routing");
	const [zoomLevel, setZoomLevel] = useState<number>(100);
	const [copyNotification, setCopyNotification] = useState<boolean>(false);

	// Initial Document Construction
	const [docState, setDocState] = useState<Referral057Document>(() => {
		return createDefaultReferral057Document({
			profileId: initialProfile,
			...(incomingPatient ? { patient: incomingPatient } : {}),
			...(incomingClinic ? { clinic: incomingClinic } : {}),
			...(incomingReceivingOrg ? { receivingOrg: incomingReceivingOrg } : {}),
			clinical: {
				...(initialIcd10Code ? { primaryIcd10Code: initialIcd10Code } : {}),
				...(initialDiagnosisText ? { primaryDiagnosisText: initialDiagnosisText } : {}),
			},
		});
	});

	// Active Profile definition
	const currentProfileDef = useMemo(() => {
		return getReferralProfileDefinition(docState.clinical.profileId);
	}, [docState.clinical.profileId]);

	// Validation calculation
	const validationResult = useMemo(() => {
		return validateReferral057Document(docState);
	}, [docState]);

	// Switch profile and auto-populate defaults
	const handleSelectProfile = (profileId: Referral057ClinicalProfileId) => {
		const newDef = getReferralProfileDefinition(profileId);
		const defaultHosp = getPartnerHospitalPreset(newDef.primaryPartnerHospitalId);
		const primaryTemplate = newDef.icd10Templates[0];

		// Load recommended tests for this profile
		const profileTests: Referral057DiagnosticTestRecord[] = DEFAULT_DIAGNOSTIC_TESTS
			.filter((t) => t.requiredForProfiles.includes(profileId))
			.map((t, idx) => ({
				id: `test-${idx + 1}`,
				testName: t.testName,
				testDate: docState.signatures.issueDate,
				testResult: t.defaultResult,
				isAbnormal: false,
			}));

		setDocState((prev) => {
			const updatedClinical: Referral057ClinicalData = {
				...prev.clinical,
				profileId,
				purpose: newDef.defaultPurpose,
				urgency: newDef.defaultUrgency,
				primaryIcd10Code: primaryTemplate?.code || "K01.1",
				primaryDiagnosisText: primaryTemplate?.detailedDiagnosisRu || prev.clinical.primaryDiagnosisText,
				clinicalJustification: primaryTemplate?.clinicalJustificationRu || newDef.defaultClinicalGoalRu,
				diagnosticTests: profileTests,
			};

			const updatedReceiving: Referral057ReceivingInstitutionData = {
				partnerHospitalId: defaultHosp.id,
				fullName: defaultHosp.fullName,
				departmentName: defaultHosp.departmentName,
				ogrn: defaultHosp.ogrn,
				address: defaultHosp.address,
				phone: defaultHosp.phone,
			};

			return {
				...prev,
				receivingOrg: updatedReceiving,
				clinical: updatedClinical,
			};
		});
	};

	// Switch Partner Hospital
	const handleSelectHospital = (hospId: string) => {
		const hosp = getPartnerHospitalPreset(hospId);
		setDocState((prev) => ({
			...prev,
			receivingOrg: {
				partnerHospitalId: hosp.id,
				fullName: hosp.fullName,
				departmentName: hosp.departmentName,
				ogrn: hosp.ogrn,
				address: hosp.address,
				phone: hosp.phone,
			},
		}));
	};

	// Apply Diagnostic Template
	const handleApplyIcd10Template = (tpl: Icd10DiagnosticTemplate) => {
		setDocState((prev) => ({
			...prev,
			clinical: {
				...prev.clinical,
				primaryIcd10Code: tpl.code,
				primaryDiagnosisText: tpl.detailedDiagnosisRu,
				clinicalJustification: tpl.clinicalJustificationRu,
				purpose: tpl.recommendedPurpose,
			},
		}));
	};

	// Add new Diagnostic Test Row
	const handleAddDiagnosticTest = () => {
		const newTest: Referral057DiagnosticTestRecord = {
			id: `test-${Date.now()}`,
			testName: "Общий анализ крови (ОАК с лейкоформулой)",
			testDate: docState.signatures.issueDate,
			testResult: "Показатели в пределах референсных значений",
			isAbnormal: false,
		};
		setDocState((prev) => ({
			...prev,
			clinical: {
				...prev.clinical,
				diagnosticTests: [...prev.clinical.diagnosticTests, newTest],
			},
		}));
	};

	// Update Diagnostic Test Row
	const handleUpdateDiagnosticTest = (
		index: number,
		field: keyof Referral057DiagnosticTestRecord,
		val: any,
	) => {
		setDocState((prev) => {
			const tests = [...prev.clinical.diagnosticTests];
			if (tests[index]) {
				tests[index] = { ...tests[index]!, [field]: val };
			}
			return {
				...prev,
				clinical: {
					...prev.clinical,
					diagnosticTests: tests,
				},
			};
		});
	};

	// Remove Diagnostic Test Row
	const handleRemoveDiagnosticTest = (index: number) => {
		setDocState((prev) => ({
			...prev,
			clinical: {
				...prev.clinical,
				diagnosticTests: prev.clinical.diagnosticTests.filter((_, i) => i !== index),
			},
		}));
	};

	// Copy Referral Summary Text
	const handleCopyText = async () => {
		const summary = `Направление № ${docState.referralNumber} от ${docState.signatures.issueDate} (Форма № 057/у-04)\nКуда: ${docState.receivingOrg.fullName} (${docState.receivingOrg.departmentName})\nПациент: ${docState.patient.fullName}, ${docState.patient.birthDate} г.р. (Полис ОМС: ${docState.patient.omsPolicyNumber})\nДиагноз: [${docState.clinical.primaryIcd10Code}] ${docState.clinical.primaryDiagnosisText}\nЦель: ${getPurposeLabelRu(docState.clinical.purpose)} (${getUrgencyLabelRu(docState.clinical.urgency)})\nОбоснование: ${docState.clinical.clinicalJustification}\nНаправивший врач: ${docState.signatures.attendingDoctorFullName}`;
		if (navigator.clipboard) {
			await navigator.clipboard.writeText(summary);
			setCopyNotification(true);
			setTimeout(() => setCopyNotification(false), 2500);
		}
	};

	// Print Action
	const handlePrint = () => {
		const html = renderStatutoryForm057uHtml(docState);
		const printWin = window.open("", "_blank", "width=900,height=800");
		if (printWin) {
			printWin.document.write(html);
			printWin.document.close();
			printWin.focus();
			setTimeout(() => {
				printWin.print();
			}, 300);
		} else {
			window.print();
		}
	};

	// Download A4 HTML file
	const handleDownloadHtml = () => {
		const html = renderStatutoryForm057uHtml(docState);
		const filename = `Referral_057u_${docState.referralNumber.replace(/\//g, "-")}_${docState.patient.fullName.replace(/\s+/g, "_")}.html`;
		downloadReferralFile(html, filename, "text/html;charset=utf-8");
	};

	// Download JSON
	const handleDownloadJson = () => {
		const json = exportReferralToJson(docState);
		const filename = `Referral_057u_${docState.referralNumber.replace(/\//g, "-")}.json`;
		downloadReferralFile(json, filename, "application/json;charset=utf-8");
	};

	// Save Referral
	const handleSave = () => {
		if (onSaveReferral) {
			onSaveReferral(docState);
		}
		onClose();
	};

	if (!isOpen) return null;

	return (
		<div className="ref057-modal-overlay" data-testid="referral-057-modal">
			<div className="ref057-modal-container">
				{/* ─── Top Header ────────────────────────────────────────── */}
				<header className="ref057-header">
					<div className="flex items-center gap-3">
						<div className="ref057-icon-badge">
							<FileText className="w-5 h-5" />
						</div>
						<div>
							<div className="flex items-center gap-2">
								<h2 className="text-base sm:text-lg font-bold text-[var(--ink,#0f172a)] dark:text-white leading-tight">
									Направление на госпитализацию и обследование (Форма № 057/у-04)
								</h2>
								<span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-teal-500/15 text-teal-600 dark:text-teal-400 border border-teal-500/30">
									Приказ МЗ РФ № 255
								</span>
							</div>
							<p className="text-xs text-[var(--muted,#64748b)]">
								№ {docState.referralNumber} • Пациент: <strong>{docState.patient.fullName}</strong> • Медкарта: {docState.patient.medicalCardNumber}
							</p>
						</div>
					</div>

					<div className="flex items-center gap-2">
						<button
							type="button"
							onClick={onClose}
							className="min-w-[44px] min-h-[44px] w-11 h-11 rounded-xl border border-[var(--line,#e2e8f0)] dark:border-[#334155] flex items-center justify-center text-[var(--muted,#64748b)] hover:text-[var(--ink,#0f172a)] dark:hover:text-white transition-colors cursor-pointer"
							aria-label="Закрыть модальное окно"
						>
							<X className="w-5 h-5" />
						</button>
					</div>
				</header>

				{/* ─── Main Body Split Grid ──────────────────────────────── */}
				<div className="ref057-body-grid">
					{/* Left Pane: Interactive Editor */}
					<div className="ref057-editor-pane">
						{/* 1-Click Profile Selector */}
						<div>
							<span className="ref057-label mb-2">
								Клинический профиль направления (1-клик переключение):
							</span>
							<div className="ref057-profile-selector">
								{REFERRAL_057_PROFILES.map((prof) => {
									const isActive = docState.clinical.profileId === prof.id;
									return (
										<button
											key={prof.id}
											type="button"
											onClick={() => handleSelectProfile(prof.id)}
											className={`ref057-profile-card ${isActive ? "active" : ""}`}
										>
											<span className="text-xs font-bold text-[var(--ink,#0f172a)] dark:text-white flex items-center justify-between">
												{prof.shortBadgeRu}
												{isActive && <Check className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />}
											</span>
											<span className="text-[11px] text-[var(--muted,#64748b)] line-clamp-1">
												{prof.targetSpecialtyRu}
											</span>
										</button>
									);
								})}
							</div>
						</div>

						{/* Tab Navigation */}
						<div className="ref057-tab-nav">
							<button
								type="button"
								onClick={() => setActiveTab("routing")}
								className={`ref057-tab-btn ${activeTab === "routing" ? "active" : ""}`}
							>
								<Building2 className="w-4 h-4" />
								1. Маршрутизация и МО
							</button>
							<button
								type="button"
								onClick={() => setActiveTab("patient")}
								className={`ref057-tab-btn ${activeTab === "patient" ? "active" : ""}`}
							>
								<User className="w-4 h-4" />
								2. Пациент и полис
							</button>
							<button
								type="button"
								onClick={() => setActiveTab("diagnosis")}
								className={`ref057-tab-btn ${activeTab === "diagnosis" ? "active" : ""}`}
							>
								<Stethoscope className="w-4 h-4" />
								3. Диагноз и МКБ-10
							</button>
							<button
								type="button"
								onClick={() => setActiveTab("tests")}
								className={`ref057-tab-btn ${activeTab === "tests" ? "active" : ""}`}
							>
								<Activity className="w-4 h-4" />
								4. Исследования ({docState.clinical.diagnosticTests.length})
							</button>
							<button
								type="button"
								onClick={() => setActiveTab("signatures")}
								className={`ref057-tab-btn ${activeTab === "signatures" ? "active" : ""}`}
							>
								<UserCheck className="w-4 h-4" />
								5. Подписи и ВК
							</button>
						</div>

						{/* ─── TAB 1: ROUTING & INSTITUTIONS ───────────────────── */}
						{activeTab === "routing" && (
							<div className="flex flex-col gap-3">
								<div className="ref057-form-section">
									<h4 className="text-xs font-bold uppercase tracking-wider text-[var(--muted,#64748b)]">
										Цель и параметры направления
									</h4>
									<div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
										<div>
											<label className="ref057-label mb-1">Цель направления:</label>
											<select
												value={docState.clinical.purpose}
												onChange={(e) =>
													setDocState((p) => ({
														...p,
														clinical: { ...p.clinical, purpose: e.target.value as Referral057Purpose },
													}))
												}
												className="ref057-select"
											>
												<option value="hospitalization">Госпитализация</option>
												<option value="examination">Обследование</option>
												<option value="consultation">Консультация</option>
												<option value="rehabilitation">Восстановительное лечение</option>
											</select>
										</div>

										<div>
											<label className="ref057-label mb-1">Срочность:</label>
											<select
												value={docState.clinical.urgency}
												onChange={(e) =>
													setDocState((p) => ({
														...p,
														clinical: { ...p.clinical, urgency: e.target.value as Referral057Urgency },
													}))
												}
												className="ref057-select"
											>
												<option value="routine">Плановое</option>
												<option value="urgent">Экстренное (неотложное)</option>
											</select>
										</div>

										<div>
											<label className="ref057-label mb-1">Финансирование:</label>
											<select
												value={docState.clinical.paymentSource}
												onChange={(e) =>
													setDocState((p) => ({
														...p,
														clinical: { ...p.clinical, paymentSource: e.target.value as Referral057PaymentSource },
													}))
												}
												className="ref057-select"
											>
												<option value="oms">ОМС (Обязательное)</option>
												<option value="dms">ДМС (Добровольное)</option>
												<option value="commercial">ПМУ (Платные услуги)</option>
											</select>
										</div>
									</div>
								</div>

								{/* Receiving Partner Institution */}
								<div className="ref057-form-section">
									<div className="flex items-center justify-between">
										<h4 className="text-xs font-bold uppercase tracking-wider text-[var(--muted,#64748b)]">
											Принимающая медицинская организация (п. 1 формы 057/у-04)
										</h4>
										<span className="text-[11px] text-teal-600 font-semibold">
											Реестр партнеров
										</span>
									</div>

									<div>
										<label className="ref057-label mb-1">Выбор из партнерской сети клиник:</label>
										<select
											value={docState.receivingOrg.partnerHospitalId}
											onChange={(e) => handleSelectHospital(e.target.value)}
											className="ref057-select font-semibold"
										>
											{PARTNER_HOSPITALS_CATALOG.map((h) => (
												<option key={h.id} value={h.id}>
													{h.shortName} — {h.departmentName}
												</option>
											))}
										</select>
									</div>

									<div>
										<label className="ref057-label mb-1">Полное официальное наименование принимающей МО:</label>
										<input
											type="text"
											value={docState.receivingOrg.fullName}
											onChange={(e) =>
												setDocState((p) => ({
													...p,
													receivingOrg: { ...p.receivingOrg, fullName: e.target.value },
												}))
											}
											className="ref057-input font-medium"
										/>
									</div>

									<div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
										<div>
											<label className="ref057-label mb-1">Отделение / Кабинет:</label>
											<input
												type="text"
												value={docState.receivingOrg.departmentName}
												onChange={(e) =>
													setDocState((p) => ({
														...p,
														receivingOrg: { ...p.receivingOrg, departmentName: e.target.value },
													}))
												}
												className="ref057-input"
											/>
										</div>
										<div>
											<label className="ref057-label mb-1">ОГРН принимающей МО:</label>
											<input
												type="text"
												value={docState.receivingOrg.ogrn}
												onChange={(e) =>
													setDocState((p) => ({
														...p,
														receivingOrg: { ...p.receivingOrg, ogrn: e.target.value },
													}))
												}
												className="ref057-input font-mono"
											/>
										</div>
									</div>

									<div>
										<label className="ref057-label mb-1">Адрес и контакты принимающей МО:</label>
										<input
											type="text"
											value={`${docState.receivingOrg.address} (Тел.: ${docState.receivingOrg.phone})`}
											onChange={(e) =>
												setDocState((p) => ({
													...p,
													receivingOrg: { ...p.receivingOrg, address: e.target.value },
												}))
											}
											className="ref057-input text-xs"
										/>
									</div>
								</div>

								{/* Sending Clinic Data */}
								<div className="ref057-form-section">
									<h4 className="text-xs font-bold uppercase tracking-wider text-[var(--muted,#64748b)]">
										Направляющая медицинская организация
									</h4>
									<div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
										<div>
											<label className="ref057-label mb-1">Наименование клиники:</label>
											<input
												type="text"
												value={docState.clinic.fullName}
												onChange={(e) =>
													setDocState((p) => ({
														...p,
														clinic: { ...p.clinic, fullName: e.target.value },
													}))
												}
												className="ref057-input"
											/>
										</div>
										<div>
											<label className="ref057-label mb-1">ОГРН клиники:</label>
											<input
												type="text"
												value={docState.clinic.ogrn}
												onChange={(e) =>
													setDocState((p) => ({
														...p,
														clinic: { ...p.clinic, ogrn: e.target.value },
													}))
												}
												className="ref057-input font-mono"
											/>
										</div>
									</div>
								</div>
							</div>
						)}

						{/* ─── TAB 2: PATIENT & INSURANCE ──────────────────────── */}
						{activeTab === "patient" && (
							<div className="flex flex-col gap-3">
								<div className="ref057-form-section">
									<h4 className="text-xs font-bold uppercase tracking-wider text-[var(--muted,#64748b)]">
										Паспортные данные и идентификация (пп. 5–8)
									</h4>

									<div>
										<label className="ref057-label mb-1">ФИО пациента (полностью):</label>
										<input
											type="text"
											value={docState.patient.fullName}
											onChange={(e) =>
												setDocState((p) => ({
													...p,
													patient: { ...p.patient, fullName: e.target.value },
												}))
											}
											className="ref057-input font-bold"
										/>
									</div>

									<div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
										<div>
											<label className="ref057-label mb-1">Дата рождения:</label>
											<input
												type="date"
												value={docState.patient.birthDate}
												onChange={(e) =>
													setDocState((p) => ({
														...p,
														patient: { ...p.patient, birthDate: e.target.value },
													}))
												}
												className="ref057-input font-semibold"
											/>
										</div>

										<div>
											<label className="ref057-label mb-1">Пол:</label>
											<select
												value={docState.patient.gender}
												onChange={(e) =>
													setDocState((p) => ({
														...p,
														patient: { ...p.patient, gender: e.target.value as "M" | "F" },
													}))
												}
												className="ref057-select"
											>
												<option value="M">Мужской (М)</option>
												<option value="F">Женский (Ж)</option>
											</select>
										</div>

										<div>
											<label className="ref057-label mb-1">Номер медкарты:</label>
											<input
												type="text"
												value={docState.patient.medicalCardNumber}
												onChange={(e) =>
													setDocState((p) => ({
														...p,
														patient: { ...p.patient, medicalCardNumber: e.target.value },
													}))
												}
												className="ref057-input font-mono"
											/>
										</div>
									</div>

									<div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
										<div>
											<label className="ref057-label mb-1">СНИЛС (п. 4):</label>
											<input
												type="text"
												value={docState.patient.snils}
												onChange={(e) =>
													setDocState((p) => ({
														...p,
														patient: { ...p.patient, snils: e.target.value },
													}))
												}
												className="ref057-input font-mono"
												placeholder="142-890-567 82"
											/>
										</div>
										<div>
											<label className="ref057-label mb-1">Телефон:</label>
											<input
												type="text"
												value={docState.patient.phone}
												onChange={(e) =>
													setDocState((p) => ({
														...p,
														patient: { ...p.patient, phone: e.target.value },
													}))
												}
												className="ref057-input"
											/>
										</div>
									</div>

									<div>
										<label className="ref057-label mb-1">Адрес постоянного места жительства (п. 7):</label>
										<input
											type="text"
											value={docState.patient.registeredAddress}
											onChange={(e) =>
												setDocState((p) => ({
													...p,
													patient: { ...p.patient, registeredAddress: e.target.value },
												}))
											}
											className="ref057-input"
										/>
									</div>

									<div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
										<div>
											<label className="ref057-label mb-1">Место работы / Учебы (п. 8):</label>
											<input
												type="text"
												value={docState.patient.workPlace}
												onChange={(e) =>
													setDocState((p) => ({
														...p,
														patient: { ...p.patient, workPlace: e.target.value },
													}))
												}
												className="ref057-input"
											/>
										</div>
										<div>
											<label className="ref057-label mb-1">Должность / Профессия:</label>
											<input
												type="text"
												value={docState.patient.occupation}
												onChange={(e) =>
													setDocState((p) => ({
														...p,
														patient: { ...p.patient, occupation: e.target.value },
													}))
												}
												className="ref057-input"
											/>
										</div>
									</div>
								</div>

								{/* Insurance & Policy Requisites */}
								<div className="ref057-form-section">
									<h4 className="text-xs font-bold uppercase tracking-wider text-[var(--muted,#64748b)]">
										Полис ОМС / ДМС и страховая организация (п. 2)
									</h4>

									<div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
										<div>
											<label className="ref057-label mb-1">Номер полиса ОМС (16 цифр):</label>
											<input
												type="text"
												value={docState.patient.omsPolicyNumber}
												onChange={(e) =>
													setDocState((p) => ({
														...p,
														patient: { ...p.patient, omsPolicyNumber: e.target.value },
													}))
												}
												className="ref057-input font-mono font-bold"
											/>
										</div>

										<div>
											<label className="ref057-label mb-1">Страховая компания (СМО):</label>
											<input
												type="text"
												value={docState.patient.omsSmoName}
												onChange={(e) =>
													setDocState((p) => ({
														...p,
														patient: { ...p.patient, omsSmoName: e.target.value },
													}))
												}
												className="ref057-input"
											/>
										</div>
									</div>

									<div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
										<div>
											<label className="ref057-label mb-1">Полис ДМС (при наличии):</label>
											<input
												type="text"
												value={docState.patient.dmsPolicyNumber || ""}
												onChange={(e) =>
													setDocState((p) => ({
														...p,
														patient: { ...p.patient, dmsPolicyNumber: e.target.value },
													}))
												}
												className="ref057-input font-mono"
											/>
										</div>

										<div>
											<label className="ref057-label mb-1">Код льготы (п. 3, при наличии):</label>
											<input
												type="text"
												value={docState.patient.benefitCategoryCode || ""}
												onChange={(e) =>
													setDocState((p) => ({
														...p,
														patient: { ...p.patient, benefitCategoryCode: e.target.value },
													}))
												}
												className="ref057-input font-mono"
												placeholder="081 (при наличии права на соц. пакет)"
											/>
										</div>
									</div>
								</div>
							</div>
						)}

						{/* ─── TAB 3: DIAGNOSIS & ICD-10 ───────────────────────── */}
						{activeTab === "diagnosis" && (
							<div className="flex flex-col gap-3">
								{/* Diagnostic Templates Chips */}
								<div className="ref057-form-section">
									<div className="flex items-center justify-between">
										<h4 className="text-xs font-bold uppercase tracking-wider text-[var(--muted,#64748b)] flex items-center gap-1.5">
											<Sparkles className="w-3.5 h-3.5 text-teal-600" />
											Шаблоны диагнозов и обоснований ({currentProfileDef.labelRu})
										</h4>
									</div>
									<div className="ref057-chips-wrap">
										{currentProfileDef.icd10Templates.map((tpl) => (
											<button
												key={tpl.code}
												type="button"
												onClick={() => handleApplyIcd10Template(tpl)}
												className="ref057-chip"
												title={tpl.detailedDiagnosisRu}
											>
												<strong className="text-teal-600 dark:text-teal-400 font-mono">
													[{tpl.code}]
												</strong>{" "}
												{tpl.titleRu}
											</button>
										))}
									</div>
								</div>

								{/* ICD-10 Code and Description */}
								<div className="ref057-form-section">
									<h4 className="text-xs font-bold uppercase tracking-wider text-[var(--muted,#64748b)]">
										Клинический диагноз (пп. 9–10 формы 057/у-04)
									</h4>

									<div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
										<div>
											<label className="ref057-label mb-1">Код МКБ-10 (п. 9):</label>
											<input
												type="text"
												value={docState.clinical.primaryIcd10Code}
												onChange={(e) =>
													setDocState((p) => ({
														...p,
														clinical: { ...p.clinical, primaryIcd10Code: e.target.value.toUpperCase() },
													}))
												}
												className="ref057-input font-mono font-bold text-sm"
												placeholder="K01.1"
											/>
										</div>
										<div className="sm:col-span-2">
											<label className="ref057-label mb-1">Развернутый клинический диагноз (п. 10):</label>
											<input
												type="text"
												value={docState.clinical.primaryDiagnosisText}
												onChange={(e) =>
													setDocState((p) => ({
														...p,
														clinical: { ...p.clinical, primaryDiagnosisText: e.target.value },
													}))
												}
												className="ref057-input font-medium"
											/>
										</div>
									</div>

									<div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
										<div>
											<label className="ref057-label mb-1">Сопутствующий МКБ-10:</label>
											<input
												type="text"
												value={docState.clinical.concomitantIcd10Code || ""}
												onChange={(e) =>
													setDocState((p) => ({
														...p,
														clinical: { ...p.clinical, concomitantIcd10Code: e.target.value.toUpperCase() },
													}))
												}
												className="ref057-input font-mono"
												placeholder="I11.9"
											/>
										</div>
										<div className="sm:col-span-2">
											<label className="ref057-label mb-1">Сопутствующий диагноз:</label>
											<input
												type="text"
												value={docState.clinical.concomitantDiagnosisText || ""}
												onChange={(e) =>
													setDocState((p) => ({
														...p,
														clinical: { ...p.clinical, concomitantDiagnosisText: e.target.value },
													}))
												}
												className="ref057-input"
												placeholder="Гипертоническая болезнь II стадии, риск 3"
											/>
										</div>
									</div>

									<div>
										<label className="ref057-label mb-1">
											Обоснование направления и клиническая цель (п. 11):
										</label>
										<textarea
											rows={3}
											value={docState.clinical.clinicalJustification}
											onChange={(e) =>
												setDocState((p) => ({
													...p,
													clinical: { ...p.clinical, clinicalJustification: e.target.value },
												}))
											}
											className="ref057-textarea text-xs leading-relaxed"
										/>
									</div>

									<div>
										<label className="ref057-label mb-1">
											Анамнез заболевания и жизни (кратко):
										</label>
										<textarea
											rows={2}
											value={docState.clinical.anamnesisMorbiAndVitae || ""}
											onChange={(e) =>
												setDocState((p) => ({
													...p,
													clinical: { ...p.clinical, anamnesisMorbiAndVitae: e.target.value },
												}))
											}
											className="ref057-textarea text-xs"
										/>
									</div>
								</div>
							</div>
						)}

						{/* ─── TAB 4: DIAGNOSTIC TESTS ─────────────────────────── */}
						{activeTab === "tests" && (
							<div className="flex flex-col gap-3">
								<div className="ref057-form-section">
									<div className="flex items-center justify-between">
										<div>
											<h4 className="text-xs font-bold uppercase tracking-wider text-[var(--ink,#0f172a)] dark:text-white">
												Лабораторные и инструментальные исследования (п. 12 формы 057/у-04)
											</h4>
											<p className="text-[11px] text-[var(--muted,#64748b)]">
												ОАК, биохимия, коагулограмма, ОПТГ, КЛКТ, ЭКГ, инфекции
											</p>
										</div>
										<button
											type="button"
											onClick={handleAddDiagnosticTest}
											className="ref057-btn-secondary py-1.5 px-3 text-xs"
										>
											<Plus className="w-4 h-4 text-teal-600" />
											Добавить строку
										</button>
									</div>

									{/* Tests Table */}
									<div className="overflow-x-auto">
										<table className="w-full text-xs text-left border-collapse">
											<thead>
												<tr className="border-b border-[var(--line,#e2e8f0)] dark:border-[#334155] text-[var(--muted,#64748b)]">
													<th className="py-2 px-2 w-8">№</th>
													<th className="py-2 px-2">Исследование</th>
													<th className="py-2 px-2 w-28">Дата</th>
													<th className="py-2 px-2">Результаты / Значения</th>
													<th className="py-2 px-2 w-10 text-center">Пат.</th>
													<th className="py-2 px-2 w-8"></th>
												</tr>
											</thead>
											<tbody className="divide-y divide-[var(--line,#e2e8f0)] dark:divide-[#334155]">
												{docState.clinical.diagnosticTests.map((t, idx) => (
													<tr key={t.id}>
														<td className="py-2 px-2 font-bold text-center text-[var(--muted,#64748b)]">
															{idx + 1}
														</td>
														<td className="py-2 px-2">
															<input
																type="text"
																value={t.testName}
																onChange={(e) => handleUpdateDiagnosticTest(idx, "testName", e.target.value)}
																className="ref057-input py-1 px-2 text-xs font-semibold"
															/>
														</td>
														<td className="py-2 px-2">
															<input
																type="date"
																value={t.testDate}
																onChange={(e) => handleUpdateDiagnosticTest(idx, "testDate", e.target.value)}
																className="ref057-input py-1 px-2 text-xs"
															/>
														</td>
														<td className="py-2 px-2">
															<input
																type="text"
																value={t.testResult}
																onChange={(e) => handleUpdateDiagnosticTest(idx, "testResult", e.target.value)}
																className={`ref057-input py-1 px-2 text-xs ${t.isAbnormal ? "text-red-600 font-bold border-red-500" : ""}`}
															/>
														</td>
														<td className="py-2 px-2 text-center">
															<label className="min-w-[44px] min-h-[44px] inline-flex items-center justify-center cursor-pointer">
																<input
																	type="checkbox"
																	checked={!!t.isAbnormal}
																	onChange={(e) => handleUpdateDiagnosticTest(idx, "isAbnormal", e.target.checked)}
																	className="w-4 h-4 rounded text-red-600 cursor-pointer"
																	title="Отклонение от нормы (патологический результат)"
																/>
															</label>
														</td>
														<td className="py-2 px-2 text-center">
															<button
																type="button"
																onClick={() => handleRemoveDiagnosticTest(idx)}
																className="min-w-[44px] min-h-[44px] inline-flex items-center justify-center text-red-500 hover:text-red-700 hover:bg-red-500/10 rounded-lg cursor-pointer transition-colors"
																title="Удалить строку"
																aria-label="Удалить исследование"
															>
																<Trash2 className="w-4 h-4" />
															</button>
														</td>
													</tr>
												))}
											</tbody>
										</table>
									</div>

									{/* Pre-Op Checklist Reference (Anti-Card-in-Card Flat Segment) */}
									<div className="mt-3 p-3.5 rounded-xl bg-teal-500/10 border border-teal-500/30">
										<h5 className="text-[11px] font-bold text-teal-800 dark:text-teal-200 uppercase mb-1 flex items-center gap-1.5">
											<ShieldCheck className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
											Нормативный чек-лист для профиля «{currentProfileDef.labelRu}»
										</h5>
										<ul className="text-[11px] text-teal-900 dark:text-teal-100 list-disc pl-4 space-y-0.5">
											{currentProfileDef.preOpTestsChecklist.map((item, i) => (
												<li key={i}>{item}</li>
											))}
										</ul>
									</div>
								</div>
							</div>
						)}

						{/* ─── TAB 5: SIGNATURES & STAMPS ──────────────────────── */}
						{activeTab === "signatures" && (
							<div className="flex flex-col gap-3">
								<div className="ref057-form-section">
									<h4 className="text-xs font-bold uppercase tracking-wider text-[var(--muted,#64748b)]">
										Врачебный состав и подписи (пп. 13–14)
									</h4>

									<div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
										<div>
											<label className="ref057-label mb-1">ФИО направившего врача (п. 13):</label>
											<input
												type="text"
												value={docState.signatures.attendingDoctorFullName}
												onChange={(e) =>
													setDocState((p) => ({
														...p,
														signatures: { ...p.signatures, attendingDoctorFullName: e.target.value },
													}))
												}
												className="ref057-input font-bold"
											/>
										</div>

										<div>
											<label className="ref057-label mb-1">Должность и специальность врача:</label>
											<input
												type="text"
												value={docState.signatures.attendingDoctorPosition}
												onChange={(e) =>
													setDocState((p) => ({
														...p,
														signatures: { ...p.signatures, attendingDoctorPosition: e.target.value },
													}))
												}
												className="ref057-input text-xs"
											/>
										</div>
									</div>

									<div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
										<div>
											<label className="ref057-label mb-1">Заведующий отделением / Главврач (п. 14):</label>
											<input
												type="text"
												value={docState.signatures.departmentHeadFullName}
												onChange={(e) =>
													setDocState((p) => ({
														...p,
														signatures: { ...p.signatures, departmentHeadFullName: e.target.value },
													}))
												}
												className="ref057-input font-bold"
											/>
										</div>

										<div>
											<label className="ref057-label mb-1">Должность заведующего / председателя ВК:</label>
											<input
												type="text"
												value={docState.signatures.departmentHeadPosition}
												onChange={(e) =>
													setDocState((p) => ({
														...p,
														signatures: { ...p.signatures, departmentHeadPosition: e.target.value },
													}))
												}
												className="ref057-input text-xs"
											/>
										</div>
									</div>

									<div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
										<div>
											<label className="ref057-label mb-1">Дата выдачи направления:</label>
											<input
												type="date"
												value={docState.signatures.issueDate}
												onChange={(e) =>
													setDocState((p) => ({
														...p,
														signatures: { ...p.signatures, issueDate: e.target.value },
													}))
												}
												className="ref057-input font-bold"
											/>
										</div>

										<div>
											<label className="ref057-label mb-1">Срок действия (30 дней):</label>
											<input
												type="date"
												value={docState.signatures.validUntilDate}
												onChange={(e) =>
													setDocState((p) => ({
														...p,
														signatures: { ...p.signatures, validUntilDate: e.target.value },
													}))
												}
												className="ref057-input font-bold"
											/>
										</div>
									</div>
								</div>
							</div>
						)}

						{/* Statutory Validation Status Bar */}
						<div
							className={`ref057-status-bar ${validationResult.isValid ? "valid" : "invalid"}`}
						>
							{validationResult.isValid ? (
								<div className="flex items-center gap-2">
									<CheckCircle2 className="w-4 h-4 text-emerald-600" />
									<span>Все нормативные поля бланка № 057/у-04 корректно заполнены. Готово к печати.</span>
								</div>
							) : (
								<div className="flex flex-col gap-1">
									<div className="flex items-center gap-1.5">
										<AlertCircle className="w-4 h-4 text-red-600" />
										<span>Требуется устранить ошибки валидации ({validationResult.errors.length}):</span>
									</div>
									<ul className="text-[11px] list-disc pl-5">
										{validationResult.errors.map((err, i) => (
											<li key={i}>{err}</li>
										))}
									</ul>
								</div>
							)}
						</div>
					</div>

					{/* ─── Right Pane: Live Interactive A4 Form 057/u-04 Sheet ──── */}
					<div className="ref057-preview-pane">
						<div className="ref057-preview-toolbar">
							<div className="flex items-center gap-2">
								<FileText className="w-4 h-4 text-teal-400" />
								<span className="text-xs font-bold uppercase tracking-wider">
									Предпросмотр бланка A4 (Приказ № 255)
								</span>
							</div>

							<div className="flex items-center gap-1">
								<button
									type="button"
									onClick={() => setZoomLevel((z) => Math.max(50, z - 15))}
									className="min-w-[44px] min-h-[44px] p-2 rounded-lg hover:bg-slate-700 text-slate-200 inline-flex items-center justify-center cursor-pointer transition-colors"
									title="Уменьшить масштаб"
									aria-label="Уменьшить масштаб"
								>
									<ZoomOut className="w-4 h-4" />
								</button>
								<span className="text-xs font-mono px-2 py-1 bg-slate-800 rounded font-bold">{zoomLevel}%</span>
								<button
									type="button"
									onClick={() => setZoomLevel((z) => Math.min(130, z + 15))}
									className="min-w-[44px] min-h-[44px] p-2 rounded-lg hover:bg-slate-700 text-slate-200 inline-flex items-center justify-center cursor-pointer transition-colors"
									title="Увеличить масштаб"
									aria-label="Увеличить масштаб"
								>
									<ZoomIn className="w-4 h-4" />
								</button>
							</div>
						</div>

						{/* A4 Sheet Container */}
						<div className="ref057-preview-scroll-viewport">
							<div
								className="ref057-a4-sheet-container"
								style={{ transform: `scale(${zoomLevel / 100})` }}
							>
								{/* Top Clinic Header */}
								<div className="flex justify-between items-start border-b border-black pb-2 mb-2 text-[9pt] leading-tight">
									<div className="w-1/2">
										<strong>{docState.clinic.fullName}</strong><br />
										ОГРН: {docState.clinic.ogrn} • ОКПО: {docState.clinic.okpo}<br />
										Адрес: {docState.clinic.address}<br />
										Тел.: {docState.clinic.phone}
									</div>
									<div className="w-1/2 text-right text-[8.5pt]">
										Министерство здравоохранения и социального развития РФ<br />
										<strong>Медицинская документация Форма № 057/у-04</strong><br />
										Утверждена приказом Минздравсоцразвития РФ от 22.11.2004 № 255
									</div>
								</div>

								{/* Title */}
								<div className="text-center font-bold text-[12pt] uppercase tracking-wide my-1">
									НАПРАВЛЕНИЕ № <u>{docState.referralNumber}</u>
								</div>
								<div className="text-center text-[10pt] font-semibold mb-2">
									на госпитализацию, восстановительное лечение, обследование, консультацию<br />
									от «<u>{docState.signatures.issueDate.slice(8, 10)}</u>» <u>{docState.signatures.issueDate.slice(5, 7)}</u> 20<u>{docState.signatures.issueDate.slice(2, 4)}</u> г.
								</div>

								<div className="text-center mb-3">
									<span className="inline-block border-2 border-black px-2 py-0.5 text-[9.5pt] font-bold">
										ЦЕЛЬ: {getPurposeLabelRu(docState.clinical.purpose).toUpperCase()} • {getUrgencyLabelRu(docState.clinical.urgency).toUpperCase()}
									</span>
								</div>

								{/* Form Lines 1 to 12 */}
								<div className="text-[10pt] leading-snug space-y-1">
									<div>
										<strong>1. В:</strong> <span className="border-b border-dotted border-black inline-block w-[90%] font-bold">{docState.receivingOrg.fullName} ({docState.receivingOrg.departmentName})</span>
									</div>
									<div>
										<strong>2. Номер страхового полиса ОМС:</strong> <span className="border-b border-dotted border-black px-1 font-bold">{docState.patient.omsPolicyNumber || "—"}</span>
										&nbsp;&nbsp;<strong>СМО:</strong> <span className="border-b border-dotted border-black px-1">{docState.patient.omsSmoName || "—"}</span>
									</div>
									<div>
										<strong>3. Код льготы:</strong> <span className="border-b border-dotted border-black px-2">{docState.patient.benefitCategoryCode || "—"}</span>
										&nbsp;&nbsp;&nbsp;&nbsp;
										<strong>4. СНИЛС:</strong> <span className="border-b border-dotted border-black px-2 font-bold">{docState.patient.snils || "—"}</span>
										&nbsp;&nbsp;&nbsp;&nbsp;
										<strong>Источник:</strong> <span className="border-b border-dotted border-black px-2">{getPaymentSourceLabelRu(docState.clinical.paymentSource)}</span>
									</div>
									<div>
										<strong>5. Фамилия, имя, отчество:</strong> <span className="border-b border-dotted border-black inline-block w-[72%] font-bold">{docState.patient.fullName}</span>
									</div>
									<div>
										<strong>6. Дата рождения:</strong> <span className="border-b border-dotted border-black px-1 font-semibold">{docState.patient.birthDate}</span>
										&nbsp;&nbsp;
										<strong>Пол:</strong> <span className="border-b border-dotted border-black px-1">{docState.patient.gender === "M" ? "Мужской (М)" : "Женский (Ж)"}</span>
										&nbsp;&nbsp;
										<strong>Медкарта:</strong> <span className="border-b border-dotted border-black px-1 font-mono">{docState.patient.medicalCardNumber}</span>
									</div>
									<div>
										<strong>7. Адрес постоянного места жительства:</strong> <span className="border-b border-dotted border-black inline-block w-[60%]">{docState.patient.registeredAddress}</span>
									</div>
									<div>
										<strong>8. Место работы, должность:</strong> <span className="border-b border-dotted border-black inline-block w-[72%]">{docState.patient.workPlace} • {docState.patient.occupation}</span>
									</div>
									<div>
										<strong>9. Код диагноза по МКБ-10:</strong> <span className="border-b border-dotted border-black px-2 font-bold text-[10.5pt]">{docState.clinical.primaryIcd10Code}</span>
										{docState.clinical.concomitantIcd10Code && (
											<span>&nbsp;&nbsp;<strong>Сопутствующий:</strong> <span className="border-b border-dotted border-black px-1 font-bold">{docState.clinical.concomitantIcd10Code}</span></span>
										)}
									</div>
									<div>
										<strong>10. Диагноз:</strong> <span className="border-b border-dotted border-black inline-block w-[88%] font-semibold">{docState.clinical.primaryDiagnosisText}</span>
									</div>
									<div>
										<strong>11. Обоснование направления:</strong>
										<div className="border border-black p-1.5 my-1 text-[9pt] leading-tight">
											<strong>Цель:</strong> {docState.clinical.clinicalJustification}
											{docState.clinical.anamnesisMorbiAndVitae && (
												<div><em>Анамнез:</em> {docState.clinical.anamnesisMorbiAndVitae}</div>
											)}
										</div>
									</div>
								</div>

								{/* Diagnostic Tests Table */}
								<div className="mt-2 text-[9pt]">
									<strong>12. Результаты лабораторных и инструментальных исследований:</strong>
									<table className="w-full border-collapse border border-black text-[8.5pt] mt-1">
										<thead>
											<tr className="bg-slate-100">
												<th className="border border-black p-1 w-6 text-center">№</th>
												<th className="border border-black p-1 text-left">Исследование</th>
												<th className="border border-black p-1 w-20 text-center">Дата</th>
												<th className="border border-black p-1 text-left">Результаты</th>
											</tr>
										</thead>
										<tbody>
											{docState.clinical.diagnosticTests.map((t, idx) => (
												<tr key={t.id}>
													<td className="border border-black p-1 text-center font-bold">{idx + 1}</td>
													<td className="border border-black p-1 font-semibold">{t.testName}</td>
													<td className="border border-black p-1 text-center">{t.testDate}</td>
													<td className={`border border-black p-1 ${t.isAbnormal ? "font-bold text-red-700" : ""}`}>{t.testResult}</td>
												</tr>
											))}
										</tbody>
									</table>
								</div>

								{/* Signatures & Stamp */}
								<div className="mt-3 flex justify-between items-start text-[9.5pt]">
									<div className="w-[65%] space-y-2">
										<div>
											<strong>13. Должность врача:</strong> {docState.signatures.attendingDoctorPosition}<br />
											<strong>Ф.И.О.:</strong> <u>{docState.signatures.attendingDoctorFullName}</u> / ____________ (подпись)
										</div>
										<div>
											<strong>14. Заведующий отделением / Главврач:</strong><br />
											<strong>Ф.И.О.:</strong> <u>{docState.signatures.departmentHeadFullName}</u> / ____________ (подпись)
										</div>
									</div>

									<div className="w-[30%] text-center">
										<div className="border border-dashed border-slate-500 h-16 flex items-center justify-center text-[8pt] text-slate-500">
											М.П.<br />Печать медицинской<br />организации
										</div>
										<div className="text-[7.5pt] text-slate-600 mt-1">
											Действительно до: <strong>{docState.signatures.validUntilDate}</strong>
										</div>
									</div>
								</div>

								{/* Barcodes Footnote */}
								<div className="mt-3 pt-2 border-t border-slate-300 flex items-center justify-between">
									<div className="flex items-center gap-2">
										<div
											dangerouslySetInnerHTML={{ __html: docState.dataMatrixSvg }}
											style={{ width: 60, height: 60 }}
										/>
										<div className="text-[7.5pt] text-slate-600 leading-tight">
											<strong>2D DataMatrix ЕГИСЗ / ОМС:</strong><br />
											Штрихкод для приемного покоя<br />
											Серия: {docState.referralNumber}
										</div>
									</div>

									<div
										dangerouslySetInnerHTML={{ __html: docState.barcode128Svg }}
									/>
								</div>
							</div>
						</div>
					</div>
				</div>

				{/* ─── Footer Action Bar ──────────────────────────────────── */}
				<footer className="ref057-footer">
					<div className="flex items-center gap-2">
						<button
							type="button"
							onClick={handlePrint}
							className="ref057-btn-primary"
						>
							<Printer className="w-4 h-4" />
							Печать бланка 057/у-04 (A4)
						</button>

						<button
							type="button"
							onClick={handleDownloadHtml}
							className="ref057-btn-secondary"
							title="Скачать официальный HTML бланк A4"
						>
							<Download className="w-4 h-4 text-teal-600" />
							Скачать HTML (A4)
						</button>

						<button
							type="button"
							onClick={handleDownloadJson}
							className="ref057-btn-secondary"
							title="Экспорт структурированного JSON направления"
						>
							<FileSpreadsheet className="w-4 h-4 text-indigo-600" />
							Экспорт JSON
						</button>

						<button
							type="button"
							onClick={handleCopyText}
							className="ref057-btn-secondary"
						>
							<Copy className="w-4 h-4 text-slate-600" />
							{copyNotification ? "Скопировано!" : "Копировать текст"}
						</button>
					</div>

					<div className="flex items-center gap-2">
						<button
							type="button"
							onClick={handleSave}
							className="h-11 px-5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
						>
							<Check className="w-4 h-4" />
							Сохранить направление в карте
						</button>
					</div>
				</footer>
			</div>
		</div>
	);
};

export default MedicalReferral057Modal;
