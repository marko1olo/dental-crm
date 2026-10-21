import { Clock, ShieldAlert } from "lucide-react";
import type React from "react";

export interface MdlpDisposalAlertsProps {
	readonly expiredCount: number;
	readonly expiringSoonCount: number;
}

export const MdlpDisposalAlerts: React.FC<MdlpDisposalAlertsProps> = ({
	expiredCount,
	expiringSoonCount,
}) => {
	return (
		<>
			{expiredCount > 0 && (
				<div className="mdlp-warning-banner mdlp-warning-red">
					<ShieldAlert size={18} className="shrink-0 text-bad-fg" />
					<div>
						<strong>Внимание! В очереди {expiredCount} просроченных препаратов:</strong>
						<div className="mt-0.5">
							Применение просроченных анестетиков для лечения запрещено. Они подлежат отдельной утилизации.
						</div>
					</div>
				</div>
			)}

			{expiringSoonCount > 0 && expiredCount === 0 && (
				<div className="mdlp-warning-banner mdlp-warning-amber">
					<Clock size={18} className="shrink-0 text-amber-700" />
					<div>
						<strong>Партии с близким сроком годности (≤90 дней): {expiringSoonCount} шт.</strong>
						<div className="mt-0.5">
							Рекомендуется списание в первую очередь по алгоритму FEFO.
						</div>
					</div>
				</div>
			)}
		</>
	);
};
