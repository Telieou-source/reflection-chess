import React, { useMemo } from 'react';
import { Dimensions, StyleSheet, TouchableOpacity, View } from 'react-native';
import { Feather } from '@expo/vector-icons';

import colors from '@/constants/colors';
import type { GameCell, LaserSegment, Side } from '@/types/game';
import { traceLaser } from '@/utils/laser';

const c = colors.light;
const LINE_W = 3;
const CELL_PADDING = 2;

interface Props {
  grid: GameCell[][];
  gridSize: number;
  hitTargets: Set<string>;
  onTapCell: (row: number, col: number) => void;
}

const SCREEN_W = Dimensions.get('window').width;
const BOARD_MAX = Math.min(SCREEN_W - 32, 380);

function getCellSize(gridSize: number) {
  return Math.floor(BOARD_MAX / gridSize);
}

function halfSegmentStyle(
  side: Side,
  cellSize: number,
): Record<string, number | string> {
  const half = cellSize / 2;
  const lw = LINE_W;
  const lw2 = lw / 2;

  switch (side) {
    case 'left':
      return { position: 'absolute', left: 0, right: half, top: half - lw2, height: lw };
    case 'right':
      return { position: 'absolute', left: half, right: 0, top: half - lw2, height: lw };
    case 'top':
      return { position: 'absolute', top: 0, bottom: half, left: half - lw2, width: lw };
    case 'bottom':
      return { position: 'absolute', top: half, bottom: 0, left: half - lw2, width: lw };
  }
}

function LaserSegmentView({
  seg,
  cellSize,
}: {
  seg: LaserSegment;
  cellSize: number;
}) {
  const fromStyle = halfSegmentStyle(seg.from, cellSize);
  const toStyle = halfSegmentStyle(seg.to, cellSize);
  return (
    <>
      <View
        style={[fromStyle as any, styles.laserLine]}
        pointerEvents="none"
      />
      <View
        style={[toStyle as any, styles.laserLine]}
        pointerEvents="none"
      />
    </>
  );
}

function CellView({
  cell,
  row,
  col,
  cellSize,
  laserSegs,
  isHitTarget,
  onTap,
}: {
  cell: GameCell;
  row: number;
  col: number;
  cellSize: number;
  laserSegs: LaserSegment[];
  isHitTarget: boolean;
  onTap: () => void;
}) {
  const inner = cellSize - CELL_PADDING * 2;
  const mirrorLen = inner * 1.35;
  const mirrorOffset = (inner - mirrorLen) / 2;
  const mirrorThickness = Math.max(3, inner * 0.06);

  return (
    <TouchableOpacity
      onPress={onTap}
      activeOpacity={cell.fixed ? 1 : 0.7}
      style={[
        styles.cell,
        {
          width: cellSize,
          height: cellSize,
          padding: CELL_PADDING,
        },
        cell.kind === 'wall' && styles.cellWall,
      ]}
    >
      <View style={{ width: inner, height: inner, position: 'relative' }}>
        {cell.kind === 'laser' && (
          <View style={[styles.cellInner, styles.sourceCell]}>
            <Feather name="zap" size={Math.max(14, inner * 0.45)} color={c.laser} />
          </View>
        )}

        {cell.kind === 'target' && (
          <View
            style={[
              styles.cellInner,
              styles.targetCell,
              isHitTarget && styles.targetCellHit,
            ]}
          >
            <View
              style={[
                styles.targetRing,
                { width: inner * 0.55, height: inner * 0.55, borderRadius: inner },
                isHitTarget && styles.targetRingHit,
              ]}
            />
            <View
              style={[
                styles.targetDot,
                { width: inner * 0.2, height: inner * 0.2, borderRadius: inner },
                isHitTarget && styles.targetDotHit,
              ]}
            />
          </View>
        )}

        {cell.kind === 'wall' && (
          <View style={[styles.cellInner, styles.wallCell]} />
        )}

        {(cell.kind === 'mirror-slash' || cell.kind === 'mirror-backslash') && (
          <View style={styles.cellInner}>
            <View
              style={{
                width: mirrorLen,
                height: mirrorThickness,
                backgroundColor: cell.fixed ? c.mirrorFixed : c.mirror,
                borderRadius: mirrorThickness / 2,
                position: 'absolute',
                top: mirrorOffset + (inner - mirrorThickness) / 2,
                left: mirrorOffset,
                transform: [
                  { rotate: cell.kind === 'mirror-slash' ? '-45deg' : '45deg' },
                ],
                shadowColor: cell.fixed ? c.mirrorFixed : c.mirror,
                shadowOpacity: 0.7,
                shadowRadius: 4,
                shadowOffset: { width: 0, height: 0 },
              }}
            />
          </View>
        )}

        {cell.kind === 'empty' && !cell.fixed && (
          <View style={[styles.cellInner, styles.emptyCell]} />
        )}

        {laserSegs.map((seg, i) => (
          <LaserSegmentView key={i} seg={seg} cellSize={inner} />
        ))}
      </View>
    </TouchableOpacity>
  );
}

export default function Board({ grid, gridSize, hitTargets, onTapCell }: Props) {
  const cellSize = getCellSize(gridSize);
  const boardSize = cellSize * gridSize;

  const { segments } = useMemo(() => traceLaser(grid, gridSize), [grid, gridSize]);

  const segsByCell = useMemo(() => {
    const map = new Map<string, LaserSegment[]>();
    for (const seg of segments) {
      const key = `${seg.row},${seg.col}`;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(seg);
    }
    return map;
  }, [segments]);

  return (
    <View style={[styles.board, { width: boardSize, height: boardSize }]}>
      {grid.map((row, r) =>
        row.map((cell, c_) => {
          const key = `${r},${c_}`;
          const laserSegs = segsByCell.get(key) ?? [];
          const isHitTarget = hitTargets.has(key);
          return (
            <CellView
              key={key}
              cell={cell}
              row={r}
              col={c_}
              cellSize={cellSize}
              laserSegs={laserSegs}
              isHitTarget={isHitTarget}
              onTap={() => onTapCell(r, c_)}
            />
          );
        })
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  board: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    backgroundColor: c.card,
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: c.border,
  },
  cell: {
    borderWidth: 0.5,
    borderColor: c.cellBorder,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: c.cellEmpty,
  },
  cellWall: {
    backgroundColor: c.wall,
  },
  cellInner: {
    flex: 1,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sourceCell: {
    backgroundColor: 'rgba(124, 58, 237, 0.12)',
    borderRadius: 4,
  },
  targetCell: {
    backgroundColor: 'rgba(255, 71, 87, 0.08)',
    borderRadius: 4,
  },
  targetCellHit: {
    backgroundColor: 'rgba(46, 213, 115, 0.12)',
  },
  targetRing: {
    borderWidth: 2,
    borderColor: c.target,
    position: 'absolute',
  },
  targetRingHit: {
    borderColor: c.targetHit,
  },
  targetDot: {
    backgroundColor: c.target,
    position: 'absolute',
  },
  targetDotHit: {
    backgroundColor: c.targetHit,
  },
  wallCell: {
    backgroundColor: c.wall,
    borderRadius: 2,
  },
  emptyCell: {
    backgroundColor: 'transparent',
  },
  laserLine: {
    backgroundColor: c.laser,
    shadowColor: c.laser,
    shadowOpacity: 0.8,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 0 },
  },
});
