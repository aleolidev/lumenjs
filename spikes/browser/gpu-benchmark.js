const MAP_SIZE = 64;
const TILE_COUNT = MAP_SIZE * MAP_SIZE;
const TARGET_SIZE = 512;
const ITERATIONS = 120;

export async function runGpuBenchmark(device) {
  const target = device.createTexture({
    size: [TARGET_SIZE, TARGET_SIZE],
    format: "rgba8unorm",
    usage: GPUTextureUsage.RENDER_ATTACHMENT
  });

  const instances = createInstances();
  const instanceBuffer = device.createBuffer({
    size: instances.byteLength,
    usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST
  });
  device.queue.writeBuffer(instanceBuffer, 0, instances);

  const mapPixels = createMapPixels();
  const mapTexture = device.createTexture({
    size: [MAP_SIZE, MAP_SIZE],
    format: "rgba8unorm",
    usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST
  });
  device.queue.writeTexture({ texture: mapTexture }, mapPixels, { bytesPerRow: MAP_SIZE * 4 }, [
    MAP_SIZE,
    MAP_SIZE
  ]);

  const instanceModule = device.createShaderModule({ code: instanceShader });
  const textureModule = device.createShaderModule({ code: textureShader });
  const instancePipeline = device.createRenderPipeline({
    layout: "auto",
    vertex: { module: instanceModule },
    fragment: { module: instanceModule, targets: [{ format: "rgba8unorm" }] },
    primitive: { topology: "triangle-list" }
  });
  const texturePipeline = device.createRenderPipeline({
    layout: "auto",
    vertex: { module: textureModule },
    fragment: { module: textureModule, targets: [{ format: "rgba8unorm" }] },
    primitive: { topology: "triangle-list" }
  });

  const instanceBindGroup = device.createBindGroup({
    layout: instancePipeline.getBindGroupLayout(0),
    entries: [{ binding: 0, resource: { buffer: instanceBuffer } }]
  });
  const textureBindGroup = device.createBindGroup({
    layout: texturePipeline.getBindGroupLayout(0),
    entries: [{ binding: 0, resource: mapTexture.createView() }]
  });

  await measure(device, target, instancePipeline, instanceBindGroup, TILE_COUNT, 5);
  await measure(device, target, texturePipeline, textureBindGroup, 1, 5);
  const instancedMs = await measure(
    device,
    target,
    instancePipeline,
    instanceBindGroup,
    TILE_COUNT,
    ITERATIONS
  );
  const textureLayerMs = await measure(
    device,
    target,
    texturePipeline,
    textureBindGroup,
    1,
    ITERATIONS
  );

  instanceBuffer.destroy();
  mapTexture.destroy();
  target.destroy();

  return {
    method: "cpu-submit-plus-queue-completion-v1",
    mapSize: MAP_SIZE,
    tileCount: TILE_COUNT,
    targetSize: TARGET_SIZE,
    iterations: ITERATIONS,
    instanced: {
      totalMs: round(instancedMs),
      averageMs: round(instancedMs / ITERATIONS),
      drawCallsPerFrame: 1,
      instanceCount: TILE_COUNT,
      uploadBytes: instances.byteLength
    },
    textureLayer: {
      totalMs: round(textureLayerMs),
      averageMs: round(textureLayerMs / ITERATIONS),
      drawCallsPerFrame: 1,
      instanceCount: 1,
      uploadBytes: mapPixels.byteLength
    }
  };
}

async function measure(device, target, pipeline, bindGroup, instances, iterations) {
  const started = performance.now();
  for (let index = 0; index < iterations; index += 1) {
    const encoder = device.createCommandEncoder();
    const pass = encoder.beginRenderPass({
      colorAttachments: [
        {
          view: target.createView(),
          clearValue: { r: 0.03, g: 0.04, b: 0.05, a: 1 },
          loadOp: "clear",
          storeOp: "store"
        }
      ]
    });
    pass.setPipeline(pipeline);
    pass.setBindGroup(0, bindGroup);
    pass.draw(6, instances);
    pass.end();
    device.queue.submit([encoder.finish()]);
  }
  await device.queue.onSubmittedWorkDone();
  return performance.now() - started;
}

function createInstances() {
  const values = new Float32Array(TILE_COUNT * 4);
  for (let index = 0; index < TILE_COUNT; index += 1) {
    const x = index % MAP_SIZE;
    const y = Math.floor(index / MAP_SIZE);
    values.set(
      [
        -1 + ((x + 0.5) * 2) / MAP_SIZE,
        -1 + ((y + 0.5) * 2) / MAP_SIZE,
        (index % 7) / 7,
        ((x + y) % 5) / 5
      ],
      index * 4
    );
  }
  return values;
}

function createMapPixels() {
  const values = new Uint8Array(TILE_COUNT * 4);
  for (let index = 0; index < TILE_COUNT; index += 1) {
    values.set([45 + (index % 120), 100 + (index % 80), 70 + (index % 100), 255], index * 4);
  }
  return values;
}

function round(value) {
  return Math.round(value * 1000) / 1000;
}

const instanceShader = `
struct Tile { position: vec2f, color: vec2f }
@group(0) @binding(0) var<storage, read> tiles: array<Tile>;

struct Output { @builtin(position) position: vec4f, @location(0) color: vec3f }

@vertex fn vertexMain(
  @builtin(vertex_index) vertexIndex: u32,
  @builtin(instance_index) instanceIndex: u32
) -> Output {
  let corners = array<vec2f, 6>(
    vec2f(-1, -1), vec2f(1, -1), vec2f(-1, 1),
    vec2f(-1, 1), vec2f(1, -1), vec2f(1, 1)
  );
  let tile = tiles[instanceIndex];
  var output: Output;
  output.position = vec4f(tile.position + corners[vertexIndex] / ${MAP_SIZE}.0, 0, 1);
  output.color = vec3f(0.2 + tile.color.x, 0.35 + tile.color.y, 0.25);
  return output;
}

@fragment fn fragmentMain(input: Output) -> @location(0) vec4f {
  return vec4f(input.color, 1);
}`;

const textureShader = `
@group(0) @binding(0) var mapTexture: texture_2d<f32>;

struct Output { @builtin(position) position: vec4f, @location(0) uv: vec2f }

@vertex fn vertexMain(@builtin(vertex_index) vertexIndex: u32) -> Output {
  let positions = array<vec2f, 6>(
    vec2f(-1, -1), vec2f(1, -1), vec2f(-1, 1),
    vec2f(-1, 1), vec2f(1, -1), vec2f(1, 1)
  );
  let position = positions[vertexIndex];
  var output: Output;
  output.position = vec4f(position, 0, 1);
  output.uv = position * vec2f(0.5, -0.5) + 0.5;
  return output;
}

@fragment fn fragmentMain(input: Output) -> @location(0) vec4f {
  let dimensions = vec2f(textureDimensions(mapTexture));
  let coordinate = vec2i(clamp(input.uv * dimensions, vec2f(0), dimensions - 1));
  return textureLoad(mapTexture, coordinate, 0);
}`;
