import React, { useRef, useState } from 'react';
import { Image, PanResponder, StyleSheet, Text, View } from 'react-native';

interface Props {
  before: string;
  after: string;
  height?: number;
}

/** Curseur interactif Avant / Après : l'image « avant » est révélée à gauche de la poignée. */
export function BeforeAfterSlider({ before, after, height = 340 }: Props) {
  const [width, setWidth] = useState(0);
  const [ratio, setRatio] = useState(0.5);
  const widthRef = useRef(0);
  const startRatio = useRef(0.5);

  const pan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (e) => {
        const r = clamp(e.nativeEvent.locationX / (widthRef.current || 1));
        startRatio.current = r;
        setRatio(r);
      },
      onPanResponderMove: (_, g) => setRatio(clamp(startRatio.current + g.dx / (widthRef.current || 1))),
    }),
  ).current;

  return (
    <View
      style={[styles.box, { height }]}
      onLayout={(e) => {
        widthRef.current = e.nativeEvent.layout.width;
        setWidth(e.nativeEvent.layout.width);
      }}
      {...pan.panHandlers}
    >
      <Image source={{ uri: after }} style={styles.img} resizeMode="cover" />
      <View style={[styles.clip, { width: width * ratio }]}>
        <Image source={{ uri: before }} style={{ width, height }} resizeMode="cover" />
      </View>
      <View style={[styles.handle, { left: width * ratio - 1 }]}>
        <View style={styles.knob}>
          <Text style={styles.knobText}>⇆</Text>
        </View>
      </View>
      <Text style={[styles.tag, { left: 10 }]}>AVANT</Text>
      <Text style={[styles.tag, { right: 10 }]}>APRÈS</Text>
    </View>
  );
}

const clamp = (n: number) => Math.min(1, Math.max(0, n));

const styles = StyleSheet.create({
  box: { width: '100%', borderRadius: 16, overflow: 'hidden', backgroundColor: '#E5E7EB' },
  img: { ...StyleSheet.absoluteFillObject },
  clip: { position: 'absolute', left: 0, top: 0, bottom: 0, overflow: 'hidden' },
  handle: { position: 'absolute', top: 0, bottom: 0, width: 2, backgroundColor: '#fff', justifyContent: 'center' },
  knob: { position: 'absolute', left: -17, width: 36, height: 36, borderRadius: 18, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', elevation: 3 },
  knobText: { fontSize: 18, color: '#111827' },
  tag: { position: 'absolute', top: 10, backgroundColor: 'rgba(17,24,39,0.7)', color: '#fff', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, fontSize: 11, fontWeight: '700', overflow: 'hidden' },
});
