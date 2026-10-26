export function getDocumentKindLabel(kind: string): string {
	if (kind === "paid_medical_services_contract") return "Договор";
	if (kind === "completed_works_act") return "Акт оказанных услуг";
	if (kind.includes("043") || kind === "outpatient_medical_card_025u") return "Медицинская выписка";
	if (kind === "tax_deduction_certificate") return "ФНС";
	return "Документ";
}
