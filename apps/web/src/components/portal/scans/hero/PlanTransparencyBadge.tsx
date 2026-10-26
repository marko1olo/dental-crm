import React from "react";
import { ShieldCheck } from "lucide-react";

export const PlanTransparencyBadge: React.FC = () => {
	return (
		<div
			style={{
				backgroundColor: "rgba(16, 185, 129, 0.08)",
				border: "1px solid rgba(16, 185, 129, 0.25)",
				borderRadius: "8px",
				padding: "10px 12px",
				display: "flex",
				alignItems: "flex-start",
				gap: "10px",
			}}
		>
			<ShieldCheck
				size={20}
				style={{
					color: "var(--pc-success, #10b981)",
					flexShrink: 0,
					marginTop: "1px",
				}}
			/>
			<div
				style={{
					fontSize: "12px",
					color: "var(--pc-text-main, var(--ink, #0f172a))",
					lineHeight: "1.4",
				}}
			>
				<strong style={{ color: "var(--pc-success, #10b981)" }}>
					Честная прозрачная цена «Под ключ»:
				</strong>{" "}
				Стоимость зафиксирована в плане лечения. В каждый этап уже включены: премиальная
				анестезия (Septanest), контрольные прицельные снимки визиографа (RVG), изоляция
				коффердамом и гарантийный сертификат. <strong>Никаких доплат на кассе клиники.</strong>
			</div>
		</div>
	);
};
