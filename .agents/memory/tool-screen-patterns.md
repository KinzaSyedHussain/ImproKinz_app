---
name: Tool screen patterns
description: Correct patterns for AI tool screens (flashcards, notes, quiz, summarizer) in the mobile app.
---

## Standard header pattern for all tool screens
All tool screens must use this header — never per-tool gradient headers:
```jsx
<View style={[styles.header, { paddingTop: topPad + 10, backgroundColor: colors.card, borderBottomColor: colors.border }]}>
  <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
    <Icon name="arrow-left" size={21} color={colors.foreground} />
  </TouchableOpacity>
  <View style={[styles.toolIconWrap, { backgroundColor: colors.primary + "20" }]}>
    <Icon name="<tool-icon>" size={17} color={colors.primary} />
  </View>
  <Text style={[styles.headerTitle, { color: colors.foreground }]}>Tool Name</Text>
  <View style={[styles.xpPill, { backgroundColor: colors.secondary }]}>
    <Text style={[styles.xpText, { color: colors.primary }]}>+N XP</Text>
  </View>
  <View style={{ flex: 1 }} />
  <ToolCreditPill tool="toolname" />
</View>
```

**Why:** Per-tool gradient headers (like the orange gradient in notes.tsx) cause broken vertical text rendering on web/mobile. The standard dark card header is safe on all platforms.

## Font family rule
Always use `Inter_700Bold`, `Inter_600SemiBold`, `Inter_500Medium`, `Inter_400Regular` in StyleSheet. Never `fontFamily: undefined` — that falls back to system font and breaks design consistency.

## Post card Like button
- Short tap → toggles "like" reaction → shows FILLED `heart` icon (`name="heart"`) in `colors.primary`
- Long press → opens picker modal with 👍 Like / 💡 Insightful / 🎉 Congrats
- When "insightful" or "congrats" is active → show the emoji, not the heart
- When NOT active → show `heart-outline` in `colors.mutedForeground`

**Why:** Using 👍 emoji for the tap-to-like action was confusing when the button shows a heart icon. Filled heart is clearer.
