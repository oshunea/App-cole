import { StatusBar } from 'expo-status-bar';
import * as ImagePicker from 'expo-image-picker';
import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Image, Platform, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';
import { insertStock, reorganize, suggestStorage } from './src/engine/layout';
import type { LayoutResult, OptionKey, Room } from './src/engine/types';
import { ResultScreen } from './src/screens/ResultScreen';
import * as ent from './src/services/entitlements';
import { createVision } from './src/services/vision';
import { colors, ui } from './src/theme';

type Step =
  | { name: 'capture' }
  | { name: 'options' }
  | { name: 'working'; label: string }
  | { name: 'paywall'; option: OptionKey }
  | { name: 'result'; result: LayoutResult; afterUri: string };

const OPTIONS: { key: OptionKey; title: string; sub: string; badge: string }[] = [
  { key: 'A', title: "Réorganiser avec l'existant", sub: '0 € d\'achat · déplace uniquement vos meubles', badge: '1 essai gratuit' },
  { key: 'B', title: 'Intégrer mes meubles en stock', sub: 'Photographiez un meuble de la cave ou du garage', badge: 'Premium' },
  { key: 'C', title: 'Meubles gain de place', sub: 'Repère les angles morts et suggère un rangement', badge: 'Premium' },
];

/** Alert.alert n'existe pas sur le web. */
function notify(title: string, message: string) {
  if (Platform.OS === 'web') window.alert(`${title}\n${message}`);
  else Alert.alert(title, message);
}

