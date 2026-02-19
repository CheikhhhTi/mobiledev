import { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Animated,
  ScrollView,
} from "react-native";

const { width } = Dimensions.get("window");
const BOARD_SIZE = Math.min(width - 48, 360);
const CELL_SIZE = BOARD_SIZE / 3;

// ─── Themes ───────────────────────────────────────────────────────────────────
const THEMES = {
  night: {
    label: "🌙 Night",
    bg: "#1A1A2E",
    cell: "#16213E",
    cellBorder: "#2D2D4E",
    cellWin: "#1E2D5E",
    boardBorder: "#2D2D4E",
    title: "#F8F4E3",
    vs: "#555",
    btnSecBorder: "#2D2D4E",
    btnSecText: "#555",
    xColor: "#FF6B6B",
    oColor: "#4ECDC4",
    drawColor: "#FFE66D",
    winBg: { X: "#3D1A1A", O: "#1A3D3A" },
    drawBg: "#3D3A1A",
  },
  forest: {
    label: "🌿 Forest",
    bg: "#1B2D1E",
    cell: "#223D26",
    cellBorder: "#2E5234",
    cellWin: "#2A6030",
    boardBorder: "#2E5234",
    title: "#E8F5E9",
    vs: "#557A5A",
    btnSecBorder: "#2E5234",
    btnSecText: "#557A5A",
    xColor: "#FF8A65",
    oColor: "#81C784",
    drawColor: "#FFD54F",
    winBg: { X: "#3D2010", O: "#0D3B12" },
    drawBg: "#3B3210",
  },
  candy: {
    label: "🍬 Candy",
    bg: "#FFF0F5",
    cell: "#FFE4EE",
    cellBorder: "#FFB3CC",
    cellWin: "#FFCCE0",
    boardBorder: "#FFB3CC",
    title: "#C2185B",
    vs: "#F48FB1",
    btnSecBorder: "#FFB3CC",
    btnSecText: "#F48FB1",
    xColor: "#E91E8C",
    oColor: "#7C4DFF",
    drawColor: "#FF6D00",
    winBg: { X: "#FCE4EC", O: "#EDE7F6" },
    drawBg: "#FFF3E0",
  },
  ocean: {
    label: "🌊 Ocean",
    bg: "#0D1B2A",
    cell: "#112233",
    cellBorder: "#1A3A5C",
    cellWin: "#1A4A6C",
    boardBorder: "#1A3A5C",
    title: "#E0F7FA",
    vs: "#37607A",
    btnSecBorder: "#1A3A5C",
    btnSecText: "#37607A",
    xColor: "#00E5FF",
    oColor: "#FF6F00",
    drawColor: "#B2FF59",
    winBg: { X: "#002A3A", O: "#2A1500" },
    drawBg: "#1A2A00",
  },
  sunset: {
    label: "🌅 Sunset",
    bg: "#2A1A0D",
    cell: "#3D2510",
    cellBorder: "#6B3E1A",
    cellWin: "#7A4820",
    boardBorder: "#6B3E1A",
    title: "#FFF3E0",
    vs: "#8D6E63",
    btnSecBorder: "#6B3E1A",
    btnSecText: "#8D6E63",
    xColor: "#FF7043",
    oColor: "#FFD740",
    drawColor: "#69F0AE",
    winBg: { X: "#3D1500", O: "#3D3000" },
    drawBg: "#003D1A",
  },
};

const THEME_KEYS = Object.keys(THEMES);

// ─── Helpers ──────────────────────────────────────────────────────────────────
const WINNING_LINES = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8],
  [0, 3, 6], [1, 4, 7], [2, 5, 8],
  [0, 4, 8], [2, 4, 6],
];

function checkWinner(squares) {
  for (let [a, b, c] of WINNING_LINES) {
    if (squares[a] && squares[a] === squares[b] && squares[a] === squares[c]) {
      return { winner: squares[a], line: [a, b, c] };
    }
  }
  return null;
}

