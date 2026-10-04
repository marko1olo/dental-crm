import React from "react";
import { Compass, AlertTriangle, CheckCircle, ShieldAlert, Sparkles, Activity } from "lucide-react";


export interface EndoCanalSummaryItem {
	readonly id: string;
	readonly name: string;
	readonly anatomicalLengthMm: number;
	readonly physiologicalLengthMm: number;
	readonly schneiderAngleDeg: number;
	readonly riskTier: "low" | "moderate" | "severe";
	readonly minRadiusMm: number;
	readonly radiusTier: "sharp" | "moderate" | "gentle";
	readonly recommendationRu: string;
}

export interface EndoCompassClinicalData {
	readonly toothFdi: number;
	readonly rootCount: number;
	readonly canals: readonly EndoCanalSummaryItem[];
	readonly vertucciType: string;
	readonly vertucciNameRu: string;
	readonly overallRiskTier: "low" | "moderate" | "severe";
	readonly recommendedTaper: string;
	readonly reciprocatingMotion: boolean;
	readonly clinicalSummaryRu: string;
}

export interface EndoCompassPanelProps {
	readonly data: EndoCompassClinicalData | null;
	readonly isAnalyzing: boolean;
	readonly activeCanalId: string | null;
	readonly onSelectCanal: (canalId: string) => void;
	readonly onRunAnalysis: () => void;
	readonly onExportToEmr: () => void;
	readonly onClose?: () => void;
}

