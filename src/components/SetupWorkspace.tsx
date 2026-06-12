import { ExternalLink, Link2 } from "lucide-react";
import type { ProductProject } from "../types";
import { DetailField } from "./shared";
import {
  formatCompetitorLink,
  parseCompetitorLinks,
  type CompetitorLink,
} from "./workflow";

interface SetupWorkspaceProps {
  project: ProductProject;
}

function CompetitorLinkRow({ link }: { link: CompetitorLink }) {
  return (
    <a
      className="competitor-link"
      href={link.href}
      target="_blank"
      rel="noreferrer"
    >
      <Link2 size={14} strokeWidth={2} />
      <span className="competitor-link-label">{link.label}</span>
      <ExternalLink size={13} strokeWidth={2} className="competitor-link-ext" />
    </a>
  );
}

export function SetupWorkspace({ project }: SetupWorkspaceProps) {
  const primaryLink = formatCompetitorLink(project.primary_competitor_url);
  const additionalLinks = parseCompetitorLinks(
    project.additional_competitor_urls
  );
  const supplierLink = formatCompetitorLink(project.supplier_product_url);

  return (
    <div className="workspace workspace-full">
      <div className="workspace-head">
        <div>
          <h2 className="workspace-title">
            {project.our_product_name || "Untitled project"}
          </h2>
          {project.initial_customer_hypothesis ? (
            <p className="workspace-sub">
              {project.initial_customer_hypothesis}
            </p>
          ) : null}
        </div>
        <div className="setup-head-pills">
          {project.target_country ? (
            <span className="price-pill price-pill-muted">
              {project.target_country}
            </span>
          ) : null}
          {project.planned_sale_price ? (
            <span className="price-pill">{project.planned_sale_price}</span>
          ) : null}
        </div>
      </div>

      <p className="workspace-hint">
        Product brief. “Our product name” is used later for copy, creative
        prompts, and publishing — it is not used as a research search term.
      </p>

      <div className="setup-grid">
        {/* Our product */}
        <section className="setup-card">
          <h3 className="setup-card-title">Our product</h3>
          <div className="brief-grid">
            <DetailField
              label="Our product name"
              value={project.our_product_name}
            />
            <DetailField
              label="Target country"
              value={project.target_country}
            />
            <DetailField
              label="Cost price (incl. shipping)"
              value={project.cost_price_including_shipping}
            />
            <DetailField
              label="Planned sale price"
              value={project.planned_sale_price}
            />
            <DetailField label="Current offer" value={project.current_offer} />
          </div>
          <div className="setup-links">
            <span className="detail-field-label">Supplier product URL</span>
            {supplierLink ? (
              <CompetitorLinkRow link={supplierLink} />
            ) : (
              <span className="detail-field-value is-empty">—</span>
            )}
          </div>
          <DetailField
            label="Supplier product description"
            value={project.supplier_product_description}
            multiline
          />
        </section>

        {/* Competitor facts */}
        <section className="setup-card">
          <h3 className="setup-card-title">Competitor facts</h3>
          <div className="setup-links">
            <span className="detail-field-label">Primary competitor</span>
            {primaryLink ? (
              <CompetitorLinkRow link={primaryLink} />
            ) : (
              <span className="detail-field-value is-empty">—</span>
            )}
            {additionalLinks.length > 0 ? (
              <>
                <span className="detail-field-label setup-links-sub">
                  Additional competitors
                </span>
                {additionalLinks.map((link, i) => (
                  <CompetitorLinkRow key={i} link={link} />
                ))}
              </>
            ) : null}
          </div>
          <DetailField
            label="Closest competitor product description"
            value={project.closest_competitor_product_description}
            multiline
          />
        </section>

        {/* Research assumptions */}
        <section className="setup-card">
          <h3 className="setup-card-title">Research assumptions (seeds)</h3>
          <div className="brief-grid">
            <DetailField
              label="Initial problem hypothesis"
              value={project.initial_problem_hypothesis}
              multiline
            />
            <DetailField
              label="Initial customer hypothesis"
              value={project.initial_customer_hypothesis}
              multiline
            />
            <DetailField
              label="Preferred tone"
              value={project.preferred_tone}
            />
          </div>
          <p className="setup-note">
            Hypotheses are optional seeds only. Preferred tone does not override
            research-derived tone.
          </p>
        </section>
      </div>
    </div>
  );
}
