import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { SERVER_URL } from '@/lib/config';

interface Recipe {
  id: string;
  title: string;
  source_url: string;
  ingredients: string[];
  steps: string[];
}

function parseIngredient(raw: string): { qty: string; name: string } {
  const match = raw.match(/^([\d\/\s\.]+\s*(?:g|kg|ml|l|oz|lb|cups?|tsps?|tbsps?|pinch|to\s+taste)?\.?)\s+(.+)$/i);
  if (match?.[2]) return { qty: match[1].trim(), name: match[2].trim() };
  return { qty: '', name: raw };
}

function SectionHeader({ title }: { title: string }) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.sectionLine} />
    </View>
  );
}

export default function EditRecipeScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [title, setTitle] = useState('');
  const [ingredients, setIngredients] = useState<{ qty: string; name: string }[]>([]);
  const [steps, setSteps] = useState<string[]>([]);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`${SERVER_URL}/recipe/${id}`);
        if (!res.ok) throw new Error('Not found');
        const data: Recipe = await res.json();
        setRecipe(data);
        setTitle(data.title);
        setIngredients(data.ingredients.map(parseIngredient));
        setSteps(data.steps);
      } catch {
        // fall through — will show empty form
      } finally {
        setLoading(false);
      }
    }
    if (id) load();
  }, [id]);

  async function handleSave() {
    if (!id || saving) return;
    setSaving(true);
    try {
      // Filter out fully empty ingredient rows and empty steps
      const filteredIngredients = ingredients
        .filter(ing => ing.qty.trim() || ing.name.trim())
        .map(ing => [ing.qty.trim(), ing.name.trim()].filter(Boolean).join(' '));

      const filteredSteps = steps.filter(s => s.trim());

      const res = await fetch(`${SERVER_URL}/recipe/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: title.trim(), ingredients: filteredIngredients, steps: filteredSteps }),
      });
      if (!res.ok) throw new Error('Save failed');
      router.back();
    } catch {
      // silent — could show an error toast in future
    } finally {
      setSaving(false);
    }
  }

  function updateIngredient(index: number, field: 'qty' | 'name', value: string) {
    setIngredients(prev => prev.map((ing, i) => i === index ? { ...ing, [field]: value } : ing));
  }

  function updateStep(index: number, value: string) {
    setSteps(prev => prev.map((s, i) => i === index ? value : s));
  }

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#FFF312" />
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* Back button */}
      <Pressable
        style={[styles.backButton, { top: 66 }]}
        onPress={() => router.back()}
        hitSlop={8}
      >
        <Text style={styles.backArrow}>{'←'}</Text>
      </Pressable>

      <KeyboardAvoidingView
        style={styles.kav}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={[styles.content, { paddingBottom: 100 + insets.bottom }]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Title */}
          <Text style={styles.pageTitle}>Edit recipe</Text>

          {/* Recipe name */}
          <View style={styles.nameSection}>
            <Text style={styles.inputLabel}>Name</Text>
            <TextInput
              style={styles.textInput}
              value={title}
              onChangeText={setTitle}
              autoCapitalize="words"
            />
          </View>

          {/* Ingredients */}
          <View style={styles.section}>
            <SectionHeader title="Ingredients" />
            <View style={styles.ingredientsGrid}>
              {ingredients.map((ing, i) => (
                <View key={i} style={styles.ingredientRow}>
                  <TextInput
                    style={[styles.textInput, styles.nameInput]}
                    value={ing.name}
                    onChangeText={v => updateIngredient(i, 'name', v)}
                    placeholder="Ingredient"
                    placeholderTextColor="#aaa"
                  />
                  <TextInput
                    style={[styles.textInput, styles.qtyInput]}
                    value={ing.qty}
                    onChangeText={v => updateIngredient(i, 'qty', v)}
                    placeholder="Qty"
                    placeholderTextColor="#aaa"
                  />
                </View>
              ))}
            </View>
            <Pressable
              style={({ pressed }) => [styles.addButton, pressed && { opacity: 0.7 }]}
              onPress={() => setIngredients(prev => [...prev, { qty: '', name: '' }])}
            >
              <Text style={styles.addButtonText}>Add ingredients</Text>
            </Pressable>
          </View>

          {/* Steps */}
          <View style={styles.section}>
            <SectionHeader title="Steps" />
            <View style={styles.stepsGrid}>
              {steps.map((step, i) => (
                <View key={i} style={styles.stepField}>
                  <Text style={styles.stepLabel}>Step {i + 1}</Text>
                  <TextInput
                    style={[styles.textInput, styles.stepInput]}
                    value={step}
                    onChangeText={v => updateStep(i, v)}
                    multiline
                    textAlignVertical="top"
                  />
                </View>
              ))}
            </View>
            <Pressable
              style={({ pressed }) => [styles.addButton, pressed && { opacity: 0.7 }]}
              onPress={() => setSteps(prev => [...prev, ''])}
            >
              <Text style={styles.addButtonText}>Add steps</Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Save button */}
      <View style={[styles.saveBar, { paddingBottom: insets.bottom + 32 }]}>
        <Pressable
          style={({ pressed }) => [styles.saveButton, pressed && { opacity: 0.85 }, saving && { opacity: 0.6 }]}
          onPress={handleSave}
          disabled={saving}
        >
          <Text style={styles.saveText}>{saving ? 'Saving…' : 'Save edits'}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root:    { flex: 1, backgroundColor: '#fff' },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  kav:     { flex: 1 },

  // Back button
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
  content: { paddingHorizontal: 16, paddingTop: 78 },

  // Page title
  pageTitle: {
    fontFamily: 'PPEditorialNew',
    fontSize: 32,
    fontWeight: '400',
    color: '#1a1a1a',
    lineHeight: 38,
    textAlign: 'center',
    marginBottom: 8,
  },

  // Name section
  nameSection: { paddingVertical: 16, gap: 8 },
  inputLabel: { fontSize: 12, color: '#1a1a1a' },

  // Shared text input
  textInput: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderBottomWidth: 2,
    borderColor: '#1a1a1a',
    borderRadius: 12,
    paddingLeft: 16,
    paddingRight: 8,
    paddingVertical: 10,
    fontSize: 12,
    color: '#1a1a1a',
    height: 35,
  },

  // Section
  section: { paddingVertical: 16, gap: 8 },
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

  // Ingredients grid
  ingredientsGrid: { gap: 8 },
  ingredientRow: { flexDirection: 'row', gap: 8 },
  nameInput: { flex: 2 },
  qtyInput: { flex: 1 },

  // Steps
  stepsGrid: { gap: 8 },
  stepField: { gap: 8 },
  stepLabel: { fontSize: 12, color: '#1a1a1a' },
  stepInput: {
    height: undefined,
    minHeight: 50,
    paddingTop: 10,
    paddingBottom: 10,
  },

  // Add more button (dashed tertiary)
  addButton: {
    height: 35,
    borderRadius: 99,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: '#1a1a1a',
    backgroundColor: 'rgba(0,0,0,0.03)',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  addButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1a1a1a',
  },

  // Save bar
  saveBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    paddingTop: 16,
    backgroundColor: '#fff',
  },
  saveButton: {
    backgroundColor: '#FFF312',
    borderRadius: 99,
    borderWidth: 2,
    borderBottomWidth: 5,
    borderColor: '#1a1a1a',
    height: 57,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveText: { fontSize: 14, fontWeight: '500', color: '#1a1a1a' },
});
