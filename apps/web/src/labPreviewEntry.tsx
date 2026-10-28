import React, { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { DentalLabOrderModal } from "./components/lab/DentalLabOrderModal";
import { DentalLabOrdersKanbanBoard, CANONICAL_4_KANBAN_COLUMNS } from "./components/lab/DentalLabOrdersKanbanBoard";
import type { LabWorkflowStatus, DentalLabWorkflowOrder } from "./components/lab/dentalLabWorkflowEngine";
import { CANONICAL_DEMO_LAB_ORDERS } from "./components/lab/ordersView/canonicalDemoLabOrders";
import { AppointmentProcedureBadge } from "./components/schedule/appointmentCardModules/AppointmentProcedureBadge";
import { FlaskConical, LayoutGrid, Layers, Sun, Moon, Calendar } from "lucide-react";
import "./styles/tailwind.css";
import "./styles/main.css";
import "./styles.css";
import "./styles/token-aliases.css";
import "./styles/touch-targets.css";
import "./styles/modules/mobile-touch.css";
import "./styles/overflow-fixes.css";
import "./styles/contrast-fixes.css";
import "./styles/themes.css";
import "./styles/theme-overrides.css";
import "./theme.css";

function LabPreviewApp() {
	const params = typeof window !== "undefined" ? new URLSearchParams(window.location.search) : new URLSearchParams();
	const initialTheme = (params.get("theme") as "light" | "dark") || "light";
	const initialView = (params.get("view") as "modal" | "kanban" | "schedule") || "modal";
	const initialTab = (params.get("tab") as "main" | "shades" | "stages" | "print") || "main";

	const [theme, setTheme] = useState<"light" | "dark">(initialTheme);
	const [view, setView] = useState<"modal" | "kanban" | "schedule">(initialView);
	const [modalTab, setModalTab] = useState<"main" | "shades" | "stages" | "print">(initialTab);
	const [isModalOpen, setIsModalOpen] = useState(initialView === "modal");

	useEffect(() => {
		document.documentElement.setAttribute("data-theme", theme);
		if (theme === "dark") {
			document.documentElement.classList.add("dark");
			document.body.classList.add("dark");
		} else {
			document.documentElement.classList.remove("dark");
			document.body.classList.remove("dark");
		}
	}, [theme]);

	const kanbanOrdersByStage: Record<LabWorkflowStatus, DentalLabWorkflowOrder[]> = {
		draft: [],
		sent_to_lab: [
			{
				id: "wf-1",
				orderNumber: "ZTL-2026-089",
				patientName: "Смирнов Алексей Петрович",
				doctorName: "Д-р Воронов А. В.",
				currentStage: "sent_to_lab" as const,
				dueDate: new Date(Date.now() + 4 * 86400000).toISOString(),
				createdAt: new Date().toISOString(),
				isUrgent: false,
				constructionType: "Коронка E.max",
				material: "Дисиликат лития IPS e.max",
				colorVita: "A2",
				toothFdi: "16",
				selectedTeeth: [16],
				priceRub: 14500,
			},
		],
		in_progress: [
			{
				id: "wf-2",
				orderNumber: "ZTL-2026-074",
				patientName: "Кузнецова Ирина Дмитриевна",
				doctorName: "Д-р Смирнова Е. В.",
				currentStage: "in_progress" as const,
				dueDate: new Date(Date.now() + 2 * 86400000).toISOString(),
				createdAt: new Date().toISOString(),
				isUrgent: true,
				constructionType: "Мостовидный протез ZrO2",
				material: "Диоксид циркония Prettau",
				colorVita: "A3",
				toothFdi: "24-26",
				selectedTeeth: [24, 25, 26],
				priceRub: 42000,
			},
		],
		fitting_scheduled: [
			{
				id: "wf-3",
				orderNumber: "ZTL-2026-061",
				patientName: "Ковалев Дмитрий Сергеевич",
				doctorName: "Д-р Воронов А. В.",
				currentStage: "fitting_scheduled" as const,
				dueDate: new Date().toISOString(),
				createdAt: new Date().toISOString(),
				isUrgent: false,
				constructionType: "Вкладка E.max",
				material: "Керамика IPS e.max Press",
				colorVita: "B1",
				toothFdi: "36",
				selectedTeeth: [36],
				priceRub: 11000,
			},
		],
		installed_completed: [
			{
				id: "wf-4",
				orderNumber: "ZTL-2026-042",
				patientName: "Морозов Сергей Васильевич",
				doctorName: "Д-р Смирнова Е. В.",
				currentStage: "installed_completed" as const,
				dueDate: new Date(Date.now() - 2 * 86400000).toISOString(),
				createdAt: new Date().toISOString(),
				isUrgent: false,
				constructionType: "Бюгельный протез",
				material: "Bredent / КХС",
				colorVita: "A2",
				toothFdi: "Верхняя челюсть",
				selectedTeeth: [],
				priceRub: 48000,
			},
		],
		warranty_rework: [],
	};

	return (
		<div className="min-h-screen bg-[var(--bg,#f8fafc)] text-[var(--ink,#0f172a)] flex flex-col font-sans">
			{/* Preview Toolbar */}
			<header className="px-4 py-2.5 bg-[var(--paper,#ffffff)] border-b border-[var(--line,#cbd5e1)] flex items-center justify-between gap-3 shrink-0">
				<div className="flex items-center gap-2">
					<FlaskConical className="w-5 h-5 text-[#0d9488]" />
					<h1 className="text-sm font-extrabold text-[var(--ink,#0f172a)]">
						DENTE ZTL · Red Team Stand
					</h1>
					<span className="px-2 py-0.5 rounded text-[10px] font-bold bg-teal-500/10 text-teal-700 dark:text-teal-300 border border-teal-500/20">
						SSOT Consolidated
					</span>
				</div>

				<div className="flex items-center gap-2 flex-wrap">
					{/* View Switch */}
					<div className="flex items-center rounded-xl border border-[var(--line,#cbd5e1)] p-0.5 bg-[var(--paper-soft,#f1f5f9)]">
						<button
							type="button"
							onClick={() => { setView("modal"); setIsModalOpen(true); }}
							className={`px-2.5 py-1 text-xs font-bold rounded-lg transition cursor-pointer flex items-center gap-1.5 ${
								view === "modal" ? "bg-[var(--paper,#ffffff)] shadow-2xs text-[#0d9488]" : "text-[var(--muted,#64748b)]"
							}`}
							data-testid="preview-switch-modal"
						>
							<Layers className="w-3.5 h-3.5" />
							<span>Наряд (SSOT)</span>
						</button>
						<button
							type="button"
							onClick={() => setView("kanban")}
							className={`px-2.5 py-1 text-xs font-bold rounded-lg transition cursor-pointer flex items-center gap-1.5 ${
								view === "kanban" ? "bg-[var(--paper,#ffffff)] shadow-2xs text-[#0d9488]" : "text-[var(--muted,#64748b)]"
							}`}
							data-testid="preview-switch-kanban"
						>
							<LayoutGrid className="w-3.5 h-3.5" />
							<span>Канбан (4 этапа)</span>
						</button>
						<button
							type="button"
							onClick={() => setView("schedule")}
							className={`px-2.5 py-1 text-xs font-bold rounded-lg transition cursor-pointer flex items-center gap-1.5 ${
								view === "schedule" ? "bg-[var(--paper,#ffffff)] shadow-2xs text-[#0d9488]" : "text-[var(--muted,#64748b)]"
							}`}
							data-testid="preview-switch-schedule"
						>
							<Calendar className="w-3.5 h-3.5" />
							<span>Расписание</span>
						</button>
					</div>

					{/* Theme Switch */}
					<button
						type="button"
						onClick={() => setTheme((t) => (t === "light" ? "dark" : "light"))}
						className="p-1.5 rounded-xl border border-[var(--line,#cbd5e1)] bg-[var(--paper,#ffffff)] text-[var(--ink,#0f172a)] hover:bg-[var(--paper-soft,#f1f5f9)] transition cursor-pointer shadow-2xs"
						title="Переключить тему"
						data-testid="preview-theme-toggle"
					>
						{theme === "light" ? <Moon className="w-4 h-4 text-slate-700" /> : <Sun className="w-4 h-4 text-amber-400" />}
					</button>
				</div>
			</header>

			{/* Main Content Area */}
			<main className="flex-1 p-4 sm:p-6 overflow-y-auto">
				{view === "kanban" && (
					<div className="max-w-7xl mx-auto space-y-4">
						<div className="flex items-center justify-between">
							<h2 className="text-base font-extrabold text-[var(--ink,#0f172a)]">
								Единый реестр заказов в зуботехническую лабораторию (Канбан)
							</h2>
							<button
								type="button"
								onClick={() => { setView("modal"); setIsModalOpen(true); }}
								className="px-4 py-2 rounded-xl bg-[#0d9488] hover:bg-[#0f766e] text-white text-xs font-bold transition shadow-xs cursor-pointer"
								data-testid="kanban-new-order-btn"
							>
								+ Создать наряд
							</button>
						</div>
						<DentalLabOrdersKanbanBoard
							ordersByStage={kanbanOrdersByStage}
							stageLimits={{}}
							setStageLimits={() => {}}
							activeCardMenuOrderId={null}
							setActiveCardMenuOrderId={() => {}}
							onInspectOrder={() => { setView("modal"); setIsModalOpen(true); }}
							onAdvanceStage={async () => {}}
							onPrintBlank={() => {}}
							onAttachBitePhoto={() => {}}
							onTechnicianComment={() => {}}
							onRepeatFitting={() => {}}
							onRequestWarrantyRework={() => {}}
							onMoveOrderToColumn={async () => {}}
						/>
					</div>
				)}

				{view === "schedule" && (
					<div className="max-w-3xl mx-auto space-y-6 pt-6">
						<div className="rounded-2xl border border-[var(--line,#cbd5e1)] bg-[var(--paper,#ffffff)] p-5 shadow-xs space-y-4">
							<div className="flex items-center justify-between border-b border-[var(--line,#cbd5e1)] pb-3">
								<div>
									<h3 className="text-sm font-bold text-[var(--ink,#0f172a)]">
										Карточка визита в расписании (Примерка и фиксация)
									</h3>
									<p className="text-xs text-[var(--muted,#64748b)]">
										Интеграция статуса наряда ЗТЛ со слотом расписания врача
									</p>
								</div>
								<span className="text-xs font-bold text-[#0d9488]">14:00 – 14:45</span>
							</div>

							<div className="p-4 rounded-xl border border-teal-500/20 bg-teal-50/40 dark:bg-teal-950/20 flex items-center justify-between gap-4">
								<div className="space-y-1">
									<div className="font-bold text-sm text-[var(--ink,#0f172a)]">
										Ковалев Дмитрий Сергеевич
									</div>
									<div className="text-xs text-[var(--muted,#64748b)]">
										Ортопедия · Коронка ZrO2 (Зуб 16)
									</div>
								</div>
								{/* Live Badge */}
								<div className="flex items-center gap-2">
									<AppointmentProcedureBadge
										appointment={{ id: "preview-ztl-appt", status: "confirmed" } as any}
										procedureLabel="Установка коронки ZrO2"
										teethList={["16"]}
										docTheme={null}
										durationMin={45}
										labStatusInfo={{
											state: "ready_in_clinic",
											labelRu: "Поступил в клинику",
											badgeColor: "teal",
											dueDateFormatted: "24 окт",
											isOverdue: false,
											overdueDays: 0,
											isCollision: false,
										}}
									/>
								</div>
							</div>
						</div>
					</div>
				)}

				{/* SSOT Modal */}
				{isModalOpen && (
					<DentalLabOrderModal
						isOpen={isModalOpen}
						onClose={() => setIsModalOpen(false)}
						initialTab={modalTab}
						patientName="Ковалев Дмитрий Сергеевич"
						doctorName="Д-р Смирнова Е. В. (Ортопед)"
						patientChartNumber="4029"
						stageNumber={3}
						stageTitle="Протезирование на имплантах"
						initialToothFdi="16"
						initialOrder={CANONICAL_DEMO_LAB_ORDERS[0]}
					/>
				)}
			</main>
		</div>
	);
}

const container = document.getElementById("root");
if (container) {
	createRoot(container).render(<LabPreviewApp />);
}
