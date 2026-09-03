import React, { useState, useEffect, useMemo } from "react";
import {
	Activity,
	AlertTriangle,
	ArrowRight,
	Camera,
	Check,
	ChevronDown,
	ChevronRight,
	ChevronUp,
	FileText,
	Heart,
	Layers,
	PackageCheck,
	Scan,
	Sparkles,
	Syringe,
	Wallet,
	Wrench,
	X,
} from "lucide-react";
import type { ToothData, ToothState } from "../odontogram/ToothChart";
import { getToothAnatomicalNameRu, getToothFolkAndAnatomicalNameRu } from "../../lib/clinicalProtocols043";
import { ToothSurfacesAndEndoMatrix } from "./ToothSurfacesAndEndoMatrix";
import { ToothAnesthesiaCalculator } from "./ToothAnesthesiaCalculator";
import { ToothSanpinKraftBinding } from "./ToothSanpinKraftBinding";
import { ToothRvgThumbnail } from "./ToothRvgThumbnail";
import { ToothFamilyLoyaltyAccordion } from "./ToothFamilyLoyaltyAccordion";
import { ToothPediatricContext } from "./ToothPediatricContext";
import type { AnesthesiaCalculationResult } from "../anesthesia/anesthesiaEngine";
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
	readonly onOpenImplantProtocol?: ((toothNumber: number) => void) | undefined;
}

