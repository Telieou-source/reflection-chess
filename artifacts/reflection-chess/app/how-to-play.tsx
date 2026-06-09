import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
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

const c = colors.light;

function Step({
  number,
  title,
  desc,
  demo,
}: {
  number: number;
  title: string;
  desc: string;
  demo: React.ReactNode;
}) {
  return (
    <View style={styles.step}>
      <View style={styles.stepHeader}>
        <View style={styles.stepNum}>
          <Text style={styles.stepNumText}>{number}</Text>
        </View>
        <View style={styles.stepText}>
          <Text style={styles.stepTitle}>{title}</Text>
          <Text style={styles.stepDesc}>{desc}</Text>
        </View>
      </View>
      <View style={styles.stepDemo}>{demo}</View>
    </View>
  );
}

function MiniBoard() {
  const CS = 54;
  return (
    <View style={[styles.miniBoard, { width: CS * 4, height: CS * 2 }]}>
      <View style={[styles.miniCell, styles.miniSource, { width: CS, height: CS }]}>
        <Feather name="zap" size={18} color={c.laser} />
        <View style={{ position: 'absolute', bottom: 2, right: 2 }}>
          <Feather name="arrow-right" size={11} color={c.laser} />
        </View>
      </View>
      <View style={[styles.miniCell, { width: CS, height: CS }]} />
      <View style={[styles.miniCell, styles.miniMirror, { width: CS, height: CS }]}>
        <View style={{ width: 44, height: 3, backgroundColor: c.mirror, borderRadius: 2, transform: [{ rotate: '45deg' }] }} />
      </View>
      <View style={[styles.miniCell, { width: CS, height: CS }]} />
      <View style={[styles.miniCell, { width: CS, height: CS }]} />
      <View style={[styles.miniCell, { width: CS, height: CS }]} />
      <View style={[styles.miniCell, { width: CS, height: CS }]}>
        <View style={{ width: 44, height: 3, backgroundColor: c.mirror, borderRadius: 2, transform: [{ rotate: '45deg' }] }} />
      </View>
      <View style={[styles.miniCell, styles.miniTarget, { width: CS, height: CS }]}>
        <View style={{ width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: c.targetHit, position: 'absolute' }} />
        <Feather name="check" size={13} color={c.targetHit} />
      </View>
    </View>
  );
}

function MirrorDemo() {
  return (
    <View style={styles.mirrorDemoRow}>
      <View style={styles.mirrorDemoItem}>
        <View style={styles.mirrorDemoBox}>
          <View style={{ width: 44, height: 3, backgroundColor: c.mirror, borderRadius: 2, transform: [{ rotate: '-45deg' }] }} />
        </View>
        <Text style={styles.mirrorDemoLabel}>{"/"} mirror</Text>
        <Text style={styles.mirrorDemoSub}>→ up  |  ↓ left</Text>
      </View>
      <View style={styles.mirrorDemoItem}>
        <View style={styles.mirrorDemoBox}>
          <View style={{ width: 44, height: 3, backgroundColor: c.mirror, borderRadius: 2, transform: [{ rotate: '45deg' }] }} />
        </View>
        <Text style={styles.mirrorDemoLabel}>{"\\"}  mirror</Text>
        <Text style={styles.mirrorDemoSub}>→ down  |  ↑ right</Text>
      </View>
    </View>
  );
}

function TapDemo() {
  return (
    <View style={styles.tapDemoRow}>
      <View style={styles.tapDemoItem}>
        <View style={[styles.tapDemoBox, styles.tapDemoEmpty]}>
          <Text style={styles.tapDemoPlus}>+</Text>
        </View>
        <Text style={styles.tapDemoLabel}>Empty cell</Text>
        <Text style={styles.tapDemoSub}>Tap to place mirror</Text>
      </View>
      <View style={styles.tapDemoItem}>
        <View style={[styles.tapDemoBox, styles.tapDemoMirror]}>
          <View style={{ width: 36, height: 3, backgroundColor: c.mirror, borderRadius: 2, transform: [{ rotate: '-45deg' }] }} />
        </View>
        <Text style={styles.tapDemoLabel}>Mirror cell</Text>
        <Text style={styles.tapDemoSub}>Tap to rotate or remove</Text>
      </View>
    </View>
  );
}

