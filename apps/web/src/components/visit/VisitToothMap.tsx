import React from "react";
import { useAppLogicContext } from "../../contexts/AppLogicContext";
import { getToothConfig, getToothPath } from "../../utils/toothGeometry";

export interface VisitToothMapProps {
	activeStamp: "planned" | "treatment" | "watch" | "done" | "missing" | null;
	setActiveStamp: (
		stamp: "planned" | "treatment" | "watch" | "done" | "missing" | null,
	) => void;
	activeQuadrant: number | null;
	setActiveQuadrant: (q: number | null) => void;
	pediatricMode: boolean;
	onToothClick?: (code: string, state: string) => void;
}

export function VisitToothMap({
	activeStamp,
	setActiveStamp,
	activeQuadrant,
	setActiveQuadrant,
	pediatricMode,
	onToothClick,
}: VisitToothMapProps) {
	const appLogic = useAppLogicContext();
	const {
		toothRows,
		toothStateByCode,
		visitDraft: draft,
		setToothState,
	} = appLogic;
	const handleToothClick = (code: string, state: string) => {
		if (onToothClick) {
			onToothClick(code, state);
		} else {
			setToothState(Number(code), state);
		}
	};
	return (
		<div className="tooth-map" aria-label="Зубная карта">
			<div className="tooth-map-head">
				<div>
					<h3>Зубная карта</h3>
					<p>
						Нажмите зуб для смены статуса. ИИ подсвечивает зубы из диктовки.
					</p>
				</div>
				<span className="tooth-fdi-badge">FDI</span>
			</div>
			<div className="tooth-map-legend">
				<span className="tooth-legend-item legend-planned">В плане</span>
				<span className="tooth-legend-item legend-treatment">Лечение</span>
				<span className="tooth-legend-item legend-watch">Наблюдение</span>
				<span className="tooth-legend-item legend-done">Готово</span>
				<span className="tooth-legend-item legend-missing">Нет зуба</span>
			</div>

			{/* Панель быстрого штампа статуса зуба (Quick Stamp) */}
			<div
				className="tooth-stamp-bar"
				role="toolbar"
				aria-label="Инструменты быстрого штампа"
			>
				<span className="stamp-bar-title">Быстрый штамп:</span>
				<button
					type="button"
					className={`stamp-btn ${activeStamp === null ? "active" : ""}`}
					onClick={() => setActiveStamp(null)}
				>
					🔍 Обычный клик
				</button>
				<button
					type="button"
					className={`stamp-btn stamp-planned ${activeStamp === "planned" ? "active" : ""}`}
					onClick={() => setActiveStamp("planned")}
				>
					📝 В план
				</button>
				<button
					type="button"
					className={`stamp-btn stamp-treatment ${activeStamp === "treatment" ? "active" : ""}`}
					onClick={() => setActiveStamp("treatment")}
				>
					🔴 Лечение
				</button>
				<button
					type="button"
					className={`stamp-btn stamp-watch ${activeStamp === "watch" ? "active" : ""}`}
					onClick={() => setActiveStamp("watch")}
				>
					⚠️ Наблюдение
				</button>
				<button
					type="button"
					className={`stamp-btn stamp-done ${activeStamp === "done" ? "active" : ""}`}
					onClick={() => setActiveStamp("done")}
				>
					🟢 Готово
				</button>
				<button
					type="button"
					className={`stamp-btn stamp-missing ${activeStamp === "missing" ? "active" : ""}`}
					onClick={() => setActiveStamp("missing")}
				>
					❌ Нет зуба
				</button>
			</div>

			{/* Панель выбора квадранта (Focus Mode) */}
			<div
				className="tooth-quadrant-nav"
				role="navigation"
				aria-label="Фокус на квадрант"
			>
				<button
					type="button"
					className={`quadrant-nav-btn ${activeQuadrant === null ? "active" : ""}`}
					onClick={() => setActiveQuadrant(null)}
				>
					Вся челюсть
				</button>
				<button
					type="button"
					className={`quadrant-nav-btn ${activeQuadrant === 2 ? "active" : ""}`}
					onClick={() => setActiveQuadrant(2)}
				>
					ВЧ Лево (Q2)
				</button>
				<button
					type="button"
					className={`quadrant-nav-btn ${activeQuadrant === 1 ? "active" : ""}`}
					onClick={() => setActiveQuadrant(1)}
				>
					ВЧ Право (Q1)
				</button>
				<button
					type="button"
					className={`quadrant-nav-btn ${activeQuadrant === 3 ? "active" : ""}`}
					onClick={() => setActiveQuadrant(3)}
				>
					НЧ Лево (Q3)
				</button>
				<button
					type="button"
					className={`quadrant-nav-btn ${activeQuadrant === 4 ? "active" : ""}`}
					onClick={() => setActiveQuadrant(4)}
				>
					НЧ Право (Q4)
				</button>
			</div>

			{/* Зубная схема с квадрантами */}
			<div
				className={`tooth-arch-wrapper ${activeQuadrant !== null ? "zoom-active" : ""}`}
			>
				{/* Метки квадрантов — верх */}
				{activeQuadrant === null && (
					<div className="tooth-quadrant-labels upper-labels">
						<span className="quadrant-label">Q1</span>
						<span className="quadrant-label">Q2</span>
					</div>
				)}

				{/* Верхняя челюсть */}
				{(activeQuadrant === null ||
					activeQuadrant === 1 ||
					activeQuadrant === 2) && (
					<div className="tooth-jaw upper-jaw">
						{/* Правая половина верхней: Q1 — 18→11 */}
						{(activeQuadrant === null || activeQuadrant === 1) && (
							<div className="tooth-half tooth-row">
								{(toothRows[0] || []).slice(0, 8).map((code) => {
									const state = toothStateByCode[code] ?? "idle";
									const geom = getToothPath(Number(code));
									const cfg = getToothConfig(Number(code));
									const num = Number(code);
									const isDetected = (
										draft?.quality?.detectedToothCodes || []
									).includes(code);
									const isRightSide =
										(num >= 21 && num <= 28) || (num >= 31 && num <= 38);
									const transform = `scaleX(${isRightSide ? -1 : 1})`;

									return (
										<button
											key={code}
											type="button"
											className={`tooth tooth-${state}${state !== "idle" ? " selected" : ""}${isDetected ? " tooth-ai-detected" : ""}`}
											onClick={() => handleToothClick(code, state)}
											aria-label={`Зуб ${code}`}
										>
											<div
												className="tooth-svg-wrap"
												style={{
													filter: isDetected
														? "drop-shadow(0 0 4px #3b82f6)"
														: "none",
												}}
											>
												<svg
													width={cfg.width}
													height={cfg.height}
													viewBox={`${cfg.viewX ?? 0} 0 ${cfg.viewWidth} ${cfg.viewHeight}`}
													preserveAspectRatio="none"
													style={{ transform }}
													fill="none"
												>
													{state === "missing" ? (
														<g>
															<path
																d={geom.root}
																fill="#f1f5f9"
																stroke="#cbd5e1"
																strokeWidth="1.2"
																opacity="0.15"
															/>
															<path
																d={geom.crown}
																fill="#f1f5f9"
																stroke="#cbd5e1"
																strokeWidth="1.2"
																opacity="0.15"
															/>
															<path
																d="M20 20L80 130M80 20L20 130"
																stroke="#ef4444"
																strokeWidth="5"
																strokeLinecap="round"
																opacity="0.7"
															/>
														</g>
													) : (
														<g>
															<path d={geom.root} className="tooth-root"
																strokeWidth="1.5"
																strokeLinejoin="round"
															/>
															{geom.canals &&
																(state === "treatment" || state === "done") && (
																	<path
																		d={geom.canals}
																		fill="none"
																		stroke={
																			state === "done" ? "#ec4899" : "#dc2626"
																		}
																		strokeWidth="2.5"
																		strokeLinecap="round"
																		opacity="0.85"
																	/>
																)}
															<path d={geom.crown} className="tooth-crown"
																strokeWidth="2.2"
																strokeLinejoin="round"
															/>
															{geom.fissures && (
																<path
																	d={geom.fissures}
																	fill="none"
																	stroke="rgba(0,0,0,0.15)"
																	strokeWidth="0.8"
																/>
															)}
														</g>
													)}
												</svg>
											</div>
											<span className="tooth-code">{code}</span>
										</button>
									);
								})}
							</div>
						)}
						{/* Центральная линия */}
						{activeQuadrant === null && (
							<div className="tooth-center-line" aria-hidden="true" />
						)}
						{/* Левая половина верхней: Q2 — 21→28 */}
						{(activeQuadrant === null || activeQuadrant === 2) && (
							<div className="tooth-half tooth-row">
								{(toothRows[0] || []).slice(8).map((code) => {
									const state = toothStateByCode[code] ?? "idle";
									const geom = getToothPath(Number(code));
									const cfg = getToothConfig(Number(code));
									const num = Number(code);
									const isDetected = (
										draft?.quality?.detectedToothCodes || []
									).includes(code);
									const isRightSide =
										(num >= 21 && num <= 28) || (num >= 31 && num <= 38);
									const transform = `scaleX(${isRightSide ? -1 : 1})`;

									return (
										<button
											key={code}
											type="button"
											className={`tooth tooth-${state}${state !== "idle" ? " selected" : ""}${isDetected ? " tooth-ai-detected" : ""}`}
											onClick={() => handleToothClick(code, state)}
											aria-label={`Зуб ${code}`}
										>
											<div
												className="tooth-svg-wrap"
												style={{
													filter: isDetected
														? "drop-shadow(0 0 4px #3b82f6)"
														: "none",
												}}
											>
												<svg
													width={cfg.width}
													height={cfg.height}
													viewBox={`${cfg.viewX ?? 0} 0 ${cfg.viewWidth} ${cfg.viewHeight}`}
													preserveAspectRatio="none"
													style={{ transform }}
													fill="none"
												>
													{state === "missing" ? (
														<g>
															<path
																d={geom.root}
																fill="#f1f5f9"
																stroke="#cbd5e1"
																strokeWidth="1.2"
																opacity="0.15"
															/>
															<path
																d={geom.crown}
																fill="#f1f5f9"
																stroke="#cbd5e1"
																strokeWidth="1.2"
																opacity="0.15"
															/>
															<path
																d="M20 20L80 130M80 20L20 130"
																stroke="#ef4444"
																strokeWidth="5"
																strokeLinecap="round"
																opacity="0.7"
															/>
														</g>
													) : (
														<g>
															<path d={geom.root} className="tooth-root"
																strokeWidth="1.5"
																strokeLinejoin="round"
															/>
															{geom.canals &&
																(state === "treatment" || state === "done") && (
																	<path
																		d={geom.canals}
																		fill="none"
																		stroke={
																			state === "done" ? "#ec4899" : "#dc2626"
																		}
																		strokeWidth="2.5"
																		strokeLinecap="round"
																		opacity="0.85"
																	/>
																)}
															<path d={geom.crown} className="tooth-crown"
																strokeWidth="2.2"
																strokeLinejoin="round"
															/>
															{geom.fissures && (
																<path
																	d={geom.fissures}
																	fill="none"
																	stroke="rgba(0,0,0,0.15)"
																	strokeWidth="0.8"
																/>
															)}
														</g>
													)}
												</svg>
											</div>
											<span className="tooth-code">{code}</span>
										</button>
									);
								})}
							</div>
						)}
					</div>
				)}

				{/* Линия окклюзии */}
				{activeQuadrant === null && (
					<div className="tooth-occlusion-line" aria-hidden="true">
						<span>— окклюзия —</span>
					</div>
				)}

				{/* Нижняя челюсть */}
				{(activeQuadrant === null ||
					activeQuadrant === 3 ||
					activeQuadrant === 4) && (
					<div className="tooth-jaw lower-jaw">
						{/* Правая нижняя Q4 — 48→41 */}
						{(activeQuadrant === null || activeQuadrant === 4) && (
							<div className="tooth-half tooth-row">
								{(toothRows[1] || []).slice(0, 8).map((code) => {
									const state = toothStateByCode[code] ?? "idle";
									const geom = getToothPath(Number(code));
									const cfg = getToothConfig(Number(code));
									const num = Number(code);
									const isDetected = (
										draft?.quality?.detectedToothCodes || []
									).includes(code);
									const isRightSide =
										(num >= 21 && num <= 28) || (num >= 31 && num <= 38);
									const transform = `scaleX(${isRightSide ? -1 : 1})`;

									return (
										<button
											key={code}
											type="button"
											className={`tooth tooth-${state}${state !== "idle" ? " selected" : ""}${isDetected ? " tooth-ai-detected" : ""} tooth-lower`}
											onClick={() => handleToothClick(code, state)}
											aria-label={`Зуб ${code}`}
										>
											<span className="tooth-code">{code}</span>
											<div
												className="tooth-svg-wrap"
												style={{
													filter: isDetected
														? "drop-shadow(0 0 4px #3b82f6)"
														: "none",
													transform: "none",
												}}
											>
												<svg
													width={cfg.width}
													height={cfg.height}
													viewBox={`${cfg.viewX ?? 0} 0 ${cfg.viewWidth} ${cfg.viewHeight}`}
													preserveAspectRatio="none"
													style={{ transform }}
													fill="none"
												>
													{state === "missing" ? (
														<g>
															<path
																d={geom.root}
																fill="#f1f5f9"
																stroke="#cbd5e1"
																strokeWidth="1.2"
																opacity="0.15"
															/>
															<path
																d={geom.crown}
																fill="#f1f5f9"
																stroke="#cbd5e1"
																strokeWidth="1.2"
																opacity="0.15"
															/>
															<path
																d="M20 20L80 130M80 20L20 130"
																stroke="#ef4444"
																strokeWidth="5"
																strokeLinecap="round"
																opacity="0.7"
															/>
														</g>
													) : (
														<g>
															<path d={geom.root} className="tooth-root"
																strokeWidth="1.5"
																strokeLinejoin="round"
															/>
															{geom.canals &&
																(state === "treatment" || state === "done") && (
																	<path
																		d={geom.canals}
																		fill="none"
																		stroke={
																			state === "done" ? "#ec4899" : "#dc2626"
																		}
																		strokeWidth="2.5"
																		strokeLinecap="round"
																		opacity="0.85"
																	/>
																)}
															<path d={geom.crown} className="tooth-crown"
																strokeWidth="2.2"
																strokeLinejoin="round"
															/>
															{geom.fissures && (
																<path
																	d={geom.fissures}
																	fill="none"
																	stroke="rgba(0,0,0,0.15)"
																	strokeWidth="0.8"
																/>
															)}
														</g>
													)}
												</svg>
											</div>
										</button>
									);
								})}
							</div>
						)}
						{/* Центральная линия нижней */}
						{activeQuadrant === null && (
							<div className="tooth-center-line" aria-hidden="true" />
						)}
						{/* Левая нижняя Q3 — 31→38 */}
						{(activeQuadrant === null || activeQuadrant === 3) && (
							<div className="tooth-half tooth-row">
								{(toothRows[1] || []).slice(8).map((code) => {
									const state = toothStateByCode[code] ?? "idle";
									const geom = getToothPath(Number(code));
									const cfg = getToothConfig(Number(code));
									const num = Number(code);
									const isDetected = (
										draft?.quality?.detectedToothCodes || []
									).includes(code);
									const isRightSide =
										(num >= 21 && num <= 28) || (num >= 31 && num <= 38);
									const transform = `scaleX(${isRightSide ? -1 : 1})`;

									return (
										<button
											key={code}
											type="button"
											className={`tooth tooth-${state}${state !== "idle" ? " selected" : ""}${isDetected ? " tooth-ai-detected" : ""} tooth-lower`}
											onClick={() => handleToothClick(code, state)}
											aria-label={`Зуб ${code}`}
										>
											<span className="tooth-code">{code}</span>
											<div
												className="tooth-svg-wrap"
												style={{
													filter: isDetected
														? "drop-shadow(0 0 4px #3b82f6)"
														: "none",
													transform: "none",
												}}
											>
												<svg
													width={cfg.width}
													height={cfg.height}
													viewBox={`${cfg.viewX ?? 0} 0 ${cfg.viewWidth} ${cfg.viewHeight}`}
													preserveAspectRatio="none"
													style={{ transform }}
													fill="none"
												>
													{state === "missing" ? (
														<g>
															<path
																d={geom.root}
																fill="#f1f5f9"
																stroke="#cbd5e1"
																strokeWidth="1.2"
																opacity="0.15"
															/>
															<path
																d={geom.crown}
																fill="#f1f5f9"
																stroke="#cbd5e1"
																strokeWidth="1.2"
																opacity="0.15"
															/>
															<path
																d="M20 20L80 130M80 20L20 130"
																stroke="#ef4444"
																strokeWidth="5"
																strokeLinecap="round"
																opacity="0.7"
															/>
														</g>
													) : (
														<g>
															<path d={geom.root} className="tooth-root"
																strokeWidth="1.5"
																strokeLinejoin="round"
															/>
															{geom.canals &&
																(state === "treatment" || state === "done") && (
																	<path
																		d={geom.canals}
																		fill="none"
																		stroke={
																			state === "done" ? "#ec4899" : "#dc2626"
																		}
																		strokeWidth="2.5"
																		strokeLinecap="round"
																		opacity="0.85"
																	/>
																)}
															<path d={geom.crown} className="tooth-crown"
																strokeWidth="2.2"
																strokeLinejoin="round"
															/>
															{geom.fissures && (
																<path
																	d={geom.fissures}
																	fill="none"
																	stroke="rgba(0,0,0,0.15)"
																	strokeWidth="0.8"
																/>
															)}
														</g>
													)}
												</svg>
											</div>
										</button>
									);
								})}
							</div>
						)}
					</div>
				)}

				{/* Метки квадрантов — низ */}
				{activeQuadrant === null && (
					<div className="tooth-quadrant-labels lower-labels">
						<span className="quadrant-label">Q4</span>
						<span className="quadrant-label">Q3</span>
					</div>
				)}
			</div>
		</div>
	);
}
