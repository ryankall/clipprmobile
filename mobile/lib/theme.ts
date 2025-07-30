import {StyleSheet} from 'react-native';
/**
 * Centralized theme for mobile app (messages/invoice palette)
 */
export const colors = {
  // Backgrounds
  background: '#0F0F0F',
  backgroundAlt: '#18181B',
  backgroundCard: '#1A1A1A',
  backgroundCardAlt: '#23232A',
  backgroundCharcoal: '#1e1e1e',
  backgroundDarkCard: '#2e2e2e',
  backgroundOverlay: 'rgba(15,15,15,0.96)',
  backgroundOverlayAlt: 'rgba(0,0,0,0.7)',

  // Highlight
  highlightOnCard: '#2e2d2dff',

  // Text
  text: '#FFFFFF',
  textSecondary: '#9CA3AF',
  textSteel: '#737b89',
  textCharcoal: '#1e1e1e',

  // Accent/Primary
  gold: '#F59E0B',
  goldLight: '#F59E0B22',
  green: '#22C55E',
  blue: '#3B82F6',
  red: '#EF4444',
  purple: '#A78BFA',
  yellow: '#FFD700',
  black: '#0F0F0F',
  white: '#FFFFFF',

  // Borders
  border: '#37415133',
  borderStrong: '#37415155',
  borderCard: '#232323',
  borderSteel: '#737b89',

  // Misc
  shadow: '#000',
};

export const theme = StyleSheet.create({

  card: {
    backgroundColor: colors.backgroundCard,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.borderCard,
    marginBottom: 20,
    elevation: 2,
  },
   cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: 0.1,
    marginBottom: 2,
  },
  // Tabs
  tabContent: {
    flex: 1,
    padding: 16,
  },
  tabContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 16,
    paddingTop: 16,
    gap: 8,
  },
  tabButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: colors.backgroundAlt,
    gap: 6,
    flex: 1,
    minWidth: '30%',
  },
  activeTab: {
    backgroundColor: colors.gold,
  },
  tabText: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.textSteel,
  },
  activeTabText: {
    color: colors.textCharcoal,
  },
  clientCard: {
    backgroundColor: '#18181B', // match web dark-card
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#37415155', // subtle steel
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
});
