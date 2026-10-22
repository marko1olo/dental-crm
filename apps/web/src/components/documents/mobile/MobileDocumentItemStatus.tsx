import React from "react";
import type { GeneratedDocument } from "@dental/shared";
import { AlertCircle, CheckCircle2, Clock } from "lucide-react";

export function MobileDocumentItemStatus({ doc }: { doc: GeneratedDocument }) {
	const isEds = Boolean(doc.doctorSignedAt || doc.cryptoSignaturePkcs7);
	const isDraft = doc.status === "draft";
	const isVoided = doc.status === "voided";

	if (isEds) {
		return (
			<span
				className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-teal-500/10 text-teal-700 dark:text-teal-300 border border-teal-500/20"
				title="Подписан простой электронной подписью"
			>
				<CheckCircle2 size={12} aria-hidden="true" />
				<span>Подписан</span>
			</span>
		);
	}
	if (isDraft) {
		return (
			<span
				className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/20"
				title="Черновик, ожидает подписи"
			>
				<Clock size={12} aria-hidden="true" />
				<span>Черновик</span>
			</span>
		);
	}
	if (isVoided) {
		return (
			<span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-rose-500/10 text-rose-700 dark:text-rose-300 border border-rose-500/20">
				<AlertCircle size={12} aria-hidden="true" />
				<span>Аннулирован</span>
			</span>
		);
	}
	return (
		<span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20">
			<CheckCircle2 size={12} aria-hidden="true" />
			<span>Подписан</span>
		</span>
	);
}
