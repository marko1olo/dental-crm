import type React from "react";
import { FlaskConical, Send, Zap } from "lucide-react";
import { money } from "../../AppHelpers";
import { MATERIALS } from "../lab/labMath";
import { DentalLabShadePicker } from "../lab/DentalLabShadePicker";
export type ShadeGuideSystem = "classical" | "3d_master" | "bleach";

export const RESTORATION_TYPES = [
	{ value: "single_crown", label: "Коронка анатомическая" },
	{ value: "bridge", label: "Мостовидный протез" },
	{ value: "veneer", label: "Керамический винир E.max" },
	{ value: "inlay_onlay", label: "Вкладка/Накладка E.max/Zr" },
	{ value: "screw_crown", label: "Коронка с винтовой фиксацией" },
	{ value: "abutment_crown", label: "Индивидуальный абатмент + коронка" },
	{ value: "core_build_up", label: "Культевая вкладка (CoCr/Zr)" },
	{ value: "temporary_pmma", label: "Временная коронка PMMA CAD/CAM" },
	{ value: "prothesis_complete", label: "Полный съемный протез" },
	{ value: "prothesis_partial", label: "Бюгельный/ЧСП протез" },
];

export interface LabOrdersQuickFormProps {
	selectedTeeth: number[];
	setSelectedTeeth: React.Dispatch<React.SetStateAction<number[]>>;
	restorationType: string;
	setRestorationType: (v: string) => void;
	material: string;
	setMaterial: (v: string) => void;
	shadeSystem: ShadeGuideSystem;
	setShadeSystem: (v: ShadeGuideSystem) => void;
	colorVita: string;
	setColorVita: (v: string) => void;
	stumpShade: string | null;
	setStumpShade: (v: string | null) => void;
	fittingDate: string;
	setFittingDate: (v: string) => void;
	dueDate: string;
	setDueDate: (v: string) => void;
	clinicalNotes: string;
	setClinicalNotes: (v: string) => void;
	calculatedMaterialCostKopecks: number;
	submitting: boolean;
	onSubmit: (e: React.FormEvent) => void;
	onCancel: () => void;
	onOneClickCreate: () => void;
}

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
}) => {
	const toggleTooth = (tooth: number) => {
		setSelectedTeeth((prev) =>
			prev.includes(tooth) ? prev.filter((t) => t !== tooth) : [...prev, tooth].sort((a, b) => a - b),
		);
	};

	const selectQuadrant = (teeth: number[]) => {
		setSelectedTeeth((prev) => {
			const allSelected = teeth.every((t) => prev.includes(t));
			if (allSelected) {
				return prev.filter((t) => !teeth.includes(t));
			}
			return Array.from(new Set([...prev, ...teeth])).sort((a, b) => a - b);
		});
	};

	return (
		<form
			onSubmit={onSubmit}
			className="bg-[var(--paper-soft)] border border-[var(--line)] rounded-xl p-3.5 space-y-3 shadow-sm"
		>
			<div className="flex items-center justify-between">
				<span className="text-xs font-bold text-[var(--ink)] flex items-center gap-1.5">
					<FlaskConical className="w-3.5 h-3.5 text-[var(--teal)]" />
					Параметры ортопедической работы (Быстрое оформление)
				</span>
				<span className="text-xs font-mono font-bold text-[var(--teal)]">
					Себестоимость: {money(calculatedMaterialCostKopecks / 100)}
				</span>
			</div>

			{/* Tooth Selection FDI formula with Upper / Lower / Bridge / Reset */}
			<div className="space-y-1.5">
				<div className="flex items-center justify-between text-xs text-[var(--muted)] flex-wrap gap-1">
					<span className="font-medium">
						Зубы по FDI:{" "}
						<strong className="text-[var(--ink)]">
							{selectedTeeth.length > 0
								? restorationType === "bridge" && selectedTeeth.length > 1
									? `${selectedTeeth[0]}–${selectedTeeth[selectedTeeth.length - 1]} (мост, ${selectedTeeth.length} ед.: ${selectedTeeth.join(", ")})`
									: selectedTeeth.join(", ")
								: "не выбрано"}
						</strong>
					</span>
					<div className="flex items-center gap-1.5">
						<button
							type="button"
							onClick={() => selectQuadrant([18, 17, 16, 15, 14, 13, 12, 11, 21, 22, 23, 24, 25, 26, 27, 28])}
							className="px-2 py-0.5 rounded text-[11px] font-bold border border-[var(--line)] bg-[var(--paper)] hover:border-[var(--teal)] text-[var(--ink)] transition-colors"
						>
							Верхняя
						</button>
						<button
							type="button"
							onClick={() => selectQuadrant([48, 47, 46, 45, 44, 43, 42, 41, 31, 32, 33, 34, 35, 36, 37, 38])}
							className="px-2 py-0.5 rounded text-[11px] font-bold border border-[var(--line)] bg-[var(--paper)] hover:border-[var(--teal)] text-[var(--ink)] transition-colors"
						>
							Нижняя
						</button>
						{selectedTeeth.length > 0 && (
							<button
								type="button"
								onClick={() => setSelectedTeeth([])}
								className="px-2 py-0.5 rounded text-[11px] font-bold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors"
							>
								Сбросить
							</button>
						)}
					</div>
				</div>

				{/* Upper Jaw */}
				<div className="flex flex-wrap gap-1">
					{[18, 17, 16, 15, 14, 13, 12, 11, 21, 22, 23, 24, 25, 26, 27, 28].map((t) => (
						<button
							key={t}
							type="button"
							onClick={() => toggleTooth(t)}
							className={`min-h-[28px] h-7 px-1.5 rounded-md text-xs font-bold font-mono border transition-all ${
								selectedTeeth.includes(t)
									? "bg-[var(--teal)] text-white border-[var(--teal-dark)] shadow-xs"
									: "bg-[var(--paper)] text-[var(--ink)] border-[var(--line)] hover:border-[var(--teal)]"
							}`}
							title={`Зуб ${t}`}
						>
							{t}
						</button>
					))}
				</div>

				{/* Lower Jaw */}
				<div className="flex flex-wrap gap-1">
					{[48, 47, 46, 45, 44, 43, 42, 41, 31, 32, 33, 34, 35, 36, 37, 38].map((t) => (
						<button
							key={t}
							type="button"
							onClick={() => toggleTooth(t)}
							className={`min-h-[28px] h-7 px-1.5 rounded-md text-xs font-bold font-mono border transition-all ${
								selectedTeeth.includes(t)
									? "bg-[var(--teal)] text-white border-[var(--teal-dark)] shadow-xs"
									: "bg-[var(--paper)] text-[var(--ink)] border-[var(--line)] hover:border-[var(--teal)]"
							}`}
							title={`Зуб ${t}`}
						>
							{t}
						</button>
					))}
				</div>
			</div>

			{/* Construction Type and Material */}
			<div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
				<div>
					<label className="block text-[11px] font-bold text-[var(--muted)] mb-1">
						Вид конструкции
					</label>
					<select
						value={restorationType}
						onChange={(e) => setRestorationType(e.target.value)}
						className="w-full h-8 px-2 rounded-lg border border-[var(--line)] bg-[var(--paper)] text-xs text-[var(--ink)] focus:ring-1 focus:ring-[var(--teal)]"
					>
						{RESTORATION_TYPES.map((rt) => (
							<option key={rt.value} value={rt.value}>
								{rt.label}
							</option>
						))}
					</select>
				</div>

				<div>
					<label className="block text-[11px] font-bold text-[var(--muted)] mb-1">
						Материал (Копеечный учет)
					</label>
					<select
						value={material}
						onChange={(e) => setMaterial(e.target.value)}
						className="w-full h-8 px-2 rounded-lg border border-[var(--line)] bg-[var(--paper)] text-xs text-[var(--ink)] focus:ring-1 focus:ring-[var(--teal)]"
					>
						{MATERIALS.map((m) => (
							<option key={m.id} value={m.id}>
								{m.name} ({money((m as any).unitCostRub || 6500)})
							</option>
						))}
					</select>
				</div>
			</div>

			{/* Канонический Single Source of Truth селектор расцветки VITA */}
			<DentalLabShadePicker
				shadeSystem={shadeSystem}
				onShadeSystemChange={setShadeSystem}
				selectedShade={colorVita}
				onSelectShade={setColorVita}
				selectedStumpShade={stumpShade}
				onSelectStumpShade={setStumpShade}
				showStumpSelector={true}
			/>

			{/* Deadlines & Clinical Notes */}
			<div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
				<div>
					<label className="block text-[11px] font-bold text-[var(--muted)] mb-1">
						Дата примерки (каркас/бисквит)
					</label>
					<input
						type="date"
						value={fittingDate}
						onChange={(e) => setFittingDate(e.target.value)}
						className="w-full h-8 px-2 rounded-lg border border-[var(--line)] bg-[var(--paper)] text-xs text-[var(--ink)] focus:ring-1 focus:ring-[var(--teal)]"
						data-testid="lab-order-quick-fitting-date-input"
					/>
				</div>

				<div>
					<label className="block text-[11px] font-bold text-[var(--muted)] mb-1">
						Срок сдачи / Дедлайн ЗТЛ
					</label>
					<input
						type="date"
						value={dueDate}
						onChange={(e) => setDueDate(e.target.value)}
						className="w-full h-8 px-2 rounded-lg border border-[var(--line)] bg-[var(--paper)] text-xs text-[var(--ink)] focus:ring-1 focus:ring-[var(--teal)]"
						data-testid="lab-order-quick-due-date-input"
					/>
				</div>

				<div>
					<label className="block text-[11px] font-bold text-[var(--muted)] mb-1">
						Клинические примечания технику
					</label>
					<input
						type="text"
						placeholder="Контакты, прикус, мамелоны..."
						value={clinicalNotes}
						onChange={(e) => setClinicalNotes(e.target.value)}
						className="w-full h-8 px-2 rounded-lg border border-[var(--line)] bg-[var(--paper)] text-xs text-[var(--ink)] focus:ring-1 focus:ring-[var(--teal)]"
					/>
				</div>
			</div>

			<div className="flex items-center justify-between gap-2 pt-1 flex-wrap">
				<button
					type="button"
					onClick={onOneClickCreate}
					disabled={submitting}
					className="lab-btn-32 bg-amber-500/10 text-amber-800 dark:text-amber-200 border-amber-500/30 hover:bg-amber-500/20 font-bold"
					title="Быстрое оформление с клиническими параметрами: Диоксид циркония, цвет VITA A2, срок 7 раб. дней"
				>
					<Zap className="w-3.5 h-3.5 text-amber-500" />
					<span>Быстро: Цирконий VITA A2 (+7 раб. дн.)</span>
				</button>

				<div className="flex gap-2 ml-auto">
					<button
						type="button"
						onClick={onCancel}
						className="lab-btn-32"
					>
						Отмена
					</button>
					<button
						type="submit"
						disabled={submitting}
						className="lab-btn-32 is-primary"
					>
						<Send className="w-3.5 h-3.5" />
						{submitting ? "Оформление..." : "Отправить наряд в ЗТЛ"}
					</button>
				</div>
			</div>
		</form>
	);
};
