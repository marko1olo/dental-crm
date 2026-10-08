import type React from "react";
import { Suspense, lazy, useState } from "react";
import {
	ChevronDown,
	Clock,
	FlaskConical,
	Layers,
	Loader2,
	Plus,
	RefreshCw,
	Zap,
} from "lucide-react";
import { denteAdminSecretRequestHeaders } from "../../AppHelpers";
import { showToast } from "../GlobalToast";
import { LabOrdersPage, LabActionPromptModal } from "../../pages/LabOrdersPage";
import { EXPRESS_LAB_PRESETS } from "../lab/labMath";
import { useLabOrdersPanelLogic } from "./useLabOrdersPanelLogic";
import { LabOrdersQuickForm } from "./LabOrdersQuickForm";
import { LabOrderCardItem } from "./LabOrderCardItem";
import "./LabOrdersPanel.css";

// Lazy-loaded secondary modals for low-spec hardware (4GB RAM, 5400 RPM HDD)
const DentalLabOrderModal = lazy(() =>
	import("../lab/DentalLabOrderModal").then((m) => ({ default: m.DentalLabOrderModal }))
);
const DentalLabOrdersHubModal = lazy(() =>
	import("../lab/DentalLabOrdersHubModal").then((m) => ({ default: m.DentalLabOrdersHubModal }))
);
const DentalLabOrdersTrackerModal = lazy(() =>
	import("../lab/DentalLabOrdersTrackerModal").then((m) => ({ default: m.DentalLabOrdersTrackerModal }))
);
const LabTrackingDrawer = lazy(() =>
	import("../lab/LabTrackingDrawer").then((m) => ({ default: m.LabTrackingDrawer }))
);
const IntraoralScan3DViewerModal = lazy(() =>
	import("../radiology/IntraoralScan3DViewerModal").then((m) => ({ default: m.IntraoralScan3DViewerModal }))
);

export interface LabOrder {
	id: string;
	patientId: string;
	patientName: string;
	doctorId: string | null;
	doctorName: string | null;
	secureToken: string;
	toothFdi: string | null;
	material: string | null;
	colorVita: string | null;
	status: string;
	dueDate: string | null;
	clinicalNotes: string | null;
	labComments: string | null;
	attachedImageUrl: string | null;
	priceRub: number | null;
	createdAt: string;
	updatedAt: string;
}

export interface LabItem {
	id: string;
	toothFdi: number;
	restorationType: string;
	material: string;
	shadeSystem: string;
	shadeFinal: string;
	shadeStump: string | null;
	cementGapMicrons: number;
	priceRub: number | null;
}

interface LabOrdersPanelProps {
	patientId?: string;
}

