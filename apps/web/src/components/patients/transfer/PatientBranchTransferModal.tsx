/**
 * ============================================================================
 * PATIENT BRANCH TRANSFER & CENTRALIZED LAB SYNC MODAL
 * Междепартаментный и межфилиальный трансфер пациентов, карт 043/у, нарядов ЗТЛ
 * и баланса депозита (152-ФЗ, 54-ФЗ, Приказ Минздрава 834н).
 * ============================================================================
 */

import {
	AlertCircle,
	AlertTriangle,
	ArrowRight,
	Check,
	CheckCircle2,
	Copy,
	Download,
	FileDown,
	FileSpreadsheet,
	FileText,
	Layers,
	Printer,
	QrCode,
	ShieldCheck,
	Truck,
	User,
	Wallet,
	X,
} from "lucide-react";
import type React from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import {
	CLINIC_NETWORK_BRANCHES,
	getClinicBranch,
	type ClinicBranchId,
	type DepositTransferVoucher,
	type PatientClinicalSnapshot,
	type PatientDemographicsSnapshot,
	type PatientSignatureType,
	type SelectedTransferComponents,
	executePatientBranchTransfer,
	formatDateRu,
	formatDateTimeRu,
	formatRubCurrency,
	generateTransferActCsv,
	generateTransferActHtml,
	validateTransferDraft,
	type ExecuteTransferInput,
	type PatientTransferDraft,
} from "./branchTransferEngine.js";
import "./patientBranchTransfer.css";

export interface PatientBranchTransferModalProps {
	readonly isOpen: boolean;
	readonly onClose: () => void;
	readonly patientId: string;
	readonly patientFullName: string;
	readonly patientBirthDate?: string | null | undefined;
	readonly patientPhone?: string | null | undefined;
	readonly patientPassport?: string | null | undefined;
	readonly patientSnils?: string | null | undefined;
	readonly patientInn?: string | null | undefined;
	readonly initialSourceBranchId?: string | undefined;
	readonly initialTargetBranchId?: string | undefined;
	readonly balanceRub?: number | undefined;
	readonly balanceKopecks?: number | undefined;
	readonly teethData?: Record<number, any> | undefined;
	readonly visitDiaries?: readonly any[] | undefined;
	readonly treatmentPlans?: readonly any[] | undefined;
	readonly imagingStudies?: readonly any[] | undefined;
	readonly labOrders?: readonly any[] | undefined;
	readonly onTransferCompleted?: ((snapshot: PatientClinicalSnapshot) => void) | undefined;
}

