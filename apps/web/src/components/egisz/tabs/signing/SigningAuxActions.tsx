/**
 * SigningAuxActions.tsx — Auxiliary action buttons (Print, XML download, Validation, Sig upload)
 */

import React from "react";
import { Building2, CheckCircle2, Download, FileCode2, Printer } from "lucide-react";

export interface SigningAuxActionsProps {
	readonly onPrint: () => void;
	readonly onDownloadXml: () => void;
	readonly onValidateCdaXml: () => void;
	readonly onUploadDetachedSig: (e: React.ChangeEvent<HTMLInputElement>) => void;
	readonly onUploadDetachedMoSig: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export const SigningAuxActions: React.FC<SigningAuxActionsProps> = ({
	onPrint,
	onDownloadXml,
	onValidateCdaXml,
	onUploadDetachedSig,
	onUploadDetachedMoSig,
}) => {
	return (
		<div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem", alignItems: "center" }}>
			<button
				type="button" onClick={onPrint} className="egisz-btn sm"
				style={{ display: "flex", alignItems: "center", gap: "0.35rem", padding: "0.35rem 0.75rem", fontSize: "0.75rem", fontWeight: 600, borderRadius: "6px", background: "var(--paper)", color: "var(--ink)", border: "1px solid var(--line)", cursor: "pointer" }}
			>
				<Printer size={14} /> Печать со штампом
			</button>
			<button
				type="button" onClick={onDownloadXml} className="egisz-btn sm"
				style={{ display: "flex", alignItems: "center", gap: "0.35rem", padding: "0.35rem 0.75rem", fontSize: "0.75rem", fontWeight: 600, borderRadius: "6px", background: "var(--paper)", color: "var(--ink)", border: "1px solid var(--line)", cursor: "pointer" }}
			>
				<Download size={14} /> Скачать XML
			</button>
			<button
				type="button" onClick={onValidateCdaXml} className="egisz-btn sm"
				style={{ display: "flex", alignItems: "center", gap: "0.35rem", padding: "0.35rem 0.75rem", fontSize: "0.75rem", fontWeight: 600, borderRadius: "6px", background: "var(--paper)", color: "var(--teal)", border: "1px solid var(--line)", cursor: "pointer" }}
			>
				<CheckCircle2 size={14} /> Проверка XML
			</button>
			<label style={{ display: "flex", alignItems: "center", gap: "0.35rem", padding: "0.35rem 0.75rem", fontSize: "0.75rem", fontWeight: 600, borderRadius: "6px", border: "1px solid var(--line)", background: "var(--paper)", color: "var(--ink)", cursor: "pointer" }}>
				<FileCode2 size={14} /> Загрузить .sig / .p7s (врач)
				<input type="file" accept=".sig,.p7s,.sgn,.bin" style={{ display: "none" }} onChange={onUploadDetachedSig} />
			</label>
			<label style={{ display: "flex", alignItems: "center", gap: "0.35rem", padding: "0.35rem 0.75rem", fontSize: "0.75rem", fontWeight: 600, borderRadius: "6px", border: "1px solid var(--line)", background: "var(--paper)", color: "var(--ink)", cursor: "pointer" }}>
				<Building2 size={14} /> Загрузить .sig (клиника)
				<input type="file" accept=".sig,.p7s,.sgn,.bin" style={{ display: "none" }} onChange={onUploadDetachedMoSig} />
			</label>
		</div>
	);
};