// ─── Cell ─────────────────────────────────────────────────────────────────────
function Cell({ value, onPress, isWinning, theme }) {
  const scale = new Animated.Value(1);

  const handlePress = () => {
    Animated.sequence([
      Animated.timing(scale, { toValue: 0.82, duration: 80, useNativeDriver: true }),
      Animated.spring(scale, { toValue: 1, friction: 4, useNativeDriver: true }),
    ]).start();
    onPress();
  };

  const color = value === "X" ? theme.xColor : theme.oColor;

  return (
    <TouchableOpacity
      onPress={handlePress}
      activeOpacity={0.7}
      disabled={!!value}
      style={[
        styles.cell,
        {
          width: CELL_SIZE,
          height: CELL_SIZE,
          backgroundColor: isWinning ? theme.cellWin : theme.cell,
          borderColor: theme.cellBorder,
        },
      ]}
    >
      <Animated.Text style={[styles.cellText, { color, transform: [{ scale }] }]}>
        {value}
      </Animated.Text>
    </TouchableOpacity>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function TicTacToe() {
  const [squares, setSquares] = useState(Array(9).fill(null));
  const [xIsNext, setXIsNext] = useState(true);
  const [scores, setScores] = useState({ X: 0, O: 0 });
  const [themeKey, setThemeKey] = useState("night");

  const theme = THEMES[themeKey];

  const result = checkWinner(squares);
  const winner = result ? result.winner : null;
  const winningLine = result ? result.line : [];
  const isDraw = !winner && squares.every(Boolean);

  const bgColor = winner
    ? theme.winBg[winner]
    : isDraw
    ? theme.drawBg
    : theme.bg;

  const handlePress = (index) => {
    if (squares[index] || winner) return;
    const next = squares.slice();
    next[index] = xIsNext ? "X" : "O";
    setSquares(next);
    const newResult = checkWinner(next);
    if (newResult) {
      setScores((s) => ({ ...s, [newResult.winner]: s[newResult.winner] + 1 }));
    }
    setXIsNext(!xIsNext);
  };

  const reset = () => {
    setSquares(Array(9).fill(null));
    setXIsNext(true);
  };

  const resetAll = () => {
    reset();
    setScores({ X: 0, O: 0 });
  };

  let statusText = "";
  let statusColor = theme.title;
  if (winner) {
    statusText = `${winner} wins! 🎉`;
    statusColor = winner === "X" ? theme.xColor : theme.oColor;
  } else if (isDraw) {
    statusText = "It's a draw! 🤝";
    statusColor = theme.drawColor;
  } else {
    statusText = `${xIsNext ? "X" : "O"}'s turn`;
    statusColor = xIsNext ? theme.xColor : theme.oColor;
  }

  return (
    <View style={[styles.container, { backgroundColor: bgColor }]}>
      {/* Title */}
      <Text style={[styles.title, { color: theme.title }]}>TIC TAC TOE</Text>

      {/* Theme Switcher */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.themeRow}
        style={styles.themeScroll}
      >
        {THEME_KEYS.map((key) => (
          <TouchableOpacity
            key={key}
            onPress={() => setThemeKey(key)}
            style={[
              styles.themeBtn,
              {
                borderColor: themeKey === key ? theme.xColor : theme.cellBorder,
                backgroundColor: themeKey === key ? theme.cell : "transparent",
              },
            ]}
          >
            <Text style={[styles.themeBtnText, { color: themeKey === key ? theme.xColor : theme.vs }]}>
              {THEMES[key].label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Score */}
      <View style={styles.scoreRow}>
        <View style={[styles.scoreBox, { borderColor: theme.xColor }]}>
          <Text style={[styles.scoreName, { color: theme.xColor }]}>X</Text>
          <Text style={[styles.scoreNum, { color: theme.xColor }]}>{scores.X}</Text>
        </View>
        <Text style={[styles.vs, { color: theme.vs }]}>VS</Text>
        <View style={[styles.scoreBox, { borderColor: theme.oColor }]}>
          <Text style={[styles.scoreName, { color: theme.oColor }]}>O</Text>
          <Text style={[styles.scoreNum, { color: theme.oColor }]}>{scores.O}</Text>
        </View>
      </View>

      {/* Status */}
      <Text style={[styles.status, { color: statusColor }]}>{statusText}</Text>

      {/* Board */}
      <View style={[styles.board, { width: BOARD_SIZE, borderColor: theme.boardBorder }]}>
        {[0, 1, 2].map((row) => (
          <View key={row} style={styles.boardRow}>
            {[0, 1, 2].map((col) => {
              const i = row * 3 + col;
              return (
                <Cell
                  key={i}
                  value={squares[i]}
                  onPress={() => handlePress(i)}
                  isWinning={winningLine.includes(i)}
                  theme={theme}
                />
              );
            })}
          </View>
        ))}
      </View>

      {/* Buttons */}
      <TouchableOpacity style={[styles.btn, { backgroundColor: theme.xColor }]} onPress={reset}>
        <Text style={styles.btnText}>New Game</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.btn, styles.btnSecondary, { borderColor: theme.btnSecBorder }]}
        onPress={resetAll}
      >
        <Text style={[styles.btnText, { color: theme.btnSecText }]}>Reset Scores</Text>
      </TouchableOpacity>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  title: {
    fontSize: 36,
    fontWeight: "900",
    letterSpacing: 8,
    marginBottom: 16,
  },
  themeScroll: {
    flexGrow: 0,
    marginBottom: 20,
  },
  themeRow: {
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 4,
  },
  themeBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1.5,
  },
  themeBtnText: {
    fontSize: 12,
    fontWeight: "700",
  },
  scoreRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
    gap: 20,
  },
  scoreBox: {
    borderWidth: 2,
    borderRadius: 12,
    paddingHorizontal: 24,
    paddingVertical: 10,
    alignItems: "center",
    minWidth: 70,
  },
  scoreName: {
    fontSize: 18,
    fontWeight: "800",
    letterSpacing: 2,
  },
  scoreNum: {
    fontSize: 32,
    fontWeight: "900",
  },
  vs: {
    fontSize: 14,
    fontWeight: "700",
    letterSpacing: 3,
  },
  status: {
    fontSize: 22,
    fontWeight: "700",
    marginBottom: 24,
    letterSpacing: 1,
  },
  board: {
    borderRadius: 16,
    overflow: "hidden",
    borderWidth: 2,
    marginBottom: 32,
  },
  boardRow: {
    flexDirection: "row",
  },
  cell: {
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  cellText: {
    fontSize: CELL_SIZE * 0.48,
    fontWeight: "900",
  },
  btn: {
    paddingHorizontal: 40,
    paddingVertical: 14,
    borderRadius: 50,
    marginBottom: 12,
    width: "80%",
    alignItems: "center",
  },
  btnText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "800",
    letterSpacing: 1,
  },
  btnSecondary: {
    backgroundColor: "transparent",
    borderWidth: 2,
  },
});