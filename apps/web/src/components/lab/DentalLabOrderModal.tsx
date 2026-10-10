import React from "react";
import { createPortal } from "react-dom";
import {
	AlertTriangle,
	CheckCircle2,
	Copy,
	FlaskConical,
	Loader2,
	Printer,
	QrCode,
	Send,
	ShieldCheck,
	Sparkles,
	X,
	Zap,
	Clock,
} from "lucide-react";
import {
	ToothShadeGuide,
	DentalBridge,
	DentalLabOrder,
} from "../icons/DentalIcons";
if (typeof document !== "undefined") {
	void import("./labOrders.css");
}
import {
	type DentalLabOrderModalProps,
	formatJawScopeLabel,
} from "./labMath";
import { DentalLabRestorationTab } from "./DentalLabRestorationTab";
import { DentalLabShadeSelector } from "./DentalLabShadeSelector";
import { DentalLabPrintBlank } from "./DentalLabPrintBlank";
import { DentalLabStagesTab } from "./DentalLabStagesTab";
import {
	MODAL_EXPRESS_LAB_PRESETS,
	buildLabOrderMessengerSummary,
	type LabOrderMessengerParams,
	EXPRESS_PRESET_EMAX_CROWN,
	EXPRESS_PRESET_BRIDGE_ZIRCONIA,
	EXPRESS_PRESET_EMAX_INLAY,
} from "./dentalLabModalPresets";
import {
	useDentalLabOrderForm,
	type LabModalTabKey,
} from "./useDentalLabOrderForm";

// Re-export all types and constants for backwards compatibility with tests and callers
export * from "./labMath";
export {
	MODAL_EXPRESS_LAB_PRESETS,
	buildLabOrderMessengerSummary,
	type LabOrderMessengerParams,
	EXPRESS_PRESET_EMAX_CROWN,
	EXPRESS_PRESET_BRIDGE_ZIRCONIA,
	EXPRESS_PRESET_EMAX_INLAY,
};
export { DentalLabStagesTab };
export { useDentalLabOrderForm, type LabModalTabKey };

