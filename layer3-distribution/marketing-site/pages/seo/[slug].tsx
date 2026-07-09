/**
 * KORI Programmatic SEO Page Template
 * Generates 200+ compliance pages from a single template + data file.
 *
 * URL pattern: /compliance/[slug]
 * Examples:
 *   /compliance/aml-system-mobile-money-operator-nigeria-cbn
 *   /compliance/transaction-monitoring-payment-service-provider-nigeria
 *   /compliance/vasp-travel-rule-compliance-nigeria-fatf
 *
 * Place at: frontend/pages/compliance/[slug].tsx
 */

import { GetStaticPaths, GetStaticProps } from "next";
import Head from "next/head";
import Link from "next/link";
import seoPages from "../../data/seo-pages.json";

// ─── Types ────────────────────────────────────────────────────────────────────

interface SeoPage {
  slug: string;
  keyword: string;
  title: string;
  metaDescription: string;
  h1: string;
  licenseType: string;
  cbnSection: string;
  deadlineMonths: number;
  urgencyStatement: string;
  problemStatement: string;
  cbnRequirements: string[];
  whyRulesBasedFails: string[];
  graphAdvantages: string[];
  implementationSteps: string[];
  faqs: Array<{ question: string; answer: string }>;
  relatedPages: Array<{ title: string; slug: string }>;
  publishDate: string;
}

interface Props {
  page: SeoPage;
}

// ─── Static Generation ────────────────────────────────────────────────────────

export const getStaticPaths: GetStaticPaths = async () => {
  const paths = seoPages.map((p: SeoPage) => ({
    params: { slug: p.slug }
  }));
  return { paths, fallback: false };
};

export const getStaticProps: GetStaticProps<Props> = async ({ params }) => {
  const page = seoPages.find((p: SeoPage) => p.slug === params?.slug);
  if (!page) return { notFound: true };
  return { props: { page } };
};

// ─── FAQ Schema ───────────────────────────────────────────────────────────────

function buildFaqSchema(faqs: SeoPage["faqs"]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map(faq => ({
      "@type": "Question",
      name: faq.question,
      acceptedAnswer: { "@type": "Answer", text: faq.answer }
    }))
  };
}

