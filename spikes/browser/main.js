import { runGpuBenchmark } from "./gpu-benchmark.js";

/** @type {HTMLCanvasElement | null} */
const canvas = document.querySelector("#scene");
const output = document.querySelector("#capabilities");
if (!(canvas instanceof HTMLCanvasElement) || !(output instanceof HTMLElement)) {
  throw new Error("browser spike elements are missing");
}
const capabilities = await probeCapabilities(canvas);

drawFallbackScene(canvas);
output.textContent = JSON.stringify(capabilities, null, 2);
document.documentElement.dataset.ready = "true";
window.spikeResult = { capabilities, pixelSample: samplePixel(canvas, 320, 180) };

/** @param {HTMLCanvasElement} sceneCanvas */
async function probeCapabilities(sceneCanvas) {
  const result = {
    webgpu: false,
    canvas2d: Boolean(sceneCanvas.getContext("2d")),
    devicePixelRatio: window.devicePixelRatio,
    reducedMotion: matchMedia("(prefers-reduced-motion: reduce)").matches
  };

  if (!navigator.gpu) return result;

  try {
    const adapter = await navigator.gpu.requestAdapter();
    if (!adapter) return result;
    const device = await adapter.requestDevice();
    result.webgpu = true;
    result.limits = {
      maxTextureDimension2D: device.limits.maxTextureDimension2D,
      maxBindGroups: device.limits.maxBindGroups
    };
    result.features = [...device.features].sort();
    const gpuCanvas = document.querySelector("#gpu-probe");
    if (!(gpuCanvas instanceof HTMLCanvasElement)) throw new Error("GPU canvas is missing");
    const gpuContext = gpuCanvas.getContext("webgpu");
    if (!gpuContext) throw new Error("WebGPU canvas context is unavailable");
    const format = navigator.gpu.getPreferredCanvasFormat();
    gpuContext.configure({ device, format, alphaMode: "opaque" });
    const encoder = device.createCommandEncoder();
    const pass = encoder.beginRenderPass({
      colorAttachments: [
        {
          view: gpuContext.getCurrentTexture().createView(),
          clearValue: { r: 0.1, g: 0.2, b: 0.3, a: 1 },
          loadOp: "clear",
          storeOp: "store"
        }
      ]
    });
    pass.end();
    device.queue.submit([encoder.finish()]);
    await device.queue.onSubmittedWorkDone();
    result.webgpuSubmitted = true;
    result.benchmark = await runGpuBenchmark(device);
    device.destroy();
  } catch (error) {
    result.webgpuError = error instanceof Error ? error.name : "UnknownError";
  }

  return result;
}

function drawFallbackScene(target) {
  const context = target.getContext("2d");
  context.fillStyle = "#14202b";
  context.fillRect(0, 0, target.width, target.height);

  const tileWidth = 64;
  const tileHeight = 32;
  for (let y = 0; y < 8; y += 1) {
    for (let x = 0; x < 8; x += 1) {
      const screenX = 320 + ((x - y) * tileWidth) / 2;
      const screenY = 55 + ((x + y) * tileHeight) / 2;
      context.beginPath();
      context.moveTo(screenX, screenY);
      context.lineTo(screenX + tileWidth / 2, screenY + tileHeight / 2);
      context.lineTo(screenX, screenY + tileHeight);
      context.lineTo(screenX - tileWidth / 2, screenY + tileHeight / 2);
      context.closePath();
      context.fillStyle = (x + y) % 2 ? "#467a59" : "#518965";
      context.fill();
      context.strokeStyle = "#294c39";
      context.stroke();
    }
  }

  context.fillStyle = "#f0c65a";
  context.fillRect(312, 151, 16, 30);
  context.fillStyle = "#fff4bd";
  context.fillRect(315, 145, 10, 10);
}

function samplePixel(target, x, y) {
  return [...target.getContext("2d").getImageData(x, y, 1, 1).data];
}
