export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  weight: string;
  image: string;
  category: string;
  isPopular?: boolean;
  proteins: number;
  fats: number;
  carbs: number;
}

export interface CartItem {
  product: Product;
  quantity: number;
}

export interface HeatingTip {
  id: string;
  title: string;
  icon: string;
  steps: string[];
}

export interface User {
  id: string;
  name: string;
  phone: string;
  email?: string;
  createdAt: string;
}

export interface Order {
  id: string;
  userId: string;
  items: CartItem[];
  totalPrice: number;
  deliveryMethod: 'pickup' | 'delivery';
  address?: string;
  comment?: string;
  userName: string;
  userPhone: string;
  status: 'pending' | 'confirmed' | 'preparing' | 'ready' | 'delivered';
  createdAt: string;
}
