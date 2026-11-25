import "server-only";

import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import type { Metadata } from "next";
import { supabaseServer } from "@/lib/supabase/server";
import { calculateSetPrice } from "@/lib/pricing/setPrice";
import SetConfigurator, {
  type SetConfigGroup,
  type SetConfigItem,
} from "@/components/SetConfigurator";
import { absoluteUrl, SITE_NAME, SITE_URL } from "@/lib/site";
import { publicImageUrl } from "@/lib/media/paths";

export const instant = false;

interface SetPageProps {
  params: Promise<{ sku: string }>;
}

interface SetRow {
  id: string;
  sku: string;
  name: string;
  short_description: string | null;
  main_image_url: string | null;
  hover_image_url: string | null;
}

export async function generateMetadata({ params }: SetPageProps): Promise<Metadata> {
  const { sku } = await params;
  const title = `${sku.toUpperCase()} Set | ${SITE_NAME}`;
  return {
    title,
    description: `Buy the ${sku.toUpperCase()} set direct from the SANRA LIVING factory with a GST invoice.`,
    alternates: { canonical: `${SITE_URL}/sets/${encodeURIComponent(sku)}` },
    openGraph: {
      title,
      description: `Factory-direct set pricing for ${sku.toUpperCase()}.`,
      url: `${SITE_URL}/sets/${encodeURIComponent(sku)}`,
      images: [{ url: `${SITE_URL}/og-default.png` }],
    },
    twitter: { card: "summary_large_image" },
  };
}

export default async function SetPage({ params }: SetPageProps) {
  await connection();
  const { sku } = await params;
  const upperSku = sku.trim().toUpperCase();

  const { data: set } = await supabaseServer
    .from("product_sets")
    .select("*")
    .eq("sku", upperSku)
    .eq("is_active", true)
    .maybeSingle();

  if (!set) notFound();

  const setRow = set as SetRow;
  const [{ data: items }, { data: groups }, { data: options }] = await Promise.all([
    supabaseServer
      .from("product_set_items")
      .select("id, product_id, quantity, default_selection, allow_customize, sort_order")
      .eq("set_id", setRow.id)
      .order("sort_order"),
    supabaseServer
      .from("product_type_option_groups")
      .select("*")
      .order("sort_order"),
    supabaseServer
      .from("configurator_options")
      .select("*")
      .eq("is_active", true)
      .order("sort_order"),
  ]);

  const productIds = [...new Set((items ?? []).map((item) => item.product_id))];
  const { data: products } =
    productIds.length > 0
      ? await supabaseServer
          .from("products")
          .select("id, sku, name, product_type")
          .in("id", productIds)
          .eq("is_active", true)
      : { data: [] as Array<{ id: string; sku: string; name: string; product_type: string }> };

  const productMap = new Map(
    (
      (products ?? []) as Array<{
        id: string;
        sku: string;
        name: string;
        product_type: string;
      }>
    ).map((product) => [product.id, product])
  );
  const activeGroups = (groups ?? []).filter((group) => group.is_active !== false);

  const configItems: SetConfigItem[] = (items ?? []).flatMap((item) => {
    const product = productMap.get(item.product_id);
    if (!product) return [];

    const typeGroups = activeGroups.filter(
      (group) => group.product_type === product.product_type
    );

    const configGroups: SetConfigGroup[] = typeGroups.flatMap((group) => {
      const groupOptions = (options ?? []).filter(
        (option) => option.option_group === group.option_group
      );
      if (groupOptions.length === 0) return [];
      return [
        {
          code: group.option_group,
          title: group.group_title,
          options: groupOptions.map((option) => ({
            code: option.option_code,
            label: option.label_en,
            badge: option.badge_text,
            note: option.spec_note,
          })),
        },
      ];
    });

    const defaultSelection: Record<string, string> = {};
    const saved = (item.default_selection ?? {}) as Record<string, string>;
    for (const group of typeGroups) {
      const groupOptions = (options ?? []).filter(
        (option) => option.option_group === group.option_group
      );
      if (groupOptions.length === 0) continue;
      const preferred =
        saved[group.option_group] ||
        group.default_code ||
        groupOptions[0].option_code;
      defaultSelection[group.option_group] = groupOptions.some(
        (option) => option.option_code === preferred
      )
        ? preferred
        : groupOptions[0].option_code;
    }

    return [
      {
        id: item.id,
        name: product.name,
        sku: product.sku,
        quantity: Math.max(1, Number(item.quantity)),
        allowCustomize: Boolean(item.allow_customize),
        groups: configGroups,
        defaultSelection,
      },
    ];
  });

  let fromPrice: number | null = null;
  try {
    const price = await calculateSetPrice({ sku: upperSku, quantity: 1 });
    fromPrice = price.requires_quote ? null : price.unit_price;
  } catch {
    fromPrice = null;
  }

  const mainImage = publicImageUrl(setRow.main_image_url);
  const productJsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: setRow.name,
    sku: setRow.sku,
    image: mainImage ? [absoluteUrl(mainImage)] : undefined,
    description: setRow.short_description ?? undefined,
    brand: { "@type": "Brand", name: "SANRA LIVING" },
    ...(fromPrice != null
      ? {
          offers: {
            "@type": "Offer",
            priceCurrency: "INR",
            price: fromPrice,
            availability: "https://schema.org/InStock",
            url: `${SITE_URL}/sets/${encodeURIComponent(setRow.sku)}`,
          },
        }
      : {}),
  };

  return (
    <div className="sanra-subpage min-h-screen">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(productJsonLd) }}
      />
      <div className="sanra-container py-8 lg:py-12">
        <div className="flex items-center gap-2 mb-8 text-xs text-neutral-500 font-semibold uppercase tracking-wider">
          <Link href="/" className="hover:text-black">
            Home
          </Link>
          <span>/</span>
          <Link href="/sets" className="hover:text-black">
            Sets &amp; Combos
          </Link>
          <span>/</span>
          <span className="text-neutral-800">{setRow.sku}</span>
        </div>

        <SetConfigurator
          sku={setRow.sku}
          name={setRow.name}
          description={setRow.short_description}
          mainImage={mainImage}
          hoverImage={publicImageUrl(setRow.hover_image_url)}
          items={configItems}
        />
      </div>
    </div>
  );
}
