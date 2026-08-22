/**
 * Binary & ASCII STL 3D Mesh Parser & Topology Engine (DOMAIN: LAB 3D)
 *
 * Высокопроизводительный парсер 3D-сеток STL для зуботехнических CAD/CAM реставраций.
 * Вычисляет габаритный бокс, площадь поверхности (мм²), замкнутый объем через знаковые тетраэдры (мм³)
 * и автоматическую генерацию нормалей граней.
 */

export interface StlBoundingBox {
	readonly min: readonly [number, number, number];
	readonly max: readonly [number, number, number];
	readonly center: readonly [number, number, number];
	readonly dimensions: readonly [number, number, number];
	readonly radius: number;
}

export interface StlMeshTopology {
	readonly positions: Float32Array; // 3 vertices * 3 coords per triangle = triangleCount * 9
	readonly normals: Float32Array; // 3 normal coords per vertex = triangleCount * 9
	readonly triangleCount: number;
	readonly vertexCount: number;
	readonly boundingBox: StlBoundingBox;
	readonly surfaceAreaMm2: number;
	readonly enclosedVolumeMm3: number;
	readonly isWatertight: boolean;
	readonly header: string;
	readonly format: "binary" | "ascii";
}

/**
 * Расчет габаритного параллелепипеда (AABB), центра и описанной сферы для 3D-сетки.
 */
export function computeMeshBoundingBox(positions: Float32Array): StlBoundingBox {
	const len = positions.length;
	if (len === 0) {
		return {
			min: [0, 0, 0],
			max: [0, 0, 0],
			center: [0, 0, 0],
			dimensions: [0, 0, 0],
			radius: 0,
		};
	}

	let minX = Infinity;
	let minY = Infinity;
	let minZ = Infinity;
	let maxX = -Infinity;
	let maxY = -Infinity;
	let maxZ = -Infinity;

	for (let i = 0; i < len; i += 3) {
		const x = positions[i]!;
		const y = positions[i + 1]!;
		const z = positions[i + 2]!;

		if (x < minX) minX = x;
		if (y < minY) minY = y;
		if (z < minZ) minZ = z;

		if (x > maxX) maxX = x;
		if (y > maxY) maxY = y;
		if (z > maxZ) maxZ = z;
	}

	const centerX = (minX + maxX) / 2;
	const centerY = (minY + maxY) / 2;
	const centerZ = (minZ + maxZ) / 2;

	const dimX = maxX - minX;
	const dimY = maxY - minY;
	const dimZ = maxZ - minZ;

	let maxRadiusSq = 0;
	for (let i = 0; i < len; i += 3) {
		const dx = positions[i]! - centerX;
		const dy = positions[i + 1]! - centerY;
		const dz = positions[i + 2]! - centerZ;
		const rSq = dx * dx + dy * dy + dz * dz;
		if (rSq > maxRadiusSq) {
			maxRadiusSq = rSq;
		}
	}

	return {
		min: [minX, minY, minZ],
		max: [maxX, maxY, maxZ],
		center: [centerX, centerY, centerZ],
		dimensions: [dimX, dimY, dimZ],
		radius: Math.sqrt(maxRadiusSq),
	};
}

/**
 * Вычисление нормали треугольника через векторное произведение: N = (v2 - v1) x (v3 - v1)
 */
export function calculateTriangleNormal(
	v1x: number,
	v1y: number,
	v1z: number,
	v2x: number,
	v2y: number,
	v2z: number,
	v3x: number,
	v3y: number,
	v3z: number,
): [number, number, number] {
	const ax = v2x - v1x;
	const ay = v2y - v1y;
	const az = v2z - v1z;

	const bx = v3x - v1x;
	const by = v3y - v1y;
	const bz = v3z - v1z;

	const nx = ay * bz - az * by;
	const ny = az * bx - ax * bz;
	const nz = ax * by - ay * bx;

	const len = Math.sqrt(nx * nx + ny * ny + nz * nz);
	if (len > 1e-8) {
		return [nx / len, ny / len, nz / len];
	}
	return [0, 0, 1];
}

