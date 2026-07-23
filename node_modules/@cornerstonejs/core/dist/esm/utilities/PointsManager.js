export default class PointsManager {
    constructor(configuration = {}) {
        this._dimensions = 3;
        this._length = 0;
        this._byteSize = 4;
        this.growSize = 128;
        const { initialSize = 1024, dimensions = 3, growSize = 128, } = configuration;
        const itemLength = initialSize * dimensions;
        this.growSize = growSize;
        this.array = new ArrayBuffer(itemLength * this._byteSize);
        this.data = new Float32Array(this.array);
        this._dimensions = dimensions;
    }
    forEach(func) {
        for (let i = 0; i < this._length; i++) {
            func(this.getPoint(i), i);
        }
    }
    get length() {
        return this._length;
    }
    get dimensions() {
        return this._dimensions;
    }
    get dimensionLength() {
        return this._length * this._dimensions;
    }
    getPoint(index) {
        if (index < 0) {
            index += this._length;
        }
        if (index < 0 || index >= this._length) {
            return;
        }
        const offset = this._dimensions * index;
        return this.data.subarray(offset, offset + this._dimensions);
    }
    getPointArray(index) {
        const array = [];
        if (index < 0) {
            index += this._length;
        }
        if (index < 0 || index >= this._length) {
            return;
        }
        const offset = this._dimensions * index;
        for (let i = 0; i < this._dimensions; i++) {
            array.push(this.data[i + offset]);
        }
        return array;
    }
    grow(additionalSize = 1, growSize = this.growSize) {
        if (this.dimensionLength + additionalSize * this._dimensions <=
            this.data.length) {
            return;
        }
        const newSize = this.data.length + growSize;
        const newArray = new ArrayBuffer(newSize * this._dimensions * this._byteSize);
        const newData = new Float32Array(newArray);
        newData.set(this.data);
        this.data = newData;
        this.array = newArray;
    }
    reverse() {
        const midLength = Math.floor(this._length / 2);
        for (let i = 0; i < midLength; i++) {
            const indexStart = i * this._dimensions;
            const indexEnd = (this._length - 1 - i) * this._dimensions;
            for (let dimension = 0; dimension < this._dimensions; dimension++) {
                const valueStart = this.data[indexStart + dimension];
                this.data[indexStart + dimension] = this.data[indexEnd + dimension];
                this.data[indexEnd + dimension] = valueStart;
            }
        }
    }
    getTypedArray() {
        return this.data;
    }
    push(point) {
        this.grow(1);
        const offset = this.length * this._dimensions;
        for (let i = 0; i < this._dimensions; i++) {
            this.data[i + offset] = point[i];
        }
        this._length++;
    }
    map(f) {
        const mapData = [];
        for (let i = 0; i < this._length; i++) {
            mapData.push(f(this.getPoint(i), i));
        }
        return mapData;
    }
    get points() {
        return this.map((p) => p);
    }
    toXYZ() {
        const xyz = { x: [], y: [] };
        if (this._dimensions >= 3) {
            xyz.z = [];
        }
        const { x, y, z } = xyz;
        this.forEach((p) => {
            x.push(p[0]);
            y.push(p[1]);
            if (z) {
                z.push(p[2]);
            }
        });
        return xyz;
    }
    static fromXYZ({ x, y, z }) {
        const array = PointsManager.create3(x.length);
        let offset = 0;
        for (let i = 0; i < x.length; i++) {
            array.data[offset++] = x[i];
            array.data[offset++] = y[i];
            array.data[offset++] = z ? z[i] : 0;
        }
        array._length = x.length;
        return array;
    }
    subselect(count = 10, offset = 0) {
        const selected = new PointsManager({
            initialSize: count,
            dimensions: this._dimensions,
        });
        for (let i = 0; i < count; i++) {
            const index = (offset + Math.floor((this.length * i) / count)) % this.length;
            selected.push(this.getPoint(index));
        }
        return selected;
    }
    static create3(initialSize = 128, points) {
        initialSize = Math.max(initialSize, points?.length || 0);
        const newPoints = new PointsManager({ initialSize, dimensions: 3 });
        if (points) {
            points.forEach((point) => newPoints.push(point));
        }
        return newPoints;
    }
    static create2(initialSize = 128) {
        return new PointsManager({ initialSize, dimensions: 2 });
    }
}
