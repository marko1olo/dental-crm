/**
 * paidContract/contractNumberGenerator.ts
 * Sequential contract numbering generator (Mandate 8b <= 120 lines)
 */

let paidContractSequenceCounter = 0;

export function generatePaidContractNumber(
	optionsOrYear?:
		| {
				patientId?: string | null | undefined;
				patientFullName?: string | null | undefined;
				seqNumber?: number | string | null | undefined;
				year?: number | undefined;
		  }
		| number
		| null
		| undefined,
	seqNumberParam?: number | string | null | undefined,
): string {
	const options =
		typeof optionsOrYear === "number"
			? { year: optionsOrYear, seqNumber: seqNumberParam }
			: optionsOrYear || undefined;
	const currentYear = options?.year ?? new Date().getFullYear();

	let patientPart = "0001";
	if (options?.patientId && options.patientId.trim()) {
		const cleanId = options.patientId.replace(/[^a-zA-Z0-9]/g, "");
		if (cleanId.length >= 4) {
			patientPart = cleanId.slice(-4).toUpperCase();
		} else if (cleanId.length > 0) {
			patientPart = cleanId.padStart(4, "0").toUpperCase();
		}
	} else if (options?.patientFullName && options.patientFullName.trim()) {
		let hash = 0;
		for (let i = 0; i < options.patientFullName.length; i++) {
			hash = ((hash << 5) - hash + options.patientFullName.charCodeAt(i)) | 0;
		}
		const posHash = Math.abs(hash) % 10000;
		patientPart = String(posHash).padStart(4, "0");
	}

	let seqStr: string;
	if (options?.seqNumber !== undefined && options?.seqNumber !== null && String(options.seqNumber).trim() !== "") {
		const numOnly = String(options.seqNumber).replace(/\D/g, "");
		seqStr = (numOnly || "1").padStart(4, "0").slice(-4);
	} else {
		paidContractSequenceCounter = (paidContractSequenceCounter + 1) % 10000;
		if (paidContractSequenceCounter === 0) paidContractSequenceCounter = 1;
		seqStr = String(paidContractSequenceCounter).padStart(4, "0");
	}

	return `ДПМУ-${currentYear}-${patientPart}-${seqStr}`;
}
