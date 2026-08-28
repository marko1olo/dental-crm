import React, { useState, useMemo } from 'react';
import {
	ShieldCheck,
	ShieldAlert,
	AlertTriangle,
	FileText,
	Download,
	Search,
	X,
	CheckCircle2,
	Clock,
	Lock,
	User,
	AlertOctagon,
	Eye,
	RefreshCw,
	Copy,
	Check,
	Printer,
	FileSpreadsheet,
	ChevronDown,
	ChevronUp,
	Shield,
} from 'lucide-react';
import {
	AuditTrailEntry,
	AuditEventType,
	AuditSeverity,
	AuditStatus,
	AuditFilterCriteria,
	ClinicComplianceMetadata,
	DEFAULT_CLINIC_COMPLIANCE,
	AUDIT_EVENT_METADATA,
	verifyAuditChain,
	detectAuditAnomalies,
	filterAuditTrail,
	exportAuditTrailToRoskomnadzorJson,
	exportAuditTrailToCsv,
	generate152FzAuditActText,
	generate152FzAuditActHtml,
	getInitialAuditTrailDemoData,
} from './auditTrailEngine';
import './auditTrail.css';

export interface AuditTrailHubModalProps {
	readonly isOpen: boolean;
	readonly onClose: () => void;
	readonly clinicInfo?: ClinicComplianceMetadata;
	readonly initialEntries?: readonly AuditTrailEntry[];
}

