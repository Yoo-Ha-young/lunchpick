import { useState, useRef } from 'react';
import { X, Plus, Loader2, MapPin, UtensilsCrossed, Link2, Star, DollarSign } from 'lucide-react';
import { Place, Category, MenuItem, CATEGORY_LABEL, CATEGORY_EMOJI } from '../types';
import { searchAddress, AddressResult } from '../kakaoApi';

interface AddCandidateModalProps {
  onAdd: (place: Place) => void;
  onSaveToFavorites?: (place: Place) => void;
  onClose: () => void;
}

const ALL_CATEGORIES: Category[] = ['KOR', 'CHN', 'JPN', 'WESTERN', 'SNACK', 'OTHER'];

function parsePriceNumber(str: string): number | null {
  const num = parseInt(str.replace(/[^0-9]/g, ''), 10);
  return isNaN(num) || num <= 0 ? null : num;
}

function derivePriceRange(items: MenuItem[]): string | undefined {
  const prices = items
    .map(m => parsePriceNumber(m.price ?? ''))
    .filter((n): n is number => n !== null);
  if (prices.length === 0) return undefined;
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  const fmt = (n: number) => n.toLocaleString('ko-KR') + '원';
  return min === max ? fmt(min) : `${fmt(min)}~${fmt(max)}`;
}

