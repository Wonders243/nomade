// app/api/webhook/route.ts
import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { supabase } from "@/lib/supabase/client";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { Resend } from "resend";
import { sendOrderConfirmedEmail } from "@/lib/email/order-confirmed";
import Stripe from "stripe";
import crypto from "crypto";
import { revalidatePath } from "next/cache";
import { Redis } from "@upstash/redis";

const redis = Redis.fromEnv();
const resend = new Resend(process.env.RESEND_API_KEY);
const ADMIN_EMAIL = process.env.ADMIN_EMAIL;
const NOREPLY_EMAIL = process.env.NOREPLY_EMAIL;

export async function POST(req: NextRequest) {
  // --- Rate limiting ---
  const ip = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "unknown";
  const rateKey = `stripe-webhook:rate:${ip}`;
  const rateLimit = 10;
  const rateWindow = 60;
  const current = await redis.incr(rateKey);
  if (current === 1) await redis.expire(rateKey, rateWindow);
  if (current > rateLimit) {
    console.warn(`🚫 Rate limit dépassé pour IP ${ip}`);
    return NextResponse.json(
      { error: "Trop de requêtes, veuillez réessayer dans une minute." },
      { status: 429 }
    );
  }

  // --- Vérification signature ---
  const body = await req.text();
  const signature = req.headers.get("stripe-signature")!;
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (error: any) {
    console.error("❌ Signature webhook invalide:", error.message);
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  // --- Idempotence ---
  const eventKey = `stripe:event:${event.id}`;
  const alreadyProcessed = await redis.get(eventKey);
  if (alreadyProcessed) {
    console.log(`♻️ Événement ${event.id} déjà traité, ignoré.`);
    return NextResponse.json({ received: true, alreadyProcessed: true });
  }

  // --- Traitement de l'événement ---
  if (event.type === "checkout.session.completed") {
    const session = event.data.object as any;

    // Récupération des détails de livraison
    const resolvedSession = (await stripe.checkout.sessions.retrieve(
      session.id
    )) as any;
    const shippingAddress =
      session?.shipping_details?.address ||
      session?.collected_information?.shipping_details?.address ||
      resolvedSession?.shipping_details?.address ||
      (resolvedSession as any)?.collected_information?.shipping_details?.address ||
      session?.customer_details?.address ||
      resolvedSession?.customer_details?.address ||
      null;
    const shippingPhone =
      session?.shipping_details?.phone ||
      resolvedSession?.shipping_details?.phone ||
      session?.customer_details?.phone ||
      resolvedSession?.customer_details?.phone ||
      "";
    const shippingName =
      session?.shipping_details?.name ||
      resolvedSession?.shipping_details?.name ||
      session?.customer_details?.name ||
      resolvedSession?.customer_details?.name ||
      "";

    // Métadonnées produits
    const productIds: string[] =
      session.metadata?.product_ids?.split(",").filter(Boolean) || [];
    const quantities: number[] =
      session.metadata?.quantities?.split(",").map(Number).filter(Boolean) || [];

    // Mise à jour des stocks
    const { data: products } = await supabase
      .from("products")
      .select("id, stock")
      .in("id", productIds.map(Number));

    const updates = productIds
      .map((id: string, i: number) => {
        const product = products?.find((p) => p.id === Number(id));
        if (!product) return null;
        const qty = quantities[i] ?? 1;
        return {
          id: Number(id),
          stock: Math.max(0, product.stock - qty),
        };
      })
      .filter((u): u is { id: number; stock: number } => u !== null);

    await Promise.all(
      updates.map((u) =>
        supabase.from("products").update({ stock: u.stock }).eq("id", u.id)
      )
    );

    // Line items
    const lineItems = await stripe.checkout.sessions.listLineItems(session.id);
    const orderNumber = "NOM-" + crypto.randomBytes(3).toString("hex").toUpperCase();
    const totalAmount = (session.amount_total || 0) / 100;
    const shippingAmount = (session.total_details?.amount_shipping || session.shipping_cost?.amount_total || 0) / 100;
    const discountAmount = (session.total_details?.amount_discount || 0) / 100;
    const subtotal = totalAmount - shippingAmount + discountAmount;
    const appliedPromoCode =
      typeof session.metadata?.promo_code === "string" && session.metadata.promo_code.trim()
        ? session.metadata.promo_code.trim().toUpperCase()
        : null;

    const customerName = shippingName || session.customer_details?.name || "";
    const [firstName = "", ...rest] = customerName.trim().split(/\s+/);
    const lastName = rest.join(" ");

    // Création de la commande
    const { data: order, error: orderError } = await supabase
      .from("orders")
      .insert({
        customer_id: null,
        status: "confirmed",
        subtotal: subtotal,
        shipping: shippingAmount,
        discount_amount: discountAmount,
        promo_code: appliedPromoCode,
        total: totalAmount,
        shipping_address: shippingAddress
          ? {
              firstName,
              lastName,
              email: session.customer_details?.email ?? "",
              phone: shippingPhone || session.customer_details?.phone || "",
              line1: shippingAddress.line1 || "",
              line2: shippingAddress.line2 || "",
              city: shippingAddress.city || "",
              postal_code: shippingAddress.postal_code || "",
              country: shippingAddress.country || "",
            }
          : {
              firstName,
              lastName,
              email: session.customer_details?.email ?? "",
              phone: shippingPhone || session.customer_details?.phone || "",
            },
        notes: `Commande passée via Stripe`,
        payment_intent_id: session.payment_intent,
        order_number: orderNumber,
      })
      .select("id")
      .single();

    if (orderError || !order) {
      console.error("❌ Erreur création commande :", orderError);
    } else {
      // Persistance promo (sécurité)
      const { error: promoTraceError } = await supabaseAdmin
        .from("orders")
        .update({
          discount_amount: discountAmount,
          promo_code: appliedPromoCode,
        })
        .eq("id", order.id);
      if (promoTraceError) {
        console.error("❌ Erreur persistance trace promo sur order:", promoTraceError);
      }

      // Order items
      const orderItems = lineItems.data.map((item: any, index: number) => {
        const productId = Number(productIds[index]) || 0;
        return {
          order_id: order.id,
          product_id: productId,
          product_name: item.description,
          product_price: (item.amount_total || 0) / 100 / item.quantity,
          quantity: item.quantity || 1,
          total: (item.amount_total || 0) / 100,
        };
      });

      // ✅ Correction : on ne garde que les items avec un product_id valide (> 0)
      const validOrderItems = orderItems.filter((oi) => oi.product_id > 0);
      if (validOrderItems.length > 0) {
        const { error: itemsError } = await supabase
          .from("order_items")
          .insert(validOrderItems);
        if (itemsError) {
          console.error("❌ Erreur order_items :", itemsError);
        }
      }

      // Tracking
      await supabase.from("order_tracking").insert({
        order_id: order.id,
        status: "confirmed",
        comment: "Paiement validé via Stripe",
      });

      // Gestion client
      const customerEmail = session.customer_details?.email || session.customer?.email || "";
      if (customerEmail) {
        const normalizedEmail = customerEmail.toLowerCase().trim();
        const nameParts = customerName.trim().split(" ");
        const firstName = nameParts[0] || "";
        const lastName = nameParts.slice(1).join(" ") || "";

        const { data: existingCustomer, error: lookupError } = await supabase
          .from("customers")
          .select("id, first_name, last_name, phone, address, total_orders, total_spent")
          .eq("email", normalizedEmail)
          .single();

        if (lookupError && lookupError.code !== "PGRST116") {
          console.error("❌ Erreur lookup client :", lookupError);
        }

        if (existingCustomer) {
          await supabase
            .from("customers")
            .update({
              first_name: firstName || existingCustomer.first_name,
              last_name: lastName || existingCustomer.last_name,
              phone: shippingPhone || existingCustomer.phone,
              address: shippingAddress
                ? {
                    line1: shippingAddress.line1 || "",
                    line2: shippingAddress.line2 || "",
                    city: shippingAddress.city || "",
                    postal_code: shippingAddress.postal_code || "",
                    country: shippingAddress.country || "",
                  }
                : existingCustomer.address,
              total_orders: existingCustomer.total_orders + 1,
              total_spent: existingCustomer.total_spent + totalAmount,
              updated_at: new Date().toISOString(),
            })
            .eq("id", existingCustomer.id);

          await supabase
            .from("orders")
            .update({ customer_id: existingCustomer.id })
            .eq("id", order.id);
        } else {
          const { data: newCustomer, error: customerError } = await supabase
            .from("customers")
            .insert({
              email: normalizedEmail,
              first_name: firstName,
              last_name: lastName,
              phone: shippingPhone || null,
              address: shippingAddress
                ? {
                    line1: shippingAddress.line1 || "",
                    line2: shippingAddress.line2 || "",
                    city: shippingAddress.city || "",
                    postal_code: shippingAddress.postal_code || "",
                    country: shippingAddress.country || "",
                  }
                : null,
              total_orders: 1,
              total_spent: totalAmount,
            })
            .select("id")
            .single();

          if (newCustomer && !customerError) {
            await supabase
              .from("orders")
              .update({ customer_id: newCustomer.id })
              .eq("id", order.id);
          } else {
            console.error("❌ Erreur création client :", customerError);
          }
        }
      }

      // Analytics : 1 événement par produit pour pouvoir agréger proprement par produit.
      const purchaseAnalyticsRows = productIds.map((productId, index) => ({
        event_type: "purchase_completed",
        product_id: String(productId),
        metadata: {
          order_id: order.id,
          order_number: orderNumber,
          amount: totalAmount,
          shipping: shippingAmount,
          discount: discountAmount,
          promo_code: session.metadata?.promo_code || "",
          products: productIds,
          quantities,
          customer_email: customerEmail,
          product_index: index,
          quantity: Number(quantities[index] ?? 1),
        },
      }));

      if (purchaseAnalyticsRows.length > 0) {
        const { error: analyticsError } = await supabase
          .from("analytics_events")
          .insert(purchaseAnalyticsRows);

        if (analyticsError) {
          console.error("Analytics purchase rows failed:", analyticsError);
        }
      }

      // Incrémenter l'utilisation du code promo
      const promoIdRaw = session.metadata?.promo_id;
      const promoCodeRaw = session.metadata?.promo_code;
      const promoId = promoIdRaw ? Number(promoIdRaw) : NaN;
      if (Number.isFinite(promoId) || promoCodeRaw) {
        let promoCodeRecord: { id: number; used_count: number } | null = null;
        if (Number.isFinite(promoId)) {
          const { data, error } = await supabaseAdmin
            .from("promo_codes")
            .select("id, used_count")
            .eq("id", promoId)
            .maybeSingle();
          if (!error) promoCodeRecord = data;
        }
        if (!promoCodeRecord && promoCodeRaw) {
          const { data, error } = await supabaseAdmin
            .from("promo_codes")
            .select("id, used_count")
            .eq("code", String(promoCodeRaw).trim().toUpperCase())
            .maybeSingle();
          if (!error) promoCodeRecord = data;
        }
        if (promoCodeRecord) {
          await supabaseAdmin
            .from("promo_codes")
            .update({ used_count: (promoCodeRecord.used_count || 0) + 1 })
            .eq("id", promoCodeRecord.id);
        }
      }

      // Revalidation
      for (const id of productIds) {
        revalidatePath(`/boutique/${id}`);
      }
      revalidatePath("/admin/orders");
      revalidatePath("/admin/customers");
      revalidatePath("/boutique");
      revalidatePath("/");
    }

    // --- Récupération de la facture Stripe ---
    let invoiceUrl: string | null = null;
    if (session.invoice) {
      try {
        const invoice = await stripe.invoices.retrieve(session.invoice as string);
        invoiceUrl = invoice.hosted_invoice_url || null;
      } catch (e) {
        console.warn("⚠️ Impossible de récupérer la facture :", e);
      }
    }

    // --- Email client ---
    const customerEmail = session.customer_details?.email || "";
    if (customerEmail && order) {
      const itemsForEmail = lineItems.data.map((item: any) => ({
        name: item.description || "Produit",
        quantity: item.quantity || 1,
        price: (item.amount_total || 0) / 100 / (item.quantity || 1),
      }));

      await sendOrderConfirmedEmail({
        to: customerEmail,
        customerName: customerName || "Client",
        orderNumber,
        items: itemsForEmail,
        subtotal: subtotal,
        shipping: shippingAmount,
        total: totalAmount,
        invoicePdfUrl: invoiceUrl,
      });
    }

    console.log("Metadata :", session.metadata);
    console.log("Product IDs :", productIds);
    console.log(
      "Stripe line items :",
      lineItems.data.map((i) => ({
        description: i.description,
        quantity: i.quantity,
      }))
    );

    // --- Email admin ---
    const itemsList = lineItems.data
      .map(
        (item: any) =>
          `<tr>
            <td style="padding: 8px 0; color: #44403c; font-size: 14px;">${item.description}</td>
            <td style="padding: 8px 0; color: #78716c; font-size: 14px; text-align: center;">x${item.quantity}</td>
            <td style="padding: 8px 0; color: #44403c; font-size: 14px; text-align: right;">${(item.amount_total / 100).toFixed(2)} €</td>
          </tr>`
      )
      .join("");

    const shippingAddressText = shippingAddress
      ? `${shippingAddress.line1 || ""}, ${shippingAddress.postal_code || ""} ${shippingAddress.city || ""}, ${shippingAddress.country || ""}`
      : "Adresse communiquée";

    await resend.emails.send({
      from: `Nomade <${NOREPLY_EMAIL}>`,
      to: `${ADMIN_EMAIL}`,
      subject: `Nouvelle commande ${orderNumber} — ${totalAmount.toFixed(2)} €`,
      html: `
        <div style="font-family: Inter, system-ui, sans-serif; max-width: 520px; margin: auto; padding: 30px; background: #fafaf9; border-radius: 12px;">
          <h2 style="font-weight: 400; color: #1c1917;">Nouvelle commande</h2>
          <div style="background: #1c1917; color: white; padding: 12px 16px; border-radius: 8px;">
            <p style="font-size: 18px;">${totalAmount.toFixed(2)} €</p>
            <p style="font-size: 13px; opacity: 0.7;">${orderNumber}</p>
          </div>
          <p><strong>${customerName}</strong><br/>${customerEmail}</p>
          <table style="width:100%;">${itemsList}</table>
          <p>📍 ${shippingAddressText}</p>
          <a href="${process.env.NEXT_PUBLIC_BASE_URL}/admin/orders/${order?.id}" style="display: inline-block; background: #1c1917; color: white; padding: 10px 20px; border-radius: 24px; text-decoration: none;">Voir dans l'admin</a>
        </div>`,
    });
  }

  // --- Marquer l'événement comme traité ---
  await redis.set(eventKey, "processed", { ex: 86400 });

  return NextResponse.json({ received: true });
}