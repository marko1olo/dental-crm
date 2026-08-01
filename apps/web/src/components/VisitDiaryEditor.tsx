import {
	Activity,
	AlertTriangle,
	Clock,
	FileText,
	Lock,
	Printer,
	Search,
	ShieldCheck,
	Stethoscope,
	X,
} from "lucide-react";
import type React from "react";
import { createPortal } from "react-dom";
import { useAppLogicContext } from "../contexts/AppLogicContext";
import { getIcdColor, ICD_GROUP_COLORS, ICD10_DICTIONARY } from "../lib/icd10";
import { showToast } from "./GlobalToast";
import { PanelLoadFailure } from "./PanelLoadFailure";
import { SmartMicrophoneButton } from "./SmartMicrophoneButton";
import { useVisitDiaryLogic } from "./useVisitDiaryLogic";
import { VisitDiaryPhotoUpload } from "./VisitDiaryPhotoUpload";
import { VisitDiaryTemplateSelector } from "./VisitDiaryTemplateSelector";
import { CryptoProSigner } from "./visit/CryptoProSigner";
import "../styles/visit-diary-043.css";


interface VisitDiaryEditorProps {
	visitId: string;
	patientId: string;
}

function formatPersonName(p: {
	lastName?: string | null;
	firstName?: string | null;
	middleName?: string | null;
	fullName?: string | null;
} | null | undefined): string {
	if (!p) return "—";
	if (typeof p.fullName === "string" && p.fullName.trim()) return p.fullName.trim();
	const parts = [p.lastName, p.firstName, p.middleName]
		.map((x) => (typeof x === "string" ? x.trim() : ""))
		.filter(Boolean);
	return parts.length ? parts.join(" ") : "—";
}

