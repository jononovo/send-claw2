import type { Quest } from "../types";

export const quest1: Quest = {
  id: "finding-customers",
  name: "Finding Customers",
  description: "Discover potential customers using our powerful AI search tools.",
  emoji: "🔍",
  challenges: [
    {
      id: "basic-company-contact-search",
      name: "Basic Company & Contact Search",
      description: "Perform your first company and contacts search",
      emoji: "🎯",
      trigger: {
        type: "newUser",
        route: "/app",
        requiresAuth: true,
        once: true,
      },
      startDelay: 7000,
      setupEvent: "startNewSearch",
      steps: [
        {
          id: "open-search-options",
          selector: '[data-testid="search-options-button"]',
          action: "click",
          instruction: "Click on the search options to choose what you want to search for",
          tooltipPosition: "right",
          route: "/app",
        },
        {
          id: "select-contacts-search",
          selector: '[data-testid="search-type-option-contacts"]',
          action: "click",
          instruction: "Select '+ Contacts' to search for companies AND their contacts",
          tooltipPosition: "bottom",
          route: "/app",
        },
        {
          id: "search-input",
          selector: '[data-testid="search-input"]',
          action: "click",
          instruction: "Click on the search bar to start.",
          tooltipPosition: "bottom",
          route: "/app",
        },
        {
          id: "type-query",
          selector: '[data-testid="search-input"]',
          action: "type",
          advanceDelay: 3000,
          instruction: "Type a search query like 'marketing agencies in Austin'.",
          tooltipPosition: "bottom",
          route: "/app",
        },
        {
          id: "execute-search",
          selector: '[data-testid="search-button"]',
          action: "click",
          instruction: "Click on Search!",
          tooltipPosition: "left",
          route: "/app",
        },
      ],
      completionMessage: "Awesome! You've completed your first search! 🎉",
    },
    {
      id: "cross-page-navigation",
      name: "Navigate the App",
      description: "Learn to navigate between different sections using the sidebar",
      emoji: "🧭",
      steps: [
        {
          id: "click-search-input",
          selector: '[data-testid="search-input"]',
          action: "click",
          instruction: "First, click on the search bar",
          tooltipPosition: "bottom",
          route: "/app",
        },
        {
          id: "open-drawer-1",
          selector: '[data-testid="button-open-drawer"]',
          action: "click",
          instruction: "Now click the menu icon to open the navigation drawer",
          tooltipPosition: "right",
          route: "/app",
        },
        {
          id: "go-to-contacts",
          selector: '[data-testid="drawer-nav-contacts"]',
          action: "click",
          instruction: "Click 'Contact Lists' to see your saved contacts",
          tooltipPosition: "right",
          route: "/app",
        },
        {
          id: "open-drawer-2",
          selector: '[data-testid="button-open-drawer"]',
          action: "click",
          instruction: "Great! Now open the drawer again",
          tooltipPosition: "right",
          route: "/contacts",
        },
        {
          id: "go-to-campaigns",
          selector: '[data-testid="drawer-nav-campaigns"]',
          action: "click",
          instruction: "Now go to 'Campaigns' to manage your outreach",
          tooltipPosition: "right",
          route: "/contacts",
        },
        {
          id: "open-drawer-3",
          selector: '[data-testid="button-open-drawer"]',
          action: "click",
          instruction: "Open the drawer one more time",
          tooltipPosition: "right",
          route: "/campaigns",
        },
        {
          id: "go-back-to-search",
          selector: '[data-testid="drawer-new-search"]',
          action: "click",
          instruction: "Click 'New Search' to return to the main search page",
          tooltipPosition: "right",
          route: "/campaigns",
        },
      ],
      completionMessage: "Excellent! You now know how to navigate the app! 🧭",
    },
    {
      id: "find-email-unique-contact",
      name: "Find Email of Unique Contact",
      description: "Use the email finder to discover a specific contact's email",
      emoji: "📧",
      steps: [],
      completionMessage: "Excellent! You've discovered how to find contact emails! 📬",
    },
    {
      id: "full-search",
      name: "Do a Full Search",
      description: "Complete a full search with contacts and emails in one go",
      emoji: "🚀",
      steps: [],
      completionMessage: "Congratulations! You've mastered the complete search workflow! 🎉",
    },
    {
      "id": "search-restaurants-nyc",
      "name": "Search for Restaurants",
      "description": "Learn how to search for specific businesses using the search feature",
      "emoji": "🔍",
      "steps": [
        {
          "id": "click-search-input",
          "selector": "[data-testid=\"search-input\"]",
          "action": "click",
          "instruction": "Click on the search input field to start your search",
          "tooltipPosition": "bottom",
          "route": "/app"
        },
        {
          "id": "type-search-query",
          "selector": "[data-testid=\"search-input\"]",
          "action": "type",
          "instruction": "Type 'hooters in nyc' to search for this restaurant chain in New York City",
          "tooltipPosition": "bottom",
          "route": "/app"
        },
        {
          "id": "execute-search",
          "selector": "[data-testid=\"search-button\"]",
          "action": "click",
          "instruction": "Click the search button to find results matching your query",
          "tooltipPosition": "left",
          "route": "/app"
        }
      ],
      "completionMessage": "Great job! You've learned how to search for specific businesses by location. Try searching for other restaurants or businesses in different cities!"
    },
    {
      "id": "navigate-user-profile-menu",
      "name": "Navigate User Profile Menu",
      "description": "Learn how to access and navigate through user profile options and menu items",
      "emoji": "👤",
      "steps": [
        {
          "id": "click-user-name",
          "selector": "div.font-medium.text-sm",
          "action": "click",
          "instruction": "Click on your name 'Pham Minh Tuan' to open the user menu",
          "tooltipPosition": "bottom",
          "route": "/app"
        },
        {
          "id": "click-menu-icon",
          "selector": "svg",
          "action": "click",
          "instruction": "Click on the menu icon to expand more options",
          "tooltipPosition": "left",
          "route": "/app"
        },
        {
          "id": "select-car-option",
          "selector": "div.font-medium.truncate",
          "action": "click",
          "instruction": "Click on the 'car' option from the menu",
          "tooltipPosition": "top",
          "route": "/app"
        }
      ],
      "completionMessage": "Great job! You've learned how to navigate through the user profile menu and access different options. This is essential for managing your account and accessing various features."
    },
    {
      "id": "generate-email-workflow",
      "name": "Generate an Email",
      "description": "Learn how to use the email generation feature to create personalized emails",
      "emoji": "📧",
      "steps": [
        {
          "id": "select-category",
          "selector": "span.group.inline-flex.items-center",
          "action": "click",
          "instruction": "Click on the 'car' category to select it for your email",
          "tooltipPosition": "bottom",
          "route": "/app"
        },
        {
          "id": "open-options",
          "selector": "svg",
          "action": "click",
          "instruction": "Click on this icon to open additional options",
          "tooltipPosition": "left",
          "route": "/app"
        },
        {
          "id": "cancel-options",
          "selector": "button.inline-flex.items-center.justify-center",
          "action": "click",
          "instruction": "Click 'Cancel' to close the options menu",
          "tooltipPosition": "top",
          "route": "/app"
        },
        {
          "id": "click-generate-button",
          "selector": "[data-testid=\"button-generate-email\"]",
          "action": "click",
          "instruction": "Click the 'Generate Email' button to start creating your email",
          "tooltipPosition": "top",
          "route": "/app"
        },
        {
          "id": "confirm-generation",
          "selector": "button.inline-flex.items-center.justify-center",
          "action": "click",
          "instruction": "Click 'Generate Email' again to confirm and create your personalized email",
          "tooltipPosition": "bottom",
          "route": "/app"
        }
      ],
      "completionMessage": "Great job! You've learned how to generate a personalized email using the category selection and generation tools."
    }
  ],
};
