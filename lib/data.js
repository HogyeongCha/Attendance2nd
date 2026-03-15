import { createAdminClient } from "@/lib/supabase/server";
import { getSession } from "@/lib/session";

export async function getCurrentParticipant() {
  const session = await getSession();

  if (!session?.participantId) {
    return null;
  }

  const supabase = createAdminClient();
  const { data, error } = await supabase.rpc("app_get_participant", {
    p_participant_id: session.participantId
  });

  if (error) {
    throw error;
  }

  return data?.[0] ?? null;
}

export async function getStampBoard() {
  const participant = await getCurrentParticipant();

  if (!participant) {
    return null;
  }

  const supabase = createAdminClient();
  const { data, error } = await supabase.rpc("app_get_stamp_board", {
    p_participant_id: participant.id
  });
  if (error) throw error;
  return data;
}
