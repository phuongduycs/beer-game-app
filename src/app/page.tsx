import Link from 'next/link';

export default function Home() {
  return (
    <div className="min-h-screen">
      {/* Hero */}
      <div className="bg-gradient-to-br from-purple-600 via-blue-600 to-emerald-600 text-white">
        <div className="max-w-5xl mx-auto px-6 py-16">
          <div className="text-6xl mb-4">🍺</div>
          <h1 className="text-5xl md:text-6xl font-bold mb-3">Beer Game — IUH</h1>
          <p className="text-lg text-white/90 max-w-2xl">
            Mô phỏng chuỗi cung ứng 4 vai cho sinh viên. 40 SV / 2 chuỗi thi đấu / 8 nhóm / 5 SV mỗi nhóm.
          </p>
        </div>
      </div>

      {/* CTA cards */}
      <div className="max-w-5xl mx-auto px-6 -mt-10">
        <div className="grid md:grid-cols-2 gap-6">
          <Link href="/join"
            className="group bg-white rounded-2xl shadow-lg p-8 border-t-4 border-blue-500 card-hover">
            <div className="text-5xl mb-3">🎮</div>
            <h2 className="text-2xl font-bold mb-2">Sinh viên</h2>
            <p className="text-gray-600 mb-4">Vào phòng game bằng mã GV cung cấp</p>
            <div className="inline-flex items-center gap-1 text-blue-600 font-semibold group-hover:gap-2 transition-all">
              Tham gia <span>→</span>
            </div>
          </Link>

          <Link href="/teacher/create"
            className="group bg-white rounded-2xl shadow-lg p-8 border-t-4 border-purple-500 card-hover">
            <div className="text-5xl mb-3">👨‍🏫</div>
            <h2 className="text-2xl font-bold mb-2">Giảng viên</h2>
            <p className="text-gray-600 mb-4">Tạo phòng mới và điều hành trận đấu</p>
            <div className="inline-flex items-center gap-1 text-purple-600 font-semibold group-hover:gap-2 transition-all">
              Tạo phòng <span>→</span>
            </div>
          </Link>
        </div>
      </div>

      {/* Game info */}
      <div className="max-w-5xl mx-auto px-6 py-12 grid md:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl shadow-sm p-5 border-l-4 border-emerald-500">
          <div className="text-2xl mb-1">⏱</div>
          <div className="font-bold mb-1">Pipeline ASYNC</div>
          <div className="text-sm text-gray-600">Mỗi vai có 90s để quyết. Hết giờ → AI chốt thay.</div>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-5 border-l-4 border-amber-500">
          <div className="text-2xl mb-1">🚚</div>
          <div className="font-bold mb-1">Lead time 2 tuần</div>
          <div className="text-sm text-gray-600">Đặt tuần N → nhận tuần N+2. Cần lập kế hoạch trước.</div>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-5 border-l-4 border-rose-500">
          <div className="text-2xl mb-1">💰</div>
          <div className="font-bold mb-1">Tồn $1 • Thiếu $2</div>
          <div className="text-sm text-gray-600">Cân bằng giữa tồn kho và đáp ứng nhu cầu.</div>
        </div>
      </div>

      {/* Luật chơi chi tiết */}
      <div className="max-w-5xl mx-auto px-6 pb-12">
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h3 className="font-bold text-lg mb-3">Luật chơi chi tiết</h3>
          <div className="grid md:grid-cols-2 gap-4 text-sm text-gray-700">
            <div>
              <div className="font-semibold mb-1">📦 Khởi đầu</div>
              <ul className="list-disc pl-5 space-y-1 text-gray-600">
                <li>Tồn kho: Retailer 12, Wholesaler 18, Distributor 25, Factory 33</li>
                <li>Chưa có hàng đang về, chưa có đơn đang đến</li>
              </ul>
            </div>
            <div>
              <div className="font-semibold mb-1">🔄 Pipeline</div>
              <ul className="list-disc pl-5 space-y-1 text-gray-600">
                <li>Mỗi link chỉ có 1 token đơn cùng lúc</li>
                <li>R không gửi đơn mới nếu W chưa chốt đơn cũ</li>
              </ul>
            </div>
            <div>
              <div className="font-semibold mb-1">👑 Captain</div>
              <ul className="list-disc pl-5 space-y-1 text-gray-600">
                <li>SV vào đầu = captain, được quyền chốt</li>
                <li>4 SV còn lại gợi ý qua chat</li>
                <li>Rotate mỗi 5 tuần hoàn thành</li>
              </ul>
            </div>
            <div>
              <div className="font-semibold mb-1">🤖 AI & Reset</div>
              <ul className="list-disc pl-5 space-y-1 text-gray-600">
                <li>Hết 90s mà chưa chốt → AI (Anchor & Adjust) chốt thay</li>
                <li>GV có thể Reset game bất cứ lúc nào</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
