import { logger } from "../../utils/logger";
import { showToast } from "../GlobalToast";
import type { OrthoData } from "./orthodonticProgressSerialization";

interface QuickClinicalProps {
	patientId: string;
	ortho: OrthoData | null;
	saving: boolean;
	setSaving: (v: boolean) => void;
	loadDashboard: () => Promise<void>;
	auth: any;
}

export function useOrthodonticQuickClinicalActions({
	patientId,
	ortho,
	saving,
	setSaving,
	loadDashboard,
	auth,
}: QuickClinicalProps) {
	const handleQuickIssueSet = async (count: number, days: number) => {
		if (!ortho || saving) return;
		const fromAligner = ortho.currentAligner;
		const nextCurrent = Math.min(ortho.totalAligners, fromAligner + count);

		setSaving(true);
		try {
			const res = await fetch(`/api/orthodontics/${patientId}/aligners/issue-set`, {
				method: "POST",
				headers: auth.denteClinicalMutationHeaders({ "Content-Type": "application/json" }),
				body: JSON.stringify({
					alignerCount: count,
					wearDaysPerAligner: days,
					totalAligners: ortho.totalAligners,
					note: `Плановая выдача сета капп (+${count})`,
				}),
			});
			if (res.ok) {
				showToast(`Выдан сет капп №${fromAligner}–${nextCurrent} на ${days} дней`, "success");
				await loadDashboard();
			} else {
				showToast("Не удалось сохранить выдачу сета", "error");
			}
		} catch (err) {
			logger.error("[OrthodonticProgressWidget quickIssueSet]", err);
			showToast("Ошибка сети при выдаче сета", "error");
		} finally {
			setSaving(false);
		}
	};

	const handleQuickWireChange = async () => {
		if (saving) return;
		setSaving(true);
		try {
			const res = await fetch(`/api/orthodontics/${patientId}/archwire-change`, {
				method: "POST",
				headers: auth.denteClinicalMutationHeaders({ "Content-Type": "application/json" }),
				body: JSON.stringify({ material: "CuNiTi", section: ".016", arch: "both", note: "Плановая смена дуги (ВЧ + НЧ)" }),
			});
			if (res.ok) {
				showToast("Смена дуги: CuNiTi .016\" (ВЧ+НЧ) зафиксирована в карте", "success");
				await loadDashboard();
			} else {
				showToast("Не удалось зафиксировать смену дуги", "error");
			}
		} catch (err) {
			logger.error("[OrthodonticProgressWidget quickWireChange]", err);
			showToast("Ошибка сети при смене дуги", "error");
		} finally {
			setSaving(false);
		}
	};

	const handleQuickLigatureActivate = async () => {
		if (saving) return;
		setSaving(true);
		try {
			const res = await fetch(`/api/orthodontics/${patientId}/ligatures-activate`, {
				method: "POST",
				headers: auth.denteClinicalMutationHeaders({ "Content-Type": "application/json" }),
				body: JSON.stringify({ powerChain: true, note: "Активация лигатур и эластической цепочки (Power Chain)" }),
			});
			if (res.ok) {
				showToast("Активация лигатур и замков аппаратуры зафиксирована", "success");
				await loadDashboard();
			} else {
				showToast("Не удалось зафиксировать активацию аппаратуры", "error");
			}
		} catch (err) {
			logger.error("[OrthodonticProgressWidget quickLigatureActivate]", err);
			showToast("Ошибка сети при активации аппаратуры", "error");
		} finally {
			setSaving(false);
		}
	};

	return { handleQuickIssueSet, handleQuickWireChange, handleQuickLigatureActivate };
}
