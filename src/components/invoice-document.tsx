import { formatMoney } from "@/lib/format";

type InvoiceDocumentProps = {
  currency: string;
  items: { id: string; description: string; quantity: number; unitPriceCents: number; amountCents: number }[];
  subtotalCents: number;
  taxCents: number;
  totalCents: number;
};

/** Line items and totals, shared by the agency and client invoice pages. */
export function InvoiceDocument({ currency, items, subtotalCents, taxCents, totalCents }: InvoiceDocumentProps) {
  const money = (cents: number) => formatMoney(cents, currency);
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="text-left text-muted-foreground">
          <tr className="border-b">
            <th className="py-2 font-medium">Description</th>
            <th className="py-2 text-right font-medium">Qty</th>
            <th className="py-2 text-right font-medium">Rate</th>
            <th className="py-2 text-right font-medium">Amount</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={item.id} className="border-b last:border-0">
              <td className="py-2 pr-4">{item.description}</td>
              <td className="py-2 text-right tabular-nums">{item.quantity}</td>
              <td className="py-2 text-right tabular-nums">{money(item.unitPriceCents)}</td>
              <td className="py-2 text-right tabular-nums">{money(item.amountCents)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <dl className="mt-4 ml-auto w-full max-w-xs space-y-1 text-sm">
        <div className="flex justify-between">
          <dt className="text-muted-foreground">Subtotal</dt>
          <dd className="tabular-nums">{money(subtotalCents)}</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-muted-foreground">Tax</dt>
          <dd className="tabular-nums">{money(taxCents)}</dd>
        </div>
        <div className="flex justify-between border-t pt-2 text-base font-semibold">
          <dt>Total</dt>
          <dd className="tabular-nums">{money(totalCents)}</dd>
        </div>
      </dl>
    </div>
  );
}
