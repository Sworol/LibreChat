import membershipSchema from '~/schema/membership';
import { applyTenantIsolation } from '~/models/plugins/tenantIsolation';
import type { IMembershipPlan } from '~/schema/membership';

export function createMembershipPlanModel(mongoose: typeof import('mongoose')) {
  applyTenantIsolation(membershipSchema);
  return (
    mongoose.models.MembershipPlan ||
    mongoose.model<IMembershipPlan>('MembershipPlan', membershipSchema)
  );
}
