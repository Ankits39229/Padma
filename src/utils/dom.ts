// DOM Utility Functions

/**
 * Safely get an element by ID with type assertion
 */
export function getElementById<T extends HTMLElement>(id: string): T | null {
  return document.getElementById(id) as T | null;
}

/**
 * Safely query select an element with type assertion
 */
export function querySelector<T extends HTMLElement>(selector: string, parent: Element | Document = document): T | null {
  return parent.querySelector<T>(selector);
}

/**
 * Query select all elements with type assertion
 */
export function querySelectorAll<T extends HTMLElement>(selector: string, parent: Element | Document = document): T[] {
  return Array.from(parent.querySelectorAll<T>(selector));
}

/**
 * Create an element with optional attributes and content
 */
export function createElement<K extends keyof HTMLElementTagNameMap>(
  tagName: K,
  options?: {
    className?: string;
    id?: string;
    attributes?: Record<string, string>;
    innerHTML?: string;
    textContent?: string;
  }
): HTMLElementTagNameMap[K] {
  const element = document.createElement(tagName);
  
  if (options?.className) {
    element.className = options.className;
  }
  
  if (options?.id) {
    element.id = options.id;
  }
  
  if (options?.attributes) {
    Object.entries(options.attributes).forEach(([key, value]) => {
      element.setAttribute(key, value);
    });
  }
  
  if (options?.innerHTML) {
    element.innerHTML = options.innerHTML;
  } else if (options?.textContent) {
    element.textContent = options.textContent;
  }
  
  return element;
}

/**
 * Add multiple event listeners to an element
 */
export function addEventListeners(
  element: Element,
  events: Record<string, EventListener>
): void {
  Object.entries(events).forEach(([event, handler]) => {
    element.addEventListener(event, handler);
  });
}

/**
 * Remove multiple event listeners from an element
 */
export function removeEventListeners(
  element: Element,
  events: Record<string, EventListener>
): void {
  Object.entries(events).forEach(([event, handler]) => {
    element.removeEventListener(event, handler);
  });
}

/**
 * Toggle a class on an element
 */
export function toggleClass(element: Element, className: string, force?: boolean): boolean {
  return element.classList.toggle(className, force);
}

/**
 * Wait for an element to appear in the DOM
 */
export function waitForElement<T extends Element>(
  selector: string,
  timeout: number = 5000
): Promise<T> {
  return new Promise((resolve, reject) => {
    const element = document.querySelector<T>(selector);
    if (element) {
      resolve(element);
      return;
    }
    
    const observer = new MutationObserver((mutations, obs) => {
      const element = document.querySelector<T>(selector);
      if (element) {
        obs.disconnect();
        resolve(element);
      }
    });
    
    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
    
    setTimeout(() => {
      observer.disconnect();
      reject(new Error(`Element "${selector}" not found within ${timeout}ms`));
    }, timeout);
  });
}

/**
 * Debounce a function
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null;
  
  return (...args: Parameters<T>) => {
    if (timeout) {
      clearTimeout(timeout);
    }
    timeout = setTimeout(() => func(...args), wait);
  };
}

/**
 * Throttle a function
 */
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle = false;
  
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
}
