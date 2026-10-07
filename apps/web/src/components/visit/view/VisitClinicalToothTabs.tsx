import React from "react";
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
	Plus,
	Receipt,
	Scissors,
	Sparkles,
	Syringe,
	X,
	XCircle,
	Zap,
} from "lucide-react";
import {
	TOOTH_804N_PRESETS,
	type ToothClinicalServicePayload,
} from "@dental/shared";
import { useVisitStore } from "../../../store/visitStore";
import { showToast } from "../../GlobalToast";
import { formatCompletedServiceLine } from "../completedServicesPlan";

export type ClinicalTabType = "diagnosis" | "therapy" | "endo" | "surgery";

export interface VisitClinicalToothTabsProps {
	activeTab: ClinicalTabType;
	// biome-ignore lint/suspicious/noExplicitAny: selection
	selectedToothForMenu: any;
	code: string;
	state: string;
	materialCategory: string | null;
	setMaterialCategory: (v: string | null) => void;
	selectedSurfaces: string[];
	handleSelectDiagnosis: (state: string, text?: string, field?: string) => void;
	appendToEMKField: (field: string, text: string) => void;
	closeClinicalModal: () => void;
	setEndoModalToothNumber: (v: number | null) => void;
	setEndoModalToothState: (v: string) => void;
	setIsEndoModalOpen: (v: boolean) => void;
	setLabOrderModalToothNumber: (v: string | undefined) => void;
	setIsLabOrderModalOpen: (v: boolean) => void;
	// biome-ignore lint/suspicious/noExplicitAny: warnings
	visitWarnings?: any[] | undefined;
	onAddServiceToTooth?: ((service: ToothClinicalServicePayload) => void) | undefined;
}

