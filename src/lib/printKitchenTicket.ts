import type { Order, Restaurant } from '@/types/api';

export function printKitchenTicket(order: Order, restaurant?: Restaurant | null) {
  const orderLabel = order.orderNumber ?? order._id.slice(-6).toUpperCase();
  const customer =
    typeof order.customerId === 'object'
      ? order.customerId?.fullName ?? 'Customer'
      : 'Customer';
  const customerMobile = typeof order.customerId === 'object' ? order.customerId?.mobile ?? '' : '';
  const customerDisplay = customerMobile ? `${customer} (${customerMobile})` : customer;

  const storeName = restaurant?.restaurantName ?? 'QuickBite Partner';
  const addressParts = [
    restaurant?.address?.street,
    restaurant?.address?.city,
    restaurant?.address?.state,
    restaurant?.address?.pincode,
  ].filter(Boolean);
  const restaurantAddress = addressParts.length > 0 ? addressParts.join(', ') : '';
  const restaurantPhone = restaurant?.phone ?? '';

  let subtotal = 0;
  const itemsHtml = (order.orderItems ?? [])
    .map((item) => {
      const addonLines = (item.addons ?? [])
        .map((a) => `
          <tr>
            <td colspan="4" class="item-addon">+ ${a.name} (₹${a.price.toFixed(2)})</td>
          </tr>`)
        .join('');

      const noteLine = item.specialInstructions
        ? `
          <tr>
            <td colspan="4" class="item-instruction">Note: ${item.specialInstructions}</td>
          </tr>`
        : '';

      const lineTotal = item.total ?? (item.price * item.quantity);
      subtotal += lineTotal;

      return `
        <tr style="border-top: 1px dashed #eee; font-weight: bold;">
          <td style="padding: 6px 0 2px 0;" class="item-name">${item.itemName}</td>
          <td style="padding: 6px 0 2px 0; text-align: right;">${item.quantity}</td>
          <td style="padding: 6px 0 2px 0; text-align: right;">₹${item.price.toFixed(2)}</td>
          <td style="padding: 6px 0 2px 0; text-align: right;">₹${lineTotal.toFixed(2)}</td>
        </tr>
        ${addonLines}
        ${noteLine}`;
    })
    .join('');

  const charges = Math.max(0, order.grandTotal - subtotal);
  const paymentMethodDisplay = order.paymentMethod === 'COD' ? 'Cash on Delivery (COD)' : order.paymentMethod;
  const paymentStatusDisplay = order.paymentStatus === 'PAID' ? 'PAID' : 'PENDING';

  const deliveryAddressLine = order.deliveryAddress?.addressLine ?? '';
  const deliveryCity = order.deliveryAddress?.city ?? '';
  const deliveryPincode = order.deliveryAddress?.pincode ?? '';
  const fullDeliveryAddress = [deliveryAddressLine, deliveryCity, deliveryPincode].filter(Boolean).join(', ');

  const html = `<!DOCTYPE html>
<html>
<head>
  <title>KOT #${orderLabel}</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      padding: 15px;
      max-width: 320px;
      margin: 0 auto;
      color: #111;
      font-size: 12px;
      line-height: 1.4;
      background: #fff;
    }
    .text-center { text-align: center; }
    .text-right { text-align: right; }
    .font-bold { font-weight: bold; }
    
    .platform-tag {
      font-size: 9px;
      text-transform: uppercase;
      font-weight: 800;
      color: #ff5a00;
      letter-spacing: 1px;
      margin-bottom: 2px;
    }
    .store-title {
      font-size: 18px;
      font-weight: 800;
      margin: 2px 0;
      text-transform: uppercase;
      letter-spacing: -0.5px;
    }
    .store-address { font-size: 10px; margin-bottom: 2px; color: #555; }
    .store-phone { font-size: 10px; margin-bottom: 8px; color: #555; }
    
    .ticket-type {
      font-size: 11px;
      font-weight: 800;
      margin: 8px 0;
      text-transform: uppercase;
      background: #111;
      color: #fff;
      padding: 4px 0;
      letter-spacing: 1.5px;
      border-radius: 4px;
    }
    
    .meta-section {
      font-size: 11px;
      margin: 12px 0;
      display: grid;
      gap: 3px;
    }
    .meta-row { display: flex; justify-content: space-between; }
    .meta-label { font-weight: 700; color: #555; }
    .meta-value { font-weight: 600; color: #111; }
    
    .divider { border-top: 1px dashed #ccc; margin: 8px 0; }
    
    table { width: 100%; border-collapse: collapse; margin: 8px 0; }
    th {
      font-size: 10px;
      border-bottom: 1px solid #111;
      padding: 5px 0;
      font-weight: 700;
      color: #555;
    }
    td { padding: 4px 0; vertical-align: top; }
    
    .item-name { font-size: 12.5px; color: #111; }
    .item-addon { font-size: 10.5px; color: #555; padding: 2px 0 2px 12px; }
    .item-instruction { font-size: 10.5px; font-style: italic; color: #b45309; padding: 2px 0 2px 12px; }
    
    .totals-section { font-size: 11.5px; margin: 8px 0; display: grid; gap: 3px; }
    .totals-row { display: flex; justify-content: space-between; }
    .grand-total {
      font-size: 14px;
      font-weight: 800;
      display: flex;
      justify-content: space-between;
      margin-top: 6px;
      border-top: 1.5px dashed #111;
      padding-top: 6px;
      color: #111;
    }
    
    .address-section {
      font-size: 11px;
      margin: 10px 0;
      border: 1px dashed #ccc;
      padding: 8px;
      border-radius: 6px;
      background: #fcfcfc;
    }
    .address-title { font-weight: 700; margin-bottom: 3px; text-transform: uppercase; font-size: 9px; letter-spacing: 0.5px; color: #555; }
    
    .instructions-box {
      border: 1px solid #ff5a00;
      background: #fff8f5;
      color: #d44a00;
      padding: 8px;
      font-size: 11px;
      margin-top: 8px;
      border-radius: 6px;
    }
    .footer-msg { font-size: 10px; margin-top: 20px; color: #777; }
    
    @media print {
      body { padding: 0; margin: 0; }
      @page { margin: 0; }
    }
  </style>
</head>
<body>
  <div class="text-center">
    <div class="platform-tag">QuickBite Order</div>
    <div class="store-title">${storeName}</div>
    ${restaurantAddress ? `<div class="store-address">${restaurantAddress}</div>` : ''}
    ${restaurantPhone ? `<div class="store-phone">Phone: ${restaurantPhone}</div>` : ''}
    <div class="ticket-type">Kitchen Order Ticket</div>
  </div>

  <div class="meta-section">
    <div class="meta-row">
      <span class="meta-label">Order ID:</span>
      <span class="meta-value">#${orderLabel}</span>
    </div>
    <div class="meta-row">
      <span class="meta-label">Date:</span>
      <span class="meta-value">${new Date(order.createdAt ?? Date.now()).toLocaleString()}</span>
    </div>
    <div class="meta-row">
      <span class="meta-label">Customer:</span>
      <span class="meta-value">${customerDisplay}</span>
    </div>
    <div class="meta-row">
      <span class="meta-label">Status:</span>
      <span class="meta-value font-bold">${order.orderStatus.replace(/_/g, ' ')}</span>
    </div>
  </div>

  <div class="divider"></div>

  <table>
    <thead>
      <tr>
        <th style="text-align: left; padding: 5px 0;">ITEM</th>
        <th style="text-align: right; padding: 5px 0; width: 40px;">QTY</th>
        <th style="text-align: right; padding: 5px 0; width: 70px;">PRICE</th>
        <th style="text-align: right; padding: 5px 0; width: 70px;">TOTAL</th>
      </tr>
    </thead>
    <tbody>
      ${itemsHtml}
    </tbody>
  </table>

  <div class="divider"></div>

  <div class="totals-section">
    <div class="totals-row">
      <span>Subtotal:</span>
      <span>₹${subtotal.toFixed(2)}</span>
    </div>
    ${charges > 0 ? `
    <div class="totals-row">
      <span>Taxes & Charges:</span>
      <span>₹${charges.toFixed(2)}</span>
    </div>` : ''}
    <div class="grand-total">
      <span>GRAND TOTAL:</span>
      <span>₹${order.grandTotal.toFixed(2)}</span>
    </div>
    <div class="totals-row" style="margin-top: 4px; font-size: 10px;">
      <span>Payment:</span>
      <span>${paymentMethodDisplay} (${paymentStatusDisplay})</span>
    </div>
  </div>

  ${fullDeliveryAddress ? `
  <div class="address-section">
    <div class="address-title">Delivery Address:</div>
    <div>${fullDeliveryAddress}</div>
  </div>` : ''}

  ${order.deliveryInstructions ? `
  <div class="instructions-box">
    <strong>Instructions:</strong> ${order.deliveryInstructions}
  </div>` : ''}

  <div class="text-center footer-msg">
    <div>— Prepare with care —</div>
    <div style="margin-top: 4px; font-weight: bold; font-size: 9px; letter-spacing: 0.5px;">POWERED BY QUICKBITE</div>
  </div>

  <script>window.onload = () => { window.print(); }</script>
</body>
</html>`;

  const win = window.open('', '_blank', 'width=400,height=600');
  if (!win) return;
  win.document.write(html);
  win.document.close();
}
