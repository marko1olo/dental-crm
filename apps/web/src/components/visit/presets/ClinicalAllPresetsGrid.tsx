import React from "react";
import {
	Baby,
	Bone,
	Crown,
	HeartPulse,
	Sparkles,
	Stethoscope,
} from "lucide-react";
import {
	CLINICAL_SOAP_PRESETS,
	type ClinicalQuickPreset,
} from "../clinicalSoapPresets";

interface ClinicalAllPresetsGridProps {
	readonly currentTooth: number | null;
	readonly onSelectPreset: (preset: ClinicalQuickPreset) => void;
	readonly onOpenProtocolsCatalog?: (() => void) | undefined;
}

export const ClinicalAllPresetsGrid: React.FC<ClinicalAllPresetsGridProps> = ({
	currentTooth,
	onSelectPreset,
	onOpenProtocolsCatalog,
}) => {
	const [activeCategory, setActiveCategory] = React.useState<string>("all");

	const filteredPresets = React.useMemo(() => {
		if (activeCategory === "all") return CLINICAL_SOAP_PRESETS;
		return CLINICAL_SOAP_PRESETS.filter((p) => p.category === activeCategory);
	}, [activeCategory]);

	return (
		<div className="space-y-2 pt-1 border-t border-[var(--border)]">
			<div className="flex items-center justify-between gap-2 flex-wrap">
				<div className="flex items-center gap-1 p-1 rounded-xl bg-[var(--paper)] border border-[var(--border)] overflow-x-auto flex-nowrap">
					{[
						{ id: "all", label: "Все экспресс-шаблоны" },
						{ id: "pediatric", label: "Детские" },
						{ id: "therapy", label: "Терапия" },
						{ id: "surgery", label: "Хирургия" },
						{ id: "orthopedics", label: "Ортопедия" },
						{ id: "periodontology", label: "Пародонтология" },
						{ id: "hygiene", label: "Гигиена" },
					].map((cat) => (
						<button
							key={cat.id}
							type="button"
							onClick={() => setActiveCategory(cat.id)}
							className={`min-h-[44px] sm:min-h-[28px] sm:h-7 px-3 sm:px-2.5 py-1 sm:py-0 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap touch-manipulation ${
								activeCategory === cat.id
									? "bg-[var(--teal-fill,var(--teal))] text-[var(--on-teal,white)] shadow-xs"
									: "text-[var(--muted)] hover:text-[var(--ink)] hover:bg-[var(--paper-soft)]"
							}`}
						>
							{cat.label}
						</button>
					))}
				</div>
				<div className="flex items-center gap-1.5 text-xs font-semibold text-[var(--muted)] flex-wrap">
					<span>
						Показано: {filteredPresets.length} из {CLINICAL_SOAP_PRESETS.length} экспресс-шаблонов
					</span>
					<span className="hidden sm:inline text-[var(--line)]">·</span>
					<span className="text-[11px] sm:text-xs">
						Полный поиск по 1 142 федеральным протоколам — в{" "}
						{onOpenProtocolsCatalog ? (
							<button
								type="button"
								onClick={onOpenProtocolsCatalog}
								className="text-[var(--teal)] hover:underline font-bold cursor-pointer inline-flex items-center underline decoration-dotted underline-offset-2"
								data-testid="btn-grid-link-protocols-catalog"
								title="Открыть полный федеральный реестр клинических протоколов Минздрава РФ и СтАР (1 142 протокола)"
							>
								Реестре Минздрава РФ
							</button>
						) : (
							<span className="font-bold text-[var(--teal)]">Реестре Минздрава РФ</span>
						)}
					</span>
				</div>
			</div>

			<div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 min-w-0">
				{filteredPresets.map((preset) => {
					const badgeTitle =
						preset.category !== "hygiene" && currentTooth
							? `${preset.shortBadge} ${currentTooth}`
							: preset.shortBadge;

					return (
						<button
							key={preset.id}
							type="button"
							onClick={() => onSelectPreset(preset)}
							className="min-h-[48px] sm:min-h-[32px] sm:h-8 px-3 sm:px-2.5 py-1 sm:py-0 rounded-lg text-xs font-bold border transition-all flex items-center justify-between gap-2 cursor-pointer shadow-2xs active:scale-95 min-w-0 break-words touch-manipulation bg-[var(--paper-soft)] hover:bg-[var(--paper-strong)] border-[var(--line)] hover:border-[var(--teal)] text-[var(--ink)]"
							title={`${preset.title} · МКБ-10: ${preset.icd10}${preset.service804n ? ` · Услуга: ${preset.service804n.title}` : ""}`}
							data-testid={`quick-preset-${preset.id}`}
						>
							<div className="flex items-center gap-1.5 min-w-0 truncate">
								{preset.category === "pediatric" && (
									<Baby size={14} className="shrink-0 text-teal-600 dark:text-teal-400" />
								)}
								{preset.category === "therapy" && (
									<Stethoscope size={14} className="shrink-0 text-blue-600 dark:text-blue-400" />
								)}
								{preset.category === "surgery" && (
									<Bone size={14} className="shrink-0 text-rose-600 dark:text-rose-400" />
								)}
								{preset.category === "orthopedics" && (
									<Crown size={14} className="shrink-0 text-purple-600 dark:text-purple-400" />
								)}
								{preset.category === "periodontology" && (
									<HeartPulse size={14} className="shrink-0 text-amber-600 dark:text-amber-400" />
								)}
								{preset.category === "hygiene" && (
									<Sparkles size={14} className="shrink-0 text-teal-600 dark:text-teal-400" />
								)}
								<span className="font-extrabold truncate text-[var(--ink)]">{badgeTitle}</span>
							</div>
							<span className="text-[10px] sm:text-[11px] font-mono px-1 py-0.2 rounded bg-[var(--paper)] text-[var(--muted)] border border-[var(--border)] shrink-0 font-bold">
								{preset.icd10}
							</span>
						</button>
					);
				})}
			</div>
		</div>
	);
};
