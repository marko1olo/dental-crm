/**
 * DENTE CRM — CBCT Mandibular Nerve Sidebar Section
 * Planmeca Romexis / Vatech Ez3D 2-Seed Semi-Automatic Tracing Controls
 *
 * Mandate 8b compliant (strictly <= 800 lines).
 * Mandate 8e: Doctor Autonomy (1-click reset, bilateral switching, node adjustment).
 */

import { Info, RotateCcw, Trash2 } from "lucide-react";
import React from "react";
import type { Point3D } from "../cbctMprMath.js";
import { formatNerveStepStatus } from "./cbctNerveHitTest.js";
import {
	formatNerveNodesPlural,
	type NerveCanalSide,
} from "./cbctStudioTypes.js";

export interface CbctNerveSidebarSectionProps {
	readonly activeSide: NerveCanalSide;
	readonly onSwitchSide: (side: NerveCanalSide) => void;
	readonly nervePoints: readonly Point3D[];
	readonly setNervePoints: React.Dispatch<React.SetStateAction<Point3D[]>>;
	readonly nerveTotalLengthMm: number;
	readonly selectedNerveNodeIdx: number | null;
	readonly setSelectedNerveNodeIdx: (idx: number | null) => void;
	readonly onShowToast?: (msg: string, type: "info" | "success" | "error") => void;
}

