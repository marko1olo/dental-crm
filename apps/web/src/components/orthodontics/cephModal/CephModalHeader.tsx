import React from "react";
import { Activity, ExternalLink, FileText, Mic, MicOff, Save, X } from "lucide-react";

export interface CephModalHeaderProps {
	readonly patientName?: string | undefined;
	readonly patientId?: string | undefined;
	readonly isVoiceListening: boolean;
	readonly voiceInterimText: string;
	readonly toggleVoiceListening: () => void;
	readonly onSaveToEmrOnly: () => void;
	readonly onInsertToChart: () => void;
	readonly onOpenPopoutStudio: () => void;
	readonly onSaveConsultationWithoutCeph: () => void;
	readonly onClose: () => void;
}

export const CephModalHeader: React.FC<CephModalHeaderProps> = ({
	patientName,
	patientId,
	isVoiceListening,
	voiceInterimText,
	toggleVoiceListening,
	onSaveToEmrOnly,
	onInsertToChart,
	onOpenPopoutStudio,
	onSaveConsultationWithoutCeph,
	onClose,
}) => {
	return (
		<header className="flex items-center justify-between px-3 sm:px-6 py-2.5 border-b border-[var(--line)] bg-[var(--paper-soft)] shrink-0">
			<div className="flex items-center gap-2.5 sm:gap-3 shrink-0 mr-4">
				<div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-[var(--paper)] border border-[var(--line)] flex items-center justify-center text-[var(--primary)] shadow-sm shrink-0">
					<Activity size={20} className="sm:w-5 sm:h-5" />
				</div>
				<div>
					<div className="flex items-center gap-2 flex-wrap">
						<h2 className="text-sm sm:text-base font-black tracking-tight text-[var(--ink)] m-0 whitespace-nowrap" aria-label="Цефалометрический трекер ТРГ">
							Цефалометрический анализ ТРГ
							<span className="sr-only">Цефалометрический трекер ТРГ</span>
						</h2>
						<span className="text-[10px] sm:text-xs uppercase tracking-wider font-extrabold bg-[var(--paper-soft)] text-[var(--primary)] border border-[var(--line)] px-2 py-0.5 rounded-lg shrink-0 whitespace-nowrap">
							Steiner / Tweed / Downs / Ricketts / McNamara
						</span>
					</div>
					<p className="text-xs text-[var(--muted)] m-0 mt-0.5 whitespace-nowrap">
						{patientName ? `Пациент: ${patientName}` : "Ортодонтический модуль"} {patientId ? `• ID: ${patientId}` : ""} · Медицинская карта
					</p>
				</div>
			</div>

			<div className="flex items-center gap-2 shrink-0">
				{isVoiceListening && (
					<div className="ceph-voice-bar hidden md:inline-flex" title="Идет голосовая диктовка ориентиров">
						<Mic size={14} className="animate-pulse text-teal-400" />
						<span className="max-w-[180px] truncate">{voiceInterimText || "Слушаю («точка Назион», «точка А»)..."}</span>
					</div>
				)}
				<button
					type="button"
					onClick={toggleVoiceListening}
					className={`secondary-button shrink-0 ${isVoiceListening ? "!bg-teal-600/30 !border-teal-500 !text-teal-200 animate-pulse" : ""}`}
					title="Голосовая диктовка ориентиров цефалометрии"
					data-testid="ceph-voice-toggle-btn"
				>
					{isVoiceListening ? <MicOff size={14} /> : <Mic size={14} />}
					<span className="hidden sm:inline">{isVoiceListening ? "Стоп голос" : "Голос"}</span>
				</button>

				<button
					type="button"
					onClick={onSaveToEmrOnly}
					data-testid="save-ceph-to-emr-btn"
					className="secondary-button shrink-0"
					title="Зафиксировать исследование и координаты в ЭМК пациента"
				>
					<Save size={14} />
					<span className="hidden xl:inline whitespace-nowrap">Сохранить в ЭМК</span>
					<span className="xl:hidden whitespace-nowrap">В ЭМК</span>
				</button>

				<button
					type="button"
					onClick={onInsertToChart}
					data-testid="btn-insert-ceph-protocol"
					className="primary-button shrink-0"
					title="Перенести расчеты цефалометрии в дневник приёма"
				>
					<FileText size={14} />
					<span className="whitespace-nowrap">В медицинскую карту</span>
				</button>

				<button
					type="button"
					onClick={onOpenPopoutStudio}
					data-testid="btn-ceph-popout-window"
					className="secondary-button !border-teal-500/60 !bg-teal-950/60 hover:!bg-teal-900/80 !text-teal-300 font-bold shrink-0 flex items-center gap-1.5"
					title="Открыть полноэкранную студию цефалометрии на втором мониторе для демонстрации пациенту"
				>
					<ExternalLink size={14} />
					<span className="whitespace-nowrap">2-й монитор / Студия</span>
				</button>

				<button
					type="button"
					onClick={onSaveConsultationWithoutCeph}
					data-testid="save-consultation-without-ceph-btn"
					className="secondary-button shrink-0"
					title="Сохранить консультацию ортодонта в карту без полного расчерчивания ТРГ"
				>
					<Save size={14} />
					<span className="hidden xl:inline whitespace-nowrap">Консультация без ТРГ</span>
					<span className="xl:hidden whitespace-nowrap">Без ТРГ</span>
				</button>

				<button
					type="button"
					onClick={onClose}
					data-testid="ceph-modal-close-btn"
					aria-label="Закрыть окно цефалометрического анализа"
					className="secondary-button !w-8 !h-8 !p-0 shrink-0"
				>
					<X size={16} />
				</button>
			</div>
		</header>
	);
};
