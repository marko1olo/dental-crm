/**
 * doctorShiftEarnings.ts — Chairside HUD Doctor Shift Earnings & Real-Time Piece-Rate Accrual Engine.
 * 
 * ДОМЕН ЗАРАБОТКА ВРАЧА ЗА СМЕНУ (Chairside HUD / salary-view):
 * Врач в конце смены (или прямо во время приёма у кресла) хочет нажать ровно 1 кнопку
 * и моментально увидеть, сколько он заработал за сегодня:
 * 
 * ФОРМУЛА ПРОЗРАЧНОГО РАСЧЕТА (Net Revenue Formula):
 * 1. Выполнено услуг (Gross Revenue) — сумма всех завершенных/оказанных процедур за смену.
 * 2. Вычет ЗТЛ (Lab Cost) — прямые расходы на сторонние зуботехнические лаборатории (коронки, абатменты, протезы).
 * 3. Вычет прямых материалов (Materials Cost) — имплантаты, мембраны, титановые сетки.
 *    (Общеклинические расходники: перчатки, салфетки, валики — НЕ удерживаются из зарплаты врача!).
 * 4. Чистая база (Net Base) = Gross − ЗТЛ − Материалы.
 * 5. Чистый процент врача (% комиссии, напр. 25% на терапию/ортопедию).
 * 6. Начислено к выплате за смену = Чистая база × % комиссии.
 * 
 * Все расчеты ведутся строго в целочисленных копейках (Kopecks) для 100% защиты от float-дрейфа.
 */

import {
	type Kopecks,
	formatKopecksRu,
	parseKopecks,
	rublesToKopecks,
	sumKopecks,
} from "../money.js";
import { kopecksToRub as kopecksToRubles } from "../fiscal/kopecksArithmetic.js";
import type { DoctorShiftAppointment, DoctorShiftServiceItem } from "../doctor-portal/doctorShiftEngine.js";

export interface ChairsidePatientEarningsItem {
	readonly appointmentId: string;
	readonly patientId: string;
	readonly patientFullName: string;
	readonly cardNumber: string;
	readonly status: string;
	readonly servicesCount: number;
	readonly grossRevenueKop: Kopecks;
	readonly labCostKop: Kopecks;
	readonly materialsCostKop: Kopecks;
	readonly netBaseKop: Kopecks;
	readonly commissionPercent: number;
	readonly doctorEarnedKop: Kopecks;
	readonly serviceTitles: readonly string[];
}

export interface ChairsideShiftEarningsSummary {
	readonly doctorId: string;
	readonly doctorName: string;
	readonly shiftDateIso: string;
	readonly shiftDateRu: string;
	/** Количество принятых пациентов сегодня (завершенные + в кресле) */
	readonly patientsCompletedCount: number;
	readonly patientsInChairCount: number;
	readonly patientsTotalCount: number;
	/** Сумма выполненных работ (Gross) в копейках */
	readonly grossRevenueKop: Kopecks;
	readonly grossRevenueRub: number;
	/** Вычет расходов на зуботехническую лабораторию (ЗТЛ) */
	readonly labCostKop: Kopecks;
	readonly labCostRub: number;
	/** Вычет прямых дорогостоящих материалов */
	readonly materialsCostKop: Kopecks;
	readonly materialsCostRub: number;
	/** Чистая база начисления = Gross - Lab - Materials */
	readonly netBaseRevenueKop: Kopecks;
	readonly netBaseRevenueRub: number;
	/** Чистый процент врача (базовый, напр. 25%) */
	readonly doctorCommissionPercent: number;
	/** Итого начислено к выплате за смену в копейках */
	readonly totalEarnedPayoutKop: Kopecks;
	readonly totalEarnedPayoutRub: number;
	/** Детализация по каждому пациенту */
	readonly patientItems: readonly ChairsidePatientEarningsItem[];
	/** Форматированные строки для быстрого чтения у кресла */
	readonly formattedGross: string;
	readonly formattedLab: string;
	readonly formattedMaterials: string;
	readonly formattedNetBase: string;
	readonly formattedEarnedPayout: string;
	/** Честная строка формулы */
	readonly formulaExplanationRu: string;
}

