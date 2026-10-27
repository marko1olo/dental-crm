import { Activity, Camera, Radio, Scan, SplitSquareHorizontal } from "lucide-react";
import React from "react";
import { usePatientStore } from "../../../../store/patientStore";

export interface PatientScansToolbarProps {
	patientId: string;
	totalStudies: number;
	appLogic?: any;
	setIsCbctModalOpen: (v: boolean) => void;
	setIsPhotoProtocolOpen: (v: boolean) => void;
	setIsDicomModalOpen: (v: boolean) => void;
	onOpenDirectRvg?: () => void;
	onOpenConsultationSplit?: () => void;
}

export const PatientScansToolbar: React.FC<PatientScansToolbarProps> = ({
	patientId,
	totalStudies,
	appLogic,
	setIsCbctModalOpen,
	setIsPhotoProtocolOpen,
	setIsDicomModalOpen,
	onOpenDirectRvg,
	onOpenConsultationSplit,
}) => {
	const handleOpenImaging = () => {
		if (patientId) {
			appLogic?.setSelectedPatientId?.(patientId);
			usePatientStore.getState().setSelectedPatientId(patientId);
		}
		window.location.hash = "imaging";
	};

	return (
		<div className="flex items-center justify-between gap-2 flex-wrap">
			<div>
				<h4 className="text-xs font-bold uppercase tracking-wider text-[var(--muted)] m-0">
					Рентгенологические снимки и КТ-исследования ({totalStudies})
				</h4>
				<p className="text-[11px] text-[var(--muted)] m-0 mt-0.5">
					Мгновенный просмотр 200×200px без задержки и сдвига макета (CLS = 0)
				</p>
			</div>
			<div className="flex items-center gap-2 flex-wrap">
				<button
					type="button"
					onClick={handleOpenImaging}
					className="secondary-button min-h-[32px] h-8 px-2.5 text-xs font-semibold rounded-lg inline-flex items-center gap-1.5 cursor-pointer"
					title="Перейти в полный рентген-кокпит"
					data-testid="btn-patient-open-imaging-view"
				>
					<Scan size={14} className="text-[var(--teal)]" />
					<span>Рентген-кокпит</span>
				</button>
				<button
					type="button"
					onClick={() => setIsCbctModalOpen(true)}
					className="secondary-button min-h-[32px] h-8 px-2.5 text-xs font-semibold rounded-lg inline-flex items-center gap-1.5 cursor-pointer"
					title="Открыть 3D КЛКТ MPR студию"
					data-testid="btn-patient-open-cbct-studio"
				>
					<Activity size={14} className="text-cyan-500" />
					<span>3D КЛКТ Студия</span>
				</button>
				<button
					type="button"
					onClick={() => (onOpenDirectRvg ? onOpenDirectRvg() : setIsDicomModalOpen(true))}
					className="secondary-button min-h-[32px] h-8 px-2.5 text-xs font-semibold rounded-lg inline-flex items-center gap-1.5 cursor-pointer text-emerald-600 dark:text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/10"
					title="Прямой захват снимка с визиографа (RVG / СЕНСОР)"
					data-testid="btn-patient-direct-rvg-capture"
				>
					<Radio size={14} className="text-emerald-500" />
					<span>Снимок с датчика (RVG)</span>
				</button>
				<button
					type="button"
					onClick={() => (onOpenConsultationSplit ? onOpenConsultationSplit() : setIsDicomModalOpen(true))}
					className="secondary-button min-h-[32px] h-8 px-2.5 text-xs font-semibold rounded-lg inline-flex items-center gap-1.5 cursor-pointer"
					title="Консультация сплит «До / После»"
					data-testid="btn-patient-consultation-split"
				>
					<SplitSquareHorizontal size={14} className="text-violet-500" />
					<span>Сплит «До / После»</span>
				</button>
				<button
					type="button"
					onClick={() => setIsPhotoProtocolOpen(true)}
					className="secondary-button min-h-[32px] h-8 px-2.5 text-xs font-semibold rounded-lg inline-flex items-center gap-1.5 cursor-pointer"
					title="Клинический фотопротокол (12/8/6/3 слота) и сравнение До/После со шкалой VITA"
					data-testid="btn-patient-open-photo-protocol"
				>
					<Camera size={14} className="text-emerald-500" />
					<span>Фотопротокол & До/После</span>
				</button>
			</div>
		</div>
	);
};
