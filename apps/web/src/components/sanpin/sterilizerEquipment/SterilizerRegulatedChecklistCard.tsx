import { Calendar } from "lucide-react";
import React from "react";

export function SterilizerRegulatedChecklistCard() {
	return (
		<div
			style={{
				background: "var(--paper-soft, #f8fafc)",
				border: "1px solid var(--line, #e2e8f0)",
				borderRadius: "8px",
				padding: "0.75rem",
				display: "flex",
				flexDirection: "column",
				gap: "0.5rem",
			}}
		>
			<span style={{ fontSize: "0.8rem", fontWeight: 700, color: "var(--ink, #0f172a)", display: "flex", alignItems: "center", gap: "0.35rem" }}>
				<Calendar size={14} color="#0d9488" /> График регламентного сервисного обслуживания (ТО)
			</span>

			<div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(230px, 1fr))", gap: "0.5rem", fontSize: "0.74rem" }}>
				<div style={{ padding: "0.45rem", background: "var(--paper, #fff)", border: "1px solid var(--line-subtle, #f1f5f9)", borderRadius: "6px" }}>
					<div style={{ fontWeight: 700, color: "var(--ink, #0f172a)", marginBottom: "0.15rem" }}>
						Бактерицидный воздушный фильтр
					</div>
					<div style={{ color: "var(--muted, #64748b)" }}>
						Замена каждые 500 циклов или 6 месяцев. Контроль стерильности сушки.
					</div>
				</div>

				<div style={{ padding: "0.45rem", background: "var(--paper, #fff)", border: "1px solid var(--line-subtle, #f1f5f9)", borderRadius: "6px" }}>
					<div style={{ fontWeight: 700, color: "var(--ink, #0f172a)", marginBottom: "0.15rem" }}>
						Уплотнитель двери камеры
					</div>
					<div style={{ color: "var(--muted, #64748b)" }}>
						Замена каждые 1000 циклов или 1 год. Предотвращение утечки вакуума.
					</div>
				</div>

				<div style={{ padding: "0.45rem", background: "var(--paper, #fff)", border: "1px solid var(--line-subtle, #f1f5f9)", borderRadius: "6px" }}>
					<div style={{ fontWeight: 700, color: "var(--ink, #0f172a)", marginBottom: "0.15rem" }}>
						Резервуар чистой воды
					</div>
					<div style={{ color: "var(--muted, #64748b)" }}>
						Очистка и дезинфекция еженедельно. Использование деионизированной воды.
					</div>
				</div>

				<div style={{ padding: "0.45rem", background: "var(--paper, #fff)", border: "1px solid var(--line-subtle, #f1f5f9)", borderRadius: "6px" }}>
					<div style={{ fontWeight: 700, color: "var(--ink, #0f172a)", marginBottom: "0.15rem" }}>
						Поверка датчиков давления / темп.
					</div>
					<div style={{ color: "var(--muted, #64748b)" }}>
						Ежегодная метрологическая поверка аккредитованной организацией.
					</div>
				</div>
			</div>
		</div>
	);
}
