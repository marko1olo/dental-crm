import React from "react";
import { CheckCircle2, AlertTriangle, FileText } from "lucide-react";
import type { ConsentRecordState, ConsentStatusType } from "../visitConsentTypes";

interface ConsentItemRowBadgesProps {
	readonly status: ConsentStatusType;
	readonly record?: ConsentRecordState | undefined;
}

export function ConsentItemRowBadges({ status, record }: ConsentItemRowBadgesProps) {
	const isSigned = status === "signed";
	const isRequired = status === "required_today";

	return (
		<div className="vct-card-badges">
			{isSigned && (
				<div className="vct-badge vct-badge-signed">
					<CheckCircle2 size={13} />
					<span>Подписано</span>
				</div>
			)}
			{isRequired && (
				<div className="vct-badge vct-badge-required">
					<AlertTriangle size={13} />
					<span>Требуется для сегодняшнего приёма</span>
				</div>
			)}
			{!isSigned && !isRequired && (
				<div className="vct-badge vct-badge-neutral">
					<FileText size={13} />
					<span>Не оформлено</span>
				</div>
			)}
			{isSigned && record?.signedAt && (
				<span className="vct-signed-detail">
					({record.signedAt} • {record.method === "paper" ? "на бумаге" : "планшет"})
				</span>
			)}
		</div>
	);
}
