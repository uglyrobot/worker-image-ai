/**
 * Welcome to Cloudflare Workers! This is your first worker.
 *
 * - Run `npm run dev` in your terminal to start a development server
 * - Open a browser tab at http://localhost:8787/ to see your worker in action
 * - Run `npm run deploy` to publish your worker
 *
 * Learn more at https://developers.cloudflare.com/workers/
 */

import { GoogleGenerativeAI, SchemaType } from "@google/generative-ai";
import { validate_image_url } from './utils'; // Assuming we'll put the validation function in a separate file

export default {
  async fetch(request, env, ctx) {
    const apiKey = request.headers.get('X-API-Key');
    if (!apiKey || apiKey !== env.API_KEY) {
      return new Response(JSON.stringify({
        error: 'Unauthorized - Invalid API key'
      }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    if (request.method !== 'GET') {
      return new Response(JSON.stringify({
        error: 'Method not allowed'
      }), {
        status: 405,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    try {
      // Extract image URL from the request URL
      const url = new URL(request.url);
      const imageUrl = decodeURIComponent(url.pathname.slice(1)); // Explicitly decode the URL
      
      if (!imageUrl) {
        return new Response(JSON.stringify({
          error: 'Image URL is required'
        }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      // Log for debugging
      console.log('Decoded URL:', imageUrl);

      // Validate image URL  
      if (!validate_image_url(imageUrl)) {
        return new Response(JSON.stringify({
          error: 'Invalid image URL or unsupported image type'
        }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      // Check KV store for cached result
      const cachedResult = await env.IMAGE_ANALYSIS.get(imageUrl);
      if (cachedResult) {
        console.log(imageUrl, 'CACHE HIT');
        const parsed = JSON.parse(cachedResult);
        if (parsed.error) {
          return new Response(JSON.stringify({ error: parsed.error }), {
            status: parsed.status || 500,
            headers: { 'Content-Type': 'application/json' }
          });
        }
        return new Response(cachedResult, {
          headers: { 'Content-Type': 'application/json' }
        });
      }

      const validMimeTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif'];

      // Fetch and process image if not cached
      const imageResponse = await fetch(imageUrl, {
        headers: { 
          'Accept': validMimeTypes.join(', '),
          'Referer': new URL(imageUrl).href,
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36'
        },
        redirect: 'follow',
        cf: {
          followRedirects: true,
          maxRedirects: 2
        }
      });

      if (!imageResponse.ok) {
        // Cache permanent errors (4xx status codes) for one month
        if (imageResponse.status >= 400 && imageResponse.status < 500) {
          const errorResponse = { error: 'Failed to fetch image', status: imageResponse.status };
          await env.IMAGE_ANALYSIS.put(imageUrl, JSON.stringify(errorResponse), {
            expirationTtl: 2592000 // 30 days in seconds
          });
        }
        return new Response(JSON.stringify({
          error: `Failed to fetch image`
        }), {
          status: imageResponse.status,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      // Validate content type
      const contentType = imageResponse.headers.get('content-type');
      
      if (!validMimeTypes.includes(contentType)) {
        return new Response(JSON.stringify({
          error: 'Unsupported image format. Only JPEG, PNG, WebP, HEIC, and HEIF images are supported.'
        }), {
          status: 415,
          headers: { 'Content-Type': 'application/json' }
        });
      }
      const imageBuffer = await imageResponse.arrayBuffer();
      const base64Image = Buffer.from(imageBuffer).toString('base64');

      // Replace OpenAI initialization and chat completion with Google AI
      const genAI = new GoogleGenerativeAI(env.GEMINI_API_KEY);
      
      const schema = {
        type: SchemaType.OBJECT,
        properties: {
          alt_text: {
            type: SchemaType.STRING,
            description: "A short description of the image content for alt text"
          },
          description: {
            type: SchemaType.STRING,
            description: "A detailed description of the image content with any extracted text"
          }
        },
        required: ["alt_text", "description"]
      };

      const model = genAI.getGenerativeModel({
        model: "gemini-1.5-flash-8b",
        generationConfig: {
          responseMimeType: "application/json",
          responseSchema: schema,
        }
      });

      const prompt = `Given this image, analyze and extract the relevant content. 
      Provide a very short alt text that describes the image in a single sentence with no period.
      Also provide a detailed description that includes purpose, style, layout, all text, and any other relevant details.
      For diagrams, tables, or charts, include any text labels and their relative relationships.`;

      const result = await model.generateContent([
        {
          inlineData: {
            data: base64Image,
            mimeType: contentType,
          }
        },
        prompt
      ]);

      const response = result.response.text();
      console.log(response);
      // Parse the JSON response
      const parsedResponse = JSON.parse(response);
      if (!parsedResponse.alt_text || !parsedResponse.description) {
        throw new Error('Invalid response format from AI model');
      }

      // Cache the result in KV store (with 1 year expiration)
      await env.IMAGE_ANALYSIS.put(imageUrl, JSON.stringify(parsedResponse), {
        expirationTtl: 31536000
      });

      return new Response(JSON.stringify(parsedResponse), {
        headers: { 'Content-Type': 'application/json' }
      });
    } catch (e) {
      console.error(e);
      return new Response(JSON.stringify({ error: e.message }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  },
};