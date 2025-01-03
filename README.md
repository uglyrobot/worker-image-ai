Image Description Generator API

A Cloudflare Worker-based API that generates detailed image descriptions and alt text using Google’s Gemini AI. This tool processes image URLs and provides concise alt text and comprehensive descriptions, improving image accessibility and searchability.

Features
	•	🔒 Secure Authentication: API key required for all requests.
	•	🖼️ Format Support: Handles JPEG, PNG, WebP, HEIC, and HEIF images.
	•	💨 Fast and Efficient: Responses are cached for up to 1 year.
	•	🤖 Advanced AI: Powered by Google’s Gemini 1.5 Flash AI model.
	•	📝 Rich Output: Returns both alt text and detailed descriptions.
	•	🔄 Seamless Integration: Automatically resolves URL redirects.
	•	🌐 Global Availability: Deployed on Cloudflare’s global edge network.
	•	⚡ Low Latency: Optimized for quick responses.
	•	💾 Persistent Caching: Utilizes KV storage for consistent performance.

API Reference

Get Image Description

Endpoint:
GET /{encoded_image_url}

Headers:
	•	X-API-Key: Your API authentication key (required).

URL Parameters:
	•	encoded_image_url: URL-encoded image link for analysis.

Example Request:
```bash
curl -X GET "https://your-worker.workers.dev/https%3A%2F%2Fexample.com%2Fimage.jpg" \
-H "X-API-Key: your_api_key"
```

Sample Response:
```json
{
  "alt_text": "A red car parked in front of a modern building",
  "description": "This image shows a bright red Tesla Model 3 electric vehicle positioned in front of a glass-fronted contemporary office building. The car is photographed from a three-quarter front angle, highlighting its sleek aerodynamic design. The building behind features floor-to-ceiling windows and modern architectural elements. The lighting suggests this photo was taken during early morning or late afternoon hours."
}
```

Error Responses:
	•	401 Unauthorized
```json 
{ "error": "Unauthorized - Invalid API key" }
```

	•	400 Bad Request
```json
{ "error": "Image URL is required" }
```

	•	415 Unsupported Media Type
```json
{ "error": "Unsupported image format. Only JPEG, PNG, WebP, HEIC, and HEIF images are supported." }
```

	•	500 Internal Server Error
```json
{ "error": "Error message details" }
```

Setup and Deployment
	1.	Clone Repository:
Clone this repository to your local environment.
	2.	Install Dependencies:
Ensure all required dependencies are installed. with `npm install`
	3.	Environment Configuration:
Set up the following environment variables in your Cloudflare Workers settings:
	•	API_KEY: API key for client authentication.
	•	GEMINI_API_KEY: Your Google Gemini AI API key.
	•	IMAGE_ANALYSIS: KV namespace for caching.
	4.	Deploy to Cloudflare Workers:
Deploy the code using Cloudflare’s CLI or dashboard.

Development

Start a development server for testing and debugging:
```bash
npm run dev
```

Caching
	•	Successful Responses: Cached for 1 year.
	•	4xx Errors: Cached for 30 days.
	•	Cached Results: Returned instantly if available.

Rate Limiting

The API usage is subject to:
	•	Cloudflare Workers limitations.
	•	Google Gemini AI API rate limits.
	•	Limits imposed by the image source server.