/**
 * Расчет площади поверхности (мм²) и замкнутого объема (мм³) через метод знаковых тетраэдров:
 * V = (1/6) * \sum ( (v1 x v2) . v3 )
 */
export function computeAreaAndVolume(
	positions: Float32Array,
): { surfaceAreaMm2: number; enclosedVolumeMm3: number } {
	let totalArea = 0;
	let signedVolume = 0;
	const len = positions.length;

	for (let i = 0; i < len; i += 9) {
		const v1x = positions[i]!;
		const v1y = positions[i + 1]!;
		const v1z = positions[i + 2]!;

		const v2x = positions[i + 3]!;
		const v2y = positions[i + 4]!;
		const v2z = positions[i + 5]!;

		const v3x = positions[i + 6]!;
		const v3y = positions[i + 7]!;
		const v3z = positions[i + 8]!;

		// Площадь треугольника: 0.5 * |(v2 - v1) x (v3 - v1)|
		const ax = v2x - v1x;
		const ay = v2y - v1y;
		const az = v2z - v1z;

		const bx = v3x - v1x;
		const by = v3y - v1y;
		const bz = v3z - v1z;

		const cx = ay * bz - az * by;
		const cy = az * bx - ax * bz;
		const cz = ax * by - ay * bx;

		const triangleArea = 0.5 * Math.sqrt(cx * cx + cy * cy + cz * cz);
		totalArea += triangleArea;

		// Объем тетраэдра: (1/6) * det([v1, v2, v3])
		const tetVolume =
			(-v3x * v2y * v1z +
				v2x * v3y * v1z +
				v3x * v1y * v2z -
				v1x * v3y * v2z -
				v2x * v1y * v3z +
				v1x * v2y * v3z) /
			6.0;

		signedVolume += tetVolume;
	}

	return {
		surfaceAreaMm2: Number(totalArea.toFixed(4)),
		enclosedVolumeMm3: Number(Math.abs(signedVolume).toFixed(4)),
	};
}

/**
 * Парсинг бинарного STL файла (Little-Endian).
 */
