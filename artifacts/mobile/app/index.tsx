import { useAuth as useClerkAuth } from "@clerk/clerk-expo";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  Animated,
  Dimensions,
  Easing,
  Image,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { useAuth } from "@/context/AuthContext";
import { asyncStorage as AsyncStorage } from "@/lib/asyncStorage";

const { width, height } = Dimensions.get("window");

const SPLASH_DURATION = 3200;

export default function Index() {
  const router = useRouter();

  const { user, profile, loading } = useAuth();
  const { isSignedIn } = useClerkAuth();

  const hasNavigated = useRef(false);

  const [splashFinished, setSplashFinished] = useState(false);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.82)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;
  const starAnim = useRef(new Animated.Value(0)).current;

  /*
   * ---------------------------------------
   * Main splash animations
   * ---------------------------------------
   */
  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 900,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }),

      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 7,
        tension: 45,
        useNativeDriver: true,
      }),

      Animated.timing(progressAnim, {
        toValue: 1,
        duration: SPLASH_DURATION,
        easing: Easing.inOut(Easing.ease),
        useNativeDriver: false,
      }),
    ]).start();

    const starLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(starAnim, {
          toValue: 1,
          duration: 1800,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(starAnim, {
          toValue: 0,
          duration: 1800,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
    );

    starLoop.start();

    return () => {
      starLoop.stop();
    };
  }, [fadeAnim, scaleAnim, progressAnim, starAnim]);

  /*
   * The timer controls ONLY when the splash animation is
   * considered finished. It does not decide authentication.
   */
  useEffect(() => {
    const timer = setTimeout(() => {
      setSplashFinished(true);
    }, SPLASH_DURATION);

    return () => {
      clearTimeout(timer);
    };
  }, []);

  /*
   * ---------------------------------------
   * Authentication / navigation
   * ---------------------------------------
   *
   * Signed out:
   *     /auth
   *
   * New account waiting for onboarding:
   *     /onboarding
   *
   * Existing authenticated account:
   *     /(tabs)
   */
  useEffect(() => {
    if (loading || !splashFinished || hasNavigated.current) {
      return;
    }

    let cancelled = false;

    const decideNavigation = async () => {
      const authenticated = !!user || !!isSignedIn;

      /*
       * User is not signed in.
       */
      if (!authenticated) {
        if (cancelled || hasNavigated.current) {
          return;
        }

        hasNavigated.current = true;
        router.replace("/auth");
        return;
      }

      let pendingOnboarding = false;

      try {
        const pendingNickname = await AsyncStorage.getItem(
          "pending_onboarding_nickname",
        );

        pendingOnboarding = !!pendingNickname;
      } catch (error) {
        console.warn(
          "Could not read pending onboarding state:",
          error,
        );
      }

      if (cancelled || hasNavigated.current) {
        return;
      }

      /*
       * We only use onboardingComplete when it is explicitly true.
       *
       * This is important because older users may not have this
       * property on their profile.
       */
      const onboardingComplete =
        (profile as any)?.onboardingComplete === true;

      /*
       * Newly registered user who has not completed onboarding.
       */
      if (pendingOnboarding && !onboardingComplete) {
        hasNavigated.current = true;
        router.replace("/onboarding");
        return;
      }

      /*
       * If onboarding has already been completed, remove the
       * temporary signup marker so the user does not get sent
       * back to onboarding on every future app launch.
       */
      if (pendingOnboarding && onboardingComplete) {
        try {
          await AsyncStorage.removeItem(
            "pending_onboarding_nickname",
          );
        } catch (error) {
          console.warn(
            "Could not clear pending onboarding state:",
            error,
          );
        }
      }

      if (cancelled || hasNavigated.current) {
        return;
      }

      /*
       * Normal authenticated user.
       */
      hasNavigated.current = true;
      router.replace("/(tabs)");
    };

    decideNavigation();

    return () => {
      cancelled = true;
    };
  }, [
    loading,
    splashFinished,
    user,
    isSignedIn,
    profile,
    router,
  ]);

  const progressWidth = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, width * 0.62],
  });

  const starOpacity = starAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.25, 0.9],
  });

  const starTranslate = starAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -8],
  });

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[
          "#080016",
          "#12002B",
          "#1C063A",
          "#090012",
        ]}
        style={StyleSheet.absoluteFill}
      />

      {/* Background stars */}
      <Animated.View
        style={[
          styles.star,
          styles.starOne,
          {
            opacity: starOpacity,
            transform: [{ translateY: starTranslate }],
          },
        ]}
      />

      <Animated.View
        style={[
          styles.star,
          styles.starTwo,
          {
            opacity: starOpacity,
            transform: [{ translateY: starTranslate }],
          },
        ]}
      />

      <Animated.View
        style={[
          styles.star,
          styles.starThree,
          {
            opacity: starOpacity,
            transform: [{ translateY: starTranslate }],
          },
        ]}
      />

      <Animated.View
        style={[
          styles.star,
          styles.starFour,
          {
            opacity: starOpacity,
            transform: [{ translateY: starTranslate }],
          },
        ]}
      />

      <Animated.View
        style={[
          styles.star,
          styles.starFive,
          {
            opacity: starOpacity,
            transform: [{ translateY: starTranslate }],
          },
        ]}
      />

      <Animated.View
        style={[
          styles.content,
          {
            opacity: fadeAnim,
            transform: [{ scale: scaleAnim }],
          },
        ]}
      >
        <View style={styles.logoWrapper}>
          <View style={styles.logoGlow} />

          <Image
            source={require("../assets/images/logo_nobg.png")}
            style={styles.logo}
            resizeMode="contain"
          />
        </View>

        <Text style={styles.title}>Improkinz</Text>

        <Text style={styles.subtitle}>
          Improve. Learn. Create.
        </Text>

        <View style={styles.pillsContainer}>
          <View style={styles.pill}>
            <Text style={styles.pillIcon}>✦</Text>
            <Text style={styles.pillText}>
              AI Study Tools
            </Text>
          </View>

          <View style={styles.pill}>
            <Text style={styles.pillIcon}>◈</Text>
            <Text style={styles.pillText}>
              Learn Together
            </Text>
          </View>

          <View style={styles.pill}>
            <Text style={styles.pillIcon}>⚡</Text>
            <Text style={styles.pillText}>
              Level Up
            </Text>
          </View>
        </View>
      </Animated.View>

      <View style={styles.bottomSection}>
        <Text style={styles.loadingText}>
          Loading your workspace...
        </Text>

        <View style={styles.progressBackground}>
          <Animated.View
            style={[
              styles.progressBar,
              {
                width: progressWidth,
              },
            ]}
          />
        </View>

        <Text style={styles.footerText}>
          Your space to learn, build & improve
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#080016",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },

  content: {
    alignItems: "center",
    justifyContent: "center",
    marginTop: -height * 0.05,
  },

  logoWrapper: {
    width: 145,
    height: 145,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },

  logoGlow: {
    position: "absolute",
    width: 125,
    height: 125,
    borderRadius: 63,
    backgroundColor: "#8B5CF6",
    opacity: 0.18,
    transform: [{ scale: 1.25 }],
  },

  logo: {
    width: 125,
    height: 125,
  },

  title: {
    color: "#FFFFFF",
    fontSize: 36,
    fontWeight: "800",
    letterSpacing: 0.5,
    marginTop: 8,
  },

  subtitle: {
    color: "#BFA8E8",
    fontSize: 16,
    marginTop: 7,
    letterSpacing: 0.4,
  },

  pillsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: 8,
    marginTop: 30,
    maxWidth: width * 0.88,
  },

  pill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.07)",
    borderWidth: 1,
    borderColor: "rgba(167,139,250,0.18)",
    borderRadius: 20,
    paddingHorizontal: 13,
    paddingVertical: 8,
  },

  pillIcon: {
    color: "#C4B5FD",
    fontSize: 13,
    marginRight: 6,
  },

  pillText: {
    color: "#DDD6FE",
    fontSize: 12,
    fontWeight: "600",
  },

  bottomSection: {
    position: "absolute",
    bottom: 40,
    alignItems: "center",
    width: "100%",
  },

  loadingText: {
    color: "#A78BFA",
    fontSize: 12,
    marginBottom: 10,
  },

  progressBackground: {
    width: width * 0.62,
    height: 3,
    backgroundColor: "rgba(255,255,255,0.1)",
    borderRadius: 4,
    overflow: "hidden",
  },

  progressBar: {
    height: 3,
    backgroundColor: "#A78BFA",
    borderRadius: 4,
  },

  footerText: {
    color: "#6D5A89",
    fontSize: 10,
    marginTop: 12,
  },

  star: {
    position: "absolute",
    width: 3,
    height: 3,
    borderRadius: 2,
    backgroundColor: "#FFFFFF",
  },

  starOne: {
    top: height * 0.17,
    left: width * 0.18,
  },

  starTwo: {
    top: height * 0.28,
    right: width * 0.15,
  },

  starThree: {
    top: height * 0.42,
    left: width * 0.08,
  },

  starFour: {
    top: height * 0.63,
    right: width * 0.1,
  },

  starFive: {
    top: height * 0.75,
    left: width * 0.2,
  },
});