/**
 * AnesthesiaPkuDisposalModal.tsx
 * DENTE Dental CRM — SanPiN 3.3686-21 Subject-Quantitative Accounting (ПКУ) & Carpule Disposal Act Modal.
 * Implements Class B hazardous medical waste disposal protocol, disinfectant tracking, and assistant signatures.
 */

import React, { useState, useMemo } from 'react';
import {
	X,
	FileText,
	CheckCircle2,
	AlertTriangle,
	ShieldCheck,
	Trash2,
	Copy,
	Printer,
	Syringe,
	Calendar,
	UserCheck,
	Clock,
	Check,
	Zap,
} from 'lucide-react';
import {
	AnestheticDrugId,
	ANESTHESIA_DRUG_CATALOG,
	AnesthesiaDisposalReason,
	AnesthesiaDisinfectionMethod,
	AnesthesiaPkuDisposalRecord,
	AnesthesiaPkuPresetKey,
	ANESTHESIA_PKU_PRESETS,
	calculateDefaultCarpuleExpirationDate,
	createAnesthesiaPkuFromPreset,
	validateCarpuleExpirationDate,
	createAnesthesiaPkuRecord,
	generateAnesthesiaPkuDisposalAct,
	generateAnesthesiaPkuDisposalHtml
} from '@dental/shared';
import { showToast } from '../GlobalToast';
import './anesthesia.css';

export interface AnesthesiaPkuDisposalModalProps {
	isOpen: boolean;
	onClose: () => void;
	onSaveRecord?: ((record: AnesthesiaPkuDisposalRecord, actText: string) => void) | undefined;
	initialPatientName?: string | undefined;
	initialMedicalCard043?: string | undefined;
	initialDoctorName?: string | undefined;
	initialNurseName?: string | undefined;
	initialDrugId?: AnestheticDrugId | undefined;
	initialCarpulesUsed?: number | undefined;
	initialSeriesNumber?: string | undefined;
	initialBatchNumber?: string | undefined;
	initialExpirationDate?: string | undefined;
	clinicName?: string | undefined;
	cabinetNumber?: string | undefined;
}