export function parseBinaryStl(buffer: ArrayBuffer | Uint8Array): StlMeshTopology {
	const rawBytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
	if (rawBytes.byteLength < 84) {
		throw new Error(
			`Некорректный размер STL файла: ${rawBytes.byteLength} байт (минимальный размер 84 байта).`,
		);
	}

	// 80 байт — заголовок
	const headerDecoder = new TextDecoder("utf-8", { fatal: false });
	const header = headerDecoder.decode(rawBytes.subarray(0, 80)).replace(/\0/g, "").trim();

	const dataView = new DataView(rawBytes.buffer, rawBytes.byteOffset, rawBytes.byteLength);
	const triangleCount = dataView.getUint32(80, true);

	const expectedBytes = 84 + triangleCount * 50;
	if (rawBytes.byteLength < expectedBytes) {
		throw new Error(
			`Размер бинарного STL (${rawBytes.byteLength} байт) меньше заявленного числа треугольников (${triangleCount} треуг. -> ${expectedBytes} байт).`,
		);
	}

	const positions = new Float32Array(triangleCount * 9);
	const normals = new Float32Array(triangleCount * 9);

	let offset = 84;
	let posIndex = 0;
	let normIndex = 0;

	for (let i = 0; i < triangleCount; i++) {
		// Нормаль из файла (3 x float32)
		let nx = dataView.getFloat32(offset, true);
		let ny = dataView.getFloat32(offset + 4, true);
		let nz = dataView.getFloat32(offset + 8, true);
		offset += 12;

		// Вершины треугольника (3 вершины x 3 float32 = 36 байт)
		const v1x = dataView.getFloat32(offset, true);
		const v1y = dataView.getFloat32(offset + 4, true);
		const v1z = dataView.getFloat32(offset + 8, true);
		offset += 12;

		const v2x = dataView.getFloat32(offset, true);
		const v2y = dataView.getFloat32(offset + 4, true);
		const v2z = dataView.getFloat32(offset + 8, true);
		offset += 12;

		const v3x = dataView.getFloat32(offset, true);
		const v3y = dataView.getFloat32(offset + 4, true);
		const v3z = dataView.getFloat32(offset + 8, true);
		offset += 12;

		// Пропуск 2 байт атрибутов
		offset += 2;

		// Проверка и вычисление нормали, если в файле она нулевая
		const normLenSq = nx * nx + ny * ny + nz * nz;
		if (normLenSq < 1e-6) {
			const computed = calculateTriangleNormal(v1x, v1y, v1z, v2x, v2y, v2z, v3x, v3y, v3z);
			nx = computed[0];
			ny = computed[1];
			nz = computed[2];
		} else {
			const invLen = 1 / Math.sqrt(normLenSq);
			nx *= invLen;
			ny *= invLen;
			nz *= invLen;
		}

		// Заполняем позиции вершин
		positions[posIndex++] = v1x;
		positions[posIndex++] = v1y;
		positions[posIndex++] = v1z;

		positions[posIndex++] = v2x;
		positions[posIndex++] = v2y;
		positions[posIndex++] = v2z;

		positions[posIndex++] = v3x;
		positions[posIndex++] = v3y;
		positions[posIndex++] = v3z;

		// Заполняем нормали для каждой из 3-х вершин грани
		for (let v = 0; v < 3; v++) {
			normals[normIndex++] = nx;
			normals[normIndex++] = ny;
			normals[normIndex++] = nz;
		}
	}

	const boundingBox = computeMeshBoundingBox(positions);
	const { surfaceAreaMm2, enclosedVolumeMm3 } = computeAreaAndVolume(positions);

	return {
		positions,
		normals,
		triangleCount,
		vertexCount: triangleCount * 3,
		boundingBox,
		surfaceAreaMm2,
		enclosedVolumeMm3,
		isWatertight: enclosedVolumeMm3 > 0.0001,
		header: header || "Binary Dental CAD/CAM STL Mesh",
		format: "binary",
	};
}

/**
 * Парсинг текстового ASCII STL файла.
 */
export function parseAsciiStl(text: string): StlMeshTopology {
	const positionsArray: number[] = [];
	const normalsArray: number[] = [];

	let currentNormal: [number, number, number] = [0, 0, 1];
	let triangleVertices: [number, number, number][] = [];
	let triangleCount = 0;

	// Извлекаем заголовок
	const headerMatch = text.match(/^solid\s*([^\r\n]*)/i);
	const header = headerMatch && headerMatch[1] ? headerMatch[1].trim() : "ASCII STL Mesh";

	const lines = text.split(/[\r\n]+/);

	for (let i = 0; i < lines.length; i++) {
		const line = lines[i]!.trim();
		if (!line) continue;

		if (line.startsWith("facet normal")) {
			const parts = line.split(/\s+/);
			if (parts.length >= 4) {
				const nx = Number.parseFloat(parts[2]!);
				const ny = Number.parseFloat(parts[3]!);
				const nz = Number.parseFloat(parts[4]!);
				currentNormal = [
					Number.isNaN(nx) ? 0 : nx,
					Number.isNaN(ny) ? 0 : ny,
					Number.isNaN(nz) ? 1 : nz,
				];
			}
			triangleVertices = [];
		} else if (line.startsWith("vertex")) {
			const parts = line.split(/\s+/);
			if (parts.length >= 4) {
				const x = Number.parseFloat(parts[1]!);
				const y = Number.parseFloat(parts[2]!);
				const z = Number.parseFloat(parts[3]!);
				triangleVertices.push([
					Number.isNaN(x) ? 0 : x,
					Number.isNaN(y) ? 0 : y,
					Number.isNaN(z) ? 0 : z,
				]);
			}
		} else if (line.startsWith("endfacet")) {
			if (triangleVertices.length === 3) {
				const v1 = triangleVertices[0]!;
				const v2 = triangleVertices[1]!;
				const v3 = triangleVertices[2]!;

				// Проверяем нормаль
				let nx = currentNormal[0];
				let ny = currentNormal[1];
				let nz = currentNormal[2];
				const lenSq = nx * nx + ny * ny + nz * nz;
				if (lenSq < 1e-6) {
					const computed = calculateTriangleNormal(
						v1[0], v1[1], v1[2],
						v2[0], v2[1], v2[2],
						v3[0], v3[1], v3[2],
					);
					nx = computed[0];
					ny = computed[1];
					nz = computed[2];
				}

				for (let v = 0; v < 3; v++) {
					const vert = triangleVertices[v]!;
					positionsArray.push(vert[0], vert[1], vert[2]);
					normalsArray.push(nx, ny, nz);
				}
				triangleCount++;
			}
			triangleVertices = [];
		}
	}

	const positions = new Float32Array(positionsArray);
	const normals = new Float32Array(normalsArray);
	const boundingBox = computeMeshBoundingBox(positions);
	const { surfaceAreaMm2, enclosedVolumeMm3 } = computeAreaAndVolume(positions);

	return {
		positions,
		normals,
		triangleCount,
		vertexCount: triangleCount * 3,
		boundingBox,
		surfaceAreaMm2,
		enclosedVolumeMm3,
		isWatertight: enclosedVolumeMm3 > 0.0001,
		header,
		format: "ascii",
	};
}

