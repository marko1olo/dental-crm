import React, { useState, useEffect } from "react";
import { X, Check } from "lucide-react";
import {
	type DentalLabConstructionType,
	type DentalLabOrderRecord,
	DENTAL_LAB_CONSTRUCTIONS,
	VITA_CLASSICAL_SHADES,
	VITA_BLEACH_SHADES,
	ENAMEL_TRANSLUCENCY_OPTIONS,
	STUMP_NATURAL_DIE_SHADES,
	parseFdiTeethString,
	calculateZtlWageFinancials,
	createDentalLabOrderRecord,
	toIsoDate,
} from "./dentalLabOrderEngine";
import { money } from "../../AppHelpers";

export interface DentalLabOrderDrawerProps {
	readonly isOpen: boolean;
	readonly onClose: () => void;
	readonly editingOrder: DentalLabOrderRecord | null;
	readonly currentPatientName?: string | undefined;
	readonly currentDoctorName?: string | undefined;
	readonly currentToothNumber?: number | string | undefined;
	readonly onSaveOrder: (order: DentalLabOrderRecord, isEdit: boolean) => void;
}

export function DentalLabOrderDrawer({
	isOpen,
	onClose,
	editingOrder,
	currentPatientName,
	currentDoctorName,
	currentToothNumber,
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
		const d = new Date();
		d.setDate(d.getDate() + 5);
		return toIsoDate(d);
	});
	const [formScheduledVisit, setFormScheduledVisit] = useState("");
	const [formPatientPriceRub, setFormPatientPriceRub] = useState(24000);
	const [formZtlCostRub, setFormZtlCostRub] = useState(7500);
	const [formDoctorPercent, setFormDoctorPercent] = useState(20);
	const [formClinicalNotes, setFormClinicalNotes] = useState("");

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
			setFormSentDate(toIsoDate(new Date()));
			const d = new Date();
			d.setDate(d.getDate() + 5);
			setFormDeadlineDate(toIsoDate(d));
			setFormScheduledVisit("");
			setFormPatientPriceRub(24000);
			setFormZtlCostRub(7500);
			setFormDoctorPercent(20);
			setFormClinicalNotes("");
		}
	}, [editingOrder, currentPatientName, currentDoctorName, currentToothNumber, isOpen]);

	if (!isOpen) return null;

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

		if (editingOrder) {
			const updated: DentalLabOrderRecord = {
				...editingOrder,
				patientName: formPatientName || "Пациент",
				doctorName: formDoctorName || "Врач-ортопед",
				labName: formLabName,
				technicianName: formTechnicianName || undefined,
				teethFdi: teethFinal,
				constructionType: formConstruction,
				materialRu: def.defaultMaterialRu,
				vitaShade: formVitaShade,
				translucency: formTranslucency,
				stumpShade: formStumpShade,
				sentDate: formSentDate,
				deadlineDate: formDeadlineDate,
				scheduledVisitDate: formScheduledVisit || undefined,
				patientPriceKopecks: fin.patientPriceKopecks,
				ztlCostKopecks: fin.ztlCostKopecks,
				doctorSharePercent: fin.doctorSharePercent,
				clinicalNotes: formClinicalNotes || undefined,
				updatedAt: new Date().toISOString(),
			};
			onSaveOrder(updated, true);
		} else {
			const created = createDentalLabOrderRecord({
				patientName: formPatientName || "Пациент",
				doctorName: formDoctorName || "Врач-ортопед",
				labName: formLabName,
				technicianName: formTechnicianName || undefined,
				teethFdi: teethFinal,
				constructionType: formConstruction,
				materialRu: def.defaultMaterialRu,
				vitaShade: formVitaShade,
				translucency: formTranslucency,
				stumpShade: formStumpShade,
				sentDate: formSentDate,
				deadlineDate: formDeadlineDate,
				scheduledVisitDate: formScheduledVisit || undefined,
				patientPriceKopecks: fin.patientPriceKopecks,
				ztlCostKopecks: fin.ztlCostKopecks,
				doctorSharePercent: fin.doctorSharePercent,
				clinicalNotes: formClinicalNotes || undefined,
			});
			onSaveOrder(created, false);
		}
	};

	return (
		<div
			className="absolute inset-0 z-50 bg-slate-950/40 backdrop-blur-2xs flex justify-end"
			onClick={(e) => {
				if (e.target === e.currentTarget) onClose();
			}}
		>
			<div
				className="w-full max-w-lg bg-[var(--paper,#ffffff)] border-l border-[var(--line,#cbd5e1)] h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-150 overflow-hidden"
				onClick={(e) => e.stopPropagation()}
			>
				{/* Шапка дравера */}
				<div className="flex items-center justify-between px-4 py-3 border-b border-[var(--line,#cbd5e1)] bg-[var(--paper-soft,#f8fafc)] shrink-0">
					<h3 className="text-sm font-bold text-[var(--ink,#0f172a)] m-0">
						{editingOrder ? `Редактирование наряда ${editingOrder.orderNumber}` : "Новый наряд в ЗТЛ"}
					</h3>
					<button
						type="button"
						onClick={onClose}
						className="w-7 h-7 rounded-lg text-[var(--muted,#64748b)] hover:text-[var(--ink,#0f172a)] flex items-center justify-center cursor-pointer"
					>
						<X className="w-4 h-4" />
					</button>
				</div>

				{/* Форма наряда */}
				<form onSubmit={handleFormSubmit} className="flex-1 overflow-y-auto p-4 space-y-3 text-xs">
					{/* Пациент и Врач */}
					<div className="grid grid-cols-2 gap-2">
						<div>
							<label className="font-semibold block mb-1">Пациент (ФИО):</label>
							<input
								type="text"
								required
								value={formPatientName}
								onChange={(e) => setFormPatientName(e.target.value)}
								className="w-full h-8 px-2.5 rounded-lg border border-[var(--line,#cbd5e1)] bg-[var(--paper,#ffffff)] text-xs focus:ring-1 focus:ring-teal-500 focus:outline-none"
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
								className="w-full h-8 px-2.5 rounded-lg border border-[var(--line,#cbd5e1)] bg-[var(--paper,#ffffff)] text-xs focus:ring-1 focus:ring-teal-500 focus:outline-none"
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
								className="w-full h-8 px-2.5 rounded-lg border border-[var(--line,#cbd5e1)] bg-[var(--paper,#ffffff)] text-xs focus:ring-1 focus:ring-teal-500 focus:outline-none"
							/>
						</div>
						<div>
							<label className="font-semibold block mb-1">Зубной техник (ФИО):</label>
							<input
								type="text"
								placeholder="Опционально"
								value={formTechnicianName}
								onChange={(e) => setFormTechnicianName(e.target.value)}
								className="w-full h-8 px-2.5 rounded-lg border border-[var(--line,#cbd5e1)] bg-[var(--paper,#ffffff)] text-xs focus:ring-1 focus:ring-teal-500 focus:outline-none"
							/>
						</div>
					</div>

					{/* Зубная формула FDI и Вид конструкции */}
					<div className="grid grid-cols-2 gap-2">
						<div>
							<label className="font-semibold block mb-1">Зубы по формуле FDI (11–48):</label>
							<input
								type="text"
								required
								placeholder="16 или 11, 21"
								value={formTeethInput}
								onChange={(e) => setFormTeethInput(e.target.value)}
								className="w-full h-8 px-2.5 rounded-lg border border-[var(--line,#cbd5e1)] bg-[var(--paper,#ffffff)] text-xs font-mono font-bold text-teal-700 dark:text-teal-300 focus:ring-1 focus:ring-teal-500 focus:outline-none"
								data-testid="form-teeth-fdi-input"
							/>
						</div>
						<div>
							<label className="font-semibold block mb-1">Вид конструкции (6 видов):</label>
							<select
								value={formConstruction}
								onChange={(e) => {
									const val = e.target.value as DentalLabConstructionType;
									setFormConstruction(val);
									const d = DENTAL_LAB_CONSTRUCTIONS[val];
									setFormPatientPriceRub(d.defaultPatientPriceKopecks / 100);
									setFormZtlCostRub(d.defaultZtlCostKopecks / 100);
								}}
								className="w-full h-8 px-2 rounded-lg border border-[var(--line,#cbd5e1)] bg-[var(--paper,#ffffff)] text-xs focus:ring-1 focus:ring-teal-500 focus:outline-none"
								data-testid="form-construction-select"
							>
								{Object.values(DENTAL_LAB_CONSTRUCTIONS).map((c) => (
									<option key={c.id} value={c.id}>
										{c.nameRu}
									</option>
								))}
							</select>
						</div>
					</div>

					{/* Расцветка VITA, Прозрачность, Культя */}
					<div className="p-2.5 rounded-xl bg-[var(--paper-soft,#f8fafc)] border border-[var(--line,#cbd5e1)] space-y-2">
						<div className="font-bold text-xs text-[var(--ink,#0f172a)] flex items-center justify-between">
							<span>Расцветка VITA и оптические параметры</span>
							<span className="font-mono text-teal-700 dark:text-teal-300">{formVitaShade}</span>
						</div>
						<div className="grid grid-cols-3 gap-2">
							<div>
								<label className="text-[11px] block mb-0.5">Цвет VITA:</label>
								<select
									value={formVitaShade}
									onChange={(e) => setFormVitaShade(e.target.value)}
									className="w-full h-7 px-1.5 rounded-lg border border-[var(--line,#cbd5e1)] bg-[var(--paper,#ffffff)] text-xs font-mono font-bold"
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
									className="w-full h-7 px-1.5 rounded-lg border border-[var(--line,#cbd5e1)] bg-[var(--paper,#ffffff)] text-xs"
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
									className="w-full h-7 px-1.5 rounded-lg border border-[var(--line,#cbd5e1)] bg-[var(--paper,#ffffff)] text-xs"
								>
									{STUMP_NATURAL_DIE_SHADES.map((nd) => (
										<option key={nd.id} value={nd.id}>{nd.id}</option>
									))}
								</select>
							</div>
						</div>
					</div>

					{/* Даты: Отправка, Дедлайн, Дата визита */}
					<div className="grid grid-cols-3 gap-2">
						<div>
							<label className="font-semibold block mb-1">Дата отправки:</label>
							<input
								type="date"
								required
								value={formSentDate}
								onChange={(e) => setFormSentDate(e.target.value)}
								className="w-full h-8 px-2 rounded-lg border border-[var(--line,#cbd5e1)] bg-[var(--paper,#ffffff)] text-xs"
							/>
						</div>
						<div>
							<label className="font-semibold block mb-1">ДЕДЛАЙН сдачи:</label>
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
							<label className="font-semibold block mb-1">Визит на примерку:</label>
							<input
								type="date"
								value={formScheduledVisit}
								onChange={(e) => setFormScheduledVisit(e.target.value)}
								className="w-full h-8 px-2 rounded-lg border border-[var(--line,#cbd5e1)] bg-[var(--paper,#ffffff)] text-xs font-bold text-amber-700 dark:text-amber-300"
								data-testid="form-scheduled-visit-input"
							/>
						</div>
					</div>

					{/* ФИНАНСОВЫЙ БЛОК: СЕБЕСТОИМОСТЬ ЗТЛ И ВЫЧЕТ ИЗ ВАЛА ВРАЧА */}
					<div className="p-3 rounded-xl bg-teal-500/10 border border-teal-500/30 space-y-2">
						<div className="font-bold text-xs text-[var(--ink,#0f172a)] flex items-center justify-between">
							<span>Финансовый расчет сдельной ЗП врача</span>
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
									className="w-full h-7 px-2 rounded-lg border border-[var(--line,#cbd5e1)] bg-[var(--paper,#ffffff)] text-xs font-mono font-bold"
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
									className="w-full h-7 px-2 rounded-lg border border-rose-300 bg-[var(--paper,#ffffff)] text-xs font-mono font-bold text-rose-700 dark:text-rose-300"
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
									className="w-full h-7 px-2 rounded-lg border border-[var(--line,#cbd5e1)] bg-[var(--paper,#ffffff)] text-xs font-mono"
								/>
							</div>
						</div>

						{/* Предпросмотр расчета ЗП */}
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

					{/* Клинические примечания */}
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
					<div className="pt-2 flex items-center justify-end gap-2">
						<button
							type="button"
							onClick={onClose}
							className="h-8 px-3 rounded-lg border border-[var(--line,#cbd5e1)] bg-[var(--paper,#ffffff)] hover:bg-[var(--line,#e2e8f0)] font-medium text-xs transition-colors cursor-pointer"
						>
							Отмена
						</button>
						<button
							type="submit"
							className="h-8 px-4 rounded-lg bg-teal-600 hover:bg-teal-700 active:bg-teal-800 text-white font-bold text-xs inline-flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
							data-testid="form-save-order-btn"
						>
							<Check className="w-3.5 h-3.5" />
							<span>{editingOrder ? "Сохранить изменения" : "Оформить наряд ЗТЛ"}</span>
						</button>
					</div>
				</form>
			</div>
		</div>
	);
}
