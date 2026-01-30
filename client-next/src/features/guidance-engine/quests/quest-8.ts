import type { Quest } from "../types";

export const quest8: Quest = {
  id: "help-your-community",
  name: "Help Your Community",
  description: "Give back and help others discover better sales tools.",
  emoji: "💝",
  challenges: [
    {
      id: "think-about-someone",
      name: "Think About Someone Who Needs Help with Sales",
      description: "Consider who in your network could benefit from this tool",
      emoji: "💭",
      steps: [],
      completionMessage: "Thanks for thinking of others! 🙏",
    },
    {
      id: "give-feedback",
      name: "Give Feedback on the App",
      description: "Share your thoughts to help us improve",
      emoji: "💬",
      steps: [],
      completionMessage: "Thank you for your valuable feedback! 💜",
    },
    {
      id: "create-video-post",
      name: "Create a Video or Post on Socials",
      description: "Share your experience and earn bonus credits",
      emoji: "🎬",
      steps: [],
      completionMessage: "Amazing! You've earned 5,000 bonus credits! 🎁",
    },
  ],
};
