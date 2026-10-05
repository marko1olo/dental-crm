import React, { useState, useEffect, useMemo } from "react";
import ReactDOM from "react-dom/client";
import "./styles/tailwind.css";
import "./styles/main.css";
import "./styles/shadow-analyst.css";
import "./styles/modules/patients.css";
import "./styles/patients-redesign.css";
import "./styles/premium.css";
import "./styles/dente-redesign.css";
import "./styles/modules/header.css";
import "./styles.css";
import "./styles/token-aliases.css";
import "./styles/touch-targets.css";
import "./styles/modules/mobile-touch.css";
import "./styles/overflow-fixes.css";
import "./components/lab/dentalLabWorkflow.css";
import "./components/lab/labOrders.css";
import "./components/patients/LabOrdersPanel.css";
import { LabOrdersPage } from "./pages/LabOrdersPage";
import { LabOrdersPanel } from "./components/patients/LabOrdersPanel";
import { DentalLabOrderModal } from "./components/lab/DentalLabOrderModal";
import { DentalLabOrdersKanbanBoard } from "./components/lab/DentalLabOrdersKanbanBoard";
import { getDemoDentalLabWorkflowOrders } from "./components/lab/dentalLabDemoData";
import { type DentalLabWorkflowOrder, createDentalLabOrder } from "./components/lab/dentalLabWorkflowModel";
import { type LabWorkflowStatus } from "./components/lab/dentalLabWorkflowEngine";
import type { DentalLabOrderData } from "./components/lab/labMath";
import { applyThemeToRoot, resolveTheme, type ThemeMode } from "./lib/themeClasses";

const DEMO_MODAL_ORDER: DentalLabOrderData = {
	id: "order-demo-101",
	patientId: "pat-1",
	patientName: "Ковалёв Роман Станиславович",
	doctorId: "doc-1",
	doctorName: "Д-р Воронов Алексей Владимирович",
	secureToken: "SECURE-TOKEN-DEMO-101",
	toothFdi: "16",
	selectedTeeth: [16],
	jawScope: "upper",
	constructionType: "crown_zirconia",
	material: "zirconia_multilayer",
	impressionType: "digital_scan",
	colorVita: "A2",
	shadeSystem: "classical",
	shadeCervical: "A3",
	shadeBody: "A2",
	shadeIncisal: "A1",
	shadeStump: "ND2",
	translucency: "HT",
	mamelons: true,
	calcifications: false,
	opalescence: true,
	status: "sent_to_lab",
	dueDate: "2026-10-10",
	frameworkTrialDate: "2026-10-07",
	ceramicTrialDate: "2026-10-09",
	deliveryDate: "2026-10-10",
	clinicalNotes: "Коронка из диоксида циркония Katana HTML (Multi-Layer). Индивидуализация режущего края, опалесценция. Фото эталона VITA A2 в полости рта прикреплено.",
	attachedImageUrl: "photos/vita_a2_clinical_guide.jpg",
	priceRub: 24000,
	doctorSharePct: 20,
	doctorDeductionRub: 4800,
};

type LabPreviewTab = "registry" | "chairside" | "kanban" | "modal" | "modal_shades";

