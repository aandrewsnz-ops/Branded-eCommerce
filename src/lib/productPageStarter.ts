import type {
  CustomerAvatarContent,
  MassDesire,
  MarketingAngle,
  ProductPageContent,
  ProductPageSection,
  ProductPageSectionType,
  ProductProject,
  ResearchInsight,
  ResearchSource,
} from "../types";
import { buildProductPageImageFilename } from "./productPageFilenames";
import { hydrateProductPageContent } from "./productPageLiquid";

export interface StarterProductPageContext {
  project: ProductProject;
  insight?: ResearchInsight | null;
  avatar?: CustomerAvatarContent | null;
  desires?: MassDesire[];
  angles?: MarketingAngle[];
  sources?: ResearchSource[];
}

function productName(project: ProductProject): string {
  return project.our_product_name?.trim() || "your product";
}

function storeName(project: ProductProject): string {
  return project.your_store_name?.trim() || "Your store";
}

function offerLine(project: ProductProject): string {
  const offer = project.current_offer?.trim();
  const price = project.planned_sale_price?.trim();
  if (offer && price) return `${offer} · ${price}`;
  return offer || price || "";
}

function firstCustomerPhrase(ctx: StarterProductPageContext): string {
  const fromSource = ctx.sources
    ?.flatMap((s) => s.useful_phrases ?? [])
    .find((p) => p.trim());
  if (fromSource) return fromSource.trim();

  const fromAvatar = ctx.avatar?.language_bank?.phrases_they_use?.[0]?.trim();
  if (fromAvatar) return fromAvatar;

  const fromDesire = ctx.desires?.[0]?.pain_it_moves_away_from?.trim();
  if (fromDesire) return fromDesire;

  return "skin that still does not feel fresh after cleansing";
}

function primaryDesireStatement(ctx: StarterProductPageContext): string {
  return (
    ctx.desires?.[0]?.desire_statement?.trim() ||
    ctx.insight?.pain_clusters?.[0]?.name?.trim() ||
    "a simple reset step for everyday skincare"
  );
}

function comparisonRightLabel(project: ProductProject): string {
  const name = productName(project).toLowerCase();
  if (name.includes("mask") || name.includes("peel")) {
    return "Cleansing alone";
  }
  return "Your usual routine";
}

function buildImagePrompt(
  name: string,
  scene: string,
  subject: string,
  placement: string,
  composition: string
): string {
  return [
    `Create a realistic UGC-style skincare photo for ${name}.`,
    `Scene: ${scene}.`,
    `Subject: ${subject}.`,
    `Product placement: ${placement}.`,
    "Lighting: soft bathroom daylight.",
    `Composition: ${composition}.`,
    "No text overlay.",
  ].join(" ");
}

function baseSection(
  partial: Partial<ProductPageSection> &
    Pick<ProductPageSection, "section_type" | "order">
): ProductPageSection {
  const section: ProductPageSection = {
    id: `${partial.section_type}-${partial.order}`,
    shopify_image_url: "",
    custom_liquid: "",
    image_filename: "",
    body_paragraphs: [],
    bullets: [],
    image_required: true,
    section_title: "",
    shopify_section_name: "",
    purpose: "",
    headline: "",
    image_role: "",
    image_prompt: "",
    ...partial,
  };
  section.image_filename = buildProductPageImageFilename(section);
  return section;
}