/**
 * Универсальный парсер STL с автоопределением Binary/ASCII формата.
 */
export function parseStl(input: ArrayBuffer | Uint8Array | string): StlMeshTopology {
	if (typeof input === "string") {
		return parseAsciiStl(input);
	}

	const rawBytes = input instanceof Uint8Array ? input : new Uint8Array(input);

	// Эвристика: проверяем, не является ли файл ASCII
	if (rawBytes.byteLength >= 6) {
		const prefix = new TextDecoder("ascii").decode(rawBytes.subarray(0, 6)).toLowerCase();
		if (prefix.startsWith("solid")) {
			// Проверяем наличие ключевых слов facet normal
			const sample = new TextDecoder("utf-8", { fatal: false }).decode(
				rawBytes.subarray(0, Math.min(rawBytes.byteLength, 1024)),
			);
			if (sample.includes("facet") && sample.includes("vertex")) {
				const fullText = new TextDecoder("utf-8").decode(rawBytes);
				return parseAsciiStl(fullText);
			}
		}
	}

	return parseBinaryStl(rawBytes);
}

/**
 * Сериализация 3D-сетки в стандартный бинарный STL формат.
 */
export function serializeBinaryStl(mesh: {
	readonly positions: Float32Array;
	readonly normals?: Float32Array | undefined;
	readonly header?: string | undefined;
}): Uint8Array {
	const triangleCount = Math.floor(mesh.positions.length / 9);
	const bufferSize = 84 + triangleCount * 50;
	const buffer = new ArrayBuffer(bufferSize);
	const dataView = new DataView(buffer);
	const uint8View = new Uint8Array(buffer);

	// 80 байт заголовка
	const headerStr = (mesh.header || "DENTE Dental CAD/CAM STL Export").padEnd(80, " ");
	const encoder = new TextEncoder();
	uint8View.set(encoder.encode(headerStr).subarray(0, 80), 0);

	// 4 байта количества треугольников
	dataView.setUint32(80, triangleCount, true);

	let offset = 84;
	let posIdx = 0;

	for (let i = 0; i < triangleCount; i++) {
		const v1x = mesh.positions[posIdx++]!;
		const v1y = mesh.positions[posIdx++]!;
		const v1z = mesh.positions[posIdx++]!;

		const v2x = mesh.positions[posIdx++]!;
		const v2y = mesh.positions[posIdx++]!;
		const v2z = mesh.positions[posIdx++]!;

		const v3x = mesh.positions[posIdx++]!;
		const v3y = mesh.positions[posIdx++]!;
		const v3z = mesh.positions[posIdx++]!;

		let nx = 0;
		let ny = 0;
		let nz = 1;

		if (mesh.normals && mesh.normals.length >= posIdx) {
			nx = mesh.normals[posIdx - 9]!;
			ny = mesh.normals[posIdx - 8]!;
			nz = mesh.normals[posIdx - 7]!;
		} else {
			const computed = calculateTriangleNormal(v1x, v1y, v1z, v2x, v2y, v2z, v3x, v3y, v3z);
			nx = computed[0];
			ny = computed[1];
			nz = computed[2];
		}

		// Normal (3 x float32)
		dataView.setFloat32(offset, nx, true);
		dataView.setFloat32(offset + 4, ny, true);
		dataView.setFloat32(offset + 8, nz, true);
		offset += 12;

		// Vertex 1
		dataView.setFloat32(offset, v1x, true);
		dataView.setFloat32(offset + 4, v1y, true);
		dataView.setFloat32(offset + 8, v1z, true);
		offset += 12;

		// Vertex 2
		dataView.setFloat32(offset, v2x, true);
		dataView.setFloat32(offset + 4, v2y, true);
		dataView.setFloat32(offset + 8, v2z, true);
		offset += 12;

		// Vertex 3
		dataView.setFloat32(offset, v3x, true);
		dataView.setFloat32(offset + 4, v3y, true);
		dataView.setFloat32(offset + 8, v3z, true);
		offset += 12;

		// Attribute byte count = 0
		dataView.setUint16(offset, 0, true);
		offset += 2;
	}

	return uint8View;
}