export function AnesthesiaPkuDisposalModal({
	isOpen,
	onClose,
	onSaveRecord,
	initialPatientName = 'Иванов Иван Иванович',
	initialMedicalCard043 = '043-2026/104',
	initialDoctorName = 'Д-р Волкова Е. С.',
	initialNurseName = 'Смирнова А. В.',
	initialDrugId = 'articaine_4_epi_100k',
	initialCarpulesUsed = 1,
	initialSeriesNumber = 'ART-2026',
	initialBatchNumber = '84019',
	initialExpirationDate = '2028-09',
	clinicName = 'Стоматологическая клиника DENTE',
	cabinetNumber = '1'
}: AnesthesiaPkuDisposalModalProps) {
	const [patientName, setPatientName] = useState(initialPatientName);
	const [medicalCard043, setMedicalCard043] = useState(initialMedicalCard043);
	const [doctorName, setDoctorName] = useState(initialDoctorName);
	const [nurseName, setNurseName] = useState(initialNurseName);
	const [selectedDrugId, setSelectedDrugId] = useState<AnestheticDrugId>(initialDrugId);
	const [customDrugTradeName, setCustomDrugTradeName] = useState<string>('');
	const [selectedPreset, setSelectedPreset] = useState<AnesthesiaPkuPresetKey | null>('ultracain_ds_forte_1');

	const [seriesNumber, setSeriesNumber] = useState(initialSeriesNumber);
	const [batchNumber, setBatchNumber] = useState(initialBatchNumber);
	const [expirationDate, setExpirationDate] = useState(initialExpirationDate);

	const [carpulesUsedCount, setCarpulesUsedCount] = useState<number>(initialCarpulesUsed);
	const [carpulesDisposedCount, setCarpulesDisposedCount] = useState<number>(initialCarpulesUsed);
	const [disposalReason, setDisposalReason] = useState<AnesthesiaDisposalReason>('used_in_procedure');

	const [disinfectionMethod, setDisinfectionMethod] = useState<AnesthesiaDisinfectionMethod>('chemical_disinfection');
	const [disinfectantName, setDisinfectantName] = useState<string>('Аламинол 3%');
	const [disinfectantExposureMinutes, setDisinfectantExposureMinutes] = useState<number>(60);
	const [assistantSignatureConfirmed, setAssistantSignatureConfirmed] = useState<boolean>(true);
	const [notesRu, setNotesRu] = useState<string>('');

	const [isCopied, setIsCopied] = useState<boolean>(false);
	const [activePreviewMode, setActivePreviewMode] = useState<'formatted_text' | 'print_layout'>('formatted_text');

	// Expiration date live validation
	const expValidation = useMemo(() => {
		return validateCarpuleExpirationDate(expirationDate);
	}, [expirationDate]);

	const drugSpec = ANESTHESIA_DRUG_CATALOG[selectedDrugId] || ANESTHESIA_DRUG_CATALOG.articaine_4_epi_100k;
	const volumeMlTotal = Number((carpulesUsedCount * (drugSpec?.standardCarpuleVolumeMl ?? 1.7)).toFixed(2));

	// 1-Click Preset Application Handler (Mandate 8e item 10)
	const handleApplyPreset = (presetKey: AnesthesiaPkuPresetKey) => {
		const preset = ANESTHESIA_PKU_PRESETS[presetKey];
		if (!preset) return;

		setSelectedPreset(presetKey);
		setSelectedDrugId(preset.drugId);
		setCustomDrugTradeName(preset.drugTradeNameRu);
		setSeriesNumber(preset.standardSeriesNumber);
		setBatchNumber(preset.standardBatchNumber);
		setExpirationDate(calculateDefaultCarpuleExpirationDate(preset.expirationOffsetYears));
		setCarpulesUsedCount(preset.carpulesCount);
		setCarpulesDisposedCount(preset.carpulesCount);
		setDisposalReason(preset.disposalReason);
		setDisinfectionMethod(preset.disinfectionMethod);
		setDisinfectantName(preset.disinfectantNameRu);
		setDisinfectantExposureMinutes(preset.disinfectantExposureMinutes);
		setAssistantSignatureConfirmed(true);
		setNotesRu(preset.notesRu);

		showToast(`Пресет применен: ${preset.titleRu} (списание без комиссии)`, 'success');
	};

	// 1-Click Instant Preset Disposal (Mandate 8e item 10)
	const handleInstantPresetDisposal = (presetKey: AnesthesiaPkuPresetKey) => {
		const preset = ANESTHESIA_PKU_PRESETS[presetKey];
		if (!preset) return;

		const record = createAnesthesiaPkuFromPreset(presetKey, {
			clinicName,
			cabinetNumber,
			patientFullName: patientName || 'Пациент на приеме (1-клик списание)',
			medicalCardNumber043: medicalCard043 || '043-2026/01',
			doctorFullName: doctorName || 'Лечащий врач',
			nurseFullName: nurseName || 'Дежурная медсестра',
			seriesNumber: seriesNumber || preset.standardSeriesNumber,
			batchNumber: batchNumber || preset.standardBatchNumber,
			expirationDate: calculateDefaultCarpuleExpirationDate(preset.expirationOffsetYears),
			carpulesUsedCount: 1,
			carpulesDisposedCount: 1,
			assistantSignatureConfirmed: true,
		});

		const text = generateAnesthesiaPkuDisposalAct(record);
		if (onSaveRecord) {
			onSaveRecord(record, text);
		}
		showToast(`⚡ Списано в 1 клик: ${preset.titleRu} (медсестра ${nurseName}, без комиссии)!`, 'success');
		onClose();
	};

	// Current Record
	const pkuRecord: AnesthesiaPkuDisposalRecord = useMemo(() => {
		const now = new Date();
		const dateIso = now.toISOString().slice(0, 10);
		const time = now.toTimeString().slice(0, 5);

		return createAnesthesiaPkuRecord({
			dateIso,
			time,
			clinicName,
			cabinetNumber,
			patientFullName: patientName,
			medicalCardNumber043: medicalCard043,
			doctorFullName: doctorName,
			nurseFullName: nurseName,
			drugId: selectedDrugId,
			drugNameRu: customDrugTradeName || (drugSpec.tradeNamesRu[0] ?? drugSpec.nameRu),
			activeSubstanceRu: drugSpec.activeSubstanceRu,
			seriesNumber: seriesNumber || 'НЕ УКАЗАНА',
			batchNumber: batchNumber || 'НЕ УКАЗАНА',
			expirationDate: expValidation.formattedExpDateRu,
			carpulesUsedCount,
			carpulesDisposedCount,
			volumeMlTotal,
			disposalReason,
			wasteClass: 'class_b_hazardous',
			disinfectionMethod,
			disinfectantNameRu: disinfectantName,
			disinfectantExposureMinutes,
			assistantSignatureConfirmed,
			notesRu: notesRu || undefined
		});
	}, [
		clinicName,
		cabinetNumber,
		patientName,
		medicalCard043,
		doctorName,
		nurseName,
		selectedDrugId,
		customDrugTradeName,
		drugSpec,
		seriesNumber,
		batchNumber,
		expValidation.formattedExpDateRu,
		carpulesUsedCount,
		carpulesDisposedCount,
		volumeMlTotal,
		disposalReason,
		disinfectionMethod,
		disinfectantName,
		disinfectantExposureMinutes,
		assistantSignatureConfirmed,
		notesRu
	]);

	const actText = useMemo(() => {
		return generateAnesthesiaPkuDisposalAct(pkuRecord);
	}, [pkuRecord]);

	const actHtml = useMemo(() => {
		return generateAnesthesiaPkuDisposalHtml(pkuRecord);
	}, [pkuRecord]);

	const handleCopyAct = async () => {
		try {
			await navigator.clipboard.writeText(actText);
			setIsCopied(true);
			setTimeout(() => setIsCopied(false), 2500);
		} catch {
			// Fallback
		}
	};

	const handlePrintAct = () => {
		const printWin = window.open('', '_blank', 'width=800,height=900');
		if (printWin) {
			printWin.document.write(`
				<!DOCTYPE html>
				<html>
				<head>
					<title>Акт списания анестетика (СанПиН 3.3686-21)</title>
					<meta charset="utf-8">
					<style>
						body { margin: 20px; background: #fff; font-family: Arial, sans-serif; }
						@media print {
							body { margin: 0; }
						}
					</style>
				</head>
				<body>
					${actHtml}
					<script>
						window.onload = function() {
							window.print();
						}
					</script>
				</body>
				</html>
			`);
			printWin.document.close();
		}
	};

	const handleSaveAndClose = () => {
		if (onSaveRecord) {
			onSaveRecord(pkuRecord, actText);
		}
		onClose();
	};

	// 1-Click Shift Disposal by Nurse (SanPiN 3.3686-21 / Mandate 8e)
	const handleQuickBatchDisposeShift = () => {
		const now = new Date();
		const dateIso = now.toISOString().slice(0, 10);
		const time = now.toTimeString().slice(0, 5);
		const count = Math.max(1, carpulesDisposedCount || carpulesUsedCount || 1);
		const currentDrugSpec = ANESTHESIA_DRUG_CATALOG[selectedDrugId] || ANESTHESIA_DRUG_CATALOG.articaine_4_epi_100k;
		const totalVol = Number((count * (currentDrugSpec?.standardCarpuleVolumeMl ?? 1.7)).toFixed(2));

		const shiftBatchRecord = createAnesthesiaPkuRecord({
			dateIso,
			time,
			clinicName,
			cabinetNumber,
			patientFullName: patientName || 'Пациенты смены (групповое списание)',
			medicalCardNumber043: medicalCard043 || 'Смена / Кабинет ' + cabinetNumber,
			doctorFullName: doctorName || 'Дежурный врач смены',
			nurseFullName: nurseName || 'Дежурная медсестра',
			drugId: selectedDrugId,
			drugNameRu: currentDrugSpec.tradeNamesRu[0] ?? currentDrugSpec.nameRu,
			activeSubstanceRu: currentDrugSpec.activeSubstanceRu,
			seriesNumber: seriesNumber || 'ART-2026',
			batchNumber: batchNumber || '84019',
			expirationDate: expValidation.formattedExpDateRu || '2027-06',
			carpulesUsedCount: count,
			carpulesDisposedCount: count,
			volumeMlTotal: totalVol,
			disposalReason: 'used_in_procedure',
			wasteClass: 'class_b_hazardous',
			disinfectionMethod: 'chemical_disinfection',
			disinfectantNameRu: 'Аламинол 3%',
			disinfectantExposureMinutes: 60,
			assistantSignatureConfirmed: true,
			notesRu: 'Списание использованных карпул за смену произведено медсестрой единолично в 1 клик (СанПиН 3.3686-21, без бюрократической комиссии начмедов).'
		});

		const shiftAct = generateAnesthesiaPkuDisposalAct(shiftBatchRecord);

		if (onSaveRecord) {
			onSaveRecord(shiftBatchRecord, shiftAct);
		}
		showToast(
			`⚡ Списано за смену: ${count} пустых карпул (${currentDrugSpec.tradeNamesRu[0] ?? currentDrugSpec.nameRu}) в журнал ПКУ медсестрой в 1 клик!`,
			'success'
		);
		onClose();
	};

	if (!isOpen) return null;

	return (
		<div className="anesthesia-modal-overlay">
			<div className="anesthesia-modal-container pku-disposal-container" style={{ maxWidth: '840px' }}>
				{/* Modal Header */}
				<div className="anesthesia-modal-header hub-header">
					<div className="anesthesia-header-title">
						<div className="hub-logo-box" style={{ background: 'var(--teal-surface, rgba(13, 148, 136, 0.12))', borderColor: 'var(--teal)' }}>
							<Trash2 size={22} color="var(--teal)" />
						</div>
						<div>
							<div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
								<span className="hub-title-text">Журнал учета анестетиков и ПКУ (СанПиН 3.3686-21)</span>
								<span className="anesthesia-header-badge" style={{ background: 'var(--teal)', color: 'var(--on-teal, #fff)' }}>Раздел X: Отходы Класса Б</span>
							</div>
							<div className="hub-subtitle-text">
								Предметно-количественный учет (ПКУ), списание карпул, контроль серии/партии и дезинфекция
							</div>
						</div>
					</div>

					<div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
						<button
							type="button"
							onClick={handleQuickBatchDisposeShift}
							className="anesthesia-btn"
							style={{
								minHeight: '34px',
								padding: '0.25rem 0.75rem',
								fontSize: '0.75rem',
								fontWeight: 700,
								background: 'var(--teal, #0d9488)',
								color: 'var(--on-teal, #fff)',
								border: 'none',
								borderRadius: '6px',
								cursor: 'pointer',
								display: 'inline-flex',
								alignItems: 'center',
								gap: '0.375rem',
							}}
							data-testid="btn-pku-quick-batch-dispose"
							title="Списать использованные карпулы за смену (1 клик, СанПиН 3.3686-21)"
						>
							<Zap size={14} color="#fff" />
							<span>Списать за смену (1 клик)</span>
						</button>

						<button
							type="button"
							onClick={onClose}
							className="anesthesia-btn hub-btn-close"
							title="Закрыть окно"
						>
							<X size={20} />
						</button>
					</div>
				</div>

				{/* Modal Body */}
				<div className="anesthesia-modal-body" style={{ maxHeight: 'calc(88vh - 140px)', overflowY: 'auto' }}>
					{/* 1-Click Quick Disposal Presets Panel (Mandate 8e item 10, 8k, 8n / SanPiN 3.3686-21) */}
					<div
						className="anesthesia-pku-presets-card"
						style={{
							background: 'var(--paper-strong, #f8fafc)',
							padding: '0.875rem 1rem',
							borderRadius: '10px',
							border: '1px solid var(--teal, #0d9488)',
							marginBottom: '1rem',
							display: 'flex',
							flexDirection: 'column',
							gap: '0.75rem',
						}}
						data-testid="pku-quick-presets-panel"
					>
						<div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
							<div>
								<div style={{ fontSize: '0.875rem', fontWeight: 800, color: 'var(--ink)', display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
									<Zap size={16} color="var(--brand-primary, var(--teal))" />
									<span>1-клик быстрые пресеты списания анестезии и ПКУ (СанПиН 3.3686-21 / Мандат 8e)</span>
								</div>
								<div style={{ fontSize: '0.75rem', color: 'var(--muted, #64748b)', marginTop: '0.125rem' }}>
									Автозаполнение серии, партии, срока (+2 г.), дезинфекции. Достаточно подписи медсестры в 1 клик (без комиссии из 3 человек!).
								</div>
							</div>

							<button
								type="button"
								onClick={handleQuickBatchDisposeShift}
								className="anesthesia-btn"
								style={{
									minHeight: '34px',
									padding: '0.25rem 0.75rem',
									fontSize: '0.75rem',
									fontWeight: 700,
									background: 'transparent',
									color: 'var(--teal, #0d9488)',
									border: '1px solid var(--teal, #0d9488)',
									borderRadius: '6px',
									cursor: 'pointer',
									display: 'inline-flex',
									alignItems: 'center',
									gap: '0.375rem',
								}}
								data-testid="btn-pku-quick-batch-dispose-banner"
								title="Списать использованные карпулы за смену (1 клик)"
							>
								<Zap size={13} color="var(--teal, #0d9488)" />
								<span>Пакетное списание за смену</span>
							</button>
						</div>

						{/* 4 Quick Preset Cards Grid */}
						<div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.5rem' }}>
							{/* Preset 1: Ultracain DS Forte */}
							<div
								className={`anesthesia-preset-box ${selectedPreset === 'ultracain_ds_forte_1' ? 'active' : ''}`}
								style={{
									display: 'flex',
									flexDirection: 'column',
									justifyContent: 'space-between',
									padding: '0.625rem 0.75rem',
									borderRadius: '8px',
									border: selectedPreset === 'ultracain_ds_forte_1' ? '2px solid var(--teal, #0d9488)' : '1px solid var(--line, #e2e8f0)',
									background: selectedPreset === 'ultracain_ds_forte_1' ? 'var(--teal-soft, rgba(13, 148, 136, 0.08))' : 'var(--paper, #fff)',
									gap: '0.375rem',
									transition: 'all 0.15s ease',
								}}
							>
								<div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.25rem' }}>
									<div style={{ fontWeight: 700, fontSize: '0.8125rem', color: 'var(--ink)' }}>
										Ультракаин Д-С Форте
									</div>
									<span style={{ fontSize: '0.6875rem', color: 'var(--muted)', background: 'var(--surface)', padding: '1px 5px', borderRadius: '4px' }}>1:100k</span>
								</div>
								<div style={{ fontSize: '0.6875rem', color: 'var(--muted, #64748b)', lineHeight: 1.3 }}>
									1 карп. • Серия ART • +2 года • Аламинол 3% 60 мин
								</div>
								<div style={{ display: 'flex', gap: '0.375rem', marginTop: '0.25rem' }}>
									<button
										type="button"
										onClick={() => handleApplyPreset('ultracain_ds_forte_1')}
										style={{
											flex: 1,
											minHeight: '32px',
											padding: '0.25rem 0.5rem',
											fontSize: '0.75rem',
											fontWeight: 700,
											background: 'var(--teal, #0d9488)',
											color: '#fff',
											border: 'none',
											borderRadius: '6px',
											cursor: 'pointer',
											textAlign: 'center',
										}}
										data-testid="btn-preset-ultracain"
										title="Автозаполнить форму пресетом Ультракаин Д-С Форте"
									>
										Автозаполнить
									</button>
									<button
										type="button"
										onClick={() => handleInstantPresetDisposal('ultracain_ds_forte_1')}
										style={{
											minHeight: '32px',
											padding: '0.25rem 0.5rem',
											fontSize: '0.6875rem',
											fontWeight: 700,
											background: 'transparent',
											color: 'var(--teal, #0d9488)',
											border: '1px solid var(--teal, #0d9488)',
											borderRadius: '6px',
											cursor: 'pointer',
											whiteSpace: 'nowrap',
										}}
										data-testid="btn-instant-ultracain"
										title="Списать 1 карпулу Ультракаин Д-С Форте сразу в 1 клик"
									>
										В 1 клик
									</button>
								</div>
							</div>

							{/* Preset 2: Septanest */}
							<div
								className={`anesthesia-preset-box ${selectedPreset === 'septanest_100_1' ? 'active' : ''}`}
								style={{
									display: 'flex',
									flexDirection: 'column',
									justifyContent: 'space-between',
									padding: '0.625rem 0.75rem',
									borderRadius: '8px',
									border: selectedPreset === 'septanest_100_1' ? '2px solid var(--teal, #0d9488)' : '1px solid var(--line, #e2e8f0)',
									background: selectedPreset === 'septanest_100_1' ? 'var(--teal-soft, rgba(13, 148, 136, 0.08))' : 'var(--paper, #fff)',
									gap: '0.375rem',
									transition: 'all 0.15s ease',
								}}
							>
								<div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.25rem' }}>
									<div style={{ fontWeight: 700, fontSize: '0.8125rem', color: 'var(--ink)' }}>
										Септанест
									</div>
									<span style={{ fontSize: '0.6875rem', color: 'var(--muted)', background: 'var(--surface)', padding: '1px 5px', borderRadius: '4px' }}>1:100k</span>
								</div>
								<div style={{ fontSize: '0.6875rem', color: 'var(--muted, #64748b)', lineHeight: 1.3 }}>
									1 карп. • Серия SP • +2 года • Аламинол 3% 60 мин
								</div>
								<div style={{ display: 'flex', gap: '0.375rem', marginTop: '0.25rem' }}>
									<button
										type="button"
										onClick={() => handleApplyPreset('septanest_100_1')}
										style={{
											flex: 1,
											minHeight: '32px',
											padding: '0.25rem 0.5rem',
											fontSize: '0.75rem',
											fontWeight: 700,
											background: 'var(--teal, #0d9488)',
											color: '#fff',
											border: 'none',
											borderRadius: '6px',
											cursor: 'pointer',
											textAlign: 'center',
										}}
										data-testid="btn-preset-septanest"
										title="Автозаполнить форму пресетом Септанест"
									>
										Автозаполнить
									</button>
									<button
										type="button"
										onClick={() => handleInstantPresetDisposal('septanest_100_1')}
										style={{
											minHeight: '32px',
											padding: '0.25rem 0.5rem',
											fontSize: '0.6875rem',
											fontWeight: 700,
											background: 'transparent',
											color: 'var(--teal, #0d9488)',
											border: '1px solid var(--teal, #0d9488)',
											borderRadius: '6px',
											cursor: 'pointer',
											whiteSpace: 'nowrap',
										}}
										data-testid="btn-instant-septanest"
										title="Списать 1 карпулу Септанест сразу в 1 клик"
									>
										В 1 клик
									</button>
								</div>
							</div>

							{/* Preset 3: Scandonest (Cardio) */}
							<div
								className={`anesthesia-preset-box ${selectedPreset === 'scandonest_3_1' ? 'active' : ''}`}
								style={{
									display: 'flex',
									flexDirection: 'column',
									justifyContent: 'space-between',
									padding: '0.625rem 0.75rem',
									borderRadius: '8px',
									border: selectedPreset === 'scandonest_3_1' ? '2px solid var(--teal, #0d9488)' : '1px solid var(--line, #e2e8f0)',
									background: selectedPreset === 'scandonest_3_1' ? 'var(--teal-soft, rgba(13, 148, 136, 0.08))' : 'var(--paper, #fff)',
									gap: '0.375rem',
									transition: 'all 0.15s ease',
								}}
							>
								<div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.25rem' }}>
									<div style={{ fontWeight: 700, fontSize: '0.8125rem', color: 'var(--ink)' }}>
										Скандонест 3%
									</div>
									<span style={{ fontSize: '0.6875rem', color: 'var(--ok-fg)', background: 'var(--ok-bg, rgba(16, 185, 129, 0.12))', padding: '1px 5px', borderRadius: '4px', fontWeight: 600 }}>Кардио</span>
								</div>
								<div style={{ fontSize: '0.6875rem', color: 'var(--muted, #64748b)', lineHeight: 1.3 }}>
									1 карп. • Без адреналина • Серия SC • +2 года
								</div>
								<div style={{ display: 'flex', gap: '0.375rem', marginTop: '0.25rem' }}>
									<button
										type="button"
										onClick={() => handleApplyPreset('scandonest_3_1')}
										style={{
											flex: 1,
											minHeight: '32px',
											padding: '0.25rem 0.5rem',
											fontSize: '0.75rem',
											fontWeight: 700,
											background: 'var(--teal, #0d9488)',
											color: '#fff',
											border: 'none',
											borderRadius: '6px',
											cursor: 'pointer',
											textAlign: 'center',
										}}
										data-testid="btn-preset-scandonest"
										title="Автозаполнить форму пресетом Скандонест 3% (Кардио)"
									>
										Автозаполнить
									</button>
									<button
										type="button"
										onClick={() => handleInstantPresetDisposal('scandonest_3_1')}
										style={{
											minHeight: '32px',
											padding: '0.25rem 0.5rem',
											fontSize: '0.6875rem',
											fontWeight: 700,
											background: 'transparent',
											color: 'var(--teal, #0d9488)',
											border: '1px solid var(--teal, #0d9488)',
											borderRadius: '6px',
											cursor: 'pointer',
											whiteSpace: 'nowrap',
										}}
										data-testid="btn-instant-scandonest"
										title="Списать 1 карпулу Скандонест 3% сразу в 1 клик"
									>
										В 1 клик
									</button>
								</div>
							</div>

							{/* Preset 4: Damaged / Broken Carpule */}
							<div
								className={`anesthesia-preset-box ${selectedPreset === 'damaged_broken_1' ? 'active' : ''}`}
								style={{
									display: 'flex',
									flexDirection: 'column',
									justifyContent: 'space-between',
									padding: '0.625rem 0.75rem',
									borderRadius: '8px',
									border: selectedPreset === 'damaged_broken_1' ? '2px solid var(--warn, #f59e0b)' : '1px solid var(--line, #e2e8f0)',
									background: selectedPreset === 'damaged_broken_1' ? 'rgba(245, 158, 11, 0.08)' : 'var(--paper, #fff)',
									gap: '0.375rem',
									transition: 'all 0.15s ease',
								}}
							>
								<div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.25rem' }}>
									<div style={{ fontWeight: 700, fontSize: '0.8125rem', color: 'var(--warn-fg, #b45309)' }}>
										Бой / повреждение
									</div>
									<span style={{ fontSize: '0.6875rem', color: 'var(--warn-fg, #b45309)', background: 'rgba(245, 158, 11, 0.15)', padding: '1px 5px', borderRadius: '4px' }}>Класс Б</span>
								</div>
								<div style={{ fontSize: '0.6875rem', color: 'var(--muted, #64748b)', lineHeight: 1.3 }}>
									1 карп. • Механический бой • Дезинфекция осколков
								</div>
								<div style={{ display: 'flex', gap: '0.375rem', marginTop: '0.25rem' }}>
									<button
										type="button"
										onClick={() => handleApplyPreset('damaged_broken_1')}
										style={{
											flex: 1,
											minHeight: '32px',
											padding: '0.25rem 0.5rem',
											fontSize: '0.75rem',
											fontWeight: 700,
											background: 'var(--warn, #f59e0b)',
											color: '#fff',
											border: 'none',
											borderRadius: '6px',
											cursor: 'pointer',
											textAlign: 'center',
										}}
										data-testid="btn-preset-damaged-broken"
										title="Автозаполнить форму пресетом списания боя карпулы"
									>
										Автозаполнить
									</button>
									<button
										type="button"
										onClick={() => handleInstantPresetDisposal('damaged_broken_1')}
										style={{
											minHeight: '32px',
											padding: '0.25rem 0.5rem',
											fontSize: '0.6875rem',
											fontWeight: 700,
											background: 'transparent',
											color: 'var(--warn-fg, #b45309)',
											border: '1px solid var(--warn, #f59e0b)',
											borderRadius: '6px',
											cursor: 'pointer',
											whiteSpace: 'nowrap',
										}}
										data-testid="btn-instant-damaged-broken"
										title="Списать бой карпулы сразу в 1 клик"
									>
										В 1 клик
									</button>
								</div>
							</div>
						</div>
					</div>

					{/* Expiration warning banner if expired or close to expiry */}
					{expValidation.warningRu && (
						<div
							style={{
								padding: '0.75rem 1rem',
								borderRadius: '8px',
								background: expValidation.isExpired ? 'rgba(239, 68, 68, 0.12)' : 'rgba(245, 158, 11, 0.12)',
								border: `1px solid ${expValidation.isExpired ? 'var(--bad, #ef4444)' : 'var(--warn-fg, #d97706)'}`,
								color: expValidation.isExpired ? 'var(--bad-fg, #ef4444)' : 'var(--warn-fg, #d97706)',
								fontSize: '0.8125rem',
								fontWeight: 600,
								marginBottom: '1rem',
								display: 'flex',
								alignItems: 'center',
								gap: '0.5rem'
							}}
						>
							<AlertTriangle size={18} />
							<span>{expValidation.warningRu}</span>
						</div>
					)}


					<div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem', marginBottom: '1.25rem' }}>
						{/* Drug Selection */}
						<div className="input-group">
							<span className="input-label" style={{ fontWeight: 600 }}>Препарат анестетика:</span>
							<select
								autoFocus
								value={selectedDrugId}
								onChange={e => {
									setSelectedDrugId(e.target.value as AnestheticDrugId);
									setCustomDrugTradeName('');
								}}
								className="hub-select"
							>
								{Object.values(ANESTHESIA_DRUG_CATALOG).map(drug => (
									<option key={drug.id} value={drug.id}>
										{drug.tradeNamesRu[0]} ({drug.activeSubstanceRu})
									</option>
								))}
							</select>
						</div>

						{/* Patient & Card */}
						<div className="input-group">
							<span className="input-label" style={{ fontWeight: 600 }}>Пациент и Карта 043/у:</span>
							<div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
								<input
									type="text"
									value={patientName}
									onChange={e => setPatientName(e.target.value)}
									className="hub-text-input"
									placeholder="ФИО пациента"
								/>
								<input
									type="text"
									value={medicalCard043}
									onChange={e => setMedicalCard043(e.target.value)}
									className="hub-text-input"
									placeholder="№ 043/у"
								/>
							</div>
						</div>
					</div>

					{/* Carpule Batch Tracking */}
					<div className="anesthesia-card" style={{ marginBottom: '1rem' }}>
						<div className="card-section-title" style={{ color: 'var(--teal)', marginBottom: '0.75rem' }}>
							<Syringe size={16} />
							<span>1. Идентификация препарата и серии (ПКУ)</span>
						</div>

						<div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '0.75rem', marginBottom: '0.75rem' }}>
							<div className="input-group">
								<span className="input-label">Серия карпулы:</span>
								<input
									type="text"
									value={seriesNumber}
									onChange={e => setSeriesNumber(e.target.value)}
									className="hub-text-input"
									placeholder="напр. ART-2026"
								/>
							</div>

							<div className="input-group">
								<span className="input-label">Номер партии:</span>
								<input
									type="text"
									value={batchNumber}
									onChange={e => setBatchNumber(e.target.value)}
									className="hub-text-input"
									placeholder="напр. 84019"
								/>
							</div>

							<div className="input-group">
								<span className="input-label">Срок годности (ГГГГ-ММ):</span>
								<input
									type="text"
									value={expirationDate}
									onChange={e => setExpirationDate(e.target.value)}
									className="hub-text-input"
									placeholder="напр. 2027-06"
								/>
							</div>

							<div className="input-group">
								<span className="input-label">Кол-во карпул (шт):</span>
								<div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
									<input
										type="number"
										min={1}
										max={20}
										step={1}
										value={carpulesUsedCount}
										onChange={e => {
											const val = Math.max(1, parseInt(e.target.value) || 1);
											setCarpulesUsedCount(val);
											setCarpulesDisposedCount(val);
										}}
										className="hub-text-input"
										style={{ width: '80px', textAlign: 'center', fontWeight: 700 }}
									/>
									<span style={{ fontSize: '0.8125rem', color: 'var(--muted, #64748b)' }}>
										({volumeMlTotal} мл)
									</span>
								</div>
							</div>
						</div>
					</div>

					{/* SanPiN Disinfection & Responsible Personnel */}
					<div className="hub-card" style={{ padding: '0.875rem 1rem', marginBottom: '1.25rem' }}>
						<div className="card-section-title" style={{ color: 'var(--teal)', marginBottom: '0.75rem' }}>
							<ShieldCheck size={16} />
							<span>Режим дезинфекции и списание отходов Класса Б (СанПиН 3.3686-21)</span>
						</div>

						<div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.75rem', marginBottom: '0.75rem' }}>
							<div className="input-group">
								<span className="input-label">Причина списания:</span>
								<select
									value={disposalReason}
									onChange={e => setDisposalReason(e.target.value as AnesthesiaDisposalReason)}
									className="hub-select"
								>
									<option value="used_in_procedure">Израсходовано на приеме (введено пациенту)</option>
									<option value="damaged_broken">Механический бой / повреждение карпулы</option>
									<option value="expired">Истечение установленного срока годности</option>
									<option value="unsealed_unused">Вскрытая неиспользованная остаточная доза</option>
								</select>
							</div>

							<div className="input-group">
								<span className="input-label">Способ обеззараживания:</span>
								<select
									value={disinfectionMethod}
									onChange={e => setDisinfectionMethod(e.target.value as AnesthesiaDisinfectionMethod)}
									className="hub-select"
								>
									<option value="chemical_disinfection">Химическая дезинфекция (раствор ДС)</option>
									<option value="autoclaving_destructive">Автоклавирование (паровой стерилизатор)</option>
								</select>
							</div>

							{disinfectionMethod === 'chemical_disinfection' && (
								<>
									<div className="input-group">
										<span className="input-label">Дезинфицирующее средство:</span>
										<input
											type="text"
											value={disinfectantName}
											onChange={e => setDisinfectantName(e.target.value)}
											className="hub-text-input"
											placeholder="напр. Аламинол 3%"
										/>
									</div>

									<div className="input-group">
										<span className="input-label">Экспозиция (мин):</span>
										<input
											type="number"
											min={15}
											max={180}
											step={5}
											value={disinfectantExposureMinutes}
											onChange={e => setDisinfectantExposureMinutes(parseInt(e.target.value) || 60)}
											className="hub-text-input"
											style={{ width: '90px', textAlign: 'center' }}
										/>
									</div>
								</>
							)}
						</div>

						<div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.75rem', marginTop: '0.5rem' }}>
							<div className="input-group">
								<span className="input-label">Врач-стоматолог:</span>
								<input
									type="text"
									value={doctorName}
									onChange={e => setDoctorName(e.target.value)}
									className="hub-text-input"
									placeholder="ФИО врача"
								/>
							</div>

							<div className="input-group">
								<span className="input-label">Ответственная медсестра / ассистент:</span>
								<input
									type="text"
									value={nurseName}
									onChange={e => setNurseName(e.target.value)}
									className="hub-text-input"
									placeholder="ФИО медсестры"
								/>
							</div>
						</div>

						{/* Single Nurse Signature Autonomy Check (Mandate 8e item 10) */}
						<div
							style={{
								marginTop: '0.75rem',
								padding: '0.625rem 0.875rem',
								background: 'var(--paper, #fff)',
								borderRadius: '8px',
								border: '1px solid var(--line, #e2e8f0)',
								display: 'flex',
								alignItems: 'center',
								justifyContent: 'space-between',
								gap: '0.75rem',
								flexWrap: 'wrap'
							}}
						>
							<label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--ink)' }}>
								<input
									type="checkbox"
									checked={assistantSignatureConfirmed}
									onChange={e => setAssistantSignatureConfirmed(e.target.checked)}
									style={{ width: '16px', height: '16px', accentColor: 'var(--teal)' }}
									data-testid="chk-assistant-signature"
								/>
								<span style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
									<UserCheck size={16} color="var(--teal)" />
									Подпись медсестры / ассистента подтверждена в 1 клик (Мандат 8e п. 10)
								</span>
							</label>
							<span style={{ fontSize: '0.75rem', color: 'var(--ok-fg)', fontWeight: 600, background: 'var(--ok-bg, rgba(16, 185, 129, 0.12))', padding: '2px 8px', borderRadius: '4px' }}>
								✓ Без комиссии из 3 человек
							</span>
						</div>
					</div>

					{/* Preview Mode Switcher */}
					<div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
						<div style={{ display: 'flex', gap: '0.5rem' }}>
							<button
								type="button"
								className={`hub-tab-btn ${activePreviewMode === 'formatted_text' ? 'active' : ''}`}
								style={{ padding: '0.25rem 0.625rem', fontSize: '0.75rem', minHeight: '30px' }}
								onClick={() => setActivePreviewMode('formatted_text')}
							>
								<FileText size={14} />
								<span>Текстовый протокол (для Карты 043/у)</span>
							</button>

							<button
								type="button"
								className={`hub-tab-btn ${activePreviewMode === 'print_layout' ? 'active' : ''}`}
								style={{ padding: '0.25rem 0.625rem', fontSize: '0.75rem', minHeight: '30px' }}
								onClick={() => setActivePreviewMode('print_layout')}
							>
								<Printer size={14} />
								<span>Бланк для печати (СанПиН)</span>
							</button>
						</div>

						<div style={{ display: 'flex', gap: '0.5rem' }}>
							<button
								type="button"
								onClick={handleCopyAct}
								className="anesthesia-btn"
								style={{ minHeight: '32px', padding: '0.25rem 0.75rem', fontSize: '0.75rem' }}
							>
								{isCopied ? <Check size={14} color="var(--ok-fg)" /> : <Copy size={14} />}
								<span>{isCopied ? 'Скопировано!' : 'Скопировать акт'}</span>
							</button>

							<button
								type="button"
								onClick={handlePrintAct}
								className="anesthesia-btn"
								style={{ minHeight: '32px', padding: '0.25rem 0.75rem', fontSize: '0.75rem' }}
							>
								<Printer size={14} />
								<span>Печать</span>
							</button>
						</div>
					</div>

					{/* Live Document Preview Box */}
					{activePreviewMode === 'formatted_text' ? (
						<div
							style={{
								background: 'var(--paper-strong, #f8fafc)',
								border: '1px solid var(--line, #e2e8f0)',
								borderRadius: '8px',
								padding: '0.875rem',
								fontFamily: 'monospace',
								fontSize: '0.75rem',
								lineHeight: 1.4,
								whiteSpace: 'pre-wrap',
								color: 'var(--ink, #0f172a)'
							}}
						>
							{actText}
						</div>
					) : (
						<div
							style={{
								background: 'var(--paper-strong)',
								border: '1px solid var(--line)',
								borderRadius: '8px',
								padding: '1rem',
								overflowX: 'auto'
							}}
							dangerouslySetInnerHTML={{ __html: actHtml }}
						/>
					)}
				</div>

				{/* Modal Footer */}
				<div className="anesthesia-modal-footer hub-footer" style={{ display: 'flex', justifyContent: 'space-between' }}>
					<div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8125rem', color: 'var(--muted)' }}>
						<ShieldCheck size={16} color="var(--ok-fg)" />
						<span>Номер записи: <strong>{pkuRecord.recordNumber}</strong></span>
					</div>

					<div style={{ display: 'flex', gap: '0.5rem' }}>
						<button
							type="button"
							onClick={onClose}
							className="anesthesia-btn"
							style={{ minHeight: '36px' }}
						>
							Отмена
						</button>
						<button
							type="button"
							onClick={handleSaveAndClose}
							className="anesthesia-btn anesthesia-btn-primary"
							style={{ minHeight: '36px', background: 'var(--teal)', borderColor: 'var(--teal)', color: 'var(--on-teal, #fff)' }}
							data-testid="btn-save-pku-record"
						>
							<CheckCircle2 size={16} />
							Внести в журнал ПКУ и прикрепить к 043/у
						</button>
					</div>
				</div>
			</div>
		</div>
	);
}
