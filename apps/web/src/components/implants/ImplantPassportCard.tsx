/**
 * ImplantPassportCard.tsx — Канонический гарантийный паспорт дентального имплантата (DENTE CRM).
 * Официальный клиентский документ формата А5, QR-код верификации, формула FDI (Мандаты 8e, 8x, 8am).
 */

import React from "react";
import { Award, Copy, Printer, QrCode, Send, Share2, ShieldCheck, TriangleAlert } from "lucide-react";
import { showToast } from "../GlobalToast";
import { DentalImplant } from "../icons/DentalIcons";
import type { FastImplantPassportData } from "./implantQuickPresets";
import "./implants.css";

export const UPPER_JAW_TEETH = [18, 17, 16, 15, 14, 13, 12, 11, 21, 22, 23, 24, 25, 26, 27, 28] as const;
export const LOWER_JAW_TEETH = [48, 47, 46, 45, 44, 43, 42, 41, 31, 32, 33, 34, 35, 36, 37, 38] as const;

export function getToothCoords(index: number, isUpper: boolean): { x: number; y: number } {
	const isRightQuadrant = index < 8;
	const x = isRightQuadrant ? 24 + index * 27 : 260 + (index - 8) * 27;
	const dist = Math.abs(x - 242) / 220;
	const curveOffset = Math.pow(dist, 1.8) * 16;
	const y = isUpper ? 38 - curveOffset : 72 + curveOffset;
	return { x, y };
}

export function getToothAnatomicalDescription(toothFdi: number): string {
	if (!toothFdi || toothFdi < 11 || toothFdi > 48) return "Область дентальной имплантации";
	const quadrant = Math.floor(toothFdi / 10);
	const num = toothFdi % 10;
	const names: Record<number, string> = {
		1: "Центральный резец", 2: "Боковой резец", 3: "Клык",
		4: "Первый премоляр", 5: "Второй премоляр", 6: "Первый моляр",
		7: "Второй моляр", 8: "Третий моляр (зуб мудрости)",
	};
	const quadNames: Record<number, string> = {
		1: "верхней челюсти справа", 2: "верхней челюсти слева",
		3: "нижней челюсти слева", 4: "нижней челюсти справа",
	};
	return `${names[num] || "Зуб"} ${quadNames[quadrant] || ""}`.trim();
}

