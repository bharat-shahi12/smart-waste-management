import os
import requests
import json
import base64

api_key = os.getenv("AI_API_KEY", "")
url_models = f"https://generativelanguage.googleapis.com/v1beta/models?key={api_key}"

resp = requests.get(url_models)
models = resp.json().get('models', [])

dummy_image = base64.b64encode(b"dummy image data").decode('utf-8')

for m in models:
    name = m['name']
    methods = m.get('supportedGenerationMethods', [])
    if 'generateContent' in methods:
        print(f"Testing {name} with image...")
        url = f"https://generativelanguage.googleapis.com/v1beta/{name}:generateContent?key={api_key}"
        try:
            res = requests.post(url, json={
                "contents": [
                    {
                        "parts": [
                            {"text": "What is in this image?"},
                            {"inline_data": {"mime_type": "image/jpeg", "data": dummy_image}}
                        ]
                    }
                ]
            })
            if res.status_code == 200:
                print(f"SUCCESS! {name} accepts images and is working.")
                break
            else:
                print(f"Failed {name}: {res.status_code}")
        except Exception as e:
            print(f"Error {name}: {e}")
