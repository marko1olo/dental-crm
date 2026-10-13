import React, { useState, useEffect, useMemo } from "react";
import {
	X,
	Check,
	Calendar,
	Clock,
	AlertTriangle,
	Sparkles,
	Layers,
	ShieldCheck,
	Zap,
} from "lucide-react";
import {
	type DentalLabConstructionType,
	type DentalLabOrderStatus,
	type DentalLabOrderRecord,
	DENTAL_LAB_CONSTRUCTIONS,
	DENTAL_LAB_STATUSES,
	VITA_CLASSICAL_SHADES,
	VITA_BLEACH_SHADES,
	ENAMEL_TRANSLUCENCY_OPTIONS,
	STUMP_NATURAL_DIE_SHADES,
	parseFdiTeethString,
	calculateZtlWageFinancials,
	createDentalLabOrderRecord,
	toIsoDate,
	addWorkingDaysRu,
	checkFittingAppointmentCollision,
	CANONICAL_LAB_WORK_TYPES,
	getVitaShadeHex,
	getLabWorkTypeById,
} from "./dentalLabOrderEngine";
import { money } from "../../AppHelpers";

export interface DentalLabOrderDrawerProps {
	readonly isOpen: boolean;
	readonly onClose: () => void;
	readonly editingOrder: DentalLabOrderRecord | null;
	readonly currentPatientName?: string | undefined;
	readonly currentDoctorName?: string | undefined;
	readonly currentToothNumber?: number | string | undefined;
	readonly treatmentPlanId?: string | undefined;
	readonly stageNumber?: number | undefined;
	readonly stageTitle?: string | undefined;
	readonly stageId?: string | undefined;
	readonly onSaveOrder: (order: DentalLabOrderRecord, isEdit: boolean) => void;
}

