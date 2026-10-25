# SpaceOpti AI

Application mobile (Expo / React Native, iOS + Android) d'optimisation d'espace : photo ou vidéo de 15 s d'une pièce, puis 3 options d'agencement, rendu Avant/Après et plan 2D coté.

## Lancer

```bash
npm install
npx expo start      # Expo Go ou émulateur
npm test            # moteur d'agencement
npm run typecheck
```

## Architecture

| Dossier | Rôle |
|---|---|
| `src/engine` | Moteur pur (sans dépendance native) : géométrie en cm, mesure de circulation (grille 10 cm, chemin le plus large depuis la porte), options A/B/C, liens d'affiliation. Testé dans `test/`. |
| `src/services/vision.ts` | Interface `VisionService` : analyse de pièce, détourage d'un meuble, rendu « après ». `DemoVision` (local) par défaut, `HttpVision` si `EXPO_PUBLIC_API_URL` est défini. |
| `src/services/entitlements.ts` | Freemium : option A gratuite une fois ; B, C et rendu réservés au Premium (Pass 48 h / mensuel). |
| `src/components` | `BeforeAfterSlider`, `FloorPlan` (SVG). |

## Ce qui est réel / ce qui est simulé dans ce MVP

- **Réel** : algorithme de réagencement (murs, porte dégagée, fenêtres non masquées, passage ≥ 75 cm), calcul du gain en m², plan 2D, curseur Avant/Après, freemium, liens affiliés. Chaque option s'exécute en ~1 s (cible < 15 s).
- **Simulé** (`DemoVision`) : détection des meubles/dimensions (pièce de démo) et rendu « après » (renvoie la photo source). Pour la production, implémenter le serveur décrit dans `vision.ts` : segmentation (SAM), dimensions (RoomPlan/ARKit ou depth), inpainting + rendu photoréaliste.
- **À brancher** : achats intégrés (`purchase` dans `entitlements.ts` → RevenueCat/StoreKit/Play Billing) ; vérification serveur des droits ; identifiants d'affiliation réels (`affiliateUrl`).
