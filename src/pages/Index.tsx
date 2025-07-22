import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import { MadeWithDyad } from "@/components/made-with-dyad";

interface Wallpaper {
  id: number;
  name: string;
  tags: string[];
  image_url: string;
  thumb_url: string;
}

const Index = () => {
  const [wallpapers, setWallpapers] = useState<Wallpaper[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchWallpapers = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("wallpapers")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching wallpapers:", error);
      } else {
        setWallpapers(data as Wallpaper[]);
      }
      setLoading(false);
    };

    fetchWallpapers();
  }, []);

  return (
    <div className="space-y-8">
      <div className="text-center">
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Wallpaper Collection</h1>
        <p className="mt-2 text-lg text-muted-foreground">
          Browse and download high-quality wallpapers.
        </p>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="w-full h-64 rounded-lg" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {wallpapers.map((wallpaper) => (
            <Dialog key={wallpaper.id}>
              <DialogTrigger asChild>
                <Card className="overflow-hidden cursor-pointer transition-transform hover:scale-105">
                  <CardContent className="p-0">
                    <AspectRatio ratio={9 / 16}>
                      <img
                        src={wallpaper.thumb_url}
                        alt={wallpaper.name}
                        className="object-cover w-full h-full"
                      />
                    </AspectRatio>
                  </CardContent>
                </Card>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[600px]">
                <DialogHeader>
                  <DialogTitle>{wallpaper.name}</DialogTitle>
                </DialogHeader>
                <div className="my-4">
                  <img src={wallpaper.image_url} alt={wallpaper.name} className="rounded-md w-full" />
                </div>
                <div className="flex justify-end">
                  <a href={wallpaper.image_url} download target="_blank" rel="noopener noreferrer">
                    <Button>
                      <Download className="mr-2 h-4 w-4" />
                      Download
                    </Button>
                  </a>
                </div>
              </DialogContent>
            </Dialog>
          ))}
        </div>
      )}
      {wallpapers.length === 0 && !loading && (
        <div className="text-center py-16">
            <p className="text-muted-foreground">No wallpapers found. Try uploading some from the dashboard!</p>
        </div>
      )}
      <MadeWithDyad />
    </div>
  );
};

export default Index;