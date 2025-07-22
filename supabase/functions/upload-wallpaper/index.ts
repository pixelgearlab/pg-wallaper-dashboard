import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro-vision:generateContent`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const imgbbApiKey = Deno.env.get("IMGBB_API_KEY");
    const geminiApiKey = Deno.env.get("GEMINI_API_KEY");
    if (!imgbbApiKey || !geminiApiKey) {
      throw new Error("API keys for ImgBB or Gemini are not set in Supabase secrets.");
    }

    const { image } = await req.json();
    if (!image) {
      throw new Error("No image data provided.");
    }
    
    const parts = image.split(",");
    if (parts.length !== 2) {
      throw new Error("Invalid base64 image format.");
    }
    const [header, base64Data] = parts;
    const mimeTypeMatch = header.match(/:(.*?);/);
    if (!mimeTypeMatch || !mimeTypeMatch[1]) {
        throw new Error("Could not determine mime type from image data.");
    }
    const mimeType = mimeTypeMatch[1];

    const formData = new FormData();
    formData.append("image", base64Data);

    const imgbbRes = await fetch(`https://api.imgbb.com/1/upload?key=${imgbbApiKey}`, {
      method: "POST",
      body: formData,
    });

    if (!imgbbRes.ok) {
      const errorText = await imgbbRes.text();
      throw new Error(`ImgBB upload failed: ${errorText}`);
    }

    const imgbbData = await imgbbRes.json();
    if (!imgbbData.success) {
      throw new Error(`ImgBB API returned an error: ${JSON.stringify(imgbbData.error)}`);
    }

    const imageUrl = imgbbData.data.url;
    const thumbUrl = imgbbData.data.thumb.url;

    const geminiPrompt = `Analyze this image of a wallpaper. Provide a suitable title (max 10 words), and 5 relevant tags as a single comma-separated string (e.g., 'nature, sky, blue, clouds, landscape'). Respond ONLY with a valid JSON object with keys "name" and "tags". Example: {"name": "Blue Sky Landscape", "tags": "sky, blue, clouds, nature, peaceful"}`;

    const geminiBody = {
      contents: [
        {
          parts: [
            { text: geminiPrompt },
            {
              inline_data: {
                mime_type: mimeType,
                data: base64Data,
              },
            },
          ],
        },
      ],
      generationConfig: {
        "response_mime_type": "application/json",
      }
    };

    const geminiRes = await fetch(`${GEMINI_API_URL}?key=${geminiApiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(geminiBody),
    });

    if (!geminiRes.ok) {
      const errorText = await geminiRes.text();
      throw new Error(`Gemini API request failed: ${errorText}`);
    }

    const geminiData = await geminiRes.json();
    const rawJsonText = geminiData.candidates[0].content.parts[0].text;
    const { name, tags } = JSON.parse(rawJsonText);

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { error: dbError } = await supabaseClient.from("wallpapers").insert({
      name: name,
      tags: tags.split(",").map((t: string) => t.trim()),
      image_url: imageUrl,
      thumb_url: thumbUrl,
    });

    if (dbError) {
      throw new Error(`Database insert failed: ${dbError.message}`);
    }

    return new Response(JSON.stringify({ message: "Wallpaper uploaded and processed successfully!" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error(error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});