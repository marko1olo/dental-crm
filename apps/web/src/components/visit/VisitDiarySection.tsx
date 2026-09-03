import {
	Activity,
	AlertTriangle,
	BarChart2,
	Check,
	ChevronDown,
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
import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
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
	PERIO_PATHOLOGY_PRESETS,
	type PerioPathologyPreset,
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
import { AnesthesiaQuickBar } from "../anesthesia/AnesthesiaQuickBar";
import { DENTAL_ANESTHETICS } from "../anesthesia/anesthesiaCatalog";
import { ToothAnesthesiaCalculator } from "../diagnostic/ToothAnesthesiaCalculator";
import {
	generatePediatricCariogramDiaryText,
} from "../odontogram/pediatricDentitionEngine";
import { ClinicalQuickPresetsBar } from "./ClinicalQuickPresetsBar";
import { CryptoProSigner } from "./CryptoProSigner";
import { EgiszCdaExportModal } from "../egisz/EgiszCdaExportModal";
import { KraftPackageQuickScanner } from "../sterilization/KraftPackageQuickScanner";
import { PrescriptionModal } from "./PrescriptionModal";
import { RadiologyReferralModal } from "./RadiologyReferralModal";
import { realVisitFieldId } from "./visitIdentity";
import {
	type RadiologySnapshotItem,
	VisitSummaryModal,
} from "./VisitSummaryModal";
import { ClinicalDiaryTemplatesModal } from "../emr/templates";
import { PatientAllergySafetyBanner } from "../patient/PatientAllergySafetyBanner";
import { PeriodontogramChart } from "../perio/PeriodontogramChart";
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
		localDraftSavedAt,
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

	const [fieldInterimMap, setFieldInterimMap] = useState<{
		anamnesis?: string;
		statusLocalis?: string;
		treatmentDescription?: string;
		complications?: string;
	}>({});

	const [printPhotos, setPrintPhotos] = useState<readonly DiaryPrintPhoto[]>([]);
	const [showSummaryModal, setShowSummaryModal] = useState(false);
	const [showPrescriptionModal, setShowPrescriptionModal] = useState(false);
	const [showRadiologyReferralModal, setShowRadiologyReferralModal] =
		useState(false);
	const [showEgiszModal, setShowEgiszModal] = useState(false);
	const [showBrandingCustomizer, setShowBrandingCustomizer] = useState(false);
	const [showTemplatesModal, setShowTemplatesModal] = useState(false);
	const [isTier3PerioModalOpen, setIsTier3PerioModalOpen] = useState(false);
	const [showPerioPathologyMenu, setShowPerioPathologyMenu] = useState(false);
	const perioMenuRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		if (!showPerioPathologyMenu) return;
		const handleClickOutside = (e: MouseEvent) => {
			if (perioMenuRef.current && !perioMenuRef.current.contains(e.target as Node)) {
				setShowPerioPathologyMenu(false);
			}
		};
		document.addEventListener("mousedown", handleClickOutside);
		return () => document.removeEventListener("mousedown", handleClickOutside);
	}, [showPerioPathologyMenu]);
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
		(diaryPatientId && selectedPatientId && selectedPatientId === diaryPatientId
			? activePatient
			: (ctx.dashboard?.patients || []).find((p: any) => p.id === diaryPatientId) || activePatient) ?? null;
	const printPatientMismatch = false;

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
		? "Печать подготавливается..."
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
		const perioText = `[ПАРОДОНТОЛОГИЧЕСКИЙ СТАТУС (НОРМА В 1 КЛИК)]
Десна бледно-розовая, плотная, зубодесневое прикрепление сохранено, патологических карманов нет (норма).
Глубина зондирования зубодесневых борозд: 1–2 мм во всех секстантах.
Кровоточивость при зондировании (BOP): отсутствует (0%).
Патологическая подвижность зубов и фуркационные дефекты: не выявлены.
Клинический диагноз: Клинически здоровый пародонт (К05.0 / Здоровый пародонт).
Врач: ${doctorName || "Лечащий врач"}.`;

		const icd10Code = "K05.0";

		setDiary((prev) => ({
			...prev,
			diagnosisIcd10: prev.diagnosisIcd10 || icd10Code,
			statusLocalis: prev.statusLocalis
				? `${prev.statusLocalis}\n\n${perioText}`
				: perioText,
			treatmentDescription: prev.treatmentDescription
				? `${prev.treatmentDescription}\n\n• Профилактический осмотр через 6 месяцев.`
				: "• Контролируемая индивидуальная гигиена полости рта.\n• Профилактический осмотр через 6 месяцев.",
		}));

		if (!diary.diagnosisIcd10 && icd10Code) {
			setIcdSearch(icd10Code);
		}
		scheduleDebouncedSave();
	};

	const handleApplyPerioPathology = (preset: PerioPathologyPreset) => {
		setDiary((prev) => ({
			...prev,
			diagnosisIcd10: prev.diagnosisIcd10 || preset.defaultIcd10,
			statusLocalis: prev.statusLocalis
				? `${prev.statusLocalis}\n\n[ПАРОДОНТОЛОГИЧЕСКИЙ СТАТУС: ${preset.badge}]\n${preset.statusLocalis}`
				: `[ПАРОДОНТОЛОГИЧЕСКИЙ СТАТУС: ${preset.badge}]\n${preset.statusLocalis}`,
			treatmentDescription: prev.treatmentDescription
				? `${prev.treatmentDescription}\n\n${preset.treatmentDescription}`
				: preset.treatmentDescription,
		}));

		if (!diary.diagnosisIcd10 && preset.defaultIcd10) {
			setIcdSearch(preset.defaultIcd10);
		}
		setShowPerioPathologyMenu(false);
		scheduleDebouncedSave();
		ctx.showToast?.(`Применён протокол: ${preset.label}`, "info");
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
						isLocked={isLocked}
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
							{localDraftSavedAt && (
								<span
									className="vde-043__meta-item text-emerald-600 dark:text-emerald-400 font-medium"
									title="Автосохранение черновика при каждом вводе в IndexedDB и LocalStorage"
								>
									<span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shrink-0 inline-block" />
									Черновик сохранён:{" "}
									{localDraftSavedAt.toLocaleTimeString("ru-RU", {
										hour: "2-digit",
										minute: "2-digit",
										second: "2-digit",
									})}
								</span>
							)}
							{lastSavedAt && (
								<span className="vde-043__meta-item">
									<Clock className="w-3 h-3" />
									Сервер:{" "}
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
						data-testid="open-1click-templates-btn"
						onClick={() => setShowTemplatesModal(true)}
						className="vde-043__btn"
						title="Открыть 1-Click клинические протоколы и шаблоны SOAP (Приказ 834н / 804н)"
					>
						<Sparkles className="w-4 h-4 text-[var(--teal)]" />
						Протоколы 1-Click
					</button>
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
							<div className="flex items-center gap-1.5">
								<span className="vde-043__badge vde-043__badge--locked">
									<Lock className="w-4 h-4" /> ПОДПИСАНО
								</span>
								<button
									type="button"
									id="diary-top-revise-btn"
									data-testid="diary-top-revise-btn"
									onClick={() => beginRevise()}
									disabled={diaryUnread}
									className="vde-043__btn vde-043__btn--amber text-xs py-1 px-2.5 font-bold flex items-center gap-1"
									title="Внести исправление в закрытый дневник («Исправленному верить»)"
								>
									<FileText className="w-3.5 h-3.5" /> Внести исправление («Исправленному верить»)
								</button>
							</div>
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

			{/* ── Tier 1 Critical Somatic & Allergy Safety Banner (Pacemaker, Bisphosphonates, Anticoagulants, Anesthesia) ── */}
			<div className="mb-2" data-testid="visit-diary-safety-banner-wrapper">
				<PatientAllergySafetyBanner
					patientId={patientId}
					patientName={patientFullName}
					profile={
						(activePatient as any)?.clinicalSafetyProfile ||
						(activePatient as any)?.allergies ||
						diary.comorbidities
					}
					notes={diary.comorbidities}
					compact={false}
					onSyncToEmkDiary={(snippet) => {
						setDiary((prev) => ({
							...prev,
							comorbidities: prev.comorbidities?.trim()
								? `${prev.comorbidities.trim()}\n${snippet}`
								: snippet,
						}));
						scheduleDebouncedSave();
					}}
				/>
			</div>

			{/* ── 1-Click Fast Clinical Presets Accordion (Tier 2 Warm Context) ── */}
			{!fieldsDisabled && (
				<details
					className="group rounded-xl border border-[var(--line)] bg-[var(--paper-soft)] p-3 text-xs mb-1"
					data-testid="fast-clinical-presets-bar"
				>
					<summary className="cursor-pointer font-bold text-xs text-[var(--muted)] hover:text-[var(--ink)] flex items-center justify-between select-none list-none">
						<span className="flex items-center gap-1.5">
							<Sparkles className="w-3.5 h-3.5 text-[var(--teal)]" />
							<span>1-Click Клинические протоколы и формулы (PSR, Дети, Кариес...)</span>
						</span>
						<span className="text-[10px] font-normal text-[var(--muted)] group-open:hidden">Развернуть &darr;</span>
					</summary>
					<div className="pt-2.5 flex flex-col gap-2">
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
									<FileText size={15} className="shrink-0" />
									<span className="min-w-0 break-words">Заполнить дневник из формулы</span>
								</button>
							)}
						</div>
						<div className="flex items-center gap-2 overflow-x-auto whitespace-nowrap pb-1 scrollbar-none overscroll-x-contain min-w-0">
							{/* Unified Perio Assessment Pill (Norm + Pathology Dropdown) */}
							<div className="relative inline-flex items-center rounded-xl bg-[var(--paper-soft,#1e293b)] border border-[var(--line,#334155)] shadow-xs shrink-0" ref={perioMenuRef}>
								<button
									type="button"
									onClick={handleInsertPerioStatus}
									className="inline-flex items-center gap-1.5 px-3 py-1.5 h-9 rounded-l-xl bg-[var(--ok-bg)] hover:opacity-90 text-[var(--ok-fg)] font-bold text-xs transition-all touch-manipulation cursor-pointer min-w-0"
									title="Вставить физиологическую норму пародонта в 1 клик (десна бледно-розовая, плотная, карманов нет)"
									data-testid="insert-perio-043-btn"
								>
									<Sparkles className="w-3.5 h-3.5 text-[var(--ok-fg)] shrink-0" />
									<span className="whitespace-nowrap">Пародонт в норме</span>
								</button>
								<div className="h-5 w-px bg-[var(--line,#334155)]" />
								<button
									type="button"
									onClick={() => setShowPerioPathologyMenu((v) => !v)}
									className="inline-flex items-center gap-1 px-2.5 py-1.5 h-9 rounded-r-xl bg-[var(--paper-soft,#1e293b)] hover:bg-rose-500/15 text-rose-400 hover:text-rose-300 font-semibold text-xs transition-all touch-manipulation cursor-pointer min-w-0"
									title="Выбрать протокол патологии пародонта (гингивит, пародонтит K05.3, абсцесс, рецессия)"
									data-testid="perio-pathology-menu-btn"
									aria-expanded={showPerioPathologyMenu}
								>
									<span className="whitespace-nowrap">Патология</span>
									<ChevronDown className={`w-3.5 h-3.5 transition-transform ${showPerioPathologyMenu ? "rotate-180" : ""}`} />
								</button>

								{/* Dropdown Menu for Perio Pathologies */}
								{showPerioPathologyMenu && (
									<div
										className="absolute top-full left-0 mt-1.5 w-80 sm:w-96 rounded-xl bg-[var(--paper-strong,#0f172a)] border border-[var(--line-strong,#334155)] shadow-2xl z-[100] py-1.5 overflow-hidden backdrop-blur-xl"
										role="menu"
										aria-label="Пресеты патологий пародонта"
									>
										<div className="px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-400 border-b border-[var(--line,#334155)] flex items-center justify-between">
											<span>Патологии пародонта (МКБ-10)</span>
											<span className="text-[10px] text-teal-400">1 клик в 043/у</span>
										</div>
										<div className="max-h-80 overflow-y-auto py-1 divide-y divide-[var(--line-subtle,#1e293b)]">
											{PERIO_PATHOLOGY_PRESETS.map((preset) => (
												<button
													key={preset.id}
													type="button"
													onClick={() => handleApplyPerioPathology(preset)}
													className="w-full text-left px-3 py-2 hover:bg-rose-500/10 text-[var(--ink,#f8fafc)] hover:text-rose-200 transition-colors flex flex-col gap-0.5 group cursor-pointer"
													role="menuitem"
													data-testid={`perio-preset-${preset.id}`}
												>
													<div className="flex items-center justify-between gap-2">
														<span className="text-xs font-bold text-slate-100 group-hover:text-rose-300">
															{preset.label}
														</span>
														<span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-300 font-bold border border-rose-500/30 shrink-0">
															{preset.badge}
														</span>
													</div>
													<p className="text-[11px] text-slate-400 line-clamp-2 leading-tight">
														{preset.statusLocalis}
													</p>
												</button>
											))}
										</div>
									</div>
								)}
							</div>

							<button
								type="button"
								onClick={() => setIsTier3PerioModalOpen(true)}
								className="inline-flex items-center gap-1.5 px-3 py-1.5 h-9 rounded-xl bg-[var(--paper-soft,#1e293b)] hover:bg-teal-500/15 text-teal-400 border border-[var(--line,#334155)] hover:border-teal-500/40 text-xs font-semibold transition-all shrink-0 shadow-xs touch-manipulation min-w-0 cursor-pointer"
								title="Открыть глубокий Tier 3 кабинет врача-пародонтолога (Florida Probe 6-Point зондирование)"
								data-testid="open-tier3-perio-btn"
							>
								<BarChart2 className="w-3.5 h-3.5 text-teal-400 shrink-0" />
								<span className="whitespace-nowrap">Tier 3 (Florida Probe)</span>
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
						<div className="pt-1">
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
					</div>
				</details>
			)}

			{/* ── Anesthesia Quick Bar & Dosage Calculator (Tier 2 Warm Context) ── */}
			{!fieldsDisabled && (
				<details
					open
					className="group rounded-2xl border border-[var(--line)] bg-[var(--paper-soft)] p-3.5 text-xs mb-2 shadow-xs"
					data-testid="anesthesia-quick-logger-bar"
				>
					<summary className="cursor-pointer font-bold text-xs text-[var(--muted)] hover:text-[var(--ink)] flex items-center justify-between select-none list-none">
						<span className="flex items-center gap-1.5">
							<Syringe className="w-4 h-4 text-blue-500 shrink-0" />
							<span>Местная анестезия (быстрый выбор препарата и дозы)</span>
						</span>
						<span className="text-[10px] font-normal text-[var(--muted)] group-open:hidden">Развернуть &darr;</span>
					</summary>
					<div className="pt-2.5">
						<AnesthesiaQuickBar
							patientWeightKg={
								typeof (activePatient as any)?.weightKg === "number" &&
								(activePatient as any).weightKg > 0
									? (activePatient as any).weightKg
									: typeof (activePatient as any)?.administrativeProfile?.weightKg ===
												"number" &&
										(activePatient as any).administrativeProfile.weightKg > 0
										? (activePatient as any).administrativeProfile.weightKg
										: 70
							}
							targetToothNumberFdi={diary.diagnosisTooth || 16}
							hasCardiovascularRisk={
								Boolean(
									(activePatient as any)?.clinicalSafetyProfile
										?.hasCardiovascularDisease,
								) ||
								Boolean(
									(activePatient as any)?.clinicalSafetyProfile
										?.hasPacemakerExs,
								) ||
								Boolean(
									(activePatient as any)?.clinicalSafetyProfile
										?.hasHypertension,
								) ||
								diary.comorbidities?.toLowerCase().includes("сердц") ||
								diary.comorbidities?.toLowerCase().includes("давлен") ||
								diary.comorbidities?.toLowerCase().includes("ибс") ||
								diary.comorbidities?.toLowerCase().includes("гипертон")
							}
							hasSulfiteAllergy={
								Boolean(
									(activePatient as any)?.clinicalSafetyProfile
										?.hasSulfiteAllergy,
								) ||
								diary.comorbidities?.toLowerCase().includes("сульфит") ||
								diary.comorbidities?.toLowerCase().includes("аллерги")
							}
							hasBronchialAsthma={
								Boolean(
									(activePatient as any)?.clinicalSafetyProfile
										?.hasBronchialAsthma,
								) ||
								diary.comorbidities?.toLowerCase().includes("астм") ||
								diary.comorbidities?.toLowerCase().includes("бронх")
							}
							isPregnantOrLactating={
								((activePatient as any)?.clinicalSafetyProfile
									?.pregnancyTrimester &&
									(activePatient as any).clinicalSafetyProfile
										.pregnancyTrimester !== "none") ||
								diary.comorbidities?.toLowerCase().includes("беремен") ||
								diary.comorbidities?.toLowerCase().includes("лактац")
							}
							disabled={fieldsDisabled}
							onApplyAnesthesia={(text) => {
								applyAnesthesiaPreset(text);
							}}
							onDisposalCarpules={(count, drugId) => {
								const drugName =
									DENTAL_ANESTHETICS[drugId]?.tradeNamesRu[0] ?? "Анестетик";
								const disposalNote = `[СанПиН 3.3686-21] Медсестра: списана пустая карпула ${drugName} (${count} шт., отходы Класса Б, дезинфекция 1 клик без комиссии).`;
								applyAnesthesiaPreset(disposalNote);
							}}
						/>
					</div>
				</details>
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
									title="Диктовать жалобы (Gemini Live VAD)"
									onInterim={(interim) => {
										setFieldInterimMap((p) => ({ ...p, anamnesis: interim }));
									}}
									onResult={(text) => {
										setDiary((p) => ({
											...p,
											anamnesis: p.anamnesis ? `${p.anamnesis} ${text}` : text,
										}));
										setFieldInterimMap((p) => ({ ...p, anamnesis: "" }));
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
					{fieldInterimMap.anamnesis && (
						<div
							className="px-3 py-1.5 rounded-lg bg-blue-500/10 border border-blue-500/30 text-xs font-semibold text-blue-600 dark:text-blue-400 italic animate-pulse flex items-center gap-1.5 select-none"
							data-testid="interim-text-anamnesis"
						>
							<span className="inline-block w-2 h-2 rounded-full bg-blue-500 animate-ping shrink-0" />
							<span className="font-bold shrink-0">AI Диктовка (S):</span>
							<span className="truncate">«{fieldInterimMap.anamnesis}»</span>
						</div>
					)}
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
									title="Диктовать объективный статус (Gemini Live VAD)"
									onInterim={(interim) => {
										setFieldInterimMap((p) => ({ ...p, statusLocalis: interim }));
									}}
									onResult={(text) => {
										setDiary((p) => ({
											...p,
											statusLocalis: p.statusLocalis
												? `${p.statusLocalis} ${text}`
												: text,
										}));
										setFieldInterimMap((p) => ({ ...p, statusLocalis: "" }));
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
					{fieldInterimMap.statusLocalis && (
						<div
							className="px-3 py-1.5 rounded-lg bg-blue-500/10 border border-blue-500/30 text-xs font-semibold text-blue-600 dark:text-blue-400 italic animate-pulse flex items-center gap-1.5 select-none"
							data-testid="interim-text-status-localis"
						>
							<span className="inline-block w-2 h-2 rounded-full bg-blue-500 animate-ping shrink-0" />
							<span className="font-bold shrink-0">AI Диктовка (O):</span>
							<span className="truncate">«{fieldInterimMap.statusLocalis}»</span>
						</div>
					)}
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
									title="Диктовать лечение и протокол (Gemini Live VAD)"
									onInterim={(interim) => {
										setFieldInterimMap((p) => ({ ...p, treatmentDescription: interim }));
									}}
									onResult={(text) => {
										setDiary((p) => ({
											...p,
											treatmentDescription: p.treatmentDescription
												? `${p.treatmentDescription} ${text}`
												: text,
										}));
										setFieldInterimMap((p) => ({ ...p, treatmentDescription: "" }));
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
					{fieldInterimMap.treatmentDescription && (
						<div
							className="px-3 py-1.5 rounded-lg bg-blue-500/10 border border-blue-500/30 text-xs font-semibold text-blue-600 dark:text-blue-400 italic animate-pulse flex items-center gap-1.5 select-none"
							data-testid="interim-text-treatment"
						>
							<span className="inline-block w-2 h-2 rounded-full bg-blue-500 animate-ping shrink-0" />
							<span className="font-bold shrink-0">AI Диктовка (P):</span>
							<span className="truncate">«{fieldInterimMap.treatmentDescription}»</span>
						</div>
					)}
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
						{!fieldsDisabled && (
							<div className="vde-043__label-mic">
								<SmartMicrophoneButton
									context="visit"
									sterileMode={false}
									className="p-1"
									title="Диктовать осложнения и анамнез (Gemini Live VAD)"
									onInterim={(interim) => {
										setFieldInterimMap((p) => ({ ...p, complications: interim }));
									}}
									onResult={(text) => {
										setDiary((p) => ({
											...p,
											complications: p.complications
												? `${p.complications} ${text}`
												: text,
										}));
										setFieldInterimMap((p) => ({ ...p, complications: "" }));
										scheduleDebouncedSave();
									}}
								/>
							</div>
						)}
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
					{fieldInterimMap.complications && (
						<div
							className="px-3 py-1.5 rounded-lg bg-blue-500/10 border border-blue-500/30 text-xs font-semibold text-blue-600 dark:text-blue-400 italic animate-pulse flex items-center gap-1.5 select-none mt-1"
							data-testid="interim-text-complications"
						>
							<span className="inline-block w-2 h-2 rounded-full bg-blue-500 animate-ping shrink-0" />
							<span className="font-bold shrink-0">AI Диктовка (Осложнения):</span>
							<span className="truncate">«{fieldInterimMap.complications}»</span>
						</div>
					)}
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
						<AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-amber-600" />
						<span>
							Режим правки закрытого дневника врачом («Исправленному верить»). Прежний текст надёжно сохраняется в истории версий.
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
						Причина правки («Исправленному верить»)
						<input
							data-testid="diary-revise-reason"
							value={revisionReason}
							onChange={(e) => setRevisionReason(e.target.value)}
							placeholder="Исправленному верить (нажмите «Сохранить правку» для мгновенного сохранения)"
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
							className="vde-043__btn vde-043__btn--amber font-bold"
						>
							{isRevisingBusy ? "Сохраняю правку…" : "Сохранить правку («Исправленному верить»)"}
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
						className="vde-043__btn vde-043__btn--amber ml-auto font-bold flex items-center gap-1.5"
						title="Внести исправление в дневник (с сохранением истории версий «Исправленному верить»)"
					>
						<FileText className="w-3.5 h-3.5" /> Внести исправление («Исправленному верить»)
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

			{/* ── Sterilization Kraft Package Scanner Modal (SanPiN 3.3686-21) ── */}
			<KraftPackageQuickScanner
				isOpen={showScanner}
				onClose={() => setShowScanner(false)}
				initialBarcode={trayBarcode || ""}
				currentDiaryBarcode={trayBarcode}
				onAttachToProtocol={async (parsed) => {
					await assignTrayBarcode(parsed.rawInput, parsed.formattedProtocolRecord043);
				}}
			/>

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

			{/* ── 1-Click Clinical Protocols & Templates Modal ── */}
			<ClinicalDiaryTemplatesModal
				isOpen={showTemplatesModal}
				onClose={() => setShowTemplatesModal(false)}
				initialToothNumber={diary.diagnosisTooth}
				doctorFullName={doctorName}
				doctorSpecialty={doctorSpecialty}
				patientFullName={patientFullName}
				onApplyDiary={(res) => {
					setDiary((prev) =>
						mergeSoapDiaryState(
							prev,
							{
								anamnesis: res.anamnesisMorbi,
								statusLocalis: res.objectiveStatusLocalis,
								treatmentDescription: res.procedureProtocol,
								diagnosisIcd10: res.assessmentIcd10Code,
								diagnosisTooth: res.toothNumber ? String(res.toothNumber) : prev.diagnosisTooth,
							},
							{ strategy: "smart_append" },
						),
					);
					if (res.assessmentIcd10Code) {
						setIcdSearch(res.assessmentIcd10Code);
					}
					scheduleDebouncedSave();
				}}
				onApplySoapText={(text, icd) => {
					setDiary((prev) => ({
						...prev,
						treatmentDescription: prev.treatmentDescription
							? `${prev.treatmentDescription}\n\n${text}`
							: text,
						diagnosisIcd10: prev.diagnosisIcd10 || icd,
					}));
					if (icd && !diary.diagnosisIcd10) {
						setIcdSearch(icd);
					}
					scheduleDebouncedSave();
				}}
			/>

			{/* ═══════════════════════════════════════════════════════════════════
			    TIER 3 / DEEP WORKSPACE: SPECIALIZED PERIODONTOLOGY STUDIO (FLORIDA PROBE)
			    ═══════════════════════════════════════════════════════════════════ */}
			{isTier3PerioModalOpen &&
				typeof window !== "undefined" &&
				createPortal(
					<div
						className="fixed inset-0 z-[9995] bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 overflow-y-auto"
						role="dialog"
						aria-modal="true"
						aria-label="Кабинет врача-пародонтолога"
					>
						<div className="w-full max-w-6xl max-h-[92vh] overflow-y-auto rounded-2xl bg-[var(--paper,#0f172a)] border border-[var(--line,#334155)] p-4 sm:p-6 shadow-2xl flex flex-col gap-4">
							<div className="flex items-center justify-between pb-3 border-b border-[var(--line,#334155)]">
								<div className="flex items-center gap-2">
									<BarChart2 className="w-5 h-5 text-teal-400" />
									<h3 className="text-base font-bold text-[var(--ink,#f8fafc)]">
										Специализированная пародонтограмма (Tier 3 / Florida Probe 6-Point)
									</h3>
								</div>
								<button
									type="button"
									onClick={() => setIsTier3PerioModalOpen(false)}
									className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-all cursor-pointer font-bold"
									title="Закрыть кабинет пародонтологии"
								>
									✕
								</button>
							</div>
							<PeriodontogramChart
								patientId={patientId}
								patientName={patientFullName || "Пациент"}
								organizationId={undefined}
								doctorName={diaryDoctorFullName || sessionDoctorName || undefined}
								onInsertToProtocol={(protocolText) => {
									setDiary((prev) => ({
										...prev,
										statusLocalis: prev.statusLocalis
											? `${prev.statusLocalis}\n\n${protocolText}`
											: protocolText,
									}));
									scheduleDebouncedSave();
									setIsTier3PerioModalOpen(false);
									ctx.showToast?.("Пародонтограмма перенесена в дневник 043/у", "success");
								}}
							/>
						</div>
					</div>,
					document.body,
				)}

			{/* ── Print Preview Modal ── */}
			{showPreview &&
				typeof window !== "undefined" &&
				createPortal(PrintPreviewContent, document.body)}
		</div>
	);
};
