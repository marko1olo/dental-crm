import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import {
	Activity,
	AlertTriangle,
	Anchor,
	CheckCircle2,
	ChevronRight,
	CircleDot,
	ClipboardList,
	Crown,
	Edit3,
	FileCheck2,
	Flame,
	Scissors,
	Sparkles,
	Stethoscope,
	Syringe,
	X,
	XCircle,
	Zap,
} from "lucide-react";
import { getToothConfig, getToothPath } from "../../../utils/math/toothGeometry";
import { showToast } from "../../GlobalToast";

export interface VisitClinicalToothModalProps {
	// biome-ignore lint/suspicious/noExplicitAny: selection
	selectedToothForMenu: any;
	closeClinicalModal: () => void;
	toothStateByCode: Record<string, string>;
	materialCategory: string | null;
	setMaterialCategory: (v: string | null) => void;
	handleSelectDiagnosis: (state: string, text?: string, field?: string) => void;
	handleSelectSurface: (surf: string) => void;
	selectedSurfaces: string[];
	isSurfaceMode: boolean;
	setIsSurfaceMode: React.Dispatch<React.SetStateAction<boolean>>;
	setEndoModalToothNumber: (v: number | null) => void;
	setEndoModalToothState: (v: string) => void;
	setIsEndoModalOpen: (v: boolean) => void;
	appendToEMKField: (field: string, text: string) => void;
	setLabOrderModalToothNumber: (v: string | undefined) => void;
	setIsLabOrderModalOpen: (v: boolean) => void;
	// biome-ignore lint/suspicious/noExplicitAny: warnings
	visitWarnings?: any[];
}

type TabType = "diagnosis" | "therapy" | "endo" | "surgery";