export const VisitDiaryEditor: React.FC<VisitDiaryEditorProps> = ({
	visitId,
	patientId,
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
		lastSavedAt,
		revisionCount,
		isSaving,
		showScanner,
		setShowScanner,
		trayBarcode,
		setTrayBarcode,
		showIcdDropdown,
		setShowIcdDropdown,
		icdSearch,
		setIcdSearch,
		showPreview,
		setShowPreview,
		doSave,
		doLock,
		isRevising,
		revisionReason,
		setRevisionReason,
		isRevisingBusy,
		beginRevise,
		cancelRevise,
		doRevise,
		icdRef,
	} = useVisitDiaryLogic(visitId, patientId);

	/**
	 * Поля закрыты, пока дневник не прочитан, и в подписанном виде (кроме revise).
	 *
	 * БЫЛО: disabled только при isLocked. Пока loadState=loading/failed форма
	 * показывала EMPTY_DIARY как будто новый приём — врач набирал анамнез
	 * поверх непрочитанной записи. Хук уже блокировал doSave/doLock; UI врал.
	 */
	const diaryUnread =
		loadState.phase === "loading" || loadState.phase === "failed";
	const fieldsDisabled = diaryUnread || (isLocked && !isRevising);

	// Always under AppLogicProvider when mounted from VisitOdontogramTab — call unconditionally (Rules of Hooks).
	const ctx = useAppLogicContext();
	const activePatient = ctx.activePatient;
	const clinicSettings = ctx.dashboard?.clinicSettings;
	const activeDoctor = ctx.activeDoctor;


	const patientFullName = formatPersonName(activePatient);
	const patientBirthDate =
		typeof activePatient?.birthDate === "string"
			? activePatient.birthDate
			: typeof activePatient?.dateOfBirth === "string"
				? activePatient.dateOfBirth
				: "";
	const patientCardNumber =
		typeof activePatient?.cardNumber === "string"
			? activePatient.cardNumber
			: typeof activePatient?.medicalCardNumber === "string"
				? activePatient.medicalCardNumber
				: typeof activePatient?.chartNumber === "string"
					? activePatient.chartNumber
					: "";
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
	const doctorName = formatPersonName(activeDoctor);
	const doctorSpecialty =
		typeof activeDoctor?.specialty === "string"
			? activeDoctor.specialty
			: typeof activeDoctor?.specialization === "string"
				? activeDoctor.specialization
				: "";

	// ── ICD-10 select
	const handleIcdSelect = (code: string) => {
		setDiary((prev) => ({ ...prev, diagnosisIcd10: code }));
		setIcdSearch(code);
		setShowIcdDropdown(false);
	};

	/**
	 * Подтверждение введённого кода МКБ-10 по Enter или потере фокуса.
	 *
	 * БЫЛО: единственный способ записать код в дневник — клик мышью по строке
	 * выпадающего списка (onMouseDown). Врач набирал точный код «K04.5»,
	 * нажимал Tab и сохранял: diagnosisIcd10 оставался ПУСТЫМ, и подписанная
	 * форма 043/у печаталась с «МКБ-10: —». Юридически подписанная запись
	 * без кода диагноза.
	 */
	const commitIcdInput = () => {
		const typed = icdSearch.trim();
		if (!typed) return;
		const normalized = typed.toUpperCase();
		const exact = ICD10_DICTIONARY.find(
			(item) => item.code.toUpperCase() === normalized,
		);
		const candidate = exact ?? filteredIcd[0];
		if (candidate) handleIcdSelect(candidate.code);
	};

	const filteredIcd = ICD10_DICTIONARY.filter(
		(i) =>
			i.code.toLowerCase().includes(icdSearch.toLowerCase()) ||
			i.label.toLowerCase().includes(icdSearch.toLowerCase()) ||
			i.group.toLowerCase().includes(icdSearch.toLowerCase()),
	).slice(0, 12);

	const handleAutoResize = (
		e:
			| React.ChangeEvent<HTMLTextAreaElement>
			| React.FocusEvent<HTMLTextAreaElement>,
	) => {
		e.target.style.height = "auto";
		e.target.style.height = e.target.scrollHeight + "px";
	};

	const icdEntry = ICD10_DICTIONARY.find(
		(i) => i.code === diary.diagnosisIcd10,
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
						<Printer className="w-5 h-5" style={{ color: "var(--teal)" }} />{" "}
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
									<strong>Клиника:</strong>
									{clinicName}
								</div>
							) : null}
							{clinicAddress ? (
								<div>
									<strong>Адрес:</strong>
									{clinicAddress}
								</div>
							) : null}
							{clinicInn ? (
								<div>
									<strong>ИНН:</strong>
									{clinicInn}
								</div>
							) : null}
							<div>
								<strong>Пациент:</strong>
								{patientFullName}
							</div>
							{patientBirthDate ? (
								<div>
									<strong>Дата рождения:</strong>
									{patientBirthDate}
								</div>
							) : null}
							{patientCardNumber ? (
								<div>
									<strong>№ карты:</strong>
									{patientCardNumber}
								</div>
							) : null}
							{doctorName !== "—" ? (
								<div>
									<strong>Врач:</strong>
									{doctorName}
									{doctorSpecialty ? ` (${doctorSpecialty})` : ""}
								</div>
							) : null}
						</div>
					)}

					{isLocked && diaryHash && (
						<div
							className="vde-043-ecp page-break-avoid"
							data-testid="form-043-ecp"
							style={{
								clear: "both",
								display: "block",
								position: "relative",
							}}
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

					{/*
					 * Не печатать пустые «—» пока дневник не прочитан: это выдало бы
					 * непрочитанное за пустую карту. Кнопка печати уже disabled, но
					 * showPreview мог остаться true со смены приёма.
					 */}
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
									<p>
										{diary.complications
											? `Осложнения: ${diary.complications}`
											: ""}
										{diary.complications && diary.comorbidities ? "\n" : ""}
										{diary.comorbidities
											? `Сопутствующие: ${diary.comorbidities}`
											: ""}
									</p>
								</div>
							)}
						</div>
					)}

					<div className="vde-043-sign-row page-break-avoid">
						<div>Подпись врача: ___________________</div>
						{/*
						 * Дата документа — дата подписи дневника, не момент печати.
						 * БЫЛО: new Date() = «сегодня». Перепечатка через неделю
						 * ставила в 043/у чужую дату приёма; юридически подписанная
						 * карта расходилась с lockedAt/ЭЦП.
						 */}
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

				{isLocked ? (
					<div className="vde-043__actions">
						<button
							type="button"
							id="diary-print-btn"
							data-testid="diary-print-043"
							onClick={() => setShowPreview(true)}
							disabled={diaryUnread}
							className="vde-043__btn vde-043__btn--print"
							title={
								diaryUnread
									? "Печать недоступна, пока записи приёма не прочитаны"
									: undefined
							}
						>
							<Printer className="w-4 h-4" /> Печать 043/у
						</button>
						{isRevising ? (
							<span className="vde-043__badge vde-043__badge--revise">
								<AlertTriangle className="w-4 h-4" /> ПРАВКА
							</span>
						) : (
							<span className="vde-043__badge vde-043__badge--locked">
								<Lock className="w-4 h-4" /> ПОДПИСАНО
							</span>
						)}
					</div>
				) : (
					<div className="vde-043__actions">
						<button
							type="button"
							id="diary-print-btn"
							data-testid="diary-print-043"
							onClick={() => setShowPreview(true)}
							disabled={diaryUnread}
							className="vde-043__btn vde-043__btn--print"
							title={
								diaryUnread
									? "Печать недоступна, пока записи приёма не прочитаны"
									: undefined
							}
						>
							<Printer className="w-4 h-4" /> Печать 043/у
						</button>
						{!diaryUnread && (
							<VisitDiaryTemplateSelector
								isLocked={isLocked}
								onSelectTemplate={(tmpl: any) => {
									setDiary((prev) => ({
										...prev,
										anamnesis: tmpl.prefilledAnamnesis || prev.anamnesis,
										statusLocalis:
											tmpl.prefilledObjective || prev.statusLocalis,
										treatmentDescription:
											tmpl.prefilledTreatment || prev.treatmentDescription,
										diagnosisIcd10: tmpl.defaultIcd10 || prev.diagnosisIcd10,
									}));
									if (tmpl.defaultIcd10) {
										setIcdSearch(tmpl.defaultIcd10);
									}
								}}
							/>
						)}
					</div>
				)}
			</div>

			{/*
			 * Честные состояния чтения. БЫЛО: loadState/loadStateText экспортировались
			 * из хука, но редактор их не брал — loading и failed рисовали пустой
			 * анамнез как новый приём. Пустые поля SOAP при unread — ложь.
			 */}
			{loadState.phase === "loading" && loadStateText && (
				<div
					className="vde-043__load-banner"
					data-testid="diary-load-loading"
					role="status"
					aria-live="polite"
					style={{
						margin: "0 0 0.75rem",
						padding: "0.75rem 1rem",
						borderRadius: "0.5rem",
						border: "1px solid var(--border, #e2e8f0)",
						background: "var(--surface-muted, #f8fafc)",
						fontSize: "0.8125rem",
						lineHeight: 1.45,
						color: "var(--text-secondary, #475569)",
					}}
				>
					<div style={{ fontWeight: 600 }}>{loadStateText.title}</div>
					{loadStateText.hint ? (
						<div style={{ marginTop: 2 }}>{loadStateText.hint}</div>
					) : null}
				</div>
			)}
			{loadState.phase === "failed" && (
				<div
					className="vde-043__load-banner"
					data-testid="diary-load-failed"
					style={{ margin: "0 0 0.75rem" }}
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
						<Stethoscope className="w-3 h-3" style={{ color: "#2563eb" }} />
						<span className="vde-043__letter vde-043__letter--s">S</span> —
						Жалобы и анамнез
						{!fieldsDisabled && (
							<div className="vde-043__label-mic">
								<SmartMicrophoneButton
									context="visit"
									sterileMode={false}
									className="p-1"
									onResult={(text) =>
										setDiary((p) => ({
											...p,
											anamnesis: p.anamnesis ? p.anamnesis + " " + text : text,
										}))
									}
								/>
							</div>
						)}
					</label>
					<textarea
						id="diary-anamnesis"
						disabled={fieldsDisabled}
						style={{ minHeight: "96px", overflowY: "hidden" }}
						className="auto-resize-ta vde-043__ta"
						value={diary.anamnesis}
						onChange={(e) => {
							handleAutoResize(e);
							setDiary((p) => ({ ...p, anamnesis: e.target.value }));
						}}
						onFocus={handleAutoResize}
						placeholder="Со слов пациента: жалобы на боли, чувствительность..."
					/>
				</div>

				{/* O — Objective */}
				<div className="vde-043__field">
					<label className="vde-043__label" htmlFor="diary-status-localis">
						<Search className="w-3 h-3" style={{ color: "#7c3aed" }} />
						<span className="vde-043__letter vde-043__letter--o">O</span> —
						Объективно (Status Localis)
						{!fieldsDisabled && (
							<div className="vde-043__label-mic">
								<SmartMicrophoneButton
									context="visit"
									sterileMode={false}
									className="p-1"
									onResult={(text) =>
										setDiary((p) => ({
											...p,
											statusLocalis: p.statusLocalis
												? p.statusLocalis + " " + text
												: text,
										}))
									}
								/>
							</div>
						)}
					</label>
					<textarea
						id="diary-status-localis"
						disabled={fieldsDisabled}
						style={{ minHeight: "96px", overflowY: "hidden" }}
						className="auto-resize-ta vde-043__ta"
						value={diary.statusLocalis}
						onChange={(e) => {
							handleAutoResize(e);
							setDiary((p) => ({ ...p, statusLocalis: e.target.value }));
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
									<span style={{ flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
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
											}}
											className="vde-043__btn vde-043__btn--ghost vde-043__btn--icon"
											title="Сбросить"
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
											{filteredIcd.map((icd) => (
												<div
													key={icd.code}
													className="vde-043__icd-opt"
													onMouseDown={(e) => {
														e.preventDefault();
														handleIcdSelect(icd.code);
													}}
												>
													<span
														className={`vde-043__icd-opt-code ${ICD_GROUP_COLORS[icd.group] ?? ""}`}
													>
														{icd.code}
													</span>
													<div style={{ minWidth: 0 }}>
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
								onChange={(e) =>
									setDiary((p) => ({ ...p, diagnosisTooth: e.target.value }))
								}
								placeholder="16, 36..."
								maxLength={8}
							/>
						</div>
					</div>
				</div>

				{/* P — Plan */}
				<div className="vde-043__field vde-043__field--span2">
					<label className="vde-043__label" htmlFor="diary-treatment">
						<FileText className="w-3 h-3" style={{ color: "var(--teal)" }} />
						<span className="vde-043__letter vde-043__letter--p">P</span> —
						Лечение и рекомендации
						{!fieldsDisabled && (
							<div className="vde-043__label-mic">
								<SmartMicrophoneButton
									context="visit"
									sterileMode={false}
									className="p-1"
									onResult={(text) =>
										setDiary((p) => ({
											...p,
											treatmentDescription: p.treatmentDescription
												? p.treatmentDescription + " " + text
												: text,
										}))
									}
								/>
							</div>
						)}
					</label>
					<textarea
						id="diary-treatment"
						disabled={fieldsDisabled}
						style={{ minHeight: "96px", overflowY: "hidden" }}
						className="auto-resize-ta vde-043__ta"
						value={diary.treatmentDescription}
						onChange={(e) => {
							handleAutoResize(e);
							setDiary((p) => ({ ...p, treatmentDescription: e.target.value }));
						}}
						onFocus={handleAutoResize}
						placeholder="Анестезия, проведённые манипуляции, рекомендации..."
					/>
				</div>

				{/* Complications */}
				<div className="vde-043__field vde-043__field--span2">
					<label className="vde-043__label">
						<AlertTriangle
							className="w-3 h-3"
							style={{ color: "var(--rust, #b91c1c)" }}
						/>
						Осложнения и сопутствующие заболевания
					</label>
					<div className="vde-043__complications-grid">
						<textarea
							disabled={fieldsDisabled}
							style={{ minHeight: "72px", overflowY: "hidden" }}
							className="auto-resize-ta vde-043__ta vde-043__ta--sm"
							value={diary.complications}
							onChange={(e) => {
								handleAutoResize(e);
								setDiary((p) => ({ ...p, complications: e.target.value }));
							}}
							onFocus={handleAutoResize}
							placeholder="Осложнения лечения..."
						/>
						<textarea
							disabled={fieldsDisabled}
							style={{ minHeight: "72px", overflowY: "hidden" }}
							className="auto-resize-ta vde-043__ta vde-043__ta--sm"
							value={diary.comorbidities}
							onChange={(e) => {
								handleAutoResize(e);
								setDiary((p) => ({ ...p, comorbidities: e.target.value }));
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
				/>
			</div>

			{/* ── Actions Footer ── */}
			{!isLocked ? (
				<div className="vde-043__footer">
					<span className="vde-043__footer-hint">
						<AlertTriangle className="w-3 h-3" /> Автосохранение каждые 30 сек
					</span>
					<button
						type="button"
						onClick={() => setShowScanner(true)}
						className="vde-043__btn"
						style={{ color: "var(--brand-600, #0284c7)" }}
					>
						<Activity className="w-4 h-4" />
						{trayBarcode ? `Лоток: ${trayBarcode}` : "Сканировать Лоток"}
					</button>
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
						onLock={async (thumbprint, signature) => {
							await doLock(thumbprint, signature);
						}}
					/>
				</div>
			) : isRevising ? (
				<div
					className="vde-043__revise-panel"
					data-testid="diary-revise-panel"
				>
					<div className="vde-043__revise-warn">
						<AlertTriangle className="w-4 h-4 shrink-0" style={{ marginTop: 2 }} />
						<span>
							Режим правки подписанного дневника. Прежний текст сохранится в
							истории. Доступно только администратору клиники.
						</span>
					</div>
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
					<div
						style={{
							display: "flex",
							flexWrap: "wrap",
							justifyContent: "flex-end",
							gap: "0.5rem",
						}}
					>
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
					<ShieldCheck
						className="w-4 h-4 shrink-0"
						style={{ color: "var(--green, #15803d)" }}
					/>
					<span>
						Дневник подписан
						{lockedAt ? ` • ${new Date(lockedAt).toLocaleString("ru-RU")}` : ""}
						.
						{diaryHash && (
							<span className="vde-043__hash" style={{ marginLeft: 8 }}>
								{diaryHash.slice(0, 16)}…
							</span>
						)}
					</span>
					<button
						type="button"
						id="diary-revise-btn"
						data-testid="diary-revise-begin"
						onClick={() => beginRevise()}
						disabled={diaryUnread}
						className="vde-043__btn vde-043__btn--amber"
						style={{ marginLeft: "auto" }}
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

			{showScanner &&
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
								<Activity
									className="w-5 h-5"
									style={{ color: "var(--red, #ef4444)" }}
								/>
								Сканер СанПиН
							</h2>
							<p className="vde-043-scanner__hint">
								Наведите сканер на штрихкод стерильного лотка или введите
								вручную.
							</p>
							<input
								autoFocus
								className="vde-043-scanner__input"
								placeholder="000000000000"
								onKeyDown={(e) => {
									if (e.key === "Enter") {
										const val = e.currentTarget.value.trim();
										if (val) {
											setTrayBarcode(val);
											showToast("Лоток привязан", "success");
											setShowScanner(false);
										}
									}
								}}
							/>
						</div>
					</div>,
					document.body,
				)}

			{showPreview &&
				typeof window !== "undefined" &&
				createPortal(PrintPreviewContent, document.body)}
		</div>
	);
};
