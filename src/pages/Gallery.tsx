import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertTriangle } from "lucide-react";

interface Wallpaper {
  id: number;
  name: string;
  image_url: string;
  thumb_url: string;
  tags: string[];
}

const Gallery = () => {
  const [wallpapers, setWallpapers] = useState<Wallpaper[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchWallpapers = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("wallpapers")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching wallpapers:", error);
        setError("Could not fetch wallpapers. Please try again later.");
      } else {
        setWallpapers(data as Wallpaper[]);
      }
      setLoading(false);
    };

    fetchWallpapers();
  }, []);

  if (loading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {Array.from({ length: 8 }).map((_, index) => (
          <Skeleton key={index} className="w-full h-48 rounded-lg" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6 text-center">Wallpaper Gallery</h1>
      {wallpapers.length === 0 ? (
        <p className="text-center text-muted-foreground">No wallpapers found. Why not upload one?</p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {wallpapers.map((wallpaper) => (
            <a key={wallpaper.id} href={wallpaper.image_url} target="_blank" rel="noopener noreferrer">
              <Card className="overflow-hidden hover:shadow-lg transition-shadow duration-300 group">
                <CardContent className="p-0">
                  <img
                    src={wallpaper.thumb_url}
                    alt={wallpaper.name || "Wallpaper"}
                    className="aspect-square w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                </CardContent>
              </Card>
            </a>
          ))}
        </div>
      )}
    </div>
  );
};

export default Gallery;