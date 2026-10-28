import React from "react";
import type { CpitnIndex, CpitnSextantCode } from "@dental/shared";
import { CPITN_SEXTANT_OPTIONS } from "./cpitnOptions";

export interface CpitnSextantsGridProps {
	readonly cpitn: CpitnIndex;
	readonly setCpitn: React.Dispatch<React.SetStateAction<CpitnIndex>>;
	readonly effectiveDisabled: boolean;
}

export const CpitnSextantsGrid: React.FC<CpitnSextantsGridProps> = React.memo(
	function CpitnSextantsGrid({ cpitn, setCpitn, effectiveDisabled }) {
		return (
			<div style={{ background: "var(--paper-strong, #f8fafc)", padding: "14px", borderRadius: "8px", marginBottom: "16px" }}>
				<h6 style={{ fontWeight: 700, marginBottom: "8px" }}>Верхняя челюсть</h6>
				<div className="document-payload-row" style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "10px", marginBottom: "14px" }}>
					<label>
						Секстант 18–14 (Верхний правый)
						<select
							value={cpitn.sextant18_14}
							onChange={(e) => setCpitn((p) => ({ ...p, sextant18_14: e.target.value as CpitnSextantCode }))}
							disabled={effectiveDisabled}
						>
							{CPITN_SEXTANT_OPTIONS.map((opt) => (
								<option key={opt.value} value={opt.value} title={opt.hint}>{opt.label}</option>
							))}
						</select>
					</label>
					<label>
						Секстант 13–23 (Верхний фронтальный)
						<select
							value={cpitn.sextant13_23}
							onChange={(e) => setCpitn((p) => ({ ...p, sextant13_23: e.target.value as CpitnSextantCode }))}
							disabled={effectiveDisabled}
						>
							{CPITN_SEXTANT_OPTIONS.map((opt) => (
								<option key={opt.value} value={opt.value} title={opt.hint}>{opt.label}</option>
							))}
						</select>
					</label>
					<label>
						Секстант 24–28 (Верхний левый)
						<select
							value={cpitn.sextant24_28}
							onChange={(e) => setCpitn((p) => ({ ...p, sextant24_28: e.target.value as CpitnSextantCode }))}
							disabled={effectiveDisabled}
						>
							{CPITN_SEXTANT_OPTIONS.map((opt) => (
								<option key={opt.value} value={opt.value} title={opt.hint}>{opt.label}</option>
							))}
						</select>
					</label>
				</div>

				<h6 style={{ fontWeight: 700, marginBottom: "8px" }}>Нижняя челюсть</h6>
				<div className="document-payload-row" style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "10px" }}>
					<label>
						Секстант 48–44 (Нижний правый)
						<select
							value={cpitn.sextant48_44}
							onChange={(e) => setCpitn((p) => ({ ...p, sextant48_44: e.target.value as CpitnSextantCode }))}
							disabled={effectiveDisabled}
						>
							{CPITN_SEXTANT_OPTIONS.map((opt) => (
								<option key={opt.value} value={opt.value} title={opt.hint}>{opt.label}</option>
							))}
						</select>
					</label>
					<label>
						Секстант 43–33 (Нижний фронтальный)
						<select
							value={cpitn.sextant43_33}
							onChange={(e) => setCpitn((p) => ({ ...p, sextant43_33: e.target.value as CpitnSextantCode }))}
							disabled={effectiveDisabled}
						>
							{CPITN_SEXTANT_OPTIONS.map((opt) => (
								<option key={opt.value} value={opt.value} title={opt.hint}>{opt.label}</option>
							))}
						</select>
					</label>
					<label>
						Секстант 34–38 (Нижний левый)
						<select
							value={cpitn.sextant34_38}
							onChange={(e) => setCpitn((p) => ({ ...p, sextant34_38: e.target.value as CpitnSextantCode }))}
							disabled={effectiveDisabled}
						>
							{CPITN_SEXTANT_OPTIONS.map((opt) => (
								<option key={opt.value} value={opt.value} title={opt.hint}>{opt.label}</option>
							))}
						</select>
					</label>
				</div>
			</div>
		);
	},
);
