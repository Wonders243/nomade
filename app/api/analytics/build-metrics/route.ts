import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase/client";
import { supabaseAdmin } from "@/lib/supabase/admin";

export async function GET() {
  try {
    const today = new Date().toISOString().split("T")[0];

    const { data: events, error: readError } = await supabase
      .from("analytics_events")
      .select("*");

    if (readError) {
      throw readError;
    }

    const products = new Map<string, {
      views: number;
      carts: number;
      purchases: number;
      totalTime: number;
      timeCount: number;
    }>();

    for (const event of events || []) {
      const productId = event.product_id;
      if (!productId) continue;

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
          },
          { onConflict: "metric_date, product_id" }
        );

      if (upsertError) {
        console.error("product_daily_metrics upsert failed", {
          productId,
          today,
          stats,
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