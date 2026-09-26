# Aura Battle - User Website

Bản này chỉ làm phần website cho người dùng. Chưa có admin.

## Flow

Trang đầu:
- Đăng ký
- Xem lịch đấu

Đăng ký:
- Nhập tên
- Nhập lớp
- Gửi đơn
- Hiện "Đang chờ duyệt"

Lịch:
- Đọc collection `matches`
- Chỉ hiển thị các trận mà admin sau này đã tạo.

## Firebase setup

1. Tạo Firebase project.
2. Tạo Web App.
3. Bật Firestore Database.
4. Lấy Firebase config và dán vào `firebase.js`.
5. Dán nội dung `firestore.rules` vào Firestore Rules và Publish.
6. Upload các file lên GitHub Pages hoặc chạy bằng một static server.

## Collections

### registrations

Ví dụ:
```text
{
  name: "Nguyen Van A",
  className: "9A1",
  status: "pending",
  createdAt: ...
}
```

### matches

Sau này admin sẽ tạo:
```text
{
  player1: "Nguyen Van A",
  player2: "Tran Van B",
  dateTime: Timestamp(...)
}
```

Lưu ý: bản hiện tại chưa có admin và chưa có cơ chế duyệt. Người dùng chỉ tạo được đơn `pending`; client không thể tự đổi sang `approved`.
