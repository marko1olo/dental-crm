import { CheckCircle2, FileCheck, Printer, QrCode, ShieldCheck, Zap } from "lucide-react";
import type React from "react";
import { WarrantyShareMenu } from "../WarrantyShareMenu";

export interface WarrantyModalFooterProps {
	certificateId: string;
	integrityHash: string;
	patientPhone?: string | undefined;
	shareMenuProps: React.ComponentProps<typeof WarrantyShareMenu>;
	onPrint: () => void;
	onAttachToClinicalNote?: (() => void) | undefined;
	onIssueStandardOneClick?: (() => void) | undefined;
	attachedStatus: boolean;
}

export const WarrantyModalFooter: React.FC<WarrantyModalFooterProps> = ({
	certificateId,
	integrityHash,
	patientPhone,
	shareMenuProps,
	onPrint,
	onAttachToClinicalNote,
	onIssueStandardOneClick,
	attachedStatus,
}) => {
	return (
		<div className="warranty-modal-footer">
			<div className="warranty-footer-left">
				<QrCode size={16} className="text-[var(--teal,#0d9488)] shrink-0" />
				<span className="truncate min-w-0 font-medium">Сертификат: {certificateId}</span>
				<span className="text-[var(--line-strong)]">•</span>
				<span
					className="warranty-footer-hash-badge whitespace-nowrap"
					title={`Цифровая подпись SHA-256: ${integrityHash}`}
				>
					<ShieldCheck size={14} className="text-[var(--ok-fg,#059669)]" />
					<span className="text-xs font-semibold text-[var(--ok-fg,#059669)]">ЭЦП подтверждена</span>
				</span>
			</div>

			<div className="warranty-footer-right">
				<WarrantyShareMenu phone={patientPhone} {...shareMenuProps} />

				<button
					type="button"
					className="warranty-btn-secondary dente-btn-secondary whitespace-nowrap"
					onClick={onPrint}
					title="Распечатать сертификат гарантии"
				>
					<Printer size={15} />
					<span>Печать</span>
				</button>

				<button
					type="button"
					className="warranty-btn-secondary dente-btn-secondary whitespace-nowrap"
					onClick={onAttachToClinicalNote}
					title="Сохранить гарантийный паспорт в медицинскую карту"
				>
					{attachedStatus ? <CheckCircle2 size={15} className="text-[var(--ok-fg)]" /> : <FileCheck size={15} />}
					<span>{attachedStatus ? "Сохранено" : "В карту"}</span>
				</button>

				{onIssueStandardOneClick && (
					<button
						type="button"
						className="warranty-btn-primary dente-btn-primary whitespace-nowrap"
						onClick={onIssueStandardOneClick}
						data-testid="btn-standard-warranty-1click"
						title="Стандартная гарантия: Терапия 1 год, Ортопедия 2 года, Импланты 5 лет — сохранение и печать"
					>
						<Zap size={15} />
						<span>Выдать гарантию</span>
					</button>
				)}
			</div>
		</div>
	);
};
