---
name: App structure v2
description: Current tab layout, routing, and screen responsibilities after the major spec refactor.
---

## Tab structure (5 tabs)
`artifacts/mobile/app/(tabs)/_layout.tsx`
- **index** → Home dashboard (personal: greeting, streak, subject bubbles, tools grid)
- **community** → Social feed (was old index.tsx) with subject community pills
- **create** → Redirect placeholder; tabBarButton routes directly to /create-post
- **focus** → Focus timer (SVG gold ring countdown, custom time, coin reward)
- **profile** → User profile screen (unchanged)
- **dashboard** and **notifications** still exist as files but use `href: null` — not in tab bar

## Routing notes
- The old feed/social content is now at `/(tabs)/community`
- The Home tab is a personal study dashboard (not a social feed)
- `/dashboard` is still accessible via router.push but not in tab bar

## Onboarding (4 steps)
1. Name (text input)
2. Level: School / College / Self-learner
3. Subjects: multi-select chips (saves as array)
4. Daily goal: 15 / 30 / 60 / 120 min (saves as `studyGoal` string in profile)

**Why:** Old 6-step onboarding was too long (had duplicate goal/reason steps). New 4-step version saves `subjects` as array and `studyGoal` as minutes string. Home screen reads both from profile.

## Focus timer
- 3 phases: setup → running → complete
- SVG ring uses react-native-svg with purple-to-gold LinearGradient
- RING_R=105, STROKE=14, SIZE=(RING_R+STROKE+4)*2
- Completion awards `Math.max(1, Math.round(mins/5))` coins and `mins*2` XP

## PostCard like button
- Tap = single like → shows gradient heart pill (purple→gold LinearGradient + white heart icon)
- Double-tap within 320ms = big heart burst animation overlay + auto-like
- Long-press = reaction picker (Like / Insightful / Congrats)
- `heartBurstScale` and `heartBurstOpacity` are `RNAnimated.Value` refs (not reanimated)
- `lastTapRef` tracks last tap timestamp for double-tap detection

## Home dashboard data sources
- `profile.displayName` → greeting
- `profile.streak` → streak count (may be undefined = 0)
- `profile.xp` → XP count
- `profile.studyGoal` → daily goal in minutes (string, parseInt)
- `profile.subjects` → array (new) or string (old single field, displayed as [string])
