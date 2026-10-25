import { useEffect } from "react";
import { showToast } from "../../../GlobalToast";
import { subscribeCephSyncChannel, type CephInsertToProtocolPayload } from "../../cephStudioSyncChannel";
import { fetchOrthoProgress } from "./orthoBackendSync";

export interface UseOrthoSyncEffectsParams {
	isOpen: boolean;
	patientId?: string | undefined;
	setAlignerStep: (v: number) => void;
	setAlignerStepUpper: (v: number) => void;
	setAlignerStepLower: (v: number) => void;
	setAlignerTotal: (v: number) => void;
	setAlignerTotalUpper: (v: number) => void;
	setAlignerTotalLower: (v: number) => void;
	setAlignerDaysPerStep: (v: number) => void;
	setArchwireMaterial: (v: any) => void;
	setNotes: React.Dispatch<React.SetStateAction<string>>;
	setAnbAngle: (v: number) => void;
	setAnbClass: (v: any) => void;
	setVerticalAnomaly: (v: any) => void;
	setTorquePreset: (v: any) => void;
}

export function useOrthoSyncEffects(params: UseOrthoSyncEffectsParams) {
	const {
		isOpen, patientId, setAlignerStep, setAlignerStepUpper, setAlignerStepLower,
		setAlignerTotal, setAlignerTotalUpper, setAlignerTotalLower, setAlignerDaysPerStep,
		setArchwireMaterial, setNotes, setAnbAngle, setAnbClass, setVerticalAnomaly, setTorquePreset,
	} = params;

	useEffect(() => {
		if (!isOpen || !patientId) return;
		let cancelled = false;
		fetchOrthoProgress(patientId).then((data) => {
			if (cancelled || !data) return;
			if (typeof data.currentAligner === "number" && data.currentAligner > 0) {
				setAlignerStep(data.currentAligner);
				setAlignerStepUpper(data.currentAligner);
				setAlignerStepLower(data.currentAligner);
			}
			if (typeof data.totalAligners === "number" && data.totalAligners > 0) {
				setAlignerTotal(data.totalAligners);
				setAlignerTotalUpper(data.totalAligners);
				setAlignerTotalLower(data.totalAligners);
			}
			if (typeof data.wearDaysPerAligner === "number" && data.wearDaysPerAligner > 0) {
				setAlignerDaysPerStep(data.wearDaysPerAligner);
			}
			if (data.archwire && typeof data.archwire === "string") {
				if (data.archwire.includes("NiTi")) setArchwireMaterial("NiTi");
				else if (data.archwire.includes("CuNiTi")) setArchwireMaterial("CuNiTi");
				else if (data.archwire.includes("SS")) setArchwireMaterial("SS");
				else if (data.archwire.includes("TMA")) setArchwireMaterial("TMA");
			}
		});
		return () => { cancelled = true; };
	}, [isOpen, patientId, setAlignerStep, setAlignerStepUpper, setAlignerStepLower, setAlignerTotal, setAlignerTotalUpper, setAlignerTotalLower, setAlignerDaysPerStep, setArchwireMaterial]);

	useEffect(() => {
		return subscribeCephSyncChannel((msg) => {
			if (msg.type === "CEPH_INSERT_TO_PROTOCOL") {
				const p = msg.payload as CephInsertToProtocolPayload;
				if (!p) return;
				if (p.protocolText) setNotes((prev) => prev ? `${prev}\n\n${p.protocolText}` : p.protocolText);
				if (typeof p.anbAngle === "number") setAnbAngle(p.anbAngle);
				if (p.skeletalClass?.includes("Class I")) setAnbClass("class_1");
				else if (p.skeletalClass?.includes("Class II")) setAnbClass("class_2");
				else if (p.skeletalClass?.includes("Class III")) setAnbClass("class_3");
				if (p.growthPattern?.includes("Dolicho")) setVerticalAnomaly("open");
				else if (p.growthPattern?.includes("Brachy")) setVerticalAnomaly("deep");
				if (typeof p.u1SnAngle === "number") setTorquePreset(p.u1SnAngle > 106 ? "low" : p.u1SnAngle < 102 ? "high" : "standard");
				showToast("Синхронизация ТРГ: Данные применены", "success", 3000);
			}
		});
	}, [setNotes, setAnbAngle, setAnbClass, setVerticalAnomaly, setTorquePreset]);
}