export function AuditTrailHubModal({
	isOpen,
	onClose,
	clinicInfo = DEFAULT_CLINIC_COMPLIANCE,
	initialEntries,
}: AuditTrailHubModalProps): React.JSX.Element | null {
	const [entries, setEntries] = useState<readonly AuditTrailEntry[]>(() => {
		return initialEntries && initialEntries.length > 0
			? initialEntries
			: getInitialAuditTrailDemoData();
	});

	const [searchQuery, setSearchQuery] = useState<string>('');
	const [selectedEventType, setSelectedEventType] = useState<AuditEventType | 'all'>('all');
	const [selectedSeverity, setSelectedSeverity] = useState<AuditSeverity | 'all'>('all');
	const [selectedStatus, setSelectedStatus] = useState<AuditStatus | 'all'>('all');
	const [onlyAnomalies, setOnlyAnomalies] = useState<boolean>(false);

	const [selectedEntry, setSelectedEntry] = useState<AuditTrailEntry | null>(null);
	const [copiedHash, setCopiedHash] = useState<string | null>(null);
	const [showActModal, setShowActModal] = useState<boolean>(false);
	const [toastMsg, setToastMsg] = useState<string | null>(null);

	// Верификация цепочки
	const verificationResult = useMemo(() => verifyAuditChain(entries), [entries]);

	// Детектор аномалий
	const anomalies = useMemo(() => detectAuditAnomalies(entries), [entries]);

	// Фильтрация записей
	const filterCriteria: AuditFilterCriteria = useMemo(
		() => ({
			searchQuery,
			eventType: selectedEventType,
			severity: selectedSeverity,
			status: selectedStatus,
			onlyAnomalies,
		}),
		[searchQuery, selectedEventType, selectedSeverity, selectedStatus, onlyAnomalies],
	);

	const filteredEntries = useMemo(
		() => filterAuditTrail(entries, filterCriteria),
		[entries, filterCriteria],
	);

	// Метрики
	const metrics = useMemo(() => {
		let viewCards = 0;
		let bills = 0;
		let consents = 0;
		for (const e of entries) {
			if (e.eventType === 'view_patient_card') viewCards++;
			if (e.eventType === 'modify_bill' || e.eventType === 'delete_bill') bills++;
			if (e.eventType === 'sign_consent_pep' || e.eventType === 'sign_consent_ukep') consents++;
		}
		return {
			total: entries.length,
			viewCards,
			bills,
			consents,
			anomaliesCount: anomalies.length,
		};
	}, [entries, anomalies]);

	const showToast = (msg: string): void => {
		setToastMsg(msg);
		setTimeout(() => setToastMsg(null), 3000);
	};

	const handleCopyHash = (hash: string): void => {
		navigator.clipboard.writeText(hash);
		setCopiedHash(hash);
		showToast('Хэш SHA-256 скопирован в буфер!');
		setTimeout(() => setCopiedHash(null), 2000);
	};

	const handleExportJson = (): void => {
		const jsonString = exportAuditTrailToRoskomnadzorJson(entries, clinicInfo);
		const blob = new Blob([jsonString], { type: 'application/json;charset=utf-8' });
		const url = URL.createObjectURL(blob);
		const a = document.createElement('a');
		a.href = url;
		a.download = `audit_trail_152fz_rkn_${Date.now()}.json`;
		a.click();
		URL.revokeObjectURL(url);
		showToast('Выгрузка JSON (Роскомнадзор / ФСТЭК) скачана');
	};

	const handleExportCsv = (): void => {
		const csvString = exportAuditTrailToCsv(entries);
		const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8' });
		const url = URL.createObjectURL(blob);
		const a = document.createElement('a');
		a.href = url;
		a.download = `audit_trail_152fz_${Date.now()}.csv`;
		a.click();
		URL.revokeObjectURL(url);
		showToast('Выгрузка CSV (Excel) скачана');
	};

	const handlePrintAct = (): void => {
		const html = generate152FzAuditActHtml(entries, clinicInfo);
		const printWin = window.open('', '_blank');
		if (printWin) {
			printWin.document.write(html);
			printWin.document.close();
			printWin.focus();
			printWin.print();
		}
	};

	if (!isOpen) return null;

	return (
		<div className="audit-modal-overlay">
			<div className="audit-modal-container">
				{/* Top Header */}
				<div className="audit-modal-header">
					<div className="audit-header-title-box">
						<div className="audit-logo-box">
							<Shield size={22} />
						</div>
						<div>
							<div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
								<span className="audit-title-main">
									Журнал аудита доступа и безопасности ПДн
								</span>
								<span className="audit-badge">152-ФЗ & Приказ ФСТЭК № 21</span>
							</div>
							<div className="audit-title-sub">
								Криптографический реестр обращений к 043/у, счетам, экспорту и согласиям
							</div>
						</div>
					</div>

					<button
						type="button"
						onClick={onClose}
						className="audit-btn-close"
						title="Закрыть окно"
					>
						<X size={20} />
					</button>
				</div>

				{/* Cryptographic Integrity Status Bar */}
				<div
					className={`audit-integrity-banner ${verificationResult.isValid ? 'valid' : 'invalid'}`}
				>
					<div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
						{verificationResult.isValid ? (
							<>
								<ShieldCheck size={18} />
								<span>
									Цепочка криптографических хэшей SHA-256 валидна: {verificationResult.verifiedCount} блоков верифицировано. Несанкционированных изменений не обнаружено.
								</span>
							</>
						) : (
							<>
								<ShieldAlert size={18} />
								<span>
									КРИТИЧЕСКИЙ СБОЙ: Нарушена целостность на блоке #{verificationResult.brokenAtIndex !== undefined ? verificationResult.brokenAtIndex + 1 : '?'}. {verificationResult.reason}
								</span>
							</>
						)}
					</div>

					<button
						type="button"
						className="audit-hash-pill"
						onClick={() => handleCopyHash(verificationResult.latestHash)}
						title="Нажмите, чтобы скопировать хэш последнего блока"
					>
						<Lock size={12} />
						<span>{verificationResult.latestHash.slice(0, 10)}...{verificationResult.latestHash.slice(-6)}</span>
						{copiedHash === verificationResult.latestHash ? (
							<Check size={12} color="var(--ok-fg)" />
						) : (
							<Copy size={12} />
						)}
					</button>
				</div>

				{/* Modal Body */}
				<div className="audit-modal-body">
					{/* Metric Summary Cards */}
					<div className="audit-metrics-grid">
						<div className="audit-metric-card">
							<div className="audit-metric-icon-box">
								<FileText size={20} />
							</div>
							<div>
								<div className="audit-metric-label">Всего записей</div>
								<div className="audit-metric-val">{metrics.total}</div>
							</div>
						</div>

						<div className="audit-metric-card">
							<div className="audit-metric-icon-box" style={{ color: '#0284c7' }}>
								<Eye size={20} />
							</div>
							<div>
								<div className="audit-metric-label">Просмотров 043/у</div>
								<div className="audit-metric-val">{metrics.viewCards}</div>
							</div>
						</div>

						<div className="audit-metric-card">
							<div className="audit-metric-icon-box" style={{ color: '#059669' }}>
								<FileSpreadsheet size={20} />
							</div>
							<div>
								<div className="audit-metric-label">Операций со счетами</div>
								<div className="audit-metric-val">{metrics.bills}</div>
							</div>
						</div>

						<div className="audit-metric-card">
							<div className="audit-metric-icon-box" style={{ color: '#7c3aed' }}>
								<Lock size={20} />
							</div>
							<div>
								<div className="audit-metric-label">Согласий ПЭП/УКЭП</div>
								<div className="audit-metric-val">{metrics.consents}</div>
							</div>
						</div>

						<div
							className="audit-metric-card"
							style={{
								borderColor: metrics.anomaliesCount > 0 ? 'var(--warn-fg, #f59e0b)' : undefined,
							}}
						>
							<div
								className="audit-metric-icon-box"
								style={{
									color: metrics.anomaliesCount > 0 ? 'var(--bad-fg, #ef4444)' : 'var(--ok-fg)',
								}}
							>
								<AlertOctagon size={20} />
							</div>
							<div>
								<div className="audit-metric-label">Алертов безопасности</div>
								<div
									className="audit-metric-val"
									style={{
										color: metrics.anomaliesCount > 0 ? 'var(--bad-fg, #ef4444)' : undefined,
									}}
								>
									{metrics.anomaliesCount}
								</div>
							</div>
						</div>
					</div>

					{/* Anomalies Alert Box */}
					{anomalies.length > 0 && (
						<div className="audit-anomalies-box">
							<div className="audit-anomalies-header">
								<div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
									<AlertTriangle size={16} />
									<span>Обнаружено аномальных событий доступа ({anomalies.length}):</span>
								</div>
								<button
									type="button"
									className={`audit-filter-toggle-btn ${onlyAnomalies ? 'active' : ''}`}
									onClick={() => setOnlyAnomalies(!onlyAnomalies)}
									style={{ minHeight: '28px', padding: '0.2rem 0.5rem', fontSize: '0.75rem' }}
								>
									{onlyAnomalies ? 'Показать все записи' : 'Фильтровать только аномалии'}
								</button>
							</div>

							{anomalies.map((anomaly) => (
								<div key={anomaly.id} className={`audit-anomaly-item ${anomaly.severity}`}>
									<div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 600 }}>
										<span>{anomaly.titleRu}</span>
										<span style={{ color: 'var(--muted, #64748b)' }}>
											{new Date(anomaly.detectedAt).toLocaleTimeString('ru-RU', {
												hour: '2-digit',
												minute: '2-digit',
											})}
										</span>
									</div>
									<div>{anomaly.descriptionRu}</div>
									<div style={{ fontSize: '0.6875rem', color: 'var(--muted, #64748b)' }}>
										<strong>Рекомендация:</strong> {anomaly.recommendationRu}
									</div>
								</div>
							))}
						</div>
					)}

					{/* Search & Filter Bar */}
					<div className="audit-filter-bar">
						<div className="audit-search-input-box">
							<Search size={16} className="audit-search-icon" />
							<input
								type="text"
								value={searchQuery}
								onChange={(e) => setSearchQuery(e.target.value)}
								placeholder="Поиск по ФИО, пациенту, IP или действию..."
								className="audit-search-input"
							/>
						</div>

						<select
							value={selectedEventType}
							onChange={(e) => setSelectedEventType(e.target.value as AuditEventType | 'all')}
							className="audit-filter-select"
						>
							<option value="all">Все типы событий</option>
							<option value="view_patient_card">Просмотр медкарты 043/у</option>
							<option value="modify_bill">Изменение счета / оплаты</option>
							<option value="delete_appointment">Удаление / отмена приема</option>
							<option value="export_patients_csv">Экспорт базы пациентов</option>
							<option value="sign_consent_pep">Подписание согласия (ПЭП)</option>
							<option value="sign_consent_ukep">Подписание документа (УКЭП)</option>
							<option value="unmask_pii">Просмотр полных ПДн</option>
							<option value="login_attempt">Авторизация сотрудника</option>
							<option value="role_permission_change">Смена прав / ролей</option>
						</select>

						<select
							value={selectedSeverity}
							onChange={(e) => setSelectedSeverity(e.target.value as AuditSeverity | 'all')}
							className="audit-filter-select"
						>
							<option value="all">Любая критичность</option>
							<option value="info">Info</option>
							<option value="warning">Warning</option>
							<option value="critical">Critical</option>
							<option value="alert">Alert</option>
						</select>

						<select
							value={selectedStatus}
							onChange={(e) => setSelectedStatus(e.target.value as AuditStatus | 'all')}
							className="audit-filter-select"
						>
							<option value="all">Любой статус</option>
							<option value="success">Успешно</option>
							<option value="failure">Ошибка</option>
							<option value="denied">Заблокировано</option>
						</select>

						<button
							type="button"
							className={`audit-filter-toggle-btn ${onlyAnomalies ? 'active' : ''}`}
							onClick={() => setOnlyAnomalies(!onlyAnomalies)}
						>
							<AlertTriangle size={14} />
							<span>Аномалии ({anomalies.length})</span>
						</button>
					</div>

					{/* Audit Ledger Table */}
					<div className="audit-table-wrapper">
						<table className="audit-table">
							<thead>
								<tr>
									<th>№</th>
									<th>Время (МСК)</th>
									<th>Событие</th>
									<th>Сотрудник</th>
									<th>IP-адрес</th>
									<th>Объект доступа</th>
									<th>Описание операции</th>
									<th>Критичность</th>
									<th>Хэш SHA-256</th>
								</tr>
							</thead>
							<tbody>
								{filteredEntries.length === 0 ? (
									<tr>
										<td colSpan={9} style={{ textAlign: 'center', padding: '2rem' }}>
											Событий по заданным критериям не найдено.
										</td>
									</tr>
								) : (
									filteredEntries.map((entry) => {
										const isSelected = selectedEntry?.id === entry.id;
										const timeFormatted = new Date(entry.timestamp).toLocaleString('ru-RU', {
											day: '2-digit',
											month: '2-digit',
											hour: '2-digit',
											minute: '2-digit',
											second: '2-digit',
										});
										const meta = AUDIT_EVENT_METADATA[entry.eventType];

										return (
											<React.Fragment key={entry.id}>
												<tr
													className={isSelected ? 'selected' : ''}
													onClick={() => setSelectedEntry(isSelected ? null : entry)}
													style={{ cursor: 'pointer' }}
												>
													<td className="audit-col-seq">#{entry.sequenceNumber}</td>
													<td className="audit-col-time">{timeFormatted}</td>
													<td className="audit-col-event">
														<span className={`audit-event-pill ${entry.eventCategory}`}>
															{meta.labelRu}
														</span>
													</td>
													<td>
														<div><strong>{entry.actor.fullName}</strong></div>
														<div className="audit-role-tag">{entry.actor.role}</div>
													</td>
													<td className="audit-ip-tag">{entry.actor.ipAddress}</td>
													<td>
														<div>{entry.entity.entityName ?? entry.entity.entityId}</div>
														{entry.entity.patientNameMasked && (
															<div className="audit-role-tag">Пациент: {entry.entity.patientNameMasked}</div>
														)}
													</td>
													<td>
														<div>{entry.payload.actionDescriptionRu}</div>
														{entry.payload.exportRecordCount ? (
															<div style={{ fontSize: '0.6875rem', color: '#ef4444', fontWeight: 600 }}>
																Экспортировано: {entry.payload.exportRecordCount} записей
															</div>
														) : null}
													</td>
													<td>
														<span className={`audit-severity-dot ${entry.severity}`} />
														<span style={{ textTransform: 'capitalize' }}>{entry.severity}</span>
													</td>
													<td className="audit-hash-cell">
														<span
															onClick={(e) => {
																e.stopPropagation();
																handleCopyHash(entry.chainHash);
															}}
															title="Скопировать полный SHA-256 хэш"
															style={{ cursor: 'pointer', textDecoration: 'underline dotted' }}
														>
															{entry.chainHash.slice(0, 8)}...{entry.chainHash.slice(-4)}
														</span>
													</td>
												</tr>

												{/* Row Detail Expand */}
												{isSelected && (
													<tr>
														<td colSpan={9} style={{ background: 'var(--paper-strong, #f8fafc)', padding: '1rem' }}>
															<div className="audit-detail-drawer">
																<div className="audit-detail-header">
																	<span>Детали события #{entry.sequenceNumber} ({entry.id})</span>
																	<button
																		type="button"
																		className="audit-btn"
																		style={{ minHeight: '28px', padding: '0.2rem 0.5rem', fontSize: '0.75rem' }}
																		onClick={() => setSelectedEntry(null)}
																	>
																		Свернуть
																	</button>
																</div>

																<div className="audit-detail-grid">
																	<div className="audit-detail-field">
																		<span className="audit-detail-label">Полный хэш блока (chainHash):</span>
																		<div className="audit-hash-block">{entry.chainHash}</div>
																	</div>
																	<div className="audit-detail-field">
																		<span className="audit-detail-label">Хэш пред. блока (previousHash):</span>
																		<div className="audit-hash-block">{entry.previousHash}</div>
																	</div>
																	<div className="audit-detail-field">
																		<span className="audit-detail-label">Основание 152-ФЗ / Причина:</span>
																		<div className="audit-detail-val">
																			{entry.payload.justificationReason || 'Штатное исполнение служебных обязанностей'}
																		</div>
																	</div>
																	{entry.payload.oldValue && (
																		<div className="audit-detail-field">
																			<span className="audit-detail-label">Старое значение:</span>
																			<div className="audit-hash-block">{JSON.stringify(entry.payload.oldValue)}</div>
																		</div>
																	)}
																	{entry.payload.newValue && (
																		<div className="audit-detail-field">
																			<span className="audit-detail-label">Новое значение:</span>
																			<div className="audit-hash-block">{JSON.stringify(entry.payload.newValue)}</div>
																		</div>
																	)}
																</div>
															</div>
														</td>
													</tr>
												)}
											</React.Fragment>
										);
									})
								)}
							</tbody>
						</table>
					</div>
				</div>

				{/* Modal Footer Actions */}
				<div className="audit-modal-footer">
					<div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
						<button
							type="button"
							className="audit-btn"
							onClick={handleExportCsv}
						>
							<Download size={14} />
							<span>Excel / CSV</span>
						</button>

						<button
							type="button"
							className="audit-btn"
							onClick={handleExportJson}
						>
							<Lock size={14} />
							<span>JSON (Роскомнадзор / ФСТЭК)</span>
						</button>

						<button
							type="button"
							className="audit-btn"
							onClick={() => setShowActModal(true)}
						>
							<FileText size={14} />
							<span>Акт проверки 152-ФЗ</span>
						</button>
					</div>

					<div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
						{toastMsg && (
							<span style={{ fontSize: '0.75rem', color: 'var(--ok-fg)', fontWeight: 600 }}>
								{toastMsg}
							</span>
						)}

						<button
							type="button"
							className="audit-btn audit-btn-primary"
							onClick={onClose}
						>
							<CheckCircle2 size={16} />
							<span>Готово</span>
						</button>
					</div>
				</div>
			</div>

			{/* Act Preview Sub-Modal */}
			{showActModal && (
				<div
					className="audit-modal-overlay"
					style={{ zIndex: 10000 }}
					onClick={() => setShowActModal(false)}
				>
					<div
						className="audit-modal-container"
						style={{ maxWidth: '850px' }}
						onClick={(e) => e.stopPropagation()}
					>
						<div className="audit-modal-header">
							<div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 700 }}>
								<FileText size={18} />
								<span>Акт проверки журнала 152-ФЗ / ФСТЭК</span>
							</div>
							<button
								type="button"
								onClick={() => setShowActModal(false)}
								className="audit-btn-close"
							>
								<X size={18} />
							</button>
						</div>

						<div className="audit-modal-body">
							<div className="audit-act-preview-container">
								{generate152FzAuditActText(entries, clinicInfo)}
							</div>
						</div>

						<div className="audit-modal-footer">
							<button
								type="button"
								className="audit-btn"
								onClick={() => setShowActModal(false)}
							>
								Закрыть
							</button>

							<button
								type="button"
								className="audit-btn audit-btn-primary"
								onClick={handlePrintAct}
							>
								<Printer size={16} />
								<span>Печать / Экспорт в PDF</span>
							</button>
						</div>
					</div>
				</div>
			)}
		</div>
	);
}