export const EndoCompassPanel: React.FC<EndoCompassPanelProps> = ({
	data,
	isAnalyzing,
	activeCanalId,
	onSelectCanal,
	onRunAnalysis,
	onExportToEmr,
	onClose,
}) => {
	if (!data && !isAnalyzing) {
		return (
			<div
				className="flex flex-col items-center justify-center p-4 bg-zinc-950/95 border border-zinc-800 rounded-lg text-center backdrop-blur-md shadow-lg gap-2 text-zinc-300"
				data-testid="endo-compass-empty-state"
			>
				<div className="w-9 h-9 rounded-full bg-cyan-950/50 border border-cyan-800/60 flex items-center justify-center text-cyan-400">
					<Compass className="w-5 h-5 text-cyan-400" />
				</div>
				<div className="flex flex-col">
					<span className="text-xs font-semibold text-zinc-200">Эндодонтический Компас 3D</span>
					<span className="text-[11px] text-zinc-400 max-w-[240px]">
						Аналитическая 3D-детекция устьев, апексов и кривизны каналов по вокселям КЛКТ
					</span>
				</div>
				<button
					type="button"
					onClick={onRunAnalysis}
					className="mt-1 h-7 px-3 rounded text-xs font-medium bg-cyan-600 hover:bg-cyan-500 text-white flex items-center gap-1.5 transition-colors cursor-pointer shadow-sm"
					data-testid="endo-compass-start-analysis-btn"
				>
					<Sparkles className="w-3.5 h-3.5" />
					<span>Запустить анализ 3D</span>
				</button>
			</div>
		);
	}

	if (isAnalyzing) {
		return (
			<div
				className="flex flex-col items-center justify-center p-6 bg-zinc-950/95 border border-zinc-800 rounded-lg text-center backdrop-blur-md shadow-lg gap-3"
				data-testid="endo-compass-loading-state"
			>
				<div className="w-8 h-8 rounded-full border-2 border-cyan-500 border-t-transparent animate-spin" />
				<div className="flex flex-col gap-0.5">
					<span className="text-xs font-medium text-cyan-300">Расчет тензора Гессе и FMM...</span>
					<span className="text-[10px] text-zinc-400">Фильтр Франги (0.35-0.6 мм) • Уравнение Эйконала</span>
				</div>
			</div>
		);
	}

	if (!data) return null;

	const getRiskColor = (tier: "low" | "moderate" | "severe") => {
		switch (tier) {
			case "severe":
				return "text-rose-400 bg-rose-950/50 border-rose-800/80";
			case "moderate":
				return "text-amber-400 bg-amber-950/50 border-amber-800/80";
			case "low":
			default:
				return "text-emerald-400 bg-emerald-950/50 border-emerald-800/80";
		}
	};

	const getRiskIcon = (tier: "low" | "moderate" | "severe") => {
		switch (tier) {
			case "severe":
				return <ShieldAlert className="w-3.5 h-3.5 text-rose-400 shrink-0" />;
			case "moderate":
				return <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />;
			case "low":
			default:
				return <CheckCircle className="w-3.5 h-3.5 text-emerald-400 shrink-0" />;
		}
	};

	return (
		<div
			className="flex flex-col p-2.5 bg-zinc-950/95 border border-zinc-800 rounded-lg backdrop-blur-md shadow-xl gap-2 text-zinc-300 text-xs w-full max-w-sm"
			data-testid="endo-compass-panel"
		>
			{/* Header: Title, Tooth FDI, Vertucci Badge */}
			<div className="flex items-center justify-between gap-1.5 pb-1.5 border-b border-zinc-800/80">
				<div className="flex items-center gap-1.5 min-w-0">
					<Compass className="w-4 h-4 text-cyan-400 shrink-0" />
					<span className="font-semibold text-zinc-200 text-xs truncate">
						Компас 3D • Зуб {data.toothFdi}
					</span>
				</div>
				<div className="flex items-center gap-1 shrink-0">
					<span
						className={`px-1.5 py-0.5 rounded text-[10px] font-mono border ${getRiskColor(
							data.overallRiskTier,
						)}`}
						data-testid="endo-compass-overall-risk"
					>
						{data.overallRiskTier.toUpperCase()}
					</span>
					{onClose && (
						<button
							type="button"
							onClick={onClose}
							className="text-zinc-500 hover:text-zinc-300 px-1 py-0.5 text-xs rounded hover:bg-zinc-900 cursor-pointer"
							title="Свернуть панель"
						>
							×
						</button>
					)}
				</div>
			</div>

			{/* Topology & Protocol Bar */}
			<div className="flex flex-col gap-1 bg-zinc-900/80 p-2 rounded border border-zinc-800/70 text-[11px]">
				<div className="flex items-center justify-between">
					<span className="text-zinc-400">Анатомия Вертуччи:</span>
					<span className="text-zinc-200 font-medium">{data.vertucciNameRu}</span>
				</div>
				<div className="flex items-center justify-between">
					<span className="text-zinc-400">Конусность Ni-Ti:</span>
					<span className="text-cyan-300 font-mono font-semibold">
						{data.recommendedTaper} {data.reciprocatingMotion ? "(Реципрок)" : "(Ротация)"}
					</span>
				</div>
			</div>

			{/* Canals List */}
			<div className="flex flex-col gap-1.5">
				<div className="flex items-center justify-between text-[10px] text-zinc-400 font-medium px-0.5">
					<span>Канал</span>
					<span>Длина (WL / Kuttler)</span>
					<span>Шнейдер (° / R_min)</span>
				</div>
				<div className="flex flex-col gap-1 max-h-48 overflow-y-auto pr-0.5">
					{data.canals.map((c) => {
						const isSelected = activeCanalId === c.id;
						return (
							<button
								key={c.id}
								type="button"
								onClick={() => onSelectCanal(c.id)}
								className={`flex items-center justify-between p-1.5 rounded border text-left transition-colors cursor-pointer ${
									isSelected
										? "bg-zinc-800/90 border-cyan-500/80 text-zinc-100 shadow-xs"
										: "bg-zinc-900/60 border-zinc-800/60 hover:bg-zinc-900 text-zinc-300"
								}`}
								data-testid={`endo-canal-row-${c.id}`}
							>
								<div className="flex items-center gap-1.5 min-w-0">
									{getRiskIcon(c.riskTier)}
									<span className="font-medium text-xs text-zinc-200">{c.name}</span>
								</div>
								<div className="flex items-center gap-3 shrink-0 font-mono text-[11px]">
									<span className="text-zinc-300">
										{c.anatomicalLengthMm.toFixed(1)} /{" "}
										<span className="text-emerald-400">{c.physiologicalLengthMm.toFixed(1)}</span> мм
									</span>
									<span className={`font-semibold ${c.riskTier === "severe" ? "text-rose-400" : c.riskTier === "moderate" ? "text-amber-400" : "text-emerald-400"}`}>
										{c.schneiderAngleDeg.toFixed(0)}°
									</span>
								</div>
							</button>
						);
					})}
				</div>
			</div>

			{/* Active Canal Clinical Tip */}
			{activeCanalId && (
				(() => {
					const canal = data.canals.find((c) => c.id === activeCanalId);
					if (!canal) return null;
					return (
						<div
							className="p-1.5 rounded bg-zinc-900/90 border border-zinc-800 text-[10px] text-zinc-400 leading-tight"
							data-testid="endo-canal-clinical-tip"
						>
							<span className="text-zinc-300 font-medium">Протокол {canal.name}: </span>
							{canal.recommendationRu}
						</div>
					);
				})()
			)}

			{/* Actions: Re-Run & Export to Form 043/u */}
			<div className="flex items-center justify-between gap-2 pt-1 border-t border-zinc-800/80">
				<button
					type="button"
					onClick={onRunAnalysis}
					className="px-2 py-1 rounded text-[11px] text-zinc-400 hover:text-zinc-200 bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 transition-colors cursor-pointer"
					title="Пересчитать устья и каналы"
					data-testid="endo-compass-rerun-btn"
				>
					Пересчет
				</button>
				<button
					type="button"
					onClick={onExportToEmr}
					className="px-2.5 py-1 rounded text-[11px] font-medium bg-cyan-700 hover:bg-cyan-600 text-white border border-cyan-600 flex items-center gap-1 transition-colors cursor-pointer"
					title="Перенести данные в электронную медкарту Form 043/u"
					data-testid="endo-compass-export-emr-btn"
				>
					<Activity className="w-3 h-3" />
					<span>В протокол 043/у</span>
				</button>
			</div>
		</div>
	);
};
