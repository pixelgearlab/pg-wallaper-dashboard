import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertTriangle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

interface Wallpaper {
  id: number;
  name: string;
  image_url: string;
  thumb_url: string;
  tags: string[];
}

const Gallery = () => {
  const [wallpapers, setWallpapers] = useState<Wallpaper[]>([]);
  const [filteredWallpapers, setFilteredWallpapers] = useState<Wallpaper[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
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
        const wallpapersData = data as Wallpaper[];
        setWallpapers(wallpapersData);
        setFilteredWallpapers(wallpapersData);
      }
      setLoading(false);
    };

    fetchWallpapers();
  }, []);

  useEffect(() => {
    const lowercasedTerm = searchTerm.toLowerCase().trim();
    if (!lowercasedTerm) {
      setFilteredWallpapers(wallpapers);
      return;
    }
    const results = wallpapers.filter(wallpaper => {
      const nameMatch = wallpaper.name?.toLowerCase().includes(lowercasedTerm);
      const tagMatch = wallpaper.tags?.some(tag => tag.toLowerCase().includes(lowercasedTerm));
      return nameMatch || tagMatch;
    });
    setFilteredWallpapers(results);
  }, [searchTerm, wallpapers]);

  if (loading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
        {Array.from({ length: 10 }).map((_, index) => (
          <div key={index} className="space-y-2">
            <Skeleton className="h-48 w-full rounded-lg" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
          </div>
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
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold tracking-tight">Wallpaper Gallery</h1>
        <p className="text-muted-foreground mt-2">Discover AI-generated wallpapers, curated for you.</p>
      </div>
      
      <div className="mb-8 max-w-md mx-auto">
        <Input 
          type="text"
          placeholder="Search by name or tag (e.g., 'nature', 'abstract')..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full"
        />
      </div>

      {filteredWallpapers.length === 0 ? (
        <div className="text-center py-16">
            <p className="text-lg font-semibold">No Wallpapers Found</p>
            <p className="text-muted-foreground mt-2">
            {searchTerm ? `Your search for "${searchTerm}" did not return any results.` : "Why not be the first to upload one?"}
            </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {filteredWallpapers.map((wallpaper) => (
            <a key={wallpaper.id} href={wallpaper.image_url} target="_blank" rel="noopener noreferrer" className="group block">
              <Card className="overflow-hidden hover:shadow-xl transition-shadow duration-300 h-full flex flex-col">
                <CardContent className="p-0 aspect-square">
                  <img
                    src={wallpaper.thumb_url}
                    alt={wallpaper.name || "Wallpaper"}
                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                </CardContent>
                <CardFooter className="p-3 flex flex-col items-start border-t bg-card">
                  <p className="font-semibold text-sm truncate w-full" title={wallpaper.name}>{wallpaper.name || "Untitled"}</p>
                  <div className="flex flex-wrap gap-1 mt-2">
                    {wallpaper.tags?.map((tag) => (
                      <Badge key={tag} variant="secondary" className="text-xs font-normal">{tag}</Badge>
                    ))}
                  </div>
                </CardFooter>
              </Card>
            </a>
          ))}
        </div>
      )}
    </div>
  );
};

export default Gallery;