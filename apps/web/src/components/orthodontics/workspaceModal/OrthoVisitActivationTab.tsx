/**
 * @dental/web/components/orthodontics/workspaceModal/OrthoVisitActivationTab.tsx
 * Вкладка активации дуг, смены лигатур и выбора брекет-системы (Мандаты 8b, 8e, 8x).
 * Чистый клинический язык без регуляторного канцелярита, тач-таргеты >= 44px.
 */

import React from "react";
import {
	BRACKET_SYSTEMS_CATALOG,
	ARCHWIRES_CATALOG,
	type BracketSystemPreset,
	type ArchwirePreset,
} from "../orthoCatalogData";

export interface OrthoVisitActivationTabProps {
	targetArch: "both" | "upper" | "lower";
	onSelectArch: (arch: "both" | "upper" | "lower") => void;
	selectedBracketId: string;
	onSelectBracket: (bracketId: string) => void;
	selectedArchwireId: string;
	onSelectArchwire: (archwireId: string) => void;
	selectedActions: Record<string, boolean>;
	onToggleAction: (actionId: string, checked: boolean) => void;
	skeletalClassLabelRu: string;
}

const CLINICAL_ACTIONS: Array<{ id: string; label: string }> = [
	{ id: "wire_change", label: "Смена ортодонтической дуги" },
	{ id: "ligature_change", label: "Смена лигатур / активация замков" },
	{ id: "power_chain", label: "Эластическая цепочка Power Chain" },
	{ id: "elastic_traction", label: "Межчелюстная эластическая тяга" },
	{ id: "rebracket", label: "Повторная фиксация отклеившегося брекета" },
	{ id: "ipr", label: "Сепарация эмали (IPR)" },
];

