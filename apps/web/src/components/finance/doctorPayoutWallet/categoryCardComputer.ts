/**
 * categoryCardComputer.ts — Вычисление карточек направлений и удержаний ЗТЛ.
 * Mandate 8b: строго <= 120 строк на файл.
 */

import type { DoctorPayoutRow, CategoryCardItem } from "./types.js";

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

export function classifyWalletServiceCategory(
	serviceTitle: string,
	specialtyId: string,
): "therapy" | "surgery" | "orthopedics" | "orthodontics" | "hygiene" | "retail_hygiene" {
	const s = serviceTitle.toLowerCase();
	if (s.includes("кариес") || s.includes("эндодонт") || s.includes("реставрац") || s.includes("пульпит") || s.includes("периодонтит") || s.includes("пломб") || s.includes("канал")) {
		return "therapy";
	}
	return inferServiceCategory(serviceTitle, specialtyId);
}

export function computeCategoryCards(currentDoctor: DoctorPayoutRow | null): readonly CategoryCardItem[] {
	if (!currentDoctor) return [];
	const specialtyId = mapRoleToSpecialtyId(currentDoctor.role);
	const commRate = (currentDoctor.commissionPct ?? 0) / 100;

	const catSums: Record<string, { gross: number; earned: number; count: number; name: string; icon: CategoryCardItem["iconType"] }> = {
		therapy: { gross: 0, earned: 0, count: 0, name: "Терапия", icon: "therapy" },
		orthopedics: { gross: 0, earned: 0, count: 0, name: "Ортопедия", icon: "ortho" },
		surgery: { gross: 0, earned: 0, count: 0, name: "Хирургия", icon: "surgery" },
		orthodontics: { gross: 0, earned: 0, count: 0, name: "Ортодонтия", icon: "orthodontics" },
		hygiene: { gross: 0, earned: 0, count: 0, name: "Профгигиена", icon: "hygiene" },
	};

	if (currentDoctor.visits) {
		for (const v of currentDoctor.visits) {
			if (!v.services || v.services.length === 0) {
				const c = classifyWalletServiceCategory("Стоматологические услуги", specialtyId);
				const bucket = c === "retail_hygiene" ? "hygiene" : c;
				if (catSums[bucket]) {
					catSums[bucket].gross += v.revenueRub;
					catSums[bucket].earned += Math.round(v.revenueRub * commRate);
					catSums[bucket].count += 1;
				}
			} else {
				for (const s of v.services) {
					const c = classifyWalletServiceCategory(s.title, specialtyId);
					const bucket = c === "retail_hygiene" ? "hygiene" : c;
					const sRev = s.priceRub * s.quantity;
					if (catSums[bucket]) {
						catSums[bucket].gross += sRev;
						catSums[bucket].earned += Math.round(sRev * commRate);
						catSums[bucket].count += 1;
					}
				}
			}
		}
	}

	const result: CategoryCardItem[] = [];
	for (const [key, data] of Object.entries(catSums)) {
		if (data.gross > 0 || data.count > 0) {
			result.push({
				id: `cat-${key}`,
				name: data.name,
				iconType: data.icon,
				ratePct: currentDoctor.commissionPct,
				grossRevenueRub: data.gross,
				amountRub: data.earned,
				isDeduction: false,
			});
		}
	}

	const labWithheld = currentDoctor.withheldLabRub ?? (currentDoctor.labCostRub ?? 0);
	if (labWithheld > 0) {
		result.push({
			id: "cat-lab-deduction",
			name: "Лаборатория (ЗТЛ)",
			iconType: "deduction",
			badge: "Удержание",
			ratePct: currentDoctor.labDeductionPct ?? 100,
			grossRevenueRub: labWithheld,
			amountRub: labWithheld,
			isDeduction: true,
		});
	}

	const matWithheld = currentDoctor.withheldMaterialRub ?? (currentDoctor.materialCostRub ?? 0);
	if (matWithheld > 0) {
		result.push({
			id: "cat-material-deduction",
			name: "Материалы",
			iconType: "deduction",
			badge: "Расходники",
			ratePct: currentDoctor.materialDeductionPct ?? 0,
			grossRevenueRub: currentDoctor.materialCostRub ?? matWithheld,
			amountRub: matWithheld,
			isDeduction: true,
		});
	}

	return result;
}
