import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase/client";
import { supabaseAdmin } from "@/lib/supabase/admin";

function normalizeProductIds(rawValue: string | number | null | undefined): string[] {
  if (rawValue == null || rawValue === "") return [];

  const asString = String(rawValue);
  return asString
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean)
    .filter((value, index, array) => array.indexOf(value) === index);
}

async function getProjectDailyContext(date: string) {
  const dayStart = `${date}T00:00:00.000Z`;
  const dayEnd = `${date}T23:59:59.999Z`;

  const { data: orders, error: ordersError } = await supabaseAdmin
    .from("orders")
    .select("id, total, subtotal, discount_amount, promo_code, created_at")
    .gte("created_at", dayStart)
    .lte("created_at", dayEnd)
    .not("status", "eq", "cancelled");

  if (ordersError) {
    console.warn("Unable to load daily orders for analytics context:", ordersError.message);
  }

  const orderMap = new Map<string, any>();
  for (const order of orders || []) {
    orderMap.set(String(order.id), order);
  }

  const { data: orderItems, error: orderItemsError } = await supabaseAdmin
    .from("order_items")
    .select("id, order_id, product_id, quantity, total")
    .gte("created_at", dayStart)
    .lte("created_at", dayEnd);

  if (orderItemsError) {
    console.warn("Unable to load daily order items for analytics context:", orderItemsError.message);
  }

  const productRevenue = new Map<string, number>();
  const productDiscount = new Map<string, number>();
  const productPromoFlag = new Map<string, number>();

  for (const item of orderItems || []) {
    const productId = String(item.product_id);
    const order = orderMap.get(String(item.order_id));
    const itemRevenue = Number(item.total || 0);
    const itemDiscount = order && Number(order.discount_amount || 0) > 0 ? itemRevenue * (Number(order.discount_amount || 0) / Math.max(Number(order.total || itemRevenue), 1)) : 0;

    productRevenue.set(productId, (productRevenue.get(productId) || 0) + itemRevenue);
    productDiscount.set(productId, (productDiscount.get(productId) || 0) + itemDiscount);

    if (order && (order.promo_code || Number(order.discount_amount || 0) > 0)) {
      productPromoFlag.set(productId, 1);
    }
  }

  const totalRevenue = Array.from(productRevenue.values()).reduce((sum, value) => sum + value, 0);
  const totalDiscount = Array.from(productDiscount.values()).reduce((sum, value) => sum + value, 0);
  const projectDiscountPercent = totalRevenue > 0 ? (totalDiscount / totalRevenue) * 100 : 0;

  let projectAdSpend = 0;

  const candidateTables = [
    "marketing_spend",
    "daily_ad_spend",
    "campaign_daily_spend",
    "marketing_daily_spend",
    "ad_spend_daily",
  ];

  for (const tableName of candidateTables) {
    try {
      const { data: adRows, error: adError } = await supabaseAdmin
        .from(tableName)
        .select("date, ad_spend, spend, amount")
        .or(`date.eq.${date},metric_date.eq.${date}`)
        .limit(100);

      if (!adError && adRows) {
        for (const row of adRows) {
          const value = Number(row.ad_spend ?? row.spend ?? row.amount ?? 0);
          if (Number.isFinite(value)) {
            projectAdSpend += value;
          }
        }
      }
    } catch {
      // tableau absent ou non conforme ; on ignore proprement
    }
  }

  return {
    totalRevenue,
    totalDiscount,
    projectDiscountPercent,
    projectAdSpend,
    productRevenue,
    productDiscount,
    productPromoFlag,
  };
}

export async function GET(request: Request) {
  try {
    const today = new Date().toISOString().split("T")[0];
    const url = new URL(request.url);
    const forceAll = url.searchParams.get("all") === "true";
    const overrideSinceDate = url.searchParams.get("since_date");

    let sinceDateIso: string | null = null;
    if (!forceAll) {
      const { data: latestMetricRow, error: latestMetricError } = await supabaseAdmin
        .from("product_daily_metrics")
        .select("metric_date")
        .order("metric_date", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!latestMetricError && latestMetricRow?.metric_date) {
        sinceDateIso = new Date(`${latestMetricRow.metric_date}T00:00:00.000Z`).toISOString();
      }
    }

    const effectiveSinceDate = overrideSinceDate || sinceDateIso;

    let eventsQuery = supabase
      .from("analytics_events")
      .select("*");

    if (!forceAll && effectiveSinceDate) {
      eventsQuery = eventsQuery.gte("created_at", effectiveSinceDate);
    }

    const { data: events, error: readError } = await eventsQuery;

    if (readError) {
      throw readError;
    }

    const context = await getProjectDailyContext(today);

    const products = new Map<string, {
      views: number;
      carts: number;
      purchases: number;
      totalTime: number;
      timeCount: number;
    }>();

    for (const event of events || []) {
      const productIds = normalizeProductIds(event.product_id);

      if (productIds.length === 0) continue;

      for (const productId of productIds) {
        if (!products.has(productId)) {
          products.set(productId, {
            views: 0,
            carts: 0,
            purchases: 0,
            totalTime: 0,
            timeCount: 0,
          });
        }

        const stats = products.get(productId)!;

        switch (event.event_type) {
          case "product_view":
            stats.views++;
            break;
          case "add_to_cart":
            stats.carts++;
            break;
          case "purchase_completed":
            stats.purchases++;
            break;
          case "product_time_spent":
            stats.totalTime += Number(event.metadata?.seconds || 0);
            stats.timeCount++;
            break;
        }
      }
    }

    let generated = 0;

    for (const [productId, stats] of products) {
      const avgTime =
        stats.timeCount > 0
          ? stats.totalTime / stats.timeCount
          : 0;

      const trendScore =
        stats.views * 0.1 +
        stats.carts * 0.3 +
        stats.purchases * 0.4 +
        avgTime * 0.2;

      const productRevenue = Number(context.productRevenue.get(productId) || 0);
      const productDiscount = Number(context.productDiscount.get(productId) || 0);
      const promoFlag = context.productPromoFlag.get(productId) === 1 ? 1 : 0;
      const discountPercent = productRevenue > 0 ? (productDiscount / productRevenue) * 100 : 0;
      const adSpend = context.totalRevenue > 0 && context.projectAdSpend > 0
        ? context.projectAdSpend * (productRevenue / context.totalRevenue)
        : 0;

      const { error: upsertError } = await supabaseAdmin
        .from("product_daily_metrics")
        .upsert(
          {
            metric_date: today,
            product_id: productId,
            views: stats.views,
            carts: stats.carts,
            purchases: stats.purchases,
            avg_time_spent: avgTime,
            trend_score: trendScore,
            promo_flag: promoFlag,
            discount_percent: discountPercent,
            ad_spend: adSpend,
          },
          { onConflict: "metric_date, product_id" }
        );

      if (upsertError) {
        console.error("product_daily_metrics upsert failed", {
          productId,
          today,
          stats,
          context,
          error: upsertError,
        });

        return NextResponse.json(
          {
            success: false,
            error: "metrics_write_failed",
            details: upsertError.message,
          },
          { status: 500 }
        );
      }

      generated++;
    }

    return NextResponse.json({
      success: true,
      products_processed: generated,
      project_context: {
        totalRevenue: context.totalRevenue,
        projectDiscountPercent: context.projectDiscountPercent,
        projectAdSpend: context.projectAdSpend,
      },
    });
  } catch (error: any) {
    console.error("build-metrics failed", error);
    return NextResponse.json(
      {
        success: false,
        error: "metrics_generation_failed",
        details: error?.message || "unknown_error",
      },
      { status: 500 }
    );
  }
}