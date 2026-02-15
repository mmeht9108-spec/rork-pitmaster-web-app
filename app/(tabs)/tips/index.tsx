import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Flame, CookingPot, Zap, LayoutGrid, ChevronDown, ChevronUp } from 'lucide-react-native';
import Colors from '@/constants/colors';
import { heatingTips } from '@/mocks/products';

const iconMap: Record<string, React.ReactNode> = {
  'flame': <Flame size={24} color={Colors.secondary} />,
  'cooking-pot': <CookingPot size={24} color={Colors.secondary} />,
  'zap': <Zap size={24} color={Colors.secondary} />,
  'grid-3x3': <LayoutGrid size={24} color={Colors.secondary} />,
};

export default function TipsScreen() {
  const [expandedId, setExpandedId] = useState<string | null>(heatingTips[0]?.id || null);

  const toggleExpand = (id: string) => {
    setExpandedId((prev) => (prev === id ? null : id));
  };

  return (
    <View style={styles.container}>
      <SafeAreaView edges={['top']} style={styles.safeArea}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          <View style={styles.header}>
            <Text style={styles.title}>Разогрев</Text>
            <Text style={styles.subtitle}>
              Как правильно разогреть наши блюда, чтобы сохранить вкус и сочность
            </Text>
          </View>

          <View style={styles.tipsContainer}>
            {heatingTips.map((tip) => {
              const isExpanded = expandedId === tip.id;
              return (
                <TouchableOpacity
                  key={tip.id}
                  style={[styles.tipCard, isExpanded && styles.tipCardExpanded]}
                  onPress={() => toggleExpand(tip.id)}
                  activeOpacity={0.8}
                >
                  <View style={styles.tipHeader}>
                    <View style={styles.tipIconContainer}>
                      {iconMap[tip.icon] || <Flame size={24} color={Colors.secondary} />}
                    </View>
                    <Text style={styles.tipTitle}>{tip.title}</Text>
                    {isExpanded ? (
                      <ChevronUp size={20} color={Colors.textMuted} />
                    ) : (
                      <ChevronDown size={20} color={Colors.textMuted} />
                    )}
                  </View>

                  {isExpanded && (
                    <View style={styles.tipContent}>
                      {tip.steps.map((step, index) => (
                        <View key={index} style={styles.stepRow}>
                          <View style={styles.stepNumber}>
                            <Text style={styles.stepNumberText}>{index + 1}</Text>
                          </View>
                          <Text style={styles.stepText}>{step}</Text>
                        </View>
                      ))}
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>

          <View style={styles.proTipCard}>
            <View style={styles.proTipHeader}>
              <Flame size={20} color={Colors.primary} />
              <Text style={styles.proTipTitle}>Совет от шефа</Text>
            </View>
            <Text style={styles.proTipText}>
              Достаньте мясо из холодильника за 20-30 минут до разогрева. Это позволит
              ему равномерно прогреться и сохранить сочность.
            </Text>
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  safeArea: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 100,
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: '800' as const,
    color: Colors.text,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    color: Colors.textSecondary,
    lineHeight: 22,
  },
  tipsContainer: {
    paddingHorizontal: 16,
    gap: 12,
  },
  tipCard: {
    backgroundColor: Colors.card,
    borderRadius: 16,
    padding: 16,
    overflow: 'hidden',
  },
  tipCardExpanded: {
    backgroundColor: Colors.surface,
  },
  tipHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  tipIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: Colors.surfaceLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  tipTitle: {
    flex: 1,
    fontSize: 17,
    fontWeight: '600' as const,
    color: Colors.text,
  },
  tipContent: {
    marginTop: 16,
    gap: 12,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  stepNumber: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    marginTop: 2,
  },
  stepNumberText: {
    color: Colors.text,
    fontSize: 12,
    fontWeight: '700' as const,
  },
  stepText: {
    flex: 1,
    fontSize: 14,
    color: Colors.textSecondary,
    lineHeight: 22,
  },
  proTipCard: {
    marginHorizontal: 16,
    marginTop: 24,
    backgroundColor: 'rgba(196, 30, 36, 0.15)',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(196, 30, 36, 0.3)',
  },
  proTipHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  proTipTitle: {
    fontSize: 15,
    fontWeight: '700' as const,
    color: Colors.primary,
  },
  proTipText: {
    fontSize: 14,
    color: Colors.textSecondary,
    lineHeight: 22,
  },
});
