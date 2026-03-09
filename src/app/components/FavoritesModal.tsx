import React, { useState } from 'react';
import {
  X, Star, Trash2, Plus, Link2,
  UtensilsCrossed, CheckSquare, Square, ChevronDown, ChevronUp
} from 'lucide-react';
import { Place, CATEGORY_LABEL, CATEGORY_EMOJI } from '../types';

interface FavoritesModalProps {
  savedPlaces: Place[];
  currentCandidateIds: Set<string>;
  onLoad: (places: Place[]) => void;
  onRemove: (placeId: string) => void;
  onClose: () => void;
}

export default function FavoritesModal({
  savedPlaces,
  currentCandidateIds,
  onLoad,
  onRemove,
  onClose,
}: FavoritesModalProps) {
  // ✅ Set 대신 string[] 배열 사용 — React가 변경을 확실히 감지
  const [selected, setSelected] = useState<string[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const isSelected = (id: string) => selected.includes(id);

  const toggle = (placeId: string) => {
    setSelected(prev =>
      prev.includes(placeId)
        ? prev.filter(id => id !== placeId)
        : [...prev, placeId]
    );
  };

  const selectAll = () => {
    const notAdded = savedPlaces
      .filter(p => !currentCandidateIds.has(p.placeId))
      .map(p => p.placeId);
    setSelected(notAdded);
  };

  const clearAll = () => setSelected([]);

  const handleLoad = () => {
    const places = savedPlaces.filter(p => selected.includes(p.placeId));
    if (places.length === 0) return;
    onLoad(places);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 bg-black/50 z-50 flex items-end justify-center"
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-white rounded-t-3xl w-full max-w-lg max-h-[88vh] flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-gray-100 shrink-0">
          <div>
            <h2 className="text-base font-semibold text-gray-900 flex items-center gap-2">
              <Star className="w-5 h-5 text-orange-500 fill-orange-400" />
              팀 후보집
            </h2>
            <p className="text-xs text-gray-400 mt-0.5">저장된 식당 {savedPlaces.length}곳</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-xl hover:bg-gray-100 transition-colors">
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        {savedPlaces.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center py-16 text-gray-400">
            <Star className="w-12 h-12 mb-3 opacity-20" />
            <p className="text-sm">아직 저장된 후보집이 없어요</p>
            <p className="text-xs mt-1 text-gray-300">
              후보 직접 추가 시 "후보집에 저장" 버튼을 눌러주세요
            </p>
          </div>
        ) : (
          <>
            {/* 전체 선택 / 전체 해제 */}
            <div className="px-5 py-2.5 flex items-center justify-between bg-gray-50 border-b border-gray-100 shrink-0">
              <span className="text-xs text-gray-500">
                {selected.length > 0 ? `${selected.length}개 선택됨` : '항목을 눌러서 선택하세요'}
              </span>
              <div className="flex gap-3">
                <button
                  onClick={selectAll}
                  className="text-xs text-orange-500 hover:text-orange-700 font-medium"
                >
                  전체 선택
                </button>
                <button
                  onClick={clearAll}
                  className="text-xs text-gray-400 hover:text-gray-600"
                >
                  전체 해제
                </button>
              </div>
            </div>

            {/* 목록 */}
            <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
              {savedPlaces.map(place => {
                const checked = isSelected(place.placeId);
                const alreadyAdded = currentCandidateIds.has(place.placeId);
                const isExpanded = expandedId === place.placeId;

                return (
                  <div
                    key={place.placeId}
                    className={`rounded-2xl border overflow-hidden transition-all ${
                      alreadyAdded
                        ? 'border-gray-100 bg-gray-50 opacity-60'
                        : checked
                        ? 'border-orange-400 bg-orange-50 shadow-sm shadow-orange-100'
                        : 'border-gray-200 bg-white hover:border-orange-200 hover:bg-orange-50/40'
                    }`}
                  >
                    {/* ✅ 카드 전체 영역이 선택 토글 */}
                    <div
                      className={`flex items-center gap-3 p-3 cursor-pointer`}
                      onClick={() => {
                        toggle(place.placeId);
                      }}
                    >
                      {/* 체크 아이콘 */}
                      <div className="shrink-0">
                        {checked
                          ? <CheckSquare className="w-5 h-5 text-orange-500" />
                          : <Square className="w-5 h-5 text-gray-300" />
                        }
                      </div>

                      {/* 카테고리 이모지 */}
                      <div className="w-9 h-9 rounded-xl bg-orange-50 flex items-center justify-center text-lg shrink-0">
                        {CATEGORY_EMOJI[place.category]}
                      </div>

                      {/* 식당 정보 */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium text-gray-800 truncate">{place.name}</p>
                          {alreadyAdded && (
                            <span className="text-[10px] bg-gray-200 text-gray-500 px-1.5 py-0.5 rounded-full shrink-0">
                              이미 추가됨
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-gray-400 mt-0.5 truncate">
                          {CATEGORY_LABEL[place.category]}
                          {place.priceRange ? ` · ${place.priceRange}` : ''}
                          {place.address && place.address !== '주소 미입력'
                            ? ` · ${place.address}`
                            : ''}
                        </p>
                      </div>

                      {/* 우측 버튼들 — 클릭이 카드 토글에 영향 주지 않도록 stopPropagation */}
                      <div
                        className="flex items-center gap-1 shrink-0"
                        onClick={e => e.stopPropagation()}
                      >
                        {(place.placeLink || place.kakaoUrl) && (
                          <a
                            href={place.placeLink || place.kakaoUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="w-7 h-7 flex items-center justify-center bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                          >
                            <Link2 className="w-3.5 h-3.5 text-gray-500" />
                          </a>
                        )}
                        {!!(place.menuItems?.length || place.representativeMenu?.length) && (
                          <button
                            onClick={() => setExpandedId(isExpanded ? null : place.placeId)}
                            className="w-7 h-7 flex items-center justify-center bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                          >
                            {isExpanded
                              ? <ChevronUp className="w-3.5 h-3.5 text-gray-500" />
                              : <ChevronDown className="w-3.5 h-3.5 text-gray-500" />}
                          </button>
                        )}
                        <button
                          onClick={() => onRemove(place.placeId)}
                          className="w-7 h-7 flex items-center justify-center bg-red-50 hover:bg-red-100 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5 text-red-400" />
                        </button>
                      </div>
                    </div>

                    {/* 메뉴 펼침 */}
                    {isExpanded && (
                      <div className="px-4 pb-3 border-t border-gray-100 pt-2.5">
                        <p className="text-xs text-gray-500 mb-1.5 flex items-center gap-1">
                          <UtensilsCrossed className="w-3 h-3" /> 대표 메뉴
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          {(place.menuItems
                            ? place.menuItems
                            : (place.representativeMenu ?? []).map(n => ({ name: n }))
                          ).map((m, i) => (
                            <span
                              key={i}
                              className="text-xs bg-orange-50 text-orange-700 border border-orange-100 px-2 py-1 rounded-full flex items-center gap-1"
                            >
                              {m.name}
                              {'price' in m && (m as { name: string; price?: string }).price && (
                                <span className="text-orange-400 font-medium">
                                  {(m as { name: string; price?: string }).price}
                                </span>
                              )}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Footer */}
            <div className="px-5 pb-8 pt-3 border-t border-gray-100 shrink-0">
              <button
                onClick={handleLoad}
                disabled={selected.length === 0}
                className="w-full py-3.5 bg-orange-500 hover:bg-orange-600 disabled:bg-gray-200 disabled:text-gray-400 text-white rounded-xl text-sm font-medium transition-colors flex items-center justify-center gap-2"
              >
                <Plus className="w-4 h-4" />
                {selected.length > 0 ? `선택한 ${selected.length}개 후보에 불러오기` : '후보에 불러오기'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
