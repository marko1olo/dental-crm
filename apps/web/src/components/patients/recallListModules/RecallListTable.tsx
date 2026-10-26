/**
 * RecallListTable.tsx
 * Table container and pagination controls for recall candidates.
 * Governed by Mandate 8b (Strict <= 120 lines).
 */

import React from "react";
import type { RecallCandidate } from "@dental/shared";
import { RecallCandidateRow } from "./RecallCandidateRow";

export interface RecallListTableProps {
	readonly candidates: readonly RecallCandidate[];
	readonly busyPatient: string | null;
	readonly called: Set<string>;
	readonly onInvite: (c: RecallCandidate) => void;
	readonly onMarkCalled: (id: string) => void;
	readonly onSelectPatient?: (patientId: string) => void;
	readonly clinicName?: string;
	readonly hasMore: boolean;
	readonly remainingCount: number;
	readonly onShowMore: () => void;
}

export function RecallListTable({
	candidates, busyPatient, called, onInvite, onMarkCalled, onSelectPatient, clinicName, hasMore, remainingCount, onShowMore,
}: RecallListTableProps) {
	return (
		<>
			<div className="ops-table-wrap">
				<table className="ops-table">
					<caption className="sr-only">Пациенты, которых пора пригласить на осмотр</caption>
					<thead>
						<tr>
							<th scope="col">Пациент</th>
							<th scope="col">Последний приём</th>
							<th scope="col">Почему в списке</th>
							<th scope="col">Что делать</th>
						</tr>
					</thead>
					<tbody>
						{candidates.map((candidate) => (
							<RecallCandidateRow
								key={candidate.patientId}
								candidate={candidate}
								busy={busyPatient === candidate.patientId}
								wasCalled={called.has(candidate.patientId)}
								onInvite={onInvite}
								onMarkCalled={onMarkCalled}
								onSelectPatient={onSelectPatient}
								clinicName={clinicName}
							/>
						))}
					</tbody>
				</table>
			</div>

			{hasMore && (
				<div className="flex justify-center my-3">
					<button
						type="button"
						data-testid="btn-recall-show-more"
						className="secondary-button h-8 min-h-[32px] px-3.5 rounded-lg text-[13px] font-medium"
						onClick={onShowMore}
					>
						Показать ещё ({Math.min(40, remainingCount)} из {remainingCount})
					</button>
				</div>
			)}
		</>
	);
}
