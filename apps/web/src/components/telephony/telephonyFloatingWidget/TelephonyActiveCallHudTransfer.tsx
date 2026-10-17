/**
 * @file TelephonyActiveCallHudTransfer.tsx
 * @description Subcomponent for active call transfer panel (blind / attended transfer).
 */

import { PhoneForwarded } from "lucide-react";
import React, { useRef, useState } from "react";
import { showToast } from "../../GlobalToast";

interface TelephonyActiveCallHudTransferProps {
	transferType: "blind" | "attended";
	onSetTransferType: (type: "blind" | "attended") => void;
	onStartTransfer: (target: string, type: "blind" | "attended") => void;
}

export function TelephonyActiveCallHudTransfer({
	transferType,
	onSetTransferType,
	onStartTransfer,
}: TelephonyActiveCallHudTransferProps) {
	const [transferExt, setTransferExt] = useState("");
	const transferInputRef = useRef<HTMLInputElement | null>(null);

	const handleConfirmTransfer = () => {
		if (!transferExt.trim()) {
			transferInputRef.current?.focus();
			showToast("Укажите добавочный номер врача (например, 101)", "warning");
			return;
		}
		onStartTransfer(transferExt.trim(), transferType);
		setTransferExt("");
	};

	return (
		<div className="dnt-transfer-drawer">
			<div className="dnt-segmented-group">
				<button
					type="button"
					onClick={() => onSetTransferType("blind")}
					className={`dnt-status-chip ${
						transferType === "blind" ? "dnt-status-chip--active" : ""
					}`}
				>
					Прямой перевод
				</button>
				<button
					type="button"
					onClick={() => onSetTransferType("attended")}
					className={`dnt-status-chip ${
						transferType === "attended" ? "dnt-status-chip--active" : ""
					}`}
				>
					С консультацией
				</button>
			</div>

			<div className="flex items-center gap-2 mt-2">
				<input
					ref={transferInputRef}
					type="text"
					value={transferExt}
					onChange={(e) => setTransferExt(e.target.value)}
					placeholder="Внутренний номер (101, 102...)"
					className="dnt-text-input flex-1"
				/>
				<button
					type="button"
					onClick={handleConfirmTransfer}
					className="dnt-cta-primary"
				>
					<PhoneForwarded size={14} />
					<span>Перевести</span>
				</button>
			</div>
		</div>
	);
}
