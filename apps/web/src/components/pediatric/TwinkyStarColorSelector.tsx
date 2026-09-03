import React, { useState } from "react";
import {
	Check,
	FileText,
	Heart,
	Info,
	Printer,
	ShieldCheck,
	Sparkles,
} from "lucide-react";
import {
	type TwinkyStarColor,
	type TwinkyStarColorDefinition,
	TWINKY_STAR_COLORS,
	type PediatricTwinkyStarOptions,
	type PediatricTwinkyStarResult,
	calculatePediatricTwinkyStarProtocol,
} from "../odontogram/pediatricDentitionEngine";
import { showToast } from "../GlobalToast";

export interface TwinkyStarColorSelectorProps {
	readonly toothNumber: number;
	readonly initialColor?: TwinkyStarColor | undefined;
	readonly patientName?: string | undefined;
	readonly patientAgeYears?: number | undefined;
	readonly cavityClass?: "Class I" | "Class II" | undefined;
	readonly surface?: string | undefined;
	readonly onSelectColor?: ((color: TwinkyStarColor) => void) | undefined;
	readonly onInsertToProtocol?: ((protocolText: string) => void) | undefined;
	readonly onOpenParentMemo?: ((options: PediatricTwinkyStarOptions) => void) | undefined;
	readonly compact?: boolean | undefined;
	readonly className?: string | undefined;
}

const AVAILABLE_COLORS: readonly TwinkyStarColor[] = [
	"blue",
	"pink",
	"gold",
	"silver",
	"green",
];

