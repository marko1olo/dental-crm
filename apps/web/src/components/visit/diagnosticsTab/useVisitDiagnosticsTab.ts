import React, { useEffect, useRef, useState } from "react";
import { useAppLogicContext } from "../../../contexts/AppLogicContext";
import { usePatientStore } from "../../../store/patientStore";
import { useVisitStore } from "../../../store/visitStore";
import {
	type ClinicalPhotoAttachment,
	generatePhotoProtocolAttachmentsStatement,
} from "../../../lib/clinicalProtocols043";
import { isDemoPatientId, isDemoShowcaseMode } from "../../../lib/demoMode";
import { subscribeCbctSyncEvents } from "../../radiology/mpr/cbctStudioSyncChannel";
import { showToast } from "../../GlobalToast";
import { imagingWriteTarget, realVisitFieldId } from "../visitIdentity";
import type {
	DiagnosticStudy,
	DiagnosticTabMode,
	PhotoStageType,
	VisitDiagnosticsTabProps,
} from "./types";

export function useVisitDiagnosticsTab(props?: VisitDiagnosticsTabProps) {
	const ctx = useAppLogicContext();
	const activePatient = props?.activePatient ?? ctx?.activePatient;
	const [diagnosticMode, setDiagnosticMode] = useState<DiagnosticTabMode>("rvg");
	const [isCephModalOpen, setIsCephModalOpen] = useState<boolean>(false);
	const [isRadiologyModalOpen, setIsRadiologyModalOpen] = useState<boolean>(false);
	const [isReportStudioModalOpen, setIsReportStudioModalOpen] = useState<boolean>(false);
	const [isPhotoProtocolModalOpen, setIsPhotoProtocolModalOpen] = useState<boolean>(false);
	const [isCtSelectorModalOpen, setIsCtSelectorModalOpen] = useState<boolean>(false);
	const [isDirectRvgModalOpen, setIsDirectRvgModalOpen] = useState<boolean>(false);
	const [isDicomViewerModalOpen, setIsDicomViewerModalOpen] = useState<boolean>(false);
	const [selectedDicomImageSrc, setSelectedDicomImageSrc] = useState<string | undefined>(undefined);
	const [selected3DScanModelUrl, setSelected3DScanModelUrl] = useState<string | null>(null);
	const [selected3DScanTitle, setSelected3DScanTitle] = useState<string | undefined>(undefined);

	const storeActiveStudy = useVisitStore((s) => s.activeStudy) as DiagnosticStudy | null;
	const setStoreActiveStudy = useVisitStore((s) => s.setActiveStudy);
	const [selectedStudy, setSelectedStudyState] = useState<DiagnosticStudy | null>(storeActiveStudy);

	useEffect(() => {
		if (storeActiveStudy && storeActiveStudy !== selectedStudy) {
			setSelectedStudyState(storeActiveStudy);
		}
	}, [storeActiveStudy, selectedStudy]);

	const setSelectedStudy = (study: DiagnosticStudy | null) => {
		setSelectedStudyState(study);
		setStoreActiveStudy(study);
		if (study?.toothCode && !Number.isNaN(Number(study.toothCode))) {
			useVisitStore.getState().setActiveToothNumber(Number(study.toothCode));
		}
	};

	const [isHotFolderModalOpen, setIsHotFolderModalOpen] = useState<boolean>(false);

	const isOrthoContext =
		String(ctx?.dashboard?.activeDoctor?.specialty || "").toLowerCase().includes("ortho") ||
		String(ctx?.dashboard?.activeDoctor?.specialtyRu || "").toLowerCase().includes("ортодонт");
	const [isAdvancedDiagnosticsOpen, setIsAdvancedDiagnosticsOpen] = useState<boolean>(isOrthoContext);
	const [isCbctMenuOpen, setIsCbctMenuOpen] = useState<boolean>(false);
	const cbctMenuRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		const handleClickOutside = (event: MouseEvent) => {
			if (cbctMenuRef.current && !cbctMenuRef.current.contains(event.target as Node)) {
				setIsCbctMenuOpen(false);
			}
		};
		if (isCbctMenuOpen) {
			document.addEventListener("mousedown", handleClickOutside);
		}
		return () => {
			document.removeEventListener("mousedown", handleClickOutside);
		};
	}, [isCbctMenuOpen]);

	const [photoAttachments, setPhotoAttachments] = useState<ClinicalPhotoAttachment[]>([]);
	const storeActiveToothNumber = useVisitStore((s) => s.activeToothNumber);
	const initialToothNumber =
		storeActiveToothNumber ??
		Number(ctx?.dashboard?.activeVisit?.diagnosisTooth) ??
		16;
	const [selectedToothForPhoto, setSelectedToothForPhoto] = useState<number>(initialToothNumber);
	const [selectedPhotoType, setSelectedPhotoType] = useState<PhotoStageType>("before");
	const [photoComment, setPhotoComment] = useState<string>("");

	const handleAddPhoto = () => {
		const newPhoto: ClinicalPhotoAttachment = {
			id: `photo-${Date.now()}`,
			toothNumber: selectedToothForPhoto || undefined,
			photoType: selectedPhotoType,
			photoUrl: "",
			description: photoComment.trim() || undefined,
			capturedAtIso: new Date().toISOString(),
		};
		const updated = [...photoAttachments, newPhoto];
		setPhotoAttachments(updated);
		setPhotoComment("");

		const statement = generatePhotoProtocolAttachmentsStatement(updated);
		if (props?.onInsertToProtocol) {
			props.onInsertToProtocol(statement);
		} else {
			try {
				window.dispatchEvent(
					new CustomEvent("dente-apply-soap-protocol", {
						detail: {
							soap: {
								treatmentDescription: statement,
							},
							mode: "smart_append",
						},
					}),
				);
			} catch {
				// ignore
			}
		}
	};

	const handleRemovePhoto = (id: string) => {
		const updated = photoAttachments.filter((p) => p.id !== id);
		setPhotoAttachments(updated);
	};

	useEffect(() => {
		const handleAttachPastedPhoto = (e: Event) => {
			const custom = e as CustomEvent<{
				url: string;
				name?: string;
				toothNumber?: string;
				photoType?: PhotoStageType;
				width?: number;
				height?: number;
			}>;
			if (!custom.detail?.url) return;

			const newPhoto: ClinicalPhotoAttachment = {
				id: `photo-pasted-${Date.now()}`,
				toothNumber: (custom.detail.toothNumber ? Number(custom.detail.toothNumber) : selectedToothForPhoto) || undefined,
				photoType: custom.detail.photoType || selectedPhotoType || "before",
				photoUrl: custom.detail.url,
				description: custom.detail.name || "Снимок из буфера обмена (Ctrl+V)",
				capturedAtIso: new Date().toISOString(),
			};
			setPhotoAttachments((prev) => {
				const next = [...prev, newPhoto];
				const statement = generatePhotoProtocolAttachmentsStatement(next);
				if (props?.onInsertToProtocol) {
					props.onInsertToProtocol(statement);
				} else {
					window.dispatchEvent(
						new CustomEvent("dente-apply-soap-protocol", {
							detail: {
								soap: { treatmentDescription: statement },
								mode: "smart_append",
							},
						}),
					);
				}
				return next;
			});
			const isXray = String(custom.detail?.photoType || "") === "xray" || (custom.detail?.name ? custom.detail.name.includes("Рентген") : false);
			showToast(isXray ? "Рентген-снимок с визиографа успешно прикреплен к протоколу" : "Снимок из буфера успешно прикреплен к фотопротоколу", "success", 3000);
		};

		const handleOpenDirectRvg = (e: Event) => {
			const custom = e as CustomEvent<{ imageUrl?: string; tooth?: string }>;
			if (custom.detail?.imageUrl) {
				setSelectedDicomImageSrc(custom.detail.imageUrl);
			}
			setIsDirectRvgModalOpen(true);
		};

		window.addEventListener("dente:attach-photo-to-visit", handleAttachPastedPhoto);
		window.addEventListener("dente:open-direct-rvg", handleOpenDirectRvg);
		return () => {
			window.removeEventListener("dente:attach-photo-to-visit", handleAttachPastedPhoto);
			window.removeEventListener("dente:open-direct-rvg", handleOpenDirectRvg);
		};
	}, [selectedToothForPhoto, selectedPhotoType, props?.onInsertToProtocol]);

	const selectedPatientId = usePatientStore((state) => state.selectedPatientId);
	const setSelectedPatientId = usePatientStore(
		(state) => state.setSelectedPatientId,
	);

	const dashboard = ctx?.dashboard;
	const visitPatientId = realVisitFieldId(dashboard?.activeVisit?.patientId);
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	const patients: any[] = Array.isArray(dashboard?.patients)
		? dashboard.patients
		: [];
	const nameOf = (patientId: string | null): string | null => {
		if (!patientId) return null;
		const found = patients.find((patient) => patient?.id === patientId);
		const fullName =
			typeof found?.fullName === "string" ? found.fullName.trim() : "";
		return fullName || null;
	};
	const visitPatientName =
		nameOf(visitPatientId) ??
		(typeof activePatient?.fullName === "string"
			? activePatient.fullName
			: null);
	const selectedPatientName = nameOf(realVisitFieldId(selectedPatientId));

	const effectiveTargetPatientId = activePatient?.id ?? selectedPatientId;
	const target = imagingWriteTarget(effectiveTargetPatientId, visitPatientId);

	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	const [liveStudies, setLiveStudies] = useState<any[]>([]);

	useEffect(() => {
		const targetId = effectiveTargetPatientId ?? visitPatientId;
		if (!targetId || isDemoPatientId(targetId) || isDemoShowcaseMode()) return;
		let cancelled = false;
		fetch(`/api/imaging/studies?patientId=${encodeURIComponent(targetId)}`)
			.then((res) => (res.ok ? res.json() : []))
			.then((data) => {
				if (!cancelled && Array.isArray(data)) {
					setLiveStudies(data);
				}
			})
			.catch(() => {
				// non-blocking fallback
			});
		return () => {
			cancelled = true;
		};
	}, [effectiveTargetPatientId, visitPatientId]);

	// Inter-tab synchronization with standalone / pop-out CBCT Studio (Zero-Manual-F5)
	useEffect(() => {
		const handleInsertProtocolText = (text: string) => {
			if (!text) return;
			if (props?.onInsertToProtocol) {
				props.onInsertToProtocol(text);
			} else {
				try {
					window.dispatchEvent(
						new CustomEvent("dente-apply-soap-protocol", {
							detail: {
								soap: {
									treatmentDescription: text,
								},
								mode: "smart_append",
							},
						}),
					);
				} catch {
					// non-blocking fallback
				}
			}
		};

		const unsubscribe = subscribeCbctSyncEvents((event) => {
			if (!event) return;
			const currentTargetPatientId = effectiveTargetPatientId ?? visitPatientId;
			if (event.patientId && currentTargetPatientId && event.patientId !== currentTargetPatientId) {
				return;
			}

			if (event.type === "IMPLANT_PLACED") {
				const payload = event.payload as {
					toothFdi?: string | number;
					brand?: string;
					diameterMm?: number;
					lengthMm?: number;
					nerveSafetyMarginMm?: number;
					boneQuality?: string;
					summaryText?: string;
				};
				const summary =
					payload?.summaryText ||
					`[КЛКТ Имплантация] Зуб ${payload?.toothFdi}: ${payload?.brand || "Имплантат"} Ø${payload?.diameterMm || "?"}×${payload?.lengthMm || "?"}мм. Безопасный отступ: ${payload?.nerveSafetyMarginMm ?? "?"}мм. Кость: ${payload?.boneQuality ?? "Misch"}.`;
				handleInsertProtocolText(summary);
				showToast(`Имплантат зуба ${payload?.toothFdi || ""} добавлен в протокол`, "success");
			} else if (event.type === "CALIPER_MEASURED") {
				const payload = event.payload as {
					toothFdi?: string | number;
					ridgeWidthMm?: number;
					crestHeightMm?: number;
					boneDensityHU?: number;
				};
				const note = `[КЛКТ Замер] Зуб ${payload?.toothFdi ?? "гребень"}: ширина ${payload?.ridgeWidthMm} мм, высота ${payload?.crestHeightMm} мм, плотность ${payload?.boneDensityHU ?? "—"} HU.`;
				handleInsertProtocolText(note);
				showToast("Замер гребня перенесен в протокол приёма", "info");
			} else if (event.type === "STUDIO_SNAPSHOT_SAVED") {
				const payload = event.payload as { protocolNote?: string };
				if (payload?.protocolNote) {
					handleInsertProtocolText(payload.protocolNote);
				}
				showToast("Снимок КЛКТ зафиксирован в приёме", "success");
			}
		});

		return () => {
			unsubscribe();
		};
	}, [effectiveTargetPatientId, visitPatientId, props?.onInsertToProtocol]);

	const patientStudies: DiagnosticStudy[] = React.useMemo(() => {
		// biome-ignore lint/suspicious/noExplicitAny: automated suppression
		const all = ((ctx?.dashboard?.imagingStudies && (ctx.dashboard.imagingStudies as any[]).length > 0)
			? ctx.dashboard.imagingStudies
			: liveStudies) as DiagnosticStudy[];
		const targetId = effectiveTargetPatientId ?? visitPatientId;
		// biome-ignore lint/suspicious/noExplicitAny: automated suppression
		const filtered = targetId ? all.filter((s: any) => String(s?.patientId) === String(targetId)) : [];
		if (filtered.length > 0) return filtered;
		if (isDemoShowcaseMode() || isDemoPatientId(targetId)) {
			return [
				{
					id: `demo-visit-rvg-16-${targetId || "demo"}`,
					patientId: targetId || undefined,
					title: "Прицельный снимок зуба 1.6",
					kind: "periapical",
					toothCode: "16",
					previewUrl: "/radiology/sample_rvg_tooth16.jpg",
					viewerUrl: "/radiology/sample_rvg_tooth16.jpg",
					capturedAt: new Date().toISOString(),
					effectiveDoseMicrosv: 2,
					status: "available",
				},
				{
					id: `demo-visit-rvg-36-${targetId || "demo"}`,
					patientId: targetId || undefined,
					title: "Прицельный снимок зуба 3.6 (периапикальный)",
					kind: "periapical",
					toothCode: "36",
					previewUrl: "/radiology/sample_rvg_tooth36_periapical.jpg",
					viewerUrl: "/radiology/sample_rvg_tooth36_periapical.jpg",
					capturedAt: new Date(Date.now() - 86400000).toISOString(),
					effectiveDoseMicrosv: 3,
					status: "available",
				},
				{
					id: `demo-visit-cbct-${targetId || "demo"}`,
					patientId: targetId || undefined,
					title: "3D КЛКТ срез верхней челюсти",
					kind: "cbct",
					toothCode: "16",
					previewUrl: "/radiology/sample_rvg_pathology.jpg",
					viewerUrl: "/radiology/kavo_op300_cbct_slice.dcm",
					capturedAt: new Date(Date.now() - 86400000 * 7).toISOString(),
					effectiveDoseMicrosv: 35,
					status: "available",
				},
				{
					id: `demo-visit-trg-${targetId || "demo"}`,
					patientId: targetId || undefined,
					title: "ТРГ боковая цефалограмма",
					kind: "cephalometric",
					toothCode: null,
					previewUrl: "/radiology/sample_trg_cephalogram.jpg",
					viewerUrl: "/radiology/sample_trg_cephalogram.jpg",
					capturedAt: new Date(Date.now() - 86400000 * 14).toISOString(),
					effectiveDoseMicrosv: 12,
					status: "available",
				},
			];
		}
		return [];
	}, [ctx?.dashboard?.imagingStudies, effectiveTargetPatientId, visitPatientId, liveStudies]);

	return {
		ctx,
		dashboard,
		activePatient,
		visitPatientId,
		visitPatientName,
		selectedPatientName,
		effectiveTargetPatientId,
		target,
		setSelectedPatientId,
		diagnosticMode,
		setDiagnosticMode,
		photoAttachments,
		setPhotoAttachments,
		initialToothNumber,
		selectedToothForPhoto,
		setSelectedToothForPhoto,
		selectedPhotoType,
		setSelectedPhotoType,
		photoComment,
		setPhotoComment,
		handleAddPhoto,
		handleRemovePhoto,
		patientStudies,
		isAdvancedDiagnosticsOpen,
		setIsAdvancedDiagnosticsOpen,
		cbctMenuRef,
		// Modal states
		isCephModalOpen,
		setIsCephModalOpen,
		isRadiologyModalOpen,
		setIsRadiologyModalOpen,
		isReportStudioModalOpen,
		setIsReportStudioModalOpen,
		isPhotoProtocolModalOpen,
		setIsPhotoProtocolModalOpen,
		isCtSelectorModalOpen,
		setIsCtSelectorModalOpen,
		isDirectRvgModalOpen,
		setIsDirectRvgModalOpen,
		isDicomViewerModalOpen,
		setIsDicomViewerModalOpen,
		selectedDicomImageSrc,
		setSelectedDicomImageSrc,
		selected3DScanModelUrl,
		setSelected3DScanModelUrl,
		selected3DScanTitle,
		setSelected3DScanTitle,
		selectedStudy,
		setSelectedStudy,
		isHotFolderModalOpen,
		setIsHotFolderModalOpen,
	};
}