export interface CalculateChairsideShiftEarningsInput {
	readonly appointments: readonly DoctorShiftAppointment[];
	readonly doctorId?: string | undefined;
	readonly doctorName?: string | undefined;
	readonly shiftDateIso?: string | undefined;
	readonly defaultCommissionPercent?: number | undefined;
}

/**
 * Рассчитывает прозрачный заработок врача за смену для Chairside HUD.
 */
export function calculateChairsideShiftEarnings(
	input: CalculateChairsideShiftEarningsInput,
): ChairsideShiftEarningsSummary {
	const shiftDate = input.shiftDateIso
		? input.shiftDateIso.split("T")[0]!
		: new Date().toISOString().split("T")[0]!;
	const defaultCommission = input.defaultCommissionPercent ?? 25;

	const targetDocId = input.doctorId?.trim();

	// Фильтруем приемы текущего врача за целевую смену
	const relevantAppointments = input.appointments.filter((apt) => {
		if (targetDocId && apt.doctorId && apt.doctorId !== targetDocId) {
			return false;
		}
		const aptDate = (apt.startsAtIso || "").split("T")[0];
		if (aptDate && aptDate !== shiftDate) {
			return false;
		}
		return true;
	});

	let patientsCompletedCount = 0;
	let patientsInChairCount = 0;
	let grossRevenueKop = 0 as Kopecks;
	let labCostKop = 0 as Kopecks;
	let materialsCostKop = 0 as Kopecks;
	let totalEarnedPayoutKop = 0 as Kopecks;

	const patientItems: ChairsidePatientEarningsItem[] = [];

	for (const apt of relevantAppointments) {
		const isCompleted = apt.status === "completed";
		const isInChair = apt.status === "in_chair";

		if (isCompleted) patientsCompletedCount++;
		if (isInChair) patientsInChairCount++;

		// Учитываем выполненные процедуры завершенных визитов или текущих в кресле
		if (isCompleted || isInChair) {
			let aptGrossKop = 0 as Kopecks;
			let aptLabKop = 0 as Kopecks;
			let aptMatKop = 0 as Kopecks;
			let aptEarnedKop = 0 as Kopecks;
			const serviceTitles: string[] = [];

			for (const srv of apt.services || []) {
				const srvRev = (srv.finalRevenueKop || srv.totalCostKop || 0) as Kopecks;
				const srvLab = (srv.directLabZtlCostKop || 0) as Kopecks;
				const srvMat = (srv.directMaterialCostKop || 0) as Kopecks;
				const commission = srv.commissionPercent ?? defaultCommission;

				const srvDealBase = Math.max(0, srvRev - srvLab - srvMat) as Kopecks;
				const srvEarned = Math.round((srvDealBase * commission) / 100) as Kopecks;

				aptGrossKop = (aptGrossKop + srvRev) as Kopecks;
				aptLabKop = (aptLabKop + srvLab) as Kopecks;
				aptMatKop = (aptMatKop + srvMat) as Kopecks;
				aptEarnedKop = (aptEarnedKop + srvEarned) as Kopecks;

				serviceTitles.push(srv.nameRu);
			}

			const aptNetBase = Math.max(0, aptGrossKop - aptLabKop - aptMatKop) as Kopecks;

			grossRevenueKop = (grossRevenueKop + aptGrossKop) as Kopecks;
			labCostKop = (labCostKop + aptLabKop) as Kopecks;
			materialsCostKop = (materialsCostKop + aptMatKop) as Kopecks;
			totalEarnedPayoutKop = (totalEarnedPayoutKop + aptEarnedKop) as Kopecks;

			patientItems.push({
				appointmentId: apt.id,
				patientId: apt.patientId,
				patientFullName: apt.patientFullName,
				cardNumber: apt.cardNumber,
				status: apt.status,
				servicesCount: apt.services?.length || 0,
				grossRevenueKop: aptGrossKop,
				labCostKop: aptLabKop,
				materialsCostKop: aptMatKop,
				netBaseKop: aptNetBase,
				commissionPercent: defaultCommission,
				doctorEarnedKop: aptEarnedKop,
				serviceTitles,
			});
		}
	}

	const netBaseRevenueKop = Math.max(0, grossRevenueKop - labCostKop - materialsCostKop) as Kopecks;

	const d = new Date(shiftDate + "T00:00:00");
	const shiftDateRu = !Number.isNaN(d.getTime())
		? d.toLocaleDateString("ru-RU", { day: "numeric", month: "long", year: "numeric" })
		: shiftDate;

	const formattedGross = formatKopecksRu(grossRevenueKop);
	const formattedLab = formatKopecksRu(labCostKop);
	const formattedMaterials = formatKopecksRu(materialsCostKop);
	const formattedNetBase = formatKopecksRu(netBaseRevenueKop);
	const formattedEarnedPayout = formatKopecksRu(totalEarnedPayoutKop);

	const formulaExplanationRu = `${formattedGross} (Выручка) − ${formattedLab} (ЗТЛ) − ${formattedMaterials} (Материалы) = ${formattedNetBase} (База) × ${defaultCommission}% = ${formattedEarnedPayout}`;

	return {
		doctorId: targetDocId || "doc-current",
		doctorName: input.doctorName || relevantAppointments[0]?.doctorFullName || "Врач клиники",
		shiftDateIso: shiftDate,
		shiftDateRu,
		patientsCompletedCount,
		patientsInChairCount,
		patientsTotalCount: relevantAppointments.length,
		grossRevenueKop,
		grossRevenueRub: kopecksToRubles(grossRevenueKop),
		labCostKop,
		labCostRub: kopecksToRubles(labCostKop),
		materialsCostKop,
		materialsCostRub: kopecksToRubles(materialsCostKop),
		netBaseRevenueKop,
		netBaseRevenueRub: kopecksToRubles(netBaseRevenueKop),
		doctorCommissionPercent: defaultCommission,
		totalEarnedPayoutKop,
		totalEarnedPayoutRub: kopecksToRubles(totalEarnedPayoutKop),
		patientItems,
		formattedGross,
		formattedLab,
		formattedMaterials,
		formattedNetBase,
		formattedEarnedPayout,
		formulaExplanationRu,
	};
}

