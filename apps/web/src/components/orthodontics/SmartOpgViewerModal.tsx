import React, { useState, useMemo, useEffect, useCallback } from "react";
import {
	X,
	Eye,
	Check,
	Sparkles,
	AlertTriangle,
	Layers,
	FileText,
	ZoomIn,
	ZoomOut,
	RotateCcw,
	Activity,
} from "lucide-react";
import {
	opgAiInferenceService,
	type OpgAiInferenceResponse,
} from "./opgAiInferenceService";
import type { OpgToothSlot } from "./opgTopologicalEngine";
import { showToast } from "../GlobalToast";

export interface SmartOpgViewerModalProps {
	isOpen: boolean;
	onClose: () => void;
	imageUrl?: string | undefined;
	onApplyOdontogram?: ((teethMap: Record<number, OpgToothSlot>) => void) | undefined;
	patientName?: string | undefined;
	patientId?: string | undefined;
}

export const SmartOpgViewerModal: React.FC<SmartOpgViewerModalProps> = ({
	isOpen,
	onClose,
	imageUrl,
	onApplyOdontogram,
	patientName = "Темур",
}) => {
	const [isLoading, setIsLoading] = useState<boolean>(true);
	const [result, setResult] = useState<OpgAiInferenceResponse | null>(null);
	const [showFdiLabels, setShowFdiLabels] = useState<boolean>(true);
	const [showPathologies, setShowPathologies] = useState<boolean>(true);
	const [isPatientMode, setIsPatientMode] = useState<boolean>(false);
	const [zoom, setZoom] = useState<number>(1.0);
	const [selectedTooth, setSelectedTooth] = useState<number | null>(null);
	const [isApplied, setIsApplied] = useState<boolean>(false);
	const [mobileTab, setMobileTab] = useState<"image" | "details">("image");

	const activeImage = imageUrl || "/models/sample_opg_temur.png";

	// Run AI analysis on open
	useEffect(() => {
		if (!isOpen) return;

		let isCancelled = false;
		setIsLoading(true);
		setIsApplied(false);

		opgAiInferenceService
			.runInference(activeImage, { allowFallback: true })
			.then((res) => {
				if (!isCancelled) {
					setResult(res);
					setIsLoading(false);
				}
			})
			.catch(() => {
				if (!isCancelled) {
					setIsLoading(false);
				}
			});

		return () => {
			isCancelled = true;
		};
	}, [isOpen, activeImage]);

	const handleApply = useCallback(() => {
		if (isLoading) {
			showToast("Выполняется анализ панорамного снимка нейросетью...", "info");
			return;
		}
		if (!result) {
			showToast("Снимок не загружен или анализ недоступен", "warning");
			return;
		}
		if (onApplyOdontogram) {
			onApplyOdontogram(result.analysis.teeth);
			setIsApplied(true);
			setTimeout(() => {
				setIsApplied(false);
			}, 2500);
		}
	}, [isLoading, result, onApplyOdontogram]);

	const analysis = result?.analysis;

	if (!isOpen) return null;

	return (
		<div
			className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-2 sm:p-6"
			role="dialog"
			aria-modal="true"
			data-testid="smart-opg-viewer-modal"
		>
			<div className="relative flex flex-col w-full max-w-7xl h-[94vh] max-h-[950px] bg-[var(--paper,#ffffff)] dark:bg-slate-900 border border-[var(--line,#e2e8f0)] dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden text-[var(--ink,#0f172a)] dark:text-slate-100">
				{/* Top Bar */}
				<header className="flex items-center justify-between px-3 sm:px-6 py-2.5 sm:py-3.5 bg-[var(--paper-soft,#f8fafc)] dark:bg-slate-950/80 border-b border-[var(--line,#e2e8f0)] dark:border-slate-800 shrink-0">
					<div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
						<div className="p-1.5 sm:p-2 bg-sky-500/10 text-sky-500 dark:text-sky-400 rounded-xl border border-sky-500/20 shrink-0">
							<Sparkles className="w-4 h-4 sm:w-5 sm:h-5 animate-pulse" />
						</div>
						<div className="min-w-0">
							<div className="flex items-center gap-2">
								<h2 className="text-xs sm:text-base font-bold text-[var(--ink,#0f172a)] dark:text-white tracking-wide truncate">
									Анализ ОПТГ (Smart OPG) · {patientName.replace(/\s*\(.*\)/, "")}
								</h2>
								<span className="hidden sm:inline-block text-[11px] px-2 py-0.5 rounded-full bg-[var(--paper-strong,#ffffff)] dark:bg-slate-800 text-[var(--muted,#64748b)] dark:text-slate-300 border border-[var(--line,#e2e8f0)] dark:border-slate-700 font-semibold shrink-0">
									{result?.backendLabel || "ONNX Local AI"}
								</span>
							</div>
							<p className="text-[11px] sm:text-xs text-[var(--muted,#64748b)] dark:text-slate-400 hidden sm:block truncate">
								Топологическая реконструкция зубной формулы и детекция ретенции/очагов
							</p>
							<p className="text-[11px] text-[var(--muted,#64748b)] dark:text-slate-400 sm:hidden">
								32 зуба · Ретенция 8-к · Форма 043/у
							</p>
						</div>
					</div>

					<div className="flex items-center gap-2 shrink-0">
						<button
							type="button"
							onClick={onClose}
							className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl text-[var(--muted,#64748b)] hover:text-[var(--ink,#0f172a)] dark:text-slate-400 dark:hover:text-white hover:bg-[var(--paper-hover,#f1f5f9)] dark:hover:bg-slate-800 transition-colors"
							aria-label="Закрыть"
							data-testid="btn-close-smart-opg"
						>
							<X className="w-5 h-5" />
						</button>
					</div>
				</header>

				{/* Mobile Tab Switcher (Apple HIG / Anti-Desktop-Squeeze) */}
				<div className="flex lg:hidden items-center justify-around p-1.5 bg-[var(--paper-soft,#f8fafc)] dark:bg-slate-950 border-b border-[var(--line,#e2e8f0)] dark:border-slate-800 shrink-0">
					<button
						type="button"
						onClick={() => setMobileTab("image")}
						data-testid="mobile-tab-opg-image"
						className={`flex-1 min-h-[44px] py-2 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
							mobileTab === "image"
								? "bg-sky-500 text-white shadow-sm"
								: "text-[var(--muted,#64748b)] dark:text-slate-400 hover:bg-[var(--paper-hover,#f1f5f9)]"
						}`}
					>
						<Layers className="w-4 h-4" />
						<span>Снимок ОПТГ</span>
					</button>
					<button
						type="button"
						onClick={() => setMobileTab("details")}
						data-testid="mobile-tab-opg-details"
						className={`flex-1 min-h-[44px] py-2 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
							mobileTab === "details"
								? "bg-sky-500 text-white shadow-sm"
								: "text-[var(--muted,#64748b)] dark:text-slate-400 hover:bg-[var(--paper-hover,#f1f5f9)]"
						}`}
					>
						<FileText className="w-4 h-4" />
						<span>Форма 043/у и метрики</span>
					</button>
				</div>

				{/* Main Body */}
				<div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
					{/* Left / Center: Interactive OPG Radiograph Canvas */}
					<div className={`flex-1 relative flex flex-col bg-black/90 overflow-hidden ${
						mobileTab === "image" ? "flex" : "hidden lg:flex"
					}`}>
						{/* Floating Controls Bar */}
						<div className="absolute top-2 sm:top-4 left-2 sm:left-4 z-20 flex flex-wrap items-center gap-1.5 sm:gap-2 p-1 sm:p-1.5 bg-[var(--paper-strong,#ffffff)]/95 dark:bg-slate-900/90 backdrop-blur-md rounded-xl border border-[var(--line,#cbd5e1)] dark:border-slate-800 shadow-lg text-[var(--ink,#0f172a)] dark:text-slate-100">
							<button
								type="button"
								onClick={() => setShowFdiLabels((prev) => !prev)}
								className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold min-h-[40px] sm:min-h-[32px] transition-colors cursor-pointer ${
									showFdiLabels
										? "bg-sky-500 text-white shadow-sm"
										: "text-[var(--ink,#0f172a)] dark:text-slate-300 hover:bg-[var(--paper-hover,#f1f5f9)] dark:hover:bg-slate-800"
								}`}
							>
								<Layers className="w-3.5 h-3.5" />
								Номера FDI
							</button>

							<button
								type="button"
								onClick={() => setShowPathologies((prev) => !prev)}
								className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold min-h-[40px] sm:min-h-[32px] transition-colors cursor-pointer ${
									showPathologies
										? "bg-rose-500 text-white shadow-sm"
										: "text-[var(--ink,#0f172a)] dark:text-slate-300 hover:bg-[var(--paper-hover,#f1f5f9)] dark:hover:bg-slate-800"
								}`}
							>
								<AlertTriangle className="w-3.5 h-3.5" />
								Патологии
							</button>

							<button
								type="button"
								onClick={() => setIsPatientMode((prev) => !prev)}
								className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold min-h-[40px] sm:min-h-[32px] transition-colors cursor-pointer ${
									isPatientMode
										? "bg-emerald-500 text-white shadow-sm"
										: "text-[var(--ink,#0f172a)] dark:text-slate-300 hover:bg-[var(--paper-hover,#f1f5f9)] dark:hover:bg-slate-800"
								}`}
							>
								<Eye className="w-3.5 h-3.5" />
								Для пациента
							</button>

							<div className="h-4 w-px bg-[var(--line,#cbd5e1)] dark:bg-slate-800 mx-1" />

							<button
								type="button"
								onClick={() => setZoom((z) => Math.min(2.0, z + 0.15))}
								className="p-1.5 min-w-[36px] min-h-[36px] sm:min-w-[32px] sm:min-h-[32px] flex items-center justify-center rounded-lg text-[var(--ink,#0f172a)] dark:text-slate-300 hover:bg-[var(--paper-hover,#f1f5f9)] dark:hover:bg-slate-800 transition-colors cursor-pointer"
								title="Увеличить"
							>
								<ZoomIn className="w-4 h-4" />
							</button>
							<button
								type="button"
								onClick={() => setZoom((z) => Math.max(0.7, z - 0.15))}
								className="p-1.5 min-w-[36px] min-h-[36px] sm:min-w-[32px] sm:min-h-[32px] flex items-center justify-center rounded-lg text-[var(--ink,#0f172a)] dark:text-slate-300 hover:bg-[var(--paper-hover,#f1f5f9)] dark:hover:bg-slate-800 transition-colors cursor-pointer"
								title="Уменьшить"
							>
								<ZoomOut className="w-4 h-4" />
							</button>
							<button
								type="button"
								onClick={() => setZoom(1.0)}
								className="p-1.5 min-w-[36px] min-h-[36px] sm:min-w-[32px] sm:min-h-[32px] flex items-center justify-center rounded-lg text-[var(--ink,#0f172a)] dark:text-slate-300 hover:bg-[var(--paper-hover,#f1f5f9)] dark:hover:bg-slate-800 transition-colors cursor-pointer"
								title="Сброс масштаба"
							>
								<RotateCcw className="w-4 h-4" />
							</button>
						</div>

						{/* Radiograph Viewport */}
						<div className="flex-1 relative flex items-center justify-center p-4 overflow-auto">
							{isLoading ? (
								<div className="flex flex-col items-center gap-3 text-slate-400 animate-pulse">
									<Activity className="w-8 h-8 text-sky-400 animate-spin" />
									<p className="text-sm font-medium">Анализ панорамы нейросетью...</p>
								</div>
							) : (
								<div
									className="relative transition-transform duration-150 ease-out select-none"
									style={{ transform: `scale(${zoom})` }}
								>
									{/* Background Radiograph */}
									<img
										src={activeImage}
										alt="Панорамный снимок ОПТГ"
										className="max-w-[950px] max-h-[600px] w-auto h-auto object-contain rounded-lg border border-slate-800/80 shadow-2xl pointer-events-none"
									/>

									{/* Midline Indicator */}
									{analysis && (
										<div
											className="absolute top-0 bottom-0 w-px bg-amber-500/50 pointer-events-none border-r border-dashed border-amber-500/80"
											style={{ left: `${(analysis.midlineX / 1024) * 100}%` }}
										/>
									)}

									{/* Interactive Overlay Layer */}
									{analysis && (
										<div className="absolute inset-0">
											{Object.values(analysis.teeth).map((slot) => {
												const t = slot.toothDetection;
												if (!t) return null;

												const leftPct = (t.x1 / 1024) * 100;
												const topPct = (t.y1 / 574) * 100;
												const widthPct = (t.width / 1024) * 100;
												const heightPct = (t.height / 574) * 100;

												const isSelected = selectedTooth === slot.fdi;
												const hasImpacted = slot.status === "Retained";
												const hasPerio = slot.status === "Periodontitis";

												let borderColor = "border-sky-500/40";
												let bgColor = "bg-sky-500/5";

												if (hasImpacted) {
													borderColor = "border-rose-500";
													bgColor = "bg-rose-500/20";
												} else if (hasPerio) {
													borderColor = "border-amber-500";
													bgColor = "bg-amber-500/20";
												}

												return (
													<div
														key={slot.fdi}
														onClick={() => setSelectedTooth(slot.fdi)}
														style={{
															left: `${leftPct}%`,
															top: `${topPct}%`,
															width: `${widthPct}%`,
															height: `${heightPct}%`,
														}}
														className={`absolute cursor-pointer border rounded transition-all ${borderColor} ${bgColor} ${
															isSelected ? "ring-2 ring-white ring-offset-1 ring-offset-slate-900" : ""
														}`}
													>
														{/* FDI Label */}
														{showFdiLabels && (
															<span
																className={`absolute -top-3 left-0 px-1 py-0.2 rounded text-[10px] font-bold whitespace-nowrap leading-none select-none ${
																	hasImpacted
																		? "bg-rose-600 text-white"
																		: hasPerio
																			? "bg-amber-600 text-white"
																			: "bg-slate-900/90 text-sky-400 border border-sky-500/40"
																}`}
															>
																{slot.fdi}
															</span>
														)}

														{/* Patient Friendly Marker */}
														{isPatientMode && hasImpacted && (
															<div className="absolute inset-0 flex items-center justify-center bg-rose-600/30 rounded backdrop-blur-[1px]">
																<span className="text-[11px] font-extrabold text-white bg-rose-600 px-1.5 py-0.5 rounded shadow">
																	УДАЛИТЬ 8-КУ
																</span>
															</div>
														)}
													</div>
												);
											})}
										</div>
									)}
								</div>
							)}
						</div>

						{/* Mobile Floating Bottom Action Bar (Thumb Zone per Apple HIG §2.1) */}
						<div className="lg:hidden absolute bottom-3 left-3 right-3 z-30 flex items-center gap-2 bg-[var(--paper-strong,#ffffff)]/90 dark:bg-slate-900/90 backdrop-blur-md p-2 rounded-2xl border border-[var(--line,#e2e8f0)] dark:border-slate-800 shadow-xl">
							<button
								type="button"
								onClick={handleApply}
								data-testid="btn-apply-opg-odontogram-mobile"
								className="flex-1 min-h-[48px] py-2.5 px-4 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2 bg-sky-600 hover:bg-sky-500 text-white shadow-md active:scale-98 cursor-pointer"
							>
								<Check className="w-4 h-4" />
								<span>{isApplied ? "Внесено в формулу!" : "Принять в формулу (043/у)"}</span>
							</button>
							<button
								type="button"
								onClick={() => setMobileTab("details")}
								data-testid="mobile-btn-switch-to-details"
								className="min-h-[48px] px-3.5 rounded-xl font-bold text-xs border border-[var(--line,#cbd5e1)] dark:border-slate-700 bg-[var(--paper,#ffffff)] dark:bg-slate-800 text-[var(--ink,#0f172a)] dark:text-slate-200 flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs"
								title="Перейти к протоколу Формы 043/у"
							>
								<FileText className="w-4 h-4 text-sky-500" />
								<span>Отчет</span>
							</button>
						</div>
					</div>

					{/* Right Column: Diagnostic Summary & Form 043/y Integration */}
					<aside className={`w-full lg:w-96 bg-[var(--paper-soft,#f8fafc)] dark:bg-slate-950 border-t lg:border-t-0 lg:border-l border-[var(--line,#e2e8f0)] dark:border-slate-800 flex flex-col shrink-0 min-h-0 ${
						mobileTab === "details" ? "flex flex-1" : "hidden lg:flex"
					}`}>
						{/* Scrollable Metrics & Protocol Body */}
						<div className="flex-1 overflow-y-auto min-h-0">
							{/* Summary Counters */}
							<div className="p-3 sm:p-4 border-b border-[var(--line,#e2e8f0)] dark:border-slate-800 grid grid-cols-2 gap-2">
								<div className="p-2.5 bg-[var(--paper-strong,#ffffff)] dark:bg-slate-900 rounded-xl border border-[var(--line,#e2e8f0)] dark:border-slate-800 shadow-2xs">
									<span className="text-xs text-[var(--muted,#64748b)] dark:text-slate-400 font-medium">Найдено зубов:</span>
									<div className="text-lg font-black text-sky-600 dark:text-sky-400">
										{analysis?.totalTeethDetected ?? 0}{" "}
										<span className="text-xs font-normal text-[var(--muted,#64748b)] dark:text-slate-500">из 32</span>
									</div>
								</div>

								<div className="p-2.5 bg-[var(--paper-strong,#ffffff)] dark:bg-slate-900 rounded-xl border border-[var(--line,#e2e8f0)] dark:border-slate-800 shadow-2xs">
									<span className="text-xs text-[var(--muted,#64748b)] dark:text-slate-400 font-medium">Отсутствуют:</span>
									<div className="text-lg font-black text-[var(--ink,#0f172a)] dark:text-slate-300">
										{analysis?.missingTeethCount ?? 0}
									</div>
								</div>

								<div className="p-2.5 bg-rose-500/10 dark:bg-rose-950/20 rounded-xl border border-rose-500/20 dark:border-rose-900/40 shadow-2xs">
									<span className="text-xs text-rose-600 dark:text-rose-300 font-medium">Ретенция 8-к:</span>
									<div className="text-lg font-black text-rose-600 dark:text-rose-400">
										{analysis?.impactedTeethCount ?? 0}
									</div>
								</div>

								<div className="p-2.5 bg-amber-500/10 dark:bg-amber-950/20 rounded-xl border border-amber-500/20 dark:border-amber-900/40 shadow-2xs">
									<span className="text-xs text-amber-600 dark:text-amber-300 font-medium">Патологии:</span>
									<div className="text-lg font-black text-amber-600 dark:text-amber-400">
										{analysis?.pathologiesCount ?? 0}
									</div>
								</div>
							</div>

							{/* Selected Tooth Detail / Quick Inspector */}
							<div className="p-3 sm:p-4 border-b border-[var(--line,#e2e8f0)] dark:border-slate-800">
								<h3 className="text-xs font-bold text-[var(--muted,#64748b)] dark:text-slate-300 uppercase tracking-wider mb-2">
									{selectedTooth ? `Зуб ${selectedTooth}` : "Инспектор зуба"}
								</h3>
								{selectedTooth && analysis?.teeth[selectedTooth] ? (
									<div className="p-3 bg-[var(--paper-strong,#ffffff)] dark:bg-slate-900 rounded-xl border border-[var(--line,#e2e8f0)] dark:border-slate-800 shadow-2xs">
										<div className="flex items-center justify-between mb-1">
											<span className="text-sm font-bold text-[var(--ink,#0f172a)] dark:text-white">
												Позиция {selectedTooth} (Квадрант {Math.floor(selectedTooth / 10)})
											</span>
											<span className="text-xs px-2 py-0.5 rounded font-bold bg-sky-500/10 text-sky-700 dark:text-sky-300 border border-sky-500/20">
												{analysis.teeth[selectedTooth].status}
											</span>
										</div>
										<p className="text-xs text-[var(--ink-secondary,#334155)] dark:text-slate-300 leading-relaxed">
											{analysis.teeth[selectedTooth].clinicalDescriptionRu}
										</p>
									</div>
								) : (
									<p className="text-xs text-[var(--muted,#64748b)] dark:text-slate-500">
										Кликните на любой зуб на снимке для детальной информации.
									</p>
								)}
							</div>

							{/* Form 043/y Structured Protocol Text */}
							<div className="p-3 sm:p-4">
								<div className="flex items-center justify-between mb-2">
									<h3 className="text-xs font-bold text-[var(--muted,#64748b)] dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
										<FileText className="w-3.5 h-3.5 text-sky-500 dark:text-sky-400" />
										Протокол ОПТГ (Форма 043/у)
									</h3>
								</div>
								<div className="p-3 bg-[var(--paper-strong,#ffffff)] dark:bg-slate-900/60 rounded-xl border border-[var(--line,#e2e8f0)] dark:border-slate-800 text-xs text-[var(--ink,#0f172a)] dark:text-slate-300 leading-relaxed font-mono whitespace-pre-wrap max-h-56 overflow-y-auto shadow-2xs">
									{analysis?.protocol043Ru || "Генерация протокола..."}
								</div>
							</div>
						</div>

						{/* Primary CTA Footer */}
						<footer className="p-3 sm:p-4 bg-[var(--paper-soft,#f8fafc)] dark:bg-slate-950 border-t border-[var(--line,#e2e8f0)] dark:border-slate-800 flex flex-col gap-1.5 sm:gap-2 shrink-0 z-10">
							<button
								type="button"
								onClick={handleApply}
								data-testid="btn-apply-opg-odontogram"
								className={`w-full min-h-[48px] py-3 px-4 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all shadow-lg cursor-pointer active:scale-98 ${
									isApplied
										? "bg-emerald-600 text-white"
										: "bg-sky-600 hover:bg-sky-500 text-white shadow-sky-600/20"
								}`}
							>
								{isApplied ? (
									<>
										<Check className="w-4 h-4" />
										Внесено в формулу 043/у!
									</>
								) : (
									<>
										<Check className="w-4 h-4" />
										Принять в зубную формулу (Форма 043/у)
									</>
								)}
							</button>

							<p className="text-[11px] text-center text-[var(--muted,#64748b)] dark:text-slate-500 font-medium">
								Врач-валидатор: данные переносятся в ЭМК с возможностью ручной правки.
							</p>
						</footer>
					</aside>
				</div>
			</div>
		</div>
	);
};
