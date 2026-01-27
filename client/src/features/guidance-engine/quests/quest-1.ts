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
          "selector": "[role=\"dialog\"] [data-testid=\"search-type-option-emails\"]",
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
          "selector": "[role=\"dialog\"] [data-testid=\"search-type-option-super_search_fast\"]",
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
          "selector": "[role=\"dialog\"] [data-testid=\"search-type-option-super_search_fast\"]",
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
          "selector": "[role=\"dialog\"] [data-testid=\"search-type-option-emails\"]",
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
    },
    {
      "id": "configure-email-search-criteria",
      "name": "Configure Email Search Criteria",
      "description": "Learn how to set up email search options and customize search criteria for targeted results",
      "emoji": "📧",
      "steps": [
        {
          "id": "step-1",
          "selector": "#root",
          "action": "click",
          "instruction": "Click on the main area to start configuring your search",
          "tooltipPosition": "bottom",
          "route": "/app/new-search"
        },
        {
          "id": "step-2",
          "selector": "[data-testid=\"search-options-button\"]",
          "action": "click",
          "instruction": "Click the search options button to open advanced search settings",
          "tooltipPosition": "bottom",
          "route": "/app/new-search"
        },
        {
          "id": "step-3",
          "selector": "[role=\"dialog\"] [data-testid=\"search-type-option-emails\"]",
          "action": "click",
          "instruction": "Select the 'Emails' option to include email results in your search",
          "tooltipPosition": "left",
          "route": "/app/new-search"
        },
        {
          "id": "step-4",
          "selector": "[data-testid=\"search-input\"]",
          "action": "click",
          "instruction": "Click in the search input field to enter your search terms",
          "tooltipPosition": "bottom",
          "route": "/app/new-search"
        },
        {
          "id": "step-5",
          "selector": "[data-testid=\"search-input\"]",
          "action": "type",
          "instruction": "Type your search query to find what you're looking for",
          "tooltipPosition": "bottom",
          "route": "/app/new-search",
          "value": "happy people"
        },
        {
          "id": "step-6",
          "selector": "button.flex.items-center.gap-1",
          "action": "click",
          "instruction": "Click the Leadership filter to refine your search criteria",
          "tooltipPosition": "top",
          "route": "/app/new-search"
        },
        {
          "id": "step-7",
          "selector": "button.\n.flex.items-center",
          "action": "click",
          "instruction": "Click the Marketing filter to add another search criteria",
          "tooltipPosition": "top",
          "route": "/app/new-search"
        }
      ],
      "completionMessage": "Great job! You've learned how to configure email search options, enter search terms, and apply multiple filters to get targeted results."
    },
    {
      "id": "search-and-filter-exploration",
      "name": "Search and Filter Tutorial",
      "description": "Learn how to access search history, perform searches, and apply filters",
      "emoji": "🔍",
      "steps": [
        {
          "id": "open-drawer",
          "selector": "nav [data-testid=\"button-open-drawer\"]",
          "action": "click",
          "instruction": "Click the drawer button to open your search history",
          "tooltipPosition": "bottom",
          "route": "/app"
        },
        {
          "id": "click-search-input",
          "selector": "[data-testid=\"search-input\"]",
          "action": "click",
          "instruction": "Click on the search input field to start entering your search",
          "tooltipPosition": "bottom",
          "route": "/app"
        },
        {
          "id": "enter-search-term",
          "selector": "[data-testid=\"search-input\"]",
          "action": "type",
          "instruction": "Type your search term in the input field",
          "tooltipPosition": "bottom",
          "route": "/app",
          "value": "happy"
        },
        {
          "id": "apply-first-filter",
          "selector": "button.flex.items-center.gap-1",
          "action": "click",
          "instruction": "Click this filter button to refine your search results",
          "tooltipPosition": "top",
          "route": "/app"
        },
        {
          "id": "apply-second-filter",
          "selector": "button.\n.flex.items-center",
          "action": "click",
          "instruction": "Apply another filter to further narrow down your results",
          "tooltipPosition": "top",
          "route": "/app"
        }
      ],
      "completionMessage": "Great job! You've learned how to access search history, perform searches, and apply multiple filters to get the most relevant results."
    },
    {
      "id": "advanced-search-with-super-search",
      "name": "Advanced Search Tutorial",
      "description": "Learn how to use different search types and perform advanced queries",
      "emoji": "🔍",
      "steps": [
        {
          "id": "click-search-input",
          "selector": "[data-testid=\"search-input\"]",
          "action": "click",
          "instruction": "Click on the search input field to get started",
          "tooltipPosition": "bottom",
          "route": "/app"
        },
        {
          "id": "open-search-options",
          "selector": "[data-testid=\"search-options-button\"]",
          "action": "click",
          "instruction": "Click the search options button to see different search types",
          "tooltipPosition": "bottom",
          "route": "/app"
        },
        {
          "id": "explore-individual-search",
          "selector": "[role=\"dialog\"] [data-testid=\"search-type-option-individual_search\"]",
          "action": "click",
          "instruction": "Try selecting 'Find Individual' to see what this search type offers",
          "tooltipPosition": "left",
          "route": "/app"
        },
        {
          "id": "cancel-individual-search",
          "selector": "form [data-testid=\"button-cancel\"]",
          "action": "click",
          "instruction": "Cancel this option to explore other search types",
          "tooltipPosition": "top",
          "route": "/app"
        },
        {
          "id": "reopen-search-options",
          "selector": "[data-testid=\"search-options-button\"]",
          "action": "click",
          "instruction": "Open the search options again to choose a different search type",
          "tooltipPosition": "bottom",
          "route": "/app"
        },
        {
          "id": "select-super-search",
          "selector": "[role=\"dialog\"] [data-testid=\"search-type-option-super_search_fast\"]",
          "action": "click",
          "instruction": "Select 'Super Search (Fast)' for more powerful search capabilities",
          "tooltipPosition": "left",
          "route": "/app"
        },
        {
          "id": "focus-search-input",
          "selector": "[data-testid=\"search-input\"]",
          "action": "click",
          "instruction": "Click in the search field to prepare for your query",
          "tooltipPosition": "bottom",
          "route": "/app"
        },
        {
          "id": "type-advanced-query",
          "selector": "[data-testid=\"search-input\"]",
          "action": "type",
          "instruction": "Type your detailed search query about AI engineers at Tesla",
          "tooltipPosition": "bottom",
          "route": "/app",
          "value": "find engineers that focus on ai vision at tesla in germany"
        },
        {
          "id": "execute-search",
          "selector": "[data-testid=\"search-button\"]",
          "action": "click",
          "instruction": "Click the search button to run your advanced query",
          "tooltipPosition": "left",
          "route": "/app"
        }
      ],
      "completionMessage": "Great job! You've learned how to explore different search types and perform advanced queries using Super Search. You can now craft detailed searches to find exactly what you're looking for!"
    },
    {
      "id": "search-contacts-with-filters",
      "name": "Search Contacts with Filters",
      "description": "Learn how to search for specific contacts using search filters and options",
      "emoji": "🔍",
      "steps": [
        {
          "id": "click-search-input-1",
          "selector": "[data-testid=\"search-input\"]",
          "action": "click",
          "instruction": "Click on the search input field to start your search",
          "tooltipPosition": "bottom",
          "route": "/app"
        },
        {
          "id": "click-search-input-2",
          "selector": "[data-testid=\"search-input\"]",
          "action": "click",
          "instruction": "Click on the search input again to ensure it's focused",
          "tooltipPosition": "bottom",
          "route": "/app"
        },
        {
          "id": "click-search-input-3",
          "selector": "[data-testid=\"search-input\"]",
          "action": "click",
          "instruction": "Click on the search input once more to prepare for typing",
          "tooltipPosition": "bottom",
          "route": "/app"
        },
        {
          "id": "type-search-query",
          "selector": "[data-testid=\"search-input\"]",
          "action": "type",
          "instruction": "Type your search query in the input field",
          "tooltipPosition": "bottom",
          "route": "/app",
          "value": "happy"
        },
        {
          "id": "open-search-options",
          "selector": "[data-testid=\"search-options-button\"]",
          "action": "click",
          "instruction": "Click the search options button to access additional filters",
          "tooltipPosition": "left",
          "route": "/app"
        },
        {
          "id": "select-contacts-filter",
          "selector": "[role=\"dialog\"] [data-testid=\"search-type-option-contacts\"]",
          "action": "click",
          "instruction": "Select 'Contacts' to filter your search results to contacts only",
          "tooltipPosition": "right",
          "route": "/app"
        },
        {
          "id": "select-leadership-filter-1",
          "selector": "button.flex.items-center.gap-1",
          "action": "click",
          "instruction": "Click on the 'Leadership' filter to narrow your search to leadership contacts",
          "tooltipPosition": "top",
          "route": "/app"
        },
        {
          "id": "select-leadership-filter-2",
          "selector": "button.\n.flex.items-center",
          "action": "click",
          "instruction": "Confirm your leadership filter selection",
          "tooltipPosition": "top",
          "route": "/app"
        }
      ],
      "completionMessage": "Great job! You've learned how to use search filters to find specific contacts. You can now search effectively using keywords and apply filters like contact type and leadership roles to get more targeted results."
    },
    {
      "id": "search-with-custom-options",
      "name": "Search with Custom Options",
      "description": "Learn how to configure search settings and perform a search with specific parameters",
      "emoji": "🔍",
      "steps": [
        {
          "id": "open-search-options",
          "selector": "[data-testid=\"search-options-button\"]",
          "action": "click",
          "instruction": "Click the search options button to configure your search settings",
          "tooltipPosition": "bottom",
          "route": "/app"
        },
        {
          "id": "select-search-type",
          "selector": "[role=\"dialog\"] [data-testid=\"search-type-option-super_search_fast\"]",
          "action": "click",
          "instruction": "Select 'Super Search (Fast)' to use the optimized search mode",
          "tooltipPosition": "right",
          "route": "/app"
        },
        {
          "id": "focus-search-input",
          "selector": "[data-testid=\"search-input\"]",
          "action": "click",
          "instruction": "Click on the search input field to start entering your search query",
          "tooltipPosition": "top",
          "route": "/app"
        },
        {
          "id": "enter-search-query",
          "selector": "[data-testid=\"search-input\"]",
          "action": "type",
          "instruction": "Type your search query in the input field",
          "tooltipPosition": "top",
          "route": "/app",
          "value": "happy people"
        }
      ],
      "completionMessage": "Great job! You've learned how to customize search options and perform a search. Now you can use different search modes to find exactly what you're looking for!"
    },
    {
      "id": "search-emails-with-suggestions",
      "name": "Search for Emails with Suggestions",
      "description": "Learn how to configure search options for emails and use search suggestions",
      "emoji": "📧",
      "steps": [
        {
          "id": "open-search-options",
          "selector": "[data-testid=\"search-options-button\"]",
          "action": "click",
          "instruction": "Click the search options button to configure your search settings",
          "tooltipPosition": "bottom",
          "route": "/app"
        },
        {
          "id": "select-email-search",
          "selector": "[role=\"dialog\"] [data-testid=\"search-type-option-emails\"]",
          "action": "click",
          "instruction": "Select 'Emails' to search specifically for email content",
          "tooltipPosition": "right",
          "route": "/app"
        },
        {
          "id": "click-search-input",
          "selector": "[data-testid=\"search-input\"]",
          "action": "click",
          "instruction": "Click on the search input field to start typing your query",
          "tooltipPosition": "top",
          "route": "/app"
        },
        {
          "id": "type-search-query",
          "selector": "[data-testid=\"search-input\"]",
          "action": "type",
          "instruction": "Type your search query in the input field",
          "tooltipPosition": "top",
          "route": "/app",
          "value": "happy people 22222222"
        },
        {
          "id": "select-suggestion",
          "selector": "[data-testid=\"button-suggestion-recently-exited-startups-in-mi\"]",
          "action": "click",
          "instruction": "Click on the suggested search term 'Recently exited startups in Miami' to use it as your query",
          "tooltipPosition": "top",
          "route": "/app"
        }
      ],
      "completionMessage": "Great job! You've learned how to configure search options for emails and use search suggestions to find relevant content more efficiently."
    }
  ],
};
