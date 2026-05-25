import { Stack, useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { SERVER_URL } from '@/lib/config';

const HEADER_ART = require('../assets/header-art.png');
const EMPTY_ILLUSTRATION = require('../assets/empty-illustration.png');
const TAB_HAMBURGER = require('../assets/tab-hamburger.png');
const TAB_PLUS = require('../assets/tab-plus.png');
const TAB_USER = require('../assets/tab-user.png');

type SortOption = 'date' | 'az' | 'viewed';
const SORT_LABELS: Record<SortOption, string> = {
  date: 'Date',
  az: 'A-Z',
  viewed: 'Recently viewed',
};

type RecipeItem = {
  id: string;
  title: string;
  source_platform: 'youtube' | 'instagram' | 'other';
  source_url: string;
  author?: string;
  thumbnail_url: string | null;
  ingredients: string[];
  steps: string[];
  created_at: string;
};

const serif = 'PPEditorialNew';

function getYouTubeThumbnail(url: string): string | null {
  const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/shorts\/)([^&?/\s]+)/);
  return match ? `https://img.youtube.com/vi/${match[1]}/hqdefault.jpg` : null;
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

const BADGE: Record<string, { bg: string; border: string; label: string }> = {
  youtube:   { bg: '#ffdfdf', border: '#e80000', label: 'YouTube' },
  instagram: { bg: '#faebd6', border: '#ff9c12', label: 'Instagram' },
  other:     { bg: '#d8e8f7', border: '#185fa5', label: 'Website' },
};

function PlatformBadge({ platform }: { platform: string }) {
  const b = BADGE[platform] ?? BADGE.other;
  return (
    <View style={[styles.badge, { backgroundColor: b.bg, borderColor: b.border }]}>
      <Text style={styles.badgeText}>{b.label}</Text>
    </View>
  );
}

function RecipeCard({ item, onPress }: { item: RecipeItem; onPress: () => void }) {
  const thumb =
    item.source_platform === 'youtube'
      ? getYouTubeThumbnail(item.source_url)
      : item.thumbnail_url;

  return (
    <Pressable
      style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
      onPress={onPress}
    >
      <View style={styles.thumb}>
        {thumb ? (
          <Image source={{ uri: thumb }} style={StyleSheet.absoluteFill} resizeMode="cover" />
        ) : (
          <View style={[StyleSheet.absoluteFill, styles.thumbPlaceholder]} />
        )}
        <PlatformBadge platform={item.source_platform} />
      </View>
      <View style={styles.cardBody}>
        <Text style={styles.cardTitle} numberOfLines={2}>{item.title}</Text>
        <Text style={styles.cardMeta}>
          {item.ingredients.length} ingredients · {item.steps.length} steps
        </Text>
        <Text style={styles.cardMeta}>Uploaded {timeAgo(item.created_at)}</Text>
      </View>
    </Pressable>
  );
}

const ILLUSTRATION_H = 108; // extra height below status bar

