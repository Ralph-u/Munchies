import { Ionicons } from '@expo/vector-icons';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { SERVER_URL } from '@/lib/config';

const HEADER_ART = require('../assets/header-art.png');

const serif = 'PPEditorialNew';

const STEPS = [
  'URL received',
  'Information found',
  'AI extracting recipe…',
  'Saving to library',
] as const;

function SpinnerIcon() {
  const rotation = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.timing(rotation, {
        toValue: 1,
        duration: 900,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    ).start();
  }, [rotation]);

  const spin = rotation.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });

  return <Animated.View style={[styles.spinner, { transform: [{ rotate: spin }] }]} />;
}

function StepIcon({ index, activeStep }: { index: number; activeStep: number }) {
  if (index < activeStep) return <Ionicons name="checkmark-circle" size={32} color="#1a1a1a" />;
  if (index === activeStep) return <SpinnerIcon />;
  return <Ionicons name="ellipse-outline" size={32} color="#1a1a1a" />;
}

export default function ProcessingScreen() {
  const { url } = useLocalSearchParams<{ url: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [activeStep, setActiveStep] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const hasFetched = useRef(false);

  useEffect(() => {
    if (!url || hasFetched.current) return;
    hasFetched.current = true;

    const contentTimer = setTimeout(() => {
      setActiveStep(s => Math.max(s, 2));
    }, 1500);

    async function run() {
      try {
        const res = await fetch(`${SERVER_URL}/extract`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? 'Server error');

        setActiveStep(3);
        setTimeout(() => router.replace(`/recipe/${data.id}`), 600);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Something went wrong');
      }
    }

    run();
    return () => clearTimeout(contentTimer);
  }, [url, router]);

  if (error) {
    return (
      <View style={[styles.errorRoot, { backgroundColor: '#fffcbc' }]}>
        <Stack.Screen options={{ headerShown: false }} />

        {/* Centered error content */}
        <View style={styles.errorContent}>
          <View style={styles.errorTextBlock}>
            <Text style={styles.errorTitle}>Can't extract recipes{'\n'}from this link</Text>
            <Text style={styles.errorSubtitle}>
              There seems to be an issue with this link you have shared.
            </Text>
          </View>

          <View style={styles.errorRow}>
            <Ionicons name="alert-circle-outline" size={32} color="#1a1a1a" />
            <Text style={styles.errorDetail}>{error}</Text>
          </View>
        </View>

        {/* Docked button */}
        <View style={[styles.dockedBar, { paddingBottom: insets.bottom + 32 }]}>
          <Pressable
            style={({ pressed }) => [styles.dockedButton, pressed && { opacity: 0.85 }]}
            onPress={() => router.replace('/add')}
          >
            <Text style={styles.dockedButtonText}>Add a new recipe</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <Stack.Screen options={{ headerShown: false }} />

      <View style={[styles.artContainer, { height: 160 + insets.top }]}>
        <Image source={HEADER_ART} style={StyleSheet.absoluteFill} resizeMode="cover" />
      </View>

      <View style={[styles.content, { paddingBottom: insets.bottom + 32 }]}>
        <View style={styles.titleBlock}>
          <Text style={styles.title}>Reading the recipe...</Text>
          <Text style={styles.subtitle}>
            Pulling ingredients and instructions{'\n'}from your link
          </Text>
        </View>

        <View style={styles.steps}>
          {STEPS.map((label, i) => (
            <View key={i} style={styles.stepRow}>
              <StepIcon index={i} activeStep={activeStep} />
              <Text style={styles.stepLabel}>{label}</Text>
            </View>
          ))}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#fffcbc' },
  errorRoot: { flex: 1 },

  // Illustration band
  artContainer: { overflow: 'hidden', backgroundColor: '#fffcbc' },

  // Content area (processing)
  content: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 24,
    gap: 24,
    justifyContent: 'flex-start',
  },

  // Title block
  titleBlock: { gap: 8 },
  title: {
    fontFamily: serif,
    fontSize: 32,
    fontWeight: '400',
    color: '#1a1a1a',
    lineHeight: 38,
  },
  subtitle: { fontSize: 12, color: '#1a1a1a', lineHeight: 18 },

  // Steps
  steps: { gap: 16 },
  stepRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  stepLabel: { fontSize: 14, fontWeight: '500', color: '#1a1a1a' },

  // Spinner (gap circle)
  spinner: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 3,
    borderColor: '#1a1a1a',
    borderTopColor: 'transparent',
  },

  // Error state
  errorContent: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 16,
    gap: 24,
  },
  errorTextBlock: { gap: 8 },
  errorTitle: {
    fontFamily: serif,
    fontSize: 32,
    fontWeight: '400',
    color: '#1a1a1a',
    lineHeight: 38,
  },
  errorSubtitle: { fontSize: 12, color: '#1a1a1a', lineHeight: 18 },
  errorRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
  },
  errorDetail: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
    color: '#1a1a1a',
    lineHeight: 20,
  },

  // Docked button
  dockedBar: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  dockedButton: {
    backgroundColor: '#FFF312',
    borderRadius: 99,
    borderWidth: 2,
    borderBottomWidth: 5,
    borderColor: '#1a1a1a',
    height: 57,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dockedButtonText: { fontSize: 14, fontWeight: '500', color: '#1a1a1a' },
});
