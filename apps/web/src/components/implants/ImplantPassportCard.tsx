import React from "react";
import { Award } from "lucide-react";
import { showToast } from "../GlobalToast";
import type { FastImplantPassportData } from "./presets/implantPresetTypes";
import { AnatomicalJawArchSchema } from "./card/ImplantJawArchSchema";
import { getToothAnatomicalDescription } from "./card/toothAnatomyHelpers";
import { ImplantPassportCardHeader } from "./card/ImplantPassportCardHeader";
import { ImplantPassportClinicalGrid } from "./card/ImplantPassportClinicalGrid";
import { ImplantPassportWarrantySection } from "./card/ImplantPassportWarrantySection";
import "./implants.css";

export { AnatomicalJawArchSchema };

export interface ImplantPassportCardProps {
	readonly data: FastImplantPassportData;
	readonly className?: string;
	readonly onCopySummary?: () => void;
	readonly onPrint?: () => void;
}

export const ImplantPassportCard: React.FC<ImplantPassportCardProps> = ({
	data,
	className = "",
	onCopySummary,
	onPrint,
}) => {
	const formattedDate = data.dateIso ? new Date(data.dateIso).toLocaleDateString("ru-RU") : "«____» ____________ 20___ г.";
	const displayPatientName = data.patientName?.trim() || "____________________________________";
	const displayLot = data.lotNumber?.trim() || "____________________";
	const displaySn = data.serialNumber?.trim() || "____________________";
	const displayDoctor = data.doctorName?.trim() || "________________________";
	const toothAnatomy = getToothAnatomicalDescription(data.toothFdi);
	const capTypeRu = data.capType === "plug" ? "Винт-заглушка (двухэтапный протокол с ушиванием наглухо)" : "ФДМ (формирователь десны, одноэтапный протокол)";
	const barcodeSummary = `(01)${data.catalogArticle || "REF"}(10)${displayLot}(21)${displaySn}`;

	const handleCopy = () => {
		const text = `ПАСПОРТ ИМПЛАНТАТА (FDI #${data.toothFdi || "___"})\nПозиция: ${toothAnatomy}\nПациент: ${displayPatientName}\nСистема: ${data.brand} ${data.model} Ø ${data.diameterMm} x ${data.lengthMm} мм\nТорк: ${data.torqueNcm || 35} Н·см | ISQ: ${data.isqDay0 ?? 72}\nLOT: ${displayLot} | SN: ${displaySn}\nДата: ${formattedDate} · Врач: ${displayDoctor}`;
		navigator.clipboard?.writeText(text);
		onCopySummary?.();
		showToast(`Паспорт имплантата #${data.toothFdi || ""} скопирован`, "success");
	};

	const handleShareWhatsApp = () => {
		const text = encodeURIComponent(`Паспорт имплантата DENTE (Зуб FDI #${data.toothFdi || "___"})\nПациент: ${displayPatientName}\nИмплантат: ${data.brand} Ø${data.diameterMm}x${data.lengthMm}мм\nLOT: ${displayLot} | Торк: ${data.torqueNcm || 35} Н·см | ISQ: ${data.isqDay0 ?? 72}`);
		window.open(`https://api.whatsapp.com/send?text=${text}`, "_blank", "noopener,noreferrer");
		showToast(`Паспорт #${data.toothFdi || ""} отправлен в WhatsApp`, "success");
	};

	const handleShareTelegram = () => {
		const text = encodeURIComponent(`Паспорт имплантата DENTE (Зуб FDI #${data.toothFdi || "___"})\nПациент: ${displayPatientName}\nИмплантат: ${data.brand} Ø${data.diameterMm}x${data.lengthMm}мм`);
		const url = encodeURIComponent(`https://dente.clinic/passport/${data.passportId}`);
		window.open(`https://t.me/share/url?url=${url}&text=${text}`, "_blank", "noopener,noreferrer");
		showToast(`Паспорт #${data.toothFdi || ""} отправлен в Telegram`, "success");
	};

	const handlePrint = () => {
		if (onPrint) onPrint();
		else window.print?.();
		showToast(`Бланк паспорта имплантата #${data.toothFdi || ""} отправлен на печать`, "success");
	};

	return (
		<div className={`implant-passport-display-card space-y-4 ${className}`.trim()} data-testid="implant-passport-card">
			<ImplantPassportCardHeader data={data} onCopy={handleCopy} onPrint={handlePrint} onShareWhatsApp={handleShareWhatsApp} onShareTelegram={handleShareTelegram} />
			<div className="p-2.5 rounded-xl bg-[var(--paper-soft)] border border-[var(--line)] text-xs flex items-center justify-between flex-wrap gap-2">
				<div className="flex items-center gap-2 min-w-0">
					<Award size={16} className="text-[var(--teal,#0d9488)] shrink-0" />
					<span className="text-[var(--muted)]">Анатомическая локализация:</span>
					<strong className="text-[var(--ink)] font-extrabold truncate" title={toothAnatomy}>
						{`${data.toothFdi ? `${data.toothFdi} — ` : ""}${toothAnatomy}`} (FDI #{data.toothFdi || "__"})
					</strong>
				</div>
				<span className="text-[11px] font-mono text-[var(--muted)] shrink-0">Постоянный прикус</span>
			</div>
			<AnatomicalJawArchSchema selectedFdi={data.toothFdi} brand={data.brand} diameterMm={data.diameterMm} lengthMm={data.lengthMm} />
			<ImplantPassportClinicalGrid data={data} displayPatientName={displayPatientName} displayDoctor={displayDoctor} formattedDate={formattedDate} capTypeRu={capTypeRu} />
			<div className="grid grid-cols-2 sm:grid-cols-6 gap-3 text-xs pt-2 border-t border-[var(--line)]">
				<div className="min-w-0"><span className="text-[11px] text-[var(--muted)] block">REF / Артикул:</span><span className="font-mono font-bold text-[var(--ink)] block truncate" data-testid="passport-catalog-article">{data.catalogArticle || "TS3S4010S"}</span></div>
				<div className="min-w-0"><span className="text-[11px] text-[var(--muted)] block">LOT / Партия:</span><span className="font-mono font-bold text-[var(--ink)] block truncate" title={displayLot}>{displayLot}</span></div>
				<div className="min-w-0"><span className="text-[11px] text-[var(--muted)] block">Серийный номер:</span><span className="font-mono font-bold text-[var(--ink)] block truncate" title={displaySn}>{displaySn}</span></div>
				<div className="min-w-0"><span className="text-[11px] text-[var(--muted)] block">Стерилен до:</span><span className="font-mono font-bold text-[var(--teal,#0d9488)] block truncate">{data.expirationDate || "2028-11-30"}</span></div>
				<div className="min-w-0"><span className="text-[11px] text-[var(--muted)] block">Формирователь / Заглушка:</span><span className="font-bold text-[var(--ink)] block truncate">{data.capType === "plug" ? "Винт-заглушка (2 этапа)" : "ФДМ (формирователь десны)"}</span></div>
				<div className="min-w-0"><span className="text-[11px] text-[var(--muted)] block">Дата:</span><span className="font-bold text-[var(--ink)] block truncate">{formattedDate}</span></div>
			</div>
			<ImplantPassportWarrantySection data={data} displayDoctor={displayDoctor} barcodeSummary={barcodeSummary} />
		</div>
	);
};

export default ImplantPassportCard;
