import React from "react";
import { Building2 } from "lucide-react";
import type { ElnJournal036SectionProps } from "./types";

export function ElnJournal036Section({ form036u }: ElnJournal036SectionProps) {
	return (
		<div className="sick-leave-body">
			<div className="sick-leave-section">
				<h4 className="sick-leave-section-title">
					<Building2 size={16} />
					Журнал учета клинико-экспертной работы (Учетная форма № 036/у)
				</h4>
				<table className="sick-leave-journal-table">
					<thead>
						<tr>
							<th>№ / Дата</th>
							<th>Пациент / СНИЛС</th>
							<th>Диагноз МКБ-10</th>
							<th>Номер ЭЛН / Срок</th>
							<th>Обоснование и решение комиссии</th>
							<th>Подписи экспертов</th>
						</tr>
					</thead>
					<tbody>
						<tr>
							<td>
								<strong>№ {form036u.entryNumber}</strong>
								<br />
								{form036u.date}
							</td>
							<td>
								<strong>{form036u.patientFio}</strong>
								<br />
								{form036u.birthDate} | СНИЛС: {form036u.snils}
								<br />
								Карта: {form036u.medicalCardNumber}
							</td>
							<td>
								<strong>{form036u.icd10}</strong>
								<br />
								{form036u.diagnosis}
							</td>
							<td>
								<strong>ЭЛН № {form036u.sickLeaveNumber}</strong>
								<br />
								{form036u.incapacityPeriodText}
							</td>
							<td>
								<div style={{ fontSize: '0.75rem', color: 'var(--muted, #64748b)' }}>{form036u.vkReason}</div>
								<div style={{ marginTop: '4px', fontWeight: 600 }}>{form036u.vkDecisionText}</div>
							</td>
							<td>
								<div>
									Председатель: <strong>{form036u.chairpersonSign}</strong>
								</div>
								{form036u.membersSign.length > 0 && (
									<div style={{ fontSize: '0.75rem', color: 'var(--muted, #64748b)', marginTop: '2px' }}>
										Члены ВК: {form036u.membersSign.join(', ')}
									</div>
								)}
							</td>
						</tr>
					</tbody>
				</table>
			</div>
		</div>
	);
}
