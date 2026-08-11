import {
  WorkflowIds,
  Assets_PhaseIds,
  Customers_PhaseIds,
  Support_Tickets_PhaseIds,
  Opportunity_PhaseIds,
  Contact_persons_PhaseIds,
} from '../../../workspace/enums';

// TODO: Replace with dynamic identity resolution (SSO / URL param / app config).
// For now the user picks a customer from the dropdown.
export const DEFAULT_CUSTOMER_ID: string | null = null;

export const WORKFLOWS = {
  customers: WorkflowIds.customers_891,
  assets: WorkflowIds.assets_8c7,
  supportTickets: WorkflowIds.support_tickets_bd6,
  opportunity: WorkflowIds.opportunity_63e,
  contactPersons: WorkflowIds.contact_persons_89a,
};

export const PHASES = {
  customers: [Customers_PhaseIds.kaikki_89c],
  assets: [Assets_PhaseIds.all_8ca],
  supportTickets: Object.values(Support_Tickets_PhaseIds) as string[],
  opportunity: Object.values(Opportunity_PhaseIds) as string[],
  contactPersons: [Contact_persons_PhaseIds.all_8e5],
};
