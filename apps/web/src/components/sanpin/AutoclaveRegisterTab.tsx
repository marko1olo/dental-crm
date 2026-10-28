import React from "react";
import { AutoclaveJournalTab, type AutoclaveJournalTabProps } from "./AutoclaveJournalTab";

export function AutoclaveRegisterTab(props: AutoclaveJournalTabProps) {
	return <AutoclaveJournalTab {...props} />;
}

export { AutoclaveRegisterTab as SanpinAutoclaveRegisterTab };
export default AutoclaveRegisterTab;