function buildSections(ctx: StarterProductPageContext): ProductPageSection[] {
  const project = ctx.project;
  const name = productName(project);
  const phrase = firstCustomerPhrase(ctx);
  const desire = primaryDesireStatement(ctx);
  const comparisonRight = comparisonRightLabel(project);
  const comparisonLeft = name;

  const sections: ProductPageSection[] = [
    baseSection({
      order: 1,
      section_type: "proof_intro",
      section_title: "Proof 1",
      shopify_section_name: "Proof 1",
      purpose:
        "Introduce the core customer problem and product role with a UGC-style proof image.",
      headline: "When cleansing does not feel enough.",
      accent_headline: "enough",
      proof_line:
        "★★★★★ “A simple reset step for skin that still feels clogged after cleansing.”",
      body_paragraphs: [
        `Cleansing helps, but some days your skin still does not look or feel as fresh as you wanted. ${name} fits into a simple reset ritual when ${phrase} shows up in real life.`,
        "Use this section to explain the product’s role in plain language drawn from your customer research.",
      ],
      bullets: [],
      button_label: "👉 Try It Now",
      small_print: "Cosmetic skincare product. Results vary by skin type.",
      image_role: "UGC proof image",
      image_prompt: buildImagePrompt(
        name,
        "clean bathroom mirror or vanity",
        "customer-style selfie or mirror shot showing tired skin texture around the nose or T-zone",
        `${name} visible on the counter or in hand, label facing camera`,
        "natural, believable Shopify product page proof image"
      ),
    }),
    baseSection({
      order: 2,
      section_type: "ritual",
      section_title: "Ritual",
      shopify_section_name: "Ritual",
      purpose: "Explain the simple product ritual and why it feels like a reset.",
      headline: "A simple reset ritual.",
      accent_headline: "reset",
      body_paragraphs: [
        `${name} is designed to feel like a small, intentional pause — not another complicated step.`,
        "Describe how the product fits into an easy at-home moment using language your customer already uses.",
      ],
      bullets: [
        "Quick to use between cleansing and moisturising",
        "Feels like a visible reset moment",
        "Easy to repeat a few times per week",
      ],
      image_role: "Customer holding product",
      image_prompt: buildImagePrompt(
        name,
        "bright bathroom or vanity",
        "customer holding the product casually, mid-routine",
        "product label readable, held naturally at chest height",
        "warm, approachable UGC product-in-hand shot"
      ),
    }),
    baseSection({
      order: 3,
      section_type: "benefits_grid",
      section_title: "Benefits",
      shopify_section_name: "Benefits Grid",
      purpose: "Four benefit blocks around a central product or UGC image.",
      headline: "What a visible reset moment can feel like.",
      accent_headline: "reset",
      body_paragraphs: [
        `Customers looking for ${desire} want benefits that feel practical, not overpromised.`,
      ],
      bullets: [],
      benefit_items: [
        {
          title: "Feels like a fresh start",
          description:
            "A simple step when your usual cleanse did not feel like enough.",
        },
        {
          title: "Easy to fit in",
          description: "Short ritual that slots into an existing skincare routine.",
        },
        {
          title: "Product-forward proof",
          description: `Show ${name} as the hero of a believable at-home moment.`,
        },
        {
          title: "Cosmetic, not clinical",
          description: "Keep claims grounded and aligned with your compliance notes.",
        },
      ],
      image_role: "Central product or UGC image",
      image_prompt: buildImagePrompt(
        name,
        "neutral cream background or clean vanity",
        "product jar or tube centered with soft lifestyle props",
        "product upright, label forward, subtle texture on surface",
        "benefits grid hero image for Shopify product page"
      ),
    }),
    baseSection({
      order: 4,
      section_type: "how_to_use",
      section_title: "How to use",
      shopify_section_name: "How to Use",
      purpose: "Three easy steps with an application-style image.",
      headline: "Three easy steps.",
      body_paragraphs: [
        `Keep instructions short and visual. Replace these steps with your supplier directions for ${name}.`,
      ],
      bullets: [],
      steps: [
        {
          title: "Prep clean skin",
          description: "Start with cleansed, dry skin on the areas you plan to treat.",
        },
        {
          title: "Apply the product",
          description: `Use ${name} as directed — a thin, even layer is usually enough.`,
        },
        {
          title: "Finish your routine",
          description: "Follow with moisturiser or SPF as appropriate for your routine.",
        },
      ],
      image_role: "Application shot",
      image_prompt: buildImagePrompt(
        name,
        "close-up vanity or hands-only frame",
        "hands applying product to cheek or nose area",
        "product texture or applicator visible, no medical close-ups",
        "clear how-to-use application photo"
      ),
    }),
    baseSection({
      order: 5,
      section_type: "social_proof",
      section_title: "Social proof",
      shopify_section_name: "After the ritual",
      purpose: "Customer-style observation after use with UGC mirror or selfie image.",
      headline: "After the ritual.",
      proof_line: "★★★★★ “My skin looked smoother and fresher after I added this step.”",
      body_paragraphs: [
        "Use believable, cosmetic language — not guaranteed transformation claims.",
        `Tie the moment back to ${phrase} without inventing clinical proof.`,
      ],
      bullets: [],
      image_role: "UGC mirror or selfie",
      image_prompt: buildImagePrompt(
        name,
        "bathroom mirror selfie",
        "customer-style mirror photo after skincare step",
        `${name} visible on counter or in hand`,
        "authentic post-routine UGC social proof image"
      ),
    }),
    baseSection({
      order: 6,
      section_type: "comparison",
      section_title: "Comparison",
      shopify_section_name: "Difference",
      purpose: "Compare the product ritual against the usual failed alternative.",
      headline: `${comparisonLeft} vs ${comparisonRight}`,
      body_paragraphs: [
        "Show why the ritual feels different from what customers already tried.",
      ],
      bullets: [],
      comparison_left_title: comparisonLeft,
      comparison_right_title: comparisonRight,
      comparison_left_bullets: [
        "Adds a dedicated reset step",
        "Designed for a visible at-home moment",
        "Fits a repeatable weekly ritual",
      ],
      comparison_right_bullets: [
        "May not address how skin still looks or feels",
        "Easy to rush through on busy days",
        "Hard to notice a meaningful difference",
      ],
      image_required: false,
      image_role: "",
      image_prompt: "",
    }),
    baseSection({
      order: 7,
      section_type: "faq",
      section_title: "FAQ",
      shopify_section_name: "FAQ",
      purpose: "Answer common buyer objections.",
      headline: "Questions customers ask before they try it.",
      body_paragraphs: [],
      bullets: [],
      image_required: false,
      image_role: "",
      image_prompt: "",
      faq_items: [
        {
          question: `How do I use ${name}?`,
          answer:
            "Follow the three-step routine on this page and replace with your official usage directions.",
        },
        {
          question: "How often should I use it?",
          answer:
            "Start with the frequency recommended on your product label or supplier instructions.",
        },
        {
          question: "Is this suitable for sensitive skin?",
          answer:
            "Patch test first and avoid sensitive areas. Adjust copy to match your product documents.",
        },
        {
          question: offerLine(project)
            ? `What is the current offer?`
            : "What is your return policy?",
          answer: offerLine(project)
            ? `${offerLine(project)}. Replace with your live offer details.`
            : `${storeName(project)} stands behind the product — add your guarantee terms here.`,
        },
      ],
    }),
    baseSection({
      order: 8,
      section_type: "guarantee",
      section_title: "Guarantee",
      shopify_section_name: "Guarantee",
      purpose: "Money-back guarantee and reassurance block.",
      subheading: "No Questions Asked",
      headline: "60 Day Money Back Guarantee",
      product_name: name,
      body_paragraphs: [
        `Add your official guarantee language for ${storeName(project)} here.`,
        "Keep this aligned with your checkout and policy pages.",
      ],
      bullets: [],
      image_required: false,
      image_role: "",
      image_prompt: "",
    }),
    baseSection({
      order: 9,
      section_type: "reviews",
      section_title: "Reviews",
      shopify_section_name: "What people are saying",
      purpose: "UGC-style testimonial cards or carousel content.",
      headline: "What people are saying.",
      body_paragraphs: [
        "Replace these placeholders with real reviews when available. Do not invent verified purchasers.",
      ],
      bullets: [],
      testimonials: [
        {
          quote: "Easy step to add when my skin still looked dull after cleansing.",
          attribution: "Sarah · Melbourne",
        },
        {
          quote: "Feels like a proper reset without overcomplicating my routine.",
          attribution: "Jess · Sydney",
        },
        {
          quote: "I like that the ritual is simple and the product looks great on my vanity.",
          attribution: "Emma · Brisbane",
        },
      ],
      image_role: "UGC review collage",
      image_prompt: buildImagePrompt(
        name,
        "collage-friendly neutral background",
        "mix of customer-style skincare shelfie and product close-up",
        "product among everyday bathroom items",
        "review section hero image, authentic UGC feel"
      ),
    }),
    baseSection({
      order: 10,
      section_type: "care_disclaimer",
      section_title: "Use with care",
      shopify_section_name: "Disclaimer",
      purpose: "Patch test, sensitive areas, expectations, and product documents.",
      headline: "Use with care.",
      body_paragraphs: [
        `Read all product instructions before using ${name}.`,
        "Cosmetic product only. Individual results vary.",
      ],
      bullets: [
        "Patch test before first use",
        "Avoid broken or irritated skin",
        "Keep away from eyes and mucous membranes",
        "Follow label directions and storage guidance",
      ],
      small_print:
        "Replace with your official INCI, warnings, and regulatory copy from supplier documents.",
      image_required: false,
      image_role: "",
      image_prompt: "",
    }),
  ];

  return sections;
}

/** Build a deterministic Shopify product page strawman (no AI). */
export function buildStarterProductPageContent(
  ctx: StarterProductPageContext
): ProductPageContent {
  const name = productName(ctx.project);
  const sections = buildSections(ctx);

  return hydrateProductPageContent({
    page_title: `${name} Product Page`,
    page_strategy:
      "Starter UGC-focused Shopify product page template with placeholder copy and image prompts. Polish each section before publishing.",
    sections,
  });
}

export const STARTER_PRODUCT_PAGE_SECTION_TYPES: ProductPageSectionType[] = [
  "proof_intro",
  "ritual",
  "benefits_grid",
  "how_to_use",
  "social_proof",
  "comparison",
  "faq",
  "guarantee",
  "reviews",
  "care_disclaimer",
];
