import { LOYALTY_TIER_PRESETS } from "../presets/index";
import type { FamilyMember, FamilyPoolBalanceResult } from "./familyPoolTypes";

export function calculateFamilyPoolBalance(
	familyGroupId: string,
	familyName: string,
	members: readonly FamilyMember[]
): FamilyPoolBalanceResult {
	let totalPooledPoints = 0;
	let totalFamilyLifetimeSpentKop = 0;

	for (const m of members) {
		totalPooledPoints += m.individualPointsBalance;
		totalFamilyLifetimeSpentKop += m.lifetimeSpentKop;
	}

	const effectiveTier =
		totalFamilyLifetimeSpentKop >= 40000000
			? (LOYALTY_TIER_PRESETS.find((t) => t.id === "platinum") ?? LOYALTY_TIER_PRESETS[0]!)
			: (LOYALTY_TIER_PRESETS.find((t) => t.id === "family") ?? LOYALTY_TIER_PRESETS[0]!);

	return {
		familyGroupId,
		familyName,
		memberCount: members.length,
		totalPooledPoints,
		totalFamilyLifetimeSpentKop,
		totalFamilyLifetimeSpentRub: totalFamilyLifetimeSpentKop / 100,
		effectiveTier,
		members,
	};
}
