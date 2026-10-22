import { AlertCircle, CheckCircle2, ShieldCheck, Sparkles, Wind } from "lucide-react";
import React from "react";

interface CabinetStatusCardsGridProps {
	disinfectionCompleted: boolean;
	disinfectantBrand: string;
	exposureMinutes: number;
	minExposureMinutes: number;
	turbineSterile: boolean;
	contraAngleSterile: boolean;
	class5Verified: boolean;
	salivaConnected: boolean;
	hveConnected: boolean;
	requiresCofferdam: boolean;
}

export function CabinetStatusCardsGrid(p: CabinetStatusCardsGridProps) {
	const sterileOk = p.turbineSterile && p.contraAngleSterile && p.class5Verified;
	const aspOk = p.salivaConnected && p.hveConnected;

	return (
		<div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: "0.75rem", marginBottom: "0.5rem" }}>
			<div style={{ padding: "0.75rem", background: "var(--paper, #ffffff)", borderRadius: "0.5rem", border: p.disinfectionCompleted ? "1px solid rgba(13, 148, 136, 0.3)" : "1px solid rgba(245, 158, 11, 0.3)", borderLeft: p.disinfectionCompleted ? "4px solid var(--teal, #0d9488)" : "4px solid var(--warn-fg, #b45309)" }}>
				<div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.3rem" }}>
					<strong style={{ fontSize: "0.85rem", color: "var(--ink, #1e293b)", display: "flex", alignItems: "center", gap: "0.35rem" }}>
						<Sparkles size={15} color="var(--teal, #0d9488)" /> <span>Дезинфекция поверхностей</span>
					</strong>
					<span style={{ fontSize: "0.75rem", fontWeight: 700, color: p.disinfectionCompleted ? "var(--ok-fg, #059669)" : "var(--warn-fg, #b45309)", display: "inline-flex", alignItems: "center", gap: "0.25rem" }}>
						{p.disinfectionCompleted ? <CheckCircle2 size={13} /> : <AlertCircle size={13} />}
						<span>{p.disinfectionCompleted ? "Обработано" : "Требуется"}</span>
					</span>
				</div>
				<p style={{ margin: 0, fontSize: "0.78rem", color: "var(--muted, #64748b)" }}>
					{p.disinfectantBrand} • {p.exposureMinutes} мин (норма не менее {p.minExposureMinutes} мин). Кресло, столик, светильник.
				</p>
			</div>

			<div style={{ padding: "0.75rem", background: "var(--paper, #ffffff)", borderRadius: "0.5rem", border: sterileOk ? "1px solid rgba(13, 148, 136, 0.3)" : "1px solid rgba(245, 158, 11, 0.3)", borderLeft: sterileOk ? "4px solid var(--teal, #0d9488)" : "4px solid var(--warn-fg, #b45309)" }}>
				<div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.3rem" }}>
					<strong style={{ fontSize: "0.85rem", color: "var(--ink, #1e293b)", display: "flex", alignItems: "center", gap: "0.35rem" }}>
						<ShieldCheck size={15} color="var(--teal, #0d9488)" /> <span>Стерильные инструменты</span>
					</strong>
					<span style={{ fontSize: "0.75rem", fontWeight: 700, color: sterileOk ? "var(--ok-fg, #059669)" : "var(--warn-fg, #b45309)", display: "inline-flex", alignItems: "center", gap: "0.25rem" }}>
						{sterileOk ? <CheckCircle2 size={13} /> : <AlertCircle size={13} />}
						<span>{sterileOk ? "5 класс ОК" : "Проверить"}</span>
					</span>
				</div>
				<p style={{ margin: 0, fontSize: "0.78rem", color: "var(--muted, #64748b)" }}>
					Турбинный и угловой наконечники стерильны. Смотровой лоток укомплектован.
				</p>
			</div>

			<div style={{ padding: "0.75rem", background: "var(--paper, #ffffff)", borderRadius: "0.5rem", border: aspOk ? "1px solid rgba(13, 148, 136, 0.3)" : "1px solid rgba(245, 158, 11, 0.3)", borderLeft: aspOk ? "4px solid var(--teal, #0d9488)" : "4px solid var(--warn-fg, #b45309)" }}>
				<div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.3rem" }}>
					<strong style={{ fontSize: "0.85rem", color: "var(--ink, #1e293b)", display: "flex", alignItems: "center", gap: "0.35rem" }}>
						<Wind size={15} color="var(--teal, #0d9488)" /> <span>Аспирация и изоляция</span>
					</strong>
					<span style={{ fontSize: "0.75rem", fontWeight: 700, color: aspOk ? "var(--ok-fg, #059669)" : "var(--warn-fg, #b45309)", display: "inline-flex", alignItems: "center", gap: "0.25rem" }}>
						{aspOk ? <CheckCircle2 size={13} /> : <AlertCircle size={13} />}
						<span>{aspOk ? "Подключено" : "Проверить"}</span>
					</span>
				</div>
				<p style={{ margin: 0, fontSize: "0.78rem", color: "var(--muted, #64748b)" }}>
					Слюноотсос и пылесос активны. {p.requiresCofferdam ? "Коффердам готов." : "Коффердам по показаниям."}
				</p>
			</div>
		</div>
	);
}
