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
    },
    {
      "id": "filter-search-results-companies",
      "name": "Filter Search Results",
      "description": "Learn how to refine your search by filtering for specific types of results",
      "emoji": "🔍",
      "steps": [
        {
          "id": "click-path-element",
          "selector": "path",
          "action": "click",
          "instruction": "Click on this navigation element to begin exploring the search interface",
          "tooltipPosition": "bottom",
          "route": "/app"
        },
        {
          "id": "select-search-topic",
          "selector": "span.text-sm.text-muted-foreground.truncate",
          "action": "click",
          "instruction": "Click on this search topic about 'edtech stem in vietnam' to see the current search results",
          "tooltipPosition": "bottom",
          "route": "/app"
        },
        {
          "id": "open-search-options",
          "selector": "[data-testid=\"search-options-button\"]",
          "action": "click",
          "instruction": "Click the search options button to open the filtering menu",
          "tooltipPosition": "left",
          "route": "/app"
        },
        {
          "id": "apply-companies-filter",
          "selector": "span.text-base.font-medium.text-gray-900",
          "action": "click",
          "instruction": "Select 'Only Companies' to filter your search results to show only company-related content",
          "tooltipPosition": "left",
          "route": "/app"
        }
      ],
      "completionMessage": "Great job! You've learned how to use search filters to narrow down results and find exactly what you're looking for. This will help you find more relevant information faster!"
    },
    {
      "id": "access-user-profile-menu",
      "name": "Access User Profile",
      "description": "Learn how to access your user profile and navigate the profile menu",
      "emoji": "👤",
      "steps": [
        {
          "id": "click-user-name",
          "selector": "div.font-medium.text-sm",
          "action": "click",
          "instruction": "Click on your username to open the profile menu",
          "tooltipPosition": "bottom",
          "route": "/app"
        },
        {
          "id": "interact-menu-icon",
          "selector": "svg",
          "action": "click",
          "instruction": "Click on the menu icon to explore additional options",
          "tooltipPosition": "left",
          "route": "/app"
        },
        {
          "id": "close-menu",
          "selector": "html",
          "action": "click",
          "instruction": "Click outside the menu area to close it",
          "tooltipPosition": "auto",
          "route": "/app"
        }
      ],
      "completionMessage": "Great job! You've learned how to access your profile menu and navigate the user interface options."
    },
    {
      "id": "compose-email-with-templates",
      "name": "Compose an Email",
      "description": "Learn how to create and compose a new email using the email editor and templates",
      "emoji": "✉️",
      "steps": [
        {
          "id": "enter-recipient",
          "selector": "input.flex.h-10.w-full",
          "action": "click",
          "instruction": "Click on the recipient email field to enter who you want to send the email to",
          "tooltipPosition": "bottom",
          "route": "/app"
        },
        {
          "id": "add-subject",
          "selector": "[data-testid=\"input-email-subject\"]",
          "action": "click",
          "instruction": "Click on the subject line field to add a subject for your email",
          "tooltipPosition": "bottom",
          "route": "/app"
        },
        {
          "id": "write-content",
          "selector": "[data-testid=\"textarea-email-content\"]",
          "action": "click",
          "instruction": "Click in the email content area to start writing your message",
          "tooltipPosition": "top",
          "route": "/app"
        },
        {
          "id": "explore-templates",
          "selector": "span",
          "action": "click",
          "instruction": "Click on Templates to explore pre-made email templates that can help you write faster",
          "tooltipPosition": "auto",
          "route": "/app"
        }
      ],
      "completionMessage": "Great job! You've learned how to compose an email by filling in the recipient, subject, content, and exploring templates to make your writing easier."
    },
    {
      "id": "email-automation-setup",
      "name": "Set Up Email Automation",
      "description": "Learn how to configure an AI-powered email automation tool and set up recipient details",
      "emoji": "📧",
      "steps": [
        {
          "id": "click-svg-icon",
          "selector": "svg",
          "action": "click",
          "instruction": "Click on the icon to get started with the email automation tool",
          "tooltipPosition": "bottom",
          "route": "/app"
        },
        {
          "id": "select-automation-tool",
          "selector": "div.font-medium.truncate",
          "action": "click",
          "instruction": "Select the AI-powered email automation tool from the available options",
          "tooltipPosition": "right",
          "route": "/app"
        },
        {
          "id": "focus-recipient-email",
          "selector": "input.flex.h-10.w-full",
          "action": "click",
          "instruction": "Click on the recipient email field to start entering the email address",
          "tooltipPosition": "top",
          "route": "/app"
        },
        {
          "id": "click-recipient-email-2",
          "selector": "input.flex.h-10.w-full",
          "action": "click",
          "instruction": "Make sure the recipient email field is properly focused",
          "tooltipPosition": "top",
          "route": "/app"
        },
        {
          "id": "click-recipient-email-3",
          "selector": "input.flex.h-10.w-full",
          "action": "click",
          "instruction": "Continue working with the recipient email field",
          "tooltipPosition": "top",
          "route": "/app"
        },
        {
          "id": "click-recipient-email-4",
          "selector": "input.flex.h-10.w-full",
          "action": "click",
          "instruction": "Ensure the email field is ready for input",
          "tooltipPosition": "top",
          "route": "/app"
        },
        {
          "id": "enter-recipient-email",
          "selector": "input.flex.h-10.w-full",
          "action": "type",
          "instruction": "Type the recipient's email address in the field",
          "tooltipPosition": "top",
          "route": "/app"
        },
        {
          "id": "access-templates",
          "selector": "span",
          "action": "click",
          "instruction": "Click on 'Templates' to explore available email templates for your automation",
          "tooltipPosition": "bottom",
          "route": "/app"
        }
      ],
      "completionMessage": "Great job! You've successfully set up the email automation tool and learned how to configure recipient details and access templates. You're ready to create effective email campaigns!"
    },
    {
      "id": "search-startup-suggestions",
      "name": "Search with Smart Suggestions",
      "description": "Learn how to use the search feature with AI-powered suggestions to find startup information",
      "emoji": "🔍",
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
          "id": "close-drawer",
          "selector": "html",
          "action": "click",
          "instruction": "Click anywhere outside the drawer to close it and return to the main interface",
          "tooltipPosition": "auto",
          "route": "/app"
        },
        {
          "id": "focus-search",
          "selector": "[data-testid=\"search-input\"]",
          "action": "click",
          "instruction": "Click on the search input field to start searching for startups",
          "tooltipPosition": "bottom",
          "route": "/app"
        },
        {
          "id": "select-suggestion",
          "selector": "[data-testid=\"button-suggestion-recently-exited-startups-in-mi\"]",
          "action": "click",
          "instruction": "Click on the suggested search for 'Recently exited startups in Miami' to see relevant results",
          "tooltipPosition": "top",
          "route": "/app"
        }
      ],
      "completionMessage": "Great job! You've learned how to navigate the interface and use smart search suggestions to quickly find startup information. The AI-powered suggestions help you discover relevant data faster!"
    },
    {
      "id": "search-and-navigate-campaigns",
      "name": "Search and Navigate to Campaigns",
      "description": "Learn how to search for startup information and navigate to the campaigns section",
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
          "instruction": "Type your search query for recently exited startups in Miami",
          "tooltipPosition": "bottom",
          "route": "/app"
        },
        {
          "id": "refocus-search",
          "selector": "[data-testid=\"search-input\"]",
          "action": "click",
          "instruction": "Click the search input again to ensure it's focused",
          "tooltipPosition": "bottom",
          "route": "/app"
        },
        {
          "id": "continue-search-focus",
          "selector": "[data-testid=\"search-input\"]",
          "action": "click",
          "instruction": "Keep the search field active by clicking on it",
          "tooltipPosition": "bottom",
          "route": "/app"
        },
        {
          "id": "maintain-search-focus",
          "selector": "[data-testid=\"search-input\"]",
          "action": "click",
          "instruction": "Click the search input to maintain focus",
          "tooltipPosition": "bottom",
          "route": "/app"
        },
        {
          "id": "ensure-search-active",
          "selector": "[data-testid=\"search-input\"]",
          "action": "click",
          "instruction": "Click on the search field once more",
          "tooltipPosition": "bottom",
          "route": "/app"
        },
        {
          "id": "activate-search-field",
          "selector": "[data-testid=\"search-input\"]",
          "action": "click",
          "instruction": "Click the search input to keep it selected",
          "tooltipPosition": "bottom",
          "route": "/app"
        },
        {
          "id": "final-search-click",
          "selector": "[data-testid=\"search-input\"]",
          "action": "click",
          "instruction": "Click on the search field one final time",
          "tooltipPosition": "bottom",
          "route": "/app"
        },
        {
          "id": "complete-search-entry",
          "selector": "[data-testid=\"search-input\"]",
          "action": "type",
          "instruction": "Complete your search by typing your query",
          "tooltipPosition": "bottom",
          "route": "/app"
        },
        {
          "id": "open-drawer",
          "selector": "[data-testid=\"button-open-drawer\"]",
          "action": "click",
          "instruction": "Click the drawer button to open the navigation menu",
          "tooltipPosition": "left",
          "route": "/app"
        },
        {
          "id": "navigate-campaigns",
          "selector": "span.text-sm.font-medium.text-gray-700",
          "action": "click",
          "instruction": "Click on 'Campaigns' to navigate to the campaigns section",
          "tooltipPosition": "right",
          "route": "/app"
        }
      ],
      "completionMessage": "Great job! You've learned how to search for startup information and navigate to the campaigns section using the drawer menu."
    },
    {
      "id": "business-search-tutorial",
      "name": "Find Target Businesses",
      "description": "Learn how to search for and discover target businesses using the search feature",
      "emoji": "🔍",
      "steps": [
        {
          "id": "open-navigation",
          "selector": "[data-testid=\"button-open-drawer\"]",
          "action": "click",
          "instruction": "Click the menu button to open the navigation drawer",
          "tooltipPosition": "bottom",
          "route": "/app"
        },
        {
          "id": "select-search-feature",
          "selector": "div.flex.flex-col-reverse.md:flex-row",
          "action": "click",
          "instruction": "Click on the 'Search for target businesses' option to access the search functionality",
          "tooltipPosition": "right",
          "route": "/app"
        },
        {
          "id": "enter-search-query",
          "selector": "[data-testid=\"search-input\"]",
          "action": "click",
          "instruction": "Click on the search input field to start entering your search criteria",
          "tooltipPosition": "top",
          "route": "/app"
        }
      ],
      "completionMessage": "Great job! You've learned how to navigate to the business search feature and access the search input. Now you can start discovering target businesses for your needs!"
    },
    {
      "id": "navigate-and-add-product",
      "name": "Navigate and Add Product",
      "description": "Learn how to open the navigation drawer, explore company information, and add a product description",
      "emoji": "🏢",
      "steps": [
        {
          "id": "open-drawer",
          "selector": "[data-testid=\"button-open-drawer\"]",
          "action": "click",
          "instruction": "Click the button to open the navigation drawer",
          "tooltipPosition": "right",
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
          "id": "view-role",
          "selector": "div.text-xs.text-muted-foreground.mt-0.5",
          "action": "click",
          "instruction": "Click on the 'Co-Founder' role to view more details",
          "tooltipPosition": "right",
          "route": "/app"
        },
        {
          "id": "focus-textarea",
          "selector": "textarea.flex.min-h-\\[80px\\].w-full",
          "action": "click",
          "instruction": "Click in the product description text area to start adding a product",
          "tooltipPosition": "top",
          "route": "/app"
        },
        {
          "id": "type-product",
          "selector": "textarea.flex.min-h-\\[80px\\].w-full",
          "action": "type",
          "instruction": "Type 'happy' in the text area to add your product description",
          "tooltipPosition": "top",
          "route": "/app"
        }
      ],
      "completionMessage": "Great job! You've learned how to navigate the app drawer, explore company information, and add product descriptions. You're now ready to manage company products!"
    },
    {
      "id": "navigate-practice-selection",
      "name": "Select Your Practice",
      "description": "Learn how to navigate the interface and select a medical practice",
      "emoji": "🏥",
      "steps": [
        {
          "id": "click-svg-icon",
          "selector": "svg",
          "action": "click",
          "instruction": "Click on the SVG icon to begin navigation",
          "tooltipPosition": "bottom",
          "route": "/app"
        },
        {
          "id": "open-drawer-menu",
          "selector": "[data-testid=\"button-open-drawer\"]",
          "action": "click",
          "instruction": "Click the menu button to open the navigation drawer",
          "tooltipPosition": "bottom",
          "route": "/app"
        },
        {
          "id": "interact-with-overlay",
          "selector": "div.fixed.inset-0.z-50",
          "action": "click",
          "instruction": "Click on the overlay area to interact with the modal",
          "tooltipPosition": "auto",
          "route": "/app"
        },
        {
          "id": "select-practice",
          "selector": "h3.font-semibold.text-base.leading-tight",
          "action": "click",
          "instruction": "Click on 'Manhattan Gastroenterology' to select this practice",
          "tooltipPosition": "top",
          "route": "/app"
        }
      ],
      "completionMessage": "Great job! You've successfully learned how to navigate the interface and select a medical practice. You're now ready to work with Manhattan Gastroenterology!"
    },
    {
      "id": "navigate-and-search-interface",
      "name": "Navigate and Search",
      "description": "Learn how to open drawers, navigate the interface, and use search functionality",
      "emoji": "🔍",
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
          "id": "close-overlay",
          "selector": "div.fixed.inset-0.z-50",
          "action": "click",
          "instruction": "Click on the overlay area to close the drawer",
          "tooltipPosition": "auto",
          "route": "/app"
        },
        {
          "id": "focus-search",
          "selector": "[data-testid=\"search-input\"]",
          "action": "click",
          "instruction": "Click on the search input field to start searching",
          "tooltipPosition": "bottom",
          "route": "/app"
        },
        {
          "id": "type-search",
          "selector": "[data-testid=\"search-input\"]",
          "action": "type",
          "instruction": "Type 'Click' in the search field",
          "tooltipPosition": "bottom",
          "route": "/app"
        },
        {
          "id": "select-leadership",
          "selector": "span.font-medium",
          "action": "click",
          "instruction": "Click on the Leadership option to filter results",
          "tooltipPosition": "top",
          "route": "/app"
        },
        {
          "id": "select-marketing",
          "selector": "span.text-sm.font-medium.max-md:hidden",
          "action": "click",
          "instruction": "Click on the Marketing category to refine your search",
          "tooltipPosition": "top",
          "route": "/app"
        },
        {
          "id": "return-to-search",
          "selector": "[data-testid=\"search-input\"]",
          "action": "click",
          "instruction": "Click back on the search input to continue searching",
          "tooltipPosition": "bottom",
          "route": "/app"
        }
      ],
      "completionMessage": "Great job! You've learned how to navigate the drawer menu, use the search functionality, and filter results by categories like Leadership and Marketing."
    }
  ],
};
