"use client";

import { Dispatch, SetStateAction, useMemo, useState } from "react";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { Trash2, Plus } from "lucide-react";

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

import { ProductFormState } from "../types";

interface ProductDetailsProps {
  product: ProductFormState;
  setProduct: Dispatch<SetStateAction<ProductFormState>>;
}

const SPEC_FIELDS = [
  { key: "poids", label: "Poids", placeholder: "Ex : 850 g" },
  { key: "taille", label: "Taille", placeholder: "Ex : M" },
  { key: "dimensions", label: "Dimensions", placeholder: "Ex : 38 x 28 x 12 cm" },
  { key: "matiere", label: "Matiere", placeholder: "Ex : Cuir pleine fleur" },
  { key: "capacite", label: "Capacite", placeholder: "Ex : 14 L" },
  { key: "bandouliere", label: "Bandouliere", placeholder: "Ex : Ajustable 95 a 120 cm" },
];

function normalizeKey(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function parseDetailLine(detail: string): { key: string; value: string } | null {
  const idx = detail.indexOf(":");
  if (idx === -1) return null;

  const key = detail.slice(0, idx).trim();
  const value = detail.slice(idx + 1).trim();
  if (!key || !value) return null;

  return { key, value };
}

export default function ProductDetails({
  product,
  setProduct,
}: ProductDetailsProps) {
  const [detail, setDetail] = useState("");
  const [pendingDetailIndex, setPendingDetailIndex] = useState<number | null>(null);
  const [isRemovingDetail, setIsRemovingDetail] = useState(false);

  const specValues = useMemo(() => {
    const values: Record<string, string> = {};

    for (const field of SPEC_FIELDS) {
      values[field.key] = "";
    }

    for (const item of product.details) {
      const parsed = parseDetailLine(item);
      if (!parsed) continue;

      const normalized = normalizeKey(parsed.key);
      const matchedField = SPEC_FIELDS.find((field) => field.key === normalized);
      if (matchedField) {
        values[matchedField.key] = parsed.value;
      }
    }

    return values;
  }, [product.details]);

  const customDetails = useMemo(
    () =>
      product.details
        .map((value, index) => ({ value, index }))
        .filter((item) => {
          const parsed = parseDetailLine(item.value);
          if (!parsed) return true;

          const normalized = normalizeKey(parsed.key);
          return !SPEC_FIELDS.some((field) => field.key === normalized);
        }),
    [product.details]
  );

  function updateSpec(fieldKey: string, nextValue: string) {
    setProduct((prev) => {
      const withoutCurrentSpec = prev.details.filter((item) => {
        const parsed = parseDetailLine(item);
        if (!parsed) return true;
        return normalizeKey(parsed.key) !== fieldKey;
      });

      const specLabel = SPEC_FIELDS.find((field) => field.key === fieldKey)?.label || fieldKey;
      const trimmed = nextValue.trim();

      return {
        ...prev,
        details: trimmed
          ? [...withoutCurrentSpec, `${specLabel}: ${trimmed}`]
          : withoutCurrentSpec,
      };
    });
  }

  function addDetail() {
    const value = detail.trim();

    if (!value) return;

    setProduct((prev) => ({
      ...prev,
      details: [...prev.details, value],
    }));

    setDetail("");
  }

  function removeDetail(index: number) {
    setIsRemovingDetail(true);
    try {
      setProduct((prev) => ({
        ...prev,
        details: prev.details.filter((_, i) => i !== index),
      }));
    } finally {
      setPendingDetailIndex(null);
      setIsRemovingDetail(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          Caractéristiques
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-6">

        <div className="grid gap-4 md:grid-cols-2">
          {SPEC_FIELDS.map((field) => (
            <div key={field.key} className="space-y-2">
              <Label htmlFor={`spec-${field.key}`}>{field.label}</Label>
              <Input
                id={`spec-${field.key}`}
                placeholder={field.placeholder}
                value={specValues[field.key] || ""}
                onChange={(e) => updateSpec(field.key, e.target.value)}
              />
            </div>
          ))}
        </div>

        <div className="h-px bg-border" />

        <div className="flex gap-3">

          <Input
            placeholder="Ex : Compartiment ordinateur 16 pouces"
            value={detail}
            onChange={(e) =>
              setDetail(e.target.value)
            }
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addDetail();
              }
            }}
          />

          <Button
            type="button"
            onClick={addDetail}
          >
            <Plus className="mr-2 h-4 w-4" />

            Ajouter
          </Button>

        </div>

        {customDetails.length > 0 && (

          <div className="space-y-2">

            {customDetails.map((item) => (

              <div
                key={`${item.value}-${item.index}`}
                className="
                  flex
                  items-center
                  justify-between
                  rounded-lg
                  border
                  p-3
                "
              >
                <span>
                  {item.value}
                </span>

                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  onClick={() => setPendingDetailIndex(item.index)}
                >
                  <Trash2 className="h-4 w-4 text-red-500" />
                </Button>

              </div>

            ))}

          </div>

        )}

      </CardContent>

      <AlertDialog
        open={pendingDetailIndex !== null}
        onOpenChange={(open) => {
          if (!open) setPendingDetailIndex(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Retirer cette information ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette caractéristique sera supprimée du produit après confirmation.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isRemovingDetail}>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (pendingDetailIndex !== null) removeDetail(pendingDetailIndex);
              }}
              disabled={isRemovingDetail}
              className="bg-destructive"
            >
              {isRemovingDetail ? "Suppression..." : "Retirer"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}