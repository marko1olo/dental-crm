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
import "./styles/components.css";
import {
	FlaskConical,
	Sun,
	Moon,
	Layers,
	LayoutGrid,
	FileText,
	Palette,
	Smartphone,
	Sparkles,
	SlidersHorizontal,
	ExternalLink,
} from "lucide-react";
import { LabOrdersPage } from "./pages/LabOrdersPage";
import { LabOrdersPanel } from "./components/patients/LabOrdersPanel";
import { DentalLabOrderModal } from "./components/lab/DentalLabOrderModal";
import { DentalLabOrdersHubModal } from "./components/lab/DentalLabOrdersHubModal";
import { DentalLabOrdersKanbanBoard } from "./components/lab/DentalLabOrdersKanbanBoard";
import { DentalLabOrdersTrackerModal } from "./components/lab/DentalLabOrdersTrackerModal";
import { DentalLabPrintBlank } from "./components/lab/DentalLabPrintBlank";
import { DentalLabShadePicker } from "./components/lab/DentalLabShadePicker";
import { MobileLabOrdersTimeline } from "./components/lab/mobile/MobileLabOrdersTimeline";
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

type LabPreviewTab =
	| "registry"
	| "chairside"
	| "kanban"
	| "tracker"
	| "print"
	| "shade_picker"
	| "mobile"
	| "modal"
	| "modal_shades"
	| "hub";

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
			createDentalLabOrder({
				patientId: "demo-pat-1",
				patientName: "Барабаш С.В.",
				doctorId: "doc-1",
				doctorName: "Д-р Воронов А.В. (Ортопед)",
				labName: "CAD/CAM Центр Дентал-Мастер",
				workTypeId: "crown_zirconia",
				materialName: "Диоксид циркония Katana HTML (Multi-Layer)",
				selectedTeeth: [16],
				shadeCode: "A2",
				initialStatus: "sent_to_lab",
				pricePerUnitRub: 24000,
				costPerUnitRub: 7500,
				orderNumber: "ЗТЛ-2026-101",
				clinicalNotes: "Интраоральный скан STL/PLY. Плечевой уступ 0.8 мм.",
			}),
			createDentalLabOrder({
				patientId: "demo-pat-2",
				patientName: "Смирнова Е.А.",
				doctorId: "doc-1",
				doctorName: "Д-р Воронов А.В. (Ортопед)",
				labName: "ArtDent Премиум Лаб",
				workTypeId: "crown_emax",
				materialName: "IPS e.max Press (дисиликат лития)",
				selectedTeeth: [11, 21],
				shadeCode: "2M2",
				initialStatus: "draft",
				pricePerUnitRub: 28000,
				costPerUnitRub: 9000,
				orderNumber: "ЗТЛ-2026-102",
				clinicalNotes: "Фронтальная группа. 3D виртуальное моделирование Wax-up.",
			}),
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

	if (activeTab === "mobile") {
		return (
			<div className="min-h-screen w-full max-w-[420px] mx-auto bg-[var(--paper-soft)] text-[var(--ink)] overflow-x-clip" data-testid="mobile-preview-root">
				<MobileLabOrdersTimeline
					orders={[
						DEMO_MODAL_ORDER,
						{
							...DEMO_MODAL_ORDER,
							id: "order-demo-102",
							orderNumber: "ЗТЛ-2026-102",
							patientName: "Смирнова Елена Павловна",
							toothFdi: "21",
							constructionType: "veneer_emax",
							material: "emax_press",
							status: "fitting",
							colorVita: "A1",
							priceRub: 28000,
						},
						{
							...DEMO_MODAL_ORDER,
							id: "order-demo-103",
							orderNumber: "ЗТЛ-2026-103-ГАР",
							patientName: "Иванов Алексей Сергеевич",
							toothFdi: "24",
							status: "refitting",
							isWarrantyRework: true,
							priceRub: 0,
						},
					]}
					isLoading={false}
					error={null}
					onRefresh={() => {}}
					onOpenNewOrder={() => {}}
					onOpenTrackerModal={() => {}}
					onStatusChange={() => {}}
					onPrintOrder={() => {}}
					onTechnicianComment={() => {}}
					onAttachScan={() => {}}
					onReclamation={() => {}}
					copyPortalLink={() => {}}
				/>
			</div>
		);
	}

	return (
		<div className="min-h-screen bg-[var(--paper)] text-[var(--ink)] p-4 sm:p-6 transition-colors duration-200">
			<div className="max-w-7xl mx-auto space-y-4">
				<header className="flex flex-col gap-3 pb-3 border-b border-[var(--line)]">
					<div className="flex flex-wrap items-center justify-between gap-3">
						<div className="flex items-center gap-2.5">
							<div className="w-9 h-9 rounded-xl bg-teal-500/10 border border-teal-500/30 text-teal-600 dark:text-teal-400 flex items-center justify-center shrink-0 shadow-2xs">
								<FlaskConical className="w-5 h-5" />
							</div>
							<div>
								<h1 className="text-lg font-bold tracking-tight text-[var(--ink)] m-0">
									Зуботехническая лаборатория (ЗТЛ): Реестр, Канбан и Заказ
								</h1>
								<p className="text-xs text-[var(--muted)] m-0">
									Врач: Д-р Воронов А.В. · Стандартизация 32px · Apple / macOS HIG
								</p>
							</div>
						</div>

						{/* Переключатель темы: благородный сегментный контрол с иконками Lucide */}
						<div className="dente-segmented-bar shrink-0" role="toolbar" aria-label="Переключение темы оформления">
							<button
								type="button"
								onClick={() => {
									const url = new URL(window.location.href);
									url.searchParams.set("theme", "light");
									window.location.href = url.toString();
								}}
								className={`dente-segmented-item ${currentTheme === "light" ? "active" : ""}`}
								aria-pressed={currentTheme === "light"}
								title="Светлая тема оформления"
							>
								<Sun className="w-3.5 h-3.5" />
								<span>Светлая</span>
							</button>
							<button
								type="button"
								onClick={() => {
									const url = new URL(window.location.href);
									url.searchParams.set("theme", "dark");
									window.location.href = url.toString();
								}}
								className={`dente-segmented-item ${currentTheme === "dark" ? "active" : ""}`}
								aria-pressed={currentTheme === "dark"}
								title="Тёмная тема оформления"
							>
								<Moon className="w-3.5 h-3.5" />
								<span>Тёмная</span>
							</button>
						</div>
					</div>

					{/* Сегментированные контролы вкладок: сгруппированы по назначению без свалки */}
					<div className="flex flex-wrap items-center justify-between gap-2.5 pt-1">
						{/* Группа 1: Основные рабочие режимы ЗТЛ */}
						<div className="flex items-center gap-2 flex-wrap">
							<span className="text-[11px] font-semibold text-[var(--muted)] uppercase tracking-wider hidden sm:inline-block">
								Режимы:
							</span>
							<div className="dente-segmented-bar overflow-x-auto scrollbar-none" role="tablist" aria-label="Основные рабочие режимы ЗТЛ">
								<button
									type="button"
									data-testid="tab-lab-registry"
									onClick={() => setActiveTab("registry")}
									className={`dente-segmented-item ${activeTab === "registry" ? "active" : ""}`}
									role="tab"
									aria-selected={activeTab === "registry"}
								>
									<LayoutGrid className="w-3.5 h-3.5" />
									<span>Реестр нарядов</span>
								</button>
								<button
									type="button"
									data-testid="tab-lab-kanban"
									onClick={() => setActiveTab("kanban")}
									className={`dente-segmented-item ${activeTab === "kanban" ? "active" : ""}`}
									role="tab"
									aria-selected={activeTab === "kanban"}
								>
									<Layers className="w-3.5 h-3.5" />
									<span>Канбан ЗТЛ</span>
								</button>
								<button
									type="button"
									data-testid="tab-lab-tracker"
									onClick={() => setActiveTab("tracker")}
									className={`dente-segmented-item ${activeTab === "tracker" ? "active" : ""}`}
									role="tab"
									aria-selected={activeTab === "tracker"}
								>
									<SlidersHorizontal className="w-3.5 h-3.5" />
									<span>Трекер нарядов</span>
								</button>
								<button
									type="button"
									data-testid="tab-lab-print"
									onClick={() => setActiveTab("print")}
									className={`dente-segmented-item ${activeTab === "print" ? "active" : ""}`}
									role="tab"
									aria-selected={activeTab === "print"}
								>
									<FileText className="w-3.5 h-3.5" />
									<span>Печатный бланк</span>
								</button>
								<button
									type="button"
									data-testid="tab-lab-shade-picker"
									onClick={() => setActiveTab("shade_picker")}
									className={`dente-segmented-item ${activeTab === "shade_picker" ? "active" : ""}`}
									role="tab"
									aria-selected={activeTab === "shade_picker"}
								>
									<Palette className="w-3.5 h-3.5" />
									<span>VITA Пикер</span>
								</button>
							</div>
						</div>

						{/* Группа 2: Интерактивные витрины и модальные модули */}
						<div className="flex items-center gap-2 flex-wrap">
							<span className="text-[11px] font-semibold text-[var(--muted)] uppercase tracking-wider hidden lg:inline-block">
								Витрины:
							</span>
							<div className="dente-segmented-bar overflow-x-auto scrollbar-none" role="tablist" aria-label="Витрины и интерактивные модули">
								<button
									type="button"
									data-testid="tab-lab-mobile"
									onClick={() => setActiveTab("mobile")}
									className={`dente-segmented-item ${(activeTab as string) === "mobile" ? "active" : ""}`}
									role="tab"
									aria-selected={(activeTab as string) === "mobile"}
								>
									<Smartphone className="w-3.5 h-3.5" />
									<span>Мобильный</span>
								</button>
								<button
									type="button"
									data-testid="tab-lab-modal"
									onClick={() => {
										setIsModalOpen(true);
										setActiveTab("modal");
									}}
									className={`dente-segmented-item ${activeTab === "modal" ? "active" : ""}`}
									role="tab"
									aria-selected={activeTab === "modal"}
								>
									<ExternalLink className="w-3.5 h-3.5" />
									<span>Модалка наряда</span>
								</button>
								<button
									type="button"
									data-testid="tab-lab-modal-shades"
									onClick={() => {
										setIsModalOpen(true);
										setActiveTab("modal_shades");
									}}
									className={`dente-segmented-item ${activeTab === "modal_shades" ? "active" : ""}`}
									role="tab"
									aria-selected={activeTab === "modal_shades"}
								>
									<Sparkles className="w-3.5 h-3.5" />
									<span>VITA Расцветка</span>
								</button>
								<button
									type="button"
									data-testid="tab-lab-hub"
									onClick={() => setActiveTab("hub")}
									className={`dente-segmented-item ${activeTab === "hub" ? "active" : ""}`}
									role="tab"
									aria-selected={activeTab === "hub"}
								>
									<span>Хаб ЗТЛ</span>
								</button>
								<button
									type="button"
									data-testid="tab-lab-chairside"
									onClick={() => setActiveTab("chairside")}
									className={`dente-segmented-item ${activeTab === "chairside" ? "active" : ""}`}
									role="tab"
									aria-selected={activeTab === "chairside"}
								>
									<span>Кресельная панель</span>
								</button>
							</div>
						</div>
					</div>
				</header>

				<main className="bg-[var(--paper-card)] border border-[var(--glass-border)] rounded-2xl p-4 sm:p-5 shadow-sm min-h-[600px]">
					{activeTab === "registry" && <LabOrdersPage />}
					{activeTab === "hub" && (
						<div className="space-y-4">
							<DentalLabOrdersHubModal
								isOpen={true}
								onClose={() => setActiveTab("registry")}
								initialOrders={[]}
								currentPatientName="Ковалёв Роман Станиславович"
								currentDoctorName="Д-р Воронов Алексей Владимирович"
							/>
						</div>
					)}
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
					{activeTab === "tracker" && (
						<div className="space-y-4">
							<DentalLabOrdersTrackerModal
								isOpen={true}
								onClose={() => setActiveTab("registry")}
								currentPatientId="pat-1"
								currentPatientName="Ковалёв Роман Станиславович"
								currentDoctorName="Д-р Воронов Алексей Владимирович"
								currentToothNumber={16}
							/>
						</div>
					)}
					{activeTab === "print" && (
						<div className="p-4 bg-[var(--paper)] rounded-xl border border-[var(--glass-border)]">
							<DentalLabPrintBlank
								gostOrderNumber="2026-042"
								secureToken="SECURE-TOKEN-DEMO-101"
								formPatientName="Ковалёв Роман Станиславович"
								formDoctorName="Д-р Воронов Алексей Владимирович"
								clinicName="ООО «ДЕНТЕ» · Стоматологическая клиника"
								clinicPhone="+7 (495) 789-20-20"
								doctorPhone="+7 (926) 450-11-22"
								deliveryTimeSlot="12:00 – 15:00"
								selectedTeeth={[16]}
								jawScope="upper"
								constructionType="crown_zirconia"
								material="zirconia_multilayer"
								shadeSystem="classical"
								shadeClassical="A2"
								shade3dMaster="2M2"
								shadeBleach="0M2"
								shadeCervical="A3"
								shadeBody="A2"
								shadeIncisal="A1"
								shadeStump="ND2"
								translucency="HT"
								mamelons={true}
								calcifications={false}
								opalescence={true}
								dueDate="2026-10-10"
								clinicalNotes="Коронка из диоксида циркония Katana HTML. Индивидуализация режущего края, опалесценция. Фото эталона VITA A2 прикреплено."
								totalLabPriceRub={24000}
								portalUrl="https://dente.clinic/lab/portal/SECURE-TOKEN-DEMO-101"
								handlePrint={() => {}}
								isDraft={false}
								isSigned={true}
								status="sent_to_lab"
							/>
						</div>
					)}
					{activeTab === "shade_picker" && (
						<div className="max-w-2xl mx-auto p-4 bg-[var(--paper-card)] border border-[var(--glass-border)] rounded-2xl space-y-4">
							<h3 className="text-base font-bold text-[var(--ink)]">
								Канонический селектор расцветки VITA (Classical, 3D-Master, Bleach, IPS Natural Die)
							</h3>
							<DentalLabShadePicker
								selectedShade="A2"
								onSelectShade={() => {}}
								selectedStumpShade="ND2"
								onSelectStumpShade={() => {}}
								showStumpSelector={true}
								showBleachTab={true}
								shadePhotoUrl="photos/vita_a2_clinical_guide.jpg"
								onShadePhotoChange={() => {}}
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
