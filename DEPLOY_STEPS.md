# DEPLOY FIREBASE FUNCTIONS - TỪNG BƯỚC

## BƯỚC 1: Login Firebase
Mở cmd, chạy:
```
cd C:\Users\TGDD\Desktop\Bảo Discord
firebase login
```
- Nó sẽ mở browser
- Login Google account
- Đóng browser sau khi login xong

## BƯỚC 2: Set Environment Variables
1. Vào Firebase Console: https://console.firebase.google.com/
2. Chọn project: aurabakhi-2b90d
3. Chọn "Functions" ở menu trái
4. Chọn "Settings" (biểu tượng gear)
5. Chọn tab "Environment variables"
6. Bấm "Add variable"
7. Thêm:
   - Name: `discord.token`
   - Value: Discord bot token của bạn (lấy từ Discord Developer Portal)
8. Bấm "Add variable" lần nữa
9. Thêm:
   - Name: `discord.channel_id`
   - Value: Channel ID Discord của bạn
10. Save

## BƯỚC 3: Deploy
Trong cmd, chạy:
```
firebase deploy --only functions
```
- Chờ 2-3 phút
- Khi thấy "Deploy complete!" là xong

## BƯỚC 4: Test
- Mở website
- Gửi tin nhắn từ web → sẽ hiện trên Discord
- Gửi tin nhắn từ Discord → sẽ hiện trên web

XONG!
