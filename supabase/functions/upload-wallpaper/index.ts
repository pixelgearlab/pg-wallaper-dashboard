import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("Upload function invoked (simplified version).");

    const imgbbApiKey = Deno.env.get("IMGBB_API_KEY");
    if (!imgbbApiKey) {
      console.error("IMGBB_API_KEY is not set.");
      throw new Error("API key for ImgBB is not set in Supabase secrets.");
    }
    console.log("ImgBB API key found.");

    const { image } = await req.json();
    if (!image) {
      throw new Error("No image data provided.");
    }
    console.log("Image data received.");
    
    const parts = image.split(",");
    if (parts.length !== 2) {
      throw new Error("Invalid base64 image format.");
    }
    const base64Data = parts[1];

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

    // Using placeholder data instead of Gemini analysis
    const name = "New Wallpaper";
    const tags = "uploaded";
    console.log(`Using placeholder data: Name - ${name}, Tags - ${tags}`);

    // Step 2: Insert into Supabase
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

    return new Response(JSON.stringify({ message: "Wallpaper uploaded successfully!" }), {
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