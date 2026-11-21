let generator = null;
let busy = false;

self.onmessage = async (event) => {
  const { id, type, messages } = event.data || {};
  try {
    if (type === "load") {
      if (generator) {
        self.postMessage({ id, type: "loaded" });
        return;
      }
      self.postMessage({ id, type: "progress", text: "Starting model in background…" });
      let lib;
      try {
        lib = await import("https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.8.1");
      } catch {
        lib = await import("https://esm.sh/@huggingface/transformers@3.8.1?bundle");
      }
      const { pipeline, env } = lib;
      if (typeof pipeline !== "function" || !env) throw new Error("Transformers.js failed to initialize.");
      env.allowLocalModels = false;
      env.allowRemoteModels = true;
      env.useBrowserCache = true;
      env.useWasmCache = true;
      if (env.backends?.onnx?.wasm) {
        env.backends.onnx.wasm.numThreads = 1;
        env.backends.onnx.wasm.proxy = false;
      }
      generator = await pipeline("text-generation", "onnx-community/SmolLM2-135M-Instruct-ONNX-MHA", {
        device: "wasm",
        dtype: "q4",
        progress_callback: (p) => {
          let text = "Loading model files…";
          if (p?.status === "progress" && Number.isFinite(p.progress)) text = "Downloading " + (p.file || "model") + " · " + Math.round(p.progress) + "%";
          else if (p?.status === "initiate") text = "Starting download: " + (p.file || "model") + "…";
          else if (p?.status === "done") text = "Downloaded " + (p.file || "model") + "; preparing…";
          self.postMessage({ id, type: "progress", text });
        }
      });
      if (typeof generator !== "function") throw new Error("Text-generation pipeline did not initialize.");
      self.postMessage({ id, type: "loaded" });
      return;
    }
    if (type === "generate") {
      if (!generator) throw new Error("The local model is not loaded.");
      if (busy) throw new Error("The model is already generating a reply.");
      busy = true;
      try {
        const result = await generator(messages, {
          max_new_tokens: 64,
          num_beams: 1,
          do_sample: false,
          repetition_penalty: 1.03,
          return_full_text: false
        });
        const value = result?.[0]?.generated_text;
        let answer = "";
        if (typeof value === "string") answer = value;
        else if (Array.isArray(value)) {
          const last = value[value.length - 1];
          answer = typeof last?.content === "string" ? last.content : "";
        }
        answer = answer.trim();
        if (!answer) throw new Error("The local model returned an empty answer.");
        self.postMessage({ id, type: "result", answer });
      } finally {
        busy = false;
      }
    }
  } catch (error) {
    self.postMessage({ id, type: "error", error: String(error?.message || error) });
  }
};
