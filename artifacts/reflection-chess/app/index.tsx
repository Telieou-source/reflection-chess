import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useRef } from 'react';
import {
  Animated,
  Dimensions,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import colors from '@/constants/colors';
import { useGame } from '@/context/GameContext';

const c = colors.light;
const { width } = Dimensions.get('window');

function LaserDecoration() {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(anim, { toValue: 1, duration: 2400, useNativeDriver: true }),
        Animated.timing(anim, { toValue: 0, duration: 2400, useNativeDriver: true }),
      ])
    ).start();
  }, [anim]);
  const opacity = anim.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0.35, 1, 0.35] });
  return (
    <Animated.View style={[styles.laserDeco, { opacity }]}>
      <View style={styles.laserH} />
      <View style={styles.mirrorDeco1} />
      <View style={styles.laserV} />
      <View style={styles.mirrorDeco2} />
      <View style={styles.laserH2} />
    </Animated.View>
  );
}

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { completedLevels } = useGame();
  const topPad = Platform.OS === 'web' ? 67 : insets.top;
  const botPad = Platform.OS === 'web' ? 34 : insets.bottom;

  const nextUnlocked = Math.min(completedLevels.length + 1, 10);

  return (
    <View style={[styles.container, { paddingTop: topPad + 20, paddingBottom: botPad + 20 }]}>
      <View style={styles.header}>
        <View style={styles.logoRow}>
          <Feather name="zap" size={32} color={c.laser} />
        </View>
        <Text style={styles.title}>Reflection</Text>
        <Text style={styles.titleAccent}>Chess</Text>
        <Text style={styles.subtitle}>Laser · Mirrors · Logic</Text>
      </View>

      <LaserDecoration />

      <View style={styles.stats}>
        <View style={styles.statBox}>
          <Text style={styles.statValue}>{completedLevels.length}</Text>
          <Text style={styles.statLabel}>Solved</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statBox}>
          <Text style={styles.statValue}>10</Text>
          <Text style={styles.statLabel}>Levels</Text>
        </View>
      </View>

      <View style={styles.buttons}>
        <TouchableOpacity
          style={styles.primaryBtn}
          onPress={() => {
            router.push({ pathname: '/game', params: { id: String(nextUnlocked) } });
          }}
          activeOpacity={0.85}
        >
          <Text style={styles.primaryBtnText}>
            {completedLevels.length === 0 ? 'Start Playing' : `Continue — Level ${nextUnlocked}`}
          </Text>
          <Feather name="chevron-right" size={20} color="#000" />
        </TouchableOpacity>

        <View style={styles.secondaryRow}>
          <TouchableOpacity
            style={[styles.secondaryBtn, { flex: 1 }]}
            onPress={() => router.push('/levels')}
            activeOpacity={0.85}
          >
            <Feather name="list" size={17} color={c.foreground} />
            <Text style={styles.secondaryBtnText}>All Levels</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.secondaryBtn, { flex: 1 }]}
            onPress={() => router.push('/how-to-play')}
            activeOpacity={0.85}
          >
            <Feather name="help-circle" size={17} color={c.foreground} />
            <Text style={styles.secondaryBtnText}>How to Play</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>Redirect the laser beam to hit the target</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: c.background,
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
  },
  header: { alignItems: 'center', gap: 4 },
  logoRow: {
    marginBottom: 8,
    padding: 16,
    borderRadius: 24,
    backgroundColor: 'rgba(0,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(0,255,255,0.2)',
  },
  title: {
    fontSize: 42,
    fontFamily: 'Inter_700Bold',
    color: c.foreground,
    letterSpacing: -1,
  },
  titleAccent: {
    fontSize: 42,
    fontFamily: 'Inter_700Bold',
    color: c.laser,
    letterSpacing: -1,
    marginTop: -8,
  },
  subtitle: {
    fontSize: 13,
    fontFamily: 'Inter_400Regular',
    color: c.mutedForeground,
    letterSpacing: 3,
    textTransform: 'uppercase',
    marginTop: 8,
  },
  laserDeco: {
    width: width - 80,
    height: 120,
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  laserH: {
    position: 'absolute',
    top: 30,
    left: 0,
    right: '45%',
    height: 2,
    backgroundColor: c.laser,
    shadowColor: c.laser,
    shadowOpacity: 0.9,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 0 },
  },
  mirrorDeco1: {
    position: 'absolute',
    top: 15,
    left: '55%',
    width: 40,
    height: 3,
    backgroundColor: c.mirror,
    transform: [{ rotate: '45deg' }],
    borderRadius: 2,
    shadowColor: c.mirror,
    shadowOpacity: 0.7,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 0 },
  },
  laserV: {
    position: 'absolute',
    top: 30,
    bottom: 0,
    right: '43%',
    width: 2,
    backgroundColor: c.laser,
    shadowColor: c.laser,
    shadowOpacity: 0.9,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 0 },
  },
  mirrorDeco2: {
    position: 'absolute',
    bottom: 12,
    right: '55%',
    width: 40,
    height: 3,
    backgroundColor: c.mirror,
    transform: [{ rotate: '-45deg' }],
    borderRadius: 2,
    shadowColor: c.mirror,
    shadowOpacity: 0.7,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 0 },
  },
  laserH2: {
    position: 'absolute',
    bottom: 30,
    left: 0,
    right: '57%',
    height: 2,
    backgroundColor: c.laser,
    shadowColor: c.laser,
    shadowOpacity: 0.9,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 0 },
  },
  stats: {
    flexDirection: 'row',
    backgroundColor: c.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: c.border,
    paddingVertical: 16,
    paddingHorizontal: 32,
    alignItems: 'center',
    gap: 24,
  },
  statBox: { alignItems: 'center' },
  statValue: { fontSize: 28, fontFamily: 'Inter_700Bold', color: c.laser },
  statLabel: { fontSize: 12, fontFamily: 'Inter_400Regular', color: c.mutedForeground, marginTop: 2 },
  statDivider: { width: 1, height: 36, backgroundColor: c.border },
  buttons: { width: '100%', gap: 12 },
  primaryBtn: {
    backgroundColor: c.laser,
    borderRadius: 14,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  primaryBtnText: { fontSize: 17, fontFamily: 'Inter_700Bold', color: '#000' },
  secondaryRow: { flexDirection: 'row', gap: 10 },
  secondaryBtn: {
    backgroundColor: c.card,
    borderRadius: 14,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: c.border,
  },
  secondaryBtnText: { fontSize: 14, fontFamily: 'Inter_500Medium', color: c.foreground },
  footer: { paddingBottom: 4 },
  footerText: { fontSize: 12, fontFamily: 'Inter_400Regular', color: c.mutedForeground, textAlign: 'center' },
});
