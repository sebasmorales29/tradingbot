/**
 * Compat layer — lógica agentica vive en ./agent
 */
export {
  composeOperatorChatReply,
  classifyAgentIntent,
  planOperatorAgent,
  finalizeOperatorAgent,
  refineReplyWithLlm,
  type AgentIntent,
  type AgentComposeInput,
  type AgentComposeResult,
} from "./agent";

import { classifyAgentIntent } from "./agent";

/** @deprecated use classifyAgentIntent */
export function classifyOperatorMessage(message: string): "question" | "teach" {
  const intent = classifyAgentIntent(message);
  return intent === "teach" ? "teach" : "question";
}
