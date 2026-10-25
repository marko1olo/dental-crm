import React from "react";
import { AlertTriangle, ShieldCheck, Copy, X, Sparkles, Building2, Stethoscope, Check, Printer, FileText } from "lucide-react";
import { DENTAL_CLINICAL_PRESETS } from "./sickLeaveElnPresets";
import { SINGLE_DOCTOR_MAX_DAYS } from "./sickLeaveElnEngine";
import {
	SickLeaveElnModalProps, ElnPatientAndJobSection, ElnDiagnosisAndPeriodSection,
	ElnPrintPreviewDrawer, SickLeaveRegistrySection, useSickLeaveElnLogic,
} from "./elnModal";
import "./sickLeaveEln.css";

export type { SickLeaveElnModalProps };

/**
 * SickLeaveElnModal - Оформление электронного листка нетрудоспособности
 * Заседание врачебной комиссии (ВК) не требуется для амбулаторной практики
 */
export function SickLeaveElnModal(props: SickLeaveElnModalProps) {
	const { isOpen, onClose, onApplyToDiary } = props;
	const logic = useSickLeaveElnLogic(props);
	if (!isOpen) return null;

	return (
		<div className="sick-leave-modal-overlay" role="dialog" aria-modal="true">
			<div className="sick-leave-modal-container max-w-4xl bg-[var(--paper)] rounded-2xl border border-[var(--line)] shadow-2xl">
				<div className="sick-leave-header p-3 sm:p-4 border-b border-[var(--line)] flex items-center justify-between gap-2">
					<div className="flex items-center gap-2.5 min-w-0 flex-1">
						<div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-teal-500/15 text-[var(--teal)] flex items-center justify-center shrink-0"><Stethoscope size={18} /></div>
						<div className="min-w-0 flex-1">
							<h3 className="m-0 text-sm sm:text-base font-bold text-[var(--ink)] truncate">Листок нетрудоспособности и справка (ЭЛН)</h3>
							<div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
								<span className="text-[11px] sm:text-xs font-mono font-bold px-1.5 py-0.5 rounded bg-[var(--paper-soft)] border border-[var(--line)] text-[var(--ink)]">№ {logic.formState.elnNumber}</span>
								<span className={`text-[11px] sm:text-xs font-bold px-1.5 py-0.5 rounded border inline-flex items-center gap-1 ${logic.validation.singleDoctorLimitExceeded ? "bg-amber-500/10 text-amber-700 border-amber-500/30" : "bg-teal-500/10 text-[var(--teal)] border-teal-500/30"}`}>
									{logic.validation.singleDoctorLimitExceeded ? <><AlertTriangle size={11} /><span>{logic.validation.totalDays} дн. (согласовано)</span></> : <><ShieldCheck size={11} /><span>{logic.validation.totalDays} дн. (лечащий врач)</span></>}
								</span>
							</div>
						</div>
					</div>
					<button type="button" onClick={onClose} title="Закрыть" aria-label="Закрыть" className="sick-leave-close-btn shrink-0"><X size={18} /></button>
				</div>

				<div className="p-2.5 px-4 bg-[var(--paper-soft)] border-b border-[var(--line)] flex items-center gap-1.5 overflow-x-auto">
					<span className="text-xs font-bold text-[var(--muted)] flex items-center gap-1 shrink-0"><Sparkles size={13} />Шаблоны:</span>
					{Object.entries(DENTAL_CLINICAL_PRESETS).map(([key, preset]) => (
						<button key={key} type="button" className={`px-2.5 py-1 text-xs font-semibold rounded-lg border transition-colors cursor-pointer shrink-0 ${logic.selectedPresetId === key ? "border-[var(--teal)] bg-[var(--teal)] text-white" : "border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] hover:border-[var(--teal)]"}`} onClick={() => logic.handleApplyPreset(key)}>
							{preset.shortTitleRu} ({preset.defaultDays} дн.)
						</button>
					))}
				</div>

				<div className="p-2 px-4 border-b border-[var(--line)] flex gap-1.5 overflow-x-auto">
					<button type="button" className={`sick-leave-tab-btn ${logic.activeTab === 'eln_form' ? 'active' : ''}`} onClick={() => logic.setActiveTab('eln_form')}>
						<FileText size={14} className="inline mr-1" /> Оформление
					</button>
					<button type="button" className={`sick-leave-tab-btn ${logic.activeTab === 'patient_memo' ? 'active' : ''}`} onClick={() => logic.setActiveTab('patient_memo')}>
						<Printer size={14} className="inline mr-1" /> Справка и памятка (А5)
					</button>
					<button type="button" className={`sick-leave-tab-btn ${logic.activeTab === 'registry' || logic.activeTab === 'journal_036' ? 'active' : ''}`} onClick={() => logic.setActiveTab('registry')}>
						<Building2 size={14} className="inline mr-1" /> Реестр листков
					</button>
				</div>

				<div className="p-4 overflow-y-auto max-h-[60vh]">
					{logic.activeTab === 'eln_form' && (
						<div className="flex flex-col gap-3">
							<ElnPatientAndJobSection patientData={logic.patientData} onPatientDataChange={logic.setPatientData} />
							<ElnDiagnosisAndPeriodSection formState={logic.formState} setFormState={logic.setFormState} handleAddPeriod={logic.handleAddPeriod} handleRemovePeriod={logic.handleRemovePeriod} handlePeriodDateChange={logic.handlePeriodDateChange} onQuickSetDays={logic.handleQuickSetDays} />
						</div>
					)}
					{logic.activeTab === 'patient_memo' && <ElnPrintPreviewDrawer formState={logic.formState} patientData={logic.patientData} onPrintMemo={logic.handlePrintMemo} />}
					{(logic.activeTab === 'registry' || logic.activeTab === 'journal_036') && <SickLeaveRegistrySection entry={logic.registryEntry} />}
				</div>

				<div className="p-3 px-4 border-t border-[var(--line)] bg-[var(--paper-soft)] flex items-center justify-between flex-wrap gap-2 sick-leave-footer">
					<div className="text-xs text-[var(--muted)]">Всего дней: <strong>{logic.validation.totalDays}</strong> | Лимит врача: <strong>{SINGLE_DOCTOR_MAX_DAYS} дн.</strong></div>
					<div className="flex items-center gap-2 sick-leave-actions">
						<div className="flex items-center gap-2 sick-leave-actions-secondary">
							<button type="button" className="sick-leave-btn secondary" onClick={logic.handleCopyDiarySnippet}>
								{logic.isCopiedDiary ? <Check size={14} /> : <Copy size={14} />}<span>{logic.isCopiedDiary ? 'Скопировано' : 'В карту'}</span>
							</button>
							<button type="button" className="sick-leave-btn secondary" onClick={logic.handlePrintMemo} title="Распечатать справку">
								<Printer size={14} /><span>Печать</span>
							</button>
						</div>
						<button type="button" className="sick-leave-btn primary" onClick={logic.handleApplyDiary} title="Вставить в медицинскую карту приёма">
							<Check size={15} /><span>{onApplyToDiary ? 'Вставить в дневник' : 'Выдать справку'}</span>
						</button>
					</div>
				</div>
			</div>
		</div>
	);
}
