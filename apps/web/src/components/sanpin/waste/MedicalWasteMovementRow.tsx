import type { MedicalWasteLog } from "@dental/shared";
import { Printer } from "lucide-react";
import React from "react";
import { printWasteStickerForLog } from "./wasteStickerHelper";

export function MedicalWasteMovementRow({ log }: { log: MedicalWasteLog }) {
	return (
		<tr
			className="sanpin-log-row"
			style={{
				minHeight: "36px",
				contentVisibility: "auto",
				containIntrinsicSize: "1px 36px",
				contain: "content",
			}}
		>
			<td style={{ whiteSpace: "nowrap" }}>
				{new Date(log.logDate).toLocaleString("ru-RU", {
					day: "2-digit",
					month: "2-digit",
					year: "numeric",
					hour: "2-digit",
					minute: "2-digit",
				})}
			</td>
			<td>
				{log.wasteClass === "class_B" ? (
					<span className="sanpin-tag sanpin-tag-warning">Класс Б (Опасные)</span>
				) : log.wasteClass === "class_A" ? (
					<span className="sanpin-tag sanpin-tag-neutral">Класс А (Безопасные)</span>
				) : log.wasteClass === "class_G" ? (
					<span className="sanpin-tag sanpin-tag-danger">Класс Г (Токсичные)</span>
				) : (
					<span className="sanpin-tag sanpin-tag-danger">Класс В</span>
				)}
			</td>
			<td style={{ fontWeight: 500 }}>{log.wasteDescription}</td>
			<td style={{ fontSize: "0.8rem", color: "var(--muted)" }}>
				{log.packageType === "yellow_bag"
					? "Желтый пакет"
					: log.packageType === "yellow_sharps_container"
						? "Непрокалываемый контейнер игл"
						: log.packageType === "white_bag"
							? "Белый пакет"
							: "Контейнер Класса Г"}{" "}
				({log.packageCount} шт.)
			</td>
			<td style={{ fontWeight: 700 }}>{log.weightKg} кг</td>
			<td>
				<div style={{ fontSize: "0.8rem" }}>
					{log.disinfectionMethod === "chemical_soaking"
						? "Хим. замачивание"
						: log.disinfectionMethod === "steam_autoclave"
							? "Автоклавирование"
							: "Централизованно"}
				</div>
				{log.disinfectantUsed && (
					<div style={{ fontSize: "0.725rem", color: "var(--muted)" }}>
						{log.disinfectantUsed}
					</div>
				)}
			</td>
			<td>
				{log.disposalCompany ? (
					<div>
						<div style={{ fontWeight: 600, fontSize: "0.8rem" }}>{log.disposalCompany}</div>
						<div style={{ fontSize: "0.725rem", color: "var(--muted)" }}>
							{log.contractNumber && `Договор: ${log.contractNumber}`}
							{log.transferActNumber && ` (Акт ${log.transferActNumber})`}
						</div>
					</div>
				) : (
					<span style={{ color: "var(--muted)", fontSize: "0.75rem" }}>Накопление в ЦСО</span>
				)}
			</td>
			<td style={{ fontSize: "0.8rem" }}>{log.responsibleStaffName || "Медсестра ЦСО"}</td>
			<td style={{ textAlign: "center" }}>
				<button
					type="button"
					onClick={() => printWasteStickerForLog(log)}
					className="sanpin-btn sanpin-btn-secondary touch-manipulation"
					style={{ minHeight: "32px", height: "32px", padding: "0 0.75rem", fontSize: "0.8rem", fontWeight: 600, display: "inline-flex", alignItems: "center", gap: "0.35rem" }}
					title="Печать термоэтикетки со штрихкодом"
					data-testid={`print-waste-sticker-${log.id}`}
				>
					<Printer size={15} /> 58x40 мм
				</button>
			</td>
		</tr>
	);
}
