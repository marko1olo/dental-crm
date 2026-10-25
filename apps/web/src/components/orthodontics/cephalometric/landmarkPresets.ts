import type { LandmarkMap } from "./types";

export const DEFAULT_CEPH_LANDMARKS_PRESET: LandmarkMap = {
	S: { x: 280, y: 190 },
	N: { x: 440, y: 155 },
	Or: { x: 415, y: 230 },
	Po: { x: 245, y: 245 },
	ANS: { x: 475, y: 310 },
	PNS: { x: 305, y: 325 },
	A: { x: 462, y: 342 },
	B: { x: 446, y: 440 },
	Pog: { x: 452, y: 490 },
	Gn: { x: 442, y: 520 },
	Me: { x: 420, y: 540 },
	Go: { x: 250, y: 435 },
	U1t: { x: 494, y: 395 },
	U1a: { x: 456, y: 325 },
	L1t: { x: 471, y: 400 },
	L1a: { x: 428, y: 495 },
};

export const CLASS_I_NORMAL_LANDMARKS_PRESET: LandmarkMap = {
	...DEFAULT_CEPH_LANDMARKS_PRESET,
	B: { x: 460, y: 440 },
	Pog: { x: 466, y: 490 },
	Gn: { x: 456, y: 520 },
	Me: { x: 435, y: 540 },
};

export const CLASS_II_DISTAL_LANDMARKS_PRESET: LandmarkMap = {
	...DEFAULT_CEPH_LANDMARKS_PRESET,
	B: { x: 440, y: 440 },
	Pog: { x: 446, y: 490 },
	Gn: { x: 436, y: 520 },
	Me: { x: 415, y: 540 },
};

export const CLASS_III_MESIAL_LANDMARKS_PRESET: LandmarkMap = {
	...DEFAULT_CEPH_LANDMARKS_PRESET,
	B: { x: 485, y: 440 },
	Pog: { x: 491, y: 490 },
	Gn: { x: 480, y: 520 },
	Me: { x: 460, y: 540 },
};
