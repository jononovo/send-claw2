import type { Quest } from "../types";

export const quest6: Quest = {
  id: "launch-daily-ducks-assistant",
  name: "Launch Your Daily Ducks Assistant",
  description: "Set up your automated daily outreach assistant to stay consistent.",
  emoji: "🦆",
  challenges: [
    {
      id: "decide-weekly-schedule",
      name: "Decide on Your Weekly Schedule",
      description: "Choose which days you want to send outreach emails",
      emoji: "📅",
      steps: [],
      completionMessage: "You've set your weekly schedule! 📆",
    },
    {
      id: "select-streak-elements",
      name: "Select Streak Elements & Launch",
      description: "Choose your streak settings and launch your assistant",
      emoji: "🔥",
      steps: [],
      completionMessage: "Your Daily Ducks Assistant is launched! 🚀",
    },
    {
      id: "schedule-holiday-pause",
      name: "Schedule a Holiday or Pause",
      description: "Learn how to pause your assistant when needed",
      emoji: "🏖️",
      steps: [],
      completionMessage: "You know how to manage your schedule! ⏸️",
    },
    {
      id: "generate-emails",
      name: "Mainly Generate the Emails",
      description: "Let the assistant generate emails for your outreach",
      emoji: "✨",
      steps: [],
      completionMessage: "Your emails are ready to go! 💌",
    },
  ],
};