function buildArticleSchema(page: SeoPage) {
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: page.h1,
    description: page.metaDescription,
    author: { "@type": "Organization", name: "KORI AML Intelligence", url: "https://kori.seamount.io" },
    publisher: { "@type": "Organization", name: "KORI AML Intelligence", logo: { "@type": "ImageObject", url: "https://kori.seamount.io/logo.png" } },
    datePublished: page.publishDate,
    dateModified: page.publishDate,
  };
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function CompliancePage({ page }: Props) {
  const canonicalUrl = `https://kori.seamount.io/compliance/${page.slug}`;
  const urgencyColor = page.deadlineMonths <= 18 ? "#ef4444" : "#f59e0b";

  return (
    <>
      <Head>
        <title>{page.title}</title>
        <meta name="description" content={page.metaDescription} />
        <link rel="canonical" href={canonicalUrl} />
        <meta property="og:title" content={page.title} />
        <meta property="og:description" content={page.metaDescription} />
        <meta property="og:url" content={canonicalUrl} />
        <meta property="og:type" content="article" />
        <meta name="twitter:card" content="summary_large_image" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(buildFaqSchema(page.faqs)) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(buildArticleSchema(page)) }}
        />
      </Head>

      <div style={{ minHeight: "100vh", background: "#0a0f1e", color: "#fff", fontFamily: "system-ui, sans-serif" }}>
        {/* Nav */}
        <nav style={{ borderBottom: "1px solid #1e293b", padding: "16px 24px" }}>
          <div style={{ maxWidth: 900, margin: "0 auto", display: "flex", alignItems: "center", gap: 24 }}>
            <Link href="/" style={{ display: "flex", alignItems: "center", gap: 10, textDecoration: "none", color: "#fff" }}>
              <div style={{ width: 32, height: 32, background: "#00bcd4", borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700 }}>K</div>
              <span style={{ fontWeight: 600 }}>KORI AML Intelligence</span>
            </Link>
            <Link href="/compliance-audit" style={{ marginLeft: "auto", background: "#00bcd4", color: "#000", padding: "8px 20px", borderRadius: 6, textDecoration: "none", fontWeight: 600, fontSize: 14 }}>
              Free Compliance Audit →
            </Link>
          </div>
        </nav>

        <main style={{ maxWidth: 900, margin: "0 auto", padding: "48px 24px" }}>
          {/* Deadline Banner */}
          <div style={{ background: "#1a0a0a", border: `1px solid ${urgencyColor}`, borderRadius: 10, padding: "14px 20px", marginBottom: 32, display: "flex", alignItems: "center", gap: 12 }}>
            <span style={{ fontSize: 18 }}>⚡</span>
            <div>
              <span style={{ color: urgencyColor, fontWeight: 700 }}>{page.urgencyStatement}</span>
              {" "}CBN roadmap submission deadline: <strong style={{ color: "#fff" }}>~June 8, 2026</strong>
            </div>
          </div>

          {/* License type badge */}
          <div style={{ marginBottom: 16 }}>
            <span style={{ background: "#0e3a4a", color: "#00bcd4", fontSize: 12, fontWeight: 700, padding: "4px 12px", borderRadius: 20 }}>
              {page.licenseType} COMPLIANCE GUIDE
            </span>
            <span style={{ marginLeft: 12, color: "#475569", fontSize: 13 }}>CBN {page.cbnSection}</span>
          </div>

          {/* H1 */}
          <h1 style={{ fontSize: 38, fontWeight: 800, lineHeight: 1.2, marginBottom: 20 }}>{page.h1}</h1>

          {/* Key Takeaways */}
          <div style={{ background: "#111827", borderLeft: "4px solid #00bcd4", borderRadius: "0 10px 10px 0", padding: "20px 24px", marginBottom: 40 }}>
            <div style={{ fontSize: 13, color: "#00bcd4", fontWeight: 700, marginBottom: 12 }}>KEY TAKEAWAYS</div>
            <ul style={{ margin: 0, padding: "0 0 0 20px", color: "#94a3b8", lineHeight: 1.8, fontSize: 15 }}>
              <li>The CBN requires {page.licenseType}s to deploy automated AML within <strong style={{ color: "#fff" }}>{page.deadlineMonths} months</strong></li>
              <li>Every institution must submit an implementation roadmap by <strong style={{ color: "#fff" }}>~June 8, 2026</strong></li>
              <li>Rule-based systems alone will not satisfy CBN {page.cbnSection} standards</li>
              <li>Graph-based AI detects fraud rings that rule-based systems miss entirely</li>
              <li>KORI is the only Nigeria-built platform aligned to CBN baseline standards §4-6</li>
            </ul>
          </div>

          {/* Section 1: The Problem */}
          <h2 style={{ fontSize: 26, fontWeight: 700, marginBottom: 16 }}>The compliance challenge facing {page.licenseType}s</h2>
          <p style={{ color: "#94a3b8", lineHeight: 1.8, marginBottom: 32, fontSize: 16 }}>
            {page.problemStatement}
          </p>

          {/* Section 2: CBN Requirements */}
          <h2 style={{ fontSize: 26, fontWeight: 700, marginBottom: 16 }}>What CBN {page.cbnSection} actually requires</h2>
          <div style={{ display: "grid", gap: 12, marginBottom: 40 }}>
            {page.cbnRequirements.map((req, i) => (
              <div key={i} style={{ background: "#111827", border: "1px solid #1e293b", borderRadius: 10, padding: "16px 20px", display: "flex", gap: 12 }}>
                <span style={{ color: "#00bcd4", fontWeight: 700, flexShrink: 0 }}>§</span>
                <span style={{ color: "#cbd5e1", fontSize: 15, lineHeight: 1.6 }}>{req}</span>
              </div>
            ))}
          </div>

          {/* Section 3: Why rules-based fails */}
          <h2 style={{ fontSize: 26, fontWeight: 700, marginBottom: 16 }}>Why traditional rule-based systems fall short</h2>
          <div style={{ display: "grid", gap: 10, marginBottom: 40 }}>
            {page.whyRulesBasedFails.map((point, i) => (
              <div key={i} style={{ background: "#1a0a0a", border: "1px solid #2d1515", borderRadius: 8, padding: "12px 16px", color: "#fca5a5", fontSize: 14, lineHeight: 1.6 }}>
                ✗ {point}
              </div>
            ))}
          </div>

          {/* Section 4: Graph-based solution */}
          <h2 style={{ fontSize: 26, fontWeight: 700, marginBottom: 16 }}>How KORI's graph-based approach satisfies the CBN requirement</h2>
          <div style={{ display: "grid", gap: 10, marginBottom: 40 }}>
            {page.graphAdvantages.map((adv, i) => (
              <div key={i} style={{ background: "#0a1a14", border: "1px solid #14532d", borderRadius: 8, padding: "12px 16px", color: "#86efac", fontSize: 14, lineHeight: 1.6 }}>
                ✓ {adv}
              </div>
            ))}
          </div>

          {/* Section 5: Implementation steps */}
          <h2 style={{ fontSize: 26, fontWeight: 700, marginBottom: 20 }}>Implementation roadmap for {page.licenseType}s</h2>
          <div style={{ display: "grid", gap: 16, marginBottom: 48 }}>
            {page.implementationSteps.map((step, i) => (
              <div key={i} style={{ display: "flex", gap: 16, alignItems: "flex-start" }}>
                <div style={{ width: 36, height: 36, background: "#0e3a4a", border: "1px solid #00bcd4", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, color: "#00bcd4", flexShrink: 0, fontSize: 15 }}>
                  {i + 1}
                </div>
                <div style={{ color: "#cbd5e1", fontSize: 15, lineHeight: 1.7, paddingTop: 6 }}>{step}</div>
              </div>
            ))}
          </div>

          {/* CTA Block */}
          <div style={{ background: "#0e3a4a", border: "1px solid #00bcd4", borderRadius: 16, padding: 36, textAlign: "center", marginBottom: 60 }}>
            <h3 style={{ fontSize: 24, marginBottom: 12 }}>Know your compliance score in 5 minutes</h3>
            <p style={{ color: "#94a3b8", marginBottom: 24, fontSize: 15 }}>
              KORI's free CBN Compliance Audit maps your institution's current AML posture
              to the exact CBN baseline standards — with a gap analysis and remediation roadmap.
            </p>
            <Link href="/compliance-audit" style={{
              display: "inline-block", background: "#00bcd4", color: "#000",
              padding: "14px 36px", borderRadius: 8, fontWeight: 700, fontSize: 16,
              textDecoration: "none", marginBottom: 12
            }}>
              Take the Free Audit →
            </Link>
            <div style={{ fontSize: 13, color: "#475569" }}>5 minutes · No credit card · PDF report included</div>
          </div>

          {/* FAQ Section */}
          <h2 style={{ fontSize: 26, fontWeight: 700, marginBottom: 24 }}>Frequently asked questions</h2>
          <div style={{ display: "flex", flexDirection: "column", gap: 16, marginBottom: 60 }}>
            {page.faqs.map((faq, i) => (
              <div key={i} style={{ background: "#111827", border: "1px solid #1e293b", borderRadius: 12, padding: "20px 24px" }}>
                <div style={{ fontWeight: 700, marginBottom: 10, fontSize: 16 }}>{faq.question}</div>
                <div style={{ color: "#94a3b8", lineHeight: 1.7, fontSize: 15 }}>{faq.answer}</div>
              </div>
            ))}
          </div>

          {/* Related pages */}
          {page.relatedPages.length > 0 && (
            <>
              <h3 style={{ fontSize: 18, marginBottom: 16 }}>Related compliance guides</h3>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 12 }}>
                {page.relatedPages.map((related) => (
                  <Link key={related.slug} href={`/compliance/${related.slug}`} style={{
                    background: "#111827", border: "1px solid #1e293b", borderRadius: 10,
                    padding: "16px 20px", textDecoration: "none", color: "#cbd5e1",
                    fontSize: 14, display: "block"
                  }}>
                    {related.title} →
                  </Link>
                ))}
              </div>
            </>
          )}
        </main>

        {/* Footer */}
        <footer style={{ borderTop: "1px solid #1e293b", padding: "32px 24px", marginTop: 40 }}>
          <div style={{ maxWidth: 900, margin: "0 auto", display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 16 }}>
            <div>
              <div style={{ fontWeight: 600, marginBottom: 8 }}>KORI AML Intelligence</div>
              <div style={{ color: "#475569", fontSize: 14 }}>Nigerian & Kenyan AML/CFT/CPF Intelligence Platform</div>
              <div style={{ color: "#00bcd4", fontSize: 12, marginTop: 4 }}>NGKE CBN · CBK Aligned</div>
            </div>
            <div style={{ display: "flex", gap: 24, fontSize: 14, color: "#475569", alignItems: "center" }}>
              <Link href="/compliance-audit" style={{ color: "#00bcd4", textDecoration: "none" }}>Free Audit</Link>
              <Link href="/pricing" style={{ color: "#475569", textDecoration: "none" }}>Pricing</Link>
              <Link href="mailto:hello@kori.seamount.io" style={{ color: "#475569", textDecoration: "none" }}>Contact</Link>
            </div>
          </div>
        </footer>
      </div>
    </>
  );
}