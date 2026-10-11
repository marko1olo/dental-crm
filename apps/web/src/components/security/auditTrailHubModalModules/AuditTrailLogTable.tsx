import React from 'react';
import type { AuditTrailEntry } from './types';
import { AUDIT_EVENT_METADATA } from '../auditTrailEngine';
import { formatAuditDateTime, truncateHash } from './auditUtils';
import { AuditTrailDetailDrawer } from './AuditTrailDetailDrawer';

export interface AuditTrailLogTableProps {
	readonly entries: readonly AuditTrailEntry[];
	readonly selectedEntry: AuditTrailEntry | null;
	readonly onSelectEntry: (entry: AuditTrailEntry | null) => void;
	readonly onCopyHash: (hash: string) => void;
}

export function AuditTrailLogTable({
	entries,
	selectedEntry,
	onSelectEntry,
	onCopyHash,
}: AuditTrailLogTableProps): React.JSX.Element {
	return (
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
					{entries.length === 0 ? (
						<tr>
							<td colSpan={9} style={{ textAlign: 'center', padding: '2rem' }}>
								Событий по заданным критериям не найдено.
							</td>
						</tr>
					) : (
						entries.map((entry) => {
							const isSelected = selectedEntry?.id === entry.id;
							const timeFormatted = formatAuditDateTime(entry.timestamp);
							const meta = AUDIT_EVENT_METADATA[entry.eventType];

							return (
								<React.Fragment key={entry.id}>
									<tr
										className={isSelected ? 'selected' : ''}
										onClick={() => onSelectEntry(isSelected ? null : entry)}
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
											<div>
												<strong>{entry.actor.fullName}</strong>
											</div>
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
												<div
													style={{
														fontSize: '0.6875rem',
														color: 'var(--bad-fg, #ef4444)',
														fontWeight: 600,
													}}
												>
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
													onCopyHash(entry.chainHash);
												}}
												title="Скопировать полный SHA-256 хэш"
												style={{ cursor: 'pointer', textDecoration: 'underline dotted' }}
											>
												{truncateHash(entry.chainHash, 8, 4)}
											</span>
										</td>
									</tr>

									{/* Row Detail Expand */}
									{isSelected && (
										<tr>
											<td
												colSpan={9}
												style={{ background: 'var(--paper-strong, #f8fafc)', padding: '1rem' }}
											>
												<AuditTrailDetailDrawer
													entry={entry}
													onClose={() => onSelectEntry(null)}
												/>
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
	);
}
