import type { Quest } from "../types";

export const quest2: Quest = {
  id: "send-an-email",
  name: "Send an Email",
  description: "Learn how to compose and send personalized emails to your contacts.",
  emoji: "✉️",
  challenges: [
    {
      id: "generate-email-from-prompt",
      name: "Generate an Email from a Prompt",
      description: "Generate an email from a prompt and edit it",
      emoji: "✍️",
      steps: [],
      completionMessage: "You've created your first AI-generated email! ✨",
    },
    {
      id: "change-the-tone",
      name: "Change the Tone",
      description: "Adjust the tone of your email to match your style",
      emoji: "🎭",
      steps: [],
      completionMessage: "You've learned how to adjust email tone! 🎯",
    },
    {
      id: "add-strategy-guidance",
      name: "Add a Strategy Guidance",
      description: "Add strategic context to improve your email",
      emoji: "🧠",
      steps: [],
      completionMessage: "You've added strategic guidance to your email! 💡",
    },
    {
      id: "send-email-default-sender",
      name: "Send Email Using Default Sender",
      description: "Send your email using the default email sender",
      emoji: "📤",
      steps: [],
      completionMessage: "Congratulations! You've sent your first email! 🎉",
    },
    {
      "id": "add-product-to-contact",
      "name": "Add Product Information",
      "description": "Learn how to add product details to a contact profile",
      "emoji": "📝",
      "steps": [
        {
          "id": "open-drawer",
          "selector": "[data-testid=\"button-open-drawer\"]",
          "action": "click",
          "instruction": "Click the drawer button to open the navigation menu",
          "tooltipPosition": "bottom",
          "route": "/app"
        },
        {
          "id": "select-company",
          "selector": "span.cursor-pointer",
          "action": "click",
          "instruction": "Click on 'edtech stem in vietnam' to select this company",
          "tooltipPosition": "right",
          "route": "/app"
        },
        {
          "id": "select-contact",
          "selector": "div.flex-1",
          "action": "click",
          "instruction": "Click on Nevill Nguyen's contact card to view their profile",
          "tooltipPosition": "top",
          "route": "/app"
        },
        {
          "id": "focus-product-field",
          "selector": "textarea.flex.min-h-\\[80px\\].w-full",
          "action": "click",
          "instruction": "Click on the product textarea field to start adding product information",
          "tooltipPosition": "top",
          "route": "/app"
        },
        {
          "id": "enter-product-info",
          "selector": "textarea.flex.min-h-\\[80px\\].w-full",
          "action": "type",
          "instruction": "Type 'sell edu platform.' to add product details for this contact",
          "tooltipPosition": "top",
          "route": "/app"
        }
      ],
      "completionMessage": "Great job! You've successfully learned how to navigate to a contact and add product information to their profile. This helps keep track of what products or services are relevant to each contact."
    },
    {
      "id": "generate-email-from-profile",
      "name": "Generate Email",
      "description": "Learn how to generate an email by selecting a contact and providing context",
      "emoji": "📧",
      "steps": [
        {
          "id": "select-contact",
          "selector": "div.font-medium.text-sm",
          "action": "click",
          "instruction": "Click on 'Pham Minh Tuan' to select this contact for your email",
          "tooltipPosition": "bottom",
          "route": "/app"
        },
        {
          "id": "add-context",
          "selector": "textarea.flex.min-h-\\[80px\\].w-full",
          "action": "click",
          "instruction": "Click in the text area and add context about 'sell edu platform' to help generate a relevant email",
          "tooltipPosition": "top",
          "route": "/app"
        },
        {
          "id": "generate-email",
          "selector": "[data-testid=\"button-generate-email\"]",
          "action": "click",
          "instruction": "Click the 'Generate Email' button to create your personalized email",
          "tooltipPosition": "top",
          "route": "/app"
        }
      ],
      "completionMessage": "Great job! You've learned how to generate personalized emails by selecting a contact and providing relevant context. This will help you create more targeted and effective communications."
    }
  ],
};
