import React, { useState } from 'react';
import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { BeforeAfterSlider } from '../components/BeforeAfterSlider';
import { FloorPlan } from '../components/FloorPlan';
import { affiliateUrl } from '../engine/layout';
import type { LayoutResult } from '../engine/types';
import { colors, ui } from '../theme';

interface Props {
  result: LayoutResult;
  beforeUri: string;
  afterUri: string;
  onBack: () => void;
}

type Tab = 'render' | 'plan';

export function ResultScreen({ result, beforeUri, afterUri, onBack }: Props) {
  const [tab, setTab] = useState<Tab>('render');
  const s = result.suggestion;
  const highlight = s ? `sugg-${s.id}` : undefined;

  return (
    <ScrollView contentContainerStyle={ui.screen}>
      <View style={styles.tabs}>
        {(['render', 'plan'] as const).map((t) => (
          <Pressable key={t} onPress={() => setTab(t)} style={[styles.tab, tab === t && styles.tabOn]} accessibilityRole="tab">
            <Text style={[styles.tabText, tab === t && styles.tabTextOn]}>{t === 'render' ? 'Rendu Avant / Après' : 'Plan 2D'}</Text>
          </Pressable>
        ))}
      </View>

      {tab === 'render' ? (
        <BeforeAfterSlider before={beforeUri} after={afterUri} />
      ) : (
        <FloorPlan room={result.room} metrics={result.after} gainM2={result.gainM2} highlightId={highlight} />
      )}

      <View style={styles.stats}>
        <Stat label="Gain de surface" value={`${result.gainM2 >= 0 ? '+' : ''}${result.gainM2} m²`} />
        <Stat label="Passage" value={`${result.before.passageCm} → ${result.after.passageCm} cm`} />
      </View>

      {result.moved.length > 0 && <Text style={styles.note}>Déplacé : {result.moved.join(', ')}.</Text>}
      {result.notes.map((n) => (
        <Text key={n} style={styles.note}>{n}</Text>
      ))}

      {s && (
        <Pressable style={styles.product} onPress={() => Linking.openURL(affiliateUrl(s))} accessibilityRole="link">
          <View style={{ flex: 1 }}>
            <Text style={styles.productTitle}>{s.label}</Text>
            <Text style={styles.productMeta}>{s.w}×{s.d}×{s.h} cm · {s.storage} L · {s.price} € · {s.retailer}</Text>
          </View>
          <Text style={styles.productCta}>Voir ›</Text>
        </Pressable>
      )}
      {s && <Text style={styles.disclosure}>Lien d'affiliation : nous pouvons percevoir une commission, sans surcoût pour vous.</Text>}

      <Pressable onPress={onBack} style={ui.secondary}>
        <Text style={ui.secondaryText}>Essayer une autre option</Text>
      </Pressable>
    </ScrollView>
  );
}

const Stat = ({ label, value }: { label: string; value: string }) => (
  <View style={styles.stat}>
    <Text style={styles.statValue}>{value}</Text>
    <Text style={styles.statLabel}>{label}</Text>
  </View>
);

const styles = StyleSheet.create({
  tabs: { flexDirection: 'row', backgroundColor: '#E5E7EB', borderRadius: 12, padding: 4 },
  tab: { flex: 1, paddingVertical: 10, borderRadius: 9, alignItems: 'center' },
  tabOn: { backgroundColor: '#fff' },
  tabText: { color: colors.muted, fontWeight: '600' },
  tabTextOn: { color: colors.ink },
  stats: { flexDirection: 'row', gap: 12 },
  stat: { flex: 1, backgroundColor: '#fff', borderRadius: 14, padding: 14 },
  statValue: { fontSize: 20, fontWeight: '800', color: colors.primary },
  statLabel: { color: colors.muted, marginTop: 2 },
  note: { color: colors.ink, lineHeight: 20 },
  product: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 14, padding: 14, borderWidth: 1, borderColor: colors.primary },
  productTitle: { fontWeight: '700', fontSize: 16, color: colors.ink },
  productMeta: { color: colors.muted, marginTop: 2 },
  productCta: { color: colors.primary, fontWeight: '800' },
  disclosure: { color: colors.muted, fontSize: 12 },
});
