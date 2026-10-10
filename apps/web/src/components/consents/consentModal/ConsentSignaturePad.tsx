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

export const ConsentIntegrityCard: React.FC<{
	integrityHash: string;
	copiedHash: boolean;
	onCopyHash: () => void;
}> = ({ integrityHash, copiedHash, onCopyHash }) => {
	return (
		<div className="consent-integrity-card">
			<div className="flex items-center gap-2">
				<Lock size={16} className="text-[var(--teal,#0d9488)]" />
				<span className="font-semibold text-xs text-muted">Цифровой отпечаток SHA-256:</span>
				<span className="consent-integrity-hash">{integrityHash.slice(0, 16)}...</span>
			</div>
			<button
				type="button"
				className="consent-tool-btn py-1 px-2 text-xs"
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
