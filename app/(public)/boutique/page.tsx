import { Suspense } from "react";
import type { Metadata } from "next";
import { getProductsList } from "@/lib/products/queries";
import { getCollections } from "@/lib/collections/queries";
import BoutiqueClient from "./BoutiqueClient";

export const revalidate = 20; // Revalidation every 20 seconds

export const metadata: Metadata = {
  title: "Boutique",
  description:
    "Découvrez la boutique SCOLTA by Nomade: collections de sacs et accessoires artisanaux fabriqués en France.",
  alternates: {
    canonical: "/boutique",
  },
  openGraph: {
    title: "Boutique | SCOLTA by Nomade",
    description:
      "Explorez toutes les collections et produits de maroquinerie artisanale.",
    url: "/boutique",
    type: "website",
  },
};

export default function BoutiquePage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-8 h-8 border-2 border-stone-300 border-t-stone-700 rounded-full animate-spin" />
      </div>
    }>
      <BoutiqueContent />
    </Suspense>
  );
}

async function BoutiqueContent() {
  const [{ data }, collectionRecords] = await Promise.all([
    getProductsList({
      pageSize: 50,
      status: "active",
    }),
    getCollections(),
  ]);

  const products = data.map((p) => ({
    id: p.id,
    slug: p.slug || String(p.id),
    name: p.name,
    price: p.price,
    images: p.cover_image ? [p.cover_image] : [],
    categorySlug: p.category_slug || "",
    category: p.category_name || "",
    collectionSlug: p.collection_slug || "",
    collection: p.collection_name || "",
    isNew: p.is_new,
    rating: 0,
  }));

  const collections = [
    { id: 0, name: "Tous", slug: "all", imagePath: null, videoPath: null },
    ...collectionRecords.map((collection) => ({
      id: collection.id,
      name: collection.name,
      slug: collection.slug,
      imagePath: collection.image_path,
      videoPath: collection.video_path,
    })),
  ];

  return <BoutiqueClient products={products} collections={collections} />;
}