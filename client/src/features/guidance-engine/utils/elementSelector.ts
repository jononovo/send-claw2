const INTERACTIVE_TAGS = ['BUTTON', 'A', 'INPUT', 'TEXTAREA', 'SELECT', 'LABEL'];
const INTERACTIVE_ROLES = ['button', 'link', 'menuitem', 'tab', 'checkbox', 'radio', 'switch', 'option'];

export interface SelectorResult {
  selector: string;
  contentMatch?: string;
}

function findInteractiveAncestor(element: HTMLElement): HTMLElement {
  let current: HTMLElement | null = element;
  
  while (current) {
    if (INTERACTIVE_TAGS.includes(current.tagName)) return current;
    
    const role = current.getAttribute('role');
    if (role && INTERACTIVE_ROLES.includes(role)) return current;
    
    if (current.hasAttribute('data-testid')) return current;
    
    if (current.onclick || current.hasAttribute('onclick')) return current;
    
    current = current.parentElement;
  }
  
  return element;
}

function escapeSelector(str: string): string {
  return str.replace(/["\\]/g, '\\$&');
}

function escapeCSSClass(className: string): string {
  return className
    .replace(/\[/g, '\\[')
    .replace(/\]/g, '\\]')
    .replace(/:/g, '\\:')
    .replace(/\//g, '\\/');
}

function buildElementSelector(element: HTMLElement): string {
  if (element.dataset.testid) {
    return `[data-testid="${escapeSelector(element.dataset.testid)}"]`;
  }
  
  if (element.id) {
    return `#${element.id}`;
  }
  
  const ariaLabel = element.getAttribute('aria-label');
  if (ariaLabel) {
    return `${element.tagName.toLowerCase()}[aria-label="${escapeSelector(ariaLabel)}"]`;
  }
  
  const role = element.getAttribute('role');
  if (role) {
    const type = element.getAttribute('type');
    if (type) {
      return `[role="${role}"][type="${type}"]`;
    }
    return `${element.tagName.toLowerCase()}[role="${role}"]`;
  }
  
  if (element.tagName === 'INPUT' || element.tagName === 'TEXTAREA') {
    const name = element.getAttribute('name');
    if (name) {
      return `${element.tagName.toLowerCase()}[name="${escapeSelector(name)}"]`;
    }
    const placeholder = element.getAttribute('placeholder');
    if (placeholder) {
      return `${element.tagName.toLowerCase()}[placeholder="${escapeSelector(placeholder)}"]`;
    }
  }
  
  if (element.className && typeof element.className === 'string') {
    const classes = element.className
      .split(' ')
      .filter(c => c && !c.startsWith('hover:') && !c.startsWith('focus:') && !c.startsWith('active:'))
      .slice(0, 3)
      .map(escapeCSSClass);
    
    if (classes.length > 0) {
      return `${element.tagName.toLowerCase()}.${classes.join('.')}`;
    }
  }
  
  return element.tagName.toLowerCase();
}

function findDistinguishingAncestor(element: HTMLElement, maxDepth: number = 4): HTMLElement | null {
  let current = element.parentElement;
  let depth = 0;
  
  while (current && depth < maxDepth) {
    if (current.id) return current;
    if (current.dataset.testid) return current;
    
    const ariaLabel = current.getAttribute('aria-label');
    if (ariaLabel) return current;
    
    const role = current.getAttribute('role');
    if (role && ['main', 'navigation', 'dialog', 'form', 'region', 'article', 'section'].includes(role)) {
      return current;
    }
    
    if (['MAIN', 'NAV', 'HEADER', 'FOOTER', 'ASIDE', 'FORM', 'DIALOG'].includes(current.tagName)) {
      return current;
    }
    
    current = current.parentElement;
    depth++;
  }
  
  return null;
}

function buildAncestorSelector(ancestor: HTMLElement): string {
  if (ancestor.id) {
    return `#${ancestor.id}`;
  }
  if (ancestor.dataset.testid) {
    return `[data-testid="${escapeSelector(ancestor.dataset.testid)}"]`;
  }
  const ariaLabel = ancestor.getAttribute('aria-label');
  if (ariaLabel) {
    return `[aria-label="${escapeSelector(ariaLabel)}"]`;
  }
  const role = ancestor.getAttribute('role');
  if (role) {
    return `[role="${role}"]`;
  }
  return ancestor.tagName.toLowerCase();
}

function getContentIdentifier(element: HTMLElement): string | undefined {
  const text = element.textContent?.trim();
  if (text && text.length > 0 && text.length <= 50) {
    return text;
  }
  
  const svg = element.querySelector('svg');
  if (svg) {
    const svgClass = svg.getAttribute('class');
    if (svgClass) {
      const iconClass = svgClass.split(' ').find(c => 
        c.includes('icon') || c.includes('Icon') || 
        c.includes('lucide') || c.includes('fa-')
      );
      if (iconClass) return `svg:${iconClass}`;
    }
    
    const use = svg.querySelector('use');
    if (use) {
      const href = use.getAttribute('href') || use.getAttribute('xlink:href');
      if (href) return `svg:${href}`;
    }
  }
  
  const img = element.querySelector('img');
  if (img) {
    const alt = img.getAttribute('alt');
    if (alt) return `img:${alt}`;
  }
  
  return undefined;
}

export function getBestSelector(clickedElement: HTMLElement): SelectorResult {
  const element = findInteractiveAncestor(clickedElement);
  const elementSelector = buildElementSelector(element);
  
  const ancestor = findDistinguishingAncestor(element);
  const ancestorSelector = ancestor ? buildAncestorSelector(ancestor) : null;
  
  const fullSelector = ancestorSelector 
    ? `${ancestorSelector} ${elementSelector}`
    : elementSelector;
  
  try {
    const matches = document.querySelectorAll(fullSelector);
    
    if (matches.length === 1) {
      return { selector: fullSelector };
    }
    
    if (matches.length > 1) {
      const contentMatch = getContentIdentifier(element);
      
      if (contentMatch) {
        return { selector: fullSelector, contentMatch };
      }
      
      let index = 0;
      for (let i = 0; i < matches.length; i++) {
        if (matches[i] === element) {
          index = i + 1;
          break;
        }
      }
      
      if (index > 0) {
        return { 
          selector: `${fullSelector}:nth-of-type(${index})`,
          contentMatch: getContentIdentifier(element)
        };
      }
    }
  } catch {
  }
  
  return { 
    selector: fullSelector,
    contentMatch: getContentIdentifier(element)
  };
}

export function getElementDescription(element: HTMLElement): string {
  const ariaLabel = element.getAttribute('aria-label');
  if (ariaLabel) return ariaLabel;
  
  const text = element.textContent?.trim().slice(0, 50);
  if (text) return text;
  
  if (element.getAttribute('placeholder')) {
    return element.getAttribute('placeholder') || '';
  }
  
  const title = element.getAttribute('title');
  if (title) return title;
  
  return element.tagName.toLowerCase();
}

export function findElement(selector: string, contentMatch?: string): HTMLElement | null {
  try {
    const matches = document.querySelectorAll(selector);
    
    if (matches.length === 1) {
      return matches[0] as HTMLElement;
    }
    
    if (matches.length > 1 && contentMatch) {
      for (let i = 0; i < matches.length; i++) {
        const htmlEl = matches[i] as HTMLElement;
        
        const text = htmlEl.textContent?.trim() || '';
        if (text === contentMatch || text.includes(contentMatch)) {
          return htmlEl;
        }
        
        if (contentMatch.startsWith('svg:')) {
          const svgIdentifier = contentMatch.slice(4);
          const svg = htmlEl.querySelector('svg');
          if (svg) {
            const svgClass = svg.getAttribute('class') || '';
            if (svgClass.includes(svgIdentifier)) {
              return htmlEl;
            }
            const use = svg.querySelector('use');
            const href = use?.getAttribute('href') || use?.getAttribute('xlink:href') || '';
            if (href.includes(svgIdentifier)) {
              return htmlEl;
            }
          }
        }
        
        if (contentMatch.startsWith('img:')) {
          const imgAlt = contentMatch.slice(4);
          const img = htmlEl.querySelector('img');
          if (img && img.getAttribute('alt') === imgAlt) {
            return htmlEl;
          }
        }
      }
    }
    
    if (matches.length > 0) {
      return matches[0] as HTMLElement;
    }
  } catch {
  }
  
  return null;
}
