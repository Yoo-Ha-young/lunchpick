import {
  Room, Place, Settlement, Category, PriceTier, MenuItem,
  CATEGORY_LABEL, CATEGORY_EMOJI,
  PRICE_TIER_LABEL, PRICE_TIER_EMOJI, PRICE_TIER_COLOR, PRICE_TIER_RANGE,
  parsePriceTier
} from '../types';
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router';
import {
  Settings, List, Shuffle, User, CreditCard,
  Copy, Check, MapPin, RefreshCw, ChevronDown, ChevronUp,
  Navigation, ExternalLink, Trophy, RotateCcw, Plus, Minus,
  AlertCircle, Home, Crown, Calendar, ArrowLeft, Loader2, Share2,
  CheckCircle2, Clock, MapPinned, History, Star, MessageCircle, Users, Shield, X as XIcon, HelpCircle,
  UtensilsCrossed, Link2, Trash2, CheckSquare, Square, Wallet, Search, Briefcase
} from 'lucide-react';
import {
  getRoom, saveRoom, updateRoomSettings, addPickHistory, isRecentlyPicked,
  getOrCreateUser, saveUser, getCurrentDuty, setDuty, generateId,
  joinRoom, getSession, markPickVisited, addSavedPlace, removeSavedPlace,
  getPlaceNote, subscribeToRoom, updateSavedPlace, removeVisitFromHistory,
  getUserProfile, updatePlaceNote, sendSettlementCard, leaveRoom
} from '../store';
import { searchAddress, fetchNearbyRestaurants, fetchPlaceDetail, AddressResult } from '../kakaoApi';
import RouletteWheel from '../components/RouletteWheel';
import RestaurantCard from '../components/RestaurantCard';
import SettlementModal from '../components/SettlementModal';
import AddCandidateModal from '../components/AddCandidateModal';
import ShareModal from '../components/ShareModal';
import FavoritesModal from '../components/FavoritesModal';
import ChatPanel from '../components/ChatPanel';
import MembersPanel from '../components/MembersPanel';
import HelpModal from '../components/HelpModal';
import { copyToClipboard } from '../utils';

type Tab = 'settings' | 'roulette' | 'favorites' | 'duty' | 'history' | 'settlement' | 'chat';

const RADIUS_OPTIONS = [200, 300, 500, 1000, 2000];
const EXCLUDE_DAY_OPTIONS = [1, 2, 3, 5, 7];
const ALL_CATEGORIES: Category[] = ['KOR', 'CHN', 'JPN', 'WESTERN', 'SNACK', 'BAR', 'OTHER'];
const ALL_PRICE_TIERS: PriceTier[] = ['cheap', 'normal', 'special'];

