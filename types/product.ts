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
  /** Real packed weight in grams. Required for CDEK rate calculation. */
  weightGrams?: number;
  /** Packed size in millimetres. Sent to CDEK only when all three are set. */
  lengthMm?: number;
  widthMm?: number;
  heightMm?: number;
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
