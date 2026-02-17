import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Platform,
  ActivityIndicator,
  Image,
} from 'react-native';
import {
  Phone,
  Mail,
  LogOut,
  Package,
  ChevronRight,
  Clock,
  MapPin,
  Store,
  Truck,
  Edit3,
  Check,
  X,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import Colors from '@/constants/colors';
import { useAuth } from '@/contexts/AuthContext';
import { Order } from '@/types/product';

const STATUS_MAP: Record<Order['status'], { label: string; color: string }> = {
  pending: { label: 'Новый', color: Colors.secondary },
  confirmed: { label: 'Подтверждён', color: '#4FC3F7' },
  preparing: { label: 'Готовится', color: Colors.warning },
  ready: { label: 'Готов', color: Colors.success },
  delivered: { label: 'Доставлен', color: Colors.success },
};

export default function ProfileScreen() {
  const {
    user,
    orders,
    ordersLoading,
    logout,
    updateProfile,
    updateProfilePending,
  } = useAuth();

  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [editName, setEditName] = useState<string>('');
  const [editPhone, setEditPhone] = useState<string>('');
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null);

  const handleLogout = useCallback(() => {
    Alert.alert('Выход', 'Вы уверены, что хотите выйти?', [
      { text: 'Отмена', style: 'cancel' },
      {
        text: 'Выйти',
        style: 'destructive',
        onPress: () => {
          logout();
          if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        },
      },
    ]);
  }, [logout]);

  const startEditing = useCallback(() => {
    setEditName(user?.name ?? '');
    setEditPhone(user?.phone ?? '');
    setIsEditing(true);
  }, [user]);

  const handleSaveProfile = useCallback(async () => {
    if (!editName.trim()) return;
    try {
      await updateProfile({ name: editName.trim(), phone: editPhone.trim() || undefined });
      setIsEditing(false);
      if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {
      Alert.alert('Ошибка', 'Не удалось обновить профиль');
    }
  }, [editName, editPhone, updateProfile]);

  const toggleOrder = useCallback((orderId: string) => {
    if (Platform.OS !== 'web') Haptics.selectionAsync();
    setExpandedOrder((prev) => (prev === orderId ? null : orderId));
  }, []);

  const formatDate = useCallback((dateStr: string) => {
    const d = new Date(dateStr);
    const day = d.getDate().toString().padStart(2, '0');
    const month = (d.getMonth() + 1).toString().padStart(2, '0');
    const year = d.getFullYear();
    const hours = d.getHours().toString().padStart(2, '0');
    const minutes = d.getMinutes().toString().padStart(2, '0');
    return `${day}.${month}.${year} в ${hours}:${minutes}`;
  }, []);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.profileCard}>
        <View style={styles.profileHeader}>
          <View style={styles.avatarSmall}>
            <Text style={styles.avatarText}>
              {user?.name?.charAt(0).toUpperCase() ?? '?'}
            </Text>
          </View>
          <View style={styles.profileInfo}>
            {isEditing ? (
              <>
                <TextInput
                  style={styles.editInput}
                  value={editName}
                  onChangeText={setEditName}
                  placeholder="Имя"
                  placeholderTextColor={Colors.textMuted}
                />
                <TextInput
                  style={[styles.editInput, styles.editInputSmall]}
                  value={editPhone}
                  onChangeText={setEditPhone}
                  placeholder="Телефон"
                  placeholderTextColor={Colors.textMuted}
                  keyboardType="phone-pad"
                />
              </>
            ) : (
              <>
                <Text style={styles.profileName}>{user?.name}</Text>
                <View style={styles.profileDetailRow}>
                  <Mail size={14} color={Colors.textSecondary} />
                  <Text style={styles.profileEmail}>{user?.email}</Text>
                </View>
                {user?.phone ? (
                  <View style={styles.profileDetailRow}>
                    <Phone size={14} color={Colors.textSecondary} />
                    <Text style={styles.profilePhone}>{user.phone}</Text>
                  </View>
                ) : null}
              </>
            )}
          </View>
          {isEditing ? (
            <View style={styles.editActions}>
              <TouchableOpacity
                style={styles.editActionBtn}
                onPress={handleSaveProfile}
                disabled={updateProfilePending}
              >
                {updateProfilePending ? (
                  <ActivityIndicator size="small" color={Colors.success} />
                ) : (
                  <Check size={20} color={Colors.success} />
                )}
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.editActionBtn}
                onPress={() => setIsEditing(false)}
              >
                <X size={20} color={Colors.textMuted} />
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity style={styles.editBtn} onPress={startEditing}>
              <Edit3 size={18} color={Colors.textSecondary} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <View style={styles.sectionHeader}>
        <Package size={20} color={Colors.primary} />
        <Text style={styles.sectionTitle}>История заказов</Text>
      </View>

      {ordersLoading ? (
        <View style={styles.ordersLoading}>
          <ActivityIndicator color={Colors.primary} />
        </View>
      ) : orders.length === 0 ? (
        <View style={styles.emptyOrders}>
          <View style={styles.emptyIcon}>
            <Package size={40} color={Colors.textMuted} />
          </View>
          <Text style={styles.emptyTitle}>Заказов пока нет</Text>
          <Text style={styles.emptySubtitle}>Ваши заказы будут отображаться здесь</Text>
        </View>
      ) : (
        orders.map((order) => {
          const isExpanded = expandedOrder === order.id;
          const statusInfo = STATUS_MAP[order.status];
          return (
            <TouchableOpacity
              key={order.id}
              style={styles.orderCard}
              onPress={() => toggleOrder(order.id)}
              activeOpacity={0.8}
            >
              <View style={styles.orderTop}>
                <View style={styles.orderMeta}>
                  <Text style={styles.orderNumber}>
                    Заказ #{order.id.slice(-6).toUpperCase()}
                  </Text>
                  <View style={styles.orderDateRow}>
                    <Clock size={13} color={Colors.textMuted} />
                    <Text style={styles.orderDate}>{formatDate(order.createdAt)}</Text>
                  </View>
                </View>
                <View style={styles.orderRight}>
                  <View style={[styles.statusBadge, { backgroundColor: statusInfo.color + '22' }]}>
                    <Text style={[styles.statusText, { color: statusInfo.color }]}>
                      {statusInfo.label}
                    </Text>
                  </View>
                  <ChevronRight
                    size={18}
                    color={Colors.textMuted}
                    style={{ transform: [{ rotate: isExpanded ? '90deg' : '0deg' }] }}
                  />
                </View>
              </View>

              <View style={styles.orderSummaryRow}>
                <View style={styles.deliveryBadge}>
                  {order.deliveryMethod === 'pickup' ? (
                    <Store size={14} color={Colors.textSecondary} />
                  ) : (
                    <Truck size={14} color={Colors.textSecondary} />
                  )}
                  <Text style={styles.deliveryText}>
                    {order.deliveryMethod === 'pickup' ? 'Самовывоз' : 'Доставка'}
                  </Text>
                </View>
                <Text style={styles.orderTotal}>{order.totalPrice} ₽</Text>
              </View>

              {isExpanded && (
                <View style={styles.orderDetails}>
                  <View style={styles.orderDivider} />
                  {order.items.map((item) => (
                    <View key={item.product.id} style={styles.orderItem}>
                      <Image source={{ uri: item.product.image }} style={styles.orderItemImage} />
                      <View style={styles.orderItemInfo}>
                        <Text style={styles.orderItemName} numberOfLines={1}>
                          {item.product.name}
                        </Text>
                        <Text style={styles.orderItemQty}>
                          {item.quantity} шт. × {item.product.price} ₽
                        </Text>
                      </View>
                      <Text style={styles.orderItemPrice}>
                        {item.product.price * item.quantity} ₽
                      </Text>
                    </View>
                  ))}
                  {order.deliveryMethod === 'delivery' && order.address ? (
                    <View style={styles.orderAddressRow}>
                      <MapPin size={14} color={Colors.textMuted} />
                      <Text style={styles.orderAddress}>{order.address}</Text>
                    </View>
                  ) : null}
                  {order.comment ? (
                    <Text style={styles.orderComment}>💬 {order.comment}</Text>
                  ) : null}
                </View>
              )}
            </TouchableOpacity>
          );
        })
      )}

      <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout} activeOpacity={0.8}>
        <LogOut size={20} color={Colors.primary} />
        <Text style={styles.logoutText}>Выйти из аккаунта</Text>
      </TouchableOpacity>

      <View style={styles.bottomPadding} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  profileCard: {
    backgroundColor: Colors.card,
    borderRadius: 20,
    padding: 20,
    marginBottom: 24,
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarSmall: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 24,
    fontWeight: '700' as const,
    color: '#fff',
  },
  profileInfo: {
    flex: 1,
    marginLeft: 14,
  },
  profileName: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: Colors.text,
  },
  profileDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  profileEmail: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  profilePhone: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
  editBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: Colors.surfaceLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  editActions: {
    flexDirection: 'row',
    gap: 6,
  },
  editActionBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: Colors.surfaceLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  editInput: {
    backgroundColor: Colors.surfaceLight,
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    fontSize: 15,
    color: Colors.text,
    marginBottom: 6,
  },
  editInputSmall: {
    paddingVertical: 8,
    fontSize: 14,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 14,
    paddingHorizontal: 4,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: Colors.text,
  },
  ordersLoading: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  emptyOrders: {
    alignItems: 'center',
    paddingVertical: 48,
  },
  emptyIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.surfaceLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '600' as const,
    color: Colors.text,
    marginBottom: 6,
  },
  emptySubtitle: {
    fontSize: 14,
    color: Colors.textMuted,
  },
  orderCard: {
    backgroundColor: Colors.card,
    borderRadius: 16,
    padding: 16,
    marginBottom: 10,
  },
  orderTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  orderMeta: {
    flex: 1,
  },
  orderNumber: {
    fontSize: 15,
    fontWeight: '700' as const,
    color: Colors.text,
  },
  orderDateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 4,
  },
  orderDate: {
    fontSize: 13,
    color: Colors.textMuted,
  },
  orderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600' as const,
  },
  orderSummaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
  },
  deliveryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  deliveryText: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
  orderTotal: {
    fontSize: 17,
    fontWeight: '800' as const,
    color: Colors.text,
  },
  orderDetails: {
    marginTop: 4,
  },
  orderDivider: {
    height: 1,
    backgroundColor: Colors.border,
    marginVertical: 12,
  },
  orderItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  orderItemImage: {
    width: 44,
    height: 44,
    borderRadius: 10,
  },
  orderItemInfo: {
    flex: 1,
    marginLeft: 10,
  },
  orderItemName: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.text,
  },
  orderItemQty: {
    fontSize: 12,
    color: Colors.textMuted,
    marginTop: 2,
  },
  orderItemPrice: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.text,
  },
  orderAddressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  orderAddress: {
    fontSize: 13,
    color: Colors.textSecondary,
    flex: 1,
  },
  orderComment: {
    fontSize: 13,
    color: Colors.textMuted,
    marginTop: 6,
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: Colors.card,
    borderRadius: 14,
    paddingVertical: 16,
    marginTop: 20,
  },
  logoutText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.primary,
  },
  bottomPadding: {
    height: 40,
  },
});
