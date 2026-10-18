import React, { useCallback, useEffect, useState } from "react";
import { showToast } from "../../components/GlobalToast";
import { processCameraPhotoCapture } from "../../components/imaging";
import { routeOpenCbctPopout } from "../../utils/runtimeRouter";
import type { ImagingModalId, ImagingViewProps } from "./imagingViewTypes";

export function useImagingViewController(props: ImagingViewProps, appLogic: any) {
	const auth = appLogic?.auth;
	const { activeAppointment, activePatient, selectedImagingStudy, setSelectedImagingStudyId, setImagingKindFilter } = props;
	const [activeModal, setActiveModal] = useState<ImagingModalId>(null);
	const [localImageIds, setLocalImageIds] = useState<string[]>([]);
	const [isCapturingCameraPhoto, setIsCapturingCameraPhoto] = useState(false);

	useEffect(() => {
		if (!activeModal) return;
		const handleKeyDown = (e: KeyboardEvent) => {
			if (e.key === "Escape") { e.stopPropagation(); setActiveModal(null); }
		};
		window.addEventListener("keydown", handleKeyDown);
		return () => window.removeEventListener("keydown", handleKeyDown);
	}, [activeModal]);

	const openPopoutStudio = useCallback((studyId?: string, imageIds?: string[]) => {
		if (imageIds?.length) setLocalImageIds(imageIds);
		if (studyId && setSelectedImagingStudyId) setSelectedImagingStudyId(studyId);
		routeOpenCbctPopout({
			patientId: activePatient?.id,
			patientName: activePatient?.name ?? activePatient?.fullName,
			studyId: studyId ?? selectedImagingStudy?.id,
			mode: "mpr",
		});
		showToast("3D КЛКТ Студия запущена на втором мониторе", "info");
	}, [activePatient, selectedImagingStudy, setSelectedImagingStudyId]);

	const handleOpenPanoramic = useCallback(() => {
		setActiveModal("panoramic");
		showToast("Открыта панорамная реконструкция (Curved MPR)", "info");
	}, []);

	useEffect(() => {
		const handleOpen = (e: Event) => {
			const detail = (e as CustomEvent<{ modalId: string }>).detail;
			if (detail?.modalId === "cbct_mpr_workspace" || detail?.modalId === "cbct_implant_studio") openPopoutStudio();
			else if (detail?.modalId === "panoramic_recon_window") handleOpenPanoramic();
		};
		window.addEventListener("dente-open-backoffice-modal", handleOpen);
		return () => window.removeEventListener("dente-open-backoffice-modal", handleOpen);
	}, [openPopoutStudio, handleOpenPanoramic]);

	const handleCameraPhotoCapture = async (event: React.ChangeEvent<HTMLInputElement>) => {
		const file = event.target.files?.[0];
		if (!file) return;
		if (!activePatient?.id) {
			showToast("Выберите пациента перед добавлением снимка с камеры.", "info", 6000);
			event.target.value = "";
			return;
		}
		setIsCapturingCameraPhoto(true);
		try {
			await processCameraPhotoCapture({
				file, activePatientId: activePatient.id, activeAppointmentId: activeAppointment?.id,
				onStudyCreated: (id) => { setSelectedImagingStudyId?.(id); setImagingKindFilter?.("photo"); },
				onDashboardRefresh: () => { if (appLogic?.loadDashboard) void appLogic.loadDashboard(); },
			});
		} finally {
			setIsCapturingCameraPhoto(false);
			event.target.value = "";
		}
	};

	const handleAttachTooth = useCallback(async (toothCode: string) => {
		if (!selectedImagingStudy?.id) return;
		(props as any).onStudyUpdated?.({ ...selectedImagingStudy, toothCode: toothCode || null });
		try {
			const res = await fetch(`/api/imaging/studies/${selectedImagingStudy.id}`, {
				method: "PATCH",
				headers: auth?.denteClinicalMutationHeaders ? auth.denteClinicalMutationHeaders({ "Content-Type": "application/json" }) : { "Content-Type": "application/json" },
				body: JSON.stringify({ toothCode: toothCode || null }),
			});
			if (res.ok) {
				const updated = await res.json();
				(props as any).onStudyUpdated?.(updated);
				if (appLogic?.loadDashboard) void appLogic.loadDashboard();
				showToast(toothCode ? `Снимок привязан к зубу ${toothCode}` : "Привязка к зубу снята", "success");
			}
		} catch { showToast("Не удалось обновить привязку к зубу", "error"); }
	}, [selectedImagingStudy, auth, props, appLogic]);

	const handleAttachVisit = useCallback(async (visitId: string) => {
		if (!selectedImagingStudy?.id) return;
		try {
			const res = await fetch(`/api/imaging/studies/${selectedImagingStudy.id}`, {
				method: "PATCH",
				headers: auth?.denteClinicalMutationHeaders ? auth.denteClinicalMutationHeaders({ "Content-Type": "application/json" }) : { "Content-Type": "application/json" },
				body: JSON.stringify({ visitId: visitId || null }),
			});
			if (res.ok) {
				const updated = await res.json();
				(props as any).onStudyUpdated?.(updated);
				if (appLogic?.loadDashboard) void appLogic.loadDashboard();
				showToast("Снимок привязан к текущему приёму", "success");
			}
		} catch { showToast("Не удалось обновить привязку к визиту", "error"); }
	}, [selectedImagingStudy?.id, auth, props, appLogic]);

	return {
		activeModal, setActiveModal, localImageIds, setLocalImageIds,
		isCapturingCameraPhoto, openPopoutStudio, handleOpenPanoramic,
		handleCameraPhotoCapture, handleAttachTooth, handleAttachVisit,
	};
}
