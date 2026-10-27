export function resolveEffectiveActiveModal({
	isCbctModalOpen,
	isDmsLetterOpen,
	isDmsRegistryOpen,
	isLoyaltyModalOpen,
	isMergeOpen,
	isEffectivePhotoProtocolOpen,
	isEffectiveOrthoPhotoModalOpen,
	isFamilyOpen,
}: {
	isCbctModalOpen?: boolean;
	isDmsLetterOpen?: boolean;
	isDmsRegistryOpen?: boolean;
	isLoyaltyModalOpen?: boolean;
	isMergeOpen: boolean;
	isEffectivePhotoProtocolOpen: boolean;
	isEffectiveOrthoPhotoModalOpen: boolean;
	isFamilyOpen: boolean;
}): string | null {
	if (isCbctModalOpen) return "cbct_implant_studio";
	if (isDmsLetterOpen) return "dms_letter";
	if (isDmsRegistryOpen) return "dms_registry";
	if (isLoyaltyModalOpen) return "loyalty";
	if (isMergeOpen) return "duplicate_merge";
	if (isEffectivePhotoProtocolOpen) return "photo_protocol";
	if (isEffectiveOrthoPhotoModalOpen) return "ortho_photo";
	if (isFamilyOpen) return "family_wallet";
	return null;
}