export const PatientBranchTransferModal: React.FC<PatientBranchTransferModalProps> = ({
	isOpen,
	onClose,
	patientId,
	patientFullName,
	patientBirthDate,
	patientPhone,
	patientPassport,
	patientSnils,
	patientInn,
	initialSourceBranchId = "branch_center",
	initialTargetBranchId = "branch_north",
	balanceRub = 0,
	balanceKopecks,
	teethData = {},
	visitDiaries = [],
	treatmentPlans = [],
	imagingStudies = [],
	labOrders = [],
	onTransferCompleted,
}) => {
	// 1. Branch Routing State
	const [sourceBranchId, setSourceBranchId] = useState<string>(initialSourceBranchId);
	const [targetBranchId, setTargetBranchId] = useState<string>(initialTargetBranchId);
	const [transferReason, setTransferReason] = useState<string>(
		"Продолжение комплексного ортодонтического / ортопедического лечения в филиале сети",
	);

	// 2. Operator & Consent State
	const [operatorStaffName, setOperatorStaffName] = useState<string>("Смирнова А.В.");
	const [operatorStaffPosition, setOperatorStaffPosition] = useState<string>("Старший администратор");
	const [signatureType, setSignatureType] = useState<PatientSignatureType>("simple_electronic_signature_sms");
	const [is152FzConsentGiven, setIs152FzConsentGiven] = useState<boolean>(true);

	// 3. Selected Components Checklist
	const [selectedComponents, setSelectedComponents] = useState<SelectedTransferComponents>({
		demographics: true,
		somaticAnamnesis: true,
		odontogram043u: true,
		visitDiaries: true,
		treatmentPlans: true,
		imagingArchive: true,
		depositBalance: true,
		activeLabOrders: true,
	});

	// 4. Execution & Success State
	const [isExecuting, setIsExecuting] = useState<boolean>(false);
	const [transferResult, setTransferResult] = useState<{
		snapshot: PatientClinicalSnapshot;
		voucher?: DepositTransferVoucher | undefined;
		qrDataUri: string;
		transferActHtml: string;
		csvSummary: string;
	} | null>(null);
	const [copyFeedback, setCopyFeedback] = useState<string | null>(null);

	// Reset state when modal opens
	useEffect(() => {
		if (isOpen) {
			setSourceBranchId(initialSourceBranchId);
			setTargetBranchId(initialTargetBranchId);
			setTransferResult(null);
			setIsExecuting(false);
			setCopyFeedback(null);
		}
	}, [isOpen, initialSourceBranchId, initialTargetBranchId]);

	// Demographics snapshot
	const demographics: PatientDemographicsSnapshot = useMemo(() => ({
		id: patientId,
		fullName: patientFullName,
		birthDate: patientBirthDate || null,
		phone: patientPhone || null,
		email: null,
		notes: null,
		status: "active",
		identityDocument: patientPassport || "Паспорт РФ не указан",
		taxpayerInn: patientInn || null,
		snils: patientSnils || null,
		insurancePolicyNumber: null,
		registrationAddress: null,
		residentialAddress: null,
		legalRepresentativeFullName: null,
		legalRepresentativePhone: null,
	}), [patientId, patientFullName, patientBirthDate, patientPhone, patientPassport, patientInn, patientSnils]);

	// Draft validation
	const draft: PatientTransferDraft = useMemo(() => ({
		patientId,
		patientFullName,
		sourceBranchId,
		targetBranchId,
		transferReasonRu: transferReason,
		operatorStaffName,
		operatorStaffPosition,
		signatureType,
		is152FzConsentGiven,
		selectedComponents,
	}), [
		patientId,
		patientFullName,
		sourceBranchId,
		targetBranchId,
		transferReason,
		operatorStaffName,
		operatorStaffPosition,
		signatureType,
		is152FzConsentGiven,
		selectedComponents,
	]);

	const validation = useMemo(() => {
		return validateTransferDraft(draft, { demographics, balanceRub });
	}, [draft, demographics, balanceRub]);

	// Toggle single component
	const toggleComponent = (key: keyof SelectedTransferComponents) => {
		setSelectedComponents((prev) => ({
			...prev,
			[key]: !prev[key],
		}));
	};

	// Select All / Deselect All
	const handleSelectAll = (all: boolean) => {
		setSelectedComponents({
			demographics: all,
			somaticAnamnesis: all,
			odontogram043u: all,
			visitDiaries: all,
			treatmentPlans: all,
			imagingArchive: all,
			depositBalance: all,
			activeLabOrders: all,
		});
	};

	// Execute transfer
	const handleExecuteTransfer = useCallback(() => {
		if (!validation.isValid || isExecuting) return;

		setIsExecuting(true);
		try {
			const input: ExecuteTransferInput = {
				draft,
				demographics,
				odontogramTeeth: teethData,
				visitDiaries: visitDiaries as any,
				treatmentPlans: treatmentPlans as any,
				imagingStudies: imagingStudies as any,
				balanceRub,
				balanceKopecks,
				labOrders: labOrders as any,
			};

			const result = executePatientBranchTransfer(input);
			setTransferResult(result);
			if (onTransferCompleted) {
				onTransferCompleted(result.snapshot);
			}
		} catch (e: any) {
			console.error("Transfer execution failed:", e);
		} finally {
			setIsExecuting(false);
		}
	}, [
		validation.isValid,
		isExecuting,
		draft,
		demographics,
		teethData,
		visitDiaries,
		treatmentPlans,
		imagingStudies,
		balanceRub,
		balanceKopecks,
		labOrders,
		onTransferCompleted,
	]);

	// Print Transfer Act
	const handlePrintAct = () => {
		if (!transferResult) return;
		const printWin = window.open("", "_blank");
		if (printWin) {
			printWin.document.write(transferResult.transferActHtml);
			printWin.document.close();
			printWin.focus();
			setTimeout(() => {
				printWin.print();
			}, 300);
		}
	};

	// Download JSON snapshot
	const handleDownloadJson = () => {
		if (!transferResult) return;
		const jsonString = JSON.stringify(transferResult.snapshot, null, 2);
		const blob = new Blob([jsonString], { type: "application/json" });
		const url = URL.createObjectURL(blob);
		const a = document.createElement("a");
		a.href = url;
		a.download = `ClinicalSnapshot_${patientFullName.replace(/\s+/g, "_")}_${transferResult.snapshot.snapshotId}.json`;
		a.click();
		URL.revokeObjectURL(url);
	};

	// Download CSV summary
	const handleDownloadCsv = () => {
		if (!transferResult) return;
		const blob = new Blob([transferResult.csvSummary], { type: "text/csv;charset=utf-8;" });
		const url = URL.createObjectURL(blob);
		const a = document.createElement("a");
		a.href = url;
		a.download = `TransferAct_${patientFullName.replace(/\s+/g, "_")}.csv`;
		a.click();
		URL.revokeObjectURL(url);
	};

	// Copy Voucher Code
	const handleCopyVoucher = () => {
		if (!transferResult?.voucher) return;
		navigator.clipboard.writeText(transferResult.voucher.voucherCode).then(() => {
			setCopyFeedback("Скопировано!");
			setTimeout(() => setCopyFeedback(null), 2500);
		});
	};

	if (!isOpen) return null;

	const sourceBranch = getClinicBranch(sourceBranchId);
	const targetBranch = getClinicBranch(targetBranchId);

	return createPortal(
		<div className="branch-trf-overlay" role="dialog" aria-modal="true" aria-labelledby="branch-trf-dialog-title">
			<div className="branch-trf-container">
				{/* 1. Header */}
				<div className="branch-trf-header">
					<div className="branch-trf-title-group">
						<div className="branch-trf-icon-badge" aria-hidden="true">
							🔄
						</div>
						<div>
							<h2 id="branch-trf-dialog-title" className="branch-trf-title">
								Межфилиальный трансфер пациента и карты 043/у
							</h2>
							<p className="branch-trf-subtitle">
								Пациент: <strong>{patientFullName}</strong> ({formatDateRu(patientBirthDate)} г.р.)
							</p>
						</div>
					</div>
					<button
						type="button"
						className="branch-trf-close-btn"
						onClick={onClose}
						aria-label="Закрыть окно трансфера"
					>
						<X size={20} />
					</button>
				</div>

				{/* 2. Body */}
				<div className="branch-trf-body">
					{!transferResult ? (
						<>
							{/* Route Selector */}
							<div className="branch-trf-route-card">
								<div className="branch-select-group">
									<label htmlFor="source-branch-select" className="branch-select-label">
										Филиал-отправитель (исходный)
									</label>
									<select
										id="source-branch-select"
										className="branch-trf-select"
										value={sourceBranchId}
										onChange={(e) => setSourceBranchId(e.target.value)}
									>
										{CLINIC_NETWORK_BRANCHES.map((b) => (
											<option key={b.id} value={b.id}>
												{b.nameRu} ({b.code})
											</option>
										))}
									</select>
									<small style={{ color: "var(--muted, #64748b)", fontSize: "0.78rem" }}>
										{sourceBranch.addressRu}
									</small>
								</div>

								<div className="branch-trf-route-arrow" aria-hidden="true">
									<ArrowRight size={28} />
								</div>

								<div className="branch-select-group">
									<label htmlFor="target-branch-select" className="branch-select-label">
										Филиал-получатель (назначение)
									</label>
									<select
										id="target-branch-select"
										className="branch-trf-select"
										value={targetBranchId}
										onChange={(e) => setTargetBranchId(e.target.value)}
									>
										{CLINIC_NETWORK_BRANCHES.map((b) => (
											<option key={b.id} value={b.id}>
												{b.nameRu} ({b.code})
											</option>
										))}
									</select>
									<small style={{ color: "var(--muted, #64748b)", fontSize: "0.78rem" }}>
										{targetBranch.addressRu}
									</small>
								</div>
							</div>

							{/* Validation Alert */}
							{sourceBranchId === targetBranchId && (
								<div className="branch-trf-alert-error" role="alert">
									<AlertCircle size={18} />
									<span>Филиал-отправитель и филиал-получатель не могут совпадать. Выберите другой целевой филиал.</span>
								</div>
							)}

							{/* Checklist of Transferable Clinical Entities */}
							<div>
								<div className="branch-trf-section-title">
									<span>Переносимые клинические и финансовые данные:</span>
									<div style={{ display: "flex", gap: "8px", fontSize: "0.8rem" }}>
										<button
											type="button"
											onClick={() => handleSelectAll(true)}
											style={{ background: "none", border: "none", color: "var(--info-fg, #2563eb)", cursor: "pointer", fontWeight: 600 }}
										>
											Выбрать всё
										</button>
										<span style={{ color: "var(--line, #cbd5e1)" }}>|</span>
										<button
											type="button"
											onClick={() => handleSelectAll(false)}
											style={{ background: "none", border: "none", color: "var(--muted, #64748b)", cursor: "pointer" }}
										>
											Снять выбор
										</button>
									</div>
								</div>

								<div className="branch-trf-checklist-grid">
									{/* 1. Demographics & Passport */}
									<label className={`branch-trf-check-tile ${selectedComponents.demographics ? "active" : ""}`}>
										<input
											type="checkbox"
											className="branch-trf-checkbox"
											checked={selectedComponents.demographics}
											onChange={() => toggleComponent("demographics")}
										/>
										<div className="branch-trf-tile-info">
											<div className="branch-trf-tile-title">
												<span>Демография и реквизиты</span>
												<span className="branch-trf-tile-count">152-ФЗ</span>
											</div>
											<div className="branch-trf-tile-desc">
												Паспортные данные, СНИЛС, ИНН, контакты, статус лояльности
											</div>
										</div>
									</label>

									{/* 2. Odontogram */}
									<label className={`branch-trf-check-tile ${selectedComponents.odontogram043u ? "active" : ""}`}>
										<input
											type="checkbox"
											className="branch-trf-checkbox"
											checked={selectedComponents.odontogram043u}
											onChange={() => toggleComponent("odontogram043u")}
										/>
										<div className="branch-trf-tile-info">
											<div className="branch-trf-tile-title">
												<span>Зубная формула и пародонтограмма</span>
												<span className="branch-trf-tile-count">{Object.keys(teethData).length} зубов</span>
											</div>
											<div className="branch-trf-tile-desc">
												Статусы FDI 11..48/51..85, поверхности O/V/L/M/D, каналы, карманы
											</div>
										</div>
									</label>

									{/* 3. Visit Diaries */}
									<label className={`branch-trf-check-tile ${selectedComponents.visitDiaries ? "active" : ""}`}>
										<input
											type="checkbox"
											className="branch-trf-checkbox"
											checked={selectedComponents.visitDiaries}
											onChange={() => toggleComponent("visitDiaries")}
										/>
										<div className="branch-trf-tile-info">
											<div className="branch-trf-tile-title">
												<span>Дневник приемов 043/у</span>
												<span className="branch-trf-tile-count">{visitDiaries.length} визитов</span>
											</div>
											<div className="branch-trf-tile-desc">
												Клинические протоколы, диагнозы МКБ-10, услуги 804н
											</div>
										</div>
									</label>

									{/* 4. Treatment Plans */}
									<label className={`branch-trf-check-tile ${selectedComponents.treatmentPlans ? "active" : ""}`}>
										<input
											type="checkbox"
											className="branch-trf-checkbox"
											checked={selectedComponents.treatmentPlans}
											onChange={() => toggleComponent("treatmentPlans")}
										/>
										<div className="branch-trf-tile-info">
											<div className="branch-trf-tile-title">
												<span>Планы лечения и сметы</span>
												<span className="branch-trf-tile-count">{treatmentPlans.length} планов</span>
											</div>
											<div className="branch-trf-tile-desc">
												Этапы, плановая стоимость, согласованные варианты
											</div>
										</div>
									</label>

									{/* 5. Imaging Archive */}
									<label className={`branch-trf-check-tile ${selectedComponents.imagingArchive ? "active" : ""}`}>
										<input
											type="checkbox"
											className="branch-trf-checkbox"
											checked={selectedComponents.imagingArchive}
											onChange={() => toggleComponent("imagingArchive")}
										/>
										<div className="branch-trf-tile-info">
											<div className="branch-trf-tile-title">
												<span>Рентген-архив и КЛКТ</span>
												<span className="branch-trf-tile-count">{imagingStudies.length} иссл.</span>
											</div>
											<div className="branch-trf-tile-desc">
												Снимки ОПТГ, КЛКТ 3D, прицельные, журнал дозовых нагрузок (мкЗв)
											</div>
										</div>
									</label>

									{/* 6. Active Lab Orders */}
									<label className={`branch-trf-check-tile ${selectedComponents.activeLabOrders ? "active" : ""}`}>
										<input
											type="checkbox"
											className="branch-trf-checkbox"
											checked={selectedComponents.activeLabOrders}
											onChange={() => toggleComponent("activeLabOrders")}
										/>
										<div className="branch-trf-tile-info">
											<div className="branch-trf-tile-title">
												<span>Наряды лаборатории (ЗТЛ)</span>
												<span className="branch-trf-tile-count">{labOrders.length} нарядов</span>
											</div>
											<div className="branch-trf-tile-desc">
												Автоматическое перенаправление курьера в филиал-получатель
											</div>
										</div>
									</label>

									{/* 7. Somatic Anamnesis */}
									<label className={`branch-trf-check-tile ${selectedComponents.somaticAnamnesis ? "active" : ""}`}>
										<input
											type="checkbox"
											className="branch-trf-checkbox"
											checked={selectedComponents.somaticAnamnesis}
											onChange={() => toggleComponent("somaticAnamnesis")}
										/>
										<div className="branch-trf-tile-info">
											<div className="branch-trf-tile-title">
												<span>Соматический анамнез</span>
												<span className="branch-trf-tile-count">Безопасность</span>
											</div>
											<div className="branch-trf-tile-desc">
												Аллергии, диабет, кардиостимулятор, инфекции, группа крови
											</div>
										</div>
									</label>

									{/* 8. Deposit Balance */}
									<label className={`branch-trf-check-tile ${selectedComponents.depositBalance ? "active" : ""}`}>
										<input
											type="checkbox"
											className="branch-trf-checkbox"
											checked={selectedComponents.depositBalance}
											onChange={() => toggleComponent("depositBalance")}
										/>
										<div className="branch-trf-tile-info">
											<div className="branch-trf-tile-title">
												<span>Остаток депозита (Ваучер)</span>
												<span className="branch-trf-tile-count">{formatRubCurrency(balanceRub)}</span>
											</div>
											<div className="branch-trf-tile-desc">
												Атомарный transfer-voucher, защита от двойного списания
											</div>
										</div>
									</label>
								</div>
							</div>

							{/* Deposit Transfer Voucher Box */}
							{balanceRub > 0 && selectedComponents.depositBalance && (
								<div className="branch-trf-deposit-box">
									<div className="branch-trf-deposit-header">
										<div className="branch-trf-deposit-title">
											<Wallet size={20} />
											<span>Атомарный трансфер депозита (Защита от двойного списания)</span>
										</div>
										<div className="branch-trf-deposit-amount">
											{formatRubCurrency(balanceRub)}
										</div>
									</div>
									<p style={{ fontSize: "0.82rem", color: "var(--muted, #64748b)", margin: 0 }}>
										Баланс будет заморожен в филиале <strong>{sourceBranch.shortNameRu}</strong> и выпущен одноразовый криптографический transfer-voucher. Погашение произойдет атомарно при первом подтверждении в филиале <strong>{targetBranch.shortNameRu}</strong>.
									</p>
								</div>
							)}

							{/* 152-FZ Consent Block */}
							<div className="branch-trf-consent-box">
								<div className="branch-trf-consent-header">
									<ShieldCheck size={20} />
									<span>Согласие на передачу персональных данных между филиалами сети (152-ФЗ / 323-ФЗ)</span>
								</div>
								<label style={{ display: "flex", alignItems: "center", gap: "10px", cursor: "pointer", fontWeight: 600, fontSize: "0.9rem" }}>
									<input
										type="checkbox"
										checked={is152FzConsentGiven}
										onChange={(e) => setIs152FzConsentGiven(e.target.checked)}
										style={{ width: "18px", height: "18px", accentColor: "var(--ok-fg, #16a34a)" }}
									/>
									<span>Пациент дал согласие на обработку и передачу медицинской документации ф. 043/у в филиал сети</span>
								</label>

								<div className="branch-trf-consent-controls">
									<div>
										<label style={{ fontSize: "0.8rem", color: "var(--muted, #64748b)", fontWeight: 600, display: "block", marginBottom: "4px" }}>
											ФИО оператора / администратора
										</label>
										<input
											type="text"
											className="branch-trf-select"
											style={{ fontSize: "0.9rem", padding: "8px 10px" }}
											value={operatorStaffName}
											onChange={(e) => setOperatorStaffName(e.target.value)}
										/>
									</div>

									<div>
										<label style={{ fontSize: "0.8rem", color: "var(--muted, #64748b)", fontWeight: 600, display: "block", marginBottom: "4px" }}>
											Способ подтверждения подписи
										</label>
										<select
											className="branch-trf-select"
											style={{ fontSize: "0.9rem", padding: "8px 10px" }}
											value={signatureType}
											onChange={(e) => setSignatureType(e.target.value as PatientSignatureType)}
										>
											<option value="simple_electronic_signature_sms">Простая ЭП (СМС-код верификации)</option>
											<option value="tablet_stylus_biometric">Планшет / стилус (биометрический росчерк)</option>
											<option value="paper_scan">Бумажное заявление со скан-копией</option>
											<option value="ukep_crypto_pro">УКЭП (КриптоПро / ЕГИСЗ)</option>
										</select>
									</div>
								</div>
							</div>
						</>
					) : (
						/* 3. Transfer Success Screen */
						<div className="branch-trf-success-view">
							<div className="branch-trf-success-badge">
								<Check size={36} />
							</div>
							<div>
								<h3 style={{ fontSize: "1.3rem", fontWeight: 800, margin: "0 0 4px 0", color: "var(--ok-fg, #166534)" }}>
									Трансфер успешно выполнен и зафиксирован!
								</h3>
								<p style={{ color: "var(--muted, #64748b)", fontSize: "0.9rem", margin: 0 }}>
									Электронная медицинская карта 043/у и клинический снимок переданы в <strong>{targetBranch.nameRu}</strong>.
								</p>
							</div>

							{/* Verification QR Card */}
							<div className="branch-trf-qr-card">
								<img
									src={transferResult.qrDataUri}
									alt="QR код верификации"
									width="160"
									height="160"
									style={{ borderRadius: "8px" }}
								/>
								<span style={{ fontSize: "0.82rem", color: "var(--muted, #64748b)" }}>
									QR-код электронной верификации (ISO/IEC 18004)
								</span>
								{transferResult.voucher && (
									<div style={{ marginTop: "6px", display: "flex", alignItems: "center", gap: "8px" }}>
										<span className="branch-trf-voucher-code">
											{transferResult.voucher.voucherCode}
										</span>
										<button
											type="button"
											className="branch-trf-btn branch-trf-btn-secondary"
											style={{ padding: "6px 10px", minHeight: "36px" }}
											onClick={handleCopyVoucher}
											title="Скопировать код ваучера"
										>
											<Copy size={16} />
											<span>{copyFeedback || "Копировать"}</span>
										</button>
									</div>
								)}
							</div>

							{/* Meta Table Summary */}
							<table className="branch-trf-meta-table">
								<tbody>
									<tr>
										<td><strong>Идентификатор снимка:</strong></td>
										<td><code>{transferResult.snapshot.snapshotId}</code></td>
									</tr>
									<tr>
										<td><strong>Маршрут:</strong></td>
										<td>{sourceBranch.shortNameRu} ➔ {targetBranch.shortNameRu}</td>
									</tr>
									<tr>
										<td><strong>Контрольная сумма SHA-256:</strong></td>
										<td><code style={{ fontSize: "0.75rem" }}>{transferResult.snapshot.checksumSha256}</code></td>
									</tr>
									<tr>
										<td><strong>Переданный баланс:</strong></td>
										<td><strong>{formatRubCurrency(transferResult.snapshot.financialDeposit.currentBalanceRub)}</strong></td>
									</tr>
									<tr>
										<td><strong>Наряды ЗТЛ:</strong></td>
										<td>{transferResult.snapshot.activeLabOrders.length} нарядов перенаправлены в новый филиал</td>
									</tr>
								</tbody>
							</table>
						</div>
					)}
				</div>

				{/* 4. Footer Actions */}
				<div className="branch-trf-footer">
					{!transferResult ? (
						<>
							<button
								type="button"
								className="branch-trf-btn branch-trf-btn-secondary"
								onClick={onClose}
							>
								Отмена
							</button>
							<button
								type="button"
								className="branch-trf-btn branch-trf-btn-primary"
								disabled={!validation.isValid || isExecuting}
								onClick={handleExecuteTransfer}
								data-testid="execute-branch-transfer-btn"
							>
								{isExecuting ? "Выполняется трансфер..." : "Выполнить трансфер (1-клик)"}
							</button>
						</>
					) : (
						<>
							<button
								type="button"
								className="branch-trf-btn branch-trf-btn-secondary"
								onClick={handleDownloadCsv}
								title="Экспорт передаточного реестра в формате CSV"
							>
								<FileSpreadsheet size={16} />
								<span>Реестр (CSV)</span>
							</button>
							<button
								type="button"
								className="branch-trf-btn branch-trf-btn-secondary"
								onClick={handleDownloadJson}
								title="Скачать полный клинический снимок в формате JSON"
							>
								<FileDown size={16} />
								<span>Снимок (JSON)</span>
							</button>
							<button
								type="button"
								className="branch-trf-btn branch-trf-btn-primary"
								onClick={handlePrintAct}
								title="Распечатать официальный передаточный акт ф. 043/у"
								data-testid="print-transfer-act-btn"
							>
								<Printer size={16} />
								<span>Печать передаточного акта</span>
							</button>
							<button
								type="button"
								className="branch-trf-btn branch-trf-btn-secondary"
								onClick={onClose}
							>
								Закрыть
							</button>
						</>
					)}
				</div>
			</div>
		</div>,
		document.body,
	);
};
