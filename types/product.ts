export interface Product {
  id: string;
  slug: string;
  name: string;
  description: string;
  category: string;
  categorySlug: string;
  /** Product article / SKU */
  article?: string;
  price: number | null;
  volume?: string;
  image?: string;
  imageColor: string;
  featured?: boolean;
}

export interface CartItem {
  productId: string;
  quantity: number;
}
