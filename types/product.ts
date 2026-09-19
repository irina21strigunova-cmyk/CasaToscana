export type TbankMarkCodeType =
  | "UNKNOWN"
  | "EAN8"
  | "EAN13"
  | "ITF14"
  | "GS10"
  | "GS1M"
  | "SHORT"
  | "FUR"
  | "EGAIS20"
  | "EGAIS30"
  | "RAWCODE";

export interface ProductMarkCode {
  type: TbankMarkCodeType;
  /** Real scanned Честный знак / GS1 code. Never a placeholder. */
  value: string;
}

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
  /**
   * Item is in the Честный знак contour.
   * Do not put dummy codes on the product card — attach a scanned code
   * only at shipment, when the specific unit is known.
   */
  requiresMarking?: boolean;
}

export interface CartItem {
  productId: string;
  quantity: number;
}
