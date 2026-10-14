import { useMemo } from "react";
import type { DoctorCompletedServiceItem } from "@dental/shared/payroll";

export interface UseShiftFinancialSummaryOptions {
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	readonly todayAppointments: readonly any[];
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	readonly payments?: readonly any[] | undefined;
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	readonly staffById: Map<string, any>;
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	readonly patientsById: Map<string, any>;
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	readonly currentPatient: any;
	readonly shiftActiveDoctorId?: string | undefined;
	readonly todayIso: string;
	readonly doctorCommissionPct?: number | undefined;
}

export interface ShiftFinancialSummary {
	readonly totalRevenueRub: number;
	readonly plannedRevenueRub: number;
	readonly doctorCommissionPct: number;
	readonly estimatedDoctorPayoutRub: number;
	readonly directPaymentsRub: number;
	readonly appointmentBilledRub: number;
	readonly shiftCompletedServices: readonly DoctorCompletedServiceItem[];
	readonly totalLabCostRub: number;
	readonly totalMaterialCostRub: number;
	readonly netRevenueAfterDeductionsRub: number;
	readonly cashBreakdown: {
		readonly cashRub: number;
		readonly cardRub: number;
		readonly sbpRub: number;
		readonly depositRub: number;
	};
}

export function useShiftFinancialSummary({
	todayAppointments,
	payments = [],
	staffById,
	patientsById,
	currentPatient,
	shiftActiveDoctorId,
	todayIso,
	doctorCommissionPct = 30,
}: UseShiftFinancialSummaryOptions): ShiftFinancialSummary {
	const completed = useMemo(() => {
		return todayAppointments.filter((app: any) =>
			["completed", "done"].includes(String(app.status || "").toLowerCase()),
		);
	}, [todayAppointments]);

	const todayPayments = useMemo(() => {
		return (payments ?? []).filter((p: any) => {
			if (p.status !== "paid" && p.status !== "completed") return false;
			const pDate = p.paidAt || p.createdAt;
			return pDate ? String(pDate).startsWith(todayIso) : false;
		});
	}, [payments, todayIso]);

	const directPaymentsRub = useMemo(() => {
		return todayPayments.reduce(
			(sum: number, p: any) => sum + (Number(p.amountRub) || 0),
			0,
		);
	}, [todayPayments]);

	const cashBreakdown = useMemo(() => {
		let cash = 0;
		let card = 0;
		let sbp = 0;
		let deposit = 0;

		for (const p of todayPayments) {
			const amt = Number(p.amountRub) || 0;
			const method = String(p.paymentMethod || p.method || "").toLowerCase();
			if (["cash", "наличные"].includes(method)) {
				cash += amt;
			} else if (["sbp", "сбп", "qr"].includes(method)) {
				sbp += amt;
			} else if (["deposit", "депозит", "advance", "аванс"].includes(method)) {
				deposit += amt;
			} else {
				// По умолчанию (терминал, карта, безнал)
				card += amt;
			}
		}

		return {
			cashRub: cash,
			cardRub: card,
			sbpRub: sbp,
			depositRub: deposit,
		};
	}, [todayPayments]);

	const appointmentBilledRub = useMemo(() => {
		return completed.reduce((sum: number, app: any) => {
			const cost =
				Number(app.priceRub || app.costRub || app.totalRub || app.amountRub) || 0;
			return sum + cost;
		}, 0);
	}, [completed]);

	const plannedRevenueRub = useMemo(() => {
		return todayAppointments.reduce((sum: number, app: any) => {
			const cost =
				Number(app.priceRub || app.costRub || app.totalRub || app.amountRub) || 0;
			return sum + cost;
		}, 0);
	}, [todayAppointments]);

	// Честная выручка: фактически полученные средства либо завершенные оказанные услуги
	const totalRevenueRub = useMemo(() => {
		const actual = directPaymentsRub > 0 ? directPaymentsRub : appointmentBilledRub;
		return Math.max(0, actual);
	}, [directPaymentsRub, appointmentBilledRub]);

	const estimatedDoctorPayoutRub = useMemo(() => {
		return Math.round((totalRevenueRub * doctorCommissionPct) / 100);
	}, [totalRevenueRub, doctorCommissionPct]);

	const shiftCompletedServices = useMemo(() => {
		const items: DoctorCompletedServiceItem[] = [];

		for (const app of todayAppointments) {
			const appAny = app as any;
			const patient =
				patientsById.get(app.patientId ?? "") ??
				(app.patientId === currentPatient?.id ? currentPatient : null);
			const patientName = patient?.fullName || appAny.patientFullName || "Пациент";
			const medicalCardNumber =
				patient?.medicalCardNumber ||
				patient?.cardNumber ||
				appAny.medicalCardNumber ||
				"043/у";
			const docId = appAny.doctorUserId || shiftActiveDoctorId || undefined;

			let category: DoctorCompletedServiceItem["category"] = "therapy";
			const catRaw = String(appAny.category || "").toLowerCase();
			if (["orthopedics", "orthopedic", "cad_cam"].includes(catRaw)) {
				category = "orthopedics";
			} else if (["surgery", "implant", "implantation"].includes(catRaw)) {
				category = "surgery";
			} else if (["orthodontics", "orthodontic", "aligner"].includes(catRaw)) {
				category = "orthodontics";
			} else if (["hygiene", "pro_hygiene"].includes(catRaw)) {
				category = "hygiene";
			} else if (["retail", "retail_hygiene"].includes(catRaw)) {
				category = "retail_hygiene";
			} else if (["pediatric", "pediatric_dentist"].includes(catRaw)) {
				category = "pediatric";
			} else {
				const doc = staffById.get(docId ?? "");
				const spec = String(doc?.specialty || doc?.specialtyId || "").toLowerCase();
				const reason = String(app.reason || "").toLowerCase();
				if (
					spec.includes("orthoped") ||
					reason.includes("коронк") ||
					reason.includes("протез") ||
					reason.includes("винир")
				) {
					category = "orthopedics";
				} else if (
					spec.includes("surg") ||
					spec.includes("implant") ||
					reason.includes("имплант") ||
					reason.includes("удал")
				) {
					category = "surgery";
				} else if (
					spec.includes("orthodont") ||
					reason.includes("брекет") ||
					reason.includes("элайн")
				) {
					category = "orthodontics";
				} else if (
					spec.includes("hygien") ||
					reason.includes("гигиен") ||
					reason.includes("air-flow")
				) {
					category = "hygiene";
				} else if (spec.includes("pediatric") || reason.includes("детск")) {
					category = "pediatric";
				}
			}

			const rawServices = appAny.services || appAny.items || appAny.completedServices;
			if (Array.isArray(rawServices) && rawServices.length > 0) {
				for (let idx = 0; idx < rawServices.length; idx++) {
					const srv = rawServices[idx];
					const srvPrice =
						Number(srv.priceRub || srv.costRub || srv.amountRub) || 0;
					items.push({
						id: String(srv.id || `${app.id}-srv-${idx + 1}`),
						dateIso: todayIso,
						patientName,
						medicalCardNumber,
						serviceNameRu: String(
							srv.name ||
								srv.title ||
								srv.serviceNameRu ||
								app.reason ||
								"Стоматологическая процедура",
						),
						category: (srv.category as any) || category,
						grossRevenueKop: Math.round(srvPrice * 100),
						labCostKop: Math.round((Number(srv.labCostRub) || 0) * 100),
						materialCostKop: Math.round((Number(srv.materialCostRub) || 0) * 100),
						doctorId: docId,
						performerId: srv.performerId || docId,
					});
				}
			} else {
				const appPrice =
					Number(appAny.priceRub || appAny.costRub || appAny.totalRub || appAny.amountRub) || 0;
				const isCompletedOrActive = [
					"completed",
					"done",
					"in_chair",
					"in_treatment",
					"in_progress",
				].includes(String(app.status || "").toLowerCase());
				if (isCompletedOrActive || appPrice > 0) {
					items.push({
						id: String(app.id),
						dateIso: todayIso,
						patientName,
						medicalCardNumber,
						serviceNameRu: String(
							app.reason || appAny.title || "Прием врача-стоматолога",
						),
						category,
						grossRevenueKop: Math.round(appPrice * 100),
						labCostKop: Math.round((Number(appAny.labCostRub) || 0) * 100),
						materialCostKop: Math.round((Number(appAny.materialCostRub) || 0) * 100),
						doctorId: docId,
						performerId: docId,
					});
				}
			}
		}

		return items;
	}, [
		todayAppointments,
		patientsById,
		currentPatient,
		shiftActiveDoctorId,
		todayIso,
		staffById,
	]);

	const totalLabCostRub = useMemo(() => {
		return Math.round(
			shiftCompletedServices.reduce((sum, item) => sum + item.labCostKop, 0) / 100,
		);
	}, [shiftCompletedServices]);

	const totalMaterialCostRub = useMemo(() => {
		return Math.round(
			shiftCompletedServices.reduce((sum, item) => sum + item.materialCostKop, 0) / 100,
		);
	}, [shiftCompletedServices]);

	const netRevenueAfterDeductionsRub = useMemo(() => {
		return Math.max(0, totalRevenueRub - totalLabCostRub - totalMaterialCostRub);
	}, [totalRevenueRub, totalLabCostRub, totalMaterialCostRub]);

	return {
		totalRevenueRub,
		plannedRevenueRub,
		doctorCommissionPct,
		estimatedDoctorPayoutRub,
		directPaymentsRub,
		appointmentBilledRub,
		shiftCompletedServices,
		totalLabCostRub,
		totalMaterialCostRub,
		netRevenueAfterDeductionsRub,
		cashBreakdown,
	};
}
