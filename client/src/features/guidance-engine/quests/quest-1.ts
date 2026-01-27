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
          value: "marketing agencies in Austin",
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
      "id": "search-emails-with-filters",
      "name": "Search for Emails with Filters",
      "description": "Learn how to use search options, apply filters, and perform targeted email searches",
      "emoji": "📧",
      "steps": [
        {
          "id": "open-search-options",
          "selector": "[data-testid=\"search-options-button\"]",
          "action": "click",
          "instruction": "Click the search options button to access advanced search features",
          "tooltipPosition": "bottom",
          "route": "/app"
        },
        {
          "id": "select-emails-option",
          "selector": "#radix-:r65: [data-testid=\"search-type-option-emails\"]",
          "action": "click",
          "instruction": "Select the 'Emails' option to search specifically for email contacts",
          "tooltipPosition": "right",
          "route": "/app"
        },
        {
          "id": "add-leadership-filter",
          "selector": "button.flex.items-center.gap-1",
          "action": "click",
          "instruction": "Click on 'Leadership' to add it as a filter for your search",
          "tooltipPosition": "bottom",
          "route": "/app"
        },
        {
          "id": "add-marketing-filter",
          "selector": "button.\n.flex.items-center",
          "action": "click",
          "instruction": "Click on 'Marketing' to add another filter to narrow your search",
          "tooltipPosition": "bottom",
          "route": "/app"
        },
        {
          "id": "click-search-input",
          "selector": "[data-testid=\"search-input\"]",
          "action": "click",
          "instruction": "Click on the search input field to start entering your search query",
          "tooltipPosition": "bottom",
          "route": "/app"
        },
        {
          "id": "enter-search-query",
          "selector": "[data-testid=\"search-input\"]",
          "action": "type",
          "instruction": "Type your search query to find specific contacts",
          "tooltipPosition": "bottom",
          "route": "/app",
          "value": "plumbers in brooklyn"
        },
        {
          "id": "finalize-search",
          "selector": "body.react-loaded",
          "action": "click",
          "instruction": "Click outside the search area to execute your filtered search",
          "tooltipPosition": "auto",
          "route": "/app"
        }
      ],
      "completionMessage": "Great job! You've learned how to use search options, apply multiple filters, and perform targeted email searches to find exactly the contacts you need."
    },
    {
      "id": "advanced-search-configuration",
      "name": "Configure Advanced Search",
      "description": "Learn how to set up advanced search options and customize your search query",
      "emoji": "🔍",
      "steps": [
        {
          "id": "open-search-options",
          "selector": "[data-testid=\"search-options-button\"]",
          "action": "click",
          "instruction": "Click the search options button to access advanced search settings",
          "tooltipPosition": "bottom",
          "route": "/app/new-search"
        },
        {
          "id": "select-super-search",
          "selector": "#radix-:rh7: [data-testid=\"search-type-option-super_search_fast\"]",
          "action": "click",
          "instruction": "Select 'Super Search (Fast)' to use the most powerful search algorithm",
          "tooltipPosition": "right",
          "route": "/app/new-search"
        },
        {
          "id": "click-search-input",
          "selector": "[data-testid=\"search-input\"]",
          "action": "click",
          "instruction": "Click in the search input field to start entering your query",
          "tooltipPosition": "bottom",
          "route": "/app/new-search"
        },
        {
          "id": "enter-search-query",
          "selector": "[data-testid=\"search-input\"]",
          "action": "type",
          "instruction": "Type your specific search query about Tesla engineers in Germany",
          "tooltipPosition": "bottom",
          "route": "/app/new-search",
          "value": "Find tesla engineers in germany working on lithium sourcing or batteries."
        },
        {
          "id": "add-marketing-filter",
          "selector": "button.flex.items-center.gap-1",
          "action": "click",
          "instruction": "Click to add Marketing as a filter category",
          "tooltipPosition": "top",
          "route": "/app/new-search"
        },
        {
          "id": "add-leadership-filter",
          "selector": "button.\n.flex.items-center",
          "action": "click",
          "instruction": "Click to add Leadership as an additional filter category",
          "tooltipPosition": "top",
          "route": "/app/new-search"
        }
      ],
      "completionMessage": "Great job! You've learned how to configure advanced search options, select search types, enter detailed queries, and apply multiple filters to refine your results."
    },
    {
      "id": "advanced-search-setup-with-filters",
      "name": "Advanced Search Setup",
      "description": "Learn how to configure search options, enter specific queries, and apply professional filters",
      "emoji": "🔍",
      "steps": [
        {
          "id": "open-search-options",
          "selector": "[data-testid=\"search-options-button\"]",
          "action": "click",
          "instruction": "Click the search options button to access advanced search settings",
          "tooltipPosition": "bottom",
          "route": "/app/new-search"
        },
        {
          "id": "select-super-search",
          "selector": "#radix-:r1i: [data-testid=\"search-type-option-super_search_fast\"]",
          "action": "click",
          "instruction": "Select 'Super Search (Fast)' for enhanced search capabilities",
          "tooltipPosition": "right",
          "route": "/app/new-search"
        },
        {
          "id": "focus-search-input",
          "selector": "[data-testid=\"search-input\"]",
          "action": "click",
          "instruction": "Click in the search field to start entering your query",
          "tooltipPosition": "bottom",
          "route": "/app/new-search"
        },
        {
          "id": "enter-search-query",
          "selector": "[data-testid=\"search-input\"]",
          "action": "type",
          "instruction": "Type your specific search query about Tesla engineers",
          "tooltipPosition": "bottom",
          "route": "/app/new-search",
          "value": "tesla engineers working on lithium sourcing"
        },
        {
          "id": "confirm-search-input",
          "selector": "[data-testid=\"search-input\"]",
          "action": "click",
          "instruction": "Click to confirm your search input",
          "tooltipPosition": "bottom",
          "route": "/app/new-search"
        },
        {
          "id": "select-leadership-filter",
          "selector": "button.flex.items-center.gap-1",
          "action": "click",
          "instruction": "Click on the 'Leadership' filter to narrow down to leadership roles",
          "tooltipPosition": "top",
          "route": "/app/new-search"
        },
        {
          "id": "select-cto-filter",
          "selector": "button.\n.flex.items-center",
          "action": "click",
          "instruction": "Select 'CTO' to specifically target Chief Technology Officers",
          "tooltipPosition": "top",
          "route": "/app/new-search"
        }
      ],
      "completionMessage": "Great job! You've learned how to set up an advanced search with specific queries and professional filters. This will help you find exactly the type of professionals you're looking for!"
    },
    {
      "id": "advanced-search-with-filters",
      "name": "Advanced Search with Filters",
      "description": "Learn how to perform targeted searches with email options and job level filters",
      "emoji": "🔍",
      "steps": [
        {
          "id": "open-search-options",
          "selector": "[data-testid=\"search-options-button\"]",
          "action": "click",
          "instruction": "Click the search options button to access advanced search settings",
          "tooltipPosition": "bottom",
          "route": "/app/new-search"
        },
        {
          "id": "select-email-option",
          "selector": "#radix-:r96: [data-testid=\"search-type-option-emails\"]",
          "action": "click",
          "instruction": "Select the 'Emails' option to include email data in your search results",
          "tooltipPosition": "right",
          "route": "/app/new-search"
        },
        {
          "id": "click-search-input",
          "selector": "[data-testid=\"search-input\"]",
          "action": "click",
          "instruction": "Click on the search input field to start entering your search criteria",
          "tooltipPosition": "top",
          "route": "/app/new-search"
        },
        {
          "id": "enter-search-query",
          "selector": "[data-testid=\"search-input\"]",
          "action": "type",
          "instruction": "Type your search query to find specific professionals",
          "tooltipPosition": "top",
          "route": "/app/new-search",
          "value": "tesla engineers working on batteries in germany"
        },
        {
          "id": "select-cto-filter",
          "selector": "button.flex.items-center.gap-1",
          "action": "click",
          "instruction": "Click on 'CTO' to add this job title filter to your search",
          "tooltipPosition": "bottom",
          "route": "/app/new-search"
        },
        {
          "id": "select-leadership-filter",
          "selector": "button.\n.flex.items-center",
          "action": "click",
          "instruction": "Click on 'Leadership' to broaden your search to include leadership roles",
          "tooltipPosition": "bottom",
          "route": "/app/new-search"
        },
        {
          "id": "execute-search",
          "selector": "[data-testid=\"search-button\"]",
          "action": "click",
          "instruction": "Click the Search button to execute your advanced search with all selected filters",
          "tooltipPosition": "top",
          "route": "/app/new-search"
        }
      ],
      "completionMessage": "Great job! You've learned how to perform advanced searches with email options and job level filters. This will help you find more targeted and relevant professional contacts!"
    }
  ],
};
