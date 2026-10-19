import React from "react";
import { Check } from "lucide-react";
import {
	DENTAL_LAB_CONSTRUCTIONS,
	CANONICAL_LAB_WORK_TYPES,
	type DentalLabConstructionType,
} from "@dental/shared";
import { parseFdiTeethString } from "../dentalLabOrderEngine";

export interface DentalLabDrawerConstructionSectionProps {
	readonly formTeethInput: string;
	readonly setFormTeethInput: (val: string) => void;
	readonly formConstruction: DentalLabConstructionType | string;
	readonly onSelectConstruction: (val: string) => void;
}

export const CANONICAL_6_ORTHOPEDIC_CHIPS = [
	{
		id: "crown_zirconia",
		label: "Коронка диоксид циркония (Multilayer)",
		shortLabel: "Цирконий (Multilayer)",
	},
	{
		id: "crown_emax",
		label: "Коронка E.max (пресс/кад-кам)",
		shortLabel: "E.max (пресс/кад-кам)",
	},
	{
		id: "crown_pmma",
		canonicalId: "wt_009",
		label: "Временная коронка PMMA",
		shortLabel: "Временная PMMA",
	},
	{
		id: "metal_ceramic",
		label: "Металлокерамика",
		shortLabel: "Металлокерамика",
	},
	{
		id: "custom_abutment_zirconia",
		canonicalId: "wt_014",
		label: "Индивидуальный циркониевый абатмент",
		shortLabel: "Циркониевый абатмент",
	},
	{
		id: "inlay_onlay",
		canonicalId: "wt_006",
		label: "Вкладка/накладка (Inlay/Onlay)",
		shortLabel: "Вкладка (Inlay/Onlay)",
	},
] as const;

const FDI_Q1 = [18, 17, 16, 15, 14, 13, 12, 11] as const;
const FDI_Q2 = [21, 22, 23, 24, 25, 26, 27, 28] as const;
const FDI_Q4 = [48, 47, 46, 45, 44, 43, 42, 41] as const;
const FDI_Q3 = [31, 32, 33, 34, 35, 36, 37, 38] as const;

