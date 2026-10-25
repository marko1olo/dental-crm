import React from "react";
import { Building2 } from "lucide-react";
import type { SickLeaveRegistryEntry } from "../sickLeaveElnEngine";

export interface SickLeaveRegistrySectionProps {
	entry: SickLeaveRegistryEntry;
}

export function SickLeaveRegistrySection({ entry }: SickLeaveRegistrySectionProps) {
	return (
		<div className="sick-leave-body">
			<div className="sick-leave-section">
				<h4 className="sick-leave-section-title">
					<Building2 size={16} />
					Реестр листков нетрудоспособности и справок
				</h4>
				<table className="sick-leave-journal-table">
					<thead>
						<tr>
							<th>№ / Дата</th>
							<th>Пациент / СНИЛС</th>
							<th>Диагноз МКБ-10</th>
							<th>Номер ЭЛН / Срок</th>
							<th>Обоснование</th>
							<th>Подпись</th>
						</tr>
					</thead>
					<tbody>
						<tr>
							<td>
								<strong>№ {entry.entryNumber}</strong>
								<br />
								{entry.date}
							</td>
							<td>
								<strong>{entry.patientFio}</strong>
								<br />
								{entry.birthDate} | СНИЛС: {entry.snils}
								<br />
								Карта: {entry.medicalCardNumber}
							</td>
							<td>
								<strong>{entry.icd10}</strong>
								<br />
								{entry.diagnosis}
							</td>
							<td>
								<strong>ЭЛН № {entry.sickLeaveNumber}</strong>
								<br />
								{entry.incapacityPeriodText}
							</td>
							<td>
								<div style={{ fontSize: '0.75rem', color: 'var(--muted, #64748b)' }}>{entry.vkReason}</div>
								<div style={{ marginTop: '4px', fontWeight: 600 }}>{entry.vkDecisionText}</div>
							</td>
							<td>
								<div>
									Врач: <strong>{entry.chairpersonSign}</strong>
								</div>
							</td>
						</tr>
					</tbody>
				</table>
			</div>
		</div>
	);
}
