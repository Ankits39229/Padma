// Formatting Utility Functions

/**
 * Format bytes to human-readable string
 */
export function formatBytes(bytes: number, decimals: number = 2): string {
  if (bytes === 0) return '0 B';
  
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB', 'PB'];
  
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

/**
 * Format a number with thousand separators
 */
export function formatNumber(num: number): string {
  return num.toLocaleString();
}

/**
 * Format a percentage value
 */
export function formatPercent(value: number, decimals: number = 0): string {
  return `${value.toFixed(decimals)}%`;
}

/**
 * Format a date to a readable string
 */
export function formatDate(date: Date, options?: Intl.DateTimeFormatOptions): string {
  const defaultOptions: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  };
  
  return date.toLocaleDateString('en-US', options || defaultOptions);
}

/**
 * Format time duration in seconds to readable string
 */
export function formatDuration(seconds: number): string {
  if (seconds < 60) {
    return `${seconds}s`;
  }
  
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  
  if (minutes < 60) {
    return remainingSeconds > 0 
      ? `${minutes}m ${remainingSeconds}s` 
      : `${minutes}m`;
  }
  
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  
  return `${hours}h ${remainingMinutes}m`;
}

/**
 * Truncate a string to a maximum length
 */
export function truncateString(str: string, maxLength: number, suffix: string = '...'): string {
  if (str.length <= maxLength) return str;
  return str.substring(0, maxLength - suffix.length) + suffix;
}

/**
 * Truncate a file path for display
 */
export function truncatePath(path: string, maxLength: number = 50): string {
  if (path.length <= maxLength) return path;
  
  const separator = path.includes('/') ? '/' : '\\';
  const parts = path.split(separator);
  
  if (parts.length <= 3) {
    return truncateString(path, maxLength);
  }
  
  const start = parts.slice(0, 1).join(separator);
  const end = parts.slice(-2).join(separator);
  
  return `${start}${separator}...${separator}${end}`;
}

/**
 * Convert camelCase to Title Case
 */
export function camelToTitle(str: string): string {
  const result = str.replace(/([A-Z])/g, ' $1');
  return result.charAt(0).toUpperCase() + result.slice(1);
}

/**
 * Convert kebab-case to Title Case
 */
export function kebabToTitle(str: string): string {
  return str
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/**
 * Pluralize a word based on count
 */
export function pluralize(count: number, singular: string, plural?: string): string {
  return count === 1 ? singular : (plural || singular + 's');
}

/**
 * Format file size with appropriate unit
 */
export function formatFileSize(bytes: number): { value: number; unit: string } {
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  
  if (bytes === 0) {
    return { value: 0, unit: 'B' };
  }
  
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  const value = parseFloat((bytes / Math.pow(k, i)).toFixed(2));
  
  return { value, unit: sizes[i] };
}
