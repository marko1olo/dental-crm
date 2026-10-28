import React, { useState } from "react";
import { createPortal } from "react-dom";
if (typeof document !== "undefined") {
	void import("./dentalLab.css");
}
import {
	AlertTriangle,
	Clock,
	FileText,
	Layers,
	Palette,
	Upload,
} from "lucide-react";
import type { DentalLabOrderData, DentalLabOrderModalProps as BaseOrderModalProps } from "./labMath";
import { addWorkingDays } from "./labMath";
import {
	MODAL_EXPRESS_LAB_PRESETS,
	buildLabOrderMessengerSummary,
	type LabOrderMessengerParams,
	EXPRESS_PRESET_ZIRCONIA_CROWN,
	EXPRESS_PRESET_PFM_DUCERAM,
	EXPRESS_PRESET_EMAX_CROWN,
	EXPRESS_PRESET_PMMA_TEMPORARY,
	EXPRESS_PRESET_BRIDGE_ZIRCONIA,
	EXPRESS_PRESET_EMAX_INLAY,
} from "./dentalLabModalPresets";
import { useDentalLabOrderForm, type LabModalTabKey } from "./useDentalLabOrderForm";
import { DentalLabRestorationTab } from "./DentalLabRestorationTab";
import { DentalLabShadeSelector } from "./DentalLabShadeSelector";
import { DentalLabStagesTab } from "./DentalLabStagesTab";
import { showToast } from "../GlobalToast";
import {
	DentalLabOrderHeader,
	DentalLabOrderFooter,
	DentalLabOrderStagesStepper,
	DentalLabOrderScansTab,
	DentalLabOrderPrintTab,
	CANONICAL_4_CLINICAL_STAGES,
} from "./orderModalModules/DentalLabOrderModalModules";

export * from "./labMath";
export {
	MODAL_EXPRESS_LAB_PRESETS,
	buildLabOrderMessengerSummary,
	type LabOrderMessengerParams,
	EXPRESS_PRESET_ZIRCONIA_CROWN,
	EXPRESS_PRESET_PFM_DUCERAM,
	EXPRESS_PRESET_EMAX_CROWN,
	EXPRESS_PRESET_PMMA_TEMPORARY,
	EXPRESS_PRESET_BRIDGE_ZIRCONIA,
	EXPRESS_PRESET_EMAX_INLAY,
	DentalLabStagesTab,
	useDentalLabOrderForm,
	type LabModalTabKey,
	CANONICAL_4_CLINICAL_STAGES,
	addWorkingDays,
};

export interface ExtendedDentalLabOrderModalProps extends BaseOrderModalProps {
	readonly editingOrder?: DentalLabOrderData | any | null | undefined;
	readonly currentPatientId?: string | undefined;
	readonly currentPatientName?: string | undefined;
	readonly currentDoctorName?: string | undefined;
	readonly currentDoctorId?: string | undefined;
	readonly currentToothNumber?: number | string | undefined;
	readonly onCreateOrder?: ((order: any) => void) | undefined;
	readonly variant?: "modal" | "drawer" | undefined;
}

/**
 * DentalLabOrdersModal (Канонический SSOT наряда ЗТЛ: Мандат 8b 200–350 строк).
 * Соответствует Высшей Конституции THE HAMMER:
 * - Заказ в лабораторию (ЗТЛ): оформление ортопедических конструкций в 1-2 клика.
 * - Для отправки наряда технику достаточно выбрать зубы, вид конструкции и желаемый срок сдачи.
 * - Мандат 8e: Автономия врача — финансовый шлюз носит характер предупреждения, не блокируя наряд.
 * - Мандат 8am: Ровно 1 Primary CTA кнопка в teal (#0d9488), вторичные нейтральные.
 * - Apple HIG: Нативный Bottom Sheet на смартфонах (390x844) с drag handle 36x5px, 0px горизонтального скролла.
 */
