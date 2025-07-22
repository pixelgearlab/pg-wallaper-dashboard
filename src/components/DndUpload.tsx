import { useState, useRef, DragEvent } from 'react';
import { UploadCloud, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DndUploadProps {
  onFileSelect: (file: File | null) => void;
  preview: string | null;
}

export const DndUpload = ({ onFileSelect, preview }: DndUploadProps) => {
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragEnter = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      onFileSelect(files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      onFileSelect(files[0]);
    }
  };

  const handleRemoveImage = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    onFileSelect(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <div
      className={cn(
        "relative flex flex-col items-center justify-center w-full p-6 border-2 border-dashed rounded-lg cursor-pointer transition-colors duration-300 ease-in-out",
        isDragging ? "border-primary bg-primary/10" : "border-border hover:border-primary/50 hover:bg-muted/50",
        preview ? "p-0 border-solid" : ""
      )}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      onClick={() => fileInputRef.current?.click()}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileChange}
      />
      {preview ? (
        <>
          <img src={preview} alt="Image preview" className="rounded-md max-h-60 w-full object-contain" />
          <button 
            onClick={handleRemoveImage}
            className="absolute top-2 right-2 bg-background/70 text-foreground rounded-full p-1.5 hover:bg-background transition-all"
            aria-label="Remove image"
          >
            <X className="h-5 w-5" />
          </button>
        </>
      ) : (
        <div className="text-center">
          <UploadCloud className="mx-auto h-12 w-12 text-muted-foreground" />
          <p className="mt-4 text-sm font-semibold text-foreground">
            Drag & drop your image here
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            or click to browse
          </p>
        </div>
      )}
    </div>
  );
};