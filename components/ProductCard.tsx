"use client";

import Link from "next/link";
import Image from "next/image";
import { getProductRoute } from "@/lib/products/routing";

interface Product {
  id: number | string;
  slug?: string | number | null;
  name: string;
  price: number;
  images?: string[] | string;
  category?: string;
  stock?: number;
}

/**
 * Carte produit élégante, inspirée des codes du luxe :
 * - Typographie fine, tracking large
 * - Image pleine largeur avec effet de zoom au survol
 * - Badges de stock discrets et raffinés
 * - Ligne décorative sous le nom
 */
function ProductCard({
  product,
  showPrice = true,
}: {
  product: Product;
  showPrice?: boolean;
}) {
  const imageUrl = Array.isArray(product.images)
    ? product.images[0]
    : product.images || "";

  const productHref = getProductRoute(product as { slug?: string | null; id?: number | string | null });

  const price =
    typeof product.price === "string"
      ? parseFloat(product.price)
      : product.price;

  const stock = product.stock;

  // Badge stock : version élégante
  const stockLabel =
    stock === 0
      ? { text: "Épuisé", bg: "bg-stone-800/90", textColor: "text-white" }
      : stock && stock <= 3
      ? { text: `Plus que ${stock}`, bg: "bg-amber-600/90", textColor: "text-white" }
      : null;

  return (
    <Link href={productHref} className="group block">
      <div className="relative overflow-hidden rounded-none bg-stone-100 aspect-3/4 mb-3 shadow-sm group-hover:shadow-md transition-shadow duration-500">
        {/* Image */}
        {imageUrl ? (
          <Image
            src={imageUrl}
            alt={product.name}
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
            className="object-cover transition-transform duration-700 ease-out group-hover:scale-105"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-stone-300 text-5xl font-light">
            N
          </div>
        )}

        {/* Badge stock – discret, positionné en haut à droite */}
        {stockLabel && (
          <div className="absolute top-3 right-3">
            <span
              className={`${stockLabel.bg} ${stockLabel.textColor} text-[10px] px-3 py-1 rounded-full font-light tracking-wide backdrop-blur-sm`}
            >
              {stockLabel.text}
            </span>
          </div>
        )}

        {/* Overlay "Épuisé" (plus élégant) */}
        {stock === 0 && (
          <div className="absolute inset-0 bg-white/40 backdrop-blur-[2px] flex items-center justify-center">
            <span className="bg-stone-800/80 text-white text-xs px-5 py-2 rounded-full font-light tracking-[0.15em] backdrop-blur-sm">
              Épuisé
            </span>
          </div>
        )}
      </div>

      {/* Infos produit */}
      <div className="space-y-0.5">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-light text-base tracking-wide text-stone-800 group-hover:text-stone-900 transition-colors duration-300">
            {product.name}
          </h3>
          {showPrice && (
            <span className="text-stone-500 font-light text-sm whitespace-nowrap">
              {price.toFixed(2)} €
            </span>
          )}
        </div>

        {/* Ligne décorative fine (apparaît au survol) */}
        <div className="w-6 h-px bg-stone-300 group-hover:bg-stone-600 transition-colors duration-500" />

        {/* Indicateur "En stock" (très discret) */}
        {stock !== undefined && stock > 3 && (
          <p className="text-[9px] uppercase tracking-[0.2em] text-stone-400/70 font-light pt-0.5">
            Disponible
          </p>
        )}
      </div>
    </Link>
  );
}

export default ProductCard;