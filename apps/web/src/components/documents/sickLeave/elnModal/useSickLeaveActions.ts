import { useState } from "react";
import {
	SickLeaveFormState,
	SickLeavePatientData,
	SickLeaveValidationResult,
	generateSickLeavePatientMemoHtml,
	generateEmrDiarySnippet
} from "../sickLeaveElnEngine";
import { showToast } from "../../../GlobalToast";

interface UseSickLeaveActionsParams {
	formState: SickLeaveFormState;
	patientData: SickLeavePatientData;
	validation: SickLeaveValidationResult;
	onClose: () => void;
	onApplyToDiary?: ((diarySnippet: string, form: SickLeaveFormState) => void) | undefined;
}

export function useSickLeaveActions({
	formState,
	patientData,
	validation,
	onClose,
	onApplyToDiary
}: UseSickLeaveActionsParams) {
	const [isCopiedDiary, setIsCopiedDiary] = useState<boolean>(false);
	const [isSfrSent, setIsSfrSent] = useState<boolean>(false);

	const handleCopyDiarySnippet = () => {
		const isDraft = !validation.isValid;
		const snippet = generateEmrDiarySnippet(formState, patientData, isDraft);
		navigator.clipboard.writeText(snippet);
		setIsCopiedDiary(true);
		setTimeout(() => setIsCopiedDiary(false), 2000);
		if (isDraft) {
			showToast("Черновик записи ЭЛН скопирован в буфер (требуется завершить оформление)", "info");
		} else {
			showToast("Запись ЭЛН скопирована в буфер обмена", "success");
		}
	};

	const handleApplyDiary = () => {
		const isDraft = !validation.isValid;
		const snippet = generateEmrDiarySnippet(formState, patientData, isDraft);
		if (onApplyToDiary) {
			onApplyToDiary(snippet, formState);
		}
		if (isDraft) {
			showToast("В дневник приёма вставлен черновик ЭЛН (требуется завершить оформление)", "info");
		} else {
			showToast("Запись об ЭЛН успешно вставлена в дневник приёма", "success");
		}
		onClose();
	};

	const handlePrintMemo = () => {
		const html = generateSickLeavePatientMemoHtml(formState, patientData);
		const printWin = window.open('', '_blank');
		if (printWin) {
			printWin.document.write(html);
			printWin.document.close();
			printWin.focus();
			setTimeout(() => printWin.print(), 300);
		}
		showToast("Справка о временной нетрудоспособности отправлена на печать", "success");
	};

	const handleSendSfr = () => {
		setIsSfrSent(true);
		showToast("Листок нетрудоспособности зарегистрирован", "success");
		setTimeout(() => setIsSfrSent(false), 3000);
	};

	return {
		isCopiedDiary,
		isSfrSent,
		handleCopyDiarySnippet,
		handleApplyDiary,
		handlePrintMemo,
		handleSendSfr
	};
}
