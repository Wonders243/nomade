"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { getProductRoute } from "@/lib/products/routing";
import { motion, useScroll, useTransform } from "framer-motion";
import ProductCard from "@/components/ProductCard";
import { supabase } from "@/lib/supabase/client";
import type { Collection } from "@/lib/collections/types";

// --- Types ---
interface Product {
  id: number | string;
  slug?: string | number;
  name: string;
  price: number;
  images: string[];
  category: string;
  collectionSlug?: string | null;
  isNew?: boolean;
  rating?: number;
  reviews?: number;
}

interface HomeCategoryCard {
  id: number;
  name: string;
  slug: string;
  img: string;
  description: string;
  productCount: number;
  video?: string;
}

interface HomeCollectionProduct {
  id: number | string;
  slug?: string | number;
  name: string;
  price: number;
  image: string;
}

// --- Helpers ---
const homeAsset = (filename: string, useNestedPath = true) =>
  supabase.storage
    .from("home")
    .getPublicUrl(useNestedPath ? `home/${filename}` : filename).data.publicUrl;

const homeImage = (filename: string) => homeAsset(filename, true);

const DEFAULT_COLLECTION_DESCRIPTION =
  "Des pièces pensées pour être portées au quotidien, avec des matières choisies et une attention particulière aux finitions.";

function normalizeCollectionDescription(description: string | null): string {
  const value = (description || "").replace(/\s+/g, " ").trim();
  return value.length > 0 ? value : DEFAULT_COLLECTION_DESCRIPTION;
}

function compactCopy(text: string, max = 120): string {
  const normalized = text.replace(/\s+/g, " ").trim();
  if (normalized.length <= max) return normalized;
  return `${normalized.slice(0, max - 1).trimEnd()}...`;
}

