import { STOMX_MARKETING_SOURCES } from "../../patients/stomxPatientTagsCatalog.js";
import type { AdvertisingChannelInput } from "./romiTypes.js";

export type AttributionModelType = "first_touch" | "last_touch" | "linear";
export interface TouchpointEvent { channelKey: string; timestamp: number; }

export function attributeRevenueToChannels(
	touchpoints: readonly TouchpointEvent[], totalRevenueKopecks: number, model: AttributionModelType = "last_touch",
): Map<string, number> {
	const result = new Map<string, number>();
	if (!touchpoints.length || totalRevenueKopecks <= 0) return result;
	if (model === "first_touch") {
		result.set(touchpoints.reduce((min, cur) => cur.timestamp < min.timestamp ? cur : min, touchpoints[0]!).channelKey, totalRevenueKopecks);
		return result;
	}
	if (model === "last_touch") {
		result.set(touchpoints.reduce((max, cur) => cur.timestamp > max.timestamp ? cur : max, touchpoints[0]!).channelKey, totalRevenueKopecks);
		return result;
	}
	const count = touchpoints.length;
	const baseKop = Math.floor(totalRevenueKopecks / count);
	let rem = totalRevenueKopecks - (baseKop * count);
	for (const tp of touchpoints) {
		const add = baseKop + (rem > 0 ? 1 : 0);
		if (rem > 0) rem--;
		result.set(tp.channelKey, (result.get(tp.channelKey) ?? 0) + add);
	}
	return result;
}

export function matchDenteMarketingChannel(rawSource?: string | null): string {
	const s = (rawSource || "").trim().toLowerCase();
	if (!s) return "word_of_mouth";
	if (s.includes("2gis") || s.includes("2гис") || s.includes("дубльгис")) return "gis2";
	if (s.includes("яндекс") || s.includes("yandex") || s.includes("карты") || s.includes("гео")) return "yandex_maps";
	if (s.includes("продокторов") || s.includes("prodoctorov")) return "prodoctorov";
	if (s.includes("напоправку") || s.includes("napopravku") || s.includes("поправку")) return "napopravku";
	if (s.includes("сарафан") || s.includes("знаком") || s.includes("рекомендац") || s.includes("родствен") || s.includes("семь") || s.includes("друг") || s.includes("коллег")) return "word_of_mouth";
	if (s.includes("сбер") || s.includes("docdoc") || s.includes("sber")) return "sberhealth";
	if (s.includes("листов") || s.includes("буклет") || s.includes("промо") || s.includes("флаер")) return "flyers";
	if (s.includes("вконтакт") || s.includes("vk") || s.includes("vkontakte") || /\bвк\b/i.test(s) || s === "вк" || s.includes("таргет")) return "vk";
	if (s.includes("наружн") || s.includes("вывеск") || s.includes("щит") || s.includes("мимо") || s.includes("фасад")) return "outdoor";
	if (s.includes("сайт") || s.includes("site") || s.includes("seo") || s.includes("интернет") || s.includes("онлайн") || s.includes("директ") || s.includes("контекст")) return "website";
	if (s.includes("инста") || s.includes("insta")) return "instagram";
	return "word_of_mouth";
}

export const matchStomxMarketingChannel = matchDenteMarketingChannel;

