/**
 * pieceRateTypes.ts
 *
 * Типовые модели и контракты сдельной оплаты труда врачей-стоматологов.
 * Полная прозрачность выплат, удержаний ЗТЛ и материалов, маржинальности клиники.
 */

export interface PieceRatePreset {
	readonly id: string;
	readonly title: string;
	readonly description: string;
	readonly therapyRatePct: number;
	readonly orthopedicsRatePct: number;
	readonly surgeryRatePct: number;
	readonly hygieneRatePct: number;
	readonly labDeductionPct: number;
	readonly materialDeductionPct: number;
	readonly baseShiftSalaryRub: number;
	readonly sampleTherapyRub: number;
	readonly sampleOrthopedicsRub: number;
	readonly sampleSurgeryRub: number;
	readonly sampleHygieneRub: number;
	readonly sampleLabRub: number;
	readonly sampleMaterialRub: number;
}

export const PIECE_RATE_PRESETS: readonly PieceRatePreset[] = [
	{
		id: "therapist_standard",
		title: "Терапевт (Стандарт РФ)",
		description: "25% терапия, 30% гигиена. Без удержания материалов.",
		therapyRatePct: 25,
		orthopedicsRatePct: 0,
		surgeryRatePct: 0,
		hygieneRatePct: 30,
		labDeductionPct: 100,
		materialDeductionPct: 0,
		baseShiftSalaryRub: 0,
		sampleTherapyRub: 450000,
		sampleOrthopedicsRub: 0,
		sampleSurgeryRub: 0,
		sampleHygieneRub: 80000,
		sampleLabRub: 0,
		sampleMaterialRub: 35000,
	},
	{
		id: "orthopedist_standard",
		title: "Ортопед (100% удержание ЗТЛ)",
		description: "20% ортопедия с полным вычетом расходов лаборатории из начислений врача.",
		therapyRatePct: 0,
		orthopedicsRatePct: 20,
		surgeryRatePct: 0,
		hygieneRatePct: 0,
		labDeductionPct: 100,
		materialDeductionPct: 0,
		baseShiftSalaryRub: 0,
		sampleTherapyRub: 0,
		sampleOrthopedicsRub: 750000,
		sampleSurgeryRub: 0,
		sampleHygieneRub: 0,
		sampleLabRub: 220000,
		sampleMaterialRub: 45000,
	},
	{
		id: "surgeon_implantologist",
		title: "Хирург-имплантолог",
		description: "25% хирургия и костная пластика. Дорогие мембраны и титан списываются клиникой.",
		therapyRatePct: 0,
		orthopedicsRatePct: 0,
		surgeryRatePct: 25,
		hygieneRatePct: 0,
		labDeductionPct: 0,
		materialDeductionPct: 0,
		baseShiftSalaryRub: 0,
		sampleTherapyRub: 0,
		sampleOrthopedicsRub: 0,
		sampleSurgeryRub: 600000,
		sampleHygieneRub: 0,
		sampleLabRub: 0,
		sampleMaterialRub: 90000,
	},
	{
		id: "solo_universal",
		title: "Универсал (Соло / 1 кресло)",
		description: "25% со всей кассы. 100% вычет ЗТЛ заказ-нарядов. Автоматический расчет.",
		therapyRatePct: 25,
		orthopedicsRatePct: 25,
		surgeryRatePct: 25,
		hygieneRatePct: 30,
		labDeductionPct: 100,
		materialDeductionPct: 0,
		baseShiftSalaryRub: 0,
		sampleTherapyRub: 250000,
		sampleOrthopedicsRub: 350000,
		sampleSurgeryRub: 120000,
		sampleHygieneRub: 50000,
		sampleLabRub: 95000,
		sampleMaterialRub: 40000,
	},
];
