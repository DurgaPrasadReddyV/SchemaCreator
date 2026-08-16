/**
 * Theme tokens. AntD + RF share a single visual system via CSS variables.
 *
 * Classification = blue ordinal ramp (darker = more sensitive)
 * Reachability = aqua
 * Brand = violet
 * Status palette reserved for actual state only.
 */

import type { ThemeConfig } from 'antd';
import { theme as antdTheme } from 'antd';
import type { Classification } from '@/domain/types';

export const CLASSIFICATION_COLORS = {
  light: {
    public: '#86b6ef',
    internal: '#3987e5',
    confidential: '#1c5cab',
    restricted: '#0d366b',
  },
  dark: {
    public: '#6da7ec',
    internal: '#3987e5',
    confidential: '#256abf',
    restricted: '#184f95',
  },
} as const;

export const REACHABILITY = {
  light: '#1baf7a',
  dark: '#199e70',
} as const;

/** Flood accent — the contains-subtree reached via an `accesses` flood.
 *  Distinct from aqua reachability and the blue classification ramp so a
 *  flood edge reads as "lit because flooded," not "lit because reachable"
 *  or "lit because sensitive." Amber. */
export const FLOOD = {
  light: '#d98a2b',
  dark: '#e0a44a',
} as const;

export const BRAND = {
  light: '#4a3aa7',
  dark: '#9085e9',
} as const;

export const STATUS = {
  good: '#0ca30c',
  warning: '#fab219',
  serious: '#ec835a',
  critical: '#d03b3b',
} as const;

export const CSS_VARS = {
  bg: '--twin-bg',
  surface: '--twin-surface',
  border: '--twin-border',
  text: '--twin-text',
  textMuted: '--twin-text-muted',
  edge: '--twin-edge',
  edgeDashed: '--twin-edge-dashed',
  nodeBg: '--twin-node-bg',
  classificationPublic: '--twin-classification-public',
  classificationInternal: '--twin-classification-internal',
  classificationConfidential: '--twin-classification-confidential',
  classificationRestricted: '--twin-classification-restricted',
  reachability: '--twin-reachability',
  flood: '--twin-flood',
  brand: '--twin-brand',
  statusGood: '--twin-status-good',
  statusWarning: '--twin-status-warning',
  statusSerious: '--twin-status-serious',
  statusCritical: '--twin-status-critical',
} as const;

export const lightTheme: ThemeConfig = {
  algorithm: antdTheme.defaultAlgorithm,
  cssVar: true,
  hashed: false,
  token: {
    colorPrimary: BRAND.light,
    colorBgBase: '#fafafa',
    colorBgContainer: '#ffffff',
    colorBorder: '#d9d9d9',
    colorText: '#1f1f1f',
    fontFamily:
      'system-ui, -apple-system, "Segoe UI", sans-serif',
  },
};

export const darkTheme: ThemeConfig = {
  algorithm: antdTheme.darkAlgorithm,
  cssVar: true,
  hashed: false,
  token: {
    colorPrimary: BRAND.dark,
    colorBgBase: '#0e1014',
    colorBgContainer: '#15181f',
    colorBorder: '#2a2f3a',
    colorText: '#e5e7eb',
    fontFamily:
      'system-ui, -apple-system, "Segoe UI", sans-serif',
  },
};

export function cssVarValues(theme: 'light' | 'dark') {
  const cls = CLASSIFICATION_COLORS[theme];
  return {
    [CSS_VARS.bg]: theme === 'light' ? '#fafafa' : '#0e1014',
    [CSS_VARS.surface]: theme === 'light' ? '#ffffff' : '#15181f',
    [CSS_VARS.border]: theme === 'light' ? '#d9d9d9' : '#2a2f3a',
    [CSS_VARS.text]: theme === 'light' ? '#1f1f1f' : '#e5e7eb',
    [CSS_VARS.textMuted]: theme === 'light' ? '#6b7280' : '#9ca3af',
    [CSS_VARS.edge]: theme === 'light' ? '#94a3b8' : '#475569',
    [CSS_VARS.edgeDashed]: theme === 'light' ? '#cbd5e1' : '#334155',
    [CSS_VARS.nodeBg]: theme === 'light' ? '#ffffff' : '#1a1f2a',
    [CSS_VARS.classificationPublic]: cls.public,
    [CSS_VARS.classificationInternal]: cls.internal,
    [CSS_VARS.classificationConfidential]: cls.confidential,
    [CSS_VARS.classificationRestricted]: cls.restricted,
    [CSS_VARS.reachability]: REACHABILITY[theme],
    [CSS_VARS.flood]: FLOOD[theme],
    [CSS_VARS.brand]: BRAND[theme],
    [CSS_VARS.statusGood]: STATUS.good,
    [CSS_VARS.statusWarning]: STATUS.warning,
    [CSS_VARS.statusSerious]: STATUS.serious,
    [CSS_VARS.statusCritical]: STATUS.critical,
  } as Record<string, string>;
}

export function classificationVar(c: Classification | undefined | null): string {
  if (!c) return 'transparent';
  const key = ('classification' + c.charAt(0).toUpperCase() + c.slice(1)) as keyof typeof CSS_VARS;
  return `var(${CSS_VARS[key]})`;
}
