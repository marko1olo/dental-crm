/**
 * DoctorEarningsBreakdownCard.tsx — Карточки структуры начислений сдельной оплаты врача.
 * Mandate 8b: строго <= 120 строк на файл.
 */

import React from "react";
import { countLabel, money } from "../../../AppHelpers";
import { Sparkles, Layers, Scissors, TrendingUp, CheckCircle2, AlertCircle } from "lucide-react";
import type { CategoryCardItem } from "./types.js";

export { computeCategoryCards } from "./categoryCardComputer.js";

export interface DoctorEarningsBreakdownCardProps {
	readonly categoryCards: readonly CategoryCardItem[];
}

export function DoctorEarningsBreakdownCard({ categoryCards }: DoctorEarningsBreakdownCardProps) {
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
						className={`doctor-wallet-cat-card ${cat.isDeduction ? "doctor-wallet-cat-card--deduction" : ""}`}
					>
						<div className="doctor-wallet-cat-left">
							<div className={`doctor-wallet-cat-icon doctor-wallet-cat-icon--${cat.iconType}`}>
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
									{cat.badge && <span className="doctor-wallet-cat-badge">{cat.badge}</span>}
								</div>
								<span className="doctor-wallet-cat-rate">
									{cat.isDeduction ? `Вычет: ${cat.ratePct}%` : `Ставка: ${cat.ratePct !== null ? `${cat.ratePct}%` : "—"}`}
								</span>
							</div>
						</div>

						<div className="doctor-wallet-cat-right">
							<span
								className={`doctor-wallet-cat-amount ${cat.isDeduction ? "doctor-wallet-cat-amount--minus" : "doctor-wallet-cat-amount--plus"}`}
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