function LabOrdersPreviewApp() {
	const params = new URLSearchParams(window.location.search);
	const rawTheme = (params.get("theme") || "light") as ThemeMode;
	const initialTab = (params.get("tab") || "registry") as LabPreviewTab;
	const [activeTab, setActiveTab] = useState<LabPreviewTab>(initialTab);
	const [currentTheme, setCurrentTheme] = useState<string>(rawTheme);
	const [isModalOpen, setIsModalOpen] = useState(true);
	const [stageLimits, setStageLimits] = useState<Record<string, number>>({
		draft: 10,
		sent_to_lab: 10,
		fitting_scheduled: 10,
		installed_completed: 10,
		warranty_rework: 10,
	});
	const [activeCardMenuOrderId, setActiveCardMenuOrderId] = useState<string | null>(null);

	useEffect(() => {
		const resolved = resolveTheme(rawTheme, false);
		applyThemeToRoot(document.documentElement, resolved);
		document.body.className = `theme-${resolved.theme} bg-[var(--paper)] text-[var(--ink)] antialiased min-h-screen`;
		setCurrentTheme(resolved.theme);

		const syncTheme = () => {
			const active = document.documentElement.getAttribute("data-theme") || resolved.theme;
			setCurrentTheme(active);
		};
		const observer = new MutationObserver(syncTheme);
		observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme", "class"] });
		return () => observer.disconnect();
	}, [rawTheme]);

	const kanbanOrdersByStage = useMemo<Record<LabWorkflowStatus, DentalLabWorkflowOrder[]>>(() => {
		const demoList: DentalLabWorkflowOrder[] = [
			...getDemoDentalLabWorkflowOrders(),
			createDentalLabOrder({
				patientId: "demo-pat-rework",
				patientName: "Иванов Алексей Сергеевич",
				doctorId: "doc-1",
				doctorName: "Д-р Воронов А.В. (Ортопед)",
				labName: "CAD/CAM Центр Дентал-Мастер",
				workTypeId: "crown_emax",
				materialName: "IPS e.max Press (анатомическая коронка)",
				selectedTeeth: [21],
				shadeCode: "A2",
				initialStatus: "warranty_rework",
				techStage: "milling_framework",
				pricePerUnitRub: 28000,
				costPerUnitRub: 8000,
				orderNumber: "ЗТЛ-2026-098-РЕМ",
				isWarrantyRework: true,
				reworkReason: "Скол керамики при примерке в клинике (брак обжига)",
				clinicalNotes: "Гарантийная переделка 0 ₽ для пациента. Лабораторный скол керамики.",
			}),
		];

		const grouped: Record<LabWorkflowStatus, DentalLabWorkflowOrder[]> = {
			draft: [],
			sent_to_lab: [],
			fitting_scheduled: [],
			installed_completed: [],
			warranty_rework: [],
		};

		for (const ord of demoList) {
			const st = ord.currentStage as LabWorkflowStatus;
			if (grouped[st]) {
				grouped[st].push(ord);
			} else {
				grouped.draft.push(ord);
			}
		}

		return grouped;
	}, []);

	return (
		<div className="min-h-screen bg-[var(--paper)] text-[var(--ink)] p-4 sm:p-6 transition-colors duration-200">
			<div className="max-w-7xl mx-auto space-y-4">
				<header className="flex flex-wrap items-center justify-between gap-4 pb-3 border-b border-[var(--glass-border)]">
					<div>
						<h1 className="text-xl font-bold tracking-tight text-[var(--ink)]">
							Зуботехническая лаборатория (ЗТЛ): Реестр, Канбан и Заказ
						</h1>
						<p className="text-xs text-[var(--muted)]">
							Врач: Д-р Воронов А.В. | Тема: {currentTheme.toUpperCase()} | 32px контролы
						</p>
					</div>

					<div className="flex items-center gap-3 flex-wrap">
						<div className="inline-flex rounded-lg bg-[var(--paper-soft)] p-0.5 border border-[var(--glass-border)] gap-1 flex-wrap">
							<button
								type="button"
								data-testid="tab-lab-registry"
								onClick={() => setActiveTab("registry")}
								className={`h-7 px-2.5 rounded-md text-xs font-medium transition-all ${
									activeTab === "registry"
										? "bg-[var(--paper)] text-[var(--ink)] shadow-sm font-semibold"
										: "text-[var(--muted)] hover:text-[var(--ink)]"
								}`}
							>
								Реестр нарядов
							</button>
							<button
								type="button"
								data-testid="tab-lab-kanban"
								onClick={() => setActiveTab("kanban")}
								className={`h-7 px-2.5 rounded-md text-xs font-medium transition-all ${
									activeTab === "kanban"
										? "bg-[var(--paper)] text-[var(--ink)] shadow-sm font-semibold"
										: "text-[var(--muted)] hover:text-[var(--ink)]"
								}`}
							>
								Канбан ЗТЛ
							</button>
							<button
								type="button"
								data-testid="tab-lab-modal"
								onClick={() => {
									setIsModalOpen(true);
									setActiveTab("modal");
								}}
								className={`h-7 px-2.5 rounded-md text-xs font-medium transition-all ${
									activeTab === "modal"
										? "bg-[var(--paper)] text-[var(--ink)] shadow-sm font-semibold"
										: "text-[var(--muted)] hover:text-[var(--ink)]"
								}`}
							>
								Модалка наряда
							</button>
							<button
								type="button"
								data-testid="tab-lab-modal-shades"
								onClick={() => {
									setIsModalOpen(true);
									setActiveTab("modal_shades");
								}}
								className={`h-7 px-2.5 rounded-md text-xs font-medium transition-all ${
									activeTab === "modal_shades"
										? "bg-[var(--paper)] text-[var(--ink)] shadow-sm font-semibold"
										: "text-[var(--muted)] hover:text-[var(--ink)]"
								}`}
							>
								VITA Расцветка
							</button>
							<button
								type="button"
								data-testid="tab-lab-chairside"
								onClick={() => setActiveTab("chairside")}
								className={`h-7 px-2.5 rounded-md text-xs font-medium transition-all ${
									activeTab === "chairside"
										? "bg-[var(--paper)] text-[var(--ink)] shadow-sm font-semibold"
										: "text-[var(--muted)] hover:text-[var(--ink)]"
								}`}
							>
								Кресельная панель
							</button>
						</div>

						<div className="flex items-center gap-1.5">
							<button
								type="button"
								onClick={() => {
									const url = new URL(window.location.href);
									url.searchParams.set("theme", "light");
									window.location.href = url.toString();
								}}
								className={`h-7 px-2.5 rounded-lg text-xs font-semibold border transition-all ${
									currentTheme === "light"
										? "bg-teal-600 text-white border-teal-600 shadow-2xs"
										: "bg-[var(--paper-soft)] text-[var(--ink)] border-[var(--glass-border)] hover:bg-[var(--paper-strong)]"
								}`}
							>
								Light
							</button>
							<button
								type="button"
								onClick={() => {
									const url = new URL(window.location.href);
									url.searchParams.set("theme", "dark");
									window.location.href = url.toString();
								}}
								className={`h-7 px-2.5 rounded-lg text-xs font-semibold border transition-all ${
									currentTheme === "dark"
										? "bg-teal-600 text-white border-teal-600 shadow-2xs"
										: "bg-[var(--paper-soft)] text-[var(--ink)] border-[var(--glass-border)] hover:bg-[var(--paper-strong)]"
								}`}
							>
								Dark
							</button>
						</div>
					</div>
				</header>

				<main className="bg-[var(--paper-card)] border border-[var(--glass-border)] rounded-2xl p-4 sm:p-5 shadow-sm min-h-[600px]">
					{activeTab === "registry" && <LabOrdersPage />}
					{activeTab === "chairside" && <LabOrdersPanel patientId="pat-1" />}
					{activeTab === "kanban" && (
						<div className="space-y-4" data-testid="kanban-preview-container">
							<div className="flex items-center justify-between">
								<h2 className="text-base font-bold text-[var(--ink)]">
									Клиническая канбан-доска стадий ЗТЛ и гарантийных переделок (0 ₽)
								</h2>
								<span className="text-xs text-[var(--muted)]">
									Всего нарядов: {Object.values(kanbanOrdersByStage).flat().length}
								</span>
							</div>
							<DentalLabOrdersKanbanBoard
								ordersByStage={kanbanOrdersByStage}
								stageLimits={stageLimits}
								setStageLimits={setStageLimits}
								activeCardMenuOrderId={activeCardMenuOrderId}
								setActiveCardMenuOrderId={setActiveCardMenuOrderId}
								onInspectOrder={() => {}}
								onAdvanceStage={() => {}}
								onPrintBlank={() => {}}
								onAttachBitePhoto={() => {}}
								onTechnicianComment={() => {}}
								onRepeatFitting={() => {}}
								onRequestWarrantyRework={() => {}}
							/>
						</div>
					)}
					{(activeTab === "modal" || activeTab === "modal_shades") && (
						<div className="space-y-4">
							<div className="flex items-center justify-between p-3 rounded-xl bg-teal-500/10 border border-teal-500/20 text-xs text-teal-800 dark:text-teal-200">
								<span>Окно создания и редактирования наряда ЗТЛ активно</span>
								<button
									type="button"
									onClick={() => setIsModalOpen(true)}
									className="px-2.5 py-1 rounded-lg bg-teal-600 text-white font-bold text-xs"
								>
									Открыть заново
								</button>
							</div>
							<DentalLabOrderModal
								isOpen={true}
								onClose={() => {}}
								initialOrder={DEMO_MODAL_ORDER}
								initialTab={activeTab === "modal_shades" ? "shades" : "main"}
								patientId="pat-1"
								patientName="Ковалёв Роман Станиславович"
								doctorName="Д-р Воронов Алексей Владимирович"
							/>
						</div>
					)}
				</main>
			</div>
		</div>
	);
}

const rootEl = document.getElementById("root");
if (rootEl) {
	ReactDOM.createRoot(rootEl).render(<LabOrdersPreviewApp />);
}
