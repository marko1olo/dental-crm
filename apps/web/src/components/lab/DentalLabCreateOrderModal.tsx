/**
 * DentalLabCreateOrderModal.tsx — Modal dialog for creating new Dental Lab Work Orders.
 */

import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { X, CheckCircle2, Sparkles, AlertTriangle, Calendar, Zap, Layers } from "lucide-react";
import {
	type OrthopedicWorkTypeId,
	ORTHOPEDIC_WORK_TYPES,
	type LabWorkflowStatus,
	LAB_WORKFLOW_STATUSES,
	LAB_WORKFLOW_STATUS_ORDER,
	type DentalLabWorkflowOrder,
	createDentalLabOrder,
} from "./dentalLabWorkflowEngine";
import {
	calculateLabReadinessDate,
	checkFittingAppointmentCollision,
	formatRuDate,
} from "./dentalLabOrderEngine";
import {
	VITA_CLASSICAL_SHADES,
	VITA_3D_MASTER_SHADES,
	VITA_BLEACH_SHADES,
	STUMP_SHADES_ND,
	IMPLANT_PLATFORMS,
	ABUTMENT_TYPE_OPTIONS,
	FIXATION_TYPES,
	LAB_TECHNOLOGICAL_STAGES,
	LAB_TECHNOLOGICAL_STAGE_ORDER,
	type ImplantPlatformType,
	type AbutmentCategoryType,
	type FixationType,
	type LabTechnologicalStageId,
} from "./orders/labWorkOrderPresets";

export interface DentalLabCreateOrderModalProps {
	readonly isOpen: boolean;
	readonly onClose: () => void;
	readonly onCreateOrder: (order: DentalLabWorkflowOrder) => void;
	readonly sampleLabs?: readonly string[] | undefined;
	readonly currentDoctorName?: string | undefined;
	readonly currentPatientName?: string | undefined;
	readonly currentPatientId?: string | undefined;
	readonly currentToothNumber?: number | string | undefined;
	readonly treatmentPlanId?: string | undefined;
	readonly stageNumber?: number | undefined;
	readonly stageTitle?: string | undefined;
	readonly initialTeeth?: readonly (number | string)[] | undefined;
}

const DEFAULT_SAMPLE_LABS: readonly string[] = [
	"Центральная зуботехническая лаборатория «Денте-Лаб»",
	"Цифровая CAD/CAM лаборатория «Циркон-Про»",
	"Собственная ЗТЛ клиники",
];

