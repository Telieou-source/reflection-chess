import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import colors from '@/constants/colors';
import {
  GRID_THEMES,
  LASER_COLORS,
  MUSIC_TRACKS,
  useCosmetics,
  type GridTheme,
  type GridThemeDef,
  type LaserColorDef,
  type LaserColorId,
  type MusicTrackDef,
  type MusicTrackId,
} from '@/context/CosmeticsContext';
import { useGame } from '@/context/GameContext';
import type { Inventory, ShopItem } from '@/types/game';

const c = colors.light;

const SHOP_ITEMS: ShopItem[] = [
  {
    id: 'mirror',
    name: 'Extra Mirror',
    description: 'Adds one extra mirror placement to your current level. Use it when you\'ve run out of moves and need one more reflection. Tap the +Mirror button in the tool bar during a level.',
    cost: 6,
    icon: '/',
  },
  {
    id: 'splitter',
    name: 'Beam Splitter',
    description: 'Place on the board to split the beam into two paths simultaneously. Both the reflected and straight-through beams remain active.',
    cost: 5,
    icon: '⋈',
  },
  {
    id: 'bomb',
    name: 'Disruptor Bomb',
    description: 'Destroys one absorber block on the board. Tap an absorber (✕) while the Bomb tool is selected to remove it permanently.',
    cost: 8,
    icon: '💥',
  },
  {
    id: 'fiber',
    name: 'Fiber Tunnel',
    description: 'Creates an underground connection between two cells. Tap to place an entry hole, then tap a second cell for the exit. The beam travels underground and re-emerges in the same direction.',
    cost: 12,
    icon: '〇',
  },
];

function FiberIcon({ active }: { active?: boolean }) {
  const color = active ? '#f97316' : c.mutedForeground;
  return (
    <View style={{ width: 30, height: 30, borderRadius: 15, borderWidth: 3, borderColor: color, alignItems: 'center', justifyContent: 'center' }}>
      <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: color }} />
    </View>
  );
}

