import { Colors } from './colors';

export const Theme = {
  spacing: {
    xs:  4,
    sm:  8,
    md:  16,
    lg:  24,
    xl:  32,
    xxl: 48,
  },

  radius: {
    sm:   10,
    md:   16,
    lg:   24,
    xl:   32,
    full: 999,
  },

  shadow: {
    sm: {
      shadowColor: '#4A3F35',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.06,
      shadowRadius: 4,
      elevation: 2,
    },
    md: {
      shadowColor: '#4A3F35',
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: 0.09,
      shadowRadius: 8,
      elevation: 4,
    },
    lg: {
      shadowColor: '#4A3F35',
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.12,
      shadowRadius: 16,
      elevation: 8,
    },
  },

  card: {
    backgroundColor: Colors.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
  },

  buttonPrimary: {
    backgroundColor: Colors.green700,
    borderRadius: 14,
    height: 50,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  buttonSecondary: {
    backgroundColor: Colors.card,
    borderRadius: 14,
    height: 50,
    borderWidth: 1,
    borderColor: Colors.stone,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  buttonDanger: {
    backgroundColor: Colors.errorBg,
    borderRadius: 14,
    height: 50,
    borderWidth: 1,
    borderColor: Colors.error,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },

  input: {
    backgroundColor: Colors.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.stone,
    height: 50,
    paddingHorizontal: 16,
    fontFamily: 'DMSans_400Regular',
    fontSize: 15,
    color: Colors.textPrimary,
  },
} as const;
