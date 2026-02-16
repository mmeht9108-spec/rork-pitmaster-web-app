import createContextHook from '@nkzw/create-context-hook';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState, useCallback, useEffect, useMemo } from 'react';
import { User, Order, CartItem } from '@/types/product';

const USERS_KEY = 'app_users';
const CURRENT_USER_KEY = 'app_current_user';
const ORDERS_KEY = 'app_orders';

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

export const [AuthProvider, useAuth] = createContextHook(() => {
  const queryClient = useQueryClient();
  const [user, setUser] = useState<User | null>(null);

  const currentUserQuery = useQuery({
    queryKey: ['currentUser'],
    queryFn: async () => {
      const stored = await AsyncStorage.getItem(CURRENT_USER_KEY);
      return stored ? (JSON.parse(stored) as User) : null;
    },
  });

  const ordersQuery = useQuery({
    queryKey: ['orders', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const stored = await AsyncStorage.getItem(ORDERS_KEY);
      const allOrders: Order[] = stored ? JSON.parse(stored) : [];
      return allOrders
        .filter((o) => o.userPhone === user.phone)
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    },
    enabled: !!user,
  });

  useEffect(() => {
    if (currentUserQuery.data !== undefined) {
      setUser(currentUserQuery.data);
    }
  }, [currentUserQuery.data]);

  const registerMutation = useMutation({
    mutationFn: async (data: { name: string; phone: string; email?: string }) => {
      const stored = await AsyncStorage.getItem(USERS_KEY);
      const users: User[] = stored ? JSON.parse(stored) : [];

      const existing = users.find((u) => u.phone === data.phone);
      if (existing) {
        throw new Error('Пользователь с таким номером уже зарегистрирован');
      }

      const newUser: User = {
        id: generateId(),
        name: data.name,
        phone: data.phone,
        email: data.email,
        createdAt: new Date().toISOString(),
      };

      users.push(newUser);
      await AsyncStorage.setItem(USERS_KEY, JSON.stringify(users));
      await AsyncStorage.setItem(CURRENT_USER_KEY, JSON.stringify(newUser));
      return newUser;
    },
    onSuccess: (newUser) => {
      setUser(newUser);
      queryClient.invalidateQueries({ queryKey: ['currentUser'] });
      queryClient.invalidateQueries({ queryKey: ['orders'] });
    },
  });

  const loginMutation = useMutation({
    mutationFn: async (data: { phone: string }) => {
      const stored = await AsyncStorage.getItem(USERS_KEY);
      const users: User[] = stored ? JSON.parse(stored) : [];

      const found = users.find((u) => u.phone === data.phone);
      if (!found) {
        throw new Error('Пользователь не найден. Зарегистрируйтесь.');
      }

      await AsyncStorage.setItem(CURRENT_USER_KEY, JSON.stringify(found));
      return found;
    },
    onSuccess: (foundUser) => {
      setUser(foundUser);
      queryClient.invalidateQueries({ queryKey: ['currentUser'] });
      queryClient.invalidateQueries({ queryKey: ['orders'] });
    },
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      await AsyncStorage.removeItem(CURRENT_USER_KEY);
    },
    onSuccess: () => {
      setUser(null);
      queryClient.invalidateQueries({ queryKey: ['currentUser'] });
      queryClient.invalidateQueries({ queryKey: ['orders'] });
    },
  });

  const addOrderMutation = useMutation({
    mutationFn: async (orderData: {
      items: CartItem[];
      totalPrice: number;
      deliveryMethod: 'pickup' | 'delivery';
      address?: string;
      comment?: string;
      userName: string;
      userPhone: string;
    }) => {
      const order: Order = {
        id: generateId(),
        items: orderData.items,
        totalPrice: orderData.totalPrice,
        deliveryMethod: orderData.deliveryMethod,
        address: orderData.address,
        comment: orderData.comment,
        userName: orderData.userName,
        userPhone: orderData.userPhone,
        status: 'pending',
        createdAt: new Date().toISOString(),
      };

      const stored = await AsyncStorage.getItem(ORDERS_KEY);
      const allOrders: Order[] = stored ? JSON.parse(stored) : [];
      allOrders.push(order);
      await AsyncStorage.setItem(ORDERS_KEY, JSON.stringify(allOrders));
      return order;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
    },
  });

  const updateProfileMutation = useMutation({
    mutationFn: async (data: { name: string; email?: string }) => {
      if (!user) throw new Error('Не авторизован');

      const stored = await AsyncStorage.getItem(USERS_KEY);
      const users: User[] = stored ? JSON.parse(stored) : [];

      const idx = users.findIndex((u) => u.id === user.id);
      if (idx >= 0) {
        users[idx] = { ...users[idx], name: data.name, email: data.email };
        await AsyncStorage.setItem(USERS_KEY, JSON.stringify(users));
        await AsyncStorage.setItem(CURRENT_USER_KEY, JSON.stringify(users[idx]));
        return users[idx];
      }
      throw new Error('Пользователь не найден');
    },
    onSuccess: (updated) => {
      setUser(updated);
      queryClient.invalidateQueries({ queryKey: ['currentUser'] });
    },
  });

  const isLoading = currentUserQuery.isLoading;
  const isLoggedIn = !!user;

  const orders = useMemo(() => ordersQuery.data ?? [], [ordersQuery.data]);

  return {
    user,
    isLoggedIn,
    isLoading,
    orders,
    ordersLoading: ordersQuery.isLoading,
    register: registerMutation.mutateAsync,
    registerPending: registerMutation.isPending,
    registerError: registerMutation.error?.message ?? null,
    login: loginMutation.mutateAsync,
    loginPending: loginMutation.isPending,
    loginError: loginMutation.error?.message ?? null,
    logout: logoutMutation.mutate,
    addOrder: addOrderMutation.mutateAsync,
    updateProfile: updateProfileMutation.mutateAsync,
    updateProfilePending: updateProfileMutation.isPending,
  };
});
