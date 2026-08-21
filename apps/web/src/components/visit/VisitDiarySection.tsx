import {
	Activity,
	AlertTriangle,
	Check,
	Clock,
	FileText,
	Lock,
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
import { denteAdminSecretRequestHeaders } from "../../AppHelpers";
import { useAppLogicContext } from "../../contexts/AppLogicContext";
import {
	ANESTHESIA_QUICK_PRESETS,
	appendRecommendationToSoap,
	CLINICAL_FAST_PRESETS,
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
import { ClinicalQuickPresetsBar } from "./ClinicalQuickPresetsBar";
import { CryptoProSigner } from "./CryptoProSigner";
import { PrescriptionModal } from "./PrescriptionModal";
import { RadiologyReferralModal } from "./RadiologyReferralModal";
import { realVisitFieldId } from "./visitIdentity";
import { VisitSummaryModal } from "./VisitSummaryModal";
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
	} = useVisitDiaryLogic(visitId, patientId);

	const [printPhotos, setPrintPhotos] = useState<readonly DiaryPrintPhoto[]>([]);
	const [showSummaryModal, setShowSummaryModal] = useState(false);
	const [showPrescriptionModal, setShowPrescriptionModal] = useState(false);
	const [showRadiologyReferralModal, setShowRadiologyReferralModal] =
		useState(false);
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
				<div className="vde-043-print-toolbar no-print">
					<h3>
						<Printer className="w-5 h-5 text-[var(--teal)]" />
						Медицинская карта (Форма 043/у)
					</h3>
					<button
						type="button"
						onClick={() => setShowPreview(false)}
						className="vde-043__btn vde-043__btn--ghost"
						data-testid="form-043-close"
					>
						<X className="w-4 h-4" /> Закрыть
					</button>
				</div>

				<div className="vde-043-print-body" id="print-043">
					<div className="vde-043-doc-header page-break-avoid">
						<h1>Медицинская карта стоматологического больного</h1>
						<p className="vde-043-doc-sub">
							Форма № 043/у (Приказ МЗ РФ № 834н)
						</p>
					</div>

					{(clinicName ||
						clinicAddress ||
						clinicInn ||
						patientFullName !== "—" ||
						patientBirthDate ||
						patientCardNumber ||
						doctorName !== "—") && (
						<div className="vde-043-doc-meta page-break-avoid">
							{clinicName ? (
								<div>
									<strong>Клиника:</strong> {clinicName}
								</div>
							) : null}
							{clinicAddress ? (
								<div>
									<strong>Адрес:</strong> {clinicAddress}
								</div>
							) : null}
							{clinicInn ? (
								<div>
									<strong>ИНН:</strong> {clinicInn}
								</div>
							) : null}
							<div>
								<strong>Пациент:</strong> {patientFullName}
							</div>
							{patientBirthDate ? (
								<div>
									<strong>Дата рождения:</strong> {patientBirthDate}
								</div>
							) : null}
							{patientCardNumber ? (
								<div>
									<strong>№ карты:</strong> {patientCardNumber}
								</div>
							) : null}
							{doctorName !== "—" ? (
								<div>
									<strong>Врач:</strong> {doctorName}
									{doctorSpecialty ? ` (${doctorSpecialty})` : ""}
								</div>
							) : null}
						</div>
					)}

					{isLocked && diaryHash && hasCryptoSignature && !isRevising && (
						<div
							className="vde-043-ecp page-break-avoid"
							data-testid="form-043-ecp"
						>
							<strong>ЭЦП (SHA-256):</strong> {diaryHash}
							<br />
							<strong>Подписан:</strong>{" "}
							{lockedAt ? new Date(lockedAt).toLocaleString("ru-RU") : "—"}
							{revisionCount > 0 && (
								<span className="vde-043-ecp-rev">
									⚠ Ревизий: {revisionCount}
								</span>
							)}
						</div>
					)}

					{diaryUnread ? (
						<div className="vde-043-soap-block page-break-avoid">
							<p>
								{loadStateText?.title ?? "Записи приёма не загружены"}
								{loadStateText?.hint ? ` ${loadStateText.hint}` : ""}
							</p>
						</div>
					) : (
						<div>
							<div className="vde-043-soap-block page-break-avoid">
								<h4>S — Жалобы и анамнез (Subjective)</h4>
								<p>{diary.anamnesis || "—"}</p>
							</div>
							<div className="vde-043-soap-block page-break-avoid">
								<h4>O — Объективный статус (Status Localis)</h4>
								<p>{diary.statusLocalis || "—"}</p>
							</div>
							<div className="vde-043-soap-block page-break-avoid">
								<h4>A — Диагноз (Assessment)</h4>
								<p>
									<strong>МКБ-10:</strong> {diary.diagnosisIcd10 || "—"}{" "}
									{icdEntry ? `(${icdEntry.label})` : ""}
									{diary.diagnosisTooth
										? ` | Зуб по FDI: ${diary.diagnosisTooth}`
										: ""}
								</p>
							</div>
							<div className="vde-043-soap-block page-break-avoid">
								<h4>P — Лечение и план (Plan)</h4>
								<p>{diary.treatmentDescription || "—"}</p>
							</div>
							{(diary.complications || diary.comorbidities) && (
								<div className="vde-043-soap-block page-break-avoid">
									<h4>Осложнения и сопутствующие</h4>
									{diary.complications ? (
										<p>Осложнения: {diary.complications}</p>
									) : null}
									{diary.comorbidities ? (
										<p>Сопутствующие: {diary.comorbidities}</p>
									) : null}
								</div>
							)}
							{trayBarcode ? (
								<div className="vde-043-soap-block page-break-avoid">
									<h4>Инструментальный лоток</h4>
									<p>Штрихкод: {trayBarcode}</p>
								</div>
							) : null}
							{printPhotos.length > 0 ? (
								<div
									className="vde-043-soap-block vde-043-print-photos page-break-avoid"
									data-testid="form-043-photos"
								>
									<h4>Вложения (фотографии лечения)</h4>
									<div className="vde-043-print-photos__grid">
										{(printPhotos ?? []).map((ph) => (
											<figure
												key={ph.id}
												className="vde-043-print-photos__item"
											>
												<img src={ph.objectUrl} alt={ph.name} />
												<figcaption>{ph.name}</figcaption>
											</figure>
										))}
									</div>
								</div>
							) : null}
						</div>
					)}

					<div className="vde-043-sign-row page-break-avoid">
						<div>Подпись врача: ___________________</div>
						<div>
							Дата:{" "}
							{lockedAt
								? new Date(lockedAt).toLocaleDateString("ru-RU")
								: lastSavedAt
									? lastSavedAt.toLocaleDateString("ru-RU")
									: "—"}
						</div>
					</div>
				</div>

				<div className="vde-043-print-footer no-print">
					<button
						type="button"
						onClick={() => setShowPreview(false)}
						className="vde-043__btn"
					>
						Закрыть
					</button>
					<button
						type="button"
						onClick={() => window.print()}
						disabled={printBlocked}
						title={printBlockedReason}
						className="vde-043__btn vde-043__btn--primary"
						data-testid="form-043-print"
					>
						<Printer className="w-4 h-4" /> Напечатать
					</button>
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
						<Scan className="w-4 h-4 text-teal-500" />
						Направление КЛКТ/ОПТГ
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
								className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--teal-surface)] text-[var(--teal-dark)] hover:bg-[var(--teal-soft)] border border-[var(--teal)] text-xs font-semibold transition-colors shadow-xs"
								title="Сформировать структурированный дневник SOAP из отметок на зубной формуле"
								data-testid="populate-diary-from-odontogram-btn"
							>
								<span>🦷</span>
								Заполнить дневник из формулы
							</button>
						)}
					</div>
					<div className="flex items-center gap-2 overflow-x-auto whitespace-nowrap pb-1 scrollbar-none overscroll-x-contain">
						{CLINICAL_FAST_PRESETS.map((preset) => (
							<button
								key={preset.id}
								type="button"
								onClick={() => applyClinicalPreset(preset.id)}
								className="inline-flex items-center gap-1.5 px-3.5 py-2 min-h-[44px] rounded-xl bg-[var(--paper)] hover:bg-[var(--paper-strong)] border border-[var(--line)] text-xs font-medium text-[var(--ink)] hover:border-[var(--teal)] transition-all shrink-0 shadow-xs touch-manipulation"
								title={preset.description}
								data-testid={`preset-btn-${preset.id}`}
							>
								<span className="font-mono text-[10px] px-1.5 py-0.5 rounded-md bg-[var(--teal-surface)] text-[var(--teal-dark)] font-bold">
									{preset.badge}
								</span>
								{preset.label}
							</button>
						))}
					</div>
					<details className="mt-1 text-xs">
						<summary className="cursor-pointer font-medium text-[var(--muted)] hover:text-[var(--ink)]">
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
							<Syringe className="w-3.5 h-3.5 text-blue-500" />
							Анестезия:
						</span>
						<div className="flex items-center gap-2 overflow-x-auto whitespace-nowrap pb-1 sm:pb-0 scrollbar-none flex-1 overscroll-x-contain">
							{ANESTHESIA_QUICK_PRESETS.map((ane) => (
								<button
									key={ane.id}
									type="button"
									onClick={() => applyAnesthesiaPreset(ane.textToInsert)}
									className="inline-flex items-center gap-1.5 px-3 py-2 min-h-[44px] rounded-lg bg-[var(--paper)] hover:bg-blue-500/10 border border-[var(--line)] hover:border-blue-500/30 text-xs font-medium text-[var(--ink)] transition-colors shrink-0 touch-manipulation"
									title={ane.textToInsert}
									data-testid={`anesthesia-btn-${ane.id}`}
								>
									<Plus className="w-3 h-3 text-blue-500" />
									{ane.label}
									<span className="text-[10px] text-[var(--muted)]">
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
									className={`vde-043__icd-chip ${getIcdColor(diary.diagnosisIcd10)}`}
								>
									<span className="vde-043__icd-code">
										{diary.diagnosisIcd10}
									</span>
									<span className="flex-1 min-w-0 truncate">
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
											className="vde-043__btn vde-043__btn--ghost vde-043__btn--icon"
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
										className="vde-043__input vde-043__icd-input"
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
													className="vde-043__icd-opt"
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
														className={`vde-043__icd-opt-code ${ICD_GROUP_COLORS[icd.group] ?? ""}`}
													>
														{icd.code}
													</span>
													<div className="min-w-0">
														<div className="vde-043__icd-opt-label">
															{icd.label}
														</div>
														<div className="vde-043__icd-opt-group">
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
							<span className="text-[11px] font-bold text-[var(--muted)] uppercase tracking-wider flex items-center gap-1.5">
								<Sparkles className="w-3 h-3 text-teal-500" />
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
										className="inline-flex items-center gap-1 px-2.5 py-1 min-h-[30px] rounded-md bg-[var(--paper)] hover:bg-teal-500/10 border border-[var(--line)] hover:border-teal-500/30 text-xs font-medium text-[var(--ink)] transition-colors"
										title={rec.text}
										data-testid={`rec-btn-${rec.id}`}
									>
										<Plus className="w-2.5 h-2.5 text-teal-500" />
										{rec.label}
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
												<li key={b.label}>
													<strong>{b.label}:</strong>{" "}
													<span className="vde-043__revision-prev-text">
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
				onPrint={() => setShowPreview(true)}
				onOpenPrescription={() => setShowPrescriptionModal(true)}
				onOpenRadiologyReferral={() => setShowRadiologyReferralModal(true)}
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

			{/* ── Print Preview Modal ── */}
			{showPreview &&
				typeof window !== "undefined" &&
				createPortal(PrintPreviewContent, document.body)}
		</div>
	);
};
