import { CheckCircle2, FileCheck, Printer, QrCode } from "lucide-react";
import type React from "react";
import { WarrantyShareMenu } from "../WarrantyShareMenu";

export interface WarrantyModalFooterProps {
	certificateId: string;
	integrityHash: string;
	patientPhone?: string;
	shareMenuProps: React.ComponentProps<typeof WarrantyShareMenu>;
	onPrint: () => void;
	onAttachTo043u: () => void;
	attachedStatus: boolean;
}

export const WarrantyModalFooter: React.FC<WarrantyModalFooterProps> = ({
	certificateId,
	integrityHash,
	patientPhone,
	shareMenuProps,
	onPrint,
	onAttachTo043u,
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
				<button type="button" className="warranty-btn-secondary" onClick={onPrint}>
					<Printer size={16} /> Распечатать сертификат (Enter)
				</button>
				<button
					type="button"
					className="warranty-btn-primary"
					onClick={onAttachTo043u}
					title="Выдать гарантийный паспорт и сохранить в медицинскую карту"
				>
					{attachedStatus ? <CheckCircle2 size={16} /> : <FileCheck size={16} />}
					{attachedStatus ? "Обновлено в карте" : "Выдать гарантийный паспорт"}
				</button>
			</div>
		</div>
	);
};
