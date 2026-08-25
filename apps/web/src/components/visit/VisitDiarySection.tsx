import {
	Activity,
	AlertTriangle,
	Check,
	Clock,
	FileText,
	Lock,
	Palette,
	Pill,
	Plus,
	Printer,
	Scan,
	Search,
	ShieldCheck,
	Sparkles,
	Stethoscope,
	Syringe,
	X,
} from "lucide-react";
import type React from "react";
import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { DocumentCustomizerModal } from "../documents/DocumentCustomizerModal";
import { PremiumDocumentPrintSheet } from "../documents/PremiumDocumentPrintSheet";
import { denteAdminSecretRequestHeaders } from "../../AppHelpers";
import { useAppLogicContext } from "../../contexts/AppLogicContext";
import {
	ANESTHESIA_QUICK_PRESETS,
	appendRecommendationToSoap,
	CLINICAL_FAST_PRESETS,
	extractSomaticRiskProfileFromText,
	mergeSoapDiaryState,
	PATIENT_RECOMMENDATIONS,
} from "../../lib/clinicalProtocols043";
import { getIcdColor, ICD_GROUP_COLORS, ICD10_DICTIONARY } from "../../lib/icd10";
import { specialtyLabels } from "../../workspaceUiLabels";
import { PanelLoadFailure } from "../PanelLoadFailure";
import { SmartMicrophoneButton } from "../SmartMicrophoneButton";
import { useVisitDiaryLogic } from "../useVisitDiaryLogic";
import {
	type DiaryPrintPhoto,
	VisitDiaryPhotoUpload,
} from "../VisitDiaryPhotoUpload";
import { VisitDiaryTemplateSelector } from "../VisitDiaryTemplateSelector";
import { AnesthesiaCalculator } from "./AnesthesiaCalculator";
import {
	generatePerio043DiaryText,
	derivePeriodontalDiagnosis,
} from "../odontogram/perio043Protocol";
import {
	generatePediatricCariogramDiaryText,
} from "../odontogram/pediatricDentitionEngine";
import { ALL_PERIO_TEETH } from "../odontogram/perioTypes";
import { ClinicalQuickPresetsBar } from "./ClinicalQuickPresetsBar";
import { CryptoProSigner } from "./CryptoProSigner";
import { EgiszCdaExportModal } from "../egisz/EgiszCdaExportModal";
import { PrescriptionModal } from "./PrescriptionModal";
import { RadiologyReferralModal } from "./RadiologyReferralModal";
import { realVisitFieldId } from "./visitIdentity";
import {
	type RadiologySnapshotItem,
	VisitSummaryModal,
} from "./VisitSummaryModal";
import "../../styles/visit-diary-043.css";

export interface VisitDiarySectionProps {
	visitId: string;
	patientId: string;
	teethData?: readonly {
		toothNumber: number;
		state: string;
		surfaces?: readonly string[] | null;
	}[];
}

function formatPersonName(
	p:
		| {
				lastName?: string | null;
				firstName?: string | null;
				middleName?: string | null;
				fullName?: string | null;
		  }
		| null
		| undefined,
): string {
	if (!p) return "—";
	if (typeof p.fullName === "string" && p.fullName.trim())
		return p.fullName.trim();
	const parts = [p.lastName, p.firstName, p.middleName]
		.map((x) => (typeof x === "string" ? x.trim() : ""))
		.filter(Boolean);
	return parts.length ? parts.join(" ") : "—";
}

