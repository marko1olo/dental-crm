import {
	AlertTriangle,
	Edit2,
	KeyRound,
	ShieldCheck,
	UserPlus,
} from "lucide-react";
import type React from "react";
import { useState } from "react";
import { showToast } from "../GlobalToast";

interface SettingsStaffTabProps {
	props: Record<string, any>;
}

export function SettingsStaffTab({ props }: SettingsStaffTabProps) {
