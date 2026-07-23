function validate3x3Matrix(matrix) {
    if (!Array.isArray(matrix) || matrix.length !== 9) {
        throw new Error('Matrix must be an array of 9 numbers');
    }
    if (!matrix.every((n) => typeof n === 'number' && !isNaN(n))) {
        throw new Error('Matrix must contain only valid numbers');
    }
}
export function inverse3x3Matrix(matrix) {
    validate3x3Matrix(matrix);
    const mat = [
        [matrix[0], matrix[1], matrix[2]],
        [matrix[3], matrix[4], matrix[5]],
        [matrix[6], matrix[7], matrix[8]],
    ];
    const determinant = mat[0][0] * (mat[1][1] * mat[2][2] - mat[1][2] * mat[2][1]) -
        mat[0][1] * (mat[1][0] * mat[2][2] - mat[1][2] * mat[2][0]) +
        mat[0][2] * (mat[1][0] * mat[2][1] - mat[1][1] * mat[2][0]);
    if (Math.abs(determinant) < 1e-10) {
        throw new Error('Matrix is not invertible (determinant is zero)');
    }
    const adjugate = [
        [
            mat[1][1] * mat[2][2] - mat[1][2] * mat[2][1],
            -(mat[0][1] * mat[2][2] - mat[0][2] * mat[2][1]),
            mat[0][1] * mat[1][2] - mat[0][2] * mat[1][1],
        ],
        [
            -(mat[1][0] * mat[2][2] - mat[1][2] * mat[2][0]),
            mat[0][0] * mat[2][2] - mat[0][2] * mat[2][0],
            -(mat[0][0] * mat[1][2] - mat[0][2] * mat[1][0]),
        ],
        [
            mat[1][0] * mat[2][1] - mat[1][1] * mat[2][0],
            -(mat[0][0] * mat[2][1] - mat[0][1] * mat[2][0]),
            mat[0][0] * mat[1][1] - mat[0][1] * mat[1][0],
        ],
    ];
    const inverse = [];
    for (let i = 0; i < 3; i++) {
        for (let j = 0; j < 3; j++) {
            inverse.push(adjugate[i][j] / determinant);
        }
    }
    return inverse;
}
function normalizeVector(v) {
    const magnitude = Math.sqrt(v[0] * v[0] + v[1] * v[1] + v[2] * v[2]);
    return v.map((component) => component / magnitude);
}
export function checkStandardBasis(directions) {
    validate3x3Matrix(directions);
    const xVector = directions.slice(0, 3);
    const yVector = directions.slice(3, 6);
    const zVector = directions.slice(6, 9);
    const normalizedX = normalizeVector(xVector);
    const normalizedY = normalizeVector(yVector);
    const normalizedZ = normalizeVector(zVector);
    const standardBasis = {
        x: [1, 0, 0],
        y: [0, 1, 0],
        z: [0, 0, 1],
    };
    const epsilon = 1e-10;
    const isStandard = normalizedX.every((val, i) => Math.abs(val - standardBasis.x[i]) < epsilon) &&
        normalizedY.every((val, i) => Math.abs(val - standardBasis.y[i]) < epsilon) &&
        normalizedZ.every((val, i) => Math.abs(val - standardBasis.z[i]) < epsilon);
    const rotationMatrix = isStandard
        ? [...standardBasis.x, ...standardBasis.y, ...standardBasis.z]
        : inverse3x3Matrix([...normalizedX, ...normalizedY, ...normalizedZ]);
    return {
        isStandard,
        rotationMatrix,
    };
}
function rotatePoint(point, origin, rotationMatrix) {
    const x = point[0] - origin[0];
    const y = point[1] - origin[1];
    const z = point[2] - origin[2];
    return [
        rotationMatrix[0] * x +
            rotationMatrix[1] * y +
            rotationMatrix[2] * z +
            origin[0],
        rotationMatrix[3] * x +
            rotationMatrix[4] * y +
            rotationMatrix[5] * z +
            origin[1],
        rotationMatrix[6] * x +
            rotationMatrix[7] * y +
            rotationMatrix[8] * z +
            origin[2],
    ];
}
export function rotatePoints(rotationMatrix, origin, points) {
    const rotatedPoints = [];
    for (let i = 0; i < points.length; i += 3) {
        const point = points.slice(i, i + 3);
        const rotated = rotatePoint(point, origin, rotationMatrix);
        rotatedPoints.push(...rotated);
    }
    return rotatedPoints;
}
