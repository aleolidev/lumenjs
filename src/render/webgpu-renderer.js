const FLOATS_PER_VERTEX = 10;
const texturePaths = {
  atlas: "/first-light/assets/lantern-vale-atlas.png",
  player: "/first-light/assets/player.png",
  mira: "/first-light/assets/mira.png"
};

const shader = `
@group(0) @binding(0) var imageTexture: texture_2d<f32>;
@group(0) @binding(1) var imageSampler: sampler;

struct VertexInput {
  @location(0) position: vec3f,
  @location(1) uv: vec2f,
  @location(2) tint: vec4f,
  @location(3) enhanced: f32,
}
struct VertexOutput {
  @builtin(position) position: vec4f,
  @location(0) uv: vec2f,
  @location(1) tint: vec4f,
  @location(2) enhanced: f32,
}
@vertex fn vertexMain(input: VertexInput) -> VertexOutput {
  var output: VertexOutput;
  output.position = vec4f(input.position, 1.0);
  output.uv = input.uv;
  output.tint = input.tint;
  output.enhanced = input.enhanced;
  return output;
}
@fragment fn fragmentMain(input: VertexOutput) -> @location(0) vec4f {
  var color = textureSample(imageTexture, imageSampler, input.uv) * input.tint;
  if (color.a < 0.08) { discard; }
  if (input.enhanced > 0.5) {
    let luminance = dot(color.rgb, vec3f(0.2126, 0.7152, 0.0722));
    let saturated = mix(vec3f(luminance), color.rgb, 1.12);
    let graded = pow(saturated, vec3f(0.92)) * vec3f(1.035, 1.015, 0.97);
    color = vec4f(graded, color.a);
  }
  return color;
}`;

