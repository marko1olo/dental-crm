import React, { useState, useEffect, useMemo } from "react";
import {
	ChevronDown,
	ChevronUp,
	Heart,
	Layers,
	PackageCheck,
	Scan,
	Syringe,
	Wallet,
	X,
} from "lucide-react";
import type { ToothData, ToothState } from "../odontogram/ToothChart";
import { getToothAnatomicalNameRu, getToothFolkAndAnatomicalNameRu } from "../../lib/clinicalProtocols043";
import { ToothSurfacesAndEndoMatrix } from "./ToothSurfacesAndEndoMatrix";
import { ToothSanpinKraftBinding } from "./ToothSanpinKraftBinding";
import { ToothRvgThumbnail } from "./ToothRvgThumbnail";
import { ToothFamilyLoyaltyAccordion } from "./ToothFamilyLoyaltyAccordion";
import { ToothPediatricContext } from "./ToothPediatricContext";
import { calculateAnesthesiaSafety, type AnesthesiaCalculationResult } from "../anesthesia/anesthesiaEngine";
import type { KraftPackageRecord } from "../sanpin/kraft/kraftPackageEngine";
import { showToast } from "../GlobalToast";
import "./ToothContextDrawer.css";

export interface ToothContextDrawerProps {
	readonly isOpen: boolean;
	readonly onClose: () => void;
	readonly toothNumber: number;
	readonly toothData?: ToothData | undefined;
	readonly patient?: {
		readonly id?: string | undefined;
		readonly fullName?: string | undefined;
		readonly ageYears?: number | undefined;
		readonly weightKg?: number | undefined;
		readonly hasCardioRisk?: boolean | undefined;
		readonly hasSulfiteAllergy?: boolean | undefined;
		readonly hasAsthma?: boolean | undefined;
		readonly isPregnant?: boolean | undefined;
	} | undefined;
	readonly doctorName?: string | undefined;
	readonly onUpdateTooth?: ((num: number, updates: Partial<ToothData>) => void) | undefined;
	readonly onApplyAnesthesia?: ((diaryText: string, result: AnesthesiaCalculationResult) => void) | undefined;
	readonly onInsertToProtocol?: ((text: string) => void) | undefined;
	readonly onBindKraftPackage?: ((pkg: KraftPackageRecord) => void) | undefined;
	readonly onOpenFullRadiology?: ((toothNumber: number) => void) | undefined;
	readonly onOpenFamilyBilling?: (() => void) | undefined;
	readonly onOpenParentMemo?: (() => void) | undefined;
}

export type WarmAccordionSection =
	| "surfaces_endo"
	| "anesthesia"
	| "kraft_sanpin"
	| "rvg_xray"
	| "family_loyalty"
	| "pediatric";

export interface ToothExpressAnesthesiaOption {
	readonly id: string;
	readonly title: string;
	readonly subtitle: string;
	readonly tag: string;
	readonly badgeClass: string;
	readonly buildDiaryText: (toothNumber: number) => string;
}

