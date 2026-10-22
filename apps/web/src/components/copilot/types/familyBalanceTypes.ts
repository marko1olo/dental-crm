export interface FamilyMemberBalance {
	patient_id: string;
	patient_name: string;
	relationship: string;
	balance_rub: number;
	unpaid_invoices_count?: number | undefined;
}

export interface FamilyBalanceResult {
	family_id?: string | undefined;
	primary_patient_name?: string | undefined;
	total_family_balance_rub: number;
	total_unpaid_invoices_rub?: number | undefined;
	members: FamilyMemberBalance[];
}
