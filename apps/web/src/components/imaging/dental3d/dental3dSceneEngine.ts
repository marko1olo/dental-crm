/**
 * apps/web/src/components/imaging/dental3d/dental3dSceneEngine.ts
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * THREE.JS WEBGL DENTAL 3D SCENE ENGINE & INTERACTION CONTROLLER
 * ═══════════════════════════════════════════════════════════════════════════
 * 4-Point Studio Lighting, Dual-Arch Occlusion Kinematics, PBR TrueColor Shaders,
 * Raycast 3D Caliper, Undercut Inspection, and Complete WebGL Teardown / GC.
 * ═══════════════════════════════════════════════════════════════════════════
 */

import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { STLLoader } from "three/examples/jsm/loaders/STLLoader.js";
import { OBJLoader } from "three/examples/jsm/loaders/OBJLoader.js";
import { PLYLoader } from "three/examples/jsm/loaders/PLYLoader.js";
import type {
	DentalArchLayer,
	DentalMaterialMode,
	LayerVisibilityState,
	CaliperMeasurement,
	OcclusionContactStats,
} from "./dental3dTypes.js";
import {
	orientCadMeshToWebGl,
	generateOcclusionHeatmapColors,
	generateUndercutHighlightColors,
} from "./dental3dMath.js";
import { Dental3dCaliperController } from "./dental3dCaliperController.js";
import { Dental3dKinematics } from "./dental3dKinematics.js";
import { disposeThreeMesh, teardownThreeScene } from "./dental3dDisposal.js";
import {
	createProceduralArches,
	synthesizeTrueColorForGeometry,
} from "./dental3dProcedural.js";

export class Dental3DSceneEngine {
	private container: HTMLElement;
	private scene: THREE.Scene;
	private camera: THREE.PerspectiveCamera;
	private renderer: THREE.WebGLRenderer | null = null;
	private controls: OrbitControls | null = null;
	private rootGroup: THREE.Group;
	private rafId: number | null = null;

	// Meshes for each layer
	private upperMesh: THREE.Mesh | null = null;
	private lowerMesh: THREE.Mesh | null = null;
	private biteMesh: THREE.Mesh | null = null;
	private prepMesh: THREE.Mesh | null = null;
	private scanbodyMesh: THREE.Mesh | null = null;

	// Backed up original vertex colors for TrueColor restoration
	private originalColorsMap = new WeakMap<THREE.BufferGeometry, THREE.BufferAttribute>();

	// Sub-controllers
	private caliperController: Dental3dCaliperController;
	private kinematics = new Dental3dKinematics();
	private caliperGroup: THREE.Group;

	// Callbacks & state
	private onOcclusionStatsUpdated?: ((stats: OcclusionContactStats | null) => void) | undefined;
	private currentMaterialMode: DentalMaterialMode = "truecolor";
	private layerVisibility: LayerVisibilityState = {
		upper: true,
		lower: true,
		bite: true,
		prep: true,
		scanbody: true,
	};

	constructor(
		container: HTMLElement,
		options?: {
			theme?: "light" | "dark";
			onCaliperMeasured?: (m: CaliperMeasurement | null) => void;
			onOcclusionStatsUpdated?: (stats: OcclusionContactStats | null) => void;
		},
	) {
		this.container = container;
		this.onOcclusionStatsUpdated = options?.onOcclusionStatsUpdated;

		const width = container.clientWidth || 800;
		const height = container.clientHeight || 600;

		this.scene = new THREE.Scene();
		this.updateThemeBackground(options?.theme || "dark");

		this.camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 2000);
		this.camera.position.set(0, 45, 95);

