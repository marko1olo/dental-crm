import { AlertTriangle, Key, RefreshCw } from "lucide-react";
import React, { useState } from "react";

export interface DoctorCalendarSyncTokenRotationProps {
	isRotating: boolean;
	onRotateToken: () => Promise<void>;
}

export function DoctorCalendarSyncTokenRotation({
	isRotating,
	onRotateToken,
}: DoctorCalendarSyncTokenRotationProps) {
	const [showWarning, setShowWarning] = useState(false);

	return (
		<div className="pt-2 border-t border-[var(--line,#e2e8f0)]">
			{!showWarning ? (
				<div className="flex items-center justify-between">
					<div>
						<div className="text-xs font-semibold text-[var(--ink,#0f172a)]">
							Безопасность ссылки
						</div>
						<div className="text-[11px] text-[var(--muted,#64748b)]">
							Если ссылка была скомпрометирована или отправлена не тому лицу
						</div>
					</div>
					<button
						type="button"
						onClick={() => setShowWarning(true)}
						className="min-h-[44px] px-3.5 rounded-xl text-xs font-medium border border-rose-300 dark:border-rose-800 text-rose-700 dark:text-rose-300 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors flex items-center gap-1.5 cursor-pointer shrink-0"
						data-testid="rotate-calendar-token-btn"
					>
						<Key className="w-3.5 h-3.5" />
						<span>Отозвать ссылку</span>
					</button>
				</div>
			) : (
				<div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/30 space-y-2.5 animate-in fade-in duration-100">
					<div className="flex items-start gap-2.5">
						<AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
						<div className="text-xs text-rose-900 dark:text-rose-200 leading-relaxed">
							<span className="font-bold">Внимание:</span> все ранее
							подключенные устройства и календари потеряют доступ к расписанию
							до тех пор, пока вы не вставите в них новую ссылку.
						</div>
					</div>
					<div className="flex justify-end gap-2 flex-wrap">
						<button
							type="button"
							onClick={() => setShowWarning(false)}
							disabled={isRotating}
							className="min-h-[44px] px-4 rounded-xl text-xs font-medium border border-[var(--line,#e2e8f0)] bg-[var(--paper,#ffffff)] text-[var(--ink,#0f172a)] hover:bg-[var(--paper-soft,#f8fafc)] cursor-pointer"
						>
							Отмена
						</button>
						<button
							type="button"
							onClick={async () => {
								await onRotateToken();
								setShowWarning(false);
							}}
							disabled={isRotating}
							className="min-h-[44px] px-4 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white flex items-center gap-1.5 transition-all cursor-pointer shadow-xs active:scale-95"
						>
							{isRotating ? (
								<RefreshCw className="w-3.5 h-3.5 animate-spin" />
							) : (
								<Key className="w-3.5 h-3.5" />
							)}
							<span>Подтвердить отзыв и выпустить новый ключ</span>
						</button>
					</div>
				</div>
			)}
		</div>
	);
}
