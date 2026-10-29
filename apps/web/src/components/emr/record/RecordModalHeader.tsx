import React from "react";
import { Printer, Check, FileText, X, Maximize2, Minimize2, Sparkles, ZoomIn, ZoomOut, RotateCcw } from "lucide-react";
import type { MedicalCardForm043uData } from "../emr043Types";
import type { RecordTabType } from "./recordModalTypes";
import { RecordMoreMenu } from "./RecordMoreMenu";

interface RecordModalHeaderProps {
	formData: MedicalCardForm043uData;
	effectiveIsDraft: boolean;
	ageText: string;
	activeTab: RecordTabType;
	zoomScale: number;
	setZoomScale: React.Dispatch<React.SetStateAction<number>>;
	isFullscreen: boolean;
	setIsFullscreen: React.Dispatch<React.SetStateAction<boolean>>;
	copiedToast: boolean;
	isMoreMenuOpen: boolean;
	setIsMoreMenuOpen: React.Dispatch<React.SetStateAction<boolean>>;
	hasOnSave: boolean;
	onApplyNorm: () => void;
	onSaveForm: () => void;
	onPrint: () => void;
	onExportXml: () => void;
	onExportJson: () => void;
	onCopyText: () => void;
	onClose: () => void;
}

export const RecordModalHeader: React.FC<RecordModalHeaderProps> = React.memo(function RecordModalHeader(props) {
	return (
		<header className="emr043-header-toolbar">
			<div className="emr043-header-title-group">
				<span className="emr043-header-badge hidden sm:inline-flex"><FileText className="w-3.5 h-3.5" />Медицинская карта пациента</span>
				{props.effectiveIsDraft ? (
					<span data-testid="badge-043-draft-status" className="px-2.5 py-0.5 rounded border border-amber-600/40 bg-amber-500/10 text-amber-700 dark:text-amber-300 text-[11px] font-bold tracking-wider uppercase flex items-center gap-1">
						<FileText className="w-3 h-3 text-amber-600" />ЧЕРНОВИК (ПРИЁМ НЕ ЗАКРЫТ)
					</span>
				) : (
					<span data-testid="badge-043-draft-status" className="px-2.5 py-0.5 rounded border border-emerald-600/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 text-[11px] font-bold tracking-wider uppercase flex items-center gap-1">
						<Check className="w-3 h-3 text-emerald-600" />ПОДПИСАНО ВРАЧОМ
					</span>
				)}
				<div className="min-w-0">
					<h2 className="emr043-header-title truncate">Медицинская карта № {props.formData.passport.medicalCardNumber}</h2>
					<div className="truncate" style={{ fontSize: "12px", color: "var(--muted, #64748b)" }}>
						Пациент: <strong>{props.formData.passport.patientFullName}</strong> ({props.ageText}) • Врач: <strong>{props.formData.passport.attendingDoctorFullName}</strong>
					</div>
				</div>
			</div>

			<div className="emr043-header-actions">
				{props.activeTab === "overview" && (
					<div className="emr043-zoom-toolbar" style={{ display: "inline-flex", alignItems: "center", gap: "3px", border: "1px solid var(--glass-border, #cbd5e1)", borderRadius: "6px", padding: "2px 6px", background: "var(--paper, #f8fafc)", height: "32px" }}>
						<button type="button" onClick={() => props.setZoomScale((v) => Math.max(0.5, Number((v - 0.1).toFixed(1))))} disabled={props.zoomScale <= 0.5} title="Уменьшить масштаб" style={{ background: "transparent", border: "none", cursor: props.zoomScale <= 0.5 ? "not-allowed" : "pointer", padding: "2px", opacity: props.zoomScale <= 0.5 ? 0.35 : 1 }}>
							<ZoomOut className="w-3.5 h-3.5" />
						</button>
						<span style={{ fontSize: "11px", fontWeight: 700, minWidth: "36px", textAlign: "center", userSelect: "none" }}>{Math.round(props.zoomScale * 100)}%</span>
						<button type="button" onClick={() => props.setZoomScale((v) => Math.min(1.5, Number((v + 0.1).toFixed(1))))} disabled={props.zoomScale >= 1.5} title="Увеличить масштаб" style={{ background: "transparent", border: "none", cursor: props.zoomScale >= 1.5 ? "not-allowed" : "pointer", padding: "2px", opacity: props.zoomScale >= 1.5 ? 0.35 : 1 }}>
							<ZoomIn className="w-3.5 h-3.5" />
						</button>
						{props.zoomScale !== 1.0 && (
							<button type="button" onClick={() => props.setZoomScale(1.0)} title="Сбросить масштаб" style={{ background: "transparent", border: "none", cursor: "pointer", padding: "2px", color: "var(--muted, #64748b)" }}>
								<RotateCcw className="w-3 h-3" />
							</button>
						)}
					</div>
				)}

				<button type="button" className="emr043-btn emr043-btn-secondary" onClick={props.onApplyNorm} disabled={false} data-testid="btn-form043-apply-norm" title="Заполнить физиологической нормой / Интактные зубы (Мандат 8e)">
					<Sparkles className="w-4 h-4 text-emerald-600 shrink-0" /><span>Норма</span>
				</button>

				{props.hasOnSave && (
					<button type="button" className="emr043-btn emr043-btn-secondary" onClick={props.onSaveForm} disabled={false} data-testid="btn-form043-save-card" title="Сохранить карту">
						<Check className="w-4 h-4 text-emerald-600 shrink-0" /><span>Сохранить</span>
					</button>
				)}

				<button type="button" className="emr043-btn emr043-btn-primary" onClick={props.onPrint} disabled={false} data-testid="btn-print-043-card" title="Печать или экспорт в PDF (A4)">
					<Printer className="w-4 h-4 shrink-0" /><span className="hidden sm:inline">Печать / PDF (A4)</span><span className="sm:hidden">Печать / PDF</span>
				</button>

				<RecordMoreMenu
					isOpen={props.isMoreMenuOpen}
					setIsOpen={props.setIsMoreMenuOpen}
					hasOnSave={props.hasOnSave}
					copiedToast={props.copiedToast}
					onApplyNorm={props.onApplyNorm}
					onSaveForm={props.onSaveForm}
					onExportXml={props.onExportXml}
					onExportJson={props.onExportJson}
					onCopyText={props.onCopyText}
				/>

				<button type="button" className="emr043-btn emr043-btn-secondary emr043-btn-icon-only emr043-btn-fullscreen" onClick={() => props.setIsFullscreen((v) => !v)} title={props.isFullscreen ? "Свернуть" : "На весь экран"}>
					{props.isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
				</button>
				<button type="button" className="emr043-btn emr043-btn-secondary emr043-btn-icon-only emr043-btn-close" onClick={props.onClose} title="Закрыть окно">
					<X className="w-5 h-5" />
				</button>
			</div>
		</header>
	);
});
