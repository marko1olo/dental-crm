/**
 * CtPopoutHeader.tsx — Верхняя панель 3D КЛКТ Студии с проекциями черепа (Мандат 8b <= 120 строк).
 */

import React from "react";
import { Activity, ArrowLeft, Box, Maximize2, Minimize2, Radio } from "lucide-react";

export const PROJECTIONS = [
	{ id: "front", label: "Перед" },
	{ id: "back", label: "Зад" },
	{ id: "left", label: "Лево" },
	{ id: "right", label: "Право" },
	{ id: "top", label: "Верх" },
	{ id: "bottom", label: "Низ" },
	{ id: "iso", label: "3D Изо" },
	{ id: "pano", label: "Панорама" },
];

interface Props {
	patientName: string;
	patientCardNumber: string;
	deviceName: string;
	studyDate: string;
	activeProjection: string;
	setActiveProjection: (p: string) => void;
	isNerveVisible: boolean;
	setIsNerveVisible: (v: boolean) => void;
	isFullscreen: boolean;
	toggleFullscreen: () => void;
	onReturnToCrm?: (() => void) | undefined;
	onClose?: (() => void) | undefined;
}

export const CtPopoutHeader: React.FC<Props> = ({
	patientName, patientCardNumber, deviceName, studyDate,
	activeProjection, setActiveProjection, isNerveVisible, setIsNerveVisible,
	isFullscreen, toggleFullscreen, onReturnToCrm, onClose,
}) => {
	return (
		<header className="h-12 px-4 bg-zinc-900 border-b border-zinc-800 flex items-center justify-between gap-3 shrink-0 z-30">
			<div className="flex items-center gap-3 min-w-0">
				<div className="flex items-center gap-2">
					<div className="w-7 h-7 rounded-lg bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 shrink-0">
						<Box className="w-4 h-4" />
					</div>
					<div className="min-w-0">
						<div className="flex items-center gap-2 leading-none">
							<strong className="text-xs font-bold text-zinc-100 whitespace-nowrap">
								3D КЛКТ Студия • {patientName}
							</strong>
							<span className="text-[11px] font-mono text-zinc-400 whitespace-nowrap">({patientCardNumber})</span>
						</div>
						<div className="flex items-center gap-2 text-[10px] text-zinc-400 mt-1 font-mono whitespace-nowrap">
							<span>{deviceName}</span>
							<span>•</span>
							<span>{studyDate}</span>
						</div>
					</div>
				</div>

				<div className="hidden xl:flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-zinc-800/80 border border-zinc-700/60 text-[11px] text-cyan-300 font-mono shrink-0">
					<Radio className="w-3 h-3 text-emerald-400 animate-pulse" />
					<span>Popout · 60 FPS</span>
				</div>
			</div>

			<div className="hidden sm:inline-flex ct-studio-skull-bar">
				{PROJECTIONS.map((p) => (
					<button
						key={p.id}
						type="button"
						onClick={() => setActiveProjection(p.id)}
						className={`ct-studio-skull-btn ${activeProjection === p.id ? "active" : ""}`}
						data-testid={`projection-btn-${p.id}`}
						title={`Проекция черепа: ${p.label}`}
					>
						{p.label}
					</button>
				))}
			</div>

			<div className="flex items-center gap-2 shrink-0">
				<button
					type="button"
					onClick={() => setIsNerveVisible(!isNerveVisible)}
					className={`ct-studio-action-btn ${isNerveVisible ? "ct-studio-action-btn--active" : ""}`}
					title="Показать/скрыть нижнечелюстной нерв"
				>
					<Activity className="w-3.5 h-3.5 text-rose-400" />
					<span className="hidden xl:inline">Нерв V3</span>
				</button>

				<button
					type="button"
					onClick={toggleFullscreen}
					className="ct-studio-action-btn"
					style={{ width: "28px", padding: 0 }}
					title={isFullscreen ? "Выйти из полноэкранного режима" : "Полноэкранный режим"}
				>
					{isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
				</button>

				<button
					type="button"
					onClick={onReturnToCrm || onClose}
					className="ct-studio-action-btn"
					title="Вернуться в основное окно медицинской карты"
					data-testid="ct-popout-return-btn"
				>
					<ArrowLeft className="w-3.5 h-3.5" />
					<span>В карту</span>
				</button>
			</div>
		</header>
	);
};
