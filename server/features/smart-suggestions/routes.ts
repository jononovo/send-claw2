import type { Express } from "express";
import { generateSmartSuggestions } from "./service";
import type { GenerateSuggestionsRequest, GenerateSuggestionsResponse } from "./types";

export function registerSmartSuggestionsRoutes(app: Express) {
  app.post("/api/smart-suggestions/generate", async (req, res) => {
    try {
      const context: GenerateSuggestionsRequest = req.body;
      
      if (!context.query) {
        return res.status(400).json({ error: "Query is required" });
      }
      
      const suggestions = await generateSmartSuggestions({
        query: context.query,
        resultCount: context.resultCount || 0,
        emailCount: context.emailCount || 0,
        companies: context.companies || [],
        criteria: context.criteria,
      });
      
      const response: GenerateSuggestionsResponse = { suggestions };
      res.json(response);
    } catch (error) {
      console.error("Error generating suggestions:", error);
      res.status(500).json({ error: "Failed to generate suggestions" });
    }
  });
}
