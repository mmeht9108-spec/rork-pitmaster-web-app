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
