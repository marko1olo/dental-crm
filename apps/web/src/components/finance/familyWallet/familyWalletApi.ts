import { denteAdminSecretRequestHeaders } from "../../../AppHelpers";

export async function postFamilyPayApi(
	targetPatientId: string,
	familyId: string,
	amountRub: number,
	clientMutationId: string,
) {
	return fetch("/api/finance/family/pay", {
		method: "POST",
		headers: denteAdminSecretRequestHeaders({ "Content-Type": "application/json" }),
		body: JSON.stringify({ patientId: targetPatientId, familyGroupId: familyId, amountRub, clientMutationId }),
	});
}

export async function postFamilyRefundApi(
	effectiveTargetPatientId: string,
	familyId: string,
	refundAmount: number,
	comment: string,
	clientMutationId: string,
) {
	return fetch("/api/finance/family/topup", {
		method: "POST",
		headers: denteAdminSecretRequestHeaders({ "Content-Type": "application/json" }),
		body: JSON.stringify({
			patientId: effectiveTargetPatientId,
			familyGroupId: familyId,
			amountRub: refundAmount,
			method: "other",
			comment,
			clientMutationId,
		}),
	});
}