export const CbctNerveSidebarSection: React.FC<CbctNerveSidebarSectionProps> = ({
	activeSide,
	onSwitchSide,
	nervePoints,
	setNervePoints,
	nerveTotalLengthMm,
	selectedNerveNodeIdx,
	setSelectedNerveNodeIdx,
	onShowToast,
}) => {
	const stepInfo = formatNerveStepStatus(
		nervePoints.length,
		nerveTotalLengthMm,
		activeSide,
	);

	const handleDeleteNode = () => {
		if (nervePoints.length === 0) {
			onShowToast?.("Трасса канала IAN пока не содержит узлов", "info");
			return;
		}
		if (
			selectedNerveNodeIdx !== null &&
			selectedNerveNodeIdx >= 0 &&
			selectedNerveNodeIdx < nervePoints.length
		) {
			setNervePoints((prev) =>
				prev.filter((_, idx) => idx !== selectedNerveNodeIdx),
			);
			setSelectedNerveNodeIdx(null);
			onShowToast?.("Удален выбранный 3D-узел нерва", "info");
		} else if (nervePoints.length > 0) {
			setNervePoints((prev) => prev.slice(0, -1));
			onShowToast?.("Удален последний узел нерва", "info");
		}
	};

	const handleResetTrace = () => {
		if (nervePoints.length === 0) {
			onShowToast?.("Трасса канала IAN уже пуста", "info");
			return;
		}
		setNervePoints([]);
		setSelectedNerveNodeIdx(null);
		onShowToast?.("Трасса канала IAN сброшена", "info");
	};

	return (
		<div
			className="p-3 rounded-md bg-zinc-950 border border-zinc-800 flex flex-col gap-2.5"
			data-testid="cbct-nerve-tracer-card"
		>
			<div className="flex items-center justify-between">
				<div className="flex items-center gap-1.5">
					<span className="w-2 h-2 rounded-full bg-amber-400 shrink-0" />
					<span className="text-xs font-bold text-zinc-100">
						Канал IAN (2-Seed Vatech)
					</span>
				</div>
				<span className="text-[11px] font-mono text-amber-400 font-bold">
					{formatNerveNodesPlural(nervePoints.length)} •{" "}
					{nerveTotalLengthMm.toFixed(1)} мм
				</span>
			</div>

			{/* БИЛАТЕРАЛЬНЫЙ ПЕРЕКЛЮЧАТЕЛЬ СТОРОНЫ */}
			<div
				className="flex items-center p-0.5 rounded-md bg-zinc-900 border border-zinc-800 text-[11px]"
				role="group"
				aria-label="Переключение стороны канала"
			>
				<button
					type="button"
					onClick={() => onSwitchSide("right")}
					className={`flex-1 py-1 rounded text-center font-semibold transition-all cursor-pointer ${
						activeSide === "right"
							? "bg-amber-500 text-zinc-950 font-bold shadow-xs"
							: "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800"
					}`}
					data-testid="cbct-nerve-side-right"
				>
					Правый (4.4-4.8)
				</button>
				<button
					type="button"
					onClick={() => onSwitchSide("left")}
					className={`flex-1 py-1 rounded text-center font-semibold transition-all cursor-pointer ${
						activeSide === "left"
							? "bg-amber-500 text-zinc-950 font-bold shadow-xs"
							: "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800"
					}`}
					data-testid="cbct-nerve-side-left"
				>
					Левый (3.4-3.8)
				</button>
			</div>

			{/* ТЕЛЕМЕТРИЯ И СТАТУС ТРАССЫ */}
			<div className="text-[11px] text-zinc-400 bg-zinc-900 p-2 rounded border border-zinc-800 flex flex-col gap-1">
				<div className="flex justify-between items-center">
					<span>Выбранный узел:</span>
					<span className="font-bold font-mono text-zinc-100">
						{selectedNerveNodeIdx !== null
							? `Узел #${selectedNerveNodeIdx + 1}`
							: "—"}
					</span>
				</div>
				<div className="flex justify-between items-center">
					<span>Vatech пороги:</span>
					<span className="font-bold text-amber-400 font-mono">
						3.0мм апекс • 1.5мм риск
					</span>
				</div>
				<div className="flex justify-between items-center">
					<span>Статус трассировки:</span>
					<span
						className={`font-mono font-bold ${
							nervePoints.length === 0
								? "text-cyan-400"
								: nervePoints.length === 1
									? "text-amber-400"
									: "text-emerald-400"
						}`}
						data-testid="cbct-nerve-status-label"
					>
						{nervePoints.length === 0
							? "1/2: Ментальное"
							: nervePoints.length === 1
								? "2/2: Мандибулярное"
								: "Fast Marching OK"}
					</span>
				</div>
			</div>

			{/* КНОПКИ УДАЛЕНИЯ И СБРОСА */}
			<div className="grid grid-cols-2 gap-1.5">
				<button
					type="button"
					onClick={handleDeleteNode}
					className="py-1.5 px-2 rounded-md bg-zinc-900 hover:bg-zinc-800 disabled:opacity-40 disabled:cursor-not-allowed disabled:pointer-events-none text-rose-300 hover:text-rose-200 border border-rose-500/30 hover:border-rose-500 text-[11px] font-semibold flex items-center justify-center gap-1 transition-colors min-h-[44px] cursor-pointer"
					data-testid="cbct-delete-nerve-node-btn"
					disabled={selectedNerveNodeIdx === null}
					title="Удалить выбранный или последний узел (Backspace)"
				>
					<Trash2 className="w-3.5 h-3.5 mr-1 text-rose-400" />
					<span>Удалить узел</span>
				</button>

				<button
					type="button"
					onClick={handleResetTrace}
					className="py-1.5 px-2 rounded-md bg-zinc-900 hover:bg-zinc-800 disabled:opacity-40 disabled:cursor-not-allowed disabled:pointer-events-none text-amber-300 hover:text-amber-200 border border-amber-500/30 hover:border-amber-500 text-[11px] font-semibold flex items-center justify-center gap-1 transition-colors min-h-[44px] cursor-pointer"
					data-testid="cbct-reset-nerve-trace-btn"
					disabled={nervePoints.length === 0}
					title="Очистить все точки канала нерва"
				>
					<RotateCcw className="w-3.5 h-3.5 mr-1 text-amber-400" />
					<span>Сброс трассы</span>
				</button>
			</div>

			<div className="text-[10px] text-zinc-400 leading-tight flex items-center gap-1">
				<Info className="w-3 h-3 text-cyan-400 shrink-0" />
				<span>
					Vatech 2-Seed: 2 клика на срезах (Foramen mentale + Foramen mandibulae)
				</span>
			</div>
		</div>
	);
};

export default CbctNerveSidebarSection;
