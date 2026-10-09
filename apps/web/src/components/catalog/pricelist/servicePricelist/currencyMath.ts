import type { PriceTierKind } from '../servicePricelistPresets';
import type { PriceRoundingMode } from './types';

// =============================================================================
// LAYER 0: KOPECK-EXACT MONEY & PRICE TIER MATHEMATICS
// =============================================================================

export const KOPECKS_PER_RUBLE = 100;
export const RU_NBSP = '\u00A0';

/**
 * Converts integer rubles to exact integer kopecks.
 */
export function rublesToKopecks(rubles: number): number {
	if (!Number.isFinite(rubles)) return 0;
	return Math.round(rubles * KOPECKS_PER_RUBLE);
}

/**
 * Converts integer kopecks to rubles.
 */
export function kopecksToRubles(kopecks: number): number {
	if (!Number.isFinite(kopecks)) return 0;
	return kopecks / KOPECKS_PER_RUBLE;
}

/**
 * Formats rubles with thousand separators and currency symbol: "15 000 ₽".
 */
export function formatRubles(rubles: number): string {
	if (!Number.isFinite(rubles)) return `0${RU_NBSP}₽`;
	const isNegative = rubles < 0;
	const kopecksTotal = Math.round(Math.abs(rubles) * KOPECKS_PER_RUBLE);
	const whole = Math.floor(kopecksTotal / KOPECKS_PER_RUBLE);
	const fraction = kopecksTotal % KOPECKS_PER_RUBLE;
	const formattedWhole = String(whole).replace(/\B(?=(\d{3})+(?!\d))/g, RU_NBSP);
	if (fraction !== 0) {
		const fractionStr = String(fraction).padStart(2, '0');
		return `${isNegative ? '−' : ''}${formattedWhole},${fractionStr}${RU_NBSP}₽`;
	}
	return `${isNegative ? '−' : ''}${formattedWhole}${RU_NBSP}₽`;
}

/**
 * Formats exact kopecks with kopeck precision: "1 500,50 ₽".
 */
export function formatKopecksRu(kopecks: number): string {
	if (!Number.isFinite(kopecks)) return `0,00${RU_NBSP}₽`;
	const isNegative = kopecks < 0;
	const abs = Math.abs(Math.round(kopecks));
	const whole = Math.floor(abs / KOPECKS_PER_RUBLE);
	const fraction = abs % KOPECKS_PER_RUBLE;
	const formattedWhole = String(whole).replace(/\B(?=(\d{3})+(?!\d))/g, RU_NBSP);
	const fractionStr = String(fraction).padStart(2, '0');
	return `${isNegative ? '−' : ''}${formattedWhole},${fractionStr}${RU_NBSP}₽`;
}

export function roundPrice(price: number, mode: PriceRoundingMode): number {
	if (!Number.isFinite(price)) return 0;
	switch (mode) {
		case 'round_10':
			return Math.round(price / 10) * 10;
		case 'round_50':
			return Math.round(price / 50) * 50;
		case 'round_100':
			return Math.round(price / 100) * 100;
		case 'round_500':
			return Math.round(price / 500) * 500;
		case 'none':
		default:
			return Math.round(price);
	}
}

/**
 * Calculates effective price in rubles for a given tier (Standard, VIP, DMS, Promo).
 */
export function calculateTierPrice(
	basePriceRub: number,
	tier: PriceTierKind,
	customTierPrice?: number,
): number {
	if (customTierPrice !== undefined && Number.isFinite(customTierPrice) && customTierPrice >= 0) {
		return Math.round(customTierPrice * 100) / 100;
	}
	if (!Number.isFinite(basePriceRub) || basePriceRub <= 0) return 0;

	switch (tier) {
		case 'standard':
			return Math.round(basePriceRub * 100) / 100;
		case 'vip':
			// VIP default is +20% rounded to nearest 50 rubles
			return roundPrice(basePriceRub * 1.2, 'round_50');
		case 'dms':
			// DMS default contract rate is 85% of standard price
			return roundPrice(basePriceRub * 0.85, 'round_50');
		case 'promo':
			// Promo discount is -10% of standard price
			return roundPrice(basePriceRub * 0.9, 'round_50');
		case 'night_weekend':
			// Night & weekend rate is +30% rounded to nearest 50 rubles
			return roundPrice(basePriceRub * 1.3, 'round_50');
		default:
			return Math.round(basePriceRub * 100) / 100;
	}
}
