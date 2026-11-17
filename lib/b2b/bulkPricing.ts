import "server-only";
import {
  calculateConfigPrice,
  getProductTypeForSku,
} from "@/lib/pricing/configPrice";
import {
  nonTableInputFromBulkRow,
  priceBulkRows,
  tableInputFromBulkRow,
  type BulkPriceResponse,
  type BulkRowInput,
  type BulkPriceSource,
} from "@/lib/b2b/bulk";

export async function priceBulkRow(
  row: BulkRowInput
): Promise<BulkPriceSource> {
  const productType = await getProductTypeForSku(row.sku);

  if (productType === "TABLE") {
    return await calculateConfigPrice(tableInputFromBulkRow(row));
  }

  const input = nonTableInputFromBulkRow(row, productType);
  return await calculateConfigPrice(input);
}

export async function priceBulkRequest(
  rows: BulkRowInput[]
): Promise<BulkPriceResponse> {
  return await priceBulkRows(rows, priceBulkRow);
}
