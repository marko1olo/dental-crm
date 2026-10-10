/**
 * ActPrintWatermark.tsx — Официальный полиграфический водяной знак печатного бланка
 * (ЧЕРНОВИК / ПОДПИСАНО ВРАЧОМ) согласно стандартам документооборота клиники (Мандат 8e).
 */

import React from "react";
import type { ActPrintWatermarkProps } from "./types";

export const ActPrintWatermark: React.FC<ActPrintWatermarkProps> = ({ status }) => {
	const isSignedOrExecuted = status === "signed" || status === "executed";

	return (
		<div
			className={isSignedOrExecuted ? "doc-watermark-signed" : "doc-watermark-draft"}
			aria-hidden="true"
			style={{
				position: "absolute",
				top: "50%",
				left: "50%",
				transform: "translate(-50%, -50%) rotate(-32deg)",
				fontSize: isSignedOrExecuted ? "50pt" : "64pt",
				fontWeight: 900,
				color: isSignedOrExecuted
					? "rgba(16, 185, 129, 0.045)"
					: "rgba(15, 23, 42, 0.045)",
				textTransform: "uppercase",
				letterSpacing: "0.12em",
				pointerEvents: "none",
				zIndex: 0,
				whiteSpace: "nowrap",
				userSelect: "none",
			}}
		>
			{isSignedOrExecuted ? "ПОДПИСАНО ВРАЧОМ" : "ЧЕРНОВИК"}
		</div>
	);
};
