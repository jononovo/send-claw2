import type { Quest } from "../types";

export const quest10: Quest = {
  id: "tinkering-contact-lists",
  name: "Tinkering with Contact Lists",
  description: "Advanced contact list management techniques.",
  emoji: "🔧",
  challenges: [
    {
      id: "manual-typing",
      name: "Add Contacts with Manual Typing",
      description: "Manually enter contact information",
      emoji: "⌨️",
      steps: [],
      completionMessage: "Contact added manually! ✍️",
    },
    {
      id: "remove-contact",
      name: "Remove a Contact from a Contact List",
      description: "Learn how to remove contacts from your lists",
      emoji: "🗑️",
      steps: [],
      completionMessage: "Contact removed successfully! 👋",
    },
    {
      id: "copy-paste-csv",
      name: "Copy and Paste CSV",
      description: "Import contacts by pasting CSV data",
      emoji: "📋",
      steps: [],
      completionMessage: "Contacts imported from CSV! 📊",
    },
    {
      id: "export-to-csv",
      name: "Export List to CSV",
      description: "Export your contact list for external use",
      emoji: "📤",
      steps: [],
      completionMessage: "List exported successfully! 💾",
    },
  ],
};
