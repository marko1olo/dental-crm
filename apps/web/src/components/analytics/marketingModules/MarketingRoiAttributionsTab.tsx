import React from "react";
import { formatInitialsOnly, maskRussianPhone, type PatientAttributionRecord } from "@dental/shared";
import { Globe, PhoneCall, Search, ShieldCheck, Tag, X } from "lucide-react";
import { showToast } from "../../GlobalToast";

export interface MarketingRoiAttributionsTabProps {
	readonly attributions: readonly PatientAttributionRecord[];
	readonly searchQuery: string;
	readonly onSearchQueryChange: (q: string) => void;
}

export const MarketingRoiAttributionsTab: React.FC<MarketingRoiAttributionsTabProps> = ({
	attributions,
	searchQuery,
	onSearchQueryChange,
}) => {
	const handleCopyUtm = (val: string) => {
		navigator.clipboard.writeText(val);
		showToast(`Скопировано: ${val}`, "info");
	};

	return (
		<div className="space-y-4" data-testid="attributions-view">
			<div className="flex items-start gap-2.5 p-3 rounded-xl bg-teal-950/20 border border-teal-800/30 text-xs" data-testid="marketing-roi-privacy-banner">
				<ShieldCheck size={18} className="text-teal-400 shrink-0 mt-0.5" />
				<div>
					<strong className="text-[var(--ink,#f8fafc)] font-semibold block">Врачебная тайна и защита персональных данных</strong>
					<span className="text-[var(--muted,#94a3b8)]">ФИО сокращены до инициалов, номера телефонов маскированы, нозологии обезличены.</span>
				</div>
			</div>

			<div className="flex items-center justify-between flex-wrap gap-3 pb-2 border-b border-[var(--line,rgba(204,251,241,0.15))]">
				<div>
					<h3 className="text-sm font-bold text-[var(--ink,#f8fafc)] flex items-center gap-2">
						<Tag className="w-4 h-4 text-teal-400" />
						<span>Привязка UTM-меток и Calltouch/Roistat ID к первичным пациентам</span>
					</h3>
					<p className="text-xs text-[var(--muted,#94a3b8)]">Сквозная связка звонка из SIP-телефонии и оплаченного плана</p>
				</div>
				<div className="dente-search-wrap min-w-[260px]">
					<Search size={14} className="dente-search-icon" />
					<input
						type="text"
						value={searchQuery}
						onChange={(e) => onSearchQueryChange(e.target.value)}
						placeholder="Поиск по ФИО, телефону, UTM или ID..."
						className="dente-search-input"
						data-testid="search-attributions-input"
					/>
					{searchQuery && (
						<button type="button" onClick={() => onSearchQueryChange("")} className="dente-search-clear" aria-label="Очистить поиск">
							<X size={13} />
						</button>
					)}
				</div>
			</div>

			{attributions.length === 0 ? (
				<div className="text-center py-12 text-[var(--muted,#94a3b8)] bg-[var(--paper-soft,#0f172a)] rounded-xl border border-[var(--line,rgba(204,251,241,0.15))] p-6 my-2" data-testid="attributions-empty-state">
					<Globe className="w-10 h-10 mx-auto mb-3 text-[var(--muted,#94a3b8)] opacity-40" />
					<div className="text-sm font-bold text-[var(--ink,#f8fafc)]">Нет записей сквозной атрибуции пациентов</div>
				</div>
			) : (
				<div className="marketing-roi-patient-cards">
					{attributions.map((attr) => (
						<div key={attr.id} className="marketing-roi-patient-card" data-testid={`attribution-card-${attr.patientId}`}>
							<div className="marketing-roi-patient-top">
								<div className="marketing-roi-patient-name">
									<span>{formatInitialsOnly(attr.patientFullName) || attr.patientFullName}</span>
									<span className="text-xs font-mono text-[var(--muted,#94a3b8)]">{maskRussianPhone(attr.phone)}</span>
									<span className="marketing-roi-chip highlight">{attr.channelNameRu}</span>
								</div>
								<div className="flex items-center gap-2">
									<span className="text-xs font-mono font-bold text-emerald-400 bg-emerald-950/30 border border-emerald-800/40 px-2.5 py-1 rounded-lg">
										Оплачено: {(attr.totalPaidKopecks / 100).toLocaleString("ru-RU")} ₽
									</span>
									<span className="text-xs font-bold px-2 py-0.5 rounded-full bg-teal-900/40 text-teal-300 border border-teal-700/50">
										{attr.currentStage === "paid_plan" ? "Оплачен план" : attr.currentStage === "attended" ? "Был на приеме" : "Записан"}
									</span>
								</div>
							</div>
							<div className="flex flex-wrap items-center gap-1.5 text-xs">
								{attr.utm.utm_source && (
									<span onClick={() => handleCopyUtm(attr.utm.utm_source!)} className="marketing-roi-chip cursor-pointer hover:border-teal-400" title="Скопировать">
										utm_source: <b>{attr.utm.utm_source}</b>
									</span>
								)}
								{attr.utm.utm_campaign && (
									<span onClick={() => handleCopyUtm(attr.utm.utm_campaign!)} className="marketing-roi-chip cursor-pointer hover:border-teal-400" title="Скопировать">
										campaign: <b>{attr.utm.utm_campaign}</b>
									</span>
								)}
								{attr.externalIds.calltouchId && <span className="marketing-roi-chip highlight">Calltouch ID: <b>{attr.externalIds.calltouchId}</b></span>}
								{attr.externalIds.roistatId && <span className="marketing-roi-chip highlight">Roistat ID: <b>{attr.externalIds.roistatId}</b></span>}
								{attr.sipCallDurationSeconds && attr.sipCallDurationSeconds > 0 ? (
									<span className="marketing-roi-chip inline-flex items-center gap-1">
										<PhoneCall size={12} className="text-teal-400 shrink-0" />
										<span>SIP ({attr.sipCallDurationSeconds} сек, {attr.sipProvider})</span>
									</span>
								) : null}
							</div>
							<div className="flex items-center justify-between text-xs text-[var(--muted,#94a3b8)] pt-2 border-t border-[var(--line,rgba(204,251,241,0.08))] flex-wrap gap-2">
								<div>Врач: <b className="text-[var(--ink,#f8fafc)]">{attr.doctorName || "—"}</b> ({attr.specialtyRu || "Терапевт"})</div>
								{attr.notes && <div className="text-xs italic text-[var(--muted,#94a3b8)]">«{attr.notes}»</div>}
							</div>
						</div>
					))}
				</div>
			)}
		</div>
	);
};
