export interface CryptoProTypeSelectorProps {
	signatureType: "crypto" | "pin";
	setSignatureType: (type: "crypto" | "pin") => void;
	lockInProgress: boolean;
	setFailureText: (text: string | null) => void;
	setPinCode: (pin: string) => void;
	loadCertificates: () => void;
}

export function CryptoProTypeSelector({
	signatureType,
	setSignatureType,
	lockInProgress,
	setFailureText,
	setPinCode,
	loadCertificates,
}: CryptoProTypeSelectorProps) {
	return (
		<div className="flex gap-2 mb-6 p-1 bg-[var(--paper-soft)] rounded-xl border border-[var(--line)]">
			<button
				type="button"
				disabled={lockInProgress}
				onClick={() => {
					setSignatureType("pin");
					setFailureText(null);
					setPinCode("");
				}}
				className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-colors disabled:opacity-60 cursor-pointer min-h-[40px] ${
					signatureType === "pin"
						? "bg-[var(--paper)] text-[var(--ink)] border border-[var(--line)] shadow-xs"
						: "text-[var(--muted)] hover:text-[var(--ink)]"
				}`}
			>
				Подпись врача
			</button>
			<button
				type="button"
				disabled={lockInProgress}
				onClick={() => {
					setSignatureType("crypto");
					setFailureText(null);
					setPinCode("");
					loadCertificates();
				}}
				className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-colors disabled:opacity-60 cursor-pointer min-h-[40px] ${
					signatureType === "crypto"
						? "bg-[var(--paper)] text-[var(--ink)] border border-[var(--line)] shadow-xs"
						: "text-[var(--muted)] hover:text-[var(--ink)]"
				}`}
			>
				КриптоПро / Рутокен
			</button>
		</div>
	);
}
