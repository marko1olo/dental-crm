/**
 * PerioProfileStrip.tsx — Анатомический профиль пародонтальных карманов (SVG)
 *
 * Отрисовывает:
 * - Миллиметровую сетку 0..15 мм (шаг 1 мм, жирные линии 0, 5, 10, 15 мм)
 * - Анатомические силуэты зубов (11..48) с идеальной привязкой CEJ к 0 мм
 * - Линию десневого края GM (calm sky blue)
 * - Линию дна карманов PD (calm danger red)
 * - Полупрозрачный объем кармана bandPath (var(--danger) с альфой 0.25)
 * - Специфичный рендеринг для имплантатов (титановая резьба) и отсутствующих зубов
 * - Высота 120-140px (по умолчанию 130px), фиксированные габариты, нулевой сдвиг макета (Zero CLS).
 */

import React, { useId, useMemo } from "react";
import type { PerioToothRecord } from "@dental/shared";
import {
	calculatePerioProfilePolylines,
	getToothLateralGeometry,
	getToothTransform,
	PERIO_DEFAULT_COLUMN_WIDTH,
	PERIO_DEFAULT_STRIP_HEIGHT,
	PERIO_MAX_PROBING_MM,
	type PerioArch,
	type PerioAspect,
	type PerioStripDirection,
} from "./perioProfileMath";
import { probingDepthHex } from "./perioHeatmap";

export interface PerioProfileStripProps {
	/** Массив зубов зубного ряда (16 зубов: 18..28 для верхней челюсти, 48..38 для нижней) */
	readonly teeth: readonly PerioToothRecord[];
	/** Челюсть: верхняя ('upper') или нижняя ('lower') */
	readonly arch?: PerioArch | undefined;
	/** Анатомическая поверхность: вестибулярная ('buccal') или оральная ('lingual') */
	readonly aspect?: PerioAspect | undefined;
	/** Явное направление роста глубины: 'depth-up' (вверх) или 'depth-down' (вниз) */
	readonly direction?: PerioStripDirection | undefined;
	/** Ширина колонки зуба в пикселях (по умолчанию 60px) */
	readonly columnWidth?: number | undefined;
	/** Высота компонента (строго в диапазоне 120..140px, по умолчанию 130px) */
	readonly height?: number | undefined;
	/** Отображать анатомические силуэты зубов (по умолчанию true) */
	readonly showSilhouettes?: boolean | undefined;
	/** Отображать миллиметровую сетку (по умолчанию true) */
	readonly showGrid?: boolean | undefined;
	/** Отображать подписи миллиметров (0, 5, 10, 15) на сетке (по умолчанию true) */
	readonly showLabels?: boolean | undefined;
	/** Номер выбранного зуба для подсветки колонки */
	readonly selectedToothNumber?: number | null | undefined;
	/** Callback клика по колонке зуба */
	readonly onToothClick?: ((toothNumber: number) => void) | undefined;
	/** Дополнительный CSS класс */
	readonly className?: string | undefined;
}

