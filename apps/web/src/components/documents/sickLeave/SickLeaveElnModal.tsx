import React from "react";
import { AlertTriangle, ShieldCheck, Copy, Send, X, Sparkles, Building2, UserCheck, Stethoscope, Check, Key, Printer, FileText } from "lucide-react";
import { DENTAL_CLINICAL_PRESETS } from "./sickLeaveElnPresets";
import { SINGLE_DOCTOR_MAX_DAYS } from "./sickLeaveElnEngine";
import {
	SickLeaveElnModalProps, ElnPatientAndJobSection, ElnDiagnosisAndPeriodSection,
	ElnDigitalSignatureSection, ElnPrintPreviewDrawer, ElnVkProtocolSection,
	ElnJournal036Section, ElnSfrPayloadSection, useSickLeaveElnLogic,
} from "./elnModal";
import "./sickLeaveEln.css";

export type { SickLeaveElnModalProps };

const btnSecondary = "inline-flex items-center gap-1.5 min-h-[36px] px-3 text-xs font-bold rounded-lg border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] shadow-2xs hover:border-[var(--teal)] hover:text-[var(--teal)] transition-colors cursor-pointer";
const btnPrimary = "inline-flex items-center gap-1.5 min-h-[36px] px-3.5 text-xs font-bold rounded-lg bg-[var(--teal)] text-white shadow-2xs hover:bg-[var(--teal-hover,var(--teal))] transition-colors cursor-pointer border-none";