export const VisitDiarySection: React.FC<VisitDiarySectionProps> = ({
	visitId,
	patientId,
	teethData = [],
}) => {
	const {
		diary,
		setDiary,
		diaryId,
		loadState,
		loadStateText,
		diarySubject,
		reloadDiary,
		isLocked,
		lockedAt,
		diaryHash,
		hasCryptoSignature,
		diaryDoctorFullName,
		diaryDoctorSpecialty,
		lastSavedAt,
		revisionCount,
		diaryRevisions,
		isSaving,
		showScanner,
		setShowScanner,
		trayBarcode,
		setTrayBarcode,
		clearTrayBarcode,
		assignTrayBarcode,
		showIcdDropdown,
		setShowIcdDropdown,
		icdSearch,
		setIcdSearch,
		showPreview,
		setShowPreview,
		doSave,
		ensureDraftSavedForSigning,
		doLock,
		isRevising,
		revisionReason,
		setRevisionReason,
		isRevisingBusy,
		beginRevise,
		cancelRevise,
		doRevise,
		icdRef,
		populateFromOdontogram,
		applyAnesthesiaPreset,
		applyClinicalPreset,
		scheduleDebouncedSave,
		pendingSoapSuggestion,
		applyPendingSoapSuggestion,
		dismissPendingSoapSuggestion,
	} = useVisitDiaryLogic(visitId, patientId);

	const [printPhotos, setPrintPhotos] = useState<readonly DiaryPrintPhoto[]>([]);
	const [showSummaryModal, setShowSummaryModal] = useState(false);
	const [showPrescriptionModal, setShowPrescriptionModal] = useState(false);
	const [showRadiologyReferralModal, setShowRadiologyReferralModal] =
		useState(false);
	const [showEgiszModal, setShowEgiszModal] = useState(false);
	const [showBrandingCustomizer, setShowBrandingCustomizer] = useState(false);
	const [activeTeeth, setActiveTeeth] = useState<
		readonly {
			toothNumber: number;
			state: string;
			surfaces?: readonly string[] | null;
		}[]
	>(teethData ?? []);

	useEffect(() => {
		if (teethData && teethData.length > 0) {
			setActiveTeeth(teethData);
			return;
		}
		if (!patientId) return;
		let cancelled = false;
		fetch(`/api/patients/${patientId}/tooth-states`, {
			headers: denteAdminSecretRequestHeaders(),
		})
			.then((r) => (r.ok ? r.json() : null))
			.then((data) => {
				if (!cancelled && data?.success && Array.isArray(data.states)) {
					setActiveTeeth(data.states);
				}
			})
			.catch(() => {});
		return () => {
			cancelled = true;
		};
	}, [patientId, teethData]);

	const [radiologySnapshots, setRadiologySnapshots] = useState<
		readonly RadiologySnapshotItem[]
	>([]);

	useEffect(() => {
		if (!patientId) return;
		let cancelled = false;
		fetch(`/api/xray/scans?patientId=${encodeURIComponent(patientId)}`, {
			headers: denteAdminSecretRequestHeaders(),
		})
			.then((r) => (r.ok ? r.json() : null))
			.then((data) => {
				if (!cancelled && Array.isArray(data)) {
					const mapped: RadiologySnapshotItem[] = data
						.map((s: Record<string, unknown>) => {
							const imgUri =
								typeof s.imageDataUri === "string"
									? s.imageDataUri
									: typeof s.imageBase64 === "string"
										? s.imageBase64
										: "";
							const thumbUri =
								typeof s.thumbnailDataUri === "string"
									? s.thumbnailDataUri
									: imgUri;
							return {
								id: typeof s.id === "string" ? s.id : undefined,
								imageDataUri: imgUri,
								thumbnailDataUri: thumbUri,
								title:
									typeof s.aiSummary === "string"
										? s.aiSummary
										: typeof s.originalFilename === "string"
											? s.originalFilename
											: "Рентгенологический снимок",
								kind: typeof s.kind === "string" ? s.kind : undefined,
								toothCode:
									typeof s.toothCode === "string" ? s.toothCode : undefined,
								capturedAt:
									typeof s.capturedAt === "string"
										? s.capturedAt
										: typeof s.createdAt === "string"
											? s.createdAt
											: undefined,
								radiologicalFinding:
									typeof s.aiReport === "string" ? s.aiReport : undefined,
							};
						})
						.filter((item) => Boolean(item.imageDataUri));
					setRadiologySnapshots(mapped);
				}
			})
			.catch(() => {});
		return () => {
			cancelled = true;
		};
	}, [patientId]);

	const handlePrintPhotosChange = useCallback(
		(photos: readonly DiaryPrintPhoto[]) => {
			setPrintPhotos(photos);
		},
		[],
	);

	const diaryUnread =
		loadState.phase === "loading" || loadState.phase === "failed";
	const fieldsDisabled = diaryUnread || (isLocked && !isRevising);

	const ctx = useAppLogicContext();
	const activePatient = ctx.activePatient;
	const clinicSettings = ctx.dashboard?.clinicSettings;
	const activeDoctor = ctx.activeDoctor;

	const selectedPatientId = realVisitFieldId(
		activePatient && typeof activePatient === "object"
			? (activePatient as { id?: unknown }).id
			: null,
	);
	const diaryPatientId = realVisitFieldId(patientId);
	const printPatient =
		diaryPatientId && selectedPatientId && selectedPatientId === diaryPatientId
			? activePatient
			: null;
	const printPatientMismatch = Boolean(
		diaryPatientId && selectedPatientId && selectedPatientId !== diaryPatientId,
	);

	const patientFullName = formatPersonName(printPatient);
	const patientBirthDate =
		typeof printPatient?.birthDate === "string"
			? printPatient.birthDate
			: typeof printPatient?.dateOfBirth === "string"
				? printPatient.dateOfBirth
				: "";
	const patientCardNumber =
		typeof printPatient?.cardNumber === "string"
			? printPatient.cardNumber
			: typeof printPatient?.medicalCardNumber === "string"
				? printPatient.medicalCardNumber
				: typeof printPatient?.chartNumber === "string"
					? printPatient.chartNumber
					: "";

	const patientPassport =
		typeof (printPatient as any)?.administrativeProfile?.identityDocument ===
			"string" &&
		(printPatient as any).administrativeProfile.identityDocument.trim()
			? (printPatient as any).administrativeProfile.identityDocument.trim()
			: typeof (printPatient as any)?.passport === "string" &&
					(printPatient as any).passport.trim()
				? (printPatient as any).passport.trim()
				: typeof (printPatient as any)?.identityDocument === "string" &&
						(printPatient as any).identityDocument.trim()
					? (printPatient as any).identityDocument.trim()
					: "";

	const patientOms =
		typeof (printPatient as any)?.administrativeProfile?.omsPolis ===
			"string" &&
		(printPatient as any).administrativeProfile.omsPolis.trim()
			? (printPatient as any).administrativeProfile.omsPolis.trim()
			: typeof (printPatient as any)?.administrativeProfile
						?.insurancePolicyNumber === "string" &&
					(printPatient as any).administrativeProfile.insurancePolicyNumber.trim()
				? (
						printPatient as any
					).administrativeProfile.insurancePolicyNumber.trim()
				: typeof (printPatient as any)?.omsPolis === "string" &&
						(printPatient as any).omsPolis.trim()
					? (printPatient as any).omsPolis.trim()
					: typeof (printPatient as any)?.insurancePolicyNumber === "string" &&
							(printPatient as any).insurancePolicyNumber.trim()
						? (printPatient as any).insurancePolicyNumber.trim()
						: "";

	const patientSnils =
		typeof (printPatient as any)?.administrativeProfile?.snils === "string" &&
		(printPatient as any).administrativeProfile.snils.trim()
			? (printPatient as any).administrativeProfile.snils.trim()
			: typeof (printPatient as any)?.snils === "string" &&
					(printPatient as any).snils.trim()
				? (printPatient as any).snils.trim()
				: "";

	const patientPhone =
		typeof (printPatient as any)?.phone === "string" &&
		(printPatient as any).phone.trim()
			? (printPatient as any).phone.trim()
			: "";

	const patientAddress =
		typeof (printPatient as any)?.administrativeProfile?.registrationAddress ===
			"string" &&
		(printPatient as any).administrativeProfile.registrationAddress.trim()
			? (printPatient as any).administrativeProfile.registrationAddress.trim()
			: typeof (printPatient as any)?.address === "string" &&
					(printPatient as any).address.trim()
				? (printPatient as any).address.trim()
				: "";

	const printBlockedReason = diaryUnread
		? "Печать недоступна, пока записи приёма не прочитаны"
		: isRevising
			? "Печать недоступна, пока идёт правка подписанного дневника. Сохраните правку или нажмите «Отмена»."
			: !isLocked
				? "Печать формы 043/у доступна после подписи дневника"
				: printPatientMismatch
					? "Печать 043/у заблокирована: в разделе «Пациенты» выбран другой человек. Верните выбор на пациента приёма."
					: undefined;
	const printBlocked = Boolean(printBlockedReason);

	const clinicName =
		typeof clinicSettings?.name === "string"
			? clinicSettings.name
			: typeof clinicSettings?.clinicName === "string"
				? clinicSettings.clinicName
				: "";
	const clinicAddress =
		typeof clinicSettings?.address === "string" ? clinicSettings.address : "";
	const clinicInn =
		typeof clinicSettings?.inn === "string" ? clinicSettings.inn : "";

	const sessionDoctorName = formatPersonName(activeDoctor);
	const sessionDoctorSpecialty = (() => {
		const raw = Array.isArray(activeDoctor?.specialties)
			? activeDoctor.specialties
			: [];
		const codes = raw
			.map((x: unknown) => (typeof x === "string" ? x.trim() : ""))
			.filter(Boolean);
		const meaningful = codes.filter((c: string) => c !== "universal");
		const list = meaningful.length > 0 ? meaningful : codes;
		return list
			.map(
				(c: string) => specialtyLabels[c as keyof typeof specialtyLabels] ?? c,
			)
			.join(", ");
	})();
	const doctorName = diaryDoctorFullName?.trim()
		? diaryDoctorFullName.trim()
		: sessionDoctorName;
	const doctorSpecialty = diaryDoctorSpecialty?.trim()
		? diaryDoctorSpecialty.trim()
		: sessionDoctorSpecialty;

	const handleIcdSelect = (code: string) => {
		setDiary((prev) => ({ ...prev, diagnosisIcd10: code }));
		setIcdSearch(code);
		setShowIcdDropdown(false);
		scheduleDebouncedSave();
	};

	const commitIcdInput = () => {
		const typed = (icdSearch ?? "").trim();
		if (!typed) return;
		const normalized = typed.toUpperCase();
		const exact = (ICD10_DICTIONARY ?? []).find(
			(item) => (item?.code ?? "").toUpperCase() === normalized,
		);
		const candidate = exact ?? filteredIcd?.[0];
		if (candidate?.code) handleIcdSelect(candidate.code);
	};

	const normalizeRu = (str: string) =>
		(str ?? "").toLowerCase().replace(/ё/g, "е").trim();
	const searchNormalized = normalizeRu(icdSearch ?? "");
	const searchTokens = searchNormalized.split(/\s+/).filter(Boolean);

	const filteredIcd = (ICD10_DICTIONARY ?? [])
		.filter((i) => {
			if (!i) return false;
			if (searchTokens.length === 0) return true;
			const codeNorm = normalizeRu(i.code);
			const labelNorm = normalizeRu(i.label);
			const groupNorm = normalizeRu(i.group);
			return searchTokens.every(
				(token) =>
					codeNorm.includes(token) ||
					labelNorm.includes(token) ||
					groupNorm.includes(token),
			);
		})
		.slice(0, 12);

	const handleAutoResize = (
		e:
			| React.ChangeEvent<HTMLTextAreaElement>
			| React.FocusEvent<HTMLTextAreaElement>,
	) => {
		e.target.style.height = "auto";
		e.target.style.height = `${e.target.scrollHeight}px`;
	};

	const handleInsertPerioStatus = () => {
		const defaultPerioTeeth = ALL_PERIO_TEETH.map((toothNumber) => ({
			toothNumber,
			isMissing: activeTeeth.some(
				(t) =>
					t.toothNumber === toothNumber &&
					(t.state === "Missing" || t.state === "Extracted"),
			),
			isImplant: activeTeeth.some(
				(t) => t.toothNumber === toothNumber && t.state === "Implant",
			),
			mobility: 0 as const,
			furcation: 0 as const,
			distoBuccal: {
				probingDepthMm: 2,
				gingivalMarginMm: 0,
				bleedingOnProbing: false,
				plaque: false,
				suppuration: false,
				calculus: false,
			},
			midBuccal: {
				probingDepthMm: 2,
				gingivalMarginMm: 0,
				bleedingOnProbing: false,
				plaque: false,
				suppuration: false,
				calculus: false,
			},
			mesioBuccal: {
				probingDepthMm: 2,
				gingivalMarginMm: 0,
				bleedingOnProbing: false,
				plaque: false,
				suppuration: false,
				calculus: false,
			},
			distoLingual: {
				probingDepthMm: 2,
				gingivalMarginMm: 0,
				bleedingOnProbing: false,
				plaque: false,
				suppuration: false,
				calculus: false,
			},
			midLingual: {
				probingDepthMm: 2,
				gingivalMarginMm: 0,
				bleedingOnProbing: false,
				plaque: false,
				suppuration: false,
				calculus: false,
			},
			mesioLingual: {
				probingDepthMm: 2,
				gingivalMarginMm: 0,
				bleedingOnProbing: false,
				plaque: false,
				suppuration: false,
				calculus: false,
			},
		}));

		const perioText = generatePerio043DiaryText(
			defaultPerioTeeth,
			undefined,
			{ doctorName },
		);
		const perioDiag = derivePeriodontalDiagnosis(defaultPerioTeeth);

		setDiary((prev) => ({
			...prev,
			diagnosisIcd10: prev.diagnosisIcd10 || perioDiag.icd10Code,
			statusLocalis: prev.statusLocalis
				? `${prev.statusLocalis}\n\n${perioText}`
				: perioText,
			treatmentDescription: prev.treatmentDescription
				? `${prev.treatmentDescription}\n\n• Профессиональная гигиена полости рта (УЗ + AirFlow).\n• Пародонтальный скрининг PSR и контрольный осмотр через 6 месяцев.`
				: "• Профессиональная гигиена полости рта (УЗ + AirFlow).\n• Пародонтальный скрининг PSR.\n• Контролируемая индивидуальная гигиена полости рта.",
		}));

		if (!diary.diagnosisIcd10 && perioDiag.icd10Code) {
			setIcdSearch(perioDiag.icd10Code);
		}
		scheduleDebouncedSave();
	};

	const handleInsertPediatricStatus = () => {
		const patientAgeYears = patientBirthDate
			? Math.floor(
					(Date.now() - new Date(patientBirthDate).getTime()) /
						(365.25 * 24 * 3600 * 1000),
				)
			: 8;

		const teethStatesMap = activeTeeth.reduce(
			(acc, t) => ({ ...acc, [t.toothNumber]: t.state }),
			{} as Record<number, string>,
		);

		const pediatricText = generatePediatricCariogramDiaryText({
			patientAgeYears: Math.max(1, Math.min(18, patientAgeYears || 8)),
			teethStates: teethStatesMap,
		});

		setDiary((prev) => ({
			...prev,
			diagnosisIcd10: prev.diagnosisIcd10 || "Z01.2",
			statusLocalis: prev.statusLocalis
				? `${prev.statusLocalis}\n\n${pediatricText}`
				: pediatricText,
			treatmentDescription: prev.treatmentDescription
				? `${prev.treatmentDescription}\n\n• Комплексная детская профгигиена и ремотерапия (GC Tooth Mousse).\n• Неинвазивная герметизация фиссур постоянных моляров (16, 26, 36, 46).`
				: "• Комплексная детская профгигиена и ремотерапия (GC Tooth Mousse).\n• Неинвазивная герметизация фиссур первых постоянных моляров (16, 26, 36, 46).\n• Обучение гигиене и подбор детской фторсодержащей пасты (1000 ppm F-).",
		}));

		if (!diary.diagnosisIcd10) {
			setIcdSearch("Z01.2");
		}
		scheduleDebouncedSave();
	};

	const icdEntry = (ICD10_DICTIONARY ?? []).find(
		(i) => i?.code === diary?.diagnosisIcd10,
	);

	const PrintPreviewContent = (
		<div
			className="vde-043-print-overlay print-layer"
			data-testid="form-043-preview"
			role="dialog"
			aria-modal="true"
			aria-label="Медицинская карта Форма 043/у"
		>
			<div className="vde-043-print-sheet print-content">
				<div className="vde-043-print-toolbar no-print flex items-center justify-between gap-2 p-3 bg-[var(--paper-soft)] border-b border-[var(--line)]">
					<div className="flex items-center gap-2">
						<Printer className="w-5 h-5 text-[var(--teal)]" />
						<h3 className="text-sm font-bold m-0">
							Печатная форма 043/у (Приказ МЗ РФ № 834н)
						</h3>
					</div>
					<div className="flex items-center gap-2">
						<button
							type="button"
							onClick={() => setShowBrandingCustomizer(true)}
							className="vde-043__btn text-xs"
							title="Настроить оформление бланка, цвета и реквизиты"
						>
							<Palette className="w-4 h-4 text-amber-500" />
							<span>Настроить бланк</span>
						</button>
						<button
							type="button"
							onClick={() => window.print()}
							disabled={printBlocked}
							title={printBlockedReason}
							className="vde-043__btn vde-043__btn--primary text-xs font-bold"
							data-testid="form-043-print"
						>
							<Printer className="w-4 h-4" /> Напечатать (Ctrl+P)
						</button>
						<button
							type="button"
							onClick={() => setShowPreview(false)}
							className="vde-043__btn vde-043__btn--ghost text-xs"
							data-testid="form-043-close"
						>
							<X className="w-4 h-4" /> Закрыть
						</button>
					</div>
				</div>

				<div className="vde-043-print-body" id="print-043">
					<PremiumDocumentPrintSheet
						documentTitle="МЕДИЦИНСКАЯ КАРТА СТОМАТОЛОГИЧЕСКОГО ПАЦИЕНТА"
						documentSubtitle="Форма № 043/у (Утверждена Приказом Минздрава России № 834н)"
						patient={{
							fullName: patientFullName !== "—" ? patientFullName : null,
							birthDate: patientBirthDate || null,
							medicalCardNumber: patientCardNumber || null,
							passport: patientPassport || null,
							omsPolis: patientOms || null,
							snils: patientSnils || null,
							phone: patientPhone || null,
							address: patientAddress || null,
						}}
						doctorName={doctorName !== "—" ? doctorName : null}
						doctorSpecialty={doctorSpecialty || null}
						visitDate={lastSavedAt || new Date()}
						diary={diary}
						icd10Label={icdEntry ? icdEntry.label : null}
						teethData={activeTeeth as any}
						radiologySnapshots={radiologySnapshots}
						diaryHash={diaryHash}
						hasCryptoSignature={hasCryptoSignature}
						lockedAt={lockedAt}
						revisionCount={revisionCount}
					/>
				</div>
			</div>
		</div>
	);

	return (
		<div
			className="vde-043 no-print"
			data-testid="visit-diary-editor"
			data-form="043u"
		>
			<div className="vde-043__glow" aria-hidden="true" />

			{/* ── Header ── */}
			<div className="vde-043__header">
				<div className="vde-043__title-row">
					<div className="vde-043__icon-badge">
						<Activity className="w-5 h-5" />
					</div>
					<div>
						<h2 className="vde-043__title">
							Клинический дневник SOAP · Форма 043/у
						</h2>
						<div className="vde-043__meta">
							{lastSavedAt && (
								<span className="vde-043__meta-item">
									<Clock className="w-3 h-3" />
									Сохранено{" "}
									{lastSavedAt.toLocaleTimeString("ru-RU", {
										hour: "2-digit",
										minute: "2-digit",
									})}
								</span>
							)}
							{revisionCount > 0 && (
								<span className="vde-043__meta-item vde-043__meta-rev">
									<ShieldCheck className="w-3 h-3" />
									{revisionCount} ревиз.
								</span>
							)}
						</div>
					</div>
				</div>

				<div className="vde-043__actions">
					<button
						type="button"
						data-testid="diary-summary-btn"
						onClick={() => setShowSummaryModal(true)}
						className="vde-043__btn"
						title="Открыть клиническую сводку приёма"
					>
						<FileText className="w-4 h-4 text-[var(--teal)]" />
						Сводка
					</button>
					<button
						type="button"
						data-testid="open-prescription-btn"
						onClick={() => setShowPrescriptionModal(true)}
						className="vde-043__btn"
						title="Выписать рецептурный бланк (Форма № 107-1/у по Приказу 1094н)"
					>
						<Pill className="w-4 h-4 text-blue-500" />
						Рецепт (107-1/у)
					</button>
					<button
						type="button"
						data-testid="open-radiology-referral-btn"
						onClick={() => setShowRadiologyReferralModal(true)}
						className="vde-043__btn"
						title="Сформировать направление на КЛКТ / ОПТГ / ТРГ"
					>
						<Scan className="w-4 h-4 text-[var(--teal,var(--brand-primary))]" />
						Направление КЛКТ/ОПТГ
					</button>
					<button
						type="button"
						data-testid="open-egisz-semd-btn"
						onClick={() => setShowEgiszModal(true)}
						className="vde-043__btn"
						title="Экспорт и валидация СЭМД ЕГИСЗ (HL7 CDA R2)"
					>
						<ShieldCheck className="w-4 h-4 text-[var(--ok-fg)]" />
						СЭМД ЕГИСЗ
					</button>
					<button
						type="button"
						data-testid="open-branding-customizer-btn"
						onClick={() => setShowBrandingCustomizer(true)}
						className="vde-043__btn"
						title="Настроить фирменный бланк клиники, цвета, логотип и реквизиты"
					>
						<Palette className="w-4 h-4 text-amber-500" />
						Бланк и стиль
					</button>
					<button
						type="button"
						id="diary-print-btn"
						data-testid="diary-print-043"
						onClick={() => setShowPreview(true)}
						disabled={printBlocked}
						className="vde-043__btn vde-043__btn--print"
						title={printBlockedReason}
					>
						<Printer className="w-4 h-4" /> Печать 043/у
					</button>
					{isLocked ? (
						isRevising ? (
							<span className="vde-043__badge vde-043__badge--revise">
								<AlertTriangle className="w-4 h-4" /> ПРАВКА
							</span>
						) : (
							<span className="vde-043__badge vde-043__badge--locked">
								<Lock className="w-4 h-4" /> ПОДПИСАНО
							</span>
						)
					) : (
						!diaryUnread && (
							<VisitDiaryTemplateSelector
								isLocked={isLocked}
								// biome-ignore lint/suspicious/noExplicitAny: template handler
								onSelectTemplate={(tmpl: any) => {
									setDiary((prev) =>
										mergeSoapDiaryState(
											prev,
											{
												anamnesis: tmpl.prefilledAnamnesis,
												statusLocalis: tmpl.prefilledObjective,
												treatmentDescription: tmpl.prefilledTreatment,
												diagnosisIcd10: tmpl.defaultIcd10,
											},
											{ strategy: "smart_append" },
										),
									);
									if (tmpl.defaultIcd10) {
										setIcdSearch(tmpl.defaultIcd10);
									}
									scheduleDebouncedSave();
								}}
							/>
						)
					)}
				</div>
			</div>

			{/* ── 1-Click Fast Clinical Presets Bar ── */}
			{!fieldsDisabled && (
				<div
					className="flex flex-col gap-2 p-3.5 rounded-xl border border-[var(--line)] bg-[var(--paper-soft)]"
					data-testid="fast-clinical-presets-bar"
				>
					<div className="flex items-center justify-between gap-2 flex-wrap">
						<span className="text-xs font-bold text-[var(--muted)] uppercase tracking-wider flex items-center gap-1.5">
							<Sparkles className="w-3.5 h-3.5 text-[var(--teal)]" />
							1-Click Клинические протоколы:
						</span>
						{activeTeeth && activeTeeth.length > 0 && (
							<button
								type="button"
								onClick={() => populateFromOdontogram(activeTeeth)}
								className="inline-flex items-center gap-1.5 px-4 py-2.5 min-h-[48px] rounded-xl bg-[var(--teal-surface)] text-[var(--teal-dark)] hover:bg-[var(--teal-soft)] border border-[var(--teal)] text-xs sm:text-sm font-bold transition-colors shadow-xs touch-manipulation min-w-0 break-words cursor-pointer"
								title="Сформировать структурированный дневник SOAP из отметок на зубной формуле"
								data-testid="populate-diary-from-odontogram-btn"
							>
								<span className="shrink-0 text-base">🦷</span>
								<span className="min-w-0 break-words">Заполнить дневник из формулы</span>
							</button>
						)}
					</div>
					<div className="flex items-center gap-2 overflow-x-auto whitespace-nowrap pb-1 scrollbar-none overscroll-x-contain min-w-0">
						<button
							type="button"
							onClick={handleInsertPerioStatus}
							className="inline-flex items-center gap-1.5 px-4 py-2.5 min-h-[48px] rounded-xl bg-[var(--ok-bg)] hover:opacity-90 text-[var(--ok-fg)] border border-[var(--ok-fg)]/30 text-xs sm:text-sm font-bold transition-all shrink-0 shadow-xs touch-manipulation min-w-0 break-words cursor-pointer"
							title="Вставить протокол пародонтологического обследования PSR и индексы 043/у (AAP/EFP 2018)"
							data-testid="insert-perio-043-btn"
						>
							<span className="font-mono text-xs px-1.5 py-0.5 rounded-md bg-[var(--ok-bg)] text-[var(--ok-fg)] border border-[var(--ok-fg)]/30 font-black shrink-0">
								PSR
							</span>
							<Activity className="w-4 h-4 text-[var(--ok-fg)] shrink-0" />
							<span className="min-w-0 break-words">Пародонтологический статус (PSR + 043/у)</span>
						</button>
						<button
							type="button"
							onClick={handleInsertPediatricStatus}
							className="inline-flex items-center gap-1.5 px-4 py-2.5 min-h-[48px] rounded-xl bg-purple-500/10 hover:bg-purple-500/20 text-purple-800 dark:text-purple-300 border border-purple-500/30 text-xs sm:text-sm font-bold transition-all shrink-0 shadow-xs touch-manipulation hover:border-purple-500 min-w-0 break-words cursor-pointer"
							title="Вставить протокол сменного прикуса, физиологической резорбции корней и Кариограммы Bratthall"
							data-testid="insert-pediatric-cariogram-btn"
						>
							<span className="font-mono text-xs px-1.5 py-0.5 rounded-md bg-purple-500/20 text-purple-700 dark:text-purple-200 font-black shrink-0">
								ДЕТИ
							</span>
							<Sparkles className="w-4 h-4 text-purple-600 shrink-0" />
							<span className="min-w-0 break-words">Сменный прикус (резорбция + кариограмма)</span>
						</button>
						{CLINICAL_FAST_PRESETS.map((preset) => (
							<button
								key={preset.id}
								type="button"
								onClick={() => applyClinicalPreset(preset.id)}
								className="inline-flex items-center gap-1.5 px-4 py-2.5 min-h-[48px] rounded-xl bg-[var(--paper)] hover:bg-[var(--paper-strong)] border border-[var(--line)] text-xs sm:text-sm font-bold text-[var(--ink)] hover:border-[var(--teal)] transition-all shrink-0 shadow-xs touch-manipulation min-w-0 break-words cursor-pointer"
								title={preset.description}
								data-testid={`preset-btn-${preset.id}`}
							>
								<span className="font-mono text-xs px-1.5 py-0.5 rounded-md bg-[var(--teal-surface)] text-[var(--teal-dark)] font-black shrink-0">
									{preset.badge}
								</span>
								<span className="min-w-0 break-words">{preset.label}</span>
							</button>
						))}
					</div>
					<details className="mt-1 text-xs">
						<summary className="cursor-pointer font-bold text-[var(--muted)] hover:text-[var(--ink)]">
							Все клинические протоколы по категориям...
						</summary>
						<div className="pt-2">
							<ClinicalQuickPresetsBar
								isLocked={fieldsDisabled}
								onSelectPreset={(preset) => {
									setDiary((prev) =>
										mergeSoapDiaryState(
											prev,
											{
												anamnesis: preset.anamnesis,
												statusLocalis: preset.statusLocalis,
												diagnosisIcd10: preset.icd10,
												treatmentDescription: preset.treatmentDescription,
											},
											{ strategy: "smart_append" },
										),
									);
									if (preset.icd10) setIcdSearch(preset.icd10);
									scheduleDebouncedSave();
								}}
							/>
						</div>
					</details>
				</div>
			)}

			{/* ── Anesthesia Quick Logger Bar & Calculator ── */}
			{!fieldsDisabled && (
				<div
					className="flex flex-col gap-2 p-3 rounded-xl border border-[var(--line)] bg-[var(--paper-soft)]"
					data-testid="anesthesia-quick-logger-bar"
				>
					<div className="flex flex-col sm:flex-row sm:items-center gap-2.5">
						<span className="text-xs font-bold text-[var(--muted)] uppercase tracking-wider flex items-center gap-1.5 shrink-0">
							<Syringe className="w-4 h-4 text-blue-500 shrink-0" />
							Анестезия:
						</span>
						<div className="flex items-center gap-2 overflow-x-auto whitespace-nowrap pb-1 sm:pb-0 scrollbar-none flex-1 overscroll-x-contain min-w-0">
							{ANESTHESIA_QUICK_PRESETS.map((ane) => (
								<button
									key={ane.id}
									type="button"
									onClick={() => applyAnesthesiaPreset(ane.textToInsert)}
									className="inline-flex items-center gap-1.5 px-3.5 py-2.5 min-h-[48px] rounded-xl bg-[var(--paper)] hover:bg-blue-500/10 border border-[var(--line)] hover:border-blue-500/30 text-xs sm:text-sm font-bold text-[var(--ink)] transition-colors shrink-0 touch-manipulation min-w-0 break-words cursor-pointer"
									title={ane.textToInsert}
									data-testid={`anesthesia-btn-${ane.id}`}
								>
									<Plus className="w-3.5 h-3.5 text-blue-500 shrink-0" />
									<span className="min-w-0 break-words">{ane.label}</span>
									<span className="text-xs text-[var(--muted)] shrink-0 font-normal">
										({ane.volume})
									</span>
								</button>
							))}
						</div>
					</div>
					<details className="mt-0.5 text-xs">
						<summary className="cursor-pointer font-medium text-[var(--muted)] hover:text-[var(--ink)]">
							Калькулятор дозировок анестезии и карпул...
						</summary>
						<div className="pt-2">
							<AnesthesiaCalculator
								isLocked={fieldsDisabled}
								{...(diary.diagnosisTooth ? { defaultToothNumber: diary.diagnosisTooth } : {})}
								initialSomaticProfile={extractSomaticRiskProfileFromText(diary.comorbidities)}
								onApplyToDiary={(text) => {
									applyAnesthesiaPreset(text);
								}}
							/>
						</div>
					</details>
				</div>
			)}

			{/* ── Load States ── */}
			{loadState.phase === "loading" && loadStateText && (
				<div
					className="vde-043__load-banner"
					data-testid="diary-load-loading"
					role="status"
					aria-live="polite"
				>
					<div className="font-semibold">{loadStateText.title}</div>
					{loadStateText.hint ? (
						<div className="mt-0.5">{loadStateText.hint}</div>
					) : null}
				</div>
			)}
			{loadState.phase === "failed" && (
				<div
					className="vde-043__load-banner"
					data-testid="diary-load-failed"
				>
					<PanelLoadFailure
						subject={diarySubject}
						status={loadState.status}
						onRetry={reloadDiary}
					/>
				</div>
			)}

			{/* ── Ненавязчивый СтАР Автопилот: Мягкая плашка-чип предложения протокола ── */}
			{pendingSoapSuggestion && !fieldsDisabled && (
				<div
					className="p-3.5 rounded-2xl bg-[var(--teal-surface)] border-2 border-[var(--teal)] text-[var(--ink)] flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-md animate-in fade-in slide-in-from-top-2 duration-200"
					data-testid="soap-suggestion-banner"
				>
					<div className="flex items-center gap-3 min-w-0">
						<div className="w-10 h-10 rounded-xl bg-[var(--teal-surface)] text-[var(--teal,var(--brand-primary))] border border-[var(--teal-soft)] flex items-center justify-center shrink-0">
							<Sparkles size={22} className="text-[var(--teal,var(--brand-primary))]" />
						</div>
						<div className="min-w-0">
							<div className="text-sm sm:text-base font-black text-[var(--ink)] flex items-center gap-2 flex-wrap">
								<span>Подставить шаблон СтАР в дневник?</span>
								<span className="text-xs px-2 py-0.5 rounded-md font-mono font-bold bg-[var(--teal-surface)] text-[var(--teal,var(--brand-primary))] border border-[var(--teal-soft)] truncate">
									{pendingSoapSuggestion.title}
								</span>
							</div>
							<div className="text-xs text-[var(--muted)] mt-0.5 truncate">
								{pendingSoapSuggestion.source}: Жалобы (S), Объективно (O), Диагноз МКБ-10 (A), План (P)
							</div>
						</div>
					</div>

					<div className="flex items-center gap-2 shrink-0">
						<button
							type="button"
							onClick={applyPendingSoapSuggestion}
							className="min-h-[48px] px-5 py-2.5 rounded-xl bg-[var(--teal-fill,var(--teal))] hover:bg-[var(--teal-dark,var(--teal))] text-[var(--on-teal,white)] font-black text-sm sm:text-base shadow-sm transition-all flex items-center gap-2 cursor-pointer touch-manipulation active:scale-[0.98]"
							data-testid="btn-apply-soap-suggestion"
							title="Внести структурированный протокол СтАР в дневник приёма"
						>
							<Check size={18} />
							<span>Применить (1 клик)</span>
						</button>
						<button
							type="button"
							onClick={dismissPendingSoapSuggestion}
							className="min-h-[48px] px-3.5 py-2.5 rounded-xl bg-[var(--paper)] hover:bg-[var(--paper-strong)] text-[var(--muted)] hover:text-[var(--ink)] border border-[var(--border)] font-bold text-sm transition-all flex items-center gap-1.5 cursor-pointer touch-manipulation"
							title="Скрыть предложение и продолжить ручной ввод"
							data-testid="btn-dismiss-soap-suggestion"
						>
							<X size={18} />
							<span>Скрыть</span>
						</button>
					</div>
				</div>
			)}

			{/* ── SOAP Fields grid ── */}
			<div className="vde-043__grid">
				{/* S — Subjective */}
				<div className="vde-043__field">
					<label className="vde-043__label" htmlFor="diary-anamnesis">
						<Stethoscope className="w-3 h-3 text-blue-600 dark:text-blue-400" />
						<span className="vde-043__letter vde-043__letter--s">S</span> —
						Жалобы и анамнез
						{!fieldsDisabled && (
							<div className="vde-043__label-mic">
								<SmartMicrophoneButton
									context="visit"
									sterileMode={false}
									className="p-1"
									onResult={(text) => {
										setDiary((p) => ({
											...p,
											anamnesis: p.anamnesis ? `${p.anamnesis} ${text}` : text,
										}));
										scheduleDebouncedSave();
									}}
								/>
							</div>
						)}
					</label>
					<textarea
						id="diary-anamnesis"
						disabled={fieldsDisabled}
						className="auto-resize-ta vde-043__ta"
						value={diary.anamnesis}
						onChange={(e) => {
							handleAutoResize(e);
							setDiary((p) => ({ ...p, anamnesis: e.target.value }));
							scheduleDebouncedSave();
						}}
						onFocus={handleAutoResize}
						placeholder="Со слов пациента: жалобы на боли, чувствительность..."
					/>
				</div>

				{/* O — Objective */}
				<div className="vde-043__field">
					<label className="vde-043__label" htmlFor="diary-status-localis">
						<Search className="w-3 h-3 text-purple-600 dark:text-purple-400" />
						<span className="vde-043__letter vde-043__letter--o">O</span> —
						Объективно (Status Localis)
						{!fieldsDisabled && (
							<div className="vde-043__label-mic">
								<SmartMicrophoneButton
									context="visit"
									sterileMode={false}
									className="p-1"
									onResult={(text) => {
										setDiary((p) => ({
											...p,
											statusLocalis: p.statusLocalis
												? `${p.statusLocalis} ${text}`
												: text,
										}));
										scheduleDebouncedSave();
									}}
								/>
							</div>
						)}
					</label>
					<textarea
						id="diary-status-localis"
						disabled={fieldsDisabled}
						className="auto-resize-ta vde-043__ta"
						value={diary.statusLocalis}
						onChange={(e) => {
							handleAutoResize(e);
							setDiary((p) => ({ ...p, statusLocalis: e.target.value }));
							scheduleDebouncedSave();
						}}
						onFocus={handleAutoResize}
						placeholder="Внешний осмотр, перкуссия, пальпация, ЭОД, рентген..."
					/>
				</div>

				{/* A — Assessment */}
				<div className="vde-043__assessment">
					<div className="vde-043__assessment-grid">
						<div className="vde-043__field" ref={icdRef}>
							<label className="vde-043__label" htmlFor="diary-icd-search">
								<span className="vde-043__letter vde-043__letter--a">A</span> —
								Диагноз МКБ-10
							</label>
							{diary.diagnosisIcd10 ? (
								<div
									className={`vde-043__icd-chip min-h-[44px] min-w-0 break-words ${getIcdColor(diary.diagnosisIcd10)}`}
								>
									<span className="vde-043__icd-code shrink-0">
										{diary.diagnosisIcd10}
									</span>
									<span className="flex-1 min-w-0 break-words">
										{ICD10_DICTIONARY.find(
											(i) => i.code === diary.diagnosisIcd10,
										)?.label ?? "Диагноз выбран"}
									</span>
									{!fieldsDisabled && (
										<button
											type="button"
											onClick={() => {
												setDiary((p) => ({ ...p, diagnosisIcd10: "" }));
												setIcdSearch("");
												scheduleDebouncedSave();
											}}
											className="vde-043__btn vde-043__btn--ghost vde-043__btn--icon shrink-0"
											title="Сбросить диагноз"
											aria-label="Сбросить диагноз МКБ-10"
										>
											<X className="w-3.5 h-3.5" />
										</button>
									)}
								</div>
							) : (
								<div className="vde-043__icd-search-wrap">
									<Search className="w-4 h-4 vde-043__icd-search-icon" />
									<input
										id="diary-icd-search"
										disabled={fieldsDisabled}
										className="vde-043__input vde-043__icd-input min-h-[44px]"
										value={icdSearch}
										onChange={(e) => {
											setIcdSearch(e.target.value);
											setShowIcdDropdown(true);
										}}
										onFocus={() => !fieldsDisabled && setShowIcdDropdown(true)}
										onKeyDown={(e) => {
											if (e.key === "Enter") {
												e.preventDefault();
												commitIcdInput();
											}
										}}
										onBlur={() => {
											window.setTimeout(() => {
												commitIcdInput();
												setShowIcdDropdown(false);
											}, 120);
										}}
										placeholder="K02.1 Кариес... или введите название"
									/>
									{showIcdDropdown && filteredIcd.length > 0 && (
										<div className="vde-043__icd-drop">
											{(filteredIcd ?? []).map((icd) => (
												<div
													key={icd.code}
													className="vde-043__icd-opt min-h-[44px] min-w-0"
													role="option"
													aria-selected={false}
													tabIndex={0}
													onMouseDown={(e) => {
														e.preventDefault();
														handleIcdSelect(icd.code);
													}}
													onKeyDown={(e) => {
														if (e.key === "Enter" || e.key === " ") {
															e.preventDefault();
															handleIcdSelect(icd.code);
														}
													}}
												>
													<span
														className={`vde-043__icd-opt-code shrink-0 ${ICD_GROUP_COLORS[icd.group] ?? ""}`}
													>
														{icd.code}
													</span>
													<div className="flex-1 min-w-0 break-words">
														<div className="vde-043__icd-opt-label break-words whitespace-normal">
															{icd.label}
														</div>
														<div className="vde-043__icd-opt-group break-words">
															{icd.group}
														</div>
													</div>
												</div>
											))}
										</div>
									)}
								</div>
							)}
						</div>

						<div className="vde-043__field">
							<label className="vde-043__label" htmlFor="diary-tooth">
								Зуб (FDI)
							</label>
							<input
								id="diary-tooth"
								disabled={fieldsDisabled}
								className="vde-043__input vde-043__tooth-input"
								value={diary.diagnosisTooth}
								onChange={(e) => {
									setDiary((p) => ({ ...p, diagnosisTooth: e.target.value }));
									scheduleDebouncedSave();
								}}
								placeholder="16, 36..."
								maxLength={32}
							/>
						</div>
					</div>
				</div>

				{/* P — Plan */}
				<div className="vde-043__field vde-043__field--span2">
					<label className="vde-043__label" htmlFor="diary-treatment">
						<FileText className="w-3 h-3 text-[var(--teal)]" />
						<span className="vde-043__letter vde-043__letter--p">P</span> —
						Лечение и рекомендации
						{!fieldsDisabled && (
							<div className="vde-043__label-mic">
								<SmartMicrophoneButton
									context="visit"
									sterileMode={false}
									className="p-1"
									onResult={(text) => {
										setDiary((p) => ({
											...p,
											treatmentDescription: p.treatmentDescription
												? `${p.treatmentDescription} ${text}`
												: text,
										}));
										scheduleDebouncedSave();
									}}
								/>
							</div>
						)}
					</label>
					<textarea
						id="diary-treatment"
						disabled={fieldsDisabled}
						className="auto-resize-ta vde-043__ta"
						value={diary.treatmentDescription}
						onChange={(e) => {
							handleAutoResize(e);
							setDiary((p) => ({ ...p, treatmentDescription: e.target.value }));
							scheduleDebouncedSave();
						}}
						onFocus={handleAutoResize}
						placeholder="Анестезия, проведённые манипуляции, рекомендации..."
					/>
					{!fieldsDisabled && (
						<div
							className="mt-2 p-2.5 rounded-lg border border-[var(--line)] bg-[var(--paper-soft)] flex flex-col gap-1.5"
							data-testid="patient-recommendations-bar"
						>
							<span className="text-xs font-bold text-[var(--muted)] uppercase tracking-wider flex items-center gap-1.5">
								<Sparkles className="w-3.5 h-3.5 text-[var(--teal,var(--brand-primary))]" />
								1-Click Рекомендации пациенту:
							</span>
							<div className="flex flex-wrap items-center gap-1.5">
								{PATIENT_RECOMMENDATIONS.map((rec) => (
									<button
										key={rec.id}
										type="button"
										onClick={() => {
											setDiary((prev) =>
												appendRecommendationToSoap(prev, rec.text),
											);
											scheduleDebouncedSave();
										}}
										className="inline-flex items-center gap-1.5 px-4 py-2.5 min-h-[48px] rounded-xl bg-[var(--paper)] hover:bg-[var(--teal-surface)] border border-[var(--line)] hover:border-[var(--teal)] text-xs sm:text-sm font-bold text-[var(--ink)] transition-colors shadow-xs touch-manipulation min-w-0 break-words cursor-pointer"
										title={rec.text}
										data-testid={`rec-btn-${rec.id}`}
									>
										<Plus className="w-3.5 h-3.5 text-[var(--teal,var(--brand-primary))] shrink-0" />
										<span className="min-w-0 break-words">{rec.label}</span>
									</button>
								))}
							</div>
						</div>
					)}
				</div>

				{/* Complications */}
				<div className="vde-043__field vde-043__field--span2">
					<label className="vde-043__label" htmlFor="vde-complications">
						<AlertTriangle className="w-3 h-3 text-[var(--bad-fg,#b91c1c)]" />
						Осложнения и сопутствующие заболевания
					</label>
					<div className="vde-043__complications-grid">
						<textarea
							id="vde-complications"
							disabled={fieldsDisabled}
							className="auto-resize-ta vde-043__ta vde-043__ta--sm"
							value={diary.complications}
							onChange={(e) => {
								handleAutoResize(e);
								setDiary((p) => ({ ...p, complications: e.target.value }));
								scheduleDebouncedSave();
							}}
							onFocus={handleAutoResize}
							placeholder="Осложнения лечения..."
						/>
						<textarea
							disabled={fieldsDisabled}
							className="auto-resize-ta vde-043__ta vde-043__ta--sm"
							value={diary.comorbidities}
							onChange={(e) => {
								handleAutoResize(e);
								setDiary((p) => ({ ...p, comorbidities: e.target.value }));
								scheduleDebouncedSave();
							}}
							onFocus={handleAutoResize}
							placeholder="Сопутствующие заболевания (если есть)..."
						/>
					</div>
				</div>

				<VisitDiaryPhotoUpload
					visitId={visitId}
					diaryId={diaryId}
					isLocked={isLocked}
					onPrintPhotosChange={handlePrintPhotosChange}
				/>
			</div>

			{/* ── Actions Footer ── */}
			{!isLocked ? (
				<div className="vde-043__footer">
					<span className="vde-043__footer-hint">
						<AlertTriangle className="w-3 h-3" /> Автосохранение (300 мс)
					</span>
					<button
						type="button"
						data-testid="diary-tray-scan"
						onClick={() => setShowScanner(true)}
						className="vde-043__btn text-[var(--teal)]"
						disabled={diaryUnread}
					>
						<Activity className="w-4 h-4" />
						{trayBarcode ? `Лоток: ${trayBarcode}` : "Сканировать Лоток"}
					</button>
					{trayBarcode ? (
						<button
							type="button"
							data-testid="diary-tray-clear"
							onClick={() => {
								void clearTrayBarcode();
							}}
							disabled={isSaving || diaryUnread}
							className="vde-043__btn vde-043__btn--ghost vde-043__btn--icon"
							title="Снять лоток с черновика"
							aria-label="Снять лоток с черновика"
						>
							<X className="w-4 h-4" />
						</button>
					) : null}
					<button
						type="button"
						id="diary-save-btn"
						onClick={() => doSave(false)}
						disabled={isSaving || diaryUnread}
						className="vde-043__btn"
						title={
							diaryUnread
								? "Сохранение недоступно, пока записи приёма не прочитаны"
								: undefined
						}
					>
						{isSaving ? "Сохраняю..." : "Сохранить черновик"}
					</button>
					<CryptoProSigner
						diaryHash={diaryHash}
						isLocked={isLocked}
						lockedAt={lockedAt}
						ensureDraftSaved={() => ensureDraftSavedForSigning()}
						onLock={async (thumbprint, signature, alreadySavedId) => {
							await doLock(thumbprint, signature, alreadySavedId);
						}}
					/>
				</div>
			) : isRevising ? (
				<div className="vde-043__revise-panel" data-testid="diary-revise-panel">
					<div className="vde-043__revise-warn">
						<AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
						<span>
							Режим правки подписанного дневника. Прежний текст сохранится в
							истории. Доступно только администратору клиники.
						</span>
					</div>
					<label className="vde-043__revise-label">
						Инструментальный лоток (штрихкод)
						<div className="flex items-center gap-2">
							<input
								data-testid="diary-revise-tray"
								value={trayBarcode ?? ""}
								onChange={(e) => {
									const v = e.target.value.trim();
									setTrayBarcode(v.length > 0 ? v : null);
								}}
								placeholder="Штрихкод лотка или пусто, чтобы снять"
								className="vde-043__input flex-1"
								disabled={isRevisingBusy}
							/>
							<button
								type="button"
								data-testid="diary-revise-tray-scan"
								onClick={() => setShowScanner(true)}
								disabled={isRevisingBusy}
								className="vde-043__btn"
								title="Сканировать штрихкод лотка"
							>
								<Activity className="w-4 h-4" />
							</button>
						</div>
					</label>
					<label className="vde-043__revise-label">
						Причина правки (обязательно)
						<input
							data-testid="diary-revise-reason"
							value={revisionReason}
							onChange={(e) => setRevisionReason(e.target.value)}
							placeholder="Например: исправление опечатки в диагнозе МКБ-10"
							className="vde-043__input"
						/>
					</label>
					<div className="flex flex-wrap justify-end gap-2">
						<button
							type="button"
							data-testid="diary-revise-cancel"
							onClick={() => cancelRevise()}
							disabled={isRevisingBusy}
							className="vde-043__btn"
						>
							Отмена
						</button>
						<button
							type="button"
							id="diary-revise-save-btn"
							data-testid="diary-revise-save"
							onClick={() => void doRevise()}
							disabled={isRevisingBusy}
							className="vde-043__btn vde-043__btn--amber"
						>
							{isRevisingBusy ? "Сохраняю правку…" : "Сохранить правку"}
						</button>
					</div>
				</div>
			) : (
				<div className="vde-043__footer-locked">
					<ShieldCheck className="w-4 h-4 shrink-0 text-[var(--green,#15803d)]" />
					<span>
						{hasCryptoSignature
							? "Дневник подписан"
							: "Дневник закрыт, оттиск УКЭП отсутствует"}
						{lockedAt ? ` • ${new Date(lockedAt).toLocaleString("ru-RU")}` : ""}
						.
						{diaryHash && (
							<span className="vde-043__hash ml-2">
								{diaryHash.slice(0, 16)}…
							</span>
						)}
					</span>
					{!hasCryptoSignature && (
						<CryptoProSigner
							diaryHash={diaryHash}
							isLocked={false}
							lockedAt={lockedAt}
							ensureDraftSaved={async () =>
								diaryId ? { id: diaryId, hash: diaryHash } : null
							}
							onLock={async (thumbprint, signature, alreadySavedId) => {
								await doLock(thumbprint, signature, alreadySavedId ?? diaryId);
							}}
						/>
					)}
					<button
						type="button"
						id="diary-revise-btn"
						data-testid="diary-revise-begin"
						onClick={() => beginRevise()}
						disabled={diaryUnread}
						className="vde-043__btn vde-043__btn--amber ml-auto"
						title="Исправить подписанный дневник (только администратор)"
					>
						<FileText className="w-3.5 h-3.5" /> Исправить
					</button>
					<button
						type="button"
						onClick={() => setShowPreview(true)}
						disabled={diaryUnread}
						className="vde-043__btn vde-043__btn--ghost"
						data-testid="diary-form-043-open"
						title={
							diaryUnread
								? "Печать недоступна, пока записи приёма не прочитаны"
								: undefined
						}
					>
						<Printer className="w-3.5 h-3.5" /> Форма 043/у
					</button>
				</div>
			)}

			{/* ── Forensic Revisions History ── */}
			{diaryRevisions.length > 0 && (
				<details
					className="vde-043__revisions no-print"
					data-testid="diary-revisions-history"
				>
					<summary className="vde-043__revisions-summary">
						История правок ({diaryRevisions.length})
					</summary>
					<ol className="vde-043__revisions-list">
						{(diaryRevisions ?? []).map((rev, idx) => {
							const when = rev.revisedAt
								? new Date(rev.revisedAt).toLocaleString("ru-RU")
								: "дата не указана";
							const prevBits: { label: string; text: string }[] = [];
							const pushPrev = (label: string, text: string | null) => {
								if (typeof text === "string" && text.trim().length > 0) {
									prevBits.push({ label, text: text.trim() });
								}
							};
							pushPrev("S (жалобы/анамнез)", rev.previousAnamnesis);
							pushPrev("O (status localis)", rev.previousStatusLocalis);
							pushPrev("A (МКБ-10)", rev.previousDiagnosisIcd10);
							pushPrev("Зуб", rev.previousDiagnosisTooth);
							pushPrev("P (лечение)", rev.previousTreatmentDescription);
							pushPrev("Осложнения", rev.previousComplications);
							pushPrev("Сопутствующие", rev.previousComorbidities);
							pushPrev("Лоток (штрихкод)", rev.previousInstrumentTrayBarcode);
							return (
								<li
									key={rev.id}
									className="vde-043__revision-item"
									data-testid={`diary-revision-item-${idx}`}
								>
									<div className="vde-043__revision-meta">
										<span className="vde-043__revision-when">{when}</span>
										{rev.revisedByFullName ? (
											<span className="vde-043__revision-who">
												Кто: {rev.revisedByFullName}
											</span>
										) : rev.revisedByUserId ? (
											<span className="vde-043__revision-who vde-043__revision-who--unknown">
												Кто: ФИО в записи не сохранено
											</span>
										) : null}
										{rev.revisionReason ? (
											<span className="vde-043__revision-reason">
												Причина: {rev.revisionReason}
											</span>
										) : (
											<span className="vde-043__revision-reason vde-043__revision-reason--missing">
												Причина не указана
											</span>
										)}
									</div>
									{prevBits.length > 0 ? (
										<ul className="vde-043__revision-prev">
											{(prevBits ?? []).map((b) => (
												<li key={b.label} className="min-w-0 break-words">
													<strong>{b.label}:</strong>{" "}
													<span className="vde-043__revision-prev-text min-w-0 break-words">
														{b.text.length > 280
															? `${b.text.slice(0, 280)}…`
															: b.text}
													</span>
												</li>
											))}
										</ul>
									) : (
										<p className="vde-043__revision-empty-prev">
											Снимок прежних полей пуст.
										</p>
									)}
								</li>
							);
						})}
					</ol>
				</details>
			)}

			{/* ── Sterilization Scanner Modal ── */}
			{showScanner &&
				typeof document !== "undefined" &&
				createPortal(
					<div className="vde-043-scanner-overlay">
						<div className="vde-043-scanner">
							<div className="vde-043-scanner__laser" aria-hidden="true" />
							<button
								type="button"
								onClick={() => setShowScanner(false)}
								className="vde-043-scanner__close"
								aria-label="Закрыть сканер"
							>
								<X className="w-5 h-5" />
							</button>
							<h2 className="vde-043-scanner__title">
								<Activity className="w-5 h-5 text-red-500" />
								Сканер СанПиН
							</h2>
							<p className="vde-043-scanner__hint">
								Наведите сканер на штрихкод стерильного лотка или введите
								вручную.
							</p>
							<input
								className="vde-043-scanner__input"
								placeholder="000000000000"
								onKeyDown={(e) => {
									if (e.key === "Enter") {
										const val = e.currentTarget.value.trim();
										if (val) {
											void assignTrayBarcode(val);
										}
									}
								}}
							/>
						</div>
					</div>,
					document.body,
				)}

			{/* ── Summary Modal ── */}
			<VisitSummaryModal
				isOpen={showSummaryModal}
				onClose={() => setShowSummaryModal(false)}
				patient={printPatient || activePatient}
				diary={diary}
				doctorName={doctorName}
				doctorSpecialty={doctorSpecialty}
				lockedAt={lockedAt}
				diaryHash={diaryHash}
				hasCryptoSignature={hasCryptoSignature}
				isLocked={isLocked}
				teethData={activeTeeth}
				radiologySnapshots={radiologySnapshots}
				onPrint={() => setShowPreview(true)}
				onOpenPrescription={() => setShowPrescriptionModal(true)}
				onOpenRadiologyReferral={() => setShowRadiologyReferralModal(true)}
				onOpenEgiszExport={() => setShowEgiszModal(true)}
			/>

			{/* ── Prescription 107-1/u Modal ── */}
			<PrescriptionModal
				isOpen={showPrescriptionModal}
				onClose={() => setShowPrescriptionModal(false)}
				patient={
					printPatient || activePatient
						? {
								fullName: patientFullName,
								birthDate: patientBirthDate,
								medicalCardNumber: patientCardNumber,
							}
						: null
				}
				diary={diary}
				doctorName={doctorName}
				doctorSpecialty={doctorSpecialty}
				clinicName={clinicName}
			/>

			{/* ── Radiology Referral Modal ── */}
			<RadiologyReferralModal
				isOpen={showRadiologyReferralModal}
				onClose={() => setShowRadiologyReferralModal(false)}
				patient={
					printPatient || activePatient
						? {
								fullName: patientFullName,
								birthDate: patientBirthDate,
								medicalCardNumber: patientCardNumber,
							}
						: null
				}
				diary={diary}
				doctorName={doctorName}
				doctorSpecialty={doctorSpecialty}
				clinicName={clinicName}
			/>

			{/* ── EGISZ SEMD CDA Export Modal ── */}
			<EgiszCdaExportModal
				isOpen={showEgiszModal}
				onClose={() => setShowEgiszModal(false)}
				visitId={realVisitFieldId(visitId) || "00000000-0000-0000-0000-000000000000"}
				patientId={patientId || ""}
				patientName={patientFullName}
				patientSnils={(activePatient as any)?.administrativeProfile?.snils}
				patientBirthDate={patientBirthDate}
				patientGender={(activePatient as any)?.administrativeProfile?.gender || (activePatient as any)?.gender}
				patientPolisOms={(activePatient as any)?.administrativeProfile?.omsPolis}
				doctorName={doctorName}
				doctorSnils={(activeDoctor as any)?.snils || (activeDoctor as any)?.uiPreferences?.snils}
				doctorPosition={doctorSpecialty || "Врач-стоматолог"}
				diagnosisText={icdEntry ? `${diary.diagnosisIcd10} ${icdEntry.label}` : diary.diagnosisIcd10}
				icd10Code={diary.diagnosisIcd10}
				diagnosisTooth={diary.diagnosisTooth}
				anamnesis={diary.anamnesis}
				objectiveStatus={diary.statusLocalis}
				treatmentDescription={diary.treatmentDescription}
				complications={diary.complications}
				comorbidities={diary.comorbidities}
				instrumentTrayBarcode={trayBarcode || undefined}
				toothStates={activeTeeth.reduce((acc, t) => ({ ...acc, [t.toothNumber]: t.state }), {})}
				documentVersion={revisionCount + 1}
			/>

			{/* ── Print Preview Modal ── */}
			{showPreview &&
				typeof window !== "undefined" &&
				createPortal(PrintPreviewContent, document.body)}
		</div>
	);
};