		this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "high-performance" });
		this.renderer.setSize(width, height);
		this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
		this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
		this.renderer.toneMappingExposure = 1.25;

		container.innerHTML = "";
		container.appendChild(this.renderer.domElement);

		this.controls = new OrbitControls(this.camera, this.renderer.domElement);
		this.controls.enableDamping = true;
		this.controls.dampingFactor = 0.05;
		this.controls.screenSpacePanning = true;
		this.controls.minDistance = 10;
		this.controls.maxDistance = 600;

		this.rootGroup = new THREE.Group();
		this.scene.add(this.rootGroup);

		this.caliperGroup = new THREE.Group();
		this.scene.add(this.caliperGroup);
		this.caliperController = new Dental3dCaliperController(this.caliperGroup, options?.onCaliperMeasured);

		this.setupLighting();
		this.setupEventListeners();
		this.startRenderLoop();
	}

	private setupLighting(): void {
		const ambient = new THREE.AmbientLight(0xffffff, 0.7);
		this.scene.add(ambient);

		const key = new THREE.DirectionalLight(0xffffff, 1.2);
		key.position.set(40, 70, 60);
		this.scene.add(key);

		const fill = new THREE.DirectionalLight(0xf1f5f9, 0.6);
		fill.position.set(-50, 30, 40);
		this.scene.add(fill);

		const lingual = new THREE.DirectionalLight(0xe0e7ff, 0.5);
		lingual.position.set(0, -60, -40);
		this.scene.add(lingual);

		const rim = new THREE.DirectionalLight(0x0d9488, 0.4);
		rim.position.set(0, 60, -70);
		this.scene.add(rim);
	}

	public updateThemeBackground(theme: "light" | "dark"): void {
		this.scene.background = new THREE.Color(theme === "light" ? 0xf8fafc : 0x090d16);
	}

	private startRenderLoop(): void {
		const animate = () => {
			this.rafId = requestAnimationFrame(animate);
			if (this.controls) this.controls.update();
			if (this.renderer && this.scene && this.camera) {
				this.renderer.render(this.scene, this.camera);
			}
		};
		animate();
	}

	public handleResize(): void {
		if (!this.container || !this.renderer || !this.camera) return;
		const w = this.container.clientWidth;
		const h = this.container.clientHeight;
		if (w === 0 || h === 0) return;
		this.camera.aspect = w / h;
		this.camera.updateProjectionMatrix();
		this.renderer.setSize(w, h);
	}

	// ─── MODEL LOADING ───────────────────────────────────────────────

	public async loadArchFromFile(file: File, layerOverride?: DentalArchLayer): Promise<void> {
		const lowerName = file.name.toLowerCase();
		const ext = lowerName.split(".").pop() || "";
		const buffer = await file.arrayBuffer();

		let layer: DentalArchLayer = layerOverride || "upper";
		if (!layerOverride) {
			if (lowerName.includes("lower") || lowerName.includes("mandib") || lowerName.includes("нч")) {
				layer = "lower";
			} else if (lowerName.includes("bite") || lowerName.includes("occl") || lowerName.includes("прикус")) {
				layer = "bite";
			} else if (lowerName.includes("prep") || lowerName.includes("stump") || lowerName.includes("культ")) {
				layer = "prep";
			} else if (lowerName.includes("scanbody") || lowerName.includes("боди")) {
				layer = "scanbody";
			}
		}

		await this.loadGeometryFromBuffer(buffer, ext as "ply" | "stl" | "obj", layer, file.name);
	}

	public async loadGeometryFromBuffer(
		buffer: ArrayBuffer,
		format: "ply" | "stl" | "obj",
		layer: DentalArchLayer,
		filename = "scan",
	): Promise<void> {
		let geometry: THREE.BufferGeometry;

		if (format === "ply") {
			const loader = new PLYLoader();
			geometry = loader.parse(buffer);
		} else if (format === "stl") {
			const loader = new STLLoader();
			geometry = loader.parse(buffer);
		} else if (format === "obj") {
			const loader = new OBJLoader();
			const text = new TextDecoder().decode(buffer);
			const obj = loader.parse(text);
			const foundMesh = this.extractFirstMesh(obj);
			if (foundMesh && foundMesh.geometry) {
				geometry = foundMesh.geometry.clone();
			} else {
				throw new Error("Не удалось найти полигональную сетку в OBJ файле");
			}
		} else {
			throw new Error(`Неподдерживаемый формат 3D файла: .${format}`);
		}

		geometry.computeVertexNormals();

		if (geometry.attributes.color) {
			this.originalColorsMap.set(geometry, geometry.attributes.color.clone() as THREE.BufferAttribute);
		} else {
			const synthesized = synthesizeTrueColorForGeometry(geometry, layer);
			this.originalColorsMap.set(geometry, synthesized.clone() as THREE.BufferAttribute);
		}

		const mesh = new THREE.Mesh(geometry, this.createMaterialForMode(this.currentMaterialMode, geometry, layer));
		mesh.name = `${layer}_mesh_${filename}`;

		orientCadMeshToWebGl(mesh);
		this.attachMeshToLayer(mesh, layer);
		this.recalculateOcclusionAndMaterials();
		this.fitCameraToScene();
	}

	public async loadFromUrl(url: string, format: "ply" | "stl" | "obj", layer: DentalArchLayer): Promise<void> {
		const res = await fetch(url);
		if (!res.ok) throw new Error(`HTTP ${res.status} при загрузке 3D модели: ${url}`);
		const buffer = await res.arrayBuffer();
		const filename = url.split("/").pop() || "scan";
		await this.loadGeometryFromBuffer(buffer, format, layer, filename);
	}

	public loadProceduralDefaultArches(): void {
		const { upperGeom, lowerGeom } = createProceduralArches();

		this.originalColorsMap.set(upperGeom, upperGeom.attributes.color!.clone() as THREE.BufferAttribute);
		this.upperMesh = new THREE.Mesh(upperGeom, this.createMaterialForMode(this.currentMaterialMode, upperGeom, "upper"));
		this.upperMesh.name = "upper_arch_procedural";
		this.rootGroup.add(this.upperMesh);

		this.originalColorsMap.set(lowerGeom, lowerGeom.attributes.color!.clone() as THREE.BufferAttribute);
		this.lowerMesh = new THREE.Mesh(lowerGeom, this.createMaterialForMode(this.currentMaterialMode, lowerGeom, "lower"));
		this.lowerMesh.name = "lower_arch_procedural";
		this.rootGroup.add(this.lowerMesh);

		this.recalculateOcclusionAndMaterials();
		this.fitCameraToScene();
	}

	private extractFirstMesh(obj: THREE.Object3D): THREE.Mesh | null {
		let mesh: THREE.Mesh | null = null;
		obj.traverse((child) => {
			if (!mesh && (child as THREE.Mesh).isMesh) {
				mesh = child as THREE.Mesh;
			}
		});
		return mesh;
	}

	private attachMeshToLayer(mesh: THREE.Mesh, layer: DentalArchLayer): void {
		this.removeLayer(layer);
		if (layer === "upper") this.upperMesh = mesh;
		else if (layer === "lower") this.lowerMesh = mesh;
		else if (layer === "bite") this.biteMesh = mesh;
		else if (layer === "prep") this.prepMesh = mesh;
		else if (layer === "scanbody") this.scanbodyMesh = mesh;

		this.rootGroup.add(mesh);
		mesh.visible = this.layerVisibility[layer];
	}

	public removeLayer(layer: DentalArchLayer): void {
		let target: THREE.Mesh | null = null;
		if (layer === "upper") { target = this.upperMesh; this.upperMesh = null; }
		else if (layer === "lower") { target = this.lowerMesh; this.lowerMesh = null; }
		else if (layer === "bite") { target = this.biteMesh; this.biteMesh = null; }
		else if (layer === "prep") { target = this.prepMesh; this.prepMesh = null; }
		else if (layer === "scanbody") { target = this.scanbodyMesh; this.scanbodyMesh = null; }

		if (target) {
			this.rootGroup.remove(target);
			disposeThreeMesh(target);
		}
	}

	// ─── OCCLUSION & KINEMATICS ──────────────────────────────────────

	public setOcclusionMatrix(matrixArray: number[] | undefined): void {
		this.kinematics.setOcclusionMatrix(matrixArray);
		this.kinematics.applyKinematics(this.lowerMesh);
	}

	public toggleBiteClosed(closed?: boolean): void {
		if (closed !== undefined) {
			this.kinematics.setBiteClosed(closed);
		} else {
			this.kinematics.toggleBite();
		}
		this.kinematics.applyKinematics(this.lowerMesh);
		if (this.currentMaterialMode === "occlusion") {
			this.recalculateOcclusionAndMaterials();
		}
	}

	public isBiteCurrentlyClosed(): boolean {
		return this.kinematics.isClosed();
	}

	// ─── MATERIAL MODES & SHADERS ────────────────────────────────────

	public setMaterialMode(mode: DentalMaterialMode): void {
		this.currentMaterialMode = mode;
		this.recalculateOcclusionAndMaterials();
	}

	public getMaterialMode(): DentalMaterialMode {
		return this.currentMaterialMode;
	}

	private recalculateOcclusionAndMaterials(): void {
		const allMeshes = [
			{ mesh: this.upperMesh, layer: "upper" as const },
			{ mesh: this.lowerMesh, layer: "lower" as const },
			{ mesh: this.biteMesh, layer: "bite" as const },
			{ mesh: this.prepMesh, layer: "prep" as const },
			{ mesh: this.scanbodyMesh, layer: "scanbody" as const },
		];

		if (this.currentMaterialMode === "occlusion" && this.upperMesh && this.lowerMesh) {
			const { colorsA: upperHeatmap, stats } = generateOcclusionHeatmapColors(this.upperMesh, this.lowerMesh);
			this.upperMesh.geometry.setAttribute("color", new THREE.BufferAttribute(upperHeatmap, 3));

			const { colorsA: lowerHeatmap } = generateOcclusionHeatmapColors(this.lowerMesh, this.upperMesh);
			this.lowerMesh.geometry.setAttribute("color", new THREE.BufferAttribute(lowerHeatmap, 3));

			if (this.onOcclusionStatsUpdated) {
				this.onOcclusionStatsUpdated(stats);
			}
		} else if (this.currentMaterialMode === "undercut") {
			const targetMesh = this.prepMesh || this.upperMesh;
			if (targetMesh) {
				const undercutColors = generateUndercutHighlightColors(targetMesh.geometry, new THREE.Vector3(0, 1, 0));
				targetMesh.geometry.setAttribute("color", new THREE.BufferAttribute(undercutColors, 3));
			}
			if (this.onOcclusionStatsUpdated) this.onOcclusionStatsUpdated(null);
		} else {
			for (const item of allMeshes) {
				if (item.mesh) {
					const orig = this.originalColorsMap.get(item.mesh.geometry);
					if (orig) item.mesh.geometry.setAttribute("color", orig.clone());
				}
			}
			if (this.onOcclusionStatsUpdated) this.onOcclusionStatsUpdated(null);
		}

		for (const item of allMeshes) {
			if (item.mesh) {
				const oldMat = item.mesh.material;
				item.mesh.material = this.createMaterialForMode(this.currentMaterialMode, item.mesh.geometry, item.layer);
				if (oldMat && typeof (oldMat as { dispose?: () => void }).dispose === "function") {
					(oldMat as { dispose: () => void }).dispose();
				}
			}
		}
	}

	private createMaterialForMode(
		mode: DentalMaterialMode,
		geometry: THREE.BufferGeometry,
		layer: DentalArchLayer,
	): THREE.Material {
		if (mode === "wireframe") {
			return new THREE.MeshStandardMaterial({
				color: layer === "upper" ? 0x0d9488 : 0x6366f1,
				wireframe: true,
				roughness: 0.8,
			});
		}

		return new THREE.MeshStandardMaterial({
			vertexColors: true,
			roughness: 0.35,
			metalness: 0.08,
			side: THREE.DoubleSide,
		});
	}

	// ─── LAYER VISIBILITY & CALIPER ──────────────────────────────────

	public setLayerVisibility(layer: DentalArchLayer, visible: boolean): void {
		this.layerVisibility[layer] = visible;
		let mesh: THREE.Mesh | null = null;
		if (layer === "upper") mesh = this.upperMesh;
		else if (layer === "lower") mesh = this.lowerMesh;
		else if (layer === "bite") mesh = this.biteMesh;
		else if (layer === "prep") mesh = this.prepMesh;
		else if (layer === "scanbody") mesh = this.scanbodyMesh;

		if (mesh) mesh.visible = visible;
	}

	public toggleLayer(layer: DentalArchLayer): boolean {
		const newVis = !this.layerVisibility[layer];
		this.setLayerVisibility(layer, newVis);
		return newVis;
	}

	public getLayerVisibility(): LayerVisibilityState {
		return { ...this.layerVisibility };
	}

	public toggleCaliper(active?: boolean): boolean {
		return this.caliperController.toggle(active);
	}

	public isCaliperMeasuring(): boolean {
		return this.caliperController.isActive();
	}

	public clearCaliper(): void {
		this.caliperController.clear();
	}

	private setupEventListeners(): void {
		const dom = this.renderer!.domElement;

		dom.addEventListener("pointerdown", (e: PointerEvent) => {
			this.caliperController.handlePointerDown(e, dom, this.camera, this.rootGroup);
		});

		dom.addEventListener("webglcontextlost", (e) => {
			e.preventDefault();
			if (this.rafId !== null) {
				cancelAnimationFrame(this.rafId);
				this.rafId = null;
			}
		});

		dom.addEventListener("webglcontextrestored", () => {
			if (this.rafId === null) {
				this.startRenderLoop();
			}
		});
	}

	// ─── CAMERA & FIT ────────────────────────────────────────────────

	public fitCameraToScene(): void {
		const box = new THREE.Box3().setFromObject(this.rootGroup);
		if (box.isEmpty()) return;

		const center = box.getCenter(new THREE.Vector3());
		const size = box.getSize(new THREE.Vector3());
		const maxDim = Math.max(size.x, size.y, size.z);
		const dist = Math.max(45, maxDim * 1.4);

		this.camera.position.set(center.x, center.y + dist * 0.4, center.z + dist);
		this.camera.lookAt(center);

		if (this.controls) {
			this.controls.target.copy(center);
			this.controls.update();
		}
	}

	public resetCamera(): void {
		this.fitCameraToScene();
	}

	public dispose(): void {
		if (this.rafId !== null) {
			cancelAnimationFrame(this.rafId);
			this.rafId = null;
		}

		this.caliperController.clear();
		if (this.controls && typeof this.controls.dispose === "function") {
			this.controls.dispose();
			this.controls = null;
		}

		teardownThreeScene(this.scene, this.rootGroup, this.renderer);
		this.renderer = null;
		this.container.innerHTML = "";
	}
}
