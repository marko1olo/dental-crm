import React from "react";
import { Check } from "lucide-react";
import {
	DENTAL_LAB_CONSTRUCTIONS,
	CANONICAL_LAB_WORK_TYPES,
	type DentalLabConstructionType,
} from "@dental/shared";

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

export const DentalLabDrawerConstructionSection: React.FC<DentalLabDrawerConstructionSectionProps> = ({
	formTeethInput,
	setFormTeethInput,
	formConstruction,
	onSelectConstruction,
}) => {
	return (
		<div className="space-y-2.5">
			<div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
				<div>
					<div className="flex items-center justify-between mb-1">
						<label className="font-semibold text-xs text-[var(--ink,#0f172a)]">Зубы FDI (11–48):</label>
						<span className="text-[10px] text-[var(--muted,#64748b)]">Формула (16 или 1.6)</span>
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
				<span className="text-[10px] text-[var(--muted,#64748b)] font-semibold">Пресеты зубов:</span>
				{[
					{ label: "16", val: "16" },
					{ label: "11, 21", val: "11, 21" },
					{ label: "1.6", val: "16" },
					{ label: "2.1", val: "21" },
					{ label: "Вся ВЧ (18–28)", val: "18, 17, 16, 15, 14, 13, 12, 11, 21, 22, 23, 24, 25, 26, 27, 28" },
					{ label: "Вся НЧ (38–48)", val: "48, 47, 46, 45, 44, 43, 42, 41, 31, 32, 33, 34, 35, 36, 37, 38" },
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
