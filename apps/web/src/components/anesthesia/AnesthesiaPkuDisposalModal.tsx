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
	Check
} from 'lucide-react';
import {
	AnestheticDrugId,
	ANESTHESIA_DRUG_CATALOG,
	AnesthesiaDisposalReason,
	AnesthesiaDisinfectionMethod,
	AnesthesiaPkuDisposalRecord,
	validateCarpuleExpirationDate,
	createAnesthesiaPkuRecord,
	generateAnesthesiaPkuDisposalAct,
	generateAnesthesiaPkuDisposalHtml
} from '@dental/shared';
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
	initialExpirationDate = '2027-06',
	clinicName = 'Стоматологическая клиника DENTE',
	cabinetNumber = '1'
}: AnesthesiaPkuDisposalModalProps) {
	const [patientName, setPatientName] = useState(initialPatientName);
	const [medicalCard043, setMedicalCard043] = useState(initialMedicalCard043);
	const [doctorName, setDoctorName] = useState(initialDoctorName);
	const [nurseName, setNurseName] = useState(initialNurseName);
	const [selectedDrugId, setSelectedDrugId] = useState<AnestheticDrugId>(initialDrugId);

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
			drugNameRu: drugSpec.tradeNamesRu[0] ?? drugSpec.nameRu,
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

					<button
						type="button"
						onClick={onClose}
						className="anesthesia-btn hub-btn-close"
						title="Закрыть окно"
					>
						<X size={20} />
					</button>
				</div>

				{/* Modal Body */}
				<div className="anesthesia-modal-body" style={{ maxHeight: 'calc(88vh - 140px)', overflowY: 'auto' }}>
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
								onChange={e => setSelectedDrugId(e.target.value as AnestheticDrugId)}
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
