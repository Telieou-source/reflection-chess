import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import colors from '@/constants/colors';
import { useGame } from '@/context/GameContext';
import type { Inventory, ShopItem } from '@/types/game';

const c = colors.light;

const SHOP_ITEMS: ShopItem[] = [
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
];

function ItemCard({
  item,
  owned,
  coins,
  onBuy,
}: {
  item: ShopItem;
  owned: number;
  coins: number;
  onBuy: () => void;
}) {
  const canAfford = coins >= item.cost;

  return (
    <View style={styles.itemCard}>
      <View style={styles.itemHeader}>
        <View style={styles.itemIconWrap}>
          <Text style={styles.itemIcon}>{item.icon}</Text>
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

export default function ShopScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { coins, inventory, purchaseItem } = useGame();
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

  return (
    <View style={[styles.container, { paddingTop: topPad, paddingBottom: botPad }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.headerBtn}>
          <Feather name="arrow-left" size={22} color={c.foreground} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Shop</Text>
          <Text style={styles.headerSub}>Spend coins on board tools</Text>
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

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.itemList}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.sectionTitle}>Board Tools</Text>
        <Text style={styles.sectionSubtitle}>
          Earn coins by completing levels with fewer mirrors than par.
        </Text>

        {SHOP_ITEMS.map(item => (
          <View key={item.id} style={flash === item.id ? styles.flashWrap : undefined}>
            <ItemCard
              item={item}
              owned={inventory[item.id]}
              coins={coins}
              onBuy={() => handleBuy(item)}
            />
          </View>
        ))}

        <View style={styles.earnTip}>
          <Feather name="info" size={14} color={c.laser} />
          <Text style={styles.earnTipText}>
            Solve levels using fewer mirrors than par to earn bonus coins.{'\n'}
            At par: 1 coin · 1 under par: 2 coins · 2 under par: 3 coins, and so on.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: c.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: c.border,
  },
  headerBtn: { padding: 6, width: 40 },
  headerCenter: { flex: 1, alignItems: 'center' },
  headerTitle: { fontSize: 17, fontFamily: 'Inter_600SemiBold', color: c.foreground },
  headerSub: { fontSize: 11, fontFamily: 'Inter_400Regular', color: c.mutedForeground },
  balanceBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: c.border,
    backgroundColor: c.card,
  },
  balanceLabel: {
    fontSize: 13,
    fontFamily: 'Inter_400Regular',
    color: c.mutedForeground,
  },
  balanceChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(255,215,0,0.10)',
    borderWidth: 1,
    borderColor: 'rgba(255,215,0,0.3)',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  balanceEmoji: { fontSize: 18 },
  balanceAmount: { fontSize: 20, fontFamily: 'Inter_700Bold', color: '#FFD700' },
  balanceUnit: { fontSize: 13, fontFamily: 'Inter_400Regular', color: '#FFD700', opacity: 0.7 },
  itemList: {
    padding: 20,
    gap: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontFamily: 'Inter_700Bold',
    color: c.foreground,
    marginBottom: 2,
  },
  sectionSubtitle: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
    color: c.mutedForeground,
    marginBottom: 8,
    lineHeight: 17,
  },
  itemCard: {
    backgroundColor: c.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: c.border,
    padding: 16,
    gap: 10,
  },
  itemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  itemIconWrap: {
    width: 52,
    height: 52,
    borderRadius: 14,
    backgroundColor: 'rgba(0,212,255,0.06)',
    borderWidth: 1,
    borderColor: c.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemIcon: { fontSize: 26 },
  itemInfo: { flex: 1, gap: 4 },
  itemName: { fontSize: 15, fontFamily: 'Inter_600SemiBold', color: c.foreground },
  itemMeta: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  itemCost: { fontSize: 13, fontFamily: 'Inter_500Medium', color: '#FFD700' },
  ownedBadge: {
    backgroundColor: 'rgba(0,212,255,0.1)',
    borderRadius: 8,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderWidth: 1,
    borderColor: 'rgba(0,212,255,0.2)',
  },
  ownedText: { fontSize: 11, fontFamily: 'Inter_500Medium', color: c.laser },
  itemDesc: {
    fontSize: 13,
    fontFamily: 'Inter_400Regular',
    color: c.mutedForeground,
    lineHeight: 18,
  },
  buyBtn: {
    backgroundColor: c.laser,
    borderRadius: 10,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
  },
  buyBtnDisabled: {
    backgroundColor: c.muted,
    borderWidth: 1,
    borderColor: c.border,
  },
  buyBtnText: {
    fontSize: 14,
    fontFamily: 'Inter_600SemiBold',
    color: '#000',
  },
  buyBtnTextDisabled: { color: c.mutedForeground },
  flashWrap: {
    borderRadius: 18,
    borderWidth: 2,
    borderColor: c.laser,
    shadowColor: c.laser,
    shadowOpacity: 0.4,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 0 },
  },
  earnTip: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: 'rgba(0,212,255,0.05)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(0,212,255,0.15)',
    padding: 14,
    marginTop: 4,
  },
  earnTipText: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
    color: c.mutedForeground,
    flex: 1,
    lineHeight: 18,
  },
});
