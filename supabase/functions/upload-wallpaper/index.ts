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
    console.log("Upload function invoked.");

    const imgbbApiKey = Deno.env.get("IMGBB_API_KEY");
    const geminiApiKey = Deno.env.get("GEMINI_API_KEY");
    if (!imgbbApiKey || !geminiApiKey) {
      console.error("API keys are not set.");
      throw new Error("API keys for ImgBB or Gemini are not set in Supabase secrets.");
    }
    console.log("API keys found.");

    const { image } = await req.json();
    if (!image) {
      throw new Error("No image data provided.");
    }
    console.log("Image data received.");
    
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
    console.log(`Image mime type: ${mimeType}`);

    // Step 1: Upload to ImgBB
    const formData = new FormData();
    formData.append("image", base64Data);

    console.log("Uploading to ImgBB...");
    const imgbbRes = await fetch(`https://api.imgbb.com/1/upload?key=${imgbbApiKey}`, {
      method: "POST",
      body: formData,
    });

    if (!imgbbRes.ok) {
      const errorText = await imgbbRes.text();
      console.error("ImgBB upload failed:", errorText);
      throw new Error(`ImgBB upload failed: ${errorText}`);
    }

    const imgbbData = await imgbbRes.json();
    if (!imgbbData.success) {
      console.error("ImgBB API error:", imgbbData.error);
      throw new Error(`ImgBB API returned an error: ${JSON.stringify(imgbbData.error)}`);
    }
    console.log("ImgBB upload successful.");

    const imageUrl = imgbbData.data.url;
    const thumbUrl = imgbbData.data.thumb.url;

    // Step 2: Analyze with Gemini
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

    console.log("Analyzing with Gemini...");
    const geminiRes = await fetch(`${GEMINI_API_URL}?key=${geminiApiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(geminiBody),
    });

    if (!geminiRes.ok) {
      const errorText = await geminiRes.text();
      console.error("Gemini API request failed:", errorText);
      throw new Error(`Gemini API request failed: ${errorText}`);
    }

    const geminiData = await geminiRes.json();
    console.log("Gemini response received.");

    if (!geminiData.candidates || geminiData.candidates.length === 0) {
        console.error("Gemini response has no candidates:", geminiData);
        throw new Error("Gemini did not return any candidates.");
    }

    const rawJsonText = geminiData.candidates[0].content.parts[0].text;
    let name, tags;
    try {
        const parsedJson = JSON.parse(rawJsonText);
        name = parsedJson.name;
        tags = parsedJson.tags;
        if (!name || !tags) {
            throw new Error("Parsed JSON from Gemini is missing 'name' or 'tags' keys.");
        }
    } catch (e) {
        console.error("Failed to parse JSON from Gemini:", rawJsonText, e);
        // Fallback if Gemini fails to provide valid JSON
        name = "Untitled Wallpaper";
        tags = "untagged";
    }
    console.log(`Gemini analysis result: Name - ${name}, Tags - ${tags}`);

    // Step 3: Insert into Supabase
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    console.log("Inserting into Supabase database...");
    const { error: dbError } = await supabaseClient.from("wallpapers").insert({
      name: name,
      tags: tags.split(",").map((t: string) => t.trim()),
      image_url: imageUrl,
      thumb_url: thumbUrl,
    });

    if (dbError) {
      console.error("Database insert failed:", dbError);
      throw new Error(`Database insert failed: ${dbError.message}`);
    }
    console.log("Database insert successful.");

    return new Response(JSON.stringify({ message: "Wallpaper uploaded and processed successfully!" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error("Unhandled error in edge function:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});