import { Filter } from "lucide-react";
import React from "react";

interface CabinetUnitBreakdownChecksProps {
	turbineSterile: boolean;
	setTurbineSterile: (v: boolean) => void;
	contraAngleSterile: boolean;
	setContraAngleSterile: (v: boolean) => void;
	class5Verified: boolean;
	setClass5Verified: (v: boolean) => void;
	mirrorReady: boolean;
	setMirrorReady: (v: boolean) => void;
	probeReady: boolean;
	setProbeReady: (v: boolean) => void;
	tweezersReady: boolean;
	setTweezersReady: (v: boolean) => void;
	excavatorReady: boolean;
	setExcavatorReady: (v: boolean) => void;
	spatulaReady: boolean;
	setSpatulaReady: (v: boolean) => void;
	salivaConnected: boolean;
	setSalivaConnected: (v: boolean) => void;
	hveConnected: boolean;
	setHveConnected: (v: boolean) => void;
	requiresCofferdam: boolean;
	rubberDamReady: boolean;
	setRubberDamReady: (v: boolean) => void;
	clampsReady: boolean;
	setClampsReady: (v: boolean) => void;
	forcepsReady: boolean;
	setForcepsReady: (v: boolean) => void;
}

export function CabinetUnitBreakdownChecks(p: CabinetUnitBreakdownChecksProps) {
	return (
		<div style={{ background: "var(--paper-subtle, #f8fafc)", border: "1px solid var(--paper-border, #e2e8f0)", borderRadius: "0.75rem", padding: "1rem" }}>
			<h4 style={{ fontSize: "0.9rem", fontWeight: 700, marginBottom: "0.6rem", color: "var(--brand-primary, #2563eb)", display: "flex", alignItems: "center", gap: "0.4rem" }}>
				<Filter size={16} /> Ручная отметка неисправностей узлов:
			</h4>

			<div style={{ display: "flex", flexDirection: "column", gap: "0.6rem", fontSize: "0.82rem" }}>
				<div style={{ background: "var(--paper, #ffffff)", padding: "0.55rem 0.75rem", borderRadius: "0.5rem", border: "1px solid var(--line, #e2e8f0)" }}>
					<strong style={{ display: "block", marginBottom: "0.3rem", color: "var(--ink, #1e293b)", fontSize: "0.8rem" }}>Наконечники и стерильность:</strong>
					<label style={{ display: "flex", alignItems: "center", gap: "0.45rem", marginBottom: "0.25rem", cursor: "pointer" }}>
						<input type="checkbox" checked={p.turbineSterile} onChange={(e) => p.setTurbineSterile(e.target.checked)} style={{ width: "16px", height: "16px" }} />
						<span>Турбинный наконечник стерилен</span>
					</label>
					<label style={{ display: "flex", alignItems: "center", gap: "0.45rem", marginBottom: "0.25rem", cursor: "pointer" }}>
						<input type="checkbox" checked={p.contraAngleSterile} onChange={(e) => p.setContraAngleSterile(e.target.checked)} style={{ width: "16px", height: "16px" }} />
						<span>Угловой / микромоторный наконечник стерилен</span>
					</label>
					<label style={{ display: "flex", alignItems: "center", gap: "0.45rem", cursor: "pointer" }}>
						<input type="checkbox" checked={p.class5Verified} onChange={(e) => p.setClass5Verified(e.target.checked)} style={{ width: "16px", height: "16px" }} />
						<span style={{ fontWeight: 600, color: "var(--ok-fg, #059669)" }}>Индикатор 5 класса проверен</span>
					</label>
				</div>

				<div style={{ background: "var(--paper, #ffffff)", padding: "0.55rem 0.75rem", borderRadius: "0.5rem", border: "1px solid var(--line, #e2e8f0)" }}>
					<strong style={{ display: "block", marginBottom: "0.3rem", color: "var(--ink, #1e293b)", fontSize: "0.8rem" }}>Смотровой лоток:</strong>
					<div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "0.2rem" }}>
						<label style={{ display: "flex", alignItems: "center", gap: "0.35rem", cursor: "pointer" }}>
							<input type="checkbox" checked={p.mirrorReady} onChange={(e) => p.setMirrorReady(e.target.checked)} style={{ width: "15px", height: "15px" }} />
							<span>Зеркало</span>
						</label>
						<label style={{ display: "flex", alignItems: "center", gap: "0.35rem", cursor: "pointer" }}>
							<input type="checkbox" checked={p.probeReady} onChange={(e) => p.setProbeReady(e.target.checked)} style={{ width: "15px", height: "15px" }} />
							<span>Зонд</span>
						</label>
						<label style={{ display: "flex", alignItems: "center", gap: "0.35rem", cursor: "pointer" }}>
							<input type="checkbox" checked={p.tweezersReady} onChange={(e) => p.setTweezersReady(e.target.checked)} style={{ width: "15px", height: "15px" }} />
							<span>Пинцет</span>
						</label>
						<label style={{ display: "flex", alignItems: "center", gap: "0.35rem", cursor: "pointer" }}>
							<input type="checkbox" checked={p.excavatorReady} onChange={(e) => p.setExcavatorReady(e.target.checked)} style={{ width: "15px", height: "15px" }} />
							<span>Экскаватор</span>
						</label>
						<label style={{ display: "flex", alignItems: "center", gap: "0.35rem", cursor: "pointer", gridColumn: "span 2" }}>
							<input type="checkbox" checked={p.spatulaReady} onChange={(e) => p.setSpatulaReady(e.target.checked)} style={{ width: "15px", height: "15px" }} />
							<span>Гладилка-штопфер</span>
						</label>
					</div>
				</div>

				<div style={{ background: "var(--paper, #ffffff)", padding: "0.55rem 0.75rem", borderRadius: "0.5rem", border: "1px solid var(--line, #e2e8f0)" }}>
					<strong style={{ display: "block", marginBottom: "0.3rem", color: "var(--ink, #1e293b)", fontSize: "0.8rem" }}>Аспирация и изоляция:</strong>
					<label style={{ display: "flex", alignItems: "center", gap: "0.45rem", marginBottom: "0.2rem", cursor: "pointer" }}>
						<input type="checkbox" checked={p.salivaConnected} onChange={(e) => p.setSalivaConnected(e.target.checked)} style={{ width: "16px", height: "16px" }} />
						<span>Слюноотсос исправен</span>
					</label>
					<label style={{ display: "flex", alignItems: "center", gap: "0.45rem", marginBottom: "0.2rem", cursor: "pointer" }}>
						<input type="checkbox" checked={p.hveConnected} onChange={(e) => p.setHveConnected(e.target.checked)} style={{ width: "16px", height: "16px" }} />
						<span>Пылесос (HVE) исправен</span>
					</label>
					{p.requiresCofferdam && (
						<label style={{ display: "flex", alignItems: "center", gap: "0.45rem", cursor: "pointer" }}>
							<input type="checkbox" checked={p.rubberDamReady && p.clampsReady && p.forcepsReady} onChange={(e) => { const v = e.target.checked; p.setRubberDamReady(v); p.setClampsReady(v); p.setForcepsReady(v); }} style={{ width: "16px", height: "16px" }} />
							<span style={{ fontWeight: 600, color: "var(--teal, #0d9488)" }}>Коффердам (платок, клампы)</span>
						</label>
					)}
				</div>
			</div>
		</div>
	);
}
