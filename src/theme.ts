import { MD3LightTheme } from 'react-native-paper';

export const COLORS = {
  background: '#F4F5F0',
  primary: '#172B4D',
  accent: '#E67E22',
  surface: '#FFFFFF',
  textSecondary: '#6B778C',
  border: '#DFE1E6',
  divider: '#EBECF0',
};

export const theme = {
  ...MD3LightTheme,
  colors: {
    ...MD3LightTheme.colors,
    primary: COLORS.primary,
    background: COLORS.background,
    surface: COLORS.surface,
    outline: COLORS.border,
    elevation: {
      ...MD3LightTheme.colors.elevation,
      level1: COLORS.surface,
    },
  },
};
