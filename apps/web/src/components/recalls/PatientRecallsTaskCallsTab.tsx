import type React from "react";
import { PhoneCall } from "lucide-react";
import type { StomxTaskCallType } from "@dental/shared";
import type { PatientRecallRecord, RecallContactStatus } from "./patientRecallEngine";
import { PatientRecallsTaskCallBanner } from "./PatientRecallsTaskCallBanner";
import { PatientRecallsTaskCallCard } from "./PatientRecallsTaskCallCard";
import { PatientRecallsTaskCallsToolbar } from "./PatientRecallsTaskCallsToolbar";

export interface TaskCallCandidateItem {
	readonly candidate: PatientRecallRecord;
	readonly taskType: StomxTaskCallType;
}

export interface PatientRecallsTaskCallsTabProps {
	readonly taskCallCandidates: readonly TaskCallCandidateItem[];
	readonly searchQuery: string;
	readonly onSearchQueryChange: (query: string) => void;
	readonly selectedTaskCallType: StomxTaskCallType | "all";
	readonly onSelectTaskCallType: (type: StomxTaskCallType | "all") => void;
	readonly activeTaskCallScriptType: StomxTaskCallType | null;
	readonly onToggleTaskCallScriptType: (type: StomxTaskCallType | null) => void;
	readonly onWhatsApp: (candidate: PatientRecallRecord) => void;
	readonly onTelegram: (candidate: PatientRecallRecord) => void;
	readonly onBook: (candidate: PatientRecallRecord) => void;
	readonly onStatusUpdate: (candidateId: string, status: RecallContactStatus) => void;
}

export const PatientRecallsTaskCallsTab: React.FC<PatientRecallsTaskCallsTabProps> = ({
	taskCallCandidates,
	searchQuery,
	onSearchQueryChange,
	selectedTaskCallType,
	onSelectTaskCallType,
	activeTaskCallScriptType,
	onToggleTaskCallScriptType,
	onWhatsApp,
	onTelegram,
	onBook,
	onStatusUpdate,
}) => {
	return (
		<main className="recall-content-area" data-testid="task-calls-view-section">
			<PatientRecallsTaskCallsToolbar
				searchQuery={searchQuery}
				onSearchQueryChange={onSearchQueryChange}
				selectedTaskCallType={selectedTaskCallType}
				onSelectTaskCallType={onSelectTaskCallType}
				activeTaskCallScriptType={activeTaskCallScriptType}
				onToggleTaskCallScriptType={onToggleTaskCallScriptType}
				taskCallCandidates={taskCallCandidates}
			/>

			{activeTaskCallScriptType && (
				<PatientRecallsTaskCallBanner
					activeTaskCallScriptType={activeTaskCallScriptType}
					onClose={() => onToggleTaskCallScriptType(null)}
				/>
			)}

			{taskCallCandidates.length === 0 ? (
				<div className="recall-empty-state" data-testid="task-calls-empty-state">
					<PhoneCall size={48} className="recall-empty-icon" aria-hidden="true" />
					<h3 className="recall-empty-title">Все плановые звонки выполнены</h3>
					<p className="recall-empty-text">
						В выбранной категории сервисных звонков нет ожидающих пациентов. Новые задачи формируются автоматически.
					</p>
				</div>
			) : (
				<div style={{ padding: "0 24px 24px 24px", display: "flex", flexDirection: "column", gap: "12px" }}>
					{taskCallCandidates.map(({ candidate, taskType }) => (
						<PatientRecallsTaskCallCard
							key={candidate.id}
							candidate={candidate}
							taskType={taskType}
							isScriptActive={activeTaskCallScriptType === taskType}
							onToggleScript={() => onToggleTaskCallScriptType(activeTaskCallScriptType === taskType ? null : taskType)}
							onWhatsApp={onWhatsApp}
							onTelegram={onTelegram}
							onBook={onBook}
							onStatusUpdate={onStatusUpdate}
						/>
					))}
				</div>
			)}
		</main>
	);
};