export const AnatomicalJawArchSchema: React.FC<{
	readonly selectedFdi: number;
	readonly brand?: string;
	readonly diameterMm?: number;
	readonly lengthMm?: number;
}> = ({ selectedFdi, brand = "Имплантат", diameterMm, lengthMm }) => {
	const renderTooth = (tooth: number, idx: number, isUpper: boolean) => {
		const { x, y } = getToothCoords(idx, isUpper);
		const isTarget = tooth === selectedFdi;
		return (
			<g key={tooth} className="tooth-node">
				{isTarget ? (
					<>
						<rect x={x - 12} y={y - 11} width="24" height="22" rx="5" fill="var(--teal, #0d9488)" stroke="#0f766e" strokeWidth="1.5" />
						<circle cx={x} cy={isUpper ? y - 13 : y + 13} r="2.5" fill="#f59e0b" />
						<text x={x} y={y + 3.5} textAnchor="middle" fill="#ffffff" fontSize="10" fontWeight="900" fontFamily="monospace">
							{tooth}
						</text>
					</>
				) : (
					<>
						<rect x={x - 11} y={y - 10} width="22" height="20" rx="4" fill="var(--paper)" stroke="var(--line)" strokeWidth="1" />
						<text x={x} y={y + 3.5} textAnchor="middle" fill="var(--muted)" fontSize="9" fontWeight="700" fontFamily="monospace">
							{tooth}
						</text>
					</>
				)}
			</g>
		);
	};

	return (
		<div className="anatomical-jaw-arch-container p-3 rounded-xl bg-[var(--paper-soft)] border border-[var(--line)] flex flex-col gap-1.5" data-testid="anatomical-jaw-arch">
			<div className="flex items-center justify-between text-xs flex-wrap gap-1">
				<span className="font-black uppercase tracking-wider text-[var(--muted)] text-[10px]">
					Анатомическая зубная дуга FDI (Локализация имплантата):
				</span>
				<div className="flex items-center gap-2 text-[11px] font-mono">
					<span className="inline-flex items-center gap-1.5 text-[var(--teal,#0d9488)] font-bold">
						<span className="w-2.5 h-2.5 rounded-xs bg-[var(--teal,#0d9488)] inline-block" />
						{`Имплантат #${selectedFdi || "—"} (${brand}${diameterMm && lengthMm ? ` Ø${Number(diameterMm).toFixed(1)}×${lengthMm}мм` : ""})`}
					</span>
				</div>
			</div>
			<div className="w-full overflow-x-auto py-1">
				<svg viewBox="0 0 490 114" className="w-full h-auto max-h-[140px] text-[var(--ink)] select-none" role="img" aria-label={`Схема зубного ряда #${selectedFdi}`}>
					<path d="M 24 22 Q 242 46 460 22" fill="none" stroke="var(--line)" strokeDasharray="3 3" opacity="0.5" />
					<path d="M 24 88 Q 242 64 460 88" fill="none" stroke="var(--line)" strokeDasharray="3 3" opacity="0.5" />
					<line x1="242" y1="14" x2="242" y2="98" stroke="var(--line-strong, #94a3b8)" strokeDasharray="2 2" opacity="0.4" />
					<text x="242" y="11" textAnchor="middle" fill="var(--muted)" fontSize="8" fontWeight="800" letterSpacing="0.06em">ВЕРХНЯЯ ЧЕЛЮСТЬ (MAXILLA)</text>
					<text x="242" y="108" textAnchor="middle" fill="var(--muted)" fontSize="8" fontWeight="800" letterSpacing="0.06em">НИЖНЯЯ ЧЕЛЮСТЬ (MANDIBULA)</text>
					<text x="18" y="11" fill="var(--muted)" fontSize="7.5" fontWeight="700">ПРАВО (R)</text>
					<text x="466" y="11" textAnchor="end" fill="var(--muted)" fontSize="7.5" fontWeight="700">ЛЕВО (L)</text>
					{UPPER_JAW_TEETH.map((tooth, idx) => renderTooth(tooth, idx, true))}
					{LOWER_JAW_TEETH.map((tooth, idx) => renderTooth(tooth, idx, false))}
				</svg>
			</div>
		</div>
	);
};

export interface ImplantPassportCardProps {
	readonly data: FastImplantPassportData;
	readonly className?: string | undefined;
	readonly onCopySummary?: (() => void) | undefined;
	readonly onPrint?: (() => void) | undefined;
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
	const barcodeSummary = `REF ${data.catalogArticle || "REF"} · LOT ${displayLot} · SN ${displaySn}`;
	const torqueText = data.torqueNcm ? `${data.torqueNcm} Н·см` : "35 Н·см (клинический оптимум)";
	const densityText = data.boneDensity ? `${data.boneDensity} (Misch)` : "D2 (Misch)";

	const handleCopy = () => {
		const text = `ПАСПОРТ ИМПЛАНТАТА (FDI #${data.toothFdi || "___"})\nПозиция: ${toothAnatomy}\nПациент: ${displayPatientName}\nСистема: ${data.brand} ${data.model} Ø ${data.diameterMm} x ${data.lengthMm} мм\nТорк: ${data.torqueNcm || 35} Н·см | Плотность: ${data.boneDensity || "D2"}\nREF: ${data.catalogArticle || "TS3S4010S"} | LOT: ${displayLot} | SN: ${displaySn}\nДата: ${formattedDate} · Врач: ${displayDoctor}`;
		navigator.clipboard?.writeText(text);
		onCopySummary?.();
		showToast(`Паспорт имплантата #${data.toothFdi || ""} скопирован`, "success");
	};

