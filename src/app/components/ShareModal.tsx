import React, { useState } from 'react';
import { X, Copy, Check, Share2, Hash, Link } from 'lucide-react';
import { copyToClipboard } from '../utils';

interface ShareModalProps {
  roomId: string;
  roomName: string;
  onClose: () => void;
}

export default function ShareModal({ roomId, roomName, onClose }: ShareModalProps) {
  const shareUrl = `${window.location.origin}/room/${roomId}`;
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);

  const copyUrl = async () => {
    const ok = await copyToClipboard(shareUrl);
    if (ok) {
      setCopiedUrl(true);
      setTimeout(() => setCopiedUrl(false), 2000);
    }
  };

  const copyCode = async () => {
    const ok = await copyToClipboard(roomId);
    if (ok) {
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    }
  };

  const webShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${roomName} — 냠냠픽`,
          text: `팀 점심을 함께 골라요! 코드: ${roomId}`,
          url: shareUrl,
        });
      } catch {}
    } else {
      copyUrl();
    }
  };

  const hasWebShare = typeof navigator !== 'undefined' && !!navigator.share;

  return (
    <div
      className="fixed inset-0 bg-black/50 z-50 flex items-end justify-center"
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-white rounded-t-3xl w-full max-w-lg p-5 pb-10 animate-slide-up">
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-base font-semibold text-gray-900 flex items-center gap-2">
            <Share2 className="w-5 h-5 text-orange-500" />
            룸 공유하기
          </h2>
          <button onClick={onClose} className="p-1.5 rounded-xl hover:bg-gray-100 transition-colors">
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        <div className="space-y-4">
          {/* 초대 코드 */}
          <div className="bg-orange-50 border border-orange-100 rounded-2xl p-4">
            <p className="text-xs text-orange-500 mb-2 flex items-center gap-1">
              <Hash className="w-3.5 h-3.5" /> 초대 코드
            </p>
            <div className="flex items-center justify-between">
              <span className="text-3xl font-bold text-orange-600 tracking-widest">{roomId}</span>
              <button
                onClick={copyCode}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                  copiedCode
                    ? 'bg-green-500 text-white'
                    : 'bg-orange-500 text-white hover:bg-orange-600'
                }`}
              >
                {copiedCode ? <><Check className="w-4 h-4" /> 복사됨</> : <><Copy className="w-4 h-4" /> 복사</>}
              </button>
            </div>
            <p className="text-xs text-orange-400 mt-2">앱에서 "코드로 입장" → 위 코드를 입력하면 바로 참여할 수 있어요</p>
          </div>

          {/* 링크 공유 */}
          <div className="bg-gray-50 border border-gray-100 rounded-2xl p-4">
            <p className="text-xs text-gray-500 mb-2 flex items-center gap-1">
              <Link className="w-3.5 h-3.5" /> 링크로 공유
            </p>
            <div className="flex items-center gap-2">
              <div className="flex-1 bg-white border border-gray-200 rounded-xl px-3 py-2 min-w-0">
                <p className="text-xs text-gray-500 truncate">{shareUrl}</p>
              </div>
              <button
                onClick={copyUrl}
                className={`shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium transition-all ${
                  copiedUrl
                    ? 'bg-green-500 text-white'
                    : 'bg-gray-800 text-white hover:bg-gray-700'
                }`}
              >
                {copiedUrl ? <><Check className="w-4 h-4" /> 복사됨</> : <><Copy className="w-4 h-4" /> 복사</>}
              </button>
            </div>
          </div>

          {/* Web Share API */}
          {hasWebShare && (
            <button
              onClick={webShare}
              className="w-full py-3.5 border-2 border-dashed border-orange-200 text-orange-500 rounded-xl hover:bg-orange-50 transition-colors text-sm font-medium flex items-center justify-center gap-2"
            >
              <Share2 className="w-4 h-4" />
              다른 앱으로 공유하기
            </button>
          )}
        </div>
      </div>
    </div>
  );
}