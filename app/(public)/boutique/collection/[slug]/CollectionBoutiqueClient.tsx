"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import ProductCard from "@/components/ProductCard";
import { trackEvent } from "@/lib/analytics/tracking";

interface Product {
  id: number | string;
  name: string;
  price: number;
  images: string[];
  category: string;
  categorySlug: string;
  collectionSlug?: string;
  stock?: number;
}

interface CategoryOption {
  slug: string;
  name: string;
}

interface Props {
  collectionName: string;
  collectionSlug: string;
  collectionDescription: string | null;
  mediaImageUrl: string;
  mediaVideoUrl: string;
  products: Product[];
  categories: CategoryOption[];
}

function getRowItemCounts(count: number): number[] {
  if (count <= 0) return [];
  if (count === 1) return [1];
  if (count === 2) return [2];

  const rows: number[] = [];
  const fullRows = Math.floor(count / 4);
  const remainder = count % 4;

  if (remainder === 0) {
    for (let i = 0; i < fullRows; i += 1) rows.push(4);
    return rows;
  }

  if (remainder === 1) {
    for (let i = 0; i < Math.max(0, fullRows - 1); i += 1) rows.push(4);
    rows.push(3, 2);
    return rows;
  }

  if (remainder === 2) {
    for (let i = 0; i < fullRows; i += 1) rows.push(4);
    rows.push(2);
    return rows;
  }

  for (let i = 0; i < fullRows; i += 1) rows.push(4);
  rows.push(3);
  return rows;
}

function getDesktopRowColsClass(cols: number): string {
  if (cols <= 1) return "lg:grid-cols-2";
  if (cols === 2) return "lg:grid-cols-2";
  if (cols === 3) return "lg:grid-cols-3";
  return "lg:grid-cols-4";
}

