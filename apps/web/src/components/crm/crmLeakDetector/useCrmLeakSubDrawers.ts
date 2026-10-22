import { useEffect, useRef, useState } from "react";
import type { CrmDeclineReason, CrmLeakLeadItem } from "@dental/shared";
import { useOptionalAppLogicContext } from "../../../contexts/AppLogicContext";
import { cancelLeakLead, processLeakLead } from "../../../lib/crmLeakDetectorApi";
import { showToast } from "../../GlobalToast";

export function useCrmLeakSubDrawers(reloadLeads: () => Promise<void>) {
	const appLogic = useOptionalAppLogicContext();
	const auth = appLogic?.auth;

	const [internalScriptLead, setInternalScriptLead] = useState<CrmLeakLeadItem | null>(null);
	const [internalCopied, setInternalCopied] = useState(false);
	const copyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

	const [internalContactLead, setInternalContactLead] = useState<CrmLeakLeadItem | null>(null);
	const [internalContactChannel, setInternalContactChannel] = useState<
		"call" | "whatsapp" | "telegram" | "sms"
	>("call");
	const [internalContactNotes, setInternalContactNotes] = useState<string>("");

	const [internalDeclineLead, setInternalDeclineLead] = useState<CrmLeakLeadItem | null>(null);
	const [internalDeclineReason, setInternalDeclineReason] = useState<CrmDeclineReason>("too_expensive");
	const [internalDeclineComment, setInternalDeclineComment] = useState<string>("");
	const [internalSelectedLead, setInternalSelectedLead] = useState<CrmLeakLeadItem | null>(null);

	useEffect(() => {
		return () => {
			if (copyTimerRef.current) {
				clearTimeout(copyTimerRef.current);
				copyTimerRef.current = null;
			}
		};
	}, []);

	const handleCopyScript = (text: string) => {
		navigator.clipboard.writeText(text);
		setInternalCopied(true);
		showToast("Скрипт скопирован в буфер", "success");
		if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
		copyTimerRef.current = setTimeout(() => {
			setInternalCopied(false);
			copyTimerRef.current = null;
		}, 2000);
	};

	const handleSaveContact = async () => {
		if (!internalContactLead || !internalContactNotes.trim()) {
			showToast("Заполните заметку о результате контакта", "warning");
			return;
		}
		if (!auth?.denteClinicalMutationHeaders) return;
		try {
			const headers = auth.denteClinicalMutationHeaders();
			await processLeakLead(
				internalContactLead.id,
				{
					channel: internalContactChannel,
					notes: internalContactNotes.trim(),
					targetStatus: "contacted",
				},
				headers,
			);
			showToast("Контакт зафиксирован, статус обновлен", "success");
			setInternalContactLead(null);
			setInternalContactNotes("");
			await reloadLeads();
		} catch (err: any) {
			showToast(`Ошибка: ${err.message}`, "error");
		}
	};

	const handleSaveDecline = async () => {
		if (!internalDeclineLead) return;
		if (!auth?.denteClinicalMutationHeaders) return;
		try {
			const headers = auth.denteClinicalMutationHeaders();
			await cancelLeakLead(
				internalDeclineLead.id,
				{
					declineReason: internalDeclineReason,
					declineComment: internalDeclineComment.trim() || undefined,
				},
				headers,
			);
			showToast("Отказ зафиксирован, лид отправлен в архив", "info");
			setInternalDeclineLead(null);
			setInternalDeclineComment("");
			await reloadLeads();
		} catch (err: any) {
			showToast(`Ошибка: ${err.message}`, "error");
		}
	};

	return {
		internalScriptLead,
		setInternalScriptLead,
		internalCopied,
		handleCopyScript,
		internalContactLead,
		setInternalContactLead,
		internalContactChannel,
		setInternalContactChannel,
		internalContactNotes,
		setInternalContactNotes,
		handleSaveContact,
		internalDeclineLead,
		setInternalDeclineLead,
		internalDeclineReason,
		setInternalDeclineReason,
		internalDeclineComment,
		setInternalDeclineComment,
		handleSaveDecline,
		internalSelectedLead,
		setInternalSelectedLead,
	};
}
