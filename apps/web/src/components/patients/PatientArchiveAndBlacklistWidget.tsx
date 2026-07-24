import React, { useEffect, useState } from "react";
import { ShieldAlert, Archive, AlertTriangle, CheckCircle2 } from "lucide-react";
import { useAppLogicContext } from "../../contexts/AppLogicContext";
import { showToast } from "../GlobalToast";

export interface ArchiveReasonItem {
	id: string;
	organizationId: string;
	reasonName: string;
	isBookingBlocked: boolean;
	allowRebooking: boolean;
	notes?: string | null;
	createdAt: string;
}

export const PatientArchiveAndBlacklistWidget: React.FC<{ patientId: string }> = ({ patientId }) => {
	const { auth } = useAppLogicContext();
	const [reasons, setReasons] = useState<ArchiveReasonItem[]>([]);
	const [loading, setLoading] = useState<boolean>(true);
	const [selectedReason, setSelectedReason] = useState<string>("");
	const [isBlacklisted, setIsBlacklisted] = useState<boolean>(false);
	const [confirmModalOpen, setConfirmModalOpen] = useState<boolean>(false);

	useEffect(() => {
		if (!patientId) return;
		fetch(`/api/patients/${patientId}/archive-status`, {
			headers: auth ? auth.denteClinicalReadHeaders() : { "x-organization-id": "00000000-0000-0000-0000-000000000001" },
		})
			.then((res) => res.json())
			.then((data) => {
				const list = Array.isArray(data) ? data : [];
				setReasons(list);
				if (list.length > 0) {
				    setIsBlacklisted(list[0].isBookingBlocked);
				} else {
				    setIsBlacklisted(false);
				}
				setLoading(false);
			})
			.catch((err) => {
				console.error("[PatientArchiveAndBlacklistWidget fetch error]:", err);
				setLoading(false);
			});
	}, [patientId, auth]);

	const handleApplyStatus = () => {
	    const newStatus = !isBlacklisted;
		fetch(`/api/patients/${patientId}/archive-status`, {
		    method: 'POST',
			headers: auth ? {
			    ...auth.denteClinicalMutationHeaders(),
			    "Content-Type": "application/json"
			} : { 
			    "x-organization-id": "00000000-0000-0000-0000-000000000001",
			    "Content-Type": "application/json"
			},
			body: JSON.stringify({ isBlacklisted: newStatus })
		})
		.then(res => res.json())
		.then(data => {
		    if (data.success || data.isBlacklisted !== undefined) {
		        setIsBlacklisted(newStatus);
        		setConfirmModalOpen(false);
        		showToast(
        			newStatus
        				? "Пациент добавлен в черный список. Запись на прием заблокирована."
        				: "Разблокировано. Пациент восстановлен из черного списка.",
        			newStatus ? "warning" : "success"
        		);
		    }
		});
	};

	return (
		<div
			data-testid="patient-archive-blacklist-widget"
			className={`p-4 rounded-xl border my-4 shadow-sm transition-all duration-200 text-slate-900 dark:text-slate-100 ${
				isBlacklisted
					? "bg-rose-50 dark:bg-rose-950/60 border-rose-300 dark:border-rose-800"
					: "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800"
			}`}
		>
			<div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-200 dark:border-slate-800">
				<div className="flex items-center space-x-2">
					<ShieldAlert className={`w-5 h-5 ${isBlacklisted ? "text-rose-600 dark:text-rose-400" : "text-amber-500"}`} />
					<h3 className="font-semibold text-sm">
						Блокировка записи и черный список
					</h3>
				</div>
				<span className="text-xs px-2 py-0.5 rounded border bg-amber-100 text-amber-800 border-amber-300 dark:bg-slate-800 dark:text-amber-300 dark:border-amber-700 font-medium">
					Специфика IDENT #20
				</span>
			</div>

			<div className="space-y-3">
				<p className="text-xs" style={{ color: "var(--muted)" }}>
					Управление блокировкой записи на прием и внесением пациента в черный список.
				</p>
				<div className="flex items-center space-x-2">
					<button
						type="button"
						onClick={() => setConfirmModalOpen(true)}
						title={isBlacklisted ? "Снять блокировку записи" : "Заблокировать запись и добавить в ЧС"}
						className={`px-3 py-1.5 rounded text-xs font-bold transition-colors ${
							isBlacklisted
								? "bg-emerald-600 hover:bg-emerald-700 text-white"
								: "bg-rose-600 hover:bg-rose-700 text-white"
						}`}
					>
						{isBlacklisted ? "Восстановить из черного списка" : "Добавить в черный список"}
					</button>
				</div>
			</div>

			{confirmModalOpen && (
				<div className="mt-3 p-3 rounded-lg border bg-rose-50 border-rose-200 dark:bg-slate-800 dark:border-rose-800 space-y-2">
					<div className="flex items-center space-x-2 text-rose-800 dark:text-rose-300 font-bold text-xs">
						<AlertTriangle className="w-4 h-4" />
						<span>Подтверждение действия</span>
					</div>
					<p className="text-xs text-rose-700 dark:text-rose-300">
						{!isBlacklisted
							? "Вы собираетесь добавить пациента в черный список. Запись на прием будет заблокирована для этого пациента во всех клиниках сети."
							: "Вы уверены, что хотите разблокировать этого пациента?"}
					</p>
					<div className="flex space-x-2 pt-1">
						<button
							type="button"
							onClick={handleApplyStatus}
							title="Подтвердить действие"
							className="px-2.5 py-1 rounded bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition-colors"
						>
							Подтвердить
						</button>
						<button
							type="button"
							onClick={() => setConfirmModalOpen(false)}
							title="Отмена действия"
							className="px-2.5 py-1 rounded bg-slate-200 hover:bg-slate-300 text-slate-800 dark:bg-slate-700 dark:text-slate-200 text-xs transition-colors"
						>
							Отмена
						</button>
					</div>
				</div>
			)}
		</div>
	);
};
