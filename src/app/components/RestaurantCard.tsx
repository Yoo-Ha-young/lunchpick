import React, { useState, useRef, useEffect } from 'react';
import {
  Place, PlaceNote, MenuItem,
  CATEGORY_LABEL, CATEGORY_EMOJI,
  parsePriceTier, PRICE_TIER_LABEL, PRICE_TIER_EMOJI, PRICE_TIER_COLOR
} from '../types';
import {
  Star, MapPin, Trash2, ExternalLink, ChevronDown, ChevronUp,
  UtensilsCrossed, AlertCircle, Phone, Wallet,
  StickyNote, Plus, X, Check, Pencil, GripVertical
} from 'lucide-react';
import { getPlaceNote, updatePlaceNote } from '../store';

interface RestaurantCardProps {
  place: Place;
  roomId?: string;          // 있으면 메모/메뉴 저장 기능 활성화
  excluded?: boolean;
  excludeReason?: string;
  isSelected?: boolean;
  onSelect?: () => void;
  onDelete?: () => void;
  onAddToFavorites?: (place: Place) => void;  // 팀 후보집 추가
  isFavorite?: boolean;     // 이미 팀 후보집에 있는지 여부
  onInclude?: () => void;   // 제외된 후보를 다시 포함
}

/* ── 메뉴 아이템 편집 행 ─────────────────────────────────── */
function MenuItemRow({
  item, index, onUpdate, onRemove,
}: {
  item: MenuItem;
  index: number;
  onUpdate: (idx: number, item: MenuItem) => void;
  onRemove: (idx: number) => void;
}) {
  return (
    <div className="flex items-center gap-1.5 group">
      <GripVertical className="w-3.5 h-3.5 text-gray-200 shrink-0" />
      <input
        placeholder="메뉴 이름"
        value={item.name}
        onChange={e => onUpdate(index, { ...item, name: e.target.value })}
        className="flex-1 min-w-0 px-2.5 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-orange-300 bg-gray-50 focus:bg-white"
      />
      <input
        placeholder="가격 (선택)"
        value={item.price ?? ''}
        onChange={e => onUpdate(index, { ...item, price: e.target.value || undefined })}
        className="w-24 px-2.5 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-orange-300 bg-gray-50 focus:bg-white shrink-0"
      />
      <button
        onClick={() => onRemove(index)}
        className="p-1 text-gray-200 hover:text-red-400 transition-colors shrink-0"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

/* ── 메모·메뉴 패널 (인라인 편집) ──────────────────────────── */
function NotesPanel({
  roomId, placeId, initialNote, onSave,
}: {
  roomId: string;
  placeId: string;
  initialNote: PlaceNote | null;
  onSave?: (note: PlaceNote) => void;
}) {
  const [memo, setMemo] = useState(initialNote?.memo ?? '');
  const [menuItems, setMenuItems] = useState<MenuItem[]>(initialNote?.menuItems ?? []);
  const [editMode, setEditMode] = useState(false);
  const [saved, setSaved] = useState(false);
  const memoRef = useRef<HTMLTextAreaElement>(null);

  // 편집모드 진입 시 textarea 포커스
  useEffect(() => {
    if (editMode) memoRef.current?.focus();
  }, [editMode]);

  const handleSave = () => {
    const note: PlaceNote = {
      memo: memo.trim() || undefined,
      menuItems: menuItems.filter(m => m.name.trim()).length > 0
        ? menuItems.filter(m => m.name.trim())
        : undefined,
    };
    updatePlaceNote(roomId, placeId, note);
    setEditMode(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 1800);
    onSave?.(note);
  };

  const addMenuItem = () => {
    setMenuItems(prev => [...prev, { name: '', price: undefined }]);
  };

  const updateItem = (idx: number, item: MenuItem) => {
    setMenuItems(prev => prev.map((m, i) => (i === idx ? item : m)));
  };

  const removeItem = (idx: number) => {
    setMenuItems(prev => prev.filter((_, i) => i !== idx));
  };

  const hasData = memo.trim() || menuItems.some(m => m.name.trim());

  return (
    <div className="border-t border-gray-50 pt-3 space-y-3">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-1.5 text-xs font-medium text-gray-500">
          <StickyNote className="w-3.5 h-3.5 text-orange-400" />
          팀 메모 · 메뉴판
          <span className="text-[10px] text-gray-300 font-normal">방에 영구 저장</span>
        </span>
        <div className="flex items-center gap-1.5">
          {saved && (
            <span className="flex items-center gap-1 text-[10px] text-green-500">
              <Check className="w-3 h-3" /> 저장됨
            </span>
          )}
          {!editMode ? (
            <button
              onClick={() => setEditMode(true)}
              className="flex items-center gap-1 text-[11px] text-orange-500 hover:text-orange-600 bg-orange-50 hover:bg-orange-100 px-2 py-1 rounded-lg transition-colors"
            >
              <Pencil className="w-3 h-3" />
              {hasData ? '수정' : '추가'}
            </button>
          ) : (
            <div className="flex items-center gap-1">
              <button
                onClick={() => {
                  setMemo(initialNote?.memo ?? '');
                  setMenuItems(initialNote?.menuItems ?? []);
                  setEditMode(false);
                }}
                className="text-[11px] text-gray-400 hover:text-gray-600 px-2 py-1 rounded-lg hover:bg-gray-100 transition-colors"
              >
                취소
              </button>
              <button
                onClick={handleSave}
                className="flex items-center gap-1 text-[11px] text-white bg-orange-500 hover:bg-orange-600 px-2.5 py-1 rounded-lg transition-colors"
              >
                <Check className="w-3 h-3" /> 저장
              </button>
            </div>
          )}
        </div>
      </div>

      {/* 메모 */}
      {(editMode || memo.trim()) && (
        <div>
          {editMode ? (
            <textarea
              ref={memoRef}
              value={memo}
              onChange={e => setMemo(e.target.value)}
              placeholder="팀 메모를 입력하세요 (예: 주차 가능, 단체석 있음, 인기 메뉴는 불고기...)"
              rows={2}
              className="w-full px-3 py-2 text-xs border border-gray-200 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-orange-200 bg-gray-50 focus:bg-white leading-relaxed"
            />
          ) : (
            <p className="text-xs text-gray-600 bg-amber-50/60 border border-amber-100 rounded-xl px-3 py-2 leading-relaxed whitespace-pre-wrap">
              {memo}
            </p>
          )}
        </div>
      )}

      {/* 메뉴 아이템 */}
      {(editMode || menuItems.some(m => m.name.trim())) && (
        <div className="space-y-2">
          {/* 저장된 메뉴 표시 (읽기모드) */}
          {!editMode && menuItems.filter(m => m.name.trim()).length > 0 && (
            <div className="space-y-1">
              <p className="text-[10px] text-gray-400 flex items-center gap-1">
                <UtensilsCrossed className="w-3 h-3" /> 팀 메뉴판
              </p>
              <div className="grid grid-cols-1 gap-1">
                {menuItems.filter(m => m.name.trim()).map((item, i) => (
                  <div key={i} className="flex items-center justify-between px-2.5 py-1.5 bg-orange-50 border border-orange-100 rounded-lg">
                    <span className="text-xs text-gray-700 font-medium">{item.name}</span>
                    {item.price && (
                      <span className="text-xs text-orange-600 font-semibold shrink-0 ml-2">{item.price}</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 편집모드 메뉴 */}
          {editMode && (
            <div className="space-y-1.5">
              <p className="text-[10px] text-gray-400 flex items-center gap-1">
                <UtensilsCrossed className="w-3 h-3" /> 메뉴판 편집
              </p>
              {menuItems.map((item, i) => (
                <MenuItemRow
                  key={i}
                  item={item}
                  index={i}
                  onUpdate={updateItem}
                  onRemove={removeItem}
                />
              ))}
              <button
                onClick={addMenuItem}
                className="flex items-center gap-1 text-xs text-orange-500 hover:text-orange-600 pl-5 py-1 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" /> 메뉴 추가
              </button>
            </div>
          )}
        </div>
      )}

      {/* 아무것도 없고 읽기 모드일 때 */}
      {!editMode && !hasData && (
        <button
          onClick={() => setEditMode(true)}
          className="w-full py-2.5 border border-dashed border-gray-200 rounded-xl text-xs text-gray-400 hover:border-orange-200 hover:text-orange-400 hover:bg-orange-50/50 transition-colors flex items-center justify-center gap-1.5"
        >
          <Plus className="w-3.5 h-3.5" />
          메모 또는 메뉴 추가하기
        </button>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   RestaurantCard (메인)
═══════════════════════════════════════════════════════ */
export default function RestaurantCard({
  place, roomId, excluded, excludeReason, isSelected, onSelect, onDelete, onAddToFavorites, isFavorite, onInclude,
}: RestaurantCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [note, setNote] = useState<PlaceNote | null>(
    roomId ? getPlaceNote(roomId, place.placeId) : null
  );

  // roomId 바뀌면 노트 새로 로드
  useEffect(() => {
    if (roomId) setNote(getPlaceNote(roomId, place.placeId));
  }, [roomId, place.placeId]);

  const mapUrl = place.kakaoUrl ?? `https://map.kakao.com/?q=${encodeURIComponent(place.name)}`;
  const priceTier = parsePriceTier(place.priceRange);

  // 저장된 메뉴 + API 메뉴 통합 (팀 메뉴판 우선)
  const displayMenus: string[] = note?.menuItems?.filter(m => m.name.trim()).map(m =>
    m.price ? `${m.name} ${m.price}` : m.name
  ) ?? place.representativeMenu ?? [];

  const hasMemo = !!(note?.memo?.trim());

  return (
    <div
      className={`relative bg-white rounded-xl border transition-all ${
        excluded
          ? 'opacity-50 border-gray-100'
          : isSelected
          ? 'border-orange-400 shadow-md shadow-orange-100 ring-2 ring-orange-300'
          : 'border-gray-100 shadow-sm hover:shadow-md hover:border-orange-200'
      }`}
    >
      {/* 제외 오버레이 */}
      {excluded && (
        <div className="absolute inset-0 rounded-xl bg-gray-50/60 flex items-center justify-center z-10 pointer-events-none">
          <div className="flex flex-col items-center gap-2">
            <div className="bg-gray-700/80 text-white text-xs px-3 py-1.5 rounded-full flex items-center gap-1.5">
              <AlertCircle className="w-3 h-3" />
              {excludeReason || '최근 방문'}
            </div>
            {onInclude && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onInclude();
                }}
                className="pointer-events-auto px-3 py-1.5 bg-orange-500 hover:bg-orange-600 text-white text-xs font-medium rounded-lg transition-colors flex items-center gap-1 shadow-sm"
              >
                <Plus className="w-3.5 h-3.5" />
                다시 포함
              </button>
            )}
          </div>
        </div>
      )}

      {/* 메인 행 */}
      <div
        className={`flex items-start gap-3 p-4 ${!excluded ? 'cursor-pointer' : ''}`}
        onClick={!excluded ? () => setExpanded(v => !v) : undefined}
      >
        {/* 카테고리 아이콘 */}
        <div className="w-10 h-10 rounded-xl bg-orange-50 flex items-center justify-center text-xl shrink-0 mt-0.5">
          {CATEGORY_EMOJI[place.category]}
        </div>

        {/* 내용 */}
        <div className="flex-1 min-w-0">
          {/* 이름 + 상태 */}
          <div className="flex items-start justify-between gap-1.5">
            <div className="min-w-0 flex items-center gap-1.5">
              <h3 className="text-sm font-medium text-gray-900 leading-tight truncate">{place.name}</h3>
              {/* 메모/메뉴 있으면 작은 인디케이터 */}
              {roomId && (hasMemo || (note?.menuItems?.some(m => m.name.trim()))) && (
                <StickyNote className="w-3 h-3 text-amber-400 shrink-0" />
              )}
            </div>
            <div className="flex items-center gap-1 shrink-0">
              {place.isManual && (
                <span className="text-xs text-purple-500 bg-purple-50 px-1.5 py-0.5 rounded-full border border-purple-100">직접추가</span>
              )}
              <span className={`inline-flex items-center text-xs px-2 py-0.5 rounded-full border ${
                place.isOpen === false
                  ? 'bg-gray-50 text-gray-400 border-gray-200'
                  : 'bg-green-50 text-green-600 border-green-200'
              }`}>
                {place.isOpen === false ? '영업종료' : '영업중'}
              </span>
            </div>
          </div>

          {/* 카테고리 세부 */}
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className="text-xs text-gray-400">{CATEGORY_LABEL[place.category] ?? place.category ?? '음식점'}</span>
            {place.categoryDetail?.split('/')[1] && (
              <>
                <span className="text-xs text-gray-300">·</span>
                <span className="text-xs text-gray-400">{place.categoryDetail.split('/')[1]}</span>
              </>
            )}
          </div>

          {/* 평점 · 거리 · 가격대 배지 */}
          <div className="flex items-center gap-2 mt-2 flex-wrap">
            {place.rating != null && (
              <div className="flex items-center gap-1 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-100">
                <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                <span className="text-xs text-amber-700 font-medium">{place.rating}</span>
                {place.reviewCount != null && (
                  <span className="text-xs text-amber-500">
                    ({place.reviewCount >= 1000
                      ? `${(place.reviewCount / 1000).toFixed(1)}k`
                      : place.reviewCount})
                  </span>
                )}
              </div>
            )}
            <div className="flex items-center gap-1 bg-gray-50 px-2 py-0.5 rounded-full border border-gray-100">
              <MapPin className="w-3 h-3 text-gray-400" />
              <span className="text-xs text-gray-500">
                {(place.distanceMeters ?? 0) < 1000
                  ? `${place.distanceMeters ?? 0}m`
                  : `${((place.distanceMeters ?? 0) / 1000).toFixed(1)}km`}
              </span>
            </div>
            {priceTier && (
              <div className={`flex items-center gap-1 px-2 py-0.5 rounded-full border text-xs font-medium ${PRICE_TIER_COLOR[priceTier]}`}>
                <span className="text-[11px] leading-none">{PRICE_TIER_EMOJI[priceTier]}</span>
                <span>{PRICE_TIER_LABEL[priceTier]}</span>
              </div>
            )}
            {!priceTier && place.priceRange && (
              <div className="flex items-center gap-1 bg-gray-50 px-2 py-0.5 rounded-full border border-gray-100">
                <Wallet className="w-3 h-3 text-gray-400" />
                <span className="text-xs text-gray-500">{place.priceRange}</span>
              </div>
            )}
          </div>

          {/* 가격 상세 텍스트 */}
          {place.priceRange && (
            <div className="flex items-center gap-1 mt-1.5">
              <Wallet className="w-3 h-3 text-gray-300 shrink-0" />
              <span className="text-xs text-gray-400">{place.priceRange}</span>
            </div>
          )}

          {/* 메뉴 미리보기 (팀 메뉴판 or API 메뉴) */}
          {displayMenus.length > 0 && (
            <div className="flex items-center gap-1 mt-1.5 flex-wrap">
              <UtensilsCrossed className="w-3 h-3 text-orange-300 shrink-0" />
              {displayMenus.slice(0, 3).map((menu, i) => (
                <span
                  key={i}
                  className={`text-xs px-2 py-0.5 rounded-full border ${
                    note?.menuItems?.some(m => m.name.trim())
                      ? 'text-orange-700 bg-orange-50 border-orange-200'
                      : 'text-orange-600 bg-orange-50 border-orange-100'
                  }`}
                >
                  {menu}
                </span>
              ))}
              {displayMenus.length > 3 && (
                <span className="text-xs text-gray-400">+{displayMenus.length - 3}</span>
              )}
            </div>
          )}

          {/* 메모 미리보기 (1줄) */}
          {hasMemo && !expanded && (
            <div className="flex items-start gap-1 mt-1.5">
              <StickyNote className="w-3 h-3 text-amber-400 shrink-0 mt-0.5" />
              <span className="text-xs text-gray-500 truncate">{note!.memo}</span>
            </div>
          )}
        </div>

        {/* 펼치기 아이콘 */}
        {!excluded && (
          <div className="shrink-0 text-gray-300 mt-1">
            {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </div>
        )}
      </div>

      {/* 펼쳐진 상세 */}
      {expanded && !excluded && (
        <div className="px-4 pb-4 pt-2 space-y-3">
          {/* 주소 */}
          {place.address && (
            <div className="flex items-start gap-2 text-xs text-gray-500">
              <MapPin className="w-3.5 h-3.5 shrink-0 mt-0.5 text-gray-400" />
              <span>{place.address}</span>
            </div>
          )}

          {/* 전화번호 */}
          {place.phone && (
            <div className="flex items-center gap-2 text-xs">
              <Phone className="w-3.5 h-3.5 text-gray-400" />
              <a href={`tel:${place.phone}`} className="text-blue-500 underline">{place.phone}</a>
            </div>
          )}

          {/* API 메뉴 전체 (팀 메뉴판 없을 때만) */}
          {!note?.menuItems?.some(m => m.name.trim()) &&
            place.representativeMenu && place.representativeMenu.length > 3 && (
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-xs text-gray-400">전체 메뉴:</span>
              {place.representativeMenu.map((menu, i) => (
                <span key={i} className="text-xs text-orange-600 bg-orange-50 px-2 py-0.5 rounded-full border border-orange-100">
                  {menu}
                </span>
              ))}
            </div>
          )}

          {/* ── 팀 메모 + 메뉴 편집 패널 ── */}
          {roomId && (
            <NotesPanel
              roomId={roomId}
              placeId={place.placeId}
              initialNote={note}
              onSave={saved => setNote(saved)}
            />
          )}

          {/* 지도 + 팀 후보집 + 삭제 버튼 */}
          <div className="space-y-2 pt-1">
            <div className="flex gap-2">
              <a
                href={mapUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={e => e.stopPropagation()}
                className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-yellow-400 hover:bg-yellow-500 text-gray-900 text-xs rounded-lg transition-colors font-medium"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                카카오맵
              </a>
              <a
                href={`https://map.naver.com/v5/search/${encodeURIComponent(place.name + ' ' + place.address)}`}
                target="_blank"
                rel="noopener noreferrer"
                onClick={e => e.stopPropagation()}
                className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-green-500 hover:bg-green-600 text-white text-xs rounded-lg transition-colors font-medium"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                네이버지도
              </a>
            </div>
            <div className="flex gap-2">
              {onAddToFavorites && (
                <button
                  onClick={e => { e.stopPropagation(); onAddToFavorites(place); }}
                  disabled={isFavorite}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-xs rounded-lg transition-colors font-medium ${
                    isFavorite
                      ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                      : 'bg-amber-50 text-amber-600 hover:bg-amber-100 border border-amber-200'
                  }`}
                >
                  <Star className={`w-3.5 h-3.5 ${isFavorite ? '' : 'fill-amber-400'}`} />
                  {isFavorite ? '이미 후보집에 있음' : '팀 후보집 추가'}
                </button>
              )}
              {onDelete && (
                <button
                  onClick={e => { e.stopPropagation(); onDelete(); }}
                  className="flex items-center justify-center gap-1 px-3 py-2 border border-red-200 text-red-400 hover:bg-red-50 hover:text-red-500 hover:border-red-300 text-xs rounded-lg transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  삭제
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
