import React from "react";
import { SickLeaveRegistrySection } from "./SickLeaveRegistrySection";
import type { Form036uEntry } from "../sickLeaveElnEngine";

export interface ElnJournal036SectionProps {
	form036u: Form036uEntry;
}

export function ElnJournal036Section({ form036u }: ElnJournal036SectionProps) {
	return <SickLeaveRegistrySection entry={form036u} />;
}
