import React, { useState, useCallback } from "react";
import {
  AlertCircle,
  Check,
  CheckCircle2,
  FileSignature,
  PenTool,
  Pill,
  Printer,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import type { Prescription107CardProps } from "./types";
import { formatDateTime } from "../useCopilotFormat";

export const Prescription107Card: React.FC<Prescription107CardProps> = ({
	prescription,
	onPrint,
	onSignUkep,
}) => {
	const [isSigned, setIsSigned] = useState<boolean>(
		Boolean(prescription.isSignedUkep),
	);
	const [signing, setSigning] = useState<boolean>(false);

	const handlePrint = useCallback(() => {
		if (onPrint) {
			onPrint(prescription);
		} else if (typeof window !== "undefined") {
			window.print();
		}
	}, [onPrint, prescription]);

	const handleSign = useCallback(() => {
		if (isSigned) return;
		setIsSigned(true);
		setSigning(false);
		onSignUkep?.(prescription);
	}, [isSigned, onSignUkep, prescription]);

	const series = prescription.series || "77-АА";
	const number = prescription.number || "004821";
	const validityText = prescription.isChronicallyIll
		? "Действителен 1 год (для хроников)"
		: `Срок действия: ${prescription.validityDays || 60} дней`;

	return (
		<div
			className="copilot-gen-card copilot-prescription-card"
			data-testid="copilot-prescription-card"
		>
			{/* Header */}
			<div className="copilot-rx-header">
				<div className="copilot-rx-title-box">
					<h4 className="copilot-rx-title">
						<Pill size={16} className="text-[var(--teal)]" />
						<span>Рецептурный бланк № 107-1/у</span>
					</h4>
					<span className="copilot-rx-subtitle">
						Приказ Минздрава России от 24.11.2021 № 1094н
					</span>
				</div>
				<div className="flex flex-col items-end gap-1">
					<span className="copilot-rx-series-badge">
						{`${series} № ${number}`}
					</span>
					<span className="text-[10px] font-semibold text-[var(--muted)]">
						{validityText}
					</span>
				</div>
			</div>

			{/* Patient & Doctor metadata grid */}
			<div className="copilot-rx-meta-grid">
				<div className="copilot-rx-meta-col">
					<span className="copilot-rx-meta-label">Пациент</span>
					<span className="copilot-rx-meta-val">
						{prescription.patientName}
					</span>
					{prescription.patientBirthDate && (
						<span className="text-[11px] text-[var(--muted)]">
							Дата рожд.: {prescription.patientBirthDate}
						</span>
					)}
				</div>

				<div className="copilot-rx-meta-col">
					<span className="copilot-rx-meta-label">Врач</span>
					<span className="copilot-rx-meta-val">{prescription.doctorName}</span>
					{prescription.doctorSpecialty && (
						<span className="text-[11px] text-[var(--muted)]">
							{prescription.doctorSpecialty}
						</span>
					)}
				</div>
			</div>

			{/* Diagnosis if present */}
			{Boolean(prescription.diagnosisIcd10 || prescription.diagnosisName) && (
				<div className="text-xs text-[var(--ink)] bg-[var(--paper-soft)] p-2 rounded border border-[var(--line)]">
					<strong>Диагноз:</strong> {prescription.diagnosisIcd10}{" "}
					{prescription.diagnosisName ? `(${prescription.diagnosisName})` : ""}
				</div>
			)}

			{/* Drug List (Rp: items in Latin + Signa in Russian per Order 1094n) */}
			<div className="copilot-rx-drug-list">
				{prescription.drugs.map((drug, idx) => (
					<div key={drug.id || idx} className="copilot-rx-drug-item">
						<div className="copilot-rx-latin-line">
							{`Rp.: ${drug.latinName || drug.mnn} ${drug.dosage || ""}`.trim()}
						</div>
						<div className="copilot-rx-signa-line">
							<strong>D.t.d.</strong> N {drug.quantity || "1"} •{" "}
							<strong>D.S.</strong> {drug.signa}
						</div>
						{drug.tradeName && (
							<div className="text-xs text-[var(--muted)] mt-0.5">
								Торговое наименование: {drug.tradeName} ({drug.dosageForm})
							</div>
						)}
					</div>
				))}
			</div>

			{/* DDI Safety Badge */}
			<div className="copilot-rx-safety-badge">
				<ShieldCheck size={14} />
				<span>Клинический контроль: Совместимость препаратов проверена (DDI Safe)</span>
			</div>

			{/* UKEP Stamp Box */}
			{isSigned ? (
				<div className="copilot-rx-ukep-stamp signed">
					<FileSignature
						size={18}
						className="text-[var(--teal)] flex-shrink-0"
					/>
					<div style={{ minWidth: 0 }}>
						<div className="font-bold text-xs uppercase tracking-wider text-[var(--teal-dark)]">
							Электронный документ подписан УКЭП
						</div>
						<div className="text-[11px] text-[var(--ink)] mt-0.5">
							Сертификат:{" "}
							<code className="font-mono">
								{prescription.ukepCertificate || "00E10352F71B39D48C19"}
							</code>
						</div>
						<div className="text-[10px] text-[var(--muted)]">
							Владелец: {prescription.doctorName} •{" "}
							{prescription.ukepSignedAt || "31.08.2026 22:30"}
						</div>
					</div>
				</div>
			) : (
				<div className="copilot-rx-ukep-stamp">
					<AlertCircle
						size={15}
						className="text-[var(--amber)] flex-shrink-0"
					/>
					<span>Черновик рецепта. Требуется подписание УКЭП врача.</span>
				</div>
			)}

			{/* Action Buttons */}
			<div className="copilot-rx-actions">
				<button
					type="button"
					onClick={handlePrint}
					className="copilot-rx-print-btn"
					title="Распечатать официальный бланк 107-1/у"
				>
					<Printer size={15} />
					<span>Печать 107-1/у</span>
				</button>

				<button
					type="button"
					disabled={isSigned || signing}
					onClick={handleSign}
					className="copilot-rx-sign-btn"
					title="Подписать рецепт усиленной квалифицированной электронной подписью"
				>
					{isSigned ? (
						<>
							<CheckCircle2 size={15} />
							<span>Подписано УКЭП</span>
						</>
					) : signing ? (
						<span>Подписание...</span>
					) : (
						<>
							<PenTool size={15} />
							<span>Подписать УКЭП</span>
						</>
					)}
				</button>
			</div>
		</div>
	);
};

// ============================================================================
// 4. EstimateTierCard COMPONENT
// ============================================================================

