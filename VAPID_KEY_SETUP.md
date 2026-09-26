# VAPID Key Setup cho Push Notifications

## Cách lấy VAPID Key từ Firebase Console:

1. Vào Firebase Console: https://console.firebase.google.com/
2. Chọn project "aurabakhi-2b90d"
3. Chọn **Project Settings** (cài đặt bánh răng)
4. Chọn tab **Cloud Messaging**
5. Cuộn xuống phần **Web configuration**
6. Click **Generate key pair** để tạo VAPID key
7. Copy **VAPID Key** (đoạn dài bắt đầu bằng "Bxxx...")
8. Paste vào file `users/script.js` thay thế "YOUR_VAPID_KEY_HERE"

## Lưu ý:
- VAPID Key là BẢO MẬT, không chia sẻ công khai
- Nhưng không quá nhạy cảm như API key
- Có thể lưu trong code client-side

## Sau khi có VAPID Key:
1. Thay thế "YOUR_VAPID_KEY_HERE" trong `users/script.js`
2. Test push notifications trên điện thoại
3. Admin có thể gửi thông báo cho users qua Firebase Console