/**
 * DentalLabCreateOrderModal.tsx — Modal dialog for creating new Dental Lab Work Orders.
 */

import React, { useState, useEffect } from "react";
import { X, CheckCircle2 } from "lucide-react";
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
	readonly sampleLabs: readonly string[];
	readonly currentDoctorName?: string | undefined;
	readonly currentPatientName?: string | undefined;
	readonly currentPatientId?: string | undefined;
	readonly currentToothNumber?: number | string | undefined;
}

export const DentalLabCreateOrderModal: React.FC<DentalLabCreateOrderModalProps> = ({
	isOpen,
	onClose,
	onCreateOrder,
	sampleLabs,
	currentDoctorName,
	currentPatientName,
	currentPatientId,
	currentToothNumber,
}) => {
	const [newPatientName, setNewPatientName] = useState<string>("");
	const [newChartNumber, setNewChartNumber] = useState<string>("");
	const [newDoctorName, setNewDoctorName] = useState<string>("");
	const [newLabName, setNewLabName] = useState<string>(sampleLabs[0] || "Центральная зуботехническая лаборатория");
	const [newWorkType, setNewWorkType] = useState<OrthopedicWorkTypeId>("crown_zirconia");
	const [newTeethInput, setNewTeethInput] = useState<string>("");
	const [newShade, setNewShade] = useState<string>("A2");
	const [newStumpShade, setNewStumpShade] = useState<string>("ND2");
	const [newPriceRub, setNewPriceRub] = useState<number>(22000);
	const [newCostRub, setNewCostRub] = useState<number>(7000);
	const [newDoctorPercent, setNewDoctorPercent] = useState<number>(20);
	const [newInitialStatus, setNewInitialStatus] = useState<LabWorkflowStatus>("draft");
	const [newExpectedLabDate, setNewExpectedLabDate] = useState<string>(() => {
		const d = new Date();
		d.setDate(d.getDate() + 5);
		return d.toISOString().slice(0, 10);
	});
	const [newFittingDate, setNewFittingDate] = useState<string>(() => {
		const d = new Date();
		d.setDate(d.getDate() + 6);
		return d.toISOString().slice(0, 10);
	});
	const [newAppointmentId, setNewAppointmentId] = useState<string>("");
	const [newClinicalNotes, setNewClinicalNotes] = useState<string>("");
	const [newImplantPlatform, setNewImplantPlatform] = useState<ImplantPlatformType | "">("");
	const [newAbutmentType, setNewAbutmentType] = useState<AbutmentCategoryType | "">("");
	const [newFixationType, setNewFixationType] = useState<FixationType | "">("");
	const [newTechStage, setNewTechStage] = useState<LabTechnologicalStageId>("impression_scan");

	// Pre-fill on open with current patient and tooth
	useEffect(() => {
		if (isOpen) {
			if (currentPatientName) setNewPatientName(currentPatientName);
			if (currentDoctorName) setNewDoctorName(currentDoctorName);
			if (currentToothNumber) setNewTeethInput(String(currentToothNumber));
		}
	}, [isOpen, currentPatientName, currentDoctorName, currentToothNumber]);

	if (!isOpen) return null;

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

		const created = createDentalLabOrder({
			patientId: currentPatientId || `pat-${Date.now()}`,
			patientName: newPatientName.trim(),
			patientChartNumber: newChartNumber.trim() || "043/у",
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

		onCreateOrder(created);
		onClose();
	};

	return (
		<div className="ztl-detail-overlay">
			<div className="ztl-detail-card">
				<header className="ztl-detail-header">
					<h3 style={{ margin: 0, fontSize: "14px", fontWeight: 700 }}>
						Оформление наряд-заказа в зуботехническую лабораторию (ЗТЛ)
					</h3>
					<button
						type="button"
						className="ztl-btn-icon"
						onClick={onClose}
					>
						<X size={16} />
					</button>
				</header>

				<form onSubmit={handleCreateOrderSubmit}>
					<div className="ztl-detail-body">
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
									placeholder="043/у-1234"
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
									onChange={(e) => {
										const val = e.target.value as OrthopedicWorkTypeId;
										setNewWorkType(val);
										const preset = ORTHOPEDIC_WORK_TYPES[val];
										if (preset) {
											setNewPriceRub(preset.defaultPriceKopecks / 100);
											setNewCostRub(preset.defaultCostKopecks / 100);
										}
									}}
								>
									{Object.values(ORTHOPEDIC_WORK_TYPES).map((t) => (
										<option key={t.id} value={t.id}>
											{t.nameRu}
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
								<label className="ztl-form-label">Дата примерки в расписании (fittingDate)</label>
								<input
									type="date"
									className="ztl-form-input"
									value={newFittingDate}
									onChange={(e) => setNewFittingDate(e.target.value)}
								/>
							</div>
						</div>

						<div className="ztl-form-grid-2">
							<div className="ztl-form-group">
								<label className="ztl-form-label">ID приема в расписании (appointmentId)</label>
								<input
									type="text"
									className="ztl-form-input"
									placeholder="appt-8041"
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

					<footer className="ztl-detail-footer">
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
};
