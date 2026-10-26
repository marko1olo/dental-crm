import { useState, useMemo, useCallback } from "react";
import { useAppStore } from "../../../store/appStore";
import type { MedicalCardForm043uData } from "../emr043Types";
import type { MedicalRecordPrintModalProps, RecordTabType } from "./recordModalTypes";
import { DEFAULT_043_DATA, resolveClinicRequisites, applyForm043PhysiologicalNorm } from "../emr043DefaultData";
import {
	validateForm043uCompleteness,
	formatPatientAge,
	calculateDmftIndex,
	calculateCpitnIndex,
} from "../emr043Math";
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

	const [formData, setFormData] = useState<MedicalCardForm043uData>(() => ({
		...DEFAULT_043_DATA,
		...initialData,
		clinic: { ...DEFAULT_043_DATA.clinic, ...resolvedClinic, ...(initialData?.clinic || {}) },
		passport: { ...DEFAULT_043_DATA.passport, ...(initialData?.passport || {}) },
		anamnesis: { ...DEFAULT_043_DATA.anamnesis, ...(initialData?.anamnesis || {}) },
		dentalStatus: { ...DEFAULT_043_DATA.dentalStatus, ...(initialData?.dentalStatus || {}) },
		epicrisis: { ...DEFAULT_043_DATA.epicrisis, ...(initialData?.epicrisis || {}) },
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

	const { handlePrint, handleExportXml, handleExportJson, handleCopyText } = useRecordExports({
		formData,
		effectiveIsDraft,
		setCopiedToast,
	});

	const handleApplyNorm = useCallback(() => {
		setFormData((prev) => {
			const updated = applyForm043PhysiologicalNorm(prev);
			onSave?.(updated);
			return updated;
		});
	}, [onSave]);

	const handleSaveForm = useCallback(() => {
		onSave?.(formData);
	}, [onSave, formData]);

	return {
		formData, setFormData, activeTab, setActiveTab, zoomScale, setZoomScale, isFullscreen, setIsFullscreen,
		copiedToast, isMoreMenuOpen, setIsMoreMenuOpen, isProtocolGeneratorOpen, setIsProtocolGeneratorOpen,
		effectiveIsDraft, validation, dmft, cpitn, ageText, handlePrint, handleExportXml, handleExportJson,
		handleCopyText, handleApplyNorm, handleSaveForm,
	};
}
