/**
 * DENTE CRM — Top Quick Access Toolbar Ribbon (Layer 4)
 * Strict invariants: Mandate 8b (<=800 lines), Mandate 8d (Clinical density), Mandate 8e (Doctor Autonomy).
 */

import React from "react";
import {
	Activity,
	Camera,
	Copy,
	Crop,
	Download,
	Hand,
	Loader2,
	Maximize2,
	Minimize2,
	Move,
	PenTool,
	Ruler,
	Sliders,
	Sparkles,
	Triangle,
	X,
	Zap,
} from "lucide-react";
import { showToast } from "../../GlobalToast.js";
import {
	BONE_PRESET,
	DENTIN_PRESET,
	DICOM_TAB_LABELS,
	ENAMEL_PRESET,
} from "./dicomRibbonConstants.js";
import type { DicomQuickAccessBarProps, DicomTabType } from "./types.js";

const TABS: readonly DicomTabType[] = ["2D", "MPR", "SECTION", "3D_PANO", "TMJ"] as const;

export const DicomQuickAccessBar: React.FC<DicomQuickAccessBarProps> = ({
	activeTool,
	onSelectTool,
	activeTab,
	onTabChange,
	viewportState,
	onViewportChange,
	isMeasureMenuOpen,
	onToggleMeasureMenu,
	onCloseMeasureMenu,
	measureMenuRef,
	onOpenHuProfile,
	onInstantScreenCapture,
	isWindowPanelOpen,
	onToggleWindowPanel,
	isClippingPanelOpen,
	onToggleClippingPanel,
	isClippingApplied,
	onAiAnalyze,
	isAiAnalyzing,
	aiReport,
	hasAiFindings,
	onToggleFindingsDrawer,
	onNormaClick,
	isNormaApplied,
	patientName,
	isFullscreen,
	onToggleFullscreen,
	onClose,
}) => {
	return (
		<div
			id="dicom-mpr-toolbar"
			data-testid="dicom-toolbox-ribbon"
			data-tour="imaging-filter"
			className="overflow-x-auto scrollbar-none [scrollbar-width:none] [&::-webkit-scrollbar]:hidden touch-pan-x shrink-0 px-2 flex items-center justify-between gap-2 select-none flex-nowrap whitespace-nowrap bg-[#090d16] border-b border-slate-800 text-slate-100 h-10 min-h-[40px]"
		>
			{/* Tabs */}
			<div className="flex items-center gap-1.5 shrink-0">
				<span className="bg-[var(--teal)] text-[var(--on-teal,white)] font-extrabold text-xs px-2.5 py-1 rounded-md tracking-wider shrink-0">
					DENTE КТ
				</span>
				<div className="dente-segmented-bar shrink-0">
					{TABS.map((tab) => {
						const isActive = activeTab === tab;
						const testId =
							tab === "MPR"
								? "btn-dicom-switch-mpr"
								: tab === "SECTION"
									? "btn-dicom-switch-sectioning"
									: undefined;
						return (
							<button
								key={tab}
								type="button"
								data-testid={testId}
								onClick={() => onTabChange(tab)}
								className={`dente-segmented-item ${isActive ? "active" : ""}`}
							>
								{DICOM_TAB_LABELS[tab]}
							</button>
						);
					})}
				</div>
			</div>

			{/* Center: Tools */}
			<div className="flex items-center gap-1 shrink-0">
				<button
					type="button"
					onClick={() => onSelectTool("pan")}
					className={`icon-button h-8 w-8 rounded-lg flex items-center justify-center cursor-pointer transition-colors border ${
						activeTool === "pan"
							? "bg-teal-900/80 border-[var(--teal)] text-teal-300"
							: "bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700"
					}`}
					title="Рука (Pan / Перемещение среза)"
				>
					<Hand size={15} />
				</button>

				<button
					type="button"
					onClick={() => onSelectTool("ruler")}
					className={`icon-button h-8 w-8 rounded-lg flex items-center justify-center cursor-pointer transition-colors border ${
						activeTool === "ruler"
							? "bg-sky-900/80 border-sky-500 text-sky-200"
							: "bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700"
					}`}
					title="Линейка (Distance / Калиброванное расстояние в мм)"
				>
					<Ruler size={15} />
				</button>

				<button
					type="button"
					onClick={() => {
						onSelectTool("angle");
						showToast("Инструмент угла: выберите вершину и две точки лучей", "info");
					}}
					className={`icon-button h-8 w-8 rounded-lg flex items-center justify-center cursor-pointer transition-colors border ${
						activeTool === "angle"
							? "bg-amber-900/80 border-amber-500 text-amber-200"
							: "bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700"
					}`}
					title="Угол (Angle / Измерение угла в градусах)"
				>
					<Triangle size={15} />
				</button>

				<button
					type="button"
					onClick={() => onSelectTool("root_canal_tracer")}
					className={`icon-button h-8 w-8 rounded-lg flex items-center justify-center cursor-pointer transition-colors border ${
						activeTool === "root_canal_tracer"
							? "bg-rose-900/80 border-rose-500 text-rose-200"
							: "bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700"
					}`}
					title="Трассировка корневого канала"
				>
					<PenTool size={15} />
				</button>

				<button
					type="button"
					onClick={() => onInstantScreenCapture(true)}
					className="icon-button h-8 w-8 rounded-lg flex items-center justify-center cursor-pointer transition-colors border border-slate-700 bg-slate-800 text-slate-300 hover:bg-slate-700"
					title="Быстрый снимок экрана в буфер обмена Windows"
				>
					<Camera size={15} />
				</button>

				<button
					type="button"
					data-testid="btn-dicom-hu-profile"
					id="btn-ez3d-hu-profile"
					onClick={onOpenHuProfile}
					className="secondary-button h-8 px-2.5 rounded-lg inline-flex items-center gap-1.5 border border-sky-500/50 bg-sky-600/30 text-sky-200 hover:bg-sky-600/40 text-[13px] font-semibold cursor-pointer transition-colors"
					title="Профиль плотности кости (HU Хаунсфилд вдоль линии измерения D1..D5)"
				>
					<Activity size={14} className="text-sky-400" />
					<span>Плотность HU</span>
				</button>

				{/* ▾ Измерение: Dropdown Menu */}
				<div className="relative" ref={measureMenuRef}>
					<button
						type="button"
						data-testid="btn-dicom-measurement-dropdown"
						id="btn-ez3d-measurement-dropdown"
						onClick={onToggleMeasureMenu}
						className={`secondary-button h-8 px-2.5 rounded-lg inline-flex items-center gap-1 border text-[13px] font-medium cursor-pointer transition-colors ${
							isMeasureMenuOpen
								? "bg-teal-900/80 border-[var(--teal)] text-teal-200"
								: "bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-700"
						}`}
					>
						<span>▾ Измерение</span>
					</button>

					{isMeasureMenuOpen && (
						<div className="absolute left-0 top-full mt-1 w-64 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl z-[10001] p-1.5 flex flex-col gap-0.5">
							<div className="text-xs font-bold text-slate-400 px-2 py-1 uppercase border-b border-slate-800 tracking-wider">
								Измерение
							</div>
							<button
								type="button"
								onClick={() => {
									onSelectTool("ruler");
									onCloseMeasureMenu();
								}}
								className="w-full text-left px-2 py-1.5 text-[13px] font-medium rounded-lg text-slate-200 hover:bg-slate-800 cursor-pointer flex items-center gap-2 transition-colors"
							>
								<Ruler size={14} className="text-sky-400" />
								<span>Длина / Линейка (мм)</span>
							</button>
							<button
								type="button"
								onClick={() => {
									onSelectTool("angle");
									onCloseMeasureMenu();
								}}
								className="w-full text-left px-2 py-1.5 text-[13px] font-medium rounded-lg text-slate-200 hover:bg-slate-800 cursor-pointer flex items-center gap-2 transition-colors"
							>
								<Triangle size={14} className="text-amber-400" />
								<span>Угол (Cobb / Gnathic °)</span>
							</button>
							<button
								type="button"
								onClick={() => {
									onOpenHuProfile();
									onCloseMeasureMenu();
								}}
								className="w-full text-left px-2 py-1.5 text-[13px] font-medium rounded-lg text-slate-200 hover:bg-slate-800 cursor-pointer flex items-center gap-2 transition-colors"
							>
								<Activity size={14} className="text-teal-400" />
								<span>Плотность кости (HU Misch)</span>
							</button>

							<div className="text-xs font-bold text-slate-400 px-2 py-1 uppercase border-b border-slate-800 tracking-wider mt-1">
								Захват
							</div>
							<button
								type="button"
								onClick={() => {
									onInstantScreenCapture(true);
									onCloseMeasureMenu();
								}}
								className="w-full text-left px-2 py-1.5 text-[13px] font-medium rounded-lg text-slate-200 hover:bg-slate-800 cursor-pointer flex items-center gap-2 transition-colors"
							>
								<Copy size={14} className="text-emerald-400" />
								<span>Снимок в буфер (Ctrl+V)</span>
							</button>
							<button
								type="button"
								onClick={() => {
									onInstantScreenCapture(false);
									onCloseMeasureMenu();
								}}
								className="w-full text-left px-2 py-1.5 text-[13px] font-medium rounded-lg text-slate-200 hover:bg-slate-800 cursor-pointer flex items-center gap-2 transition-colors"
							>
								<Download size={14} className="text-cyan-400" />
								<span>Экспорт PNG высокого разрешения</span>
							</button>

							<div className="text-xs font-bold text-slate-400 px-2 py-1 uppercase border-b border-slate-800 tracking-wider mt-1">
								Аннотация
							</div>
							<button
								type="button"
								onClick={() => {
									showToast("Режим стрелки-аннотации активирован: кликните на очаг", "info");
									onCloseMeasureMenu();
								}}
								className="w-full text-left px-2 py-1.5 text-[13px] font-medium rounded-lg text-slate-200 hover:bg-slate-800 cursor-pointer flex items-center gap-2 transition-colors"
							>
								<Move size={14} className="text-pink-400" />
								<span>Стрелка / Клиническая выноска</span>
							</button>

							<div className="text-xs font-bold text-slate-400 px-2 py-1 uppercase border-b border-slate-800 tracking-wider mt-1">
								Моделирование
							</div>
							<button
								type="button"
								onClick={() => {
									showToast(
										"Библиотека имплантатов: буфер безопасности 1.5–2 мм вокруг IAN активна",
										"success",
									);
									onCloseMeasureMenu();
								}}
								className="w-full text-left px-2 py-1.5 text-[13px] font-medium rounded-lg text-slate-200 hover:bg-slate-800 cursor-pointer flex items-center gap-2 transition-colors"
							>
								<Zap size={14} className="text-amber-300" />
								<span>Имплантат (Буфер 1.5–2 мм)</span>
							</button>
						</div>
					)}
				</div>

				{/* 1-Click Clinical Radiography Presets: Кость / Эмаль / Дентин / Негатив */}
				<div className="flex items-center gap-1 shrink-0 ml-1">
					<button
						type="button"
						data-testid="btn-preset-bone"
						onClick={() => {
							onViewportChange(BONE_PRESET);
							showToast("Пресет «Кость / Периодонт»: WW 2000 / WL 500", "info");
						}}
						className={`secondary-button h-8 px-2.5 rounded-lg border text-xs font-semibold cursor-pointer transition-colors ${
							viewportState.windowWidth === 2000 &&
							viewportState.windowCenter === 500 &&
							!viewportState.invert
								? "bg-teal-900/80 border-[var(--teal)] text-teal-200"
								: "bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-700"
						}`}
						title="Пресет: Костная ткань и периодонтальная щель"
					>
						Кость
					</button>
					<button
						type="button"
						data-testid="btn-preset-enamel"
						onClick={() => {
							onViewportChange(ENAMEL_PRESET);
							showToast("Пресет «Эмаль / Кариес»: WW 4000 / WL 1500", "info");
						}}
						className={`secondary-button h-8 px-2.5 rounded-lg border text-xs font-semibold cursor-pointer transition-colors ${
							viewportState.windowWidth === 4000 &&
							viewportState.windowCenter === 1500 &&
							!viewportState.invert
								? "bg-amber-900/80 border-amber-500 text-amber-200"
								: "bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-700"
						}`}
						title="Пресет: Эмаль и скрытый кариес"
					>
						Эмаль
					</button>
					<button
						type="button"
						data-testid="btn-preset-dentin"
						onClick={() => {
							onViewportChange(DENTIN_PRESET);
							showToast("Пресет «Дентин / Эндодонтия»: WW 1500 / WL 300", "info");
						}}
						className={`secondary-button h-8 px-2.5 rounded-lg border text-xs font-semibold cursor-pointer transition-colors ${
							viewportState.windowWidth === 1500 &&
							viewportState.windowCenter === 300 &&
							!viewportState.invert
								? "bg-sky-900/80 border-sky-500 text-sky-200"
								: "bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-700"
						}`}
						title="Пресет: Дентин, верхушка корня и каналы"
					>
						Дентин
					</button>
					<button
						type="button"
						data-testid="btn-preset-negative"
						onClick={() => {
							onViewportChange({ invert: !viewportState.invert });
							showToast(
								viewportState.invert
									? "Инверсия выключена"
									: "Пресет «Негатив»: трещины корня",
								"info",
							);
						}}
						className={`secondary-button h-8 px-2 rounded-lg border text-xs font-semibold cursor-pointer transition-colors ${
							viewportState.invert
								? "bg-blue-900/80 border-blue-500 text-blue-200"
								: "bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-700"
						}`}
						title="Инверсия (Негатив / Позитив) для трещин корня"
					>
						Негатив
					</button>
				</div>

				{/* Toggle Window/Level Management Popover */}
				<button
					type="button"
					id="btn-dicom-window-panel"
					data-tour="mpr-presets"
					onClick={onToggleWindowPanel}
					className={`secondary-button h-8 px-2.5 rounded-lg inline-flex items-center gap-1.5 border text-[13px] font-medium cursor-pointer transition-colors ${
						isWindowPanelOpen
							? "bg-purple-900/80 border-purple-500 text-purple-200"
							: "bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-700"
					}`}
					title="Управление окнами (Ширина, Уровень, Фильтры)"
				>
					<Sliders size={14} />
					<span>Окна W/L</span>
				</button>

				{/* Toggle Clipping Panel Popover */}
				<button
					type="button"
					id="btn-dicom-clipping-panel"
					onClick={onToggleClippingPanel}
					className={`secondary-button h-8 px-2.5 rounded-lg inline-flex items-center gap-1.5 border text-[13px] font-medium cursor-pointer transition-colors ${
						isClippingApplied
							? "bg-emerald-950 border-emerald-500 text-emerald-200"
							: isClippingPanelOpen
								? "bg-teal-900/80 border-[var(--teal)] text-teal-200"
								: "bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-700"
					}`}
					title="Обрезка срезов (Clipping box ROI)"
				>
					<Crop size={14} />
					<span>Обрезка</span>
				</button>
			</div>

			{/* Right: Patient Metadata, AI, 1-Click Norma, Fullscreen, Close */}
			<div className="flex items-center gap-1.5 shrink-0">
				{onAiAnalyze && (
					<button
						type="button"
						data-testid="btn-dicom-run-ai"
						onClick={onAiAnalyze}
						disabled={isAiAnalyzing}
						className="primary-button h-8 px-3 rounded-lg border border-[var(--teal)] bg-[var(--teal)] text-[var(--on-teal,white)] text-[13px] font-semibold cursor-pointer inline-flex items-center gap-1.5 transition-colors disabled:opacity-60 disabled:cursor-not-allowed hover:opacity-90"
						title="Запустить ИИ-анализ снимка на кариес, периодонтит и пломбы"
					>
						{isAiAnalyzing ? (
							<>
								<Loader2 size={13} className="animate-spin" />
								<span>Анализ...</span>
							</>
						) : (
							<>
								<Sparkles size={13} />
								<span>{aiReport ? "ИИ-повтор" : "ИИ-анализ"}</span>
							</>
						)}
					</button>
				)}
				{hasAiFindings && onToggleFindingsDrawer && (
					<button
						type="button"
						onClick={onToggleFindingsDrawer}
						className="h-8 px-2.5 rounded-lg border border-slate-700 bg-slate-800 text-teal-300 hover:bg-slate-700 text-[13px] font-medium cursor-pointer inline-flex items-center gap-1.5 transition-colors"
						title="Показать / скрыть панель находок ИИ"
					>
						<Sparkles size={13} />
						<span>Находки ИИ</span>
					</button>
				)}
				{onNormaClick && (
					<button
						type="button"
						data-testid="btn-dicom-norma-043"
						onClick={onNormaClick}
						className={`h-8 px-3 rounded-lg border text-[13px] font-semibold cursor-pointer inline-flex items-center gap-1.5 transition-colors ${
							isNormaApplied
								? "border-emerald-500/50 bg-emerald-500/20 text-emerald-300"
								: "border-emerald-500/40 bg-emerald-950/80 text-emerald-400 hover:bg-emerald-900/60"
						}`}
						title="Внести заключение «Рентген-норма» в дневник приёма"
					>
						<Zap size={13} className="text-emerald-400" />
						<span>{isNormaApplied ? "Норма внесена" : "Норма: патологии нет"}</span>
					</button>
				)}
				<div className="text-xs text-teal-300 font-bold font-mono px-2 py-1 rounded bg-slate-800/80 border border-slate-700">
					{patientName ? patientName.toUpperCase() : "PID2026-CLINIC"}
				</div>
				<button
					type="button"
					onClick={onToggleFullscreen}
					className="h-8 w-8 rounded-lg flex items-center justify-center border border-slate-700 bg-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-700 cursor-pointer transition-colors"
					title="Полноэкранный режим (F11)"
				>
					{isFullscreen ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
				</button>
				{onClose && (
					<button
						type="button"
						onClick={onClose}
						className="h-8 w-8 rounded-lg flex items-center justify-center border-none bg-transparent text-slate-400 hover:text-rose-400 hover:bg-slate-800/60 cursor-pointer transition-colors"
						title="Закрыть (Esc)"
					>
						<X size={17} />
					</button>
				)}
			</div>
		</div>
	);
};
