import { Router } from "express";
import { storage } from "../../storage";
import { agentRoute, parsePositiveIntParam } from "./agent-route-handler";
import { getAgentOwnerUserId } from "./require-claimed-five-ducks-bot";
import {
  FAILED_RECIPIENT_STATUSES,
  serializeCampaignForAgent,
  serializeCampaignStatsForAgent,
  serializeCommunicationForAgent,
  serializeContactListForAgent,
  serializeDailyOutreachBatchForAgent,
  serializeListMemberForAgent,
  serializeRecipientForAgent,
} from "./agent-response-serializers";

const DEFAULT_DAILY_OUTREACH_BATCHES = 7;
const MAX_DAILY_OUTREACH_BATCHES = 30;

/** Read-only views of sending lists, campaigns and what was sent. Nothing here sends or changes anything. */
export const agentSendingRoutes = Router();

agentSendingRoutes.get("/lists", agentRoute(async (req, res) => {
  const contactLists = await storage.listContactLists(getAgentOwnerUserId(req));
  res.json({ lists: contactLists.map(serializeContactListForAgent) });
}));

agentSendingRoutes.get("/lists/:listId/contacts", agentRoute(async (req, res) => {
  const listId = parsePositiveIntParam(req.params.listId);
  const contactList = listId === null ? undefined : await storage.getContactList(listId, getAgentOwnerUserId(req));
  if (!contactList) {
    res.status(404).json({ error: "List not found" });
    return;
  }
  const members = await storage.listContactsByListId(contactList.id);
  res.json({ list: serializeContactListForAgent(contactList), contacts: members.map(serializeListMemberForAgent) });
}));

agentSendingRoutes.get("/campaigns", agentRoute(async (req, res) => {
  const strategyId = req.query.strategyId === undefined ? null : parsePositiveIntParam(req.query.strategyId);
  if (req.query.strategyId !== undefined && strategyId === null) {
    res.status(400).json({ error: "strategyId must be a positive integer" });
    return;
  }
  const campaigns = await storage.listCampaigns(getAgentOwnerUserId(req));
  const matchingCampaigns = strategyId === null
    ? campaigns
    : campaigns.filter((campaign) => campaign.strategicProfileId === strategyId);
  res.json({ campaigns: matchingCampaigns.map(serializeCampaignForAgent) });
}));

agentSendingRoutes.get("/campaigns/:campaignId", agentRoute(async (req, res) => {
  const campaignId = parsePositiveIntParam(req.params.campaignId);
  const campaign = campaignId === null ? undefined : await storage.getCampaignWithMetrics(campaignId, getAgentOwnerUserId(req));
  if (!campaign) {
    res.status(404).json({ error: "Campaign not found" });
    return;
  }
  res.json(serializeCampaignStatsForAgent(campaign));
}));

agentSendingRoutes.get("/campaigns/:campaignId/recipients", agentRoute(async (req, res) => {
  const campaignId = parsePositiveIntParam(req.params.campaignId);
  const campaign = campaignId === null ? undefined : await storage.getCampaignWithMetrics(campaignId, getAgentOwnerUserId(req));
  if (!campaign) {
    res.status(404).json({ error: "Campaign not found" });
    return;
  }

  // status=failed covers every failure state; any other value matches one recipient status exactly
  const status = typeof req.query.status === "string" ? req.query.status : null;
  const recipients: any[] = campaign.recipients;
  const matchingRecipients = status === null
    ? recipients
    : recipients.filter((recipient) =>
      status === "failed" ? FAILED_RECIPIENT_STATUSES.includes(recipient.status) : recipient.status === status,
    );

  res.json({ campaignId, status, recipients: matchingRecipients.map(serializeRecipientForAgent) });
}));

agentSendingRoutes.get("/daily-outreach", agentRoute(async (req, res) => {
  const requestedLimit = req.query.limit === undefined ? DEFAULT_DAILY_OUTREACH_BATCHES : parsePositiveIntParam(req.query.limit);
  if (requestedLimit === null) {
    res.status(400).json({ error: "limit must be a positive integer" });
    return;
  }
  const batches = await storage.listRecentDailyOutreachBatches(
    getAgentOwnerUserId(req),
    Math.min(requestedLimit, MAX_DAILY_OUTREACH_BATCHES),
  );
  // Sent drafts are left out here: they appear in each contact's sent history
  res.json({
    batches: batches.map(({ batch, items }) =>
      serializeDailyOutreachBatchForAgent(batch, items.filter((item) => item.status !== "sent")),
    ),
  });
}));

agentSendingRoutes.get("/contacts/:contactId/history", agentRoute(async (req, res) => {
  const contactId = parsePositiveIntParam(req.params.contactId);
  if (contactId === null) {
    res.status(404).json({ error: "Contact not found" });
    return;
  }
  const history = await storage.listCommunicationHistoryForContact(contactId, getAgentOwnerUserId(req));
  res.json({ contactId, history: history.map(serializeCommunicationForAgent) });
}));