export async function createWebGpuRenderer(canvas) {
  const started = performance.now();
  if (!navigator.gpu) return unsupported("WebGPU is not exposed by this browser", started);
  const adapter = await navigator.gpu.requestAdapter();
  if (!adapter) return unsupported("No WebGPU adapter is available", started);
  const device = await adapter.requestDevice();
  const gpuErrors = [];
  device.addEventListener("uncapturederror", (event) => {
    gpuErrors.push(event.error.message);
    event.preventDefault();
  });
  const context = canvas.getContext("webgpu");
  if (!context) {
    device.destroy();
    return unsupported("A WebGPU canvas context is unavailable", started);
  }

  const format = navigator.gpu.getPreferredCanvasFormat();
  const module = device.createShaderModule({ code: shader });
  const pipeline = device.createRenderPipeline({
    layout: "auto",
    vertex: {
      module,
      buffers: [
        {
          arrayStride: FLOATS_PER_VERTEX * 4,
          attributes: [
            { shaderLocation: 0, offset: 0, format: "float32x3" },
            { shaderLocation: 1, offset: 12, format: "float32x2" },
            { shaderLocation: 2, offset: 20, format: "float32x4" },
            { shaderLocation: 3, offset: 36, format: "float32" }
          ]
        }
      ]
    },
    fragment: {
      module,
      targets: [
        {
          format,
          blend: {
            color: { srcFactor: "src-alpha", dstFactor: "one-minus-src-alpha" },
            alpha: { srcFactor: "one", dstFactor: "one-minus-src-alpha" }
          }
        }
      ]
    },
    primitive: { topology: "triangle-list", cullMode: "none" },
    depthStencil: { format: "depth24plus", depthWriteEnabled: true, depthCompare: "less" }
  });
  const sampler = device.createSampler({
    magFilter: "nearest",
    minFilter: "nearest",
    mipmapFilter: "nearest",
    addressModeU: "clamp-to-edge",
    addressModeV: "clamp-to-edge"
  });
  const textureResources = await loadTextures(device, pipeline, sampler);
  let vertexBuffer = null;
  let depthTexture = null;
  let configuredWidth = 0;
  let configuredHeight = 0;
  const frameTimes = [];
  const cpuTimes = [];
  const diagnostics = {
    status: "ready",
    reason: null,
    projection: "top-down-three-quarter-v1",
    visualMode: "classic",
    initializedMs: round(performance.now() - started),
    features: [...device.features].sort(),
    limits: {
      maxTextureDimension2D: device.limits.maxTextureDimension2D,
      maxBindGroups: device.limits.maxBindGroups
    },
    textures: Object.keys(textureResources),
    gpuErrors,
    viewport: { width: 0, height: 0, devicePixelRatio: window.devicePixelRatio },
    drawCalls: 0,
    vertices: 0,
    uploadBytes: 0,
    frameMs: 0,
    medianFrameMs: 0,
    cpuSceneAndSubmitMs: 0,
    medianCpuSceneAndSubmitMs: 0,
    submittedFrames: 0
  };

  async function render(scene, sceneBuildMs = 0) {
    const frameStarted = performance.now();
    device.pushErrorScope("validation");
    const width = Math.max(1, Math.floor(canvas.clientWidth * window.devicePixelRatio));
    const height = Math.max(1, Math.floor(canvas.clientHeight * window.devicePixelRatio));
    if (width !== configuredWidth || height !== configuredHeight) {
      configuredWidth = width;
      configuredHeight = height;
      canvas.width = width;
      canvas.height = height;
      context.configure({ device, format, alphaMode: "opaque" });
      depthTexture?.destroy();
      depthTexture = device.createTexture({
        size: [width, height],
        format: "depth24plus",
        usage: GPUTextureUsage.RENDER_ATTACHMENT
      });
    }

    const geometry = createGeometry(scene, width, height);
    vertexBuffer?.destroy();
    vertexBuffer = device.createBuffer({
      size: Math.max(4, geometry.vertices.byteLength),
      usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST
    });
    device.queue.writeBuffer(vertexBuffer, 0, geometry.vertices);
    const encoder = device.createCommandEncoder();
    const pass = encoder.beginRenderPass({
      colorAttachments: [
        {
          view: context.getCurrentTexture().createView(),
          clearValue: { r: 0.025, g: 0.055, b: 0.07, a: 1 },
          loadOp: "clear",
          storeOp: "store"
        }
      ],
      depthStencilAttachment: {
        view: depthTexture.createView(),
        depthClearValue: 1,
        depthLoadOp: "clear",
        depthStoreOp: "store"
      }
    });
    pass.setPipeline(pipeline);
    pass.setVertexBuffer(0, vertexBuffer);
    for (const batch of geometry.batches) {
      pass.setBindGroup(0, textureResources[batch.texture].bindGroup);
      pass.draw(batch.vertexCount, 1, batch.firstVertex);
    }
    pass.end();
    device.queue.submit([encoder.finish()]);
    const cpuElapsed = performance.now() - frameStarted + sceneBuildMs;
    await device.queue.onSubmittedWorkDone();
    const validationError = await device.popErrorScope();
    if (validationError) gpuErrors.push(validationError.message);

    const elapsed = performance.now() - frameStarted;
    frameTimes.push(elapsed);
    cpuTimes.push(cpuElapsed);
    if (frameTimes.length > 120) frameTimes.shift();
    if (cpuTimes.length > 120) cpuTimes.shift();
    diagnostics.projection = scene.projection;
    diagnostics.visualMode = scene.visualMode;
    diagnostics.viewport = { width, height, devicePixelRatio: window.devicePixelRatio };
    diagnostics.drawCalls = geometry.batches.length;
    diagnostics.vertices = geometry.vertices.length / FLOATS_PER_VERTEX;
    diagnostics.uploadBytes = geometry.vertices.byteLength;
    diagnostics.frameMs = round(elapsed);
    diagnostics.medianFrameMs = round(median(frameTimes));
    diagnostics.cpuSceneAndSubmitMs = round(cpuElapsed);
    diagnostics.medianCpuSceneAndSubmitMs = round(median(cpuTimes));
    diagnostics.submittedFrames += 1;
    return { ...diagnostics };
  }

  return {
    status: "ready",
    diagnostics,
    render,
    destroy() {
      vertexBuffer?.destroy();
      depthTexture?.destroy();
      for (const resource of Object.values(textureResources)) resource.texture.destroy();
      device.destroy();
    }
  };
}

async function loadTextures(device, pipeline, sampler) {
  const resources = {};
  for (const [id, path] of Object.entries(texturePaths)) {
    const response = await fetch(path);
    if (!response.ok) throw new Error(`Could not load texture ${path}: HTTP ${response.status}`);
    const bitmap = await createImageBitmap(await response.blob(), {
      premultiplyAlpha: "none",
      colorSpaceConversion: "none"
    });
    const texture = device.createTexture({
      size: [bitmap.width, bitmap.height],
      format: "rgba8unorm",
      usage:
        GPUTextureUsage.TEXTURE_BINDING |
        GPUTextureUsage.COPY_DST |
        GPUTextureUsage.RENDER_ATTACHMENT
    });
    device.queue.copyExternalImageToTexture({ source: bitmap, flipY: false }, { texture }, [
      bitmap.width,
      bitmap.height
    ]);
    bitmap.close();
    resources[id] = {
      texture,
      bindGroup: device.createBindGroup({
        layout: pipeline.getBindGroupLayout(0),
        entries: [
          { binding: 0, resource: texture.createView() },
          { binding: 1, resource: sampler }
        ]
      })
    };
  }
  return resources;
}

