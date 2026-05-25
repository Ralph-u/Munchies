import * as Clipboard from 'expo-clipboard';
import { Stack, useRouter } from 'expo-router';
import { useState } from 'react';
import {
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const HEADER_ART = require('../assets/header-art.png');
const TAB_HAMBURGER = require('../assets/tab-hamburger.png');
const TAB_PLUS = require('../assets/tab-plus.png');
const TAB_USER = require('../assets/tab-user.png');

const serif = 'PPEditorialNew';

export default function AddScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [url, setUrl] = useState('');

  const hasUrl = url.trim().length > 0;

  async function handlePaste() {
    const text = await Clipboard.getStringAsync();
    if (text) setUrl(text);
  }

  function handleExtract() {
    const trimmed = url.trim();
    if (!trimmed) return;
    router.push(`/processing?url=${encodeURIComponent(trimmed)}`);
  }

  return (
    <View style={styles.root}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* ── Top illustration ───────────────────────────────────────── */}
      <View style={[styles.topArt, { height: 160 + insets.top }]}>
        <Image source={HEADER_ART} style={StyleSheet.absoluteFill} resizeMode="cover" />
      </View>

      {/* ── Content ───────────────────────────────────────────────── */}
      <KeyboardAvoidingView
        style={styles.kav}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.content}>
          {/* Title + subtitle */}
          <View style={styles.titleBlock}>
            <Text style={styles.title}>Add a recipe</Text>
            <Text style={styles.subtitle}>
              {'Press the share button from YouTube or Instagram to Munchies and the app will pull the recipe and save it here! Alternatively you can paste in a URL link here.'}
            </Text>
          </View>

          {/* URL input */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>URL link</Text>
            <TextInput
              style={styles.input}
              value={url}
              onChangeText={setUrl}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="url"
              returnKeyType="go"
              onSubmitEditing={handleExtract}
            />
          </View>

          {/* Action row — paste left, Extract right when enabled */}
          <View style={[styles.actionRow, hasUrl && styles.actionRowActive]}>
            <Pressable
              onPress={handlePaste}
              style={({ pressed }) => [pressed && { opacity: 0.6 }]}
            >
              <Text style={styles.pasteText}>Paste from clipboard</Text>
            </Pressable>
            {hasUrl && (
              <Pressable
                style={({ pressed }) => [styles.extractButton, pressed && { opacity: 0.85 }]}
                onPress={handleExtract}
              >
                <Text style={styles.extractButtonText}>Extract</Text>
              </Pressable>
            )}
          </View>
        </View>
      </KeyboardAvoidingView>

      {/* ── Pill tab bar ──────────────────────────────────────────── */}
      <View style={[styles.tabBarOuter, { paddingBottom: insets.bottom + 16 }]}>
        <View style={styles.tabBarPill}>
          <Pressable
            style={({ pressed }) => [styles.tabItem, pressed && { opacity: 0.7 }]}
            onPress={() => router.back()}
          >
            <Image source={TAB_HAMBURGER} style={styles.tabIcon} />
            <Text style={styles.tabLabel}>Recipes</Text>
          </Pressable>
          <View style={styles.addPill}>
            <Image source={TAB_PLUS} style={styles.tabPlusIcon} />
          </View>
          <Pressable style={styles.tabItem}>
            <Image source={TAB_USER} style={styles.tabIcon} />
            <Text style={styles.tabLabel}>Profile</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#fffcbc' },

  // Top illustration band
  topArt: { overflow: 'hidden', backgroundColor: '#fffcbc' },

  // Content
  kav: { flex: 1 },
  content: { paddingHorizontal: 16, paddingTop: 24, gap: 14, flex: 1 },

  // Title
  titleBlock: { gap: 8 },
  title: {
    fontFamily: serif,
    fontSize: 32,
    fontWeight: '400',
    color: '#1a1a1a',
    lineHeight: 38,
  },
  subtitle: { fontSize: 14, fontWeight: '500', color: '#1a1a1a', lineHeight: 20 },

  // Input group
  inputGroup: { gap: 8 },
  inputLabel: { fontSize: 12, color: '#000' },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderBottomWidth: 2,
    borderColor: '#000',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 12,
    color: '#000',
  },

  // Action row
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  actionRowActive: { justifyContent: 'space-between' },
  pasteText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#000',
    textDecorationLine: 'underline',
  },
  extractButton: {
    backgroundColor: '#FFF312',
    borderRadius: 99,
    borderWidth: 2,
    borderBottomWidth: 5,
    borderColor: '#000',
    paddingVertical: 20,
    paddingHorizontal: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  extractButtonText: { fontSize: 16, fontWeight: '600', color: '#1a1a1a' },

  // Pill tab bar
  tabBarOuter: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingTop: 16,
    paddingHorizontal: 16,
  },
  tabBarPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 24,
    paddingVertical: 8,
    backgroundColor: '#fff',
    borderRadius: 999,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 8,
  },
  tabItem: { flex: 1, alignItems: 'center', gap: 4, paddingVertical: 4 },
  tabLabel: { fontSize: 12, color: '#1a1a1a' },
  tabIcon: { width: 32, height: 32 },
  tabPlusIcon: { width: 28, height: 28 },
  addPill: {
    width: 58,
    height: 58,
    borderRadius: 99,
    backgroundColor: '#FFF312',
    borderWidth: 2,
    borderBottomWidth: 5,
    borderColor: '#000',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
});