export default function HowToPlayScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const topPad = Platform.OS === 'web' ? 67 : insets.top;
  const botPad = Platform.OS === 'web' ? 34 : insets.bottom;

  return (
    <View style={[styles.container, { paddingTop: topPad }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="arrow-left" size={22} color={c.foreground} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>How to Play</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: botPad + 32 }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.intro}>
          <Feather name="zap" size={28} color={c.laser} />
          <Text style={styles.introTitle}>Guide the laser to the target</Text>
          <Text style={styles.introText}>
            Place mirrors on the board to reflect the laser beam so it hits the bullseye target.
          </Text>
        </View>

        <Step
          number={1}
          title="The laser fires automatically"
          desc={
            "The ⚡ source always fires in the direction of the small arrow. " +
            "The beam travels in a straight line until it hits something."
          }
          demo={
            <View style={styles.sourceDemo}>
              <View style={[styles.miniCell, styles.miniSource, { width: 56, height: 56 }]}>
                <Feather name="zap" size={20} color={c.laser} />
                <View style={{ position: 'absolute', bottom: 3, right: 3 }}>
                  <Feather name="arrow-right" size={12} color={c.laser} />
                </View>
              </View>
              <View style={styles.sourceDemoBeam} />
              <View style={styles.sourceDemoArrow}>
                <Feather name="arrow-right" size={18} color={c.mutedForeground} />
              </View>
            </View>
          }
        />

        <Step
          number={2}
          title="Hit the target"
          desc="The bullseye target pulses red. Your goal is to redirect the laser beam so it hits the target."
          demo={
            <View style={styles.targetDemo}>
              <View style={[styles.miniCell, styles.miniTarget, { width: 56, height: 56 }]}>
                <View style={{ width: 30, height: 30, borderRadius: 15, borderWidth: 2, borderColor: c.target, position: 'absolute' }} />
                <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: c.target }} />
              </View>
              <Feather name="arrow-right" size={18} color={c.mutedForeground} style={{ marginHorizontal: 12 }} />
              <View style={[styles.miniCell, styles.miniTargetHit, { width: 56, height: 56 }]}>
                <View style={{ width: 30, height: 30, borderRadius: 15, borderWidth: 2, borderColor: c.targetHit, position: 'absolute' }} />
                <Feather name="check" size={16} color={c.targetHit} />
              </View>
            </View>
          }
        />

        <Step
          number={3}
          title="Mirrors reflect the beam"
          desc={
            "Two types of mirror change the laser's direction. " +
            "The exact reflection depends on the angle."
          }
          demo={<MirrorDemo />}
        />

        <Step
          number={4}
          title="Tap to place and rotate"
          desc="Tap an empty cell to place the selected mirror. Tap a mirror to cycle through: / → \\ → remove."
          demo={<TapDemo />}
        />

        <Step
          number={5}
          title="Complete example"
          desc="One mirror placed at the corner redirects the beam downward to reach the target below."
          demo={<MiniBoard />}
        />

        <View style={styles.tips}>
          <Text style={styles.tipsTitle}>Tips</Text>
          <View style={styles.tipRow}>
            <Feather name="corner-up-left" size={14} color={c.mutedForeground} />
            <Text style={styles.tipText}>Use the undo button if you mis-place a mirror</Text>
          </View>
          <View style={styles.tipRow}>
            <Feather name="refresh-cw" size={14} color={c.mutedForeground} />
            <Text style={styles.tipText}>Reset returns the board to its starting state</Text>
          </View>
          <View style={styles.tipRow}>
            <Feather name="lock" size={14} color={c.mutedForeground} />
            <Text style={styles.tipText}>Gold mirrors are fixed — only silver ones can be moved</Text>
          </View>
        </View>

        <TouchableOpacity
          style={styles.startBtn}
          onPress={() => router.back()}
          activeOpacity={0.85}
        >
          <Text style={styles.startBtnText}>Got it — Let's Play!</Text>
          <Feather name="chevron-right" size={20} color="#000" />
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: c.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: c.border,
    justifyContent: 'space-between',
  },
  backBtn: { padding: 6 },
  headerTitle: {
    fontSize: 18,
    fontFamily: 'Inter_600SemiBold',
    color: c.foreground,
  },
  content: {
    padding: 20,
    gap: 20,
  },
  intro: {
    backgroundColor: c.card,
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderColor: c.border,
  },
  introTitle: {
    fontSize: 20,
    fontFamily: 'Inter_700Bold',
    color: c.foreground,
    textAlign: 'center',
  },
  introText: {
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    color: c.mutedForeground,
    textAlign: 'center',
    lineHeight: 20,
  },
  step: {
    backgroundColor: c.card,
    borderRadius: 16,
    padding: 16,
    gap: 14,
    borderWidth: 1,
    borderColor: c.border,
  },
  stepHeader: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'flex-start',
  },
  stepNum: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: c.muted,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: c.border,
  },
  stepNumText: {
    fontSize: 13,
    fontFamily: 'Inter_700Bold',
    color: c.laser,
  },
  stepText: { flex: 1, gap: 4 },
  stepTitle: {
    fontSize: 15,
    fontFamily: 'Inter_600SemiBold',
    color: c.foreground,
  },
  stepDesc: {
    fontSize: 13,
    fontFamily: 'Inter_400Regular',
    color: c.mutedForeground,
    lineHeight: 19,
  },
  stepDemo: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  sourceDemo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  sourceDemoBeam: {
    height: 2,
    width: 80,
    backgroundColor: c.laser,
    opacity: 0.8,
  },
  sourceDemoArrow: {
    marginLeft: 4,
  },
  targetDemo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  miniBoard: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: c.border,
  },
  miniCell: {
    borderWidth: 0.5,
    borderColor: c.cellBorder,
    backgroundColor: c.cellEmpty,
    alignItems: 'center',
    justifyContent: 'center',
  },
  miniSource: {
    backgroundColor: 'rgba(124,58,237,0.15)',
  },
  miniMirror: {
    backgroundColor: c.cellEmpty,
  },
  miniTarget: {
    backgroundColor: 'rgba(255,71,87,0.08)',
  },
  miniTargetHit: {
    backgroundColor: 'rgba(46,213,115,0.12)',
  },
  mirrorDemoRow: {
    flexDirection: 'row',
    gap: 16,
    justifyContent: 'center',
  },
  mirrorDemoItem: {
    alignItems: 'center',
    gap: 6,
  },
  mirrorDemoBox: {
    width: 64,
    height: 64,
    backgroundColor: c.muted,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: c.border,
  },
  mirrorDemoLabel: {
    fontSize: 14,
    fontFamily: 'Inter_600SemiBold',
    color: c.foreground,
    fontVariant: ['tabular-nums'],
  },
  mirrorDemoSub: {
    fontSize: 11,
    fontFamily: 'Inter_400Regular',
    color: c.mutedForeground,
  },
  tapDemoRow: {
    flexDirection: 'row',
    gap: 16,
    justifyContent: 'center',
  },
  tapDemoItem: {
    alignItems: 'center',
    gap: 6,
  },
  tapDemoBox: {
    width: 64,
    height: 64,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  tapDemoEmpty: {
    backgroundColor: 'rgba(0,212,255,0.06)',
    borderColor: 'rgba(0,212,255,0.3)',
    borderStyle: 'dashed',
  },
  tapDemoMirror: {
    backgroundColor: c.muted,
    borderColor: c.border,
  },
  tapDemoPlus: {
    fontSize: 24,
    color: c.laser,
    opacity: 0.5,
    fontFamily: 'Inter_400Regular',
  },
  tapDemoLabel: {
    fontSize: 13,
    fontFamily: 'Inter_600SemiBold',
    color: c.foreground,
  },
  tapDemoSub: {
    fontSize: 11,
    fontFamily: 'Inter_400Regular',
    color: c.mutedForeground,
    textAlign: 'center',
  },
  tips: {
    backgroundColor: c.card,
    borderRadius: 16,
    padding: 16,
    gap: 10,
    borderWidth: 1,
    borderColor: c.border,
  },
  tipsTitle: {
    fontSize: 14,
    fontFamily: 'Inter_700Bold',
    color: c.foreground,
    marginBottom: 4,
  },
  tipRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  tipText: {
    fontSize: 13,
    fontFamily: 'Inter_400Regular',
    color: c.mutedForeground,
    flex: 1,
  },
  startBtn: {
    backgroundColor: c.laser,
    borderRadius: 14,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 4,
  },
  startBtnText: {
    fontSize: 17,
    fontFamily: 'Inter_700Bold',
    color: '#000',
  },
});
