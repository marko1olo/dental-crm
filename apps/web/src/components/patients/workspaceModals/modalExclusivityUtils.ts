export interface ModalCloseActions {
	closeCbct: () => void;
	closeDmsLetter: () => void;
	closeDmsRegistry: () => void;
	closeLoyalty: () => void;
	closeMerge: () => void;
	closePhotoProtocol: () => void;
	closeOrthoPhoto: () => void;
}

export function closeOtherModals(activeModal: string | null, actions: ModalCloseActions): void {
	if (!activeModal) return;
	if (activeModal !== "cbct_implant_studio") actions.closeCbct();
	if (activeModal !== "dms_letter") actions.closeDmsLetter();
	if (activeModal !== "dms_registry") actions.closeDmsRegistry();
	if (activeModal !== "loyalty") actions.closeLoyalty();
	if (activeModal !== "duplicate_merge") actions.closeMerge();
	if (activeModal !== "photo_protocol") actions.closePhotoProtocol();
	if (activeModal !== "ortho_photo") actions.closeOrthoPhoto();
}
