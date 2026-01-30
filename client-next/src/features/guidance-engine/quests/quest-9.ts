import type { Quest } from "../types";

export const quest9: Quest = {
  id: "create-contact-list",
  name: "Create a Contact List",
  description: "Organize your contacts into lists for targeted outreach.",
  emoji: "📋",
  challenges: [
    {
      id: "create-new-list",
      name: "Create a New Contact List",
      description: "Create your first contact list",
      emoji: "➕",
      steps: [],
      completionMessage: "You've created a new contact list! 📝",
    },
    {
      id: "add-contact-to-list",
      name: "Add a Contact to Your Contact List",
      description: "Add an individual contact to your list",
      emoji: "👤",
      steps: [],
      completionMessage: "Contact added successfully! ✅",
    },
    {
      id: "add-company-to-list",
      name: "Add a Company to Contact List",
      description: "Add all contacts from a company to your list",
      emoji: "🏢",
      steps: [],
      completionMessage: "Company contacts added! 🏗️",
    },
    {
      id: "add-all-from-search",
      name: "Add All Eligible from Search List",
      description: "Bulk add contacts from your search results",
      emoji: "📥",
      steps: [],
      completionMessage: "All eligible contacts added! 🎯",
    },
  ],
};