export default function HomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { height: screenHeight } = useWindowDimensions();
  const [recipes, setRecipes] = useState<RecipeItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState<SortOption>('date');
  const [showSort, setShowSort] = useState(false);

  // Total illustration band height (status bar + illustrated strip)
  const illustrationHeight = ILLUSTRATION_H + insets.top;
  // Where the dropdown top edge should sit (below sticky title row sort button)
  const dropdownTop = insets.top + ILLUSTRATION_H;

  useFocusEffect(
    useCallback(() => {
      let active = true;
      async function load() {
        try {
          const res = await fetch(`${SERVER_URL}/recipes`);
          if (!res.ok) throw new Error('Failed');
          const data: RecipeItem[] = await res.json();
          if (active) setRecipes(data);
        } catch {
          // server offline — keep whatever we have
        } finally {
          if (active) setLoading(false);
        }
      }
      load();
      return () => { active = false; };
    }, [])
  );

  const sortedRecipes = useMemo(() => {
    if (sortBy === 'az') return [...recipes].sort((a, b) => a.title.localeCompare(b.title));
    return recipes; // 'date' = server default (desc); 'viewed' falls back to date
  }, [recipes, sortBy]);

  function openAdd() {
    router.push('/add');
  }

  // Sticky title row — paddingTop accounts for status bar so text sits below it
  const listHeader = (
    <View style={[styles.titleRow, { paddingTop: insets.top + 16 }]}>
      <Text style={styles.screenTitle}>My Recipes</Text>
      <Pressable
        style={styles.sortButton}
        onPress={() => setShowSort(v => !v)}
        hitSlop={8}
      >
        <Text style={styles.sortLabel}>Sort: {SORT_LABELS[sortBy]}</Text>
      </Pressable>
    </View>
  );

  return (
    <View style={styles.root}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* ── Full-screen illustration — behind everything ───────────────── */}
      <View style={styles.illustrationBg}>
        <Image source={HEADER_ART} style={StyleSheet.absoluteFill} resizeMode="cover" />
      </View>

      {/* ── Recipe list — full screen, transparent so illustration peeks through ── */}
      {loading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#FFF312" />
        </View>
      )}
      <FlatList
        data={sortedRecipes}
        keyExtractor={(item) => item.id}
        style={styles.list}
        contentContainerStyle={[
          styles.listContent,
          { paddingTop: illustrationHeight, minHeight: illustrationHeight + screenHeight },
        ]}
        showsVerticalScrollIndicator={false}
        stickyHeaderIndices={[0]}
        ListHeaderComponent={listHeader}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        ListEmptyComponent={
          !loading ? (
            <View style={styles.emptyCard}>
              <Image
                source={EMPTY_ILLUSTRATION}
                style={styles.emptyIllustration}
                resizeMode="contain"
              />
              <Text style={styles.emptyText}>
                {'Start sharing from your favourite social media apps onto Munchies or paste in a URL link to start saving recipes!'}
              </Text>
              <Pressable
                style={({ pressed }) => [styles.addButton, pressed && { opacity: 0.85 }]}
                onPress={openAdd}
              >
                <Text style={styles.addButtonText}>Add a recipe</Text>
              </Pressable>
            </View>
          ) : null
        }
        renderItem={({ item }) => (
          <RecipeCard item={item} onPress={() => router.push(`/recipe/${item.id}`)} />
        )}
        ListFooterComponent={<View style={{ backgroundColor: '#fff', height: screenHeight }} />}
      />

      {/* ── Sort dropdown ──────────────────────────────────────────────── */}
      {showSort && (
        <>
          <Pressable
            style={[StyleSheet.absoluteFill, styles.sortBackdrop]}
            onPress={() => setShowSort(false)}
          />
          <View style={[styles.sortDropdown, { top: dropdownTop }]}>
            {(['date', 'az', 'viewed'] as const).map((opt) => (
              <Pressable
                key={opt}
                onPress={() => { setSortBy(opt); setShowSort(false); }}
                style={({ pressed }) => [pressed && { opacity: 0.6 }]}
              >
                <Text style={[styles.sortOption, sortBy === opt && styles.sortOptionActive]}>
                  {SORT_LABELS[opt]}
                </Text>
              </Pressable>
            ))}
          </View>
        </>
      )}

      {/* ── Floating pill tab bar ──────────────────────────────────────── */}
      <View style={[styles.tabBarOuter, { paddingBottom: insets.bottom + 16 }]}>
        <View style={styles.tabBarPill}>
          <View style={styles.tabItem}>
            <Image source={TAB_HAMBURGER} style={styles.tabIcon} />
            <Text style={styles.tabLabel}>Recipes</Text>
          </View>
          <Pressable
            style={({ pressed }) => [styles.addPill, pressed && { opacity: 0.85 }]}
            onPress={openAdd}
          >
            <Image source={TAB_PLUS} style={styles.tabPlusIcon} />
          </Pressable>
          <View style={styles.tabItem}>
            <Image source={TAB_USER} style={styles.tabIcon} />
            <Text style={styles.tabLabel}>Profile</Text>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  // Root is white — fills card gaps when scrolled past illustration
  root: { flex: 1, backgroundColor: '#fff' },

  // Full-screen illustration layer (behind FlatList)
  illustrationBg: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    overflow: 'hidden',
    backgroundColor: '#fffcbc',
  },

  loadingOverlay: {
    position: 'absolute',
    top: '50%',
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 5,
  },

  // FlatList — full screen, transparent so illustration shows through paddingTop
  list: { flex: 1, backgroundColor: 'transparent' },
  listContent: {},

  // Title row (sticky at top) — full-width white with own horizontal padding
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 32,
    backgroundColor: '#fff',
  },
  screenTitle: {
    fontFamily: serif,
    fontSize: 32,
    fontWeight: '400',
    color: '#1a1a1a',
    lineHeight: 38,
  },
  sortButton: { flexDirection: 'row', alignItems: 'center' },
  sortLabel: { fontSize: 14, fontWeight: '500', color: '#1a1a1a' },

  // Recipe card — full-width white so no transparent holes expose the illustration
  card: {
    flexDirection: 'row',
    gap: 16,
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    backgroundColor: '#fff',
  },
  // White gap between cards — fills the space that would otherwise expose illustration
  separator: { height: 8, backgroundColor: '#fff' },
  cardPressed: { opacity: 0.85 },

  // Thumbnail
  thumb: { width: 72, height: 90, overflow: 'hidden', borderRadius: 4 },
  thumbPlaceholder: { backgroundColor: '#f0f0f0' },

  // Source badge
  badge: {
    position: 'absolute',
    bottom: 4,
    left: 4,
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 12,
    borderWidth: 1,
  },
  badgeText: { fontSize: 10, fontWeight: '600', color: '#000' },

  // Card text
  cardBody: { flex: 1, gap: 4 },
  cardTitle: {
    fontFamily: serif,
    fontSize: 20,
    fontWeight: '400',
    color: '#1a1a1a',
    lineHeight: 24,
  },
  cardMeta: { fontSize: 12, color: '#808080' },

  // Sort dropdown
  sortBackdrop: { zIndex: 10 },
  sortDropdown: {
    position: 'absolute',
    right: 16,
    zIndex: 11,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 8,
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 8,
  },
  sortOption: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1a1a1a',
    paddingVertical: 2,
    paddingHorizontal: 4,
  },
  sortOptionActive: { fontWeight: '700' },

  // Empty state card
  emptyCard: {
    backgroundColor: '#fffcbc',
    borderRadius: 12,
    padding: 20,
    gap: 10,
    alignItems: 'center',
    marginHorizontal: 16,
  },
  emptyIllustration: { width: 105, height: 143 },
  emptyText: { fontSize: 12, color: '#1a1a1a', textAlign: 'center', lineHeight: 18 },
  addButton: {
    backgroundColor: '#FFF312',
    borderRadius: 99,
    borderWidth: 2,
    borderBottomWidth: 5,
    borderColor: '#000',
    paddingVertical: 20,
    paddingHorizontal: 40,
    alignItems: 'center',
    alignSelf: 'stretch',
  },
  addButtonText: { fontSize: 16, fontWeight: '600', color: '#1a1a1a', textAlign: 'center' },

  // Pill tab bar
  tabBarOuter: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingTop: 16,
    paddingHorizontal: 16,
    zIndex: 5,
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
