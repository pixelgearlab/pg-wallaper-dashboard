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
    const imgbbApiKey = Deno.env.get("IMGBB_API_KEY");
    if (!imgbbApiKey) {
      throw new Error("API key for ImgBB is not set in Supabase secrets. Please add it.");
    }

    const { image } = await req.json();
    if (!image) {
      throw new Error("No image data provided.");
    }
    
    const parts = image.split(",");
    if (parts.length !== 2) {
      throw new Error("Invalid base64 image format.");
    }
    const base64Data = parts[1];

    // Step 1: Upload to ImgBB
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

    // Using placeholder data for now
    const name = "New Wallpaper";
    const tags = ["uploaded"];

    // Step 2: Insert into Supabase
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

    if (dbError) {
      throw new Error(`Database insert failed: ${dbError.message}`);
    }

    return new Response(JSON.stringify({ message: "Wallpaper uploaded successfully!" }), {
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