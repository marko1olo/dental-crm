import React from "react";
import { Check, Copy } from "lucide-react";
import type { ElnSfrPayloadSectionProps } from "./types";

export function ElnSfrPayloadSection({
	xmlPayload,
	jsonPayload,
	isCopiedXml,
	onCopyXml
}: ElnSfrPayloadSectionProps) {
	return (
		<div className="sick-leave-body">
			<div className="sick-leave-code-container">
				<div className="sick-leave-code-header">
					<span>XML СЭМД ЭЛН v2.0 (Социальный фонд России)</span>
					<button
						type="button"
						className="sick-leave-btn secondary"
						style={{ padding: '0.5rem 0.875rem', minHeight: '44px' }}
						onClick={onCopyXml}
					>
						{isCopiedXml ? <Check size={14} /> : <Copy size={14} />}
						{isCopiedXml ? 'Скопировано' : 'Копировать XML'}
					</button>
				</div>
				<pre className="sick-leave-code-box">{xmlPayload}</pre>
			</div>

			<div className="sick-leave-code-container">
				<div className="sick-leave-code-header">
					<span>JSON API Payload (ЕГИСЗ РЭМД Gateway)</span>
				</div>
				<pre className="sick-leave-code-box">{jsonPayload}</pre>
			</div>
		</div>
	);
}