function CollectionProductShowcase({
  products,
}: {
  products: HomeCollectionProduct[];
}) {
  if (products.length === 0) return null;

  const showcaseItems = products.slice(0, 8);
  const count = showcaseItems.length;

  const gridClass =
    count === 1
      ? "grid-cols-1"
      : count === 2
        ? "grid-cols-2"
        : count === 3
          ? "grid-cols-3"
          : count === 4
            ? "grid-cols-2"
            : count === 5 || count === 6
              ? "grid-cols-3"
              : "grid-cols-4";

  const wrapperWidthClass =
    count === 1
      ? "max-w-44"
      : count === 2
        ? "max-w-96"
        : count === 3
          ? "max-w-3xl"
          : count === 4
            ? "max-w-sm"
            : count === 5 || count === 6
              ? "max-w-3xl"
              : "max-w-4xl";

  const thumbSizes =
    count === 1
      ? "(max-width: 1024px) 100vw, 50vw"
      : count === 2
        ? "(max-width: 1024px) 50vw, 25vw"
        : count === 3 || count === 5 || count === 6
          ? "(max-width: 1024px) 33vw, 16vw"
          : count === 4
            ? "(max-width: 1024px) 50vw, 25vw"
            : "(max-width: 768px) 25vw, 12.5vw";

  return (
    <div className="mt-6 mx-auto w-full max-w-[620px]">
      <div
        className={`mx-auto grid ${gridClass} ${wrapperWidthClass} gap-1.5 md:gap-2`}
      >
        {showcaseItems.map((product) => (
          <Link
            key={product.id}
            href={getProductRoute(product)}
            className="group/showcase block w-full"
            aria-label={product.name}
          >
            <div className="relative aspect-[3/4] overflow-hidden bg-stone-200 rounded-[1.1rem]">
              {product.image ? (
                <Image
                  src={product.image}
                  alt={product.name}
                  fill
                  sizes={thumbSizes}
                  className="object-cover transition-transform duration-500 group-hover/showcase:scale-105"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-stone-400 text-sm uppercase tracking-[0.15em]">
                  N
                </div>
              )}
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

// --- CollectionCard ---
function CollectionCard({
  cat,
  index,
  products,
}: {
  cat: HomeCategoryCard;
  index: number;
  products: HomeCollectionProduct[];
}) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 40 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-100px" }}
      transition={{ duration: 0.7, delay: index * 0.1 }}
      className={`
        group relative grid grid-cols-1 lg:grid-cols-2 items-center gap-6 md:gap-10 lg:gap-14 xl:gap-20
        py-8 md:py-12 lg:py-14
        ${index % 2 === 1 ? "lg:[&>*:first-child]:order-2" : ""}
      `}
    >
      {/* IMAGE / VIDEO */}
      <Link
        href={`/boutique/collection/${cat.slug}`}
        className="block w-full overflow-hidden"
      >
        <div className="relative mx-auto w-full max-w-[700px] aspect-[4/5] bg-stone-100 overflow-hidden rounded-[1.5rem] shadow-[0_18px_50px_-24px_rgba(0,0,0,0.35)]">
          {cat.video ? (
            <video
              src={cat.video}
              autoPlay
              muted
              loop
              playsInline
              preload="metadata"
              poster={cat.img}
              className="absolute inset-0 h-full w-full object-cover"
            />
          ) : (
            <Image
              src={cat.img}
              alt={cat.name}
              fill
              priority={index === 0}
              sizes="(max-width: 768px) 100vw, (max-width: 1280px) 50vw, 720px"
              className="object-cover transition-transform duration-700 group-hover:scale-105"
            />
          )}

          {/* Mobile */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent lg:hidden flex flex-col justify-end p-6 text-white">
            <p className="text-xs uppercase tracking-[0.35em] text-white/70 mb-2">
              Collection
            </p>

            <h3 className="text-2xl font-light tracking-wide leading-tight">
              {cat.name}
            </h3>
          </div>
        </div>
      </Link>

      {/* DESKTOP TEXT */}
      <div className="hidden mx-auto w-full max-w-[28rem] px-4 text-center lg:block lg:px-0 lg:text-left">
        <p className="mb-3 uppercase tracking-[0.35em] text-[10px] text-stone-400">
          Collection
        </p>

        <h3 className="text-2xl sm:text-3xl lg:text-4xl font-light leading-tight tracking-wide text-stone-900">
          {cat.name}
        </h3>

        <p className="mt-4 text-[14px] md:text-[15px] leading-7 text-stone-500 font-light">
          {compactCopy(cat.description, 110)}
        </p>

        <CollectionProductShowcase products={products} />

        <Link
          href={`/boutique/collection/${cat.slug}`}
          className="mt-7 inline-flex items-center gap-3 border-b border-stone-300 pb-1 text-[10px] uppercase tracking-[0.32em] text-stone-700 hover:text-stone-900 hover:border-stone-900 transition-all duration-300 group/link"
        >
          Découvrir
          <span className="transition-transform duration-300 group-hover/link:translate-x-1">
            →
          </span>
        </Link>
      </div>

      {/* MOBILE TEXT */}
      <div className="lg:hidden px-4 mt-2 text-center">
        <p className="mt-3 text-sm leading-relaxed text-stone-500 font-light px-2">
          {compactCopy(cat.description, 90)}
        </p>

        <CollectionProductShowcase products={products} />

        <Link
          href={`/boutique/collection/${cat.slug}`}
          className="mt-5 inline-flex items-center gap-2 border-b border-stone-300 pb-1 text-xs uppercase tracking-[0.35em] text-stone-700"
        >
          Découvrir la collection
          <span>→</span>
        </Link>
      </div>
    </motion.section>
  );
}

function buildHomeCategoryCards(
  collections: Collection[],
  productCountByCollection: Record<string, number>
): HomeCategoryCard[] {
  return collections.slice(0, 4).map((collection) => ({
    id: collection.id,
    name: collection.name,
    slug: collection.slug,
    img: collection.image_path
      ? supabase.storage
          .from("collections")
          .getPublicUrl(collection.image_path).data.publicUrl
      : homeImage("cat-minimal.webp"),
    video: collection.video_path
      ? supabase.storage
          .from("collections")
          .getPublicUrl(collection.video_path).data.publicUrl
      : undefined,
    description: normalizeCollectionDescription(collection.description),
    productCount: productCountByCollection[collection.slug] || 0,
  }));
}

// --- Composant principal ---
export default function HomeClient({
  collections,
  initialProducts,
}: {
  collections: Collection[];
  initialProducts: Product[];
}) {
  const { scrollY } = useScroll();
  const heroY = useTransform(scrollY, [0, 500], [0, 100]);

  const [isVisible, setIsVisible] = useState<Record<string, boolean>>({});
  const products = initialProducts;

  const [shouldLoadHeroVideo, setShouldLoadHeroVideo] = useState(false);
  const [isVideoReady, setIsVideoReady] = useState(false);
  const [videoPathMode, setVideoPathMode] =
    useState<"nested" | "root">("nested");
  const [videoUnavailable, setVideoUnavailable] = useState(false);

  const heroVideoRef = useRef<HTMLVideoElement | null>(null);
  const heroSectionRef = useRef<HTMLElement | null>(null);
  const atelierVideoRef = useRef<HTMLVideoElement | null>(null);

  const [shouldPlayAtelierVideo, setShouldPlayAtelierVideo] = useState(false);

  const youtubeChannelUrl =
    process.env.NEXT_PUBLIC_YOUTUBE_CHANNEL_URL?.trim() || "";

  const videoSources = useMemo(() => {
    const useNestedPath = videoPathMode === "nested";

    return {
      webm: homeAsset("hero.webm", useNestedPath),
      mp4: homeAsset("hero.mp4", useNestedPath),
    };
  }, [videoPathMode]);

  useEffect(() => {
    if (videoUnavailable) return;

    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (media.matches) return;

    let heroVisible = false;

    const maybeEnableHeroVideo = () => {
      if (heroVisible) setShouldLoadHeroVideo(true);
    };

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        heroVisible = Boolean(entry?.isIntersecting);
        maybeEnableHeroVideo();
      },
      { threshold: 0.35 }
    );

    if (heroSectionRef.current) {
      observer.observe(heroSectionRef.current);
    }

    const handleInteraction = () => maybeEnableHeroVideo();
    const delayedStart = window.setTimeout(maybeEnableHeroVideo, 1200);

    window.addEventListener("pointerdown", handleInteraction, {
      passive: true,
    });
    window.addEventListener("scroll", handleInteraction, { passive: true });
    window.addEventListener("keydown", handleInteraction);

    return () => {
      observer.disconnect();
      window.clearTimeout(delayedStart);
      window.removeEventListener("pointerdown", handleInteraction);
      window.removeEventListener("scroll", handleInteraction);
      window.removeEventListener("keydown", handleInteraction);
    };
  }, [videoUnavailable]);

  useEffect(() => {
    if (!shouldLoadHeroVideo) return;

    const video = heroVideoRef.current;
    if (!video) return;

    video.play().catch(() => {});
  }, [videoPathMode, shouldLoadHeroVideo]);

  const handleHeroVideoError = () => {
    if (videoPathMode === "nested") {
      setVideoPathMode("root");
      return;
    }

    setVideoUnavailable(true);
  };

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (media.matches) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        setShouldPlayAtelierVideo(Boolean(entry?.isIntersecting));
      },
      { threshold: 0.25 }
    );

    if (atelierVideoRef.current) {
      observer.observe(atelierVideoRef.current);
    }

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const video = atelierVideoRef.current;
    if (!video) return;

    if (shouldPlayAtelierVideo) {
      video.play().catch(() => {});
    } else {
      video.pause();
    }
  }, [shouldPlayAtelierVideo]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsVisible((prev) => ({
              ...prev,
              [entry.target.id]: true,
            }));
          }
        });
      },
      { threshold: 0.15 }
    );

    document
      .querySelectorAll("[data-section]")
      .forEach((section) => observer.observe(section));

    return () => observer.disconnect();
  }, []);

  const newProducts = products.filter((p) => p.isNew).slice(0, 4);

  const bestProducts = products
    .filter((p) => (p.rating || 0) >= 4.7)
    .slice(0, 4);

  const productCountByCollection = useMemo(
    () =>
      products.reduce<Record<string, number>>((acc, product) => {
        if (!product.collectionSlug) return acc;

        acc[product.collectionSlug] =
          (acc[product.collectionSlug] || 0) + 1;

        return acc;
      }, {}),
    [products]
  );

  const categoryCards = useMemo(
    () => buildHomeCategoryCards(collections, productCountByCollection),
    [collections, productCountByCollection]
  );

  const productsByCollection = useMemo(
    () =>
      products.reduce<Record<string, HomeCollectionProduct[]>>(
        (acc, product) => {
          if (!product.collectionSlug) return acc;

          const current = acc[product.collectionSlug] || [];

          if (current.length >= 8) return acc;

          current.push({
            id: product.id,
            slug: product.slug || String(product.id),
            name: product.name,
            price: product.price,
            image: product.images[0] || "",
          });

          acc[product.collectionSlug] = current;

          return acc;
        },
        {}
      ),
    [products]
  );

  const values = [
    {
      title: "Fabriqué à la main",
      text: "Chaque pièce est fabriquée avec soin, de la coupe du cuir jusqu'aux dernières finitions.",
      img: homeImage("valeur-artisanat.webp"),
    },
    {
      title: "Des matières choisies avec soin",
      text: "Nous sélectionnons nos cuirs et nos toiles pour leur toucher, leur tenue et leur capacité à bien vieillir.",
      img: homeImage("valeur-durer.webp"),
    },
    {
      title: "Pensé pour être utilisé",
      text: "Une belle pièce doit aussi être pratique. Nous cherchons le bon équilibre entre forme, confort et fonctionnalité.",
      img: homeImage("valeur-essentiel.webp"),
    },
  ];

  return (
    <div className="bg-white text-stone-800 overflow-hidden font-light">

      {/* =========================================================
          HERO
      ========================================================= */}
      <section
        ref={heroSectionRef}
        className="relative min-h-[90vh] overflow-hidden"
      >
        <motion.div
          style={{ y: heroY }}
          className="absolute inset-0"
        >
          <Image
            src={homeImage("hero.webp")}
            alt=""
            fill
            priority
            sizes="100vw"
            className="object-cover"
          />
        </motion.div>

        <motion.div
          style={{ y: heroY }}
          className={`absolute inset-0 transition-opacity duration-1000 ${
            shouldLoadHeroVideo &&
            isVideoReady &&
            !videoUnavailable
              ? "opacity-100"
              : "opacity-0"
          }`}
        >
          {shouldLoadHeroVideo && (
            <video
              key={videoPathMode}
              ref={heroVideoRef}
              autoPlay
              loop
              muted
              playsInline
              preload="metadata"
              poster={homeImage("hero.webp")}
              onLoadedData={() => setIsVideoReady(true)}
              onCanPlay={() => setIsVideoReady(true)}
              onError={handleHeroVideoError}
              className="absolute inset-0 w-full h-full object-cover"
            >
              <source src={videoSources.webm} type="video/webm" />
              <source src={videoSources.mp4} type="video/mp4" />
            </video>
          )}
        </motion.div>

        <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/20 to-black/60" />

        <div className="relative min-h-[90vh] flex flex-col justify-center items-center px-6 pt-24 pb-10 md:pt-28 md:pb-14 text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, ease: "easeOut" }}
            className="max-w-4xl"
          >
            <p className="text-white/50 text-xs tracking-[0.35em] uppercase mb-6 font-light">
              Fabriqué en France · Cuir · Toile
            </p>

            <div className="mb-7">
              <p className="text-white/65 text-[11px] sm:text-xs tracking-[0.45em] uppercase font-light mb-3">
                By Nomade
              </p>

              <h1 className="text-6xl sm:text-7xl md:text-8xl lg:text-9xl font-extralight tracking-[-0.02em] text-white leading-[0.85]">
                SCOLTA
              </h1>
            </div>

            <p className="text-white/90 text-2xl sm:text-3xl md:text-4xl font-light tracking-wide max-w-2xl mx-auto mb-4">
              Un sac pour partir.
            </p>

            <p className="text-white/50 text-base sm:text-lg font-light max-w-md mx-auto mb-10">
              La première collection de SCOLTA.
            </p>

            <div className="flex flex-wrap justify-center gap-4">
              <Link
                href="/boutique"
                className="bg-white/90 backdrop-blur-sm text-stone-900 px-10 py-4 rounded-full text-sm tracking-[0.2em] font-light hover:bg-white transition-all"
              >
                Découvrir
              </Link>

              <Link
                href="/boutique?filter=nouveautes"
                className="border border-white/30 text-white px-10 py-4 rounded-full text-sm tracking-[0.2em] font-light hover:bg-white/10 transition-all"
              >
                Nouveautés
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* =========================================================
          INTRO
      ========================================================= */}
      <section className="py-24 md:py-36 bg-stone-50">
        <div className="max-w-6xl mx-auto px-6 md:px-10">
          <div className="grid md:grid-cols-2 gap-16 md:gap-24 items-center">

            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8 }}
            >
              <p className="text-stone-400 text-xs tracking-[0.3em] uppercase mb-6 font-light">
                Notre approche
              </p>

              <h2 className="text-3xl md:text-5xl font-light leading-tight tracking-wide mb-8">
                Des pièces faites pour être portées au quotidien
              </h2>

              <p className="text-stone-500 text-lg leading-relaxed font-light max-w-xl">
                Nous travaillons des formes simples, des matières que nous
                aimons et des détails qui ont leur utilité.
              </p>

              <div className="mt-10 flex flex-wrap gap-4">
                <Link
                  href="/boutique"
                  className="bg-stone-900 text-white px-8 py-4 rounded-full text-sm tracking-wider font-light hover:bg-stone-800 transition-all"
                >
                  Découvrir SCOLTA
                </Link>

                <Link
                  href="/histoire"
                  className="border border-stone-300 text-stone-700 px-8 py-4 rounded-full text-sm tracking-wider font-light hover:border-stone-900 hover:text-stone-900 transition-all"
                >
                  La Maison NOMADE
                </Link>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="relative rounded-3xl overflow-hidden aspect-[4/5] shadow-lg"
            >
              <Image
                src={homeImage("intro.webp")}
                alt=""
                fill
                className="object-cover hover:scale-105 transition-transform duration-700"
                sizes="(max-width: 768px) 100vw, 50vw"
              />
            </motion.div>

          </div>
        </div>
      </section>

      {/* =========================================================
          COLLECTIONS
      ========================================================= */}
      <section className="mx-auto max-w-[1600px] px-5 sm:px-8 lg:px-12 xl:px-20">

        <div className="py-16 md:py-20 text-center max-w-3xl mx-auto">
          <p className="text-stone-400 text-xs tracking-[0.3em] uppercase mb-4 font-light">
            Collections
          </p>

          <h2 className="text-3xl md:text-5xl font-light tracking-wide leading-tight text-stone-900">
            Les collections
          </h2>

          <p className="mt-6 text-stone-500 text-base md:text-lg leading-relaxed font-light">
            Découvrez les premiers modèles de SCOLTA.
          </p>
        </div>

        {categoryCards.map((cat, index) => (
          <CollectionCard
            key={cat.slug}
            cat={cat}
            index={index}
            products={productsByCollection[cat.slug] || []}
          />
        ))}

        <div className="pt-8 pb-14 md:pb-20 text-center">
          <Link
            href="/boutique"
            className="inline-flex items-center gap-3 px-7 py-3 text-xs uppercase tracking-[0.25em] text-stone-700 hover:text-stone-900 transition-colors"
          >
            Voir toutes les collections
            <span>→</span>
          </Link>
        </div>

      </section>

      {/* =========================================================
          NOUVEAUTÉS
      ========================================================= */}
      <section
        id="new-products"
        data-section
        className="py-24 md:py-36 bg-stone-50"
      >
        <div className="max-w-7xl mx-auto px-6 md:px-10">

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={
              isVisible["new-products"]
                ? { opacity: 1, y: 0 }
                : {}
            }
            transition={{ duration: 0.6 }}
            className="text-center mb-14"
          >
            <p className="text-stone-400 text-xs tracking-[0.3em] uppercase mb-4 font-light">
              Nouveautés
            </p>

            <h2 className="text-3xl md:text-4xl font-light tracking-wide leading-tight max-w-2xl mx-auto">
              Les nouveautés
            </h2>
          </motion.div>

          {newProducts.length > 0 ? (
            <div className="flex flex-wrap justify-center gap-8">
              {newProducts.map((product, index) => (
                <motion.div
                  key={product.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={
                    isVisible["new-products"]
                      ? { opacity: 1, y: 0 }
                      : {}
                  }
                  transition={{
                    delay: index * 0.1,
                    duration: 0.5,
                  }}
                  className="w-full sm:w-[calc(50%-16px)] lg:w-[calc(25%-24px)] max-w-[280px]"
                >
                  <ProductCard
                    product={product}
                    showPrice={false}
                  />
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="text-center py-16">
              <p className="text-stone-400 font-light mb-4">
                Les prochains modèles arrivent.
              </p>

              <Link
                href="/boutique"
                className="text-stone-600 underline underline-offset-4 hover:text-stone-900 transition-colors text-sm font-light"
              >
                Voir la collection
              </Link>
            </div>
          )}

        </div>
      </section>

      {/* =========================================================
          ATELIER
      ========================================================= */}
      <section className="relative h-[70vh] overflow-hidden">

        <video
          ref={atelierVideoRef}
          autoPlay={shouldPlayAtelierVideo}
          loop
          muted
          playsInline
          preload="none"
          className="absolute inset-0 w-full h-full object-cover"
          poster={homeImage("valeurs-video-poster.webp")}
        >
          <source
            src={homeAsset("valeurs.webm", false)}
            type="video/webm"
          />

          <source
            src={homeAsset("valeurs.mp4", false)}
            type="video/mp4"
          />
        </video>

        <div className="absolute inset-0 bg-black/30" />

        <div className="relative z-10 flex items-center justify-center h-full text-center text-white px-6">

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <p className="text-white/60 text-xs tracking-[0.3em] uppercase mb-6 font-light">
              L'atelier
            </p>

            <h2 className="text-3xl md:text-5xl font-light mb-6 tracking-wide">
              Chaque détail compte
            </h2>

            <p className="text-white/80 text-lg max-w-2xl mx-auto font-light">
              Coupe, assemblage, couture, finition : chaque étape demande du
              temps et de l'attention.
            </p>

            {youtubeChannelUrl && (
              <a
                href={youtubeChannelUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-8 inline-flex items-center gap-2 border-b border-white/50 pb-1 text-xs uppercase tracking-[0.3em] text-white/90 hover:text-white hover:border-white transition-colors"
              >
                Chaîne YouTube
              </a>
            )}
          </motion.div>

        </div>
      </section>

      {/* =========================================================
          VALEURS
      ========================================================= */}
      <section
        id="values"
        data-section
        className="py-24 md:py-36 bg-white"
      >
        <div className="max-w-6xl mx-auto px-6 md:px-10">

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-20"
          >
            <p className="text-stone-400 text-xs tracking-[0.3em] uppercase mb-4 font-light">
              Notre façon de faire
            </p>

            <h2 className="text-3xl md:text-4xl font-light tracking-wide leading-tight">
              Ce qui compte pour nous
            </h2>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-14 md:gap-16">

            {values.map((value, index) => (
              <motion.div
                key={value.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.2 }}
                className="text-center"
              >
                <div className="relative rounded-2xl overflow-hidden aspect-square mb-8 shadow-sm hover:shadow-lg transition-shadow">
                  <Image
                    src={value.img}
                    alt=""
                    fill
                    className="object-cover hover:scale-105 transition-transform duration-700"
                    sizes="(max-width: 768px) 100vw, 33vw"
                  />
                </div>

                <h3 className="text-2xl font-light mb-4 tracking-wide">
                  {value.title}
                </h3>

                <p className="text-stone-500 leading-relaxed font-light text-base max-w-sm mx-auto">
                  {value.text}
                </p>
              </motion.div>
            ))}

          </div>
        </div>
      </section>

      {/* =========================================================
          SÉLECTION
      ========================================================= */}
      <section
        id="best-sellers"
        data-section
        className="py-24 md:py-36 bg-stone-50"
      >
        <div className="max-w-7xl mx-auto px-6 md:px-10">

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={
              isVisible["best-sellers"]
                ? { opacity: 1, y: 0 }
                : {}
            }
            transition={{ duration: 0.6 }}
            className="text-center mb-14"
          >
            <p className="text-stone-400 text-xs tracking-[0.3em] uppercase mb-4 font-light">
              La sélection SCOLTA
            </p>

            <h2 className="text-3xl md:text-4xl font-light tracking-wide leading-tight max-w-2xl mx-auto">
              Les premiers modèles
            </h2>

            <p className="mt-5 text-stone-500 text-base font-light max-w-xl mx-auto">
              Une sélection des pièces disponibles au lancement.
            </p>
          </motion.div>

          {bestProducts.length > 0 ? (
            <div className="flex flex-wrap justify-center gap-8">
              {bestProducts.map((product, index) => (
                <motion.div
                  key={product.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={
                    isVisible["best-sellers"]
                      ? { opacity: 1, y: 0 }
                      : {}
                  }
                  transition={{
                    delay: index * 0.1,
                    duration: 0.5,
                  }}
                  className="w-full sm:w-[calc(50%-16px)] lg:w-[calc(25%-24px)] max-w-[280px]"
                >
                  <ProductCard
                    product={product}
                    showPrice={false}
                  />
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="text-center py-16">
              <p className="text-stone-400 font-light mb-4">
                Les premiers modèles arrivent bientôt.
              </p>

              <Link
                href="/boutique"
                className="text-stone-600 underline underline-offset-4 hover:text-stone-900 transition-colors text-sm font-light"
              >
                Voir la collection
              </Link>
            </div>
          )}

        </div>
      </section>

      {/* =========================================================
          FIN
      ========================================================= */}
      <section className="relative py-28 md:py-40 overflow-hidden">

        <Image
          src={homeImage("hommage.webp")}
          alt=""
          fill
          className="object-cover"
          sizes="100vw"
        />

        <div className="absolute inset-0 bg-stone-900/70" />

        <div className="relative z-10 text-white text-center">
          <div className="max-w-3xl mx-auto px-6">

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
            >
              <p className="text-white/40 text-xs tracking-[0.3em] uppercase mb-6 font-light">
                Le début
              </p>

              <h2 className="text-4xl md:text-6xl font-light mb-8 leading-tight tracking-wide">
                Découvrez
                <br />
                SCOLTA
              </h2>

              <p className="text-white/60 text-lg md:text-xl leading-relaxed font-light mb-12 max-w-2xl mx-auto">
                Les premiers modèles de la marque, développée par la Maison
                NOMADE.
              </p>

              <Link
                href="/boutique"
                className="inline-block bg-white text-stone-900 px-10 py-4 rounded-full text-sm tracking-wider font-light hover:bg-stone-100 transition-colors"
              >
                Découvrir SCOLTA
              </Link>
            </motion.div>

          </div>
        </div>
      </section>

    </div>
  );
}