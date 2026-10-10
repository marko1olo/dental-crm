import { useMemo } from "react";
import type { Dashboard } from "@dental/shared";
import type { DoctorCompletedServiceItem } from "@dental/shared/payroll";
import type { MobileShiftAppointmentSummary } from "./MobileShiftCockpit";

import {
	calendarDateOfInstant,
	formatClockTime,
	localCalendarDateString,
	NIL_UUID,
} from "./shiftPrintStatements";

export { calendarDateOfInstant, formatClockTime, localCalendarDateString, NIL_UUID };

export interface UseDoctorShiftDataOptions {
	readonly dashboard?: Dashboard | null | undefined;
}

export function useDoctorShiftData({ dashboard }: UseDoctorShiftDataOptions) {
	const patientsById = useMemo(() => {
		// biome-ignore lint/suspicious/noExplicitAny: automated suppression
		const index = new Map<string, any>();
		for (const patient of dashboard?.patients ?? [])
			index.set(patient.id, patient);
		return index;
	}, [dashboard?.patients]);

	const todayIso = dashboard?.todayIso || localCalendarDateString();

	const todayAppointments = useMemo(() => {
		return (
			(dashboard?.appointments ?? [])
				// biome-ignore lint/suspicious/noExplicitAny: automated suppression
				.filter((app: any) => calendarDateOfInstant(app.startsAt) === todayIso)
				.filter(
					// biome-ignore lint/suspicious/noExplicitAny: automated suppression
					(app: any) =>
						!["cancelled", "no_show"].includes(
							String(app.status ?? "").toLowerCase(),
						),
				)
				// biome-ignore lint/suspicious/noExplicitAny: automated suppression
				.sort((a: any, b: any) =>
					String(a.startsAt).localeCompare(String(b.startsAt)),
				)
		);
	}, [dashboard?.appointments, todayIso]);

	const inChairAppointment = useMemo(() => {
		const inChairStatuses = ["in_chair", "in_treatment", "in_progress"];
		const foundByStatus = todayAppointments.find((app: any) => {
			const statusKey = String(
				app.status || app.appointmentStatus || app.state || "",
			).toLowerCase();
			return inChairStatuses.includes(statusKey);
		});
		if (foundByStatus) return foundByStatus;

		const now = Date.now();
		return (
			todayAppointments.find((app: any) => {
				const statusKey = String(app.status || app.appointmentStatus || app.state || "").toLowerCase();
				if (["cancelled", "no_show", "completed", "done"].includes(statusKey)) return false;
				const starts = new Date(app.startsAt).getTime();
				const ends = new Date(app.endsAt ?? app.startsAt).getTime();
				return Number.isFinite(starts) && Number.isFinite(ends) && starts <= now && now <= ends;
			}) ?? null
		);
	}, [todayAppointments]);

	const currentPatient = useMemo(() => {
		const visit = dashboard?.activeVisit;
		if (
			visit?.id &&
			visit.id !== NIL_UUID &&
			visit.patientId &&
			visit.patientId !== NIL_UUID &&
			visit.status === "draft"
		) {
			const p = patientsById.get(visit.patientId ?? "");
			if (p) return p;
		}

		if (
			inChairAppointment?.patientId &&
			inChairAppointment.patientId !== NIL_UUID
		) {
			const p = patientsById.get(inChairAppointment.patientId ?? "");
			if (p) return p;
			const inChairAny = inChairAppointment as any;
			if (inChairAny?.patient) return inChairAny.patient;
			if (inChairAny?.patientFullName) {
				return {
					id: inChairAppointment.patientId,
					fullName: inChairAny.patientFullName,
					phone: inChairAny.patientPhone ?? "",
				};
			}
		}

		return null;
	}, [dashboard?.activeVisit, inChairAppointment, patientsById]);

	const currentPatientCallablePhone = (currentPatient?.phone ?? "")
		.trim()
		.replace(/[^\d+]/g, "");
	const currentPatientHasCallablePhone =
		currentPatientCallablePhone.length >= 5;

	const currentAppointmentReason = useMemo(() => {
		if (!inChairAppointment) return "";
		const appAny = inChairAppointment as any;
		return (
			inChairAppointment.reason ||
			appAny.treatmentDescription ||
			appAny.serviceTitle ||
			appAny.complaint ||
			appAny.complaints ||
			""
		);
	}, [inChairAppointment]);

	const staffById = useMemo(() => {
		// biome-ignore lint/suspicious/noExplicitAny: automated suppression
		const index = new Map<string, any>();
		for (const member of dashboard?.clinicSettings?.staff ?? [])
			index.set(member.id, member);
		return index;
	}, [dashboard?.clinicSettings?.staff]);

	const manyDoctors = useMemo(
		() =>
			(dashboard?.clinicSettings?.staff ?? []).filter(
				// biome-ignore lint/suspicious/noExplicitAny: automated suppression
				(member: any) => member.active && member.role === "doctor",
			).length > 1,
		[dashboard?.clinicSettings?.staff],
	);

	const nextAppointment = useMemo(() => {
		const now = Date.now();
		const isPendingAppointment = (app: any) => {
			if (inChairAppointment && app.id === inChairAppointment.id) return false;
			const statusKey = String(
				app.status || app.appointmentStatus || app.state || "",
			).toLowerCase();
			return ![
				"in_chair",
				"in_treatment",
				"in_progress",
				"completed",
				"done",
				"cancelled",
				"no_show",
			].includes(statusKey);
		};

		const upcoming = todayAppointments.find((app: any) => {
			if (!isPendingAppointment(app)) return false;
			const ends = new Date(app.endsAt ?? app.startsAt).getTime();
			return Number.isFinite(ends) && ends >= now;
		});

		return upcoming ?? todayAppointments.find(isPendingAppointment) ?? null;
	}, [todayAppointments, inChairAppointment]);

	const nextAppointmentPatient = useMemo(() => {
		if (!nextAppointment) return null;
		const fromMap = patientsById.get(nextAppointment.patientId ?? "");
		if (fromMap) return fromMap;
		const appAny = nextAppointment as any;
		if (appAny.patient) return appAny.patient;
		if (appAny.patientFullName || appAny.patientName) {
			return {
				id: nextAppointment.patientId ?? "unknown",
				fullName: appAny.patientFullName || appAny.patientName,
				phone: appAny.patientPhone ?? "",
			};
		}
		return null;
	}, [nextAppointment, patientsById]);

	const rolesWorthShowing = useMemo(
		() =>
			new Set(
				(dashboard?.clinicSettings?.staff ?? [])
					// biome-ignore lint/suspicious/noExplicitAny: automated suppression
					.filter((member: any) => member.active)
					// biome-ignore lint/suspicious/noExplicitAny: automated suppression
					.map((member: any) => member.role),
			).size > 2,
		[dashboard?.clinicSettings?.staff],
	);

	const inChairAppointments = useMemo(() => {
		const now = Date.now();
		return todayAppointments.filter((app: any) => {
			const statusKey = String(
				app.status || app.appointmentStatus || app.state || "",
			).toLowerCase();
			if (["in_chair", "in_treatment", "in_progress"].includes(statusKey)) {
				return true;
			}
			if (["cancelled", "no_show", "completed", "done"].includes(statusKey)) {
				return false;
			}
			const starts = new Date(app.startsAt).getTime();
			const ends = new Date(app.endsAt ?? app.startsAt).getTime();
			return Number.isFinite(starts) && Number.isFinite(ends) && starts <= now && now <= ends;
		});
	}, [todayAppointments]);

	const waitingAppointments = useMemo(() => {
		const inChairIds = new Set(inChairAppointments.map((a: any) => a.id));
		return todayAppointments.filter((app: any) => {
			if (inChairIds.has(app.id)) return false;
			const statusKey = String(
				app.status || app.appointmentStatus || app.state || "",
			).toLowerCase();
			return (
				["arrived", "waiting", "planned", "scheduled", "pending", "confirmed"].includes(statusKey) &&
				!["completed", "done", "cancelled", "no_show"].includes(statusKey)
			);
		});
	}, [todayAppointments, inChairAppointments]);

	const awaitingPaymentAppointments = useMemo(() => {
		return todayAppointments.filter((app: any) => {
			const statusKey = String(
				app.status || app.appointmentStatus || app.state || "",
			).toLowerCase();
			return ["completed", "done"].includes(statusKey) || statusKey === "payment_pending";
		});
	}, [todayAppointments]);

	const shiftStats = useMemo(() => {
		const completed = todayAppointments.filter((app: any) =>
			["completed", "done"].includes(String(app.status || "").toLowerCase()),
		);
		const inProgress = todayAppointments.filter((app: any) =>
			["in_chair", "in_treatment", "in_progress"].includes(
				String(app.status || "").toLowerCase(),
			),
		);

		const todayPayments = (dashboard?.payments ?? []).filter((p: any) => {
			if (p.status !== "paid" && p.status !== "completed") return false;
			const pDate = p.paidAt || p.createdAt;
			return pDate ? String(pDate).startsWith(todayIso) : false;
		});

		const directPaymentsRub = todayPayments.reduce(
			(sum: number, p: any) => sum + (Number(p.amountRub) || 0),
			0,
		);

		const appointmentBilledRub = completed.reduce((sum: number, app: any) => {
			const cost =
				Number(app.priceRub || app.costRub || app.totalRub || app.amountRub) ||
				0;
			return sum + cost;
		}, 0);

		const totalRevenueRub = Math.max(directPaymentsRub, appointmentBilledRub);
		const doctorCommissionPct = 30;
		const estimatedDoctorPayoutRub = Math.round(
			(totalRevenueRub * doctorCommissionPct) / 100,
		);

		return {
			totalAppointments: todayAppointments.length,
			completedCount: completed.length,
			inProgressCount: inProgress.length,
			totalRevenueRub,
			doctorCommissionPct,
			estimatedDoctorPayoutRub,
			hasActiveOvertime: new Date().getHours() >= 21,
		};
	}, [todayAppointments, dashboard?.payments, todayIso]);

	const shiftDoctorsList = useMemo(() => {
		const staff = dashboard?.clinicSettings?.staff ?? [];
		const activeDoctors = staff.filter(
			(member: any) => member.active && member.role === "doctor",
		);
		if (activeDoctors.length === 0) return undefined;
		return activeDoctors.map((doc: any) => ({
			id: String(doc.id),
			name: String(doc.fullName || doc.name || "Лечащий врач"),
			specialtyId: String(doc.specialty || doc.specialtyId || "general_dentist"),
		}));
	}, [dashboard?.clinicSettings?.staff]);

	const shiftActiveDoctorId = useMemo(() => {
		if (inChairAppointment?.doctorUserId) {
			return inChairAppointment.doctorUserId;
		}
		if (shiftDoctorsList && shiftDoctorsList.length > 0) {
			return shiftDoctorsList[0]?.id;
		}
		return undefined;
	}, [inChairAppointment?.doctorUserId, shiftDoctorsList]);

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

	const mobileAppointments = useMemo((): readonly MobileShiftAppointmentSummary[] => {
		return todayAppointments.map((app: any) => {
			const statusKeyRaw = String(
				app.status || app.appointmentStatus || app.state || "",
			).toLowerCase();
			let statusKey: "in_chair" | "waiting" | "payment" | "completed" = "waiting";
			let statusLabel = "Ожидает приёма";

			if (["in_chair", "in_treatment", "in_progress"].includes(statusKeyRaw)) {
				statusKey = "in_chair";
				statusLabel = "В кресле";
			} else if (["completed", "done"].includes(statusKeyRaw)) {
				statusKey = "completed";
				statusLabel = "Завершён";
			} else if (["payment", "billing", "checkout"].includes(statusKeyRaw)) {
				statusKey = "payment";
				statusLabel = "Ожидает оплаты";
			}

			const patient =
				patientsById.get(app.patientId) ??
				(app.patientId === currentPatient?.id ? currentPatient : null);
			const patientName =
				patient?.fullName || app.patientFullName || "Пациент";

			const cost =
				Number(app.priceRub || app.costRub || app.totalRub || app.amountRub) ||
				0;

			return {
				id: String(app.id),
				patientId: String(app.patientId || ""),
				patientName,
				timeStart: formatClockTime(app.startsAt),
				timeEnd: formatClockTime(app.endsAt ?? app.startsAt),
				serviceTitle: String(
					app.reason ||
						app.treatmentDescription ||
						app.serviceTitle ||
						"Приём врача-стоматолога",
				),
				statusKey,
				statusLabel,
				priceRub: cost,
			};
		});
	}, [todayAppointments, patientsById, currentPatient]);

	return {
		todayIso,
		patientsById,
		todayAppointments,
		inChairAppointment,
		currentPatient,
		currentPatientCallablePhone,
		currentPatientHasCallablePhone,
		currentAppointmentReason,
		staffById,
		manyDoctors,
		nextAppointment,
		nextAppointmentPatient,
		rolesWorthShowing,
		inChairAppointments,
		waitingAppointments,
		awaitingPaymentAppointments,
		shiftStats,
		shiftDoctorsList,
		shiftActiveDoctorId,
		shiftCompletedServices,
		mobileAppointments,
	};
}
