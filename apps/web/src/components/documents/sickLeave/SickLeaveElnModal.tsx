import React from "react";
import {
	FileText, AlertTriangle, ShieldCheck, CheckCircle2, Copy, Printer,
	Send, X, Sparkles, Building2, UserCheck, Stethoscope, Check, Key
} from "lucide-react";
import { DENTAL_CLINICAL_PRESETS } from "./sickLeaveElnPresets";
import { SINGLE_DOCTOR_MAX_DAYS } from "./sickLeaveElnEngine";
import {
	SickLeaveElnModalProps, ElnPatientAndJobSection, ElnDiagnosisAndPeriodSection,
	ElnDigitalSignatureSection, ElnPrintPreviewDrawer, ElnVkProtocolSection,
	ElnJournal036Section, ElnSfrPayloadSection, useSickLeaveElnLogic
} from "./elnModal";
import "./sickLeaveEln.css";

export type { SickLeaveElnModalProps };

// Режим лечения: <option value="ambulatory">01 - Амбулаторный</option>
// В дневник приёма вставлен черновик ЭЛН
export function SickLeaveElnModal(props: SickLeaveElnModalProps) {
	const { isOpen, onClose, onApplyToDiary } = props;
	const logic = useSickLeaveElnLogic(props);
	if (!isOpen) return null;

	return (
		<div className="sick-leave-modal-overlay" role="dialog" aria-modal="true">
			<div className="sick-leave-modal-container">
				<div className="sick-leave-header">
					<div className="sick-leave-header-title-group">
						<div className="sick-leave-title-icon"><Stethoscope size={20} /></div>
						<div>
							<h3 className="sick-leave-header-title">Электронный листок нетрудоспособности (ЭЛН)</h3>
							<div className="sick-leave-header-badges">
								<span className="sick-leave-eln-number-badge">№ {logic.formState.elnNumber}</span>
								<span className={`sick-leave-limit-badge whitespace-nowrap ${logic.validation.singleDoctorLimitExceeded ? 'vk-required' : 'safe'}`}>
									{logic.validation.singleDoctorLimitExceeded ? (
										<><AlertTriangle size={12} /><span>{logic.validation.totalDays}&nbsp;дн. (Лимит &gt;15&nbsp;дн. — требуется ВК)</span></>
									) : (
										<><ShieldCheck size={12} /><span>{logic.validation.totalDays}&nbsp;дн. (Единолично врачом &le;15&nbsp;дн.)</span></>
									)}
								</span>
							</div>
						</div>
					</div>
					<div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
						<button type="button" className="sick-leave-close-btn" onClick={onClose} title="Закрыть окно" aria-label="Закрыть">
							<X size={20} />
						</button>
					</div>
				</div>

				<div className="sick-leave-presets-bar">
					<span className="sick-leave-presets-label"><Sparkles size={13} />Клинические шаблоны:</span>
					{Object.entries(DENTAL_CLINICAL_PRESETS).map(([key, preset]) => (
						<button key={key} type="button" className={`sick-leave-preset-chip ${logic.selectedPresetId === key ? 'active' : ''}`} onClick={() => logic.handleApplyPreset(key)}>
							{preset.shortTitleRu} ({preset.defaultDays} дн.)
						</button>
					))}
				</div>

				<div className="sick-leave-tabs-bar">
					<button type="button" className={`sick-leave-tab-btn ${logic.activeTab === 'eln_form' ? 'active' : ''}`} onClick={() => logic.setActiveTab('eln_form')}>
						<FileText size={16} /> 1. Оформление ЭЛН
					</button>
					<button type="button" className={`sick-leave-tab-btn ${logic.activeTab === 'vk_protocol' ? 'active' : ''}`} onClick={() => logic.setActiveTab('vk_protocol')}>
						<UserCheck size={16} /> 2. Заседание врачебной комиссии (ВК) ({logic.formState.isVkRequired ? 'Активен' : 'Выкл'})
					</button>
					<button type="button" className={`sick-leave-tab-btn ${logic.activeTab === 'digital_signature' ? 'active' : ''}`} onClick={() => logic.setActiveTab('digital_signature')}>
						<Key size={16} /> 3. УКЭП КриптоПро
					</button>
					<button type="button" className={`sick-leave-tab-btn ${logic.activeTab === 'journal_036' ? 'active' : ''}`} onClick={() => logic.setActiveTab('journal_036')}>
						<Building2 size={16} /> 4. Журнал 036/у
					</button>
					<button type="button" className={`sick-leave-tab-btn ${logic.activeTab === 'patient_memo' ? 'active' : ''}`} onClick={() => logic.setActiveTab('patient_memo')}>
						<Printer size={16} /> 5. Памятка пациенту (А5)
					</button>
					<button type="button" className={`sick-leave-tab-btn ${logic.activeTab === 'xml_sfr' ? 'active' : ''}`} onClick={() => logic.setActiveTab('xml_sfr')}>
						<Send size={16} /> 6. СФР / ЕГИСЗ XML
					</button>
				</div>

				{logic.activeTab === 'eln_form' && (
					<div className="sick-leave-body">
						{logic.validation.errors.length > 0 && (
							<div className="sick-leave-alert error">
								<AlertTriangle size={18} style={{ flexShrink: 0 }} />
								<div><strong>Требуется исправление перед передачей в СФР:</strong><ul style={{ margin: '4px 0 0 16px', padding: 0 }}>{logic.validation.errors.map((err, i) => <li key={i}>{err}</li>)}</ul></div>
							</div>
						)}
						{logic.validation.warnings.length > 0 && (
							<div className="sick-leave-alert warning">
								<AlertTriangle size={18} style={{ flexShrink: 0 }} />
								<div><strong>Предупреждения эксперта:</strong><ul style={{ margin: '4px 0 0 16px', padding: 0 }}>{logic.validation.warnings.map((w, i) => <li key={i}>{w}</li>)}</ul></div>
							</div>
						)}
						<ElnPatientAndJobSection patientData={logic.patientData} onPatientDataChange={logic.setPatientData} />
						<ElnDiagnosisAndPeriodSection formState={logic.formState} setFormState={logic.setFormState} handleAddPeriod={logic.handleAddPeriod} handleRemovePeriod={logic.handleRemovePeriod} handlePeriodDateChange={logic.handlePeriodDateChange} />
					</div>
				)}

				{logic.activeTab === 'vk_protocol' && (
					<ElnVkProtocolSection formState={logic.formState} setFormState={logic.setFormState} handleToggleVk={logic.handleToggleVk} />
				)}

				{logic.activeTab === 'digital_signature' && (
					<div className="sick-leave-body">
						<ElnDigitalSignatureSection formState={logic.formState} doctorFio={logic.initialDoctorFio} doctorSnils={logic.initialDoctorSnils} clinicName={logic.formState.organizationName} clinicOgrn={logic.formState.organizationOgrn} signatureStatus={logic.signatureStatus} onSignDoctor={logic.handleSignDoctor} onSignOrganization={logic.handleSignOrganization} onVerifySignatures={logic.handleVerifySignatures} />
					</div>
				)}

				{logic.activeTab === 'journal_036' && <ElnJournal036Section form036u={logic.form036u} />}
				{logic.activeTab === 'patient_memo' && <ElnPrintPreviewDrawer formState={logic.formState} patientData={logic.patientData} onPrintMemo={logic.handlePrintMemo} />}
				{logic.activeTab === 'xml_sfr' && <ElnSfrPayloadSection xmlPayload={logic.xmlPayload} jsonPayload={logic.jsonPayload} isCopiedXml={logic.isCopiedXml} onCopyXml={() => { navigator.clipboard.writeText(logic.xmlPayload); logic.setIsCopiedXml(true); setTimeout(() => logic.setIsCopiedXml(false), 2000); }} />}

				<div className="sick-leave-footer">
					<div className="sick-leave-footer-left">
						<span>Всего дней: <strong>{logic.validation.totalDays}</strong> | Лимит врача: <strong>{SINGLE_DOCTOR_MAX_DAYS} дн.</strong></span>
					</div>
					<div className="sick-leave-footer-right">
						<button type="button" className="sick-leave-btn secondary" onClick={logic.handleCopyDiarySnippet}>
							{logic.isCopiedDiary ? <Check size={16} /> : <Copy size={16} />}{logic.isCopiedDiary ? 'Скопировано в буфер' : 'Копировать в карту'}
						</button>
						<button type="button" className={`sick-leave-btn ${logic.isSfrSent ? 'success' : 'primary'}`} onClick={logic.handleSendSfr} title={!logic.validation.isValid ? 'Нажмите для просмотра недостающих обязательных полей СФР' : 'Передать электронный листок в СФР'}>
							{logic.isSfrSent ? <CheckCircle2 size={16} /> : <Send size={16} />}{logic.isSfrSent ? 'Успешно отправлено в СФР' : 'Отправить в СФР (ЭЛН)'}
						</button>
						{onApplyToDiary && (
							<button type="button" className="sick-leave-btn primary" onClick={logic.handleApplyDiary} title="Вставить запись в медицинскую карту">
								<Check size={16} />{!logic.validation.isValid ? 'Вставить в дневник (Черновик)' : 'Вставить в дневник приема'}
							</button>
						)}
					</div>
				</div>
			</div>
		</div>
	);
}
