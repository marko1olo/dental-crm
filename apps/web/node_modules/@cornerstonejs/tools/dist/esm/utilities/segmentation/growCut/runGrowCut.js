import { cache } from '@cornerstonejs/core';
import shaderCode from './growCutShader';
const GB = 1024 * 1024 * 1024;
const WEBGPU_MEMORY_LIMIT = 1.99 * GB;
const DEFAULT_GROWCUT_OPTIONS = {
    windowSize: 3,
    maxProcessingTime: 30000,
    inspection: {
        numCyclesInterval: 5,
        numCyclesBelowThreshold: 3,
        threshold: 1e-4,
    },
};
async function runGrowCut(referenceVolumeId, labelmapVolumeId, options = DEFAULT_GROWCUT_OPTIONS) {
    const workGroupSize = [8, 8, 4];
    const { windowSize, maxProcessingTime } = Object.assign({}, DEFAULT_GROWCUT_OPTIONS, options);
    const inspection = Object.assign({}, DEFAULT_GROWCUT_OPTIONS.inspection, options.inspection);
    const volume = cache.getVolume(referenceVolumeId);
    const labelmap = cache.getVolume(labelmapVolumeId);
    const [columns, rows, numSlices] = volume.dimensions;
    if (labelmap.dimensions[0] !== columns ||
        labelmap.dimensions[1] !== rows ||
        labelmap.dimensions[2] !== numSlices) {
        throw new Error('Volume and labelmap must have the same size');
    }
    let numIterations = Math.floor(Math.sqrt(rows ** 2 + columns ** 2 + numSlices ** 2) / 2);
    numIterations = Math.min(numIterations, 500);
    const labelmapData = labelmap.voxelManager.getCompleteScalarDataArray();
    let volumePixelData = volume.voxelManager.getCompleteScalarDataArray();
    if (!(volumePixelData instanceof Float32Array)) {
        volumePixelData = new Float32Array(volumePixelData);
    }
    const requiredLimits = {
        maxStorageBufferBindingSize: WEBGPU_MEMORY_LIMIT,
        maxBufferSize: WEBGPU_MEMORY_LIMIT,
    };
    const adapter = await navigator.gpu?.requestAdapter();
    const device = await adapter.requestDevice({ requiredLimits });
    const BUFFER_SIZE = volumePixelData.byteLength;
    const UPDATED_VOXELS_COUNTER_BUFFER_SIZE = numIterations * Uint32Array.BYTES_PER_ELEMENT;
    const BOUNDS_BUFFER_SIZE = 6 * Int32Array.BYTES_PER_ELEMENT;
    const shaderModule = device.createShaderModule({
        code: shaderCode,
    });
    const numIterationIndex = 3;
    const paramsArrayValues = new Uint32Array([
        columns,
        rows,
        numSlices,
        0,
    ]);
    const gpuParamsBuffer = device.createBuffer({
        size: paramsArrayValues.byteLength,
        usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });
    const gpuVolumePixelDataBuffer = device.createBuffer({
        size: BUFFER_SIZE,
        usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
    });
    device.queue.writeBuffer(gpuVolumePixelDataBuffer, 0, volumePixelData);
    const gpuLabelmapBuffers = [0, 1].map(() => device.createBuffer({
        size: BUFFER_SIZE,
        usage: GPUBufferUsage.STORAGE |
            GPUBufferUsage.COPY_SRC |
            GPUBufferUsage.COPY_DST,
    }));
    device.queue.writeBuffer(gpuLabelmapBuffers[0], 0, new Uint32Array(labelmapData));
    const gpuStrengthBuffers = [0, 1].map(() => {
        const strengthBuffer = device.createBuffer({
            size: BUFFER_SIZE,
            usage: GPUBufferUsage.STORAGE |
                GPUBufferUsage.COPY_SRC |
                GPUBufferUsage.COPY_DST,
        });
        return strengthBuffer;
    });
    const gpuCounterBuffer = device.createBuffer({
        size: UPDATED_VOXELS_COUNTER_BUFFER_SIZE,
        usage: GPUBufferUsage.STORAGE |
            GPUBufferUsage.COPY_SRC |
            GPUBufferUsage.COPY_DST,
    });
    const gpuBoundsBuffer = device.createBuffer({
        size: BOUNDS_BUFFER_SIZE,
        usage: GPUBufferUsage.STORAGE |
            GPUBufferUsage.COPY_SRC |
            GPUBufferUsage.COPY_DST,
    });
    const initialBounds = new Int32Array([
        columns,
        rows,
        numSlices,
        -1,
        -1,
        -1,
    ]);
    device.queue.writeBuffer(gpuBoundsBuffer, 0, initialBounds);
    const bindGroupLayout = device.createBindGroupLayout({
        entries: [
            {
                binding: 0,
                visibility: GPUShaderStage.COMPUTE,
                buffer: {
                    type: 'uniform',
                },
            },
            {
                binding: 1,
                visibility: GPUShaderStage.COMPUTE,
                buffer: {
                    type: 'read-only-storage',
                },
            },
            {
                binding: 2,
                visibility: GPUShaderStage.COMPUTE,
                buffer: {
                    type: 'storage',
                },
            },
            {
                binding: 3,
                visibility: GPUShaderStage.COMPUTE,
                buffer: {
                    type: 'storage',
                },
            },
            {
                binding: 4,
                visibility: GPUShaderStage.COMPUTE,
                buffer: {
                    type: 'read-only-storage',
                },
            },
            {
                binding: 5,
                visibility: GPUShaderStage.COMPUTE,
                buffer: {
                    type: 'read-only-storage',
                },
            },
            {
                binding: 6,
                visibility: GPUShaderStage.COMPUTE,
                buffer: {
                    type: 'storage',
                },
            },
            {
                binding: 7,
                visibility: GPUShaderStage.COMPUTE,
                buffer: {
                    type: 'storage',
                },
            },
        ],
    });
    const bindGroups = [0, 1].map((i) => {
        const outputLabelmapBuffer = gpuLabelmapBuffers[i];
        const outputStrengthBuffer = gpuStrengthBuffers[i];
        const previouLabelmapBuffer = gpuLabelmapBuffers[(i + 1) % 2];
        const previousStrengthBuffer = gpuStrengthBuffers[(i + 1) % 2];
        return device.createBindGroup({
            layout: bindGroupLayout,
            entries: [
                {
                    binding: 0,
                    resource: {
                        buffer: gpuParamsBuffer,
                    },
                },
                {
                    binding: 1,
                    resource: {
                        buffer: gpuVolumePixelDataBuffer,
                    },
                },
                {
                    binding: 2,
                    resource: {
                        buffer: outputLabelmapBuffer,
                    },
                },
                {
                    binding: 3,
                    resource: {
                        buffer: outputStrengthBuffer,
                    },
                },
                {
                    binding: 4,
                    resource: {
                        buffer: previouLabelmapBuffer,
                    },
                },
                {
                    binding: 5,
                    resource: {
                        buffer: previousStrengthBuffer,
                    },
                },
                {
                    binding: 6,
                    resource: {
                        buffer: gpuCounterBuffer,
                    },
                },
                {
                    binding: 7,
                    resource: {
                        buffer: gpuBoundsBuffer,
                    },
                },
            ],
        });
    });
    const pipeline = device.createComputePipeline({
        layout: device.createPipelineLayout({
            bindGroupLayouts: [bindGroupLayout],
        }),
        compute: {
            module: shaderModule,
            entryPoint: 'main',
            constants: {
                workGroupSizeX: workGroupSize[0],
                workGroupSizeY: workGroupSize[1],
                workGroupSizeZ: workGroupSize[2],
                windowSize,
            },
        },
    });
    const numWorkGroups = [
        Math.ceil(columns / workGroupSize[0]),
        Math.ceil(rows / workGroupSize[1]),
        Math.ceil(numSlices / workGroupSize[2]),
    ];
    const gpuUpdatedVoxelsCounterStagingBuffer = device.createBuffer({
        size: UPDATED_VOXELS_COUNTER_BUFFER_SIZE,
        usage: GPUBufferUsage.MAP_READ | GPUBufferUsage.COPY_DST,
    });
    const limitProcessingTime = maxProcessingTime
        ? performance.now() + maxProcessingTime
        : 0;
    let currentInspectionNumCyclesInterval = inspection.numCyclesInterval;
    let belowThresholdCounter = 0;
    for (let i = 0; i < numIterations; i++) {
        paramsArrayValues[numIterationIndex] = i;
        device.queue.writeBuffer(gpuParamsBuffer, 0, paramsArrayValues);
        const commandEncoder = device.createCommandEncoder();
        const passEncoder = commandEncoder.beginComputePass();
        passEncoder.setPipeline(pipeline);
        passEncoder.setBindGroup(0, bindGroups[i % 2]);
        passEncoder.dispatchWorkgroups(numWorkGroups[0], numWorkGroups[1], numWorkGroups[2]);
        passEncoder.end();
        commandEncoder.copyBufferToBuffer(gpuCounterBuffer, i * Uint32Array.BYTES_PER_ELEMENT, gpuUpdatedVoxelsCounterStagingBuffer, i * Uint32Array.BYTES_PER_ELEMENT, Uint32Array.BYTES_PER_ELEMENT);
        device.queue.submit([commandEncoder.finish()]);
        const inspect = i > 0 && !(i % currentInspectionNumCyclesInterval);
        if (inspect) {
            await gpuUpdatedVoxelsCounterStagingBuffer.mapAsync(GPUMapMode.READ, 0, UPDATED_VOXELS_COUNTER_BUFFER_SIZE);
            const updatedVoxelsCounterResultBuffer = gpuUpdatedVoxelsCounterStagingBuffer.getMappedRange(0, UPDATED_VOXELS_COUNTER_BUFFER_SIZE);
            const updatedVoxelsCounterBufferData = new Uint32Array(updatedVoxelsCounterResultBuffer.slice(0));
            const updatedVoxelsRatio = updatedVoxelsCounterBufferData[i] / volumePixelData.length;
            gpuUpdatedVoxelsCounterStagingBuffer.unmap();
            if (i >= 1 && updatedVoxelsRatio < inspection.threshold) {
                currentInspectionNumCyclesInterval = 1;
                belowThresholdCounter++;
                if (belowThresholdCounter === inspection.numCyclesBelowThreshold) {
                    break;
                }
            }
            else {
                currentInspectionNumCyclesInterval = inspection.numCyclesInterval;
            }
        }
        if (limitProcessingTime && performance.now() > limitProcessingTime) {
            console.warn(`Exceeded processing time limit (${maxProcessingTime})ms`);
            break;
        }
    }
    const commandEncoder = device.createCommandEncoder();
    const outputLabelmapBufferIndex = (numIterations + 1) % 2;
    const labelmapStagingBuffer = device.createBuffer({
        size: BUFFER_SIZE,
        usage: GPUBufferUsage.MAP_READ | GPUBufferUsage.COPY_DST,
    });
    const boundsStagingBuffer = device.createBuffer({
        size: BOUNDS_BUFFER_SIZE,
        usage: GPUBufferUsage.MAP_READ | GPUBufferUsage.COPY_DST,
    });
    commandEncoder.copyBufferToBuffer(gpuLabelmapBuffers[outputLabelmapBufferIndex], 0, labelmapStagingBuffer, 0, BUFFER_SIZE);
    commandEncoder.copyBufferToBuffer(gpuBoundsBuffer, 0, boundsStagingBuffer, 0, BOUNDS_BUFFER_SIZE);
    device.queue.submit([commandEncoder.finish()]);
    await labelmapStagingBuffer.mapAsync(GPUMapMode.READ, 0, BUFFER_SIZE);
    const labelmapResultBuffer = labelmapStagingBuffer.getMappedRange(0, BUFFER_SIZE);
    const labelmapResult = new Uint32Array(labelmapResultBuffer);
    labelmapData.set(labelmapResult);
    labelmapStagingBuffer.unmap();
    await boundsStagingBuffer.mapAsync(GPUMapMode.READ, 0, BOUNDS_BUFFER_SIZE);
    const boundsResultBuffer = boundsStagingBuffer.getMappedRange(0, BOUNDS_BUFFER_SIZE);
    const boundsResult = new Int32Array(boundsResultBuffer.slice(0));
    boundsStagingBuffer.unmap();
    const minX = boundsResult[0];
    const minY = boundsResult[1];
    const minZ = boundsResult[2];
    const maxX = boundsResult[3];
    const maxY = boundsResult[4];
    const maxZ = boundsResult[5];
    labelmap.voxelManager.setCompleteScalarDataArray(labelmapData);
    labelmap.voxelManager.clearBounds();
    labelmap.voxelManager.setBounds([
        [minX, maxX],
        [minY, maxY],
        [minZ, maxZ],
    ]);
}
export { runGrowCut as default, runGrowCut as run };
