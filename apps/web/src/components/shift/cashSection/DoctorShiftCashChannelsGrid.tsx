import React from "react";
import { Banknote, Coins, CreditCard, QrCode } from "lucide-react";
import { money } from "../../../AppHelpers";

export interface DoctorShiftCashChannelsGridProps {
	readonly cashRub: number;
	readonly cardRub: number;
	readonly sbpRub: number;
	readonly depositRub: number;
}

export const DoctorShiftCashChannelsGrid: React.FC<DoctorShiftCashChannelsGridProps> = ({
	cashRub,
	cardRub,
	sbpRub,
	depositRub,
}) => {
	const channels = [
		{ label: "Наличные в кассе", amount: cashRub, hint: "Денежный ящик", icon: Banknote },
		{ label: "Банковские карты", amount: cardRub, hint: "POS-эквайринг", icon: CreditCard },
		{ label: "СБП по QR-коду", amount: sbpRub, hint: "Комиссия 0.4%", icon: QrCode },
		{ label: "Списание депозитов", amount: depositRub, hint: "Авансы пациентов", icon: Coins },
	];

	return (
		<div
			style={{
				display: "grid",
				gridTemplateColumns: "repeat(auto-fit, minmax(min(160px, 100%), 1fr))",
				gap: "8px",
			}}
		>
			{channels.map((chan) => {
				const Icon = chan.icon;
				return (
					<div
						key={chan.label}
						style={{
							padding: "10px 12px",
							borderRadius: "8px",
							background: "var(--paper-soft)",
							border: "1px solid var(--line)",
							display: "flex",
							flexDirection: "column",
							gap: "2px",
						}}
					>
						<span
							style={{
								fontSize: "11px",
								fontWeight: 600,
								color: "var(--muted)",
								display: "flex",
								alignItems: "center",
								gap: "5px",
							}}
						>
							<Icon size={13} style={{ color: "var(--teal-dark, #0f766e)" }} aria-hidden="true" />
							{chan.label}
						</span>
						<strong style={{ fontSize: "15px", fontWeight: 800, color: "var(--ink)", fontVariantNumeric: "tabular-nums" }}>
							{money(chan.amount)}
						</strong>
						<span style={{ fontSize: "10.5px", color: "var(--muted)" }}>{chan.hint}</span>
					</div>
				);
			})}
		</div>
	);
};
