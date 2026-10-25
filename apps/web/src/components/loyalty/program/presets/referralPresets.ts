export interface ReferralRewardPreset {
	readonly id: string;
	readonly titleRu: string;
	readonly referrerRewardKop: number; // in kopecks, e.g. 50000 = 500 RUB
	readonly referrerRewardRub: number;
	readonly referredFriendDiscountKop: number; // in kopecks, e.g. 50000 = 500 RUB
	readonly referredFriendDiscountRub: number;
	readonly minFriendSpendKop: number; // in kopecks, e.g. 250000 = 2 500 RUB
	readonly descriptionRu: string;
	readonly minInvoiceSpendKop?: number | undefined;
	readonly referrerBonusKop?: number | undefined;
	readonly invitedDiscountKop?: number | undefined;
}

export const REFERRAL_HYGIENE_1000_PRESET: ReferralRewardPreset = {
	id: "ref_friend_hygiene_1000",
	titleRu: "Приведи друга — обоим по 1000 бонусов на чистку",
	referrerRewardKop: 100000, // 1 000 ₽
	referrerRewardRub: 1000,
	referrerBonusKop: 100000,
	referredFriendDiscountKop: 100000, // 1 000 ₽
	referredFriendDiscountRub: 1000,
	invitedDiscountKop: 100000,
	minFriendSpendKop: 250000, // чек от 2 500 ₽ (профгигиена / терапия)
	minInvoiceSpendKop: 250000,
	descriptionRu: "«Приведи друга — обоим по 1000 бонусов на чистку»: начисление 1 000 бонусов рекомендателю и 1 000 бонусов приглашенному другу на комплексную гигиену полости рта.",
};

export const DEFAULT_REFERRAL_PRESET: ReferralRewardPreset = {
	id: "ref_friend_standard",
	titleRu: "Привёл друга / Члена семьи",
	referrerRewardKop: 50000, // 500 ₽
	referrerRewardRub: 500,
	referrerBonusKop: 50000,
	referredFriendDiscountKop: 50000, // 500 ₽
	referredFriendDiscountRub: 500,
	invitedDiscountKop: 50000,
	minFriendSpendKop: 250000, // чек от 2 500 ₽
	minInvoiceSpendKop: 250000,
	descriptionRu: "Начисление 500 бонусов пациенту за приведённого первичного друга или родственника + 500 ₽ скидка другу на первый приём.",
};

export const REFERRAL_PROGRAM_PRESETS: readonly ReferralRewardPreset[] = [
	REFERRAL_HYGIENE_1000_PRESET,
	DEFAULT_REFERRAL_PRESET,
	{
		id: "ref_family_premium",
		titleRu: "Семейная рекомендация (Имплантация / Ортопедия)",
		referrerRewardKop: 150000, // 1 500 ₽
		referrerRewardRub: 1500,
		referredFriendDiscountKop: 150000, // 1 500 ₽
		referredFriendDiscountRub: 1500,
		minFriendSpendKop: 1000000, // чек от 10 000 ₽
		descriptionRu: "Премиальное вознаграждение 1 500 бонусов при рекомендации комплексного хирургического или ортопедического лечения.",
	},
];
