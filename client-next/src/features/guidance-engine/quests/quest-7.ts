import type { Quest } from "../types";

export const quest7: Quest = {
  id: "daily-ducks",
  name: "Daily Ducks",
  description: "Master your daily outreach workflow with the Daily Ducks feature.",
  emoji: "🦆",
  challenges: [
    {
      id: "test-send",
      name: "Test Send",
      description: "Send a test email to yourself before going live",
      emoji: "🧪",
      steps: [],
      completionMessage: "Test email sent successfully! ✅",
    },
    {
      id: "send-via-daily-ducks",
      name: "Send Email via Daily Ducks",
      description: "Send your first real email through Daily Ducks",
      emoji: "📤",
      steps: [],
      completionMessage: "Your first Daily Ducks email is on its way! 🎉",
    },
    {
      id: "regenerate-suggestions",
      name: "Re-generate Daily Suggestions",
      description: "Learn how to refresh your daily email suggestions",
      emoji: "🔄",
      steps: [],
      completionMessage: "You've regenerated your suggestions! 🔄",
    },
    {
      id: "stop-campaign",
      name: "Stop Daily Ducks Campaign",
      description: "Learn how to stop or pause your campaign",
      emoji: "⏹️",
      steps: [],
      completionMessage: "You know how to manage your campaigns! 💪",
    },
  ],
};
