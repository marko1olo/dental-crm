import { useCallback, useEffect, useState } from "react";
import { denteAdminSecretRequestHeaders } from "../../../AppHelpers";
import { useUiSurfaceStore } from "../../../store/uiSurfaceStore";
import { showToast } from "../../GlobalToast";
import type { DmsGuaranteeLetter } from "../../insurance/DmsGuaranteeLetterModal";

export function usePatientWorkspaceModalsState() {
	const [isDicomModalOpen, setIsDicomModalOpen] = useState(false);
	const [selectedScanForDicom, setSelectedScanForDicom] = useState<{
		url: string;
		tooth?: string | null;
		title?: string | null;
	} | null>(null);

	const [selectedPlanIdForModal, setSelectedPlanIdForModal] = useState<string | null>(null);
	const [isPlanModalOpen, setIsPlanModalOpen] = useState(false);
	const [isDmsLetterOpen, setIsDmsLetterOpen] = useState(false);
	const [isDmsRegistryOpen, setIsDmsRegistryOpen] = useState(false);
	const [isLoyaltyModalOpen, setIsLoyaltyModalOpen] = useState(false);
	const [isCbctModalOpen, setIsCbctModalOpen] = useState(false);
	const [isPhotoProtocolOpen, setIsPhotoProtocolOpen] = useState(false);
	const [isOrthoPhotoModalOpen, setIsOrthoPhotoModalOpen] = useState(false);
	const [isDirectRvgOpen, setIsDirectRvgOpen] = useState(false);
	const [isConsultationSplitOpen, setIsConsultationSplitOpen] = useState(false);
	const [isPrescriptionModalOpen, setIsPrescriptionModalOpen] = useState(false);
	const [isTaxCertificateOpen, setIsTaxCertificateOpen] = useState(false);

	useEffect(() => {
		const handleOpenDms = () => setIsDmsLetterOpen(true);
		const handleOpenRegistry = () => setIsDmsRegistryOpen(true);
		const handleCloseAll = () => {
			setIsDicomModalOpen(false);
			setSelectedScanForDicom(null);
		};
		window.addEventListener("dente:open-dms-letters", handleOpenDms);
		window.addEventListener("dente:open-dms-registry", handleOpenRegistry);
		window.addEventListener("dente:close-all-surfaces", handleCloseAll);
		return () => {
			window.removeEventListener("dente:open-dms-letters", handleOpenDms);
			window.removeEventListener("dente:open-dms-registry", handleOpenRegistry);
			window.removeEventListener("dente:close-all-surfaces", handleCloseAll);
		};
	}, []);

	useEffect(() => {
		if (isDicomModalOpen) {
			useUiSurfaceStore.getState().openPrimaryModal("dicom_viewer");
		} else if (useUiSurfaceStore.getState().primaryModal?.id === "dicom_viewer") {
			useUiSurfaceStore.getState().closePrimaryModal("dicom_viewer");
		}
	}, [isDicomModalOpen]);

	const handleSaveDmsLetter = useCallback(async (letter: DmsGuaranteeLetter) => {
		try {
			const isExisting = letter.id && !letter.id.startsWith("letter-") && !letter.id.startsWith("gl-");
			const endpoint = isExisting ? `/api/insurance/guarantee-letters/${letter.id}` : "/api/insurance/guarantee-letters";
			const res = await fetch(endpoint, {
				method: isExisting ? "PUT" : "POST",
				headers: { "Content-Type": "application/json", ...denteAdminSecretRequestHeaders() },
				body: JSON.stringify(letter),
			});
			if (!res.ok) {
				const errBody = await res.json().catch(() => null);
				throw new Error(errBody?.message || `Ошибка сохранения (${res.status})`);
			}
			showToast(`Гарантийное письмо № ${letter.letterNumber} (${letter.insurerName}) сохранено в базе данных`, "success");
			setIsDmsLetterOpen(false);
		} catch (err: any) {
			showToast(err.message || "Не удалось сохранить гарантийное письмо", "error");
		}
	}, []);

	return {
		isDicomModalOpen, setIsDicomModalOpen, selectedScanForDicom, setSelectedScanForDicom,
		selectedPlanIdForModal, setSelectedPlanIdForModal, isPlanModalOpen, setIsPlanModalOpen,
		isDmsLetterOpen, setIsDmsLetterOpen, isDmsRegistryOpen, setIsDmsRegistryOpen,
		isLoyaltyModalOpen, setIsLoyaltyModalOpen, isCbctModalOpen, setIsCbctModalOpen,
		isPhotoProtocolOpen, setIsPhotoProtocolOpen, isOrthoPhotoModalOpen, setIsOrthoPhotoModalOpen,
		isDirectRvgOpen, setIsDirectRvgOpen, isConsultationSplitOpen, setIsConsultationSplitOpen,
		isPrescriptionModalOpen, setIsPrescriptionModalOpen, isTaxCertificateOpen, setIsTaxCertificateOpen,
		handleSaveDmsLetter,
	};
}
