import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { SERVER_URL } from '@/lib/config';

const RECIPE_ART = require('../../../assets/recipe-card-art.png');

interface Recipe {
  id: string;
  title: string;
  source_url: string;
  source_platform?: 'youtube' | 'instagram' | 'other';
  author?: string;
  thumbnail_url?: string | null;
  ingredients: string[];
  steps: string[];
  created_at?: string;
}

function getYouTubeThumbnail(url: string): string | null {
  const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/shorts\/)([^&?/\s]+)/);
  return match ? `https://img.youtube.com/vi/${match[1]}/hqdefault.jpg` : null;
}

function platformLabel(platform?: string): string {
  if (platform === 'youtube') return 'YouTube';
  if (platform === 'instagram') return 'Instagram';
  return 'Web';
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function parseIngredient(raw: string): { name: string; qty: string } {
  const match = raw.match(/^([\d\/\s\.]+\s*(?:g|kg|ml|l|oz|lb|cups?|tsps?|tbsps?|pinch|to\s+taste)?\.?)\s+(.+)$/i);
  if (match?.[2]) return { qty: match[1].trim(), name: match[2].trim() };
  return { name: raw, qty: '' };
}

function SectionHeader({ title }: { title: string }) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.sectionLine} />
    </View>
  );
}

export default function RecipeCardScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    if (!id || deleting) return;
    setDeleting(true);
    try {
      const res = await fetch(`${SERVER_URL}/recipe/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error(`Server returned ${res.status}`);
      router.navigate('/');
    } catch {
      setDeleting(false);
    }
  }

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`${SERVER_URL}/recipe/${id}`);
        if (!res.ok) throw new Error('Recipe not found');
        setRecipe(await res.json());
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load recipe');
      }
    }
    if (id) load();
  }, [id]);

  if (error) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>{error}</Text>
      </View>
    );
  }

  if (!recipe) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#FFF312" />
      </View>
    );
  }

  const thumbnail = getYouTubeThumbnail(recipe.source_url) ?? recipe.thumbnail_url ?? null;
  const parsedIngredients = recipe.ingredients.map(parseIngredient);
  const isVideo = recipe.source_platform === 'youtube' || recipe.source_platform === 'instagram';
  const ctaLabel = isVideo ? 'Watch recipe video' : 'Go to the website';

  const metaParts = [
    platformLabel(recipe.source_platform),
    recipe.author ?? null,
    recipe.created_at ? timeAgo(recipe.created_at) : null,
  ].filter(Boolean) as string[];

  return (
    <View style={styles.root}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* Back button — absolute over hero */}
      <Pressable
        style={[styles.backButton, { top: 66 }]}
        onPress={() => router.back()}
        hitSlop={8}
      >
        <Text style={styles.backArrow}>{'←'}</Text>
      </Pressable>

      {/* ── Scrollable content (hero inside scroll) ─────────────────── */}
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={{ paddingBottom: 120 + insets.bottom }}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero */}
        <View style={styles.hero}>
          <View style={[StyleSheet.absoluteFill, styles.heroBg]} />
          {thumbnail ? (
            <Image source={{ uri: thumbnail }} style={StyleSheet.absoluteFill} resizeMode="cover" />
          ) : (
            <Image source={RECIPE_ART} style={StyleSheet.absoluteFill} resizeMode="cover" />
          )}
        </View>

        {/* Content */}
        <View style={styles.content}>
          {/* Title + meta */}
          <View style={styles.titleBlock}>
            <Text style={styles.title}>{recipe.title}</Text>
            <View style={styles.metaRow}>
              {metaParts.map((part, i) => (
                <Text key={i} style={styles.meta}>
                  {i > 0 ? ` · ${part}` : part}
                </Text>
              ))}
            </View>
          </View>

          {/* Edit recipe button */}
          <Pressable
            style={({ pressed }) => [styles.editButton, pressed && { opacity: 0.7 }]}
            onPress={() => router.push(`/recipe/${id}/edit`)}
          >
            <Text style={styles.editButtonText}>Edit recipe</Text>
          </Pressable>

          {/* Ingredients */}
          <View style={styles.section}>
            <SectionHeader title="Ingredients" />
            <View style={styles.ingredientsTable}>
              {parsedIngredients.map((ing, i) => (
                <View
                  key={i}
                  style={[styles.ingredientRow, i % 2 === 1 && styles.ingredientRowAlt]}
                >
                  <Text style={styles.ingredientName}>{ing.name}</Text>
                  <Text style={styles.ingredientQty}>{ing.qty}</Text>
                </View>
              ))}
            </View>
          </View>

          {/* Steps */}
          <View style={styles.section}>
            <SectionHeader title="Steps" />
            <View style={styles.stepsGrid}>
              {recipe.steps.map((step, i) => (
                <View key={i} style={styles.stepRow}>
                  <View style={styles.stepBadge}>
                    <Text style={styles.stepNumber}>{i + 1}</Text>
                  </View>
                  <Text style={styles.stepText}>{step}</Text>
                </View>
              ))}
            </View>
          </View>

          {/* Remove recipe button */}
          <Pressable
            style={({ pressed }) => [styles.removeButton, (pressed || deleting) && { opacity: 0.7 }]}
            onPress={handleDelete}
            disabled={deleting}
          >
            <Text style={styles.removeButtonText}>{deleting ? 'Removing…' : 'Remove recipe'}</Text>
          </Pressable>
        </View>
      </ScrollView>

      {/* ── Floating CTA ─────────────────────────────────────────────── */}
      <View style={[styles.bottomBar, { paddingBottom: insets.bottom + 32 }]}>
        <Pressable
          style={({ pressed }) => [styles.ctaButton, pressed && { opacity: 0.85 }]}
          onPress={() => Linking.openURL(recipe.source_url)}
        >
          <Text style={styles.ctaText}>{ctaLabel}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root:      { flex: 1, backgroundColor: '#fff' },
  centered:  { flex: 1, alignItems: 'center', justifyContent: 'center' },
  errorText: { fontSize: 15, color: '#c0392b' },

  // Back button (absolute over screen)
  backButton: {
    position: 'absolute',
    left: 15,
    width: 58,
    height: 58,
    borderRadius: 99,
    backgroundColor: '#FFF312',
    borderWidth: 2,
    borderBottomWidth: 5,
    borderColor: '#000',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  backArrow: { fontSize: 22, color: '#000', fontWeight: '700', lineHeight: 26 },

  // Scroll
  scroll: { flex: 1 },

  // Hero (inside scroll)
  hero:   { height: 170, overflow: 'hidden' },
  heroBg: { backgroundColor: '#fffcbc' },

  // Content
  content: { paddingHorizontal: 16, paddingTop: 32 },

  // Title block
  titleBlock: { gap: 8, marginBottom: 8 },
  title: {
    fontFamily: 'PPEditorialNew',
    fontSize: 32,
    fontWeight: '400',
    color: '#1a1a1a',
    lineHeight: 38,
  },
  metaRow: { flexDirection: 'row', flexWrap: 'wrap' },
  meta:    { fontSize: 12, color: '#1a1a1a' },

  // Sections
  section: { paddingVertical: 16 },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  sectionTitle: {
    fontFamily: 'PPEditorialNew',
    fontSize: 24,
    fontWeight: '400',
    color: '#1a1a1a',
    lineHeight: 29,
  },
  sectionLine: { flex: 1, height: 1, backgroundColor: '#1a1a1a' },

  // Ingredients table — name first, qty second
  ingredientsTable: { marginTop: 8 },
  ingredientRow: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 4,
    paddingVertical: 6,
  },
  ingredientRowAlt: { backgroundColor: '#fffcbc' },
  ingredientName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1a1a1a',
    flexShrink: 1,
  },
  ingredientQty: {
    fontSize: 14,
    fontWeight: '300',
    color: '#1a1a1a',
  },

  // Steps
  stepsGrid: { marginTop: 8, gap: 18 },
  stepRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'flex-start',
  },
  stepBadge: {
    width: 32,
    height: 32,
    borderRadius: 99,
    backgroundColor: '#fffcbc',
    borderWidth: 1,
    borderColor: '#fff312',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  stepNumber: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1a1a1a',
  },
  stepText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
    color: '#1a1a1a',
    lineHeight: 20,
  },

  // Edit recipe — full-width dashed border pill
  editButton: {
    height: 35,
    borderRadius: 99,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: '#1a1a1a',
    backgroundColor: 'rgba(0,0,0,0.03)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
    marginVertical: 4,
  },
  editButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1a1a1a',
  },

  // Remove recipe — full-width white comic-book pill
  removeButton: {
    height: 57,
    borderRadius: 99,
    borderWidth: 2,
    borderBottomWidth: 5,
    borderColor: '#1a1a1a',
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 8,
  },
  removeButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1a1a1a',
  },

  // Bottom CTA
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    paddingTop: 40,
    backgroundColor: 'transparent',
  },
  ctaButton: {
    backgroundColor: '#FFF312',
    borderRadius: 99,
    borderWidth: 2,
    borderBottomWidth: 5,
    borderColor: '#000',
    paddingVertical: 20,
    paddingHorizontal: 40,
    alignItems: 'center',
  },
  ctaText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
  },
});
