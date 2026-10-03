import {
	Activity,
	Building2,
	Check,
	Copy,
	FileText,
	Printer,
	Scan,
	ShieldCheck,
	Sparkles,
	X,
} from "lucide-react";
import React, { useEffect, useId, useState } from "react";
import { createPortal } from "react-dom";
import { showToast } from "../GlobalToast.js";
import { ADULT_FDI_TEETH, formatRadiationDose } from "./radiologyMath.js";
import {
	applyRadiologyProtocolToForm043,
	CBCT_DIAGNOSTIC_GOALS,
	CBCT_REFERRAL_PARTNERS,
	CBCT_SCAN_FOV_PROTOCOLS,
	type CbctDiagnosticGoal,
	type CbctDiagnosticGoalId,
	type CbctReferralPartner,
	type CbctScanFovProtocol,
	formatCbctReferralSummary,
	generateReferralBarcodeSvg,
	generateReferralQrCodeSvg,
} from "./radiologyProtocols.js";
import {
	CLINICAL_EXPRESS_PRESETS,
	generateRadiologyReferralHtml,
	printRadiologyReferralHtml,
	RadiologyReferralPreviewDetails,
	TOOTH_ZONE_PRESETS,
	EMPTY_TEETH_LIST,
	type ClinicalExpressPreset,
	type RadiologyReferralPrintData,
	type RadiologyReferralModalProps,
} from "./radiologyReferralPrintTemplate.js";

export * from "./radiologyReferralPrintTemplate.js";