export function aggregateCrmMarketingMetrics(params: {
	patients: ReadonlyArray<{ id: string; source?: string | null; administrativeProfile?: any; notes?: string | null }>;
	appointments: ReadonlyArray<{ id: string; patientId: string; status: string; costRub?: number }>;
	payments: ReadonlyArray<{ id: string; patientId: string; amount?: number; amountRub?: number; amountKopecks?: number; status?: string }>;
	communicationEvents?: ReadonlyArray<{ id: string; patientId?: string; type?: string; channel?: string; source?: string }>;
	customBudgetsKopecks?: Record<string, number>;
}): AdvertisingChannelInput[] {
	const completedApptsByPatient = new Map<string, number>();
	for (const a of params.appointments) {
		const st = (a.status || "").toLowerCase();
		if (["completed", "arrived", "in_treatment", "done", "finished"].includes(st)) {
			completedApptsByPatient.set(a.patientId, (completedApptsByPatient.get(a.patientId) ?? 0) + 1);
		}
	}
	const paymentsByPatient = new Map<string, number>();
	for (const p of params.payments) {
		const st = (p.status || "").toLowerCase();
		if (!["refunded", "failed", "cancelled"].includes(st)) {
			const raw = p.amount ?? p.amountRub ?? (p.amountKopecks ? p.amountKopecks / 100 : 0);
			paymentsByPatient.set(p.patientId, (paymentsByPatient.get(p.patientId) ?? 0) + Math.round(Number(raw || 0) * 100));
		}
	}
	const stats = new Map<string, { leads: number; primary: number; repeat: number; rev: number }>();
	const getStat = (k: string) => {
		let s = stats.get(k);
		if (!s) { s = { leads: 0, primary: 0, repeat: 0, rev: 0 }; stats.set(k, s); }
		return s;
	};
	for (const ev of params.communicationEvents ?? []) getStat(matchDenteMarketingChannel(ev.source || ev.channel)).leads++;
	for (const p of params.patients) {
		const raw = p.source || p.administrativeProfile?.advertisingSource || p.administrativeProfile?.marketingSource || p.administrativeProfile?.leadSource || p.administrativeProfile?.utmSource || p.notes;
		const s = getStat(matchDenteMarketingChannel(raw));
		const comp = completedApptsByPatient.get(p.id) ?? 0;
		if (comp >= 1) {
			s.primary++; s.repeat += comp - 1; s.rev += paymentsByPatient.get(p.id) ?? 0;
		} else {
			s.leads++;
		}
	}
	const result: AdvertisingChannelInput[] = STOMX_MARKETING_SOURCES.map((src) => {
		const st = stats.get(src.channelKey) ?? { leads: 0, primary: 0, repeat: 0, rev: 0 };
		const custom = params.customBudgetsKopecks?.[src.channelKey] ?? params.customBudgetsKopecks?.[`ch_dente_${src.channelKey}`] ?? params.customBudgetsKopecks?.[`ch_stomx_${src.channelKey}`];
		return {
			id: `ch_dente_${src.channelKey}`, channelKey: src.channelKey, nameRu: src.nameRu, categoryRu: src.categoryRu,
			spentKopecks: custom !== undefined ? custom : (src.defaultSpendRub * 100),
			leadsCount: Math.max(st.leads, st.primary), primaryPatientsCount: st.primary, repeatVisitsCount: st.repeat,
			revenueKopecks: st.rev, totalLtvRevenueKopecks: st.rev, notes: src.descriptionRu,
		};
	});
	for (const [key, st] of stats) {
		if (STOMX_MARKETING_SOURCES.some((s) => s.channelKey === key)) continue;
		if (st.primary > 0 || st.rev > 0 || st.leads > 0 || params.customBudgetsKopecks?.[key]) {
			result.push({
				id: `ch_custom_${key}`, channelKey: key, nameRu: key === "napopravku" ? "НаПоправку" : key,
				categoryRu: key === "napopravku" ? "Мед-агрегаторы" : "Реклама",
				spentKopecks: params.customBudgetsKopecks?.[key] ?? (key === "napopravku" ? 1200000 : 0),
				leadsCount: Math.max(st.leads, st.primary), primaryPatientsCount: st.primary, repeatVisitsCount: st.repeat,
				revenueKopecks: st.rev, totalLtvRevenueKopecks: st.rev,
				notes: key === "napopravku" ? "Медицинский портал и сервис онлайн-записи НаПоправку" : "Дополнительный канал",
			});
		}
	}
	return result;
}
