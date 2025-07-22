import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // We are not processing the image for now, just checking the connection.
    console.log("Simplified test function invoked to check client-server connection.");
    
    // Pretend to do some work for 1 second to simulate a process
    await new Promise(resolve => setTimeout(resolve, 1000));

    // We can check if image data is received, but we won't process it.
    const body = await req.json().catch(() => ({}));
    if (body.image) {
      console.log("Image data was received by the test function.");
    } else {
      console.log("No image data received, but that's okay for this test.");
    }

    // Always return a success message for this test
    return new Response(JSON.stringify({ message: "Test successful! Connection to server is working." }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error("Error in test function:", error);
    return new Response(JSON.stringify({ error: "Test function failed: " + error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});