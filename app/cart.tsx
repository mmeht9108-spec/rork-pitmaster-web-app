import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Platform,
  Alert,
  TextInput,
  KeyboardAvoidingView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Minus, Plus, Trash2, ShoppingBag, User, Phone, Mail, MapPin, Home, DoorOpen, MessageSquare } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import Colors from '@/constants/colors';
import { useCart } from '@/contexts/CartContext';

export default function CartScreen() {
  const router = useRouter();
  const { items, updateQuantity, removeFromCart, clearCart, totalPrice } = useCart();

  const [name, setName] = useState<string>('');
  const [phone, setPhone] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [address, setAddress] = useState<string>('');
  const [building, setBuilding] = useState<string>('');
  const [apartment, setApartment] = useState<string>('');
  const [comment, setComment] = useState<string>('');
  const [errors, setErrors] = useState<{ name?: string; phone?: string }>({});

  const handleQuantityChange = (productId: string, delta: number, currentQty: number) => {
    if (Platform.OS !== 'web') {
      Haptics.selectionAsync();
    }
    updateQuantity(productId, currentQty + delta);
  };

  const handleRemove = (productId: string) => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    removeFromCart(productId);
  };

  const validateForm = (): boolean => {
    const newErrors: { name?: string; phone?: string } = {};
    if (!name.trim()) {
      newErrors.name = 'Введите имя';
    }
    const cleanPhone = phone.replace(/[\s\-\(\)]/g, '');
    if (!cleanPhone || cleanPhone.length < 10) {
      newErrors.phone = 'Введите корректный номер телефона';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleCheckout = async () => {
    if (!validateForm()) {
      if (Platform.OS !== 'web') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
      return;
    }

    const botToken = process.env.EXPO_PUBLIC_TELEGRAM_BOT_TOKEN;
    const chatId = process.env.EXPO_PUBLIC_TELEGRAM_CHAT_ID;

    console.log('Starting order submission...');
    console.log('Bot token exists:', !!botToken);
    console.log('Chat ID:', chatId);

    if (!botToken || !chatId) {
      console.error('Missing Telegram credentials');
      Alert.alert(
        'Ошибка конфигурации',
        'Отсутствуют данные для отправки заказа. Обратитесь к администратору.'
      );
      return;
    }

    const orderLines = items.map(
      (item) => `• ${item.product.name} x${item.quantity} — ${item.product.price * item.quantity} ₽`
    ).join('\n');

    const message = [
      '🔥 Новый заказ!',
      '',
      `👤 Имя: ${name.trim()}`,
      `📞 Телефон: ${phone.trim()}`,
      email.trim() ? `📧 Email: ${email.trim()}` : '',
      address.trim() ? `📍 Адрес: ${address.trim()}` : '',
      building.trim() ? `🏠 Дом: ${building.trim()}` : '',
      apartment.trim() ? `🚪 Квартира: ${apartment.trim()}` : '',
      comment.trim() ? `💬 Комментарий: ${comment.trim()}` : '',
      '',
      '📦 Заказ:',
      orderLines,
      '',
      `💰 Итого: ${totalPrice} ₽`,
    ].filter(Boolean).join('\n');

    const chatIds = [String(chatId).trim(), '-1001783641782'];

    for (const cid of chatIds) {
      try {
        console.log(`Sending to Telegram chat ${cid}...`);

        const telegramResponse = await fetch(
          `https://api.telegram.org/bot${botToken}/sendMessage`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: cid,
              text: message,
              parse_mode: 'HTML',
            }),
          }
        );

        console.log(`Telegram response status for ${cid}:`, telegramResponse.status);

        const telegramData = await telegramResponse.json();
        console.log(`Telegram response data for ${cid}:`, JSON.stringify(telegramData));

        if (!telegramResponse.ok || !telegramData.ok) {
          console.warn(`Telegram send failed for ${cid}:`, telegramData?.description);
        } else {
          console.log(`Telegram message sent successfully to ${cid}!`);
        }
      } catch (telegramError) {
        console.warn(`Telegram send error for ${cid}:`, telegramError);
      }
    }

    try {
      const emailBody = [
        '<h2>🔥 Новый заказ!</h2>',
        `<p><strong>👤 Имя:</strong> ${name.trim()}</p>`,
        `<p><strong>📞 Телефон:</strong> ${phone.trim()}</p>`,
        email.trim() ? `<p><strong>📧 Email:</strong> ${email.trim()}</p>` : '',
        address.trim() ? `<p><strong>📍 Адрес:</strong> ${address.trim()}</p>` : '',
        building.trim() ? `<p><strong>🏠 Дом:</strong> ${building.trim()}</p>` : '',
        apartment.trim() ? `<p><strong>🚪 Квартира:</strong> ${apartment.trim()}</p>` : '',
        comment.trim() ? `<p><strong>💬 Комментарий:</strong> ${comment.trim()}</p>` : '',
        '<h3>📦 Заказ:</h3>',
        '<ul>',
        ...items.map(item => 
          `<li>${item.product.name} x${item.quantity} — ${item.product.price * item.quantity} ₽</li>`
        ),
        '</ul>',
        `<p><strong>💰 Итого: ${totalPrice} ₽</strong></p>`,
      ].filter(Boolean).join('\n');

      console.log('Sending email notification...');
      const emailResponse = await fetch('https://formsubmit.co/ajax/meht-91@yandex.ru', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          name: name.trim(),
          phone: phone.trim(),
          email: email.trim() || 'не указан',
          message: emailBody,
          _subject: `Новый заказ от ${name.trim()}`,
          _template: 'table',
        }),
      });

      const emailData = await emailResponse.json();
      console.log('Email response:', emailData);
    } catch (emailError) {
      console.warn('Email send error (non-critical):', emailError);
    }

    if (Platform.OS !== 'web') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
    Alert.alert(
      'Заказ оформлен',
      'Спасибо за заказ! Мы свяжемся с вами для подтверждения.',
      [
        {
          text: 'OK',
          onPress: () => {
            clearCart();
            setName('');
            setPhone('');
            setEmail('');
            setAddress('');
            setBuilding('');
            setApartment('');
            setComment('');
            setErrors({});
            router.back();
          },
        },
      ]
    );

  };

  if (items.length === 0) {
    return (
      <View style={styles.container}>
        <SafeAreaView edges={['top']} style={styles.safeArea}>
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIconContainer}>
              <ShoppingBag size={48} color={Colors.textMuted} />
            </View>
            <Text style={styles.emptyTitle}>Корзина пуста</Text>
            <Text style={styles.emptySubtitle}>
              Добавьте что-нибудь вкусное из меню
            </Text>
            <TouchableOpacity
              style={styles.browseButton}
              onPress={() => router.back()}
            >
              <Text style={styles.browseButtonText}>Перейти в меню</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <SafeAreaView edges={['top']} style={styles.safeArea}>
        <View style={styles.header}>
          <Text style={styles.title}>Корзина</Text>
          <TouchableOpacity onPress={clearCart}>
            <Text style={styles.clearButton}>Очистить</Text>
          </TouchableOpacity>
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {items.map((item) => (
            <View key={item.product.id} style={styles.cartItem}>
              <Image
                source={{ uri: item.product.image }}
                style={styles.itemImage}
              />
              <View style={styles.itemContent}>
                <View style={styles.itemHeader}>
                  <Text style={styles.itemName} numberOfLines={1}>
                    {item.product.name}
                  </Text>
                  <TouchableOpacity
                    onPress={() => handleRemove(item.product.id)}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  >
                    <Trash2 size={18} color={Colors.textMuted} />
                  </TouchableOpacity>
                </View>
                <Text style={styles.itemWeight}>{item.product.weight}</Text>
                <View style={styles.itemFooter}>
                  <Text style={styles.itemPrice}>
                    {item.product.price * item.quantity} ₽
                  </Text>
                  <View style={styles.quantityControls}>
                    <TouchableOpacity
                      style={styles.qtyButton}
                      onPress={() =>
                        handleQuantityChange(item.product.id, -1, item.quantity)
                      }
                    >
                      <Minus size={16} color={Colors.text} />
                    </TouchableOpacity>
                    <Text style={styles.qtyValue}>{item.quantity}</Text>
                    <TouchableOpacity
                      style={styles.qtyButton}
                      onPress={() =>
                        handleQuantityChange(item.product.id, 1, item.quantity)
                      }
                    >
                      <Plus size={16} color={Colors.text} />
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            </View>
          ))}
          <View style={styles.formSection}>
            <Text style={styles.formTitle}>Данные для заказа</Text>

            <View style={styles.inputWrapper}>
              <View style={styles.inputIcon}>
                <User size={18} color={Colors.textMuted} />
              </View>
              <TextInput
                style={[styles.input, errors.name ? styles.inputError : null]}
                placeholder="Имя *"
                placeholderTextColor={Colors.textMuted}
                value={name}
                onChangeText={(v) => { setName(v); if (errors.name) setErrors((e) => ({ ...e, name: undefined })); }}
                testID="input-name"
              />
            </View>
            {errors.name ? <Text style={styles.errorText}>{errors.name}</Text> : null}

            <View style={styles.inputWrapper}>
              <View style={styles.inputIcon}>
                <Phone size={18} color={Colors.textMuted} />
              </View>
              <TextInput
                style={[styles.input, errors.phone ? styles.inputError : null]}
                placeholder="Телефон *"
                placeholderTextColor={Colors.textMuted}
                value={phone}
                onChangeText={(v) => { setPhone(v); if (errors.phone) setErrors((e) => ({ ...e, phone: undefined })); }}
                keyboardType="phone-pad"
                testID="input-phone"
              />
            </View>
            {errors.phone ? <Text style={styles.errorText}>{errors.phone}</Text> : null}

            <View style={styles.inputWrapper}>
              <View style={styles.inputIcon}>
                <Mail size={18} color={Colors.textMuted} />
              </View>
              <TextInput
                style={styles.input}
                placeholder="Email (необязательно)"
                placeholderTextColor={Colors.textMuted}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                testID="input-email"
              />
            </View>

            <View style={styles.inputWrapper}>
              <View style={styles.inputIcon}>
                <MapPin size={18} color={Colors.textMuted} />
              </View>
              <TextInput
                style={styles.input}
                placeholder="Адрес (улица)"
                placeholderTextColor={Colors.textMuted}
                value={address}
                onChangeText={setAddress}
                testID="input-address"
              />
            </View>

            <View style={styles.addressRow}>
              <View style={[styles.inputWrapper, { flex: 1 }]}>
                <View style={styles.inputIcon}>
                  <Home size={18} color={Colors.textMuted} />
                </View>
                <TextInput
                  style={styles.input}
                  placeholder="Дом"
                  placeholderTextColor={Colors.textMuted}
                  value={building}
                  onChangeText={setBuilding}
                  testID="input-building"
                />
              </View>
              <View style={{ width: 10 }} />
              <View style={[styles.inputWrapper, { flex: 1 }]}>
                <View style={styles.inputIcon}>
                  <DoorOpen size={18} color={Colors.textMuted} />
                </View>
                <TextInput
                  style={styles.input}
                  placeholder="Квартира"
                  placeholderTextColor={Colors.textMuted}
                  value={apartment}
                  onChangeText={setApartment}
                  keyboardType="numeric"
                  testID="input-apartment"
                />
              </View>
            </View>

            <View style={styles.inputWrapper}>
              <View style={styles.inputIcon}>
                <MessageSquare size={18} color={Colors.textMuted} />
              </View>
              <TextInput
                style={[styles.input, styles.commentInput]}
                placeholder="Комментарий к заказу"
                placeholderTextColor={Colors.textMuted}
                value={comment}
                onChangeText={setComment}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
                testID="input-comment"
              />
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>

      <SafeAreaView edges={['bottom']} style={styles.footer}>
        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>Итого</Text>
          <Text style={styles.totalPrice}>{totalPrice} ₽</Text>
        </View>
        <TouchableOpacity
          style={styles.checkoutButton}
          onPress={handleCheckout}
          activeOpacity={0.8}
          testID="checkout-button"
        >
          <Text style={styles.checkoutButtonText}>Оформить заказ</Text>
        </TouchableOpacity>
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: '800' as const,
    color: Colors.text,
  },
  clearButton: {
    color: Colors.primary,
    fontSize: 14,
    fontWeight: '500' as const,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 180,
  },
  cartItem: {
    flexDirection: 'row',
    backgroundColor: Colors.card,
    borderRadius: 16,
    padding: 12,
    marginBottom: 12,
  },
  itemImage: {
    width: 80,
    height: 80,
    borderRadius: 12,
  },
  itemContent: {
    flex: 1,
    marginLeft: 12,
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  itemName: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.text,
    flex: 1,
    marginRight: 8,
  },
  itemWeight: {
    fontSize: 13,
    color: Colors.textMuted,
    marginTop: 2,
  },
  itemFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 'auto',
    paddingTop: 8,
  },
  itemPrice: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: Colors.text,
  },
  quantityControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  qtyButton: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: Colors.surfaceLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  qtyValue: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.text,
    minWidth: 24,
    textAlign: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  emptyIconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: Colors.surfaceLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: '700' as const,
    color: Colors.text,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 15,
    color: Colors.textMuted,
    textAlign: 'center',
    marginBottom: 24,
  },
  browseButton: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 14,
  },
  browseButtonText: {
    color: Colors.text,
    fontSize: 16,
    fontWeight: '600' as const,
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: Colors.surface,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    padding: 16,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  totalLabel: {
    fontSize: 16,
    color: Colors.textSecondary,
  },
  totalPrice: {
    fontSize: 24,
    fontWeight: '800' as const,
    color: Colors.text,
  },
  checkoutButton: {
    backgroundColor: Colors.primary,
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
  },
  checkoutButtonText: {
    color: Colors.text,
    fontSize: 17,
    fontWeight: '700' as const,
  },
  formSection: {
    marginTop: 8,
    marginBottom: 24,
    backgroundColor: Colors.card,
    borderRadius: 16,
    padding: 16,
  },
  formTitle: {
    fontSize: 17,
    fontWeight: '700' as const,
    color: Colors.text,
    marginBottom: 14,
  },
  inputWrapper: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    marginBottom: 4,
  },
  inputIcon: {
    position: 'absolute' as const,
    left: 12,
    zIndex: 1,
  },
  input: {
    flex: 1,
    backgroundColor: Colors.surfaceLight,
    borderRadius: 12,
    paddingVertical: 14,
    paddingLeft: 42,
    paddingRight: 14,
    fontSize: 15,
    color: Colors.text,
    borderWidth: 1,
    borderColor: 'transparent',
    marginBottom: 8,
  },
  inputError: {
    borderColor: Colors.primary,
  },
  addressRow: {
    flexDirection: 'row' as const,
  },
  commentInput: {
    minHeight: 80,
    paddingTop: 14,
  },
  errorText: {
    color: Colors.primary,
    fontSize: 12,
    marginBottom: 8,
    marginLeft: 4,
    marginTop: -4,
  },
});
