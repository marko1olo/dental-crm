import React from "react";
import { countLabel, money } from "../../../AppHelpers";
import {
	Sparkles,
	Layers,
	Scissors,
	TrendingUp,
	CheckCircle2,
	AlertCircle,
} from "lucide-react";
import type { DoctorPayoutRow } from "../../../pages/payoutDashboard/types.js";
import {
	mapRoleToSpecialtyId,
	inferServiceCategory,
} from "../../../pages/payoutDashboard/payoutHelpers.js";
import type { CategoryCardItem } from "./types.js";

export interface DoctorEarningsBreakdownCardProps {
	readonly categoryCards: readonly CategoryCardItem[];
}

function classifyWalletServiceCategory(
	serviceTitle: string,
	specialtyId: string,
): "therapy" | "surgery" | "orthopedics" | "orthodontics" | "hygiene" | "retail_hygiene" {
	const s = serviceTitle.toLowerCase();
	if (
		s.includes("кариес") ||
		s.includes("эндодонт") ||
		s.includes("реставрац") ||
		s.includes("пульпит") ||
		s.includes("периодонтит") ||
		s.includes("пломб") ||
		s.includes("канал")
	) {
		return "therapy";
	}
	return inferServiceCategory(serviceTitle, specialtyId);
}

export function computeCategoryCards(
	currentDoctor: DoctorPayoutRow | null,
): readonly CategoryCardItem[] {
	if (!currentDoctor) return [];
	const specialtyId = mapRoleToSpecialtyId(currentDoctor.role);
	const commRate = (currentDoctor.commissionPct ?? 0) / 100;

	const catSums: Record<
		string,
		{ gross: number; earned: number; count: number; name: string; icon: CategoryCardItem["iconType"] }
	> = {
		therapy: {
			gross: 0,
			earned: 0,
			count: 0,
			name: "Терапия",
			icon: "therapy",
		},
		orthopedics: {
			gross: 0,
			earned: 0,
			count: 0,
			name: "Ортопедия",
			icon: "ortho",
		},
		surgery: {
			gross: 0,
			earned: 0,
			count: 0,
			name: "Хирургия",
			icon: "surgery",
		},
		orthodontics: {
			gross: 0,
			earned: 0,
			count: 0,
			name: "Ортодонтия",
			icon: "orthodontics",
		},
		hygiene: {
			gross: 0,
			earned: 0,
			count: 0,
			name: "Профгигиена",
			icon: "hygiene",
		},
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

	// Push positive service categories
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

	// Push Lab deduction card if present
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

	// Push Material deduction card if present
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

export function DoctorEarningsBreakdownCard({
	categoryCards,
}: DoctorEarningsBreakdownCardProps) {
	return (
		<section aria-labelledby="wallet-categories-heading">
			<div className="doctor-wallet-section-header">
				<h4 id="wallet-categories-heading" className="doctor-wallet-section-title">
					Структура начислений
				</h4>
				<span className="doctor-wallet-section-count">
					{countLabel(categoryCards.length, "статья", "статьи", "статей")}
				</span>
			</div>

			<div className="doctor-wallet-categories-grid">
				{categoryCards.map((cat) => (
					<div
						key={cat.id}
						className={`doctor-wallet-cat-card ${
							cat.isDeduction ? "doctor-wallet-cat-card--deduction" : ""
						}`}
					>
						<div className="doctor-wallet-cat-left">
							<div
								className={`doctor-wallet-cat-icon doctor-wallet-cat-icon--${cat.iconType}`}
							>
								{cat.iconType === "therapy" && <Sparkles size={18} />}
								{cat.iconType === "ortho" && <Layers size={18} />}
								{cat.iconType === "surgery" && <Scissors size={18} />}
								{cat.iconType === "orthodontics" && <TrendingUp size={18} />}
								{cat.iconType === "hygiene" && <CheckCircle2 size={18} />}
								{cat.iconType === "deduction" && <AlertCircle size={18} />}
							</div>

							<div className="doctor-wallet-cat-info">
								<div className="doctor-wallet-cat-name-row">
									<span className="doctor-wallet-cat-name">{cat.name}</span>
									{cat.badge && (
										<span className="doctor-wallet-cat-badge">{cat.badge}</span>
									)}
								</div>
								<span className="doctor-wallet-cat-rate">
									{cat.isDeduction
										? `Вычет: ${cat.ratePct}%`
										: `Ставка: ${cat.ratePct !== null ? `${cat.ratePct}%` : "—"}`}
								</span>
							</div>
						</div>

						<div className="doctor-wallet-cat-right">
							<span
								className={`doctor-wallet-cat-amount ${
									cat.isDeduction
										? "doctor-wallet-cat-amount--minus"
										: "doctor-wallet-cat-amount--plus"
								}`}
							>
								{cat.isDeduction ? `−${money(cat.amountRub)}` : `+${money(cat.amountRub)}`}
							</span>
							<span className="doctor-wallet-cat-subrev">
								касса: {money(cat.grossRevenueRub)}
							</span>
						</div>
					</div>
				))}
			</div>
		</section>
	);
}
