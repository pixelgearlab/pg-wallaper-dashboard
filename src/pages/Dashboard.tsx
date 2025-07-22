import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { showLoading, showSuccess, showError, dismissToast } from "@/utils/toast";
import { Upload, Sparkles } from "lucide-react";
import { DndUpload } from "@/components/DndUpload";

const Dashboard = () => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [name, setName] = useState("");
  const [tags, setTags] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const navigate = useNavigate();

  const handleFileSelect = async (file: File | null) => {
    setSelectedFile(file);
    if (file) {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64String = reader.result as string;
        setPreview(base64String);
        
        setIsAnalyzing(true);
        const toastId = showLoading("Analyzing image with AI...");
        try {
          const { data, error } = await supabase.functions.invoke("analyze-image", {
            body: { image: base64String },
          });

          if (error) throw error;

          setName(data.name || "");
          setTags(data.tags?.join(", ") || "");
          dismissToast(toastId);
          showSuccess("Analysis complete!");
        } catch (error: any) {
          dismissToast(toastId);
          showError(error.message || "AI analysis failed.");
          console.error("Analysis error:", error);
        } finally {
          setIsAnalyzing(false);
        }
      };
      reader.readAsDataURL(file);
    } else {
      setPreview(null);
      setName("");
      setTags("");
    }
  };

  const handleUpload = async () => {
    if (!selectedFile || !preview) {
      showError("Please select a file first.");
      return;
    }
    if (!name.trim()) {
      showError("Please provide a name for the wallpaper.");
      return;
    }

    setIsUploading(true);
    const toastId = showLoading("Uploading wallpaper...");

    const tagArray = tags.split(',').map(tag => tag.trim()).filter(tag => tag);

    try {
      const { data, error } = await supabase.functions.invoke("upload-wallpaper", {
        body: { 
          image: preview,
          name: name,
          tags: tagArray
        },
      });

      if (error) throw error;

      dismissToast(toastId);
      showSuccess(data.message || "Wallpaper uploaded successfully!");
      handleFileSelect(null);
      
      setTimeout(() => {
        navigate("/");
      }, 1000);

    } catch (error: any) {
      dismissToast(toastId);
      console.error("Upload failed:", error);
      showError(error.message || "Failed to upload wallpaper.");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="flex justify-center py-12 px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="w-full max-w-lg"
      >
        <Card className="w-full">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-6 w-6 text-primary" />
              AI-Powered Upload
            </CardTitle>
            <CardDescription>
              Drop an image and let AI generate a name and tags for you.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid w-full items-center gap-6">
              <div className="flex flex-col space-y-1.5">
                <Label>Image</Label>
                <DndUpload onFileSelect={handleFileSelect} preview={preview} />
              </div>
              <div className="flex flex-col space-y-1.5">
                <Label htmlFor="wallpaper-name">Name</Label>
                <Input id="wallpaper-name" type="text" placeholder={isAnalyzing ? "AI is thinking..." : "e.g., Sunset Over Mountains"} value={name} onChange={(e) => setName(e.target.value)} required disabled={isAnalyzing} />
              </div>
              <div className="flex flex-col space-y-1.5">
                <Label htmlFor="wallpaper-tags">Tags (comma-separated)</Label>
                <Input id="wallpaper-tags" type="text" placeholder={isAnalyzing ? "AI is thinking..." : "e.g., nature, sunset, mountains"} value={tags} onChange={(e) => setTags(e.target.value)} disabled={isAnalyzing} />
              </div>
              <Button onClick={handleUpload} disabled={isUploading || isAnalyzing || !selectedFile || !name.trim()} className="w-full mt-2">
                {isUploading ? "Uploading..." : (isAnalyzing ? "Analyzing..." : <><Upload className="mr-2 h-4 w-4" /> Upload Wallpaper</>)}
              </Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
};

export default Dashboard;