import type { Kopecks } from "../../utils/money.js";
import type {
	DmsGuaranteeLetter, DmsGuaranteeLetterStatus, DmsLetterTransaction,
} from "./guaranteeTypes.js";

export function applyGuaranteeLetterDeduction(
	letter: DmsGuaranteeLetter,
	amountToDeductKopecks: Kopecks,
	meta: {
		transactionRef: string;
		serviceDate: string;
		descriptionRu: string;
		doctorName?: string;
		transactionId?: string;
	},
): {
	updatedLetter: DmsGuaranteeLetter;
	actualDeductedKopecks: Kopecks;
	overflowToPatientKopecks: Kopecks;
	transaction: DmsLetterTransaction;
} {
	if (!Number.isInteger(amountToDeductKopecks) || amountToDeductKopecks < 0) {
		throw new Error(`Сумма списания должна быть неотрицательным целым числом копеек, получено ${amountToDeductKopecks}`);
	}
	const actualDeducted = Math.min(letter.remainingLimitKopecks, amountToDeductKopecks);
	const overflow = amountToDeductKopecks - actualDeducted;
	const newUsed = letter.usedKopecks + actualDeducted;
	const newRemaining = Math.max(0, letter.limitKopecks - newUsed);
	const newStatus: DmsGuaranteeLetterStatus = newRemaining === 0 ? "exhausted" : letter.status;
	const txIndex = (letter.transactions?.length ?? 0) + 1;
	const sanitizedRef = meta.transactionRef.trim().replace(/[^a-zA-Z0-9_-]/g, "_");
	const txId = meta.transactionId ?? `tx_${letter.id}_${txIndex}_${sanitizedRef}`;

	const tx: DmsLetterTransaction = {
		id: txId,
		letterId: letter.id,
		dateIso: meta.serviceDate,
		transactionRef: meta.transactionRef,
		amountKopecks: actualDeducted,
		balanceAfterKopecks: newRemaining,
		descriptionRu: meta.descriptionRu,
		doctorName: meta.doctorName,
	};
	const updatedLetter: DmsGuaranteeLetter = {
		...letter,
		usedKopecks: newUsed,
		remainingLimitKopecks: newRemaining,
		status: newStatus,
		transactions: [...(letter.transactions ?? []), tx],
	};
	return { updatedLetter, actualDeductedKopecks: actualDeducted, overflowToPatientKopecks: overflow, transaction: tx };
}
