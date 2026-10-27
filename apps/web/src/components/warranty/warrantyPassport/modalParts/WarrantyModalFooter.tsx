import { CheckCircle2, FileCheck, Printer, QrCode, Zap } from "lucide-react";
import type React from "react";
import { WarrantyShareMenu } from "../WarrantyShareMenu";

export interface WarrantyModalFooterProps {
	certificateId: string;
	integrityHash: string;
	patientPhone?: string;
	shareMenuProps: React.ComponentProps<typeof WarrantyShareMenu>;
	onPrint: () => void;
	onAttachTo043u: () => void;
	onIssueStandardOneClick?: () => void;
	attachedStatus: boolean;
}

export const WarrantyModalFooter: React.FC<WarrantyModalFooterProps> = ({
	certificateId,
	integrityHash,
	patientPhone,
	shareMenuProps,
	onPrint,
	onAttachTo043u,
	onIssueStandardOneClick,
	attachedStatus,
}) => {
	return (
		<div className="warranty-modal-footer">
			<div className="warranty-footer-left">
				<QrCode size={16} />
				<span className="truncate min-w-0">Сертификат: {certificateId}</span>
				<span>•</span>
				<span className="truncate min-w-0">ЭЦП: {integrityHash.slice(0, 16)}...</span>
			</div>

			<div className="warranty-footer-right">
				<WarrantyShareMenu phone={patientPhone} {...shareMenuProps} />

				{onIssueStandardOneClick && (
					<button
						type="button"
						className="warranty-btn-primary"
						onClick={onIssueStandardOneClick}
						data-testid="btn-standard-warranty-1click"
						title="1-Click: Терапия 1 год, Ортопедия 2 года, Импланты 5 лет — сохранение и печать"
						style={{ backgroundColor: "#0d9488", color: "#ffffff", borderColor: "#0d9488" }}
					>
						<Zap size={16} />
						Выдать стандартную гарантию в 1 клик
					</button>
				)}

				<button
					type="button"
					className="warranty-btn-secondary"
					onClick={onPrint}
					title="Распечатать сертификат"
				>
					<Printer size={16} /> Распечатать
				</button>

				<button
					type="button"
					className="warranty-btn-secondary"
					onClick={onAttachTo043u}
					title="Сохранить гарантийный паспорт в медицинскую карту"
				>
					{attachedStatus ? <CheckCircle2 size={16} /> : <FileCheck size={16} />}
					{attachedStatus ? "Обновлено в карте" : "Сохранить в карту"}
				</button>
			</div>
		</div>
	);
};
