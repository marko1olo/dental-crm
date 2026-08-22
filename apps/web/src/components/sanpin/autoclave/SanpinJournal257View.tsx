import React from 'react';
import { FileText, ShieldCheck, CheckCircle2, XCircle, Printer, Download } from 'lucide-react';
import { Form257SterilizerJournalEntry } from './autoclaveEngine';

export interface SanpinJournal257ViewProps {
	entries: Form257SterilizerJournalEntry[];
	clinicName?: string;
}

export function SanpinJournal257View({
	entries,
	clinicName = 'Стоматологическая клиника «DENTE»'
}: SanpinJournal257ViewProps) {
	const handlePrint = () => {
		window.print();
	};

	return (
		<div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
			{/* Top Header & Actions */}
			<div className="no-print" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
				<div>
					<h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: 'var(--ink, #0f172a)' }}>
						Журнал контроля работы стерилизаторов (Форма № 257/у)
					</h3>
					<div style={{ fontSize: '0.75rem', color: 'var(--muted, #64748b)' }}>
						Утверждена Минздравом СССР № 1030, действует в соответствии с СанПиН 3.3686-21
					</div>
				</div>
				<button
					type="button"
					onClick={handlePrint}
					className="autoclave-btn"
				>
					<Printer size={16} />
					Печать журнала (Форма 257/у)
				</button>
			</div>

			{/* Printable Document Sheet */}
			<div style={{ background: 'var(--paper, #fff)', border: '1px solid var(--line, #e2e8f0)', borderRadius: '8px', padding: '1rem', overflowX: 'auto' }}>
				{/* Clinic & Form Stamp */}
				<div style={{ textAlign: 'center', marginBottom: '1rem', borderBottom: '2px solid var(--line, #e2e8f0)', paddingBottom: '0.75rem' }}>
					<div style={{ fontSize: '0.875rem', fontWeight: 700 }}>{clinicName}</div>
					<div style={{ fontSize: '1rem', fontWeight: 800, marginTop: '0.25rem' }}>
						ЖУРНАЛ РАБОТЫ СТЕРИЛИЗАТОРОВ (ФОРМА № 257/у)
					</div>
					<div style={{ fontSize: '0.75rem', color: 'var(--muted, #64748b)' }}>
						Паровой автоклав (Class B) • Контроль температурных и химических индикаторов
					</div>
				</div>

				{entries.length === 0 ? (
					<div style={{ padding: '2rem', textAlign: 'center', color: 'var(--muted, #64748b)' }}>
						Записи в журнале за текущую смену отсутствуют.
					</div>
				) : (
					<table className="sterile-packs-table" style={{ fontSize: '0.75rem' }}>
						<thead>
							<tr>
								<th>Дата / Цикл</th>
								<th>Аппарат</th>
								<th>Стерилизуемые изделия</th>
								<th>Упаковка / Кол-во</th>
								<th>Режим (T°, P, время)</th>
								<th>Хим. тест (до/после)</th>
								<th>Результат</th>
								<th>Подпись оператора</th>
							</tr>
						</thead>
						<tbody>
							{entries.map(entry => (
								<tr key={entry.id}>
									<td style={{ fontWeight: 600 }}>
										{entry.date}
										<div style={{ fontSize: '0.6875rem', color: 'var(--brand-500, #3b82f6)' }}>
											Цикл #{entry.cycleNumber}
										</div>
									</td>
									<td>
										<strong>{entry.deviceName}</strong>
										<div style={{ fontSize: '0.6875rem', color: 'var(--muted, #64748b)' }}>
											{entry.autoclaveId}
										</div>
									</td>
									<td>{entry.loadDescriptionRu}</td>
									<td>
										{entry.packagingType === 'kraft_paper_sealed' ? 'Крафт-пакет (термошов)' : 'Пакет самоклеящийся'}
										<div style={{ fontWeight: 600 }}>{entry.packsCount} пакетов</div>
									</td>
									<td>
										{entry.sterilizationMode.temperatureCelsius}°C • {entry.sterilizationMode.pressureBar} бар
										<div style={{ color: 'var(--muted, #64748b)' }}>{entry.sterilizationMode.durationMinutes} мин</div>
									</td>
									<td>
										<div style={{ fontSize: '0.6875rem' }}>
											До: {entry.indicatorColorBeforeRu}
										</div>
										<div style={{ fontSize: '0.6875rem', fontWeight: 600, color: entry.isIndicatorPassed ? 'var(--ok, #10b981)' : 'var(--bad, #ef4444)' }}>
											После: {entry.indicatorColorAfterRu}
										</div>
									</td>
									<td>
										{entry.isBatchApproved ? (
											<span style={{ color: 'var(--ok, #10b981)', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
												<CheckCircle2 size={14} />
												СТЕРИЛЬНО
											</span>
										) : (
											<span style={{ color: 'var(--bad, #ef4444)', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
												<XCircle size={14} />
												БРАК
											</span>
										)}
									</td>
									<td>
										<div style={{ fontWeight: 600 }}>{entry.operatorName}</div>
										<div style={{ fontSize: '0.625rem', color: 'var(--muted, #64748b)' }}>
											{entry.operatorSignatureStamp}
										</div>
									</td>
								</tr>
							))}
						</tbody>
					</table>
				)}
			</div>
		</div>
	);
}