export const OrthoVisitActivationTab: React.FC<OrthoVisitActivationTabProps> = ({
	targetArch,
	onSelectArch,
	selectedBracketId,
	onSelectBracket,
	selectedArchwireId,
	onSelectArchwire,
	selectedActions,
	onToggleAction,
	skeletalClassLabelRu,
}) => {
	const currentWire = ARCHWIRES_CATALOG.find((w) => w.id === selectedArchwireId);
	const archLabel = targetArch === "both" ? "обе челюсти" : targetArch === "upper" ? "ВЧ" : "НЧ";

	return (
		<div className="grid grid-cols-1 lg:grid-cols-12 gap-5 animate-in fade-in duration-150">
			{/* Левая колонка: выбор челюсти, брекетов и дуги */}
			<section className="lg:col-span-7 flex flex-col gap-4">
				<div className="p-4 rounded-xl border border-[var(--line)] bg-[var(--paper-soft)]">
					<label className="text-xs font-bold uppercase tracking-wider text-[var(--muted)] block mb-2">
						Зубная дуга и челюсть
					</label>
					<div className="grid grid-cols-3 gap-2">
						{(["both", "upper", "lower"] as const).map((arch) => (
							<button
								key={arch}
								type="button"
								onClick={() => onSelectArch(arch)}
								className={`min-h-[44px] py-2 px-3 rounded-lg text-xs font-bold transition-all border cursor-pointer ${
									targetArch === arch
										? "bg-[var(--paper)] text-[#0d9488] border-[#0d9488] shadow-xs"
										: "bg-[var(--paper)] text-[var(--ink)] border-[var(--line)] hover:bg-[var(--paper-soft)]"
								}`}
							>
								{arch === "both" ? "Обе челюсти" : arch === "upper" ? "Верхняя (ВЧ)" : "Нижняя (НЧ)"}
							</button>
						))}
					</div>
				</div>

				<div className="p-4 rounded-xl border border-[var(--line)] bg-[var(--paper-soft)]">
					<label className="text-xs font-bold uppercase tracking-wider text-[var(--muted)] block mb-2">
						Брекет-система
					</label>
					<div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
						{BRACKET_SYSTEMS_CATALOG.map((b: BracketSystemPreset) => (
							<button
								key={b.id}
								type="button"
								onClick={() => onSelectBracket(b.id)}
								className={`min-h-[48px] p-2.5 rounded-lg text-left transition-all border cursor-pointer flex flex-col justify-between ${
									selectedBracketId === b.id
										? "bg-[var(--paper)] text-[#0d9488] border-[#0d9488] shadow-xs"
										: "bg-[var(--paper)] text-[var(--ink)] border-[var(--line)] hover:bg-[var(--paper-soft)]"
								}`}
							>
								<span className="text-xs font-bold">{b.nameRu}</span>
								<span className="text-[11px] text-[var(--muted)] truncate">
									{b.typeRu} · {b.manufacturer}
								</span>
							</button>
						))}
					</div>
				</div>

				<div className="p-4 rounded-xl border border-[var(--line)] bg-[var(--paper-soft)]">
					<label className="text-xs font-bold uppercase tracking-wider text-[var(--muted)] block mb-2">
						Устанавливаемая дуга
					</label>
					<div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
						{ARCHWIRES_CATALOG.map((w: ArchwirePreset) => (
							<button
								key={w.id}
								type="button"
								onClick={() => onSelectArchwire(w.id)}
								className={`min-h-[48px] p-2.5 rounded-lg text-left transition-all border cursor-pointer flex flex-col justify-between ${
									selectedArchwireId === w.id
										? "bg-[var(--paper)] text-[#0d9488] border-[#0d9488] shadow-xs"
										: "bg-[var(--paper)] text-[var(--ink)] border-[var(--line)] hover:bg-[var(--paper-soft)]"
								}`}
							>
								<div className="flex items-center justify-between">
									<span className="text-xs font-bold">{w.nameRu}</span>
									<span className="text-xs font-mono font-semibold text-[#0d9488]">{w.priceRub} ₽</span>
								</div>
								<span className="text-[11px] text-[var(--muted)] truncate">{w.phaseRu}</span>
							</button>
						))}
					</div>
				</div>
			</section>

			{/* Правая колонка: манипуляции на приёме и сводный итог */}
			<section className="lg:col-span-5 flex flex-col gap-4">
				<div className="p-4 rounded-xl border border-[var(--line)] bg-[var(--paper-soft)]">
					<label className="text-xs font-bold uppercase tracking-wider text-[var(--muted)] block mb-3">
						Манипуляции на приёме
					</label>
					<div className="flex flex-col gap-2">
						{CLINICAL_ACTIONS.map((act) => (
							<label
								key={act.id}
								className="flex items-center gap-3 p-2.5 rounded-lg bg-[var(--paper)] border border-[var(--line)] cursor-pointer hover:bg-[var(--paper-soft)] min-h-[44px] transition-colors"
							>
								<input
									type="checkbox"
									checked={Boolean(selectedActions[act.id])}
									onChange={(e) => onToggleAction(act.id, e.target.checked)}
									className="w-4 h-4 text-[#0d9488] rounded-sm focus:ring-[#0d9488] accent-[#0d9488]"
								/>
								<span className="text-xs font-medium text-[var(--ink)]">{act.label}</span>
							</label>
						))}
					</div>
				</div>

				<div className="p-4 rounded-xl border border-[var(--line)] bg-[var(--paper-soft)] flex flex-col gap-2">
					<div className="flex items-center justify-between text-xs font-bold text-[var(--muted)] uppercase tracking-wider">
						<span>Итог протокола</span>
						<span className="text-emerald-500 font-semibold">Готов к записи</span>
					</div>
					<div className="text-xs text-[var(--ink)] bg-[var(--paper)] p-3 rounded-lg border border-[var(--line)] leading-relaxed">
						Дуга: <strong>{currentWire?.nameRu || "—"}</strong> на <strong>{archLabel}</strong>. Скелетный класс:{" "}
						<strong>{skeletalClassLabelRu}</strong>.
					</div>
				</div>
			</section>
		</div>
	);
};

export default OrthoVisitActivationTab;