export const DentalLabCreateOrderModal: React.FC<DentalLabCreateOrderModalProps> = ({
	isOpen,
	onClose,
	onCreateOrder,
	sampleLabs = DEFAULT_SAMPLE_LABS,
	currentDoctorName,
	currentPatientName,
	currentPatientId,
	currentToothNumber,
	treatmentPlanId,
	stageNumber,
	stageTitle,
	initialTeeth,
}) => {
	const [newPatientName, setNewPatientName] = useState<string>("");
	const [newChartNumber, setNewChartNumber] = useState<string>("");
	const [newDoctorName, setNewDoctorName] = useState<string>("");
	const [newLabName, setNewLabName] = useState<string>(sampleLabs?.[0] || "Центральная зуботехническая лаборатория");
	const [newWorkType, setNewWorkType] = useState<OrthopedicWorkTypeId>("crown_zirconia");
	const [newTeethInput, setNewTeethInput] = useState<string>("");
	const [newShade, setNewShade] = useState<string>("A2");
	const [newStumpShade, setNewStumpShade] = useState<string>("ND2");
	const [newPriceRub, setNewPriceRub] = useState<number>(22000);
	const [newCostRub, setNewCostRub] = useState<number>(7000);
	const [newDoctorPercent, setNewDoctorPercent] = useState<number>(20);
	const [newInitialStatus, setNewInitialStatus] = useState<LabWorkflowStatus>("draft");
	const [newExpectedLabDate, setNewExpectedLabDate] = useState<string>(() => {
		const preset = ORTHOPEDIC_WORK_TYPES.crown_zirconia;
		return calculateLabReadinessDate(new Date(), preset?.standardTurnaroundWorkingDays || 5);
	});
	const [newFittingDate, setNewFittingDate] = useState<string>(() => {
		const preset = ORTHOPEDIC_WORK_TYPES.crown_zirconia;
		const labDate = calculateLabReadinessDate(new Date(), preset?.standardTurnaroundWorkingDays || 5);
		return calculateLabReadinessDate(labDate, 1);
	});
	const [autoBookFitting, setAutoBookFitting] = useState<boolean>(true);
	const [newAppointmentId, setNewAppointmentId] = useState<string>("");
	const [newClinicalNotes, setNewClinicalNotes] = useState<string>("");
	const [newImplantPlatform, setNewImplantPlatform] = useState<ImplantPlatformType | "">("");
	const [newAbutmentType, setNewAbutmentType] = useState<AbutmentCategoryType | "">("");
	const [newFixationType, setNewFixationType] = useState<FixationType | "">("");
	const [newTechStage, setNewTechStage] = useState<LabTechnologicalStageId>("impression_scan");

	// Pre-fill on open with current patient, plan stage and teeth
	useEffect(() => {
		if (isOpen) {
			if (currentPatientName) setNewPatientName(currentPatientName);
			if (currentDoctorName) setNewDoctorName(currentDoctorName);
			if (initialTeeth && initialTeeth.length > 0) {
				setNewTeethInput(initialTeeth.join(", "));
			} else if (currentToothNumber) {
				setNewTeethInput(String(currentToothNumber));
			}
			if (stageTitle) {
				const stageNote = `[План лечения: Этап ${stageNumber ?? 1} · ${stageTitle}]`;
				setNewClinicalNotes((prev) =>
					prev.includes(stageNote) ? prev : prev ? `${stageNote}\n${prev}` : stageNote,
				);
			}
		}
	}, [isOpen, currentPatientName, currentDoctorName, currentToothNumber, initialTeeth, stageNumber, stageTitle]);

	// Close on Escape key (Universal Modal A11y)
	useEffect(() => {
		if (!isOpen) return;
		const handleKeyDown = (e: KeyboardEvent) => {
			if (e.key === "Escape") {
				e.stopPropagation();
				onClose();
			}
		};
		window.addEventListener("keydown", handleKeyDown);
		return () => window.removeEventListener("keydown", handleKeyDown);
	}, [isOpen, onClose]);

	if (!isOpen) return null;
	if (typeof document === "undefined") return null;

	const handleWorkTypeChange = (val: OrthopedicWorkTypeId) => {
		setNewWorkType(val);
		const preset = ORTHOPEDIC_WORK_TYPES[val];
		if (preset) {
			setNewPriceRub(preset.defaultPriceKopecks / 100);
			setNewCostRub(preset.defaultCostKopecks / 100);
			const labDate = calculateLabReadinessDate(new Date(), preset.standardTurnaroundWorkingDays);
			setNewExpectedLabDate(labDate);
			const fitDate = calculateLabReadinessDate(labDate, 1);
			setNewFittingDate(fitDate);
		}
	};

	const handleApplyQuickPreset = (
		workType: OrthopedicWorkTypeId,
		shade: string,
		stumpShade = "ND2",
	) => {
		const preset = ORTHOPEDIC_WORK_TYPES[workType];
		if (!preset) return;
		setNewWorkType(workType);
		setNewShade(shade);
		setNewStumpShade(stumpShade);
		setNewPriceRub(preset.defaultPriceKopecks / 100);
		setNewCostRub(preset.defaultCostKopecks / 100);
		const labDate = calculateLabReadinessDate(new Date(), preset.standardTurnaroundWorkingDays);
		setNewExpectedLabDate(labDate);
		const fitDate = calculateLabReadinessDate(labDate, 1);
		setNewFittingDate(fitDate);
	};

	const collision = checkFittingAppointmentCollision(newExpectedLabDate, newFittingDate);

	const handleCreateOrderSubmit = (e: React.FormEvent) => {
		e.preventDefault();
		if (!newPatientName.trim()) return;

		const teeth = newTeethInput
			.split(",")
			.map((s) => parseInt(s.trim(), 10))
			.filter((n) => !isNaN(n) && n >= 11 && n <= 48);

		const defaultTeeth = currentToothNumber && !isNaN(Number(currentToothNumber))
			? [Number(currentToothNumber)]
			: [11];

		const pricePerUnitKopecks = Math.max(0, Math.round(newPriceRub * 100));
		const costPerUnitKopecks = Math.max(0, Math.round(newCostRub * 100));

		const created = createDentalLabOrder({
			patientId: currentPatientId || `pat-${Date.now()}`,
			patientName: newPatientName.trim(),
			patientChartNumber: newChartNumber.trim() || undefined,
			doctorId: "doc-current",
			doctorName: newDoctorName.trim() || currentDoctorName?.trim() || "Врач-ортопед",
			clinicName: "Стоматологическая клиника DENTE",
			labName: newLabName,
			workTypeId: newWorkType,
			selectedTeeth: teeth.length > 0 ? teeth : defaultTeeth,
			shadeCode: newShade,
			stumpShadeCode: newStumpShade,
			pricePerUnitRub: newPriceRub,
			costPerUnitRub: newCostRub,
			pricePerUnitKopecks,
			costPerUnitKopecks,
			doctorPercent: newDoctorPercent,
			initialStatus: newInitialStatus,
			expectedLabDate: newExpectedLabDate,
			fittingDate: newFittingDate,
			appointmentId: newAppointmentId.trim() || undefined,
			clinicalNotes: newClinicalNotes.trim() || undefined,
			implantPlatform: newImplantPlatform || undefined,
			abutmentType: newAbutmentType || undefined,
			fixationType: newFixationType || undefined,
			techStage: newTechStage,
		});

		if (autoBookFitting) {
			const teethLabel = created.selectedTeeth.join(", ");
			const workTypeTitle = ORTHOPEDIC_WORK_TYPES[newWorkType]?.shortNameRu || "Конструкция ЗТЛ";
			const appointmentDraft = {
				patientId: created.patientId,
				patientName: created.patientName,
				patientPhone: "",
				doctorId: created.doctorId,
				doctorName: created.doctorName,
				serviceTitle: `Примерка и фиксация: ${workTypeTitle} (зуб ${teethLabel})`,
				serviceCode: "A16.07.004", // Приказ Минздрава РФ 804н
				durationMinutes: 45,
				scheduledDate: newFittingDate,
				targetDate: newFittingDate,
				stageKind: "stage_3_orthopedics",
				orderNumber: created.orderNumber,
				notes: `Автобронь примерки из ЗТЛ № ${created.orderNumber} (${created.materialName}, зуб ${teethLabel}, цвет ${created.shadeCode}). План готовности ЗТЛ: ${formatRuDate(newExpectedLabDate)}.`,
			};

			if (typeof window !== "undefined") {
				try {
					window.localStorage.setItem(
						"dente_schedule_quick_booking_draft",
						JSON.stringify(appointmentDraft),
					);
					window.dispatchEvent(
						new CustomEvent("dente-quick-appointment-draft", {
							detail: appointmentDraft,
						}),
					);
					window.dispatchEvent(
						new CustomEvent("dente-open-quick-booking", {
							detail: appointmentDraft,
						}),
					);
				} catch {
					// quota fallback
				}
			}
		}

		onCreateOrder(created);
		onClose();
	};

	const modalContent = (
		<div className="ztl-detail-overlay" style={{ zIndex: 99999 }}>
			<div className="ztl-detail-card" data-testid="dental-lab-create-order-modal" role="dialog" aria-modal="true" aria-labelledby="ztl-create-order-title">
				<header className="ztl-detail-header">
					<div className="flex items-center gap-2 flex-wrap min-w-0">
						<h3 id="ztl-create-order-title" style={{ margin: 0, fontSize: "14px", fontWeight: 700 }}>
							Оформление наряд-заказа в зуботехническую лабораторию (ЗТЛ)
						</h3>
						{(stageTitle || stageNumber != null) && (
							<span
								className="px-2 py-0.5 text-[11px] font-semibold rounded bg-teal-500/15 text-teal-700 dark:text-teal-300 border border-teal-500/30 whitespace-nowrap inline-flex items-center gap-1 shadow-2xs"
								data-testid="lab-create-order-stage-badge"
							>
								<Layers size={11} className="text-teal-600 dark:text-teal-400" />
								<span>Этап {stageNumber ?? 1}: {stageTitle || "Ортопедия"}</span>
							</span>
						)}
					</div>
					<button
						type="button"
						className="ztl-btn-icon"
						onClick={onClose}
						aria-label="Закрыть"
						data-testid="btn-close-create-lab-order"
					>
						<X size={16} />
					</button>
				</header>

				<form
					onSubmit={handleCreateOrderSubmit}
					style={{
						display: "flex",
						flexDirection: "column",
						flex: 1,
						minHeight: 0,
						overflow: "hidden",
					}}
				>
					<div className="ztl-detail-body" style={{ flex: 1, overflowY: "auto", minHeight: 0 }}>
						{/* 1-Click Chairside Express Presets Bar */}
						<div
							style={{
								display: "flex",
								alignItems: "center",
								gap: "6px",
								flexWrap: "wrap",
								padding: "8px 10px",
								background: "var(--paper-soft, #f8fafc)",
								border: "1px solid var(--line, #e2e8f0)",
								borderRadius: "8px",
								marginBottom: "10px",
							}}
						>
							<span style={{ fontSize: "11.5px", fontWeight: 700, display: "flex", alignItems: "center", gap: "4px", color: "var(--ink, #1e293b)" }}>
								<Zap size={13} className="text-amber-500" />
								<span>Быстрые шаблоны:</span>
							</span>
							<button
								type="button"
								className="ztl-chip"
								style={{ fontSize: "11px", padding: "3px 8px", cursor: "pointer" }}
								onClick={() => handleApplyQuickPreset("crown_zirconia", "A2", "ND2")}
								title="Коронка ZrO2 Katana ML: 5 раб. дн., цвет А2, 22 000 ₽"
							>
								ZrO₂ Katana (A2, 5 дн.)
							</button>
							<button
								type="button"
								className="ztl-chip"
								style={{ fontSize: "11px", padding: "3px 8px", cursor: "pointer" }}
								onClick={() => handleApplyQuickPreset("crown_emax", "A1", "ND1")}
								title="Коронка IPS e.max Press: 5 раб. дн., цвет А1, 24 000 ₽"
							>
								e.max Press (A1, 5 дн.)
							</button>
							<button
								type="button"
								className="ztl-chip"
								style={{ fontSize: "11px", padding: "3px 8px", cursor: "pointer" }}
								onClick={() => handleApplyQuickPreset("metal_ceramic", "A3")}
								title="Металлокерамика Co-Cr: 6 раб. дн., цвет А3, 14 000 ₽"
							>
								Металлокерамика (A3, 6 дн.)
							</button>
							<button
								type="button"
								className="ztl-chip"
								style={{ fontSize: "11px", padding: "3px 8px", cursor: "pointer" }}
								onClick={() => handleApplyQuickPreset("temporary_pmma", "A2")}
								title="Временная коронка PMMA CAD/CAM: 2 раб. дн., цвет А2, 2 500 ₽"
							>
								Временная PMMA (2 дн.)
							</button>
						</div>

						{/* Fitting Collision Guard Alert Banner */}
						{collision.hasCollision && (
							<div
								style={{
									display: "flex",
									alignItems: "flex-start",
									gap: "8px",
									padding: "10px 12px",
									background: "rgba(245, 158, 11, 0.12)",
									border: "1px solid rgba(245, 158, 11, 0.45)",
									borderRadius: "8px",
									marginBottom: "10px",
									color: "#92400e",
									fontSize: "12px",
								}}
								role="alert"
								data-testid="ztl-create-order-collision-banner"
							>
								<AlertTriangle size={16} className="shrink-0 text-amber-600 mt-0.5" />
								<div>
									<strong style={{ display: "block" }}>Внимание: прием на примерку назначен раньше готовности лаборатории!</strong>
									<span style={{ fontSize: "11px" }}>{collision.warningRu}</span>
								</div>
							</div>
						)}

						<div className="ztl-form-grid-2">
							<div className="ztl-form-group">
								<label className="ztl-form-label">Пациент (Ф.И.О.) *</label>
								<input
									type="text"
									className="ztl-form-input"
									required
									placeholder="Ф.И.О. пациента"
									value={newPatientName}
									onChange={(e) => setNewPatientName(e.target.value)}
								/>
							</div>
							<div className="ztl-form-group">
								<label className="ztl-form-label">№ Медкарты</label>
								<input
									type="text"
									className="ztl-form-input"
									placeholder="№ 1234"
									value={newChartNumber}
									onChange={(e) => setNewChartNumber(e.target.value)}
								/>
							</div>
						</div>

						<div className="ztl-form-grid-2">
							<div className="ztl-form-group">
								<label className="ztl-form-label">Врач-ортопед</label>
								<input
									type="text"
									className="ztl-form-input"
									placeholder="Ф.И.О. врача-ортопеда"
									value={newDoctorName}
									onChange={(e) => setNewDoctorName(e.target.value)}
								/>
							</div>
							<div className="ztl-form-group">
								<label className="ztl-form-label">Лаборатория (ЗТЛ)</label>
								<select
									className="ztl-select"
									style={{ width: "100%" }}
									value={newLabName}
									onChange={(e) => setNewLabName(e.target.value)}
								>
									{sampleLabs.map((lab) => (
										<option key={lab} value={lab}>
											{lab}
										</option>
									))}
								</select>
							</div>
						</div>

						<div className="ztl-form-grid-2">
							<div className="ztl-form-group">
								<label className="ztl-form-label">Вид конструкции</label>
								<select
									className="ztl-select"
									style={{ width: "100%" }}
									value={newWorkType}
									onChange={(e) => handleWorkTypeChange(e.target.value as OrthopedicWorkTypeId)}
								>
									{Object.values(ORTHOPEDIC_WORK_TYPES).map((t) => (
										<option key={t.id} value={t.id}>
											{t.nameRu} ({t.standardTurnaroundWorkingDays} раб. дн.)
										</option>
									))}
								</select>
							</div>
							<div className="ztl-form-group">
								<label className="ztl-form-label">Зубы по формуле FDI (через запятую)</label>
								<input
									type="text"
									className="ztl-form-input"
									placeholder="например: 11, 21"
									value={newTeethInput}
									onChange={(e) => setNewTeethInput(e.target.value)}
								/>
							</div>
						</div>

						<div className="ztl-form-grid-2">
							<div className="ztl-form-group">
								<label className="ztl-form-label">Оттенок (VITA Classical / Bleach / 3D-Master)</label>
								<div style={{ display: "flex", gap: "6px" }}>
									<input
										type="text"
										className="ztl-form-input"
										placeholder="A2, BL1, OM2, 2M2..."
										value={newShade}
										onChange={(e) => setNewShade(e.target.value.toUpperCase())}
										list="vita-shades-datalist"
										style={{ flex: 1 }}
									/>
									<select
										className="ztl-select"
										style={{ width: "140px" }}
										value={newShade}
										onChange={(e) => setNewShade(e.target.value)}
									>
										<optgroup label="VITA Classical (A1..D4)">
											{VITA_CLASSICAL_SHADES.map((s) => (
												<option key={s.code} value={s.code}>
													{s.code} ({s.groupRu.split(":")[0]})
												</option>
											))}
										</optgroup>
										<optgroup label="VITA Bleach (OM / BL)">
											{VITA_BLEACH_SHADES.map((s) => (
												<option key={s.code} value={s.code}>
													{s.code} (Bleach)
												</option>
											))}
										</optgroup>
										<optgroup label="VITA 3D-Master">
											{VITA_3D_MASTER_SHADES.map((s) => (
												<option key={s.code} value={s.code}>
													{s.code}
												</option>
											))}
										</optgroup>
									</select>
									<datalist id="vita-shades-datalist">
										{VITA_CLASSICAL_SHADES.concat(VITA_BLEACH_SHADES, VITA_3D_MASTER_SHADES).map((s) => (
											<option key={s.code} value={s.code} />
										))}
									</datalist>
								</div>
							</div>
							<div className="ztl-form-group">
								<label className="ztl-form-label">Оттенок культи (ND1-ND9)</label>
								<select
									className="ztl-select"
									style={{ width: "100%" }}
									value={newStumpShade}
									onChange={(e) => setNewStumpShade(e.target.value)}
								>
									{STUMP_SHADES_ND.map((nd) => (
										<option key={nd.code} value={nd.code}>
											{nd.code} — {nd.descriptionRu}
										</option>
									))}
								</select>
							</div>
						</div>

						<div className="ztl-form-grid-2">
							<div className="ztl-form-group">
								<label className="ztl-form-label">Платформа имплантата</label>
								<select
									className="ztl-select"
									style={{ width: "100%" }}
									value={newImplantPlatform}
									onChange={(e) => setNewImplantPlatform(e.target.value as ImplantPlatformType | "")}
								>
									<option value="">— Без имплантата (естественный зуб) —</option>
									{IMPLANT_PLATFORMS.map((p) => (
										<option key={p.id} value={p.id}>
											{p.nameRu}
										</option>
									))}
								</select>
							</div>
							<div className="ztl-form-group">
								<label className="ztl-form-label">Тип абатмента</label>
								<select
									className="ztl-select"
									style={{ width: "100%" }}
									value={newAbutmentType}
									onChange={(e) => setNewAbutmentType(e.target.value as AbutmentCategoryType | "")}
								>
									<option value="">— Стандартный / не требуется —</option>
									{ABUTMENT_TYPE_OPTIONS.map((a) => (
										<option key={a.id} value={a.id}>
											{a.nameRu} {a.angle > 0 ? `(${a.angle}°)` : ""}
										</option>
									))}
								</select>
							</div>
						</div>

						<div className="ztl-form-grid-2">
							<div className="ztl-form-group">
								<label className="ztl-form-label">Тип фиксации</label>
								<select
									className="ztl-select"
									style={{ width: "100%" }}
									value={newFixationType}
									onChange={(e) => setNewFixationType(e.target.value as FixationType | "")}
								>
									<option value="">— Не выбрано —</option>
									{FIXATION_TYPES.map((f) => (
										<option key={f.id} value={f.id}>
											{f.nameRu}
										</option>
									))}
								</select>
							</div>
							<div className="ztl-form-group">
								<label className="ztl-form-label">Первичный технологический этап ЗТЛ (1..8)</label>
								<select
									className="ztl-select"
									style={{ width: "100%" }}
									value={newTechStage}
									onChange={(e) => setNewTechStage(e.target.value as LabTechnologicalStageId)}
								>
									{LAB_TECHNOLOGICAL_STAGE_ORDER.map((stageKey) => {
										const sDef = LAB_TECHNOLOGICAL_STAGES[stageKey];
										return (
											<option key={stageKey} value={stageKey}>
												Этап {sDef.stepNumber}: {sDef.nameRu} ({sDef.departmentRu})
											</option>
										);
									})}
								</select>
							</div>
						</div>

						<div className="ztl-form-grid-2">
							<div className="ztl-form-group">
								<label className="ztl-form-label">План готовности из ЗТЛ</label>
								<input
									type="date"
									className="ztl-form-input"
									value={newExpectedLabDate}
									onChange={(e) => setNewExpectedLabDate(e.target.value)}
								/>
							</div>
							<div className="ztl-form-group">
								<label className="ztl-form-label">Дата примерки в расписании</label>
								<input
									type="date"
									className="ztl-form-input"
									value={newFittingDate}
									onChange={(e) => setNewFittingDate(e.target.value)}
								/>
							</div>
						</div>

						{/* 1-Click Auto-Booking of Fitting Appointment in Doctor Schedule */}
						<div
							className="ztl-form-group"
							style={{
								gridColumn: "1 / -1",
								background: "var(--paper-soft, #f0fdf4)",
								border: "1px solid var(--line, #bbf7d0)",
								padding: "10px 12px",
								borderRadius: "8px",
								display: "flex",
								flexDirection: "column",
								gap: "4px",
							}}
							data-testid="ztl-auto-book-fitting-wrap"
						>
							<label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer", fontWeight: 700, fontSize: "12px", color: "var(--teal-strong, #166534)" }}>
								<input
									type="checkbox"
									checked={autoBookFitting}
									onChange={(e) => setAutoBookFitting(e.target.checked)}
									style={{ width: "16px", height: "16px", accentColor: "var(--teal, #0d9488)", cursor: "pointer" }}
									data-testid="ztl-auto-book-fitting-checkbox"
								/>
								<span>Автоматически забронировать визит на примерку в расписании врача</span>
							</label>
							{autoBookFitting && (
								<p style={{ margin: "2px 0 0 24px", fontSize: "11px", color: "var(--muted, #4b5563)" }}>
									Слот на примерку: <strong>{formatRuDate(newFittingDate)}</strong> · Время приема: <strong>45 мин</strong> · Процедура: <em>Примерка и фиксация ({ORTHOPEDIC_WORK_TYPES[newWorkType]?.shortNameRu || "ортопедия"})</em>
								</p>
							)}
						</div>

						<div className="ztl-form-grid-2">
							<div className="ztl-form-group">
								<label className="ztl-form-label">Номер записи в расписании</label>
								<input
									type="text"
									className="ztl-form-input"
									placeholder="Например: Визит №1234"
									value={newAppointmentId}
									onChange={(e) => setNewAppointmentId(e.target.value)}
								/>
							</div>
							<div className="ztl-form-group">
								<label className="ztl-form-label">Начальный статус</label>
								<select
									className="ztl-select"
									style={{ width: "100%" }}
									value={newInitialStatus}
									onChange={(e) => setNewInitialStatus(e.target.value as LabWorkflowStatus)}
								>
									{LAB_WORKFLOW_STATUS_ORDER.map((st) => (
										<option key={st} value={st}>
											{LAB_WORKFLOW_STATUSES[st].nameRu}
										</option>
									))}
								</select>
							</div>
						</div>

						<div className="ztl-form-grid-2" style={{ background: "var(--paper-strong, #f8fafc)", padding: "10px", borderRadius: "6px" }}>
							<div className="ztl-form-group">
								<label className="ztl-form-label">Стоимость за ед. (руб)</label>
								<input
									type="number"
									className="ztl-form-input"
									value={newPriceRub}
									onChange={(e) => setNewPriceRub(Number(e.target.value))}
								/>
							</div>
							<div className="ztl-form-group">
								<label className="ztl-form-label">Себестоимость ЗТЛ за ед. (руб)</label>
								<input
									type="number"
									className="ztl-form-input"
									value={newCostRub}
									onChange={(e) => setNewCostRub(Number(e.target.value))}
								/>
							</div>
						</div>

						<div className="ztl-form-group">
							<label className="ztl-form-label">Клинические указания врачу и технику</label>
							<textarea
								className="ztl-form-input"
								style={{ height: "60px", padding: "6px 10px", resize: "none" }}
								placeholder="Особенности краевого прилегания, прозрачность, прикус..."
								value={newClinicalNotes}
								onChange={(e) => setNewClinicalNotes(e.target.value)}
							/>
						</div>
					</div>

					<footer className="ztl-detail-footer" style={{ flexShrink: 0 }}>
						<button
							type="button"
							className="ztl-btn-secondary"
							onClick={onClose}
						>
							Отмена
						</button>
						<button type="submit" className="ztl-btn-primary">
							<CheckCircle2 size={14} />
							<span>Сформировать наряд</span>
						</button>
					</footer>
				</form>
			</div>
		</div>
	);

	return createPortal(modalContent, document.body);
};
