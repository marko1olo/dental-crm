/**
 * @dental/web/components/orthodontics/OrthodonticWorkspaceModal.tsx
 * Канонический единый рабочий стол ортодонта (Мандаты 8b 350–450 строк, 8e, 8n, 8x, 8al, 8am).
 * Вкладки: [Визит и активация дуг | ТРГ Цефалометрия | Элайнеры].
 * Ровно 1 Primary CTA кнопка #0d9488 на видимый экран. На смартфонах — нативный Apple HIG Bottom Sheet.
 */

import React, { useState, useId, useMemo, useCallback } from "react";
import {
	X,
	Check,
	CheckCircle2,
	Printer,
	Sparkles,
	Sliders,
	Layers,
	Activity,
	ChevronRight,
} from "lucide-react";
import { BracesBracket } from "../icons/DentalIcons";
import { showToast } from "../GlobalToast";
import {
	type CephLandmark16Key,
	type CephPoint2D,
	CEPH_16_LANDMARKS_CATALOG,
	CANONICAL_CEPH_COORDINATES_PRESET,
	computeCephalometricMetrics,
	BRACKET_SYSTEMS_CATALOG,
	ARCHWIRES_CATALOG,
	ALIGNER_ATTACHMENTS_CATALOG,
	DEFAULT_ALIGNER_STATE,
} from "./orthoCatalogData";

export interface OrthodonticWorkspaceModalProps {
	isOpen?: boolean;
	onClose: () => void;
	patientId?: string;
	patientName?: string;
	doctorName?: string;
	initialTab?: "visit" | "ceph" | "aligners";
	onSaveProtocol?: (summary: {
		patientName: string;
		arch: string;
		bracketSystem: string;
		archwire: string;
		skeletalClass: string;
		anbAngle: number;
		totalRub: number;
		diaryText: string;
	}) => void;
}