function ProductMosaic({ products }: { products: Product[] }) {
  if (products.length === 0) return null;

  const rows = useMemo(() => {
    const counts = getRowItemCounts(products.length);
    let offset = 0;
    return counts.map((count) => {
      const rowProducts = products.slice(offset, offset + count);
      offset += count;
      return rowProducts;
    });
  }, [products]);

  const compactLayout = products.length <= 2;

  return (
    <div className={`space-y-2 sm:space-y-2.5 md:space-y-3 ${compactLayout ? "max-w-5xl mx-auto" : ""}`}>
      {rows.map((rowProducts, rowIndex) => (
        <div
          key={`row-${rowIndex}`}
          className={
            compactLayout
              ? "grid grid-cols-1 gap-3 sm:grid-cols-2 md:gap-4"
              : `grid grid-cols-2 ${getDesktopRowColsClass(rowProducts.length)} gap-2 sm:gap-2.5 md:gap-3`
          }
        >
          {rowProducts.map((product) => (
            <div
              key={product.id}
              className={
                compactLayout
                  ? "flex justify-center"
                  : rowProducts.length === 1
                    ? "col-span-2 lg:col-span-2"
                    : ""
              }
            >
              <div
                className={
                  compactLayout
                    ? "w-full max-w-[420px] mx-auto"
                    : rowProducts.length === 1
                      ? "max-w-[520px] mx-auto"
                      : ""
                }
              >
                <ProductCard product={product} />
              </div>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

export default function CollectionBoutiqueClient({
  collectionName,
  collectionSlug,
  collectionDescription,
  mediaImageUrl,
  mediaVideoUrl,
  products,
  categories,
}: Props) {
  const [activeCategory, setActiveCategory] = useState<string>("all");

  useEffect(() => {
    trackEvent("collection_view", {
      page_url: window.location.pathname,
      metadata: {
        collection_name: collectionName,
        collection_slug: collectionSlug,
        category: activeCategory,
        product_count: products.length,
      },
    });
  }, [activeCategory, collectionName, collectionSlug, products.length]);

  const sortedProducts = useMemo(() => {
    const items = products.filter((product) => product.collectionSlug === collectionSlug);
    items.sort((a, b) => {
      const categoryCompare = a.categorySlug.localeCompare(b.categorySlug);
      if (categoryCompare !== 0) return categoryCompare;
      return a.name.localeCompare(b.name);
    });
    return items;
  }, [collectionSlug, products]);

  const filteredProducts = useMemo(() => {
    if (activeCategory === "all") return sortedProducts;
    return sortedProducts.filter((product) => product.categorySlug === activeCategory);
  }, [activeCategory, sortedProducts]);

  const groupedProducts = useMemo(() => {
    if (activeCategory !== "all") return [] as Array<{ category: string; items: Product[] }>;

    const groups: Array<{ category: string; items: Product[] }> = [];
    for (const product of sortedProducts) {
      const existing = groups.find((group) => group.category === product.categorySlug);
      if (existing) {
        existing.items.push(product);
      } else {
        groups.push({ category: product.categorySlug, items: [product] });
      }
    }

    return groups;
  }, [activeCategory, sortedProducts]);

  const subtitle = collectionDescription?.trim().length
    ? collectionDescription
    : "Une collection pensee pour durer.";

  const handleCategoryChange = (nextCategory: string) => {
    setActiveCategory(nextCategory);
    trackEvent("collection_category_click", {
      page_url: window.location.pathname,
      metadata: {
        collection_name: collectionName,
        collection_slug: collectionSlug,
        category: nextCategory,
        product_count: products.length,
      },
    });
  };

  return (
    <div className="bg-white text-stone-800 pt-20">
      <section
        className="relative left-1/2 right-1/2 w-screen -translate-x-1/2 overflow-hidden bg-stone-100"
        style={{ aspectRatio: "21 / 10" }}
      >
        {mediaVideoUrl ? (
          <video
            src={mediaVideoUrl}
            autoPlay
            muted
            loop
            playsInline
            preload="metadata"
            poster={mediaImageUrl || undefined}
            className="absolute inset-0 h-full w-full object-cover"
          />
        ) : mediaImageUrl ? (
          <Image
            src={mediaImageUrl}
            alt={collectionName}
            fill
            priority
            sizes="100vw"
            className="object-cover"
          />
        ) : null}

        <div className="absolute inset-0 bg-linear-to-t from-black/55 via-black/10 to-transparent" />
        <div className="absolute bottom-4 left-5 right-5 md:bottom-6 md:left-8 md:right-8 text-white">
          <p className="text-[10px] uppercase tracking-[0.25em] text-white/75 font-light">Collection</p>
          <h1 className="mt-1 text-2xl md:text-4xl font-light tracking-wide">{collectionName}</h1>
          <p className="mt-1 text-xs md:text-sm text-white/80 font-light max-w-3xl">{subtitle}</p>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-5 md:px-8 py-8 md:py-10">
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 mb-6">
          <button
            type="button"
            onClick={() => handleCategoryChange("all")}
            className={`text-[11px] uppercase tracking-[0.25em] font-light transition-colors ${
              activeCategory === "all" ? "text-stone-900" : "text-stone-400 hover:text-stone-600"
            }`}
          >
            Toutes les categories
          </button>

          {categories.map((category) => (
            <button
              key={category.slug}
              type="button"
              onClick={() => handleCategoryChange(category.slug)}
              className={`text-[11px] uppercase tracking-[0.25em] font-light transition-colors ${
                activeCategory === category.slug
                  ? "text-stone-900"
                  : "text-stone-400 hover:text-stone-600"
              }`}
            >
              {category.name}
            </button>
          ))}
        </div>

        {filteredProducts.length > 0 ? (
          activeCategory === "all" ? (
            <div className="space-y-8 md:space-y-10">
              {groupedProducts.map((group) => {
                const categoryName = categories.find((category) => category.slug === group.category)?.name || group.category;

                return (
                  <section key={group.category} className="space-y-3">
                    <p className="text-[10px] uppercase tracking-[0.3em] text-stone-400 font-light">
                      {categoryName}
                    </p>
                    <ProductMosaic products={group.items} />
                  </section>
                );
              })}
            </div>
          ) : (
            <ProductMosaic products={filteredProducts} />
          )
        ) : (
          <div className="text-center py-20">
            <p className="text-stone-400 font-light">Aucun produit dans cette categorie.</p>
          </div>
        )}

        <div className="pt-8">
          <Link
            href="/boutique"
            className="text-[11px] uppercase tracking-[0.25em] text-stone-500 hover:text-stone-800 transition-colors"
          >
            Retour a toutes les collections
          </Link>
        </div>
      </div>
    </div>
  );
}
