import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Linking,
  Platform,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Phone, MessageCircle, MapPin, Clock, Instagram } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import Colors from '@/constants/colors';

const contactItems = [
  {
    id: 'phone',
    icon: Phone,
    title: 'Телефон',
    value: '+7 (964) 447-20-20',
    action: 'tel:+79644472020',
  },
  {
    id: 'whatsapp',
    icon: MessageCircle,
    title: 'WhatsApp',
    value: 'Написать в WhatsApp',
    action: 'https://wa.me/79644472020',
  },
  {
    id: 'instagram',
    icon: Instagram,
    title: 'Instagram',
    value: '@pitmaster.vdk',
    action: 'https://instagram.com/pitmaster.vdk',
  },
];

export default function ContactsScreen() {
  const handlePress = async (action: string) => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    try {
      await Linking.openURL(action);
    } catch (error) {
      console.log('Could not open URL:', error);
    }
  };

  return (
    <View style={styles.container}>
      <SafeAreaView edges={['top']} style={styles.safeArea}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          <View style={styles.header}>
            <Image
              source={require('@/assets/images/logo.png')}
              style={styles.logoImage}
              resizeMode="contain"
            />
            <Text style={styles.subtitle}>Настоящий техасский BBQ во Владивостоке</Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Связаться с нами</Text>
            <View style={styles.contactList}>
              {contactItems.map((item) => (
                <TouchableOpacity
                  key={item.id}
                  style={styles.contactCard}
                  onPress={() => handlePress(item.action)}
                  activeOpacity={0.7}
                >
                  <View style={styles.contactIcon}>
                    <item.icon size={22} color={Colors.primary} />
                  </View>
                  <View style={styles.contactInfo}>
                    <Text style={styles.contactTitle}>{item.title}</Text>
                    <Text style={styles.contactValue}>{item.value}</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Информация</Text>
            <View style={styles.infoCard}>
              <View style={styles.infoRow}>
                <View style={styles.infoIcon}>
                  <MapPin size={20} color={Colors.secondary} />
                </View>
                <View style={styles.infoContent}>
                  <Text style={styles.infoLabel}>Адрес</Text>
                  <Text style={styles.infoValue}>
                    г. Владивосток, ул. Волгоградская, дом 9 ст. 1
                  </Text>
                </View>
              </View>

              <View style={styles.infoDivider} />

              <View style={styles.infoRow}>
                <View style={styles.infoIcon}>
                  <Clock size={20} color={Colors.secondary} />
                </View>
                <View style={styles.infoContent}>
                  <Text style={styles.infoLabel}>Время работы</Text>
                  <Text style={styles.infoValue}>
                    Ежедневно с 11:00 до 22:00{'\n'}Доставка от 60 минут
                  </Text>
                </View>
              </View>
            </View>
          </View>

          <View style={styles.aboutSection}>
            <Text style={styles.aboutTitle}>О нас</Text>
            <Text style={styles.aboutText}>
              PIT MASTER — это настоящий американский BBQ во Владивостоке. Мы готовим
              мясо по классическим техасским рецептам: медленное томление на дровах,
              никаких полуфабрикатов, только качественное мясо и время.
            </Text>
            <Text style={styles.aboutText}>
              Наш шеф-повар прошёл обучение в Техасе и привёз лучшие традиции
              американского барбекю на Дальний Восток.
            </Text>
          </View>

          <View style={styles.legalSection}>
            <Text style={styles.legalTitle}>Реквизиты</Text>
            <Text style={styles.legalText}>ИП Кольцов Владимир Андреевич</Text>
            <Text style={styles.legalText}>ИНН: 253813519067</Text>
            <Text style={styles.legalText}>ОГРНИП: 323253600076420</Text>
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
    paddingVertical: 24,
    alignItems: 'center',
  },
  logoImage: {
    width: 120,
    height: 100,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  section: {
    paddingHorizontal: 16,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: Colors.text,
    marginBottom: 12,
  },
  contactList: {
    gap: 10,
  },
  contactCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.card,
    padding: 16,
    borderRadius: 14,
  },
  contactIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: Colors.surfaceLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  contactInfo: {
    flex: 1,
  },
  contactTitle: {
    fontSize: 13,
    color: Colors.textMuted,
    marginBottom: 2,
  },
  contactValue: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.text,
  },
  infoCard: {
    backgroundColor: Colors.card,
    borderRadius: 16,
    padding: 16,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  infoIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: Colors.surfaceLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  infoContent: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 13,
    color: Colors.textMuted,
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 15,
    color: Colors.text,
    lineHeight: 22,
  },
  infoDivider: {
    height: 1,
    backgroundColor: Colors.border,
    marginVertical: 16,
  },
  aboutSection: {
    paddingHorizontal: 16,
    paddingVertical: 20,
    backgroundColor: Colors.surface,
    marginHorizontal: 16,
    borderRadius: 16,
  },
  aboutTitle: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: Colors.text,
    marginBottom: 12,
  },
  aboutText: {
    fontSize: 14,
    color: Colors.textSecondary,
    lineHeight: 22,
    marginBottom: 12,
  },
  legalSection: {
    paddingHorizontal: 16,
    paddingVertical: 20,
    marginTop: 16,
  },
  legalTitle: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.textMuted,
    marginBottom: 8,
  },
  legalText: {
    fontSize: 13,
    color: Colors.textMuted,
    lineHeight: 20,
  },
});
