import type React from "react";
import { useMemo } from "react";
import { PhoneCall } from "lucide-react";
import type { ClinicalTaskCallType } from "@dental/shared";
import type { PatientRecallRecord, RecallContactStatus } from "./patientRecallEngine";
import { PatientRecallsTaskCallBanner } from "./PatientRecallsTaskCallBanner";
import { PatientRecallsTaskCallCard } from "./PatientRecallsTaskCallCard";
import { PatientRecallsTaskCallsToolbar } from "./PatientRecallsTaskCallsToolbar";

export interface TaskCallCandidateItem {
	readonly candidate: PatientRecallRecord;
	readonly taskType: ClinicalTaskCallType;
}

export interface PatientRecallsTaskCallsTabProps {
	readonly taskCallCandidates: readonly TaskCallCandidateItem[];
	readonly searchQuery: string;
	readonly onSearchQueryChange: (query: string) => void;
	readonly selectedTaskCallType: ClinicalTaskCallType | "all";
	readonly onSelectTaskCallType: (type: ClinicalTaskCallType | "all") => void;
	readonly activeTaskCallScriptType: ClinicalTaskCallType | null;
	readonly onToggleTaskCallScriptType: (type: ClinicalTaskCallType | null) => void;
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
	const visibleCandidates = useMemo(() => {
		let items = taskCallCandidates;
		if (selectedTaskCallType !== "all") {
			items = items.filter((item) => item.taskType === selectedTaskCallType);
		}
		const q = searchQuery.trim().toLowerCase();
		if (q) {
			items = items.filter(({ candidate }) => {
				const nameMatch = candidate.fullName.toLowerCase().includes(q);
				const phoneMatch = candidate.phone ? candidate.phone.includes(q) : false;
				const doctorMatch = candidate.attendingDoctorName
					? candidate.attendingDoctorName.toLowerCase().includes(q)
					: false;
				return nameMatch || phoneMatch || doctorMatch;
			});
		}
		return items;
	}, [taskCallCandidates, selectedTaskCallType, searchQuery]);

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

			{visibleCandidates.length === 0 ? (
				<div className="recall-empty-state" data-testid="task-calls-empty-state">
					<PhoneCall size={48} className="recall-empty-icon" aria-hidden="true" />
					<h3 className="recall-empty-title">Все плановые звонки выполнены</h3>
					<p className="recall-empty-text">
						В выбранной категории сервисных звонков нет ожидающих пациентов. Новые задачи формируются автоматически.
					</p>
				</div>
			) : (
				<div className="recall-task-calls-stream" role="feed" aria-label="Очередь сервисных звонков">
					{visibleCandidates.map(({ candidate, taskType }) => (
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