export function DentalLabOrderModal(props: DentalLabOrderModalProps) {
	const { isOpen, onClose, patientChartNumber, initialOrder } = props;
	const form = useDentalLabOrderForm(props);

	if (!isOpen) return null;

	const modalContent = (
		<div
			className="fixed inset-0 z-[99999] flex items-center justify-center p-2 sm:p-4 max-sm:p-0 bg-slate-900/80 backdrop-blur-sm overflow-y-auto"
			role="dialog"
			aria-modal="true"
			aria-labelledby="dental-lab-modal-title"
			data-testid="dental-lab-work-order-modal"
		>
			<div className="relative w-full max-w-5xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-sm:rounded-none shadow-2xl overflow-hidden flex flex-col max-h-[92vh] max-sm:h-full max-sm:max-h-full">
				
				{/* ─── MODAL HEADER ──────────────────────────────────────────────── */}
				<div className="flex items-center justify-between px-3 sm:px-6 py-3 sm:py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 gap-2">
					<div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
						<div className="w-9 h-9 sm:w-11 sm:h-11 rounded-xl bg-[var(--teal-surface)] border border-[var(--teal-soft)] flex items-center justify-center text-[var(--teal)] shadow-sm shrink-0">
							<FlaskConical className="w-4 h-4 sm:w-6 sm:h-6" />
						</div>
						<div className="min-w-0 flex-1">
							<div className="flex items-center flex-wrap gap-1.5 sm:gap-2">
								<h2
									id="dental-lab-modal-title"
									className="text-xs sm:text-base md:text-lg font-bold text-slate-900 dark:text-white m-0 leading-tight truncate"
								>
									Заказ в лабораторию (ЗТЛ)
								</h2>
								<span className="px-2 py-0.5 text-xs font-bold rounded-md bg-teal-500/15 text-teal-400 border border-teal-500/30 whitespace-nowrap shrink-0 inline-flex items-center">
									CAD/CAM Pro
								</span>
								{(form.treatmentPlanId || props.treatmentPlanId || form.stageTitle || props.stageTitle || form.stageNumber != null || props.stageNumber != null) && (
									<span
										className="px-2.5 py-0.5 text-[11px] sm:text-xs font-semibold rounded-md bg-teal-500/10 text-teal-700 dark:text-teal-300 border border-teal-500/30 whitespace-nowrap shrink-0 inline-flex items-center gap-1 shadow-2xs"
										data-testid="lab-order-treatment-stage-chip"
									>
										<span>
											План лечения: Этап {form.stageNumber ?? props.stageNumber ?? 1} · {form.stageTitle || props.stageTitle || "Ортопедический этап"}
										</span>
									</span>
								)}
							</div>
							<p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 m-0 mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5">
								<span>Пациент: <strong className="font-bold text-slate-800 dark:text-slate-200">{form.formPatientName}</strong>{patientChartNumber ? ` (${patientChartNumber})` : ""}</span>
								<span className="text-slate-300 dark:text-slate-700 hidden sm:inline">·</span>
								<span>Врач: <strong className="font-bold text-slate-800 dark:text-slate-200">{form.formDoctorName}</strong></span>
							</p>
						</div>
					</div>

					<div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
						<button
							type="button"
							onClick={form.handleApplyOneClickDefaults}
							className="min-h-[44px] sm:min-h-8 sm:h-8 inline-flex items-center gap-1.5 px-2.5 sm:px-3.5 py-1.5 sm:py-0 text-xs font-bold rounded-xl border border-amber-500/40 bg-amber-500/10 hover:bg-amber-500/20 text-amber-800 dark:text-amber-200 transition-colors shadow-xs shrink-0"
							title="Быстрый шаблон: Коронка ZrO2 (диоксид циркония), цвет А2, анатомическая форма, срок 5 рабочих дней"
							data-testid="lab-order-apply-defaults-btn"
						>
							<Sparkles className="w-4 h-4 text-amber-500" />
							<span className="hidden sm:inline">Шаблон (ZrO2 А2, 5 дн.)</span>
						</button>
						<button
							type="button"
							onClick={form.handlePrint}
							className="min-h-[44px] sm:min-h-8 sm:h-8 inline-flex items-center gap-1.5 px-2.5 sm:px-3.5 py-1.5 sm:py-0 text-xs font-bold rounded-xl border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 transition-colors shadow-sm shrink-0"
							title="Печать бланка наряда"
						>
							<Printer className="w-4 h-4" />
							<span className="hidden sm:inline">Печать</span>
						</button>
						<button
							type="button"
							onClick={onClose}
							data-testid="lab-order-modal-close-btn"
							className="min-h-[44px] min-w-[44px] sm:min-h-8 sm:min-w-8 sm:h-8 sm:w-8 rounded-xl flex items-center justify-center text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors shrink-0"
							aria-label="Закрыть модальное окно"
						>
							<X className="w-5 h-5 sm:w-5 sm:h-5" />
						</button>
					</div>
				</div>

				{/* ─── NAVIGATION TABS (Strictly 1 Clean Toolbar Row 32–36px / Hick's Law) ─── */}
				<div className="flex items-center gap-1 px-2.5 sm:px-6 py-1.5 border-b border-slate-200 dark:border-slate-800 bg-slate-100/60 dark:bg-slate-900/60 text-xs shrink-0 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden whitespace-nowrap touch-pan-x">
					{[
						{ id: "main", label: "1. Зубы и Конструкция", shortLabel: "1. Зубы", icon: DentalBridge, fullTitle: "1. Зубная формула и Конструкция" },
						{ id: "shades", label: "2. Расцветка VITA", shortLabel: "2. VITA", icon: ToothShadeGuide, fullTitle: "2. Расцветка VITA и Культя" },
						{ id: "stages", label: "3. Этапы и Сроки", shortLabel: "3. Этапы", icon: Clock, fullTitle: "3. Этапы ЗТЛ и Примерки" },
						{ id: "print", label: "4. Печатный бланк", shortLabel: "4. Бланк", icon: DentalLabOrder, fullTitle: "4. Бланк наряда и QR" },
					].map((tab) => {
						const Icon = tab.icon;
						const isActive = form.activeTab === tab.id;
						return (
							<button
								key={tab.id}
								type="button"
								onClick={() => form.setActiveTab(tab.id as LabModalTabKey)}
								className={`lab-modal-tab-btn min-h-[34px] h-[34px] sm:h-8.5 px-2.5 sm:px-3 whitespace-nowrap flex-shrink-0 flex items-center gap-1.5 text-xs font-semibold ${isActive ? "is-active" : ""}`}
								title={tab.fullTitle}
							>
								<Icon className="w-4 h-4 shrink-0" />
								<span className="hidden sm:inline whitespace-nowrap">{tab.label}</span>
								<span className="sm:hidden whitespace-nowrap">{tab.shortLabel}</span>
							</button>
						);
					})}
				</div>

				{/* ─── MODAL BODY WITH TAB PANELS ───────────────────────────────── */}
				<div className="flex-1 min-h-0 overflow-y-auto p-3 sm:p-6 pb-32 sm:pb-8 space-y-5">

					{/* ─── DOCTOR CLINICAL AUTONOMY OVERRIDE BANNER (Mandate 8e) ─── */}
					{!form.financialGateResult.isGatePassed && !form.gateOverride && (
						<div
							className="p-3.5 rounded-2xl bg-teal-500/15 border-2 border-teal-500/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
							data-testid="lab-order-clinical-autonomy-banner"
						>
							<div className="flex items-start gap-2.5 min-w-0">
								<Sparkles size={18} className="text-teal-600 dark:text-teal-400 shrink-0 mt-0.5" />
								<div>
									<div className="font-extrabold text-teal-950 dark:text-teal-100 text-xs">
										Финансовый контроль ЗТЛ: Внесено {form.financialGateResult.paidPercent}% (порог аванса 50%)
									</div>
									<div className="text-[11px] text-teal-900/80 dark:text-teal-300/80 mt-0.5">
										Экстренное показание (временная PMMA, примерка моста). Врач может отправить наряд без ожидания оплаты.
									</div>
									{form.financialGateResult.isPlanExpiredNotice && (
										<div className="text-[11px] text-teal-700 dark:text-teal-300 font-bold mt-1 flex items-center gap-1">
											<CheckCircle2 size={12} className="shrink-0" />
											<span>{form.financialGateResult.isPlanExpiredNotice}</span>
										</div>
									)}
								</div>
							</div>

							<button
								type="button"
								onClick={() => {
									form.setGateOverride({
										authorized: true,
										doctorName: form.formDoctorName || "Лечащий врач",
										timestampIso: new Date().toISOString(),
										reason: "Отправить наряд в ЗТЛ — клиническое решение лечащего врача",
									});
									form.handleSaveOrder(undefined, true);
								}}
								className="min-h-[40px] px-3.5 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm transition cursor-pointer shrink-0"
								data-testid="btn-lab-override-financial-gate"
								title="Отправить наряд в ЗТЛ — клиническое решение лечащего врача"
							>
								<ShieldCheck size={15} />
								<span>Отправить наряд в ЗТЛ — клиническое решение лечащего врача</span>
							</button>
						</div>
					)}

					{/* ─── TREATMENT PLAN AGE SOFT NOTICE (Mandate 8e / 8n: Never blocks) ─── */}
					{(form.financialGateResult.isGatePassed || Boolean(form.gateOverride)) && form.financialGateResult.isPlanExpiredNotice && (
						<div
							className="p-3 rounded-xl bg-teal-500/10 border border-teal-500/30 flex items-center gap-2.5 text-xs text-teal-800 dark:text-teal-200"
							data-testid="lab-order-plan-expired-soft-notice"
						>
							<CheckCircle2 size={16} className="text-teal-600 dark:text-teal-400 shrink-0" />
							<span>{form.financialGateResult.isPlanExpiredNotice} (отправка наряда ЗТЛ не блокируется)</span>
						</div>
					)}

					{/* ─── FITTING APPOINTMENT COLLISION GUARD BANNER (Mandate 8e, 8n) ─── */}
					{form.fittingCollision?.hasCollision && (
						<div
							className="p-3.5 rounded-2xl bg-amber-500/15 border-2 border-amber-500/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
							data-testid="lab-order-fitting-collision-banner"
						>
							<div className="flex items-start gap-2.5 min-w-0">
								<AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
								<div>
									<div className="font-extrabold text-amber-950 dark:text-amber-100 text-xs">
										Внимание: прием на примерку назначен раньше готовности лаборатории!
									</div>
									<div className="text-[11px] text-amber-900/80 dark:text-amber-300/80 mt-0.5">
										{form.fittingCollision.warningRu || "Визит на примерку назначен раньше расчетной даты готовности конструкции в ЗТЛ."}
									</div>
								</div>
							</div>
							<div className="flex items-center gap-2 shrink-0">
								<button
									type="button"
									onClick={() => form.setActiveTab("stages")}
									className="min-h-[36px] px-3 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs transition cursor-pointer shrink-0"
									data-testid="btn-lab-inspect-collision-stages"
								>
									<Clock className="w-3.5 h-3.5" />
									<span>Скорректировать этапы / сроки</span>
								</button>
							</div>
						</div>
					)}

					{/* ═══ TAB 1: MAIN SPECS & ODONTOGRAM ═══════════════════════════ */}
					{form.activeTab === "main" && (
						<div className="space-y-4">
							{/* Express Presets Bar (Integrated inside Tab 1) */}
							<div className="flex flex-col gap-2 p-2.5 rounded-2xl bg-amber-500/10 border border-amber-500/25 w-full max-w-full overflow-hidden">
								<div className="flex items-center justify-between gap-2 w-full">
									<span className="text-xs font-black text-amber-900 dark:text-amber-200 flex items-center gap-1 shrink-0">
										<Sparkles size={14} className="text-amber-500" />
										<span>Быстрые шаблоны:</span>
									</span>
									<span className="text-[11px] text-amber-800/80 dark:text-amber-300/80 font-medium hidden sm:inline flex items-center gap-1 shrink-0">
										<Sparkles size={12} className="text-amber-500 shrink-0" />
										<span>Автозаполнение конструкции, материала, цвета A2 и сроков</span>
									</span>
								</div>
								<div className="flex items-center gap-1.5 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden w-full max-w-full py-0.5">
									{MODAL_EXPRESS_LAB_PRESETS.map((preset) => (
										<button
											key={preset.id}
											type="button"
											onClick={() => form.handleApplyExpressPreset(preset)}
											className="min-h-[36px] px-3 py-1.5 rounded-xl bg-white dark:bg-slate-800 hover:bg-amber-500/20 text-amber-900 dark:text-amber-100 border border-amber-500/30 text-xs font-bold transition-all shadow-2xs hover:scale-102 active:scale-95 cursor-pointer flex items-center gap-1.5 touch-manipulation shrink-0 whitespace-nowrap"
											title={preset.shortDesc}
											data-testid={`lab-preset-btn-${preset.id}`}
										>
											<Zap size={13} className="text-amber-500 shrink-0" />
											<span>{preset.badge || preset.title}</span>
										</button>
									))}
								</div>
							</div>

							<DentalLabRestorationTab
								jawScope={form.jawScope}
								setJawScope={form.setJawScope}
								selectedTeeth={form.selectedTeeth}
								setSelectedTeeth={form.setSelectedTeeth}
								toggleTooth={form.toggleTooth}
								selectQuadrant={form.selectQuadrant}
								constructionType={form.constructionType}
								setConstructionType={form.setConstructionType}
								material={form.material}
								setMaterial={form.setMaterial}
								impressionType={form.impressionType}
								setImpressionType={form.setImpressionType}
								includeImpressionBilling={form.includeImpressionBilling}
								setIncludeImpressionBilling={form.setIncludeImpressionBilling}
								dueDate={form.dueDate}
								setDueDate={form.setDueDate}
								clinicalNotes={form.clinicalNotes}
								setClinicalNotes={form.setClinicalNotes}
								shadeSystem={form.shadeSystem}
								setShadeSystem={form.setShadeSystem}
								shadeClassical={form.shadeClassical}
								setShadeClassical={(s) => {
									form.setShadeClassical(s);
									form.setShadeBody(s);
								}}
								shade3dMaster={form.shade3dMaster}
								setShade3dMaster={(s) => {
									form.setShade3dMaster(s);
									form.setShadeBody(s);
								}}
								shadeBleach={form.shadeBleach}
								setShadeBleach={(s) => {
									form.setShadeBleach(s);
									form.setShadeBody(s);
								}}
								shadeBody={form.shadeBody}
								setShadeBody={form.setShadeBody}
								onOpenAdvancedShades={() => form.setActiveTab("shades")}
							/>
						</div>
					)}

					{/* ═══ TAB 2: VITA SHADES & STUMP PREPARATION ════════════════════ */}
					{form.activeTab === "shades" && (
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
					)}

					{/* ═══ TAB 3: LAB STAGES & TRIAL FITTINGS TRACKER ═══════════════ */}
					{form.activeTab === "stages" && (
						<DentalLabStagesTab
							dueDate={form.dueDate}
							setDueDate={form.setDueDate}
							frameworkTrialDate={form.frameworkTrialDate}
							setFrameworkTrialDate={form.setFrameworkTrialDate}
							ceramicTrialDate={form.ceramicTrialDate}
							setCeramicTrialDate={form.setCeramicTrialDate}
							currentStage={form.currentStage}
							setCurrentStage={form.setCurrentStage}
							scheduledVisitDate={form.scheduledVisitDate}
						/>
					)}

					{/* ═══ TAB 4: PRINTABLE BLANK & QR CODE ══════════════════ */}
					{form.activeTab === "print" && (
						<div className="flex flex-col gap-3">
							<div className="flex items-center justify-between gap-2 px-2 py-1 bg-slate-50 dark:bg-slate-900/50 rounded-lg border border-slate-200 dark:border-slate-800">
								<div className="text-xs font-semibold text-slate-500">
									Наряд-заказ в зуботехническую лабораторию
								</div>
								<button
									type="button"
									onClick={form.handleCopyZtl1Protocol}
									className="px-3 py-1.5 rounded-lg border border-teal-500 text-teal-600 dark:text-teal-400 bg-teal-50 dark:bg-teal-950/40 text-xs font-bold hover:bg-teal-100 dark:hover:bg-teal-900/40 transition-colors flex items-center gap-1.5 min-h-[36px]"
									title="Скопировать текстовый протокол наряда в медицинскую карту"
								>
									<Copy size={14} />
									Скопировать протокол наряда
								</button>
							</div>
							<DentalLabPrintBlank
								gostOrderNumber={form.gostOrderNumber}
								secureToken={form.secureToken}
								formPatientName={form.formPatientName}
								formDoctorName={form.formDoctorName}
								selectedTeeth={form.selectedTeeth}
								jawScope={form.jawScope}
								constructionType={form.constructionType}
								material={form.material}
								shadeSystem={form.shadeSystem}
								shadeClassical={form.shadeClassical}
								shade3dMaster={form.shade3dMaster}
								shadeBleach={form.shadeBleach}
								shadeCervical={form.shadeCervical}
								shadeBody={form.shadeBody}
								shadeIncisal={form.shadeIncisal}
								shadeStump={form.shadeStump}
								translucency={form.translucency}
								mamelons={form.mamelons}
								calcifications={form.calcifications}
								opalescence={form.opalescence}
								impressionType={form.impressionType}
								frameworkTrialDate={form.frameworkTrialDate}
								ceramicTrialDate={form.ceramicTrialDate}
								dueDate={form.dueDate}
								clinicalNotes={form.clinicalNotes}
								totalLabPriceRub={form.totalLabPriceRub}
								portalUrl={form.portalUrl}
								handlePrint={form.handlePrint}
								currentStage={form.currentStage}
							/>
						</div>
					)}
				</div>

				{/* ─── MODAL FOOTER WITH SAVE / SUBMIT (DESKTOP & DEDICATED APPLE HIG MOBILE) ─── */}
				{/* 1. Десктопный футер (от 640px) */}
				<div className="hidden sm:flex items-center justify-between gap-3 px-6 py-3.5 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/90 shrink-0">
					<div className="text-xs text-slate-500 dark:text-slate-400 font-bold min-w-0 flex-initial">
						{form.jawScope ? (
							<span className="break-words">
								Наряд на челюсть: <strong className="text-emerald-700 dark:text-emerald-300 text-sm font-extrabold">{formatJawScopeLabel(form.jawScope)}</strong>
							</span>
						) : form.selectedTeeth.length > 0 ? (
							<span className="break-words">
								Зубы FDI: <strong className="text-slate-800 dark:text-slate-200 text-sm">{form.selectedTeeth.join(", ")}</strong>
							</span>
						) : (
							<span>Зубы FDI: <strong className="text-slate-800 dark:text-slate-200 text-sm">Общий наряд / Челюсть</strong></span>
						)}
					</div>

					<div className="flex items-center gap-2.5 shrink-0 ml-auto">
						<button
							type="button"
							onClick={form.handleCopyMessengerSummary}
							data-testid="lab-order-copy-messenger-btn"
							className="min-h-[44px] h-11 px-3.5 text-xs font-bold rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors inline-flex items-center gap-1.5 cursor-pointer shadow-2xs"
							title="Скопировать выжимку наряда для отправки курьеру или зубному технику в WhatsApp/Telegram"
						>
							<Copy className="w-4 h-4 text-teal-600 dark:text-teal-400 shrink-0" />
							<span>Скопировать для ЗТЛ</span>
						</button>
						<button
							type="button"
							onClick={form.handlePrint}
							data-testid="lab-order-footer-print-btn"
							className="min-h-[44px] h-11 px-3.5 text-xs font-bold rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors inline-flex items-center gap-1.5 cursor-pointer shadow-2xs"
							title="Распечатать наряд-заказ (А4)"
						>
							<Printer className="w-4 h-4 text-teal-600 dark:text-teal-400 shrink-0" />
							<span>Печать (А4)</span>
						</button>
						<button
							type="button"
							onClick={onClose}
							disabled={form.isSubmitting}
							className="h-9 px-4 text-xs font-bold rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer select-none inline-flex items-center justify-center shadow-2xs"
						>
							Отмена
						</button>
						<button
							type="button"
							onClick={() => form.handleSaveOrder()}
							disabled={form.isSubmitting}
							style={{ backgroundColor: "var(--teal, #0d9488)", color: "#ffffff" }}
							className="h-9 px-5 text-xs font-bold rounded-xl hover:opacity-90 active:scale-95 text-white shadow-md shadow-teal-500/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all inline-flex items-center justify-center gap-2 cursor-pointer select-none"
							data-testid="submit-lab-order-btn"
						>
							{form.isSubmitting ? (
								<>
									<Loader2 className="w-4 h-4 animate-spin" />
									Сохранение наряда...
								</>
							) : (
								<>
									<Send className="w-4 h-4" />
									{initialOrder?.id ? "Сохранить изменения" : "Оформить наряд в ЗТЛ"}
								</>
							)}
						</button>
					</div>
				</div>

				{/* 2. Мобильный футер (Apple HIG / Floating Bottom Bar) */}
				<div className="flex sm:hidden flex-col gap-2 p-3 border-t border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md shrink-0 pb-[calc(1rem+env(safe-area-inset-bottom,0px))]">
					<div className="flex items-center justify-between gap-2">
						<div className="text-[11.5px] font-bold text-slate-600 dark:text-slate-300 truncate min-w-0">
							{form.jawScope ? (
								<span>Наряд: <strong className="text-emerald-600 dark:text-emerald-400">{formatJawScopeLabel(form.jawScope)}</strong></span>
							) : form.selectedTeeth.length > 0 ? (
								<span>Зубы FDI: <strong className="text-slate-900 dark:text-white">{form.selectedTeeth.join(", ")}</strong></span>
							) : (
								<span>Зубы: <strong>Общий наряд</strong></span>
							)}
						</div>
						<div className="flex items-center gap-1.5 shrink-0">
							<button
								type="button"
								onClick={form.handleCopyMessengerSummary}
								className="h-8 px-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 text-[11px] font-bold text-slate-700 dark:text-slate-200 inline-flex items-center gap-1 active:scale-95"
								title="Скопировать выжимку"
							>
								<Copy size={13} className="text-teal-600 dark:text-teal-400" />
								<span>Копия</span>
							</button>
							<button
								type="button"
								onClick={form.handlePrint}
								className="h-8 px-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 text-[11px] font-bold text-slate-700 dark:text-slate-200 inline-flex items-center gap-1 active:scale-95"
								title="Печать (А4)"
							>
								<Printer size={13} className="text-teal-600 dark:text-teal-400" />
								<span>А4</span>
							</button>
							<button
								type="button"
								onClick={onClose}
								className="h-8 px-2.5 rounded-lg border border-slate-300 dark:border-slate-700 text-[11px] font-bold text-slate-600 dark:text-slate-400 active:scale-95"
							>
								Отмена
							</button>
						</div>
					</div>

					<button
						type="button"
						onClick={() => form.handleSaveOrder()}
						disabled={form.isSubmitting}
						style={{ backgroundColor: "var(--teal, #0d9488)", color: "#ffffff" }}
						className="w-full h-12 min-h-[48px] rounded-xl hover:opacity-90 active:scale-98 text-white font-extrabold text-sm flex items-center justify-center gap-2 shadow-md disabled:opacity-50 transition-transform cursor-pointer"
						data-testid="submit-lab-order-btn"
					>
						{form.isSubmitting ? (
							<>
								<Loader2 className="w-5 h-5 animate-spin" />
								<span>Сохранение наряда...</span>
							</>
						) : (
							<>
								<Send className="w-5 h-5" />
								<span>{initialOrder?.id ? "Сохранить изменения" : "Оформить наряд в ЗТЛ"}</span>
							</>
						)}
					</button>
				</div>

			</div>
		</div>
	);

	return typeof document !== "undefined"
		? createPortal(modalContent, document.body)
		: modalContent;
}

export { DentalLabOrderModal as DentalLabWorkOrderModal };
