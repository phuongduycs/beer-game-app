# Beer Game — IUH (Multiplayer)

App mô phỏng chuỗi cung ứng 4 vai (Retailer → Wholesaler → Distributor → Factory) cho SV chơi từ nhà. Hỗ trợ 40 SV / 2 chuỗi / 8 nhóm / 5 SV mỗi nhóm.

## Logic game (đã verify khớp doc thầy)

- Tồn kho đầu: Retailer 12 / Wholesaler 18 / Distributor 25 / Factory 33
- Lead time: **2 tuần** (orders instant, shipment qua 2 ô delay)
- Chi phí: $1/đơn vị tồn kho, $2/đơn vị thiếu hàng
- Mô hình chuẩn khớp với file `beer-game-trace-v2-correct-model.xlsx` (tổng $760 với demand mẫu)

## Kiến trúc

```
Frontend (Next.js 14 + Tailwind) ─── Vercel
                │
                ├── WebSocket (socket.io-client)
                ▼
Backend (Node.js + Socket.io)    ─── Railway
                │
                ▼
State in-memory (Map<roomCode, GameState>)
```

MVP chạy state in-memory, không cần database (nếu muốn persist history để chấm điểm, chạy `schema.sql` trên Supabase).

## Chạy local để test

```bash
cd beer-game-app
npm install
npm run dev
# Mở http://localhost:3000
```

### Test multiplayer trên 1 máy
- Tab 1: `localhost:3000/teacher/create` → bấm Tạo → ghi nhớ mã
- Tab 2-9: `localhost:3000/join` → nhập mã, chọn chuỗi + vai → join
- Tab 1: set demand + bấm Start → bấm Advance mỗi tuần

## Deploy production

### Bước 1 — Push code lên GitHub
```bash
git init
git add .
git commit -m "Initial commit"
gh repo create beer-game-iuh --public --source=. --push
```

### Bước 2 — Deploy backend lên Railway
1. Vào https://railway.app → New Project → Deploy from GitHub repo
2. Chọn repo `beer-game-iuh`
3. Railway tự detect Nixpacks, chạy `npm install && npm run build` rồi `npm start`
4. Settings → Generate domain → ghi nhớ URL, ví dụ: `beer-game-iuh.up.railway.app`
5. (Tùy chọn) Variables: set `CORS_ORIGIN` = URL Vercel bên dưới

### Bước 3 — Deploy frontend lên Vercel
Trong trường hợp này, Next.js custom server đã host cả frontend + socket, nên **có thể chỉ cần Railway** (bỏ qua Vercel).

Nếu muốn tách Vercel cho frontend static faster:
1. Vercel → Import GitHub repo
2. Env var: `NEXT_PUBLIC_SOCKET_URL=https://beer-game-iuh.up.railway.app`
3. Deploy

### Bước 4 — Chia URL cho SV
SV truy cập: `https://beer-game-iuh.up.railway.app/join` (hoặc URL Vercel nếu tách).
GV truy cập: `/teacher/create` để tạo phòng.

## Các chức năng chính

### Sinh viên
- Vào `/join` → nhập mã phòng + tên + chọn chuỗi (A/B) + vai
- Tối đa 5 SV / vai, người đầu tiên làm **captain**
- Captain có nút "Chốt lệnh"; 4 SV còn lại bấm "Gửi gợi ý"
- Captain **tự động rotate mỗi 5 tuần**
- Chat nội bộ nhóm để thảo luận

### Giảng viên
- Vào `/teacher/create` → tạo phòng, nhận mã 6 ký tự
- Dashboard `/teacher/dashboard/[mã]`:
  - 2 panel cho Chuỗi A và Chuỗi B
  - Nhập **nhu cầu khách sống** mỗi tuần (hoặc dùng preset 4/6/8/10/12/15)
  - Bấm **Start** khi đủ SV, **Advance tuần** khi nhóm đã chốt xong
  - Biểu đồ **Bullwhip** realtime cho cả 2 chuỗi
  - Nếu vai nào không có SV → **AI (Anchor & Adjust)** chơi thay

## Cấu trúc code

```
beer-game-app/
├── src/
│   ├── app/
│   │   ├── page.tsx              ← Landing
│   │   ├── join/page.tsx         ← SV join
│   │   ├── play/[roomCode]/      ← SV play
│   │   └── teacher/
│   │       ├── create/page.tsx
│   │       └── dashboard/[roomCode]/page.tsx
│   ├── lib/
│   │   ├── types.ts              ← Shared types
│   │   ├── game-logic.ts         ← Core game mechanics (pure functions)
│   │   ├── socket-client.ts      ← Socket.io client singleton
│   │   └── useGame.ts            ← Hook subscribe state:update
│   ├── components/
│   │   ├── RoleCard.tsx
│   │   ├── ChatPanel.tsx
│   │   └── BullwhipChart.tsx
│   └── server/
│       └── game-engine.ts        ← (TypeScript — reference)
├── server/
│   ├── dev-server.js             ← Next.js + Socket.io dev
│   ├── prod-server.js            ← Production entry
│   └── engine-compiled.js        ← JS version of game-engine (server-side)
├── schema.sql                    ← Supabase schema (tùy chọn)
└── railway.json                  ← Railway deploy config
```

## Extensions có thể thêm

- [ ] Persist game history vào Supabase (export Excel cuối game)
- [ ] Auth qua Google SSO
- [ ] Recorded replay (xem lại từng tuần sau game)
- [ ] Custom demand patterns per class
- [ ] Export CSV báo cáo cho GV chấm điểm

## Nếu cần hỗ trợ

Logic game: check `src/lib/game-logic.ts` — khớp 100% prototype HTML đã verify. Nếu kết quả khác file Excel, kiểm tra strategy SV dùng (AI vs pass-through vs khác).
