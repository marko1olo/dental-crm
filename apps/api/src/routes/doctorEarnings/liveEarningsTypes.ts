/**
 * liveEarningsTypes.ts — Входные параметры для расчета сдельной оплаты по живой БД.
 * Mandate 8b: строго <= 120 строк на файл.
 */

export interface LiveCalculationInput {
	readonly targetDoctorId: string;
	readonly doctorName: string;
	readonly doctorSpecialty: string;
	readonly fromDate: Date;
	readonly toDate: Date;
	readonly dateParam?: string | undefined;
	readonly categoryRates: Record<string, number>;
	readonly payoutModel?: "percentage" | "chair_rental" | undefined;
	readonly chairRentalRub?: number | undefined;
	readonly advanceRub?: number | undefined;
	readonly taxRegime?: "employee" | "self_employed" | undefined;
	readonly rawAppointments: ReadonlyArray<{
		id: string;
		patientId: string | null;
		status: string;
		startsAt: Date;
		endsAt: Date;
		patientName: string | null;
		cardNumber: string;
	}>;
	readonly appointmentToVisitMap: Map<string, string>;
	readonly dbTreatmentItems: ReadonlyArray<{
		id: string;
		visitId: string | null;
		title: string;
		priceRub: unknown;
		quantity: unknown;
		category: string | null;
		serviceCode?: string | null | undefined;
	}>;
	readonly dbLabOrders: ReadonlyArray<{
		id: string;
		patientId: string | null;
		toothFdi: string | null;
		material: string | null;
		status: string;
		priceRub: unknown;
		labCostRub?: unknown;
		isWarranty?: boolean;
		dueDate: Date | null;
	}>;
	readonly dbPayments: ReadonlyArray<{
		visitId: string | null;
		amountRub: unknown;
		status: string;
	}>;
	/**
	 * Готовый бюджет вычета ЗТЛ на каждый прием (копейки). Счет лаборатории
	 * распределяется между приемами пациента один раз, поэтому ни один наряд
	 * не вычитается дважды. Если карта не передана — считается по-старому на приёме.
	 */
	readonly appointmentLabBudgetKop?: Map<string, number> | undefined;
}

export interface CategoryAccumulatorItem {
	gross: number;
	lab: number;
	earned: number;
	count: number;
}
