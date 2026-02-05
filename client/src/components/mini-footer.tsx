import { Link } from "wouter";

export function MiniFooter() {
  return (
    <footer className="border-t border-slate-200 dark:border-slate-800 py-2 mt-auto">
      <div className="container mx-auto px-4">
        <div className="flex flex-row justify-between items-center flex-wrap gap-2">
          <span className="text-xs text-slate-600 dark:text-slate-400 italic">
            Soli Deo Gloria
          </span>
          <span className="text-xs text-slate-600 dark:text-slate-400">
            Made with ♥️ in NYC
          </span>
          <span className="text-xs text-slate-500 dark:text-slate-500">
            Audited & Verified at SecureClawHub.com
          </span>
          <a
            href="https://www.linkedin.com/company/5ducks/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400"
          >
            LinkedIn
          </a>
        </div>
      </div>
    </footer>
  );
}