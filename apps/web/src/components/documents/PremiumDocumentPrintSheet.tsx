import React from "react";
import {
	Activity,
	AlertTriangle,
	CheckCircle2,
	Clock,
	FileText,
	QrCode,
	ShieldCheck,
	Sparkles,
} from "lucide-react";
import {
	BRAND_COLOR_PALETTES,
	type DocumentBrandColor,
	useDocumentBrandingStore,
} from "../../store/documentBrandingStore";
import type { RadiologySnapshotItem } from "../visit/VisitSummaryModal";
import type { ToothData } from "../odontogram/ToothChart";
import "../../styles/premium-document-print.css";

export interface PremiumDocumentPrintSheetProps {
	documentType?: "043u" | "treatment_plan" | "informed_consent" | "prescription" | "contract" | undefined;
	documentTitle?: string | undefined;
	documentSubtitle?: string | undefined;
	patient: {
		fullName?: string | null | undefined;
		birthDate?: string | null | undefined;
		medicalCardNumber?: string | null | undefined;
		passport?: string | null | undefined;
		omsPolis?: string | null | undefined;
		snils?: string | null | undefined;
		phone?: string | null | undefined;
		address?: string | null | undefined;
		gender?: string | null | undefined;
	} | null | undefined;
	doctorName?: string | null | undefined;
	doctorSpecialty?: string | null | undefined;
	doctorSnils?: string | null | undefined;
	visitDate?: string | Date | null | undefined;
	diary?: {
		anamnesis?: string | null | undefined;
		statusLocalis?: string | null | undefined;
		treatmentDescription?: string | null | undefined;
		diagnosisIcd10?: string | null | undefined;
		diagnosisTooth?: string | null | undefined;
		complications?: string | null | undefined;
		comorbidities?: string | null | undefined;
	} | null | undefined;
	icd10Label?: string | null | undefined;
	teethData?: readonly ToothData[] | null | undefined;
	radiologySnapshots?: readonly RadiologySnapshotItem[] | null | undefined;
	diaryHash?: string | null | undefined;
	hasCryptoSignature?: boolean | null | undefined;
	isLocked?: boolean | undefined;
	lockedAt?: string | Date | null | undefined;
	revisionCount?: number | null | undefined;
	customDisclaimer?: string | null | undefined;
	className?: string | undefined;
}

