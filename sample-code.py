import requests
import base64

API_URL = "https://your-worker-domain.com/"  # 🔗 Your Worker URL
API_KEY = "YOUR_API_KEY_HERE"                # 🔐 Your API key

# --------------- CONFIG -----------------
prompt = "Describe a futuristic city at sunset"
system_prompt = "You are a helpful AI assistant."
image_path = None  # "image.jpg" if you want to send an image
stream = False     # True to enable streaming
# ----------------------------------------

body = {
    "prompt": prompt,
    "systemPrompt": system_prompt,
    "stream": stream,
}

# If sending an image
if image_path:
    with open(image_path, "rb") as f:
        encoded = base64.b64encode(f.read()).decode("utf-8")
        body["image"] = f"data:image/jpeg;base64,{encoded}"

headers = {
    "Content-Type": "application/json",
    "Authorization": f"Bearer {API_KEY}",
}

try:
    response = requests.post(API_URL, json=body, headers=headers, stream=stream)
    response.raise_for_status()

    if stream:
        # Streaming response line by line
        print("Streaming output:")
        for line in response.iter_lines():
            if line:
                print(line.decode("utf-8"), end="\n")
    else:
        data = response.json()
        print("AI Response:", data.get("response"))

        # If vision mode returns an image in base64
        if data.get("response") and "data:image" in data["response"]:
            header, encoded_img = data["response"].split(",", 1)
            img_bytes = base64.b64decode(encoded_img)
            with open("ai_output.jpg", "wb") as f:
                f.write(img_bytes)
            print("✅ Image saved as ai_output.jpg")

except requests.exceptions.HTTPError as e:
    try:
        err = response.json()
        print("Error:", err.get("error"), "-", err.get("details"))
    except:
        print("HTTP Error:", e)
except Exception as e:
    print("Failed:", e)