export const OrthodonticWorkspaceModal: React.FC<OrthodonticWorkspaceModalProps> = ({
	isOpen = true,
	onClose,
	patientName = "Смирнова Екатерина Андреевна",
	doctorName = "Д-р Соколов А. В.",
	initialTab = "visit",
	onSaveProtocol,
}) => {
	const titleId = useId();
	const [activeTab, setActiveTab] = useState<"visit" | "ceph" | "aligners">(initialTab);
	const [targetArch, setTargetArch] = useState<"both" | "upper" | "lower">("both");
	const [selectedBracketId, setSelectedBracketId] = useState<string>("damon_q2");
	const [selectedArchwireId, setSelectedArchwireId] = useState<string>("cuniti_014x025");
	const [selectedActions, setSelectedActions] = useState<Record<string, boolean>>({
		wire_change: true,
		ligature_change: false,
		power_chain: true,
		elastic_traction: false,
		rebracket: false,
		ipr: false,
	});

	// Состояние ТРГ-ориентиров (16 точек с возможностью ручного перемещения)
	const [cephPoints, setCephPoints] = useState<Record<CephLandmark16Key, CephPoint2D>>({
		...CANONICAL_CEPH_COORDINATES_PRESET,
	});
	const [activeDraggingKey, setActiveDraggingKey] = useState<CephLandmark16Key | null>(null);

	// Состояние элайнеров
	const [alignerState, setAlignerState] = useState(DEFAULT_ALIGNER_STATE);

	// Живой тригонометрический расчет цефалометрии Штейнера/Шварца
	const cephMetrics = useMemo(() => computeCephalometricMetrics(cephPoints), [cephPoints]);

	// Расчет стоимости процедур
	const totalCostRub = useMemo(() => {
		let total = 0;
		const bracket = BRACKET_SYSTEMS_CATALOG.find((b) => b.id === selectedBracketId);
		const wire = ARCHWIRES_CATALOG.find((w) => w.id === selectedArchwireId);
		if (selectedActions.wire_change && wire) total += wire.priceRub;
		if (selectedActions.power_chain) total += 1800;
		if (selectedActions.rebracket && bracket) total += 1200;
		if (selectedActions.ipr) total += 1500;
		if (activeTab === "aligners") total = 4500;
		return total > 0 ? total : 2500;
	}, [selectedBracketId, selectedArchwireId, selectedActions, activeTab]);

	// 1-клик фиксация физиологической нормы (Мандат 8e)
	const handleApplyNorm = useCallback(() => {
		setCephPoints({ ...CANONICAL_CEPH_COORDINATES_PRESET });
		setSelectedActions({
			wire_change: true,
			ligature_change: false,
			power_chain: false,
			elastic_traction: false,
			rebracket: false,
			ipr: false,
		});
		showToast("Установлена физиологическая норма: I скелетный класс, плановая дуга", "success");
	}, []);

	// Перетаскивание точки ТРГ на SVG-холсте
	const handleSvgMouseMove = useCallback(
		(e: React.MouseEvent<SVGSVGElement>) => {
			if (!activeDraggingKey) return;
			const rect = e.currentTarget.getBoundingClientRect();
			const x = Math.round(((e.clientX - rect.left) / rect.width) * 800);
			const y = Math.round(((e.clientY - rect.top) / rect.height) * 700);
			setCephPoints((prev) => ({
				...prev,
				[activeDraggingKey]: { x: Math.max(20, Math.min(780, x)), y: Math.max(20, Math.min(680, y)) },
			}));
		},
		[activeDraggingKey],
	);

	const handleSvgMouseUp = useCallback(() => {
		setActiveDraggingKey(null);
	}, []);

	// Фиксация протокола (Единственный Primary CTA)
	const handleSave = useCallback(() => {
		const bracket = BRACKET_SYSTEMS_CATALOG.find((b) => b.id === selectedBracketId)?.nameRu || "Damon Q2";
		const wire = ARCHWIRES_CATALOG.find((w) => w.id === selectedArchwireId)?.nameRu || ".014x.025 CuNiTi";
		const diaryText = `Ортодонтический приём: ${targetArch === "both" ? "Верхняя и нижняя челюсти" : targetArch === "upper" ? "Верхняя челюсть" : "Нижняя челюсть"}. Брекеты ${bracket}, дуга ${wire}. ТРГ: ${cephMetrics.skeletalClassLabelRu}, ANB=${cephMetrics.anb}°, SNA=${cephMetrics.sna}°, SNB=${cephMetrics.snb}°. Стоимость активации: ${totalCostRub} ₽.`;

		if (onSaveProtocol) {
			onSaveProtocol({
				patientName,
				arch: targetArch,
				bracketSystem: bracket,
				archwire: wire,
				skeletalClass: cephMetrics.skeletalClass,
				anbAngle: cephMetrics.anb,
				totalRub: totalCostRub,
				diaryText,
			});
		}
		showToast("✓ Протокол активации и расчет успешно сохранены в карту", "success");
		onClose();
	}, [
		targetArch,
		selectedBracketId,
		selectedArchwireId,
		cephMetrics,
		totalCostRub,
		patientName,
		onSaveProtocol,
		onClose,
	]);

	if (!isOpen) return null;

	return (
		<div
			className="fixed inset-0 z-[10050] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-xs p-0 sm:p-4 overflow-y-auto overflow-x-clip max-w-[100vw]"
			role="dialog"
			aria-modal="true"
			aria-labelledby={titleId}
			data-testid="orthodontic-workspace-modal"
		>
			<div className="relative w-full max-w-5xl bg-[var(--paper)] border border-[var(--line)] rounded-t-[24px] sm:rounded-2xl shadow-2xl flex flex-col h-[94vh] sm:h-[88vh] overflow-hidden overflow-x-clip animate-in fade-in zoom-in-95 duration-200">
				{/* Apple HIG Drag Handle для мобильных */}
				<div className="sm:hidden flex justify-center pt-2.5 pb-1 bg-[var(--paper)] shrink-0">
					<div className="w-9 h-1 rounded-full bg-[var(--line-strong,rgba(150,150,150,0.5))]" />
				</div>

				{/* Шапка модального окна */}
				<header className="flex items-center justify-between px-4 sm:px-6 py-3 border-b border-[var(--line)] bg-[var(--paper)] shrink-0">
					<div className="flex items-center gap-3 min-w-0">
						<div className="w-10 h-10 rounded-xl bg-[var(--paper-soft)] text-[#0d9488] flex items-center justify-center border border-[var(--line)] shrink-0 shadow-xs">
							<BracesBracket size={22} />
						</div>
						<div className="min-w-0">
							<h2 id={titleId} className="text-base sm:text-lg font-bold text-[var(--ink)] truncate m-0">
								Рабочий стол ортодонта
							</h2>
							<p className="text-xs text-[var(--muted)] truncate m-0">
								{patientName} · Врач: {doctorName}
							</p>
						</div>
					</div>

					<div className="flex items-center gap-2 shrink-0">
						<button
							type="button"
							onClick={handleApplyNorm}
							className="secondary-button h-9 px-3 text-xs font-semibold flex items-center gap-1.5 border-[var(--line)] hover:bg-[var(--paper-soft)] cursor-pointer text-[#0d9488]"
							title="1-клик фиксация физиологической нормы"
						>
							<Sparkles size={14} className="text-emerald-500" />
							<span className="hidden sm:inline">Норма</span>
						</button>
						<button
							type="button"
							onClick={onClose}
							className="w-9 h-9 rounded-xl text-[var(--muted)] hover:text-[var(--ink)] hover:bg-[var(--paper-soft)] flex items-center justify-center border border-[var(--line)] cursor-pointer min-h-[44px] min-w-[44px]"
							aria-label="Закрыть"
						>
							<X size={18} />
						</button>
					</div>
				</header>

				{/* Навигационный переключатель вкладок (Apple HIG Segmented Control) */}
				<nav className="flex px-3 sm:px-6 py-2 bg-[var(--paper-soft)] border-b border-[var(--line)] gap-1.5 sm:gap-2 shrink-0">
					<button
						type="button"
						onClick={() => setActiveTab("visit")}
						className={`flex-1 min-h-[42px] py-1.5 sm:py-2 px-2 sm:px-3 rounded-xl text-xs sm:text-sm font-semibold flex items-center justify-center gap-1.5 sm:gap-2 transition-all cursor-pointer ${
							activeTab === "visit"
								? "bg-[var(--paper)] text-[var(--ink)] shadow-xs border border-[var(--line)]"
								: "text-[var(--muted)] hover:text-[var(--ink)]"
						}`}
					>
						<Layers size={16} className={activeTab === "visit" ? "text-[#0d9488]" : ""} />
						<span className="hidden sm:inline">Визит и активация дуг</span>
						<span className="sm:hidden">Дуги</span>
					</button>

					<button
						type="button"
						onClick={() => setActiveTab("ceph")}
						className={`flex-1 min-h-[42px] py-1.5 sm:py-2 px-2 sm:px-3 rounded-xl text-xs sm:text-sm font-semibold flex items-center justify-center gap-1.5 sm:gap-2 transition-all cursor-pointer ${
							activeTab === "ceph"
								? "bg-[var(--paper)] text-[var(--ink)] shadow-xs border border-[var(--line)]"
								: "text-[var(--muted)] hover:text-[var(--ink)]"
						}`}
					>
						<Activity size={16} className={activeTab === "ceph" ? "text-[#0d9488]" : ""} />
						<span className="hidden sm:inline">ТРГ Цефалометрия</span>
						<span className="sm:hidden">ТРГ</span>
						<span className="px-1.5 py-0.5 rounded-full text-[10px] bg-[#0d9488]/10 text-[#0d9488] font-bold">
							Класс {cephMetrics.skeletalClass}
						</span>
					</button>

					<button
						type="button"
						onClick={() => setActiveTab("aligners")}
						className={`flex-1 min-h-[42px] py-1.5 sm:py-2 px-2 sm:px-3 rounded-xl text-xs sm:text-sm font-semibold flex items-center justify-center gap-1.5 sm:gap-2 transition-all cursor-pointer ${
							activeTab === "aligners"
								? "bg-[var(--paper)] text-[var(--ink)] shadow-xs border border-[var(--line)]"
								: "text-[var(--muted)] hover:text-[var(--ink)]"
						}`}
					>
						<Sliders size={16} className={activeTab === "aligners" ? "text-[#0d9488]" : ""} />
						<span>Элайнеры</span>
						<span className="px-1.5 py-0.5 rounded-full text-[10px] bg-[var(--paper)] text-[var(--muted)] font-mono border border-[var(--line)]">
							{alignerState.currentStep}/{alignerState.totalSteps}
						</span>
					</button>
				</nav>

				{/* Рабочее пространство вкладок */}
				<div className="flex-1 overflow-y-auto p-4 sm:p-6 pb-12 bg-[var(--paper)]">
					{/* Вкладка 1: Визит и дуги */}
					{activeTab === "visit" && (
						<div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
							<section className="lg:col-span-7 flex flex-col gap-4">
								<div className="p-4 rounded-xl border border-[var(--line)] bg-[var(--paper-soft)]">
									<label className="text-xs font-bold uppercase tracking-wider text-[var(--muted)] block mb-2">
										Зубная дуга и челюсть
									</label>
									<div className="grid grid-cols-3 gap-2">
										{(["both", "upper", "lower"] as const).map((arch) => (
											<button
												key={arch}
												type="button"
												onClick={() => setTargetArch(arch)}
												className={`min-h-[44px] py-2 px-3 rounded-lg text-xs font-bold transition-all border cursor-pointer ${
													targetArch === arch
														? "bg-[var(--paper)] text-[#0d9488] border-[#0d9488] shadow-xs"
														: "bg-[var(--paper)] text-[var(--ink)] border-[var(--line)] hover:bg-[var(--paper-soft)]"
												}`}
											>
												{arch === "both" ? "Обе челюсти" : arch === "upper" ? "Верхняя (ВЧ)" : "Нижняя (НЧ)"}
											</button>
										))}
									</div>
								</div>

								<div className="p-4 rounded-xl border border-[var(--line)] bg-[var(--paper-soft)]">
									<label className="text-xs font-bold uppercase tracking-wider text-[var(--muted)] block mb-2">
										Брекет-система
									</label>
									<div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
										{BRACKET_SYSTEMS_CATALOG.map((b) => (
											<button
												key={b.id}
												type="button"
												onClick={() => setSelectedBracketId(b.id)}
												className={`min-h-[48px] p-2.5 rounded-lg text-left transition-all border cursor-pointer flex flex-col justify-between ${
													selectedBracketId === b.id
														? "bg-[var(--paper)] text-[#0d9488] border-[#0d9488] shadow-xs"
														: "bg-[var(--paper)] text-[var(--ink)] border-[var(--line)] hover:bg-[var(--paper-soft)]"
												}`}
											>
												<span className="text-xs font-bold">{b.nameRu}</span>
												<span className="text-[11px] text-[var(--muted)] truncate">{b.typeRu} · {b.manufacturer}</span>
											</button>
										))}
									</div>
								</div>

								<div className="p-4 rounded-xl border border-[var(--line)] bg-[var(--paper-soft)]">
									<label className="text-xs font-bold uppercase tracking-wider text-[var(--muted)] block mb-2">
										Устанавливаемая дуга
									</label>
									<div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
										{ARCHWIRES_CATALOG.map((w) => (
											<button
												key={w.id}
												type="button"
												onClick={() => setSelectedArchwireId(w.id)}
												className={`min-h-[48px] p-2.5 rounded-lg text-left transition-all border cursor-pointer flex flex-col justify-between ${
													selectedArchwireId === w.id
														? "bg-[var(--paper)] text-[#0d9488] border-[#0d9488] shadow-xs"
														: "bg-[var(--paper)] text-[var(--ink)] border-[var(--line)] hover:bg-[var(--paper-soft)]"
												}`}
											>
												<div className="flex items-center justify-between">
													<span className="text-xs font-bold">{w.nameRu}</span>
													<span className="text-xs font-mono font-semibold text-[#0d9488]">{w.priceRub} ₽</span>
												</div>
												<span className="text-[11px] text-[var(--muted)] truncate">{w.phaseRu}</span>
											</button>
										))}
									</div>
								</div>
							</section>

							<section className="lg:col-span-5 flex flex-col gap-4">
								<div className="p-4 rounded-xl border border-[var(--line)] bg-[var(--paper-soft)]">
									<label className="text-xs font-bold uppercase tracking-wider text-[var(--muted)] block mb-3">
										Манипуляции на приёме
									</label>
									<div className="flex flex-col gap-2">
										{[
											{ id: "wire_change", label: "Смена ортодонтической дуги" },
											{ id: "ligature_change", label: "Смена лигатур / активация замков" },
											{ id: "power_chain", label: "Эластическая цепочка Power Chain" },
											{ id: "elastic_traction", label: "Межчелюстная эластическая тяга" },
											{ id: "rebracket", label: "Повторная фиксация отклеившегося брекета" },
											{ id: "ipr", label: "Сепарация эмали (IPR)" },
										].map((act) => (
											<label
												key={act.id}
												className="flex items-center gap-3 p-2.5 rounded-lg bg-[var(--paper)] border border-[var(--line)] cursor-pointer hover:bg-[var(--paper-soft)] min-h-[44px]"
											>
												<input
													type="checkbox"
													checked={Boolean(selectedActions[act.id])}
													onChange={(e) =>
														setSelectedActions((prev) => ({ ...prev, [act.id]: e.target.checked }))
													}
													className="w-4 h-4 text-[#0d9488] rounded-sm focus:ring-[#0d9488]"
												/>
												<span className="text-xs font-medium text-[var(--ink)]">{act.label}</span>
											</label>
										))}
									</div>
								</div>

								<div className="p-4 rounded-xl border border-[var(--line)] bg-[var(--paper-soft)] flex flex-col gap-2">
									<div className="flex items-center justify-between text-xs font-bold text-[var(--muted)] uppercase tracking-wider">
										<span>Итог протокола</span>
										<span className="text-emerald-500 font-semibold">Готов к записи</span>
									</div>
									<div className="text-xs text-[var(--ink)] bg-[var(--paper)] p-3 rounded-lg border border-[var(--line)] leading-relaxed">
										Дуга: <strong>{ARCHWIRES_CATALOG.find((w) => w.id === selectedArchwireId)?.nameRu}</strong> на{" "}
										<strong>{targetArch === "both" ? "обе челюсти" : targetArch === "upper" ? "ВЧ" : "НЧ"}</strong>.
										Скелетный класс: <strong>{cephMetrics.skeletalClassLabelRu}</strong>.
									</div>
								</div>
							</section>
						</div>
					)}

					{/* Вкладка 2: ТРГ Цефалометрия */}
					{activeTab === "ceph" && (
						<div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
							<div className="lg:col-span-8 flex flex-col gap-2">
								<div className="relative w-full aspect-[8/7] bg-[#0f172a] rounded-xl overflow-hidden border border-[var(--line)] shadow-inner">
									<svg
										viewBox="0 0 800 700"
										className="w-full h-full cursor-crosshair select-none"
										onMouseMove={handleSvgMouseMove}
										onMouseUp={handleSvgMouseUp}
										onMouseLeave={handleSvgMouseUp}
									>
										{/* Декоративная анатомическая сетка */}
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
										<line x1={cephPoints.S.x} y1={cephPoints.S.y} x2={cephPoints.N.x} y2={cephPoints.N.y} stroke="#38bdf8" strokeWidth="2" />
										<line x1={cephPoints.N.x} y1={cephPoints.N.y} x2={cephPoints.A.x} y2={cephPoints.A.y} stroke="#f43f5e" strokeWidth="1.5" />
										<line x1={cephPoints.N.x} y1={cephPoints.N.y} x2={cephPoints.B.x} y2={cephPoints.B.y} stroke="#10b981" strokeWidth="1.5" />
										<line x1={cephPoints.Go.x} y1={cephPoints.Go.y} x2={cephPoints.Me.x} y2={cephPoints.Me.y} stroke="#eab308" strokeWidth="2" />
										<line x1={cephPoints.Is.x} y1={cephPoints.Is.y} x2={cephPoints.U1.x} y2={cephPoints.U1.y} stroke="#a855f7" strokeWidth="2" />
										<line x1={cephPoints.Ii.x} y1={cephPoints.Ii.y} x2={cephPoints.L1.x} y2={cephPoints.L1.y} stroke="#ec4899" strokeWidth="2" />

										{/* Интерактивные анатомические ориентиры */}
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
									<span className="font-mono text-[#0d9488]">S-N: {Math.round(Math.hypot(cephPoints.N.x - cephPoints.S.x, cephPoints.N.y - cephPoints.S.y))} px</span>
								</p>
							</div>

							<div className="lg:col-span-4 flex flex-col gap-3">
								<div className="p-4 rounded-xl border border-[var(--line)] bg-[var(--paper-soft)]">
									<h4 className="text-xs font-bold uppercase tracking-wider text-[var(--muted)] mb-3">
										Скелетные параметры Штейнера
									</h4>
									<div className="flex flex-col gap-2.5">
										<div className="flex items-center justify-between p-2 rounded-lg bg-[var(--paper)] border border-[var(--line)]">
											<span className="text-xs font-medium">Угол SNA (ВЧ к основанию)</span>
											<span className="text-xs font-mono font-bold text-[var(--ink)]">{cephMetrics.sna}° <span className="text-[10px] text-[var(--muted)] font-normal">(82±2°)</span></span>
										</div>
										<div className="flex items-center justify-between p-2 rounded-lg bg-[var(--paper)] border border-[var(--line)]">
											<span className="text-xs font-medium">Угол SNB (НЧ к основанию)</span>
											<span className="text-xs font-mono font-bold text-[var(--ink)]">{cephMetrics.snb}° <span className="text-[10px] text-[var(--muted)] font-normal">(80±2°)</span></span>
										</div>
										<div className="flex items-center justify-between p-2 rounded-lg bg-[var(--paper)] border border-[#0d9488]/40">
											<span className="text-xs font-bold text-[#0d9488]">Угол ANB (Сагитталь)</span>
											<span className="text-sm font-mono font-bold text-[#0d9488]">{cephMetrics.anb}° <span className="text-[10px] text-[var(--muted)] font-normal">(2±2°)</span></span>
										</div>
										<div className="flex items-center justify-between p-2 rounded-lg bg-[var(--paper)] border border-[var(--line)]">
											<span className="text-xs font-medium">Межрезцовый угол (U1/L1)</span>
											<span className="text-xs font-mono font-bold text-[var(--ink)]">{cephMetrics.interincisalAngle}° <span className="text-[10px] text-[var(--muted)] font-normal">(131°)</span></span>
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
									<div className="text-sm font-bold text-[var(--ink)] mb-1">
										{cephMetrics.skeletalClassLabelRu}
									</div>
									<div className="text-xs text-[var(--muted)] leading-relaxed">
										{cephMetrics.growthDirectionRu}. {cephMetrics.recommendationRu}
									</div>
								</div>
							</div>
						</div>
					)}

					{/* Вкладка 3: Элайнеры */}
					{activeTab === "aligners" && (
						<div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
							<section className="lg:col-span-6 flex flex-col gap-4">
								<div className="p-4 rounded-xl border border-[var(--line)] bg-[var(--paper-soft)]">
									<label className="text-xs font-bold uppercase tracking-wider text-[var(--muted)] block mb-3">
										Прогресс элайнеров и выдача капп
									</label>
									<div className="flex flex-col gap-3">
										<div className="flex items-center justify-between">
											<span className="text-xs font-medium">Текущая каппа:</span>
											<span className="text-sm font-bold font-mono text-[#0d9488]">
												№ {alignerState.currentStep} из {alignerState.totalSteps}
											</span>
										</div>
										<input
											type="range"
											min="1"
											max={alignerState.totalSteps}
											value={alignerState.currentStep}
											onChange={(e) =>
												setAlignerState((prev) => ({ ...prev, currentStep: Number(e.target.value) }))
											}
											className="w-full accent-[#0d9488] cursor-pointer"
										/>
										<div className="grid grid-cols-2 gap-2 mt-2">
											<div className="p-2.5 rounded-lg bg-[var(--paper)] border border-[var(--line)]">
												<span className="text-[11px] text-[var(--muted)] block">Дней на шаг</span>
												<span className="text-sm font-bold text-[var(--ink)]">{alignerState.daysPerStep} дней</span>
											</div>
											<div className="p-2.5 rounded-lg bg-[var(--paper)] border border-[var(--line)]">
												<span className="text-[11px] text-[var(--muted)] block">Выдано на руки</span>
												<span className="text-sm font-bold text-[var(--ink)]">{alignerState.issuedSetsCount} смены</span>
											</div>
										</div>
									</div>
								</div>
							</section>

							<section className="lg:col-span-6 flex flex-col gap-4">
								<div className="p-4 rounded-xl border border-[var(--line)] bg-[var(--paper-soft)]">
									<label className="text-xs font-bold uppercase tracking-wider text-[var(--muted)] block mb-3">
										Аттачменты и сепарация (IPR)
									</label>
									<div className="flex flex-col gap-2">
										{ALIGNER_ATTACHMENTS_CATALOG.map((att) => (
											<div
												key={att.id}
												className="p-2.5 rounded-lg bg-[var(--paper)] border border-[var(--line)] flex items-center justify-between"
											>
												<div>
													<span className="text-xs font-bold text-[var(--ink)] block">{att.nameRu}</span>
													<span className="text-[11px] text-[var(--muted)]">{att.intentRu}</span>
												</div>
												<span className="text-xs font-mono font-bold text-emerald-600">✓ Активен</span>
											</div>
										))}
									</div>
								</div>
							</section>
						</div>
					)}
				</div>

				{/* Единый липкий нижний колонтитул (Natural Thumb Zone) — Ровно 1 Primary CTA */}
				<footer className="px-4 sm:px-6 py-2.5 sm:py-3 border-t border-[var(--line)] bg-[var(--paper)]/95 backdrop-blur-md flex flex-col sm:flex-row sm:items-center justify-between shrink-0 gap-2.5 sm:gap-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
					<div className="flex items-center justify-between w-full sm:w-auto gap-3">
						<div className="text-left">
							<span className="text-[11px] text-[var(--muted)] uppercase font-semibold block leading-tight">Стоимость приёма:</span>
							<span className="text-base sm:text-lg font-bold font-mono text-[var(--ink)] leading-tight">{totalCostRub} ₽</span>
						</div>
						<button
							type="button"
							onClick={() => {
								showToast("Памятка пациента по ношению дуг/эластиков отправлена на печать", "info");
							}}
							className="secondary-button h-9 sm:h-11 px-3 sm:px-4 rounded-xl text-xs font-semibold flex items-center gap-1.5 border-[var(--line)] hover:bg-[var(--paper-soft)] cursor-pointer min-h-[36px] sm:min-h-[44px]"
							title="Печать памятки для пациента"
						>
							<Printer size={15} />
							<span>Памятка</span>
						</button>
					</div>

					{/* Ровно ОДНА Primary CTA кнопка #0d9488 на видимый экран */}
					<button
						type="button"
						onClick={handleSave}
						className="primary-button w-full sm:w-auto h-11 px-4 sm:px-6 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 bg-[#0d9488] hover:bg-[#0f766e] text-white shadow-md active:scale-[0.98] transition-transform cursor-pointer min-h-[44px]"
						data-testid="ortho-primary-save-cta"
					>
						<Check size={18} />
						<span>Сохранить протокол активации и расчет</span>
					</button>
				</footer>
			</div>
		</div>
	);
};

export default OrthodonticWorkspaceModal;
