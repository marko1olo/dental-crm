import type { NpsCategory, NpsMetrics, NpsReview, NpsUrgency } from "../omnichannelTypes.js";

/**
 * Определяет категорию NPS (Promoter 9..10, Neutral 7..8, Detractor 0..6).
 */
export function getNpsCategory(score: number): NpsCategory {
	if (score >= 9) return "promoter";
	if (score >= 7) return "neutral";
	return "detractor";
}

/**
 * Определяет уровень срочности отзыва и бейдж для регистратуры / главврача.
 */
export function getNpsUrgency(score: number): {
	urgency: NpsUrgency;
	badgeText: string;
	colorClass: string;
} {
	if (score <= 4) {
		return {
			urgency: "critical",
			badgeText: "Критический — звонок главврача",
			colorClass: "urgency-critical",
		};
	}
	if (score <= 6) {
		return {
			urgency: "high",
			badgeText: "Детрактор — требует звонка",
			colorClass: "urgency-high",
		};
	}
	if (score <= 8) {
		return {
			urgency: "medium",
			badgeText: "Нейтральный отзыв",
			colorClass: "urgency-medium",
		};
	}
	return {
		urgency: "low",
		badgeText: "Лояльный промоутер",
		colorClass: "urgency-low",
	};
}

/**
 * Вычисляет агрегированные метрики NPS (Net Promoter Score) по правилам международной методологии.
 * NPS = % Promoters (9-10) - % Detractors (0-6), диапазон от -100 до +100.
 */
export function calculateNpsMetrics(reviews: readonly NpsReview[]): NpsMetrics {
	const totalReviews = reviews.length;
	if (totalReviews === 0) {
		return {
			totalReviews: 0,
			npsScore: 0,
			promotersCount: 0,
			promotersPct: 0,
			neutralsCount: 0,
			neutralsPct: 0,
			detractorsCount: 0,
			detractorsPct: 0,
			averageScore: 0,
			criticalPendingCount: 0,
		};
	}

	let promotersCount = 0;
	let neutralsCount = 0;
	let detractorsCount = 0;
	let scoreSum = 0;
	let criticalPendingCount = 0;

	for (const rev of reviews) {
		scoreSum += rev.score;
		if (rev.score >= 9) {
			promotersCount++;
		} else if (rev.score >= 7) {
			neutralsCount++;
		} else {
			detractorsCount++;
			if (rev.score <= 4 && (rev.status === "pending" || rev.status === "in_progress")) {
				criticalPendingCount++;
			}
		}
	}

	const promotersPct = Math.round((promotersCount / totalReviews) * 100);
	const neutralsPct = Math.round((neutralsCount / totalReviews) * 100);
	const detractorsPct = Math.round((detractorsCount / totalReviews) * 100);
	const npsScore = promotersPct - detractorsPct;
	const averageScore = Number((scoreSum / totalReviews).toFixed(1));

	return {
		totalReviews,
		npsScore,
		promotersCount,
		promotersPct,
		neutralsCount,
		neutralsPct,
		detractorsCount,
		detractorsPct,
		averageScore,
		criticalPendingCount,
	};
}
