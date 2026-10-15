import React, { useState, useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import {
	X,
	Check,
	Calendar,
	AlertTriangle,
	Layers,
	Zap,
	Camera,
	FileText,
} from "lucide-react";
import {
	type DentalLabConstructionType, type DentalLabOrderStatus, type DentalLabOrderRecord,
	DENTAL_LAB_CONSTRUCTIONS, parseFdiTeethString,
	calculateZtlWageFinancials, createDentalLabOrderRecord, toIsoDate,
	addWorkingDaysRu, checkFittingAppointmentCollision, CANONICAL_LAB_WORK_TYPES,
	getLabWorkTypeById,
} from "./dentalLabOrderEngine";
import { denteAdminSecretRequestHeaders } from "../../AppHelpers";
import { showToast } from "../GlobalToast";
import { DentalLabDrawerShadesSection } from "./drawerSections/DentalLabDrawerShadesSection";
import { DentalLabDrawerFinancialsSection } from "./drawerSections/DentalLabDrawerFinancialsSection";
import { DentalLabDrawerScanSection } from "./drawerSections/DentalLabDrawerScanSection";

export interface DentalLabOrderDrawerProps {
	readonly isOpen: boolean;
	readonly onClose: () => void;
	readonly editingOrder?: DentalLabOrderRecord | any | null | undefined;
	readonly initialOrder?: DentalLabOrderRecord | any | null | undefined;
	readonly currentPatientId?: string | undefined;
	readonly patientId?: string | undefined;
	readonly currentPatientName?: string | undefined;
	readonly patientName?: string | undefined;
	readonly currentDoctorName?: string | undefined;
	readonly doctorName?: string | undefined;
	readonly currentDoctorId?: string | undefined;
	readonly doctorId?: string | undefined;
	readonly currentToothNumber?: number | string | undefined;
	readonly initialToothFdi?: number | string | undefined;
	readonly treatmentPlanId?: string | undefined;
	readonly stageNumber?: number | undefined;
	readonly stageTitle?: string | undefined;
	readonly stageId?: string | undefined;
	readonly scheduledVisitDate?: string | undefined;
	readonly patientChartNumber?: string | undefined;
	readonly initialTab?: string | undefined;
	readonly onSaveOrder?: ((order: DentalLabOrderRecord, isEdit: boolean) => void) | undefined;
	readonly onOrderSaved?: ((order?: any) => void) | undefined;
}

export function DentalLabOrderDrawer({
	isOpen,
	onClose,
	editingOrder: propEditingOrder,
	initialOrder,
	currentPatientId,
	patientId,
	currentPatientName,
	patientName,
	currentDoctorName,
	doctorName,
	currentDoctorId,
	doctorId,
	currentToothNumber,
	initialToothFdi,
	treatmentPlanId,
	stageNumber,
	stageTitle,
	stageId,
	scheduledVisitDate,
	patientChartNumber,
	initialTab,
	onSaveOrder,
	onOrderSaved,
}: DentalLabOrderDrawerProps) {
	const editingOrder = propEditingOrder ?? initialOrder ?? null;
	const resolvedPatientName = editingOrder?.patientName ?? patientName ?? currentPatientName ?? "";
	const resolvedDoctorName = editingOrder?.doctorName ?? doctorName ?? currentDoctorName ?? "Д-р Орлов А.В. (Ортопед)";
	const resolvedTooth = editingOrder ? editingOrder.teethFdi?.join(", ") : currentToothNumber ?? initialToothFdi ?? "16";

	const [formPatientName, setFormPatientName] = useState(resolvedPatientName);
	const [formDoctorName, setFormDoctorName] = useState(resolvedDoctorName);
	const [formLabName, setFormLabName] = useState("CAD/CAM Центр Дентал-Мастер");
	const [formTechnicianName, setFormTechnicianName] = useState("");
	const [formTeethInput, setFormTeethInput] = useState(String(resolvedTooth));
	const [formConstruction, setFormConstruction] = useState<DentalLabConstructionType>("crown_zirconia");
	const [formVitaShade, setFormVitaShade] = useState("A2");
	const [formTranslucency, setFormTranslucency] = useState<"HT" | "MT" | "LT" | "MO" | "HO">("MT");
	const [formStumpShade, setFormStumpShade] = useState("ND2");
	const [formSentDate, setFormSentDate] = useState(() => toIsoDate(new Date()));
	const [formDeadlineDate, setFormDeadlineDate] = useState(() => toIsoDate(addWorkingDaysRu(new Date(), 5)));
	const [formScheduledVisit, setFormScheduledVisit] = useState(scheduledVisitDate || "");
	const [formPatientPriceRub, setFormPatientPriceRub] = useState(24000);
	const [formZtlCostRub, setFormZtlCostRub] = useState(7500);
	const [formDoctorPercent, setFormDoctorPercent] = useState(20);
	const [formClinicalNotes, setFormClinicalNotes] = useState("");
	const [formAttachedScanUrl, setFormAttachedScanUrl] = useState("");
	const [formStatus, setFormStatus] = useState<DentalLabOrderStatus>("sent_to_lab");
	const [formTreatmentPlanId, setFormTreatmentPlanId] = useState<string | undefined>(treatmentPlanId);
	const [formStageNumber, setFormStageNumber] = useState<number | undefined>(stageNumber);
	const [formStageTitle, setFormStageTitle] = useState<string | undefined>(stageTitle);
	const [formStageId, setFormStageId] = useState<string | undefined>(stageId);

	useEffect(() => {
		const now = new Date();
		setFormPatientName(editingOrder?.patientName ?? patientName ?? currentPatientName ?? "");
		setFormDoctorName(editingOrder?.doctorName ?? doctorName ?? currentDoctorName ?? "Д-р Орлов А.В. (Ортопед)");
		setFormLabName(editingOrder?.labName ?? "CAD/CAM Центр Дентал-Мастер");
		setFormTechnicianName(editingOrder?.technicianName ?? "");
		setFormTeethInput(
			editingOrder
				? (Array.isArray(editingOrder.teethFdi) ? editingOrder.teethFdi.join(", ") : String(editingOrder.teethFdi || editingOrder.toothFdi || "16"))
				: currentToothNumber
					? String(currentToothNumber)
					: initialToothFdi
						? String(initialToothFdi)
						: "16",
		);
		setFormConstruction(editingOrder?.constructionType ?? "crown_zirconia");
		setFormVitaShade(editingOrder?.vitaShade ?? editingOrder?.colorVita ?? "A2");
		setFormTranslucency((editingOrder?.translucency as "HT" | "MT" | "LT" | "MO" | "HO") || "MT");
		setFormStumpShade(editingOrder?.stumpShade ?? "ND2");
		setFormSentDate(editingOrder?.sentDate ?? toIsoDate(now));
		setFormDeadlineDate(editingOrder?.deadlineDate ?? editingOrder?.dueDate ?? toIsoDate(addWorkingDaysRu(now, 5)));
		setFormScheduledVisit(editingOrder?.scheduledVisitDate ?? scheduledVisitDate ?? "");
		setFormPatientPriceRub(
			editingOrder
				? (editingOrder.patientPriceKopecks ? editingOrder.patientPriceKopecks / 100 : editingOrder.priceRub ?? 24000)
				: 24000,
		);
		setFormZtlCostRub(
			editingOrder
				? (editingOrder.ztlCostKopecks ? editingOrder.ztlCostKopecks / 100 : editingOrder.costRub ?? 7500)
				: 7500,
		);
		setFormDoctorPercent(editingOrder?.doctorSharePercent ?? 20);
		setFormClinicalNotes(editingOrder?.clinicalNotes ?? "");
		setFormAttachedScanUrl(editingOrder?.attachedScanUrl ?? editingOrder?.attachedImageUrl ?? "");
		setFormStatus(
			editingOrder?.status === "completed" || editingOrder?.status === "delivered_to_patient"
				? "delivered_to_patient"
				: editingOrder?.status === "received" || editingOrder?.status === "ready_in_clinic"
					? "ready_in_clinic"
					: editingOrder?.status === "in_progress"
						? "in_progress"
						: "sent_to_lab",
		);
		setFormTreatmentPlanId(editingOrder?.treatmentPlanId ?? treatmentPlanId);
		setFormStageNumber(editingOrder?.stageNumber ?? stageNumber);
		setFormStageTitle(editingOrder?.stageTitle ?? stageTitle);
		setFormStageId(editingOrder?.stageId ?? stageId);
	}, [
		editingOrder,
		patientName,
		currentPatientName,
		doctorName,
		currentDoctorName,
		currentToothNumber,
		initialToothFdi,
		treatmentPlanId,
		stageNumber,
		stageTitle,
		stageId,
		scheduledVisitDate,
		isOpen,
	]);

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
				const defaultTurnaround = cat.category === "auxiliary" ? 3 : cat.category === "removable_prosthetics" ? 8 : 5;
				const defaultPatient = cat.category === "auxiliary" ? 3000 : cat.category === "removable_prosthetics" ? 22000 : 18000;
				const defaultCost = cat.category === "auxiliary" ? 1000 : cat.category === "removable_prosthetics" ? 7500 : 5500;
				setFormPatientPriceRub(defaultPatient);
				setFormZtlCostRub(defaultCost);
				setFormDeadlineDate(toIsoDate(addWorkingDaysRu(formSentDate, defaultTurnaround)));
			}
		}
	};

	const handleSetWorkingDays = (days: number) => {
		setFormDeadlineDate(toIsoDate(addWorkingDaysRu(formSentDate, days)));
	};

	const handleAutoBookFitting = () => {
		setFormScheduledVisit(toIsoDate(addWorkingDaysRu(formDeadlineDate, 1)));
	};

	const handleApplyTreatmentPlanDefaults = () => {
		setFormStageNumber(stageNumber ?? 3);
		setFormStageTitle(stageTitle || "Ортопедический этап");
		setFormConstruction("crown_zirconia");
		if (currentToothNumber) setFormTeethInput(String(currentToothNumber));
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

		const payloadForApi = {
			orderNumber: editingOrder ? editingOrder.orderNumber : undefined,
			patientId: editingOrder?.patientId ?? patientId ?? currentPatientId ?? undefined,
			patientName: formPatientName || "Пациент",
			doctorId: editingOrder?.doctorId ?? doctorId ?? currentDoctorId ?? undefined,
			doctorName: formDoctorName || "Врач-ортопед",
			toothFdi: teethFinal.join(", "),
			teethFdi: teethFinal.join(", "),
			material: def?.defaultMaterialRu || "Диоксид циркония Katana ML",
			materialName: def?.nameRu || "Диоксид циркония",
			construction: formConstruction,
			colorVita: formVitaShade,
			shadeCode: formVitaShade,
			dueDate: formDeadlineDate,
			expectedLabDate: formDeadlineDate,
			priceRub: formPatientPriceRub,
			clinicalNotes: formClinicalNotes || undefined,
			attachedScanUrl: formAttachedScanUrl || undefined,
			attachedImageUrl: formAttachedScanUrl || undefined,
			status: formStatus === "delivered_to_patient" ? "completed" : formStatus === "ready_in_clinic" ? "received" : formStatus === "in_progress" ? "in_progress" : "sent",
			stage: formStatus,
		};

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
				attachedScanUrl: formAttachedScanUrl || undefined,
				updatedAt: nowIso,
			};
			onSaveOrder?.(updated, true);
			onOrderSaved?.(updated);

			if (editingOrder.id && /^[0-9a-fA-F-]{36}$/.test(editingOrder.id)) {
				fetch(`/api/clinical/lab-orders/${editingOrder.id}`, {
					method: "PUT",
					headers: {
						"Content-Type": "application/json",
						...denteAdminSecretRequestHeaders(),
					},
					body: JSON.stringify(payloadForApi),
				}).catch(() => {});
			}

			showToast("Наряд-заказ успешно сохранен", "success");

			if (typeof window !== "undefined") {
				if (formTreatmentPlanId) {
					window.dispatchEvent(
						new CustomEvent("dente-treatment-plan-stage-status", {
							detail: {
								planId: formTreatmentPlanId,
								stageNumber: formStageNumber ?? 3,
								status: "in_lab",
								statusRu: "В работе в лаборатории",
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
			onClose();
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
				attachedScanUrl: formAttachedScanUrl || undefined,
			});
			onSaveOrder?.(created, false);
			onOrderSaved?.(created);

			fetch("/api/clinical/lab-orders", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					"Idempotency-Key": `lab-order-drawer-${Date.now()}`,
					...denteAdminSecretRequestHeaders(),
				},
				body: JSON.stringify(payloadForApi),
			}).catch(() => {});

			showToast("Наряд-заказ в лабораторию успешно оформлен", "success");

			if (typeof window !== "undefined") {
				if (formTreatmentPlanId) {
					window.dispatchEvent(
						new CustomEvent("dente-treatment-plan-stage-status", {
							detail: {
								planId: formTreatmentPlanId,
								stageNumber: formStageNumber ?? 3,
								status: "in_lab",
								statusRu: "В работе в лаборатории",
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
			onClose();
		}
	};

	const drawerContent = (
		<div
			className="fixed inset-0 z-[99999] bg-slate-950/60 backdrop-blur-xs flex flex-col justify-end sm:justify-end sm:flex-row"
			onClick={(e) => {
				if (e.target === e.currentTarget) onClose();
			}}
			data-testid="dental-lab-order-drawer"
		>
			<div
				className="w-full sm:max-w-lg bg-[var(--paper,#ffffff)] border-t sm:border-t-0 sm:border-l border-[var(--line,#cbd5e1)] rounded-t-[24px] sm:rounded-none h-[92vh] sm:h-full shadow-2xl flex flex-col animate-in slide-in-from-bottom sm:slide-in-from-right duration-150 overflow-hidden"
				onClick={(e) => e.stopPropagation()}
			>
				{/* Mobile Drag Handle (Apple iOS HIG) */}
				<div className="sm:hidden pt-2.5 pb-1 flex justify-center shrink-0">
					<div className="w-9 h-1.5 rounded-full bg-[var(--line,#cbd5e1)]" />
				</div>

				{/* Шапка дравера (Apple HIG Ergonomics) */}
				<div className="flex items-center justify-between px-4 py-3 border-b border-[var(--line,#cbd5e1)] bg-[var(--paper-soft,#f8fafc)] shrink-0 gap-2">
					<div className="min-w-0 flex-1">
						<div className="flex items-center gap-1.5 flex-wrap">
							<h3 className="text-sm font-bold text-[var(--ink,#0f172a)] m-0 leading-tight">
								{editingOrder ? `Наряд-заказ № ${editingOrder.orderNumber}` : "Новый наряд-заказ в лабораторию"}
							</h3>
							<span className="px-1.5 py-0.5 text-[10px] font-bold rounded bg-teal-500/15 text-teal-700 dark:text-teal-300 border border-teal-500/30">
								Ортопедия
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
								<span className="font-bold">Ортопедический этап плана:</span> 1-клик предзаполнение параметров
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
					<div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
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
					<div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
						<div>
							<label className="font-semibold block mb-1">Лаборатория-партнёр:</label>
							<input
								type="text"
								required
								value={formLabName}
								onChange={(e) => setFormLabName(e.target.value)}
								className="w-full h-9 px-2.5 rounded-lg border border-[var(--line,#cbd5e1)] bg-[var(--paper,#ffffff)] text-xs focus:ring-1 focus:ring-teal-500 focus:outline-none"
							/>
						</div>
						<div>
							<label className="font-semibold block mb-1">Зубной техник:</label>
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
						<div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
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
									<optgroup label="Каталог конструкций лаборатории">
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
							<span className="text-[10px] text-[var(--muted,#64748b)] font-semibold">Пресеты:</span>
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
					<DentalLabDrawerShadesSection
						formVitaShade={formVitaShade}
						setFormVitaShade={setFormVitaShade}
						formTranslucency={formTranslucency}
						setFormTranslucency={setFormTranslucency}
						formStumpShade={formStumpShade}
						setFormStumpShade={setFormStumpShade}
					/>

					{/* Даты: Отправка, Дедлайн ЗТЛ по рабочим дням, Дата визита на примерку */}
					<div className="space-y-2">
						<div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
							<div>
								<label className="font-semibold block mb-1">Отправка:</label>
								<input
									type="date"
									required
									value={formSentDate}
									onChange={(e) => setFormSentDate(e.target.value)}
									className="w-full h-9 px-2 rounded-lg border border-[var(--line,#cbd5e1)] bg-[var(--paper,#ffffff)] text-xs"
								/>
							</div>
							<div>
								<label className="font-semibold block mb-1 text-teal-800 dark:text-teal-200">
									Срок готовности:
								</label>
								<input
									type="date"
									required
									value={formDeadlineDate}
									onChange={(e) => setFormDeadlineDate(e.target.value)}
									className="w-full h-9 px-2 rounded-lg border border-[var(--line,#cbd5e1)] bg-[var(--paper,#ffffff)] text-xs font-bold text-teal-700 dark:text-teal-300"
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
									className="w-full h-9 px-2 rounded-lg border border-[var(--line,#cbd5e1)] bg-[var(--paper,#ffffff)] text-xs font-bold text-amber-700 dark:text-amber-300"
									data-testid="form-scheduled-visit-input"
								/>
							</div>
						</div>

						{/* Кнопки быстрых рабочих дней лаборатории и авто-визита примерки */}
						<div className="flex items-center justify-between gap-1 flex-wrap">
							<div className="flex items-center gap-1 flex-wrap">
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
										className="min-h-[28px] px-2 py-0.5 rounded bg-[var(--paper-soft,#f8fafc)] hover:bg-teal-500/10 border border-[var(--line,#cbd5e1)] text-[11px] font-medium transition-colors"
										title={`Рассчитать срок готовности с пропуском суббот и воскресений: ${btn.days} раб. дней`}
									>
										{btn.label}
									</button>
								))}
							</div>
							<button
								type="button"
								onClick={handleAutoBookFitting}
								className="min-h-[28px] px-2.5 py-0.5 rounded bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-900 dark:text-amber-200 text-[11px] font-bold inline-flex items-center gap-1 transition-colors"
								title="Назначить визит на следующий рабочий день после готовности в лаборатории"
								data-testid="btn-auto-schedule-fitting"
							>
								<Calendar size={12} />
								<span>Визит (+1 раб. день)</span>
							</button>
						</div>

						{/* Алерт коллизии: прием назначен раньше готовности лаборатории */}
						{collision.hasCollision && (
							<div
								className="p-2.5 rounded-xl bg-amber-500/15 border border-amber-500/40 text-amber-950 dark:text-amber-100 flex items-start justify-between gap-2 text-xs"
								data-testid="drawer-fitting-collision-alert"
							>
								<div className="flex items-start gap-1.5 min-w-0">
									<AlertTriangle size={15} className="text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
									<div className="min-w-0">
										<div className="font-bold leading-tight">Приём назначен раньше готовности лаборатории!</div>
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

					{/* 4 ЖИЗНЕННЫХ СТАТУСА НАКАЗА В ЛАБОРАТОРИИ */}
					<div className="p-2.5 rounded-xl bg-[var(--paper-soft,#f8fafc)] border border-[var(--line,#cbd5e1)] space-y-1.5">
						<label className="font-semibold block text-xs">Статус наряда (4 канонических жизненных этапа):</label>
						<select
							value={formStatus}
							onChange={(e) => setFormStatus(e.target.value as DentalLabOrderStatus)}
							className="w-full h-9 px-2 rounded-lg border border-[var(--line,#cbd5e1)] bg-[var(--paper,#ffffff)] text-xs font-semibold focus:ring-1 focus:ring-teal-500"
							data-testid="form-status-select"
						>
							<option value="sent_to_lab">1. Черновик / Отправлен (передан в лабораторию)</option>
							<option value="in_progress">2. В работе в лаборатории (CAD/CAM изготовление)</option>
							<option value="ready_in_clinic">3. В клинике (Готов к примерке)</option>
							<option value="delivered_to_patient">4. Зафиксирован у пациента (Сдано)</option>
						</select>
					</div>

					{/* ФИНАНСОВЫЙ БЛОК: СЕБЕСТОИМОСТЬ ЛАБОРАТОРИИ И РАЗДЕЛЕНИЕ ВАЛА ВРАЧА */}
					<DentalLabDrawerFinancialsSection
						formTeethInput={formTeethInput}
						formPatientPriceRub={formPatientPriceRub}
						setFormPatientPriceRub={setFormPatientPriceRub}
						formZtlCostRub={formZtlCostRub}
						setFormZtlCostRub={setFormZtlCostRub}
						formDoctorPercent={formDoctorPercent}
						setFormDoctorPercent={setFormDoctorPercent}
					/>

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

					{/* Прикрепление 3D-скана STL/PLY или фото прикуса */}
					<DentalLabDrawerScanSection
						formAttachedScanUrl={formAttachedScanUrl}
						setFormAttachedScanUrl={setFormAttachedScanUrl}
					/>

					{/* Отступ снизу для безопасной зоны большого пальца */}
					<div className="h-4" />
				</form>

				{/* Floating Bottom Bar (Natural Thumb Zone & Safe Area Insets) */}
				<div className="p-3 border-t border-[var(--line,#cbd5e1)] bg-[var(--paper,#ffffff)]/95 backdrop-blur-md flex items-center justify-end gap-2.5 shrink-0 pb-[calc(0.75rem+env(safe-area-inset-bottom,0px))]">
					<button
						type="button"
						onClick={onClose}
						className="min-h-[44px] px-4 rounded-xl border border-[var(--line,#cbd5e1)] bg-[var(--paper,#ffffff)] hover:bg-[var(--line,#e2e8f0)] font-bold text-xs transition-colors cursor-pointer active:scale-95"
					>
						Отмена
					</button>
					<button
						type="button"
						onClick={handleFormSubmit}
						className="min-h-[44px] px-5 rounded-xl bg-teal-600 hover:bg-teal-700 active:bg-teal-800 text-white font-bold text-xs inline-flex items-center gap-2 shadow-sm transition-transform active:scale-95 cursor-pointer"
						data-testid="form-save-order-btn"
					>
						<Check className="w-4 h-4" />
						<span>{editingOrder ? "Сохранить изменения" : "Оформить наряд-заказ"}</span>
					</button>
				</div>
			</div>
		</div>
	);

	return typeof document !== "undefined"
		? createPortal(drawerContent, document.body)
		: drawerContent;
}
