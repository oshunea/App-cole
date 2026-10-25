import { StyleSheet } from 'react-native';

export const colors = { primary: '#0F766E', ink: '#111827', muted: '#6B7280', bg: '#F3F4F6' };

export const ui = StyleSheet.create({
  screen: { padding: 16, gap: 16, backgroundColor: colors.bg, flexGrow: 1, width: '100%', maxWidth: 560, alignSelf: 'center' },
  primary: { backgroundColor: colors.primary, borderRadius: 16, paddingVertical: 18, alignItems: 'center' },
  primaryText: { color: '#fff', fontSize: 17, fontWeight: '700' },
  secondary: { borderRadius: 16, paddingVertical: 14, alignItems: 'center', borderWidth: 1, borderColor: colors.muted },
  secondaryText: { color: colors.ink, fontWeight: '600' },
  title: { fontSize: 26, fontWeight: '800', color: colors.ink },
  sub: { color: colors.muted, fontSize: 15, lineHeight: 21 },
});