function createGeometry(scene, width, height) {
  const grouped = { atlas: [], player: [], mira: [] };
  const scale = Math.min(width / 10, height / 7.1);
  const project = (x, y, elevation = 0) => ({
    x: width / 2 + (x - scene.camera.x) * scale,
    y: height * 0.54 + (y - scene.camera.y) * scale * 0.68 - elevation * scale * 0.72
  });
  const clip = (point, depth) => [(point.x / width) * 2 - 1, 1 - (point.y / height) * 2, 1 - depth];
  const enhanced = scene.visualMode === "enhanced" ? 1 : 0;

  for (const item of scene.items) {
    const output = grouped[item.texture];
    if (item.kind === "sprite") {
      const foot = project(item.x + 0.5, item.y + 0.92, item.elevation ?? 0);
      const halfWidth = scale * item.width * 0.5;
      const spriteHeight = scale * item.spriteHeight;
      const uv = item.texture === "atlas" ? atlasUv(item.atlas) : fullUv();
      quad(
        output,
        clip({ x: foot.x - halfWidth, y: foot.y - spriteHeight }, item.depth),
        clip({ x: foot.x + halfWidth, y: foot.y - spriteHeight }, item.depth),
        clip({ x: foot.x + halfWidth, y: foot.y }, item.depth),
        clip({ x: foot.x - halfWidth, y: foot.y }, item.depth),
        uv,
        item.tint,
        enhanced
      );
      continue;
    }

    if (item.kind === "building") {
      building(output, item, project, clip, enhanced);
      continue;
    }

    surface(output, item, project, clip, enhanced);
  }

  const all = [];
  const batches = [];
  for (const [texture, values] of Object.entries(grouped)) {
    if (values.length === 0) continue;
    const firstVertex = all.length / FLOATS_PER_VERTEX;
    all.push(...values);
    batches.push({ texture, firstVertex, vertexCount: values.length / FLOATS_PER_VERTEX });
  }
  return { vertices: new Float32Array(all), batches };
}

function surface(output, item, project, clip, enhanced) {
  const elevation = item.elevation ?? 0;
  const uv = atlasUv(item.atlas);
  quad(
    output,
    clip(project(item.x, item.y, elevation), item.depth),
    clip(project(item.x + item.width, item.y, elevation), item.depth),
    clip(project(item.x + item.width, item.y + item.height, elevation), item.depth),
    clip(project(item.x, item.y + item.height, elevation), item.depth),
    uv,
    item.tint,
    enhanced
  );
}

function building(output, item, project, clip, enhanced) {
  const roof = atlasUv(item.roofAtlas);
  const wall = atlasUv(item.wallAtlas);
  const bottomDepth = item.depth;
  const topDepth = Math.min(0.98, item.depth + 0.02);
  const bottomLeft = clip(project(item.x, item.y + item.height, 0), bottomDepth);
  const bottomRight = clip(project(item.x + item.width, item.y + item.height, 0), bottomDepth);
  const topLeft = clip(project(item.x, item.y + item.height, item.elevation), topDepth);
  const topRight = clip(
    project(item.x + item.width, item.y + item.height, item.elevation),
    topDepth
  );
  quad(output, topLeft, topRight, bottomRight, bottomLeft, wall, item.tint, enhanced);
  quad(
    output,
    clip(project(item.x, item.y, item.elevation), topDepth),
    clip(project(item.x + item.width, item.y, item.elevation), topDepth),
    topRight,
    topLeft,
    roof,
    item.tint,
    enhanced
  );
}

function atlasUv(index) {
  const column = index % 4;
  const row = Math.floor(index / 4);
  const inset = 0.0025;
  return {
    a: [column / 4 + inset, row / 4 + inset],
    b: [(column + 1) / 4 - inset, row / 4 + inset],
    c: [(column + 1) / 4 - inset, (row + 1) / 4 - inset],
    d: [column / 4 + inset, (row + 1) / 4 - inset]
  };
}

function fullUv() {
  return { a: [0, 0], b: [1, 0], c: [1, 1], d: [0, 1] };
}

function quad(output, a, b, c, d, uv, tint, enhanced) {
  const vertices = [
    [a, uv.a],
    [b, uv.b],
    [c, uv.c],
    [a, uv.a],
    [c, uv.c],
    [d, uv.d]
  ];
  for (const [point, coordinate] of vertices)
    output.push(...point, ...coordinate, ...tint, enhanced);
}

function unsupported(reason, started) {
  return {
    status: "unsupported",
    diagnostics: {
      status: "unsupported",
      reason,
      projection: "top-down-three-quarter-v1",
      visualMode: "classic",
      initializedMs: round(performance.now() - started),
      features: [],
      limits: {},
      textures: [],
      drawCalls: 0,
      vertices: 0,
      uploadBytes: 0,
      submittedFrames: 0
    },
    async render() {
      return this.diagnostics;
    },
    destroy() {}
  };
}

function median(values) {
  const sorted = [...values].sort((left, right) => left - right);
  return sorted[Math.floor(sorted.length / 2)] ?? 0;
}

function round(value) {
  return Math.round(value * 1000) / 1000;
}
