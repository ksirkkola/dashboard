import {
  WorkflowIds,
  Assets_PhaseIds,
  Customers_PhaseIds,
  Support_Tickets_PhaseIds,
  Opportunity_PhaseIds,
  Contact_persons_PhaseIds,
  ManikinPC_PhaseIds,
  Rentals_PhaseIds,
  Online_Orders_PhaseIds,
  TRIPS_IHS_PhaseIds,
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
  manikinpc: WorkflowIds.manikinpc_ab1,
  rentals: WorkflowIds.rentals_0cf,
  onlineOrders: WorkflowIds.online_orders_703,
  trips: WorkflowIds.trips_ihs_b03,
};

export const PHASES = {
  customers: [Customers_PhaseIds.kaikki_89c],
  assets: [Assets_PhaseIds.all_8ca],
  supportTickets: Object.values(Support_Tickets_PhaseIds) as string[],
  opportunity: Object.values(Opportunity_PhaseIds) as string[],
  contactPersons: [Contact_persons_PhaseIds.all_8e5],
  manikinpc: Object.values(ManikinPC_PhaseIds) as string[],
  rentals: Object.values(Rentals_PhaseIds) as string[],
  onlineOrders: Object.values(Online_Orders_PhaseIds) as string[],
  trips: Object.values(TRIPS_IHS_PhaseIds) as string[],
};
