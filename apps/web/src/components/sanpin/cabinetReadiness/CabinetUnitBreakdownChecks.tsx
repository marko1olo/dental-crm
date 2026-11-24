import { CheckCircle2, ShieldCheck, Sparkles } from "lucide-react";
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
	onQuickFillAllReady?: (() => void) | undefined;
}

export function CabinetUnitBreakdownChecks(p: CabinetUnitBreakdownChecksProps) {
	const areTraysReady =
		p.mirrorReady && p.probeReady && p.tweezersReady && p.excavatorReady && p.spatulaReady;
	const areHandpiecesAndAspirationReady =
		p.turbineSterile && p.contraAngleSterile && p.class5Verified && p.salivaConnected && p.hveConnected;

	const handleToggleTrays = () => {
		const next = !areTraysReady;
		p.setMirrorReady(next);
		p.setProbeReady(next);
		p.setTweezersReady(next);
		p.setExcavatorReady(next);
		p.setSpatulaReady(next);
	};

	const handleToggleAspiration = () => {
		const next = !areHandpiecesAndAspirationReady;
		p.setTurbineSterile(next);
		p.setContraAngleSterile(next);
		p.setClass5Verified(next);
		p.setSalivaConnected(next);
		p.setHveConnected(next);
	};

	const handleConfirmAllReady = () => {
		if (p.onQuickFillAllReady) {
			p.onQuickFillAllReady();
		} else {
			p.setMirrorReady(true);
			p.setProbeReady(true);
			p.setTweezersReady(true);
			p.setExcavatorReady(true);
			p.setSpatulaReady(true);
			p.setTurbineSterile(true);
			p.setContraAngleSterile(true);
			p.setClass5Verified(true);
			p.setSalivaConnected(true);
			p.setHveConnected(true);
			if (p.requiresCofferdam) {
				p.setRubberDamReady(true);
				p.setClampsReady(true);
				p.setForcepsReady(true);
			}
		}
	};

	return (
		<div className="p-3.5 rounded-xl border border-[var(--line,#e2e8f0)] bg-[var(--paper-soft,#f8fafc)] flex flex-col gap-3 text-xs" data-testid="cabinet-clinical-readiness-block">
			<div className="flex items-center gap-2 text-[var(--ink,#1e293b)] font-bold text-xs sm:text-sm">
				<ShieldCheck className="w-4 h-4 text-[var(--teal,#0d9488)] shrink-0" />
				<span>Клиническая готовность кабинета к приёму</span>
			</div>

			<div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
				<button
					type="button"
					onClick={handleToggleTrays}
					className={`p-3 rounded-xl border text-left flex flex-col gap-1 transition-all cursor-pointer min-h-[52px] ${
						areTraysReady
							? "border-emerald-500/30 bg-emerald-500/5 text-emerald-800 dark:text-emerald-300"
							: "border-[var(--line,#cbd5e1)] bg-[var(--paper,#ffffff)] text-[var(--muted,#64748b)] hover:bg-[var(--line,#e2e8f0)]/30"
					}`}
					title="Стерильные инструментальные лотки"
				>
					<div className="flex items-center justify-between">
						<span className="font-bold text-xs text-[var(--ink,#1e293b)]">Стерильные инструментальные лотки</span>
						<CheckCircle2 className={`w-4 h-4 shrink-0 ${areTraysReady ? "text-emerald-600 dark:text-emerald-400" : "text-[var(--muted,#64748b)]"}`} />
					</div>
					<span className="text-[11px] text-[var(--muted,#64748b)]">
						{areTraysReady ? "В наличии и укомплектованы (Готово)" : "Требуется пополнение лотков"}
					</span>
				</button>

				<button
					type="button"
					onClick={handleToggleAspiration}
					className={`p-3 rounded-xl border text-left flex flex-col gap-1 transition-all cursor-pointer min-h-[52px] ${
						areHandpiecesAndAspirationReady
							? "border-emerald-500/30 bg-emerald-500/5 text-emerald-800 dark:text-emerald-300"
							: "border-[var(--line,#cbd5e1)] bg-[var(--paper,#ffffff)] text-[var(--muted,#64748b)] hover:bg-[var(--line,#e2e8f0)]/30"
					}`}
					title="Аспирационная система и наконечники"
				>
					<div className="flex items-center justify-between">
						<span className="font-bold text-xs text-[var(--ink,#1e293b)]">Аспирационная система и наконечники</span>
						<CheckCircle2 className={`w-4 h-4 shrink-0 ${areHandpiecesAndAspirationReady ? "text-emerald-600 dark:text-emerald-400" : "text-[var(--muted,#64748b)]"}`} />
					</div>
					<span className="text-[11px] text-[var(--muted,#64748b)]">
						{areHandpiecesAndAspirationReady ? "Продезинфицированы и готовы (Готово)" : "Требуется проверка аспирации"}
					</span>
				</button>
			</div>

			<div className="pt-1 flex items-center justify-end">
				<button
					type="button"
					onClick={handleConfirmAllReady}
					className="w-full sm:w-auto h-9 min-h-[36px] px-4 rounded-xl font-bold text-xs text-white bg-[var(--teal,#0d9488)] hover:bg-[var(--teal-600,#0f766e)] shadow-xs inline-flex items-center justify-center gap-1.5 cursor-pointer transition-all active:scale-[0.98]"
					title="Подтвердить готовность кабинета к смене"
				>
					<Sparkles size={14} className="text-white shrink-0" />
					<span>Подтвердить готовность кабинета к смене</span>
				</button>
			</div>
		</div>
	);
}
