import { useEffect, useMemo, useState } from "react";
import type { GeneratedDocument } from "@dental/shared";
import { renderForm043uHtml } from "@dental/shared";
import { useAppLogicContext } from "../../../contexts/AppLogicContext";
import {
	DEFAULT_DOM_PAGE_SIZE,
	sliceDomList,
} from "../../../utils/domVirtualizationHelper";
import { printPrimaryIntakePackage } from "../primaryIntakePackagePrintEngine";
import type { DocumentsOutpatientArchiveProps } from "./types";

export function useOutpatientArchiveState({
	patientId,
	onOpenDocument,
	onOpenBlankContract,
	onOpenBlankConsent,
	onOpenBlankForm043,
}: DocumentsOutpatientArchiveProps) {
	// biome-ignore lint/suspicious/noExplicitAny: app logic context
	let appLogic: any = null;
	try {
		appLogic = useAppLogicContext();
	} catch {
		// safe fallback when outside context
	}

	const [searchQuery, setSearchQuery] = useState("");
	const [statusFilter, setStatusFilter] = useState<"all" | "draft" | "issued" | "voided">("all");
	const [activeDropdownDocId, setActiveDropdownDocId] = useState<string | null>(null);
	const [displayLimit, setDisplayLimit] = useState(DEFAULT_DOM_PAGE_SIZE);

	const activePatient = appLogic?.activePatient;
	const activeDoctor = appLogic?.activeDoctor;
	const allDocuments: GeneratedDocument[] = appLogic?.activeDocuments || [];

	const filteredDocuments = useMemo(() => {
		return allDocuments.filter((doc) => {
			if (patientId && doc.patientId !== patientId) return false;
			if (statusFilter !== "all" && doc.status !== statusFilter) return false;
			if (searchQuery.trim()) {
				const q = searchQuery.toLowerCase();
				const title = (doc.title || doc.kind || "").toLowerCase();
				const id = (doc.id || "").toLowerCase();
				return title.includes(q) || id.includes(q);
			}
			return true;
		});
	}, [allDocuments, patientId, statusFilter, searchQuery]);

	useEffect(() => {
		setDisplayLimit(DEFAULT_DOM_PAGE_SIZE);
	}, [patientId, statusFilter, searchQuery]);

	const documentSlice = useMemo(() => {
		return sliceDomList(filteredDocuments, displayLimit, 0);
	}, [filteredDocuments, displayLimit]);

	const getClinicPayload = () => ({
		clinicName: appLogic?.dashboard?.clinicSettings?.profile?.clinicName || "ООО «Денте»",
		legalName: "ООО «Денте»",
		fullName: "ООО «Денте»",
		inn: (appLogic?.dashboard?.organization as { inn?: string } | undefined)?.inn || "",
	});

	const getPatientPayload = () => (activePatient ? {
		fullName: activePatient.fullName || "",
		birthDate: activePatient.birthDate,
		phone: activePatient.phone,
	} : null);

	const handlePrintBlankContract = () => {
		if (onOpenBlankContract) { onOpenBlankContract(); return; }
		printPrimaryIntakePackage({ patient: getPatientPayload(), clinic: getClinicPayload(), doctorFullName: activeDoctor?.fullName || "" });
	};

	const handlePrintBlankConsent = () => {
		if (onOpenBlankConsent) { onOpenBlankConsent(); return; }
		printPrimaryIntakePackage({ patient: getPatientPayload(), clinic: getClinicPayload(), doctorFullName: activeDoctor?.fullName || "" });
	};

	const handlePrintBlankForm043 = () => {
		if (onOpenBlankForm043) { onOpenBlankForm043(); return; }
		if (typeof window !== "undefined") {
			const blankHtml = renderForm043uHtml({
				medicalCardNumber: activePatient?.cardNumber || "__________",
				cardOpenedDate: "«___» _________ 20___ г.",
				patientFullName: activePatient?.fullName || "________________________________________________________",
				patientBirthDate: activePatient?.birthDate || "«___» _________ _____ г.",
				patientPhone: activePatient?.phone || "+7 (___) ___-__-__",
				patientAddressRegistration: "________________________________________________________",
				chiefComplaint: "________________________________________________________",
				historyOfPresentIllness: "________________________________________________________",
				allergologicalHistory: "________________________________________________________",
				concomitantDiseases: "________________________________________________________",
				attendingDoctorFullName: activeDoctor?.fullName || "________________________",
				isClosed: false,
				watermarkText: "ЧЕРНОВИК (БЛАНК)",
			});
			const pw = window.open("", "_blank");
			if (pw) { pw.document.write(blankHtml); pw.document.close(); pw.focus(); pw.print(); }
			else { window.print(); }
		}
	};

	const handleOpenLatest = () => {
		const latest = filteredDocuments[0] || allDocuments[0];
		if (latest) {
			if (onOpenDocument) onOpenDocument(latest.id);
			else if (appLogic?.openIssuedDocumentHtml) appLogic.openIssuedDocumentHtml(latest.id);
		}
	};

	return {
		searchQuery, setSearchQuery, statusFilter, setStatusFilter,
		activeDropdownDocId, setActiveDropdownDocId, displayLimit, setDisplayLimit,
		documentSlice, filteredDocuments, appLogic,
		handlePrintBlankContract, handlePrintBlankConsent, handlePrintBlankForm043, handleOpenLatest,
	};
}