export const TOOTH_EXPRESS_ANESTHESIA_OPTIONS: readonly ToothExpressAnesthesiaOption[] = [
	{
		id: "articaine_1_100k",
		title: "Артикаин 1:100 000 (1 карп. 1.7 мл)",
		subtitle: "Инфильтрация/проводниковая, эпинефрин 1:100 000, аспирация (-)",
		tag: "Стандарт",
		badgeClass: "text-blue-500 bg-blue-500/10 border-blue-500/30",
		buildDiaryText: (tooth) =>
			`Анестезия зуба ${tooth}: инфильтрационная/проводниковая Sol. Articaini 4% с эпинефрином 1:100 000 — 1.7 мл (1 карпула). Аспирационная проба отрицательная. Обезболивание глубокое, аллергических реакций нет.`,
	},
	{
		id: "ultracain_1_200k",
		title: "Ультракаин Д-С 1:200 000 (1 карп.)",
		subtitle: "Sol. Ultracaini D-S, мягкий эпинефрин 1:200 000, аспирация (-)",
		tag: "Терапия",
		badgeClass: "text-teal-500 bg-teal-500/10 border-teal-500/30",
		buildDiaryText: (tooth) =>
			`Анестезия зуба ${tooth}: инфильтрационная Sol. Ultracaini D-S 1:200 000 — 1.7 мл (1 карпула). Аспирационная проба отрицательная. Обезболивание глубокое.`,
	},
	{
		id: "scandonest_cardio",
		title: "Скандонест 3% для кардио (1 карп.)",
		subtitle: "Мепивакаин 3% БЕЗ адреналина (кардио-риск, гипертония, пожилые)",
		tag: "Кардио",
		badgeClass: "text-amber-500 bg-amber-500/10 border-amber-500/30",
		buildDiaryText: (tooth) =>
			`Анестезия зуба ${tooth}: Sol. Scandonest 3% (Мепивакаин без вазоконстриктора) — 1.7 мл (1 карпула). Кардио-протокол. Аспирационная проба отрицательная. Гемодинамика стабильна.`,
	},
	{
		id: "septanest_1_100k",
		title: "Септанест 1.7 мл",
		subtitle: "Sol. Septanest 1:100 000 (Артикаин 4% с адреналином), аспирация (-)",
		tag: "Хирургия",
		badgeClass: "text-purple-500 bg-purple-500/10 border-purple-500/30",
		buildDiaryText: (tooth) =>
			`Анестезия зуба ${tooth}: инфильтрационная Sol. Septanest 1:100 000 — 1.7 мл (1 карпула). Аспирационная проба отрицательная. Обезболивание глубокое.`,
	},
	{
		id: "topical_application",
		title: "Аппликационная анестезия (гель)",
		subtitle: "Лидоксор / Дисилан 20% гель на десну, экспозиция 2 мин",
		tag: "Поверхностная",
		badgeClass: "text-emerald-500 bg-emerald-500/10 border-emerald-500/30",
		buildDiaryText: (tooth) =>
			`Анестезия зуба ${tooth}: аппликационная анестезия переходной складки гелем (Лидоксор / Дисилан 20%), экспозиция 2 мин. Обезболивание места вкола иглы достигнуто.`,
	},
];

