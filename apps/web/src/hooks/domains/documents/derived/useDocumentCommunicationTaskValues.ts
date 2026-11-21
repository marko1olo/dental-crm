import type { Dashboard, GeneratedDocument, PostVisitCareTopic } from "@dental/shared";
import type { AppView } from "../../../../utils/routeUtils";
import type { DocumentState } from "../../../../store/documentStore";
import {
	telegramCareRequestTaskCareTopics,
	telegramCareRequestWorkflowCareTopics,
	telegramDocumentRequestTaskDocumentKinds,
	telegramDocumentRequestWorkflowDocumentKinds,
} from "../../../../communicationTaskData";
import { patientName } from "../../../../AppHelpers";
import { documentLabels } from "../../../../workspaceUiLabels";

export interface UseDocumentCommunicationTaskProps {
	dashboard: Dashboard | null;
	documentState: DocumentState;
	changePostVisitCareTopic: (topic: PostVisitCareTopic) => void;
	setCurrentView: (view: AppView) => void;
	setError: (err: string | null) => void;
}

export function useDocumentCommunicationTaskValues({
	dashboard,
	documentState,
	changePostVisitCareTopic,
	setCurrentView,
	setError,
}: UseDocumentCommunicationTaskProps) {
	function openCommunicationTaskDocumentWorkflow(
		task: Dashboard["communicationTasks"][number],
		kind: GeneratedDocument["kind"],
	) {
		const careTopic =
			(task.workflowCode
				? telegramCareRequestWorkflowCareTopics[task.workflowCode]
				: null) ??
			telegramCareRequestTaskCareTopics[task.title] ??
			null;
		documentState.setSelectedDocumentKind(kind);
		if (kind === "post_visit_recommendations" && careTopic) {
			changePostVisitCareTopic(careTopic);
		}
		setCurrentView("documents");
		if (typeof window !== "undefined") {
			window.location.hash = "documents";
		}
		if (dashboard && task.patientId !== dashboard?.activeVisit?.patientId) {
			const taskPatientName = patientName(dashboard.patients, task.patientId);
			setError(
				`Открыта форма «${documentLabels[kind]}» для заявки пациента ${taskPatientName}. Перед выпуском документа переключите активный прием на этого пациента, чтобы не создать документ по текущему визиту.`,
			);
		}
	}

	function documentKindsForCommunicationTask(
		task: Dashboard["communicationTasks"][number],
	): readonly GeneratedDocument["kind"][] {
		const documentKinds =
			(task.workflowCode
				? telegramDocumentRequestWorkflowDocumentKinds[task.workflowCode]
				: null) ??
			telegramDocumentRequestTaskDocumentKinds[task.title] ??
			null;
		if (documentKinds) {
			return documentKinds;
		}
		const careTopic =
			(task.workflowCode
				? telegramCareRequestWorkflowCareTopics[task.workflowCode]
				: null) ??
			telegramCareRequestTaskCareTopics[task.title] ??
			null;
		if (careTopic) {
			return ["post_visit_recommendations"];
		}
		return [];
	}

	return {
		openCommunicationTaskDocumentWorkflow,
		documentKindsForCommunicationTask,
	};
}
