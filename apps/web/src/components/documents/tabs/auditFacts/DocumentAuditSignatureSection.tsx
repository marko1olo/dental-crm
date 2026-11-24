import React from "react";
import type { DocumentAuditFacts } from "@dental/shared";
import { AlertCircle, CheckCheck, FileSignature, ShieldCheck, Smartphone } from "lucide-react";
import { DocumentUkepSignButton } from "../../DocumentUkepSignButton";

export interface DocumentAuditSignatureSectionProps {
	facts: DocumentAuditFacts;
	documentSourceStatusLabels?: Record<string, string> | undefined;
	documentIssueSignatureModeLabels: Record<string, string>;
	formatShortDate?: ((date: string | null | undefined) => string) | undefined;
	onReloadFacts: (id: string) => Promise<void> | void;
}

export const DocumentAuditSignatureSection: React.FC<DocumentAuditSignatureSectionProps> = React.memo(
	function DocumentAuditSignatureSection({
		facts,
		documentSourceStatusLabels,
		documentIssueSignatureModeLabels,
		formatShortDate,
		onReloadFacts,
	}) {
		const attestation = facts.signatureAttestation;
		const sigMode = attestation?.mode;
		const isSmsOtp = sigMode === "simple_electronic_signature" && Boolean(
			attestation?.note?.toLowerCase().includes("sms") ||
			attestation?.note?.toLowerCase().includes("смс")
		);
		const isHandwritten = sigMode === "paper_signed";
		const isTablet = sigMode === "simple_electronic_signature" && !isSmsOtp;

		return (
			<div className="p-3.5 rounded-xl bg-[var(--paper)] border border-[var(--line)] flex flex-col gap-2.5">
				<div className="flex items-center justify-between">
					<span className="text-xs font-bold text-[var(--ink)]">Сведения о подписании и выдаче</span>
					<span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold bg-[var(--primary)]/10 text-[var(--primary)] border border-[var(--primary)]/30">
						{documentSourceStatusLabels?.[facts.sourceStatus] ?? "Сверено с источником"}
					</span>
				</div>

				{attestation ? (
					<div className={`p-2.5 px-3 rounded-lg border flex flex-col gap-1.5 ${isSmsOtp ? "bg-[var(--primary)]/10 border border-[var(--primary)]" : "bg-[var(--paper-soft)] border-[var(--line)]"}`}>
						<div className="flex items-center gap-2">
							{isSmsOtp ? (
								<Smartphone className="w-4 h-4 text-[var(--primary)] shrink-0" />
							) : isTablet ? (
								<CheckCheck className="w-4 h-4 text-[var(--primary)] shrink-0" />
							) : (
								<FileSignature className="w-4 h-4 text-[var(--primary)] shrink-0" />
							)}
							<strong className="text-xs font-bold text-[var(--ink)]">
								{isSmsOtp
									? "Электронная подпись по СМС подтверждена"
									: isHandwritten
										? "Подписано на бумажном носителе"
										: ((sigMode && documentIssueSignatureModeLabels[sigMode]) || "Подпись зафиксирована")}
							</strong>
						</div>
						<div className="text-xs text-[var(--muted)] flex flex-wrap gap-3">
							<span><strong>Получатель:</strong> {attestation.recipientFullName} ({attestation.recipientRole})</span>
							<span><strong>Ответственный:</strong> {attestation.staffFullName} ({attestation.staffRole})</span>
							{attestation.signedAt && (
								<span><strong>Дата:</strong> {typeof formatShortDate === "function" ? formatShortDate(attestation.signedAt) : String(attestation.signedAt)}</span>
							)}
						</div>
					</div>
				) : (
					<div className="p-2.5 px-3 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center gap-2 text-xs text-[var(--ink)]">
						<AlertCircle className="w-4 h-4 text-amber-500 shrink-0" />
						<span>Подпись пациента ожидает фиксации. Для завершения выдачи выберите «Выдать на бумаге».</span>
					</div>
				)}

				{facts.cryptoSignaturePkcs7 || facts.doctorSignedAt ? (
					<div className="p-2.5 px-3 rounded-lg border border-[var(--teal)] bg-teal-500/10 flex flex-col gap-1">
						<div className="flex items-center gap-2 font-bold text-xs text-[var(--ink)]">
							<ShieldCheck className="w-4 h-4 text-[var(--teal)] shrink-0" />
							<span>Подписано электронной подписью (УКЭП ГОСТ)</span>
						</div>
						<div className="text-xs text-[var(--ink)]"><strong>Владелец сертификата:</strong> {facts.doctorCertSubject || attestation?.staffFullName || "Врач клиники"}</div>
						{facts.doctorCertSerial && <div className="text-[11px] text-[var(--muted)] font-mono break-all"><strong>Серийный номер:</strong> {facts.doctorCertSerial}</div>}
					</div>
				) : facts.status === "issued" ? (
					<div className="flex items-center justify-between gap-2.5 flex-wrap p-2 px-3 rounded-lg bg-[var(--paper-soft)] border border-[var(--line)]">
						<div className="text-xs text-[var(--muted)]">ЭЦП врача не проставлена (для бумаги не требуется — печать доступна сразу):</div>
						<DocumentUkepSignButton documentId={facts.documentId} onSuccess={() => void onReloadFacts(facts.documentId)} />
					</div>
				) : null}
			</div>
		);
	},
);