export function VisitClinicalToothTabs({
	activeTab,
	selectedToothForMenu,
	code,
	state,
	materialCategory,
	setMaterialCategory,
	selectedSurfaces,
	handleSelectDiagnosis,
	appendToEMKField,
	closeClinicalModal,
	setEndoModalToothNumber,
	setEndoModalToothState,
	setIsEndoModalOpen,
	setLabOrderModalToothNumber,
	setIsLabOrderModalOpen,
	visitWarnings,
	onAddServiceToTooth,
}: VisitClinicalToothTabsProps) {
	const completedServices = useVisitStore((s) => s.completedServices);
	const removeCompletedService = useVisitStore((s) => s.removeCompletedService);

	const toothServices = (completedServices || []).filter(
		(s) => String(s.toothCode || s.toothNumber) === String(code),
	);
	const toothTotalRub = toothServices.reduce(
		(sum, s) => sum + (s.priceRub || 0) * (s.quantity || 1),
		0,
	);

	const handleAdd804nService = (preset: {
		serviceId: string;
		code804n: string;
		name: string;
		priceRub: number;
		priceKopecks?: number;
		quantity?: number;
		category?: string;
	}) => {
		const toothNum = Number.parseInt(code, 10) || undefined;
		const payload: ToothClinicalServicePayload = {
			serviceId: preset.serviceId,
			code804n: preset.code804n,
			name: preset.name,
			priceRub: preset.priceRub,
			priceKopecks: preset.priceKopecks ?? Math.round(preset.priceRub * 100),
			quantity: preset.quantity || 1,
			category: preset.category,
			toothNumber: toothNum,
			toothCode: code,
		};

		useVisitStore.getState().addCompletedService(payload);
		useVisitStore.getState().applyServicesToToothState({
			toothNumber: toothNum,
			toothCode: code,
			services: [
				{
					code804n: payload.code804n,
					title: payload.name,
					price: payload.priceRub,
					toothNumber: toothNum,
					toothCode: code,
				},
			],
		});

		try {
			if (typeof window !== "undefined") {
				window.dispatchEvent(
					new CustomEvent("dente-add-services-to-invoice", {
						detail: {
							services: [
								{
									code: payload.code804n,
									code804n: payload.code804n,
									title: payload.name,
									name: payload.name,
									price: payload.priceRub,
									unitPriceRub: payload.priceRub,
									quantity: payload.quantity,
									toothNumber: toothNum,
									toothCode: code,
								},
							],
							toothNumber: toothNum,
							toothCode: code,
							source: "chairside_tooth_tabs",
						},
					}),
				);
			}
		} catch (err) {
			console.warn("dente-add-services-to-invoice dispatch error:", err);
		}

		appendToEMKField(
			"treatmentPlan",
			formatCompletedServiceLine({
				code804n: payload.code804n,
				title: payload.name,
				priceRub: payload.priceRub,
				toothCode: code,
			}),
		);

		showToast(
			`[${payload.code804n}] ${payload.name} (зуб ${code}) добавлена в счёт`,
			"success",
			3000,
		);

		onAddServiceToTooth?.(payload);
	};

	return (
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

					<div className="_ccm-sub-label">Клинические пакеты услуг</div>
					<div className="_ccm-items-grid">
						{[
							{
								testId: "preset-caries-filling",
								icon: Sparkles,
								iconColor: "text-[var(--teal)]",
								title: "Кариес + Пломба",
								meta: "A16.07.002.010 · 4 500 ₽",
								action: () => {
									const cavityNote = selectedSurfaces.length > 0 ? ` [${selectedSurfaces.join("")}]` : "";
									handleSelectDiagnosis("done", `K02.1 Кариес дентина${cavityNote}: пломба световая`, "diagnosis");
									handleAdd804nService(TOOTH_804N_PRESETS.cariesFilling);
								},
							},
							{
								testId: "preset-pulpitis-endo",
								icon: Zap,
								iconColor: "text-amber-500",
								title: "Пульпит + Каналы + Пломба",
								meta: "A16.07.030 + A16.07.002.010 · 8 000 ₽",
								action: () => {
									handleSelectDiagnosis("treatment", "K04.0 Острый пульпит: эндодонтия 1-й этап + пломба", "diagnosis");
									handleAdd804nService(TOOTH_804N_PRESETS.endoCanals);
									handleAdd804nService(TOOTH_804N_PRESETS.cariesFilling);
								},
							},
							{
								testId: "preset-crown-zirconia",
								icon: Crown,
								iconColor: "text-amber-500",
								title: "Коронка цирконий / МК",
								meta: "A16.07.004 · 24 000 ₽",
								action: () => {
									handleSelectDiagnosis("done", "K08.2 Коронка диоксид циркония / металлокерамика", "diagnosis");
									handleAdd804nService(TOOTH_804N_PRESETS.crownZirconia);
								},
							},
							{
								testId: "preset-extraction",
								icon: Scissors,
								iconColor: "text-red-500",
								title: "Удаление постоянного зуба",
								meta: "A16.07.001 · 3 500 ₽",
								action: () => {
									handleSelectDiagnosis("missing", "K08.1 Удаление постоянного зуба", "diagnosis");
									handleAdd804nService(TOOTH_804N_PRESETS.extractionPermanent);
								},
							},
						].map((item) => (
							<button
								key={item.title}
								type="button"
								data-testid={item.testId}
								className="_ccm-action-item highlight"
								onClick={item.action}
							>
								<item.icon className={`w-3.5 h-3.5 ${item.iconColor} shrink-0`} />
								<div className="flex flex-col text-left truncate">
									<span className="_ccm-item-title font-semibold">{item.title}</span>
									<span className="text-[10px] text-[var(--muted)] font-mono">{item.meta}</span>
								</div>
								<Plus className={`w-3.5 h-3.5 ${item.iconColor} ml-auto shrink-0`} />
							</button>
						))}
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
								{[
									{ name: "Световой композит Filtek Z250 / Gradia", desc: "композит Filtek Z250 / Gradia Direct" },
									{ name: "Нанокомпозит Ceram.x Spectra ST", desc: "эстетический нанокомпозит Ceram.x Spectra ST" },
									{ name: "Премиум Estelite Asteria Tokuyama", desc: "высокоэстетическая пломба Estelite Asteria Tokuyama" },
								].map((mat) => (
									<button
										key={mat.name}
										type="button"
										className="_ccm-action-item"
										onClick={() => {
											const cavityNote = selectedSurfaces.length > 0 ? ` (полость ${selectedSurfaces.join("")})` : "";
											handleSelectDiagnosis("done", `установлена пломба${cavityNote} (${mat.desc}), полировка`, "treatmentPlan");
											handleAdd804nService(TOOTH_804N_PRESETS.cariesFilling);
											setMaterialCategory(null);
										}}
									>
										<Sparkles className="w-3.5 h-3.5 text-[var(--teal)] shrink-0" />
										<span className="_ccm-item-title">{mat.name}{selectedSurfaces.length > 0 ? ` [${selectedSurfaces.join("")}]` : ""}</span>
										<ChevronRight className="w-3.5 h-3.5 text-[var(--muted)] ml-auto" />
									</button>
								))}
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
								data-testid="preset-therapy-filling"
								className="_ccm-action-item highlight"
								onClick={() => handleAdd804nService(TOOTH_804N_PRESETS.cariesFilling)}
							>
								<Sparkles className="w-3.5 h-3.5 text-[var(--teal)] shrink-0" />
								<div className="flex flex-col text-left truncate">
									<span className="_ccm-item-title font-semibold">+ Пломба световая</span>
									<span className="text-[10px] text-[var(--muted)] font-mono">A16.07.002.010 · 4 500 ₽</span>
								</div>
								<Plus className="w-3.5 h-3.5 text-[var(--teal)] ml-auto shrink-0" />
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
									handleAdd804nService(TOOTH_804N_PRESETS.anesthesiaInfiltration);
								}}
							>
								<Syringe className="w-3.5 h-3.5 text-sky-500 shrink-0" />
								<div className="flex flex-col text-left truncate">
									<span className="_ccm-item-title font-semibold">Анестезия зуба {code} (1 карп.)</span>
									<span className="text-[10px] text-[var(--muted)] font-mono">A11.07.012 · 1 200 ₽</span>
								</div>
								<Plus className="w-3.5 h-3.5 text-sky-500 ml-auto shrink-0" />
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
							data-testid="preset-endo-canals"
							className="_ccm-action-item highlight"
							onClick={() => handleAdd804nService(TOOTH_804N_PRESETS.endoCanals)}
						>
							<Zap className="w-3.5 h-3.5 text-amber-500 shrink-0" />
							<div className="flex flex-col text-left truncate">
								<span className="_ccm-item-title font-semibold">+ Лечение каналов</span>
								<span className="text-[10px] text-[var(--muted)] font-mono">A16.07.030 · 3 500 ₽</span>
							</div>
							<Plus className="w-3.5 h-3.5 text-amber-500 ml-auto shrink-0" />
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
								handleAdd804nService(TOOTH_804N_PRESETS.anesthesiaInfiltration);
							}}
						>
							<Syringe className="w-3.5 h-3.5 text-sky-500 shrink-0" />
							<div className="flex flex-col text-left truncate">
								<span className="_ccm-item-title">Анестезия зуба {code} (1 карп.)</span>
								<span className="text-[10px] text-[var(--muted)] font-mono">A11.07.012 · 1 200 ₽</span>
							</div>
							<Plus className="w-3.5 h-3.5 text-sky-500 ml-auto shrink-0" />
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
								Наряд в ЗТЛ (CAD/CAM коронка ZrO2 / E.max)
							</span>
							<ChevronRight className="w-3.5 h-3.5 text-[var(--muted)] ml-auto" />
						</button>

						<button
							type="button"
							data-testid="preset-surgery-crown"
							className="_ccm-action-item highlight"
							onClick={() => {
								handleSelectDiagnosis(
									"done",
									"установлена и зафиксирована металлокерамическая / диоксид циркония коронка",
									"treatmentPlan",
								);
								handleAdd804nService(TOOTH_804N_PRESETS.crownZirconia);
								closeClinicalModal();
							}}
						>
							<Crown className="w-3.5 h-3.5 text-amber-500 shrink-0" />
							<div className="flex flex-col text-left truncate">
								<span className="_ccm-item-title font-semibold">+ Коронка цирконий / МК</span>
								<span className="text-[10px] text-[var(--muted)] font-mono">A16.07.004 · 24 000 ₽</span>
							</div>
							<Plus className="w-3.5 h-3.5 text-amber-500 ml-auto shrink-0" />
						</button>

						<button
							type="button"
							className="_ccm-action-item"
							onClick={() => {
								handleSelectDiagnosis(
									"done",
									"установлен керамический винир IPS e.max Press с адгезивной фиксацией",
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
							data-testid="preset-surgery-extraction"
							className="_ccm-action-item highlight"
							onClick={() => {
								handleSelectDiagnosis(
									"treatment",
									"удаление зуба: анестезия, синдесмотомия, экстракция, кюретаж лунки",
									"treatmentPlan",
								);
								handleAdd804nService(TOOTH_804N_PRESETS.extractionPermanent);
							}}
						>
							<Scissors className="w-3.5 h-3.5 text-red-500 shrink-0" />
							<div className="flex flex-col text-left truncate">
								<span className="_ccm-item-title font-semibold">+ Удаление постоянного зуба</span>
								<span className="text-[10px] text-[var(--muted)] font-mono">A16.07.001 · 3 500 ₽</span>
							</div>
							<Plus className="w-3.5 h-3.5 text-red-500 ml-auto shrink-0" />
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
										"Предупреждение: у пациента бисфосфонаты в анамнезе (риск остеонекроза челюсти).",
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

			{/* ── НАЗНАЧЕННЫЕ УСЛУГИ НА ЗУБЕ ── */}
			<div className="_ccm-tooth-services-section mt-3 pt-2.5 border-t border-[var(--line)]">
				<div className="flex items-center justify-between text-xs font-semibold mb-1.5">
					<span className="text-[var(--text-strong)] flex items-center gap-1">
						<Receipt className="w-3.5 h-3.5 text-[var(--teal)]" />
						Услуги на зубе {code} ({toothServices.length})
					</span>
					<span className="text-[var(--teal)] font-bold">
						{toothTotalRub > 0 ? `${toothTotalRub.toLocaleString("ru-RU")} ₽` : "0 ₽"}
					</span>
				</div>
				{toothServices.length === 0 ? (
					<div className="text-[11px] text-[var(--muted)] py-1 italic">
						На этот зуб еще не добавлены услуги. Выберите услугу или пакет выше.
					</div>
				) : (
					<div className="flex flex-col gap-1 max-h-32 overflow-y-auto pr-1">
						{toothServices.map((svc, idx) => (
							<div
								key={`${svc.serviceId}-${idx}`}
								className="flex items-center justify-between text-[11px] bg-[var(--paper-soft)] p-1.5 rounded border border-[var(--line-subtle)]"
							>
								<div className="flex items-center gap-1.5 truncate">
									<span className="text-[10px] font-mono font-medium px-1 py-0.5 rounded bg-[var(--teal-subtle)] text-[var(--teal)] shrink-0">
										{svc.code804n}
									</span>
									<span className="truncate text-[var(--text)]">{svc.name}</span>
								</div>
								<div className="flex items-center gap-2 shrink-0 ml-2">
									<span className="font-semibold text-[var(--text-strong)]">
										{svc.priceRub.toLocaleString("ru-RU")} ₽
									</span>
									<button
										type="button"
										onClick={() => {
											const realIdx = completedServices.findIndex((cs) => cs === svc);
											if (realIdx !== -1) {
												removeCompletedService(realIdx);
												showToast(`Услуга [${svc.code804n}] удалена с зуба ${code}`, "info", 2000);
											}
										}}
										className="text-[var(--muted)] hover:text-red-500 p-0.5 rounded transition-colors"
										title="Удалить услугу"
										aria-label={`Удалить услугу ${svc.name}`}
									>
										<X className="w-3 h-3" />
									</button>
								</div>
							</div>
						))}
					</div>
				)}
			</div>
		</div>
	);
}