export const DentalLabDrawerConstructionSection: React.FC<DentalLabDrawerConstructionSectionProps> = ({
	formTeethInput,
	setFormTeethInput,
	formConstruction,
	onSelectConstruction,
}) => {
	const selectedTeethList = parseFdiTeethString(formTeethInput);

	const toggleTooth = (t: number) => {
		if (selectedTeethList.includes(t)) {
			const next = selectedTeethList.filter((item) => item !== t);
			setFormTeethInput(next.join(", "));
		} else {
			const next = [...selectedTeethList, t].sort((a, b) => a - b);
			setFormTeethInput(next.join(", "));
		}
	};

	return (
		<div className="space-y-2.5">
			<div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
				<div>
					<div className="flex items-center justify-between mb-1">
						<label className="font-semibold text-xs text-[var(--ink,#0f172a)]">Зубы FDI (11–48):</label>
						<span className="text-[10px] text-[var(--muted,#64748b)]">
							{selectedTeethList.length > 0
								? `Выбрано: ${selectedTeethList.length} ед.`
								: "1 тап по зубу"}
						</span>
					</div>
					<input
						type="text"
						required
						placeholder="16 или 11, 21 или 1.6"
						value={formTeethInput}
						onChange={(e) => setFormTeethInput(e.target.value)}
						className="w-full h-9 px-2.5 rounded-lg border border-[var(--line,#cbd5e1)] bg-[var(--paper,#ffffff)] text-xs font-mono font-bold text-teal-700 dark:text-teal-300 focus:ring-1 focus:ring-teal-500 focus:outline-none"
						data-testid="form-teeth-fdi-input"
					/>
				</div>
				<div>
					<label className="font-semibold text-xs text-[var(--ink,#0f172a)] block mb-1">Вид конструкции:</label>
					<select
						value={formConstruction}
						onChange={(e) => onSelectConstruction(e.target.value)}
						className="w-full h-9 px-2 rounded-lg border border-[var(--line,#cbd5e1)] bg-[var(--paper,#ffffff)] text-xs font-semibold focus:ring-1 focus:ring-teal-500 focus:outline-none"
						data-testid="form-construction-select"
					>
						<optgroup label="Канонические ортопедические конструкции">
							{CANONICAL_6_ORTHOPEDIC_CHIPS.map((chip) => (
								<option key={chip.id} value={chip.id}>
									{chip.label}
								</option>
							))}
						</optgroup>
						<optgroup label="Клинические группы (съемные, каппы, шаблоны)">
							{Object.values(DENTAL_LAB_CONSTRUCTIONS).map((c) => (
								<option key={c.id} value={c.id}>
									{c.nameRu}
								</option>
							))}
						</optgroup>
						<optgroup label="Полный каталог конструкций ЗТЛ">
							{CANONICAL_LAB_WORK_TYPES.map((wt) => (
								<option key={wt.id} value={wt.id}>
									[{wt.id.toUpperCase()}] {wt.titleRu}
								</option>
							))}
						</optgroup>
					</select>
				</div>
			</div>

			{/* 1-тап выбор зубов FDI (11..48) */}
			<div className="p-2 rounded-xl bg-[var(--paper-soft,#f8fafc)] border border-[var(--line,#cbd5e1)] space-y-1.5" data-testid="drawer-fdi-tooth-picker">
				<div className="flex items-center justify-between text-[11px] font-bold text-[var(--ink)]">
					<span>Формула FDI (1 тап):</span>
					<div className="flex items-center gap-1">
						<button
							type="button"
							onClick={() => setFormTeethInput("18, 17, 16, 15, 14, 13, 12, 11, 21, 22, 23, 24, 25, 26, 27, 28")}
							className="text-[10px] px-1.5 py-0.5 rounded border border-[var(--line)] bg-[var(--paper)] hover:border-[var(--teal)] font-medium cursor-pointer"
						>
							В/Ч
						</button>
						<button
							type="button"
							onClick={() => setFormTeethInput("48, 47, 46, 45, 44, 43, 42, 41, 31, 32, 33, 34, 35, 36, 37, 38")}
							className="text-[10px] px-1.5 py-0.5 rounded border border-[var(--line)] bg-[var(--paper)] hover:border-[var(--teal)] font-medium cursor-pointer"
						>
							Н/Ч
						</button>
						<button
							type="button"
							onClick={() => setFormTeethInput("")}
							className="text-[10px] px-1.5 py-0.5 rounded border border-[var(--line)] bg-[var(--paper)] hover:text-rose-600 font-medium cursor-pointer"
						>
							Сброс
						</button>
					</div>
				</div>

				{/* Верхняя челюсть: Q1 | Q2 */}
				<div className="overflow-x-auto pb-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
					<div className="flex items-center gap-1 justify-center min-w-[340px]">
						<div className="flex items-center gap-0.5">
							{FDI_Q1.map((t) => {
								const isSel = selectedTeethList.includes(t);
								return (
									<button
										key={t}
										type="button"
										onClick={() => toggleTooth(t)}
										data-testid={`form-tooth-btn-${t}`}
										title={`Зуб ${t} (Q1)`}
										className={`min-w-[20px] sm:min-w-[24px] h-6 px-1 rounded text-[10px] font-mono font-bold transition cursor-pointer border ${
											isSel
												? "border-[var(--teal,#0d9488)] bg-[var(--teal,#0d9488)] text-white shadow-2xs"
												: "border-[var(--line,#cbd5e1)] bg-[var(--paper,#ffffff)] text-[var(--ink,#0f172a)] hover:border-[var(--teal)] hover:bg-[var(--paper-soft)]"
										}`}
									>
										{t}
									</button>
								);
							})}
						</div>
						<div className="w-px h-5 bg-teal-500/50 mx-0.5" />
						<div className="flex items-center gap-0.5">
							{FDI_Q2.map((t) => {
								const isSel = selectedTeethList.includes(t);
								return (
									<button
										key={t}
										type="button"
										onClick={() => toggleTooth(t)}
										data-testid={`form-tooth-btn-${t}`}
										title={`Зуб ${t} (Q2)`}
										className={`min-w-[20px] sm:min-w-[24px] h-6 px-1 rounded text-[10px] font-mono font-bold transition cursor-pointer border ${
											isSel
												? "border-[var(--teal,#0d9488)] bg-[var(--teal,#0d9488)] text-white shadow-2xs"
												: "border-[var(--line,#cbd5e1)] bg-[var(--paper,#ffffff)] text-[var(--ink,#0f172a)] hover:border-[var(--teal)] hover:bg-[var(--paper-soft)]"
										}`}
									>
										{t}
									</button>
								);
							})}
						</div>
					</div>

					{/* Нижняя челюсть: Q4 | Q3 */}
					<div className="flex items-center gap-1 justify-center min-w-[340px] mt-1">
						<div className="flex items-center gap-0.5">
							{FDI_Q4.map((t) => {
								const isSel = selectedTeethList.includes(t);
								return (
									<button
										key={t}
										type="button"
										onClick={() => toggleTooth(t)}
										data-testid={`form-tooth-btn-${t}`}
										title={`Зуб ${t} (Q4)`}
										className={`min-w-[20px] sm:min-w-[24px] h-6 px-1 rounded text-[10px] font-mono font-bold transition cursor-pointer border ${
											isSel
												? "border-[var(--teal,#0d9488)] bg-[var(--teal,#0d9488)] text-white shadow-2xs"
												: "border-[var(--line,#cbd5e1)] bg-[var(--paper,#ffffff)] text-[var(--ink,#0f172a)] hover:border-[var(--teal)] hover:bg-[var(--paper-soft)]"
										}`}
									>
										{t}
									</button>
								);
							})}
						</div>
						<div className="w-px h-5 bg-teal-500/50 mx-0.5" />
						<div className="flex items-center gap-0.5">
							{FDI_Q3.map((t) => {
								const isSel = selectedTeethList.includes(t);
								return (
									<button
										key={t}
										type="button"
										onClick={() => toggleTooth(t)}
										data-testid={`form-tooth-btn-${t}`}
										title={`Зуб ${t} (Q3)`}
										className={`min-w-[20px] sm:min-w-[24px] h-6 px-1 rounded text-[10px] font-mono font-bold transition cursor-pointer border ${
											isSel
												? "border-[var(--teal,#0d9488)] bg-[var(--teal,#0d9488)] text-white shadow-2xs"
												: "border-[var(--line,#cbd5e1)] bg-[var(--paper,#ffffff)] text-[var(--ink,#0f172a)] hover:border-[var(--teal)] hover:bg-[var(--paper-soft)]"
										}`}
									>
										{t}
									</button>
								);
							})}
						</div>
					</div>
				</div>
			</div>

			{/* Экспресс-шаблоны самых частых ортопедических конструкций в 1 клик */}
			<div className="space-y-1">
				<div className="flex items-center justify-between">
					<span className="text-[11px] text-[var(--muted,#64748b)] font-semibold">
						Экспресс-выбор конструкции (1 клик):
					</span>
				</div>
				<div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
					{CANONICAL_6_ORTHOPEDIC_CHIPS.map((c) => {
						const isSelected =
							formConstruction === c.id ||
							("canonicalId" in c && formConstruction === (c as any).canonicalId);
						return (
							<button
								key={c.id}
								type="button"
								onClick={() => onSelectConstruction(c.id)}
								title={c.label}
								className={`min-h-[34px] px-2 py-1 rounded-lg border text-left text-[11px] font-bold shadow-2xs transition cursor-pointer flex items-center justify-between gap-1 ${
									isSelected
										? "border-[var(--teal,#0d9488)] bg-[var(--teal,#0d9488)] text-white shadow-xs"
										: "border-[var(--line,#cbd5e1)] bg-[var(--paper-soft,#f8fafc)] text-[var(--ink,#0f172a)] hover:border-[var(--teal)] hover:bg-[var(--paper,#ffffff)]"
								}`}
								data-testid={`quick-construction-${c.id}`}
							>
								<span className="truncate">{c.shortLabel}</span>
								{isSelected && <Check size={12} className="shrink-0" />}
							</button>
						);
					})}
				</div>
			</div>

			{/* Быстрые пресеты зубов */}
			<div className="flex items-center gap-1.5 flex-wrap pt-0.5">
				<span className="text-[10px] text-[var(--muted,#64748b)] font-semibold">Пресеты:</span>
				{[
					{ label: "16", val: "16" },
					{ label: "11, 21", val: "11, 21" },
					{ label: "1.6", val: "16" },
					{ label: "2.1", val: "21" },
				].map((p) => (
					<button
						key={p.label}
						type="button"
						onClick={() => setFormTeethInput(p.val)}
						className="min-h-[26px] px-2 py-0.5 rounded-lg border border-[var(--line,#cbd5e1)] bg-[var(--paper-soft,#f8fafc)] text-[var(--ink)] hover:border-[var(--teal)] font-bold text-[10.5px] shadow-2xs transition cursor-pointer"
					>
						{p.label}
					</button>
				))}
			</div>
		</div>
	);
};