export function LabOrdersPanel({ patientId }: LabOrdersPanelProps) {
	if (!patientId) {
		return <LabOrdersPage />;
	}

	const logic = useLabOrdersPanelLogic(patientId);
	const [view3DScanOrder, setView3DScanOrder] = useState<LabOrder | null>(null);

	return (
		<div className="lab-orders-panel">
			{/* Dense Header & 32-36px 1-Row Toolbar (Hick's Law) */}
			<div className="lab-orders-header h-9 min-h-[36px] flex items-center justify-between gap-2 px-1">
				<div className="flex items-center gap-2 shrink-0">
					<h3 className="m-0 text-sm font-bold text-[var(--ink)] flex items-center gap-1.5 whitespace-nowrap">
						<FlaskConical className="w-4 h-4 text-[var(--teal)] shrink-0" />
						<span>CAD/CAM ЗТЛ</span>
					</h3>
					<span className="hidden sm:inline-flex px-1.5 py-0.5 rounded text-[10px] font-bold bg-[var(--paper-soft)] border border-[var(--line)] text-[var(--muted)]">
						{logic.orders.length} наряд{logic.orders.length === 1 ? "" : logic.orders.length < 5 ? "а" : "ов"}
					</span>
				</div>

				<div className="lab-orders-toolbar">
					<button
						type="button"
						onClick={logic.fetchOrders}
						className="lab-btn-32"
						title="Обновить список"
					>
						<RefreshCw className={`w-3.5 h-3.5 ${logic.loading ? "animate-spin text-[var(--teal)]" : ""}`} />
					</button>

					{/* Consolidated Presets, Tracker & Registry Dropdown (1-Row Rule) */}
					<div className="relative inline-block" ref={logic.presetsMenuRef}>
						<button
							type="button"
							onClick={() => logic.setIsPresetsMenuOpen((prev) => !prev)}
							disabled={logic.submitting}
							className="lab-btn-32"
							title="Инструменты, шаблоны и трекер ЗТЛ"
							aria-expanded={logic.isPresetsMenuOpen}
							aria-haspopup="true"
						>
							<Layers className="w-3.5 h-3.5 text-[var(--teal)]" />
							<span>Шаблоны и трекер</span>
							<ChevronDown className={`w-3 h-3 transition-transform ${logic.isPresetsMenuOpen ? "rotate-180" : ""}`} />
						</button>

						{logic.isPresetsMenuOpen && (
							<div className="absolute right-0 sm:left-0 top-full mt-1 w-64 bg-[var(--paper)] border border-[var(--line)] rounded-xl shadow-lg p-1.5 z-30 space-y-1">
								<div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-[var(--muted)]">
									Экспресс-шаблоны ЗТЛ:
								</div>
								<button
									type="button"
									onClick={() => {
										logic.setIsPresetsMenuOpen(false);
										void logic.handleOneClickCreate();
									}}
									disabled={logic.submitting}
									className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-semibold hover:bg-[var(--paper-soft)] text-[var(--ink)] flex items-center justify-between transition-colors cursor-pointer"
									title="Оформить наряд ЗТЛ: Коронка цирконий/E.max, цвет VITA A2, срок 7 рабочих дней"
									data-testid="lab-order-one-click-btn"
								>
									<div className="flex items-center gap-2">
										<Zap className="w-3.5 h-3.5 text-amber-500 shrink-0" />
										<div>
											<div className="font-bold">Цирконий A2 (7 дн.)</div>
											<div className="text-[10px] text-[var(--muted)]">Коронка Zr/E.max, цвет A2</div>
										</div>
									</div>
								</button>

								<button
									type="button"
									onClick={() => {
										logic.setIsPresetsMenuOpen(false);
										const pmma = EXPRESS_LAB_PRESETS.find((p) => p.id === "pmma_temp");
										if (pmma) void logic.handleExpressPresetCreate(pmma);
									}}
									disabled={logic.submitting}
									className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-semibold hover:bg-[var(--paper-soft)] text-[var(--ink)] flex items-center justify-between transition-colors cursor-pointer"
									title="Оформить наряд: Временная PMMA CAD/CAM, срок 2 рабочих дня"
									data-testid="lab-order-preset-pmma-btn"
								>
									<div className="flex items-center gap-2">
										<Zap className="w-3.5 h-3.5 text-teal-500 shrink-0" />
										<div>
											<div className="font-bold">Временная PMMA (2 дн.)</div>
											<div className="text-[10px] text-[var(--muted)]">CAD/CAM фрезеровка</div>
										</div>
									</div>
								</button>

								<button
									type="button"
									onClick={() => {
										logic.setIsPresetsMenuOpen(false);
										const corePost = EXPRESS_LAB_PRESETS.find((p) => p.id === "core_post_cocr");
										if (corePost) void logic.handleExpressPresetCreate(corePost);
									}}
									disabled={logic.submitting}
									className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-semibold hover:bg-[var(--paper-soft)] text-[var(--ink)] flex items-center justify-between transition-colors cursor-pointer"
									title="Оформить наряд: Культевая вкладка КХС (CoCr), срок 3 рабочих дня"
									data-testid="lab-order-preset-core-post-btn"
								>
									<div className="flex items-center gap-2">
										<Zap className="w-3.5 h-3.5 text-slate-500 shrink-0" />
										<div>
											<div className="font-bold">Вкладка КХС (3 дн.)</div>
											<div className="text-[10px] text-[var(--muted)]">Культевая вкладка CoCr</div>
										</div>
									</div>
								</button>

								<div className="border-t border-[var(--line)] my-1" />

								<button
									type="button"
									onClick={() => {
										logic.setIsPresetsMenuOpen(false);
										logic.setIsTrackerModalOpen(true);
									}}
									className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-semibold hover:bg-[var(--paper-soft)] text-[var(--ink)] flex items-center gap-2 transition-colors cursor-pointer"
									title="Трекер нарядов и дедлайнов ЗТЛ"
									data-testid="lab-orders-tracker-trigger"
								>
									<Clock className="w-3.5 h-3.5 text-[var(--teal)] shrink-0" />
									<span>Трекер нарядов и дедлайнов</span>
								</button>

								<button
									type="button"
									onClick={() => {
										logic.setIsPresetsMenuOpen(false);
										logic.setIsLabHubOpen(true);
									}}
									className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-semibold hover:bg-[var(--paper-soft)] text-[var(--ink)] flex items-center gap-2 transition-colors cursor-pointer"
									title="Реестр нарядов ЗТЛ"
									data-testid="lab-orders-hub-trigger"
								>
									<Layers className="w-3.5 h-3.5 text-[var(--teal)] shrink-0" />
									<span>Реестр нарядов ЗТЛ</span>
								</button>

								<button
									type="button"
									onClick={() => {
										logic.setIsPresetsMenuOpen(false);
										logic.setShowQuickForm(!logic.showQuickForm);
									}}
									className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-semibold hover:bg-[var(--paper-soft)] text-[var(--ink)] flex items-center gap-2 transition-colors cursor-pointer"
								>
									<Plus className="w-3.5 h-3.5 text-[var(--teal)] shrink-0" />
									<span>{logic.showQuickForm ? "Скрыть форму наряда" : "Быстрый наряд (inline-форма)"}</span>
								</button>
							</div>
						)}
					</div>

					<button
						type="button"
						onClick={() => {
							logic.setSelectedOrderForEdit(null);
							logic.setIsOrderModalOpen(true);
						}}
						className="lab-btn-32 is-primary"
						title="Оформить заказ в лабораторию"
						data-testid="btn-create-lab-order"
					>
						<Plus className="w-3.5 h-3.5" />
						<span>+ Заказ в лабораторию</span>
					</button>
				</div>
			</div>

			{/* Inline Quick Creation Form */}
			{logic.showQuickForm && (
				<LabOrdersQuickForm
					selectedTeeth={logic.selectedTeeth}
					setSelectedTeeth={logic.setSelectedTeeth}
					restorationType={logic.restorationType}
					setRestorationType={logic.setRestorationType}
					material={logic.material}
					setMaterial={logic.setMaterial}
					shadeSystem={logic.shadeSystem}
					setShadeSystem={logic.setShadeSystem}
					colorVita={logic.colorVita}
					setColorVita={logic.setColorVita}
					stumpShade={logic.stumpShade}
					setStumpShade={logic.setStumpShade}
					fittingDate={logic.fittingDate}
					setFittingDate={logic.setFittingDate}
					dueDate={logic.dueDate}
					setDueDate={logic.setDueDate}
					clinicalNotes={logic.clinicalNotes}
					setClinicalNotes={logic.setClinicalNotes}
					calculatedMaterialCostKopecks={logic.calculatedMaterialCostKopecks}
					submitting={logic.submitting}
					onSubmit={logic.handleQuickSubmit}
					onCancel={() => logic.setShowQuickForm(false)}
					onOneClickCreate={() => void logic.handleOneClickCreate()}
				/>
			)}

			{logic.error && <div className="lab-order-warning">{logic.error}</div>}

			{/* Orders List */}
			{logic.loading && logic.orders.length === 0 ? (
				<div className="py-6 text-center text-xs text-[var(--muted)] flex items-center justify-center gap-2">
					<Loader2 className="w-4 h-4 animate-spin text-[var(--teal)]" />
					Загрузка нарядов лаборатории...
				</div>
			) : logic.orders.length === 0 ? (
				<div
					style={{
						padding: "2rem 1.5rem",
						textAlign: "center",
						background: "var(--paper-soft)",
						borderRadius: "12px",
						border: "1px dashed var(--line)",
						display: "flex",
						flexDirection: "column",
						alignItems: "center",
						gap: "0.75rem",
						margin: "0.5rem 0",
					}}
				>
					<FlaskConical size={36} color="var(--teal, #0d9488)" />
					<div style={{ fontWeight: 700, fontSize: "0.95rem", color: "var(--ink)" }}>
						Нет оформленных заказов в лабораторию
					</div>
					<div style={{ fontSize: "0.825rem", color: "var(--muted)", maxWidth: "420px" }}>
						Оформите заказ на изготовление коронок, виниров, вкладок или протезов для этого пациента.
					</div>
					<button
						type="button"
						onClick={() => {
							logic.setSelectedOrderForEdit(null);
							logic.setIsOrderModalOpen(true);
						}}
						className="primary-button min-h-[40px] px-4 flex items-center gap-1.5 text-xs font-bold rounded-xl shadow-sm cursor-pointer"
						data-testid="empty-state-add-first-patient-lab-order-btn"
					>
						<Plus size={15} />
						<span>Оформить заказ в лабораторию</span>
					</button>
				</div>
			) : (
				<div className="lab-orders-list">
					{logic.orders.map((order) => (
						<LabOrderCardItem
							key={order.id}
							order={order}
							openMenuOrderId={logic.openMenuOrderId}
							setOpenMenuOrderId={logic.setOpenMenuOrderId}
							cardMenuRef={logic.cardMenuRef}
							onStatusTransition={logic.handleStatusTransition}
							onOpenPrintOrder={logic.handleOpenPrintOrder}
							onOpenTrackingDrawer={logic.handleOpenTrackingDrawer}
							onScheduleAppointment={logic.handleScheduleAppointment}
							onEditOrder={(ord) => {
								logic.setSelectedOrderForEdit(ord as any);
								logic.setModalInitialTab("main");
								logic.setIsOrderModalOpen(true);
							}}
							onAttachBitePhoto={logic.handleAttachBitePhoto}
							onTechnicianComment={logic.handleTechnicianComment}
							onRepeatFitting={logic.handleRepeatFitting}
							onReclamation={logic.handleReclamation}
							onCopyPortalLink={logic.copyPortalLink}
							onDeleteOrder={logic.handleDeleteOrder}
							onView3DScan={(ord) => setView3DScanOrder(ord)}
						/>
					))}
				</div>
			)}

			{/* Full CAD/CAM Order Modal */}
			{logic.isOrderModalOpen && (
				<Suspense fallback={null}>
					<DentalLabOrderModal
						isOpen={logic.isOrderModalOpen}
						onClose={() => logic.setIsOrderModalOpen(false)}
						initialOrder={logic.selectedOrderForEdit}
						initialTab={logic.modalInitialTab}
						patientId={patientId}
						onOrderSaved={() => logic.fetchOrders()}
					/>
				</Suspense>
			)}

			{/* 7-Stage Tracking Drawer */}
			{logic.isTrackingDrawerOpen && (
				<Suspense fallback={null}>
					<LabTrackingDrawer
						isOpen={logic.isTrackingDrawerOpen}
						onClose={() => logic.setIsTrackingDrawerOpen(false)}
						order={logic.selectedOrderForTracking}
						onStageUpdate={async (orderId, newStage, note) => {
							try {
								const res = await fetch(`/api/lab/orders/${orderId}`, {
									method: "PATCH",
									headers: {
										"Content-Type": "application/json",
										...denteAdminSecretRequestHeaders(),
									},
									body: JSON.stringify({
										stage: newStage,
										notes: note,
									}),
								});
								if (!res.ok) {
									const errData = await res.json().catch(() => null);
									throw new Error(errData?.message || `Ошибка смены этапа (${res.status})`);
								}
								showToast("Этап наряда ЗТЛ успешно сохранен в базе данных", "success");
								await logic.fetchOrders();
							} catch (err: any) {
								showToast(err.message || "Не удалось обновить этап наряда в БД", "error");
							}
						}}
					/>
				</Suspense>
			)}

			{logic.isLabHubOpen && (
				<Suspense fallback={null}>
					<DentalLabOrdersHubModal
						isOpen={logic.isLabHubOpen}
						onClose={() => logic.setIsLabHubOpen(false)}
						currentPatientId={patientId}
						currentPatientName={logic.orders[0]?.patientName}
						currentDoctorName={logic.appLogic?.activeDoctor?.fullName || logic.appLogic?.activeDoctor?.name}
						onSaveOrder={() => {
							void logic.fetchOrders();
						}}
					/>
				</Suspense>
			)}

			{logic.isTrackerModalOpen && (
				<Suspense fallback={null}>
					<DentalLabOrdersTrackerModal
						isOpen={logic.isTrackerModalOpen}
						onClose={() => logic.setIsTrackerModalOpen(false)}
						currentPatientId={patientId}
						currentPatientName={logic.orders[0]?.patientName}
						currentDoctorName={logic.appLogic?.activeDoctor?.fullName || logic.appLogic?.activeDoctor?.name}
						onOrderSaved={() => {
							void logic.fetchOrders();
						}}
					/>
				</Suspense>
			)}

			{/* Non-blocking Action Prompt Modal (Mandates 8e, 8n) */}
			<LabActionPromptModal
				state={logic.promptState}
				onClose={() => logic.setPromptState(null)}
			/>

			{/* 3D Intraoral Scan Viewer Modal */}
			{view3DScanOrder && (
				<Suspense fallback={null}>
					<IntraoralScan3DViewerModal
						isOpen={Boolean(view3DScanOrder)}
						onClose={() => setView3DScanOrder(null)}
						modelUrl={view3DScanOrder.attachedImageUrl || undefined}
						modelFormat={
							view3DScanOrder.attachedImageUrl && /\.ply($|[?#])/i.test(view3DScanOrder.attachedImageUrl)
								? "ply"
								: view3DScanOrder.attachedImageUrl && /\.obj($|[?#])/i.test(view3DScanOrder.attachedImageUrl)
									? "obj"
									: "stl"
						}
						patientName={view3DScanOrder.patientName}
						scanTitle={`3D-скан челюсти: Наряд №${view3DScanOrder.id ? view3DScanOrder.id.slice(0, 8) : ""} (${view3DScanOrder.toothFdi ? `зуб ${view3DScanOrder.toothFdi}` : "челюсть"})`}
					/>
				</Suspense>
			)}
		</div>
	);
}
