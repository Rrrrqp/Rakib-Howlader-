import { getBrandSettings } from './settingsService';
import { Order } from '../types';

// Chime sound for new orders
const ORDER_ALERT_SOUND_URL = 'https://assets.mixkit.co/active_storage/sfx/2869/2869-600.wav';

export const playNotificationSound = () => {
  try {
    const audio = new Audio(ORDER_ALERT_SOUND_URL);
    audio.volume = 0.8;
    audio.play().catch(err => {
      console.warn("Browser audio autoplay blocked or deferred:", err);
    });
  } catch (err) {
    console.error("Failed to play notification sound:", err);
  }
};

// Request browser notification permission
export const requestBrowserNotificationPermission = async (): Promise<boolean> => {
  if (!('Notification' in window)) {
    console.warn("Browser does not support desktop notifications");
    return false;
  }
  
  if (Notification.permission === 'granted') {
    return true;
  }
  
  if (Notification.permission !== 'denied') {
    const permission = await Notification.requestPermission();
    return permission === 'granted';
  }
  
  return false;
};

// Send browser standard desktop/mobile push alert
export const sendBrowserNotification = (title: string, body: string, icon?: string) => {
  if (!('Notification' in window) || Notification.permission !== 'granted') {
    return;
  }
  
  try {
    const n = new Notification(title, {
      body,
      icon: icon || '/favicon.ico',
      tag: 'new-order',
      requireInteraction: true
    });
    
    n.onclick = () => {
      window.focus();
      n.close();
    };
  } catch (err) {
    console.error("Failed to trigger browser notification:", err);
  }
};

// Send Telegram bot notification to client's chat ID
export const sendTelegramNotification = async (order: any): Promise<boolean> => {
  try {
    const settings = await getBrandSettings();
    if (!settings || !settings.telegramToken || !settings.telegramChatId) {
      console.log("Telegram settings are not configured yet in Admin.");
      return false;
    }

    const { telegramToken, telegramChatId } = settings;
    const token = telegramToken.trim();
    const chatId = telegramChatId.trim();

    if (!token || !chatId) return false;

    // Format clean product items list
    const itemsDetails = order.items && order.items.length > 0
      ? order.items.map((item: any, index: number) => `${index+1}. 🛍️ *${item.productTitle}* (${item.productCode})\n📏 সাইজ: ${item.size} | পরিমাণ: ${item.quantity}টি | মূল্য: ৳${item.price}`).join('\n\n')
      : `🛍️ *${order.category || 'Product'}* (${order.productCode || 'N/A'})\n📏 পরিমাণ: ${order.quantity || 1}টি | মূল্য: ৳${order.price || 0}`;

    const cleanDistrict = order.district || 'Unspecified';
    const cleanUpazila = order.upazila || 'Unspecified';

    const messageText = `🔔 *নতুন অর্ডার কনফার্ম হয়েছে! (NEW ORDER)* 🔔
-------------------------------------------
🆔 *অর্ডার আইডি (Order ID):* \`${order.orderId}\`
👤 *কাস্টমার নাম (Name):* _${order.customerName}_
📞 *মোবাইল নাম্বার (Mobile):* \`${order.mobileNumber}\`
📍 *ঠিকানা (Address):* _${order.address}_, ${cleanUpazila}, ${cleanDistrict}

📋 *অর্ডারের প্রোডাক্টস (Items):*
${itemsDetails}

💵 *ডেলিভারি চার্জ (Delivery):* ৳${order.deliveryCharge}
💰 *সর্বমোট বিল (Net Total):* ৳${order.totalAmount}
💳 *পেমেন্ট পদ্ধতি (Payment):* *${order.paymentMethod}*
${order.transactionId ? `🔑 *ট্রানজেকশন (TxID):* \`${order.transactionId}\`` : ''}
${order.note ? `📝 *স্পেশাল নোট (Note):* _${order.note}_` : ''}
-------------------------------------------
⚡ *Sera Fashion House Order System* ⚡`;

    const url = `https://api.telegram.org/bot${token}/sendMessage`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        chat_id: chatId,
        text: messageText,
        parse_mode: 'Markdown',
      })
    });

    if (!response.ok) {
      const text = await response.text();
      console.error("Telegram API Error response:", text);
      return false;
    }

    return true;
  } catch (error) {
    console.error("Failed to send Telegram notification:", error);
    return false;
  }
};

// Unified dispatcher for order confirmations
export const dispatchOrderNotifications = async (order: any) => {
  try {
    // 1. Play chime alert
    const settings = await getBrandSettings();
    if (!settings || settings.soundEnabled !== false) {
      playNotificationSound();
    }
    
    // 2. Trigger browser notification if authorized
    if (!settings || settings.pushEnabled !== false) {
      sendBrowserNotification(
        '🛍️ নতুন অর্ডার পাওয়া গেছে!',
        `অর্ডার আইডি: ${order.orderId}\nকাস্টমার: ${order.customerName}\nমোবাইল: ${order.mobileNumber}\nমোট মূল্য: ৳${order.totalAmount}`
      );
    }
  } catch (e) {
    console.warn("Local notification dispatcher error:", e);
  }

  // 3. Deliver instantly to Telegram-enabled phone
  await sendTelegramNotification(order);
};