export default function App() {
  const vision = useMemo(createVision, []);
  const [step, setStep] = useState<Step>({ name: 'capture' });
  const [media, setMedia] = useState<{ uri: string; video: boolean } | null>(null);
  const [room, setRoom] = useState<Room | null>(null);
  const [rights, setRights] = useState<ent.Entitlements>({ freeOptionAUsed: false, premiumUntil: 0 });

  useEffect(() => {
    ent.load().then(setRights);
  }, []);

  async function capture(source: 'camera' | 'library') {
    const opts: ImagePicker.ImagePickerOptions = { mediaTypes: ['images', 'videos'], videoMaxDuration: 15, quality: 0.8 };
    // Sur le web, le navigateur gère l'accès via un sélecteur de fichier (la caméra mobile est proposée par le système).
    if (Platform.OS !== 'web') {
      const perm = source === 'camera' ? await ImagePicker.requestCameraPermissionsAsync() : await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) return notify('Autorisation requise', "Autorisez l'accès pour analyser votre pièce.");
    }
    const useCamera = source === 'camera' && Platform.OS !== 'web';
    const res = useCamera ? await ImagePicker.launchCameraAsync(opts) : await ImagePicker.launchImageLibraryAsync(opts);
    if (res.canceled) return;
    const asset = res.assets[0];
    const video = asset.type === 'video';
    setMedia({ uri: asset.uri, video });
    setStep({ name: 'working', label: 'Analyse de la pièce…' });
    try {
      setRoom(await vision.analyzeRoom(asset.uri, video));
      setStep({ name: 'options' });
    } catch (e) {
      fail(e);
      setStep({ name: 'capture' });
    }
  }

  function fail(e: unknown) {
    notify('Oups', e instanceof Error ? e.message : 'Une erreur est survenue.');
  }

  async function run(option: OptionKey, current = rights) {
    if (!room || !media) return;
    if (!ent.canUse(current, option)) return setStep({ name: 'paywall', option });

    try {
      let result: LayoutResult;
      if (option === 'B') {
        const pick = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.8 });
        if (pick.canceled) return;
        setStep({ name: 'working', label: 'Détourage du meuble…' });
        result = insertStock(room, await vision.analyzeStockItem(pick.assets[0].uri));
      } else {
        setStep({ name: 'working', label: 'Calcul du nouvel agencement…' });
        // Laisse l'indicateur s'afficher avant le calcul synchrone.
        await new Promise((r) => setTimeout(r, 30));
        result = option === 'A' ? reorganize(room) : suggestStorage(room);
      }
      setStep({ name: 'working', label: 'Génération du rendu…' });
      const afterUri = await vision.renderAfter(media.uri, room, result.room);
      setRights(await ent.consume(current, option));
      setStep({ name: 'result', result, afterUri });
    } catch (e) {
      fail(e);
      setStep({ name: 'options' });
    }
  }

  async function buy(plan: ent.Plan) {
    const next = await ent.purchase(rights, plan);
    setRights(next);
    if (step.name === 'paywall') run(step.option, next);
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <StatusBar style="dark" />
      {step.name === 'capture' && (
        <ScrollView contentContainerStyle={[ui.screen, { justifyContent: 'center' }]}>
          <Text style={ui.title}>SpaceOpti AI</Text>
          <Text style={ui.sub}>Prenez une photo ou filmez 10 à 15 secondes de votre pièce : on vous propose un agencement qui gagne de la place.</Text>
          <Pressable style={ui.primary} onPress={() => capture(Platform.OS === 'web' ? 'library' : 'camera')} accessibilityRole="button">
            <Text style={ui.primaryText}>{Platform.OS === 'web' ? '📷  Importer une photo ou vidéo' : '📷  Scanner ma pièce'}</Text>
          </Pressable>
          {Platform.OS !== 'web' && (
            <Pressable style={ui.secondary} onPress={() => capture('library')} accessibilityRole="button">
              <Text style={ui.secondaryText}>Choisir depuis la galerie</Text>
            </Pressable>
          )}
        </ScrollView>
      )}

      {step.name === 'options' && media && room && (
        <ScrollView contentContainerStyle={ui.screen}>
          <Image source={{ uri: media.uri }} style={styles.thumb} />
          <Text style={ui.sub}>{room.furniture.length} meubles détectés · {(room.width * room.depth / 10000).toFixed(1)} m²</Text>
          {OPTIONS.map((o) => (
            <Pressable key={o.key} style={styles.option} onPress={() => run(o.key)} accessibilityRole="button">
              <View style={{ flex: 1 }}>
                <Text style={styles.optionTitle}>{o.key}. {o.title}</Text>
                <Text style={styles.optionSub}>{o.sub}</Text>
              </View>
              <Text style={[styles.badge, ent.canUse(rights, o.key) && styles.badgeFree]}>
                {ent.isPremium(rights) ? 'Inclus' : o.key === 'A' && rights.freeOptionAUsed ? 'Premium' : o.badge}
              </Text>
            </Pressable>
          ))}
          <Pressable style={ui.secondary} onPress={() => setStep({ name: 'capture' })}>
            <Text style={ui.secondaryText}>Reprendre une photo</Text>
          </Pressable>
        </ScrollView>
      )}

      {step.name === 'working' && (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[ui.sub, { marginTop: 16 }]}>{step.label}</Text>
        </View>
      )}

      {step.name === 'paywall' && (
        <ScrollView contentContainerStyle={[ui.screen, { justifyContent: 'center' }]}>
          <Text style={ui.title}>Passez Premium</Text>
          <Text style={ui.sub}>Intégration de vos meubles, suggestions gain de place, rendu 3D/vidéo : débloquez tout.</Text>
          <Pressable style={ui.primary} onPress={() => buy('pass48h')}>
            <Text style={ui.primaryText}>Pass 48 h</Text>
          </Pressable>
          <Pressable style={ui.primary} onPress={() => buy('monthly')}>
            <Text style={ui.primaryText}>Abonnement mensuel</Text>
          </Pressable>
          <Pressable style={ui.secondary} onPress={() => setStep({ name: 'options' })}>
            <Text style={ui.secondaryText}>Plus tard</Text>
          </Pressable>
        </ScrollView>
      )}

      {step.name === 'result' && media && (
        <ResultScreen result={step.result} beforeUri={media.uri} afterUri={step.afterUri} onBack={() => setStep({ name: 'options' })} />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  thumb: { width: '100%', height: 200, borderRadius: 16, backgroundColor: '#E5E7EB' },
  option: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#fff', borderRadius: 18, padding: 20, minHeight: 92 },
  optionTitle: { fontSize: 17, fontWeight: '700', color: colors.ink },
  optionSub: { color: colors.muted, marginTop: 4 },
  badge: { fontSize: 12, fontWeight: '700', color: '#92400E', backgroundColor: '#FEF3C7', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, overflow: 'hidden' },
  badgeFree: { color: '#065F46', backgroundColor: '#D1FAE5' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
