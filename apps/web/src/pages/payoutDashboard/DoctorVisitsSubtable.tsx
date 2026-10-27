/**
 * apps/web/src/pages/payoutDashboard/DoctorVisitsSubtable.tsx
 * Paid visits subtable with search and pagination for a doctor.
 * Mandates 8b, 8e, 8x. File <= 120 lines.
 */

import React from "react";
import { countLabel } from "../../AppHelpers";
import { DoctorVisitRow } from "./DoctorVisitRow";
import type { DoctorPayoutVisit } from "./types";

export interface DoctorVisitsSubtableProps {
	readonly doctorUserId: string;
	readonly visits: readonly DoctorPayoutVisit[];
	readonly searchQuery: string;
	readonly onSearchChange: (doctorId: string, query: string) => void;
	readonly currentPage: number;
	readonly onPageChange: (doctorId: string, page: number) => void;
}

export function DoctorVisitsSubtable({
	doctorUserId,
	visits,
	searchQuery,
	onSearchChange,
	currentPage,
	onPageChange,
}: DoctorVisitsSubtableProps) {
	const search = (searchQuery ?? "").toLowerCase().trim();
	const filteredVisits = search
		? visits.filter(
				(v) =>
					v.patientName.toLowerCase().includes(search) ||
					v.medicalCardNumber.toLowerCase().includes(search) ||
					v.services.some(
						(s) =>
							s.title.toLowerCase().includes(search) ||
							(s.order804nCode && s.order804nCode.toLowerCase().includes(search)) ||
							(s.toothCode && s.toothCode.includes(search)),
					),
			)
		: visits;

	const pageSize = 10;
	const totalPages = Math.max(1, Math.ceil(filteredVisits.length / pageSize));
	const pagedVisits = filteredVisits.slice((currentPage - 1) * pageSize, currentPage * pageSize);

	return (
		<div>
			<div className="ops-field">
				<label htmlFor={`search-visits-${doctorUserId}`}>Поиск по приемам врача</label>
				<input
					id={`search-visits-${doctorUserId}`}
					type="text"
					placeholder="Поиск по ФИО пациента, номеру карты или услуге…"
					value={searchQuery}
					onChange={(e) => onSearchChange(doctorUserId, e.target.value)}
				/>
			</div>

			{filteredVisits.length === 0 ? (
				<p className="ops-empty">
					{search ? "По запросу ничего не найдено." : "За выбранный месяц у врача нет оплаченных визитов."}
				</p>
			) : (
				<>
					<div className="ops-subtable-wrap">
						<table className="ops-subtable">
							<thead>
								<tr>
									<th scope="col">Дата и время</th>
									<th scope="col">Пациент и карта</th>
									<th scope="col">Оказанные услуги (Зуб)</th>
									<th scope="col">Списанные материалы</th>
									<th scope="col">Сумма оплаты</th>
								</tr>
							</thead>
							<tbody>
								{pagedVisits.map((visit) => (
									<DoctorVisitRow key={visit.visitId} visit={visit} />
								))}
							</tbody>
						</table>
					</div>

					{totalPages > 1 && (
						<div className="ops-pagination">
							<button
								type="button"
								className="ops-pagination-button"
								disabled={currentPage <= 1}
								onClick={() => onPageChange(doctorUserId, Math.max(1, currentPage - 1))}
							>
								Предыдущая
							</button>
							<span className="ops-note">
								Страница {currentPage} из {totalPages} (всего {filteredVisits.length}{" "}
								{countLabel(filteredVisits.length, "прием", "приема", "приемов")})
							</span>
							<button
								type="button"
								className="ops-pagination-button"
								disabled={currentPage >= totalPages}
								onClick={() => onPageChange(doctorUserId, Math.min(totalPages, currentPage + 1))}
							>
								Следующая
							</button>
						</div>
					)}
				</>
			)}
		</div>
	);
}