export default function AddCandidateModal({ onAdd, onSaveToFavorites, onClose }: AddCandidateModalProps) {
  const [name, setName] = useState('');
  const [category, setCategory] = useState<Category>('KOR');
  const [address, setAddress] = useState('');
  const [distance, setDistance] = useState('');
  const [placeLink, setPlaceLink] = useState('');
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [menuName, setMenuName] = useState('');
  const [menuPrice, setMenuPrice] = useState('');
  const [error, setError] = useState('');

  // 주소 자동완성
  const [suggestions, setSuggestions] = useState<AddressResult[]>([]);
  const [suggestionLoading, setSuggestionLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<{ lat: number; lng: number } | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleAddressChange = (value: string) => {
    setAddress(value);
    setSelectedLocation(null);
    setSuggestions([]);
    setShowSuggestions(false);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (value.trim().length < 2) return;
    debounceRef.current = setTimeout(async () => {
      setSuggestionLoading(true);
      try {
        const results = await searchAddress(value);
        setSuggestions(results);
        if (results.length > 0) {
          setShowSuggestions(true);
        }
      } catch (err) {
        console.error('주소 검색 오류:', err);
      }
      finally { setSuggestionLoading(false); }
    }, 350);
  };

  const selectSuggestion = (result: AddressResult) => {
    setAddress(result.address);
    setSelectedLocation({ lat: result.lat, lng: result.lng });
    setShowSuggestions(false);
    setSuggestions([]);
  };

  const addMenuItem = () => {
    const n = menuName.trim();
    if (!n) return;
    const priceStr = menuPrice.trim()
      ? parsePriceNumber(menuPrice) !== null
        ? parsePriceNumber(menuPrice)!.toLocaleString('ko-KR') + '원'
        : undefined
      : undefined;
    setMenuItems(prev => [...prev, { name: n, price: priceStr }]);
    setMenuName('');
    setMenuPrice('');
  };

  const removeMenuItem = (i: number) => setMenuItems(prev => prev.filter((_, idx) => idx !== i));

  const buildPlace = (): Place | null => {
    setError('');
    if (!name.trim()) { setError('가게 이름을 입력해 주세요.'); return null; }
    const priceRange = derivePriceRange(menuItems);
    return {
      placeId: `manual_${Date.now()}_${Math.random().toString(36).slice(2)}`,
      name: name.trim(),
      category,
      categoryDetail: `${CATEGORY_LABEL[category]}/직접추가`,
      address: address.trim() || '주소 미입력',
      lat: selectedLocation?.lat ?? 0,
      lng: selectedLocation?.lng ?? 0,
      distanceMeters: parseInt(distance) || 0,
      representativeMenu: menuItems.length > 0 ? menuItems.map(m => m.name) : undefined,
      menuItems: menuItems.length > 0 ? menuItems : undefined,
      priceRange,
      placeLink: placeLink.trim() || undefined,
      isManual: true,
    };
  };

  const handleAddOnly = () => {
    const place = buildPlace();
    if (!place) return;
    onAdd(place);
  };

  const handleSaveToFavorites = () => {
    const place = buildPlace();
    if (!place) return;
    onSaveToFavorites?.(place);
    onClose();
  };

  const handleAddAndSave = () => {
    const place = buildPlace();
    if (!place) return;
    onAdd(place);
    onSaveToFavorites?.(place);
  };



  return (
    <div
      className="fixed inset-0 bg-black/50 z-50 flex items-end justify-center"
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-white rounded-t-3xl w-full max-w-lg max-h-[92vh] flex flex-col">

          {/* Header */}
          <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-gray-100 shrink-0">
            <h2 className="text-base font-semibold text-gray-900 flex items-center gap-2">
              <Plus className="w-5 h-5 text-orange-500" />
              후보 직접 추가
            </h2>
            <button onClick={onClose} className="p-1.5 rounded-xl hover:bg-gray-100 transition-colors">
              <X className="w-5 h-5 text-gray-400" />
            </button>
          </div>

          {/* Scrollable body */}
          <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">

            {/* 가게 이름 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                가게 이름 <span className="text-orange-500">*</span>
              </label>
              <input
                type="text"
                placeholder="ex) 돼지갈비 맛집"
                value={name}
                onChange={e => setName(e.target.value)}
                autoFocus
                className="w-full px-4 py-3 border border-gray-200 rounded-xl bg-gray-50 focus:outline-none focus:ring-2 focus:ring-orange-300 text-sm"
              />
            </div>

            {/* 카테고리 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">카테고리</label>
              <div className="flex gap-2 flex-wrap">
                {ALL_CATEGORIES.map(cat => (
                  <button
                    key={cat}
                    onClick={() => setCategory(cat)}
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm border transition-colors ${
                      category === cat
                        ? 'bg-orange-500 border-orange-500 text-white'
                        : 'border-gray-200 text-gray-600 hover:border-orange-300'
                    }`}
                  >
                    <span>{CATEGORY_EMOJI[cat]} {CATEGORY_LABEL[cat]}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* 주소 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                주소 <span className="text-gray-400 font-normal text-xs">(선택 · 검색으로 자동완성)</span>
              </label>
              <div className="relative">
                <div className="relative flex items-center">
                  <MapPin className="w-4 h-4 text-gray-400 absolute left-3 pointer-events-none" />
                  <input
                    type="text"
                    placeholder="주소 또는 가게명 검색"
                    value={address}
                    onChange={e => handleAddressChange(e.target.value)}
                    onFocus={() => (suggestions.length > 0) && setShowSuggestions(true)}
                    onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                    className="w-full pl-9 pr-8 py-3 border border-gray-200 rounded-xl bg-gray-50 focus:outline-none focus:ring-2 focus:ring-orange-300 text-sm"
                  />
                  {suggestionLoading && (
                    <Loader2 className="w-3.5 h-3.5 animate-spin absolute right-3 text-gray-400" />
                  )}
                </div>
                
                {/* 주소 자동완성 드롭다운 */}
                {(showSuggestions && suggestions.length > 0) && (
                  <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 max-h-60 overflow-y-auto">
                    {suggestions.map((r, idx) => (
                      <button
                        key={idx}
                        onMouseDown={e => { e.preventDefault(); selectSuggestion(r); }}
                        className="w-full flex items-start gap-2 px-4 py-3 hover:bg-gray-50 text-left border-b last:border-b-0 border-gray-100 transition-colors"
                      >
                        <MapPin className="w-4 h-4 text-orange-500 shrink-0 mt-0.5" />
                        <div className="min-w-0 flex-1">
                          <div className="text-sm text-gray-900 font-medium truncate">{r.label}</div>
                          {r.address !== r.label && (
                            <div className="text-xs text-gray-500 truncate mt-0.5">{r.address}</div>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
                
                {selectedLocation && (
                  <p className="text-xs text-green-600 mt-1.5 flex items-center gap-1">
                    <MapPin className="w-3 h-3" /> 위치 확인됨 ✓
                  </p>
                )}
                {!selectedLocation && address.length > 0 && !suggestionLoading && (
                  <p className="text-xs text-gray-400 mt-1.5">검색 결과를 선택하면 위치가 자동으로 설정됩니다</p>
                )}
              </div>
            </div>

            {/* 거리 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                거리 <span className="text-gray-400 font-normal text-xs">(선택)</span>
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  placeholder="0"
                  value={distance}
                  onChange={e => setDistance(e.target.value)}
                  min={0}
                  className="w-32 px-4 py-3 border border-gray-200 rounded-xl bg-gray-50 focus:outline-none focus:ring-2 focus:ring-orange-300 text-sm"
                />
                <span className="text-sm text-gray-500">m</span>
              </div>
            </div>

            {/* 가게 링크 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5 flex items-center gap-1.5">
                <Link2 className="w-4 h-4 text-orange-400" />
                가게 링크 <span className="text-gray-400 font-normal text-xs">(선택)</span>
              </label>
              <input
                type="url"
                placeholder="https://map.kakao.com/... 또는 블로그 링크"
                value={placeLink}
                onChange={e => setPlaceLink(e.target.value)}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl bg-gray-50 focus:outline-none focus:ring-2 focus:ring-orange-300 text-sm"
              />
            </div>

            {/* 대표 메뉴 + 가격 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5 flex items-center gap-1.5">
                <UtensilsCrossed className="w-4 h-4 text-orange-400" />
                대표 메뉴 <span className="text-gray-400 font-normal text-xs">(선택)</span>
              </label>

              {/* 메뉴 입력 행 */}
              <div className="flex gap-2 mb-2">
                <input
                  type="text"
                  placeholder="메뉴명  ex) 삼겹살"
                  value={menuName}
                  onChange={e => setMenuName(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && addMenuItem()}
                  className="flex-1 px-3 py-2.5 border border-gray-200 rounded-xl bg-gray-50 focus:outline-none focus:ring-2 focus:ring-orange-300 text-sm"
                />
                <div className="relative w-28 shrink-0">
                  <DollarSign className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    inputMode="numeric"
                    placeholder="가격"
                    value={menuPrice}
                    onChange={e => setMenuPrice(e.target.value.replace(/[^0-9]/g, ''))}
                    onKeyDown={e => e.key === 'Enter' && addMenuItem()}
                    className="w-full pl-7 pr-2 py-2.5 border border-gray-200 rounded-xl bg-gray-50 focus:outline-none focus:ring-2 focus:ring-orange-300 text-sm"
                  />
                </div>
                <button
                  onClick={addMenuItem}
                  className="px-3 py-2.5 bg-orange-100 text-orange-600 rounded-xl hover:bg-orange-200 transition-colors shrink-0"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>

              {/* 추가된 메뉴 목록 */}
              {(menuItems.length > 0) && (
                <div className="space-y-1.5 mt-2">
                  {menuItems.map((m, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between px-3 py-2 bg-orange-50 border border-orange-100 rounded-xl"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-sm text-orange-700 truncate">{m.name}</span>
                        {m.price && (
                          <span className="text-xs text-orange-500 shrink-0 bg-orange-100 px-1.5 py-0.5 rounded-full font-medium">
                            {m.price}
                          </span>
                        )}
                      </div>
                      <button
                        onClick={() => removeMenuItem(i)}
                        className="text-orange-300 hover:text-red-500 ml-2 shrink-0"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                  {derivePriceRange(menuItems) && (
                    <p className="text-xs text-emerald-600 flex items-center gap-1 mt-1.5 font-medium">
                      <DollarSign className="w-3 h-3" />
                      자동 계산된 가격대: {derivePriceRange(menuItems)}
                    </p>
                  )}
                </div>
              )}
              <p className="text-xs text-gray-400 mt-1.5">메뉴명 + 가격 입력 시 가격대가 자동 계산됩니다</p>
            </div>

            {error && (
              <p className="text-sm text-red-500 bg-red-50 px-3 py-2 rounded-xl">{error}</p>
            )}
          </div>

          {/* Footer */}
          <div className="px-5 pb-8 pt-3 border-t border-gray-100 shrink-0 space-y-2">
            <button
              onClick={handleAddAndSave}
              className="w-full py-3.5 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-sm font-medium transition-colors flex items-center justify-center gap-2"
            >
              <Star className="w-4 h-4" />
              후보에 추가 + 후보집에 저장
            </button>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={handleAddOnly}
                className="py-3 border border-gray-200 text-gray-600 hover:bg-gray-50 rounded-xl text-sm transition-colors"
              >
                이번에만 추가
              </button>
              {onSaveToFavorites && (
                <button
                  onClick={handleSaveToFavorites}
                  className="py-3 border border-orange-200 text-orange-600 hover:bg-orange-50 rounded-xl text-sm transition-colors flex items-center justify-center gap-1.5"
                >
                  <Star className="w-3.5 h-3.5" />
                  후보집만 저장
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
  );
}
