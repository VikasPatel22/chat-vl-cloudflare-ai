// ============================================================
// Cloudflare AI Worker
// Models:
//   Text  → @cf/meta/llama-3.3-70b-instruct-fp8-fast
//   Vision → @cf/llava-hf/llava-1.5-7b-hf
// ============================================================

const TEXT_MODEL   = "@cf/meta/llama-3.3-70b-instruct-fp8-fast";
const VISION_MODEL = "@cf/llava-hf/llava-1.5-7b-hf";

const CORS = {
  "Access-Control-Allow-Origin":  "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

// ── Helpers ──────────────────────────────────────────────────

function json(data, status = 200, extra = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", ...CORS, ...extra },
  });
}

function err(message, status = 400) {
  return json({ success: false, error: message }, status);
}

/** Decode any image input → plain number[] for Cloudflare AI */
async function decodeImage(image) {
  let bytes;

  if (image.startsWith("data:")) {
    // Data URL  e.g. "data:image/png;base64,..."
    const base64 = image.split(",")[1];
    if (!base64) throw new Error("Invalid data URL");
    bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));

  } else if (image.startsWith("http://") || image.startsWith("https://")) {
    // Remote URL
    const res = await fetch(image);
    if (!res.ok) throw new Error(`Failed to fetch image (${res.status})`);
    bytes = new Uint8Array(await res.arrayBuffer());

  } else {
    // Assume raw base64
    bytes = Uint8Array.from(atob(image), (c) => c.charCodeAt(0));
  }

  // Cloudflare AI requires a plain number array, not a Uint8Array
  return Array.from(bytes);
}

// ── Main handler ─────────────────────────────────────────────

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // CORS preflight
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: CORS });
    }

    // Auth
    const API_KEY = env.API_KEY;
    const auth    = request.headers.get("Authorization") ?? "";
    if (!API_KEY || auth !== `Bearer ${API_KEY}`) {
      return err("Unauthorized", 401);
    }

    // Route — only POST /
    if (request.method !== "POST" || url.pathname !== "/") {
      return err("Method or path not allowed", 405);
    }

    // Parse body
    let body;
    try {
      body = await request.json();
    } catch {
      return err("Invalid JSON body", 400);
    }

    const {
      prompt,
      systemPrompt,
      history    = [],
      image,
      stream     = false,
      temperature = 0.7,
      top_p       = 0.9,
      max_tokens  = 4096,
    } = body;

    if (!prompt || typeof prompt !== "string") {
      return err("prompt is required and must be a string", 400);
    }

    // ── Vision mode ────────────────────────────────────────────
    if (image) {
      let imageArray;
      try {
        imageArray = await decodeImage(image);
      } catch (e) {
        return err(`Image decode failed: ${e.message}`, 400);
      }

      let aiResponse;
      try {
        aiResponse = await env.AI.run(VISION_MODEL, {
          prompt,
          image:      imageArray,   // ← plain number[], not Uint8Array
          max_tokens,
          temperature,
          top_p,
        });
      } catch (e) {
        return err(`Vision model error: ${e.message}`, 500);
      }

      return json({
        success:    true,
        model_used: VISION_MODEL,
        response:
          aiResponse.description ??
          aiResponse.response    ??
          aiResponse.result      ??
          aiResponse,
      });
    }

    // ── Text mode ──────────────────────────────────────────────
    const messages = [];

    if (systemPrompt && typeof systemPrompt === "string") {
      messages.push({ role: "system", content: systemPrompt });
    }

    if (Array.isArray(history) && history.length > 0) {
      messages.push(...history);
    }

    messages.push({ role: "user", content: prompt });

    // Streaming
    if (stream) {
      let aiStream;
      try {
        aiStream = await env.AI.run(TEXT_MODEL, {
          messages,
          stream:     true,
          max_tokens,
          temperature,
          top_p,
        });
      } catch (e) {
        return err(`Stream error: ${e.message}`, 500);
      }

      return new Response(aiStream, {
        status:  200,
        headers: {
          ...CORS,
          "Content-Type":  "text/event-stream",
          "Cache-Control": "no-cache",
          "Connection":    "keep-alive",
          "X-Model-Used":  TEXT_MODEL,
        },
      });
    }

    // Non-streaming
    let aiResponse;
    try {
      aiResponse = await env.AI.run(TEXT_MODEL, {
        messages,
        max_tokens,
        temperature,
        top_p,
      });
    } catch (e) {
      return err(`Text model error: ${e.message}`, 500);
    }

    return json({
      success:    true,
      model_used: TEXT_MODEL,
      response:
        aiResponse.response    ??
        aiResponse.result      ??
        aiResponse.output_text ??
        aiResponse,
    });
  },
};
