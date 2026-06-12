import type { ProductProject } from "../types";
import { DetailField } from "./shared";

interface SetupWorkspaceProps {
  project: ProductProject;
}

export function SetupWorkspace({ project }: SetupWorkspaceProps) {
  return (
    <div className="workspace">
      <div className="workspace-head">
        <div>
          <h2 className="workspace-title">{project.our_product_name}</h2>
          {project.initial_customer_hypothesis ? (
            <p className="workspace-sub">
              {project.initial_customer_hypothesis}
            </p>
          ) : null}
        </div>
        {project.planned_sale_price ? (
          <span className="price-pill">{project.planned_sale_price}</span>
        ) : null}
      </div>

      <p className="workspace-hint">
        Product brief for this project. Use “New” in the left rail to add another
        project.
      </p>

      <div className="brief-grid">
        <DetailField
          label="Supplier product URL"
          value={project.supplier_product_url}
          isLink
        />
        <DetailField
          label="Supplier product description"
          value={project.supplier_product_description}
          multiline
        />
        <DetailField
          label="Primary competitor URL"
          value={project.primary_competitor_url}
          isLink
        />
        <DetailField
          label="Additional competitor URLs"
          value={project.additional_competitor_urls}
          multiline
        />
        <DetailField
          label="Closest competitor product description"
          value={project.closest_competitor_product_description}
          multiline
        />
        <DetailField label="Target country" value={project.target_country} />
        <DetailField
          label="Cost price including shipping"
          value={project.cost_price_including_shipping}
        />
        <DetailField
          label="Planned sale price"
          value={project.planned_sale_price}
        />
        <DetailField label="Current offer" value={project.current_offer} />
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
        <DetailField label="Preferred tone" value={project.preferred_tone} />
      </div>
    </div>
  );
}
