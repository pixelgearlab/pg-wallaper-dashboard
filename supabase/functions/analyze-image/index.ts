import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function cleanAndParseJson(text: string): { name: string; tags: string[] } {
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
    const geminiApiKey = Deno.env.get("GEMINI_API_KEY");
    if (!geminiApiKey) throw new Error("Gemini API key is not set in Supabase secrets.");

    const { image } = await req.json();
    if (!image) throw new Error("No image data provided.");

    const imageParts = image.match(/^data:(image\/.+);base64,(.+)$/);
    if (!imageParts || imageParts.length !== 3) {
      throw new Error("Invalid base64 image format.");
    }
    const mimeType = imageParts[1];
    const base64Data = imageParts[2];

    const geminiPrompt = `Analyze this image and provide a suitable name and tags for a wallpaper gallery. Respond with a single, clean JSON object with two keys: "name" (a creative title, 3-5 words) and "tags" (a JSON array of 3-5 relevant, single-word, lowercase tags). Do not include any other text or markdown formatting.`;
    
    const geminiRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-pro-vision:generateContent?key=${geminiApiKey}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contents: [{ parts: [{ text: geminiPrompt }, { inline_data: { mime_type: mimeType, data: base64Data } }] }] }),
    });

    const geminiTextResponse = await geminiRes.text();
    if (!geminiRes.ok) throw new Error(`Gemini API error: ${geminiTextResponse}`);

    const geminiData = JSON.parse(geminiTextResponse);
    const geminiText = geminiData?.candidates?.[0]?.content?.parts?.[0]?.text;
    
    if (!geminiText) {
      const blockReason = geminiData?.promptFeedback?.blockReason;
      if (blockReason) throw new Error(`Content blocked by AI safety filters. Reason: ${blockReason}`);
      throw new Error("Received an empty or invalid response from the AI model.");
    }
    
    const parsedData = cleanAndParseJson(geminiText);

    return new Response(JSON.stringify(parsedData), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    console.error("Error in analyze-image function:", error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});