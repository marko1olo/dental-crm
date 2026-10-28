/**
 * DENTE CRM — CBCT Endo Canal Result HUD Chip
 * Standards: Directive 3 / Mandate 8e / Mandate 8k (<= 150 lines).
 */

import React, { useCallback, useMemo, useState } from "react";
import { Check, Copy, Spline, Trash2 } from "lucide-react";
import {
	type EndoCanalMeasurement,
	formatEndoCanalHudText,
	formatEndoCanalProtocolEntry,
} from "../cbctCaliperNerveMath";

export interface CbctEndoCanalHudProps {
	readonly canal: EndoCanalMeasurement;
	readonly onCopyToProtocol?: ((text: string) => void) | undefined;
	readonly onClear?: (() => void) | undefined;
	readonly className?: string | undefined;
}

/**
 * Спокойный неблокирующий HUD эндодонтического калипера:
 * - Плашка с результатом: «Канал: 21.2 мм, изгиб 18°»
 * - Кнопка «В дневник» (1 кликом копирует замер в протокол эндодонтии)
 * - Строго иконки Lucide, ноль эмодзи
 */
export const CbctEndoCanalHud: React.FC<CbctEndoCanalHudProps> = ({
	canal,
	onCopyToProtocol,
	onClear,
	className = "",
}) => {
	const [copied, setCopied] = useState(false);

	const hudText = useMemo(
		() => formatEndoCanalHudText(canal.lengthMm, canal.schneiderAngleDeg),
		[canal.lengthMm, canal.schneiderAngleDeg],
	);

	const protocolText = useMemo(
		() => formatEndoCanalProtocolEntry(canal),
		[canal],
	);

	const handleCopyToProtocol = useCallback(
		(e: React.MouseEvent) => {
			e.stopPropagation();
			try {
				if (typeof navigator !== "undefined" && navigator.clipboard) {
					navigator.clipboard.writeText(protocolText).catch(() => {});
				}
			} catch {
				/* safe in non-browser/test env */
			}
			onCopyToProtocol?.(protocolText);
			setCopied(true);
			const timer = setTimeout(() => setCopied(false), 2200);
			return () => clearTimeout(timer);
		},
		[protocolText, onCopyToProtocol],
	);

	const gradeBadgeClass =
		canal.curvatureGrade === "severe"
			? "bg-rose-500/20 text-rose-300 border-rose-500/50"
			: canal.curvatureGrade === "moderate"
				? "bg-amber-500/20 text-amber-300 border-amber-500/50"
				: "bg-teal-500/20 text-teal-300 border-teal-500/50";

	return (
		<div
			role="status"
			aria-label="Результат замера канала"
			data-testid="cbct-endo-canal-hud"
			className={`inline-flex items-center gap-2 pointer-events-auto select-none bg-zinc-950/92 border border-teal-500/60 shadow-xl backdrop-blur-md px-2.5 py-1 rounded-md text-xs text-zinc-300 ${className}`}
		>
			<div className="flex items-center gap-1.5 font-mono">
				<Spline className="w-3.5 h-3.5 text-teal-400 shrink-0" />
				<span className="font-bold text-zinc-200 whitespace-nowrap text-[12px]" data-testid="cbct-endo-hud-text">
					{hudText}
				</span>
			</div>

			<span
				className={`text-[10px] font-sans px-1.5 py-0.2 rounded border font-medium whitespace-nowrap ${gradeBadgeClass}`}
				data-testid="cbct-endo-grade-badge"
			>
				{canal.curvatureGradeRu}
			</span>

			<button
				type="button"
				onClick={handleCopyToProtocol}
				className={`h-6 min-h-[24px] max-h-[24px] px-2 rounded text-[11px] font-semibold flex items-center gap-1 transition-all cursor-pointer ${
					copied
						? "bg-emerald-950/70 text-emerald-200 font-medium border border-emerald-500/50 shadow-xs"
						: "bg-teal-950/60 hover:bg-teal-900/80 text-teal-300 hover:text-teal-200 border border-teal-500/50 shadow-xs"
				}`}
				title="Скопировать замер в протокол эндодонтии"
				aria-label="В дневник"
				data-testid="cbct-endo-copy-protocol-btn"
			>
				{copied ? (
					<>
						<Check className="w-3 h-3 text-emerald-200 shrink-0" />
						<span>Скопировано</span>
					</>
				) : (
					<>
						<Copy className="w-3 h-3 text-teal-300 shrink-0" />
						<span>В дневник</span>
					</>
				)}
			</button>

			{onClear && (
				<button
					type="button"
					onClick={(e) => {
						e.stopPropagation();
						onClear();
					}}
					className="h-6 w-6 min-w-[24px] max-w-[24px] rounded hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 flex items-center justify-center transition-colors cursor-pointer"
					title="Очистить замер канала"
					aria-label="Очистить замер"
					data-testid="cbct-endo-clear-btn"
				>
					<Trash2 className="w-3 h-3 text-zinc-400 hover:text-rose-400" />
				</button>
			)}
		</div>
	);
};
