import type React from "react";
import type { PatientRecallRecord, RecallContactStatus } from "./patientRecallEngine";
import { PatientRecallsTableRow } from "./PatientRecallsTableRow";

export interface PatientRecallsTableViewProps {
	readonly filteredCandidates: readonly PatientRecallRecord[];
	readonly activeScriptCandidate: PatientRecallRecord | null;
	readonly activePreviewCandidate: PatientRecallRecord | null;
	readonly openContactDropdownId: string | null;
	readonly setOpenContactDropdownId: (id: string | null) => void;
	readonly copiedCandidateId: string | null;
	readonly onBook: (candidate: PatientRecallRecord) => void;
	readonly onTogglePreview: (candidate: PatientRecallRecord) => void;
	readonly onToggleScript: (candidate: PatientRecallRecord) => void;
	readonly onWhatsApp: (candidate: PatientRecallRecord) => void;
	readonly onTelegram: (candidate: PatientRecallRecord) => void;
	readonly onCopySms: (candidate: PatientRecallRecord) => void;
	readonly onStatusUpdate: (candidateId: string, status: RecallContactStatus) => void;
	readonly onPostpone?: ((candidate: PatientRecallRecord, duration: "2_weeks" | "1_month") => void) | undefined;
}

export const PatientRecallsTableView: React.FC<PatientRecallsTableViewProps> = ({
	filteredCandidates,
	activeScriptCandidate,
	activePreviewCandidate,
	openContactDropdownId,
	setOpenContactDropdownId,
	copiedCandidateId,
	onBook,
	onTogglePreview,
	onToggleScript,
	onWhatsApp,
	onTelegram,
	onCopySms,
	onStatusUpdate,
	onPostpone,
}) => {
	return (
		<div className="recall-table-wrap">
			<table className="recall-table">
				<thead>
					<tr>
						<th scope="col">Пациент</th>
						<th scope="col">Клинический цикл</th>
						<th scope="col">Визит / Срок</th>
						<th scope="col">Срочность</th>
						<th scope="col">Лечащий врач</th>
						<th scope="col">Статус</th>
						<th scope="col">1-Click Действия</th>
					</tr>
				</thead>
				<tbody>
					{filteredCandidates.map((candidate) => (
						<PatientRecallsTableRow
							key={candidate.id}
							candidate={candidate}
							isScriptActive={activeScriptCandidate?.id === candidate.id}
							isRealPreviewActive={activePreviewCandidate?.id === candidate.id}
							isDropdownOpen={openContactDropdownId === candidate.id}
							copiedCandidateId={copiedCandidateId}
							onBook={onBook}
							onTogglePreview={onTogglePreview}
							onToggleScript={onToggleScript}
							onWhatsApp={onWhatsApp}
							onTelegram={onTelegram}
							onCopySms={onCopySms}
							onStatusUpdate={onStatusUpdate}
							onPostpone={onPostpone}
							onToggleDropdown={() =>
								setOpenContactDropdownId(openContactDropdownId === candidate.id ? null : candidate.id)
							}
						/>
					))}
				</tbody>
			</table>
		</div>
	);
};
