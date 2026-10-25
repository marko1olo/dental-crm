/**
 * PerioExpressPresetCards.tsx — 7 клинических карточек-пресетов пародонтологии.
 * Архитектурный слой Layer 4: Preset Cards (Мандат 8b, <= 120 строк).
 */

import { AlertTriangle, ShieldAlert, ShieldCheck } from "lucide-react";
import React from "react";
import { PerioProbe, UltrasonicScaler } from "../../icons/DentalIcons";
import type { PerioExpressPresetId } from "../perioMath";

export interface PerioExpressPresetCardsProps {
	readonly readOnly?: boolean | undefined;
	readonly onApplyExpressPreset: (presetId: PerioExpressPresetId) => void;
}

interface PresetCardItem {
	readonly id: PerioExpressPresetId;
	readonly testId: string;
	readonly title: string;
	readonly icd: string;
	readonly desc: string;
	readonly btnClass: string;
	readonly textClass: string;
	readonly badgeClass: string;
	readonly Icon: React.ComponentType<{ size: number; className?: string }>;
	readonly extraAction?: string | undefined;
}

const PRESET_CARDS: readonly PresetCardItem[] = [
	{ id: "perio_norm_express", testId: "perio-preset-norm-card", title: "Норма (PSR 0)", icd: "Z01.2", desc: "PSR 0, глубина \u2264 2 мм, BOP 0", btnClass: "bg-emerald-500/15 hover:bg-emerald-500/30 text-emerald-900 dark:text-emerald-200 border-emerald-500/40", textClass: "text-emerald-800 dark:text-emerald-300", badgeClass: "bg-emerald-500/20 text-emerald-800 dark:text-emerald-300 border-emerald-500/30", Icon: ShieldCheck },
	{ id: "pro_hygiene_express", testId: "perio-preset-prophy-card", title: "Профгигиена", icd: "A16.07.051", desc: "УЗ + Air-Flow + полировка + фторирование", btnClass: "bg-cyan-500/15 hover:bg-cyan-500/30 text-cyan-900 dark:text-cyan-200 border-cyan-500/40", textClass: "text-cyan-800 dark:text-cyan-300", badgeClass: "bg-cyan-500/20 text-cyan-800 dark:text-cyan-300 border-cyan-500/30", Icon: UltrasonicScaler },
	{ id: "gingivitis_express", testId: "perio-preset-gingivitis-card", title: "Гингивит (PSR 1-2)", icd: "K05.1", desc: "карманы < 3.5 мм, BOP+", btnClass: "bg-amber-500/15 hover:bg-amber-500/30 text-amber-900 dark:text-amber-200 border-amber-500/40", textClass: "text-amber-800 dark:text-amber-300", badgeClass: "bg-amber-500/20 text-amber-800 dark:text-amber-300 border-amber-500/30", Icon: PerioProbe },
	{ id: "periodontitis_mild_express", testId: "perio-preset-mild-periodontitis-card", title: "Пародонтит легкий", icd: "K05.30", desc: "карманы 3.5–4 мм, BOP+, камень", btnClass: "bg-rose-600/15 hover:bg-rose-600/30 text-rose-900 dark:text-rose-200 border-rose-500/40", textClass: "text-rose-800 dark:text-rose-300", badgeClass: "bg-rose-500/20 text-rose-800 dark:text-rose-300 border-rose-500/30", Icon: AlertTriangle },
	{ id: "periodontitis_moderate_express", testId: "perio-preset-periodontitis-card", title: "Пародонтит средний", icd: "K05.31", desc: "карманы 4–5 мм, рецессия 1–2 мм", btnClass: "bg-orange-600/20 hover:bg-orange-600/35 text-orange-900 dark:text-orange-200 border-orange-500/45", textClass: "text-orange-800 dark:text-orange-300", badgeClass: "bg-orange-500/20 text-orange-800 dark:text-orange-300 border-orange-500/30", Icon: ShieldAlert },
	{ id: "periodontitis_severe_express", testId: "perio-preset-severe-periodontitis-card", title: "Пародонтит тяжелый", icd: "K05.32", desc: "карманы \u22656 мм, гноетечение", btnClass: "bg-red-700/20 hover:bg-red-700/35 text-red-900 dark:text-red-200 border-red-600/45", textClass: "text-red-800 dark:text-red-300", badgeClass: "bg-red-500/20 text-red-800 dark:text-red-300 border-red-500/30", Icon: ShieldAlert, extraAction: "perio-preset-severe-btn" },
	{ id: "recession_express", testId: "perio-preset-recession-card", title: "Рецессия десны", icd: "K06.0", desc: "рецессия 1–3 мм, карманы \u2264 2 мм", btnClass: "bg-purple-500/15 hover:bg-purple-500/30 text-purple-900 dark:text-purple-200 border-purple-500/40", textClass: "text-purple-800 dark:text-purple-300", badgeClass: "bg-purple-500/20 text-purple-800 dark:text-purple-300 border-purple-500/30", Icon: ShieldAlert },
];

export const PerioExpressPresetCards: React.FC<PerioExpressPresetCardsProps> = React.memo(({
	readOnly = false, onApplyExpressPreset,
}) => (
	<div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-7 gap-2.5">
		{PRESET_CARDS.map(({ id, testId, title, icd, desc, btnClass, textClass, badgeClass, Icon, extraAction }) => (
			<button
				key={id} type="button" disabled={readOnly} onClick={() => onApplyExpressPreset(id)}
				className={`min-h-[50px] p-3 rounded-xl border transition-all cursor-pointer text-left active:scale-[0.98] shadow-xs flex flex-col justify-center min-w-0 ${btnClass}`}
				data-testid={testId}
				{...(extraAction ? { "data-preset-action": extraAction } : {})}
			>
				<div className="flex items-center justify-between gap-1.5 font-bold text-xs min-w-0">
					<span className={`flex items-center gap-1.5 min-w-0 ${textClass}`}>
						<Icon size={16} className="shrink-0" />
						<span className="truncate">{title}</span>
					</span>
					<span className={`text-[11px] font-mono px-1.5 py-0.5 rounded border shrink-0 ${badgeClass}`}>{icd}</span>
				</div>
				<span className="text-[12px] opacity-80 leading-tight mt-1 line-clamp-2">{desc}</span>
			</button>
		))}
	</div>
));

PerioExpressPresetCards.displayName = "PerioExpressPresetCards";
