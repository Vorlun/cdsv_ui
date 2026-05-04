import { SOAR_LIFECYCLE } from "@/utils/soarIncidentEngine";

/**
 * @param {string} lifecycle
 * @param {'investigate'|'block'|'ignore'|'assign'} intent
 */
export function assertValidManualTransition(lifecycle, intent) {
  const s = lifecycle ?? SOAR_LIFECYCLE.DETECTED;
  switch (intent) {
    case "investigate":
      if (
        s === SOAR_LIFECYCLE.INVESTIGATING ||
        s === SOAR_LIFECYCLE.MITIGATED ||
        s === SOAR_LIFECYCLE.CLOSED
      ) {
        throw new Error("Cannot open investigation — incident has already progressed beyond triage.");
      }
      break;
    case "block":
      if (s === SOAR_LIFECYCLE.MITIGATED || s === SOAR_LIFECYCLE.CLOSED) {
        throw new Error("Cannot mitigate — incident is already finalized.");
      }
      break;
    case "ignore":
      if (s === SOAR_LIFECYCLE.CLOSED || s === "closed") {
        throw new Error("Incident already archived.");
      }
      break;
    case "assign":
      if (s === SOAR_LIFECYCLE.MITIGATED || s === SOAR_LIFECYCLE.CLOSED) {
        throw new Error("Cannot assign owner — playbook is archived.");
      }
      break;
    default:
      throw new Error("Unknown SOAR transition.");
  }
}
