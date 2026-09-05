"use client";

import { useState, memo, useCallback, useEffect, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { getProductRoute } from "@/lib/products/routing";
import dynamic from "next/dynamic";
import { Truck, RotateCcw, ShieldCheck } from "lucide-react";
import { useCart } from "@/components/CartContext";
import { trackEvent } from "@/lib/analytics/tracking";

const Reviews = dynamic(() => import("@/components/Reviews"), {
  loading: () => (
    <div className="flex items-center justify-center py-12">
      <div className="w-6 h-6 border-2 border-stone-300 border-t-stone-700 rounded-full animate-spin" />
    </div>
  ),
});

interface Product {
  id: number | string;
  slug?: string;
  name: string;
  price: number;
  images: string[];
  description: string;
  details: string[];
  category: string;
  stock: number;
  rating: number;
  reviews: number;
  isNew: boolean;
}

function ProductClient({
  product,
  relatedProducts,
}: {
  product: Product;
  relatedProducts: Product[];
}) {
  const { addToCart } = useCart();
  const [selectedImage, setSelectedImage] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [isAdded, setIsAdded] = useState(false);
  const [activeTab, setActiveTab] = useState("description");
  const startTime = useRef<number>(Date.now());

  const handleAddToCart = useCallback(() => {
    addToCart(
      {
        id: product.id,
        slug: product.slug || String(product.id),
        name: product.name,
        price: product.price,
        image: product.images[0],
        stock: product.stock,
      },
      quantity
    );
    trackEvent("add_to_cart", {
      product_id: String(product.id),
      page_url: window.location.pathname,
      metadata: {
        product_name: product.name,
        quantity,
        price: product.price,
      },
    });
    setIsAdded(true);
    setTimeout(() => setIsAdded(false), 1800);
  }, [product, quantity, addToCart]);

  const priceFormatted =
    typeof product.price === "number"
      ? product.price.toLocaleString("fr-FR", { minimumFractionDigits: 2 })
      : product.price;

  useEffect(() => {
    trackEvent("product_view", {
      product_id: String(product.id),
      page_url: window.location.pathname,
      metadata: {
        product_name: product.name,
        price: product.price,
        category: product.category,
      },
    });
  }, [product]);

  useEffect(() => {
    return () => {
      const seconds = Math.round((Date.now() - startTime.current) / 1000);
      if (seconds >= 4) {
        trackEvent("product_time_spent", {
          product_id: String(product.id),
          page_url: window.location.pathname,
          metadata: {
            product_name: product.name,
            seconds,
          },
        });
      }
    };
  }, [product]);

  return (
    <div className="bg-stone-50 pt-20 min-h-screen">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 md:px-10 py-8 md:py-16">
        <Breadcrumb productName={product.name} />

        <div className="grid md:grid-cols-2 gap-10 lg:gap-20 items-start">
          <Gallery
            images={product.images}
            productName={product.name}
            isNew={product.isNew}
            stock={product.stock}
            selectedImage={selectedImage}
            setSelectedImage={setSelectedImage}
          />

          <ProductInfo
            product={product}
            priceFormatted={priceFormatted}
            quantity={quantity}
            setQuantity={setQuantity}
            isAdded={isAdded}
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            onAddToCart={handleAddToCart}
          />
        </div>

        {relatedProducts.length > 0 && (
          <RelatedProducts products={relatedProducts} />
        )}

        <section className="mt-24 md:mt-32 max-w-4xl mx-auto">
          <div className="text-center mb-10">
            <div className="w-10 h-px bg-stone-300 mx-auto mb-6" />
            <h2 className="text-2xl md:text-3xl font-light tracking-tight">
              Avis clients
            </h2>
          </div>
          <Reviews productId={product.id} />
        </section>
      </div>
    </div>
  );
}

export default ProductClient;

const Breadcrumb = memo(function Breadcrumb({
  productName,
}: {
  productName: string;
}) {
  return (
    <div className="flex items-center gap-2 text-[10px] sm:text-[11px] uppercase tracking-[0.18em] text-stone-400 font-light mb-8 md:mb-10 overflow-hidden">
      <Link href="/" className="hover:text-stone-700 transition-colors shrink-0">
        Accueil
      </Link>
      <span>/</span>
      <Link href="/boutique" className="hover:text-stone-700 transition-colors shrink-0">
        Boutique
      </Link>
      <span>/</span>
      <span className="text-stone-700 truncate">{productName}</span>
    </div>
  );
});

function Gallery({
  images,
  productName,
  isNew,
  stock,
  selectedImage,
  setSelectedImage,
}: {
  images: string[];
  productName: string;
  isNew: boolean;
  stock: number;
  selectedImage: number;
  setSelectedImage: (i: number) => void;
}) {
  return (
    <div className="space-y-4 md:space-y-6">
      <div className="relative overflow-hidden rounded-[24px] md:rounded-[30px] bg-stone-100 aspect-3/4 md:aspect-5/6 shadow-[0_20px_60px_-30px_rgba(0,0,0,0.35)] group">
        <div className="relative w-full h-full">
          <Image
            src={images[selectedImage] || "/placeholder.svg"}
            alt={productName}
            fill
            priority={selectedImage === 0}
            sizes="(max-width: 768px) 100vw, 50vw"
            className="object-cover transition-transform duration-700 group-hover:scale-[1.03]"
          />
        </div>

        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-28 bg-linear-to-t from-black/30 via-black/10 to-transparent" />

        <div className="absolute top-4 left-4 md:top-5 md:left-5 flex flex-col gap-2 z-10">
          {isNew && (
            <span className="bg-white/90 backdrop-blur-sm text-stone-900 text-[10px] uppercase tracking-[0.18em] px-3 py-1.5 rounded-full font-light">
              Nouveau
            </span>
          )}
          {stock <= 3 && stock > 0 && (
            <span className="bg-stone-900 text-white text-[10px] uppercase tracking-[0.18em] px-3 py-1.5 rounded-full font-light">
              Plus que {stock}
            </span>
          )}
        </div>

        {images.length > 1 && (
          <div className="absolute bottom-4 md:bottom-5 left-1/2 -translate-x-1/2 flex gap-2 z-10">
            {images.map((_, i) => (
              <button
                key={i}
                onClick={() => setSelectedImage(i)}
                className={`h-2 rounded-full transition-all duration-300 ${
                  i === selectedImage
                    ? "w-8 bg-stone-900"
                    : "w-2 bg-white/60 hover:bg-white"
                }`}
              />
            ))}
          </div>
        )}
      </div>

      {images.length > 1 && (
        <div className="grid grid-cols-4 gap-2 md:gap-3">
          {images.map((img, i) => (
            <button
              key={i}
              onClick={() => setSelectedImage(i)}
              className={`relative rounded-2xl overflow-hidden aspect-square bg-stone-100 border transition-all duration-300 ${
                i === selectedImage
                  ? "border-stone-900 shadow-md"
                  : "border-transparent hover:border-stone-300"
              }`}
            >
              <Image
                src={img}
                alt=""
                fill
                sizes="120px"
                className="object-cover"
                loading="lazy"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function ProductInfo({
  product,
  priceFormatted,
  quantity,
  setQuantity,
  isAdded,
  activeTab,
  setActiveTab,
  onAddToCart,
}: {
  product: Product;
  priceFormatted: string;
  quantity: number;
  setQuantity: (q: number) => void;
  isAdded: boolean;
  activeTab: string;
  setActiveTab: (t: string) => void;
  onAddToCart: () => void;
}) {
  return (
    <div className="md:sticky md:top-28 space-y-7 md:space-y-8">
      <div className="flex items-center justify-between gap-4">
        <span className="text-[11px] uppercase tracking-[0.2em] text-stone-400 font-light">
          {product.category}
        </span>
        <Stars rating={product.rating} reviews={product.reviews} />
      </div>

      <div>
        <h1 className="text-3xl md:text-4xl font-light tracking-tight leading-tight mb-5">
          {product.name}
        </h1>
        <div className="flex items-end gap-4">
          <span className="text-2xl md:text-3xl font-light tracking-tight">
            {priceFormatted} €
          </span>
          <span className="text-xs text-stone-400 font-light mb-1">
            Taxes incluses
          </span>
        </div>
      </div>

      <p className="text-stone-600 font-light leading-relaxed text-[15px] md:text-base max-w-lg">
        {product.description}
      </p>

      <div className="space-y-5 pt-2">
        <div className="flex items-center gap-5">
          <span className="text-sm text-stone-500 font-light">Quantité</span>
          <QuantitySelector
            quantity={quantity}
            max={product.stock}
            onChange={setQuantity}
          />
        </div>

        <button
          onClick={onAddToCart}
          disabled={product.stock === 0}
          className={`w-full py-4 rounded-full text-[11px] uppercase tracking-[0.18em] font-light transition-all duration-300 ${
            isAdded
              ? "bg-emerald-700 text-white"
              : product.stock === 0
                ? "bg-stone-200 text-stone-400 cursor-not-allowed"
                : "bg-stone-900 text-white hover:bg-stone-800 active:scale-[0.99]"
          }`}
        >
          {isAdded
            ? "Ajouté au panier"
            : product.stock === 0
              ? "Rupture de stock"
              : "Ajouter au panier"}
        </button>
      </div>

      <DeliveryInfo />
      <Tabs
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        product={product}
      />
    </div>
  );
}

const Stars = memo(function Stars({
  rating,
  reviews,
}: {
  rating: number;
  reviews: number;
}) {
  return (
    <div className="flex items-center gap-1 shrink-0">
      {[...Array(5)].map((_, i) => (
        <span
          key={i}
          className={`text-xs ${
            i < Math.floor(rating) ? "text-stone-900" : "text-stone-300"
          }`}
        >
          ●
        </span>
      ))}
      <span className="text-xs text-stone-400 font-light ml-2">
        {reviews} avis
      </span>
    </div>
  );
});

function QuantitySelector({
  quantity,
  max,
  onChange,
}: {
  quantity: number;
  max: number;
  onChange: (q: number) => void;
}) {
  return (
    <div className="flex items-center border border-stone-200 rounded-full overflow-hidden">
      <button
        onClick={() => onChange(Math.max(1, quantity - 1))}
        disabled={quantity <= 1}
        className="w-10 h-10 text-stone-400 hover:text-stone-700 transition-colors disabled:opacity-30"
      >
        −
      </button>
      <span className="w-10 text-center text-sm font-light">{quantity}</span>
      <button
        onClick={() => onChange(Math.min(max, quantity + 1))}
        disabled={quantity >= max}
        className="w-10 h-10 text-stone-400 hover:text-stone-700 transition-colors disabled:opacity-30"
      >
        +
      </button>
    </div>
  );
}

const DeliveryInfo = memo(function DeliveryInfo() {
  const items = [
    { label: "Livraison 3–5 jours", icon: Truck },
    { label: "Retours gratuits", icon: RotateCcw },
    { label: "Paiement sécurisé", icon: ShieldCheck },
  ];

  return (
    <div className="grid grid-cols-3 gap-4 md:gap-5 pt-8 border-t border-stone-200/70">
      {items.map((item) => {
        const Icon = item.icon;
        return (
          <div key={item.label} className="text-center">
            <div className="flex justify-center mb-3">
              <Icon size={16} strokeWidth={1.5} className="text-stone-500" />
            </div>
            <p className="text-[10px] md:text-[11px] uppercase tracking-[0.15em] text-stone-400 font-light leading-relaxed">
              {item.label}
            </p>
          </div>
        );
      })}
    </div>
  );
});

function Tabs({
  activeTab,
  setActiveTab,
  product,
}: {
  activeTab: string;
  setActiveTab: (t: string) => void;
  product: Product;
}) {
  const tabs = [
    { key: "description", label: "Description" },
    { key: "details", label: "Détails" },
    { key: "livraison", label: "Livraison" },
  ];

  return (
    <div className="pt-2">
      <div className="flex gap-4 md:gap-6 border-b border-stone-200/70 pb-4 overflow-x-auto">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`text-[11px] uppercase tracking-[0.18em] transition-colors duration-300 font-light whitespace-nowrap ${
              activeTab === tab.key
                ? "text-stone-900"
                : "text-stone-400 hover:text-stone-700"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="pt-8 min-h-35">
        <div
          className="text-stone-600 text-sm font-light leading-relaxed transition-opacity duration-200"
          key={activeTab}
        >
          {activeTab === "description" && <p>{product.description}</p>}
          {activeTab === "details" &&
            (product.details.length > 0 ? (
              <ul className="space-y-3">
                {product.details.map((detail) => (
                  <li key={detail} className="flex items-start gap-3">
                    <span className="text-stone-300">—</span>
                    <span>{detail}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p>Aucun detail supplementaire.</p>
            ))}
          {activeTab === "livraison" && (
            <div className="space-y-3">
              <p>Livraison standard : 3 à 5 jours ouvrés.</p>
              <p className="text-emerald-700">Offerte à partir de 100€.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function RelatedProducts({ products }: { products: Product[] }) {
  return (
    <section className="mt-24 md:mt-32">
      <div className="text-center mb-12 md:mb-14">
        <div className="w-10 h-px bg-stone-300 mx-auto mb-6" />
        <h2 className="text-2xl md:text-3xl font-light tracking-tight">
          Vous pourriez aussi aimer
        </h2>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-5 md:gap-10">
        {products.map((p) => (
          <Link key={p.id} href={getProductRoute(p)} className="group">
            <div className="relative rounded-[22px] md:rounded-[24px] overflow-hidden bg-stone-100 aspect-4/5 mb-4">
              <Image
                src={p.images[0] || "/placeholder.svg"}
                alt={p.name}
                fill
                sizes="(max-width: 768px) 50vw, 33vw"
                className="object-cover group-hover:scale-[1.03] transition-transform duration-700"
                loading="lazy"
              />
            </div>
            <h3 className="font-light text-sm md:text-base tracking-tight">
              {p.name}
            </h3>
            <p className="text-stone-500 text-sm font-light mt-1">
              {typeof p.price === "number"
                ? p.price.toLocaleString("fr-FR")
                : p.price}{" "}
              €
            </p>
          </Link>
        ))}
      </div>
    </section>
  );
}