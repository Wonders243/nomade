import { MetadataRoute } from "next";
import { getCollections } from "@/lib/collections/queries";
import { getProductsList } from "@/lib/products/queries";
import { getProductRoute } from "@/lib/products/routing";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "https://scolta.nomade-artisan.fr";
  const now = new Date();

  const staticUrls: MetadataRoute.Sitemap = [
    {
      url: baseUrl,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 1,
    },

    {
      url: `${baseUrl}/boutique`,
      lastModified: now,
      changeFrequency: "daily",
      priority: 0.9,
    },

    {
      url: `${baseUrl}/histoire`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.6,
    },

    {
      url: `${baseUrl}/contact`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.5,
    },

    {
      url: `${baseUrl}/faq`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.5,
    },

    {
      url: `${baseUrl}/livraison`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.4,
    },

    {
      url: `${baseUrl}/cgv`,
      lastModified: now,
      changeFrequency: "yearly",
      priority: 0.3,
    },

    {
      url: `${baseUrl}/confidentialite`,
      lastModified: now,
      changeFrequency: "yearly",
      priority: 0.3,
    },

    {
      url: `${baseUrl}/mentions-legales`,
      lastModified: now,
      changeFrequency: "yearly",
      priority: 0.3,
    },
  ];

  try {
    const [collections, { data: products }] = await Promise.all([
      getCollections(),
      getProductsList({
        page: 1,
        pageSize: 1000,
        status: "active",
        sortField: "created_at",
        sortDirection: "desc",
      }),
    ]);

    const collectionUrls: MetadataRoute.Sitemap = collections.map((collection) => ({
      url: `${baseUrl}/boutique/collection/${collection.slug}`,
      lastModified: collection.created_at ? new Date(collection.created_at) : now,
      changeFrequency: "weekly",
      priority: 0.8,
    }));

    const productUrls: MetadataRoute.Sitemap = products.map((product) => ({
      url: `${baseUrl}${getProductRoute(product)}`,
      lastModified: product.created_at ? new Date(product.created_at) : now,
      changeFrequency: "weekly" as const,
      priority: 0.8,
    }));

    return [...staticUrls, ...collectionUrls, ...productUrls];
  } catch {
    return staticUrls;
  }
}