/**
 * Создает реалистичный демонстрационный набор смены врача (без клоунских данных) для автономного кресла.
 */
export function createSampleChairsideShiftAppointments(
	doctorId = "doc-1",
	doctorFullName = "Д-р Смирнов Алексей Петрович",
	shiftDateIso = new Date().toISOString().split("T")[0]!,
): DoctorShiftAppointment[] {
	return [
		{
			id: "apt-shift-01",
			patientId: "pat-101",
			patientFullName: "Волкова Анна Сергеевна",
			cardNumber: "043/у-2026/701",
			doctorId,
			doctorFullName,
			doctorSpecialty: "Врач-стоматолог терапевт-ортопед",
			startsAtIso: `${shiftDateIso}T09:00:00.000Z`,
			endsAtIso: `${shiftDateIso}T10:00:00.000Z`,
			status: "completed",
			chairName: "Кресло 1",
			diagnosisIcd10: "K02.1",
			diagnosisTooth: "15",
			treatmentDescription: "Лечение кариеса 1.5, световая пломба Estelite Asteria.",
			emrCard043uStatus: "signed",
			services: [
				{
					id: "srv-01-1",
					code804n: "A16.07.002",
					nameRu: "Пломбирование зуба 1.5 композитом светового отверждения",
					category: "therapy",
					quantity: 1,
					unitPriceKop: 600000,
					totalCostKop: 600000,
					discountKop: 0,
					finalRevenueKop: 600000,
					directLabZtlCostKop: 0,
					directMaterialCostKop: 60000,
					commissionPercent: 25,
					earnedDoctorPayoutKop: 135000,
				},
			],
		},
		{
			id: "apt-shift-02",
			patientId: "pat-102",
			patientFullName: "Соколов Михаил Юрьевич",
			cardNumber: "043/у-2026/702",
			doctorId,
			doctorFullName,
			doctorSpecialty: "Врач-стоматолог терапевт-ортопед",
			startsAtIso: `${shiftDateIso}T10:30:00.000Z`,
			endsAtIso: `${shiftDateIso}T12:00:00.000Z`,
			status: "completed",
			chairName: "Кресло 1",
			diagnosisIcd10: "K04.0",
			diagnosisTooth: "26",
			treatmentDescription: "Эндодонтическое лечение пульпита 2.6 (3 канала), механическая обработка ProTaper.",
			emrCard043uStatus: "signed",
			services: [
				{
					id: "srv-02-1",
					code804n: "A16.07.030",
					nameRu: "Инструментальная и медикаментозная обработка каналов 2.6 (3 канала)",
					category: "therapy",
					quantity: 1,
					unitPriceKop: 1000000,
					totalCostKop: 1000000,
					discountKop: 0,
					finalRevenueKop: 1000000,
					directLabZtlCostKop: 0,
					directMaterialCostKop: 100000,
					commissionPercent: 25,
					earnedDoctorPayoutKop: 225000,
				},
			],
		},
		{
			id: "apt-shift-03",
			patientId: "pat-103",
			patientFullName: "Кузнецова Ирина Павловна",
			cardNumber: "043/у-2026/703",
			doctorId,
			doctorFullName,
			doctorSpecialty: "Врач-стоматолог терапевт-ортопед",
			startsAtIso: `${shiftDateIso}T13:00:00.000Z`,
			endsAtIso: `${shiftDateIso}T14:30:00.000Z`,
			status: "completed",
			chairName: "Кресло 1",
			diagnosisIcd10: "K08.1",
			diagnosisTooth: "11",
			treatmentDescription: "Фиксация цельноциркониевой коронки Prettau 1.1 на индивидуальном абатменте.",
			emrCard043uStatus: "pending_signature",
			services: [
				{
					id: "srv-03-1",
					code804n: "A16.07.004.002",
					nameRu: "Коронка из диоксида циркония Prettau (1.1)",
					category: "orthopedics",
					quantity: 1,
					unitPriceKop: 3800000,
					totalCostKop: 3800000,
					discountKop: 0,
					finalRevenueKop: 3800000,
					directLabZtlCostKop: 1200000, // 12 000 ₽ ЗТЛ
					directMaterialCostKop: 200000, // 2 000 ₽ материал
					commissionPercent: 25,
					earnedDoctorPayoutKop: 600000, // (38k - 12k - 2k) * 25% = 24k * 25% = 6 000 ₽ (600 000 kop)
				},
			],
		},
		{
			id: "apt-shift-04",
			patientId: "pat-104",
			patientFullName: "Новиков Денис Олегович",
			cardNumber: "043/у-2026/704",
			doctorId,
			doctorFullName,
			doctorSpecialty: "Врач-стоматолог терапевт-ортопед",
			startsAtIso: `${shiftDateIso}T15:00:00.000Z`,
			endsAtIso: `${shiftDateIso}T16:00:00.000Z`,
			status: "in_chair",
			chairName: "Кресло 1",
			diagnosisIcd10: "K05.1",
			diagnosisTooth: "11-48",
			treatmentDescription: "Профессиональная гигиена полости рта (Air-Flow + УЗ-скалер + полировка пастой).",
			emrCard043uStatus: "draft",
			services: [
				{
					id: "srv-04-1",
					code804n: "A16.07.051",
					nameRu: "Профессиональная гигиена полости рта (обе челюсти)",
					category: "hygiene",
					quantity: 1,
					unitPriceKop: 750000,
					totalCostKop: 750000,
					discountKop: 0,
					finalRevenueKop: 750000,
					directLabZtlCostKop: 0,
					directMaterialCostKop: 50000,
					commissionPercent: 30, // 30% на гигиену
					earnedDoctorPayoutKop: 210000, // (7.5k - 0.5k) * 30% = 2 100 ₽
				},
			],
		},
	];
}