export const PerioProfileStrip: React.FC<PerioProfileStripProps> = ({
	teeth,
	arch,
	aspect = "buccal",
	direction,
	columnWidth = PERIO_DEFAULT_COLUMN_WIDTH,
	height = PERIO_DEFAULT_STRIP_HEIGHT,
	showSilhouettes = true,
	showGrid = true,
	showLabels = true,
	selectedToothNumber = null,
	onToothClick,
	className = "",
}) => {
	const stripId = useId();

	// Ограничиваем высоту компонента строгим бюджетом 120-140px для гарантии Zero CLS
	const clampedHeight = Math.max(120, Math.min(140, height));

	// Автоматическое определение челюсти по первому номеру зуба, если не передана явно
	const effectiveArch: PerioArch = useMemo(() => {
		if (arch) return arch;
		const firstToothNum = teeth[0]?.toothNumber ?? 11;
		return firstToothNum < 30 ? "upper" : "lower";
	}, [arch, teeth]);

	// Расчет геометрии и полилиний карманов
	const profile = useMemo(() => {
		return calculatePerioProfilePolylines(teeth, effectiveArch, aspect, {
			columnWidth,
			stripHeight: clampedHeight,
			maxMm: PERIO_MAX_PROBING_MM,
		});
	}, [teeth, effectiveArch, aspect, columnWidth, clampedHeight]);

	const effectiveDirection = direction ?? profile.direction;

	return (
		<div
			className={`perio-profile-strip-container relative w-full overflow-x-auto select-none rounded-md border border-[var(--line,#e2e8f0)] bg-[var(--paper,#ffffff)] ${className}`}
			style={{
				minHeight: `${clampedHeight}px`,
				height: `${clampedHeight}px`,
			}}
		>
			<svg
				viewBox={`0 0 ${profile.totalWidth} ${clampedHeight}`}
				width={profile.totalWidth}
				height={clampedHeight}
				className="perio-profile-strip-svg block"
				style={{
					minWidth: `${profile.totalWidth}px`,
					height: `${clampedHeight}px`,
					display: "block",
				}}
				preserveAspectRatio="none"
				aria-label="Профиль пародонтальных карманов"
				role="img"
			>
				<defs>
					{/* Градиент для подсветки активного выбранного зуба */}
					<linearGradient
						id={`perio-sel-${stripId}`}
						x1="0"
						y1="0"
						x2="0"
						y2="1"
					>
						<stop offset="0%" stopColor="var(--primary,#0284c7)" stopOpacity="0.12" />
						<stop offset="100%" stopColor="var(--primary,#0284c7)" stopOpacity="0.03" />
					</linearGradient>

					{/* Паттерн для штриховки отсутствующего зуба */}
					<pattern
						id={`perio-missing-${stripId}`}
						patternUnits="userSpaceOnUse"
						width="6"
						height="6"
						patternTransform="rotate(45)"
					>
						<line
							x1="0"
							y1="0"
							x2="0"
							y2="6"
							stroke="var(--line-strong,#94a3b8)"
							strokeWidth="0.8"
							strokeOpacity="0.4"
						/>
					</pattern>
				</defs>

				{/* ----------------------------------------------------------------- */}
				{/* 1. Миллиметровая сетка (0..15 мм)                                */}
				{/* ----------------------------------------------------------------- */}
				{showGrid && (
					<g className="perio-grid-layer" pointerEvents="none">
						{profile.gridlines.map((line) => (
							<g key={`grid-line-${line.mm}`}>
								<line
									x1={0}
									y1={line.y}
									x2={profile.totalWidth}
									y2={line.y}
									stroke={
										line.mm === 0
											? "var(--ink,#1e293b)"
											: line.isBold
												? "var(--line-strong,#94a3b8)"
												: "var(--line,#e2e8f0)"
									}
									strokeWidth={line.mm === 0 ? 1.4 : line.isBold ? 0.9 : 0.4}
									strokeDasharray={
										line.mm === 0 ? undefined : line.isBold ? undefined : "2 2"
									}
									strokeOpacity={line.mm === 0 ? 0.7 : line.isBold ? 0.5 : 0.35}
								/>
								{/* Подписи миллиметров по левому и правому краю */}
								{showLabels && line.isBold && (
									<>
										<text
											x={6}
											y={effectiveDirection === "depth-up" ? line.y - 2 : line.y + 9}
											fontSize={8}
											fontFamily="monospace"
											fill="var(--muted,#64748b)"
											textAnchor="start"
											fontWeight={line.mm === 0 ? "bold" : "normal"}
											opacity={0.85}
										>
											{line.label}
										</text>
										<text
											x={profile.totalWidth - 6}
											y={effectiveDirection === "depth-up" ? line.y - 2 : line.y + 9}
											fontSize={8}
											fontFamily="monospace"
											fill="var(--muted,#64748b)"
											textAnchor="end"
											fontWeight={line.mm === 0 ? "bold" : "normal"}
											opacity={0.85}
										>
											{line.label}
										</text>
									</>
								)}
							</g>
						))}
					</g>
				)}

				{/* ----------------------------------------------------------------- */}
				{/* 2. Колонки зубов и анатомические силуэты                          */}
				{/* ----------------------------------------------------------------- */}
				<g className="perio-teeth-layer">
					{teeth.map((tooth, ti) => {
						const toothLeftX = ti * columnWidth;
						const toothCenterX = toothLeftX + columnWidth / 2;
						const isSelected = selectedToothNumber === tooth.toothNumber;
						const geo = getToothLateralGeometry(tooth.toothNumber);
						const transform = getToothTransform(
							tooth.toothNumber,
							effectiveDirection,
							toothCenterX,
							profile.baselineY,
							0.74
						);

						return (
							<g
								key={`tooth-col-${tooth.toothNumber}`}
								className={`perio-tooth-column group ${isSelected ? "is-selected" : ""}`}
								onClick={() => onToothClick?.(tooth.toothNumber)}
								style={{ cursor: onToothClick ? "pointer" : "default" }}
							>
								{/* Фон активного выделенного зуба */}
								{isSelected && (
									<rect
										x={toothLeftX}
										y={0}
										width={columnWidth}
										height={clampedHeight}
										fill={`url(#perio-sel-${stripId})`}
										stroke="var(--primary,#0284c7)"
										strokeWidth={1}
										strokeOpacity={0.4}
									/>
								)}

								{/* Разделитель между зубами */}
								<line
									x1={toothLeftX}
									y1={0}
									x2={toothLeftX}
									y2={clampedHeight}
									stroke="var(--line,#e2e8f0)"
									strokeWidth={0.5}
									strokeOpacity={0.4}
								/>

								{/* Анатомический силуэт зуба */}
								{showSilhouettes && (
									<g
										className="perio-silhouette"
										style={{
											opacity: tooth.isMissing ? 0.25 : 0.85,
											transition: "opacity 0.15s ease",
										}}
									>
										{tooth.isMissing ? (
											/* Отсутствующий зуб: легкий контур и символ удаления */
											<g transform={transform}>
												<path
													d={geo.crown}
													fill="none"
													stroke="var(--line-strong,#94a3b8)"
													strokeWidth={1}
													strokeDasharray="2 2"
												/>
												{geo.roots.map((rPath, ri) => (
													<path
														key={`missing-root-${ri}`}
														d={rPath}
														fill="none"
														stroke="var(--line-strong,#94a3b8)"
														strokeWidth={1}
														strokeDasharray="2 2"
													/>
												))}
											</g>
										) : tooth.isImplant ? (
											/* Имплантат: анатомическая коронка + титановый винт */
											<g transform={transform}>
												{/* Коронка */}
												<path
													d={geo.crown}
													fill="var(--paper-soft,#f8fafc)"
													stroke="var(--ink,#1e293b)"
													strokeWidth={1.2}
													strokeLinejoin="round"
												/>
												{/* Тело имплантата с резьбой */}
												<g className="implant-screw">
													<path
														d={`M ${geo.vbWidth / 2 - 9} ${geo.gumLineY - 3} L ${geo.vbWidth / 2 + 9} ${geo.gumLineY - 3} L ${geo.vbWidth / 2 + 6} 12 L ${geo.vbWidth / 2 - 6} 12 Z`}
														fill="var(--paper-strong,#f1f5f9)"
														stroke="var(--primary,#0284c7)"
														strokeWidth={1.4}
													/>
													{/* Витки резьбы */}
													{[20, 32, 44, 56, 68, 80].map((ry) => (
														<line
															key={`thread-${ry}`}
															x1={geo.vbWidth / 2 - 8}
															y1={ry}
															x2={geo.vbWidth / 2 + 8}
															y2={ry}
															stroke="var(--primary,#0284c7)"
															strokeWidth={1.2}
														/>
													))}
												</g>
											</g>
										) : (
											/* Естественный интактный зуб */
											<g transform={transform}>
												{/* Корни (задний слой) */}
												{geo.roots.map((rootPath, ri) => (
													<path
														key={`root-${ri}`}
														d={rootPath}
														fill="var(--paper-strong,#f1f5f9)"
														stroke="var(--ink,#334155)"
														strokeWidth={1.2}
														strokeLinejoin="round"
													/>
												))}
												{/* Коронка */}
												<path
													d={geo.crown}
													fill="var(--paper,#ffffff)"
													stroke="var(--ink,#334155)"
													strokeWidth={1.3}
													strokeLinejoin="round"
												/>
												{/* Линия эмалево-цементной границы (CEJ) */}
												<path
													d={geo.gumLine}
													fill="none"
													stroke="var(--line-strong,#64748b)"
													strokeWidth={0.8}
													strokeOpacity={0.6}
												/>
											</g>
										)}
									</g>
								)}

								{/* Номер зуба (FDI) в нижней/верхней зоне колонки */}
								<text
									x={toothCenterX}
									y={effectiveDirection === "depth-up" ? clampedHeight - 6 : 13}
									fontSize={10}
									fontWeight="600"
									fontFamily="monospace"
									textAnchor="middle"
									fill={
										isSelected
											? "var(--primary,#0284c7)"
											: tooth.isMissing
												? "var(--muted,#94a3b8)"
												: "var(--ink,#1e293b)"
									}
									pointerEvents="none"
								>
									{tooth.toothNumber}
								</text>
							</g>
						);
					})}
				</g>

				{/* ----------------------------------------------------------------- */}
				{/* 3. Полупрозрачный объем карманов (bandPath)                      */}
				{/* ----------------------------------------------------------------- */}
				{profile.bandPath && (
					<path
						d={profile.bandPath}
						fill="var(--danger,#ef4444)"
						fillOpacity={0.25}
						stroke="none"
						className="perio-pocket-band"
						pointerEvents="none"
					/>
				)}

				{/* ----------------------------------------------------------------- */}
				{/* 4. Линия десневого края (GM — синяя линия)                       */}
				{/* ----------------------------------------------------------------- */}
				{profile.gmPath && (
					<path
						d={profile.gmPath}
						fill="none"
						stroke="var(--primary,#0284c7)"
						strokeWidth={1.8}
						strokeLinecap="round"
						strokeLinejoin="round"
						className="perio-gm-line"
						pointerEvents="none"
					/>
				)}

				{/* ----------------------------------------------------------------- */}
				{/* 5. Линия дна карманов (PD / CAL — красная линия)                 */}
				{/* ----------------------------------------------------------------- */}
				{profile.pdPath && (
					<path
						d={profile.pdPath}
						fill="none"
						stroke="var(--danger,#ef4444)"
						strokeWidth={2.0}
						strokeLinecap="round"
						strokeLinejoin="round"
						className="perio-pd-line"
						pointerEvents="none"
					/>
				)}

				{/* ----------------------------------------------------------------- */}
				{/* 6. Точечные маркеры патологических карманов (>= 4 мм и BOP)      */}
				{/* ----------------------------------------------------------------- */}
				<g className="perio-points-layer" pointerEvents="none">
					{teeth.map((tooth, ti) => {
						if (tooth.isMissing) return null;
						const sites = ["distoBuccal", "midBuccal", "mesioBuccal"] as const;

						return (
							<g key={`markers-${tooth.toothNumber}`}>
								{[0, 1, 2].map((si) => {
									const siteMeasurement = tooth[sites[si]!];
									if (!siteMeasurement) return null;

									const pd = siteMeasurement.probingDepthMm ?? 0;
									const gm = siteMeasurement.gingivalMarginMm ?? 0;
									const hasBop = siteMeasurement.bleedingOnProbing;
									if (pd === 0 && !hasBop && gm === 0) return null;

									const x = ti * columnWidth + columnWidth * (si === 0 ? 0.2 : si === 1 ? 0.5 : 0.8);
									const offset = (gm + pd) * profile.mmScale;
									const y = effectiveDirection === "depth-up"
										? profile.baselineY - offset
										: profile.baselineY + offset;

									return (
										<g key={`point-${tooth.toothNumber}-${si}`}>
											{/* Точка дна кармана */}
											<circle
												cx={x}
												cy={y}
												r={pd >= 5 ? 3 : 2}
												fill={probingDepthHex(pd)}
												stroke="var(--paper,#ffffff)"
												strokeWidth={1}
											/>
											{/* Индикатор кровоточивости (BOP) */}
											{hasBop && (
												<circle
													cx={x}
													cy={
														effectiveDirection === "depth-up"
															? profile.baselineY - gm * profile.mmScale + 4
															: profile.baselineY + gm * profile.mmScale - 4
													}
													r={2.5}
													fill="var(--danger,#ef4444)"
													stroke="var(--paper,#ffffff)"
													strokeWidth={0.8}
												/>
											)}
										</g>
									);
								})}
							</g>
						);
					})}
				</g>
			</svg>
		</div>
	);
};
