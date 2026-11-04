import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import { useAppStore } from "../../../store/appStore";
import type { MedicalRecordData, Form043VisitDiaryEntry, ClinicalVisitDiaryEntry } from "../types/recordDataTypes";
import type { MedicalRecordPrintModalProps, RecordTabType } from "./recordModalTypes";
import { DEFAULT_MEDICAL_CARD_DATA, resolveClinicRequisites, applyMedicalCardPhysiologicalNorm } from "../medicalCardCatalogData";
import {
	validateMedicalRecordCompleteness,
	validateForm043uCompleteness,
	formatPatientAge,
	calculateDmftIndex,
	calculateCpitnIndex,
} from "../clinicalDiaryMath";
import { useRecordExports } from "./useRecordExports";

export function useMedicalRecordModal({
	initialData,
	onSave,
	isLocked,
	isDraft,
	status,
}: Pick<MedicalRecordPrintModalProps, "initialData" | "onSave" | "isLocked" | "isDraft" | "status">) {
	const dashboard = useAppStore((s) => s.dashboard);
	const profile = dashboard?.clinicSettings?.profile;
	const staff = dashboard?.clinicSettings?.staff;

	const effectiveIsDraft = Boolean(
		isDraft ||
		isLocked === false ||
		status === "draft" ||
		(initialData as any)?.isLocked === false ||
		(initialData as any)?.status === "draft" ||
		!(isLocked || (initialData as any)?.isLocked || status === "signed" || (initialData as any)?.status === "signed"),
	);

	const resolvedClinic = useMemo(() => resolveClinicRequisites(initialData?.clinic, profile, staff), [initialData?.clinic, profile, staff]);

	const [formData, setFormData] = useState<MedicalRecordData>(() => ({
		...DEFAULT_MEDICAL_CARD_DATA,
		...initialData,
		clinic: { ...DEFAULT_MEDICAL_CARD_DATA.clinic, ...resolvedClinic, ...(initialData?.clinic || {}) },
		passport: { ...DEFAULT_MEDICAL_CARD_DATA.passport, ...(initialData?.passport || {}) },
		anamnesis: { ...DEFAULT_MEDICAL_CARD_DATA.anamnesis, ...(initialData?.anamnesis || {}) },
		dentalStatus: { ...DEFAULT_MEDICAL_CARD_DATA.dentalStatus, ...(initialData?.dentalStatus || {}) },
		epicrisis: { ...DEFAULT_MEDICAL_CARD_DATA.epicrisis, ...(initialData?.epicrisis || {}) },
	}));

	const [activeTab, setActiveTab] = useState<RecordTabType>("overview");
	const [zoomScale, setZoomScale] = useState<number>(1.0);
	const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
	const [copiedToast, setCopiedToast] = useState<boolean>(false);
	const [isMoreMenuOpen, setIsMoreMenuOpen] = useState<boolean>(false);
	const [isProtocolGeneratorOpen, setIsProtocolGeneratorOpen] = useState<boolean>(false);

	const validation = useMemo(() => validateForm043uCompleteness(formData), [formData]);
	const dmft = useMemo(() => calculateDmftIndex(formData.dentalStatus.odontogramTeeth), [formData.dentalStatus.odontogramTeeth]);
	const cpitn = useMemo(() => calculateCpitnIndex(formData.dentalStatus.cpitnIndex), [formData.dentalStatus.cpitnIndex]);
	const ageText = useMemo(() => formatPatientAge(formData.passport.patientBirthDate, formData.passport.cardOpenedDate), [formData.passport.patientBirthDate, formData.passport.cardOpenedDate]);

	// Debounced автосейв всей карты на лету (Мандат 8e: Zero Keystroke Loss)
	const autosaveRef = useRef<ReturnType<typeof setTimeout> | null>(null);
	useEffect(() => {
		if (autosaveRef.current) clearTimeout(autosaveRef.current);
		autosaveRef.current = setTimeout(() => {
			try {
				if (typeof sessionStorage !== "undefined") {
					const draftKey = `dente:medical_card_autosave:${formData.passport.medicalCardNumber || "common"}`;
					sessionStorage.setItem(draftKey, JSON.stringify(formData));
				}
			} catch {}
		}, 800);
		return () => {
			if (autosaveRef.current) clearTimeout(autosaveRef.current);
		};
	}, [formData]);

	const { handlePrint, handleExportXml, handleExportJson, handleCopyText } = useRecordExports({
		formData,
		effectiveIsDraft,
		setCopiedToast,
	});

	const handleApplyNorm = useCallback(() => {
		setFormData((prev) => {
			const updated = applyMedicalCardPhysiologicalNorm(prev);
			onSave?.(updated);
			return updated;
		});
	}, [onSave]);

	const handleSaveForm = useCallback(() => {
		onSave?.(formData);
	}, [onSave, formData]);

	const handleAddDiary = useCallback((newDiary: Form043VisitDiaryEntry) => {
		setFormData((prev) => {
			const updated = {
				...prev,
				visitDiaries: [newDiary, ...prev.visitDiaries],
			};
			onSave?.(updated);
			return updated;
		});
	}, [onSave]);

	const handleDeleteDiary = useCallback((index: number) => {
		setFormData((prev) => {
			const updated = {
				...prev,
				visitDiaries: prev.visitDiaries.filter((_, i) => i !== index),
			};
			onSave?.(updated);
			return updated;
		});
	}, [onSave]);

	return {
		formData, setFormData, activeTab, setActiveTab, zoomScale, setZoomScale, isFullscreen, setIsFullscreen,
		copiedToast, isMoreMenuOpen, setIsMoreMenuOpen, isProtocolGeneratorOpen, setIsProtocolGeneratorOpen,
		effectiveIsDraft, validation, dmft, cpitn, ageText, handlePrint, handleExportXml, handleExportJson,
		handleCopyText, handleApplyNorm, handleSaveForm, handleAddDiary, handleDeleteDiary,
	};
}
