import React from "react";
import { Copy, Printer, AlertTriangle, QrCode, Award, Share2, Send } from "lucide-react";
import { DentalImplant } from "../icons/DentalIcons";
import { showToast } from "../GlobalToast";
import type { FastImplantPassportData } from "./implantQuickPresets";
import "./implants.css";

export interface ImplantPassportCardProps {
	readonly data: FastImplantPassportData;
	readonly className?: string;
	readonly onCopySummary?: () => void;
	readonly onPrint?: () => void;
}

const UPPER_JAW_TEETH = [18, 17, 16, 15, 14, 13, 12, 11, 21, 22, 23, 24, 25, 26, 27, 28] as const;
const LOWER_JAW_TEETH = [48, 47, 46, 45, 44, 43, 42, 41, 31, 32, 33, 34, 35, 36, 37, 38] as const;

/**
 * Анатомическая зубная дуга FDI (SVG векторная схема челюстей).
 * Отображает 32 постоянных зуба с контрастным выделением оперированного зуба с установленным имплантатом.
 */
export const AnatomicalJawArchSchema: React.FC<{
	readonly selectedFdi: number;
	readonly brand?: string;
	readonly diameterMm?: number;
	readonly lengthMm?: number;
}> = ({ selectedFdi, brand = "Имплантат", diameterMm, lengthMm }) => {
	const getToothCoords = (index: number, isUpper: boolean) => {
		const isRightQuadrant = index < 8;
		const x = isRightQuadrant ? 24 + index * 27 : 260 + (index - 8) * 27;
		const dist = Math.abs(x - 242) / 220;
		const curveOffset = Math.pow(dist, 1.8) * 16;
		const y = isUpper ? 38 - curveOffset : 72 + curveOffset;
		return { x, y };
	};

	return (
		<div
			className="anatomical-jaw-arch-container p-3 rounded-xl bg-[var(--paper-soft)] border border-[var(--line)] flex flex-col gap-1.5"
			data-testid="anatomical-jaw-arch"
		>
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
				<svg
					viewBox="0 0 490 114"
					className="w-full h-auto max-h-[140px] text-[var(--ink)] select-none"
					role="img"
					aria-label={`Схема зубного ряда с выделенным имплантатом #${selectedFdi}`}
				>
					{/* Осевые направляющие дуги */}
					<path
						d="M 24 22 Q 242 46 460 22"
						fill="none"
						stroke="var(--line)"
						strokeDasharray="3 3"
						opacity="0.5"
					/>
					<path
						d="M 24 88 Q 242 64 460 88"
						fill="none"
						stroke="var(--line)"
						strokeDasharray="3 3"
						opacity="0.5"
					/>
					<line
						x1="242"
						y1="14"
						x2="242"
						y2="98"
						stroke="var(--line-strong, #94a3b8)"
						strokeDasharray="2 2"
						opacity="0.4"
					/>

					{/* Подписи дуг и сторон */}
					<text
						x="242"
						y="11"
						textAnchor="middle"
						fill="var(--muted)"
						fontSize="8"
						fontWeight="800"
						letterSpacing="0.06em"
					>
						ВЕРХНЯЯ ЧЕЛЮСТЬ (MAXILLA)
					</text>
					<text
						x="242"
						y="108"
						textAnchor="middle"
						fill="var(--muted)"
						fontSize="8"
						fontWeight="800"
						letterSpacing="0.06em"
					>
						НИЖНЯЯ ЧЕЛЮСТЬ (MANDIBULA)
					</text>
					<text x="18" y="11" fill="var(--muted)" fontSize="7.5" fontWeight="700">
						ПРАВО (R)
					</text>
					<text
						x="466"
						y="11"
						textAnchor="end"
						fill="var(--muted)"
						fontSize="7.5"
						fontWeight="700"
					>
						ЛЕВО (L)
					</text>

					{/* Зубы верхней челюсти */}
					{UPPER_JAW_TEETH.map((tooth, idx) => {
						const { x, y } = getToothCoords(idx, true);
						const isTarget = tooth === selectedFdi;
						return (
							<g key={tooth} className="tooth-node">
								{isTarget ? (
									<>
										<rect
											x={x - 12}
											y={y - 11}
											width="24"
											height="22"
											rx="5"
											fill="var(--teal, #0d9488)"
											stroke="#0f766e"
											strokeWidth="1.5"
										/>
										<circle cx={x} cy={y - 13} r="2.5" fill="#f59e0b" />
										<text
											x={x}
											y={y + 3.5}
											textAnchor="middle"
											fill="#ffffff"
											fontSize="10"
											fontWeight="900"
											fontFamily="monospace"
										>
											{tooth}
										</text>
									</>
								) : (
									<>
										<rect
											x={x - 11}
											y={y - 10}
											width="22"
											height="20"
											rx="4"
											fill="var(--paper)"
											stroke="var(--line)"
											strokeWidth="1"
										/>
										<text
											x={x}
											y={y + 3.5}
											textAnchor="middle"
											fill="var(--muted)"
											fontSize="9"
											fontWeight="700"
											fontFamily="monospace"
										>
											{tooth}
										</text>
									</>
								)}
							</g>
						);
					})}

					{/* Зубы нижней челюсти */}
					{LOWER_JAW_TEETH.map((tooth, idx) => {
						const { x, y } = getToothCoords(idx, false);
						const isTarget = tooth === selectedFdi;
						return (
							<g key={tooth} className="tooth-node">
								{isTarget ? (
									<>
										<rect
											x={x - 12}
											y={y - 11}
											width="24"
											height="22"
											rx="5"
											fill="var(--teal, #0d9488)"
											stroke="#0f766e"
											strokeWidth="1.5"
										/>
										<circle cx={x} cy={y + 13} r="2.5" fill="#f59e0b" />
										<text
											x={x}
											y={y + 3.5}
											textAnchor="middle"
											fill="#ffffff"
											fontSize="10"
											fontWeight="900"
											fontFamily="monospace"
										>
											{tooth}
										</text>
									</>
								) : (
									<>
										<rect
											x={x - 11}
											y={y - 10}
											width="22"
											height="20"
											rx="4"
											fill="var(--paper)"
											stroke="var(--line)"
											strokeWidth="1"
										/>
										<text
											x={x}
											y={y + 3.5}
											textAnchor="middle"
											fill="var(--muted)"
											fontSize="9"
											fontWeight="700"
											fontFamily="monospace"
										>
											{tooth}
										</text>
									</>
								)}
							</g>
						);
					})}
				</svg>
			</div>
		</div>
	);
};

