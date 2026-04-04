import React, { useMemo, useState, useRef } from 'react';
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
  Animated,
  KeyboardAvoidingView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import {
  Minus,
  Plus,
  Trash2,
  ShoppingBag,
  User,
  Phone,
  MapPin,
  MessageSquare,
  Check,
  ChevronLeft,
  Truck,
  Store,
} from 'lucide-react-native';
import { Linking } from 'react-native';
import * as Haptics from 'expo-haptics';
import Colors from '@/constants/colors';
import { useCart } from '@/contexts/CartContext';
import { useAuth } from '@/contexts/AuthContext';
import { formatGrams, getPricePerKg, getSubtotal, parseWeightGrams } from '@/utils/pricing';

type DeliveryMethod = 'pickup' | 'delivery';

export default function CartScreen() {
  const router = useRouter();
  const { items, updateQuantity, removeFromCart, clearCart, totalPrice } = useCart();
  const sanitizedItems = useMemo(
    () =>
      items.map((item) => {
        const rounded = Math.max(100, Math.round(item.quantity / 100) * 100);
        return { ...item, quantity: rounded };
      }),
    [items]
  );
  const { isLoggedIn, addOrder, user } = useAuth();

  const [step, setStep] = useState<1 | 2>(1);
  const fadeAnim = useRef(new Animated.Value(1)).current;

  const [name, setName] = useState<string>(isLoggedIn && user ? user.name : '');
  const [phone, setPhone] = useState<string>(isLoggedIn && user ? user.phone : '');
  const [deliveryMethod, setDeliveryMethod] = useState<DeliveryMethod>('pickup');
  const [address, setAddress] = useState<string>('');
  const [comment, setComment] = useState<string>('');
  const [privacyAccepted, setPrivacyAccepted] = useState<boolean>(false);
  const [privacyError, setPrivacyError] = useState<string>('');
  const [errors, setErrors] = useState<{ name?: string; phone?: string; address?: string }>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const animateTransition = (toStep: 1 | 2) => {
    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 150,
      useNativeDriver: true,
    }).start(() => {
      setStep(toStep);
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }).start();
    });
  };

  const handleQuantityChange = (productId: string, delta: number, currentQty: number) => {
    if (Platform.OS !== 'web') {
      Haptics.selectionAsync();
    }
    const nextQty = currentQty + delta;
    updateQuantity(productId, nextQty);
  };

  const handleRemove = (productId: string) => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    removeFromCart(productId);
  };

  const validateForm = (): boolean => {
    const newErrors: { name?: string; phone?: string; address?: string } = {};
    if (!name.trim()) {
      newErrors.name = 'Введите имя';
    }
    const cleanPhone = phone.replace(/[\s\-\(\)]/g, '');
    if (!cleanPhone || cleanPhone.length < 10) {
      newErrors.phone = 'Введите корректный номер телефона';
    }
    if (deliveryMethod === 'delivery' && !address.trim()) {
      newErrors.address = 'Введите адрес доставки';
    }
    if (!privacyAccepted) {
      setPrivacyError('Необходимо дать согласие на обработку персональных данных');
    } else {
      setPrivacyError('');
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0 && privacyAccepted;
  };

  const isFormValid = (): boolean => {
    const hasName = name.trim().length > 0;
    const cleanPhone = phone.replace(/[\s\-\(\)]/g, '');
    const hasPhone = cleanPhone.length >= 10;
    const hasAddress = deliveryMethod === 'pickup' || address.trim().length > 0;
    return hasName && hasPhone && hasAddress && privacyAccepted;
  };

const handleCheckout = async () => {
  // 👇 ЗАЩИТА ОТ ПОВТОРНЫХ НАЖАТИЙ
  if (isSubmitting) {
    console.log('Заказ уже оформляется, повторное нажатие игнорируется');
    return;
  }

  if (!validateForm()) {
    if (Platform.OS !== 'web') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
    return;
  }

  // 👇 БЛОКИРУЕМ КНОПКУ
  setIsSubmitting(true);

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
    setIsSubmitting(false); // 👈 РАЗБЛОКИРУЕМ ПРИ ОШИБКЕ
    return;
  }

  const orderLines = sanitizedItems
    .map((item) => {
      const baseWeightGrams = parseWeightGrams(item.product.weight);
      const subtotal = getSubtotal(item.product.price, baseWeightGrams, item.quantity);
      return `• ${item.product.name} ${formatGrams(item.quantity)} — ${subtotal} ₽`;
    })
    .join('\n');

  const deliveryLabel = deliveryMethod === 'pickup' ? '🏪 Самовывоз' : '🚚 Доставка';

  const message = [
    '🔥 Новый заказ!',
    '',
    `👤 Имя: ${name.trim()}`,
    `📞 Телефон: ${phone.trim()}`,
    `${deliveryLabel}`,
    deliveryMethod === 'delivery' && address.trim() ? `📍 Адрес: ${address.trim()}` : '',
    comment.trim() ? `💬 Комментарий: ${comment.trim()}` : '',
    '',
    '📦 Заказ:',
    orderLines,
    '',
    `💰 Итого: ${totalPrice} ₽`,
  ].filter(Boolean).join('\n');

  const chatIds = [String(chatId).trim(), '-5272210402'];

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
      `<p><strong>${deliveryLabel}</strong></p>`,
      deliveryMethod === 'delivery' && address.trim() ? `<p><strong>📍 Адрес:</strong> ${address.trim()}</p>` : '',
      comment.trim() ? `<p><strong>💬 Комментарий:</strong> ${comment.trim()}</p>` : '',
      '<h3>📦 Заказ:</h3>',
      '<ul>',
      ...sanitizedItems.map((item) => {
        const baseWeightGrams = parseWeightGrams(item.product.weight);
        const subtotal = getSubtotal(item.product.price, baseWeightGrams, item.quantity);
        return `<li>${item.product.name} ${formatGrams(item.quantity)} — ${subtotal} ₽</li>`;
      }),
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
        email: 'не указан',
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

  if (isLoggedIn) {
    try {
      await addOrder({
        items: sanitizedItems,
        totalPrice,
        deliveryMethod,
        address: deliveryMethod === 'delivery' ? address.trim() : undefined,
        comment: comment.trim() || undefined,
        userName: name.trim(),
        userPhone: phone.replace(/[\s\-\(\)]/g, ''),
      });
      console.log('Order saved to history');
    } catch (orderErr) {
      console.warn('Failed to save order to history:', orderErr);
    }
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
          setAddress('');
          setComment('');
          setDeliveryMethod('pickup');
          setPrivacyAccepted(false);
          setPrivacyError('');
          setErrors({});
          setStep(1);
          setIsSubmitting(false); // 👈 РАЗБЛОКИРУЕМ ПОСЛЕ ОЧИСТКИ
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
          <View style={styles.topBar}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
              <ChevronLeft size={24} color={Colors.text} />
            </TouchableOpacity>
            <Text style={styles.topBarTitle}>Заказ</Text>
            <View style={styles.backBtn} />
          </View>
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
        <View style={styles.topBar}>
          <TouchableOpacity
            onPress={() => {
              if (step === 2) {
                animateTransition(1);
              } else {
                router.back();
              }
            }}
            style={styles.backBtn}
          >
            <ChevronLeft size={24} color={Colors.text} />
          </TouchableOpacity>
          <Text style={styles.topBarTitle}>
            {step === 1 ? 'Ваш заказ' : 'Оформление'}
          </Text>
          {step === 1 ? (
            <TouchableOpacity onPress={clearCart} style={styles.clearBtn}>
              <Text style={styles.clearBtnText}>Очистить</Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.backBtn} />
          )}
        </View>

        <View style={styles.stepIndicator}>
          <View style={[styles.stepDot, styles.stepDotActive]} />
          <View style={[styles.stepLine, step === 2 && styles.stepLineActive]} />
          <View style={[styles.stepDot, step === 2 && styles.stepDotActive]} />
        </View>

        <KeyboardAvoidingView
          style={styles.flex1}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={0}
        >
          <Animated.View style={[styles.flex1, { opacity: fadeAnim }]}>
            {step === 1 ? renderStep1() : renderStep2()}
          </Animated.View>
        </KeyboardAvoidingView>
      </SafeAreaView>

      <SafeAreaView edges={['bottom']} style={styles.footer}>
        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>Итого</Text>
          <Text style={styles.totalPrice}>{totalPrice} ₽</Text>
        </View>
        {step === 1 ? (
          <TouchableOpacity
            style={styles.mainButton}
            onPress={() => animateTransition(2)}
            activeOpacity={0.85}
            testID="proceed-to-checkout"
          >
            <Text style={styles.mainButtonText}>Оформление заказа</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[styles.mainButton, !isFormValid() && styles.mainButtonDisabled]}
            onPress={handleCheckout}
            activeOpacity={isFormValid() ? 0.85 : 1}
            testID="checkout-button"
          >
            <Text style={[styles.mainButtonText, !isFormValid() && styles.mainButtonTextDisabled]}>
              Подтвердить заказ
            </Text>
          </TouchableOpacity>
        )}
      </SafeAreaView>
    </View>
  );

  function renderStep1() {
    return (
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {sanitizedItems.map((item) => (
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
              <View style={styles.itemMetaRow}>
                <Text style={styles.itemWeight}>{item.product.weight}</Text>
                <Text style={styles.itemPricePerKg}>
                  {getPricePerKg(item.product.price, parseWeightGrams(item.product.weight))} ₽/кг
                </Text>
              </View>
              <View style={styles.itemFooter}>
                <View>
                  <Text style={styles.itemPrice}>
                    {getSubtotal(
                      item.product.price,
                      parseWeightGrams(item.product.weight),
                      item.quantity
                    )} ₽
                  </Text>
                  <Text style={styles.itemSubtotalLabel}>Подытог</Text>
                </View>
                <View style={styles.quantityControls}>
                  <TouchableOpacity
                    style={styles.qtyButton}
                    onPress={() =>
                      handleQuantityChange(item.product.id, -100, item.quantity)
                    }
                  >
                    <Minus size={16} color={Colors.text} />
                  </TouchableOpacity>
                  <Text style={styles.qtyValue}>{formatGrams(item.quantity)}</Text>
                  <TouchableOpacity
                    style={styles.qtyButton}
                    onPress={() =>
                      handleQuantityChange(item.product.id, 100, item.quantity)
                    }
                  >
                    <Plus size={16} color={Colors.text} />
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </View>
        ))}

        <View style={styles.summaryCard}>
          {sanitizedItems.map((item) => (
            <View key={item.product.id} style={styles.summaryRow}>
              <Text style={styles.summaryName} numberOfLines={1}>
                {item.product.name} × {formatGrams(item.quantity)}
              </Text>
              <Text style={styles.summaryPrice}>
                {getSubtotal(
                  item.product.price,
                  parseWeightGrams(item.product.weight),
                  item.quantity
                )} ₽
              </Text>
            </View>
          ))}
          <View style={styles.summaryDivider} />
          <View style={styles.summaryRow}>
            <Text style={styles.summaryTotalLabel}>Итого</Text>
            <Text style={styles.summaryTotalPrice}>{totalPrice} ₽</Text>
          </View>
        </View>
      </ScrollView>
    );
  }

  function renderStep2() {
    return (
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.formCard}>
          <Text style={styles.formTitle}>Контактные данные</Text>

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
        </View>

        <View style={styles.formCard}>
          <Text style={styles.formTitle}>Способ получения</Text>

          <View style={styles.deliveryToggle}>
            <TouchableOpacity
              style={[
                styles.deliveryOption,
                deliveryMethod === 'pickup' && styles.deliveryOptionActive,
              ]}
              onPress={() => {
                setDeliveryMethod('pickup');
                if (errors.address) setErrors((e) => ({ ...e, address: undefined }));
              }}
              activeOpacity={0.8}
              testID="pickup-option"
            >
              <Store
                size={20}
                color={deliveryMethod === 'pickup' ? '#fff' : Colors.textSecondary}
              />
              <Text
                style={[
                  styles.deliveryOptionText,
                  deliveryMethod === 'pickup' && styles.deliveryOptionTextActive,
                ]}
              >
                Самовывоз
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.deliveryOption,
                deliveryMethod === 'delivery' && styles.deliveryOptionActive,
              ]}
              onPress={() => setDeliveryMethod('delivery')}
              activeOpacity={0.8}
              testID="delivery-option"
            >
              <Truck
                size={20}
                color={deliveryMethod === 'delivery' ? '#fff' : Colors.textSecondary}
              />
              <Text
                style={[
                  styles.deliveryOptionText,
                  deliveryMethod === 'delivery' && styles.deliveryOptionTextActive,
                ]}
              >
                Доставка
              </Text>
            </TouchableOpacity>
          </View>

          {deliveryMethod === 'delivery' && (
            <>
              <View style={styles.inputWrapper}>
                <View style={styles.inputIcon}>
                  <MapPin size={18} color={Colors.textMuted} />
                </View>
                <TextInput
                  style={[styles.input, errors.address ? styles.inputError : null]}
                  placeholder="Адрес доставки *"
                  placeholderTextColor={Colors.textMuted}
                  value={address}
                  onChangeText={(v) => { setAddress(v); if (errors.address) setErrors((e) => ({ ...e, address: undefined })); }}
                  testID="input-address"
                />
              </View>
              {errors.address ? <Text style={styles.errorText}>{errors.address}</Text> : null}
            </>
          )}
        </View>

        <View style={styles.formCard}>
          <Text style={styles.formTitle}>Комментарий</Text>
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

        <View style={styles.privacySection}>
          <TouchableOpacity
            style={styles.privacyRow}
            onPress={() => {
              setPrivacyAccepted((v) => !v);
              if (privacyError) setPrivacyError('');
            }}
            activeOpacity={0.7}
            testID="privacy-checkbox"
          >
            <View style={[styles.checkbox, privacyAccepted && styles.checkboxChecked, privacyError ? styles.checkboxError : null]}>
              {privacyAccepted ? <Check size={16} color="#fff" strokeWidth={3} /> : null}
            </View>
            <Text style={styles.privacyText}>
              Я согласен на обработку{' '}
              <Text
                style={styles.privacyLink}
                onPress={() => Linking.openURL('/privacy')}
              >
                персональных данных
              </Text>
            </Text>
          </TouchableOpacity>
          {privacyError ? <Text style={styles.privacyErrorText}>{privacyError}</Text> : null}
        </View>
      </ScrollView>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  safeArea: {
    flex: 1,
  },
  flex1: {
    flex: 1,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: Colors.surfaceLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  topBarTitle: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: Colors.text,
  },
  clearBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  clearBtnText: {
    color: Colors.primary,
    fontSize: 14,
    fontWeight: '500' as const,
  },
  stepIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 60,
    gap: 0,
  },
  stepDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: Colors.surfaceLight,
  },
  stepDotActive: {
    backgroundColor: Colors.primary,
  },
  stepLine: {
    flex: 1,
    height: 2,
    backgroundColor: Colors.surfaceLight,
    marginHorizontal: 4,
  },
  stepLineActive: {
    backgroundColor: Colors.primary,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 180,
    paddingTop: 8,
  },
  cartItem: {
    flexDirection: 'row',
    backgroundColor: Colors.card,
    borderRadius: 16,
    padding: 12,
    marginBottom: 10,
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
  },
  itemMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 2,
  },
  itemPricePerKg: {
    color: Colors.textSecondary,
    fontSize: 12,
    fontWeight: '600' as const,
  },
  itemSubtotalLabel: {
    color: Colors.textMuted,
    fontSize: 11,
    fontWeight: '600' as const,
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
  summaryCard: {
    backgroundColor: Colors.card,
    borderRadius: 16,
    padding: 16,
    marginTop: 6,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
  },
  summaryName: {
    color: Colors.textSecondary,
    fontSize: 14,
    flex: 1,
    marginRight: 12,
  },
  summaryPrice: {
    color: Colors.textSecondary,
    fontSize: 14,
    fontWeight: '500' as const,
  },
  summaryDivider: {
    height: 1,
    backgroundColor: Colors.border,
    marginVertical: 8,
  },
  summaryTotalLabel: {
    color: Colors.text,
    fontSize: 16,
    fontWeight: '700' as const,
  },
  summaryTotalPrice: {
    color: Colors.text,
    fontSize: 18,
    fontWeight: '800' as const,
  },
  formCard: {
    backgroundColor: Colors.card,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
  },
  formTitle: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: Colors.text,
    marginBottom: 14,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  inputIcon: {
    position: 'absolute',
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
  deliveryToggle: {
    flexDirection: 'row',
    backgroundColor: Colors.surfaceLight,
    borderRadius: 14,
    padding: 4,
    marginBottom: 14,
  },
  deliveryOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 11,
    gap: 8,
  },
  deliveryOptionActive: {
    backgroundColor: Colors.primary,
  },
  deliveryOptionText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.textSecondary,
  },
  deliveryOptionTextActive: {
    color: '#fff',
  },
  privacySection: {
    marginBottom: 24,
    paddingHorizontal: 4,
  },
  privacyRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  checkbox: {
    width: 26,
    height: 26,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: Colors.border,
    backgroundColor: Colors.surfaceLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    marginTop: 1,
  },
  checkboxChecked: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  checkboxError: {
    borderColor: Colors.primary,
  },
  privacyText: {
    flex: 1,
    fontSize: 14,
    color: Colors.textSecondary,
    lineHeight: 20,
  },
  privacyLink: {
    color: Colors.secondary,
    textDecorationLine: 'underline',
  },
  privacyErrorText: {
    color: Colors.primary,
    fontSize: 12,
    marginTop: 8,
    marginLeft: 38,
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
    marginBottom: 14,
  },
  totalLabel: {
    fontSize: 15,
    color: Colors.textSecondary,
  },
  totalPrice: {
    fontSize: 22,
    fontWeight: '800' as const,
    color: Colors.text,
  },
  mainButton: {
    backgroundColor: Colors.primary,
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
  },
  mainButtonDisabled: {
    backgroundColor: Colors.surfaceLight,
  },
  mainButtonText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '700' as const,
  },
  mainButtonTextDisabled: {
    color: Colors.textMuted,
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
    color: '#fff',
    fontSize: 16,
    fontWeight: '600' as const,
  },
});
