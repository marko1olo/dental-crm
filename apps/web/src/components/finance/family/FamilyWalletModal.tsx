/**
 * apps/web/src/components/finance/family/FamilyWalletModal.tsx
 *
 * Re-export facade to the canonical FamilyWalletModal SSOT in components/patients/family/.
 * Satisfies Mandates 8s (Best-of-Breed SSOT) and 8bf (No duplicate implementations).
 */

export { FamilyWalletModal, default } from "../../patients/family/FamilyWalletModal";
export type {
	FamilyGroupDetails,
	FamilyMemberItem,
	FamilyWalletModalProps,
	FamilyWalletTab,
} from "../../patients/family/FamilyWalletModal";
