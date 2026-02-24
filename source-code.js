export default {
  async fetch(request, env) {
    const API_KEY = env.API_KEY;
    const url = new URL(request.url);

    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    };

    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    const auth = request.headers.get("Authorization");
    if (!auth || auth !== `Bearer ${API_KEY}`) {
      return json({ error: "Unauthorized" }, 401, corsHeaders);
    }

    if (request.method !== "POST" || url.pathname !== "/") {
      return json({ error: "Not allowed" }, 405, corsHeaders);
    }

    try {
      const body = await request.json();
      const {
        prompt,
        systemPrompt,
        history = [],
        image,
        stream = false,
        temperature = 0.7,
        top_p = 0.9
      } = body;

      if (!prompt) {
        return json({ error: "Prompt is required" }, 400, corsHeaders);
      }

      // ============================
      // 🖼 VISION MODE
      // ============================
      if (image) {
        const model = "@cf/llava-hf/llava-1.5-7b-hf";

        let imageBytes;
        if (image.startsWith("data:")) {
          const base64Data = image.split(",")[1];
          const binaryStr = atob(base64Data);
          imageBytes = new Uint8Array(binaryStr.length);
          for (let i = 0; i < binaryStr.length; i++) {
            imageBytes[i] = binaryStr.charCodeAt(i);
          }
        } else if (image.startsWith("http")) {
          const imgRes = await fetch(image);
          const arrayBuffer = await imgRes.arrayBuffer();
          imageBytes = new Uint8Array(arrayBuffer);
        } else {
          const binaryStr = atob(image);
          imageBytes = new Uint8Array(binaryStr.length);
          for (let i = 0; i < binaryStr.length; i++) {
            imageBytes[i] = binaryStr.charCodeAt(i);
          }
        }

        // Vision doesn't support streaming — use env.AI.run()
        const aiResponse = await env.AI.run(model, {
          prompt,
          image: [...imageBytes],
          max_tokens: 4096,
          temperature,
          top_p
        });

        return json({
          success: true,
          model_used: model,
          response:
            aiResponse.response ||
            aiResponse.result ||
            aiResponse.output_text ||
            aiResponse.description ||
            aiResponse
        }, 200, corsHeaders);
      }

      // ============================
      // 🧠 TEXT MODE
      // ============================
      const model = "@cf/meta/llama-3.3-70b-instruct-fp8-fast";

      const messages = [];
      if (systemPrompt) messages.push({ role: "system", content: systemPrompt });
      if (history.length > 0) messages.push(...history);
      messages.push({ role: "user", content: prompt });

      // ============================
      // 📡 STREAMING
      // ============================
      if (stream) {
        // env.AI.run() with stream:true returns a ReadableStream of SSE chunks
        const aiStream = await env.AI.run(model, {
          messages,
          stream: true,
          max_tokens: 4096,
          temperature,
          top_p
        });

        // Pipe the AI stream directly to the client
        return new Response(aiStream, {
          status: 200,
          headers: {
            ...corsHeaders,
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Model-Used": model
          }
        });
      }

      // ============================
      // 📦 NON-STREAMING (default)
      // ============================
      // Use env.AI.run() (not .stream()) for a normal awaited response
      const aiResponse = await env.AI.run(model, {
        messages,
        max_tokens: 4096,
        temperature,
        top_p
      });

      return json({
        success: true,
        model_used: model,
        response:
          aiResponse.response ||
          aiResponse.result ||
          aiResponse.output_text ||
          aiResponse
      }, 200, corsHeaders);

    } catch (err) {
      return json({
        success: false,
        error: "Generation failed",
        details: err.message
      }, 500, corsHeaders);
    }
  }
};

function json(data, status = 200, headers = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", ...headers }
  });
}
