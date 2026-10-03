/**
 * DENTE CRM — EzDent-i Consultation Top Toolbar
 *
 * Implements:
 * 1. Branded EzDent-i consultation badge
 * 2. Real-time patient telemetry banner (Screenshot 25 top right)
 * 3. Left vs Right active viewport focus selector
 * 4. Chairside interactive tools (Pan, Arrow, Pencil, Eraser)
 * 5. Synchronous Pan & Zoom toggle ([🔗 Синхронно: ВКЛ/ВЫКЛ])
 * 6. Reset view & Grayscale Negative invert
 * 7. Snapshot (Camera) capture button
 * 8. 1-Click Form 043/u protocol injection
 *
 * Mandate 8b: Decomposed helper module (<200 lines).
 * Mandate 8e: Single-row desktop toolbar density (34-36px).
 */

import React from "react";
import {
	ArrowUpRight,
	Camera,
	Eraser,
	Link2,
	Link2Off,
	Maximize2,
	Minimize2,
	Move,
	Pencil,
	SplitSquareHorizontal,
	X,
	Zap,
} from "lucide-react";
import type { ConsultationSlot } from "./consultationCanvasRenderers.js";

export interface ConsultationTopToolbarProps {
	readonly patientName?: string | undefined;
	readonly patientCardNumber?: string | undefined;
	readonly patientAge?: string | number | undefined;
	readonly patientGender?: string | undefined;
	readonly activeSlot: ConsultationSlot;
	readonly onSelectSlot: (slot: ConsultationSlot) => void;
	readonly splitMode?: "consultation" | "dynamics" | undefined;
	readonly onToggleSplitMode?: (() => void) | undefined;
	readonly activeTool: "pan" | "arrow" | "pencil" | "eraser";
	readonly onSelectTool: (tool: "pan" | "arrow" | "pencil" | "eraser") => void;
	readonly isSyncNav: boolean;
	readonly onToggleSyncNav: () => void;
	readonly onResetView: () => void;
	readonly onToggleInvert: () => void;
	readonly onClearAnnotations: () => void;
	readonly onTakeSnapshot: () => void;
	readonly onInsertProtocol: () => void;
	readonly isFullscreen: boolean;
	readonly onToggleFullscreen: () => void;
	readonly onClose?: (() => void) | undefined;
}