export const TwinkyStarColorSelector: React.FC<TwinkyStarColorSelectorProps> = ({
	toothNumber,
	initialColor = "blue",
	patientName = "Юный пациент",
	patientAgeYears = 6,
	cavityClass = "Class I",
	surface = "O",
	onSelectColor,
	onInsertToProtocol,
	onOpenParentMemo,
	compact = false,
	className = "",
}) => {
	const [selectedColor, setSelectedColor] = useState<TwinkyStarColor>(initialColor);

	const activeDef: TwinkyStarColorDefinition =
		TWINKY_STAR_COLORS[selectedColor] ?? TWINKY_STAR_COLORS.blue;

	const handleColorClick = (color: TwinkyStarColor) => {
		setSelectedColor(color);
		onSelectColor?.(color);
		const def = TWINKY_STAR_COLORS[color];
		showToast(`Выбран цвет пломбы: ${def.nameRu} ${def.emoji}`, "info");
	};

	const currentResult: PediatricTwinkyStarResult = calculatePediatricTwinkyStarProtocol({
		toothNumber,
		color: selectedColor,
		cavityClass,
		surface,
		patientAgeYears,
	});

	const handleInsertTo043u = () => {
		const diaryText = currentResult.formattedDiaryEntryRu;
		if (onInsertToProtocol) {
			onInsertToProtocol(diaryText);
			showToast(
				`Протокол пломбы Twinky Star (${activeDef.nameRu}) внесен в дневник 043/у!`,
				"success",
			);
		} else {
			try {
				navigator.clipboard.writeText(diaryText);
				showToast(
					`Протокол Twinky Star (${activeDef.nameRu}) скопирован для вставки в 043/у`,
					"success",
				);
			} catch {
				showToast("Не удалось скопировать протокол", "error");
			}
		}
	};

	const handlePrintMemo = () => {
		const opts: PediatricTwinkyStarOptions = {
			toothNumber,
			color: selectedColor,
			cavityClass,
			surface,
			patientAgeYears,
		};
		if (onOpenParentMemo) {
			onOpenParentMemo(opts);
		} else {
			try {
				window.dispatchEvent(
					new CustomEvent("dente-open-pediatric-memo", {
						detail: {
							patientName,
							patientAgeYears,
							toothNumber,
							twinkyStar: opts,
						},
					}),
				);
				showToast("Запрос на памятку родителям по цветной пломбе сформирован", "info");
			} catch {
				showToast("Памятка готова к печати", "info");
			}
		}
	};

	if (compact) {
		return (
			<div className={`twinky-star-compact flex items-center gap-1.5 flex-wrap ${className}`.trim()}>
				{AVAILABLE_COLORS.map((c) => {
					const def = TWINKY_STAR_COLORS[c];
					const isSelected = selectedColor === c;
					return (
						<button
							key={c}
							type="button"
							onClick={() => handleColorClick(c)}
							className={`min-h-[36px] min-w-[36px] px-2 py-1 rounded-xl text-xs font-black flex items-center gap-1 border transition-all cursor-pointer select-none active:scale-95 ${
								isSelected ? "ring-2 ring-offset-1 shadow-sm scale-105" : "opacity-80 hover:opacity-100"
							}`}
							style={{
								backgroundColor: def.badgeBg,
								borderColor: isSelected ? def.hexColor : def.badgeBorder,
								color: def.textColor,
							}}
							title={`${def.nameRu}: ${def.childMotivationRu}`}
						>
							<span className="text-sm leading-none">{def.emoji}</span>
							<span>{def.labelRu}</span>
						</button>
					);
				})}
			</div>
		);
	}

	return (
		<div
			className={`twinky-star-card p-4 sm:p-5 rounded-2xl bg-[var(--odontogram-surface,var(--paper-soft,#f8fafc))] border border-[var(--odontogram-border-subtle,var(--line,#e2e8f0))] space-y-4 ${className}`.trim()}
			data-testid="twinky-star-selector"
			data-selected-color={selectedColor}
			data-tooth-number={toothNumber}
		>
			{/* Header */}
			<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
				<div>
					<div className="flex items-center gap-2">
						<Sparkles className="w-4 h-4 text-amber-500 shrink-0" />
						<span className="text-xs sm:text-sm font-black uppercase tracking-wider text-[var(--odontogram-ink-muted,var(--muted,#64748b))]">
							Цветные пломбы Twinky Star (VOCO) • Зуб #{toothNumber}
						</span>
					</div>
					<h3 className="text-sm sm:text-base font-extrabold text-[var(--odontogram-ink,var(--ink,#0f172a))]">
						Игровой выбор цвета пломбы с эффектом блеска
					</h3>
				</div>

				<div
					className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-black border shadow-xs"
					style={{
						backgroundColor: activeDef.badgeBg,
						color: activeDef.textColor,
						borderColor: activeDef.hexColor,
					}}
				>
					<span className="text-lg leading-none">{activeDef.emoji}</span>
					<span>{activeDef.nameRu}</span>
				</div>
			</div>

			{/* 5 Interactive Color Pills */}
			<div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
				{AVAILABLE_COLORS.map((c) => {
					const def = TWINKY_STAR_COLORS[c];
					const isSelected = selectedColor === c;
					return (
						<button
							key={c}
							type="button"
							onClick={() => handleColorClick(c)}
							className={`min-h-[56px] p-3 rounded-2xl border-2 flex flex-col items-center justify-center text-center transition-all cursor-pointer select-none active:scale-[0.98] ${
								isSelected
									? "ring-2 ring-offset-1 shadow-md scale-[1.03]"
									: "opacity-80 hover:opacity-100 hover:scale-[1.01] bg-[var(--odontogram-paper,var(--paper,#ffffff))]"
							}`}
							style={{
								backgroundColor: isSelected ? def.badgeBg : undefined,
								borderColor: isSelected ? def.hexColor : "var(--odontogram-border-subtle,var(--line,#e2e8f0))",
								color: def.textColor,
							}}
							title={`${def.nameRu}: ${def.childMotivationRu}`}
							data-testid={`twinky-color-btn-${c}`}
						>
							<div className="flex items-center gap-1.5">
								<span className="text-xl leading-none">{def.emoji}</span>
								<span className="font-extrabold text-sm sm:text-base">{def.labelRu}</span>
								{isSelected && <Check className="w-4 h-4 shrink-0" />}
							</div>
							<div className="text-[11px] font-semibold mt-1 opacity-90 line-clamp-1">
								{def.roleRu}
							</div>
						</button>
					);
				})}
			</div>

			{/* Child Engagement & Clinical Benefit Cards */}
			<div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs sm:text-sm">
				<div className="p-3.5 rounded-xl bg-[var(--odontogram-paper,var(--paper,#ffffff))] border border-[var(--odontogram-border-subtle,var(--line,#e2e8f0))] space-y-1 shadow-xs">
					<div className="flex items-center gap-1.5 font-bold text-[var(--odontogram-ink,var(--ink,#0f172a))]">
						<Heart className="w-4 h-4 text-rose-500 shrink-0" />
						<span>Вовлечение ребенка:</span>
					</div>
					<p className="text-[var(--odontogram-ink-muted,var(--muted,#64748b))] font-medium">
						{activeDef.childMotivationRu}
					</p>
				</div>

				<div className="p-3.5 rounded-xl bg-[var(--odontogram-paper,var(--paper,#ffffff))] border border-[var(--odontogram-border-subtle,var(--line,#e2e8f0))] space-y-1 shadow-xs">
					<div className="flex items-center gap-1.5 font-bold text-[var(--odontogram-ink,var(--ink,#0f172a))]">
						<ShieldCheck className="w-4 h-4 text-teal-600 shrink-0" />
						<span>Клиническая защита (компомер):</span>
					</div>
					<p className="text-[var(--odontogram-ink-muted,var(--muted,#64748b))] font-medium">
						{currentResult.fluorideReleaseRu}
					</p>
				</div>
			</div>

			{/* 1-Click Action Buttons */}
			<div className="flex flex-col sm:flex-row items-center justify-end gap-2.5 pt-1">
				<button
					type="button"
					onClick={handleInsertTo043u}
					className="w-full sm:w-auto min-h-[44px] px-5 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs sm:text-sm shadow-md shadow-teal-600/20 flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-95"
					data-testid="twinky-insert-043u-btn"
				>
					<FileText className="w-4 h-4" />
					<span>Записать протокол Twinky Star в 043/у (1 клик)</span>
				</button>

				<button
					type="button"
					onClick={handlePrintMemo}
					className="w-full sm:w-auto min-h-[44px] px-4 py-2 rounded-xl border border-[var(--odontogram-border-subtle,var(--line,#e2e8f0))] bg-[var(--odontogram-paper,var(--paper,#ffffff))] text-[var(--odontogram-ink,var(--ink,#0f172a))] hover:bg-[var(--odontogram-surface-hover,var(--paper-strong,#f1f5f9))] font-bold text-xs sm:text-sm flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-95"
					data-testid="twinky-print-memo-btn"
				>
					<Printer className="w-4 h-4" />
					<span>Памятка родителям...</span>
				</button>
			</div>
		</div>
	);
};

export default TwinkyStarColorSelector;
