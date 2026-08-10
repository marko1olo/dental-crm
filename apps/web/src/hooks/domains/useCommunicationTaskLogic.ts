import { useAppStore } from "../../store/appStore";
import type { CommunicationTaskOutcome } from "@dental/shared";

export interface CommunicationTaskLogicProps {
	auth: any;
	setError: any;
	loadDashboard: () => Promise<void>;
	showToast: any;
	actionFailureToast: any;
	responseErrorMessage: any;
	operatorWorkflowFailureMessage: any;
}

export function useCommunicationTaskLogic({
	auth,
	setError,
	loadDashboard,
	showToast,
	actionFailureToast,
	responseErrorMessage,
	operatorWorkflowFailureMessage,
}: CommunicationTaskLogicProps) {
	const {
		communicationNote,
		communicationSavingTaskId,
		setCommunicationSavingTaskId,
	} = useAppStore();

	async function completeCommunicationTask(
		taskId: string,
		outcome: CommunicationTaskOutcome,
	) {
		if (communicationSavingTaskId) {
			setError("Дождитесь завершения текущего закрытия задачи связи.");
			return;
		}
		if (!outcome) {
			setError(
				"Выберите исход задачи связи: нет ответа, перезвонить, перенос, обещал оплату или выдача документов.",
			);
			return;
		}
		setCommunicationSavingTaskId(taskId);
		try {
			const response = await fetch("/api/communications/tasks/complete", {
				method: "POST",
				headers: auth.denteClinicalMutationHeaders({
					"Content-Type": "application/json",
				}),
				body: JSON.stringify({
					taskId,
					outcome,
					note: communicationNote.trim() || "Задача связи закрыта.",
				}),
			});
			if (!response.ok) {
				setError(
					await responseErrorMessage(response, "Задача связи не закрыта"),
				);
				return;
			}
			await loadDashboard();
			setError(null);
		} catch (communicationError) {
			showToast(
				actionFailureToast(
					"Задача связи не закрыта",
					(communicationError as { status?: number })?.status ?? null,
				),
				"error",
			);
			setError(
				operatorWorkflowFailureMessage(
					"Задача связи не закрыта",
					communicationError,
				),
			);
		} finally {
			setCommunicationSavingTaskId(null);
		}
	}

	return {
		completeCommunicationTask,
	};
}