export const ConsultationTopToolbar: React.FC<ConsultationTopToolbarProps> = ({
	patientName = "Чухрова Лариса",
	patientCardNumber = "20190621_101042",
	patientAge = "58Y",
	patientGender = "Жен.",
	activeSlot,
	onSelectSlot,
	splitMode = "consultation",
	onToggleSplitMode,
	activeTool,
	onSelectTool,
	isSyncNav,
	onToggleSyncNav,
	onResetView,
	onToggleInvert,
	onClearAnnotations,
	onTakeSnapshot,
	onInsertProtocol,
	isFullscreen,
	onToggleFullscreen,
	onClose,
}) => {
	const isDynamics = splitMode === "dynamics";

	return (
		<div
			data-testid="consultation-top-toolbar"
			className="flex items-center justify-between px-3 py-1 bg-[#070b14] border-b border-[#1e293b] text-xs h-9 min-h-[34px] max-h-[36px] shrink-0 select-none"
		>
			{/* Left: Brand Badge, Patient Telemetry & Active Viewport Switcher */}
			<div className="flex items-center gap-2">
				<span className="px-2 py-0.5 rounded font-black text-[11px] bg-[#00C853] text-[#022c15] uppercase tracking-wider flex items-center gap-1">
					<SplitSquareHorizontal size={13} />
					<span>{isDynamics ? "EzDent-i ДИНАМИКА КТ (ДО/ПОСЛЕ)" : "EzDent-i КОНСУЛЬТАЦИЯ"}</span>
				</span>

				{onToggleSplitMode && (
					<button
						type="button"
						onClick={onToggleSplitMode}
						className={`px-2 py-0.5 rounded text-[10px] font-bold border transition-colors cursor-pointer ${
							isDynamics
								? "bg-[#064e3b] border-[#00C853] text-[#34d399]"
								: "bg-[#0f172a] border-[#334155] text-slate-300 hover:text-white"
						}`}
						data-testid="btn-toggle-split-mode"
						title={isDynamics ? "Переключить на каталог эталонов" : "Переключить на динамику До/После"}
					>
						{isDynamics ? "📊 Динамика До/После" : "👥 Эталоны"}
					</button>
				)}

				{/* Patient Telemetry (Screenshot 25 banner) */}
				<span className="text-[11px] text-slate-300 font-mono hidden md:inline">
					{patientCardNumber} <strong className="text-white font-sans">{patientName}</strong> {patientAge} ({patientGender})
				</span>

				{/* Active Window Focus Indicator */}
				<div className="flex items-center gap-1 bg-[#0f172a] p-0.5 rounded border border-[#334155] ml-1">
					<button
						type="button"
						onClick={() => onSelectSlot("left")}
						className={`px-2 py-0.5 rounded text-[11px] font-semibold transition-colors cursor-pointer ${
							activeSlot === "left"
								? "bg-[#064e3b] text-[#34d399] border border-[#00C853]"
								: "text-slate-400 hover:text-white"
						}`}
						data-testid="btn-select-slot-left"
					>
						{isDynamics ? "До операции" : "Слева (Пациент)"}
					</button>
					<button
						type="button"
						onClick={() => onSelectSlot("right")}
						className={`px-2 py-0.5 rounded text-[11px] font-semibold transition-colors cursor-pointer ${
							activeSlot === "right"
								? "bg-[#064e3b] text-[#34d399] border border-[#00C853]"
								: "text-slate-400 hover:text-white"
						}`}
						data-testid="btn-select-slot-right"
					>
						{isDynamics ? "После операции" : "Справа (Сравнение)"}
					</button>
				</div>
			</div>

			{/* Center: Interactive Viewport Tools */}
			<div className="flex items-center gap-1.5">
				<div className="flex items-center gap-1 bg-[#0f172a] p-0.5 rounded border border-[#334155]">
					<button
						type="button"
						onClick={() => onSelectTool("pan")}
						className={`px-2 py-0.5 rounded text-[11px] font-semibold flex items-center gap-1 cursor-pointer transition-colors ${
							activeTool === "pan" ? "bg-[#134e4a] text-[#2dd4bf]" : "text-slate-400 hover:text-white"
						}`}
						data-testid="btn-tool-pan"
						title="Панорамирование (Рука)"
					>
						<Move size={12} />
						<span>Рука</span>
					</button>

					<button
						type="button"
						onClick={() => onSelectTool("arrow")}
						className={`px-2 py-0.5 rounded text-[11px] font-semibold flex items-center gap-1 cursor-pointer transition-colors ${
							activeTool === "arrow" ? "bg-[#134e4a] text-[#2dd4bf]" : "text-slate-400 hover:text-white"
						}`}
						data-testid="btn-tool-arrow"
						title="Векторная стрелка патологии"
					>
						<ArrowUpRight size={12} />
						<span>Стрелка</span>
					</button>

					<button
						type="button"
						onClick={() => onSelectTool("pencil")}
						className={`px-2 py-0.5 rounded text-[11px] font-semibold flex items-center gap-1 cursor-pointer transition-colors ${
							activeTool === "pencil" ? "bg-[#134e4a] text-[#2dd4bf]" : "text-slate-400 hover:text-white"
						}`}
						data-testid="btn-tool-pencil"
						title="Карандаш (свободное рисование)"
					>
						<Pencil size={12} />
						<span>Рисование</span>
					</button>

					<button
						type="button"
						onClick={onClearAnnotations}
						className="px-1.5 py-0.5 rounded text-slate-400 hover:text-rose-400 text-[11px] cursor-pointer"
						data-testid="btn-tool-eraser"
						title="Очистить аннотации активного окна"
					>
						<Eraser size={12} />
					</button>
				</div>

				{/* Synchronized Zoom/Pan Toggle (Screenshot 25 Invariant) */}
				<button
					type="button"
					onClick={onToggleSyncNav}
					className={`px-2 py-0.5 rounded border text-[11px] font-semibold flex items-center gap-1 cursor-pointer transition-colors ${
						isSyncNav
							? "bg-[#064e3b] border-[#00C853] text-[#34d399]"
							: "bg-[#0f172a] border-[#334155] text-slate-400 hover:text-white"
					}`}
					data-testid="btn-toggle-sync-nav"
					title={isSyncNav ? "Синхронная навигация обоих окон включена" : "Раздельная навигация окон"}
				>
					{isSyncNav ? <Link2 size={12} /> : <Link2Off size={12} />}
					<span>{isSyncNav ? "Синхронно: ВКЛ" : "Раздельно"}</span>
				</button>

				{/* Reset Zoom & Center */}
				<button
					type="button"
					onClick={onResetView}
					className="px-2 py-0.5 rounded border border-[#334155] bg-[#0f172a] text-slate-300 hover:text-white text-[11px] font-medium cursor-pointer"
					data-testid="btn-reset-view"
					title="Сбросить масштаб и положение (1:1 / Центр)"
				>
					1:1 / Центр
				</button>

				{/* Invert Grayscale */}
				<button
					type="button"
					onClick={onToggleInvert}
					className="px-2 py-0.5 rounded border border-[#334155] bg-[#0f172a] text-slate-300 hover:text-white text-[11px] font-medium cursor-pointer"
					data-testid="btn-toggle-invert"
					title="Инверсия шкалы серого (Негатив)"
				>
					Негатив
				</button>

				{/* Snapshot / Camera tool (Screenshot 25) */}
				<button
					type="button"
					onClick={onTakeSnapshot}
					className="px-2 py-0.5 rounded border border-[#334155] bg-[#0f172a] hover:bg-[#1e293b] text-slate-300 hover:text-white text-[11px] font-medium flex items-center gap-1 cursor-pointer transition-colors"
					data-testid="btn-consultation-snapshot"
					title="Сохранить снимок сплит-сравнения в карту пациента"
				>
					<Camera size={12} className="text-[#00C853]" />
					<span>Снимок</span>
				</button>
			</div>

			{/* Right: 1-Click Form 043/u Note, Fullscreen, Close */}
			<div className="flex items-center gap-2">
				<button
					type="button"
					onClick={onInsertProtocol}
					className="px-2.5 py-1 rounded font-bold text-[11px] bg-[#064e3b] border border-[#10b981] text-[#a7f3d0] hover:bg-[#047857] transition-all cursor-pointer flex items-center gap-1"
					data-testid="btn-insert-consultation-note"
					title="Внести факт проведения визуальной консультации в Form 043/u"
				>
					<Zap size={12} className="text-[#34d399]" />
					<span>Внести в карту</span>
				</button>

				<button
					type="button"
					onClick={onToggleFullscreen}
					className="p-1 rounded bg-[#1e293b] hover:bg-[#334155] text-slate-300 border border-[#334155] cursor-pointer"
					data-testid="btn-consultation-fullscreen"
					title={isFullscreen ? "Выйти из полного экрана (Esc)" : "Полноэкранный режим консультации"}
				>
					{isFullscreen ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
				</button>

				{onClose && (
					<button
						type="button"
						onClick={onClose}
						className="p-1 rounded bg-transparent hover:bg-slate-800 text-slate-400 hover:text-white border border-[#334155] cursor-pointer"
						data-testid="btn-consultation-close"
						title="Закрыть консультацию (Esc)"
					>
						<X size={14} />
					</button>
				)}
			</div>
		</div>
	);
};
