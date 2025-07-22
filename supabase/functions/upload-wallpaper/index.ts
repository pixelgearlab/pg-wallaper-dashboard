import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Helper function to safely parse JSON from Gemini's response
function cleanAndParseJson(text: string): { name: string; tags: string[] } {
  // Remove markdown fences if they exist
  const cleanedText = text.replace(/```json\n|```/g, "").trim();
  try {
    return JSON.parse(cleanedText);
  } catch (e) {
    console.error("Failed to parse JSON from Gemini:", cleanedText);
    throw new Error("Could not understand the response from AI. Please try again.");
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get API keys from Supabase secrets
    const imgbbApiKey = Deno.env.get("IMGBB_API_KEY");
    const geminiApiKey = Deno.env.get("GEMINI_API_KEY");

    if (!imgbbApiKey) throw new Error("ImgBB API key is not set in Supabase secrets.");
    if (!geminiApiKey) throw new Error("Gemini API key is not set in Supabase secrets.");

    const { image } = await req.json();
    if (!image) throw new Error("No image data provided.");
    
    const parts = image.split(",");
    if (parts.length !== 2) throw new Error("Invalid base64 image format.");
    const base64Data = parts[1];

    // Step 1: Upload to ImgBB
    const formData = new FormData();
    formData.append("image", base64Data);
    const imgbbRes = await fetch(`https://api.imgbb.com/1/upload?key=${imgbbApiKey}`, {
      method: "POST",
      body: formData,
    });
    if (!imgbbRes.ok) throw new Error(`ImgBB upload failed: ${await imgbbRes.text()}`);
    const imgbbData = await imgbbRes.json();
    if (!imgbbData.success) throw new Error(`ImgBB API returned an error.`);

    const imageUrl = imgbbData.data.url;
    const thumbUrl = imgbbData.data.thumb.url;

    // Step 2: Call Gemini API to get name and tags
    const geminiPrompt = `Analyze this image and provide a suitable name and tags for a wallpaper gallery. The image URL is: ${imageUrl}. Respond with a single, clean JSON object with two keys: "name" (a creative title, 3-5 words) and "tags" (a JSON array of 3-5 relevant, single-word, lowercase tags). Do not include any other text or markdown formatting.`;
    
    const geminiRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-pro-vision:generateContent?key=${geminiApiKey}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            contents: [{ parts: [{ text: geminiPrompt }] }]
        }),
    });

    if (!geminiRes.ok) throw new Error(`Gemini API request failed: ${await geminiRes.text()}`);
    const geminiData = await geminiRes.json();
    
    const geminiText = geminiData?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!geminiText) throw new Error("Received an invalid response from the AI model.");

    const { name, tags } = cleanAndParseJson(geminiText);

    // Step 3: Insert into Supabase
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { error: dbError } = await supabaseClient.from("wallpapers").insert({
      name: name,
      tags: tags,
      image_url: imageUrl,
      thumb_url: thumbUrl,
    });

    if (dbError) throw new Error(`Database insert failed: ${dbError.message}`);

    return new Response(JSON.stringify({ message: "Wallpaper uploaded and analyzed successfully!" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error("Error in upload function:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});