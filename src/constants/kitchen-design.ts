export const KitchenDesign = {
  colors: {
    ink: '#173529',
    cream: '#FFF9F1',
    porcelain: '#FFFCF7',
    linen: '#F4EADF',
    muted: '#756E67',
    border: '#DDD0C3',
    orange: '#D97908',
    orangePressed: '#BE6404',
    sage: '#7E946D',
    danger: '#C8102E',
  },
  radius: {
    card: 18,
    sheet: 32,
    button: 12,
    pill: 999,
  },
  spacing: {
    xs: 6,
    sm: 10,
    md: 16,
    lg: 24,
    xl: 32,
    xxl: 48,
  },
  type: {
    hero: 42,
    title: 30,
    section: 22,
    body: 16,
    caption: 13,
  },
} as const;

export const KitchenAssets = {
  welcomeHero: require('../../assets/recipee screens/2.png'),
  countertopSplash: require('../../assets/recipee screens/1.png'),
} as const;