export function SickLeaveElnModal(props: SickLeaveElnModalProps) {
	const { isOpen, onClose, onApplyToDiary } = props;
	const logic = useSickLeaveElnLogic(props);
	if (!isOpen) return null;

	return (
		<div className="sick-leave-modal-overlay" role="dialog" aria-modal="true">
			<div className="sick-leave-modal-container max-w-4xl bg-[var(--paper)] rounded-2xl border border-[var(--line)] shadow-2xl">
				<div className="sick-leave-header p-4 border-b border-[var(--line)] flex items-center justify-between">
					<div className="flex items-center gap-2.5">
						<div className="w-9 h-9 rounded-xl bg-teal-500/15 text-[var(--teal)] flex items-center justify-center shrink-0"><Stethoscope size={20} /></div>
						<div>
							<h3 className="m-0 text-base font-bold text-[var(--ink)]">Справка об освобождении от работы (ЭЛН)</h3>
							<div className="flex items-center gap-2 mt-1">
								<span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-[var(--paper-soft)] border border-[var(--line)] text-[var(--ink)]">№ {logic.formState.elnNumber}</span>
								<span className={`text-xs font-bold px-2 py-0.5 rounded border inline-flex items-center gap-1 ${logic.validation.singleDoctorLimitExceeded ? "bg-amber-500/10 text-amber-700 border-amber-500/30" : "bg-teal-500/10 text-[var(--teal)] border-teal-500/30"}`}>
									{logic.validation.singleDoctorLimitExceeded ? <><AlertTriangle size={12} /><span>{logic.validation.totalDays} дн. (требуется ВК)</span></> : <><ShieldCheck size={12} /><span>{logic.validation.totalDays} дн. (лечащий врач)</span></>}
								</span>
							</div>
						</div>
					</div>
					<button type="button" onClick={onClose} title="Закрыть" aria-label="Закрыть" className="w-9 h-9 rounded-lg border border-[var(--line)] bg-[var(--paper)] text-[var(--muted)] hover:text-[var(--ink)] hover:border-[var(--teal)] flex items-center justify-center cursor-pointer transition-colors"><X size={18} /></button>
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
					<button type="button" className={`px-3 py-1.5 text-xs font-bold rounded-lg border transition-colors cursor-pointer shrink-0 ${logic.activeTab === 'eln_form' ? 'border-[var(--teal)] bg-[var(--teal)] text-white' : 'border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] hover:border-[var(--teal)]'}`} onClick={() => logic.setActiveTab('eln_form')}>
						<FileText size={14} className="inline mr-1" /> Оформление
					</button>
					<button type="button" className={`px-3 py-1.5 text-xs font-bold rounded-lg border transition-colors cursor-pointer shrink-0 ${logic.activeTab === 'vk_protocol' ? 'border-[var(--teal)] bg-[var(--teal)] text-white' : 'border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] hover:border-[var(--teal)]'}`} onClick={() => logic.setActiveTab('vk_protocol')}>
						<UserCheck size={14} className="inline mr-1" /> Освобождение
					</button>
					<button type="button" className={`px-3 py-1.5 text-xs font-bold rounded-lg border transition-colors cursor-pointer shrink-0 ${logic.activeTab === 'digital_signature' ? 'border-[var(--teal)] bg-[var(--teal)] text-white' : 'border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] hover:border-[var(--teal)]'}`} onClick={() => logic.setActiveTab('digital_signature')}>
						<Key size={14} className="inline mr-1" /> УКЭП
					</button>
					<button type="button" className={`px-3 py-1.5 text-xs font-bold rounded-lg border transition-colors cursor-pointer shrink-0 ${logic.activeTab === 'journal_036' ? 'border-[var(--teal)] bg-[var(--teal)] text-white' : 'border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] hover:border-[var(--teal)]'}`} onClick={() => logic.setActiveTab('journal_036')}>
						<Building2 size={14} className="inline mr-1" /> Журнал
					</button>
					<button type="button" className={`px-3 py-1.5 text-xs font-bold rounded-lg border transition-colors cursor-pointer shrink-0 ${logic.activeTab === 'patient_memo' ? 'border-[var(--teal)] bg-[var(--teal)] text-white' : 'border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] hover:border-[var(--teal)]'}`} onClick={() => logic.setActiveTab('patient_memo')}>
						<Printer size={14} className="inline mr-1" /> Памятка
					</button>
					<button type="button" className={`px-3 py-1.5 text-xs font-bold rounded-lg border transition-colors cursor-pointer shrink-0 ${logic.activeTab === 'xml_sfr' ? 'border-[var(--teal)] bg-[var(--teal)] text-white' : 'border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] hover:border-[var(--teal)]'}`} onClick={() => logic.setActiveTab('xml_sfr')}>
						<Send size={14} className="inline mr-1" /> СФР XML
					</button>
				</div>

				<div className="p-4 overflow-y-auto max-h-[60vh]">
					{logic.activeTab === 'eln_form' && (
						<div className="flex flex-col gap-3">
							<ElnPatientAndJobSection patientData={logic.patientData} onPatientDataChange={logic.setPatientData} />
							<ElnDiagnosisAndPeriodSection formState={logic.formState} setFormState={logic.setFormState} handleAddPeriod={logic.handleAddPeriod} handleRemovePeriod={logic.handleRemovePeriod} handlePeriodDateChange={logic.handlePeriodDateChange} />
						</div>
					)}
					{logic.activeTab === 'vk_protocol' && <ElnVkProtocolSection formState={logic.formState} setFormState={logic.setFormState} handleToggleVk={logic.handleToggleVk} />}
					{logic.activeTab === 'digital_signature' && (
						<ElnDigitalSignatureSection formState={logic.formState} doctorFio={logic.initialDoctorFio} doctorSnils={logic.initialDoctorSnils} clinicName={logic.formState.organizationName} clinicOgrn={logic.formState.organizationOgrn} signatureStatus={logic.signatureStatus} onSignDoctor={logic.handleSignDoctor} onSignOrganization={logic.handleSignOrganization} onVerifySignatures={logic.handleVerifySignatures} />
					)}
					{logic.activeTab === 'journal_036' && <ElnJournal036Section form036u={logic.form036u} />}
					{logic.activeTab === 'patient_memo' && <ElnPrintPreviewDrawer formState={logic.formState} patientData={logic.patientData} onPrintMemo={logic.handlePrintMemo} />}
					{logic.activeTab === 'xml_sfr' && <ElnSfrPayloadSection xmlPayload={logic.xmlPayload} jsonPayload={logic.jsonPayload} isCopiedXml={logic.isCopiedXml} onCopyXml={() => { navigator.clipboard.writeText(logic.xmlPayload); logic.setIsCopiedXml(true); setTimeout(() => logic.setIsCopiedXml(false), 2000); }} />}
				</div>

				<div className="p-3 px-4 border-t border-[var(--line)] bg-[var(--paper-soft)] flex items-center justify-between flex-wrap gap-2">
					<div className="text-xs text-[var(--muted)]">Всего дней: <strong>{logic.validation.totalDays}</strong> | Лимит врача: <strong>{SINGLE_DOCTOR_MAX_DAYS} дн.</strong></div>
					<div className="flex items-center gap-2">
						<button type="button" className={btnSecondary} onClick={logic.handleCopyDiarySnippet}>
							{logic.isCopiedDiary ? <Check size={15} /> : <Copy size={15} />}<span>{logic.isCopiedDiary ? 'Скопировано' : 'Копировать в карту'}</span>
						</button>
						<button type="button" className={btnPrimary} onClick={logic.handleSendSfr} title="Передать в СФР">
							<Send size={15} /><span>{logic.isSfrSent ? 'Отправлено в СФР' : 'Отправить в СФР'}</span>
						</button>
						{onApplyToDiary && (
							<button type="button" className={btnPrimary} onClick={logic.handleApplyDiary} title="Вставить в медицинскую карту">
								<Check size={15} /><span>Вставить в дневник</span>
							</button>
						)}
					</div>
				</div>
			</div>
		</div>
	);
}
