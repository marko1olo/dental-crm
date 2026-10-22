import type { MdlpSchema10560Document } from "@dental/shared";
import { CheckCircle2, Download, FileText, Printer } from "lucide-react";
import type React from "react";

export interface MdlpDisposalSuccessBannerProps {
	readonly successDoc: MdlpSchema10560Document;
	readonly onDownloadXml: () => void;
	readonly onDirectPrintAct: () => void;
	readonly onOpenActModal: () => void;
}

export const MdlpDisposalSuccessBanner: React.FC<MdlpDisposalSuccessBannerProps> = ({
	successDoc,
	onDownloadXml,
	onDirectPrintAct,
	onOpenActModal,
}) => {
	return (
		<div className="p-4 rounded-lg bg-[var(--teal-soft,#f0fdfa)] border border-[var(--teal,#0d9488)]/30 text-[var(--teal-dark,#0f766e)] flex flex-col gap-2">
			<div className="flex items-center gap-2 font-bold text-base">
				<CheckCircle2 size={20} className="text-[var(--teal,#0d9488)]" />
				<span>
					Препараты успешно списаны (Документ: {successDoc.docNum})!
					<span className="sr-only">по Схеме 10560</span>
				</span>
			</div>
			<div className="text-xs text-[var(--teal,#0d9488)]">
				Сформирован официальный документ списания маркированных препаратов. Списано карпул: {successDoc.items.length} шт.
				<span className="sr-only">Сформирован официальный XML-пакет для передачи в ИС МДЛП (Честный ЗНАК).</span>
			</div>
			<div className="flex gap-2 mt-1">
				<button
					type="button"
					className="mdlp-btn mdlp-btn-secondary min-h-[44px] text-xs px-3"
					style={{ minHeight: "44px" }}
					onClick={onDownloadXml}
				>
					<Download size={14} /> Скачать XML списания
				</button>
				<button
					type="button"
					className="mdlp-btn mdlp-btn-primary min-h-[44px] text-xs px-3"
					style={{ minHeight: "44px" }}
					onClick={onDirectPrintAct}
					title="Прямая печать акта списания"
				>
					<Printer size={14} /> Печать акта списания
				</button>
				<button
					type="button"
					className="mdlp-btn mdlp-btn-secondary min-h-[44px] text-xs px-3"
					style={{ minHeight: "44px" }}
					onClick={onOpenActModal}
					title="Печать акта списания / настройка реквизитов"
				>
					<FileText size={14} /> Печать акта списания
				</button>
			</div>
		</div>
	);
};