export default function RoomPage() {
  const { roomId } = useParams<{ roomId: string }>();
  const navigate = useNavigate();

  const [room, setRoom] = useState<Room | null>(null);
  const [tab, setTab] = useState<Tab>('settings');
  const [candidates, setCandidates] = useState<Place[]>([]);
  const [loadingCandidates, setLoadingCandidates] = useState(false);
  const [candidatesLoaded, setCandidatesLoaded] = useState(false);

  // Roulette
  const [spinning, setSpinning] = useState(false);
  const [targetIndex, setTargetIndex] = useState(0);
  const [spinResult, setSpinResult] = useState<Place | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [resetTrigger, setResetTrigger] = useState(0);
  const targetIndexRef = useRef(0);
  const [showSettings, setShowSettings] = useState(false);

  // Settings
  const [addressInput, setAddressInput] = useState('');
  const [addressLoading, setAddressLoading] = useState(false);
  const [locationStatus, setLocationStatus] = useState<'idle' | 'loading' | 'done' | 'denied'>('idle');
  const [addressSuggestions, setAddressSuggestions] = useState<AddressResult[]>([]);
  const [suggestionLoading, setSuggestionLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const addressDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [pendingLocation, setPendingLocation] = useState<{ lat: number; lng: number; label: string; address: string } | null>(null);
  const [showAddressBook, setShowAddressBook] = useState(false);

  // UI
  const [copied, setCopied] = useState(false);
  const [showSettlement, setShowSettlement] = useState(false);
  const [settlementForVisit, setSettlementForVisit] = useState<{ placeName: string; placeId: string; pickedAt: string } | null>(null);
  const [editingSettlement, setEditingSettlement] = useState<Settlement | null>(null);
  const [showShare, setShowShare] = useState(false);
  const [showAddCandidate, setShowAddCandidate] = useState(false);
  const [showFavorites, setShowFavorites] = useState(false);
  const [showMembers, setShowMembers] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  // Favorites Tab
  const [selectedFavorites, setSelectedFavorites] = useState<string[]>([]);
  const [expandedFavoriteId, setExpandedFavoriteId] = useState<string | null>(null);
  const [autoJoinPrompt, setAutoJoinPrompt] = useState(false);
  const [resultShared, setResultShared] = useState(false);
  const [visitConfirmed, setVisitConfirmed] = useState(false);
  const [showSettlePrompt, setShowSettlePrompt] = useState(false);
  const [historyTab, setHistoryTab] = useState<'roulette' | 'visit'>('roulette');
  const [currentUser, setCurrentUser] = useState<{ userId: string; nickname: string } | null>(null);
  // 입장 토스트
  const [joinToast, setJoinToast] = useState<string | null>(null);
  const [unreadChat, setUnreadChat] = useState(0);
  const lastMsgCountRef = useRef(0);

  // Duty
  const [dutyMode, setDutyMode] = useState<'auto' | 'manual'>('auto');

  const loadRoom = useCallback(async () => {
    if (!roomId) return;
    const r = await getRoom(roomId);
    if (!r) { navigate('/home'); return; }
    setRoom(r);
  }, [roomId, navigate]);

  useEffect(() => {
    const init = async () => {
      const user = getOrCreateUser();
      setCurrentUser(user);
      const session = getSession();
      if (!session) {
        navigate(`/login?next=/room/${roomId}`);
        return;
      }
      await loadRoom();
      const r = await getRoom(roomId!);
      if (r && !r.participants.some(p => p.userId === session.userId)) {
        setAutoJoinPrompt(true);
      }
    };
    init();
  }, [loadRoom]);

  // Firebase 실시간 구독 (크로스 디바이스 실시간 반영)
  useEffect(() => {
    if (!roomId) return;
    
    const unsubscribe = subscribeToRoom(roomId, (r) => {
      if (r) {
        setRoom(r);
        
        // 채팅 미읽음 카운트 업데이트
        const count = r.chatMessages?.length ?? 0;
        if (tab !== 'chat' && count > lastMsgCountRef.current) {
          setUnreadChat(prev => prev + (count - lastMsgCountRef.current));
        }
        lastMsgCountRef.current = count;
      }
    });
    
    return () => unsubscribe();
  }, [roomId, tab]);

  const refresh = () => {
    loadRoom();
  };

  const isHost = room && currentUser ? room.hostUserId === currentUser.userId : false;
  const currentParticipant = room?.participants.find(p => p.userId === currentUser?.userId);
  const isSubHost = currentParticipant?.isSubHost ?? false;

  // Copy invite code
  const copyCode = async () => {
    if (!room) return;
    const ok = await copyToClipboard(room.roomId);
    if (ok) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // 후보 삭제
  const deleteCandidate = (placeId: string) => {
    setCandidates(prev => prev.filter(p => p.placeId !== placeId));
  };

  // 후보 직접 추가
  const addCandidate = (place: Place) => {
    setCandidates(prev => [place, ...prev]);
    setCandidatesLoaded(true);
    setTab('roulette');
    setShowAddCandidate(false);
  };

  // Location
  const requestLocation = () => {
    setLocationStatus('loading');
    if (!navigator.geolocation) {
      setLocationStatus('denied');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      pos => {
        const location = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          label: '현재 위치 (GPS)',
          address: `${pos.coords.latitude.toFixed(5)}, ${pos.coords.longitude.toFixed(5)}`,
        };
        setPendingLocation(location);
        setLocationStatus('done');
      },
      (err) => {
        console.log('Geolocation error:', err.code, err.message);
        setLocationStatus('denied');
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
    );
  };

  // 주소 입력 debounce 자동완성
  const handleAddressChange = (value: string) => {
    setAddressInput(value);
    setShowSuggestions(false);
    setAddressSuggestions([]);
    if (addressDebounceRef.current) clearTimeout(addressDebounceRef.current);
    if (value.trim().length < 2) return;
    addressDebounceRef.current = setTimeout(async () => {
      setSuggestionLoading(true);
      try {
        const results = await searchAddress(value);
        setAddressSuggestions(results);
        if (results.length > 0) {
          setShowSuggestions(true);
        }
      } catch (e) {
        console.log('주소 검색 오류:', e);
      } finally {
        setSuggestionLoading(false);
      }
    }, 350);
  };

  // 자동완성에서 주소 선택 (임시 저장)
  const selectAddress = (result: AddressResult) => {
    setPendingLocation({
      lat: result.lat,
      lng: result.lng,
      label: result.label,
      address: result.address,
    });
    setAddressInput(result.label);
    setShowSuggestions(false);
    setAddressSuggestions([]);
  };

  // 선택된 주소 적용
  const applyPendingLocation = () => {
    if (!roomId || !pendingLocation) return;
    updateRoomSettings(roomId, {
      baseLocation: pendingLocation,
    });
    setPendingLocation(null);
    loadRoom();
  };

  // 직접 입력 확인 (자동완성 없이 검색)
  const handleAddressSubmit = async () => {
    if (!addressInput.trim() || !roomId) return;
    setAddressLoading(true);
    try {
      const results = await searchAddress(addressInput);
      if (results.length > 0) {
        selectAddress(results[0]);
      } else {
        setAddressSuggestions([]);
        setShowSuggestions(false);
        alert('주소를 찾을 수 없습니다. 더 자세한 주소를 입력해보세요.');
      }
    } catch (e: any) {
      console.log('Address submit error:', e);
      alert(`주소 검색 오류: ${e.message}`);
    } finally {
      setAddressLoading(false);
    }
  };

  // Manual address (mock geocoding → default to Gangnam station area)
  const handleAddressInput = handleAddressSubmit;

  // Fetch candidates
  const fetchCandidates = async () => {
    // stale state 방지: localStorage에서 직접 읽기
    const currentRoom = await getRoom(roomId!);
    if (!currentRoom?.settings?.baseLocation) return;

    setLoadingCandidates(true);
    setCandidatesLoaded(false);
    setFetchError(null);

    const { lat, lng } = currentRoom.settings.baseLocation;
    const { radiusMeters } = currentRoom.settings;
    const categoryFilter = currentRoom.settings.categoryFilter ?? [];
    const categories = categoryFilter.length > 0 ? categoryFilter : (currentRoom.settings.categories ?? ALL_CATEGORIES);

    try {
      const results = await fetchNearbyRestaurants(lat, lng, radiusMeters, categories);
      setCandidates(results);
      setCandidatesLoaded(true);
      setTab('roulette');
      // 가격/메뉴 정보 백그라운드 로딩 (배치 처리)
      enrichPricesInBackground(results);
    } catch (e: any) {
      console.log('fetchNearbyRestaurants error:', e);
      setFetchError(e.message ?? '음식점을 불러오지 못했습니다.');
      setCandidates([]);
      setCandidatesLoaded(true);
      setTab('roulette');
    } finally {
      setLoadingCandidates(false);
    }
  };

  /** 카카오 장소 상세 API로 가격·메뉴 백그라운드 보강 */
  const enrichPricesInBackground = async (places: Place[]) => {
    const BATCH = 5;
    for (let i = 0; i < places.length; i += BATCH) {
      const batch = places.slice(i, i + BATCH);
      const results = await Promise.all(
        batch.map(p => {
          if (p.isManual || !p.placeId.startsWith('kakao_')) return null;
          const kakaoId = p.placeId.replace('kakao_', '');
          return fetchPlaceDetail(kakaoId).catch(() => null);
        })
      );
      setCandidates(prev => {
        const updated = [...prev];
        batch.forEach((p, j) => {
          const detail = results[j];
          if (!detail) return;
          const idx = updated.findIndex(x => x.placeId === p.placeId);
          if (idx < 0) return;
          updated[idx] = {
            ...updated[idx],
            representativeMenu: detail.menus.length > 0
              ? detail.menus
              : updated[idx].representativeMenu,
            priceRange: detail.priceRange ?? updated[idx].priceRange,
          };
        });
        return updated;
      });
    }
  };

  // Filter available candidates (not recently visited)
  const priceFilter = room?.settings.priceFilter ?? [];

  const availableCandidates = candidates.filter(p => {
    if (isRecentlyPicked(room!, p.placeId)) return false;
    if (priceFilter.length > 0) {
      const tier = parsePriceTier(p.priceRange);
      // tier가 null(가격정보 없음)이면 필터에서 제외하지 않고 포함
      if (tier && !priceFilter.includes(tier)) return false;
    }
    return true;
  });

  const excludedCandidates = candidates.filter(
    p => isRecentlyPicked(room!, p.placeId)
  );

  // 가격대 필터로 제외된 것 (가격정보가 있고 + 필터 범위 밖인 것만)
  const priceExcludedCandidates = priceFilter.length > 0
    ? candidates.filter(p => {
        if (isRecentlyPicked(room!, p.placeId)) return false;
        const tier = parsePriceTier(p.priceRange);
        return tier !== null && !priceFilter.includes(tier);
      })
    : [];

  // Roulette
  const startRoulette = () => {
    if (availableCandidates.length === 0) return;
    const idx = Math.floor(Math.random() * availableCandidates.length);
    console.log('🎲 선택된 인덱스:', idx, '/', availableCandidates.length, '- 장소:', availableCandidates[idx]?.name);
    targetIndexRef.current = idx;
    setTargetIndex(idx);
    setSpinResult(null);
    setShowResult(false);
    setSpinning(true);
  };

  const handleSpinEnd = useCallback(async () => {
    setSpinning(false);
    const idx = targetIndexRef.current;
    const result = availableCandidates[idx];
    console.log('🎯 룰렛 정지 - 인덱스:', idx, '결과:', result?.name);
    if (result && room) {
      console.log('🎰 최종 결과:', result.name);
      
      // placeNotes에서 팀메모와 메뉴판 가져오기
      const placeNote = room.placeNotes?.[result.placeId];
      const enrichedResult = {
        ...result,
        teamNote: placeNote?.memo,
        menuItems: placeNote?.menuItems || result.menuItems
      };
      
      setSpinResult(enrichedResult);
      setShowResult(true);
      
      console.log('💾 pickHistory 저장 시작...');
      await addPickHistory(room.roomId, result);
      console.log('✅ pickHistory 저장 완료');
      
      // loadRoom()을 호출하지 않고 room state만 업데이트
      const savedRoom = await getRoom(room.roomId);
      if (savedRoom) {
        setRoom(savedRoom);
        console.log('🔍 저장된 pickHistory 확인:', {
          count: savedRoom.pickHistory.length,
          latest: savedRoom.pickHistory[0],
          todayPick: savedRoom.todayPick?.name
        });
      }
    }
  }, [availableCandidates, room]);

  const resetRoulette = () => {
    console.log('♻️ 룰렛 리셋');
    setShowResult(false);
    setSpinResult(null);
    setVisitConfirmed(false);
    setShowSettlePrompt(false);
    setResetTrigger(prev => prev + 1); // 룰렛 휠 초기화
  };

  // Map links
  const getMapLinks = (place: Place) => ({
    naver: `https://map.naver.com/v5/search/${encodeURIComponent(place.name)}`,
    kakao: `https://map.kakao.com/?q=${encodeURIComponent(place.name)}`,
    google: `https://www.google.com/maps/search/${encodeURIComponent(place.name + ' ' + place.address)}`,
  });

  // Duty
  const currentDuty = room ? getCurrentDuty(room) : null;

  const assignDuty = (userId: string) => {
    if (!room) return;
    setDuty(room.roomId, userId);
    loadRoom();
  };

  // 룰렛 결과 공유
  const shareSpinResult = async (place: Place) => {
    const lines = [
      `🎉 오늘의 팀 점심 결정!`,
      ``,
      `${CATEGORY_EMOJI[place.category]} ${place.name}`,
      place.address ? `📍 ${place.address}` : null,
      place.rating ? `⭐ ${place.rating}${place.reviewCount ? ` (${place.reviewCount.toLocaleString()} 리뷰)` : ''}` : null,
      place.priceRange ? `💰 ${place.priceRange}` : null,
      ``,
      `🗺️ 카카오맵: https://map.kakao.com/?q=${encodeURIComponent(place.name)}`,
      room ? `\n👥 룸 참여: ${window.location.origin}/room/${room.roomId}` : null,
    ].filter(Boolean).join('\n');

    if (navigator.share) {
      try {
        await navigator.share({ title: `오늘의 점심: ${place.name}`, text: lines });
        return;
      } catch {}
    }
    const ok = await copyToClipboard(lines);
    if (ok) {
      setResultShared(true);
      setTimeout(() => setResultShared(false), 2500);
    }
  };

  const rotateNextDuty = () => {
    if (!room || room.participants.length === 0) return;
    const currentIdx = room.participants.findIndex(p => p.userId === currentDuty?.userId);
    const nextIdx = (currentIdx + 1) % room.participants.length;
    setDuty(room.roomId, room.participants[nextIdx].userId);
    loadRoom();
  };

  if (!room) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-orange-500 animate-spin" />
      </div>
    );
  }

  // 자동 입장 확인
  if (autoJoinPrompt) {
    const session = getSession();
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="bg-white rounded-2xl shadow-lg p-6 max-w-sm w-full text-center space-y-4">
          <div className="text-4xl">🍱</div>
          <h2 className="text-lg font-semibold text-gray-900">{room.name}</h2>
          <p className="text-sm text-gray-500">이 룸에 아직 참여하지 않았어요.<br />지금 입장하시겠어요?</p>
          <div className="flex gap-2">
            <button onClick={() => navigate('/home')} className="flex-1 py-3 border border-gray-200 text-gray-600 rounded-xl text-sm hover:bg-gray-50">
              취소
            </button>
            <button
              onClick={() => {
                if (session) {
                  const { room: joined } = joinRoom(room.roomId, session.nickname);
                  if (joined) {
                    setAutoJoinPrompt(false);
                    // 입장 토스트
                    setJoinToast(`${session.nickname}님이 참여했습니다 🎉`);
                    setTimeout(() => setJoinToast(null), 3000);
                    loadRoom();
                  }
                }
              }}
              className="flex-1 py-3 bg-orange-500 text-white rounded-xl text-sm font-medium hover:bg-orange-600"
            >
              입장하기
            </button>
          </div>
        </div>
      </div>
    );
  }

  const tabs = [
    { id: 'settings' as Tab, icon: Settings, label: '룰렛 설정' },
    { id: 'roulette' as Tab, icon: Shuffle, label: '룰렛 돌리기' },
    { id: 'favorites' as Tab, icon: Star, label: '팀 후보집' },
    { id: 'duty' as Tab, icon: User, label: '당번' },
    { id: 'history' as Tab, icon: History, label: '기록' },
    { id: 'settlement' as Tab, icon: CreditCard, label: '정산' },
    { id: 'chat' as Tab, icon: MessageCircle, label: '채팅' },
  ];

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col max-w-lg mx-auto relative">

      {/* 입장 토스트 */}
      {joinToast && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[999] bg-gray-900 text-white text-sm px-4 py-2.5 rounded-2xl shadow-xl flex items-center gap-2 animate-fade-in">
          <Users className="w-4 h-4 text-orange-400 shrink-0" />
          {joinToast}
        </div>
      )}

      {/* 인원 패널 (사이드 슬라이드) */}
      {showMembers && (
        <div className="fixed inset-0 z-[60] flex">
          <div className="flex-1 bg-black/40" onClick={() => setShowMembers(false)} />
          <div className="w-80 max-w-[90vw] bg-white shadow-2xl flex flex-col animate-slide-left">
            <MembersPanel
              room={room}
              currentUserId={currentUser?.userId ?? ''}
              onRefresh={() => { loadRoom(); }}
              onClose={() => setShowMembers(false)}
              onLeave={() => {
                setShowMembers(false);
                navigate('/home');
              }}
              onDelete={() => {
                setShowMembers(false);
                navigate('/home');
              }}
            />
          </div>
        </div>
      )}

      {/* 도움말 모달 */}
      <HelpModal
        isOpen={showHelp}
        onClose={() => setShowHelp(false)}
      />

      {/* Header */}
      <header className="bg-white border-b border-gray-100 sticky top-0 z-30">
        <div className="flex items-center gap-3 px-4 py-3">
          <button onClick={() => navigate('/home')} className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors">
            <ArrowLeft className="w-5 h-5 text-gray-500" />
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="text-base text-gray-900 truncate">{room.name}</h1>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-xs text-gray-400">코드:</span>
              <button
                onClick={copyCode}
                className="flex items-center gap-1 text-xs text-orange-600 hover:text-orange-700"
              >
                <span className="tracking-wider">{room.roomId}</span>
                {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
              </button>
            </div>
          </div>
          {/* 도움말 버튼 */}
          <button
            onClick={() => setShowHelp(true)}
            className="p-1.5 hover:bg-blue-50 rounded-lg transition-colors text-blue-500"
            title="도움말"
          >
            <HelpCircle className="w-5 h-5" />
          </button>
          {/* 공유 버튼 */}
          <button
            onClick={() => setShowShare(true)}
            className="p-1.5 hover:bg-orange-50 rounded-lg transition-colors text-orange-500"
            title="공유하기"
          >
            <Share2 className="w-5 h-5" />
          </button>
          {/* 인원 버튼 — 클릭 시 멤버 패널 */}
          <button
            onClick={() => setShowMembers(true)}
            className="flex items-center gap-1 hover:bg-orange-50 rounded-lg px-1.5 py-1 transition-colors"
            title="팀원 목록"
          >
            <div className="flex -space-x-1">
              {room.participants.slice(0, 3).map(p => (
                <div
                  key={p.userId}
                  className="w-7 h-7 rounded-full bg-orange-100 border-2 border-white flex items-center justify-center text-xs text-orange-600"
                  title={p.nickname}
                >
                  {p.nickname.slice(0, 1)}
                </div>
              ))}
              {(room.participants.length > 3) && (
                <div className="w-7 h-7 rounded-full bg-gray-100 border-2 border-white flex items-center justify-center text-xs text-gray-500">
                  +{room.participants.length - 3}
                </div>
              )}
            </div>
          </button>
        </div>

        {/* Today's pick banner */}
        {room.todayPick && (
          <div className="mx-4 mb-3 bg-orange-50 border border-orange-100 rounded-xl px-3 py-2 flex items-center gap-2">
            <Trophy className="w-4 h-4 text-orange-500 shrink-0" />
            <span className="text-xs text-orange-700">오늘의 픽: <strong>{room.todayPick.name}</strong></span>
          </div>
        )}
      </header>

      {/* Tab Bar */}
      <div className="bg-white border-b border-gray-100 sticky top-[57px] z-20">
        <div className="flex overflow-x-auto scrollbar-none">
          {tabs.map(t => {
            const Icon = t.icon;
            return (
              <button
                key={t.id}
                onClick={() => {
                  setTab(t.id);
                  if (t.id === 'chat') setUnreadChat(0);
                }}
                className={`flex-1 min-w-[56px] flex flex-col items-center py-2.5 gap-0.5 text-[10px] transition-colors relative ${
                  tab === t.id ? 'text-orange-500' : 'text-gray-400 hover:text-gray-600'
                }`}
              >
                <Icon className="w-4 h-4" />
                {t.label}
                {tab === t.id && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-orange-500 rounded-full" />
                )}
                {t.id === 'candidates' && candidatesLoaded && (candidates.length > 0) && (
                  <div className="absolute top-1 right-[22%] w-3.5 h-3.5 bg-orange-500 text-white rounded-full text-[9px] flex items-center justify-center leading-none">
                    {availableCandidates.length}
                  </div>
                )}
                {t.id === 'chat' && (unreadChat > 0) && (
                  <div className="absolute top-1 right-[22%] w-3.5 h-3.5 bg-red-500 text-white rounded-full text-[9px] flex items-center justify-center leading-none">
                    {unreadChat > 9 ? '9+' : unreadChat}
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto pb-6">

        {/* ──────────────── SETTINGS TAB ──────────────── */}
        {tab === 'settings' && room && (
          <div className="p-4 space-y-3">
            <div className="bg-gradient-to-br from-orange-50 to-amber-50 rounded-2xl p-4 border border-orange-100 mb-4">
              <h2 className="text-base font-bold text-orange-800 mb-1 flex items-center gap-2">
                <Settings className="w-5 h-5" />
                룰렛 설정
              </h2>
              <p className="text-xs text-orange-600">위치, 카테고리, 반경 등을 설정하고 후보를 불러오세요</p>
            </div>

            {/* 위치 설정 */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
              <label className="text-sm font-medium text-gray-700 mb-3 block flex items-center gap-2">
                <MapPin className="w-4 h-4 text-orange-500" />
                기준 위치
              </label>
              <div className="space-y-3">
                {/* GPS 현재 위치 버튼 */}
                <button
                  onClick={requestLocation}
                  disabled={locationStatus === 'loading'}
                  className="w-full px-4 py-3 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 disabled:from-gray-300 disabled:to-gray-400 text-white rounded-lg transition-all flex items-center justify-center gap-2 font-medium shadow-sm"
                >
                  {locationStatus === 'loading' ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      위치 가져오는 중...
                    </>
                  ) : (
                    <>
                      <Navigation className="w-5 h-5" />
                      현재 위치로 설정 (GPS)
                    </>
                  )}
                </button>

                {/* 주소록에서 불러오기 */}
                <button
                  onClick={() => setShowAddressBook(true)}
                  className="w-full px-4 py-2.5 bg-purple-50 hover:bg-purple-100 text-purple-700 rounded-lg transition-all flex items-center justify-center gap-2 font-medium text-sm border border-purple-200"
                >
                  <MapPin className="w-4 h-4" />
                  주소록에서 불러오기
                </button>

                {/* 구분선 */}
                <div className="flex items-center gap-3">
                  <div className="flex-1 h-px bg-gray-200"></div>
                  <span className="text-xs text-gray-400 font-medium">또는</span>
                  <div className="flex-1 h-px bg-gray-200"></div>
                </div>

                {/* 주소 검색 입력 */}
                <div className="relative space-y-2">
                  <label className="text-xs text-gray-600 block font-medium">주소로 검색</label>
                  <div className="relative flex gap-2">
                    <input
                      type="text"
                      value={addressInput}
                      onChange={(e) => handleAddressChange(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          handleAddressSubmit();
                        }
                      }}
                      onFocus={() => addressSuggestions.length > 0 && setShowSuggestions(true)}
                      onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                      placeholder="예: 강남역, 서울시 강남구..."
                      className="flex-1 px-4 py-3 border-2 border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-orange-500 focus:border-orange-500 bg-white text-gray-900 placeholder:text-gray-400"
                    />
                    <button
                      onClick={handleAddressSubmit}
                      disabled={!addressInput.trim() || addressLoading}
                      className="px-4 py-3 bg-orange-500 hover:bg-orange-600 disabled:bg-gray-300 text-white rounded-lg transition-colors flex items-center justify-center gap-1 text-sm font-medium shrink-0"
                    >
                      {addressLoading ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Search className="w-4 h-4" />
                      )}
                    </button>
                  
                    {/* 주소 자동완성 드롭다운 */}
                    {showSuggestions && (addressSuggestions.length > 0) && (
                      <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 max-h-60 overflow-y-auto">
                        {addressSuggestions.map((result, idx) => (
                          <button
                            key={idx}
                            onMouseDown={(e) => { e.preventDefault(); selectAddress(result); }}
                            className="w-full px-4 py-3 text-left hover:bg-gray-50 transition-colors border-b last:border-b-0 border-gray-100"
                          >
                            <div className="flex items-start gap-2">
                              <MapPin className="w-4 h-4 text-orange-500 shrink-0 mt-0.5" />
                              <div className="flex-1 min-w-0">
                                <p className="text-sm text-gray-900 font-medium truncate">
                                  {result.place_name || result.label || '(이름 없음)'}
                                </p>
                                <p className="text-xs text-gray-500 truncate mt-0.5">
                                  {result.address_name || result.address || ''}
                                </p>
                              </div>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* 선택된 주소 및 확인 버튼 */}
              {pendingLocation && (
                <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-lg space-y-2">
                  <div className="flex items-start gap-2">
                    <MapPinned className="w-4 h-4 text-green-600 shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-green-800 truncate">{pendingLocation.label}</p>
                      <p className="text-xs text-green-600 truncate">{pendingLocation.address}</p>
                    </div>
                  </div>
                  <button
                    onClick={applyPendingLocation}
                    className="w-full px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors text-sm font-medium"
                  >
                    <Check className="w-4 h-4 inline mr-1" />
                    이 주소로 확정하기
                  </button>
                </div>
              )}

              {room.settings.baseLocation && !pendingLocation && (
                <p className="text-xs text-orange-600 mt-3 flex items-center gap-1 bg-orange-50 px-3 py-2 rounded-lg">
                  <MapPinned className="w-3 h-3" />
                  {room.settings.baseLocation.label}
                </p>
              )}
            </div>

            {/* 반경 설정 */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
              <label className="text-sm font-medium text-gray-700 mb-3 block">검색 반경</label>
              <div className="flex gap-2 flex-wrap">
                {RADIUS_OPTIONS.map(r => (
                  <button
                    key={r}
                    onClick={() => {
                      updateRoomSettings(room.roomId, { radiusMeters: r });
                      loadRoom();
                    }}
                    className={`px-4 py-2 rounded-lg text-sm border transition-all ${ 
                      room.settings.radiusMeters === r
                        ? 'bg-orange-500 text-white border-orange-500 shadow-sm'
                        : 'border-gray-200 text-gray-600 hover:border-orange-300 hover:bg-orange-50'
                    }`}
                  >
                    {r < 1000 ? `${r}m` : `${r/1000}km`}
                  </button>
                ))}
              </div>
            </div>

            {/* 카테고리 필터 */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
              <label className="text-sm font-medium text-gray-700 mb-3 block">카테고리 필터</label>
              <div className="flex gap-2 flex-wrap">
                <button
                  onClick={() => {
                    updateRoomSettings(room.roomId, { categoryFilter: [] });
                    loadRoom();
                  }}
                  className={`px-4 py-2 rounded-lg text-sm border transition-all ${
                    (room.settings.categoryFilter ?? []).length === 0
                      ? 'bg-gray-800 text-white border-gray-800 shadow-sm'
                      : 'border-gray-200 text-gray-600 hover:border-gray-400 hover:bg-gray-50'
                  }`}
                >
                  전체
                </button>
                {ALL_CATEGORIES.map(cat => {
                  const active = (room.settings.categoryFilter ?? []).includes(cat);
                  return (
                    <button
                      key={cat}
                      onClick={() => {
                        const current = room.settings.categoryFilter ?? [];
                        let updated: Category[];
                        if (current.length === 0) {
                          updated = [cat];
                        } else if (current.includes(cat)) {
                          updated = current.filter(c => c !== cat);
                        } else {
                          updated = [...current, cat];
                        }
                        updateRoomSettings(room.roomId, { categoryFilter: updated });
                        loadRoom();
                      }}
                      className={`px-4 py-2 rounded-lg text-sm border transition-all ${
                        active
                          ? 'bg-orange-500 text-white border-orange-500 shadow-sm'
                          : 'border-gray-200 text-gray-600 hover:border-orange-300 hover:bg-orange-50'
                      }`}
                    >
                      {CATEGORY_EMOJI[cat]} {CATEGORY_LABEL[cat]}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 가격대 필터 */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
              <label className="text-sm font-medium text-gray-700 mb-3 block">가격대 필터</label>
              <div className="flex gap-2 flex-wrap">
                <button
                  onClick={() => {
                    updateRoomSettings(room.roomId, { priceFilter: [] });
                    loadRoom();
                  }}
                  className={`px-4 py-2 rounded-lg text-sm border transition-all ${
                    (room.settings.priceFilter ?? []).length === 0
                      ? 'bg-gray-800 text-white border-gray-800 shadow-sm'
                      : 'border-gray-200 text-gray-600 hover:border-gray-400 hover:bg-gray-50'
                  }`}
                >
                  전체
                </button>
                {ALL_PRICE_TIERS.map(tier => {
                  const active = (room.settings.priceFilter ?? []).includes(tier);
                  return (
                    <button
                      key={tier}
                      onClick={() => {
                        const current = room.settings.priceFilter ?? [];
                        let updated: PriceTier[];
                        if (current.length === 0) {
                          updated = [tier];
                        } else if (current.includes(tier)) {
                          updated = current.filter(t => t !== tier);
                        } else {
                          updated = [...current, tier];
                        }
                        updateRoomSettings(room.roomId, { priceFilter: updated });
                        loadRoom();
                      }}
                      className={`px-4 py-2 rounded-lg text-sm border transition-all ${
                        active
                          ? `${PRICE_TIER_COLOR[tier]} shadow-sm`
                          : 'border-gray-200 text-gray-600 hover:border-orange-300 hover:bg-orange-50'
                      }`}
                    >
                      {PRICE_TIER_EMOJI[tier]} {PRICE_TIER_LABEL[tier]}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 최근 방문 제외 */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
              <label className="text-sm font-medium text-gray-700 mb-3 block">최근 방문 제외</label>
              <div className="flex items-center gap-2 mb-3">
                <button
                  onClick={() => {
                    updateRoomSettings(room.roomId, { excludeEnabled: !room.settings.excludeEnabled });
                    loadRoom();
                  }}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    room.settings.excludeEnabled ? 'bg-orange-500' : 'bg-gray-200'
                  }`}
                >
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                    room.settings.excludeEnabled ? 'translate-x-6' : 'translate-x-1'
                  }`} />
                </button>
                <span className="text-sm text-gray-600">
                  {room.settings.excludeEnabled ? '활성화' : '비활성화'}
                </span>
              </div>
              {room.settings.excludeEnabled && (
                <div className="flex gap-2 flex-wrap">
                  {EXCLUDE_DAY_OPTIONS.map(d => (
                    <button
                      key={d}
                      onClick={() => {
                        updateRoomSettings(room.roomId, { excludeRecentDays: d });
                        loadRoom();
                      }}
                      className={`px-4 py-2 rounded-lg text-sm border transition-all ${
                        room.settings.excludeRecentDays === d
                          ? 'bg-orange-500 text-white border-orange-500 shadow-sm'
                          : 'border-gray-200 text-gray-600 hover:border-orange-300 hover:bg-orange-50'
                      }`}
                    >
                      {d}일
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* 후보 불러오기 버튼 */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
              <button
                onClick={fetchCandidates}
                disabled={!room.settings.baseLocation || loadingCandidates}
                className="w-full py-4 bg-orange-500 hover:bg-orange-600 disabled:bg-gray-200 disabled:text-gray-400 text-white rounded-xl transition-colors flex items-center justify-center gap-2 font-semibold shadow-sm"
              >
                {loadingCandidates ? (
                  <><Loader2 className="w-5 h-5 animate-spin" /> 불러오는 중...</>
                ) : (
                  <><RefreshCw className="w-5 h-5" /> 카카오에서 후보 불러오기</>
                )}
              </button>
              {fetchError && (
                <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-red-700 font-medium">음식점을 불러오지 못했습니다</p>
                    <p className="text-xs text-red-600 mt-0.5">{fetchError}</p>
                    <p className="text-xs text-red-500 mt-1">VITE_API_URL과 API 서버(KAKAO_REST_API_KEY) 설정을 확인하세요.</p>
                  </div>
                </div>
              )}
              {!room.settings.baseLocation && (
                <p className="text-xs text-center text-gray-400 mt-3">먼저 위에서 기준 위치를 설정하세요</p>
              )}
            </div>
          </div>
        )}

        {/* ──────────────── ROULETTE TAB ──────────────── */}
        {tab === 'roulette' && (
          <div className="p-4 space-y-3">
            {/* 룰렛 섹션 */}
            {candidatesLoaded && (availableCandidates.length > 0) && (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden mb-4">
                <div className="px-4 py-3 bg-orange-50 border-b border-orange-100">
                  <h2 className="text-sm text-orange-700 flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <Shuffle className="w-4 h-4" />
                      룰렛
                    </span>
                    <span className="text-xs text-orange-500">후보 {availableCandidates.length}개</span>
                  </h2>
                </div>
                <div className="p-4 space-y-4">
                  {/* 룰렛 휠 */}
                  <div className="flex justify-center">
                    <RouletteWheel
                      places={availableCandidates}
                      spinning={spinning}
                      targetIndex={targetIndex}
                      onSpinEnd={handleSpinEnd}
                      resetTrigger={resetTrigger}
                    />
                  </div>

                  {/* 룰렛 시작 버튼 */}
                  {!spinning && !showResult && (
                    <button
                      onClick={startRoulette}
                      className="w-full py-4 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white rounded-2xl transition-all flex items-center justify-center gap-2 shadow-lg hover:shadow-xl text-base font-bold"
                    >
                      <Shuffle className="w-5 h-5" />
                      룰렛 돌리기!
                    </button>
                  )}

                  {/* 룰렛 결과 */}
                  {showResult && spinResult && (
                    <div className="space-y-3">
                      <div className="bg-gradient-to-br from-orange-50 to-amber-50 border-2 border-orange-300 rounded-2xl p-4">
                        <div className="text-center mb-3">
                          <div className="text-4xl mb-2">{CATEGORY_EMOJI[spinResult.category]}</div>
                          <h3 className="text-xl font-bold text-gray-900">{spinResult.name}</h3>
                          <p className="text-sm text-gray-500 mt-1">{CATEGORY_LABEL[spinResult.category]}</p>
                        </div>
                        {spinResult.priceRange && (
                          <div className="flex items-center justify-center gap-1 text-sm text-orange-600 mb-2">
                            <Wallet className="w-4 h-4" />
                            {spinResult.priceRange}
                          </div>
                        )}
                        {spinResult.address && (
                          <div className="flex items-start gap-1.5 text-xs text-gray-500 mb-3">
                            <MapPin className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                            <span>{spinResult.address}</span>
                          </div>
                        )}
                        
                        {/* 음식점 링크 */}
                        {(spinResult.placeLink || spinResult.kakaoUrl) && (
                          <div className="mb-3">
                            <a
                              href={spinResult.placeLink || spinResult.kakaoUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center justify-center gap-1.5 py-2 bg-white border border-orange-200 text-orange-600 hover:bg-orange-50 rounded-xl text-sm transition-colors"
                            >
                              <Link2 className="w-4 h-4" />
                              음식점 링크 보기
                            </a>
                          </div>
                        )}
                        
                        {/* 팀 메모 */}
                        <div className="bg-white border border-orange-100 rounded-xl p-3 mb-3">
                          <p className="text-xs text-orange-600 font-medium mb-1">📝 팀 메모</p>
                          <textarea
                            value={room.placeNotes?.[spinResult.placeId]?.memo || ''}
                            onChange={(e) => {
                              const currentNote = room.placeNotes?.[spinResult.placeId];
                              updatePlaceNote(room.roomId, spinResult.placeId, {
                                memo: e.target.value,
                                menuItems: currentNote?.menuItems || []
                              });
                            }}
                            placeholder="이 가게에 대한 팀 메모를 작성하세요..."
                            className="w-full px-2 py-1.5 text-sm border border-gray-200 rounded-lg focus:ring-1 focus:ring-orange-500 focus:border-orange-500 resize-none"
                            rows={3}
                          />
                        </div>
                        
                        {/* 메뉴판 */}
                        <div className="bg-white border border-orange-100 rounded-xl p-3">
                          <p className="text-xs text-orange-600 font-medium mb-2 flex items-center gap-1">
                            <UtensilsCrossed className="w-3.5 h-3.5" /> 메뉴판
                          </p>
                          {(() => {
                            const currentNote = room.placeNotes?.[spinResult.placeId];
                            const menuItems = currentNote?.menuItems || [];
                            const teamMemo = currentNote?.memo || '';
                            
                            return (
                              <>
                                {(menuItems.length > 0) && (
                                  <div className="space-y-1 mb-2">
                                    {menuItems.map((item, idx) => (
                                      <div key={idx} className="flex justify-between items-center text-xs bg-orange-50 px-2 py-1 rounded border border-orange-100">
                                        <span className="text-gray-700">{item.name}</span>
                                        <div className="flex items-center gap-2">
                                          <span className="text-gray-500 font-medium">
                                            {item.price ? `${parseInt(item.price).toLocaleString()}원` : '-'}
                                          </span>
                                          <button
                                            onClick={() => {
                                              const updatedItems = menuItems.filter((_, i) => i !== idx);
                                              updatePlaceNote(room.roomId, spinResult.placeId, {
                                                memo: teamMemo,
                                                menuItems: updatedItems
                                              });
                                            }}
                                            className="text-red-500 hover:text-red-700 transition-colors"
                                          >
                                            <XIcon className="w-3 h-3" />
                                          </button>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                )}
                                
                                {/* 메뉴 추가 폼 */}
                                <div className="flex gap-1.5">
                                  <input
                                    type="text"
                                    placeholder="메뉴명"
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter') {
                                        const nameInput = e.currentTarget;
                                        const priceInput = nameInput.nextElementSibling as HTMLInputElement;
                                        const name = nameInput.value.trim();
                                        const price = priceInput?.value.trim();
                                        
                                        if (name) {
                                          const newItem: MenuItem = { name, price: price || undefined };
                                          const updatedItems = [...menuItems, newItem];
                                          updatePlaceNote(room.roomId, spinResult.placeId, {
                                            memo: teamMemo,
                                            menuItems: updatedItems
                                          });
                                          nameInput.value = '';
                                          if (priceInput) priceInput.value = '';
                                        }
                                      }
                                    }}
                                    className="flex-1 px-2 py-1 text-xs border border-gray-200 rounded focus:ring-1 focus:ring-orange-500 focus:border-orange-500"
                                  />
                                  <input
                                    type="number"
                                    placeholder="가격"
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter') {
                                        const priceInput = e.currentTarget;
                                        const nameInput = priceInput.previousElementSibling as HTMLInputElement;
                                        const name = nameInput?.value.trim();
                                        const price = priceInput.value.trim();
                                        
                                        if (name) {
                                          const newItem: MenuItem = { name, price: price || undefined };
                                          const updatedItems = [...menuItems, newItem];
                                          updatePlaceNote(room.roomId, spinResult.placeId, {
                                            memo: teamMemo,
                                            menuItems: updatedItems
                                          });
                                          if (nameInput) nameInput.value = '';
                                          priceInput.value = '';
                                        }
                                      }
                                    }}
                                    className="w-20 px-2 py-1 text-xs border border-gray-200 rounded focus:ring-1 focus:ring-orange-500 focus:border-orange-500"
                                  />
                                  <button
                                    onClick={(e) => {
                                      const btn = e.currentTarget;
                                      const priceInput = btn.previousElementSibling as HTMLInputElement;
                                      const nameInput = priceInput?.previousElementSibling as HTMLInputElement;
                                      const name = nameInput?.value.trim();
                                      const price = priceInput?.value.trim();
                                      
                                      if (name) {
                                        const newItem: MenuItem = { name, price: price || undefined };
                                        const updatedItems = [...menuItems, newItem];
                                        updatePlaceNote(room.roomId, spinResult.placeId, {
                                          memo: teamMemo,
                                          menuItems: updatedItems
                                        });
                                        if (nameInput) nameInput.value = '';
                                        if (priceInput) priceInput.value = '';
                                      }
                                    }}
                                    className="px-2 py-1 bg-orange-500 hover:bg-orange-600 text-white rounded text-xs transition-colors shrink-0"
                                  >
                                    <Plus className="w-3 h-3" />
                                  </button>
                                </div>
                              </>
                            );
                          })()}
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <button
                          onClick={resetRoulette}
                          className="py-3 border border-gray-200 text-gray-600 rounded-xl hover:bg-gray-50 text-sm font-medium flex items-center justify-center gap-1"
                        >
                          <RotateCcw className="w-4 h-4" />
                          다시 돌리기
                        </button>
                        <button
                          onClick={() => shareSpinResult(spinResult)}
                          className="py-3 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-sm font-medium flex items-center justify-center gap-1"
                        >
                          <Share2 className="w-4 h-4" />
                          결과 공유
                        </button>
                        <button
                          onClick={async () => {
                            const pick = room.pickHistory.find(h => h.placeId === spinResult.placeId);
                            if (pick) await markPickVisited(room.roomId, pick.pickedAt);
                            setTab('history');
                            loadRoom();
                          }}
                          className="py-3 bg-green-500 hover:bg-green-600 text-white rounded-xl text-sm font-medium flex items-center justify-center gap-1"
                        >
                          <CheckCircle2 className="w-4 h-4" />
                          방문 확인
                        </button>
                        <button
                          onClick={async () => {
                            const pick = room.pickHistory.find(h => h.placeId === spinResult.placeId);
                            if (pick) {
                              await markPickVisited(room.roomId, pick.pickedAt);
                              setSettlementForVisit({ placeName: spinResult.name, placeId: spinResult.placeId, pickedAt: pick.pickedAt });
                            } else {
                              setSettlementForVisit({ placeName: spinResult.name, placeId: spinResult.placeId, pickedAt: '' });
                            }
                            setShowSettlement(true);
                            setTab('settlement');
                            loadRoom();
                          }}
                          className="py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-xl text-sm font-medium flex items-center justify-center gap-1"
                        >
                          <CreditCard className="w-4 h-4" />
                          정산하기
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* 간단한 안내 메시지 */}
            {!candidatesLoaded && (
              <div className="bg-gradient-to-br from-orange-50 to-amber-50 rounded-2xl p-4 border border-orange-100 mb-4">
                <p className="text-sm text-orange-800">
                  <Settings className="w-4 h-4 inline mr-1" />
                  <strong>룰렛 설정</strong> 탭에서 위치와 카테고리를 설정하고 후보를 불러오세요
                </p>
              </div>
            )}

            {!candidatesLoaded ? (
              <div className="text-center py-12 text-gray-400">
                <Shuffle className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p className="text-sm font-medium mb-1">아직 후보가 없어요</p>
                <p className="text-xs">룰렛 설정 탭에서 후보를 불러오세요</p>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between">
                  <p className="text-sm text-gray-600">
                    총 <strong>{candidates.length}개</strong> 중 <strong className="text-orange-500">{availableCandidates.length}개</strong> 후보
                  </p>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setShowFavorites(true)}
                      className="flex items-center gap-1 text-xs text-amber-600 hover:text-amber-700 bg-amber-50 hover:bg-amber-100 px-2.5 py-1.5 rounded-lg transition-colors relative"
                    >
                      <Star className="w-3.5 h-3.5 fill-amber-300" />
                      후보집
                      {((room.savedPlaces?.length ?? 0) > 0) && (
                        <span className="ml-0.5 text-[9px] bg-orange-500 text-white px-1 py-0.5 rounded-full font-bold">
                          {room.savedPlaces.length}
                        </span>
                      )}
                    </button>
                    <button
                      onClick={() => setShowAddCandidate(true)}
                      className="flex items-center gap-1 text-xs text-orange-500 hover:text-orange-600 bg-orange-50 hover:bg-orange-100 px-2.5 py-1.5 rounded-lg transition-colors"
                    >
                      <Plus className="w-3.5 h-3.5" /> 직접 추가
                    </button>
                    <button
                      onClick={fetchCandidates}
                      className="flex items-center gap-1 text-xs text-gray-500 hover:text-orange-500 transition-colors"
                    >
                      <RefreshCw className="w-3.5 h-3.5" /> 새로고침
                    </button>
                  </div>
                </div>

                {availableCandidates.length === 0 && (
                  <div className="bg-amber-50 border border-amber-100 rounded-xl p-4 text-sm text-amber-700">
                    <AlertCircle className="w-4 h-4 inline mr-1.5" />
                    최근 방문으로 인해 후보가 없습니다.
                    <button
                      className="block mt-1 text-xs underline"
                      onClick={() => {
                        updateRoomSettings(room.roomId, {
                          excludeRecentDays: Math.max(1, room.settings.excludeRecentDays - 1)
                        });
                        loadRoom();
                      }}
                    >
                      제외 기간을 줄여보세요
                    </button>
                  </div>
                )}

                <div className="space-y-2">
                  {availableCandidates.map(p => (
                    <RestaurantCard
                      key={p.placeId}
                      place={p}
                      roomId={room.roomId}
                      onDelete={() => deleteCandidate(p.placeId)}
                      onAddToFavorites={async (place) => {
                        await addSavedPlace(room.roomId, place);
                        await loadRoom();
                      }}
                      isFavorite={room.savedPlaces?.some(sp => sp.placeId === p.placeId)}
                    />
                  ))}
                </div>

                {(excludedCandidates.length > 0) && (
                  <div className="mt-2">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-xs text-gray-400 flex items-center gap-1">
                        <AlertCircle className="w-3.5 h-3.5" />
                        최근 {room.settings.excludeRecentDays}일 방문으로 제외된 곳 ({excludedCandidates.length}개)
                      </p>
                      <button
                        onClick={() => {
                          updateRoomSettings(room.roomId, { excludeEnabled: false });
                          loadRoom();
                        }}
                        className="text-xs text-orange-500 hover:text-orange-600 flex items-center gap-1"
                      >
                        <Plus className="w-3 h-3" />
                        모두 포함
                      </button>
                    </div>
                    <div className="space-y-2">
                      {excludedCandidates.map(p => (
                        <RestaurantCard
                          key={p.placeId}
                          place={p}
                          roomId={room.roomId}
                          excluded
                          excludeReason={`최근 ${room.settings.excludeRecentDays}일 방문`}
                          onAddToFavorites={async (place) => {
                            await addSavedPlace(room.roomId, place);
                            await loadRoom();
                          }}
                          isFavorite={room.savedPlaces?.some(sp => sp.placeId === p.placeId)}
                          onInclude={async () => {
                            await removeVisitFromHistory(room.roomId, p.placeId);
                            await loadRoom();
                          }}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {(priceExcludedCandidates.length > 0) && (
                  <div className="mt-2">
                    <p className="text-xs text-gray-400 mb-2 flex items-center gap-1">
                      <AlertCircle className="w-3.5 h-3.5" />
                      가격대 필터로 제외된 곳 ({priceExcludedCandidates.length}개)
                    </p>
                    <div className="space-y-2">
                      {priceExcludedCandidates.map(p => (
                        <RestaurantCard
                          key={p.placeId}
                          place={p}
                          roomId={room.roomId}
                          excluded
                          excludeReason={`가격대 필터`}
                          onAddToFavorites={async (place) => {
                            await addSavedPlace(room.roomId, place);
                            await loadRoom();
                          }}
                          isFavorite={room.savedPlaces?.some(sp => sp.placeId === p.placeId)}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* ──────────────── FAVORITES TAB (팀 후보집) ──────────────── */}
        {tab === 'favorites' && room && (
          <div className="p-4 space-y-3">
            {/* 룰렛 설정 */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <button
                onClick={() => setShowSettings(!showSettings)}
                className="w-full px-4 py-3 flex items-center justify-between bg-gray-50 hover:bg-gray-100 transition-colors"
              >
                <div className="flex items-center gap-2 text-sm text-gray-700">
                  <Settings className="w-4 h-4" />
                  <span className="font-medium">룰렛 설정</span>
                </div>
                {showSettings ? (
                  <ChevronUp className="w-4 h-4 text-gray-400" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-gray-400" />
                )}
              </button>
              
              {showSettings && (
                <div className="p-4 space-y-4 border-t border-gray-100">
                  {/* 위치 설정 */}
                  <div>
                    <label className="text-xs text-gray-500 mb-2 block">기준 위치</label>
                    <div className="space-y-3">
                      {/* GPS 현재 위치 버튼 */}
                      <button
                        onClick={requestLocation}
                        disabled={locationStatus === 'loading'}
                        className="w-full px-4 py-3 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 disabled:from-gray-300 disabled:to-gray-400 text-white rounded-lg transition-all flex items-center justify-center gap-2 font-medium shadow-sm text-sm"
                      >
                        {locationStatus === 'loading' ? (
                          <>
                            <Loader2 className="w-5 h-5 animate-spin" />
                            위치 가져오는 중...
                          </>
                        ) : (
                          <>
                            <Navigation className="w-5 h-5" />
                            현재 위치로 설정 (GPS)
                          </>
                        )}
                      </button>

                      {/* 구분선 */}
                      <div className="flex items-center gap-3">
                        <div className="flex-1 h-px bg-gray-200"></div>
                        <span className="text-xs text-gray-400 font-medium">또는</span>
                        <div className="flex-1 h-px bg-gray-200"></div>
                      </div>

                      {/* 주소 검색 입력 */}
                      <div className="relative space-y-2">
                        <label className="text-xs text-gray-600 block font-medium">주소로 검색</label>
                        <div className="relative flex gap-2">
                          <input
                            type="text"
                            value={addressInput}
                            onChange={(e) => handleAddressChange(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                handleAddressSubmit();
                              }
                            }}
                            onFocus={() => addressSuggestions.length > 0 && setShowSuggestions(true)}
                            onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                            placeholder="예: 강남역, 서울시 강남구..."
                            className="flex-1 px-4 py-3 border-2 border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-orange-500 focus:border-orange-500 bg-white text-gray-900 placeholder:text-gray-400"
                          />
                          <button
                            onClick={handleAddressSubmit}
                            disabled={!addressInput.trim() || addressLoading}
                            className="px-4 py-3 bg-orange-500 hover:bg-orange-600 disabled:bg-gray-300 text-white rounded-lg transition-colors flex items-center justify-center gap-1 text-sm font-medium shrink-0"
                          >
                            {addressLoading ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <Search className="w-4 h-4" />
                            )}
                          </button>
                        
                          {/* 주소 자동완성 드롭다운 */}
                          {showSuggestions && (addressSuggestions.length > 0) && (
                            <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 max-h-60 overflow-y-auto">
                              {addressSuggestions.map((result, idx) => (
                                <button
                                  key={idx}
                                  onClick={() => selectAddress(result)}
                                  className="w-full px-4 py-3 text-left hover:bg-gray-50 transition-colors border-b last:border-b-0 border-gray-100"
                                >
                                  <div className="flex items-start gap-2">
                                    <MapPin className="w-4 h-4 text-orange-500 shrink-0 mt-0.5" />
                                    <div className="flex-1 min-w-0">
                                      <p className="text-sm text-gray-900 font-medium truncate">{result.place_name}</p>
                                      <p className="text-xs text-gray-500 truncate mt-0.5">{result.address_name}</p>
                                    </div>
                                  </div>
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                    {room.settings.baseLocation && (
                      <p className="text-xs text-orange-600 mt-3 flex items-center gap-1">
                        <MapPinned className="w-3 h-3" />
                        {room.settings.baseLocation.label}
                      </p>
                    )}
                  </div>

                  {/* 반경 설정 */}
                  <div>
                    <label className="text-xs text-gray-500 mb-2 block">검색 반경</label>
                    <div className="flex gap-2 flex-wrap">
                      {RADIUS_OPTIONS.map(r => (
                        <button
                          key={r}
                          onClick={() => {
                            updateRoomSettings(room.roomId, { radiusMeters: r });
                            loadRoom();
                          }}
                          className={`px-3 py-1.5 rounded-lg text-xs border transition-all ${
                            room.settings.radiusMeters === r
                              ? 'bg-orange-500 text-white border-orange-500'
                              : 'border-gray-200 text-gray-600 hover:border-orange-300'
                          }`}
                        >
                          {r < 1000 ? `${r}m` : `${r/1000}km`}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* 최근 방문 제외 일수 */}
                  <div>
                    <label className="text-xs text-gray-500 mb-2 block">최근 방문 제외</label>
                    <div className="flex items-center gap-2 mb-2">
                      <button
                        onClick={() => {
                          updateRoomSettings(room.roomId, { excludeEnabled: !room.settings.excludeEnabled });
                          loadRoom();
                        }}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                          room.settings.excludeEnabled ? 'bg-orange-500' : 'bg-gray-200'
                        }`}
                      >
                        <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                          room.settings.excludeEnabled ? 'translate-x-6' : 'translate-x-1'
                        }`} />
                      </button>
                      <span className="text-xs text-gray-600">
                        {room.settings.excludeEnabled ? '활성화' : '비활성화'}
                      </span>
                    </div>
                    {room.settings.excludeEnabled && (
                      <div className="flex gap-2 flex-wrap">
                        {EXCLUDE_DAY_OPTIONS.map(d => (
                          <button
                            key={d}
                            onClick={() => {
                              updateRoomSettings(room.roomId, { excludeRecentDays: d });
                              loadRoom();
                            }}
                            className={`px-3 py-1.5 rounded-lg text-xs border transition-all ${
                              room.settings.excludeRecentDays === d
                                ? 'bg-orange-500 text-white border-orange-500'
                                : 'border-gray-200 text-gray-600 hover:border-orange-300'
                            }`}
                          >
                            {d}일
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* 카테고리 필터 */}
                  <div>
                    <label className="text-xs text-gray-500 mb-2 block">카테고리 필터</label>
                    <div className="flex gap-2 flex-wrap">
                      <button
                        onClick={() => {
                          updateRoomSettings(room.roomId, { categoryFilter: [] });
                          loadRoom();
                        }}
                        className={`px-3 py-1.5 rounded-lg text-xs border transition-all ${
                          (room.settings.categoryFilter ?? []).length === 0
                            ? 'bg-gray-800 text-white border-gray-800'
                            : 'border-gray-200 text-gray-600 hover:border-gray-400'
                        }`}
                      >
                        전체
                      </button>
                      {ALL_CATEGORIES.map(cat => {
                        const active = (room.settings.categoryFilter ?? []).includes(cat);
                        return (
                          <button
                            key={cat}
                            onClick={() => {
                              const current = room.settings.categoryFilter ?? [];
                              let updated: Category[];
                              if (current.length === 0) {
                                updated = [cat];
                              } else if (current.includes(cat)) {
                                updated = current.filter(c => c !== cat);
                              } else {
                                updated = [...current, cat];
                              }
                              updateRoomSettings(room.roomId, { categoryFilter: updated });
                              loadRoom();
                            }}
                            className={`px-3 py-1.5 rounded-lg text-xs border transition-all ${
                              active
                                ? 'bg-orange-500 text-white border-orange-500'
                                : 'border-gray-200 text-gray-600 hover:border-orange-300'
                            }`}
                          >
                            {CATEGORY_EMOJI[cat]} {CATEGORY_LABEL[cat]}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* 가격대 필터 */}
                  <div>
                    <label className="text-xs text-gray-500 mb-2 block">가격대 필터</label>
                    <div className="flex gap-2 flex-wrap">
                      <button
                        onClick={() => {
                          updateRoomSettings(room.roomId, { priceFilter: [] });
                          loadRoom();
                        }}
                        className={`px-3 py-1.5 rounded-lg text-xs border transition-all ${
                          (room.settings.priceFilter ?? []).length === 0
                            ? 'bg-gray-800 text-white border-gray-800'
                            : 'border-gray-200 text-gray-600 hover:border-gray-400'
                        }`}
                      >
                        전체
                      </button>
                      {ALL_PRICE_TIERS.map(tier => {
                        const active = (room.settings.priceFilter ?? []).includes(tier);
                        return (
                          <button
                            key={tier}
                            onClick={() => {
                              const current = room.settings.priceFilter ?? [];
                              let updated: PriceTier[];
                              if (current.length === 0) {
                                updated = [tier];
                              } else if (current.includes(tier)) {
                                updated = current.filter(t => t !== tier);
                              } else {
                                updated = [...current, tier];
                              }
                              updateRoomSettings(room.roomId, { priceFilter: updated });
                              loadRoom();
                            }}
                            className={`px-3 py-1.5 rounded-lg text-xs border transition-all ${
                              active
                                ? `${PRICE_TIER_COLOR[tier]}`
                                : 'border-gray-200 text-gray-600 hover:border-orange-300'
                            }`}
                          >
                            {PRICE_TIER_EMOJI[tier]} {PRICE_TIER_LABEL[tier]}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* 상단 직접 추가 버튼 */}
            <button
              onClick={() => setShowAddCandidate(true)}
              className="w-full py-3.5 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-sm font-medium transition-colors flex items-center justify-center gap-2"
            >
              <Plus className="w-4 h-4" />
              음식점 직접 추가
            </button>

            {!room.savedPlaces || room.savedPlaces.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center py-16 text-gray-400">
                <Star className="w-12 h-12 mb-3 opacity-20" />
                <p className="text-sm">아직 저장된 후보집이 없어요</p>
                <p className="text-xs mt-1 text-gray-300">
                  위 버튼으로 음식점을 추가해보세요
                </p>
              </div>
            ) : (
              /* Saved Places List */
              <>

                {/* 목록 */}
                <div className="space-y-2">
                  {room.savedPlaces?.map(place => {
                    const alreadyAdded = candidates.some(c => c.placeId === place.placeId);
                    const isExpanded = expandedFavoriteId === place.placeId;

                    return (
                      <div
                        key={place.placeId}
                        className={`rounded-2xl border overflow-hidden transition-all ${
                          alreadyAdded
                            ? 'border-emerald-200 bg-emerald-50'
                            : 'border-gray-200 bg-white'
                        }`}
                      >
                        {/* 카드 메인 영역 */}
                        <div className="flex items-center gap-3 p-3">
                          {/* 카테고리 이모지 */}
                          <div className="w-9 h-9 rounded-xl bg-orange-50 flex items-center justify-center text-lg shrink-0">
                            {CATEGORY_EMOJI[place.category]}
                          </div>

                          {/* 가게 정보 */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-0.5">
                              <h3 className="font-medium text-gray-900 truncate">{place.name}</h3>
                              {alreadyAdded && (
                                <span className="shrink-0 text-[10px] bg-emerald-100 text-emerald-600 px-1.5 py-0.5 rounded flex items-center gap-0.5">
                                  <CheckCircle2 className="w-2.5 h-2.5" />
                                  포함됨
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-gray-500 truncate">{place.address}</p>
                          </div>

                          {/* 우측 버튼 그룹 */}
                          <div className="flex items-center gap-1.5 shrink-0">
                            {/* 룰렛 포함 버튼 */}
                            {!alreadyAdded ? (
                              <button
                                onClick={() => {
                                  setCandidates(prev => {
                                    const existing = new Set(prev.map(p => p.placeId));
                                    if (!existing.has(place.placeId)) {
                                      return [...prev, place];
                                    }
                                    return prev;
                                  });
                                }}
                                className="px-2.5 py-1.5 bg-orange-500 hover:bg-orange-600 text-white rounded-lg text-xs font-medium transition-colors flex items-center gap-1"
                              >
                                <Plus className="w-3 h-3" />
                                포함
                              </button>
                            ) : (
                              <button
                                onClick={() => {
                                  setCandidates(prev => prev.filter(c => c.placeId !== place.placeId));
                                }}
                                className="px-2.5 py-1.5 bg-gray-200 hover:bg-gray-300 text-gray-600 rounded-lg text-xs font-medium transition-colors flex items-center gap-1"
                              >
                                <Minus className="w-3 h-3" />
                                제외
                              </button>
                            )}

                            {/* 메모/메뉴 토글 버튼 */}
                            <button
                              onClick={() => setExpandedFavoriteId(isExpanded ? null : place.placeId)}
                              className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
                            >
                              <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                            </button>
                          </div>
                        </div>

                        {/* 확장 영역: 팀 메모 + 메뉴판 */}
                        {isExpanded && (() => {
                          const placeNote = room.placeNotes?.[place.placeId];
                          const teamMemo = placeNote?.memo || '';
                          const menuItems = placeNote?.menuItems || [];
                          
                          return (
                            <div className="border-t border-gray-100 bg-gray-50 p-3 space-y-3">
                              {/* 팀 메모 */}
                              <div>
                                <label className="text-xs font-medium text-gray-600 mb-1 block">팀 메모</label>
                                <textarea
                                  value={teamMemo}
                                  onChange={(e) => {
                                    updatePlaceNote(room.roomId, place.placeId, {
                                      memo: e.target.value,
                                      menuItems
                                    });
                                  }}
                                  onClick={(e) => e.stopPropagation()}
                                  placeholder="이 가게에 대한 팀 메모를 작성하세요..."
                                  className="w-full px-2 py-1.5 text-xs border border-gray-200 rounded-lg focus:ring-1 focus:ring-orange-500 focus:border-orange-500 resize-none"
                                  rows={2}
                                />
                              </div>

                              {/* 메뉴판 */}
                              <div>
                                <label className="text-xs font-medium text-gray-600 mb-1 block">메뉴판</label>
                                {(menuItems.length > 0) && (
                                  <div className="space-y-1 mb-2">
                                    {menuItems.map((item, idx) => (
                                      <div key={idx} className="flex justify-between items-center text-xs bg-white px-2 py-1 rounded border border-gray-100">
                                        <span className="text-gray-700">{item.name}</span>
                                        <div className="flex items-center gap-2">
                                          <span className="text-gray-500 font-medium">
                                            {item.price ? `${parseInt(item.price).toLocaleString()}원` : '-'}
                                          </span>
                                          <button
                                            onClick={() => {
                                              const updatedItems = menuItems.filter((_, i) => i !== idx);
                                              updatePlaceNote(room.roomId, place.placeId, {
                                                memo: teamMemo,
                                                menuItems: updatedItems
                                              });
                                            }}
                                            className="text-red-500 hover:text-red-700 transition-colors"
                                          >
                                            <XIcon className="w-3 h-3" />
                                          </button>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                )}
                                
                                {/* 메뉴 추가 폼 */}
                                <div className="flex gap-1.5">
                                  <input
                                    type="text"
                                    placeholder="메뉴명"
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter') {
                                        const nameInput = e.currentTarget;
                                        const priceInput = nameInput.nextElementSibling as HTMLInputElement;
                                        const name = nameInput.value.trim();
                                        const price = priceInput?.value.trim();
                                        
                                        if (name) {
                                          const newItem: MenuItem = { name, price: price || undefined };
                                          const updatedItems = [...menuItems, newItem];
                                          updatePlaceNote(room.roomId, place.placeId, {
                                            memo: teamMemo,
                                            menuItems: updatedItems
                                          });
                                          nameInput.value = '';
                                          if (priceInput) priceInput.value = '';
                                        }
                                      }
                                    }}
                                    className="flex-1 px-2 py-1 text-xs border border-gray-200 rounded focus:ring-1 focus:ring-orange-500 focus:border-orange-500"
                                  />
                                  <input
                                    type="number"
                                    placeholder="가격"
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter') {
                                        const priceInput = e.currentTarget;
                                        const nameInput = priceInput.previousElementSibling as HTMLInputElement;
                                        const name = nameInput?.value.trim();
                                        const price = priceInput.value.trim();
                                        
                                        if (name) {
                                          const newItem: MenuItem = { name, price: price || undefined };
                                          const updatedItems = [...menuItems, newItem];
                                          updatePlaceNote(room.roomId, place.placeId, {
                                            memo: teamMemo,
                                            menuItems: updatedItems
                                          });
                                          if (nameInput) nameInput.value = '';
                                          priceInput.value = '';
                                        }
                                      }
                                    }}
                                    className="w-20 px-2 py-1 text-xs border border-gray-200 rounded focus:ring-1 focus:ring-orange-500 focus:border-orange-500"
                                  />
                                  <button
                                    onClick={(e) => {
                                      const btn = e.currentTarget;
                                      const priceInput = btn.previousElementSibling as HTMLInputElement;
                                      const nameInput = priceInput?.previousElementSibling as HTMLInputElement;
                                      const name = nameInput?.value.trim();
                                      const price = priceInput?.value.trim();
                                      
                                      if (name) {
                                        const newItem: MenuItem = { name, price: price || undefined };
                                        const updatedItems = [...menuItems, newItem];
                                        updatePlaceNote(room.roomId, place.placeId, {
                                          memo: teamMemo,
                                          menuItems: updatedItems
                                        });
                                        if (nameInput) nameInput.value = '';
                                        if (priceInput) priceInput.value = '';
                                      }
                                    }}
                                    className="px-2 py-1 bg-orange-500 hover:bg-orange-600 text-white rounded text-xs transition-colors shrink-0"
                                  >
                                    <Plus className="w-3 h-3" />
                                  </button>
                                </div>
                              </div>

                              {/* 삭제 버튼 */}
                              <button
                                onClick={async () => {
                                  if (confirm(`"${place.name}"을(를) 후보집에서 삭제하시겠습니까?`)) {
                                    await removeSavedPlace(room.roomId, place.placeId);
                                    await loadRoom();
                                  }
                                }}
                                className="w-full py-2 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg text-xs font-medium transition-colors flex items-center justify-center gap-1.5 border border-red-200"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                                후보집에서 삭제
                              </button>
                            </div>
                          );
                        })()}
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        )}


        {/* ──────────────── DUTY TAB ──────────────── */}
        {tab === 'duty' && (
          <div className="p-4 space-y-4">
            {/* Current Duty */}
            <div className="bg-gradient-to-br from-orange-500 to-amber-500 rounded-2xl p-5 text-white shadow-lg">
              <div className="text-center mb-1">
                <p className="text-orange-100 text-sm">오늘의 당번</p>
                <div className="text-5xl my-3">
                  {currentDuty ? currentDuty.nickname.slice(0, 1) : '?'}
                </div>
                <h3 className="text-xl text-white">
                  {currentDuty ? currentDuty.nickname : '미설정'}
                </h3>
                <p className="text-orange-100 text-sm mt-1">
                  {new Date().toLocaleDateString('ko-KR', { month: 'long', day: 'numeric', weekday: 'short' })}
                </p>
              </div>
            </div>

            {/* Duty Mode */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="px-4 py-3 bg-orange-50 border-b border-orange-100">
                <h2 className="text-sm text-orange-700">당번 방식</h2>
              </div>
              <div className="p-4 space-y-3">
                <div className="flex gap-2">
                  {[
                    { value: 'auto', label: '🔄 자동 순번' },
                    { value: 'manual', label: '✋ 수동 지정' },
                  ].map(opt => (
                    <button
                      key={opt.value}
                      onClick={() => setDutyMode(opt.value as typeof dutyMode)}
                      className={`flex-1 py-2.5 rounded-xl text-sm border transition-colors ${
                        dutyMode === opt.value
                          ? 'bg-orange-500 border-orange-500 text-white'
                          : 'border-gray-200 text-gray-600 hover:border-orange-300'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>

                {dutyMode === 'auto' && (
                  <button
                    onClick={rotateNextDuty}
                    className="w-full py-3 border border-orange-200 text-orange-600 rounded-xl hover:bg-orange-50 flex items-center justify-center gap-2 text-sm"
                  >
                    <RotateCcw className="w-4 h-4" />
                    다음 순번으로 변경
                  </button>
                )}

                {dutyMode === 'manual' && (
                  <div className="space-y-2">
                    <p className="text-xs text-gray-500">오늘 당번을 선택하세요</p>
                    {room.participants.map(p => (
                      <button
                        key={p.userId}
                        onClick={() => assignDuty(p.userId)}
                        className={`w-full flex items-center gap-3 p-3 rounded-xl border text-left transition-colors ${
                          currentDuty?.userId === p.userId
                            ? 'border-orange-400 bg-orange-50'
                            : 'border-gray-100 hover:border-orange-200'
                        }`}
                      >
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm ${
                          currentDuty?.userId === p.userId
                            ? 'bg-orange-500 text-white'
                            : 'bg-gray-100 text-gray-600'
                        }`}>
                          {p.nickname.slice(0, 1)}
                        </div>
                        <span className="flex-1 text-sm text-gray-700">{p.nickname}</span>
                        {currentDuty?.userId === p.userId && (
                          <span className="text-xs text-orange-500">✓ 당번</span>
                        )}
                        {p.isHost && (
                          <span className="text-xs text-gray-400">방장</span>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Duty History */}
            {(room.dutyHistory.length > 0) && (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="px-4 py-3 bg-orange-50 border-b border-orange-100">
                  <h2 className="text-sm text-orange-700">당번 기록</h2>
                </div>
                <div className="p-4 space-y-2">
                  {room.dutyHistory.slice(0, 10).map((d, i) => {
                    const p = room.participants.find(p => p.userId === d.userId);
                    return (
                      <div key={i} className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center text-xs text-gray-600">
                            {p?.nickname.slice(0, 1)}
                          </div>
                          <span className="text-gray-700">{p?.nickname || '알 수 없음'}</span>
                        </div>
                        <span className="text-xs text-gray-400">{d.date}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Participant Duty Count */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="px-4 py-3 bg-orange-50 border-b border-orange-100">
                <h2 className="text-sm text-orange-700">팀원별 당번 횟수</h2>
              </div>
              <div className="p-4 space-y-3">
                {room.participants.map(p => {
                  const count = room.dutyHistory.filter(d => d.userId === p.userId).length;
                  const maxCount = Math.max(...room.participants.map(pp =>
                    room.dutyHistory.filter(d => d.userId === pp.userId).length
                  ), 1);
                  return (
                    <div key={p.userId} className="space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-700">{p.nickname}</span>
                        <span className="text-xs text-gray-500">{count}회</span>
                      </div>
                      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-orange-400 rounded-full transition-all"
                          style={{ width: `${(count / maxCount) * 100}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* ──────────────── HISTORY TAB ──────────────── */}
        {tab === 'history' && (() => {
          const rouletteHistory = room.pickHistory.slice().reverse(); // 최신순
          const visitHistory = room.pickHistory.filter(h => h.visited).slice().reverse();

          const HistoryCard = ({ h, idx, showVisitBtn, showSettleBtn }: {
            h: typeof room.pickHistory[0]; idx: number; showVisitBtn: boolean; showSettleBtn?: boolean;
          }) => {
            const date = new Date(h.pickedAt);
            const isToday = date.toDateString() === new Date().toDateString();
            const dateStr = isToday
              ? '오늘'
              : date.toLocaleDateString('ko-KR', { month: 'long', day: 'numeric', weekday: 'short' });
            const timeStr = date.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });

            return (
              <div className={`bg-white rounded-2xl border overflow-hidden ${
                h.visited
                  ? 'border-emerald-200 shadow-sm shadow-emerald-50'
                  : isToday
                  ? 'border-orange-200 shadow-sm shadow-orange-50'
                  : 'border-gray-100'
              }`}>
                {/* 상단: 식당 정보 행 */}
                <div className="p-4 flex items-center gap-3">
                  {/* 아이콘 */}
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${
                    h.visited
                      ? 'bg-emerald-100 text-emerald-600'
                      : isToday
                      ? 'bg-orange-500 text-white'
                      : 'bg-gray-100 text-gray-400'
                  }`}>
                    {h.visited
                      ? <CheckCircle2 className="w-4 h-4" />
                      : <Clock className="w-4 h-4" />}
                  </div>

                  {/* 식당 정보 */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <p className={`text-sm font-medium truncate ${
                        h.visited ? 'text-emerald-700' : isToday ? 'text-orange-700' : 'text-gray-800'
                      }`}>
                        {h.placeName}
                      </p>
                      {isToday && !h.visited && (
                        <span className="shrink-0 text-[10px] bg-orange-100 text-orange-600 px-1.5 py-0.5 rounded-full">오늘</span>
                      )}
                      {h.visited && (
                        <span className="shrink-0 text-[10px] bg-emerald-100 text-emerald-600 px-1.5 py-0.5 rounded-full">방문완료</span>
                      )}
                    </div>
                    <p className="text-xs text-gray-400 mt-0.5">{dateStr} · {timeStr}</p>
                  </div>

                  {/* 우측 버튼 그룹 */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    {showVisitBtn && !h.visited && (
                      <button
                        onClick={() => {
                          markPickVisited(room.roomId, h.pickedAt);
                          loadRoom();
                        }}
                        className="text-[11px] px-2.5 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg transition-colors font-medium flex items-center gap-1"
                      >
                        <CheckCircle2 className="w-3 h-3" />
                        방문함
                      </button>
                    )}
                    <a
                      href={`https://map.kakao.com/?q=${encodeURIComponent(h.placeName)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-8 h-8 flex items-center justify-center bg-yellow-50 hover:bg-yellow-100 border border-yellow-200 rounded-xl transition-colors"
                    >
                      <ExternalLink className="w-3.5 h-3.5 text-yellow-600" />
                    </a>
                  </div>
                </div>

                {/* 팀 후보집 추가 버튼 */}
                {!room.savedPlaces?.some(sp => sp.name === h.placeName) && (
                  <div className="px-4 pb-3">
                    <button
                      onClick={async () => {
                        // 기록에서 Place 객체 재구성
                        const place: Place = {
                          placeId: `history_${h.pickedAt}_${h.placeName}`,
                          name: h.placeName,
                          category: 'OTHER',
                          categoryDetail: '기타/룰렛기록',
                          address: '',
                          lat: 0,
                          lng: 0,
                          distanceMeters: 0,
                          isManual: true,
                        };
                        await addSavedPlace(room.roomId, place);
                        await loadRoom();
                      }}
                      className="w-full py-2 bg-amber-50 hover:bg-amber-100 text-amber-600 rounded-lg text-xs font-medium flex items-center justify-center gap-1.5 transition-colors border border-amber-200"
                    >
                      <Star className="w-3.5 h-3.5 fill-amber-400" />
                      팀 후보집에 추가
                    </button>
                  </div>
                )}

                {/* 정산하기 버튼 — 방문 내역 탭의 방문 완료 항목에만 표시 */}
                {showSettleBtn && h.visited && (
                  <div className="px-3 pb-3">
                    <button
                      onClick={() => {
                        setSettlementForVisit({ placeName: h.placeName, placeId: h.placeId, pickedAt: h.pickedAt });
                        setShowSettlement(true);
                      }}
                      className="w-full py-2.5 bg-gray-800 hover:bg-gray-700 active:bg-gray-900 text-white rounded-xl text-xs font-medium flex items-center justify-center gap-1.5 transition-colors"
                    >
                      <CreditCard className="w-3.5 h-3.5" />
                      이 방문 정산하기
                    </button>
                  </div>
                )}
              </div>
            );
          };

          return (
            <div className="p-4 space-y-3">
              {/* 서브탭 */}
              <div className="flex bg-gray-100 rounded-xl p-1 gap-1">
                <button
                  onClick={() => setHistoryTab('roulette')}
                  className={`flex-1 py-2 rounded-lg text-xs font-medium transition-all flex items-center justify-center gap-1.5 ${
                    historyTab === 'roulette'
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <Shuffle className="w-3.5 h-3.5" />
                  룰렛 내역
                  <span className="bg-gray-200 text-gray-600 px-1.5 py-0.5 rounded-full text-[10px]">
                    {rouletteHistory.length}
                  </span>
                </button>
                <button
                  onClick={() => setHistoryTab('visit')}
                  className={`flex-1 py-2 rounded-lg text-xs font-medium transition-all flex items-center justify-center gap-1.5 ${
                    historyTab === 'visit'
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  방문 내역
                  <span className={`px-1.5 py-0.5 rounded-full text-[10px] ${
                    (visitHistory.length > 0)
                      ? 'bg-emerald-100 text-emerald-600'
                      : 'bg-gray-200 text-gray-500'
                  }`}>
                    {visitHistory.length}
                  </span>
                </button>
              </div>

              {/* 룰렛 내역 */}
              {historyTab === 'roulette' && (
                <>
                  {rouletteHistory.length === 0 ? (
                    <div className="text-center py-16 text-gray-400">
                      <Shuffle className="w-10 h-10 mx-auto mb-3 opacity-30" />
                      <p className="text-sm">아직 룰렛 기록이 없어요</p>
                      <p className="text-xs mt-1 text-gray-300">룰렛을 돌리면 자동으로 기록됩니다</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <p className="text-xs text-gray-400">선정된 식당 {rouletteHistory.length}건 · 방문 처리하면 방문 내역에 기록됩니다</p>
                      {rouletteHistory.map((h, i) => (
                        <HistoryCard key={h.pickedAt + i} h={h} idx={i} showVisitBtn={true} />
                      ))}
                    </div>
                  )}
                </>
              )}

              {/* 방문 내역 */}
              {historyTab === 'visit' && (
                <>
                  {visitHistory.length === 0 ? (
                    <div className="text-center py-16 text-gray-400">
                      <CheckCircle2 className="w-10 h-10 mx-auto mb-3 opacity-30" />
                      <p className="text-sm">아직 방문 기록이 없어요</p>
                      <p className="text-xs mt-1 text-gray-300">룰렛 결과에서 "방문함" 버튼을 눌러주세요</p>
                      <button
                        onClick={() => setHistoryTab('roulette')}
                        className="mt-3 text-sm text-orange-500 hover:text-orange-600 underline"
                      >
                        룰렛 내역 보기 →
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <p className="text-xs text-gray-400">실제 방문한 식당 {visitHistory.length}건 · 정산이 필요하면 버튼을 눌러주세요</p>
                      {visitHistory.map((h, i) => (
                        <HistoryCard key={h.pickedAt + i} h={h} idx={i} showVisitBtn={false} showSettleBtn={true} />
                      ))}

                      {/* TOP 3 자주 간 식당 */}
                      {visitHistory.length >= 2 && (() => {
                        const freq: Record<string, number> = {};
                        visitHistory.forEach(h => { freq[h.placeName] = (freq[h.placeName] || 0) + 1; });
                        const top = Object.entries(freq).sort((a, b) => b[1] - a[1]).slice(0, 3);
                        return (
                          <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-4 mt-2">
                            <p className="text-xs font-medium text-emerald-700 mb-3 flex items-center gap-1">
                              <Trophy className="w-3.5 h-3.5" /> 자주 방문한 식당 TOP 3
                            </p>
                            <div className="space-y-2">
                              {top.map(([name, count], i) => (
                                <div key={name} className="flex items-center gap-2">
                                  <span className="text-sm">{['🥇','🥈','🥉'][i]}</span>
                                  <span className="flex-1 text-sm text-gray-700 truncate">{name}</span>
                                  <span className="text-xs text-emerald-600 font-medium">{count}회 방문</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  )}
                </>
              )}
            </div>
          );
        })()}

        {/* ──────────────── CHAT TAB ──────────────── */}
        {tab === 'chat' && (
          <div className="flex flex-col" style={{ height: 'calc(100vh - 120px)' }}>
            <ChatPanel
              roomId={room.roomId}
              currentUserId={currentUser?.userId ?? ''}
            />
          </div>
        )}

        {/* ──────────────── SETTLEMENT TAB ──────────────── */}
        {tab === 'settlement' && (() => {
          const visitHistory = room.pickHistory.filter(h => h.visited).slice().reverse();
          
          return (
            <div className="p-4 space-y-4">
              <button
                onClick={() => {
                  setSettlementForVisit(null);
                  setShowSettlement(true);
                }}
                className="w-full py-4 bg-orange-500 hover:bg-orange-600 text-white rounded-2xl transition-colors flex items-center justify-center gap-2 shadow-sm"
              >
                <Plus className="w-5 h-5" />
                새 정산 시작
              </button>

              {/* 방문 히스토리 */}
              {(visitHistory.length > 0) && (
                <div className="space-y-3">
                  <h3 className="text-sm text-gray-600 flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-green-500" />
                    방문 히스토리
                  </h3>
                  {visitHistory.map((h, idx) => {
                    const date = new Date(h.pickedAt);
                    return (
                      <div key={idx} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                        <div className="p-3.5">
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <div className="flex-1 min-w-0">
                              <div className="text-sm font-medium text-gray-900 truncate">🍽️ {h.placeName}</div>
                              <div className="text-xs text-gray-400 mt-0.5">
                                {date.toLocaleDateString('ko-KR', { month: 'long', day: 'numeric' })}
                                {' '}
                                {date.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}
                              </div>
                              {h.category && (
                                <div className="text-xs text-gray-500 mt-1">
                                  {CATEGORY_EMOJI[h.category as Category]} {CATEGORY_LABEL[h.category as Category]}
                                </div>
                              )}
                              {h.address && (
                                <div className="text-xs text-gray-400 mt-0.5 truncate">{h.address}</div>
                              )}
                            </div>
                            <div className="flex items-center gap-1.5 shrink-0">
                              <a
                                href={`https://map.kakao.com/?q=${encodeURIComponent(h.placeName)}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="p-1.5 bg-yellow-50 hover:bg-yellow-100 border border-yellow-200 rounded-lg"
                              >
                                <ExternalLink className="w-3.5 h-3.5 text-yellow-600" />
                              </a>
                              <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-50 text-green-600 rounded-lg text-xs">
                                <CheckCircle2 className="w-3 h-3" />
                                방문 완료
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {room.settlements.length === 0 ? (
                <div className="text-center py-12 text-gray-400">
                  <CreditCard className="w-10 h-10 mx-auto mb-3 opacity-30" />
                  <p className="text-sm">아직 정산 기록이 없어요</p>
                </div>
              ) : (
                <div className="space-y-3">
                  <h3 className="text-sm text-gray-600">정산 기록</h3>
                  {room.settlements.map(s => (
                    <div key={s.settlementId} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                      <div className="p-4">
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            {s.placeName && (
                              <div className="text-sm font-medium text-gray-900 mb-0.5">🍽️ {s.placeName}</div>
                            )}
                            <div className="text-sm text-gray-900">
                              {s.memo || `정산 ${new Date(s.createdAt).toLocaleDateString('ko-KR', { month: 'numeric', day: 'numeric' })}`}
                            </div>
                            <div className="text-xs text-gray-400 mt-0.5">
                              {new Date(s.createdAt).toLocaleString('ko-KR', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-sm text-gray-900">{s.totalAmount.toLocaleString()}원</div>
                            <div className="text-xs text-gray-400">{s.participants.length}명</div>
                          </div>
                        </div>
                        <div className="space-y-1.5">
                          {s.participants.map(p => (
                            <div key={p.userId} className="flex items-center justify-between text-xs">
                              <span className="text-gray-600">{p.nickname}</span>
                              <span className="text-gray-800">{p.amount.toLocaleString()}원</span>
                            </div>
                          ))}
                        </div>
                        <div className="flex gap-2 mt-3">
                          <button
                            onClick={() => {
                              setEditingSettlement(s);
                              setShowSettlement(true);
                            }}
                            className="flex-1 py-2.5 border border-gray-200 text-gray-600 rounded-xl text-xs font-medium hover:bg-gray-50"
                          >
                            수정
                          </button>
                          <button
                            onClick={async () => {
                              const totalAmt = s.participants.reduce((sum, p) => sum + p.amount, 0);
                              const count = s.participants.length;
                              const ok = await sendSettlementCard(room.roomId, {
                                totalAmount: totalAmt,
                                perPerson: Math.round(totalAmt / count),
                                headcount: count,
                                memo: s.memo,
                                bankName: s.accountInfo?.bankName,
                                accountNumber: s.accountInfo?.accountNumber,
                                accountHolder: s.accountInfo?.accountHolder,
                              });
                              if (ok) {
                                setTab('chat');
                                loadRoom();
                              } else {
                                alert('채팅 공유에 실패했습니다. 닉네임이 설정되어 있는지 확인해 주세요.');
                              }
                            }}
                            className="flex-1 py-2.5 bg-purple-500 hover:bg-purple-600 text-white rounded-xl text-xs font-medium flex items-center justify-center gap-1.5"
                          >
                            <MessageCircle className="w-3.5 h-3.5" />
                            채팅으로
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })()}
      </div>

      {/* Settlement Modal */}
      {showSettlement && (
        <SettlementModal
          room={room}
          initialPlace={editingSettlement ? undefined : (settlementForVisit ?? undefined)}
          editSettlement={editingSettlement ?? undefined}
          onClose={() => {
            setShowSettlement(false);
            setSettlementForVisit(null);
            setEditingSettlement(null);
          }}
          onSave={() => {
            setShowSettlement(false);
            setSettlementForVisit(null);
            setEditingSettlement(null);
            loadRoom();
          }}
        />
      )}
      {showShare && (
        <ShareModal
          roomId={room.roomId}
          roomName={room.name}
          onClose={() => setShowShare(false)}
        />
      )}
      {showAddCandidate && room && (
        <AddCandidateModal
          onAdd={addCandidate}
          onSaveToFavorites={async (place) => {
            console.log('⭐ 후보집에 추가:', place.name);
            await addSavedPlace(room.roomId, place);
            console.log('✅ 후보집 저장 완료');
            await loadRoom();
          }}
          onClose={() => setShowAddCandidate(false)}
        />
      )}

      {showFavorites && room && (
        <FavoritesModal
          savedPlaces={room.savedPlaces ?? []}
          currentCandidateIds={new Set(candidates.map(c => c.placeId))}
          onLoad={places => {
            setCandidates(prev => {
              const existing = new Set(prev.map(p => p.placeId));
              const newOnes = places.filter(p => !existing.has(p.placeId));
              return [...prev, ...newOnes];
            });
          }}
          onRemove={async (placeId) => {
            console.log('🗑️ 후보집에서 삭제:', placeId);
            await removeSavedPlace(room.roomId, placeId);
            console.log('✅ 후보집 삭제 완료');
            await loadRoom();
          }}
          onClose={() => setShowFavorites(false)}
        />
      )}

      {/* 주소록 모달 */}
      {showAddressBook && currentUser && (
        <AddressBookModal
          userId={currentUser.userId}
          onSelect={(location) => {
            setPendingLocation(location);
            setShowAddressBook(false);
          }}
          onClose={() => setShowAddressBook(false)}
        />
      )}
    </div>
  );
}

// 주소록 모달 컴포넌트
function AddressBookModal({
  userId,
  onSelect,
  onClose,
}: {
  userId: string;
  onSelect: (location: { lat: number; lng: number; label: string; address: string }) => void;
  onClose: () => void;
}) {
  const [addresses, setAddresses] = React.useState<{
    work?: { label: string; address: string; lat: number; lng: number; };
    home?: { label: string; address: string; lat: number; lng: number; };
    other?: { label: string; address: string; lat: number; lng: number; };
  }>({});
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    loadAddresses();
  }, []);

  const loadAddresses = async () => {
    setLoading(true);
    try {
      const profile = await getUserProfile(userId);
      if (profile?.savedAddresses) {
        setAddresses(profile.savedAddresses);
      }
    } catch (err) {
      console.error('Failed to load addresses:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="w-full max-w-md bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-gray-100 shrink-0">
          <h2 className="flex items-center gap-2 text-base font-semibold text-gray-900">
            <MapPin className="w-5 h-5 text-orange-500" />
            내 주소록
          </h2>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors">
            <XIcon className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 text-gray-400 animate-spin" />
            </div>
          ) : (
            <>
              {addresses.work && (
                <button
                  onClick={() => onSelect(addresses.work!)}
                  className="w-full p-4 bg-white hover:bg-orange-50 border-2 border-gray-200 hover:border-orange-300 rounded-xl text-left transition-all group"
                >
                  <div className="flex items-start gap-3">
                    <Briefcase className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <div className="text-xs text-gray-500 mb-0.5">회사</div>
                      <div className="text-sm font-medium text-gray-800 truncate group-hover:text-orange-700">{addresses.work.label}</div>
                      <div className="text-xs text-gray-500 mt-0.5 truncate">{addresses.work.address}</div>
                    </div>
                  </div>
                </button>
              )}

              {addresses.home && (
                <button
                  onClick={() => onSelect(addresses.home!)}
                  className="w-full p-4 bg-white hover:bg-orange-50 border-2 border-gray-200 hover:border-orange-300 rounded-xl text-left transition-all group"
                >
                  <div className="flex items-start gap-3">
                    <Home className="w-5 h-5 text-green-500 shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <div className="text-xs text-gray-500 mb-0.5">내집</div>
                      <div className="text-sm font-medium text-gray-800 truncate group-hover:text-orange-700">{addresses.home.label}</div>
                      <div className="text-xs text-gray-500 mt-0.5 truncate">{addresses.home.address}</div>
                    </div>
                  </div>
                </button>
              )}

              {addresses.other && (
                <button
                  onClick={() => onSelect(addresses.other!)}
                  className="w-full p-4 bg-white hover:bg-orange-50 border-2 border-gray-200 hover:border-orange-300 rounded-xl text-left transition-all group"
                >
                  <div className="flex items-start gap-3">
                    <MapPin className="w-5 h-5 text-purple-500 shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <div className="text-xs text-gray-500 mb-0.5">기타</div>
                      <div className="text-sm font-medium text-gray-800 truncate group-hover:text-orange-700">{addresses.other.label}</div>
                      <div className="text-xs text-gray-500 mt-0.5 truncate">{addresses.other.address}</div>
                    </div>
                  </div>
                </button>
              )}

              {!addresses.work && !addresses.home && !addresses.other && (
                <div className="text-center py-12">
                  <MapPin className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-sm text-gray-500 mb-2">저장된 주소가 없습니다</p>
                  <p className="text-xs text-gray-400">프로필에서 주소를 추가해보세요</p>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}