function getToothAnatomicalDescription(toothFdi: number): string {
	if (!toothFdi || toothFdi < 11 || toothFdi > 48) return "Область дентальной имплантации";
	const quadrant = Math.floor(toothFdi / 10);
	const num = toothFdi % 10;

	const names: Record<number, string> = {
		1: "Центральный резец",
		2: "Боковой резец",
		3: "Клык",
		4: "Первый премоляр",
		5: "Второй премоляр",
		6: "Первый моляр",
		7: "Второй моляр",
		8: "Третий моляр",
	};

	const jaw = quadrant === 1 || quadrant === 2 ? "верхней челюсти" : "нижней челюсти";
	const side = quadrant === 1 || quadrant === 4 ? "справа" : "слева";
	const toothName = names[num] || `Зуб #${num}`;

	return `${toothName} ${jaw} ${side}`;
}

export const ImplantPassportCard: React.FC<ImplantPassportCardProps> = ({
	data,
	className = "",
	onCopySummary,
	onPrint,
}) => {
	const formattedDate = data.dateIso
		? new Date(data.dateIso).toLocaleDateString("ru-RU")
		: "«____» ____________ 20___ г.";
	const displayPatientName = data.patientName?.trim() || "____________________________________";
	const displayLot = data.lotNumber?.trim() || "____________________";
	const displaySn = data.serialNumber?.trim() || "____________________";
	const displayDoctor = data.doctorName?.trim() || "________________________";
	const toothAnatomy = getToothAnatomicalDescription(data.toothFdi);
	const capTypeRu =
		data.capType === "plug"
			? "Винт-заглушка (двухэтапный протокол с ушиванием наглухо)"
			: "ФДМ (формирователь десны, одноэтапный протокол)";

	const barcodeSummary = `(01)${data.catalogArticle || "REF"}(10)${displayLot}(21)${displaySn}`;

	const handleCopy = () => {
		const text =
			`ПАСПОРТ ИМПЛАНТАТА (FDI #${data.toothFdi || "___"})\n` +
			`Анатомическая позиция: ${toothAnatomy}\n` +
			`Пациент: ${displayPatientName} (${data.patientId || "______"})\n` +
			`Система: ${data.brand} ${data.model}\n` +
			`Размер: Ø ${data.diameterMm} x ${data.lengthMm} мм\n` +
			`Торк стабилизации: ${data.torqueNcm} Н·см\n` +
			`ISQ: ${data.isqDay0 ?? 72} (RFA магнитно-резонансный анализ)\n` +
			`Формирователь / Заглушка: ${capTypeRu}\n` +
			`Плотность кости: ${data.boneDensity}\n` +
			`REF: ${data.catalogArticle || "REF-BLANK"} | LOT: ${displayLot} | SN: ${displaySn}\n` +
			`Дата операции: ${formattedDate} · Врач: ${displayDoctor}`;

		navigator.clipboard?.writeText(text);
		onCopySummary?.();
		showToast(`Паспорт имплантата #${data.toothFdi || ""} скопирован`, "success");
	};

	const handleShareWhatsApp = () => {
		const text = encodeURIComponent(
			`Паспорт имплантата DENTE (Зуб FDI #${data.toothFdi || "___"})\n` +
			`Пациент: ${displayPatientName}\n` +
			`Имплантат: ${data.brand} ${data.model} Ø${data.diameterMm}x${data.lengthMm}мм\n` +
			`LOT: ${displayLot} | Торк: ${data.torqueNcm} Н·см | ISQ: ${data.isqDay0 ?? 72}\n` +
			`Гарантийный сертификат: https://dente.clinic/passport/${data.passportId}`
		);
		try {
			window.open(`https://api.whatsapp.com/send?text=${text}`, "_blank", "noopener,noreferrer");
		} catch {
			// fallback
		}
		showToast(`Паспорт #${data.toothFdi || ""} отправлен в WhatsApp`, "success");
	};

	const handleShareTelegram = () => {
		const text = encodeURIComponent(
			`Паспорт имплантата DENTE (Зуб FDI #${data.toothFdi || "___"})\n` +
			`Пациент: ${displayPatientName}\n` +
			`Имплантат: ${data.brand} ${data.model} Ø${data.diameterMm}x${data.lengthMm}мм\n` +
			`LOT: ${displayLot} | Торк: ${data.torqueNcm} Н·см | ISQ: ${data.isqDay0 ?? 72}`
		);
		const url = encodeURIComponent(`https://dente.clinic/passport/${data.passportId}`);
		try {
			window.open(`https://t.me/share/url?url=${url}&text=${text}`, "_blank", "noopener,noreferrer");
		} catch {
			// fallback
		}
		showToast(`Паспорт #${data.toothFdi || ""} отправлен в Telegram`, "success");
	};

	const handlePrint = () => {
		if (onPrint) {
			onPrint();
		} else {
			try {
				window.print();
			} catch {
				// fallback
			}
		}
		showToast(`Бланк паспорта имплантата #${data.toothFdi || ""} отправлен на печать`, "success");
	};

	return (
		<div
			className={`implant-passport-display-card space-y-4 ${className}`.trim()}
			data-testid="implant-passport-card"
		>
			{/* Шапка паспорта имплантата / гарантийного сертификата */}
			<div className="flex items-center justify-between border-b border-[var(--line)] pb-3 flex-wrap gap-2">
				<div className="flex items-center gap-2.5 min-w-0">
					<div className="w-9 h-9 rounded-xl bg-[var(--teal-surface,rgba(13,148,136,0.1))] text-[var(--teal,#0d9488)] flex items-center justify-center shrink-0 border border-[var(--teal-soft,rgba(13,148,136,0.3))]">
						<DentalImplant size={22} />
					</div>
					<div className="min-w-0">
						<h4 className="text-sm font-black text-[var(--ink)] tracking-tight truncate">
							Паспорт имплантата DENTE · Гарантийный сертификат
						</h4>
						<span className="text-[11px] font-mono text-[var(--muted)] truncate block">
							{data.passportId || "IMP-PASSPORT-BLANK"} · Медицинская карта пациента
						</span>
					</div>
				</div>

				<div className="flex items-center gap-2 shrink-0">
					<span className="px-2.5 py-1 rounded-lg text-xs font-mono font-black bg-[var(--teal,#0d9488)] text-[var(--on-teal,#ffffff)]">
						{data.toothFdi ? `Зуб FDI #${data.toothFdi}` : "Зуб FDI #____"}
					</span>
					<button
						type="button"
						onClick={handleShareWhatsApp}
						className="min-h-[48px] min-w-[48px] p-2.5 rounded-xl border border-[var(--line)] bg-[var(--paper)] text-[var(--teal,#0d9488)] hover:bg-[var(--paper-soft)] cursor-pointer flex items-center justify-center touch-manipulation transition-all"
						title="Поделиться в WhatsApp"
						data-testid="btn-share-whatsapp"
					>
						<Share2 size={16} />
					</button>
					<button
						type="button"
						onClick={handleShareTelegram}
						className="min-h-[48px] min-w-[48px] p-2.5 rounded-xl border border-[var(--line)] bg-[var(--paper)] text-[var(--brand-primary,#0ea5e9)] hover:bg-[var(--paper-soft)] cursor-pointer flex items-center justify-center touch-manipulation transition-all"
						title="Поделиться в Telegram"
						data-testid="btn-share-telegram"
					>
						<Send size={16} />
					</button>
					<button
						type="button"
						onClick={handleCopy}
						className="min-h-[48px] min-w-[48px] p-2.5 rounded-xl border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] hover:bg-[var(--paper-soft)] cursor-pointer flex items-center justify-center touch-manipulation transition-all"
						title="Скопировать данные паспорта"
						data-testid="btn-copy-passport-card"
					>
						<Copy size={16} />
					</button>
					<button
						type="button"
						onClick={handlePrint}
						className="min-h-[48px] px-3.5 py-2 rounded-xl border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] hover:border-[var(--teal,#0d9488)] flex items-center gap-1.5 cursor-pointer font-bold text-xs touch-manipulation transition-all"
						title="Распечатать паспорт / гарантийный сертификат"
						data-testid="btn-print-passport-card"
					>
						<Printer size={16} className="text-[var(--teal,#0d9488)]" />
						<span>Печать</span>
					</button>
				</div>
			</div>

			{/* Анатомическая позиция зуба */}
			<div className="p-2.5 rounded-xl bg-[var(--paper-soft)] border border-[var(--line)] text-xs flex items-center justify-between flex-wrap gap-2">
				<div className="flex items-center gap-2 min-w-0">
					<Award size={16} className="text-[var(--teal,#0d9488)] shrink-0" />
					<span className="text-[var(--muted)]">Анатомическая локализация:</span>
					<strong className="text-[var(--ink)] font-extrabold truncate" title={toothAnatomy}>
						{`${data.toothFdi ? `${data.toothFdi} — ` : ""}${toothAnatomy}`} (FDI #{data.toothFdi || "__"})
					</strong>
				</div>
				<span className="text-[11px] font-mono text-[var(--muted)] shrink-0">
					Постоянный прикус
				</span>
			</div>

			{/* Анатомическая схема зубного ряда с выделенным имплантатом */}
			<AnatomicalJawArchSchema
				selectedFdi={data.toothFdi}
				brand={data.brand}
				diameterMm={data.diameterMm}
				lengthMm={data.lengthMm}
			/>

			{/* Основные клинические данные */}
			<div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
				<div className="min-w-0">
					<span className="text-[11px] text-[var(--muted)] block">Пациент:</span>
					<strong
						className="font-extrabold text-[var(--ink)] block truncate"
						title={displayPatientName}
					>
						{displayPatientName}
					</strong>
				</div>

				<div className="min-w-0">
					<span className="text-[11px] text-[var(--muted)] block">Имплантационная система:</span>
					<strong
						className="font-extrabold text-[var(--teal,#0d9488)] block truncate"
						title={`${data.brand} ${data.model}`}
					>
						{data.brand} {data.model}
					</strong>
				</div>

				<div className="min-w-0">
					<span className="text-[11px] text-[var(--muted)] block">Размер платформы:</span>
					<strong className="font-mono font-extrabold text-[var(--ink)] block truncate">
						{`Ø ${data.diameterMm} × ${data.lengthMm} мм`}
					</strong>
				</div>

				<div className="min-w-0">
					<span className="text-[11px] text-[var(--muted)] block">Торк / Стабильность:</span>
					<strong className="font-mono font-extrabold text-[var(--teal,#0d9488)] block truncate">
						{`${data.torqueNcm || 35} Н·см`}
						{data.isqDay0 ? ` · ${data.isqDay0} ISQ` : ""}
					</strong>
				</div>
			</div>

			{/* Технические идентификаторы и протокол ушивания */}
			<div className="grid grid-cols-2 sm:grid-cols-6 gap-3 text-xs pt-2 border-t border-[var(--line)]">
				<div className="min-w-0">
					<span className="text-[11px] text-[var(--muted)] block">REF / Артикул:</span>
					<span
						className="font-mono font-bold text-[var(--ink)] block truncate"
						data-testid="passport-catalog-article"
					>
						{data.catalogArticle || "TS3S4010S"}
					</span>
				</div>

				<div className="min-w-0">
					<span className="text-[11px] text-[var(--muted)] block">LOT / Партия:</span>
					<span className="font-mono font-bold text-[var(--ink)] block truncate" title={displayLot}>
						{displayLot}
					</span>
				</div>

				<div className="min-w-0">
					<span className="text-[11px] text-[var(--muted)] block">Серийный номер:</span>
					<span className="font-mono font-bold text-[var(--ink)] block truncate" title={displaySn}>
						{displaySn}
					</span>
				</div>

				<div className="min-w-0">
					<span className="text-[11px] text-[var(--muted)] block">Стерилен до:</span>
					<span className="font-mono font-bold text-[var(--teal,#0d9488)] block truncate" title={data.expirationDate || "2028-11-30"}>
						{data.expirationDate || "2028-11-30"}
					</span>
				</div>

				<div className="min-w-0">
					<span className="text-[11px] text-[var(--muted)] block">Формирователь / Заглушка:</span>
					<span
						className="font-bold text-[var(--ink)] block truncate"
						title={data.capType === "plug" ? "Винт-заглушка (2 этапа)" : "ФДМ (формирователь десны)"}
					>
						{data.capType === "plug" ? "Винт-заглушка (2 этапа)" : "ФДМ (формирователь десны)"}
					</span>
				</div>

				<div className="min-w-0">
					<span className="text-[11px] text-[var(--muted)] block">Дата операции:</span>
					<span className="font-bold text-[var(--ink)] block truncate">{formattedDate}</span>
				</div>
			</div>

			{/* Материалы аугментации (НКР), если проводилась */}
			{(data.boneGraftMaterial || data.membraneUsed || data.sutureMaterial) && (
				<div className="p-2.5 rounded-xl bg-[var(--paper-soft)] border border-[var(--line)] text-xs grid grid-cols-1 sm:grid-cols-3 gap-2">
					<div className="min-w-0">
						<span className="text-[10px] text-[var(--muted)] block">Костный графт:</span>
						<strong className="text-[var(--ink)] truncate block">
							{data.boneGraftMaterial || "—"}
						</strong>
					</div>
					<div className="min-w-0">
						<span className="text-[10px] text-[var(--muted)] block">Барьерная мембрана:</span>
						<strong className="text-[var(--ink)] truncate block">
							{data.membraneUsed || "—"}
						</strong>
					</div>
					<div className="min-w-0">
						<span className="text-[10px] text-[var(--muted)] block">Шовный материал:</span>
						<strong className="text-[var(--ink)] truncate block">
							{data.sutureMaterial || "—"}
						</strong>
					</div>
				</div>
			)}

			{/* Штрихкод и Зона оригинальной наклейки с упаковки имплантата */}
			<div className="p-3 rounded-xl border border-[var(--line)] bg-[var(--paper-soft)] grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
				<div className="flex flex-col justify-between space-y-1">
					<span className="text-[11px] font-black uppercase tracking-wider text-[var(--muted)]">
						Штрихкод идентификации изделия (GS1 / REF):
					</span>
					<div className="p-2 rounded-lg bg-[var(--paper)] border border-[var(--line)] text-[var(--ink)] font-mono text-center">
						<svg
							className="passport-barcode-svg w-full h-8 text-[var(--ink)]"
							data-testid="passport-barcode-svg"
							viewBox="0 0 100 24"
							preserveAspectRatio="none"
							aria-hidden="true"
						>
							{[
								true, false, true, true, false, true, false, true, true, false,
								true, true, true, false, true, false, false, true, true, false,
								true, false, true, true, false, true, false, true, true, false,
								true, true, false, false, true, true, true, false, true, false,
								true, false, true, true, true, false, true, false,
							].map((isBar, idx) =>
								isBar ? (
									<rect
										key={idx}
										x={idx * 2 + 2}
										y="0"
										width={idx % 5 === 0 ? "1.6" : "1.0"}
										height="24"
										fill="currentColor"
									/>
								) : null,
							)}
						</svg>
						<span className="text-[10px] tracking-widest text-[var(--muted)] block mt-0.5 truncate">
							{barcodeSummary}
						</span>
					</div>
				</div>

				{/* Место для вклейки физического стикера из блистера */}
				<div className="border-2 border-dashed border-[var(--line-strong,#94a3b8)] rounded-xl p-3 flex flex-col items-center justify-center text-center bg-[var(--paper)]">
					<span className="text-[10px] font-black uppercase text-[var(--muted)] tracking-wider">
						Место для наклейки со стерильной упаковки
					</span>
					<span className="text-[9px] text-[var(--muted)] mt-1">
						Вклейте оригинальный клейкий стикер производителя (REF, LOT, SN)
					</span>
				</div>
			</div>

			{/* Гарантийные обязательства клиники и производителя */}
			<div className="p-3 rounded-xl bg-[var(--paper-soft)] border border-[var(--line)] text-[11px] leading-relaxed text-[var(--muted)]">
				<strong className="text-[var(--ink)] font-black block mb-1">
					Гарантийные обязательства клиники и производителя:
				</strong>
				<span>
					Производитель гарантирует остеоинтеграцию и пожизненную структурную целостность титанового
					имплантата при условии соблюдения регламента профилактических осмотров (1 раз в 6 месяцев) и
					правил индивидуальной гигиены полости рта. Клиника обеспечивает гарантийное сопровождение в
					соответствии с договором оказания медицинских услуг.
				</span>
			</div>

			{/* Врач, подпись и QR-код верификации для сертификата А4 */}
			<div className="pt-3 border-t border-dashed border-[var(--line)] flex items-center justify-between gap-4 text-xs text-[var(--muted)] flex-wrap">
				<div className="flex items-center gap-4 flex-wrap min-w-0">
					<div className="min-w-0">
						<span>Врач: </span>
						<strong className="text-[var(--ink)] truncate">{displayDoctor}</strong>
					</div>
					<div className="min-w-0">
						<span>Плотность кости: </span>
						<strong className="text-[var(--ink)]">{data.boneDensity || "D2"} (Misch)</strong>
					</div>
					<div>
						<span>Подпись хирурга-имплантолога: ______________________ </span>
					</div>
					<div>
						<span>Подпись пациента: ______________________ </span>
						<span className="font-bold text-[var(--ink)] ml-2">М.П.</span>
					</div>
				</div>

				<div
					className="flex items-center gap-2 p-1.5 rounded-lg border border-[var(--line)] bg-[var(--paper-soft)] shrink-0"
					title="QR-код верификации подлинности паспорта имплантата"
					data-testid="passport-qr-verification"
				>
					<QrCode size={26} className="text-[var(--teal,#0d9488)] shrink-0" />
					<div className="text-[10px] leading-tight font-mono">
						<span className="font-bold text-[var(--ink)] block">QR VERIFIED</span>
						<span className="text-[var(--muted)] truncate block max-w-[120px]">
							{data.passportId || "PASSPORT"}
						</span>
					</div>
				</div>
			</div>

			{data.isWarehouseOverdraft && (
				<div className="p-2.5 rounded-lg bg-[var(--amber-surface,rgba(245,158,11,0.1))] text-xs text-[var(--ink)] flex items-center gap-2">
					<AlertTriangle size={15} className="shrink-0 text-[var(--amber,#f59e0b)]" />
					<span>Списание зафиксировано в мягкий овердрафт склада до проведения накладной.</span>
				</div>
			)}
		</div>
	);
};

export default ImplantPassportCard;
