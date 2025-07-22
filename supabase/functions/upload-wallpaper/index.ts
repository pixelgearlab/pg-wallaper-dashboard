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
    if (!imgbbApiKey) throw new Error("ImgBB API key is not set. Please check your Supabase secrets.");

    const { image, name, tags } = await req.json();
    if (!image) throw new Error("No image data provided in the request.");
    if (!name) throw new Error("Wallpaper name is required.");

    const imageParts = image.match(/^data:(image\/.+);base64,(.+)$/);
    if (!imageParts || imageParts.length !== 3) {
      throw new Error("Invalid base64 image format. Expected a data URL.");
    }
    const base64Data = imageParts[2];

    // Step 1: Upload to ImgBB
    let imageUrl, thumbUrl;
    try {
      const formData = new FormData();
      formData.append("image", base64Data);
      const imgbbRes = await fetch(`https://api.imgbb.com/1/upload?key=${imgbbApiKey}`, {
        method: "POST",
        body: formData,
      });
      const imgbbText = await imgbbRes.text();
      if (!imgbbRes.ok) throw new Error(`API returned status ${imgbbRes.status}. Response: ${imgbbText}`);
      
      const imgbbData = JSON.parse(imgbbText);
      if (!imgbbData.success) throw new Error(`API returned an error: ${imgbbData.error?.message || 'Unknown error'}`);
      
      imageUrl = imgbbData.data.url;
      thumbUrl = imgbbData.data.thumb.url;
    } catch (e) {
      console.error("ImgBB Upload failed:", e);
      throw new Error(`Image hosting failed: ${e.message}`);
    }

    // Step 2: Insert into Supabase
    try {
      const supabaseClient = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
      const { error: dbError } = await supabaseClient.from("wallpapers").insert({ 
        name, 
        tags: tags || [], // Ensure tags is an array
        image_url: imageUrl, 
        thumb_url: thumbUrl 
      });
      if (dbError) throw dbError;
    } catch (e) {
      console.error("Database insert failed:", e);
      throw new Error(`Database save failed: ${e.message}`);
    }

    return new Response(JSON.stringify({ message: "Wallpaper uploaded successfully!" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error("Error in upload function:", error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});