/**
 * Создание синтетической тестовой 3D-модели (Куб, Пирамида или Зубная коронка) в формате Float32Array.
 */
export function generateTestCubeMesh(size = 10): StlMeshTopology {
	const s = size / 2;
	// 6 граней x 2 треугольника = 12 треугольников
	// prettier-ignore
	const positions = new Float32Array([
		// Front face (Z = +s)
		-s, -s, s,   s, -s, s,   s, s, s,
		-s, -s, s,   s, s, s,   -s, s, s,
		// Back face (Z = -s)
		 s, -s, -s, -s, -s, -s, -s, s, -s,
		 s, -s, -s, -s, s, -s,   s, s, -s,
		// Top face (Y = +s)
		-s, s, s,    s, s, s,    s, s, -s,
		-s, s, s,    s, s, -s,  -s, s, -s,
		// Bottom face (Y = -s)
		-s, -s, -s,  s, -s, -s,  s, -s, s,
		-s, -s, -s,  s, -s, s,  -s, -s, s,
		// Right face (X = +s)
		 s, -s, s,   s, -s, -s,  s, s, -s,
		 s, -s, s,   s, s, -s,   s, s, s,
		// Left face (X = -s)
		-s, -s, -s, -s, -s, s,  -s, s, s,
		-s, -s, -s, -s, s, s,   -s, s, -s,
	]);

	const triangleCount = 12;
	const normals = new Float32Array(triangleCount * 9);

	for (let i = 0; i < triangleCount; i++) {
		const idx = i * 9;
		const norm = calculateTriangleNormal(
			positions[idx]!, positions[idx + 1]!, positions[idx + 2]!,
			positions[idx + 3]!, positions[idx + 4]!, positions[idx + 5]!,
			positions[idx + 6]!, positions[idx + 7]!, positions[idx + 8]!,
		);
		for (let v = 0; v < 3; v++) {
			const nIdx = idx + v * 3;
			normals[nIdx] = norm[0];
			normals[nIdx + 1] = norm[1];
			normals[nIdx + 2] = norm[2];
		}
	}

	const boundingBox = computeMeshBoundingBox(positions);
	const { surfaceAreaMm2, enclosedVolumeMm3 } = computeAreaAndVolume(positions);

	return {
		positions,
		normals,
		triangleCount,
		vertexCount: 36,
		boundingBox,
		surfaceAreaMm2,
		enclosedVolumeMm3,
		isWatertight: true,
		header: "Synthetic Dental Calibration Cube",
		format: "binary",
	};
}
