export function computeDocumentVoidMissingSteps(params: {
	documentVoidArchivePreserved?: boolean;
	documentVoidPatientOrPayerNotified?: boolean;
	documentVoidStatusReviewed?: boolean;
	documentVoidStaffFullName?: string;
	documentVoidStaffRole?: string;
}): string[] {
	return [
		!params.documentVoidArchivePreserved ? "подтвердите сохранение архивной копии" : null,
		!params.documentVoidPatientOrPayerNotified ? "подтвердите уведомление пациента/плательщика" : null,
		!params.documentVoidStatusReviewed ? "подтвердите проверку последствий аннулирования" : null,
		!String(params.documentVoidStaffFullName || "").trim() ? "укажите ответственного сотрудника" : null,
		!String(params.documentVoidStaffRole || "").trim() ? "укажите должность сотрудника" : null,
	].filter(Boolean) as string[];
}
