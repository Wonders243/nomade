import { supabase } from "@/lib/supabase/client";
import { supabaseAdmin } from "@/lib/supabase/admin";

function normalizeProductIds(rawValue: string | number | null | undefined): string[] {
  if (rawValue == null || rawValue === "") return [];

  return String(rawValue)
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean)
    .filter((value, index, array) => array.indexOf(value) === index);
}

async function getProjectDailyContext(date: string) {
  const dayStart = `${date}T00:00:00.000Z`;
  const dayEnd = `${date}T23:59:59.999Z`;

  const { data: orders } = await supabaseAdmin
    .from("orders")
    .select("id, total, subtotal, discount_amount, promo_code, created_at")
    .gte("created_at", dayStart)
    .lte("created_at", dayEnd)
    .not("status", "eq", "cancelled");

  const orderMap = new Map<string, any>();
  for (const order of orders || []) {
    orderMap.set(String(order.id), order);
  }

  const { data: orderItems } = await supabaseAdmin
    .from("order_items")
    .select("id, order_id, product_id, quantity, total")
    .gte("created_at", dayStart)
    .lte("created_at", dayEnd);

  const productRevenue = new Map<string, number>();
  const productDiscount = new Map<string, number>();
  const productPromoFlag = new Map<string, number>();

  for (const item of orderItems || []) {
    const productId = String(item.product_id);
    const order = orderMap.get(String(item.order_id));
    const itemRevenue = Number(item.total || 0);
    const itemDiscount = order && Number(order.discount_amount || 0) > 0
      ? itemRevenue * (Number(order.discount_amount || 0) / Math.max(Number(order.total || itemRevenue), 1))
      : 0;

    productRevenue.set(productId, (productRevenue.get(productId) || 0) + itemRevenue);
    productDiscount.set(productId, (productDiscount.get(productId) || 0) + itemDiscount);

    if (order && (order.promo_code || Number(order.discount_amount || 0) > 0)) {
      productPromoFlag.set(productId, 1);
    }
  }

  const totalRevenue = Array.from(productRevenue.values()).reduce((sum, value) => sum + value, 0);
  const totalDiscount = Array.from(productDiscount.values()).reduce((sum, value) => sum + value, 0);
  let projectAdSpend = 0;

  for (const tableName of ["marketing_spend", "daily_ad_spend", "campaign_daily_spend", "marketing_daily_spend", "ad_spend_daily"]) {
    const { data: adRows, error } = await supabaseAdmin
      .from(tableName)
      .select("date, ad_spend, spend, amount")
      .or(`date.eq.${date},metric_date.eq.${date}`)
      .limit(100);

    if (!error && adRows) {
      for (const row of adRows) {
        const value = Number(row.ad_spend ?? row.spend ?? row.amount ?? 0);
        if (Number.isFinite(value)) projectAdSpend += value;
      }
    }
  }

  return {
    totalRevenue,
    totalDiscount,
    projectAdSpend,
    productRevenue,
    productDiscount,
    productPromoFlag,
  };
}

async function buildMetrics() {
  const today = new Date().toISOString().split("T")[0];

  const { data: events } = await supabase
    .from("analytics_events")
    .select("*");

  if (!events) return;

  const context = await getProjectDailyContext(today);
  const products = new Map<string, {
    views: number;
    carts: number;
    purchases: number;
    totalTime: number;
    timeCount: number;
  }>();

  for (const event of events) {
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

  for (const [productId, stats] of products) {
    const avgTime = stats.timeCount > 0 ? stats.totalTime / stats.timeCount : 0;
    const trendScore = stats.views * 0.1 + stats.carts * 0.3 + stats.purchases * 0.4 + avgTime * 0.2;
    const productRevenue = Number(context.productRevenue.get(productId) || 0);
    const productDiscount = Number(context.productDiscount.get(productId) || 0);
    const promoFlag = context.productPromoFlag.get(productId) === 1 ? 1 : 0;
    const discountPercent = productRevenue > 0 ? (productDiscount / productRevenue) * 100 : 0;
    const adSpend = context.totalRevenue > 0 && context.projectAdSpend > 0
      ? context.projectAdSpend * (productRevenue / context.totalRevenue)
      : 0;

    await supabaseAdmin
      .from("product_daily_metrics")
      .upsert({
        metric_date: today,
        product_id: productId,
        views: stats.views,
        carts: stats.carts,
        purchases: stats.purchases,
        trend_score: trendScore,
        avg_time_spent: avgTime,
        promo_flag: promoFlag,
        discount_percent: discountPercent,
        ad_spend: adSpend,
      }, { onConflict: "metric_date, product_id" });
  }

  console.log("Metrics generated");
}

buildMetrics();