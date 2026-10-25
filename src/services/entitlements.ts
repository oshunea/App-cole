import AsyncStorage from '@react-native-async-storage/async-storage';
import type { OptionKey } from '../engine/types';

const KEY = 'spaceopti.entitlements.v1';
const PASS_48H = 48 * 3600 * 1000;
const MONTH = 30 * 24 * 3600 * 1000;

export type Plan = 'pass48h' | 'monthly';

interface State {
  freeOptionAUsed: boolean;
  premiumUntil: number;
}

const EMPTY: State = { freeOptionAUsed: false, premiumUntil: 0 };

export async function load(): Promise<State> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    return raw ? { ...EMPTY, ...JSON.parse(raw) } : EMPTY;
  } catch {
    return EMPTY;
  }
}

const save = (s: State) => AsyncStorage.setItem(KEY, JSON.stringify(s));

export const isPremium = (s: State, now = Date.now()) => s.premiumUntil > now;

/** Freemium : A gratuite une fois ; B, C et le rendu 3D/vidéo exigent Premium. */
export function canUse(s: State, option: OptionKey, now = Date.now()): boolean {
  if (isPremium(s, now)) return true;
  return option === 'A' && !s.freeOptionAUsed;
}

export async function consume(s: State, option: OptionKey): Promise<State> {
  const next = option === 'A' && !isPremium(s) ? { ...s, freeOptionAUsed: true } : s;
  await save(next);
  return next;
}

/**
 * Point d'intégration achat : brancher RevenueCat / StoreKit / Play Billing ici.
 * Le MVP active simplement la durée correspondante, sans paiement.
 */
export async function purchase(s: State, plan: Plan, now = Date.now()): Promise<State> {
  const base = Math.max(now, s.premiumUntil);
  const next = { ...s, premiumUntil: base + (plan === 'pass48h' ? PASS_48H : MONTH) };
  await save(next);
  return next;
}

export type { State as Entitlements };
