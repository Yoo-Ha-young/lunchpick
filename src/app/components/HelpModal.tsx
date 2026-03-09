import React, { useState } from 'react';
import { X, HelpCircle, UtensilsCrossed, Users, DollarSign, MessageSquare, Star, Dice6, Settings } from 'lucide-react';

interface HelpModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type Section = 'intro' | 'roulette' | 'team' | 'settlement' | 'chat' | 'profile' | 'tips';

export default function HelpModal({ isOpen, onClose }: HelpModalProps) {
  const [activeSection, setActiveSection] = useState<Section>('intro');

  if (!isOpen) return null;

  const sections = [
    { id: 'intro' as Section, icon: HelpCircle, title: '소개', color: 'orange' },
    { id: 'roulette' as Section, icon: Dice6, title: '룰렛', color: 'purple' },
    { id: 'team' as Section, icon: Star, title: '팀 후보집', color: 'blue' },
    { id: 'settlement' as Section, icon: DollarSign, title: '정산', color: 'green' },
    { id: 'chat' as Section, icon: MessageSquare, title: '채팅', color: 'pink' },
    { id: 'profile' as Section, icon: Users, title: '프로필/인원', color: 'indigo' },
    { id: 'tips' as Section, icon: Settings, title: '팁', color: 'amber' },
  ];

  const getColorClasses = (color: string, active: boolean) => {
    const colors = {
      orange: active ? 'bg-orange-500 text-white' : 'bg-orange-50 text-orange-600',
      purple: active ? 'bg-purple-500 text-white' : 'bg-purple-50 text-purple-600',
      blue: active ? 'bg-blue-500 text-white' : 'bg-blue-50 text-blue-600',
      green: active ? 'bg-green-500 text-white' : 'bg-green-50 text-green-600',
      pink: active ? 'bg-pink-500 text-white' : 'bg-pink-50 text-pink-600',
      indigo: active ? 'bg-indigo-500 text-white' : 'bg-indigo-50 text-indigo-600',
      amber: active ? 'bg-amber-500 text-white' : 'bg-amber-50 text-amber-600',
    };
    return colors[color as keyof typeof colors] || colors.orange;
  };

  const renderContent = () => {
    switch (activeSection) {
      case 'intro':
        return (
          <div className="space-y-4">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-amber-500 rounded-xl flex items-center justify-center shadow-lg">
                <UtensilsCrossed className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-900">냠냠픽</h3>
                <p className="text-sm text-gray-500">팀 점심 선택을 쉽고 재미있게</p>
              </div>
            </div>

            <div className="bg-gradient-to-r from-orange-50 to-amber-50 rounded-xl p-4 border border-orange-100">
              <h4 className="font-semibold text-gray-900 mb-2">🎯 핵심 기능</h4>
              <ul className="space-y-2 text-sm text-gray-700">
                <li className="flex items-start gap-2">
                  <span className="text-orange-500 font-bold">•</span>
                  <span><strong>룰렛 선택:</strong> 위치 기반 식당을 룰렛으로 재미있게 선정</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-orange-500 font-bold">•</span>
                  <span><strong>팀 후보집:</strong> 자주 가는 식당을 저장하고 관리</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-orange-500 font-bold">•</span>
                  <span><strong>정산 계산기:</strong> 인원별 금액 계산 및 계좌 정보 저장</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-orange-500 font-bold">•</span>
                  <span><strong>채팅 및 투표:</strong> 실시간 소통과 카드 기능</span>
                </li>
              </ul>
            </div>

            <div className="bg-blue-50 rounded-xl p-4 border border-blue-100">
              <p className="text-sm text-blue-900">
                <strong>💡 시작하기:</strong> 왼쪽 탭에서 원하는 기능을 선택해 자세한 설명을 확인하세요!
              </p>
            </div>
          </div>
        );

      case 'roulette':
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <Dice6 className="w-5 h-5 text-purple-500" />
              룰렛으로 식당 선택하기
            </h3>

            <div className="space-y-3">
              <div className="bg-white rounded-lg p-4 border border-gray-200">
                <h4 className="font-semibold text-gray-900 mb-2">📍 1. 위치 설정</h4>
                <p className="text-sm text-gray-600 mb-2">
                  "주변 식당 불러오기" 버튼을 클릭하면 현재 위치 또는 입력한 주소를 기준으로 식당 목록을 가져옵니다.
                </p>
                <div className="bg-gray-50 rounded p-2 text-xs text-gray-500">
                  카카오맵 API를 사용해 실제 식당 정보를 불러옵니다.
                </div>
              </div>

              <div className="bg-white rounded-lg p-4 border border-gray-200">
                <h4 className="font-semibold text-gray-900 mb-2">🎲 2. 룰렛 돌리기</h4>
                <p className="text-sm text-gray-600 mb-2">
                  후보 카드가 나타나면 "룰렛 시작" 버튼을 눌러 랜덤으로 식당을 선정합니다.
                </p>
                <ul className="space-y-1 text-sm text-gray-600">
                  <li className="flex items-start gap-2">
                    <span className="text-purple-500">✓</span>
                    <span>카드를 클릭해 제외/포함 전환</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-purple-500">✓</span>
                    <span>최근 방문 식당은 자동으로 제외됨 (토글 가능)</span>
                  </li>
                </ul>
              </div>

              <div className="bg-white rounded-lg p-4 border border-gray-200">
                <h4 className="font-semibold text-gray-900 mb-2">🏷️ 3. 필터 및 설정</h4>
                <ul className="space-y-1 text-sm text-gray-600">
                  <li className="flex items-start gap-2">
                    <span className="text-purple-500">•</span>
                    <span><strong>카테고리 필터:</strong> 한식, 중식, 일식 등 원하는 카테고리만 표시</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-purple-500">•</span>
                    <span><strong>최근 방문 제외:</strong> N일 이내 방문한 식당 자동 제외</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-purple-500">•</span>
                    <span><strong>당번 지정:</strong> 오늘의 식사 당번 선택</span>
                  </li>
                </ul>
              </div>

              <div className="bg-white rounded-lg p-4 border border-gray-200">
                <h4 className="font-semibold text-gray-900 mb-2">📝 4. 후보 카드 기능</h4>
                <ul className="space-y-1 text-sm text-gray-600">
                  <li className="flex items-start gap-2">
                    <span className="text-purple-500">•</span>
                    <span><strong>팀 메모:</strong> 해당 식당에 대한 팀 공유 메모 작성</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-purple-500">•</span>
                    <span><strong>메뉴판 보기:</strong> 등록된 메뉴와 가격 정보 확인</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-purple-500">•</span>
                    <span><strong>가게 링크:</strong> 외부 링크로 상세 정보 확인</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        );

      case 'team':
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <Star className="w-5 h-5 text-blue-500" />
              팀 후보집 관리
            </h3>

            <div className="space-y-3">
              <div className="bg-white rounded-lg p-4 border border-gray-200">
                <h4 className="font-semibold text-gray-900 mb-2">⭐ 즐겨찾기 저장</h4>
                <p className="text-sm text-gray-600 mb-2">
                  자주 가는 식당을 팀 후보집에 저장해 두면 언제든지 빠르게 불러올 수 있습니다.
                </p>
                <div className="bg-blue-50 rounded p-3 text-sm text-blue-900 mt-2">
                  <strong>저장 방법:</strong> 룰렛 후보 카드에서 별 아이콘을 클릭하면 팀 후보집에 추가됩니다.
                </div>
              </div>

              <div className="bg-white rounded-lg p-4 border border-gray-200">
                <h4 className="font-semibold text-gray-900 mb-2">➕ 직접 추가하기</h4>
                <p className="text-sm text-gray-600 mb-2">
                  카카오맵에 없는 식당이나 특별한 장소도 직접 추가할 수 있습니다.
                </p>
                <ul className="space-y-1 text-sm text-gray-600 mt-2">
                  <li className="flex items-start gap-2">
                    <span className="text-blue-500">1.</span>
                    <span>팀 후보집 모달에서 "+ 직접 추가" 버튼 클릭</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-blue-500">2.</span>
                    <span>가게명, 카테고리, 주소 입력</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-blue-500">3.</span>
                    <span>가게 링크, 메뉴와 가격 정보 추가 (선택사항)</span>
                  </li>
                </ul>
              </div>

              <div className="bg-white rounded-lg p-4 border border-gray-200">
                <h4 className="font-semibold text-gray-900 mb-2">📋 메뉴판 관리</h4>
                <p className="text-sm text-gray-600">
                  팀 후보집에 저장된 식당은 메뉴와 가격 정보를 등록할 수 있습니다. 정산할 때 참고하세요!
                </p>
              </div>

              <div className="bg-white rounded-lg p-4 border border-gray-200">
                <h4 className="font-semibold text-gray-900 mb-2">🗂️ 빠른 불러오기</h4>
                <p className="text-sm text-gray-600">
                  룰렛 화면에서 "팀 후보집 불러오기" 버튼을 클릭하면 저장된 식당 목록을 한 번에 불러옵니다.
                </p>
              </div>
            </div>
          </div>
        );

      case 'settlement':
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-green-500" />
              정산 계산기
            </h3>

            <div className="space-y-3">
              <div className="bg-white rounded-lg p-4 border border-gray-200">
                <h4 className="font-semibold text-gray-900 mb-2">💰 1. 정산 시작하기</h4>
                <p className="text-sm text-gray-600 mb-2">
                  룰렛으로 식당이 결정되면 "정산하기" 버튼이 나타납니다.
                </p>
                <ul className="space-y-1 text-sm text-gray-600 mt-2">
                  <li className="flex items-start gap-2">
                    <span className="text-green-500">✓</span>
                    <span>총 금액을 입력하면 인원별로 자동 계산</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-green-500">✓</span>
                    <span>개별 금액 수동 조정 가능</span>
                  </li>
                </ul>
              </div>

              <div className="bg-white rounded-lg p-4 border border-gray-200">
                <h4 className="font-semibold text-gray-900 mb-2">💳 2. 계좌 정보 관리</h4>
                <p className="text-sm text-gray-600 mb-2">
                  프로필 설정에서 내 계좌 정보를 등록하면 정산 시 자동으로 표시됩니다.
                </p>
                <div className="bg-green-50 rounded p-3 text-sm text-green-900 mt-2">
                  <strong>💡 팁:</strong> 다른 멤버의 계좌 정보도 저장 가능! 정산 모달에서 "계좌 저장" 버튼을 클릭하세요.
                </div>
              </div>

              <div className="bg-white rounded-lg p-4 border border-gray-200">
                <h4 className="font-semibold text-gray-900 mb-2">📤 3. 정산 내역 공유</h4>
                <p className="text-sm text-gray-600">
                  "채팅에 공유" 버튼을 클릭하면 정산 내역이 리치 카드 형태로 채팅에 자동 전송됩니다.
                </p>
              </div>

              <div className="bg-white rounded-lg p-4 border border-gray-200">
                <h4 className="font-semibold text-gray-900 mb-2">🔄 4. 인원별 정산</h4>
                <ul className="space-y-1 text-sm text-gray-600">
                  <li className="flex items-start gap-2">
                    <span className="text-green-500">•</span>
                    <span>각 멤버별로 금액을 개별 수정 가능</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-green-500">•</span>
                    <span>불참한 멤버는 제외하고 계산</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-green-500">•</span>
                    <span>당번이 결정되어 있다면 자동으로 표시</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        );

      case 'chat':
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-pink-500" />
              채팅 및 리치 카드
            </h3>

            <div className="space-y-3">
              <div className="bg-white rounded-lg p-4 border border-gray-200">
                <h4 className="font-semibold text-gray-900 mb-2">💬 실시간 채팅</h4>
                <p className="text-sm text-gray-600 mb-2">
                  팀원들과 실시간으로 소통하며 점심 메뉴를 의논할 수 있습니다.
                </p>
                <div className="bg-pink-50 rounded p-3 text-sm text-pink-900 mt-2">
                  Firebase Realtime Database를 통해 실시간 동기화됩니다.
                </div>
              </div>

              <div className="bg-white rounded-lg p-4 border border-gray-200">
                <h4 className="font-semibold text-gray-900 mb-2">🎴 리치 카드 기능</h4>
                <p className="text-sm text-gray-600 mb-2">
                  특수 키워드를 입력하면 인터랙티브한 카드가 생성됩니다:
                </p>
                <ul className="space-y-2 text-sm">
                  <li className="bg-orange-50 rounded p-2 border border-orange-200">
                    <strong className="text-orange-700">#룰렛</strong>
                    <span className="text-gray-600 ml-2">→ 룰렛 결과 카드 (투표 기능 포함)</span>
                  </li>
                  <li className="bg-green-50 rounded p-2 border border-green-200">
                    <strong className="text-green-700">#정산</strong>
                    <span className="text-gray-600 ml-2">→ 정산 내역 카드 (계좌 정보 표시)</span>
                  </li>
                  <li className="bg-blue-50 rounded p-2 border border-blue-200">
                    <strong className="text-blue-700">#투표</strong>
                    <span className="text-gray-600 ml-2">→ 투표 카드 (직접 작성 또는 후보에서 선택)</span>
                  </li>
                </ul>
              </div>

              <div className="bg-white rounded-lg p-4 border border-gray-200">
                <h4 className="font-semibold text-gray-900 mb-2">👍 투표 시스템</h4>
                <p className="text-sm text-gray-600">
                  리치 카드에서 찬성/반대 버튼을 클릭해 의견을 표현할 수 있습니다. 누가 투표했는지 실시간으로 확인 가능합니다.
                </p>
              </div>

              <div className="bg-white rounded-lg p-4 border border-gray-200">
                <h4 className="font-semibold text-gray-900 mb-2">📍 위치 공유</h4>
                <p className="text-sm text-gray-600">
                  점심 카드에 식당 주소가 포함되어 있어 클릭 한 번으로 위치를 확인할 수 있습니다.
                </p>
              </div>
            </div>
          </div>
        );

      case 'profile':
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <Users className="w-5 h-5 text-indigo-500" />
              프로필 및 인원 관리
            </h3>

            <div className="space-y-3">
              <div className="bg-white rounded-lg p-4 border border-gray-200">
                <h4 className="font-semibold text-gray-900 mb-2">👤 내 프로필 설정</h4>
                <p className="text-sm text-gray-600 mb-2">
                  홈 화면에서 "프로필" 버튼을 클릭해 내 정보를 관리할 수 있습니다.
                </p>
                <ul className="space-y-1 text-sm text-gray-600 mt-2">
                  <li className="flex items-start gap-2">
                    <span className="text-indigo-500">•</span>
                    <span><strong>닉네임 변경:</strong> 채팅 및 정산에 표시될 이름</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-indigo-500">•</span>
                    <span><strong>계좌 정보:</strong> 은행, 계좌번호, 예금주 등록</span>
                  </li>
                </ul>
              </div>

              <div className="bg-white rounded-lg p-4 border border-gray-200">
                <h4 className="font-semibold text-gray-900 mb-2">👥 인원 목록 패널</h4>
                <p className="text-sm text-gray-600 mb-2">
                  룸 화면 오른쪽 상단의 인원 아이콘을 클릭하면 현재 룸의 모든 멤버를 확인할 수 있습니다.
                </p>
                <ul className="space-y-1 text-sm text-gray-600 mt-2">
                  <li className="flex items-start gap-2">
                    <span className="text-indigo-500">✓</span>
                    <span>방장은 👑 왕관 표시</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-indigo-500">✓</span>
                    <span>부방장은 ⭐ 별 표시</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-indigo-500">✓</span>
                    <span>오늘의 당번은 🍴 아이콘 표시</span>
                  </li>
                </ul>
              </div>

              <div className="bg-white rounded-lg p-4 border border-gray-200">
                <h4 className="font-semibold text-gray-900 mb-2">👑 부방장 지정</h4>
                <p className="text-sm text-gray-600 mb-2">
                  방장은 인원 목록에서 멤버를 클릭해 부방장으로 지정할 수 있습니다.
                </p>
                <div className="bg-indigo-50 rounded p-3 text-sm text-indigo-900 mt-2">
                  <strong>부방장 권한:</strong> 방장과 동일하게 룰렛 시작, 정산 관리 등 모든 기능 사용 가능
                </div>
              </div>

              <div className="bg-white rounded-lg p-4 border border-gray-200">
                <h4 className="font-semibold text-gray-900 mb-2">📤 룸 공유하기</h4>
                <p className="text-sm text-gray-600">
                  "공유하기" 버튼을 클릭하면 초대 코드가 생성됩니다. 이 코드를 팀원에게 전달해 룸에 초대하세요.
                </p>
              </div>
            </div>
          </div>
        );

      case 'tips':
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <Settings className="w-5 h-5 text-amber-500" />
              사용 팁
            </h3>

            <div className="space-y-3">
              <div className="bg-gradient-to-r from-amber-50 to-orange-50 rounded-lg p-4 border border-amber-200">
                <h4 className="font-semibold text-gray-900 mb-2">⚡ 빠른 사용 흐름</h4>
                <ol className="space-y-2 text-sm text-gray-700">
                  <li className="flex items-start gap-2">
                    <span className="font-bold text-amber-600">1.</span>
                    <span>룸 입장 → 주변 식당 불러오기 또는 팀 후보집 불러오기</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="font-bold text-amber-600">2.</span>
                    <span>카테고리 필터 설정 및 제외할 식당 선택</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="font-bold text-amber-600">3.</span>
                    <span>룰렛 돌리기 → 식당 결정</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="font-bold text-amber-600">4.</span>
                    <span>채팅에 "#룰렛" 결과 공유</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="font-bold text-amber-600">5.</span>
                    <span>식사 후 정산하기 → "#정산" 카드 공유</span>
                  </li>
                </ol>
              </div>

              <div className="bg-white rounded-lg p-4 border border-gray-200">
                <h4 className="font-semibold text-gray-900 mb-2">💡 유용한 팁</h4>
                <ul className="space-y-2 text-sm text-gray-600">
                  <li className="flex items-start gap-2">
                    <span className="text-amber-500">💾</span>
                    <span><strong>자주 가는 곳은 팀 후보집에:</strong> 매번 검색하지 말고 저장해두세요</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-amber-500">📝</span>
                    <span><strong>팀 메모 활용:</strong> "여기 김치찌개 맛집", "점심 혼잡함" 등 팁 공유</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-amber-500">🔄</span>
                    <span><strong>최근 방문 제외:</strong> 며칠 설정으로 다양한 식당 경험</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-amber-500">💳</span>
                    <span><strong>계좌 정보 미리 등록:</strong> 정산이 훨씬 빨라집니다</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-amber-500">🎯</span>
                    <span><strong>당번 기능:</strong> 돌아가면서 선택 부담 분산</span>
                  </li>
                </ul>
              </div>

              <div className="bg-white rounded-lg p-4 border border-gray-200">
                <h4 className="font-semibold text-gray-900 mb-2">🔧 문제 해결</h4>
                <ul className="space-y-2 text-sm text-gray-600">
                  <li className="flex items-start gap-2">
                    <span className="text-red-500">⚠️</span>
                    <span><strong>위치 정보 오류:</strong> 브라우저 위치 권한을 확인하세요</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-red-500">⚠️</span>
                    <span><strong>채팅이 안 보일 때:</strong> 페이지를 새로고침하세요</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-red-500">⚠️</span>
                    <span><strong>룰렛이 안 돌아갈 때:</strong> 최소 2개 이상의 후보가 필요합니다</span>
                  </li>
                </ul>
              </div>

              <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                <h4 className="font-semibold text-blue-900 mb-2">🎉 즐거운 점심 시간 되세요!</h4>
                <p className="text-sm text-blue-800">
                  냠냠픽으로 더 이상 "뭐 먹지?" 고민하지 마세요. 재미있는 룰렛과 편리한 정산으로 팀 점심 시간이 더 즐거워집니다! 🍱
                </p>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-orange-500 to-amber-500 px-6 py-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
              <HelpCircle className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">냠냠픽 사용 가이드</h2>
              <p className="text-xs text-orange-100">모든 기능을 한눈에 확인하세요</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg bg-white/20 hover:bg-white/30 transition-colors backdrop-blur-sm"
          >
            <X className="w-5 h-5 text-white" />
          </button>
        </div>

        {/* Content */}
        <div className="flex flex-1 overflow-hidden">
          {/* Sidebar */}
          <div className="w-40 bg-gray-50 border-r border-gray-200 overflow-y-auto">
            <div className="p-2 space-y-1">
              {sections.map((section) => {
                const Icon = section.icon;
                const isActive = activeSection === section.id;
                return (
                  <button
                    key={section.id}
                    onClick={() => setActiveSection(section.id)}
                    className={`w-full flex flex-col items-center gap-2 px-3 py-3 rounded-xl transition-all ${
                      getColorClasses(section.color, isActive)
                    } ${isActive ? 'shadow-md scale-105' : 'hover:scale-105'}`}
                  >
                    <Icon className="w-5 h-5" />
                    <span className="text-xs font-medium">{section.title}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Main Content */}
          <div className="flex-1 overflow-y-auto p-6">
            {renderContent()}
          </div>
        </div>

        {/* Footer */}
        <div className="bg-gray-50 px-6 py-4 border-t border-gray-200 flex items-center justify-between">
          <p className="text-xs text-gray-500">
            💡 왼쪽 탭을 클릭해 원하는 기능의 설명을 확인하세요
          </p>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-orange-500 text-white text-sm font-medium rounded-lg hover:bg-orange-600 transition-colors"
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  );
}