import {
  getProductById,
  getProductBySlug,
  getProductsList,
  getProductRating,
} from "@/lib/products/queries";
import { getProductRoute } from "@/lib/products/routing";
import { notFound } from "next/navigation";
import ProductClient from "./ProductClient";
import type { Metadata } from "next";
export const revalidate = 20;

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const productBySlug = await getProductBySlug(slug);
  const product =
    productBySlug ||
    (Number.isInteger(Number(slug)) ? await getProductById(Number(slug)) : null);

  if (!product || product.status !== "active") {
    return {
      title: "Produit introuvable",
      robots: {
        index: false,
        follow: false,
      },
    };
  }

  const canonicalPath = getProductRoute(product);
  const title = `${product.name} | Boutique`;
  const description = product.description?.trim().length
    ? product.description.slice(0, 160)
    : `Découvrez ${product.name}, une pièce de maroquinerie SCOLTA by Nomade.`;

  return {
    title,
    description,
    alternates: {
      canonical: canonicalPath,
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
      title: `${product.name} | SCOLTA by Nomade`,
      description,
      url: canonicalPath,
      type: "website",
      images: product.images?.length
        ? [
            {
              url: product.images[0].image_url,
              alt: product.name,
            },
          ]
        : undefined,
    },
  };
}

export default async function ProductPage({ params }: Props) {
  const { slug } = await params;
  const productBySlug = await getProductBySlug(slug);
  const productRecord =
    productBySlug ||
    (Number.isInteger(Number(slug)) ? await getProductById(Number(slug)) : null);

  if (!productRecord) notFound();

  const [product, ratingData] = await Promise.all([
    Promise.resolve(productRecord),
    getProductRating(productRecord.id),
  ]);

  const { data: relatedData } = await getProductsList({
    pageSize: 4,
    status: "active",
    category: product.category?.slug || "all",
  });

  const formattedProduct = {
    id: product.id,
    slug: product.slug || String(product.id),
    name: product.name,
    price: product.price,
    images: product.images?.map((img: any) => img.image_url) || [],
    description: product.description,
    details: product.details || [],
    category: product.category?.name || "",
    stock: product.stock,
    rating: ratingData.rating,
    reviews: ratingData.reviews,
    isNew: product.is_new,
  };

  const relatedProducts = relatedData
    .filter((p) => p.id !== product.id)
    .slice(0, 3)
    .map((p) => ({
      id: p.id,
      slug: p.slug || String(p.id),
      name: p.name,
      price: p.price,
      images: p.cover_image ? [p.cover_image] : [],
      description: "",
      details: [],
      category: p.category_name || "",
      stock: p.stock,
      rating: 5,
      reviews: 0,
      isNew: p.is_new,
    }));

  return (
    <ProductClient
      product={formattedProduct}
      relatedProducts={relatedProducts}
    />
  );
}