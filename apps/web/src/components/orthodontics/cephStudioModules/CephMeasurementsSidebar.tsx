/**
 * apps/web/src/components/orthodontics/cephStudioModules/CephMeasurementsSidebar.tsx
 *
 * Layer 4: Clinical Measurements Sidebar for Cephalometrics.
 * - Patient Demo Mode: Ricketts aesthetic E-line, plain-language bite explanation.
 * - Doctor Mode: 3 tabs (Landmarks checklist, 17-angle diagnostic table, Form 043/y report).
 */

import React from "react";
import { Check, Copy, Smile } from "lucide-react";
import { CEPHALOMETRIC_LANDMARKS } from "../cephalometricMath";
import type { CephMeasurementsSidebarProps } from "./cephStudioTypes";

export const CephMeasurementsSidebar: React.FC<CephMeasurementsSidebarProps> = ({
	theme,
	isPatientDemoMode,
	activeTab,
	onTabChange,
	analysis,
	landmarks,
	activeTargetKey,
	onSelectTargetKey,
	copiedProtocol,
	onCopyProtocol,
	onInsertToChart,
}) => {
	return (
		<aside
			className={`w-96 sm:w-[440px] border-l flex flex-col shrink-0 overflow-hidden shadow-2xl transition-colors ${
				theme === "light"
					? "bg-white border-slate-200 text-slate-800"
					: "bg-slate-900 border-slate-800 text-slate-100"
			}`}
			data-testid="ceph-studio-sidebar"
		>
			{isPatientDemoMode ? (
				/* ─── PATIENT DEMONSTRATION MODE ────────────────────────────────── */
				<div
					className={`flex-1 flex flex-col overflow-y-auto p-5 space-y-4 ${
						theme === "light" ? "bg-slate-50 text-slate-800" : "bg-slate-900 text-slate-200"
					}`}
				>
					{/* Header banner */}
					<div className="p-4 rounded-2xl bg-gradient-to-br from-purple-900/40 to-slate-800/80 border border-purple-500/30">
						<div className="flex items-center gap-2 mb-2">
							<Smile className="text-purple-400" size={20} />
							<h2 className="text-sm font-bold text-white uppercase tracking-wider m-0">
								Эстетический анализ профиля
							</h2>
						</div>
						<p className="text-xs text-purple-200 leading-relaxed m-0">
							Наглядная визуализация положения челюстей, губ и зубов для согласования плана ортодонтического лечения.
						</p>
					</div>

					{/* 1. Ricketts Aesthetic E-Line Card */}
					<div className="p-4 rounded-xl bg-slate-800/90 border border-slate-700 space-y-2.5">
						<div className="flex items-center justify-between">
							<span className="text-xs font-bold text-slate-200 uppercase tracking-wide">
								Эстетическая линия Риккетса (E-Line)
							</span>
							<span className="text-[10px] font-mono px-2 py-0.5 rounded bg-purple-950 border border-purple-800 text-purple-300 font-bold">
								Профиль лица
							</span>
						</div>
						<p className="text-xs text-slate-300 leading-relaxed m-0">
							Прямая линия, соединяющая кончик носа (Pn) и наиболее выступающую точку подбородка (PogS).
						</p>
						<div className="p-3 rounded-lg bg-slate-950/80 border border-slate-800 space-y-2">
							<div className="flex items-center justify-between text-xs">
								<span className="text-slate-400">Верхняя губа:</span>
								<span className="font-bold text-emerald-400">
									Норма -4 мм (гармоничное смыкание)
								</span>
							</div>
							<div className="flex items-center justify-between text-xs">
								<span className="text-slate-400">Нижняя губа:</span>
								<span className="font-bold text-emerald-400">
									Норма -2 мм (правильная поддержка)
								</span>
							</div>
						</div>
						<div className="text-[11px] text-teal-300 font-medium">
							✓ Профиль пропорционален, выраженного западания или выпячивания губ не наблюдается.
						</div>
					</div>

					{/* 2. Bite Classification Card */}
					<div className="p-4 rounded-xl bg-slate-800/90 border border-slate-700 space-y-2.5">
						<div className="flex items-center justify-between">
							<span className="text-xs font-bold text-slate-200 uppercase tracking-wide">
								Соотношение челюстей
							</span>
							<span
								className={`text-[10px] px-2 py-0.5 rounded font-bold ${
									analysis.diagnosis.skeletalClass === "Class I"
										? "bg-emerald-950 border border-emerald-800 text-emerald-300"
										: analysis.diagnosis.skeletalClass === "Class II"
											? "bg-amber-950 border border-amber-800 text-amber-300"
											: "bg-indigo-950 border border-indigo-800 text-indigo-300"
								}`}
							>
								{analysis.diagnosis.skeletalClassRu}
							</span>
						</div>
						<div className="p-3 rounded-lg bg-slate-950/80 border border-slate-800">
							<p className="text-xs text-slate-200 leading-relaxed m-0">
								{analysis.diagnosis.skeletalClass === "Class I"
									? "Челюсти расположены в правильном нейтральном соотношении. Основная задача — ровное выравнивание зубного ряда и закрытие промежутков."
									: analysis.diagnosis.skeletalClass === "Class II"
										? "Верхняя челюсть расположена слегка впереди относительно нижней (дистальное смещение). Требуется мягкая коррекция прикуса на брекетах или элайнерах."
										: "Нижняя челюсть выступает вперед (мезиальное соотношение). Требуется удержание наклона нижних резцов."}
							</p>
						</div>
					</div>

					{/* 3. Incisor Smile Aesthetics */}
					<div className="p-4 rounded-xl bg-slate-800/90 border border-slate-700 space-y-2">
						<span className="text-xs font-bold text-slate-200 uppercase tracking-wide">
							Наклон передних зубов и улыбка
						</span>
						<div className="p-3 rounded-lg bg-slate-950/80 border border-slate-800 space-y-1.5 text-xs">
							<div className="flex items-center justify-between">
								<span className="text-slate-400">Верхние резцы:</span>
								<span className="font-semibold text-slate-200">
									{analysis.diagnosis.upperIncisorInclinationRu}
								</span>
							</div>
							<div className="flex items-center justify-between">
								<span className="text-slate-400">Нижние резцы:</span>
								<span className="font-semibold text-slate-200">
									{analysis.diagnosis.lowerIncisorInclinationRu}
								</span>
							</div>
						</div>
						<p className="text-[11px] text-slate-400 m-0">
							Аппаратура настраивается с учетом естественного наклона корней для предотвращения потери костной ткани.
						</p>
					</div>

					{/* 4. Action Banner */}
					<div className="mt-auto p-3 rounded-xl bg-teal-950/60 border border-teal-800/80 flex items-center justify-between gap-3">
						<div className="text-xs text-teal-200">
							План согласован? Перенесите результаты в карточку:
						</div>
						<button
							type="button"
							onClick={onInsertToChart}
							className="px-3 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold shrink-0 transition-colors cursor-pointer"
						>
							В карту
						</button>
					</div>
				</div>
			) : (
				/* ─── DOCTOR CLINICAL DIAGNOSTIC MODE ──────────────────────────── */
				<div className="flex-1 flex flex-col overflow-hidden">
					{/* Tab Switcher */}
					<div
						className={`h-11 border-b px-3 flex items-center gap-1 shrink-0 ${
							theme === "light" ? "bg-slate-100 border-slate-200" : "bg-slate-950 border-slate-800"
						}`}
					>
						<button
							type="button"
							onClick={() => onTabChange("landmarks")}
							data-testid="ceph-tab-landmarks"
							className={`flex-1 py-1.5 rounded-md text-xs font-semibold transition-all cursor-pointer ${
								activeTab === "landmarks"
									? theme === "light"
										? "bg-white text-teal-700 shadow-sm border border-slate-200 font-bold"
										: "bg-slate-800 text-teal-400 shadow-sm"
									: theme === "light"
										? "text-slate-600 hover:text-slate-900"
										: "text-slate-400 hover:text-slate-200"
							}`}
						>
							Ориентиры ({analysis.placedCount})
						</button>
						<button
							type="button"
							onClick={() => onTabChange("angles")}
							data-testid="ceph-tab-angles"
							className={`flex-1 py-1.5 rounded-md text-xs font-semibold transition-all cursor-pointer ${
								activeTab === "angles"
									? theme === "light"
										? "bg-white text-teal-700 shadow-sm border border-slate-200 font-bold"
										: "bg-slate-800 text-teal-400 shadow-sm"
									: theme === "light"
										? "text-slate-600 hover:text-slate-900"
										: "text-slate-400 hover:text-slate-200"
							}`}
						>
							Расчет углов ({analysis.measurements.filter((m) => m.value !== null).length})
						</button>
						<button
							type="button"
							onClick={() => onTabChange("report")}
							data-testid="ceph-tab-report"
							className={`flex-1 py-1.5 rounded-md text-xs font-semibold transition-all cursor-pointer ${
								activeTab === "report"
									? theme === "light"
										? "bg-white text-teal-700 shadow-sm border border-slate-200 font-bold"
										: "bg-slate-800 text-teal-400 shadow-sm"
									: theme === "light"
										? "text-slate-600 hover:text-slate-900"
										: "text-slate-400 hover:text-slate-200"
							}`}
						>
							Медицинская карта
						</button>
					</div>

					{/* Tab 1: Anatomical Landmarks Checklist */}
					{activeTab === "landmarks" && (
						<div
							className={`flex-1 flex flex-col overflow-y-auto p-4 space-y-3 ${
								theme === "light" ? "bg-white" : ""
							}`}
						>
							<div
								className={`flex items-center justify-between text-xs ${
									theme === "light" ? "text-slate-600" : "text-slate-400"
								}`}
							>
								<span>Анатомические точки (по Штайнеру и Твиду):</span>
								<span
									className={`font-mono font-bold ${
										theme === "light" ? "text-teal-700" : "text-teal-400"
									}`}
								>
									{analysis.placedCount} / {CEPHALOMETRIC_LANDMARKS.length}
								</span>
							</div>

							<div className="space-y-1.5">
								{CEPHALOMETRIC_LANDMARKS.map((lm) => {
									const isPlaced = Boolean(landmarks[lm.key]);
									const isTargeted = activeTargetKey === lm.key;

									return (
										<div
											key={lm.key}
											onClick={() => onSelectTargetKey(isTargeted ? null : lm.key)}
											className={`p-2.5 rounded-xl border text-xs flex items-center justify-between gap-2 transition-all cursor-pointer ${
												isTargeted
													? theme === "light"
														? "bg-teal-50 border-teal-500 text-teal-900 shadow-md"
														: "bg-teal-950/80 border-teal-500 text-white shadow-md"
													: isPlaced
														? theme === "light"
															? "bg-slate-50 border-slate-200 text-slate-800 hover:bg-slate-100"
															: "bg-slate-800/80 border-slate-700/80 text-slate-200 hover:bg-slate-800"
														: theme === "light"
															? "bg-white border-slate-200 text-slate-500 hover:bg-slate-50"
															: "bg-slate-900/60 border-slate-800 text-slate-400 hover:bg-slate-800/40"
											}`}
										>
											<div className="flex items-center gap-2 min-w-0">
												<span
													className="w-2.5 h-2.5 rounded-full shrink-0"
													style={{ backgroundColor: lm.color }}
												/>
												<div className="min-w-0">
													<div
														className={`font-bold truncate ${
															theme === "light" ? "text-slate-900" : "text-slate-100"
														}`}
													>
														{lm.nameRu}
													</div>
													<div
														className={`text-[10px] truncate ${
															theme === "light" ? "text-slate-500" : "text-slate-400"
														}`}
													>
														{lm.anatomicalDescription}
													</div>
												</div>
											</div>

											<div className="flex items-center gap-2 shrink-0">
												{isPlaced ? (
													<span
														className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-bold ${
															theme === "light"
																? "bg-teal-100 border border-teal-300 text-teal-800"
																: "bg-teal-950 border border-teal-800 text-teal-300"
														}`}
													>
														✓ Размечена
													</span>
												) : (
													<span
														className={`px-1.5 py-0.5 rounded text-[10px] font-mono ${
															theme === "light"
																? "bg-slate-100 border border-slate-200 text-slate-500"
																: "bg-slate-800 border border-slate-700 text-slate-400"
														}`}
													>
														Ожидает
													</span>
												)}
											</div>
										</div>
									);
								})}
							</div>
						</div>
					)}

					{/* Tab 2: Angle Calculation Table */}
					{activeTab === "angles" && (
						<div
							className={`flex-1 flex flex-col overflow-y-auto p-4 space-y-3 ${
								theme === "light" ? "bg-white" : ""
							}`}
						>
							<div
								className={`flex items-center justify-between text-xs mb-1 ${
									theme === "light" ? "text-slate-600" : "text-slate-400"
								}`}
							>
								<span>17 клинических параметров ТРГ:</span>
								<span
									className={`font-mono font-bold ${
										theme === "light" ? "text-teal-700" : "text-teal-400"
									}`}
								>
									{analysis.measurements.filter((m) => m.value !== null).length} / 17
								</span>
							</div>

							<div className="space-y-2">
								{analysis.measurements.map((m) => (
									<div
										key={m.id}
										className={`p-3 rounded-xl border text-xs space-y-1.5 ${
											theme === "light"
												? "bg-slate-50 border-slate-200"
												: "bg-slate-800/80 border-slate-700"
										}`}
									>
										<div className="flex items-center justify-between">
											<div className="flex items-center gap-2">
												<span
													className={`font-mono font-bold text-sm ${
														theme === "light" ? "text-slate-900" : "text-white"
													}`}
												>
													{m.id}
												</span>
												<span
													className={`text-[11px] truncate max-w-[140px] ${
														theme === "light" ? "text-slate-500" : "text-slate-400"
													}`}
												>
													{m.name}
												</span>
											</div>

											<div className="flex items-center gap-1.5">
												<span
													className={`font-mono font-bold text-sm ${
														theme === "light" ? "text-teal-700" : "text-teal-300"
													}`}
												>
													{m.value !== null ? `${m.value}${m.unit}` : "—"}
												</span>
												<span
													className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
														m.status === "normal"
															? theme === "light"
																? "bg-emerald-100 border border-emerald-300 text-emerald-800"
																: "bg-emerald-950 border border-emerald-800 text-emerald-300"
															: m.status === "increased"
																? theme === "light"
																	? "bg-amber-100 border border-amber-300 text-amber-800"
																	: "bg-amber-950 border border-amber-800 text-amber-300"
																: m.status === "decreased"
																	? theme === "light"
																		? "bg-indigo-100 border border-indigo-300 text-indigo-800"
																		: "bg-indigo-950 border border-indigo-800 text-indigo-300"
																	: theme === "light"
																		? "bg-slate-100 border border-slate-200 text-slate-500"
																		: "bg-slate-900 border border-slate-800 text-slate-500"
													}`}
												>
													{m.status === "normal"
														? "Норма"
														: m.status === "increased"
															? "Выше"
															: m.status === "decreased"
																? "Ниже"
																: "Ожидание"}
												</span>
											</div>
										</div>

										<div
											className={`flex items-center justify-between text-[11px] ${
												theme === "light" ? "text-slate-500" : "text-slate-400"
											}`}
										>
											<span>Норматив: {m.normText}</span>
											<span className="font-mono">{m.method}</span>
										</div>

										{m.clinicalInterpretation && (
											<p
												className={`text-[11px] leading-snug m-0 pt-1 border-t ${
													theme === "light"
														? "text-slate-700 border-slate-200"
														: "text-slate-300 border-slate-700/60"
												}`}
											>
												{m.clinicalInterpretation}
											</p>
										)}
									</div>
								))}
							</div>
						</div>
					)}

					{/* Tab 3: Formal Protocol Form 043/y */}
					{activeTab === "report" && (
						<div
							className={`flex-1 flex flex-col overflow-y-auto p-4 space-y-3 ${
								theme === "light" ? "bg-white" : ""
							}`}
						>
							<div className="flex items-center justify-between">
								<span
									className={`text-xs font-bold uppercase tracking-wide ${
										theme === "light" ? "text-slate-800" : "text-slate-300"
									}`}
								>
									Заключение (Медицинская карта)
								</span>
								<button
									type="button"
									onClick={onCopyProtocol}
									className={`h-7 px-2.5 rounded border text-[11px] font-semibold flex items-center gap-1 transition-colors cursor-pointer ${
										theme === "light"
											? "bg-slate-100 hover:bg-slate-200 border-slate-200 text-slate-700"
											: "bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-300 hover:text-white"
									}`}
								>
									{copiedProtocol ? (
										<Check size={12} className="text-emerald-500" />
									) : (
										<Copy size={12} />
									)}
									<span>{copiedProtocol ? "Скопировано" : "Копировать"}</span>
								</button>
							</div>

							<textarea
								readOnly
								value={analysis.diagnosis.protocol043Text}
								data-testid="ceph-report-textarea"
								className={`w-full flex-1 min-h-[360px] p-3.5 rounded-xl font-mono text-xs leading-relaxed resize-none focus:outline-none border ${
									theme === "light"
										? "bg-slate-50 border-slate-200 text-slate-800 focus:border-teal-600"
										: "bg-slate-950 border-slate-800 text-slate-300 focus:border-teal-500"
								}`}
							/>
						</div>
					)}
				</div>
			)}
		</aside>
	);
};
