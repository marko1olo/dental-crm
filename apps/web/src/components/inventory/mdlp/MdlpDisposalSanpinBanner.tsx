import { Sparkles } from "lucide-react";
import type React from "react";

export interface MdlpDisposalSanpinBannerProps {
	readonly onQuickNurseCarpulesDisposal: () => void;
}

export const MdlpDisposalSanpinBanner: React.FC<MdlpDisposalSanpinBannerProps> = ({
	onQuickNurseCarpulesDisposal,
}) => {
	return (
		<div
			style={{
				padding: "12px 16px",
				borderRadius: 10,
				background: "rgba(13, 148, 136, 0.08)",
				border: "1px solid rgba(13, 148, 136, 0.35)",
				display: "flex",
				alignItems: "center",
				justifyContent: "space-between",
				gap: 12,
				flexWrap: "wrap",
			}}
		>
			<div style={{ display: "flex", alignItems: "center", gap: 12 }}>
				<div
					style={{
						width: 36,
						height: 36,
						borderRadius: "50%",
						background: "rgba(13, 148, 136, 0.15)",
						display: "flex",
						alignItems: "center",
						justifyContent: "center",
						color: "var(--teal, #0d9488)",
						flexShrink: 0,
					}}
				>
					<Sparkles size={20} />
				</div>
				<div>
					<div style={{ fontSize: 13, fontWeight: 700, color: "var(--ink)" }}>
						СанПиН 3.3686-21: Пакетное списание пустых карпул смены (без поштучного сканирования)
					</div>
					<div style={{ fontSize: 12, color: "var(--muted)" }}>
						Врачу и администратору не нужно сканировать десятки ампул или ждать старшую медсестру. Быстрое списание типового набора смены единолично.
					</div>
				</div>
			</div>

			<button
				type="button"
				className="mdlp-btn mdlp-btn-primary min-h-[44px]"
				style={{ minHeight: "44px", height: 44, padding: "0 16px", fontSize: 13, fontWeight: 700 }}
				onClick={onQuickNurseCarpulesDisposal}
				data-testid="banner-quick-shift-carpules-btn"
				title="Списать все пустые карпулы смены: 10 шт. Артикаин + 2 шт. Скандонест"
			>
				<Sparkles size={16} className="text-amber-300" />
				Списать все пустые карпулы смены (10 шт. Артикаин + 2 шт. Скандонест)
			</button>
		</div>
	);
};
