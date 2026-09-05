import { notFound } from "next/navigation";
import type { Metadata } from "next";
import CollectionBoutiqueClient from "./CollectionBoutiqueClient";
import { getCollections } from "@/lib/collections/queries";
import { getCategories } from "@/lib/categories/queries";
import { getProductsList } from "@/lib/products/queries";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const revalidate = 20;

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const collections = await getCollections();
  const collection = collections.find((item) => item.slug === slug);

  if (!collection) {
    return {
      title: "Collection introuvable",
      robots: {
        index: false,
        follow: false,
      },
    };
  }

  const title = `${collection.name} | Collection`;
  const description = collection.description?.trim().length
    ? collection.description
    : `Découvrez la collection ${collection.name} de SCOLTA by Nomade.`;

  return {
    title,
    description,
    alternates: {
      canonical: `/boutique/collection/${collection.slug}`,
    },
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        "max-image-preview": "large",
        "max-snippet": -1,
        "max-video-preview": -1,
      },
    },
    openGraph: {
      title: `${collection.name} | SCOLTA by Nomade`,
      description,
      url: `/boutique/collection/${collection.slug}`,
      type: "website",
    },
  };
}

function getCollectionMediaUrl(path: string | null): string {
  if (!path) return "";
  return supabaseAdmin.storage.from("collections").getPublicUrl(path).data.publicUrl;
}

export default async function CollectionPage({ params }: Props) {
  const { slug } = await params;

  const [collectionRecords, categoryRecords, productResponse] = await Promise.all([
    getCollections(),
    getCategories(),
    getProductsList({
      pageSize: 100,
      status: "active",
      collection: slug,
      sortField: "created_at",
      sortDirection: "desc",
    }),
  ]);

  const collection = collectionRecords.find((item) => item.slug === slug);
  if (!collection) notFound();

  const categories = categoryRecords
    .filter((category) => category.collection_id === collection.id)
    .map((category) => ({ slug: category.slug, name: category.name }));

  const products = productResponse.data.map((product) => ({
    id: product.id,
    name: product.name,
    price: product.price,
    images: product.cover_image ? [product.cover_image] : [],
    category: product.category_name || "",
    categorySlug: product.category_slug || "",
    collectionSlug: product.collection_slug || "",
    stock: product.stock,
  })).filter((product) => product.collectionSlug === slug);

  return (
    <CollectionBoutiqueClient
      collectionName={collection.name}
      collectionSlug={collection.slug}
      collectionDescription={collection.description}
      mediaImageUrl={getCollectionMediaUrl(collection.image_path)}
      mediaVideoUrl={getCollectionMediaUrl(collection.video_path)}
      products={products}
      categories={categories}
    />
  );
}
