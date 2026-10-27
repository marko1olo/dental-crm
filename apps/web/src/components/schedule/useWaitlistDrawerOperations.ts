/**
 * useWaitlistDrawerOperations.ts — Composed facade hook for waitlist drawer operations.
 */

import { useEffect } from "react";
import {
	useWaitlistData,
	useWaitlistSlotMatching,
	useWaitlistContactActions,
	useWaitlistQuickAdd,
	useWaitlistBooking,
	type UseWaitlistDrawerOperationsProps,
} from "./waitlistModules";

export {
	waitlistWriteHeaders,
	writeFailureText,
	WAITLIST_SUBJECT,
	type UseWaitlistDrawerOperationsProps,
} from "./waitlistModules";

export function useWaitlistDrawerOperations({
	isOpen,
	targetSlot,
	onBookSlot,
	updateNewAppointmentDraft,
	focusNewAppointmentEditor,
	onAppointmentCreated,
	onClose,
	dashboard,
	auth,
}: UseWaitlistDrawerOperationsProps) {
	const clinicName = dashboard?.clinicSettings?.name || "DENTE";

	const {
		items,
		isLoading,
		loadFailureStatus,
		loadingId: dataLoadingId,
		fetchWaitlist,
		handleFulfill,
		handleDelete,
	} = useWaitlistData(isOpen, auth);

	const { serverMatchesMap, fallbackFreeSlots } = useWaitlistSlotMatching(
		isOpen,
		targetSlot,
		dashboard,
		auth,
	);

	const {
		contactedPatients,
		handleSendWhatsApp,
		handleSendTelegram,
		handleCopySms,
	} = useWaitlistContactActions(targetSlot, clinicName);

	const quickAdd = useWaitlistQuickAdd(targetSlot?.doctorUserId || "", fetchWaitlist);
	const { setPreferredDoctorId } = quickAdd;

	useEffect(() => {
		if (targetSlot?.doctorUserId) {
			setPreferredDoctorId(targetSlot.doctorUserId);
		}
	}, [targetSlot?.doctorUserId, setPreferredDoctorId]);

	const { bookedItemIds, bookingId, handleOneClickBookSlot } = useWaitlistBooking({
		targetSlot,
		onBookSlot,
		updateNewAppointmentDraft,
		focusNewAppointmentEditor,
		onAppointmentCreated,
		onClose,
		dashboard,
		auth,
		onRefreshWaitlist: fetchWaitlist,
		clinicName,
	});

	const loadingId = dataLoadingId || bookingId;

	return {
		items,
		isLoading,
		loadFailureStatus,
		loadingId,
		contactedPatients,
		bookedItemIds,
		...quickAdd,
		fetchWaitlist,
		handleSendWhatsApp,
		handleSendTelegram,
		handleCopySms,
		handleOneClickBookSlot,
		handleFulfill,
		handleDelete,
		fallbackFreeSlots,
		serverMatchesMap,
	};
}
