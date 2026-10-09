import { Activity, ExternalLink, Image as ImageIcon, Receipt, Scan } from "lucide-react";
import React from "react";
import { addCbctToFinanceAndPlan } from "../radiology/ctImplantIntegrationBridge";
import { routeOpenCbctPopout } from "../../utils/runtimeRouter";
import { showToast } from "../GlobalToast";

export interface DiagnosticsCbctSectionProps {
	isVisible: boolean;
	visitPatientId: string | null;
	visitPatientName: string | null;
	activePatientId?: string;
	activePatientFullName?: string;
	initialToothNumber: number;
	doctorName?: string;
	cbctMenuRef: React.RefObject<HTMLDivElement | null>;
	onOpenRadiologyReferral: () => void;
	onOpenDicomViewer: () => void;
	onOpenCtSelector: () => void;
}

export function DiagnosticsCbctSection({
	isVisible,
	visitPatientId,
	visitPatientName,
	activePatientId,
	activePatientFullName,
	initialToothNumber,
	doctorName,
	cbctMenuRef,
	onOpenRadiologyReferral,
	onOpenDicomViewer,
	onOpenCtSelector,
}: DiagnosticsCbctSectionProps) {
	return (
		<div className={isVisible ? "flex flex-col gap-3" : "hidden"}>
			<div
				data-testid="visit-cbct-optg-card"
				className="p-3.5 sm:p-4 rounded-xl bg-[var(--paper-soft)] border border-[var(--line-subtle)] hover:border-[var(--teal)]/40 flex flex-col gap-3 shadow-2xs transition-all relative"
			>
				<div className="flex items-start justify-between gap-3 flex-wrap">
					<div className="flex items-start gap-3">
						<div className="w-10 h-10 rounded-xl bg-[var(--paper)] border border-[var(--line-subtle)] text-[var(--teal)] flex items-center justify-center shrink-0 shadow-2xs">
							<Activity size={20} />
						</div>
						<div className="min-w-0 flex-1">
							<div className="flex items-center gap-2 flex-wrap">
								<strong className="text-xs sm:text-sm font-bold text-[var(--ink)]">
									3D КЛКТ / ОПТГ панорама
								</strong>
							</div>
							<p className="text-xs text-[var(--muted)] m-0 mt-0.5 leading-snug">
								MPR-срезы, денситометрия Hounsfield, имплантологическая линейка, панорамная реконструкция ОПТГ и направления
							</p>
						</div>
					</div>

					<div className="flex items-center gap-1.5 shrink-0">
						<button
							type="button"
							onClick={onOpenRadiologyReferral}
							className="diag-btn"
							title="Выписать направление на КЛКТ / ОПТГ / ТРГ"
						>
							<Scan size={14} className="text-[var(--teal)]" />
							<span>Направление на снимок</span>
						</button>
					</div>
				</div>

				<div className="p-3 rounded-lg bg-[var(--paper)] border border-[var(--line-subtle)] flex flex-col sm:flex-row items-center justify-between gap-2.5">
					<div className="text-xs text-[var(--ink)]">
						<span className="font-semibold block sm:inline">3D КЛКТ и MPR-просмотр:</span>
						<span className="text-[var(--muted)] ml-0 sm:ml-1">
							Полноэкранный мультипланарный анализ (аксиальный, сагиттальный, корональный срезы).
						</span>
					</div>

					<div className="flex items-center gap-2 w-full sm:w-auto justify-end flex-wrap" ref={cbctMenuRef}>
						<button
							type="button"
							onClick={() => {
								addCbctToFinanceAndPlan({
									patientId: visitPatientId ?? activePatientId,
									toothFdi: initialToothNumber || 16,
									doctorName,
								});
							}}
							data-testid="btn-add-cbct-service-to-visit"
							className="diag-btn-teal-soft"
							title="Добавить услугу КЛКТ (3 800 ₽) в смету приёма"
						>
							<Receipt size={13} />
							<span>+ КЛКТ в смету (3 800 ₽)</span>
						</button>

						<button
							type="button"
							onClick={onOpenDicomViewer}
							className="diag-btn"
							title="Просмотр DICOM / КТ-серии"
						>
							<ImageIcon size={13} className="text-[var(--teal)]" />
							<span>Просмотр DICOM</span>
						</button>

						<button
							type="button"
							onClick={onOpenCtSelector}
							data-testid="btn-open-ct-selector"
							className="diag-btn"
							title="Клинический КТ-селектор: забор из Загрузок, 2-й монитор, запуск Picasso/Ez3D"
						>
							<Scan size={13} className="text-[var(--teal)]" />
							<span>КТ-селектор</span>
						</button>

						<button
							type="button"
							onClick={onOpenCtSelector}
							data-testid="btn-open-cbct-studio-modal"
							id="open-visit-cbct-studio-btn"
							className="diag-btn-teal"
							title="3D КЛКТ (MPR-срезы и имплантация)"
						>
							<Activity size={14} />
							<span>Открыть 3D КЛКТ</span>
						</button>

						<button
							type="button"
							onClick={async () => {
								const res = await routeOpenCbctPopout({
									patientId: visitPatientId ?? activePatientId,
									patientName: visitPatientName ?? activePatientFullName,
									mode: "mpr",
								});
								if (!res.success && res.error === "popup_blocked") {
									showToast("Разрешите всплывающие окна для вывода КТ на второй монитор", "warning");
								}
							}}
							data-testid="btn-open-cbct-popout-window"
							id="open-visit-cbct-popout-btn"
							className="diag-btn"
							title="Вынести 3D КЛКТ в отдельное окно (второй монитор)"
							aria-label="В отдельное окно"
						>
							<ExternalLink size={13} className="text-cyan-500" />
							<span>В окно</span>
						</button>
					</div>
				</div>
			</div>
		</div>
	);
}
