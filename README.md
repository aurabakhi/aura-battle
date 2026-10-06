# Bảo Discord Bot

Discord bot để đồng bộ tin nhắn giữa Discord và Firebase Realtime Database.

## Cách hoạt động

1. **Discord → Firebase**: Bot lắng nghe tin nhắn Discord → lưu lên Firebase
2. **Firebase → Discord**: Web gửi tin nhắn lên Firebase → Bot gửi lên Discord
3. **Web → Firebase**: Web đọc từ Firebase → hiển thị tin nhắn

## Deploy lên Render (FREE)

### Bước 1: Tạo Discord Bot
1. Vào [Discord Developer Portal](https://discord.com/developers/applications)
2. Tạo New Application
3. Chọn "Bot" → Create Bot
4. Enable "Message Content Intent"
5. Copy **Bot Token**

### Bước 2: Lấy Firebase Service Account
1. Vào Firebase Console → Project Settings → Service Accounts
2. Bấm "Generate new private key"
3. Download file JSON
4. Copy các thông tin vào `bot-config.js`

### Bước 3: Điền config
Edit file `bot-config.js`:
- `DISCORD_BOT_TOKEN`: Bot token từ Discord
- `DISCORD_CHANNEL_ID`: ID channel Discord
- Các thông tin Firebase từ file JSON vừa download

### Bước 4: Deploy lên Render
1. Vào [Render.com](https://render.com)
2. Bấm "New +" → "Web Service"
3. Connect GitHub repo này
4. Build: `npm install`
5. Start: `node server.js`
6. Add Environment Variables (từ `bot-config.js`)
7. Deploy

### Bước 5: Deploy Web lên GitHub Pages
1. Vào GitHub repo → Settings → Pages
2. Source: main branch
3. Save

XONG! Bot sẽ chạy 24/7 và đồng bộ tin nhắn 2 chiều.
