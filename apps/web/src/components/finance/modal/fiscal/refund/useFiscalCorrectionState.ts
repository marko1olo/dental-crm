import { useState } from "react";

export function useFiscalCorrectionState() {
	const [correctionType, setCorrectionType] = useState<"self_initiated" | "by_instruction">("self_initiated");
	const [correctionDocDate, setCorrectionDocDate] = useState<string>(new Date().toISOString().slice(0, 10));
	const [correctionDocNumber, setCorrectionDocNumber] = useState<string>("АКТ-1");
	const [correctionReason, setCorrectionReason] = useState<string>("Коррекция неприменения ККТ при техническом сбое");

	return {
		correctionType,
		setCorrectionType,
		correctionDocDate,
		setCorrectionDocDate,
		correctionDocNumber,
		setCorrectionDocNumber,
		correctionReason,
		setCorrectionReason,
	};
}
