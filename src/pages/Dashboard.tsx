import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { showLoading, showSuccess, showError, dismissToast } from "@/utils/toast";
import { Upload } from "lucide-react";

const Dashboard = () => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [name, setName] = useState("");
  const [tags, setTags] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const navigate = useNavigate();

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      const file = event.target.files[0];
      setSelectedFile(file);
      setPreview(URL.createObjectURL(file));
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      showError("Please select a file first.");
      return;
    }
    if (!name.trim()) {
      showError("Please provide a name for the wallpaper.");
      return;
    }

    setIsUploading(true);
    const toastId = showLoading("Uploading wallpaper...");

    const reader = new FileReader();
    reader.readAsDataURL(selectedFile);
    reader.onloadend = async () => {
      const base64String = reader.result as string;
      const tagArray = tags.split(',').map(tag => tag.trim()).filter(tag => tag);

      try {
        const { data, error } = await supabase.functions.invoke("upload-wallpaper", {
          body: { 
            image: base64String,
            name: name,
            tags: tagArray
          },
        });

        if (error) {
          throw error;
        }

        dismissToast(toastId);
        showSuccess(data.message || "Wallpaper uploaded successfully!");
        setSelectedFile(null);
        setPreview(null);
        setName("");
        setTags("");
        
        const fileInput = document.getElementById('wallpaper-file') as HTMLInputElement;
        if (fileInput) {
          fileInput.value = "";
        }

        setTimeout(() => {
          navigate("/");
        }, 1000);

      } catch (error: any) {
        dismissToast(toastId);
        console.error("Upload failed:", error);
        showError(error.message || "Failed to upload wallpaper. Check console for details.");
      } finally {
        setIsUploading(false);
      }
    };
    reader.onerror = (error) => {
        dismissToast(toastId);
        showError("Failed to read file.");
        console.error("File reading error:", error);
        setIsUploading(false);
    }
  };

  return (
    <div className="flex justify-center py-12">
      <Card className="w-full max-w-lg">
        <CardHeader>
          <CardTitle>Upload Wallpaper</CardTitle>
          <CardDescription>
            Select an image and provide details to upload it to the gallery.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid w-full items-center gap-4">
            <div className="flex flex-col space-y-1.5">
              <Label htmlFor="wallpaper-file">Image</Label>
              <Input id="wallpaper-file" type="file" accept="image/*" onChange={handleFileChange} required />
            </div>
             <div className="flex flex-col space-y-1.5">
              <Label htmlFor="wallpaper-name">Name</Label>
              <Input id="wallpaper-name" type="text" placeholder="e.g., Sunset Over Mountains" value={name} onChange={(e) => setName(e.target.value)} required />
            </div>
             <div className="flex flex-col space-y-1.5">
              <Label htmlFor="wallpaper-tags">Tags (comma-separated)</Label>
              <Input id="wallpaper-tags" type="text" placeholder="e.g., nature, sunset, mountains" value={tags} onChange={(e) => setTags(e.target.value)} />
            </div>
            {preview && (
              <div className="mt-4">
                <img src={preview} alt="Image preview" className="rounded-md max-h-60 w-full object-contain" />
              </div>
            )}
            <Button onClick={handleUpload} disabled={isUploading || !selectedFile || !name.trim()} className="w-full mt-4">
              {isUploading ? "Uploading..." : <><Upload className="mr-2 h-4 w-4" /> Upload</>}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Dashboard;