import type React from "react";
import { FlaskConical, Send, Zap } from "lucide-react";
import { money } from "../../AppHelpers";
import { MATERIALS } from "../lab/labMath";
import { DentalLabShadePicker } from "../lab/DentalLabShadePicker";
import { LabOrdersToothSelector } from "./LabOrdersToothSelector";
import { LabOrdersDatesAndNotes } from "./LabOrdersDatesAndNotes";
import {
	type LabOrdersQuickFormProps,
	RESTORATION_TYPES,
	type ShadeGuideSystem,
} from "./labOrdersQuickFormTypes";

export { RESTORATION_TYPES, type ShadeGuideSystem, type LabOrdersQuickFormProps };

export const LabOrdersQuickForm: React.FC<LabOrdersQuickFormProps> = ({
	selectedTeeth,
	setSelectedTeeth,
	restorationType,
	setRestorationType,
	material,
	setMaterial,
	shadeSystem,
	setShadeSystem,
	colorVita,
	setColorVita,
	stumpShade,
	setStumpShade,
	fittingDate,
	setFittingDate,
	dueDate,
	setDueDate,
	clinicalNotes,
	setClinicalNotes,
	calculatedMaterialCostKopecks,
	submitting,
	onSubmit,
	onCancel,
	onOneClickCreate,
}) => (
	<form onSubmit={onSubmit} className="bg-[var(--paper-soft)] border border-[var(--line)] rounded-xl p-3.5 space-y-3 shadow-sm">
		<div className="flex items-center justify-between">
			<span className="text-xs font-bold text-[var(--ink)] flex items-center gap-1.5">
				<FlaskConical className="w-3.5 h-3.5 text-[var(--teal)]" />
				Параметры ортопедической работы (Быстрое оформление)
			</span>
			<span className="text-xs font-mono font-bold text-[var(--teal)]">
				Себестоимость: {money(calculatedMaterialCostKopecks / 100)}
			</span>
		</div>

		<LabOrdersToothSelector selectedTeeth={selectedTeeth} setSelectedTeeth={setSelectedTeeth} restorationType={restorationType} />

		<div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
			<div>
				<label className="block text-[11px] font-bold text-[var(--muted)] mb-1">Вид конструкции</label>
				<select value={restorationType} onChange={(e) => setRestorationType(e.target.value)} className="w-full h-8 px-2 rounded-lg border border-[var(--line)] bg-[var(--paper)] text-xs text-[var(--ink)] focus:ring-1 focus:ring-[var(--teal)]">
					{RESTORATION_TYPES.map((rt) => (
						<option key={rt.value} value={rt.value}>{rt.label}</option>
					))}
				</select>
			</div>
			<div>
				<label className="block text-[11px] font-bold text-[var(--muted)] mb-1">Материал (Копеечный учет)</label>
				<select value={material} onChange={(e) => setMaterial(e.target.value)} className="w-full h-8 px-2 rounded-lg border border-[var(--line)] bg-[var(--paper)] text-xs text-[var(--ink)] focus:ring-1 focus:ring-[var(--teal)]">
					{MATERIALS.map((m) => (
						<option key={m.id} value={m.id}>{m.name} ({money((m as any).unitCostRub || 6500)})</option>
					))}
				</select>
			</div>
		</div>

		<DentalLabShadePicker shadeSystem={shadeSystem} onShadeSystemChange={setShadeSystem} selectedShade={colorVita} onSelectShade={setColorVita} selectedStumpShade={stumpShade} onSelectStumpShade={setStumpShade} showStumpSelector={true} />

		<LabOrdersDatesAndNotes fittingDate={fittingDate} setFittingDate={setFittingDate} dueDate={dueDate} setDueDate={setDueDate} clinicalNotes={clinicalNotes} setClinicalNotes={setClinicalNotes} />

		<div className="flex items-center justify-between gap-2 pt-1 flex-wrap">
			<button type="button" onClick={onOneClickCreate} disabled={submitting} className="lab-btn-32 bg-amber-500/10 text-amber-800 dark:text-amber-200 border-amber-500/30 hover:bg-amber-500/20 font-bold" title="Быстрое оформление с клиническими параметрами: Диоксид циркония, цвет VITA A2, срок 7 раб. дней">
				<Zap className="w-3.5 h-3.5 text-amber-500" />
				<span>Быстро: Цирконий VITA A2 (+7 раб. дн.)</span>
			</button>
			<div className="flex gap-2 ml-auto">
				<button type="button" onClick={onCancel} className="lab-btn-32">Отмена</button>
				<button type="submit" disabled={submitting} className="lab-btn-32 is-primary">
					<Send className="w-3.5 h-3.5" />
					{submitting ? "Оформление..." : "Отправить заказ в лабораторию"}
				</button>
			</div>
		</div>
	</form>
);
