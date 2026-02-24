# 🚀 OmniEdge AI Gateway

A secure, multi-modal AI gateway built on Cloudflare Workers.

Supports:
- 🧠 Llama 3.3 (Text Generation)
- 🖼 LLaVA 1.5 (Vision + Image Understanding)
- 📡 Streaming (Server-Sent Events)
- 🔐 API Key Authentication
- 🌍 Global Edge Deployment

---

# 🌍 Live Endpoint

```
https://your_worker_domain.workers.dev/
```

---

# 🧠 Supported Modes

## 1️⃣ Text Mode (Default)
Uses:
@cf/meta/llama-3.3-70b-instruct-fp8-fast

## 2️⃣ Vision Mode
Uses:
@cf/llava-hf/llava-1.5-7b-hf

Triggered automatically when `image` is provided in request body.

## 3️⃣ Streaming Mode
Set:
```
"stream": true
```

Returns:
```
Content-Type: text/event-stream
```

---

# 🔐 Authentication

All requests must include:

```
Authorization: Bearer YOUR_API_KEY
```

Set API key in Cloudflare:

```
wrangler secret put API_KEY
```

---

# 📦 Request Format

## Method
POST

## Headers
```
Content-Type: application/json
Authorization: Bearer YOUR_API_KEY
```

---

# 🧠 Text Request Example

```json
{
  "prompt": "Explain quantum physics simply",
  "systemPrompt": "You are a helpful AI teacher",
  "history": [],
  "temperature": 0.7,
  "top_p": 0.9,
  "stream": false
}
```

---

# 🖼 Vision Request Example

```json
{
  "prompt": "Describe this image",
  "image": "BASE64_IMAGE_OR_IMAGE_URL",
  "temperature": 0.7
}
```

`image` can be:
- Base64 string
- data:image/... base64
- Direct image URL

---

# 📡 Streaming Example

```json
{
  "prompt": "Write a long essay about AI",
  "stream": true
}
```

Response:
```
Content-Type: text/event-stream
```

---

# 💻 Usage Examples

---

## 🐍 Python (Non-Streaming)

```python
import requests

url = "https://your_worker_domain.workers.dev/"
api_key = "YOUR_API_KEY"

response = requests.post(
    url,
    headers={
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json"
    },
    json={
        "prompt": "Explain black holes simply",
        "temperature": 0.7
    }
)

print(response.json())
```

---

## 🐍 Python (Streaming)

```python
import requests

url = "https://your_worker_domain.workers.dev/"
api_key = "YOUR_API_KEY"

with requests.post(
    url,
    headers={
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json"
    },
    json={
        "prompt": "Write a long article about AI",
        "stream": True
    },
    stream=True
) as r:
    for line in r.iter_lines():
        if line:
            print(line.decode())
```

---

## 🌐 JavaScript (Browser)

```javascript
async function chat() {
  const res = await fetch("https://your_worker_domain.workers.dev/", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": "Bearer YOUR_API_KEY"
    },
    body: JSON.stringify({
      prompt: "Explain AI in simple terms"
    })
  });

  const data = await res.json();
  console.log(data);
}
```

---

## 🖥 Node.js (Streaming)

```javascript
import fetch from "node-fetch";

const response = await fetch("https://your_worker_domain.workers.dev/", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "Authorization": "Bearer YOUR_API_KEY"
  },
  body: JSON.stringify({
    prompt: "Write a long blog about space",
    stream: true
  })
});

response.body.on("data", chunk => {
  console.log(chunk.toString());
});
```

---

## 💻 cURL Example

### Normal Request

```bash
curl -X POST https://your_worker_domain.workers.dev/ \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"prompt":"Explain machine learning"}'
```

### Streaming Request

```bash
curl -N -X POST https://your_worker_domain.workers.dev/ \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"prompt":"Write a long story","stream":true}'
```

---

# 📤 Response Format (Non-Streaming)

```json
{
  "success": true,
  "model_used": "model_name",
  "response": "Generated text..."
}
```

---

# ❌ Error Codes

| Status | Meaning |
|--------|---------|
| 400 | Prompt is required |
| 401 | Unauthorized |
| 405 | Not allowed |
| 500 | Generation failed |

---

# ⚙ Deployment

## 1️⃣ Install Wrangler
```
npm install -g wrangler
```

## 2️⃣ Login
```
wrangler login
```

## 3️⃣ Add Secret
```
wrangler secret put API_KEY
```

## 4️⃣ Deploy
```
wrangler deploy
```

---

# 🏗 Architecture

Client  
↓  
Cloudflare Worker (Auth + Routing)  
↓  
Cloudflare AI Runtime  
↓  
Streaming or JSON Response  

Global. Serverless. Edge-native.

---

# 🔥 Features

- Multi-modal AI
- Streaming support
- Conversation history support
- Temperature & top_p control
- Vision understanding
- Secure API authentication
- Fully CORS enabled
- Global edge performance

---

# 📜 License

MIT License

---

# 🎯 Future Roadmap

- Rate limiting middleware
- Usage analytics
- Token tracking
- API dashboard
- SDK (npm + pip)
- Model switching via request param
- Usage billing layer

---

Built for developers building intelligent edge-native systems.
