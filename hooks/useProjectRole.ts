import { useQuery } from '@tanstack/react-query';

import { supabase } from '@/services/supabase';
import { useAuthStore } from '@/stores/auth';

/**
 * The viewer's relationship to ONE project — the keystone of the persona
 * audit (24 Oct). Account role answers "what kind of user is this?";
 * THIS answers "what are they on this project?". A tradesman crewing on
 * another lead's job is crew here, whatever their account role says.
 *
 * isLead      — they are projects.tradesman_id
 * isCustomer  — they are projects.customer_id
 * isCrew      — active project_crew row (lead excluded)
 * crewRole    — 'apprentice' | 'helper' when isCrew
 * isTradeSide — lead or crew (never the customer)
 */
export type ProjectRole = {
  isLead: boolean;
  isCustomer: boolean;
  isCrew: boolean;
  crewRole: 'apprentice' | 'helper' | null;
  isTradeSide: boolean;
  /** False until the lookup resolves — gate lead-only UI on !loading too. */
  loading: boolean;
};

async function fetchProjectRole(project_id: string, user_id: string) {
  const [{ data: project }, { data: crewRow }] = await Promise.all([
    supabase
      .from('projects')
      .select('tradesman_id, customer_id')
      .eq('id', project_id)
      .maybeSingle(),
    supabase
      .from('project_crew')
      .select('role_on_project')
      .eq('project_id', project_id)
      .eq('user_id', user_id)
      .is('removed_at', null)
      .maybeSingle(),
  ]);
  return {
    tradesman_id: project?.tradesman_id ?? null,
    customer_id: project?.customer_id ?? null,
    crew_role: (crewRow?.role_on_project as 'apprentice' | 'helper' | undefined) ?? null,
  };
}

export function useProjectRole(project_id: string | undefined | null): ProjectRole {
  const myId = useAuthStore((s) => s.profile?.id ?? null);

  const { data, isLoading } = useQuery({
    queryKey: ['project-role', project_id, myId],
    queryFn: () => fetchProjectRole(project_id!, myId!),
    enabled: !!project_id && !!myId,
    staleTime: 60_000,
  });

  const isLead = !!data && !!myId && data.tradesman_id === myId;
  const isCustomer = !!data && !!myId && data.customer_id === myId;
  const isCrew = !isLead && !!data?.crew_role;

  return {
    isLead,
    isCustomer,
    isCrew,
    crewRole: isCrew ? data!.crew_role : null,
    isTradeSide: isLead || isCrew,
    loading: isLoading,
  };
}
