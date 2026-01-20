/**
 * Tailwind CSS injection for Shadow DOM using Constructable Stylesheets
 */

let tailwindSheet: CSSStyleSheet | null = null;

/**
 * Initialize Tailwind CSS stylesheet for Shadow DOM injection
 * This extracts styles from the document and creates a reusable CSSStyleSheet
 */
export async function initTailwindStyles(): Promise<CSSStyleSheet> {
  if (tailwindSheet) {
    return tailwindSheet;
  }

  tailwindSheet = new CSSStyleSheet();

  // Collect all stylesheets from document
  const cssTexts: string[] = [];

  for (const sheet of document.styleSheets) {
    try {
      if (sheet.cssRules) {
        for (const rule of sheet.cssRules) {
          cssTexts.push(rule.cssText);
        }
      }
    } catch {
      // Cross-origin stylesheets will throw, skip them
    }
  }

  // Also check for any <style> elements that might contain Tailwind
  const styleElements = document.querySelectorAll('style');
  for (const el of styleElements) {
    if (el.textContent) {
      cssTexts.push(el.textContent);
    }
  }

  await tailwindSheet.replace(cssTexts.join('\n'));

  return tailwindSheet;
}

/**
 * Get the shared Tailwind stylesheet
 * Call initTailwindStyles() first to ensure it's ready
 */
export function getTailwindSheet(): CSSStyleSheet | null {
  return tailwindSheet;
}

/**
 * Create a widget-specific stylesheet that includes Tailwind and custom styles
 */
export function createWidgetStylesheet(customCSS: string = ''): CSSStyleSheet {
  const sheet = new CSSStyleSheet();

  // Start with custom CSS
  if (customCSS) {
    sheet.replaceSync(customCSS);
  }

  return sheet;
}

/**
 * Check if Constructable Stylesheets are supported
 */
export function supportsAdoptedStyleSheets(): boolean {
  try {
    return 'adoptedStyleSheets' in Document.prototype &&
           'adoptedStyleSheets' in ShadowRoot.prototype &&
           typeof CSSStyleSheet !== 'undefined' &&
           'replaceSync' in CSSStyleSheet.prototype;
  } catch {
    return false;
  }
}

/**
 * Apply stylesheets to a Shadow DOM
 * Falls back to <style> elements if adoptedStyleSheets not supported
 */
export function applyStylesToShadow(
  shadow: ShadowRoot,
  ...sheets: CSSStyleSheet[]
): void {
  if (supportsAdoptedStyleSheets() && shadow.adoptedStyleSheets !== undefined) {
    try {
      const existingSheets = Array.from(shadow.adoptedStyleSheets || []);
      shadow.adoptedStyleSheets = [...existingSheets, ...sheets];
      return;
    } catch {
      // Fall through to fallback
    }
  }

  // Fallback: inject <style> elements
  for (const sheet of sheets) {
    const style = document.createElement('style');
    try {
      // Try to extract CSS rules from the stylesheet
      const rules: string[] = [];
      for (let i = 0; i < sheet.cssRules.length; i++) {
        rules.push(sheet.cssRules[i].cssText);
      }
      style.textContent = rules.join('\n');
    } catch {
      // If we can't access rules, skip this sheet
      continue;
    }
    shadow.appendChild(style);
  }
}

/**
 * Base widget styles - applied to all widgets
 */
export const BASE_WIDGET_STYLES = `
  :host {
    display: block;
    box-sizing: border-box;
  }

  :host([hidden]) {
    display: none !important;
  }

  :host([disabled]) {
    pointer-events: none;
    opacity: 0.5;
  }

  *, *::before, *::after {
    box-sizing: border-box;
  }
`;
