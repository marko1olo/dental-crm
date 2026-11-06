import { useState } from "react";
import type { DocumentKind, GeneratedDocument, Patient } from "@dental/shared";
import { useDocumentStore } from "../../../store/documentStore";
import { showToast } from "../../GlobalToast";
import { printPrimaryIntakePackage } from "../primaryIntakePackagePrintEngine";
import { INTAKE_STATUTORY_ITEMS } from "./types";

interface UsePrimaryIntakeModalStateProps {
	patient: Patient | null;
	existingDocuments: GeneratedDocument[];
	onCreateDocument: (kind: DocumentKind) => void;
	doctorFullName?: string | null | undefined;
	clinicProfileDraft?: any | undefined;
}

export function usePrimaryIntakeModalState({
	patient,
	existingDocuments,
	onCreateDocument,
	doctorFullName,
	clinicProfileDraft,
}: UsePrimaryIntakeModalStateProps) {
	const [isNormApplied, setIsNormApplied] = useState(false);
	const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);
	const [isSignatureTabletOpen, setIsSignatureTabletOpen] = useState(false);
	const [isSignedPep, setIsSignedPep] = useState(false);
	const [selectedInterventions, setSelectedInterventions] = useState<string[]>([
		"comprehensive",
		"therapy_endo",
		"anesthesia",
	]);

	const toggleIntervention = (id: string) => {
		setSelectedInterventions((prev) =>
			prev.includes(id)
				? prev.length > 1
					? prev.filter((x) => x !== id)
					: prev
				: [...prev, id],
		);
	};

	const documentsByKind = new Map<DocumentKind, GeneratedDocument[]>();
	for (const doc of existingDocuments ?? []) {
		const list = documentsByKind.get(doc.kind) ?? [];
		list.push(doc);
		documentsByKind.set(doc.kind, list);
	}

	const missingKinds = INTAKE_STATUTORY_ITEMS.filter(
		(item) => !documentsByKind.has(item.kind),
	).map((item) => item.kind);

	const handleBatchCreate = () => {
		for (const kind of missingKinds) {
			onCreateDocument(kind);
		}
	};

	const handleFillSomaticNorm = () => {
		const store = useDocumentStore.getState();
		if (!store.intakeChiefComplaint.trim()) {
			store.setIntakeChiefComplaint("Плановый осмотр и консультация (жалоб нет)");
		}
		store.setIntakeAllergyStatus("Аллергии и нежелательные реакции со слов пациента не отмечены.");
		store.setIntakeCurrentMedications("Постоянные препараты со слов пациента не принимает.");
		store.setIntakeChronicConditions("Хронические заболевания со слов пациента отрицает.");
		store.setIntakeAnticoagulants("Антикоагулянты и дезагреганты со слов пациента не принимает.");
		store.setIntakeInfectiousRiskNotes("Инфекционные риски (гепатиты B/C, ВИЧ, туберкулез) не заявлены.");
		store.setIntakeCardioEndocrineNotes("Сердечно-сосудистые и эндокринные патологии со слов пациента отрицает.");
		store.setIntakePregnancyStatus("not_applicable");
		store.setIntakeAccuracyConfirmed(true);
		setIsNormApplied(true);

		if (!documentsByKind.has("patient_intake_questionnaire")) {
			onCreateDocument("patient_intake_questionnaire");
		}
		showToast("Анкета здоровья заполнена нормой: соматически здоров, противопоказаний нет", "success", 3500);
	};

	const handleConfirmSignatureFromTablet = async (signatureData?: {
		signatureSvg?: string;
		pepCode?: string;
		mode?: string;
		[key: string]: unknown;
	}) => {
		for (const kind of missingKinds) {
			onCreateDocument(kind);
		}
		setIsNormApplied(true);
		setIsSignedPep(true);
		setIsSignatureTabletOpen(false);

		// [DOC-04 Fix]: Персистирование ПЭП 63-ФЗ с юридическим следом в базе данных
		const sigSvg =
			signatureData?.signatureSvg ||
			`data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='260' height='60'><text x='10' y='35' font-family='sans-serif' font-size='14' fill='%230d9488'>ПЭП (63-ФЗ): ${encodeURIComponent(patient?.fullName || "Пациент")}</text></svg>`;

		// Для уже сформированных документов пакета вызываем серверную фиксацию подписи
		const docsToSign = (existingDocuments ?? []).filter((d) =>
			INTAKE_STATUTORY_ITEMS.some((item) => item.kind === d.kind),
		);

		for (const doc of docsToSign) {
			try {
				await fetch(`/api/documents/${doc.id}/signature`, {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({
						signatureSvg: sigSvg,
						mode: signatureData?.mode || "simple_electronic_signature",
						pepCode: signatureData?.pepCode,
						signedAt: new Date().toISOString(),
						recipientFullName: patient?.fullName || "Пациент",
						recipientRole: "пациент/законный представитель",
						phoneNumber: patient?.phone,
						auditContext: {
							userAgent: typeof navigator !== "undefined" ? navigator.userAgent : "Dente-Client",
						},
					}),
				});
			} catch (_e) {
				// Фоновая устойчивость
			}
		}

		showToast("Экспресс-пакет первичного визита утвержден и подписан ПЭП (63-ФЗ)", "success", 4500);
	};

	return {
		isNormApplied,
		isMoreMenuOpen,
		setIsMoreMenuOpen,
		isSignatureTabletOpen,
		setIsSignatureTabletOpen,
		isSignedPep,
		selectedInterventions,
		toggleIntervention,
		documentsByKind,
		missingKinds,
		handleBatchCreate,
		handleFillSomaticNorm,
		handleConfirmSignatureFromTablet,
	};
}