export function VisitClinicalToothModal({
	selectedToothForMenu,
	closeClinicalModal,
	toothStateByCode,
	materialCategory,
	setMaterialCategory,
	handleSelectDiagnosis,
	handleSelectSurface,
	selectedSurfaces,
	isSurfaceMode: _isSurfaceMode,
	setIsSurfaceMode: _setIsSurfaceMode,
	setEndoModalToothNumber,
	setEndoModalToothState,
	setIsEndoModalOpen,
	appendToEMKField,
	setLabOrderModalToothNumber,
	setIsLabOrderModalOpen,
	visitWarnings,
}: VisitClinicalToothModalProps) {
	if (!selectedToothForMenu || typeof document === "undefined") return null;

	const { code } = selectedToothForMenu;
	// biome-ignore lint/suspicious/noExplicitAny: state lookup
	const state = (toothStateByCode as any)[code] ?? "idle";
	const geom = getToothPath(Number(code));
	const cfg = getToothConfig(Number(code));

	// По умолчанию открываем Терапию, если зуб в лечении/наблюдении, иначе Диагностику
	const [activeTab, setActiveTab] = useState<TabType>(() => {
		if (materialCategory) {
			return materialCategory === "crown" || materialCategory === "veneer" || materialCategory === "implant"
				? "surgery"
				: "therapy";
		}
		return state === "treatment" || state === "watch" ? "therapy" : "diagnosis";
	});

	useEffect(() => {
		const handleKeyDown = (e: KeyboardEvent) => {
			if (e.key === "Escape") {
				closeClinicalModal();
			}
		};
		window.addEventListener("keydown", handleKeyDown);
		return () => window.removeEventListener("keydown", handleKeyDown);
	}, [closeClinicalModal]);

	const FILL: Record<string, string> = {
		idle: "var(--paper)",
		planned: "var(--info-bg)",
		treatment: "var(--bad-bg)",
		watch: "var(--warn-bg)",
		done: "var(--ok-bg)",
		missing: "var(--paper-soft)",
	};
	const STROKE: Record<string, string> = {
		idle: "var(--line-strong, #64748b)",
		planned: "var(--teal, #0284c7)",
		treatment: "var(--bad-fg, #dc2626)",
		watch: "var(--warn-fg, #d97706)",
		done: "var(--ok-fg, #166534)",
		missing: "var(--line, #cbd5e1)",
	};
	const ROOT_FILL: Record<string, string> = {
		idle: "var(--paper-soft)",
		planned: "var(--info-bg)",
		treatment: "var(--bad-bg)",
		watch: "var(--warn-bg)",
		done: "var(--ok-bg)",
		missing: "var(--paper-soft)",
	};
	const ROOT_STROKE: Record<string, string> = {
		idle: "var(--line, #cbd5e1)",
		planned: "var(--teal, #38bdf8)",
		treatment: "var(--bad-fg, #f87171)",
		watch: "var(--warn-fg, #fbbf24)",
		done: "var(--ok-fg, #4ade80)",
		missing: "var(--line, #cbd5e1)",
	};

	const isLower = Number(code) >= 30;

	// Статусный лейбл
	const statusMeta =
		state === "treatment"
			? { label: "Лечение", color: "text-red-500", dot: "bg-red-500" }
			: state === "watch"
				? { label: "Кариес", color: "text-amber-500", dot: "bg-amber-500" }
				: state === "done"
					? { label: "Санирован", color: "text-emerald-500", dot: "bg-emerald-500" }
					: state === "missing"
						? { label: "Удалён", color: "text-slate-400", dot: "bg-slate-400" }
						: { label: "Интактен", color: "text-emerald-600", dot: "bg-emerald-500" };

	const toothSvgMini = (
		<svg
			aria-hidden="true"
			width="22"
			height="28"
			viewBox={`0 0 ${cfg.viewWidth} ${cfg.viewHeight}`}
			fill="none"
			style={{ transform: isLower ? "scaleY(-1)" : "none" }}
		>
			{state === "missing" ? (
				<g>
					<path
						d={geom.root}
						fill="var(--paper-soft)"
						stroke="var(--muted)"
						strokeWidth="1.2"
						opacity="0.3"
					/>
					<path
						d={geom.crown}
						fill="var(--paper-soft)"
						stroke="var(--muted)"
						strokeWidth="1.2"
						opacity="0.3"
					/>
					<path
						d="M20 20L80 130M80 20L20 130"
						stroke="var(--bad-fg, #ef4444)"
						strokeWidth="4"
						strokeLinecap="round"
					/>
				</g>
			) : (
				<g>
					<path
						d={geom.root}
						fill={ROOT_FILL[state] ?? "var(--paper-soft)"}
						stroke={ROOT_STROKE[state] ?? "var(--line)"}
						strokeWidth="1.5"
						strokeLinejoin="round"
					/>
					{geom.canals && (state === "treatment" || state === "done") && (
						<path
							d={geom.canals}
							fill="none"
							stroke={state === "done" ? "#ec4899" : "#dc2626"}
							strokeWidth="2.5"
							strokeLinecap="round"
							opacity="0.85"
						/>
					)}
					<path
						d={geom.crown}
						fill={FILL[state] ?? "var(--paper)"}
						stroke={STROKE[state] ?? "var(--line-strong)"}
						strokeWidth="1.8"
						strokeLinejoin="round"
					/>
				</g>
			)}
		</svg>
	);

	return createPortal(
		<>
			<button
				type="button"
				className="_ccm-overlay"
				onClick={closeClinicalModal}
				onKeyDown={(e) =>
					(e.key === "Enter" || e.key === " ") && closeClinicalModal()
				}
				aria-label="Закрыть"
			/>
			<div
				className="_ccm-content"
				role="dialog"
				aria-modal="true"
				aria-label={`Клиническая карта: Зуб ${code}`}
			>
				{/* ── 1. STUDIO HEADER ── */}
				<div className="_ccm-header">
					<div className="_ccm-header-left">
						<div className="_ccm-tooth-badge" aria-hidden="true">
							{toothSvgMini}
						</div>
						<div className="_ccm-header-title-wrap">
							<span className="_ccm-tooth-title">Зуб {code}</span>
							<span className="_ccm-fdi-badge">FDI</span>
							<span className="_ccm-status-pill">
								<span className={`_ccm-status-dot ${statusMeta.dot}`} />
								<span>{statusMeta.label}</span>
							</span>
						</div>
					</div>

					{/* Сегментные чипы полостей Блэка */}
					<div className="_ccm-cavity-cluster">
						<span className="_ccm-cavity-label">Блэк:</span>
						<div className="_ccm-cavity-pills">
							{["O", "MO", "OD", "MOD", "V"].map((cavity) => {
								const isSelected = selectedSurfaces.includes(cavity);
								return (
									<button
										key={cavity}
										type="button"
										data-testid={`btn-cavity-${cavity.toLowerCase()}`}
										onClick={() => handleSelectSurface(cavity)}
										className={`_ccm-cavity-btn${isSelected ? " active" : ""}`}
										title={`Полость класса ${cavity}`}
									>
										{cavity}
									</button>
								);
							})}
						</div>
					</div>

					{/* Кнопка закрытия ✕ */}
					<button
						type="button"
						onClick={closeClinicalModal}
						className="_ccm-close-btn-icon"
						aria-label="Закрыть модальное окно"
						title="Закрыть (Esc)"
					>
						<X className="w-3.5 h-3.5" />
					</button>
				</div>

				{/* ── 2. SEGMENTED TABS (STUDIO HIG) ── */}
				<div className="_ccm-tabs-bar">
					<button
						type="button"
						onClick={() => setActiveTab("diagnosis")}
						className={`_ccm-tab-btn${activeTab === "diagnosis" ? " active" : ""}`}
					>
						<Stethoscope className="w-3.5 h-3.5 shrink-0" />
						<span>Диагностика</span>
					</button>
					<button
						type="button"
						onClick={() => setActiveTab("therapy")}
						className={`_ccm-tab-btn${activeTab === "therapy" ? " active" : ""}`}
					>
						<Sparkles className="w-3.5 h-3.5 shrink-0" />
						<span>Терапия & Пломба</span>
					</button>
					<button
						type="button"
						onClick={() => setActiveTab("endo")}
						className={`_ccm-tab-btn${activeTab === "endo" ? " active" : ""}`}
					>
						<Zap className="w-3.5 h-3.5 shrink-0" />
						<span>Эндодонтия</span>
					</button>
					<button
						type="button"
						onClick={() => setActiveTab("surgery")}
						className={`_ccm-tab-btn${activeTab === "surgery" ? " active" : ""}`}
					>
						<Crown className="w-3.5 h-3.5 shrink-0" />
						<span>Орто & Хирургия</span>
					</button>
				</div>

				{/* ── 3. BODY CONTENT (STUDIO STUDIO DENSITY, ZERO CLIPPING) ── */}
				<div className="_ccm-body-pane">
					{/* ── TAB 1: ДИАГНОСТИКА ── */}
					{activeTab === "diagnosis" && (
						<div className="_ccm-pane-section">
							{visitWarnings && visitWarnings.length > 0 && (
								<div className="_ccm-warn">
									<AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0" />
									<span className="truncate">
										Риски: {visitWarnings.map((w: any) => w.title).join(" · ")}
									</span>
								</div>
							)}

							<div className="_ccm-sub-label">Физиологическое состояние</div>
							<div className="_ccm-items-grid">
								<button
									type="button"
									className={`_ccm-action-item${state === "idle" ? " active" : ""}`}
									onClick={() => handleSelectDiagnosis("idle")}
								>
									<span className="_ccm-btn-dot _ccm-dot-idle" />
									<span className="_ccm-item-title">Здоров / Интактен</span>
									<CircleDot className="w-3.5 h-3.5 text-[var(--muted)] ml-auto shrink-0" />
								</button>
								<button
									type="button"
									className={`_ccm-action-item${state === "done" ? " active" : ""}`}
									onClick={() =>
										handleSelectDiagnosis(
											"done",
											"зуб санирован / здоров",
											"diagnosis",
										)
									}
								>
									<span className="_ccm-btn-dot _ccm-dot-done" />
									<span className="_ccm-item-title">Санирован / Ранее лечен</span>
									<CheckCircle2 className="w-3.5 h-3.5 text-[var(--teal)] ml-auto shrink-0" />
								</button>
								<button
									type="button"
									className={`_ccm-action-item${state === "missing" ? " active" : ""}`}
									onClick={() =>
										handleSelectDiagnosis(
											"missing",
											"зуб отсутствует",
											"diagnosis",
										)
									}
								>
									<span className="_ccm-btn-dot _ccm-dot-missing" />
									<span className="_ccm-item-title">Отсутствует / Удалён</span>
									<XCircle className="w-3.5 h-3.5 text-[var(--muted)] ml-auto shrink-0" />
								</button>
							</div>

							<div className="_ccm-sub-label">Патологии зубного ряда (МКБ-10)</div>
							<div className="_ccm-items-grid">
								<button
									type="button"
									className={`_ccm-action-item${state === "watch" ? " active" : ""}`}
									onClick={() => {
										const cavityNote =
											selectedSurfaces.length > 0
												? ` (${selectedSurfaces.join("")})`
												: "";
										handleSelectDiagnosis(
											"watch",
											`K02.1 Кариес дентина${cavityNote}`,
											"diagnosis",
										);
									}}
								>
									<span className="_ccm-btn-dot _ccm-dot-watch" />
									<span className="_ccm-item-title">
										K02.1 Кариес дентина
										{selectedSurfaces.length > 0
											? ` [${selectedSurfaces.join("")}]`
											: ""}
									</span>
									<AlertTriangle className="w-3.5 h-3.5 text-amber-500 ml-auto shrink-0" />
								</button>
								<button
									type="button"
									className="_ccm-action-item"
									onClick={() =>
										handleSelectDiagnosis(
											"treatment",
											"K04.0 Острый пульпит",
											"diagnosis",
										)
									}
								>
									<span className="_ccm-btn-dot _ccm-dot-treatment" />
									<span className="_ccm-item-title">K04.0 Острый пульпит</span>
									<Flame className="w-3.5 h-3.5 text-red-500 ml-auto shrink-0" />
								</button>
								<button
									type="button"
									className="_ccm-action-item"
									onClick={() =>
										handleSelectDiagnosis(
											"treatment",
											"K04.5 Хронический апикальный периодонтит / киста",
											"diagnosis",
										)
									}
								>
									<span className="_ccm-btn-dot _ccm-dot-treatment" />
									<span className="_ccm-item-title">
										K04.5 Периодонтит / Киста
									</span>
									<CircleDot className="w-3.5 h-3.5 text-red-500 ml-auto shrink-0" />
								</button>
								<button
									type="button"
									className="_ccm-action-item"
									onClick={() =>
										handleSelectDiagnosis(
											"watch",
											"K03.1 Клиновидный дефект",
											"diagnosis",
										)
									}
								>
									<span className="_ccm-btn-dot _ccm-dot-watch" />
									<span className="_ccm-item-title">
										K03.1 Клиновидный дефект
									</span>
									<Activity className="w-3.5 h-3.5 text-amber-500 ml-auto shrink-0" />
								</button>
							</div>
						</div>
					)}

					{/* ── TAB 2: ТЕРАПИЯ & ПЛОМБА ── */}
					{activeTab === "therapy" && (
						<div className="_ccm-pane-section">
							{materialCategory === "filling" ? (
								<div className="_ccm-material-subview">
									<div className="_ccm-sub-label">
										Выбор композитного материала
									</div>
									<div className="_ccm-items-grid">
										<button
											type="button"
											className="_ccm-action-item"
											onClick={() => {
												const cavityNote =
													selectedSurfaces.length > 0
														? ` (полость ${selectedSurfaces.join("")})`
														: "";
												handleSelectDiagnosis(
													"done",
													`установлена пломба${cavityNote} (композит Filtek Z250 / Gradia Direct), шлифовка, полировка`,
													"treatmentPlan",
												);
												setMaterialCategory(null);
											}}
										>
											<Sparkles className="w-3.5 h-3.5 text-[var(--teal)] shrink-0" />
											<span className="_ccm-item-title">
												Световой композит Filtek Z250 / Gradia
												{selectedSurfaces.length > 0
													? ` [${selectedSurfaces.join("")}]`
													: ""}
											</span>
											<ChevronRight className="w-3.5 h-3.5 text-[var(--muted)] ml-auto" />
										</button>
										<button
											type="button"
											className="_ccm-action-item"
											onClick={() => {
												const cavityNote =
													selectedSurfaces.length > 0
														? ` (полость ${selectedSurfaces.join("")})`
														: "";
												handleSelectDiagnosis(
													"done",
													`установлена пломба${cavityNote} (эстетический нанокомпозит Ceram.x Spectra ST), шлифовка, полировка`,
													"treatmentPlan",
												);
												setMaterialCategory(null);
											}}
										>
											<Sparkles className="w-3.5 h-3.5 text-[var(--teal)] shrink-0" />
											<span className="_ccm-item-title">
												Нанокомпозит Ceram.x Spectra ST
											</span>
											<ChevronRight className="w-3.5 h-3.5 text-[var(--muted)] ml-auto" />
										</button>
										<button
											type="button"
											className="_ccm-action-item"
											onClick={() => {
												const cavityNote =
													selectedSurfaces.length > 0
														? ` (полость ${selectedSurfaces.join("")})`
														: "";
												handleSelectDiagnosis(
													"done",
													`установлена высокоэстетическая пломба${cavityNote} (Estelite Asteria Tokuyama), полировка`,
													"treatmentPlan",
												);
												setMaterialCategory(null);
											}}
										>
											<Sparkles className="w-3.5 h-3.5 text-[var(--teal)] shrink-0" />
											<span className="_ccm-item-title">
												Премиум Estelite Asteria
											</span>
											<ChevronRight className="w-3.5 h-3.5 text-[var(--muted)] ml-auto" />
										</button>
										<button
											type="button"
											className="_ccm-action-item _ccm-back-row"
											onClick={() => setMaterialCategory(null)}
										>
											<span>← Назад к видам терапии</span>
										</button>
									</div>
								</div>
							) : (
								<div className="_ccm-items-grid">
									<div className="_ccm-sub-label">Терапевтические протоколы</div>
									<button
										type="button"
										className="_ccm-action-item"
										onClick={() => {
											const cavityNote =
												selectedSurfaces.length > 0
													? ` полости [${selectedSurfaces.join("")}]`
													: " кариозной полости";
											handleSelectDiagnosis(
												"treatment",
												`препарирование${cavityNote}, медикаментозная обработка, пломбирование`,
												"treatmentPlan",
											);
										}}
									>
										<Edit3 className="w-3.5 h-3.5 text-[var(--teal)] shrink-0" />
										<span className="_ccm-item-title">
											Лечение кариеса
											{selectedSurfaces.length > 0
												? ` [${selectedSurfaces.join("")}]`
												: ""}
										</span>
										<ChevronRight className="w-3.5 h-3.5 text-[var(--muted)] ml-auto" />
									</button>

									<button
										type="button"
										className="_ccm-action-item"
										onClick={() => setMaterialCategory("filling")}
									>
										<Crown className="w-3.5 h-3.5 text-[var(--teal)] shrink-0" />
										<span className="_ccm-item-title">
											Поставить световую пломбу...
										</span>
										<ChevronRight className="w-3.5 h-3.5 text-[var(--muted)] ml-auto" />
									</button>

									<button
										type="button"
										data-testid="visit-view-anesthesia-dosage-btn"
										className="_ccm-action-item highlight"
										onClick={() => {
											appendToEMKField(
												"treatmentPlan",
												`Анестезия зуба ${code}: Sol. Ultracaini D-S 1:200 000 — 1.7 мл (1 карпула). Аспирационная проба отрицательная. Обезболивание глубокое.`,
											);
											showToast(
												`Анестезия зуба ${code} (1 карп.) внесена в протокол`,
												"success",
												2500,
											);
											closeClinicalModal();
										}}
									>
										<Syringe className="w-3.5 h-3.5 text-sky-500 shrink-0" />
										<span className="_ccm-item-title font-semibold">
											Анестезия зуба {code} (Sol. Ultracaini 1.7 мл, 1 карп.)
										</span>
									</button>

									<button
										type="button"
										data-testid="visit-view-endo-canal-log-btn"
										className="_ccm-action-item"
										onClick={() => {
											setEndoModalToothNumber(Number(code));
											setEndoModalToothState(
												state === "treatment"
													? "Пульпит / Периодонтит"
													: state,
											);
											setIsEndoModalOpen(true);
										}}
									>
										<ClipboardList className="w-3.5 h-3.5 text-[var(--teal)] shrink-0" />
										<span className="_ccm-item-title">
											Журнал каналов (MB1, MB2, DB, P)
										</span>
										<ChevronRight className="w-3.5 h-3.5 text-[var(--muted)] ml-auto" />
									</button>
								</div>
							)}
						</div>
					)}

					{/* ── TAB 3: ЭНДОДОНТИЯ ── */}
					{activeTab === "endo" && (
						<div className="_ccm-pane-section">
							<div className="_ccm-sub-label">Эндодонтический протокол</div>
							<div className="_ccm-items-grid">
								<button
									type="button"
									data-testid="visit-view-endo-canal-log-btn"
									className="_ccm-action-item highlight"
									onClick={() => {
										setEndoModalToothNumber(Number(code));
										setEndoModalToothState(
											state === "treatment"
												? "Пульпит / Периодонтит"
												: state,
										);
										setIsEndoModalOpen(true);
									}}
								>
									<ClipboardList className="w-3.5 h-3.5 text-[var(--teal)] shrink-0" />
									<span className="_ccm-item-title font-semibold">
										Журнал каналов (MB1, MB2, DB, P) — рабочая длина
									</span>
									<ChevronRight className="w-3.5 h-3.5 text-[var(--muted)] ml-auto" />
								</button>

								<button
									type="button"
									className="_ccm-action-item"
									onClick={() =>
										handleSelectDiagnosis(
											"treatment",
											"депульпирование, хемомеханическая обработка каналов ProTaper Gold",
											"treatmentPlan",
										)
									}
								>
									<Zap className="w-3.5 h-3.5 text-amber-500 shrink-0" />
									<span className="_ccm-item-title">
										Первичное эндо: депульпирование, расширение
									</span>
								</button>

								<button
									type="button"
									className="_ccm-action-item"
									onClick={() =>
										handleSelectDiagnosis(
											"treatment",
											"временная обтурация каналов гидроокисью кальция (Calasept / Metapex)",
											"treatmentPlan",
										)
									}
								>
									<FileCheck2 className="w-3.5 h-3.5 text-[var(--teal)] shrink-0" />
									<span className="_ccm-item-title">
										Временная обтурация (Calasept / Metapex)
									</span>
								</button>

								<button
									type="button"
									className="_ccm-action-item"
									onClick={() =>
										handleSelectDiagnosis(
											"done",
											"постоянная обтурация каналов гуттаперчей методом латеральной компакции с силером AH Plus",
											"treatmentPlan",
										)
									}
								>
									<CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
									<span className="_ccm-item-title">
										Постоянная обтурация (Гуттаперча + AH Plus)
									</span>
								</button>

								<button
									type="button"
									data-testid="visit-view-anesthesia-dosage-btn"
									className="_ccm-action-item"
									onClick={() => {
										appendToEMKField(
											"treatmentPlan",
											`Анестезия зуба ${code}: Sol. Ultracaini D-S 1:200 000 — 1.7 мл (1 карпула). Аспирационная проба отрицательная.`,
										);
										showToast(
											`Анестезия зуба ${code} внесена в протокол`,
											"success",
											2500,
										);
										closeClinicalModal();
									}}
								>
									<Syringe className="w-3.5 h-3.5 text-sky-500 shrink-0" />
									<span className="_ccm-item-title">
										Анестезия зуба {code} (1 карп.)
									</span>
								</button>
							</div>
						</div>
					)}

					{/* ── TAB 4: ОРТОПЕДИЯ & ХИРУРГИЯ ── */}
					{activeTab === "surgery" && (
						<div className="_ccm-pane-section">
							<div className="_ccm-sub-label">Ортопедия (CAD/CAM & Лаборатория)</div>
							<div className="_ccm-items-grid">
								<button
									type="button"
									className="_ccm-action-item"
									onClick={() => {
										setLabOrderModalToothNumber(
											selectedToothForMenu?.code,
										);
										setIsLabOrderModalOpen(true);
										closeClinicalModal();
									}}
								>
									<FileCheck2 className="w-3.5 h-3.5 text-[var(--teal)] shrink-0" />
									<span className="_ccm-item-title font-semibold">
										1-Клик: Наряд в ЗТЛ (CAD/CAM коронка ZrO2 / E.max)
									</span>
									<ChevronRight className="w-3.5 h-3.5 text-[var(--muted)] ml-auto" />
								</button>

								<button
									type="button"
									className="_ccm-action-item"
									onClick={() => {
										handleSelectDiagnosis(
											"done",
											`установлена и зафиксирована металлокерамическая / диоксид циркония коронка`,
											"treatmentPlan",
										);
										closeClinicalModal();
									}}
								>
									<Crown className="w-3.5 h-3.5 text-amber-500 shrink-0" />
									<span className="_ccm-item-title">
										Коронка зафиксирована на цемент
									</span>
								</button>

								<button
									type="button"
									className="_ccm-action-item"
									onClick={() => {
										handleSelectDiagnosis(
											"done",
											`установлен керамический винир IPS e.max Press с адгезивной фиксацией`,
											"treatmentPlan",
										);
										closeClinicalModal();
									}}
								>
									<Sparkles className="w-3.5 h-3.5 text-[var(--teal)] shrink-0" />
									<span className="_ccm-item-title">
										Керамический винир E.max зафиксирован
									</span>
								</button>
							</div>

							<div className="_ccm-sub-label">Хирургия & Имплантация</div>
							<div className="_ccm-items-grid">
								<button
									type="button"
									className="_ccm-action-item"
									onClick={() =>
										handleSelectDiagnosis(
											"treatment",
											"удаление зуба: анестезия, синдесмотомия, экстракция, кюретаж лунки",
											"treatmentPlan",
										)
									}
								>
									<Scissors className="w-3.5 h-3.5 text-red-500 shrink-0" />
									<span className="_ccm-item-title">
										Удаление зуба (синдесмотомия, экстракция)
									</span>
								</button>

								<button
									type="button"
									className="_ccm-action-item"
									onClick={() => {
										if (
											visitWarnings?.some((w: any) =>
												/бисфосф|bisph/i.test(w.title + w.detail),
											)
										) {
											showToast(
												`Предупреждение: у пациента бисфосфонаты в анамнезе (риск остеонекроза челюсти).`,
												"warning",
											);
										}
										handleSelectDiagnosis(
											"treatment",
											"дентальная имплантация в позиции зуба",
											"treatmentPlan",
										);
										closeClinicalModal();
									}}
								>
									<Anchor className="w-3.5 h-3.5 text-[var(--teal)] shrink-0" />
									<span className="_ccm-item-title">
										Дентальная имплантация
									</span>
								</button>
							</div>
						</div>
					)}
				</div>

				{/* ── 4. STUDIO FOOTER ── */}
				<div className="_ccm-footer">
					<span className="_ccm-footer-hint">
						{selectedSurfaces.length > 0
							? `Выбрана полость: [${selectedSurfaces.join("")}]`
							: `Зуб ${code} · Клинический протокол`}
					</span>
					<button
						type="button"
						onClick={closeClinicalModal}
						className="_ccm-footer-done-btn"
					>
						Готово
					</button>
				</div>
			</div>
		</>,
		document.body,
	);
}
