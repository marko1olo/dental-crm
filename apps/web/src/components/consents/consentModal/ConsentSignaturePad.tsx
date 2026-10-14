import React from "react";
import { Check, Copy, Lock } from "lucide-react";
import {
	ConsentSigningPanel,
	type ConsentSigningPanelProps,
} from "../ConsentSigningPanel.js";

export interface ConsentSignaturePadProps extends ConsentSigningPanelProps {
	integrityHash?: string | undefined;
	copiedHash?: boolean | undefined;
	onCopyHash?: (() => void) | undefined;
	showIntegrityCard?: boolean | undefined;
}

import { generateQrCodeSvg } from "@dental/shared";

export const ConsentIntegrityCard: React.FC<{
	integrityHash: string;
	copiedHash: boolean;
	onCopyHash: () => void;
}> = ({ integrityHash, copiedHash, onCopyHash }) => {
	const qrSvg = React.useMemo(() => {
		if (!integrityHash) return "";
		return generateQrCodeSvg(`egisz:doc?hash=${integrityHash}`, {
			size: 36,
			margin: 0,
			foregroundColor: "#0d9488",
			backgroundColor: "transparent",
			title: `Верификация SHA-256: ${integrityHash.slice(0, 16)}`,
		});
	}, [integrityHash]);

	return (
		<div className="consent-integrity-card flex items-center justify-between gap-3">
			<div className="flex items-center gap-2 min-w-0">
				{qrSvg && (
					<div
						className="shrink-0 rounded bg-[var(--paper-soft)] p-0.5"
						dangerouslySetInnerHTML={{ __html: qrSvg }}
						title="QR-код верификации целостности"
					/>
				)}
				<div className="flex flex-col min-w-0">
					<div className="flex items-center gap-1.5">
						<Lock size={13} className="text-[var(--teal,#0d9488)] shrink-0" />
						<span className="font-semibold text-xs text-muted truncate">Цифровой отпечаток SHA-256:</span>
					</div>
					<span className="consent-integrity-hash font-mono text-[11px] truncate">{integrityHash.slice(0, 20)}...</span>
				</div>
			</div>
			<button
				type="button"
				className="consent-tool-btn py-1 px-2.5 text-xs shrink-0"
				onClick={onCopyHash}
				title="Скопировать полный хеш целостности"
				aria-label="Скопировать полный хеш"
			>
				{copiedHash ? <Check size={14} className="text-ok-fg" /> : <Copy size={14} />}
				<span>{copiedHash ? "Скопировано" : "Копировать"}</span>
			</button>
		</div>
	);
};

export const ConsentSignaturePad: React.FC<ConsentSignaturePadProps> = ({
	integrityHash,
	copiedHash = false,
	onCopyHash,
	showIntegrityCard = false,
	...signingPanelProps
}) => {
	return (
		<>
			<ConsentSigningPanel {...signingPanelProps} />
			{showIntegrityCard && integrityHash && onCopyHash && (
				<ConsentIntegrityCard
					integrityHash={integrityHash}
					copiedHash={copiedHash}
					onCopyHash={onCopyHash}
				/>
			)}
		</>
	);
};
