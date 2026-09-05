"use client";

import { Dispatch, SetStateAction, useRef, useState } from "react";
import Image from "next/image";
import { ImagePlus, Star, Trash2, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

import {
  ProductFormState,
  ProductImageFile,
} from "../types";

import { processImages, getCompressionStats } from "@/lib/products/image-processor";

interface ProductMediaProps {
  product: ProductFormState;
  setProduct: Dispatch<SetStateAction<ProductFormState>>;
}

export default function ProductMedia({
  product,
  setProduct,
}: ProductMediaProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [compressionStats, setCompressionStats] = useState<string | null>(null);
  const [pendingImageId, setPendingImageId] = useState<string | null>(null);
  const [isRemovingImage, setIsRemovingImage] = useState(false);

  async function handleFiles(
    event: React.ChangeEvent<HTMLInputElement>
  ) {
    const files = Array.from(event.target.files ?? []);
    if (files.length === 0) return;

    setIsProcessing(true);
    setCompressionStats(null);

    try {
      // Filtrer seulement les images
      const imageFiles = files.filter((f) => f.type.startsWith("image/"));

      // Compresser et convertir en WebP
      const processedFiles = await processImages(imageFiles);

      // Stats de compression
      const stats = getCompressionStats(imageFiles, processedFiles);
      setCompressionStats(
        `${files.length} image(s) compressée(s) : ${stats.originalSize} → ${stats.compressedSize} (${stats.savedPercent}% économisé)`
      );

      // Créer les previews
      const newImages: ProductImageFile[] = processedFiles.map((file, index) => ({
        id: crypto.randomUUID(),
        file,
        preview: URL.createObjectURL(file),
        isCover: product.images.length === 0 && index === 0,
      }));

      setProduct((prev) => ({
        ...prev,
        images: [...prev.images, ...newImages],
      }));
    } catch (error) {
      console.error("Error processing images:", error);
      
      // Fallback : ajouter les fichiers sans compression
      const newImages: ProductImageFile[] = files.map((file, index) => ({
        id: crypto.randomUUID(),
        file,
        preview: URL.createObjectURL(file),
        isCover: product.images.length === 0 && index === 0,
      }));

      setProduct((prev) => ({
        ...prev,
        images: [...prev.images, ...newImages],
      }));
    } finally {
      setIsProcessing(false);
      event.target.value = "";
    }
  }

  function removeImage(id: string) {
    setIsRemovingImage(true);
    try {
      setProduct((prev) => {
        const images = prev.images.filter((image) => image.id !== id);

        if (images.length > 0 && !images.some((i) => i.isCover)) {
          images[0].isCover = true;
        }

        return {
          ...prev,
          images,
        };
      });
    } finally {
      setPendingImageId(null);
      setIsRemovingImage(false);
    }
  }

  function setCover(id: string) {
    setProduct((prev) => ({
      ...prev,
      images: prev.images.map((image) => ({
        ...image,
        isCover: image.id === id,
      })),
    }));
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Médias</CardTitle>
      </CardHeader>

      <CardContent className="space-y-6">
        <input
          ref={inputRef}
          type="file"
          hidden
          multiple
          accept="image/*"
          onChange={handleFiles}
        />

        <div className="flex items-center gap-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => inputRef.current?.click()}
            disabled={isProcessing}
          >
            {isProcessing ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <ImagePlus className="mr-2 h-4 w-4" />
            )}
            {isProcessing ? "Compression en cours..." : "Ajouter des images"}
          </Button>

          {compressionStats && (
            <p className="text-sm text-muted-foreground">{compressionStats}</p>
          )}
        </div>

        {product.images.length > 0 && (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {product.images.map((image) => (
              <div
                key={image.id}
                className="overflow-hidden rounded-xl border bg-card"
              >
                <div className="relative aspect-square">
                  <Image
                    src={image.preview}
                    alt="Produit"
                    fill
                    className="object-cover"
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                  />
                  
                  <div className="absolute top-2 left-2 bg-black/70 text-white text-xs px-2 py-1 rounded">
                    WebP
                  </div>
                </div>

                <div className="space-y-2 p-3">
                  <Button
                    type="button"
                    className="w-full"
                    variant={image.isCover ? "default" : "outline"}
                    onClick={() => setCover(image.id)}
                  >
                    <Star className="mr-2 h-4 w-4" />
                    {image.isCover
                      ? "Image de couverture"
                      : "Définir comme couverture"}
                  </Button>

                  <Button
                    type="button"
                    variant="destructive"
                    className="w-full"
                    onClick={() => setPendingImageId(image.id)}
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Supprimer
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>

      <AlertDialog
        open={pendingImageId !== null}
        onOpenChange={(open) => {
          if (!open) setPendingImageId(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer cette image ?</AlertDialogTitle>
            <AlertDialogDescription>
              La suppression est immédiate et cette image ne sera plus associée au produit.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isRemovingImage}>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (pendingImageId) removeImage(pendingImageId);
              }}
              disabled={isRemovingImage}
              className="bg-destructive"
            >
              {isRemovingImage ? "Suppression..." : "Supprimer"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}