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
import "./labOrders.css";
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
			className="fixed inset-0 z-[70] flex items-center justify-center p-2 sm:p-4 max-sm:p-1 bg-slate-900/80 backdrop-blur-sm overflow-y-auto"
			role="dialog"
			aria-modal="true"
			aria-labelledby="dental-lab-modal-title"
		>
			<div className="relative w-full max-w-5xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] max-sm:max-h-[96vh]">
				
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
									Заказ-наряд в зуботехническую лабораторию (ЗТЛ)
								</h2>
								<span className="px-2 py-0.5 text-xs font-bold rounded-md bg-teal-500/15 text-teal-400 border border-teal-500/30 whitespace-nowrap shrink-0 inline-flex items-center">
									CAD/CAM Pro
								</span>
							</div>
							<p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 m-0 mt-0.5 truncate">
								Пациент: <span className="font-bold text-slate-800 dark:text-slate-200">{form.formPatientName}</span>{patientChartNumber ? ` (${patientChartNumber})` : ""} · Врач: <span className="font-bold text-slate-800 dark:text-slate-200">{form.formDoctorName}</span>
							</p>
						</div>
					</div>

					<div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
						<button
							type="button"
							onClick={form.handleApplyOneClickDefaults}
							className="min-h-[44px] sm:min-h-8 sm:h-8 inline-flex items-center gap-1.5 px-2.5 sm:px-3.5 py-1.5 sm:py-0 text-xs font-bold rounded-xl border border-amber-500/40 bg-amber-500/10 hover:bg-amber-500/20 text-amber-800 dark:text-amber-200 transition-colors shadow-xs shrink-0"
							title="1-клик пресет: Коронка ZrO2 (диоксид циркония), цвет А2, анатомическая форма, срок 5 рабочих дней"
							data-testid="lab-order-apply-defaults-btn"
						>
							<Sparkles className="w-4 h-4 text-amber-500" />
							<span className="hidden sm:inline">Пресет (ZrO2 А2, 5 дн.)</span>
						</button>
						<button
							type="button"
							onClick={form.handlePrint}
							className="min-h-[44px] sm:min-h-8 sm:h-8 inline-flex items-center gap-1.5 px-2.5 sm:px-3.5 py-1.5 sm:py-0 text-xs font-bold rounded-xl border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 transition-colors shadow-sm shrink-0"
							title="Печать наряда (ГОСТ)"
						>
							<Printer className="w-4 h-4" />
							<span className="hidden sm:inline">Печать (ГОСТ)</span>
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
				<div className="flex items-center gap-1.5 px-3 sm:px-6 py-1.5 border-b border-slate-200 dark:border-slate-800 bg-slate-100/60 dark:bg-slate-900/60 text-xs shrink-0 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden whitespace-nowrap">
					{[
						{ id: "main", label: "1. Зубы и Конструкция", icon: DentalBridge, fullTitle: "1. Зубная формула и Конструкция" },
						{ id: "shades", label: "2. Расцветка VITA", icon: ToothShadeGuide, fullTitle: "2. Расцветка VITA и Культя" },
						{ id: "stages", label: "3. Этапы и Сроки", icon: Clock, fullTitle: "3. Этапы ЗТЛ и Примерки" },
						{ id: "print", label: "4. Бланк ГОСТ", icon: DentalLabOrder, fullTitle: "4. Бланк наряда (ГОСТ) и QR" },
					].map((tab) => {
						const Icon = tab.icon;
						const isActive = form.activeTab === tab.id;
						return (
							<button
								key={tab.id}
								type="button"
								onClick={() => form.setActiveTab(tab.id as LabModalTabKey)}
								className={`lab-modal-tab-btn min-h-[34px] h-[34px] sm:h-8.5 whitespace-nowrap flex-shrink-0 ${isActive ? "is-active" : ""}`}
								title={tab.fullTitle}
							>
								<Icon className="w-4 h-4 shrink-0" />
								<span className="whitespace-nowrap">{tab.label}</span>
							</button>
						);
					})}
				</div>

				{/* ─── MODAL BODY WITH TAB PANELS ───────────────────────────────── */}
				<div className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-6 space-y-6">

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
										Экстренное показание (временная PMMA, примерка моста). Врач может отправить наряд в 1 клик.
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
							{/* 1-Click Express Presets Bar (Integrated inside Tab 1) */}
							<div className="flex items-center justify-between gap-2 p-2.5 rounded-2xl bg-amber-500/10 border border-amber-500/25 flex-wrap">
								<div className="flex items-center gap-1.5 flex-wrap">
									<span className="text-xs font-black text-amber-900 dark:text-amber-200 flex items-center gap-1 mr-1">
										<Sparkles size={14} className="text-amber-500" />
										<span>Экспресс 1-клик:</span>
									</span>
									{MODAL_EXPRESS_LAB_PRESETS.map((preset) => (
										<button
											key={preset.id}
											type="button"
											onClick={() => form.handleApplyExpressPreset(preset)}
											className="min-h-[36px] px-3 py-1.5 rounded-xl bg-white dark:bg-slate-800 hover:bg-amber-500/20 text-amber-900 dark:text-amber-100 border border-amber-500/30 text-xs font-bold transition-all shadow-2xs hover:scale-102 active:scale-95 cursor-pointer flex items-center gap-1.5 touch-manipulation min-w-0"
											title={preset.shortDesc}
											data-testid={`lab-preset-btn-${preset.id}`}
										>
											<Zap size={13} className="text-amber-500 shrink-0" />
											<span className="truncate">{preset.title}</span>
										</button>
									))}
								</div>
								<span className="text-[11px] text-amber-800/80 dark:text-amber-300/80 font-medium hidden md:inline flex items-center gap-1">
									<Sparkles size={12} className="text-amber-500 shrink-0" />
									<span>1 клик заполняет конструкцию, материал, цвет A2, сроки и нормальную анатомию</span>
								</span>
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

					{/* ═══ TAB 4: PRINTABLE BLANK (GOST) & QR CODE ══════════════════ */}
					{form.activeTab === "print" && (
						<div className="flex flex-col gap-3">
							<div className="flex items-center justify-between gap-2 px-2 py-1 bg-slate-50 dark:bg-slate-900/50 rounded-lg border border-slate-200 dark:border-slate-800">
								<div className="text-xs font-semibold text-slate-500">
									Наряд-заказ в зуботехническую лабораторию (ЗТЛ-1 · ГОСТ Р 51087-97)
								</div>
								<button
									type="button"
									onClick={form.handleCopyZtl1Protocol}
									className="px-3 py-1.5 rounded-lg border border-teal-500 text-teal-600 dark:text-teal-400 bg-teal-50 dark:bg-teal-950/40 text-xs font-bold hover:bg-teal-100 dark:hover:bg-teal-900/40 transition-colors flex items-center gap-1.5 min-h-[36px]"
									title="Скопировать текстовый протокол наряда ЗТЛ-1 в медицинскую карту"
								>
									<Copy size={14} />
									Скопировать протокол ЗТЛ-1
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

				{/* ─── MODAL FOOTER WITH SAVE / SUBMIT ───────────────────────────── */}
				<div className="flex flex-wrap items-center justify-between gap-3 px-4 sm:px-6 py-3.5 sm:py-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 shrink-0">
					<div className="text-xs text-slate-500 dark:text-slate-400 font-bold min-w-0 flex-1 sm:flex-initial">
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

					<div className="flex flex-wrap items-center gap-2 sm:gap-3 shrink-0 ml-auto">
						<button
							type="button"
							onClick={form.handleCopyMessengerSummary}
							data-testid="lab-order-copy-messenger-btn"
							className="min-h-[44px] sm:min-h-9 sm:h-9 px-3.5 sm:px-4 py-2 sm:py-0 text-xs font-bold rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors inline-flex items-center gap-1.5 cursor-pointer"
							title="Скопировать выжимку наряда для отправки курьеру или зубному технику в WhatsApp/Telegram"
						>
							<Copy className="w-4 h-4 text-teal-600 dark:text-teal-400 shrink-0" />
							<span className="hidden sm:inline">Скопировать для ЗТЛ</span>
							<span className="sm:hidden">ЗТЛ</span>
						</button>
						<button
							type="button"
							onClick={form.handlePrint}
							data-testid="lab-order-footer-print-btn"
							className="min-h-[44px] sm:min-h-9 sm:h-9 px-3.5 sm:px-4 py-2 sm:py-0 text-xs font-bold rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors inline-flex items-center gap-1.5 cursor-pointer"
							title="Распечатать наряд-заказ ГОСТ (А4)"
						>
							<Printer className="w-4 h-4 text-teal-600 dark:text-teal-400 shrink-0" />
							<span className="hidden sm:inline">Печать (А4)</span>
							<span className="sm:hidden">Печать</span>
						</button>
						<button
							type="button"
							onClick={onClose}
							disabled={form.isSubmitting}
							className="min-h-[44px] sm:min-h-9 sm:h-9 px-4 py-2 sm:py-0 text-xs font-bold rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer select-none inline-flex items-center justify-center"
						>
							Отмена
						</button>
						<button
							type="button"
							onClick={() => form.handleSaveOrder()}
							disabled={form.isSubmitting}
							className="min-h-[44px] sm:min-h-9 sm:h-9 px-4 sm:px-5 py-2.5 sm:py-0 text-xs font-bold rounded-xl bg-[var(--teal)] hover:opacity-90 active:scale-95 text-white shadow-md shadow-teal-500/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all inline-flex items-center justify-center gap-2 cursor-pointer select-none"
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

			</div>
		</div>
	);

	return typeof document !== "undefined"
		? createPortal(modalContent, document.body)
		: modalContent;
}

export { DentalLabOrderModal as DentalLabWorkOrderModal };
