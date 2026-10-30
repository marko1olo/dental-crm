/**
 * @dental/web/components/orthodontics/workspaceModal/OrthoCephAnalysisTab.tsx
 * Вкладка 2D-цефалометрического анализа ТРГ (16 анатомических ориентиров, углы Штейнера, скелетный класс).
 * Мгновенный математический расчет без задержек и фейков (Мандаты 8b, 8ap, 8zk).
 */

import React, { useState, useCallback } from "react";
import {
	type CephLandmark16Key,
	type CephPoint2D,
	computeCephalometricMetrics,
} from "../orthoCatalogData";

export interface OrthoCephAnalysisTabProps {
	cephPoints: Record<CephLandmark16Key, CephPoint2D>;
	onChangePoints: (points: Record<CephLandmark16Key, CephPoint2D>) => void;
	cephMetrics: ReturnType<typeof computeCephalometricMetrics>;
}

export const OrthoCephAnalysisTab: React.FC<OrthoCephAnalysisTabProps> = ({
	cephPoints,
	onChangePoints,
	cephMetrics,
}) => {
	const [activeDraggingKey, setActiveDraggingKey] = useState<CephLandmark16Key | null>(null);

	// Перетаскивание точек ориентиров на SVG-холсте
	const handleSvgMouseMove = useCallback(
		(e: React.MouseEvent<SVGSVGElement>) => {
			if (!activeDraggingKey) return;
			const rect = e.currentTarget.getBoundingClientRect();
			const x = Math.round(((e.clientX - rect.left) / rect.width) * 800);
			const y = Math.round(((e.clientY - rect.top) / rect.height) * 700);
			onChangePoints({
				...cephPoints,
				[activeDraggingKey]: {
					x: Math.max(20, Math.min(780, x)),
					y: Math.max(20, Math.min(680, y)),
				},
			});
		},
		[activeDraggingKey, cephPoints, onChangePoints],
	);

	const handleSvgMouseUp = useCallback(() => {
		setActiveDraggingKey(null);
	}, []);

	const snDistancePx = Math.round(
		Math.hypot(cephPoints.N.x - cephPoints.S.x, cephPoints.N.y - cephPoints.S.y),
	);

	return (
		<div className="grid grid-cols-1 lg:grid-cols-12 gap-5 animate-in fade-in duration-150">
			{/* Левая колонка: интерактивный векторный холст ТРГ */}
			<div className="lg:col-span-8 flex flex-col gap-2">
				<div className="relative w-full aspect-[8/7] bg-[#0f172a] rounded-xl overflow-hidden border border-[var(--line)] shadow-inner">
					<svg
						viewBox="0 0 800 700"
						className="w-full h-full cursor-crosshair select-none"
						onMouseMove={handleSvgMouseMove}
						onMouseUp={handleSvgMouseUp}
						onMouseLeave={handleSvgMouseUp}
					>
						{/* Декоративная анатомическая координатная сетка */}
						<defs>
							<pattern id="ceph-grid" width="40" height="40" patternUnits="userSpaceOnUse">
								<path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="1" />
							</pattern>
						</defs>
						<rect width="800" height="700" fill="url(#ceph-grid)" />

						{/* Анатомический контур профиля лица и черепа */}
						<path
							d="M 330 180 Q 420 130 540 160 T 590 195 Q 610 240 600 280 T 630 330 Q 610 340 590 350 T 605 390 Q 575 410 565 440 T 575 510 Q 560 550 535 570 T 350 470 Q 320 370 330 180 Z"
							fill="none"
							stroke="rgba(56, 189, 248, 0.25)"
							strokeWidth="2"
							strokeDasharray="4 4"
						/>

						{/* Линии цефалометрического скелета */}
						<line
							x1={cephPoints.S.x}
							y1={cephPoints.S.y}
							x2={cephPoints.N.x}
							y2={cephPoints.N.y}
							stroke="#38bdf8"
							strokeWidth="2"
						/>
						<line
							x1={cephPoints.N.x}
							y1={cephPoints.N.y}
							x2={cephPoints.A.x}
							y2={cephPoints.A.y}
							stroke="#f43f5e"
							strokeWidth="1.5"
						/>
						<line
							x1={cephPoints.N.x}
							y1={cephPoints.N.y}
							x2={cephPoints.B.x}
							y2={cephPoints.B.y}
							stroke="#10b981"
							strokeWidth="1.5"
						/>
						<line
							x1={cephPoints.Go.x}
							y1={cephPoints.Go.y}
							x2={cephPoints.Me.x}
							y2={cephPoints.Me.y}
							stroke="#eab308"
							strokeWidth="2"
						/>
						<line
							x1={cephPoints.Is.x}
							y1={cephPoints.Is.y}
							x2={cephPoints.U1.x}
							y2={cephPoints.U1.y}
							stroke="#a855f7"
							strokeWidth="2"
						/>
						<line
							x1={cephPoints.Ii.x}
							y1={cephPoints.Ii.y}
							x2={cephPoints.L1.x}
							y2={cephPoints.L1.y}
							stroke="#ec4899"
							strokeWidth="2"
						/>

						{/* 16 интерактивных анатомических ориентиров */}
						{(Object.keys(cephPoints) as CephLandmark16Key[]).map((k) => {
							const pt = cephPoints[k];
							const isDragging = activeDraggingKey === k;
							return (
								<g
									key={k}
									transform={`translate(${pt.x}, ${pt.y})`}
									onMouseDown={() => setActiveDraggingKey(k)}
									className="cursor-pointer"
								>
									<circle
										r={isDragging ? 10 : 6}
										fill={isDragging ? "#f59e0b" : "#0d9488"}
										stroke="#ffffff"
										strokeWidth="2"
										className="transition-all"
									/>
									<text
										x="9"
										y="4"
										fill="#ffffff"
										fontSize="11"
										fontWeight="bold"
										filter="drop-shadow(0 1px 2px rgba(0,0,0,0.8))"
									>
										{k}
									</text>
								</g>
							);
						})}
					</svg>
				</div>
				<p className="text-xs text-[var(--muted)] flex items-center justify-between">
					<span>Перетаскивайте 16 точек мышкой для ручной юстировки геометрии</span>
					<span className="font-mono text-[#0d9488]">S-N: {snDistancePx} px</span>
				</p>
			</div>

			{/* Правая колонка: параметры Штейнера и диагноз */}
			<div className="lg:col-span-4 flex flex-col gap-3">
				<div className="p-4 rounded-xl border border-[var(--line)] bg-[var(--paper-soft)]">
					<h4 className="text-xs font-bold uppercase tracking-wider text-[var(--muted)] mb-3">
						Скелетные параметры Штейнера
					</h4>
					<div className="flex flex-col gap-2.5">
						<div className="flex items-center justify-between p-2 rounded-lg bg-[var(--paper)] border border-[var(--line)]">
							<span className="text-xs font-medium">Угол SNA (ВЧ к основанию)</span>
							<span className="text-xs font-mono font-bold text-[var(--ink)]">
								{cephMetrics.sna}° <span className="text-[10px] text-[var(--muted)] font-normal">(82±2°)</span>
							</span>
						</div>
						<div className="flex items-center justify-between p-2 rounded-lg bg-[var(--paper)] border border-[var(--line)]">
							<span className="text-xs font-medium">Угол SNB (НЧ к основанию)</span>
							<span className="text-xs font-mono font-bold text-[var(--ink)]">
								{cephMetrics.snb}° <span className="text-[10px] text-[var(--muted)] font-normal">(80±2°)</span>
							</span>
						</div>
						<div className="flex items-center justify-between p-2 rounded-lg bg-[var(--paper)] border border-[#0d9488]/40">
							<span className="text-xs font-bold text-[#0d9488]">Угол ANB (Сагитталь)</span>
							<span className="text-sm font-mono font-bold text-[#0d9488]">
								{cephMetrics.anb}° <span className="text-[10px] text-[var(--muted)] font-normal">(2±2°)</span>
							</span>
						</div>
						<div className="flex items-center justify-between p-2 rounded-lg bg-[var(--paper)] border border-[var(--line)]">
							<span className="text-xs font-medium">Межрезцовый угол (U1/L1)</span>
							<span className="text-xs font-mono font-bold text-[var(--ink)]">
								{cephMetrics.interincisalAngle}°{" "}
								<span className="text-[10px] text-[var(--muted)] font-normal">(131°)</span>
							</span>
						</div>
						<div className="flex items-center justify-between p-2 rounded-lg bg-[var(--paper)] border border-[var(--line)]">
							<span className="text-xs font-medium">Wits число</span>
							<span className="text-xs font-mono font-bold text-[var(--ink)]">{cephMetrics.witsMm} мм</span>
						</div>
					</div>
				</div>

				<div className="p-4 rounded-xl border border-[var(--line)] bg-[var(--paper-soft)]">
					<div className="text-xs font-bold uppercase tracking-wider text-[var(--muted)] mb-1">
						Клинический диагноз ТРГ
					</div>
					<div className="text-sm font-bold text-[var(--ink)] mb-1">{cephMetrics.skeletalClassLabelRu}</div>
					<div className="text-xs text-[var(--muted)] leading-relaxed">
						{cephMetrics.growthDirectionRu}. {cephMetrics.recommendationRu}
					</div>
				</div>
			</div>
		</div>
	);
};

export default OrthoCephAnalysisTab;