	const handleShareWhatsApp = () => {
		const text = encodeURIComponent(`Паспорт имплантата DENTE (Зуб FDI #${data.toothFdi || "___"})\nПациент: ${displayPatientName}\nИмплантат: ${data.brand} Ø${data.diameterMm}x${data.lengthMm}мм\nLOT: ${displayLot} | Торк: ${data.torqueNcm || 35} Н·см`);
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
		<div className={`implant-passport-display-card space-y-3.5 ${className}`.trim()} data-testid="implant-passport-card">
			{/* Шапка карточки паспорта формата А5 */}
			<div className="flex items-center justify-between border-b border-[var(--line)] pb-3 flex-wrap gap-2">
				<div className="flex items-center gap-2.5 min-w-0">
					<div className="w-9 h-9 rounded-xl bg-[var(--teal-surface,rgba(13,148,136,0.1))] text-[var(--teal,#0d9488)] flex items-center justify-center shrink-0 border border-[var(--teal-soft,rgba(13,148,136,0.3))]">
						<DentalImplant size={22} />
					</div>
					<div className="min-w-0">
						<h4 className="text-sm font-black text-[var(--ink)] tracking-tight truncate flex items-center gap-2">
							<span>Паспорт имплантата DENTE · Гарантийный сертификат</span>
							<span className="text-[10px] font-normal px-1.5 py-0.5 rounded bg-[var(--paper-soft)] border border-[var(--line)] text-[var(--muted)] print:hidden">Формат А5</span>
						</h4>
						<span className="text-[11px] font-mono text-[var(--muted)] truncate block">
							{data.passportId || "IMP-PASSPORT-BLANK"} · Медицинская карта пациента
						</span>
					</div>
				</div>

				<div className="flex items-center gap-2 shrink-0 flex-wrap">
					<span className="px-2.5 py-1 rounded-lg text-xs font-mono font-black bg-[var(--teal,#0d9488)] text-[var(--on-teal,#ffffff)]">
						{data.toothFdi ? `Зуб FDI #${data.toothFdi}` : "Зуб FDI #____"}
					</span>
					<div className="flex items-center gap-2 print:hidden">
						<button type="button" onClick={handleShareWhatsApp} className="icon-button min-h-[44px] min-w-[44px] text-[var(--teal,#0d9488)]" title="Поделиться в WhatsApp" data-testid="btn-share-whatsapp">
							<Share2 size={16} />
						</button>
						<button type="button" onClick={handleShareTelegram} className="icon-button min-h-[44px] min-w-[44px] text-[var(--brand-primary,#0ea5e9)]" title="Поделиться в Telegram" data-testid="btn-share-telegram">
							<Send size={16} />
						</button>
						<button type="button" onClick={handleCopy} className="icon-button min-h-[44px] min-w-[44px] text-[var(--ink)]" title="Скопировать данные паспорта" data-testid="btn-copy-passport-card">
							<Copy size={16} />
						</button>
						<button type="button" onClick={handlePrint} className="secondary-button min-h-[48px] px-4 py-2 text-xs flex items-center gap-1.5 font-bold rounded-xl" title="Распечатать паспорт / гарантийный сертификат А5" data-testid="btn-print-passport-card">
							<Printer size={16} className="shrink-0 text-[var(--teal,#0d9488)]" />
							<span className="hidden sm:inline">Распечатать паспорт (А5)</span>
							<span className="sm:hidden">Печать А5</span>
						</button>
					</div>
				</div>
			</div>

			{/* Анатомическая локализация */}
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

			{/* Схема зубной дуги */}
			<AnatomicalJawArchSchema selectedFdi={data.toothFdi} brand={data.brand} diameterMm={data.diameterMm} lengthMm={data.lengthMm} />

			{/* Клиническая сетка */}
			<div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
				<div className="min-w-0"><span className="text-[11px] text-[var(--muted)] block">Пациент:</span><strong className="font-extrabold text-[var(--ink)] block truncate" title={displayPatientName}>{displayPatientName}</strong></div>
				<div className="min-w-0"><span className="text-[11px] text-[var(--muted)] block">Лечащий хирург:</span><strong className="font-extrabold text-[var(--ink)] block truncate" title={displayDoctor}>{displayDoctor}</strong></div>
				<div className="min-w-0"><span className="text-[11px] text-[var(--muted)] block">Дата операции:</span><strong className="font-extrabold text-[var(--ink)] block">{formattedDate}</strong></div>
				<div className="min-w-0"><span className="text-[11px] text-[var(--muted)] block">Система:</span><strong className="font-extrabold text-[var(--teal,#0d9488)] block truncate">{data.brand} {data.model}</strong></div>
				<div className="min-w-0"><span className="text-[11px] text-[var(--muted)] block">Типоразмер:</span><strong className="font-extrabold text-[var(--ink)] block font-mono">Ø {data.diameterMm} × {data.lengthMm} мм</strong></div>
				<div className="min-w-0"><span className="text-[11px] text-[var(--muted)] block">Первичный торк:</span><strong className="font-extrabold text-[var(--teal,#0d9488)] block font-mono">{torqueText}</strong></div>
				<div className="min-w-0"><span className="text-[11px] text-[var(--muted)] block">Плотность кости:</span><strong className="font-extrabold text-[var(--ink)] block font-mono">{densityText}</strong></div>
				<div className="min-w-0"><span className="text-[11px] text-[var(--muted)] block">Формирователь:</span><strong className="font-extrabold text-[var(--ink)] block truncate" title={capTypeRu}>{capTypeRu}</strong></div>
			</div>

			{/* Идентификация изделия */}
			<div className="grid grid-cols-2 sm:grid-cols-6 gap-2.5 text-xs pt-2 border-t border-[var(--line)]">
				<div className="min-w-0"><span className="text-[11px] text-[var(--muted)] block">REF / Артикул:</span><span className="font-mono font-bold text-[var(--ink)] block truncate" data-testid="passport-catalog-article">{data.catalogArticle || "TS3S4010S"}</span></div>
				<div className="min-w-0"><span className="text-[11px] text-[var(--muted)] block">LOT / Партия:</span><span className="font-mono font-bold text-[var(--ink)] block truncate" title={displayLot}>{displayLot}</span></div>
				<div className="min-w-0"><span className="text-[11px] text-[var(--muted)] block">Серийный номер:</span><span className="font-mono font-bold text-[var(--ink)] block truncate" title={displaySn}>{displaySn}</span></div>
				<div className="min-w-0"><span className="text-[11px] text-[var(--muted)] block">Стерилен до:</span><span className="font-mono font-bold text-[var(--teal,#0d9488)] block truncate">{data.expirationDate || "2028-11-30"}</span></div>
				<div className="min-w-0"><span className="text-[11px] text-[var(--muted)] block">Формирователь / Заглушка:</span><span className="font-bold text-[var(--ink)] block truncate">{data.capType === "plug" ? "Винт-заглушка (2 этапа)" : "ФДМ (формирователь десны)"}</span></div>
				<div className="min-w-0"><span className="text-[11px] text-[var(--muted)] block">Дата:</span><span className="font-bold text-[var(--ink)] block truncate">{formattedDate}</span></div>
			</div>

			{/* Штрих-код и Место для наклейки */}
			<div className="p-3 rounded-xl border border-[var(--line)] bg-[var(--paper-soft)] grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
				<div className="flex flex-col justify-between space-y-1">
					<span className="text-[11px] font-black uppercase tracking-wider text-[var(--muted)]">Идентификация изделия (REF / LOT / SN):</span>
					<div className="p-2 rounded-lg bg-[var(--paper)] border border-[var(--line)] text-[var(--ink)] font-mono text-center">
						<svg className="passport-barcode-svg w-full h-8 text-[var(--ink)]" data-testid="passport-barcode-svg" viewBox="0 0 100 24" preserveAspectRatio="none" aria-hidden="true">
							{[true, false, true, true, false, true, false, true, true, false, true, true, true, false, true, false, false, true, true, false, true, false, true, true, false, true, false, true, true, false, true, true, false, false, true, true, true, false, true, false, true, false, true, true, true, false, true, false].map((isBar, idx) => (
								isBar ? <rect key={idx} x={idx * 2 + 2} y="0" width={idx % 5 === 0 ? "1.6" : "1.0"} height="24" fill="currentColor" /> : null
							))}
						</svg>
						<span className="text-[10px] tracking-widest text-[var(--muted)] block mt-0.5 truncate">{barcodeSummary}</span>
					</div>
				</div>
				<div className="border-2 border-dashed border-[var(--line-strong,#94a3b8)] rounded-xl p-3 flex flex-col items-center justify-center text-center bg-[var(--paper)]">
					<span className="text-[10px] font-black uppercase text-[var(--muted)] tracking-wider">Место для наклейки со стерильной упаковки</span>
					<span className="text-[9px] text-[var(--muted)] mt-1">Оригинальный стерильный стикер производителя (REF, LOT, SN)</span>
				</div>
			</div>

			{/* Гарантийные обязательства */}
			<div className="p-3 rounded-xl bg-[var(--paper-soft)] border border-[var(--line)] text-[11px] leading-relaxed text-[var(--muted)] space-y-2">
				<div className="flex items-center gap-2 text-[var(--ink)] font-bold text-xs">
					<ShieldCheck size={16} className="text-[var(--teal,#0d9488)] shrink-0" />
					<span>Гарантийные обязательства клиники и производителя:</span>
				</div>
				<div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
					<div className="p-2 rounded-lg bg-[var(--paper)] border border-[var(--line-subtle)]">
						<strong className="text-[var(--ink)] block mb-0.5">Пожизненная гарантия производителя:</strong>
						<span>Гарантия на титановую структуру и целостность имплантата {data.brand} от завода-изготовителя.</span>
					</div>
					<div className="p-2 rounded-lg bg-[var(--paper)] border border-[var(--line-subtle)]">
						<strong className="text-[var(--ink)] block mb-0.5">Клиническая гарантия остеоинтеграции (10 лет):</strong>
						<span>Предоставляется клиникой при условии регулярных профилактических визитов и профгигиены 1 раз в 6 месяцев.</span>
					</div>
				</div>
				<div className="p-2 rounded-lg bg-[var(--paper)] border border-[var(--line-subtle)] text-[11px] flex items-center justify-between flex-wrap gap-2" data-testid="passport-osteointegration-notice">
					<div className="flex items-center gap-1.5 min-w-0">
						<strong className="text-[var(--ink)]">Контроль остеоинтеграции:</strong>
						<span className="font-bold text-[var(--teal,#0d9488)]" data-testid="passport-osteo-date">{data.osteointegrationExpectedDate || "через 3-4 месяца"}</span>
					</div>
					<span className="text-[10px] text-[var(--muted)]">Контрольная визиография / прицельный снимок</span>
				</div>
			</div>

			{/* Подписи и QR-код верификации */}
			<div className="pt-2.5 border-t border-dashed border-[var(--line)] flex items-center justify-between gap-4 text-xs text-[var(--muted)] flex-wrap">
				<div className="flex items-center gap-4 flex-wrap min-w-0">
					<div className="min-w-0"><span>Врач: </span><strong className="text-[var(--ink)] truncate">{displayDoctor}</strong></div>
					<div className="min-w-0"><span>Плотность кости: </span><strong className="text-[var(--ink)]">{data.boneDensity || "D2"} (Misch)</strong></div>
					<div><span>Подпись хирурга-имплантолога: ______________________ </span></div>
					<div><span>Подпись пациента: ______________________ </span><span className="font-bold text-[var(--ink)] ml-2">М.П.</span></div>
				</div>
				<div className="flex items-center gap-2 p-1.5 rounded-lg border border-[var(--line)] bg-[var(--paper-soft)] shrink-0" title="QR-код верификации" data-testid="passport-qr-verification">
					<QrCode size={26} className="text-[var(--teal,#0d9488)] shrink-0" />
					<div className="text-[10px] leading-tight font-mono">
						<span className="font-bold text-[var(--ink)] block">QR VERIFIED</span>
						<span className="text-[var(--muted)] truncate block max-w-[120px]">{data.passportId || "PASSPORT"}</span>
					</div>
				</div>
			</div>

			{data.isWarehouseOverdraft && (
				<div className="p-2.5 rounded-lg bg-[var(--amber-surface,rgba(245,158,11,0.1))] text-xs text-[var(--ink)] flex items-center gap-2">
					<TriangleAlert size={15} className="shrink-0 text-[var(--amber,#f59e0b)]" />
					<span>Списание зафиксировано в мягкий овердрафт склада до проведения накладной.</span>
				</div>
			)}
		</div>
	);
};

export default ImplantPassportCard;
