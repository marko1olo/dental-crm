import { useEffect, useRef, useState } from "react";
import type { DiaryPrintPhoto } from "../../../VisitDiaryPhotoUpload";

export function useVisitDiaryModalsState() {
	const [fieldInterimMap, setFieldInterimMap] = useState<{
		anamnesis?: string;
		statusLocalis?: string;
		treatmentDescription?: string;
		complications?: string;
	}>({});
	const [printPhotos, setPrintPhotos] = useState<readonly DiaryPrintPhoto[]>([]);
	const [showSummaryModal, setShowSummaryModal] = useState(false);
	const [showPrescriptionModal, setShowPrescriptionModal] = useState(false);
	const [showRadiologyReferralModal, setShowRadiologyReferralModal] = useState(false);
	const [showEgiszModal, setShowEgiszModal] = useState(false);
	const [showTemplatesModal, setShowTemplatesModal] = useState(false);
	const [showBrandingCustomizer, setShowBrandingCustomizer] = useState(false);
	const [isTier3PerioModalOpen, setIsTier3PerioModalOpen] = useState(false);
	const [isExtraActionsOpen, setIsExtraActionsOpen] = useState(false);
	const [showPerioPathologyMenu, setShowPerioPathologyMenu] = useState(false);

	const moreActionsRef = useRef<HTMLDivElement>(null);
	const perioMenuRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		const handleOpenSummary = () => setShowSummaryModal(true);
		const handleOpenTemplates = () => setShowTemplatesModal(true);
		window.addEventListener("dente:open-visit-summary-modal", handleOpenSummary);
		window.addEventListener("dente:open-clinical-templates-modal", handleOpenTemplates);
		return () => {
			window.removeEventListener("dente:open-visit-summary-modal", handleOpenSummary);
			window.removeEventListener("dente:open-clinical-templates-modal", handleOpenTemplates);
		};
	}, []);

	return {
		fieldInterimMap,
		setFieldInterimMap,
		printPhotos,
		setPrintPhotos,
		showSummaryModal,
		setShowSummaryModal,
		showPrescriptionModal,
		setShowPrescriptionModal,
		showRadiologyReferralModal,
		setShowRadiologyReferralModal,
		showEgiszModal,
		setShowEgiszModal,
		showTemplatesModal,
		setShowTemplatesModal,
		showBrandingCustomizer,
		setShowBrandingCustomizer,
		isTier3PerioModalOpen,
		setIsTier3PerioModalOpen,
		isExtraActionsOpen,
		setIsExtraActionsOpen,
		showPerioPathologyMenu,
		setShowPerioPathologyMenu,
		moreActionsRef,
		perioMenuRef,
	};
}
