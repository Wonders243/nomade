"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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

type DiscountType = "fixed" | "percent";

interface PromoCode {
  id: number;
  code: string;
  discount_type: DiscountType;
  discount_value: number;
  min_subtotal: number;
  stripe_promotion_code_id: string | null;
  is_active: boolean;
  starts_at: string | null;
  ends_at: string | null;
  max_uses: number | null;
  used_count: number;
  created_at: string;
}

const initialForm = {
  code: "",
  discount_type: "fixed" as DiscountType,
  discount_value: "10",
  min_subtotal: "0",
  stripe_promotion_code_id: "",
  max_uses: "",
};

function formatDate(value: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "-" : date.toLocaleString("fr-FR");
}

export default function PromoCodesManager() {
  const [promoCodes, setPromoCodes] = useState<PromoCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState(initialForm);
  const [pendingDeleteId, setPendingDeleteId] = useState<number | null>(null);
  const [deletingPromoId, setDeletingPromoId] = useState<number | null>(null);

  const activeCount = useMemo(
    () => promoCodes.filter((promo) => promo.is_active).length,
    [promoCodes]
  );

  async function loadPromoCodes() {
    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/admin/promo-codes", { cache: "no-store" });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Impossible de charger les codes promo.");
      }

      setPromoCodes(Array.isArray(data) ? data : []);
    } catch (err: any) {
      setError(err?.message || "Impossible de charger les codes promo.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadPromoCodes();
  }, []);

  async function handleCreatePromo(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError("");

    try {
      const response = await fetch("/api/admin/promo-codes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: form.code,
          discount_type: form.discount_type,
          discount_value: Number(form.discount_value),
          min_subtotal: Number(form.min_subtotal),
          max_uses: form.max_uses === "" ? null : Number(form.max_uses),
          stripe_promotion_code_id:
            form.stripe_promotion_code_id.trim() || null,
          is_active: true,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Erreur lors de la creation du code.");
      }

      setForm(initialForm);
      await loadPromoCodes();
    } catch (err: any) {
      setError(err?.message || "Erreur lors de la creation du code.");
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(promo: PromoCode) {
    setError("");

    try {
      const response = await fetch("/api/admin/promo-codes", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: promo.id,
          is_active: !promo.is_active,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Erreur de mise a jour du code promo.");
      }

      setPromoCodes((prev) =>
        prev.map((row) => (row.id === promo.id ? data : row))
      );
    } catch (err: any) {
      setError(err?.message || "Erreur de mise a jour du code promo.");
    }
  }

  async function deletePromo(id: number) {
    setDeletingPromoId(id);
    setError("");

    try {
      const response = await fetch(`/api/admin/promo-codes?id=${id}`, {
        method: "DELETE",
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Erreur de suppression.");
      }

      setPromoCodes((prev) => prev.filter((row) => row.id !== id));
      setPendingDeleteId(null);
    } catch (err: any) {
      setError(err?.message || "Erreur de suppression.");
    } finally {
      setDeletingPromoId(null);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Codes promo</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Gerer les remises appliquees sur le checkout.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Nouveau code promo</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleCreatePromo} className="grid gap-4 md:grid-cols-5">
            <div className="md:col-span-2">
              <label className="text-sm font-medium">Code</label>
              <Input
                value={form.code}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, code: event.target.value.toUpperCase() }))
                }
                placeholder="NOMADE10"
                required
              />
            </div>

            <div>
              <label className="text-sm font-medium">Type</label>
              <select
                value={form.discount_type}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    discount_type: event.target.value as DiscountType,
                  }))
                }
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-2 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
              >
                <option value="fixed">Montant fixe</option>
                <option value="percent">Pourcentage</option>
              </select>
            </div>

            <div>
              <label className="text-sm font-medium">Valeur</label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={form.discount_value}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, discount_value: event.target.value }))
                }
                required
              />
            </div>

            <div>
              <label className="text-sm font-medium">Sous-total min.</label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={form.min_subtotal}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, min_subtotal: event.target.value }))
                }
              />
            </div>

            <div className="md:col-span-2">
              <label className="text-sm font-medium">Stripe promotion_code ID</label>
              <Input
                value={form.stripe_promotion_code_id}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    stripe_promotion_code_id: event.target.value,
                  }))
                }
                placeholder="promo_..."
              />
            </div>

            <div>
              <label className="text-sm font-medium">Max utilisations</label>
              <Input
                type="number"
                min="1"
                value={form.max_uses}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, max_uses: event.target.value }))
                }
                placeholder="Illimite"
              />
            </div>

            <div className="md:col-span-5 flex justify-end">
              <Button type="submit" disabled={saving}>
                {saving ? "Creation..." : "Creer le code"}
              </Button>
            </div>
          </form>

          {error && <p className="mt-3 text-sm text-red-500">{error}</p>}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>
            Liste des codes ({promoCodes.length}) - Actifs: {activeCount}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-muted-foreground">Chargement...</p>
          ) : promoCodes.length === 0 ? (
            <p className="text-sm text-muted-foreground">Aucun code promo enregistre.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead>
                  <TableHead>Remise</TableHead>
                  <TableHead>Min panier</TableHead>
                  <TableHead>Stripe ID</TableHead>
                  <TableHead>Utilisation</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead>Creation</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {promoCodes.map((promo) => (
                  <TableRow key={promo.id}>
                    <TableCell className="font-medium">{promo.code}</TableCell>
                    <TableCell>
                      {promo.discount_type === "percent"
                        ? `${promo.discount_value}%`
                        : `${Number(promo.discount_value).toFixed(2)} EUR`}
                    </TableCell>
                    <TableCell>{Number(promo.min_subtotal).toFixed(2)} EUR</TableCell>
                    <TableCell>{promo.stripe_promotion_code_id || "-"}</TableCell>
                    <TableCell>
                      {promo.used_count} / {promo.max_uses ?? "illimite"}
                    </TableCell>
                    <TableCell>
                      <Badge variant={promo.is_active ? "default" : "secondary"}>
                        {promo.is_active ? "Actif" : "Inactif"}
                      </Badge>
                    </TableCell>
                    <TableCell>{formatDate(promo.created_at)}</TableCell>
                    <TableCell className="text-right space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => toggleActive(promo)}
                      >
                        {promo.is_active ? "Desactiver" : "Activer"}
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => setPendingDeleteId(promo.id)}
                      >
                        Supprimer
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={pendingDeleteId !== null} onOpenChange={(open) => {
        if (!open) setPendingDeleteId(null);
      }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer ce code promo ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action est irréversible et supprime immédiatement le code promo sélectionné.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deletingPromoId !== null}>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (pendingDeleteId !== null) deletePromo(pendingDeleteId);
              }}
              disabled={deletingPromoId !== null}
              className="bg-destructive"
            >
              {deletingPromoId !== null ? "Suppression..." : "Supprimer"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