export const RadiologyReferralModal: React.FC<RadiologyReferralModalProps> = ({
	isOpen,
	onClose,
	patient,
	diary,
	doctorName,
	doctorSpecialty,
	clinicName,
	clinicAddress,
	clinicPhone,
	clinicLicense,
	initialDiagnosisIcd10 = "K08.1",
	initialTeeth = EMPTY_TEETH_LIST as string[],
	onSuccessReferralCreated,
}) => {
	const modalId = useId();

	// Active State
	const [selectedFovId, setSelectedFovId] = useState<string>("cbct_full_jaws_16x10");
	const [selectedGoalId, setSelectedGoalId] = useState<CbctDiagnosticGoalId>("implantation");
	const [selectedPartnerId, setSelectedPartnerId] = useState<string>("own_cabinet");
	const [selectedTeeth, setSelectedTeeth] = useState<string[]>(initialTeeth);
	const [customTeethInput, setCustomTeethInput] = useState<string>(initialTeeth.join(", "));
	const [diagnosisIcd10, setDiagnosisIcd10] = useState<string>(diary?.diagnosisIcd10 || initialDiagnosisIcd10);
	const [clinicalNotes, setClinicalNotes] = useState<string>(diary?.statusLocalis || "");
	const [referralNumber, setReferralNumber] = useState<string>("");
	const [activeTab, setActiveTab] = useState<"form" | "preview">("form");

	// Medical safety checklist
	const [isPregnancyExcluded, setIsPregnancyExcluded] = useState<boolean>(true);
	const [hasMetallicArtifacts, setHasMetallicArtifacts] = useState<boolean>(false);
	const [isTmjOpenClosedProtocol, setIsTmjOpenClosedProtocol] = useState<boolean>(true);

	const initialTeethKey = initialTeeth.join(",");

	// Current protocol objects
	const currentFov: CbctScanFovProtocol =
		CBCT_SCAN_FOV_PROTOCOLS.find((f) => f.id === selectedFovId) ?? CBCT_SCAN_FOV_PROTOCOLS[0]!;
	const currentGoal: CbctDiagnosticGoal =
		CBCT_DIAGNOSTIC_GOALS.find((g) => g.id === selectedGoalId) ?? CBCT_DIAGNOSTIC_GOALS[0]!;
	const currentPartner: CbctReferralPartner =
		CBCT_REFERRAL_PARTNERS.find((p) => p.id === selectedPartnerId) ?? CBCT_REFERRAL_PARTNERS[0]!;

	// Initialize on Open
	useEffect(() => {
		if (!isOpen) return;

		const currentYear = new Date().getFullYear();
		const dateSuffix = Date.now().toString(36).toUpperCase().slice(-4);
		setReferralNumber(`НАПР-КЛКТ-${currentYear}-${dateSuffix}`);

		if (initialTeeth.length > 0) {
			setSelectedTeeth(initialTeeth);
			setCustomTeethInput(initialTeeth.join(", "));
		} else if (diary?.diagnosisTooth) {
			const teethFromDiary = diary.diagnosisTooth.split(/[,;\s]+/).filter(Boolean);
			if (teethFromDiary.length > 0) {
				setSelectedTeeth(teethFromDiary);
				setCustomTeethInput(teethFromDiary.join(", "));
			}
		}

		if (diary?.diagnosisIcd10) setDiagnosisIcd10(diary.diagnosisIcd10);
		if (diary?.statusLocalis) setClinicalNotes(diary.statusLocalis);

		const handleKeyDown = (e: KeyboardEvent) => {
			if (e.key === "Escape") onClose();
		};
		window.addEventListener("keydown", handleKeyDown);
		return () => window.removeEventListener("keydown", handleKeyDown);
	}, [isOpen, initialTeethKey, diary, onClose]);

	if (!isOpen || typeof document === "undefined") return null;

	const patientFullName = patient?.fullName || "Пациент";
	const patientBirth = patient?.birthDate || "1985-05-15";
	const patientPhoneStr = patient?.phone || "+7 (___) ___-__-__";
	const patientCard = patient?.medicalCardNumber || patient?.cardNumber || `МК-${patient?.id ? patient.id.slice(0, 8).toUpperCase() : "2026"}`;
	const docName = doctorName || "Лечащий врач";
	const docSpec = doctorSpecialty || "Врач-стоматолог";
	const clinic = clinicName || 'Стоматологическая клиника "Денте"';
	const address = clinicAddress || "г. Москва, ул. Клиническая, д. 12";
	const phone = clinicPhone || "+7 (495) 700-00-00";
	const license = clinicLicense || "ЛО-77-01-019842 от 12.04.2020";

	// 1-Click Express Preset Handler (0-5 Seconds Doctor Fast-Path)
	const handleApplyExpressPreset = (preset: ClinicalExpressPreset) => {
		setSelectedFovId(preset.fovId);
		setSelectedGoalId(preset.goalId);
		setDiagnosisIcd10(preset.icd);
		if (preset.teeth && preset.teeth.length > 0) {
			setSelectedTeeth([...preset.teeth]);
			setCustomTeethInput(preset.teeth.join(", "));
		}
		if (preset.note) setClinicalNotes(preset.note);
		showToast(`Применен клинический протокол: ${preset.note}`, "info", 2000);
	};

	// 1-Click Zone Preset
	const handleApplyZonePreset = (teeth: readonly string[]) => {
		const sorted = [...teeth];
		setSelectedTeeth(sorted);
		setCustomTeethInput(sorted.join(", "));
	};

	// Toggle tooth
	const handleToggleTooth = (tooth: string) => {
		const updated = selectedTeeth.includes(tooth)
			? selectedTeeth.filter((t) => t !== tooth)
			: [...selectedTeeth, tooth].sort();
		setSelectedTeeth(updated);
		setCustomTeethInput(updated.join(", "));
	};

	// Change FOV with auto-population of defaults
	const handleSelectFov = (fov: CbctScanFovProtocol) => {
		setSelectedFovId(fov.id);
		if (fov.defaultTeethFdi.length > 0 && selectedTeeth.length <= 1) {
			setSelectedTeeth([...fov.defaultTeethFdi]);
			setCustomTeethInput(fov.code === "full_jaws" ? "Все зубные ряды" : fov.defaultTeethFdi.join(", "));
		}
	};

	// Change Goal with auto-population of recommended FOV and ICD
	const handleSelectGoal = (goal: CbctDiagnosticGoal) => {
		setSelectedGoalId(goal.id);
		if (goal.recommendedFovId && (!selectedFovId || selectedFovId === "cbct_full_jaws_16x10")) {
			setSelectedFovId(goal.recommendedFovId);
		}
		if (goal.recommendedIcd10 && (!diagnosisIcd10 || diagnosisIcd10 === "K08.1" || diagnosisIcd10 === "K04.0")) {
			setDiagnosisIcd10(goal.recommendedIcd10);
		}
	};

	// Radiation Dose Formatting
	const estimatedDose = formatRadiationDose(currentFov.typicalDoseMicrosv);

	// Summary Statement
	const targetTeethDisplay = customTeethInput || (selectedTeeth.length > 0 ? selectedTeeth.join(", ") : "По протоколу FOV");
	const referralSummary = formatCbctReferralSummary({
		referralNumber,
		fovProtocol: currentFov,
		goal: currentGoal,
		teeth: targetTeethDisplay,
		partner: currentPartner,
		doctorName: docName,
		icd10: diagnosisIcd10,
	});

	// Vector Barcode & QR Code SVGs (Zero-Mock, Pure SVG)
	const barcodeSvg = generateReferralBarcodeSvg(referralNumber, 240, 48);
	const qrPayloadData = `CT-REF:${referralNumber}|CLINIC:${clinic}|PATIENT:${patientFullName}|FOV:${currentFov.fovDimensions}|TEETH:${targetTeethDisplay}|GOAL:${currentGoal.titleRu}|DATE:${new Date().toISOString().slice(0, 10)}`;
	const qrCodeSvg = generateReferralQrCodeSvg(qrPayloadData, 96);

	// 1-Click Insert into Form 043/y Diary
	const handleInsertToDiary = () => {
		applyRadiologyProtocolToForm043({
			protocol: referralSummary,
			options: {
				modalityLabel: `КЛКТ (${currentFov.fovDimensions})`,
				teethFdi: selectedTeeth.length > 0 ? selectedTeeth : undefined,
			},
			showNotification: true,
			copyToClipboard: true,
		});
		if (onSuccessReferralCreated) {
			onSuccessReferralCreated({
				referralNumber,
				fov: currentFov,
				goal: currentGoal,
				teeth: targetTeethDisplay,
				partner: currentPartner,
				icd10: diagnosisIcd10,
			});
		}
	};

	// Copy formatted text
	const handleCopyText = () => {
		if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
			navigator.clipboard.writeText(referralSummary).then(() => {
				showToast("Текст направления скопирован в буфер", "success", 2500);
			}).catch(() => {});
		}
	};

	// Print Action using Extracted Clean Print Engine
	const handlePrint = () => {
		const printData: RadiologyReferralPrintData = {
			clinic,
			license,
			address,
			phone,
			referralNumber,
			partner: currentPartner,
			barcodeSvg,
			qrCodeSvg,
			patientFullName,
			patientBirth,
			patientCard,
			patientPhoneStr,
			docName,
			docSpec,
			diagnosisIcd10,
			goal: currentGoal,
			fov: currentFov,
			clinicalNotes,
			selectedTeeth,
			targetTeethDisplay,
			isPregnancyExcluded,
			hasMetallicArtifacts,
			isTmjOpenClosedProtocol,
		};
		const html = generateRadiologyReferralHtml(printData);
		printRadiologyReferralHtml(html, () => {
			if (onSuccessReferralCreated) {
				onSuccessReferralCreated({
					referralNumber,
					fov: currentFov,
					goal: currentGoal,
					teeth: targetTeethDisplay,
					partner: currentPartner,
				});
			}
		});
	};

	const renderQuadrantButtons = (teeth: readonly string[]) =>
		teeth.map((tooth) => {
			const isSelected = selectedTeeth.includes(tooth);
			return (
				<button
					key={tooth}
					type="button"
					onClick={() => handleToggleTooth(tooth)}
					className={`h-7 min-w-[28px] p-0.5 text-xs font-bold rounded-lg transition-all ${
						isSelected
							? "bg-[var(--teal)] text-white shadow-md font-extrabold scale-105"
							: "bg-[var(--paper)] border border-[var(--line)] text-[var(--ink)] hover:border-[var(--teal)]"
					}`}
				>
					{tooth}
				</button>
			);
		});

	const modalContent = (
		<div
			id={modalId}
			className="fixed inset-0 z-50 flex items-center justify-center p-3 md:p-6 bg-black/80 backdrop-blur-md animate-in fade-in duration-200"
			role="dialog"
			aria-modal="true"
			aria-label="Направление на КЛКТ (3D томография)"
			data-testid="radiology-referral-generator-modal"
		>
			<div className="flex flex-col w-full max-w-5xl max-h-[94vh] rounded-3xl bg-[var(--paper)] border border-[var(--line)] shadow-2xl overflow-hidden">
				{/* 1. HEADER */}
				<header className="flex items-center justify-between px-6 py-3.5 border-b border-[var(--line)] bg-[var(--paper-soft)] shrink-0">
					<div className="flex items-center gap-3.5">
						<div className="flex items-center justify-center w-10 h-10 rounded-2xl bg-[var(--teal-surface)] border border-[var(--teal-soft)] text-[var(--teal)]">
							<Scan className="w-5 h-5" />
						</div>
						<div>
							<div className="flex items-center gap-2">
								<h2 className="text-base font-bold text-[var(--ink)]">
									Направление на КЛКТ / 3D Лучевую диагностику
								</h2>
								<span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[var(--teal-surface)] text-[var(--teal)] border border-[var(--teal-soft)]">
									1-клик протокол
								</span>
							</div>
							<p className="text-xs text-[var(--muted)]">
								Пациент: <strong className="text-[var(--ink)]">{patientFullName}</strong> · Карта: {patientCard} · Направил: {docName}
							</p>
						</div>
					</div>

					<div className="flex items-center gap-2">
						{/* Desktop / Mobile Tab Switcher */}
						<div className="flex items-center p-1 rounded-xl bg-[var(--paper)] border border-[var(--line)]">
							<button
								type="button"
								onClick={() => setActiveTab("form")}
								className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
									activeTab === "form" ? "bg-[var(--teal)] text-white shadow-sm" : "text-[var(--muted)] hover:text-[var(--ink)]"
								}`}
							>
								Параметры FOV
							</button>
							<button
								type="button"
								onClick={() => setActiveTab("preview")}
								className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
									activeTab === "preview" ? "bg-[var(--teal)] text-white shadow-sm" : "text-[var(--muted)] hover:text-[var(--ink)]"
								}`}
							>
								Бланк и QR
							</button>
						</div>

						<button
							type="button"
							onClick={onClose}
							className="flex items-center justify-center min-h-[44px] min-w-[44px] p-2.5 rounded-xl border border-[var(--line)] text-[var(--muted)] hover:text-[var(--ink)] hover:bg-[var(--line)] transition-colors"
							title="Закрыть (Esc)"
							data-testid="referral-modal-close-btn"
						>
							<X className="w-5 h-5" />
						</button>
					</div>
				</header>

				{/* 2. BODY */}
				<div className="flex flex-col md:flex-row flex-1 min-h-0 overflow-hidden">
					{/* Left: Interactive Form & FOV Selection */}
					<div
						className={`w-full md:w-1/2 p-5 md:p-6 overflow-y-auto border-b md:border-b-0 md:border-r border-[var(--line)] flex flex-col gap-4 ${
							activeTab === "preview" ? "hidden md:flex" : "flex"
						}`}
					>
						{/* 0. Fast 1-Click Clinical Express Presets */}
						<div className="p-3 rounded-2xl bg-[var(--teal-surface)]/40 border border-[var(--teal-soft)]">
							<div className="flex items-center gap-1.5 text-xs font-bold text-[var(--teal)] mb-2">
								<Sparkles className="w-4 h-4" />
								<span>Быстрые пресеты у кресла (0–1 клик):</span>
							</div>
							<div className="flex flex-wrap gap-1.5">
								{CLINICAL_EXPRESS_PRESETS.map((preset) => (
									<button
										key={preset.label}
										type="button"
										onClick={() => handleApplyExpressPreset(preset)}
										className="px-2.5 py-1 rounded-lg text-xs font-bold bg-[var(--paper)] border border-[var(--teal-soft)] text-[var(--ink)] hover:bg-[var(--teal)] hover:text-white transition-all shadow-xs"
									>
										{preset.label}
									</button>
								))}
							</div>
						</div>

						{/* 1. Clinical Scanning Zone / FOV Selection */}
						<div>
							<div className="flex items-center justify-between mb-2">
								<span className="text-xs font-bold uppercase tracking-wider text-[var(--muted)]">
									1. Зона сканирования (FOV):
								</span>
								<div className={`flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg border text-xs font-bold ${estimatedDose.badgeClass}`}>
									<Activity className="w-3.5 h-3.5" />
									<span>Доза: ~{currentFov.typicalDoseMicrosv} мкЗв</span>
								</div>
							</div>

							<div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
								{CBCT_SCAN_FOV_PROTOCOLS.map((fov) => {
									const isSelected = selectedFovId === fov.id;
									return (
										<button
											key={fov.id}
											type="button"
											onClick={() => handleSelectFov(fov)}
											className={`flex flex-col p-3 rounded-2xl border text-left transition-all min-h-[44px] ${
												isSelected
													? "bg-[var(--teal-surface)] border-2 border-[var(--teal)] text-[var(--ink)] shadow-sm ring-1 ring-[var(--teal-soft)]"
													: "bg-[var(--paper-soft)] border-[var(--line)] hover:border-[var(--teal)] text-[var(--muted)] hover:text-[var(--ink)]"
											}`}
											data-testid={`referral-fov-${fov.code}`}
										>
											<div className="flex items-center justify-between w-full mb-1">
												<span className="text-xs font-bold text-[var(--ink)]">{fov.badge}</span>
												<div className={`flex items-center justify-center w-5 h-5 rounded-md border ${isSelected ? "bg-[var(--teal)] border-[var(--teal)] text-white" : "border-[var(--line)]"}`}>
													{isSelected && <Check className="w-3.5 h-3.5" />}
												</div>
											</div>
											<span className="text-xs font-semibold text-[var(--ink)] mb-0.5 line-clamp-1">{fov.titleRu}</span>
											<span className="text-[11px] text-[var(--muted)] leading-tight line-clamp-2">{fov.description}</span>
										</button>
									);
								})}
							</div>
						</div>

						{/* 2. Clinical Goal Selection */}
						<div>
							<span className="text-xs font-bold uppercase tracking-wider text-[var(--muted)] mb-2 block">
								2. Клиническая цель исследования:
							</span>
							<div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
								{CBCT_DIAGNOSTIC_GOALS.map((goal) => {
									const isSelected = selectedGoalId === goal.id;
									return (
										<button
											key={goal.id}
											type="button"
											onClick={() => handleSelectGoal(goal)}
											className={`min-h-[44px] p-2.5 rounded-xl border text-left transition-all ${
												isSelected
													? "bg-[var(--teal-surface)] border-[var(--teal)] text-[var(--teal)] font-bold shadow-sm"
													: "bg-[var(--paper-soft)] border-[var(--line)] text-[var(--muted)] hover:text-[var(--ink)]"
											}`}
											data-testid={`referral-goal-${goal.id}`}
										>
											<div className="text-xs font-bold line-clamp-1">{goal.titleRu}</div>
											<div className="text-[10px] text-[var(--muted)] line-clamp-1">{goal.shortBadge}</div>
										</button>
									);
								})}
							</div>
						</div>

						{/* 3. Destination Diagnostic Center / Partner */}
						<div>
							<span className="text-xs font-bold uppercase tracking-wider text-[var(--muted)] mb-2 block">
								3. Рентген-центр назначения:
							</span>
							<div className="grid grid-cols-2 gap-2">
								{CBCT_REFERRAL_PARTNERS.map((partner) => {
									const isSelected = selectedPartnerId === partner.id;
									return (
										<button
											key={partner.id}
											type="button"
											onClick={() => setSelectedPartnerId(partner.id)}
											className={`p-2.5 rounded-xl border text-left transition-all flex items-center gap-2 ${
												isSelected
													? "bg-[var(--teal-surface)] border-[var(--teal)] text-[var(--ink)] font-bold shadow-sm"
													: "bg-[var(--paper-soft)] border-[var(--line)] text-[var(--muted)] hover:text-[var(--ink)]"
											}`}
											data-testid={`referral-partner-${partner.id}`}
										>
											<Building2 className={`w-4 h-4 shrink-0 ${isSelected ? "text-[var(--teal)]" : "text-[var(--muted)]"}`} />
											<div className="min-w-0">
												<div className="text-xs font-bold truncate">{partner.nameRu}</div>
												<div className="text-[10px] text-[var(--muted)] truncate">{partner.integrationNote}</div>
											</div>
										</button>
									);
								})}
							</div>
						</div>

						{/* 4. FDI Tooth Matrix & Zone Presets */}
						<div>
							<div className="flex items-center justify-between mb-1.5">
								<span className="text-xs font-bold uppercase tracking-wider text-[var(--muted)]">
									4. Локализация по формуле FDI (Зубы):
								</span>
								{selectedTeeth.length > 0 && (
									<button
										type="button"
										onClick={() => {
											setSelectedTeeth([]);
											setCustomTeethInput("");
										}}
										className="text-xs text-rose-500 hover:underline font-semibold"
									>
										Сбросить выбор
									</button>
								)}
							</div>

							<div className="flex items-center gap-1.5 overflow-x-auto pb-1.5 mb-2 scrollbar-thin">
								{TOOTH_ZONE_PRESETS.map((preset) => {
									const isCurrent =
										preset.teeth.length === selectedTeeth.length &&
										preset.teeth.every((t) => selectedTeeth.includes(t));
									return (
										<button
											key={preset.label}
											type="button"
											onClick={() => handleApplyZonePreset(preset.teeth)}
											className={`px-2 py-0.5 text-xs font-semibold rounded-lg border whitespace-nowrap transition-all ${
												isCurrent
													? "bg-[var(--teal)] border-[var(--teal)] text-white shadow-xs font-bold"
													: "bg-[var(--paper-soft)] border-[var(--line)] text-[var(--muted)] hover:text-[var(--ink)]"
											}`}
										>
											{preset.label}
										</button>
									);
								})}
							</div>

							<div className="p-2.5 rounded-2xl bg-[var(--paper-soft)] border border-[var(--line)] flex flex-col gap-1.5">
								{/* Upper Jaw */}
								<div className="flex justify-between gap-1 overflow-x-auto pb-1 scrollbar-thin">
									{renderQuadrantButtons(ADULT_FDI_TEETH.quadrant1)}
									<div className="w-px bg-[var(--line)] mx-1" />
									{renderQuadrantButtons(ADULT_FDI_TEETH.quadrant2)}
								</div>

								{/* Lower Jaw */}
								<div className="flex justify-between gap-1 overflow-x-auto pt-1 border-t border-[var(--line)] scrollbar-thin">
									{renderQuadrantButtons(ADULT_FDI_TEETH.quadrant4)}
									<div className="w-px bg-[var(--line)] mx-1" />
									{renderQuadrantButtons(ADULT_FDI_TEETH.quadrant3)}
								</div>
							</div>

							<div className="mt-2">
								<input
									type="text"
									value={customTeethInput}
									onChange={(e) => setCustomTeethInput(e.target.value)}
									placeholder="Область зубов: 16, 26, 36-38, Все..."
									className="w-full px-3 min-h-[36px] text-xs font-mono rounded-xl bg-[var(--paper-soft)] border border-[var(--line)] text-[var(--ink)] focus:outline-none focus:border-[var(--teal)]"
								/>
							</div>
						</div>

						{/* 5. ICD-10 & Medical Checklist */}
						<div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
							<div>
								<label htmlFor="diagnosis-icd10-input" className="text-xs font-bold uppercase tracking-wider text-[var(--muted)] mb-1 block">
									Диагноз (МКБ-10):
								</label>
								<input
									id="diagnosis-icd10-input"
									type="text"
									value={diagnosisIcd10}
									onChange={(e) => setDiagnosisIcd10(e.target.value)}
									className="w-full px-3 min-h-[36px] text-xs font-mono font-bold rounded-xl bg-[var(--paper-soft)] border border-[var(--line)] text-[var(--ink)] focus:outline-none focus:border-[var(--teal)]"
								/>
							</div>

							<div>
								<label htmlFor="referral-number-input" className="text-xs font-bold uppercase tracking-wider text-[var(--muted)] mb-1 block">
									Номер направления:
								</label>
								<input
									id="referral-number-input"
									type="text"
									value={referralNumber}
									onChange={(e) => setReferralNumber(e.target.value)}
									className="w-full px-3 min-h-[36px] text-xs font-mono rounded-xl bg-[var(--paper-soft)] border border-[var(--line)] text-[var(--ink)] focus:outline-none focus:border-[var(--teal)]"
								/>
							</div>
						</div>

						{/* Safety Checkboxes */}
						<div className="flex flex-wrap items-center gap-4 text-xs text-[var(--ink)]">
							<label className="flex items-center gap-1.5 cursor-pointer">
								<input
									type="checkbox"
									checked={isPregnancyExcluded}
									onChange={(e) => setIsPregnancyExcluded(e.target.checked)}
									className="rounded text-[var(--teal)] focus:ring-0"
								/>
								<span>Беременность исключена</span>
							</label>

							<label className="flex items-center gap-1.5 cursor-pointer">
								<input
									type="checkbox"
									checked={hasMetallicArtifacts}
									onChange={(e) => setHasMetallicArtifacts(e.target.checked)}
									className="rounded text-[var(--teal)] focus:ring-0"
								/>
								<span>Металлоконструкции в полости рта</span>
							</label>

							{currentFov.isDualPhase && (
								<label className="flex items-center gap-1.5 cursor-pointer font-bold text-[var(--teal)]">
									<input
										type="checkbox"
										checked={isTmjOpenClosedProtocol}
										onChange={(e) => setIsTmjOpenClosedProtocol(e.target.checked)}
										className="rounded text-[var(--teal)] focus:ring-0"
									/>
									<span>Протокол: Закрытый + Открытый рот</span>
								</label>
							)}
						</div>
					</div>

					{/* Right: Live Formatted Print & QR Preview */}
					<div
						className={`w-full md:w-1/2 p-5 md:p-6 bg-[var(--paper-soft)] overflow-y-auto flex flex-col gap-4 ${
							activeTab === "form" ? "hidden md:flex" : "flex"
						}`}
					>
						<div className="flex items-center justify-between">
							<span className="text-xs font-bold uppercase tracking-wider text-[var(--muted)] flex items-center gap-1.5">
								<FileText className="w-4 h-4 text-[var(--teal)]" />
								<span>Официальный бланк направления:</span>
							</span>
							<div className="flex items-center gap-2">
								<button
									type="button"
									onClick={handleCopyText}
									className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-[var(--paper)] border border-[var(--line)] text-[var(--ink)] hover:border-[var(--teal)] transition-colors"
									title="Копировать текст направления"
									data-testid="btn-copy-referral-text"
								>
									<Copy className="w-3.5 h-3.5" />
									<span>Текст</span>
								</button>
								<span className="text-xs font-mono font-bold text-[var(--teal)]">{referralNumber}</span>
							</div>
						</div>

						{/* Document Sheet Container */}
						<div className="p-5 md:p-6 rounded-2xl border border-[var(--line)] bg-[var(--paper-strong)] text-[var(--ink)] shadow-md font-sans leading-relaxed flex flex-col gap-3.5">
							{/* Clinic & Header Requisites */}
							<div className="border-b-2 border-[var(--line-strong,var(--line))] pb-2.5 flex justify-between items-start">
								<div>
									<div className="font-extrabold text-sm uppercase text-[var(--ink)]">{clinic}</div>
									<div className="text-[10px] text-[var(--muted)]">Лицензия: {license} · {phone}</div>
								</div>
								<div className="text-right">
									<div className="font-black text-sm text-[var(--teal)] uppercase tracking-tight">НАПРАВЛЕНИЕ НА КЛКТ</div>
									<div className="text-[10px] text-[var(--muted)] font-semibold">{currentPartner.nameRu}</div>
								</div>
							</div>

							{/* Barcode & QR Intake Header */}
							<div className="flex items-center justify-between p-2 rounded-xl bg-[var(--paper-soft)] border border-[var(--line)]">
								<div
									className="overflow-hidden"
									dangerouslySetInnerHTML={{ __html: barcodeSvg }}
									data-testid="referral-barcode-preview"
								/>
								<div className="flex items-center gap-2 text-right">
									<div className="text-[9px] text-[var(--muted)] leading-tight">
										<strong>QR-код КЛКТ</strong><br />для рентген-центра
									</div>
									<div
										className="w-12 h-12 shrink-0 border border-[var(--line)] rounded-lg overflow-hidden p-0.5 bg-white"
										dangerouslySetInnerHTML={{ __html: qrCodeSvg }}
										data-testid="referral-qrcode-preview"
									/>
								</div>
							</div>

							{/* Live Document Preview Details */}
							<RadiologyReferralPreviewDetails
								patientFullName={patientFullName}
								patientBirth={patientBirth}
								patientCard={patientCard}
								docName={docName}
								currentFov={currentFov}
								currentGoal={currentGoal}
								targetTeethDisplay={targetTeethDisplay}
								diagnosisIcd10={diagnosisIcd10}
								isPregnancyExcluded={isPregnancyExcluded}
								hasMetallicArtifacts={hasMetallicArtifacts}
							/>
						</div>
					</div>
				</div>

				{/* 3. FOOTER */}
				<footer className="flex items-center justify-between px-6 py-3.5 border-t border-[var(--line)] bg-[var(--paper-soft)] shrink-0">
					<div className="flex items-center gap-2 text-xs text-[var(--muted)]">
						<ShieldCheck className="w-4 h-4 text-[var(--teal)]" />
						<span>Готово к моментальной печати и прикреплению к карте.</span>
					</div>

					<div className="flex items-center gap-2.5">
						<button
							type="button"
							onClick={onClose}
							className="min-h-[44px] px-4 py-2 text-xs md:text-sm font-semibold rounded-xl text-[var(--muted)] hover:text-[var(--ink)] hover:bg-[var(--line)] transition-colors"
						>
							Отмена
						</button>
						<button
							type="button"
							onClick={handleInsertToDiary}
							className="inline-flex items-center gap-1.5 min-h-[44px] px-4 py-2 text-xs md:text-sm font-bold rounded-xl border border-[var(--teal)] text-[var(--teal)] hover:bg-[var(--teal-surface)] active:scale-95 transition-all"
							data-testid="btn-insert-referral-to-043"
							title="Внести текст направления в дневник приёма"
						>
							<FileText className="w-4 h-4" />
							<span>Внести в дневник</span>
						</button>
						<button
							type="button"
							onClick={handlePrint}
							className="inline-flex items-center gap-2 min-h-[44px] px-5 py-2.5 text-xs md:text-sm font-bold rounded-xl bg-[var(--teal-fill,var(--teal))] text-[var(--on-teal,#ffffff)] shadow-md hover:opacity-95 active:scale-95 transition-all font-extrabold"
							data-testid="print-referral-btn"
						>
							<Printer className="w-4 h-4" />
							<span>Печать направления (КЛКТ)</span>
						</button>
					</div>
				</footer>
			</div>
		</div>
	);

	return typeof document !== "undefined" ? createPortal(modalContent, document.body) : modalContent;
};
