import { useEffect } from "react";
import { useUiSurfaceStore } from "../../../store/uiSurfaceStore";
import { closeOtherModals } from "./modalExclusivityUtils";

const MANAGED_MODAL_IDS = new Set([
	"cbct_implant_studio",
	"dms_letter",
	"dms_registry",
	"loyalty",
	"duplicate_merge",
	"photo_protocol",
	"ortho_photo",
	"family_wallet",
]);

export interface ModalCloseHandlers {
	isCbctModalOpen?: boolean;
	setIsCbctModalOpen: (v: boolean) => void;
	isDmsLetterOpen?: boolean;
	setIsDmsLetterOpen: (v: boolean) => void;
	isDmsRegistryOpen?: boolean;
	setIsDmsRegistryOpen: (v: boolean) => void;
	isLoyaltyModalOpen?: boolean;
	setIsLoyaltyModalOpen: (v: boolean) => void;
	isMergeOpen: boolean;
	closeMergeModal: () => void;
	isFamilyOpen: boolean;
	closeFamilyModal: () => void;
	isEffectivePhotoProtocolOpen: boolean;
	setInternalPhotoProtocolOpen: (v: boolean) => void;
	propSetPhotoOpen?: ((v: boolean) => void) | undefined;
	isEffectiveOrthoPhotoModalOpen: boolean;
	setInternalOrthoPhotoModalOpen: (v: boolean) => void;
	propSetOrthoOpen?: ((v: boolean) => void) | undefined;
}

export function usePatientWorkspaceModalsSync(
	effectiveActiveModal: string | null,
	handlers: ModalCloseHandlers,
) {
	useEffect(() => {
		if (!effectiveActiveModal) {
			const current = useUiSurfaceStore.getState().primaryModal?.id;
			if (current && MANAGED_MODAL_IDS.has(current)) {
				useUiSurfaceStore.getState().closePrimaryModal();
			}
			return;
		}
		useUiSurfaceStore.getState().openPrimaryModal(effectiveActiveModal as any);
		closeOtherModals(effectiveActiveModal, {
			closeCbct: () => handlers.isCbctModalOpen && handlers.setIsCbctModalOpen(false),
			closeDmsLetter: () => handlers.isDmsLetterOpen && handlers.setIsDmsLetterOpen(false),
			closeDmsRegistry: () => handlers.isDmsRegistryOpen && handlers.setIsDmsRegistryOpen(false),
			closeLoyalty: () => handlers.isLoyaltyModalOpen && handlers.setIsLoyaltyModalOpen(false),
			closeMerge: () => handlers.isMergeOpen && handlers.closeMergeModal(),
			closeFamily: () => handlers.isFamilyOpen && handlers.closeFamilyModal(),
			closePhotoProtocol: () => {
				if (handlers.isEffectivePhotoProtocolOpen) {
					handlers.setInternalPhotoProtocolOpen(false);
					handlers.propSetPhotoOpen?.(false);
				}
			},
			closeOrthoPhoto: () => {
				if (handlers.isEffectiveOrthoPhotoModalOpen) {
					handlers.setInternalOrthoPhotoModalOpen(false);
					handlers.propSetOrthoOpen?.(false);
				}
			},
		});
	}, [
		effectiveActiveModal,
		handlers.isCbctModalOpen,
		handlers.isDmsLetterOpen,
		handlers.isDmsRegistryOpen,
		handlers.isLoyaltyModalOpen,
		handlers.isMergeOpen,
		handlers.isEffectivePhotoProtocolOpen,
		handlers.isEffectiveOrthoPhotoModalOpen,
		handlers.isFamilyOpen,
		handlers.setIsCbctModalOpen,
		handlers.setIsDmsLetterOpen,
		handlers.setIsDmsRegistryOpen,
		handlers.setIsLoyaltyModalOpen,
		handlers.closeMergeModal,
		handlers.closeFamilyModal,
		handlers.propSetPhotoOpen,
		handlers.propSetOrthoOpen,
		handlers.setInternalPhotoProtocolOpen,
		handlers.setInternalOrthoPhotoModalOpen,
	]);
}
