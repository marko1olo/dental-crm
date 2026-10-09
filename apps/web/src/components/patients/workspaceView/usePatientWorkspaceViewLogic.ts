import type { Appointment, Dashboard, TreatmentPlanItem } from "@dental/shared";
import { useCallback, useEffect, useMemo, useState } from "react";
import { denteAdminSecretRequestHeaders } from "../../../AppHelpers";
import { useAppLogicContext } from "../../../contexts/AppLogicContext";
import { isDemoPatientId, isDemoShowcaseMode } from "../../../lib/demoMode";
import { useUiSurfaceStore } from "../../../store/uiSurfaceStore";
import { sliceDomList } from "../../../utils/domVirtualizationHelper";
import { showToast } from "../../GlobalToast";
import type { DmsGuaranteeLetter } from "../../insurance/DmsGuaranteeLetterModal";
import type { ImagingStudyItem, PatientWorkspaceViewProps, WorkspaceTabKey } from "./types";

export const DEFAULT_WORKSPACE_PAGE_SIZE = 30;

export function usePatientWorkspaceViewLogic(props: PatientWorkspaceViewProps) {
	const {
		patientId,
		dashboard: propDashboard,
		initialTab = "timeline",
		onOpenVisit,
		onOpenPlan,
	} = props;

	const appLogic = useAppLogicContext();
	const dashboard = propDashboard ?? appLogic?.dashboard;
	const [activeTab, setActiveTab] = useState<WorkspaceTabKey>(initialTab ?? "timeline");
	const [isDicomModalOpen, setIsDicomModalOpen] = useState(false);
	const [selectedScanForDicom, setSelectedScanForDicom] = useState<{
		url: string;
		tooth?: string | null;
		title?: string | null;
	} | null>(null);

	useEffect(() => {
		let isMounted = true;
		const handleCustomRefresh = () => {
			if (isMounted) {
				// State refresh notification if needed
			}
		};

		window.addEventListener(
			"dente-patient-workspace-refresh",
			handleCustomRefresh,
		);
		return () => {
			isMounted = false;
			window.removeEventListener(
				"dente-patient-workspace-refresh",
				handleCustomRefresh,
			);
		};
	}, []);

	const staffMap = useMemo(() => {
		const map = new Map<string, string>();
		for (const s of dashboard?.clinicSettings?.staff ?? []) {
			if (s.id && s.fullName) {
				map.set(s.id, s.fullName);
			}
		}
		return map;
	}, [dashboard?.clinicSettings?.staff]);

	const patientAppointments = useMemo(() => {
		const list = (dashboard?.appointments ?? []).filter(
			(a) => a?.patientId === patientId,
		);
		return list.sort(
			(a, b) =>
				new Date(b?.startsAt ?? 0).getTime() -
				new Date(a?.startsAt ?? 0).getTime(),
		);
	}, [dashboard?.appointments, patientId]);

	const patientPlanItems = useMemo(() => {
		return (dashboard?.treatmentPlanItems ?? []).filter(
			(item) => item?.patientId === patientId,
		);
	}, [dashboard?.treatmentPlanItems, patientId]);

	const currentPatient = useMemo(() => {
		return (dashboard?.patients ?? []).find(
			(p: any) => String(p?.id) === String(patientId),
		);
	}, [dashboard?.patients, patientId]);

	const patientCardNumber = useMemo(() => {
		return (
			(currentPatient as any)?.cardNumber ||
			(currentPatient as any)?.chartNumber ||
			(currentPatient as any)?.medicalCardNumber ||
			null
		);
	}, [currentPatient]);

	const patientBalanceRub = useMemo(() => {
		const b = (currentPatient as any)?.balanceRub ?? (currentPatient as any)?.balance;
		return typeof b === "number" ? b : null;
	}, [currentPatient]);

	const patientStudies = useMemo((): ImagingStudyItem[] => {
		const all = (dashboard?.imagingStudies ?? []) as any[];
		const filtered = all.filter((s) => String(s?.patientId) === String(patientId));
		if (filtered.length > 0) return filtered;
		if (isDemoShowcaseMode() || isDemoPatientId(patientId)) {
			return [
				{
					id: `demo-study-rvg-16-${patientId}`,
					patientId,
					title: "Прицельный снимок зуба 1.6",
					kind: "periapical",
					toothCode: "16",
					previewUrl: "/radiology/sample_rvg_tooth16.jpg",
					viewerUrl: "/radiology/sample_rvg_tooth16.jpg",
					capturedAt: new Date(Date.now() - 86400000 * 3).toISOString(),
					effectiveDoseMicrosv: 2,
					status: "available",
				},
				{
					id: `demo-study-rvg-36-${patientId}`,
					patientId,
					title: "Прицельный снимок зуба 3.6 (периапикальный)",
					kind: "periapical",
					toothCode: "36",
					previewUrl: "/radiology/sample_rvg_tooth36_periapical.jpg",
					viewerUrl: "/radiology/sample_rvg_tooth36_periapical.jpg",
					capturedAt: new Date(Date.now() - 86400000 * 14).toISOString(),
					effectiveDoseMicrosv: 3,
					status: "available",
				},
				{
					id: `demo-study-cbct-${patientId}`,
					patientId,
					title: "3D КЛКТ сегмента верхней челюсти",
					kind: "cbct",
					toothCode: "16",
					previewUrl: "/radiology/sample_rvg_pathology.jpg",
					viewerUrl: "/radiology/kavo_op300_cbct_slice.dcm",
					capturedAt: new Date(Date.now() - 86400000 * 30).toISOString(),
					effectiveDoseMicrosv: 35,
					status: "available",
				},
				{
					id: `demo-study-trg-${patientId}`,
					patientId,
					title: "ТРГ (Телерентгенограмма) боковая",
					kind: "cephalometric",
					toothCode: null,
					previewUrl: "/radiology/sample_trg_cephalogram.jpg",
					viewerUrl: "/radiology/sample_trg_cephalogram.jpg",
					capturedAt: new Date(Date.now() - 86400000 * 60).toISOString(),
					effectiveDoseMicrosv: 12,
					status: "available",
				},
			];
		}
		return [];
	}, [dashboard?.imagingStudies, patientId]);

	const [visibleVisitsLimit, setVisibleVisitsLimit] = useState<number>(DEFAULT_WORKSPACE_PAGE_SIZE);
	const [visiblePlansLimit, setVisiblePlansLimit] = useState<number>(DEFAULT_WORKSPACE_PAGE_SIZE);

	useEffect(() => {
		setVisibleVisitsLimit(DEFAULT_WORKSPACE_PAGE_SIZE);
		setVisiblePlansLimit(DEFAULT_WORKSPACE_PAGE_SIZE);
	}, [patientId]);

	const visitsSlice = useMemo(() => {
		return sliceDomList(patientAppointments ?? [], visibleVisitsLimit, 0);
	}, [patientAppointments, visibleVisitsLimit]);

	const plansSlice = useMemo(() => {
		return sliceDomList(patientPlanItems ?? [], visiblePlansLimit, 0);
	}, [patientPlanItems, visiblePlansLimit]);

	const patientAddendums = useMemo(() => {
		return (dashboard?.documents ?? []).filter(
			(doc) =>
				doc?.patientId === patientId &&
				doc?.kind === "treatment_plan_acceptance" &&
				doc?.status === "issued",
		);
	}, [dashboard?.documents, patientId]);

	const handleOpenVisitCallback = useCallback(
		(visitId: string) => {
			if (onOpenVisit) {
				onOpenVisit(visitId);
			} else {
				window.location.hash = `/patients/${patientId}/visit/${visitId}`;
			}
		},
		[onOpenVisit, patientId],
	);

	const [selectedPlanIdForModal, setSelectedPlanIdForModal] = useState<string | null>(null);
	const [isPlanModalOpen, setIsPlanModalOpen] = useState(false);

	const handleOpenPlanCallback = useCallback(
		(planId: string) => {
			if (onOpenPlan) {
				onOpenPlan(planId);
			} else {
				setSelectedPlanIdForModal(planId);
				setIsPlanModalOpen(true);
			}
		},
		[onOpenPlan],
	);

	const handleCreateNewPlanCallback = useCallback(() => {
		setSelectedPlanIdForModal(null);
		setIsPlanModalOpen(true);
	}, []);

	const [isDmsLetterOpen, setIsDmsLetterOpen] = useState(false);
	const [isDmsRegistryOpen, setIsDmsRegistryOpen] = useState(false);
	const [isLoyaltyModalOpen, setIsLoyaltyModalOpen] = useState(false);
	const [isCbctModalOpen, setIsCbctModalOpen] = useState(false);
	const [isPhotoProtocolOpen, setIsPhotoProtocolOpen] = useState(false);
	const [isOrthoPhotoModalOpen, setIsOrthoPhotoModalOpen] = useState(false);

	useEffect(() => {
		const handleOpenDms = () => setIsDmsLetterOpen(true);
		const handleOpenRegistry = () => setIsDmsRegistryOpen(true);
		window.addEventListener("dente:open-dms-letters", handleOpenDms);
		window.addEventListener("dente:open-dms-registry", handleOpenRegistry);
		return () => {
			window.removeEventListener("dente:open-dms-letters", handleOpenDms);
			window.removeEventListener("dente:open-dms-registry", handleOpenRegistry);
		};
	}, []);

	useEffect(() => {
		if (isDicomModalOpen) {
			useUiSurfaceStore.getState().openPrimaryModal("dicom_viewer");
		} else {
			if (useUiSurfaceStore.getState().primaryModal?.id === "dicom_viewer") {
				useUiSurfaceStore.getState().closePrimaryModal("dicom_viewer");
			}
		}
	}, [isDicomModalOpen]);

	useEffect(() => {
		const handleCloseAll = () => {
			setIsDicomModalOpen(false);
			setSelectedScanForDicom(null);
		};
		window.addEventListener("dente:close-all-surfaces", handleCloseAll);
		return () => {
			window.removeEventListener("dente:close-all-surfaces", handleCloseAll);
		};
	}, []);

	const handleSaveDmsLetter = useCallback(
		async (letter: DmsGuaranteeLetter) => {
			try {
				const isExisting =
					letter.id &&
					!letter.id.startsWith("letter-") &&
					!letter.id.startsWith("gl-");
				const endpoint = isExisting
					? `/api/insurance/guarantee-letters/${letter.id}`
					: "/api/insurance/guarantee-letters";
				const method = isExisting ? "PUT" : "POST";
				const res = await fetch(endpoint, {
					method,
					headers: {
						"Content-Type": "application/json",
						...denteAdminSecretRequestHeaders(),
					},
					body: JSON.stringify(letter),
				});
				if (!res.ok) {
					const errBody = await res.json().catch(() => null);
					throw new Error(
						errBody?.message || `Ошибка сохранения (${res.status})`,
					);
				}
				showToast(
					`Гарантийное письмо № ${letter.letterNumber} (${letter.insurerName}) сохранено в базе данных`,
					"success",
				);
				setIsDmsLetterOpen(false);
			} catch (err: any) {
				showToast(
					err.message || "Не удалось сохранить гарантийное письмо",
					"error",
				);
			}
		},
		[],
	);

	return {
		appLogic,
		dashboard,
		activeTab,
		setActiveTab,
		staffMap,
		patientAppointments,
		patientPlanItems,
		currentPatient,
		patientCardNumber,
		patientBalanceRub,
		patientStudies,
		visibleVisitsLimit,
		setVisibleVisitsLimit,
		visiblePlansLimit,
		setVisiblePlansLimit,
		visitsSlice,
		plansSlice,
		patientAddendums,
		handleOpenVisitCallback,
		handleOpenPlanCallback,
		handleCreateNewPlanCallback,
		selectedPlanIdForModal,
		setSelectedPlanIdForModal,
		isPlanModalOpen,
		setIsPlanModalOpen,
		isDicomModalOpen,
		setIsDicomModalOpen,
		selectedScanForDicom,
		setSelectedScanForDicom,
		isCbctModalOpen,
		setIsCbctModalOpen,
		isPhotoProtocolOpen,
		setIsPhotoProtocolOpen,
		isOrthoPhotoModalOpen,
		setIsOrthoPhotoModalOpen,
		isLoyaltyModalOpen,
		setIsLoyaltyModalOpen,
		isDmsLetterOpen,
		setIsDmsLetterOpen,
		isDmsRegistryOpen,
		setIsDmsRegistryOpen,
		handleSaveDmsLetter,
	};
}
