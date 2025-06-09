// Icon configuration constants for the entire application
// This provides centralized control over icon sizing and weights

/**
 * IMPORTANT ICON NAMING CONVENTIONS & BEST PRACTICES
 * 
 * 1. DEPRECATED ICON NAMES:
 *    Many Phosphor icons are being deprecated. Always use the "Icon" suffix versions:
 *    ❌ DEPRECATED: ArrowSquareOut, Plus, X, CaretRight, SpinnerGap, Check, etc.
 *    ✅ CURRENT:    ArrowSquareOutIcon, PlusIcon, XIcon, CaretRightIcon, SpinnerGapIcon, CheckIcon, etc.
 * 
 * 2. ICON WEIGHT GUIDELINES:
 *    - Use FILL for primary actions, prominent buttons, and status indicators
 *    - Use BOLD for secondary actions and emphasis
 *    - Use REGULAR for neutral UI elements and text accompaniment
 *    - Use LIGHT for subtle indicators and background elements
 *    - Use THIN sparingly for very subtle visual cues
 *    - Use DUOTONE for special cases requiring two-tone styling
 * 
 * 3. ICON SIZE GUIDELINES:
 *    - XS (12px): Dropdown carets, small indicators, inline text icons
 *    - SM (16px): Input field icons, table actions, compact UI elements
 *    - MD (20px): Standard buttons, toolbar icons, most UI interactions
 *    - LG (24px): Navigation, modal headers, primary page actions
 *    - XL (32px): Placeholders, feature highlights, empty states
 *    - XXL (48px): Hero sections, large empty states, onboarding
 * 
 * 4. TOOLTIP BEST PRACTICES:
 *    Use the Tooltip component for:
 *    ✅ Icon-only buttons (always provide context)
 *    ✅ Complex actions that need clarification
 *    ✅ Keyboard shortcuts or additional info
 *    ✅ Status indicators with detailed explanations
 *    
 *    DON'T use tooltips for:
 *    ❌ Buttons with clear text labels
 *    ❌ Self-explanatory actions
 *    ❌ Mobile interfaces (poor UX)
 * 
 * 5. BUTTON ICON PATTERNS:
 *    
 *    // Icon-only button with tooltip
 *    <Tooltip content="Save changes">
 *      <button className="group p-2 rounded-md bg-blue-100 text-blue-700 hover:bg-blue-200">
 *        <FloppyDiskIcon 
 *          size={ICON_CONTEXTS.UI.BUTTON} 
 *          weight={ICON_WEIGHTS.FILL} 
 *          className="group-hover:animate-wiggle" 
 *        />
 *      </button>
 *    </Tooltip>
 *    
 *    // Button with text and icon (no tooltip needed)
 *    <button className="group flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
 *      <PlusIcon 
 *        size={ICON_CONTEXTS.UI.BUTTON} 
 *        weight={ICON_WEIGHTS.FILL} 
 *        className="group-hover:animate-wiggle" 
 *      />
 *      Add Item
 *    </button>
 * 
 * 6. ANIMATION GUIDELINES:
 *    - Add 'group' class to button/container
 *    - Add 'group-hover:animate-wiggle' to icons for subtle feedback
 *    - Use 'animate-spin' for loading states
 *    - Keep animations subtle and purposeful
 * 
 * 7. ACCESSIBILITY:
 *    - Always provide aria-label for icon-only buttons
 *    - Use tooltips to supplement, not replace, accessibility labels
 *    - Ensure sufficient color contrast for icon visibility
 *    - Test with screen readers
 */

export const ICON_SIZES = {
  // Primary icon sizes
  XS: 12,    // Extra small icons (e.g., carets, indicators)
  SM: 16,    // Small icons (e.g., inline text icons)
  MD: 20,    // Medium icons (default for most UI elements)
  LG: 24,    // Large icons (e.g., primary actions, headers)
  XL: 32,    // Extra large icons (e.g., placeholders, hero elements)
  XXL: 48,   // Extra extra large icons (e.g., large placeholders)
} as const;

export const ICON_WEIGHTS = {
  THIN: 'thin',
  LIGHT: 'light',
  REGULAR: 'regular',
  BOLD: 'bold',
  FILL: 'fill',
  DUOTONE: 'duotone',
} as const;

// Semantic sizing for different contexts
export const ICON_CONTEXTS = {
  // BookHeader component specific sizes
  BOOK_HEADER: {
    COVER_PLACEHOLDER: ICON_SIZES.XL,     // 32px for book cover placeholders
    METADATA: ICON_SIZES.MD,              // 20px for quick stats (calendar, pages, etc.)
    INDICATORS: ICON_SIZES.XS,            // 12px for dropdown carets and small indicators
  },
  
  // Settings page sizes
  SETTINGS: {
    DEFAULT: ICON_SIZES.MD,               // 20px for all settings icons
    BUTTONS: ICON_SIZES.MD,               // 20px for button icons
  },
  
  // General UI contexts
  UI: {
    BUTTON: ICON_SIZES.MD,                // 20px for button icons
    INPUT: ICON_SIZES.SM,                 // 16px for input field icons
    NAVBAR: ICON_SIZES.LG,                // 24px for navigation icons
    MODAL_HEADER: ICON_SIZES.LG,          // 24px for modal headers
    TABLE: ICON_SIZES.SM,                 // 16px for table icons
    NOTIFICATION: ICON_SIZES.MD,          // 20px for toast/notification icons
  },
  
  // Status and feedback icons
  STATUS: {
    DEFAULT: ICON_SIZES.MD,               // 20px for status indicators
    LARGE: ICON_SIZES.LG,                 // 24px for prominent status displays
  },
} as const;

// Default icon properties
export const DEFAULT_ICON_PROPS = {
  size: ICON_SIZES.MD,
  weight: ICON_WEIGHTS.FILL,
} as const;

// Type definitions for better TypeScript support
export type IconSize = typeof ICON_SIZES[keyof typeof ICON_SIZES];
export type IconWeight = typeof ICON_WEIGHTS[keyof typeof ICON_WEIGHTS];
export type IconContext = keyof typeof ICON_CONTEXTS; 