export function DentalLabOrderDrawer({
	isOpen,
	onClose,
	editingOrder,
	currentPatientName,
	currentDoctorName,
	currentToothNumber,
	treatmentPlanId,
	stageNumber,
	stageTitle,
	stageId,
	onSaveOrder,
}: DentalLabOrderDrawerProps) {
	const [formPatientName, setFormPatientName] = useState(currentPatientName || "");
	const [formDoctorName, setFormDoctorName] = useState(currentDoctorName || "Д-р Орлов А.В. (Ортопед)");
	const [formLabName, setFormLabName] = useState("CAD/CAM Центр Дентал-Мастер");
	const [formTechnicianName, setFormTechnicianName] = useState("");
	const [formTeethInput, setFormTeethInput] = useState(currentToothNumber ? String(currentToothNumber) : "16");
	const [formConstruction, setFormConstruction] = useState<DentalLabConstructionType>("crown_zirconia");
	const [formVitaShade, setFormVitaShade] = useState("A2");
	const [formTranslucency, setFormTranslucency] = useState("MT");
	const [formStumpShade, setFormStumpShade] = useState("ND2");
	const [formSentDate, setFormSentDate] = useState(() => toIsoDate(new Date()));
	const [formDeadlineDate, setFormDeadlineDate] = useState(() => {
		return toIsoDate(addWorkingDaysRu(new Date(), 5));
	});
	const [formScheduledVisit, setFormScheduledVisit] = useState("");
	const [formPatientPriceRub, setFormPatientPriceRub] = useState(24000);
	const [formZtlCostRub, setFormZtlCostRub] = useState(7500);
	const [formDoctorPercent, setFormDoctorPercent] = useState(20);
	const [formClinicalNotes, setFormClinicalNotes] = useState("");
	const [formStatus, setFormStatus] = useState<DentalLabOrderStatus>("sent_to_lab");
	const [formTreatmentPlanId, setFormTreatmentPlanId] = useState<string | undefined>(treatmentPlanId);
	const [formStageNumber, setFormStageNumber] = useState<number | undefined>(stageNumber);
	const [formStageTitle, setFormStageTitle] = useState<string | undefined>(stageTitle);
	const [formStageId, setFormStageId] = useState<string | undefined>(stageId);

	useEffect(() => {
		if (editingOrder) {
			setFormPatientName(editingOrder.patientName);
			setFormDoctorName(editingOrder.doctorName);
			setFormLabName(editingOrder.labName);
			setFormTechnicianName(editingOrder.technicianName || "");
			setFormTeethInput(editingOrder.teethFdi.join(", "));
			setFormConstruction(editingOrder.constructionType);
			setFormVitaShade(editingOrder.vitaShade);
			setFormTranslucency(editingOrder.translucency || "MT");
			setFormStumpShade(editingOrder.stumpShade || "ND2");
			setFormSentDate(editingOrder.sentDate);
			setFormDeadlineDate(editingOrder.deadlineDate);
			setFormScheduledVisit(editingOrder.scheduledVisitDate || "");
			setFormPatientPriceRub(editingOrder.patientPriceKopecks / 100);
			setFormZtlCostRub(editingOrder.ztlCostKopecks / 100);
			setFormDoctorPercent(editingOrder.doctorSharePercent);
			setFormClinicalNotes(editingOrder.clinicalNotes || "");
			setFormStatus(editingOrder.status || "sent_to_lab");
			setFormTreatmentPlanId(editingOrder.treatmentPlanId ?? treatmentPlanId);
			setFormStageNumber(editingOrder.stageNumber ?? stageNumber);
			setFormStageTitle(editingOrder.stageTitle ?? stageTitle);
			setFormStageId(editingOrder.stageId ?? stageId);
		} else {
			setFormPatientName(currentPatientName || "");
			setFormDoctorName(currentDoctorName || "Д-р Орлов А.В. (Ортопед)");
			setFormLabName("CAD/CAM Центр Дентал-Мастер");
			setFormTechnicianName("");
			setFormTeethInput(currentToothNumber ? String(currentToothNumber) : "16");
			setFormConstruction("crown_zirconia");
			setFormVitaShade("A2");
			setFormTranslucency("MT");
			setFormStumpShade("ND2");
			const now = new Date();
			setFormSentDate(toIsoDate(now));
			setFormDeadlineDate(toIsoDate(addWorkingDaysRu(now, 5)));
			setFormScheduledVisit("");
			setFormPatientPriceRub(24000);
			setFormZtlCostRub(7500);
			setFormDoctorPercent(20);
			setFormClinicalNotes("");
			setFormStatus("sent_to_lab");
			setFormTreatmentPlanId(treatmentPlanId);
			setFormStageNumber(stageNumber);
			setFormStageTitle(stageTitle);
			setFormStageId(stageId);
		}
	}, [editingOrder, currentPatientName, currentDoctorName, currentToothNumber, treatmentPlanId, stageNumber, stageTitle, stageId, isOpen]);

	// Детекция коллизии: визит примерки назначен раньше готовности ЗТЛ
	const collision = useMemo(() => {
		return checkFittingAppointmentCollision(formDeadlineDate, formScheduledVisit);
	}, [formDeadlineDate, formScheduledVisit]);

	if (!isOpen) return null;

	const handleSelectConstruction = (val: string) => {
		setFormConstruction(val as DentalLabConstructionType);
		const def = DENTAL_LAB_CONSTRUCTIONS[val as DentalLabConstructionType];
		if (def) {
			setFormPatientPriceRub(def.defaultPatientPriceKopecks / 100);
			setFormZtlCostRub(def.defaultZtlCostKopecks / 100);
			setFormDeadlineDate(toIsoDate(addWorkingDaysRu(formSentDate, def.standardTurnaroundDays)));
		} else {
			const cat = getLabWorkTypeById(val);
			if (cat) {
				const catAny = cat as unknown as Record<string, unknown>;
				setFormPatientPriceRub(typeof catAny.defaultPatientPriceRub === "number" ? catAny.defaultPatientPriceRub : 0);
				setFormZtlCostRub(typeof catAny.defaultCostLabRub === "number" ? catAny.defaultCostLabRub : 0);
				const turnaroundDays = typeof catAny.turnaroundWorkingDays === "number" ? catAny.turnaroundWorkingDays : 5;
				setFormDeadlineDate(toIsoDate(addWorkingDaysRu(formSentDate, turnaroundDays)));
			}
		}
	};

	const handleSetWorkingDays = (days: number) => {
		setFormDeadlineDate(toIsoDate(addWorkingDaysRu(formSentDate, days)));
	};

	const handleAutoBookFitting = () => {
		const nextWorkDay = toIsoDate(addWorkingDaysRu(formDeadlineDate, 1));
		setFormScheduledVisit(nextWorkDay);
	};

	const handleApplyTreatmentPlanDefaults = () => {
		setFormStageNumber(stageNumber ?? 3);
		setFormStageTitle(stageTitle || "Ортопедический этап");
		setFormConstruction("crown_zirconia");
		if (currentToothNumber) {
			setFormTeethInput(String(currentToothNumber));
		}
		setFormPatientPriceRub(24000);
		setFormZtlCostRub(7500);
		setFormDeadlineDate(toIsoDate(addWorkingDaysRu(new Date(), 5)));
	};

	const handleFormSubmit = (e: React.FormEvent) => {
		e.preventDefault();
		const teeth = parseFdiTeethString(formTeethInput);
		const teethFinal = teeth.length > 0 ? teeth : [16];
		const def = DENTAL_LAB_CONSTRUCTIONS[formConstruction];

		const fin = calculateZtlWageFinancials({
			unitsCount: teethFinal.length,
			patientPriceRub: formPatientPriceRub,
			ztlCostRub: formZtlCostRub,
			doctorSharePercent: formDoctorPercent,
		});

		const nowIso = new Date().toISOString();

		if (editingOrder) {
			const updated: DentalLabOrderRecord = {
				...editingOrder,
				patientName: formPatientName || "Пациент",
				doctorName: formDoctorName || "Врач-ортопед",
				labName: formLabName,
				technicianName: formTechnicianName || undefined,
				teethFdi: teethFinal,
				teeth: teethFinal,
				constructionType: formConstruction,
				materialRu: def?.defaultMaterialRu || "Диоксид циркония Katana ML",
				vitaShade: formVitaShade,
				translucency: formTranslucency,
				stumpShade: formStumpShade,
				sentDate: formSentDate,
				deadlineDate: formDeadlineDate,
				dueDate: formDeadlineDate,
				scheduledVisitDate: formScheduledVisit || undefined,
				status: formStatus,
				treatmentPlanId: formTreatmentPlanId,
				stageNumber: formStageNumber,
				stageTitle: formStageTitle,
				stageId: formStageId,
				patientPriceKopecks: fin.patientPriceKopecks,
				priceRub: Math.round(fin.patientPriceKopecks / 100),
				ztlCostKopecks: fin.ztlCostKopecks,
				doctorSharePercent: fin.doctorSharePercent,
				clinicalNotes: formClinicalNotes || undefined,
				updatedAt: nowIso,
			};
			onSaveOrder(updated, true);

			if (typeof window !== "undefined") {
				if (formTreatmentPlanId) {
					window.dispatchEvent(
						new CustomEvent("dente-treatment-plan-stage-status", {
							detail: {
								planId: formTreatmentPlanId,
								stageNumber: formStageNumber ?? 3,
								status: "in_lab",
								statusRu: "В работе в ЗТЛ",
								updatedAt: nowIso,
							},
						}),
					);
				}
				window.dispatchEvent(
					new CustomEvent("dente-lab-order-created", {
						detail: {
							orderId: updated.id,
							orderNumber: updated.orderNumber,
							patientName: updated.patientName,
						},
					}),
				);
			}
		} else {
			const created = createDentalLabOrderRecord({
				patientName: formPatientName || "Пациент",
				doctorName: formDoctorName || "Врач-ортопед",
				labName: formLabName,
				technicianName: formTechnicianName || undefined,
				teethFdi: teethFinal,
				teeth: teethFinal,
				constructionType: formConstruction,
				materialRu: def?.defaultMaterialRu || "Диоксид циркония Katana ML",
				vitaShade: formVitaShade,
				translucency: formTranslucency,
				stumpShade: formStumpShade,
				sentDate: formSentDate,
				deadlineDate: formDeadlineDate,
				dueDate: formDeadlineDate,
				scheduledVisitDate: formScheduledVisit || undefined,
				status: formStatus,
				treatmentPlanId: formTreatmentPlanId,
				stageNumber: formStageNumber,
				stageTitle: formStageTitle,
				stageId: formStageId,
				patientPriceKopecks: fin.patientPriceKopecks,
				priceRub: Math.round(fin.patientPriceKopecks / 100),
				ztlCostKopecks: fin.ztlCostKopecks,
				doctorSharePercent: fin.doctorSharePercent,
				clinicalNotes: formClinicalNotes || undefined,
			});
			onSaveOrder(created, false);

			if (typeof window !== "undefined") {
				if (formTreatmentPlanId) {
					window.dispatchEvent(
						new CustomEvent("dente-treatment-plan-stage-status", {
							detail: {
								planId: formTreatmentPlanId,
								stageNumber: formStageNumber ?? 3,
								status: "in_lab",
								statusRu: "В работе в ЗТЛ",
								updatedAt: nowIso,
							},
						}),
					);
				}
				window.dispatchEvent(
					new CustomEvent("dente-lab-order-created", {
						detail: {
							orderId: created.id,
							orderNumber: created.orderNumber,
							patientName: created.patientName,
						},
					}),
				);
			}
		}
	};

	return (
		<div
			className="fixed inset-0 z-[9999] bg-slate-950/50 backdrop-blur-xs flex justify-end"
			onClick={(e) => {
				if (e.target === e.currentTarget) onClose();
			}}
			data-testid="dental-lab-order-drawer"
		>
			<div
				className="w-full max-w-lg bg-[var(--paper,#ffffff)] border-l border-[var(--line,#cbd5e1)] h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-150 overflow-hidden"
				onClick={(e) => e.stopPropagation()}
			>
				{/* Шапка дравера (Apple HIG Ergonomics) */}
				<div className="flex items-center justify-between px-4 py-3 border-b border-[var(--line,#cbd5e1)] bg-[var(--paper-soft,#f8fafc)] shrink-0 gap-2">
					<div className="min-w-0 flex-1">
						<div className="flex items-center gap-1.5 flex-wrap">
							<h3 className="text-sm font-bold text-[var(--ink,#0f172a)] m-0 leading-tight">
								{editingOrder ? `Наряд ЗТЛ ${editingOrder.orderNumber}` : "Новый наряд в лабораторию (ЗТЛ)"}
							</h3>
							<span className="px-1.5 py-0.5 text-[10px] font-bold rounded bg-teal-500/15 text-teal-700 dark:text-teal-300 border border-teal-500/30">
								SSOT
							</span>
						</div>
						{(formTreatmentPlanId || formStageNumber != null || formStageTitle) && (
							<div className="mt-1 flex items-center gap-1 text-[11px] text-teal-700 dark:text-teal-300 font-medium">
								<Layers size={12} className="shrink-0" />
								<span className="truncate" data-testid="drawer-treatment-stage-chip">
									План лечения: Этап {formStageNumber ?? 3} · {formStageTitle || "Ортопедический этап"}
								</span>
							</div>
						)}
					</div>
					<button
						type="button"
						onClick={onClose}
						className="min-h-[44px] min-w-[44px] rounded-xl text-[var(--muted,#64748b)] hover:text-[var(--ink,#0f172a)] hover:bg-[var(--line,#e2e8f0)] flex items-center justify-center cursor-pointer transition-colors shrink-0"
						data-testid="drawer-close-btn"
						aria-label="Закрыть шторку"
					>
						<X className="w-5 h-5" />
					</button>
				</div>

				{/* Тело формы наряда */}
				<form onSubmit={handleFormSubmit} className="flex-1 overflow-y-auto p-4 space-y-3.5 text-xs">
					{/* 1-Клик предзаполнение из этапа плана лечения */}
					{(treatmentPlanId || stageNumber != null) && (
						<div className="p-2.5 rounded-xl bg-teal-500/10 border border-teal-500/30 flex items-center justify-between gap-2">
							<div className="min-w-0 text-[11px] text-teal-800 dark:text-teal-200">
								<span className="font-bold">Ортопедический этап плана:</span> доступно 1-клик предзаполнение параметров
							</div>
							<button
								type="button"
								onClick={handleApplyTreatmentPlanDefaults}
								className="min-h-[32px] px-2.5 py-1 rounded-lg bg-teal-600 hover:bg-teal-500 text-white font-bold text-[11px] flex items-center gap-1 shadow-2xs cursor-pointer shrink-0"
								data-testid="drawer-apply-plan-stage-btn"
							>
								<Zap size={12} />
								<span>Заполнить</span>
							</button>
						</div>
					)}

					{/* Пациент и Врач */}
					<div className="grid grid-cols-2 gap-2">
						<div>
							<label className="font-semibold block mb-1">Пациент (ФИО):</label>
							<input
								type="text"
								required
								value={formPatientName}
								onChange={(e) => setFormPatientName(e.target.value)}
								className="w-full h-9 px-2.5 rounded-lg border border-[var(--line,#cbd5e1)] bg-[var(--paper,#ffffff)] text-xs focus:ring-1 focus:ring-teal-500 focus:outline-none"
								data-testid="form-patient-name-input"
							/>
						</div>
						<div>
							<label className="font-semibold block mb-1">Врач-ортопед:</label>
							<input
								type="text"
								required
								value={formDoctorName}
								onChange={(e) => setFormDoctorName(e.target.value)}
								className="w-full h-9 px-2.5 rounded-lg border border-[var(--line,#cbd5e1)] bg-[var(--paper,#ffffff)] text-xs focus:ring-1 focus:ring-teal-500 focus:outline-none"
								data-testid="form-doctor-name-input"
							/>
						</div>
					</div>

					{/* Лаборатория и Зубной техник */}
					<div className="grid grid-cols-2 gap-2">
						<div>
							<label className="font-semibold block mb-1">Зуботехническая лаб.:</label>
							<input
								type="text"
								required
								value={formLabName}
								onChange={(e) => setFormLabName(e.target.value)}
								className="w-full h-9 px-2.5 rounded-lg border border-[var(--line,#cbd5e1)] bg-[var(--paper,#ffffff)] text-xs focus:ring-1 focus:ring-teal-500 focus:outline-none"
							/>
						</div>
						<div>
							<label className="font-semibold block mb-1">Зубной техник (ФИО):</label>
							<input
								type="text"
								placeholder="Опционально"
								value={formTechnicianName}
								onChange={(e) => setFormTechnicianName(e.target.value)}
								className="w-full h-9 px-2.5 rounded-lg border border-[var(--line,#cbd5e1)] bg-[var(--paper,#ffffff)] text-xs focus:ring-1 focus:ring-teal-500 focus:outline-none"
							/>
						</div>
					</div>

					{/* Зубная формула FDI и Вид конструкции */}
					<div className="space-y-2">
						<div className="grid grid-cols-2 gap-2">
							<div>
								<div className="flex items-center justify-between mb-1">
									<label className="font-semibold">Зубы FDI (11–48):</label>
									<span className="text-[10px] text-[var(--muted,#64748b)]">Формула</span>
								</div>
								<input
									type="text"
									required
									placeholder="16 или 11, 21"
									value={formTeethInput}
									onChange={(e) => setFormTeethInput(e.target.value)}
									className="w-full h-9 px-2.5 rounded-lg border border-[var(--line,#cbd5e1)] bg-[var(--paper,#ffffff)] text-xs font-mono font-bold text-teal-700 dark:text-teal-300 focus:ring-1 focus:ring-teal-500 focus:outline-none"
									data-testid="form-teeth-fdi-input"
								/>
							</div>
							<div>
								<label className="font-semibold block mb-1">Вид конструкции:</label>
								<select
									value={formConstruction}
									onChange={(e) => handleSelectConstruction(e.target.value)}
									className="w-full h-9 px-2 rounded-lg border border-[var(--line,#cbd5e1)] bg-[var(--paper,#ffffff)] text-xs focus:ring-1 focus:ring-teal-500 focus:outline-none"
									data-testid="form-construction-select"
								>
									<optgroup label="Клинические группы (ортопедия, съемные, каппы)">
										{Object.values(DENTAL_LAB_CONSTRUCTIONS).map((c) => (
											<option key={c.id} value={c.id}>
												{c.nameRu}
											</option>
										))}
									</optgroup>
									<optgroup label="Каталог 17 изделий ЗТЛ (DentTechnician)">
										{CANONICAL_LAB_WORK_TYPES.map((wt) => (
											<option key={wt.id} value={wt.id}>
												[{wt.id.toUpperCase()}] {wt.titleRu}
											</option>
										))}
									</optgroup>
								</select>
							</div>
						</div>

						{/* Быстрые чипы зубной формулы */}
						<div className="flex items-center gap-1.5 flex-wrap">
							<span className="text-[10px] text-[var(--muted,#64748b)] font-semibold">Пресеты дуги:</span>
							<button
								type="button"
								onClick={() => setFormTeethInput("16")}
								className="min-h-[28px] px-2 py-0.5 rounded-md bg-[var(--paper-soft,#f8fafc)] hover:bg-teal-500/10 border border-[var(--line,#cbd5e1)] text-[11px] font-mono"
							>
								16
							</button>
							<button
								type="button"
								onClick={() => setFormTeethInput("11, 21")}
								className="min-h-[28px] px-2 py-0.5 rounded-md bg-[var(--paper-soft,#f8fafc)] hover:bg-teal-500/10 border border-[var(--line,#cbd5e1)] text-[11px] font-mono"
							>
								11, 21
							</button>
							<button
								type="button"
								onClick={() => setFormTeethInput("18, 17, 16, 15, 14, 13, 12, 11, 21, 22, 23, 24, 25, 26, 27, 28")}
								className="min-h-[28px] px-2 py-0.5 rounded-md bg-[var(--paper-soft,#f8fafc)] hover:bg-teal-500/10 border border-[var(--line,#cbd5e1)] text-[11px]"
							>
								Вся ВЧ (18–28)
							</button>
							<button
								type="button"
								onClick={() => setFormTeethInput("48, 47, 46, 45, 44, 43, 42, 41, 31, 32, 33, 34, 35, 36, 37, 38")}
								className="min-h-[28px] px-2 py-0.5 rounded-md bg-[var(--paper-soft,#f8fafc)] hover:bg-teal-500/10 border border-[var(--line,#cbd5e1)] text-[11px]"
							>
								Вся НЧ (38–48)
							</button>
						</div>
					</div>

					{/* Расцветка VITA, Прозрачность, Культя */}
					<div className="p-2.5 rounded-xl bg-[var(--paper-soft,#f8fafc)] border border-[var(--line,#cbd5e1)] space-y-2">
						<div className="font-bold text-xs text-[var(--ink,#0f172a)] flex items-center justify-between">
							<span className="flex items-center gap-1.5">
								<span>Расцветка VITA и оптические параметры</span>
								<span
									className="inline-block w-3.5 h-3.5 rounded-full border border-black/20 shadow-2xs"
									style={{ backgroundColor: getVitaShadeHex(formVitaShade) || "#EBD7BB" }}
									title={`Цвет VITA: ${formVitaShade}`}
								/>
							</span>
							<span className="font-mono font-bold text-teal-700 dark:text-teal-300">{formVitaShade}</span>
						</div>
						<div className="grid grid-cols-3 gap-2">
							<div>
								<label className="text-[11px] block mb-0.5">Цвет VITA:</label>
								<select
									value={formVitaShade}
									onChange={(e) => setFormVitaShade(e.target.value)}
									className="w-full h-8 px-1.5 rounded-lg border border-[var(--line,#cbd5e1)] bg-[var(--paper,#ffffff)] text-xs font-mono font-bold"
									data-testid="form-vita-shade-select"
								>
									<optgroup label="VITA Classical (A1–D4)">
										{VITA_CLASSICAL_SHADES.map((s) => (
											<option key={s} value={s}>{s}</option>
										))}
									</optgroup>
									<optgroup label="Bleach">
										{VITA_BLEACH_SHADES.map((s) => (
											<option key={s} value={s}>{s}</option>
										))}
									</optgroup>
								</select>
							</div>
							<div>
								<label className="text-[11px] block mb-0.5">Прозрачность:</label>
								<select
									value={formTranslucency}
									onChange={(e) => setFormTranslucency(e.target.value)}
									className="w-full h-8 px-1.5 rounded-lg border border-[var(--line,#cbd5e1)] bg-[var(--paper,#ffffff)] text-xs"
								>
									{ENAMEL_TRANSLUCENCY_OPTIONS.map((t) => (
										<option key={t.id} value={t.id}>{t.id}</option>
									))}
								</select>
							</div>
							<div>
								<label className="text-[11px] block mb-0.5">Культя (ND):</label>
								<select
									value={formStumpShade}
									onChange={(e) => setFormStumpShade(e.target.value)}
									className="w-full h-8 px-1.5 rounded-lg border border-[var(--line,#cbd5e1)] bg-[var(--paper,#ffffff)] text-xs"
								>
									{STUMP_NATURAL_DIE_SHADES.map((nd) => (
										<option key={nd.id} value={nd.id}>{nd.id}</option>
									))}
								</select>
							</div>
						</div>
					</div>

					{/* Даты: Отправка, Дедлайн ЗТЛ по рабочим дням, Дата визита на примерку */}
					<div className="space-y-2">
						<div className="grid grid-cols-3 gap-2">
							<div>
								<label className="font-semibold block mb-1">Отправка:</label>
								<input
									type="date"
									required
									value={formSentDate}
									onChange={(e) => setFormSentDate(e.target.value)}
									className="w-full h-8 px-2 rounded-lg border border-[var(--line,#cbd5e1)] bg-[var(--paper,#ffffff)] text-xs"
								/>
							</div>
							<div>
								<label className="font-semibold block mb-1 text-teal-800 dark:text-teal-200">
									Дедлайн ЗТЛ:
								</label>
								<input
									type="date"
									required
									value={formDeadlineDate}
									onChange={(e) => setFormDeadlineDate(e.target.value)}
									className="w-full h-8 px-2 rounded-lg border border-[var(--line,#cbd5e1)] bg-[var(--paper,#ffffff)] text-xs font-bold text-teal-700 dark:text-teal-300"
									data-testid="form-deadline-input"
								/>
							</div>
							<div>
								<label className="font-semibold block mb-1 text-amber-800 dark:text-amber-200">
									Примерка:
								</label>
								<input
									type="date"
									value={formScheduledVisit}
									onChange={(e) => setFormScheduledVisit(e.target.value)}
									className="w-full h-8 px-2 rounded-lg border border-[var(--line,#cbd5e1)] bg-[var(--paper,#ffffff)] text-xs font-bold text-amber-700 dark:text-amber-300"
									data-testid="form-scheduled-visit-input"
								/>
							</div>
						</div>

						{/* Кнопки быстрых рабочих дней ЗТЛ и авто-визита примерки */}
						<div className="flex items-center justify-between gap-1 flex-wrap">
							<div className="flex items-center gap-1">
								<span className="text-[10px] text-[var(--muted,#64748b)]">Срок:</span>
								{[
									{ label: "+3 раб. дн.", days: 3 },
									{ label: "+5 раб. дн.", days: 5 },
									{ label: "+7 раб. дн.", days: 7 },
									{ label: "+10 раб. дн.", days: 10 },
								].map((btn) => (
									<button
										key={btn.days}
										type="button"
										onClick={() => handleSetWorkingDays(btn.days)}
										className="min-h-[26px] px-1.5 py-0.5 rounded bg-[var(--paper-soft,#f8fafc)] hover:bg-teal-500/10 border border-[var(--line,#cbd5e1)] text-[10px] font-medium transition-colors"
										title={`Рассчитать дедлайн с пропуском суббот и воскресений: ${btn.days} раб. дней`}
									>
										{btn.label}
									</button>
								))}
							</div>
							<button
								type="button"
								onClick={handleAutoBookFitting}
								className="min-h-[26px] px-2 py-0.5 rounded bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-900 dark:text-amber-200 text-[10px] font-bold inline-flex items-center gap-1 transition-colors"
								title="Назначить визит на следующий рабочий день после готовности в лаборатории"
								data-testid="btn-auto-schedule-fitting"
							>
								<Calendar size={11} />
								<span>Визит (+1 раб. день)</span>
							</button>
						</div>

						{/* Алерт коллизии: прием назначен раньше готовности ЗТЛ */}
						{collision.hasCollision && (
							<div
								className="p-2.5 rounded-xl bg-amber-500/15 border border-amber-500/40 text-amber-950 dark:text-amber-100 flex items-start justify-between gap-2 text-xs"
								data-testid="drawer-fitting-collision-alert"
							>
								<div className="flex items-start gap-1.5 min-w-0">
									<AlertTriangle size={15} className="text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
									<div className="min-w-0">
										<div className="font-bold leading-tight">Прием назначен раньше готовности ЗТЛ!</div>
										<div className="text-[11px] text-amber-900/80 dark:text-amber-200/80 mt-0.5 truncate">
											{collision.warningRu}
										</div>
									</div>
								</div>
								<button
									type="button"
									onClick={handleAutoBookFitting}
									className="px-2 py-1 rounded-lg bg-amber-600 hover:bg-amber-500 text-white font-bold text-[11px] shrink-0 cursor-pointer"
								>
									Сдвинуть визит
								</button>
							</div>
						)}
					</div>

					{/* 4-ЭТАПНЫЙ СТАТУС-ТРЕКЕР НАКАЗА В ЗТЛ */}
					<div className="p-2.5 rounded-xl bg-[var(--paper-soft,#f8fafc)] border border-[var(--line,#cbd5e1)] space-y-1.5">
						<label className="font-semibold block text-xs">Статус наряда (4-этапный трекер):</label>
						<select
							value={formStatus}
							onChange={(e) => setFormStatus(e.target.value as DentalLabOrderStatus)}
							className="w-full h-8 px-2 rounded-lg border border-[var(--line,#cbd5e1)] bg-[var(--paper,#ffffff)] text-xs font-semibold focus:ring-1 focus:ring-teal-500"
							data-testid="form-status-select"
						>
							<option value="sent_to_lab">1. Отправлен в ЗТЛ (передан курьеру)</option>
							<option value="in_progress">2. В работе у техника (CAD/CAM фрезеровка)</option>
							<option value="ready_in_clinic">3. Поступил в клинику (готов к примерке)</option>
							<option value="delivered_to_patient">4. Сдан пациенту (зафиксирован в полости рта)</option>
						</select>
					</div>

					{/* ФИНАНСОВЫЙ БЛОК: СЕБЕСТОИМОСТЬ ЗТЛ И РАЗДЕЛЕНИЕ ВАЛА ВРАЧА */}
					<div className="p-3 rounded-xl bg-teal-500/10 border border-teal-500/30 space-y-2">
						<div className="font-bold text-xs text-[var(--ink,#0f172a)] flex items-center justify-between">
							<span>Финансовый расчет наряда ЗТЛ</span>
							<span className="text-[11px] text-[var(--muted,#64748b)]">Вычет ЗТЛ из вала</span>
						</div>
						<div className="grid grid-cols-3 gap-2">
							<div>
								<label className="text-[11px] block mb-0.5">Пациент (₽/ед):</label>
								<input
									type="number"
									min={0}
									step={100}
									value={formPatientPriceRub}
									onChange={(e) => setFormPatientPriceRub(Number(e.target.value))}
									className="w-full h-8 px-2 rounded-lg border border-[var(--line,#cbd5e1)] bg-[var(--paper,#ffffff)] text-xs font-mono font-bold"
									data-testid="form-patient-price-input"
								/>
							</div>
							<div>
								<label className="text-[11px] block mb-0.5 text-rose-700 dark:text-rose-300 font-bold">
									Себест. ЗТЛ (₽/ед):
								</label>
								<input
									type="number"
									min={0}
									step={100}
									value={formZtlCostRub}
									onChange={(e) => setFormZtlCostRub(Number(e.target.value))}
									className="w-full h-8 px-2 rounded-lg border border-rose-300 bg-[var(--paper,#ffffff)] text-xs font-mono font-bold text-rose-700 dark:text-rose-300"
									data-testid="form-ztl-cost-input"
								/>
							</div>
							<div>
								<label className="text-[11px] block mb-0.5">Врач (%):</label>
								<input
									type="number"
									min={0}
									max={100}
									value={formDoctorPercent}
									onChange={(e) => setFormDoctorPercent(Number(e.target.value))}
									className="w-full h-8 px-2 rounded-lg border border-[var(--line,#cbd5e1)] bg-[var(--paper,#ffffff)] text-xs font-mono"
								/>
							</div>
						</div>

						{/* Расчет ЗП врача и маржи клиники */}
						{(() => {
							const count = Math.max(1, parseFdiTeethString(formTeethInput).length);
							const fin = calculateZtlWageFinancials({
								unitsCount: count,
								patientPriceRub: formPatientPriceRub,
								ztlCostRub: formZtlCostRub,
								doctorSharePercent: formDoctorPercent,
							});

							return (
								<div className="pt-1.5 border-t border-teal-500/20 flex items-center justify-between text-[11px] font-mono">
									<span>
										База врача: <strong>{money(fin.doctorWageBaseRub)}</strong>
									</span>
									<span className="text-emerald-700 dark:text-emerald-300 font-bold">
										ЗП врача: {money(fin.doctorWageRub)}
									</span>
									<span className="text-[var(--muted,#64748b)]">
										Клиника: {money(fin.clinicMarginRub)}
									</span>
								</div>
							);
						})()}
					</div>

					{/* Клинические примечания технику */}
					<div>
						<label className="font-semibold block mb-1">Клинические примечания технику:</label>
						<textarea
							rows={2}
							placeholder="Особенности препарирования, тип уступа, контакты..."
							value={formClinicalNotes}
							onChange={(e) => setFormClinicalNotes(e.target.value)}
							className="w-full p-2 rounded-lg border border-[var(--line,#cbd5e1)] bg-[var(--paper,#ffffff)] text-xs focus:ring-1 focus:ring-teal-500 focus:outline-none"
						/>
					</div>

					{/* Кнопки дравера */}
					<div className="pt-2 flex items-center justify-end gap-2 pb-[calc(1rem+env(safe-area-inset-bottom,0px))]">
						<button
							type="button"
							onClick={onClose}
							className="min-h-[44px] sm:min-h-[36px] px-3.5 rounded-xl border border-[var(--line,#cbd5e1)] bg-[var(--paper,#ffffff)] hover:bg-[var(--line,#e2e8f0)] font-medium text-xs transition-colors cursor-pointer"
						>
							Отмена
						</button>
						<button
							type="submit"
							className="min-h-[44px] sm:min-h-[36px] px-4 rounded-xl bg-teal-600 hover:bg-teal-700 active:bg-teal-800 text-white font-bold text-xs inline-flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
							data-testid="form-save-order-btn"
						>
							<Check className="w-4 h-4" />
							<span>{editingOrder ? "Сохранить изменения" : "Оформить наряд ЗТЛ"}</span>
						</button>
					</div>
				</form>
			</div>
		</div>
	);
}
