import React from "react";
import { AlertTriangle, CheckCircle2, Printer, FileText } from "lucide-react";
import type { ClinicalConsentConfig } from "./visitConsentTypes";

export interface Consent1ClickBatchBannerProps {
	readonly unsignedRequiredItems: readonly ClinicalConsentConfig[];
	readonly onPrintTodayPackage: () => void;
	readonly onMarkAllRequiredTodaySigned: () => void;
	readonly onOpenInformedConsentModal?: (() => void) | undefined;
}

function formatConsentsCount(count: number): string {
	const mod10 = count % 10;
	const mod100 = count % 100;
	if (mod100 >= 11 && mod100 <= 19) return `${count} согласий`;
	if (mod10 === 1) return `${count} согласие`;
	if (mod10 >= 2 && mod10 <= 4) return `${count} согласия`;
	return `${count} согласий`;
}

export function Consent1ClickBatchBanner({
	unsignedRequiredItems,
	onPrintTodayPackage,
	onMarkAllRequiredTodaySigned,
	onOpenInformedConsentModal,
}: Consent1ClickBatchBannerProps) {
	if (unsignedRequiredItems.length > 0) {
		return (
			<div className="vct-package-banner required">
				<div className="vct-package-info">
					<div className="vct-package-icon-box required">
						<AlertTriangle size={18} />
					</div>
					<div>
						<div className="vct-package-title">
							Требуется оформить {formatConsentsCount(unsignedRequiredItems.length)} для сегодняшнего приёма
						</div>
						<div className="vct-package-desc">
							Клинические манипуляции по плану приёма:{" "}
							<strong>{unsignedRequiredItems.map((i) => i.title).join(", ")}</strong>. Пациент должен подтвердить согласие до начала манипуляций.
						</div>
					</div>
				</div>
				<div className="vct-package-actions">
					<button
						type="button"
						onClick={onPrintTodayPackage}
						className="vct-btn vct-btn-primary"
						title="Сформировать и отправить на печать единый комплекс документов на сегодня"
					>
						<Printer size={14} />
						<span>Печать пакета на сегодня ({unsignedRequiredItems.length})</span>
					</button>
					<button
						type="button"
						onClick={onMarkAllRequiredTodaySigned}
						className="vct-btn vct-btn-success"
						title="Отметить: пациент лично подписал бумажный пакет у кресла или на стойке"
					>
						<CheckCircle2 size={14} />
						<span>Отметить пакет: Подписано на бумаге</span>
					</button>
					<button
						type="button"
						onClick={onOpenInformedConsentModal}
						className="vct-btn vct-btn-secondary"
						title="Открыть каталог согласий на лечение (печать бланков или подпись на экране при наличии планшета)"
					>
						<FileText size={14} />
						<span>Бланки / Экран</span>
					</button>
				</div>
			</div>
		);
	}

	return (
		<div className="vct-package-banner all-signed">
			<div className="vct-package-info">
				<div className="vct-package-icon-box all-signed">
					<CheckCircle2 size={18} />
				</div>
				<div>
					<div className="vct-package-title">
						Все необходимые согласия на сегодня оформлены и активны
					</div>
					<div className="vct-package-desc">
						Юридический щит врача активен. Вмешательства текущего визита обеспечены подписанной документацией (бумага / электронный архив).
					</div>
				</div>
			</div>
			<div className="vct-package-actions">
				<button
					type="button"
					onClick={onPrintTodayPackage}
					className="vct-btn vct-btn-secondary"
					title="Распечатать повторную копию комплекта согласий"
				>
					<Printer size={14} />
					<span>Повторная печать комплекта</span>
				</button>
			</div>
		</div>
	);
}