export const ToothContextDrawer: React.FC<ToothContextDrawerProps> = ({
	isOpen,
	onClose,
	toothNumber,
	toothData,
	patient,
	doctorName = "Лечащий врач-стоматолог",
	onUpdateTooth,
	onApplyAnesthesia,
	onInsertToProtocol,
	onBindKraftPackage,
	onOpenFullRadiology,
	onOpenFamilyBilling,
	onOpenParentMemo,
}) => {
	const isPediatricTooth = (toothNumber >= 51 && toothNumber <= 85) || (patient?.ageYears !== undefined && patient.ageYears < 14);

	// Default open section
	const [activeSection, setActiveSection] = useState<WarmAccordionSection>("surfaces_endo");

	// Auto-expand pediatric tab for primary teeth
	useEffect(() => {
		if (isPediatricTooth) {
			setActiveSection("surfaces_endo");
		}
	}, [isPediatricTooth, toothNumber]);

	// ESC to close drawer
	useEffect(() => {
		if (!isOpen) return;
		const handleKeyDown = (e: KeyboardEvent) => {
			if (e.key === "Escape") {
				onClose();
			}
		};
		window.addEventListener("keydown", handleKeyDown);
		return () => window.removeEventListener("keydown", handleKeyDown);
	}, [isOpen, onClose]);

	const anatomicalName = useMemo(() => {
		return getToothAnatomicalNameRu(toothNumber);
	}, [toothNumber]);

	const folkAndAnatomical = useMemo(() => {
		return getToothFolkAndAnatomicalNameRu(toothNumber);
	}, [toothNumber]);

	if (!isOpen) return null;

	const toggleSection = (section: WarmAccordionSection) => {
		setActiveSection((prev) => (prev === section ? ("" as WarmAccordionSection) : section));
	};

	return (
		<div className="dente-tooth-drawer-backdrop" onClick={onClose}>
			<aside
				className="dente-tooth-drawer-container"
				onClick={(e) => e.stopPropagation()}
				role="dialog"
				aria-label={`Контекстные инструменты зуба #${toothNumber}`}
				data-testid="tooth-context-drawer"
			>
				{/* Top Drawer Header */}
				<header className="dente-tooth-drawer-header">
					<div className="dente-drawer-header-left">
						<div className="dente-tooth-fdi-badge">
							<span className="fdi-label">FDI</span>
							<span className="fdi-num">{toothNumber}</span>
						</div>
						<div className="dente-tooth-title-block">
							<div className="dente-tooth-title-row">
								<h2 className="dente-tooth-title">{anatomicalName}</h2>
								<span className={`dente-tooth-state-pill state-${(toothData?.state ?? "Healthy").toLowerCase()}`}>
									{toothData?.state ?? "Healthy"}
								</span>
							</div>
							<p className="dente-tooth-folk-name">{folkAndAnatomical}</p>
						</div>
					</div>

					<button
						type="button"
						onClick={onClose}
						className="dente-drawer-close-btn"
						title="Закрыть (Esc)"
						aria-label="Закрыть контекстную шторку зуба"
						data-testid="tooth-drawer-close-btn"
					>
						<X size={20} />
					</button>
				</header>

				{/* Quick Context Summary Nav Strip */}
				<nav className="dente-drawer-quick-tabs" aria-label="Разделы клинического контекста">
					<button
						type="button"
						onClick={() => setActiveSection("surfaces_endo")}
						className={`dente-quick-tab-btn ${activeSection === "surfaces_endo" ? "active" : ""}`}
					>
						<Layers size={14} />
						<span>1. MOD & Каналы</span>
					</button>

					<button
						type="button"
						onClick={() => setActiveSection("anesthesia")}
						className={`dente-quick-tab-btn ${activeSection === "anesthesia" ? "active" : ""}`}
					>
						<Syringe size={14} />
						<span>2. Анестезия</span>
					</button>

					<button
						type="button"
						onClick={() => setActiveSection("kraft_sanpin")}
						className={`dente-quick-tab-btn ${activeSection === "kraft_sanpin" ? "active" : ""}`}
					>
						<PackageCheck size={14} />
						<span>3. Крафт СанПиН</span>
					</button>

					<button
						type="button"
						onClick={() => setActiveSection("rvg_xray")}
						className={`dente-quick-tab-btn ${activeSection === "rvg_xray" ? "active" : ""}`}
					>
						<Scan size={14} />
						<span>4. Снимок RVG</span>
					</button>

					<button
						type="button"
						onClick={() => setActiveSection("family_loyalty")}
						className={`dente-quick-tab-btn ${activeSection === "family_loyalty" ? "active" : ""}`}
					>
						<Wallet size={14} />
						<span>5. Депозит & Бонусы</span>
					</button>

					{isPediatricTooth && (
						<button
							type="button"
							onClick={() => setActiveSection("pediatric")}
							className={`dente-quick-tab-btn pediatric ${activeSection === "pediatric" ? "active" : ""}`}
						>
							<Heart size={14} />
							<span>6. Детский (Франкл)</span>
						</button>
					)}
				</nav>

				{/* Main Scrollable Drawer Content (Depth <= 1) */}
				<div className="dente-tooth-drawer-body">
					{/* ACCORDION 1: MOD 5-SURFACE & ROOT CANAL MATRIX */}
					<section className="dente-accordion-item">
						<button
							type="button"
							onClick={() => toggleSection("surfaces_endo")}
							className={`dente-accordion-trigger ${activeSection === "surfaces_endo" ? "expanded" : ""}`}
						>
							<div className="trigger-left">
								<Layers size={16} color="var(--brand-primary, var(--teal))" />
								<span className="trigger-title">1. Анатомия поверхностей (MOD) & Эндодонтия</span>
							</div>
							<div className="trigger-right">
								<span className="trigger-summary">
									Поверхности: {toothData?.surfaces?.length ? toothData.surfaces.join("") : "Интактно"}
								</span>
								{activeSection === "surfaces_endo" ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
							</div>
						</button>

						{activeSection === "surfaces_endo" && (
							<div className="dente-accordion-content animate-in">
								<ToothSurfacesAndEndoMatrix
									toothNumber={toothNumber}
									toothData={toothData}
									onUpdateTooth={(updates) => onUpdateTooth?.(toothNumber, updates)}
									onInsertToProtocol={onInsertToProtocol}
								/>
							</div>
						)}
					</section>

					{/* ACCORDION 2: 1-CLICK EXPRESS LOCAL ANESTHESIA PRESETS */}
					<section className="dente-accordion-item">
						<button
							type="button"
							onClick={() => toggleSection("anesthesia")}
							className={`dente-accordion-trigger ${activeSection === "anesthesia" ? "expanded" : ""}`}
						>
							<div className="trigger-left">
								<Syringe size={16} color="var(--brand-primary, var(--teal))" />
								<span className="trigger-title">2. Экспресс-анестезия (1 клик)</span>
							</div>
							<div className="trigger-right">
								<span className="trigger-summary">
									Артикаин • Ультракаин • Скандонест • Септанест
								</span>
								{activeSection === "anesthesia" ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
							</div>
						</button>

						{activeSection === "anesthesia" && (
							<div className="dente-accordion-content animate-in p-3 flex flex-col gap-2">
								<div className="flex items-center justify-between text-xs text-[var(--muted)] px-0.5">
									<span>Быстрый выбор анестетика в 1 клик (без ввода веса и калькуляторов):</span>
									<span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400">1 клик • норма</span>
								</div>
								<div className="flex flex-col gap-1.5" data-testid="tooth-express-anesthesia-list">
									{TOOTH_EXPRESS_ANESTHESIA_OPTIONS.map((preset) => (
										<button
											key={preset.id}
											type="button"
											onClick={() => {
												const diaryText = preset.buildDiaryText(toothNumber);
												onInsertToProtocol?.(diaryText);
												if (onApplyAnesthesia) {
													const calc = calculateAnesthesiaSafety({
														drugId: preset.id === "scandonest_cardio" ? "mepivacaine_plain" : "articaine_1_100k",
														carpulesCount: 1,
														patientWeightKg: patient?.weightKg ?? 70,
														patientAgeYears: patient?.ageYears ?? 35,
														asaStatus: Boolean(patient?.hasCardioRisk) ? "asa_3" : "asa_1",
														hasCardiovascularRisk: Boolean(patient?.hasCardioRisk),
														hasSulfiteAllergy: Boolean(patient?.hasSulfiteAllergy),
														isPregnantOrLactating: Boolean(patient?.isPregnant),
														hasBronchialAsthma: Boolean(patient?.hasAsthma),
														techniqueId: "infiltration",
														needleType: "g30_short_21mm",
														aspirationNegativeConfirmed: true,
														targetToothNumberFdi: toothNumber,
													});
													onApplyAnesthesia(diaryText, calc);
												}
												showToast(`Анестезия (${preset.title}) внесена в протокол`, "success", 2500);
											}}
											className="w-full text-left p-2.5 rounded-xl border border-[var(--line)] bg-[var(--paper)] hover:border-[var(--teal)] hover:bg-[var(--line)]/20 transition-all flex items-center justify-between gap-3 min-h-[48px] cursor-pointer group"
											data-testid={`btn-tooth-anes-${preset.id}`}
											title={`${preset.title} — ${preset.subtitle}`}
										>
											<div className="flex items-center gap-2.5 min-w-0">
												<div className={`p-1.5 rounded-lg shrink-0 border ${preset.badgeClass}`}>
													<Syringe className="w-4 h-4" />
												</div>
												<div className="min-w-0">
													<div className="text-xs font-bold text-[var(--ink)] group-hover:text-[var(--teal)] transition-colors truncate">
														{preset.title}
													</div>
													<div className="text-[11px] text-[var(--muted)] truncate mt-0.5">
														{preset.subtitle}
													</div>
												</div>
											</div>
											<span className="px-2 py-0.5 rounded-md text-[10px] font-extrabold tracking-wide uppercase shrink-0 bg-[var(--line)]/50 text-[var(--muted)] group-hover:bg-[var(--teal-surface)] group-hover:text-[var(--teal)] transition-colors">
												{preset.tag}
											</span>
										</button>
									))}
								</div>
							</div>
						)}
					</section>

					{/* ACCORDION 3: 1-CLICK KRAFT PACKAGE BINDING */}
					<section className="dente-accordion-item">
						<button
							type="button"
							onClick={() => toggleSection("kraft_sanpin")}
							className={`dente-accordion-trigger ${activeSection === "kraft_sanpin" ? "expanded" : ""}`}
						>
							<div className="trigger-left">
								<PackageCheck size={16} color="var(--brand-primary, var(--teal))" />
								<span className="trigger-title">3. Привязка крафт-пакета автоклава СанПиН</span>
							</div>
							<div className="trigger-right">
								<span className="trigger-summary">Автоклав ЦСО • Стерильно</span>
								{activeSection === "kraft_sanpin" ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
							</div>
						</button>

						{activeSection === "kraft_sanpin" && (
							<div className="dente-accordion-content animate-in">
								<ToothSanpinKraftBinding
									toothNumber={toothNumber}
									onBindPackage={onBindKraftPackage}
									onInsertToProtocol={onInsertToProtocol}
								/>
							</div>
						)}
					</section>

					{/* ACCORDION 4: 200x200 RVG X-RAY THUMBNAIL */}
					<section className="dente-accordion-item">
						<button
							type="button"
							onClick={() => toggleSection("rvg_xray")}
							className={`dente-accordion-trigger ${activeSection === "rvg_xray" ? "expanded" : ""}`}
						>
							<div className="trigger-left">
								<Scan size={16} color="var(--brand-primary, var(--teal))" />
								<span className="trigger-title">4. Прицельный снимок визиографа (200×200 RVG)</span>
							</div>
							<div className="trigger-right">
								<span className="trigger-summary">Периапикальный контроль</span>
								{activeSection === "rvg_xray" ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
							</div>
						</button>

						{activeSection === "rvg_xray" && (
							<div className="dente-accordion-content animate-in">
								<ToothRvgThumbnail
									toothNumber={toothNumber}
									patientId={patient?.id}
									onOpenFullRadiology={onOpenFullRadiology}
									onInsertToProtocol={onInsertToProtocol}
								/>
							</div>
						)}
					</section>

					{/* ACCORDION 5: FAMILY DEPOSIT & LOYALTY SPLIT */}
					<section className="dente-accordion-item">
						<button
							type="button"
							onClick={() => toggleSection("family_loyalty")}
							className={`dente-accordion-trigger ${activeSection === "family_loyalty" ? "expanded" : ""}`}
						>
							<div className="trigger-left">
								<Wallet size={16} color="var(--brand-primary, var(--teal))" />
								<span className="trigger-title">5. Семейный депозит & Кешбэк (Сплит 54-ФЗ)</span>
							</div>
							<div className="trigger-right">
								<span className="trigger-summary">Единый счет семьи</span>
								{activeSection === "family_loyalty" ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
							</div>
						</button>

						{activeSection === "family_loyalty" && (
							<div className="dente-accordion-content animate-in">
								<ToothFamilyLoyaltyAccordion
									toothNumber={toothNumber}
									patientId={patient?.id}
									patientName={patient?.fullName}
									onOpenFullFamilyBilling={onOpenFamilyBilling}
								/>
							</div>
						)}
					</section>

					{/* ACCORDION 6: PEDIATRIC CONTEXT & FRANKL RATING */}
					{isPediatricTooth && (
						<section className="dente-accordion-item">
							<button
								type="button"
								onClick={() => toggleSection("pediatric")}
								className={`dente-accordion-trigger ${activeSection === "pediatric" ? "expanded" : ""}`}
							>
								<div className="trigger-left">
									<Heart size={16} color="#ec4899" />
									<span className="trigger-title">6. Детский прием (Шкала Франкла & Резорбция)</span>
								</div>
								<div className="trigger-right">
									<span className="trigger-summary">Психологическая адаптация</span>
									{activeSection === "pediatric" ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
								</div>
							</button>

							{activeSection === "pediatric" && (
								<div className="dente-accordion-content animate-in">
									<ToothPediatricContext
										toothNumber={toothNumber}
										toothData={toothData}
										patientName={patient?.fullName}
										patientAgeYears={patient?.ageYears ?? 6}
										doctorName={doctorName}
										onUpdateTooth={(updates) => onUpdateTooth?.(toothNumber, updates)}
										onInsertToProtocol={onInsertToProtocol}
										onOpenParentMemo={onOpenParentMemo}
									/>
								</div>
							)}
						</section>
					)}
				</div>

				{/* Bottom Drawer Action Footer */}
				<footer className="dente-tooth-drawer-footer">
					<div className="footer-left">
						<span className="status-note">
							Зуб #{toothNumber} • {toothData?.state ?? "Healthy"}
						</span>
					</div>
					<div className="footer-actions">
						<button
							type="button"
							onClick={onClose}
							className="dente-drawer-btn-secondary"
						>
							Закрыть
						</button>
					</div>
				</footer>
			</aside>
		</div>
	);
};

export default ToothContextDrawer;
