import { ShieldCheck } from "lucide-react";

export interface CryptoProLockedBannerProps {
	lockedAt: string | null;
}

export function CryptoProLockedBanner({ lockedAt }: CryptoProLockedBannerProps) {
	const signedAtText = lockedAt
		? new Date(lockedAt).toLocaleString("ru-RU")
		: null;

	return (
		<div className="flex items-center gap-2 px-3 py-2 bg-[var(--ok-bg)] border border-[var(--ok-fg)]/20 rounded-xl">
			<ShieldCheck className="w-4 h-4 text-[var(--ok-fg)]" />
			<div>
				<div className="text-xs font-medium text-[var(--ok-fg)]">
					Подписано и защищено от правок
				</div>
				<div className="text-xs text-[var(--ok-fg)]/80">
					{signedAtText ?? "время подписания уточняется"}
				</div>
			</div>
		</div>
	);
}
