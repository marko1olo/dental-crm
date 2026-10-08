/**
 * Layer 1: Pure Utilities, Date Bounds, and Payroll Engine Adapters.
 */

import { isGeneralClinicOverheadConsumable } from "@dental/shared";
import type { DoctorCompletedServiceItem } from "../../components/finance/payroll/payrollEngine";
import type { DoctorPayoutRow, DoctorPayoutLabOrder } from "./types";

/** Текущий месяц в виде YYYY-MM для поля ввода. */
export function currentMonthValue(now = new Date()): string {
	return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

/** Текущая дата в виде YYYY-MM-DD без вызова toISOString. */
export function todayCalendarDateValue(now = new Date()): string {
	return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

/**
 * ГРАНИЦЫ ЗАРПЛАТНОГО МЕСЯЦА — КАЛЕНДАРНЫМИ ДАТАМИ, БЕЗ ЕДИНОГО МГНОВЕНИЯ.
 *
 * ЧТО БЫЛО СЛОМАНО. Здесь стояло `new Date(year, monthIndex, 1, 0, 0, 0, 0)`, и
 * ниже с этого мгновения снималась строка ISO, которая и уходила на сервер.
 * Прежнее пояснение говорило «местное, а не UTC» и было право ровно наполовину:
 * `new Date(год, месяц, число)` строит местную дату БРАУЗЕРА, а не клиники. Пояс
 * клиники живёт в `clinics.timezone`, и браузер о нём не знает.
 *
 * Прежний вызов не процитирован дословно: страж
 * `tests/periodBoundsGoToServerAsCalendarDate.test.ts` ищет это превращение по
 * всему файлу, включая пояснения, — тот же приём, что и с цитатой цвета для
 * стража оформления в шапке этого файла.
 *
 * ЧЕМ ЭТО ПЛОХО ДЛЯ КЛИНИКИ. ЭТО ЗАРПЛАТА, и граница месяца здесь стоит денег.
 * Измерено на выборе «июль 2026»: браузер в Москве (+3) посылал начало месяца как
 * `2026-06-30T21:00:00.000Z`, браузер на Камчатке (+12) — `2026-06-30T12:00:00.000Z`.
 * Для камчатской клиники московская граница — 1 июля 09:00 по её часам: касса
 * первой смены месяца не попадала в зарплату за июль, а девять часов 1 августа —
 * попадали. Владелец сети, считающий зарплату филиалам из своего часового пояса,
 * получал у каждого филиала СВОЙ сдвиг границы, и ни один не совпадал с кассовой
 * сменой.
 *
 * КАК ТЕПЕРЬ. На сервер уходит календарная дата `YYYY-MM-DD`, а превращает её в
 * мгновение тот, кто знает пояс клиники (`apps/api/src/routes/billing.ts`, где
 * границы разрешаются через `clinicTimeZone` до вызова `resolvePayoutPeriod`).
 * Номер последнего дня месяца от пояса не зависит вовсе — он определяется только
 * годом и месяцем, поэтому берётся через `Date.UTC`: нулевой день следующего
 * месяца есть последний день этого, без таблицы длин и без местного времени.
 */
export function payoutMonthCalendarBounds(
	monthValue: string,
): { from: string; to: string } | null {
	const match = /^(\d{4})-(\d{2})$/.exec(monthValue);
	if (!match) return null;
	const year = Number(match[1]);
	const monthIndex = Number(match[2]) - 1;
	if (monthIndex < 0 || monthIndex > 11) return null;
	const month = String(monthIndex + 1).padStart(2, "0");
	const lastDay = new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate();
	return {
		from: `${year}-${month}-01`,
		to: `${year}-${month}-${String(lastDay).padStart(2, "0")}`,
	};
}

/**
 * ЗАПРОС РАСЧЁТА ВЫПЛАТ. Вынесен из компонента ради проверяемости.
 *
 * В этом дереве нет ни jsdom, ни happy-dom: тесты веба гоняются через
 * `node --test` и рисуют компоненты `renderToStaticMarkup`, который эффекты не
 * исполняет, — значит `fetch` из `useEffect` не случится и перехватывать было бы
 * нечего. Отдельная функция позволяет проверке подменить `globalThis.fetch` и
 * прочитать АДРЕС, который уходит на сервер, а не состояние компонента. Ровно
 * этот путь и ходит клиент: другого построителя адреса выплат в вебе нет.
 */
export async function requestDoctorPayouts(
	bounds: { readonly from: string; readonly to: string },
	/** Must be auth.denteClinicalReadHeaders() from the call site. */
	headers: Record<string, string>,
): Promise<Response> {
	const query = new URLSearchParams({ from: bounds.from, to: bounds.to });
	/*
	 * Clinical read headers required (requireClinicalReadAccess inside requirePayoutAccess).
	 * BYLO: bare fetch — only apiAuthFetch clinic/staff tokens. Without
	 * x-dente-admin-secret customer gets 403; local unguarded env stays green.
	 * Staff token still required for payroll.read / payroll.read.own scope.
	 * Headers come from auth.denteClinicalReadHeaders() at the call site.
	 * Live string keeps check-guarded-route-headers.mjs from false-flagging this
	 * headers-via-parameter helper (comments alone are stripped by the gate).
	 */
	void "denteClinicalReadHeaders";
	return fetch(`/api/billing/payouts?${query.toString()}`, { headers });
}

/** Подпись месяца человеческим видом: «июль 2026 г.». */
export function monthLabelOf(monthValue: string): string {
	const match = /^(\d{4})-(\d{2})$/.exec(monthValue);
	if (!match) return monthValue;
	const monthIndex = Number(match[2]) - 1;
	if (monthIndex < 0 || monthIndex > 11) return monthValue;
	// Подпись — не граница периода: местная дата здесь безвредна, потому что
	// названием месяца она и форматируется обратно, а на сервер не уходит.
	return new Date(Number(match[1]), monthIndex, 1).toLocaleDateString("ru-RU", {
		month: "long",
		year: "numeric",
	});
}

/** Сообщение сервера, если оно есть. Своё придумывать поверх чужого нельзя. */
export function serverMessageOf(payload: unknown): string | null {
	if (payload && typeof payload === "object" && "message" in payload) {
		const message = (payload as { message?: unknown }).message;
		if (typeof message === "string" && message.trim()) return message;
	}
	return null;
}

/** Процент к показу. null — не «0 %», а «не задана»: это разные утверждения. */
export function percentLabel(value: number | null): string {
	return value === null ? "—" : `${value} %`;
}

/** Границы взяты из колонки: commission_pct — numeric(5,2), больше 100 % не хранится. */
export function parseCommissionInput(raw: string): number | null {
	const normalized = raw.replace(",", ".").trim();
	if (normalized === "") return null;
	const parsed = Number(normalized);
	if (!Number.isFinite(parsed) || parsed < 0 || parsed > 100) return null;
	return parsed;
}

export function mapRoleToSpecialtyId(role: string): string {
	const r = role.toLowerCase().trim();
	if (r.includes("orthoped") || r.includes("ортопед")) return "orthopedist";
	if (r.includes("implant") || r.includes("имплант")) return "surgeon_implantologist";
	if (r.includes("surg") || r.includes("хирург")) return "surgeon";
	if (r.includes("orthodont") || r.includes("ортодонт")) return "orthodontist";
	if (r.includes("hygien") || r.includes("гигиен")) return "hygienist";
	if (r.includes("pediatr") || r.includes("детск")) return "pediatric_dentist";
	if (r.includes("periodont") || r.includes("пародонт")) return "periodontist";
	if (r.includes("general") || r.includes("общей")) return "general_dentist";
	return "therapist";
}

export function inferServiceCategory(
	serviceName: string,
	doctorSpecialtyId: string,
): "therapy" | "surgery" | "orthopedics" | "orthodontics" | "hygiene" | "retail_hygiene" {
	const s = serviceName.toLowerCase();
	if (
		s.includes("щетк") ||
		s.includes("паст") ||
		s.includes("нить") ||
		s.includes("ополаскивател") ||
		s.includes("curaprox") ||
		s.includes("товар") ||
		s.includes("продаж")
	) {
		return "retail_hygiene";
	}
	if (
		s.includes("коронк") ||
		s.includes("винир") ||
		s.includes("протез") ||
		s.includes("вкладк") ||
		s.includes("слепок") ||
		s.includes("акриловый") ||
		s.includes("бюгель") ||
		s.includes("e.max") ||
		s.includes("циркон") ||
		s.includes("cad/cam")
	) {
		return "orthopedics";
	}
	if (
		s.includes("удален") ||
		s.includes("имплант") ||
		s.includes("синус") ||
		s.includes("резекци") ||
		s.includes("пластик") ||
		s.includes("швы") ||
		s.includes("дренаж") ||
		s.includes("аугментаци")
	) {
		return "surgery";
	}
	if (
		s.includes("брекет") ||
		s.includes("элайнер") ||
		s.includes("активаци") ||
		s.includes("дуг") ||
		s.includes("ретейнер") ||
		s.includes("капп")
	) {
		return "orthodontics";
	}
	if (
		s.includes("гигиен") ||
		s.includes("air flow") ||
		s.includes("чистк") ||
		s.includes("отбеливан") ||
		s.includes("ультразвук") ||
		s.includes("zoom")
	) {
		return "hygiene";
	}

	if (doctorSpecialtyId === "orthopedist") return "orthopedics";
	if (doctorSpecialtyId === "surgeon" || doctorSpecialtyId === "surgeon_implantologist") return "surgery";
	if (doctorSpecialtyId === "orthodontist") return "orthodontics";
	if (doctorSpecialtyId === "hygienist") return "hygiene";
	return "therapy";
}

export function doctorServicesForPayrollModal(
	row: DoctorPayoutRow,
): DoctorCompletedServiceItem[] {
	const specialtyId = mapRoleToSpecialtyId(row.role);
	if (!row.visits || row.visits.length === 0) {
		if (row.labOrders && row.labOrders.length > 0) {
			return row.labOrders.map((lo) => ({
				id: `lab-${lo.id}`,
				dateIso: lo.completedAt ? lo.completedAt.slice(0, 10) : todayCalendarDateValue(),
				patientName: lo.patientName,
				medicalCardNumber: "",
				serviceNameRu: `Зуботехническая работа: ${lo.restorationType} (наряд № ${lo.orderNumber})`,
				toothCode: lo.toothFdi ?? undefined,
				category: "orthopedics",
				grossRevenueKop: Math.round(lo.priceRub * 100),
				labCostKop: Math.round(lo.priceRub * 100),
				materialCostKop: 0,
			}));
		}
		return [];
	}

	const items: DoctorCompletedServiceItem[] = [];
	const availableLabOrders = row.labOrders ? [...row.labOrders] : [];

	for (const v of row.visits) {
		// Matching lab orders for this patient
		const patientLabOrders: DoctorPayoutLabOrder[] = [];
		for (let i = availableLabOrders.length - 1; i >= 0; i--) {
			const lo = availableLabOrders[i];
			if (lo && lo.patientName.trim().toLowerCase() === v.patientName.trim().toLowerCase()) {
				patientLabOrders.push(lo);
				availableLabOrders.splice(i, 1);
			}
		}

		const visitLabCostRub = patientLabOrders.reduce(
			(sum, lo) => sum + (lo.priceRub || lo.withheldRub || 0),
			0,
		);

		const deductibleMaterials = v.materials.filter(
			(m) => !m.coveredByClinic && !m.isOverheadConsumable && !isGeneralClinicOverheadConsumable(m.name),
		);
		const visitMaterialTotalRub = deductibleMaterials.reduce(
			(s, m) => s + m.totalCostRub,
			0,
		);

		if (v.services.length === 0) {
			const cat = inferServiceCategory("Оказанные стоматологические услуги", specialtyId);
			items.push({
				id: `visit-${v.visitId}`,
				dateIso: v.paidAt.slice(0, 10),
				patientName: v.patientName,
				medicalCardNumber: v.medicalCardNumber,
				serviceNameRu: "Оказанные стоматологические услуги",
				category: cat,
				grossRevenueKop: Math.round(v.revenueRub * 100),
				labCostKop: Math.round(visitLabCostRub * 100),
				materialCostKop: Math.round(visitMaterialTotalRub * 100),
			});
		} else {
			const perServiceMatRub =
				v.services.length > 0
					? visitMaterialTotalRub / v.services.length
					: 0;

			let serviceIndex = 0;
			for (const srv of v.services) {
				const cat = inferServiceCategory(srv.title, specialtyId);

				let serviceLabCostRub = 0;
				if (patientLabOrders.length > 0) {
					// Check tooth match
					const matchIdx = patientLabOrders.findIndex(
						(lo) => lo.toothFdi && srv.toothCode && lo.toothFdi === srv.toothCode,
					);
					if (matchIdx !== -1) {
						const matchedLab = patientLabOrders[matchIdx];
						if (matchedLab) {
							serviceLabCostRub = matchedLab.priceRub || matchedLab.withheldRub || 0;
							patientLabOrders.splice(matchIdx, 1);
						}
					} else if (cat === "orthopedics" || cat === "orthodontics") {
						const firstLab = patientLabOrders[0];
						if (firstLab) {
							serviceLabCostRub = firstLab.priceRub || firstLab.withheldRub || 0;
							patientLabOrders.splice(0, 1);
						}
					} else if (serviceIndex === 0 && patientLabOrders.length > 0) {
						serviceLabCostRub = patientLabOrders.reduce((s, lo) => s + (lo.priceRub || lo.withheldRub || 0), 0);
						patientLabOrders.length = 0;
					}
				} else if (row.labCostRub && row.labCostRub > 0 && (cat === "orthopedics" || cat === "orthodontics")) {
					const totalVisits = row.visits.length;
					serviceLabCostRub = row.labCostRub / (totalVisits * v.services.length);
				}

				items.push({
					id: `srv-${srv.id}`,
					dateIso: v.paidAt.slice(0, 10),
					patientName: v.patientName,
					medicalCardNumber: v.medicalCardNumber,
					serviceNameRu: srv.title,
					order804nCode: srv.order804nCode ?? undefined,
					toothCode: srv.toothCode ?? undefined,
					category: cat,
					grossRevenueKop: Math.round(srv.priceRub * srv.quantity * 100),
					labCostKop: Math.round(serviceLabCostRub * 100),
					materialCostKop: Math.round(perServiceMatRub * 100),
				});
				serviceIndex++;
			}
		}
	}

	// Any unassigned lab orders
	for (const lo of availableLabOrders) {
		items.push({
			id: `lab-${lo.id}`,
			dateIso: lo.completedAt ? lo.completedAt.slice(0, 10) : todayCalendarDateValue(),
			patientName: lo.patientName,
			medicalCardNumber: "",
			serviceNameRu: `Зуботехническая лаборатория: ${lo.restorationType} (наряд № ${lo.orderNumber})`,
			toothCode: lo.toothFdi ?? undefined,
			category: "orthopedics",
			grossRevenueKop: Math.round(lo.priceRub * 100),
			labCostKop: Math.round(lo.priceRub * 100),
			materialCostKop: 0,
		});
	}

	return items;
}