export type WarmAccordionSection =
	| "surfaces_endo"
	| "anesthesia"
	| "kraft_sanpin"
	| "rvg_xray"
	| "family_loyalty"
	| "pediatric"
	| "implant_isq";

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
	onOpenImplantProtocol,
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

					<button
						type="button"
						onClick={() => setActiveSection("implant_isq")}
						className={`dente-quick-tab-btn ${activeSection === "implant_isq" ? "active" : ""}`}
					>
						<Activity size={14} />
						<span>6. Имплантация ISQ</span>
					</button>

					{isPediatricTooth && (
						<button
							type="button"
							onClick={() => setActiveSection("pediatric")}
							className={`dente-quick-tab-btn pediatric ${activeSection === "pediatric" ? "active" : ""}`}
						>
							<Heart size={14} />
							<span>7. Детский (Франкл)</span>
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

					{/* ACCORDION 2: EXPRESS LOCAL ANESTHESIA CALCULATOR */}
					<section className="dente-accordion-item">
						<button
							type="button"
							onClick={() => toggleSection("anesthesia")}
							className={`dente-accordion-trigger ${activeSection === "anesthesia" ? "expanded" : ""}`}
						>
							<div className="trigger-left">
								<Syringe size={16} color="var(--brand-primary, var(--teal))" />
								<span className="trigger-title">2. Экспресс-анестезия по весу пациента (МДД)</span>
							</div>
							<div className="trigger-right">
								<span className="trigger-summary">
									Вес: {patient?.weightKg ?? 70} кг • Артикаин / Скандонест
								</span>
								{activeSection === "anesthesia" ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
							</div>
						</button>

						{activeSection === "anesthesia" && (
							<div className="dente-accordion-content animate-in">
								<ToothAnesthesiaCalculator
									toothNumber={toothNumber}
									initialWeightKg={patient?.weightKg ?? 70}
									initialAgeYears={patient?.ageYears ?? 35}
									hasCardioRisk={patient?.hasCardioRisk}
									hasSulfiteAllergy={patient?.hasSulfiteAllergy}
									hasAsthma={patient?.hasAsthma}
									isPregnant={patient?.isPregnant}
									onApplyAnesthesia={onApplyAnesthesia}
									onInsertToProtocol={onInsertToProtocol}
								/>
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

					{/* ACCORDION: IMPLANT ISQ & TORQUE PROTOCOL */}
					<section className="dente-accordion-item">
						<button
							type="button"
							onClick={() => toggleSection("implant_isq")}
							className={`dente-accordion-trigger ${activeSection === "implant_isq" ? "expanded" : ""}`}
						>
							<div className="trigger-left">
								<Activity size={16} color="var(--brand-500, #3b82f6)" />
								<span className="trigger-title">Имплантация: Торк & Остеоинтеграция RFA ISQ</span>
							</div>
							<div className="trigger-right">
								<span className="trigger-badge info">Osstell / Penguin</span>
								{activeSection === "implant_isq" ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
							</div>
						</button>

						{activeSection === "implant_isq" && (
							<div className="dente-accordion-body p-4 bg-slate-50 dark:bg-zinc-900/60 rounded-b-xl border-t border-slate-200 dark:border-zinc-800 space-y-3">
								<div className="grid grid-cols-2 gap-3 text-xs">
									<div className="p-2.5 rounded-lg bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700">
										<span className="text-slate-500 dark:text-slate-400 block mb-1">Клиническая норма торка:</span>
										<span className="font-bold text-sm text-sky-600 dark:text-sky-400">35 – 40 Н·см</span>
										<span className="text-[11px] text-slate-400 block mt-0.5">Оптимальная первичная стабильность</span>
									</div>
									<div className="p-2.5 rounded-lg bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700">
										<span className="text-slate-500 dark:text-slate-400 block mb-1">RFA ISQ стабильность:</span>
										<span className="font-bold text-sm text-emerald-600 dark:text-emerald-400">70 – 74 ISQ</span>
										<span className="text-[11px] text-emerald-600 dark:text-emerald-400 block mt-0.5">Немедленная нагрузка разрешена</span>
									</div>
								</div>

								<div className="flex flex-wrap gap-2 pt-2">
									<button
										type="button"
										onClick={() => {
											const normSoap =
												`Протокол операции дентальной имплантации (зуб #${toothNumber}): ` +
												`Под местной инфильтрационной анестезией сформировано костное ложе в области зуба ${toothNumber} (кость D2 по Misch). ` +
												`Установлен дентальный имплантат. Первичный торк введения: 38 Н·см. ` +
												`RFA-стабилометрия (Osstell/Penguin): V:72, L:74, M:70, D:71, средний ISQ: 72 (Высокая первичная стабильность). ` +
												`Показатели удовлетворяют критериям немедленной нагрузки (>70 ISQ, торк >= 35 Н·см). Швы мононить 5-0.`;
											if (onInsertToProtocol) {
												onInsertToProtocol(normSoap);
											}
											try {
												window.dispatchEvent(
													new CustomEvent("dente-apply-soap-protocol", {
														detail: {
															soap: { treatmentDescription: normSoap },
															mode: "smart_append",
														},
													}),
												);
											} catch {
												// safe
											}
											showToast("Клиническая норма имплантации (Торк 38 Н·см, ISQ 72) внесена в карту 043/у", "success");
										}}
										className="min-h-[44px] flex-1 px-3 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white flex items-center justify-center gap-1.5 transition-all shadow-xs cursor-pointer"
										title="Вставить протокол клинической нормы имплантации в дневник 043/у"
										data-testid="drawer-implant-norm-043u-btn"
									>
										<Sparkles size={15} />
										<span>Вставить норму в 043/у (1 клик)</span>
									</button>

									<button
										type="button"
										onClick={() => {
											if (onOpenImplantProtocol) {
												onOpenImplantProtocol(toothNumber);
											} else {
												try {
													window.dispatchEvent(
														new CustomEvent("dente-open-implant-isq-modal", {
															detail: { toothNumber },
														}),
													);
												} catch {
													// safe
												}
											}
											onClose();
										}}
										className="min-h-[44px] flex-1 px-3 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white flex items-center justify-center gap-1.5 transition-all shadow-xs cursor-pointer"
										title="Открыть расширенный протокол ISQ & Торк остеоинтеграции"
										data-testid="drawer-implant-full-protocol-btn"
									>
										<Activity size={15} />
										<span>Полный протокол ISQ & Торк</span>
									</button>
								</div>
							</div>
						)}
					</section>
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
