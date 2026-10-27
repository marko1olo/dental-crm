import type { FnsClinicInfo, FnsTaxPayload } from "../../fns/fnsKnd1151156Builder.js";
import { generateFnsTaxCertificatesForFamilyLogic } from "../familyFnsTaxService.js";
import type {
	FamilyDebitParams,
	FamilyDebitResult,
	FamilyRefundParams,
	FamilyRefundResult,
	FamilyTopupParams,
	FamilyTopupResult,
	FnsTaxCertificateSummary,
} from "../familyWalletTypes.js";
import { processFamilyDebit } from "./familyDebitOperation.js";
import { processFamilyRefund } from "./familyRefundOperation.js";
import { processFamilyTopup } from "./familyTopupOperation.js";

export class FamilyWalletService {
	public async topup(params: FamilyTopupParams): Promise<FamilyTopupResult> {
		return processFamilyTopup(params);
	}

	public async debit(params: FamilyDebitParams): Promise<FamilyDebitResult> {
		return processFamilyDebit(params);
	}

	public async refund(params: FamilyRefundParams): Promise<FamilyRefundResult> {
		return processFamilyRefund(params);
	}

	public async generateFnsTaxCertificatesForFamily(params: {
		readonly organizationId: string;
		readonly familyGroupId: string;
		readonly taxYear: string;
		readonly clinic: FnsClinicInfo;
		readonly signatory: FnsTaxPayload["signatory"];
		readonly customPayerPatientId?: string | undefined;
	}): Promise<readonly FnsTaxCertificateSummary[]> {
		return generateFnsTaxCertificatesForFamilyLogic(params);
	}
}

export const familyWalletService = new FamilyWalletService();