function ItemCard({ item, owned, coins, onBuy }: { item: ShopItem; owned: number; coins: number; onBuy: () => void }) {
  const canAfford = coins >= item.cost;
  return (
    <View style={styles.itemCard}>
      <View style={styles.itemHeader}>
        <View style={styles.itemIconWrap}>
          {item.id === 'fiber' ? <FiberIcon active /> : <Text style={styles.itemIcon}>{item.icon}</Text>}
        </View>
        <View style={styles.itemInfo}>
          <Text style={styles.itemName}>{item.name}</Text>
          <View style={styles.itemMeta}>
            <Text style={styles.itemCost}>🪙 {item.cost} coins</Text>
            {owned > 0 && (
              <View style={styles.ownedBadge}>
                <Text style={styles.ownedText}>Owned: {owned}</Text>
              </View>
            )}
          </View>
        </View>
      </View>
      <Text style={styles.itemDesc}>{item.description}</Text>
      <TouchableOpacity
        style={[styles.buyBtn, !canAfford && styles.buyBtnDisabled]}
        onPress={onBuy}
        activeOpacity={canAfford ? 0.8 : 1}
        disabled={!canAfford}
      >
        <Feather name="shopping-bag" size={15} color={canAfford ? '#000' : c.mutedForeground} />
        <Text style={[styles.buyBtnText, !canAfford && styles.buyBtnTextDisabled]}>
          {canAfford ? `Buy for ${item.cost} coins` : `Need ${item.cost - coins} more coins`}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

function ColorCard({ def, active, owned, coins, onSelect, onBuy }: { def: LaserColorDef; active: boolean; owned: boolean; coins: number; onSelect: () => void; onBuy: () => void }) {
  const canAfford = coins >= def.cost;
  return (
    <TouchableOpacity
      style={[styles.colorCard, active && { borderColor: def.color, shadowColor: def.color, shadowOpacity: 0.35, shadowRadius: 8 }]}
      onPress={owned ? onSelect : undefined}
      activeOpacity={owned ? 0.75 : 1}
    >
      <View style={[styles.colorDot, { backgroundColor: def.color, shadowColor: def.color, shadowOpacity: 0.6, shadowRadius: 8 }]} />
      <Text style={styles.colorName}>{def.name}</Text>
      {active && (
        <View style={[styles.activePill, { backgroundColor: def.color }]}>
          <Text style={styles.activePillText}>Active</Text>
        </View>
      )}
      {!owned && (
        <TouchableOpacity
          style={[styles.cosmeticBuyBtn, !canAfford && styles.cosmeticBuyBtnOff]}
          onPress={onBuy}
          activeOpacity={canAfford ? 0.8 : 1}
          disabled={!canAfford}
        >
          <Text style={[styles.cosmeticBuyBtnText, !canAfford && styles.cosmeticBuyBtnTextOff]}>
            {canAfford ? `🪙 ${def.cost}` : `${def.cost} coins`}
          </Text>
        </TouchableOpacity>
      )}
      {owned && !active && (
        <View style={styles.ownedTag}>
          <Text style={styles.ownedTagText}>Tap to use</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

function ThemeCard({ def, active, owned, coins, onSelect, onBuy }: { def: GridThemeDef; active: boolean; owned: boolean; coins: number; onSelect: () => void; onBuy: () => void }) {
  const canAfford = coins >= def.cost;
  return (
    <TouchableOpacity
      style={[styles.themeCard, active && { borderColor: '#00d4ff', shadowColor: '#00d4ff', shadowOpacity: 0.3, shadowRadius: 8 }]}
      onPress={owned ? onSelect : undefined}
      activeOpacity={owned ? 0.75 : 1}
    >
      {/* Mini board preview */}
      <View style={{ width: '100%', height: 48, backgroundColor: def.background, borderRadius: 6, overflow: 'hidden', flexDirection: 'row', flexWrap: 'wrap', marginBottom: 8 }}>
        {Array.from({ length: 9 }).map((_, i) => (
          <View key={i} style={{ width: '33.33%', height: '33.33%', backgroundColor: def.cellEmpty, borderWidth: 0.5, borderColor: def.cellBorder }} />
        ))}
      </View>
      <Text style={styles.themeName}>{def.name}</Text>
      <Text style={styles.themeDesc}>{def.description}</Text>
      {active && (
        <View style={[styles.activePill, { backgroundColor: '#00d4ff', marginTop: 4 }]}>
          <Text style={styles.activePillText}>Active</Text>
        </View>
      )}
      {!owned && (
        <TouchableOpacity
          style={[styles.cosmeticBuyBtn, !canAfford && styles.cosmeticBuyBtnOff, { marginTop: 6 }]}
          onPress={onBuy}
          activeOpacity={canAfford ? 0.8 : 1}
          disabled={!canAfford}
        >
          <Text style={[styles.cosmeticBuyBtnText, !canAfford && styles.cosmeticBuyBtnTextOff]}>
            {canAfford ? `🪙 ${def.cost} — Unlock` : `Need ${def.cost - coins} more`}
          </Text>
        </TouchableOpacity>
      )}
      {owned && !active && (
        <View style={[styles.ownedTag, { marginTop: 4 }]}>
          <Text style={styles.ownedTagText}>Tap to use</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

function TrackRow({ def, active, owned, coins, onSelect, onBuy }: { def: MusicTrackDef; active: boolean; owned: boolean; coins: number; onSelect: () => void; onBuy: () => void }) {
  const canAfford = coins >= def.cost;
  return (
    <TouchableOpacity
      style={[styles.trackRow, active && { borderColor: 'rgba(0,212,255,0.4)', backgroundColor: 'rgba(0,212,255,0.04)' }]}
      onPress={owned ? onSelect : undefined}
      activeOpacity={owned ? 0.75 : 1}
    >
      <View style={styles.trackIcon}>
        <Feather name={def.id === 'silence' ? 'volume-x' : 'music'} size={18} color={active ? '#00d4ff' : c.mutedForeground} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[styles.trackName, active && { color: '#00d4ff' }]}>{def.name}</Text>
        <Text style={styles.trackDesc}>{def.description}</Text>
      </View>
      {active && (
        <View style={[styles.activePill, { backgroundColor: '#00d4ff' }]}>
          <Text style={styles.activePillText}>Playing</Text>
        </View>
      )}
      {!owned && (
        <TouchableOpacity
          style={[styles.cosmeticBuyBtn, !canAfford && styles.cosmeticBuyBtnOff]}
          onPress={onBuy}
          activeOpacity={canAfford ? 0.8 : 1}
          disabled={!canAfford}
        >
          <Text style={[styles.cosmeticBuyBtnText, !canAfford && styles.cosmeticBuyBtnTextOff]}>
            🪙 {def.cost}
          </Text>
        </TouchableOpacity>
      )}
      {owned && !active && (
        <View style={styles.ownedTag}>
          <Text style={styles.ownedTagText}>Select</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

export default function ShopScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { coins, inventory, purchaseItem, spendCoins } = useGame();
  const {
    cosmetics, isColorUnlocked, isThemeUnlocked, isTrackUnlocked,
    setActiveColor, setActiveTheme, setActiveTrack, toggleMusic, unlockCosmetic,
  } = useCosmetics();
  const [flash, setFlash] = useState<keyof Inventory | null>(null);

  const topPad = Platform.OS === 'web' ? 67 : insets.top;
  const botPad = Platform.OS === 'web' ? 34 : insets.bottom;

  function handleBuy(item: ShopItem) {
    const success = purchaseItem(item.id, item.cost);
    if (success) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setFlash(item.id);
      setTimeout(() => setFlash(null), 1200);
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
  }

  function handleBuyCosmetic(kind: 'color' | 'theme' | 'track', id: string, cost: number) {
    if (cost === 0) { unlockCosmetic(kind, id); return; }
    const ok = spendCoins(cost);
    if (ok) {
      unlockCosmetic(kind, id);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
  }

  return (
    <View style={[styles.container, { paddingTop: topPad, paddingBottom: botPad }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.headerBtn}>
          <Feather name="arrow-left" size={22} color={c.foreground} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Shop</Text>
          <Text style={styles.headerSub}>Upgrades & cosmetics</Text>
        </View>
        <View style={styles.headerBtn} />
      </View>

      <View style={styles.balanceBar}>
        <Text style={styles.balanceLabel}>Your balance</Text>
        <View style={styles.balanceChip}>
          <Text style={styles.balanceEmoji}>🪙</Text>
          <Text style={styles.balanceAmount}>{coins}</Text>
          <Text style={styles.balanceUnit}>coins</Text>
        </View>
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.itemList} showsVerticalScrollIndicator={false}>

        {/* ── Board Tools ── */}
        <Text style={styles.sectionTitle}>Board Tools</Text>
        <Text style={styles.sectionSubtitle}>
          Earn coins by completing levels with fewer mirrors than par. Also collect ✦ coins scattered on the board.
        </Text>
        {SHOP_ITEMS.map(item => (
          <View key={item.id} style={flash === item.id ? styles.flashWrap : undefined}>
            <ItemCard item={item} owned={inventory[item.id]} coins={coins} onBuy={() => handleBuy(item)} />
          </View>
        ))}

        <View style={styles.earnTip}>
          <Feather name="info" size={14} color={c.laser} />
          <Text style={styles.earnTipText}>
            Solve levels using fewer mirrors than par to earn bonus coins.{'\n'}
            At par: 1 coin · 1 under par: 2 coins · 2 under par: 3 coins, and so on.{'\n'}
            Golden ✦ collectibles on the board are earned when the beam passes through them.
          </Text>
        </View>

        <View style={styles.rulesTip}>
          <Feather name="alert-triangle" size={14} color="#ff6b00" />
          <Text style={styles.rulesTipText}>
            <Text style={{ color: '#00d4ff', fontFamily: 'Inter_600SemiBold' }}>Short circuit</Text>
            {' '}— if the beam crosses its own path, the puzzle resets.{'\n'}
            <Text style={{ color: '#ff6b00', fontFamily: 'Inter_600SemiBold' }}>Combustion</Text>
            {' '}— if the beam hits a forbidden absorber (✕), it explodes and resets.{'\n'}
            <Text style={{ color: '#f97316', fontFamily: 'Inter_600SemiBold' }}>Fiber tunnel</Text>
            {' '}— the beam travels underground between entry and exit holes.
          </Text>
        </View>

        {/* ── Laser Color ── */}
        <View style={styles.sectionDivider} />
        <Text style={styles.sectionTitle}>Laser Beam Color</Text>
        <Text style={styles.sectionSubtitle}>Customize the color of your laser beam.</Text>
        <View style={styles.colorRow}>
          {(Object.values(LASER_COLORS) as LaserColorDef[]).map(def => (
            <ColorCard
              key={def.id}
              def={def}
              active={cosmetics.activeColor === def.id}
              owned={isColorUnlocked(def.id as LaserColorId)}
              coins={coins}
              onSelect={() => setActiveColor(def.id as LaserColorId)}
              onBuy={() => handleBuyCosmetic('color', def.id, def.cost)}
            />
          ))}
        </View>

        {/* ── Grid Theme ── */}
        <View style={styles.sectionDivider} />
        <Text style={styles.sectionTitle}>Board Theme</Text>
        <Text style={styles.sectionSubtitle}>Change the visual style of the board.</Text>
        <View style={styles.themeGrid}>
          {(Object.values(GRID_THEMES) as GridThemeDef[]).map(def => (
            <ThemeCard
              key={def.id}
              def={def}
              active={cosmetics.activeTheme === def.id}
              owned={isThemeUnlocked(def.id as GridTheme)}
              coins={coins}
              onSelect={() => setActiveTheme(def.id as GridTheme)}
              onBuy={() => handleBuyCosmetic('theme', def.id, def.cost)}
            />
          ))}
        </View>

        {/* ── Background Music ── */}
        <View style={styles.sectionDivider} />
        <View style={styles.musicHeader}>
          <View style={{ flex: 1 }}>
            <Text style={styles.sectionTitle}>Background Music</Text>
            <Text style={styles.sectionSubtitle}>Relaxing music while you solve puzzles.</Text>
          </View>
          <View style={styles.musicToggle}>
            <Text style={styles.musicToggleLabel}>{cosmetics.musicEnabled ? 'On' : 'Off'}</Text>
            <Switch
              value={cosmetics.musicEnabled}
              onValueChange={toggleMusic}
              trackColor={{ false: c.muted, true: 'rgba(0,212,255,0.4)' }}
              thumbColor={cosmetics.musicEnabled ? '#00d4ff' : c.mutedForeground}
            />
          </View>
        </View>
        <View style={styles.trackList}>
          {(Object.values(MUSIC_TRACKS) as MusicTrackDef[]).map(def => (
            <TrackRow
              key={def.id}
              def={def}
              active={cosmetics.activeTrack === def.id}
              owned={isTrackUnlocked(def.id as MusicTrackId)}
              coins={coins}
              onSelect={() => setActiveTrack(def.id as MusicTrackId)}
              onBuy={() => handleBuyCosmetic('track', def.id, def.cost)}
            />
          ))}
        </View>

        <View style={{ height: 24 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: c.background },
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 8, paddingVertical: 10,
    borderBottomWidth: 1, borderBottomColor: c.border,
  },
  headerBtn: { padding: 6, width: 40 },
  headerCenter: { flex: 1, alignItems: 'center' },
  headerTitle: { fontSize: 17, fontFamily: 'Inter_600SemiBold', color: c.foreground },
  headerSub: { fontSize: 11, fontFamily: 'Inter_400Regular', color: c.mutedForeground },
  balanceBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: c.border,
    backgroundColor: c.card,
  },
  balanceLabel: { fontSize: 13, fontFamily: 'Inter_400Regular', color: c.mutedForeground },
  balanceChip: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: 'rgba(255,215,0,0.10)',
    borderWidth: 1, borderColor: 'rgba(255,215,0,0.3)',
    borderRadius: 20, paddingHorizontal: 14, paddingVertical: 6,
  },
  balanceEmoji: { fontSize: 18 },
  balanceAmount: { fontSize: 20, fontFamily: 'Inter_700Bold', color: '#FFD700' },
  balanceUnit: { fontSize: 13, fontFamily: 'Inter_400Regular', color: '#FFD700', opacity: 0.7 },
  itemList: { padding: 20, gap: 16 },
  sectionTitle: { fontSize: 16, fontFamily: 'Inter_700Bold', color: c.foreground, marginBottom: 2 },
  sectionSubtitle: { fontSize: 12, fontFamily: 'Inter_400Regular', color: c.mutedForeground, marginBottom: 8, lineHeight: 17 },
  sectionDivider: { height: 1, backgroundColor: c.border, marginVertical: 4 },
  itemCard: {
    backgroundColor: c.card, borderRadius: 16,
    borderWidth: 1, borderColor: c.border,
    padding: 16, gap: 10,
  },
  itemHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  itemIconWrap: {
    width: 52, height: 52, borderRadius: 14,
    backgroundColor: 'rgba(0,212,255,0.06)',
    borderWidth: 1, borderColor: c.border,
    alignItems: 'center', justifyContent: 'center',
  },
  itemIcon: { fontSize: 26 },
  itemInfo: { flex: 1, gap: 4 },
  itemName: { fontSize: 15, fontFamily: 'Inter_600SemiBold', color: c.foreground },
  itemMeta: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  itemCost: { fontSize: 13, fontFamily: 'Inter_500Medium', color: '#FFD700' },
  ownedBadge: {
    backgroundColor: 'rgba(0,212,255,0.1)', borderRadius: 8,
    paddingHorizontal: 7, paddingVertical: 2,
    borderWidth: 1, borderColor: 'rgba(0,212,255,0.2)',
  },
  ownedText: { fontSize: 11, fontFamily: 'Inter_500Medium', color: c.laser },
  itemDesc: { fontSize: 13, fontFamily: 'Inter_400Regular', color: c.mutedForeground, lineHeight: 18 },
  buyBtn: {
    backgroundColor: c.laser, borderRadius: 10, paddingVertical: 12,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7,
  },
  buyBtnDisabled: { backgroundColor: c.muted, borderWidth: 1, borderColor: c.border },
  buyBtnText: { fontSize: 14, fontFamily: 'Inter_600SemiBold', color: '#000' },
  buyBtnTextDisabled: { color: c.mutedForeground },
  flashWrap: {
    borderRadius: 18, borderWidth: 2, borderColor: c.laser,
    shadowColor: c.laser, shadowOpacity: 0.4, shadowRadius: 12, shadowOffset: { width: 0, height: 0 },
  },
  earnTip: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 8,
    backgroundColor: 'rgba(0,212,255,0.05)', borderRadius: 12,
    borderWidth: 1, borderColor: 'rgba(0,212,255,0.15)',
    padding: 14, marginTop: 4,
  },
  earnTipText: { fontSize: 12, fontFamily: 'Inter_400Regular', color: c.mutedForeground, flex: 1, lineHeight: 18 },
  rulesTip: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 8,
    backgroundColor: 'rgba(255,100,0,0.05)', borderRadius: 12,
    borderWidth: 1, borderColor: 'rgba(255,100,0,0.15)',
    padding: 14,
  },
  rulesTipText: { fontSize: 12, fontFamily: 'Inter_400Regular', color: c.mutedForeground, flex: 1, lineHeight: 19 },

  // Laser color
  colorRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  colorCard: {
    width: '30%', minWidth: 90, flexGrow: 1,
    backgroundColor: c.card, borderRadius: 12,
    borderWidth: 1.5, borderColor: c.border,
    padding: 10, alignItems: 'center', gap: 6,
  },
  colorDot: { width: 32, height: 32, borderRadius: 16 },
  colorName: { fontSize: 12, fontFamily: 'Inter_500Medium', color: c.foreground, textAlign: 'center' },

  // Themes
  themeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  themeCard: {
    width: '47%', flexGrow: 1,
    backgroundColor: c.card, borderRadius: 12,
    borderWidth: 1.5, borderColor: c.border,
    padding: 12,
  },
  themeName: { fontSize: 13, fontFamily: 'Inter_600SemiBold', color: c.foreground },
  themeDesc: { fontSize: 11, fontFamily: 'Inter_400Regular', color: c.mutedForeground, marginTop: 2 },

  // Music
  musicHeader: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 6 },
  musicToggle: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingTop: 2 },
  musicToggleLabel: { fontSize: 13, fontFamily: 'Inter_500Medium', color: c.mutedForeground },
  trackList: { gap: 8 },
  trackRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: c.card, borderRadius: 12,
    borderWidth: 1, borderColor: c.border,
    padding: 12,
  },
  trackIcon: {
    width: 38, height: 38, borderRadius: 10,
    backgroundColor: 'rgba(0,212,255,0.06)',
    alignItems: 'center', justifyContent: 'center',
  },
  trackName: { fontSize: 14, fontFamily: 'Inter_600SemiBold', color: c.foreground },
  trackDesc: { fontSize: 11, fontFamily: 'Inter_400Regular', color: c.mutedForeground, marginTop: 2 },

  // Shared cosmetic states
  activePill: {
    borderRadius: 20, paddingHorizontal: 8, paddingVertical: 2,
    alignSelf: 'flex-start',
  },
  activePillText: { fontSize: 10, fontFamily: 'Inter_700Bold', color: '#000' },
  ownedTag: {
    borderRadius: 8, paddingHorizontal: 7, paddingVertical: 2,
    backgroundColor: 'rgba(0,212,255,0.08)',
    borderWidth: 1, borderColor: 'rgba(0,212,255,0.2)',
    alignSelf: 'flex-start',
  },
  ownedTagText: { fontSize: 10, fontFamily: 'Inter_500Medium', color: c.laser },
  cosmeticBuyBtn: {
    backgroundColor: '#FFD700', borderRadius: 8,
    paddingHorizontal: 8, paddingVertical: 4,
    alignSelf: 'flex-start',
  },
  cosmeticBuyBtnOff: { backgroundColor: c.muted, borderWidth: 1, borderColor: c.border },
  cosmeticBuyBtnText: { fontSize: 11, fontFamily: 'Inter_700Bold', color: '#000' },
  cosmeticBuyBtnTextOff: { color: c.mutedForeground },
});
