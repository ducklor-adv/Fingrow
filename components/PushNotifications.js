import { Alert } from 'react-native';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';

// Configure notification behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

class PushNotificationService {
  constructor() {
    this.expoPushToken = null;
    this.notificationListener = null;
    this.responseListener = null;
  }

  async registerForPushNotificationsAsync() {
    try {
      let token;

      if (Constants.isDevice) {
        const { status: existingStatus } = await Notifications.getPermissionsAsync();
        let finalStatus = existingStatus;

        if (existingStatus !== 'granted') {
          const { status } = await Notifications.requestPermissionsAsync();
          finalStatus = status;
        }

        if (finalStatus !== 'granted') {
          Alert.alert('ข้อผิดพลาด', 'ไม่ได้รับอนุญาตส่งการแจ้งเตือน');
          return null;
        }

        token = (await Notifications.getExpoPushTokenAsync()).data;
        console.log('Expo Push Token:', token);
      } else {
        Alert.alert('ข้อผิดพลาด', 'ต้องใช้อุปกรณ์จริงเพื่อการแจ้งเตือน');
      }

      // Configure notification channel for Android
      if (Platform.OS === 'android') {
        Notifications.setNotificationChannelAsync('default', {
          name: 'default',
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#10b981',
        });
      }

      this.expoPushToken = token;
      return token;
    } catch (error) {
      console.error('Error registering for push notifications:', error);
      return null;
    }
  }

  setupNotificationListeners() {
    // Handle notifications received while app is foregrounded
    this.notificationListener = Notifications.addNotificationReceivedListener(notification => {
      console.log('Notification received:', notification);
      // You can customize how to handle foreground notifications here
    });

    // Handle user tapping on notifications
    this.responseListener = Notifications.addNotificationResponseReceivedListener(response => {
      console.log('Notification response:', response);
      const { notification } = response;
      const { data } = notification.request.content;

      // Handle different notification types
      if (data?.type === 'new_order') {
        // Navigate to orders screen
        console.log('Navigate to orders for new order');
      } else if (data?.type === 'earnings_update') {
        // Navigate to earnings screen
        console.log('Navigate to earnings for update');
      } else if (data?.type === 'referral_joined') {
        // Navigate to referral screen
        console.log('Navigate to referral for new member');
      }
    });
  }

  removeNotificationListeners() {
    if (this.notificationListener) {
      Notifications.removeNotificationSubscription(this.notificationListener);
    }
    if (this.responseListener) {
      Notifications.removeNotificationSubscription(this.responseListener);
    }
  }

  async sendLocalNotification(title, body, data = {}) {
    try {
      await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          data,
          sound: 'default',
        },
        trigger: null, // Send immediately
      });
    } catch (error) {
      console.error('Error sending local notification:', error);
    }
  }

  // Simulate different types of notifications for demo
  async sendDemoNotifications() {
    const notifications = [
      {
        title: 'มีออเดอร์ใหม่! 🎉',
        body: 'มีคนสั่งซื้อ "เก้าอี้ไม้โอ๊ค" จากคุณแล้ว',
        data: { type: 'new_order', orderId: 'order_123' }
      },
      {
        title: 'อัพเดทรายได้ 💰',
        body: 'คุณได้รับรายได้ 25.50 WLD จากการแบ่งกำไร',
        data: { type: 'earnings_update', amount: 25.50 }
      },
      {
        title: 'สมาชิกใหม่เข้าร่วม 👥',
        body: 'มีเพื่อนคนใหม่สมัครผ่านลิงก์ของคุณ',
        data: { type: 'referral_joined', userId: 'user_456' }
      },
      {
        title: 'อัพเดทราคา WLD 📈',
        body: '1 WLD = 98.50 THB (เพิ่มขึ้น +2.3%)',
        data: { type: 'price_update', currency: 'THB', rate: 98.50 }
      }
    ];

    // Send notifications with delays
    for (let i = 0; i < notifications.length; i++) {
      setTimeout(() => {
        this.sendLocalNotification(
          notifications[i].title,
          notifications[i].body,
          notifications[i].data
        );
      }, i * 3000); // 3 seconds apart
    }
  }

  async scheduleDailyEarningsNotification() {
    // Schedule daily earnings summary at 6 PM
    try {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: 'สรุปรายได้ประจำวัน 📊',
          body: 'ดูรายได้และสถิติการขายวันนี้',
          data: { type: 'daily_summary' },
        },
        trigger: {
          hour: 18,
          minute: 0,
          repeats: true,
        },
      });
    } catch (error) {
      console.error('Error scheduling daily notification:', error);
    }
  }

  async cancelAllNotifications() {
    try {
      await Notifications.cancelAllScheduledNotificationsAsync();
      console.log('All scheduled notifications cancelled');
    } catch (error) {
      console.error('Error cancelling notifications:', error);
    }
  }
}

// Create a singleton instance
const pushNotificationService = new PushNotificationService();

export default pushNotificationService;