export function DentalLabOrdersModal(props: ExtendedDentalLabOrderModalProps): React.JSX.Element | null {
	const effectiveInitialOrder = props.initialOrder || props.editingOrder || null;
	const effectivePatientId = props.patientId || props.currentPatientId;
	const effectivePatientName = props.patientName || props.currentPatientName;
	const effectiveDoctorId = props.doctorId || props.currentDoctorId;
	const effectiveDoctorName = props.doctorName || props.currentDoctorName;
	const effectiveToothFdi = props.initialToothFdi ?? props.currentToothNumber;

	const normalizedProps: BaseOrderModalProps = {
		...props,
		initialOrder: effectiveInitialOrder,
		patientId: effectivePatientId,
		patientName: effectivePatientName,
		doctorId: effectiveDoctorId,
		doctorName: effectiveDoctorName,
		initialToothFdi: effectiveToothFdi,
	};

	const form = useDentalLabOrderForm(normalizedProps);
	const [activeSubTab, setActiveSubTab] = useState<"main" | "shades" | "scans" | "stages" | "print">(
		(props.initialTab as any) || "main",
	);

	if (!props.isOpen) return null;

	const isEdit = Boolean(effectiveInitialOrder?.id);

	const handleScheduleFitting = () => {
		const draft = {
			patientId: form.formPatientId || effectivePatientId,
			patientName: form.formPatientName || effectivePatientName,
			doctorId: form.formDoctorId || effectiveDoctorId,
			doctorName: form.formDoctorName || effectiveDoctorName,
			title: `Примерка / фиксация: ${form.material || "ортопедия"} (зуб ${form.selectedTeeth.join(", ") || effectiveToothFdi || "челюсть"})`,
			durationMinutes: 45,
			orderId: effectiveInitialOrder?.id,
			orderNumber: form.gostOrderNumber,
		};
		if (typeof window !== "undefined") {
			try {
				window.localStorage.setItem("dente_schedule_quick_booking_draft", JSON.stringify(draft));
				window.dispatchEvent(new CustomEvent("dente-quick-appointment-draft", { detail: draft }));
				window.dispatchEvent(new CustomEvent("dente-open-quick-booking", { detail: draft }));
			} catch {}
		}
		showToast("Открыта быстрая запись на примерку / фиксацию", "success");
	};

	const readyOrderSummary = {
		id: effectiveInitialOrder?.id || "draft",
		orderNumber: form.gostOrderNumber || "ЗТЛ-01",
		patientId: form.formPatientId,
		patientName: form.formPatientName,
		doctorName: form.formDoctorName,
		toothFdi: form.selectedTeeth.length > 0 ? form.selectedTeeth.join(", ") : String(effectiveToothFdi || ""),
		material: form.material,
		colorVita: form.shadeClassical || form.shadeBleach || form.shadeBody || "A2",
		constructionType: form.constructionType,
		patientPhone: props.clinicPhone,
	};

	const modalContent = (
		<div
			className="fixed inset-0 z-[99999] flex items-center justify-center p-2 sm:p-4 max-sm:p-0 max-sm:items-end bg-black/75 backdrop-blur-sm overflow-y-auto"
			role="dialog"
			aria-modal="true"
			data-testid="lab-order-modal"
			data-qa="dental-lab-work-order-modal"
			onClick={(e) => {
				if (e.target === e.currentTarget) props.onClose();
			}}
		>
			<div
				className="relative w-full max-w-5xl bg-[var(--paper,#ffffff)] dark:bg-slate-900 text-[var(--ink,#0f172a)] dark:text-slate-100 border border-[var(--line,#cbd5e1)] dark:border-slate-800 rounded-2xl max-sm:rounded-t-[24px] max-sm:rounded-b-none shadow-2xl overflow-hidden flex flex-col max-h-[92vh] max-sm:max-h-[94vh]"
				data-testid="dental-lab-order-drawer"
				id="lab-order-modal-container"
			>
				{/* Apple HIG: Mobile Drag Handle (36x5px) */}
				<div className="sm:hidden w-9 h-1.5 bg-slate-300 dark:bg-slate-600 rounded-full mx-auto my-2.5 shrink-0" aria-hidden="true" />

				{/* 1. Header Bar */}
				<DentalLabOrderHeader
					isEdit={isEdit}
					orderNumber={effectiveInitialOrder?.orderNumber}
					gostOrderNumber={form.gostOrderNumber}
					patientName={form.formPatientName}
					patientChartNumber={props.patientChartNumber}
					doctorName={form.formDoctorName}
					stageNumber={props.stageNumber ?? form.stageNumber}
					stageTitle={props.stageTitle ?? form.stageTitle}
					dueDate={form.dueDate}
					selectedLabName={form.selectedLabName}
					selectedTeeth={form.selectedTeeth}
					jawScope={form.jawScope}
					onApplyDefaults={form.handleApplyOneClickDefaults}
					onPrint={form.handlePrint}
					onClose={props.onClose}
				/>

				{/* 2. Express Presets Bar (1-Click Orthopedic Presets) */}
				<div className="px-4 sm:px-6 py-2 border-b border-[var(--line,#cbd5e1)] dark:border-slate-800 bg-[var(--paper,#ffffff)] dark:bg-slate-900 flex items-center gap-2 overflow-x-auto scrollbar-none shrink-0">
					<span className="hidden sm:inline-block text-[11px] font-bold text-[var(--muted,#64748b)] whitespace-nowrap shrink-0 pr-1">
						Быстрый выбор:
					</span>
					{MODAL_EXPRESS_LAB_PRESETS.map((p) => (
						<button
							key={p.id}
							type="button"
							data-testid={`lab-preset-btn-${p.id}`}
							onClick={() => form.handleApplyExpressPreset(p)}
							className="px-2.5 py-1 min-h-[32px] rounded-lg border border-[var(--line,#cbd5e1)] dark:border-slate-700 hover:border-[#0d9488] bg-[var(--paper-soft,#f8fafc)] dark:bg-slate-800 hover:bg-teal-50 dark:hover:bg-teal-950/20 text-xs text-[var(--ink,#0f172a)] dark:text-slate-200 font-medium whitespace-nowrap transition cursor-pointer shrink-0"
						>
							{(p as any).name || (p as any).title || p.badge}
						</button>
					))}
				</div>

				{/* 3. Segmented Navigation Tabs */}
				<nav className="flex items-center border-b border-[var(--line,#cbd5e1)] dark:border-slate-800 bg-[var(--paper-soft,#f8fafc)] dark:bg-slate-950 px-3 sm:px-6 overflow-x-auto scrollbar-none shrink-0 gap-1">
					<button
						type="button"
						onClick={() => setActiveSubTab("main")}
						className={`!bg-transparent dark:!bg-transparent py-2.5 sm:py-3 px-3 text-xs font-bold border-b-2 whitespace-nowrap transition cursor-pointer flex items-center gap-1.5 shrink-0 ${
							activeSubTab === "main"
								? "border-[#0d9488] text-[#0d9488]"
								: "border-transparent text-[var(--muted,#64748b)] hover:text-[var(--ink,#0f172a)] dark:hover:text-slate-200"
						}`}
					>
						<Layers className="w-4 h-4 shrink-0" />
						<span><span className="hidden sm:inline">Конструкция и зубы FDI</span><span className="sm:hidden">Конструкция</span></span>
					</button>
					<button
						type="button"
						onClick={() => setActiveSubTab("shades")}
						className={`!bg-transparent dark:!bg-transparent py-2.5 sm:py-3 px-3 text-xs font-bold border-b-2 whitespace-nowrap transition cursor-pointer flex items-center gap-1.5 shrink-0 ${
							activeSubTab === "shades"
								? "border-[#0d9488] text-[#0d9488]"
								: "border-transparent text-[var(--muted,#64748b)] hover:text-[var(--ink,#0f172a)] dark:hover:text-slate-200"
						}`}
					>
						<Palette className="w-4 h-4 shrink-0" />
						<span><span className="hidden sm:inline">Шкала расцветки VITA</span><span className="sm:hidden">Шкала VITA</span></span>
					</button>
					<button
						type="button"
						onClick={() => setActiveSubTab("scans")}
						className={`!bg-transparent dark:!bg-transparent py-2.5 sm:py-3 px-3 text-xs font-bold border-b-2 whitespace-nowrap transition cursor-pointer flex items-center gap-1.5 shrink-0 ${
							activeSubTab === "scans"
								? "border-[#0d9488] text-[#0d9488]"
								: "border-transparent text-[var(--muted,#64748b)] hover:text-[var(--ink,#0f172a)] dark:hover:text-slate-200"
						}`}
					>
						<Upload className="w-4 h-4 shrink-0" />
						<span><span className="hidden sm:inline">3D-скан челюсти (STL / PLY)</span><span className="sm:hidden">3D-скан</span></span>
					</button>
					<button
						type="button"
						onClick={() => setActiveSubTab("stages")}
						className={`!bg-transparent dark:!bg-transparent py-2.5 sm:py-3 px-3 text-xs font-bold border-b-2 whitespace-nowrap transition cursor-pointer flex items-center gap-1.5 shrink-0 ${
							activeSubTab === "stages"
								? "border-[#0d9488] text-[#0d9488]"
								: "border-transparent text-[var(--muted,#64748b)] hover:text-[var(--ink,#0f172a)] dark:hover:text-slate-200"
						}`}
					>
						<Clock className="w-4 h-4 shrink-0" />
						<span><span className="hidden sm:inline">Сроки и статус ЗТЛ</span><span className="sm:hidden">Сроки</span></span>
					</button>
					<button
						type="button"
						onClick={() => setActiveSubTab("print")}
						className={`!bg-transparent dark:!bg-transparent py-2.5 sm:py-3 px-3 text-xs font-bold border-b-2 whitespace-nowrap transition cursor-pointer flex items-center gap-1.5 shrink-0 ${
							activeSubTab === "print"
								? "border-[#0d9488] text-[#0d9488]"
								: "border-transparent text-[var(--muted,#64748b)] hover:text-[var(--ink,#0f172a)] dark:hover:text-slate-200"
						}`}
					>
						<FileText className="w-4 h-4 shrink-0" />
						<span><span className="hidden sm:inline">Расчет и печать</span><span className="sm:hidden">Расчет</span></span>
					</button>
				</nav>

				{/* 4. Tab Body Content */}
				<div className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-6 space-y-4">
					{/* Financial Gate Soft Warning Banner (Мандат 8e: Автономия врача, Zero-Block) */}
					{form.financialGateResult?.isGatePassed === false && (
						<div
							className="p-3.5 rounded-xl border border-amber-500/40 bg-amber-500/10 text-xs text-amber-900 dark:text-amber-100 flex items-center justify-between gap-3 flex-wrap shadow-2xs"
							data-testid="lab-order-clinical-autonomy-banner"
						>
							<div className="flex items-center gap-2">
								<AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
								<span>
									Предупреждение финансового шлюза: аванс пациента менее 50%. Врач вправе направить наряд в лабораторию (Мандат 8e: Автономия врача).
								</span>
							</div>
							<button
								type="button"
								data-testid="btn-lab-override-financial-gate"
								onClick={async () => {
									form.setGateOverride({
										authorized: true,
										doctorName: form.formDoctorName || "Лечащий врач",
										timestampIso: new Date().toISOString(),
										reason: "Клиническое решение врача",
									});
									showToast("Клинический оверрайд врача применён", "info");
									await form.handleSaveOrder(undefined, true);
								}}
								className="px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs cursor-pointer shadow-2xs transition-colors"
							>
								Клинический оверрайд врача
							</button>
						</div>
					)}

					{/* TAB 1: Restoration, Teeth & Notes */}
					{activeSubTab === "main" && (
						<DentalLabRestorationTab
							selectedTeeth={form.selectedTeeth}
							setSelectedTeeth={form.setSelectedTeeth}
							toggleTooth={form.toggleTooth}
							selectQuadrant={form.selectQuadrant}
							constructionType={form.constructionType}
							setConstructionType={form.setConstructionType}
							material={form.material}
							setMaterial={form.setMaterial}
							dueDate={form.dueDate}
							setDueDate={form.setDueDate}
							clinicalNotes={form.clinicalNotes}
							setClinicalNotes={form.setClinicalNotes}
							impressionType={form.impressionType}
							setImpressionType={form.setImpressionType}
							includeImpressionBilling={form.includeImpressionBilling}
							setIncludeImpressionBilling={form.setIncludeImpressionBilling}
							jawScope={form.jawScope}
							setJawScope={form.setJawScope}
							shadeSystem={form.shadeSystem}
							setShadeSystem={form.setShadeSystem}
							shadeClassical={form.shadeClassical}
							setShadeClassical={(s) => {
								form.setShadeClassical(s);
								form.setShadeBody(s);
							}}
							shadeBleach={form.shadeBleach}
							setShadeBleach={(s) => {
								form.setShadeBleach(s);
								form.setShadeBody(s);
							}}
							shadeBody={form.shadeBody}
							setShadeBody={form.setShadeBody}
							onOpenAdvancedShades={() => setActiveSubTab("shades")}
							labType={form.labType}
							setLabType={form.setLabType}
							selectedLabName={form.selectedLabName}
							setSelectedLabName={form.setSelectedLabName}
							courierDays={form.courierDays}
							setCourierDays={form.setCourierDays}
							scheduledVisitDate={form.scheduledVisitDate}
							fittingDate={form.ceramicTrialDate}
							setFittingDate={form.setCeramicTrialDate}
						/>
					)}

					{/* TAB 2: VITA Shade Selector */}
					{activeSubTab === "shades" && (
						<div className="space-y-4">
							<div className="p-3 bg-[var(--paper-soft,#f8fafc)] rounded-xl border border-[var(--line,#cbd5e1)] text-xs text-[var(--ink,#0f172a)] font-medium">
								Шкала расцветки VITA: канонический выбор оттенка для тела коронки, культи и пришеечной зоны.
							</div>
							<DentalLabShadeSelector
								shadeSystem={form.shadeSystem}
								setShadeSystem={form.setShadeSystem}
								shadeClassical={form.shadeClassical}
								setShadeClassical={form.setShadeClassical}
								shade3dMaster={form.shade3dMaster}
								setShade3dMaster={form.setShade3dMaster}
								shadeBleach={form.shadeBleach}
								setShadeBleach={form.setShadeBleach}
								shadeCervical={form.shadeCervical}
								setShadeCervical={form.setShadeCervical}
								shadeBody={form.shadeBody}
								setShadeBody={form.setShadeBody}
								shadeIncisal={form.shadeIncisal}
								setShadeIncisal={form.setShadeIncisal}
								shadeStump={form.shadeStump}
								setShadeStump={form.setShadeStump}
								translucency={form.translucency}
								setTranslucency={form.setTranslucency}
								mamelons={form.mamelons}
								setMamelons={form.setMamelons}
								calcifications={form.calcifications}
								setCalcifications={form.setCalcifications}
								opalescence={form.opalescence}
								setOpalescence={form.setOpalescence}
								attachedImageUrl={form.attachedImageUrl}
								setAttachedImageUrl={form.setAttachedImageUrl}
							/>
						</div>
					)}

					{/* TAB 3: 3D Scan & Photo Attachments */}
					{activeSubTab === "scans" && (
						<DentalLabOrderScansTab
							attachedImageUrl={form.attachedImageUrl || ""}
							setAttachedImageUrl={form.setAttachedImageUrl}
						/>
					)}

					{/* TAB 4: Stages, Deadlines & Ready In Clinic Notification */}
					{activeSubTab === "stages" && (
						<DentalLabOrderStagesStepper
							currentStage={form.currentStage}
							onStageChange={form.setCurrentStage}
							dueDate={form.dueDate}
							onDueDateChange={form.setDueDate}
							frameworkTrialDate={form.frameworkTrialDate}
							onFrameworkTrialDateChange={form.setFrameworkTrialDate}
							ceramicTrialDate={form.ceramicTrialDate}
							onCeramicTrialDateChange={form.setCeramicTrialDate}
							scheduledVisitDate={form.scheduledVisitDate}
							onScheduleFitting={handleScheduleFitting}
							readyOrderSummary={readyOrderSummary}
							clinicPhone={props.clinicPhone}
						/>
					)}

					{/* TAB 5: Financials & A4 Printable Blank */}
					{activeSubTab === "print" && (
						<DentalLabOrderPrintTab
							form={form}
							totalLabPriceRub={form.totalLabPriceRub}
							priceRubInput={form.priceRubInput}
							doctorAmountRub={form.doctorAmountRub}
							doctorSharePct={form.doctorSharePct}
							onPrint={form.handlePrint}
							onShareMessenger={form.handleCopyMessengerSummary}
						/>
					)}
				</div>

				{/* 5. Footer: Neutral Secondaries & EXACTLY ONE Primary CTA */}
				<DentalLabOrderFooter
					jawScope={form.jawScope}
					selectedTeeth={form.selectedTeeth}
					isSubmitting={form.isSubmitting}
					isEdit={isEdit}
					onCopySummary={form.handleCopyMessengerSummary}
					onPrint={form.handlePrint}
					onClose={props.onClose}
					onSubmit={() => form.handleSaveOrder()}
				/>
			</div>
		</div>
	);

	if (typeof document !== "undefined") {
		return createPortal(modalContent, document.body);
	}
	return modalContent;
}

export {
	DentalLabOrdersModal as DentalLabOrderModal,
	DentalLabOrdersModal as DentalLabWorkOrderModal,
};
export default DentalLabOrdersModal;
