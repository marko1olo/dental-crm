import { useEffect, useState } from "react";
import { showToast } from "../../GlobalToast";
import {
	DEMO_CHIEF_DOCTOR,
	resolveStaffUnlockListState,
	resolveStaffUnlockPhase,
	type StaffUnlockMember,
} from "../staffUnlockState";
import { isDemoShowcaseMode } from "../../../lib/demoMode";
import { getDemoShowcaseStaff } from "../../../utils/demoModeEngine";
import type { StaffPinPadProps, StaffUser } from "./staffPinPadTypes";
import { requestStaffUnlock } from "./staffPinPadApi";

export function useStaffPinPad({
	staffMembers,
	staffListLoading,
	onUnlockSuccess,
}: Pick<StaffPinPadProps, "staffMembers" | "staffListLoading" | "onUnlockSuccess">) {
	const [selectedUser, setSelectedUser] = useState<StaffUser | null>(null);
	const [pin, setPin] = useState("");
	const [errorShake, setErrorShake] = useState(false);
	const [loading, setLoading] = useState(false);
	const [errorText, setErrorText] = useState<string | null>(null);

	const listState = resolveStaffUnlockListState(staffMembers);
	const listPhase = resolveStaffUnlockPhase({ isLoading: staffListLoading, list: listState });
	const activeStaff = listState.phase === "ready" ? listState.activeStaff : [];

	useEffect(() => {
		if (!selectedUser && activeStaff && activeStaff.length === 1) {
			const single = activeStaff[0];
			if (single) setSelectedUser(single as StaffUser);
		} else if (!selectedUser && (listPhase === "failed" || listPhase === "empty" || listPhase === "loading" || isDemoShowcaseMode())) {
			const fallback = ((getDemoShowcaseStaff() as unknown as StaffUnlockMember[])[0] || DEMO_CHIEF_DOCTOR) as StaffUser;
			setSelectedUser(fallback);
		}
	}, [activeStaff, selectedUser, listPhase]);

	const failUnlock = (message: string) => {
		showToast(message, "error");
		setErrorText(message);
		setErrorShake(true);
		setPin("");
		setTimeout(() => setErrorShake(false), 500);
	};

	const submitPin = async (completedPin: string, userToUnlock = selectedUser) => {
		if (!userToUnlock) return;
		setLoading(true);
		setErrorShake(false);
		setErrorText(null);
		const result = await requestStaffUnlock(completedPin, userToUnlock);
		setLoading(false);
		if (result.success && result.user) {
			showToast("Смена успешно открыта", "success");
			onUnlockSuccess(result.user);
		} else {
			failUnlock(result.error || "Неверный PIN-код");
		}
	};

	const handleKeyPress = (num: string) => {
		if (loading || pin.length >= 4) return;
		if (errorText) setErrorText(null);
		let targetUser = selectedUser;
		if (!targetUser) {
			if (activeStaff && activeStaff.length === 1) {
				targetUser = activeStaff[0];
				setSelectedUser(targetUser as StaffUser);
			} else if (listPhase === "failed" || listPhase === "empty" || listPhase === "loading" || isDemoShowcaseMode()) {
				targetUser = (((getDemoShowcaseStaff() as unknown as StaffUnlockMember[])[0] || DEMO_CHIEF_DOCTOR) as StaffUser);
				setSelectedUser(targetUser);
			} else {
				showToast("Сначала выберите сотрудника из списка", "info");
				setErrorText("Сначала выберите сотрудника из списка слева");
				setErrorShake(true);
				setTimeout(() => setErrorShake(false), 500);
				return;
			}
		}
		const newPin = pin + num;
		setPin(newPin);
		if (newPin.length === 4) submitPin(newPin, targetUser);
	};

	const handleBackspace = () => {
		if (loading) return;
		if (!selectedUser && (!activeStaff || activeStaff.length !== 1) && listPhase === "ready") {
			showToast("Сначала выберите сотрудника из списка", "info");
			return;
		}
		if (pin.length === 0) return;
		setPin(pin.slice(0, -1));
	};

	const handleReset = () => {
		setSelectedUser(null);
		setPin("");
		setErrorText(null);
	};

	return {
		selectedUser, setSelectedUser, pin, setPin, errorShake, loading, errorText, setErrorText,
		listPhase, activeStaff, handleKeyPress, handleBackspace, handleReset, submitPin,
	};
}
