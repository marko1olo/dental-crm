/**
 * StandaloneDeepLinkMissingState — честный тупик-гид deep-link лаунчера.
 *
 * Deep-link без patientId (или когда данные в базе не найдены) не имеет права
 * показывать вымышленного пациента. Вместо этого — понятное состояние с одним
 * Primary CTA, ведущим в живой контур приложения (Мандаты 8e / 8am).
 */

import { AlertCircle } from "lucide-react";
import type React from "react";

export interface StandaloneDeepLinkMissingStateProps {
	readonly title: string;
	readonly message: string;
	readonly testId: string;
	readonly onClose: () => void;
}

function cleanupUrlAndGoHome(onClose: () => void) {
	onClose();
	const u = new URL(window.location.href);
	u.search = "";
	window.location.href = `${u.pathname}#/`;
}

export const StandaloneDeepLinkMissingState: React.FC<
	StandaloneDeepLinkMissingStateProps
> = ({ title, message, testId, onClose }) => {
	return (
		<div
			className="fixed inset-0 z-[10060] flex items-center justify-center bg-black/60 p-4"
			data-testid={testId}
			role="dialog"
			aria-modal="true"
			aria-label={title}
		>
			<div className="max-w-lg w-full p-6 bg-[var(--paper-strong)] border border-[var(--line)] rounded-2xl shadow-2xl flex flex-col items-center text-center">
				<div className="w-16 h-16 rounded-full bg-[var(--paper-soft)] flex items-center justify-center mb-4 text-[var(--muted)]">
					<AlertCircle size={32} />
				</div>
				<h3 className="text-xl font-bold text-[var(--ink)] mb-2">{title}</h3>
				<p className="text-sm text-[var(--muted)] mb-6 leading-relaxed">{message}</p>
				<button
					type="button"
					onClick={() => cleanupUrlAndGoHome(onClose)}
					className="w-full min-h-[44px] h-11 py-2.5 px-4 rounded-xl bg-[var(--primary)] text-white font-medium hover:bg-[var(--primary-strong)] transition-colors cursor-pointer"
					data-testid={`${testId}-open-app-btn`}
				>
					Открыть приложение
				</button>
			</div>
		</div>
	);
};

export default StandaloneDeepLinkMissingState;
