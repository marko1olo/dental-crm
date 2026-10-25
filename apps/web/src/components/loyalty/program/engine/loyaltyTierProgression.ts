import { LOYALTY_TIER_PRESETS, type LoyaltyTierDefinition, type LoyaltyTierId } from "../presets/index";
import type { TierProgressionResult } from "./loyaltyTypes";

export function getTierDefinition(tierId: LoyaltyTierId): LoyaltyTierDefinition {
	const found = LOYALTY_TIER_PRESETS.find((t) => t.id === tierId);
	return found ?? LOYALTY_TIER_PRESETS[0]!;
}

export function calculateTierProgression(
	lifetimeSpentKop: number,
	isFamilyGroup: boolean = false
): TierProgressionResult {
	if (isFamilyGroup) {
		const familyTier = getTierDefinition("family");
		return {
			currentTier: familyTier,
			nextTier: getTierDefinition("platinum"),
			lifetimeSpentKop,
			lifetimeSpentRub: lifetimeSpentKop / 100,
			progressPercent: Math.min(100, Math.round((lifetimeSpentKop / 40000000) * 100)),
			remainingToNextTierKop: Math.max(0, 40000000 - lifetimeSpentKop),
			remainingToNextTierRub: Math.max(0, 40000000 - lifetimeSpentKop) / 100,
		};
	}

	const platinum = getTierDefinition("platinum");
	const gold = getTierDefinition("gold");
	const silver = getTierDefinition("silver");

	if (lifetimeSpentKop >= platinum.minLifetimeSpentKop) {
		return {
			currentTier: platinum,
			nextTier: null,
			lifetimeSpentKop,
			lifetimeSpentRub: lifetimeSpentKop / 100,
			progressPercent: 100,
			remainingToNextTierKop: 0,
			remainingToNextTierRub: 0,
		};
	}

	if (lifetimeSpentKop >= gold.minLifetimeSpentKop) {
		const span = platinum.minLifetimeSpentKop - gold.minLifetimeSpentKop;
		const progress = lifetimeSpentKop - gold.minLifetimeSpentKop;
		const pct = Math.min(100, Math.round((progress / span) * 100));
		return {
			currentTier: gold,
			nextTier: platinum,
			lifetimeSpentKop,
			lifetimeSpentRub: lifetimeSpentKop / 100,
			progressPercent: pct,
			remainingToNextTierKop: platinum.minLifetimeSpentKop - lifetimeSpentKop,
			remainingToNextTierRub: (platinum.minLifetimeSpentKop - lifetimeSpentKop) / 100,
		};
	}

	const span = gold.minLifetimeSpentKop;
	const pct = Math.min(100, Math.round((lifetimeSpentKop / span) * 100));
	return {
		currentTier: silver,
		nextTier: gold,
		lifetimeSpentKop,
		lifetimeSpentRub: lifetimeSpentKop / 100,
		progressPercent: pct,
		remainingToNextTierKop: gold.minLifetimeSpentKop - lifetimeSpentKop,
		remainingToNextTierRub: (gold.minLifetimeSpentKop - lifetimeSpentKop) / 100,
	};
}
