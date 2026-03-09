import React from 'react';
import { useNavigate } from 'react-router';
import { UtensilsCrossed } from 'lucide-react';

export default function NotFound() {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen flex flex-col items-center justify-center text-center p-6">
      <div className="text-6xl mb-4">🍽️</div>
      <h1 className="text-2xl text-gray-700 mb-2">페이지를 찾을 수 없어요</h1>
      <p className="text-gray-400 mb-6">메뉴는 없지만... 다시 시작해볼까요?</p>
      <button
        onClick={() => navigate('/home')}
        className="px-6 py-3 bg-orange-500 text-white rounded-xl hover:bg-orange-600 transition-colors"
      >
        홈으로 돌아가기
      </button>
    </div>
  );
}
