import { Link } from "wouter";

export function FooterStealth() {
  return (
    <footer className="border-t border-white/10 py-12 mt-auto bg-background" data-testid="footer-stealth">
      <div className="container mx-auto px-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div>
            <div className="font-bold flex items-center text-xl">
              <span className="text-gray-400">5</span>
              <span className="text-gray-300">Ducks</span>
              <span className="ml-2 text-xl opacity-60">🐥</span>
            </div>
            <p className="text-sm text-gray-400 mt-4 leading-relaxed" data-testid="text-footer-description">
              5Ducks makes it easy for founders to build a $70k pipeline in only five minutes per day.
            </p>
          </div>
          
          <div>
            <h3 className="text-sm font-semibold mb-4 text-gray-300 uppercase tracking-wider">Product</h3>
            <ul className="space-y-3 text-sm">
              <li>
                <Link href="/pricing" className="text-gray-400 hover:text-white transition-colors" data-testid="link-footer-pricing">
                  Pricing
                </Link>
              </li>
              <li>
                <Link href="/blog" className="text-gray-400 hover:text-white transition-colors" data-testid="link-footer-blog">
                  Blog
                </Link>
              </li>
            </ul>
          </div>
          
          <div>
            <h3 className="text-sm font-semibold mb-4 text-gray-300 uppercase tracking-wider">Company</h3>
            <ul className="space-y-3 text-sm">
              <li>
                <Link href="/contact" className="text-gray-400 hover:text-white transition-colors" data-testid="link-footer-contact">
                  Contact
                </Link>
              </li>
              <li>
                <Link href="/contact" className="text-gray-400 hover:text-white transition-colors" data-testid="link-footer-support">
                  Support
                </Link>
              </li>
              <li>
                <Link href="/changelog" className="text-gray-400 hover:text-white transition-colors" data-testid="link-footer-changelog">
                  Changelog
                </Link>
              </li>
              <li>
                <a href="/sitemap.xml" className="text-gray-400 hover:text-white transition-colors" data-testid="link-footer-sitemap">
                  Sitemap
                </a>
              </li>
            </ul>
          </div>
          
          <div>
            <h3 className="text-sm font-semibold mb-4 text-gray-300 uppercase tracking-wider">Legal</h3>
            <ul className="space-y-3 text-sm">
              <li>
                <a href="/privacy.html" className="text-gray-400 hover:text-white transition-colors" data-testid="link-footer-privacy">
                  Privacy Policy
                </a>
              </li>
              <li>
                <Link href="/blog/tos" className="text-gray-400 hover:text-white transition-colors" data-testid="link-footer-tos">
                  Terms of Service
                </Link>
              </li>
            </ul>
          </div>
        </div>
        
        <div className="mt-10 pt-8 border-t border-white/5 flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
          <div className="text-xs text-gray-400" data-testid="text-footer-copyright">
            © {new Date().getFullYear()} 5Ducks. All rights reserved.
          </div>
          <div className="flex items-center">
            <span className="text-xs text-gray-400 italic" data-testid="text-footer-motto">
              Soli Deo Gloria
            </span>
          </div>
          <div className="text-xs text-gray-500">
            Audited & Verified at SecureClawHub.com
          </div>
          <div className="flex items-center space-x-6">
            <a
              href="https://www.linkedin.com/company/5ducks/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-gray-400 hover:text-white transition-colors"
              data-testid="link-footer-linkedin"
            >
              LinkedIn
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