export const PremiumDocumentPrintSheet: React.FC<PremiumDocumentPrintSheetProps> = ({
	documentType = "043u",
	documentTitle = "МЕДИЦИНСКАЯ КАРТА СТОМАТОЛОГИЧЕСКОГО ПАЦИЕНТА",
	documentSubtitle = "Форма № 043/у (Утверждена Приказом Минздрава России № 834н)",
	patient,
	doctorName,
	doctorSpecialty,
	doctorSnils,
	visitDate = new Date(),
	diary,
	icd10Label,
	teethData,
	radiologySnapshots,
	diaryHash,
	hasCryptoSignature,
	isLocked = false,
	lockedAt,
	revisionCount = 0,
	customDisclaimer,
	className = "",
}) => {
	const branding = useDocumentBrandingStore();

	const palette = BRAND_COLOR_PALETTES[branding.brandAccentColor] || BRAND_COLOR_PALETTES.deep_teal;
	const formattedDate = new Date(visitDate || Date.now()).toLocaleDateString("ru-RU", {
		day: "numeric",
		month: "long",
		year: "numeric",
	});

	const activeTeethWithFindings = (teethData || []).filter((t) => {
		const s = (t.state || "").toLowerCase();
		return s !== "healthy" && s !== "" && s !== "0";
	});

	return (
		<div
			className={`premium-doc-sheet doc-palette-${branding.brandAccentColor} doc-density-${branding.layoutDensity} doc-font-${branding.fontFamily} ${className}`.trim()}
			style={
				{
					"--doc-primary": palette.primary,
					"--doc-primary-dark": palette.primaryDark,
					"--doc-soft-bg": palette.softBg,
					"--doc-accent-border": palette.accentBorder,
				} as React.CSSProperties
			}
		>
			{/* ── Clinic Header ── */}
			{branding.headerStyle === "classic_centered" ? (
				<header className="doc-header-classic-centered">
					<div className="doc-brand-title">{branding.clinicName}</div>
					{branding.slogan && <div className="doc-brand-slogan">{branding.slogan}</div>}
					{branding.showClinicRequisites && (
						<div className="doc-clinic-meta mt-1">
							{branding.clinicLegalName} • Лицензия: {branding.licenseNumber}
							<br />
							{branding.clinicAddress} • Тел: {branding.clinicPhone} • {branding.clinicWebsite}
						</div>
					)}
				</header>
			) : branding.headerStyle === "minimal_clean" ? (
				<header className="doc-header-minimal-clean flex items-center justify-between">
					<div>
						<div className="doc-brand-title">{branding.clinicName}</div>
						<div className="doc-clinic-meta">{branding.clinicAddress}</div>
					</div>
					<div className="text-right doc-clinic-meta">
						Лицензия: {branding.licenseNumber}
						<br />
						Тел: {branding.clinicPhone}
					</div>
				</header>
			) : (
				/* Modern Split */
				<header className="doc-header-modern-split">
					<div className="flex items-center gap-3">
						{branding.showClinicLogo && (
							<div
								className="w-12 h-12 rounded-xl flex items-center justify-center font-black text-xl text-white shadow-sm shrink-0"
								style={{ backgroundColor: palette.primary }}
							>
								{branding.logoUrl ? (
									<img
										src={branding.logoUrl}
										alt={branding.clinicName}
										className="w-full h-full object-contain rounded-xl"
									/>
								) : (
									<span>D</span>
								)}
							</div>
						)}
						<div>
							<div className="doc-brand-title">{branding.clinicName}</div>
							{branding.slogan && <div className="doc-brand-slogan">{branding.slogan}</div>}
							<div className="doc-clinic-meta mt-0.5">
								{branding.clinicLegalName}
							</div>
						</div>
					</div>
					{branding.showClinicRequisites && (
						<div className="text-right doc-clinic-meta">
							<div className="font-semibold text-[var(--doc-primary-dark)]">
								Лицензия: {branding.licenseNumber}
							</div>
							<div>{branding.clinicAddress}</div>
							<div>
								Тел: <strong>{branding.clinicPhone}</strong> • {branding.clinicWebsite}
							</div>
						</div>
					)}
				</header>
			)}

			{/* ── Document Title Box ── */}
			<div className="doc-official-title-box">
				<h1>{documentTitle}</h1>
				<div className="doc-form-sub">{documentSubtitle}</div>
				<div className="mt-1 flex justify-center">
					{isLocked ? (
						<span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded border border-emerald-600/40 bg-emerald-500/10 text-emerald-800 text-[10px] font-bold tracking-wider uppercase">
							<CheckCircle2 className="w-3 h-3 text-emerald-600" />
							{(revisionCount ?? 0) > 0
								? `ИСПРАВЛЕННОМУ ВЕРИТЬ (РЕДАКЦИЯ ${(revisionCount ?? 0) + 1})`
								: "ПОДПИСАНО ВРАЧОМ"}
						</span>
					) : (
						<span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded border border-amber-600/40 bg-amber-500/10 text-amber-800 text-[10px] font-bold tracking-wider uppercase">
							<FileText className="w-3 h-3 text-amber-600" />
							ЧЕРНОВИК (ПРИЁМ НЕ ЗАКРЫТ)
						</span>
					)}
				</div>
			</div>

			{!isLocked ? (
				<div
					className="doc-watermark-draft"
					aria-hidden="true"
					style={{
						position: "absolute",
						top: "50%",
						left: "50%",
						transform: "translate(-50%, -50%) rotate(-32deg)",
						fontSize: "64pt",
						fontWeight: 900,
						color: "rgba(15, 23, 42, 0.045)",
						textTransform: "uppercase",
						letterSpacing: "0.12em",
						pointerEvents: "none",
						zIndex: 0,
						whiteSpace: "nowrap",
						userSelect: "none",
					}}
				>
					ЧЕРНОВИК
				</div>
			) : (
				<div
					className="doc-watermark-signed"
					aria-hidden="true"
					style={{
						position: "absolute",
						top: "50%",
						left: "50%",
						transform: "translate(-50%, -50%) rotate(-32deg)",
						fontSize: (revisionCount ?? 0) > 0 ? "42pt" : "50pt",
						fontWeight: 900,
						color: "rgba(16, 185, 129, 0.045)",
						textTransform: "uppercase",
						letterSpacing: "0.12em",
						pointerEvents: "none",
						zIndex: 0,
						whiteSpace: "nowrap",
						userSelect: "none",
					}}
				>
					{(revisionCount ?? 0) > 0 ? "ИСПРАВЛЕННОМУ ВЕРИТЬ" : "ПОДПИСАНО ВРАЧОМ"}
				</div>
			)}

			{/* ── Patient Requisites Grid Table ── */}
			<table className="doc-meta-table">
				<tbody>
					<tr>
						<td className="doc-label">Пациент (ФИО):</td>
						<td className="doc-val" style={{ width: "45%" }}>
							<strong>{patient?.fullName || "—"}</strong>
						</td>
						<td className="doc-label">Дата приёма:</td>
						<td className="doc-val">{formattedDate}</td>
					</tr>
					<tr>
						<td className="doc-label">Дата рождения:</td>
						<td className="doc-val">
							{patient?.birthDate || "—"}{" "}
							{patient?.gender ? `(${patient.gender === "female" ? "Жен." : "Муж."})` : ""}
						</td>
						<td className="doc-label">№ Медицинской карты:</td>
						<td className="doc-val">
							<strong>{patient?.medicalCardNumber || "—"}</strong>
						</td>
					</tr>
					<tr>
						<td className="doc-label">Паспортные данные:</td>
						<td className="doc-val">{patient?.passport || "—"}</td>
						<td className="doc-label">Полис ОМС / ДМС:</td>
						<td className="doc-val">{patient?.omsPolis || "—"}</td>
					</tr>
					<tr>
						<td className="doc-label">СНИЛС:</td>
						<td className="doc-val">{patient?.snils || "—"}</td>
						<td className="doc-label">Контактный телефон:</td>
						<td className="doc-val">{patient?.phone || "—"}</td>
					</tr>
					<tr>
						<td className="doc-label">Лечащий врач:</td>
						<td className="doc-val" colSpan={3}>
							<strong>{doctorName || "—"}</strong>{" "}
							{doctorSpecialty ? `(${doctorSpecialty})` : ""}{" "}
							{doctorSnils ? `• СНИЛС врача: ${doctorSnils}` : ""}
						</td>
					</tr>
				</tbody>
			</table>

			{/* ── Structured SOAP Clinical Diary ── */}
			{branding.showDetailedSoap && diary && (
				<div className="doc-soap-container">
					{/* S - Subjective */}
					<div className="doc-soap-section">
						<div className="doc-soap-heading">
							<span>S · Жалобы и анамнез заболевания (Subjective)</span>
						</div>
						<div className="doc-soap-text">
							{diary.anamnesis || "Жалоб на момент осмотра активно не предъявляет."}
						</div>
					</div>

					{/* O - Objective Status Localis */}
					<div className="doc-soap-section">
						<div className="doc-soap-heading">
							<span>O · Объективный осмотр и статус полости рта (Status Localis)</span>
						</div>
						<div className="doc-soap-text">
							{diary.statusLocalis || "Слизистая оболочка полости рта физиологической окраски, без патологических элементов."}
						</div>

						{/* Dental Formula Graphic / Tags */}
						{branding.showOdontogramDiagram && activeTeethWithFindings.length > 0 && (
							<div className="doc-odontogram-box">
								<div className="text-[11px] font-bold text-[var(--doc-primary-dark)] uppercase tracking-wider">
									Зубная формула и выявленные патологии (FDI):
								</div>
								<div className="doc-teeth-formula-grid">
									{activeTeethWithFindings.map((tooth) => (
										<span key={tooth.toothNumber} className="doc-tooth-pill">
											<strong>Зуб {tooth.toothNumber}:</strong> {tooth.state}
											{tooth.surfaces && tooth.surfaces.length > 0
												? ` (${tooth.surfaces.join(", ")})`
												: ""}
										</span>
									))}
								</div>
							</div>
						)}
					</div>

					{/* A - Assessment / ICD-10 Diagnosis */}
					<div className="doc-soap-section">
						<div className="doc-soap-heading">
							<span>A · Клинический диагноз по МКБ-10 (Assessment)</span>
						</div>
						<div className="doc-soap-text">
							<strong>Код МКБ-10:</strong>{" "}
							<span
								className="px-2 py-0.5 rounded font-mono font-bold text-white text-xs inline-block"
								style={{ backgroundColor: palette.primary }}
							>
								{diary.diagnosisIcd10 || "Z01.2"}
							</span>{" "}
							{icd10Label ? `— ${icd10Label}` : ""}{" "}
							{diary.diagnosisTooth ? `(Зуб FDI: № ${diary.diagnosisTooth})` : ""}
						</div>
					</div>

					{/* P - Plan & Treatment Protocol */}
					<div className="doc-soap-section">
						<div className="doc-soap-heading">
							<span>P · Протокол оказанной медицинской помощи и назначения (Plan)</span>
						</div>
						<div className="doc-soap-text">
							{diary.treatmentDescription || "Проведена консультация, составлен предварительный план лечения."}
						</div>
					</div>

					{/* Complications & Comorbidities */}
					{(diary.complications || diary.comorbidities) && (
						<div className="doc-soap-section">
							<div className="doc-soap-heading">
								<span>Осложнения и сопутствующая соматическая патология</span>
							</div>
							<div className="doc-soap-text">
								{diary.complications && <div>• Осложнения: {diary.complications}</div>}
								{diary.comorbidities && <div>• Сопутствующие заболевания: {diary.comorbidities}</div>}
							</div>
						</div>
					)}
				</div>
			)}

			{/* ── High-DPI Radiology / CBCT Snapshots ── */}
			{branding.showRadiologyThumbnails && radiologySnapshots && radiologySnapshots.length > 0 && (
				<div className="doc-soap-section mt-3">
					<div className="doc-soap-heading">
						<span>Рентгенологическое обследование и данные радиовизиографии / КЛКТ</span>
					</div>
					<div className="doc-radiology-grid">
						{radiologySnapshots.map((snap, idx) => (
							<div key={snap.id || idx} className="doc-radiology-card">
								<img
									src={snap.thumbnailDataUri || snap.imageDataUri}
									alt={snap.title || `Снимок ${idx + 1}`}
								/>
								<div className="doc-radiology-meta">
									<strong>
										{snap.toothCode
											? `Зуб FDI № ${snap.toothCode}`
											: snap.title || "Снимок 043/у"}
									</strong>
									{snap.boneDensity && (
										<div>Плотность: {snap.boneDensity.classification} ({Math.round(snap.boneDensity.averageHU)} HU)</div>
									)}
									{snap.radiologicalFinding && (
										<div className="truncate">{snap.radiologicalFinding}</div>
									)}
								</div>
							</div>
						))}
					</div>
				</div>
			)}

			{/* ── Signatures, Official Stamp & QR Security Block ── */}
			<div className="doc-sign-zone">
				{branding.showQrVerification && (
					<div className="doc-qr-stamp">
						<div className="w-12 h-12 bg-white p-1 border border-neutral-300 rounded flex items-center justify-center shrink-0">
							<QrCode className="w-10 h-10 text-neutral-900" />
						</div>
						<div className="doc-qr-meta">
							<strong>Электронная верификация карты:</strong>
							<br />
							{diaryHash ? (
								<span className="font-mono text-[9px] block truncate max-w-[170px]">
									SHA-256: {diaryHash.slice(0, 24)}…
								</span>
							) : (
								<span>Документ зарегистрирован в МИС ДЕНТЕ</span>
							)}
							{hasCryptoSignature && (
								<span className="text-[var(--ok-fg,#059669)] font-bold block">Подписано УКЭП</span>
							)}
						</div>
					</div>
				)}

				{branding.showDoctorStampFrame && (
					<div className="doc-stamp-box">
						<span>М.П.</span>
					</div>
				)}

				{/* Doctor Signature */}
				<div className="doc-signature-block">
					<div className="text-xs font-bold text-[var(--doc-primary-dark)]">
						Врач-стоматолог: ____________________ / {doctorName || "____________"}
					</div>
					<div className="doc-sign-hint">(подпись и личная печать врача)</div>
				</div>

				{/* Patient Signature */}
				{branding.showPatientSignatureLine && (
					<div className="doc-signature-block">
						<div className="text-xs font-bold text-[var(--doc-primary-dark)]">
							Пациент: ____________________ / {patient?.fullName || "____________"}
						</div>
						<div className="doc-sign-hint">(с диагнозом и планом лечения ознакомлен)</div>
					</div>
				)}
			</div>

			{/* ── Footer Disclaimer & Clinic Guarantee ── */}
			{(customDisclaimer || branding.customDisclaimer) && (
				<footer className="doc-footer-disclaimer">
					{customDisclaimer || branding.customDisclaimer}
				</footer>
			)}
		</div>
	);
};
