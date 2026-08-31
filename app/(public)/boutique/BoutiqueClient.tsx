"use client";

import { memo, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useSearchParams } from "next/navigation";
import { trackEvent } from "@/lib/analytics/tracking";
import { supabase } from "@/lib/supabase/client";
import ProductCard from "@/components/ProductCard";

interface Product {
  id: number | string;
  slug?: string | number;
  name: string;
  price: number;
  images: string[];
  category: string;
  categorySlug: string;
  collection: string;
  collectionSlug: string;
  isNew?: boolean;
  rating?: number;
  stock?: number;
}

interface CollectionFilter {
  id: number;
  name: string;
  slug: string;
  imagePath?: string | null;
  videoPath?: string | null;
}

const sortOptions = [
  { label: "Par défaut", value: "default" },
  { label: "Prix croissant", value: "price-asc" },
  { label: "Prix décroissant", value: "price-desc" },
  { label: "Nouveautés", value: "newest" },
] as const;

type SortValue = (typeof sortOptions)[number]["value"];

function getCollectionMediaUrl(path?: string | null): string {
  if (!path) return "";
  return supabase.storage.from("collections").getPublicUrl(path).data.publicUrl;
}

function BoutiqueClient({
  products,
  collections,
}: {
  products: Product[];
  collections: CollectionFilter[];
}) {
  const searchParams = useSearchParams();
  const filterParam = searchParams.get("filter");

  const [sortBy, setSortBy] = useState<SortValue>("default");
  const [searchTerm, setSearchTerm] = useState("");
  const [sortMenuOpen, setSortMenuOpen] = useState(false);


  const effectiveSortBy: SortValue = filterParam === "nouveautes" ? "newest" : sortBy;

  useEffect(() => {
    if (searchTerm.trim().length < 2) return;
    const timeout = setTimeout(() => {
      trackEvent("search", { metadata: { query: searchTerm.trim() } });
    }, 1000);
    return () => clearTimeout(timeout);
  }, [searchTerm]);

  const displayedProducts = useMemo(() => {
    let filtered = [...products];

    if (searchTerm.trim() !== "") {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (product) =>
          product.name.toLowerCase().includes(term) || product.collection.toLowerCase().includes(term)
      );
    }

    switch (effectiveSortBy) {
      case "price-asc":
        filtered.sort((a, b) => a.price - b.price);
        break;
      case "price-desc":
        filtered.sort((a, b) => b.price - a.price);
        break;
      case "newest":
        filtered.sort((a, b) => Number(b.id) - Number(a.id));
        break;
      default:
        break;
    }

    return filtered;
  }, [effectiveSortBy, products, searchTerm]);

  const currentSortLabel =
    sortOptions.find((option) => option.value === effectiveSortBy)?.label || "Par défaut";

  const visibleCollections = useMemo(
    () => collections.filter((collection) => collection.slug !== "all"),
    [collections]
  );

  const groupedCollections = useMemo(() => {
    return visibleCollections
      .map((collection) => ({
        collection,
        items: displayedProducts.filter(
          (product) =>
            product.collectionSlug === collection.slug || product.collection === collection.name
        ),
      }))
      .filter((group) => group.items.length > 0);
  }, [displayedProducts, visibleCollections]);

  return (
    <div className="bg-white text-stone-800 pt-20">
      <div className="max-w-7xl mx-auto px-5 md:px-8 py-12 md:py-14">
        <div className="text-center mb-10">
          <h1 className="text-4xl md:text-6xl font-light tracking-tight text-stone-900 mb-3">
            Collections
          </h1>
          <p className="text-stone-400 font-light text-base md:text-lg tracking-wide max-w-sm mx-auto">
            Les pièces sont organisées par collection.
          </p>
        </div>

        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 mb-9">
          <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
            <span className="text-[11px] uppercase tracking-[0.25em] font-light text-stone-900">
              Tous
            </span>
            {visibleCollections.map((collection) => (
              <Link
                key={collection.slug}
                href={`/boutique/collection/${collection.slug}`}
                className="text-[11px] uppercase tracking-[0.25em] font-light text-stone-400 hover:text-stone-600 transition-colors"
              >
                {collection.name}
              </Link>
            ))}
          </div>

          <div className="flex items-center gap-4 w-full lg:w-auto">
            <div className="relative flex-1 lg:w-48">
              <input
                type="text"
                placeholder="Rechercher"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-transparent border-b border-stone-200 py-2 text-sm font-light text-stone-700 placeholder-stone-400 focus:outline-none focus:border-stone-400 transition-colors"
              />
            </div>

            <div className="relative">
              <button
                onClick={() => setSortMenuOpen(!sortMenuOpen)}
                onBlur={() => setTimeout(() => setSortMenuOpen(false), 200)}
                className="text-[11px] uppercase tracking-[0.2em] font-light text-stone-400 hover:text-stone-600 transition-colors flex items-center gap-2"
              >
                {currentSortLabel}
                <span className={`transition-transform duration-200 ${sortMenuOpen ? "rotate-180" : ""}`}>
                  ↓
                </span>
              </button>

              {sortMenuOpen && (
                <div className="absolute right-0 top-8 w-48 bg-white/95 backdrop-blur-md border border-stone-200 rounded-xl shadow-lg overflow-hidden z-40">
                  {sortOptions.map((option) => (
                    <button
                      key={option.value}
                      onClick={() => {
                        setSortBy(option.value);
                        setSortMenuOpen(false);
                      }}
                      className={`w-full flex items-center justify-between px-4 py-3 text-left transition-colors text-sm font-light ${
                        effectiveSortBy === option.value
                          ? "text-stone-900 bg-stone-50"
                          : "text-stone-500 hover:bg-stone-50"
                      }`}
                    >
                      <span>{option.label}</span>
                      {effectiveSortBy === option.value && <span className="text-stone-400">•</span>}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {displayedProducts.length > 0 && (
          <p className="text-[10px] uppercase tracking-[0.3em] text-stone-300 font-light mb-6">
            {displayedProducts.length} produit{displayedProducts.length > 1 ? "s" : ""}
          </p>
        )}

        {groupedCollections.length > 0 ? (
          <div className="space-y-8 md:space-y-10">
            {groupedCollections.map(({ collection, items }) => {
              const mediaImageUrl = getCollectionMediaUrl(collection.imagePath);
              const mediaVideoUrl = getCollectionMediaUrl(collection.videoPath);
              const previewItems = items.slice(0, 10);
              const hasMoreItems = items.length > previewItems.length;

              return (
                <section key={collection.slug} className="space-y-3 md:space-y-4">
                  <Link
                    href={`/boutique/collection/${collection.slug}`}
                    className="relative left-1/2 right-1/2 block w-screen -translate-x-1/2 overflow-hidden bg-stone-100"
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
                        alt={collection.name}
                        fill
                        sizes="100vw"
                        className="object-cover"
                      />
                    ) : (
                      <div className="absolute inset-0 bg-stone-100" />
                    )}

                    <div className="absolute inset-0 bg-linear-to-t from-black/55 via-black/10 to-transparent" />
                    <div className="absolute bottom-4 left-5 right-5 md:bottom-6 md:left-8 md:right-8 text-white">
                      <p className="text-[10px] uppercase tracking-[0.25em] text-white/75 font-light">
                        Collection
                      </p>
                      <h2 className="mt-1 text-2xl md:text-4xl font-light tracking-wide">
                        {collection.name}
                      </h2>
                      <p className="mt-1 text-xs md:text-sm text-white/80 font-light tracking-wide">
                        {items.length} piece{items.length > 1 ? "s" : ""}
                      </p>
                    </div>
                  </Link>

                  <div
                    className={
                      previewItems.length <= 2
                        ? "mx-auto grid max-w-3xl grid-cols-1 gap-4 sm:grid-cols-2"
                        : "grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-2.5 md:gap-3"
                    }
                  >
                    {previewItems.map((product) => (
                      <div
                        key={product.id}
                        className={
                          previewItems.length <= 2 ? "w-full max-w-[420px] mx-auto" : ""
                        }
                      >
                        <MemoizedProductCard product={product} />
                      </div>
                    ))}
                  </div>

                  {hasMoreItems && (
                    <div className="pt-1">
                      <Link
                        href={`/boutique/collection/${collection.slug}`}
                        className="inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.25em] text-stone-500 hover:text-stone-800 transition-colors"
                      >
                        Voir la suite
                        <span>→</span>
                      </Link>
                    </div>
                  )}
                </section>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-20">
            <p className="text-stone-400 font-light">Aucun produit trouvé.</p>
          </div>
        )}
      </div>
    </div>
  );
}

const MemoizedProductCard = memo(ProductCard);

export default BoutiqueClient;
