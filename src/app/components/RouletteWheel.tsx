import React, { useRef, useEffect, useCallback } from 'react';
import { Place } from '../types';

interface RouletteWheelProps {
  places: Place[];
  spinning: boolean;
  targetIndex: number;
  onSpinEnd: () => void;
  resetTrigger?: number;
}

const COLORS = [
  '#FF6B6B', '#FF8E53', '#FEC55A', '#43CF9D', '#4ECDC4',
  '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD', '#98D8C8',
  '#F7DC6F', '#AED6F1', '#A9DFBF', '#F1948A', '#D2B4DE',
  '#FAD7A0', '#A8D8EA', '#AA96DA', '#FCBAD3', '#FFFFD2',
];

export default function RouletteWheel({ places, spinning, targetIndex, onSpinEnd, resetTrigger = 0 }: RouletteWheelProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);
  const rotationRef = useRef<number>(0);
  const startTimeRef = useRef<number>(0);
  const durationRef = useRef<number>(4000);
  const targetRotationRef = useRef<number>(0);
  const isSpinningRef = useRef<boolean>(false);
  const prevResetTrigger = useRef(resetTrigger);

  const drawWheel = useCallback((canvas: HTMLCanvasElement, rotation: number) => {
    const ctx = canvas.getContext('2d');
    if (!ctx || places.length === 0) return;

    const size = canvas.width;
    const centerX = size / 2;
    const centerY = size / 2;
    const radius = size / 2 - 4;

    ctx.clearRect(0, 0, size, size);

    const segAngle = (2 * Math.PI) / places.length;

    places.forEach((place, i) => {
      const startAngle = rotation + i * segAngle - Math.PI / 2;
      const endAngle = startAngle + segAngle;

      // Segment
      ctx.beginPath();
      ctx.moveTo(centerX, centerY);
      ctx.arc(centerX, centerY, radius, startAngle, endAngle);
      ctx.closePath();
      ctx.fillStyle = COLORS[i % COLORS.length];
      ctx.fill();
      ctx.strokeStyle = 'white';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Text
      ctx.save();
      ctx.translate(centerX, centerY);
      ctx.rotate(rotation + i * segAngle + segAngle / 2 - Math.PI / 2);
      ctx.textAlign = 'right';
      ctx.fillStyle = 'white';
      ctx.font = `bold ${Math.max(10, Math.min(14, 200 / places.length))}px sans-serif`;
      ctx.shadowColor = 'rgba(0,0,0,0.3)';
      ctx.shadowBlur = 2;
      const name = place.name.length > 8 ? place.name.slice(0, 7) + '…' : place.name;
      ctx.fillText(name, radius - 12, 5);
      ctx.restore();
    });

    // Center circle
    ctx.beginPath();
    ctx.arc(centerX, centerY, 20, 0, 2 * Math.PI);
    ctx.fillStyle = 'white';
    ctx.fill();
    ctx.strokeStyle = '#e5e7eb';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Center emoji
    ctx.font = '16px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('🍽️', centerX, centerY);
  }, [places]);

  // Pointer (triangle at the top)
  const drawPointer = useCallback((canvas: HTMLCanvasElement) => {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const size = canvas.width;
    const cx = size / 2;
    ctx.save();
    ctx.fillStyle = '#ef4444';
    ctx.shadowColor = 'rgba(0,0,0,0.3)';
    ctx.shadowBlur = 4;
    ctx.beginPath();
    ctx.moveTo(cx - 10, 4);
    ctx.lineTo(cx + 10, 4);
    ctx.lineTo(cx, 28);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }, []);

  // Reset rotation when resetTrigger changes
  useEffect(() => {
    if (resetTrigger !== prevResetTrigger.current) {
      console.log('🔄 룰렛 리셋');
      rotationRef.current = 0;
      prevResetTrigger.current = resetTrigger;
      const canvas = canvasRef.current;
      if (canvas && places.length > 0) {
        drawWheel(canvas, 0);
        drawPointer(canvas);
      }
    }
  }, [resetTrigger, places, drawWheel, drawPointer]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || places.length === 0) return;
    // spinning 중이 아닐 때만 현재 rotation으로 그리기
    if (!spinning) {
      drawWheel(canvas, rotationRef.current);
      drawPointer(canvas);
    }
  }, [places, spinning, drawWheel, drawPointer]);

  useEffect(() => {
    if (!spinning || places.length === 0) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    // Calculate target rotation so targetIndex lands at top (pointer)
    const segAngle = (2 * Math.PI) / places.length;
    
    // 포인터는 위쪽(12시 = -π/2)에 있음
    // 세그먼트 i의 시작 각도: rotation + i * segAngle - π/2
    // 세그먼트 i의 중심 각도: rotation + i * segAngle + segAngle/2 - π/2
    // targetIndex의 중심이 -π/2에 오려면:
    // rotation + targetIndex * segAngle + segAngle/2 - π/2 = -π/2
    // rotation = -targetIndex * segAngle - segAngle/2
    const targetBaseRotation = -targetIndex * segAngle - segAngle / 2;
    
    console.log('🎯 룰렛 회전 계산:', {
      targetIndex,
      placeName: places[targetIndex]?.name,
      segAngle: segAngle * (180 / Math.PI) + '도',
      targetBaseRotation: targetBaseRotation * (180 / Math.PI) + '도'
    });
    
    // Add multiple full spins
    const currentRot = rotationRef.current;
    const extraSpins = (Math.floor(Math.random() * 3) + 5) * 2 * Math.PI;
    const normalizedTarget = targetBaseRotation - Math.floor(targetBaseRotation / (2 * Math.PI)) * 2 * Math.PI;
    const currentNorm = currentRot - Math.floor(currentRot / (2 * Math.PI)) * 2 * Math.PI;
    let diff = normalizedTarget - currentNorm;
    if (diff <= 0) diff += 2 * Math.PI;
    targetRotationRef.current = currentRot + extraSpins + diff;

    startTimeRef.current = performance.now();
    durationRef.current = 3500 + Math.random() * 1000;
    isSpinningRef.current = true;

    const easeOut = (t: number) => 1 - Math.pow(1 - t, 4);

    const animate = (now: number) => {
      if (!isSpinningRef.current) return;
      const elapsed = now - startTimeRef.current;
      const progress = Math.min(elapsed / durationRef.current, 1);
      const easedProgress = easeOut(progress);

      rotationRef.current = (targetRotationRef.current - currentRot) * easedProgress + currentRot;

      drawWheel(canvas, rotationRef.current);
      drawPointer(canvas);

      if (progress < 1) {
        animRef.current = requestAnimationFrame(animate);
      } else {
        rotationRef.current = targetRotationRef.current;
        isSpinningRef.current = false;
        
        // 검증: 실제로 포인터가 가리키는 인덱스 계산
        const finalRotation = targetRotationRef.current;
        const normalizedRotation = finalRotation - Math.floor(finalRotation / (2 * Math.PI)) * 2 * Math.PI;
        // 포인터는 -π/2 위치에 있음
        // 세그먼트 i의 중심: rotation + i * segAngle + segAngle/2 - π/2
        // 포인터와 일치하려면: rotation + i * segAngle + segAngle/2 - π/2 = -π/2 (mod 2π)
        // i = -(rotation + segAngle/2) / segAngle
        const pointerAngle = -Math.PI / 2;
        let angleFromPointer = pointerAngle - normalizedRotation;
        while (angleFromPointer < 0) angleFromPointer += 2 * Math.PI;
        while (angleFromPointer >= 2 * Math.PI) angleFromPointer -= 2 * Math.PI;
        
        const calculatedIndex = Math.floor((angleFromPointer + segAngle / 2) / segAngle) % places.length;
        
        console.log('🔍 룰렛 정지 검증:', {
          targetIndex,
          calculatedIndex,
          targetName: places[targetIndex]?.name,
          calculatedName: places[calculatedIndex]?.name,
          match: targetIndex === calculatedIndex
        });
        
        onSpinEnd();
      }
    };

    animRef.current = requestAnimationFrame(animate);
    return () => {
      cancelAnimationFrame(animRef.current);
      isSpinningRef.current = false;
    };
  }, [spinning, targetIndex, places, drawWheel, drawPointer, onSpinEnd]);

  if (places.length === 0) {
    return (
      <div className="flex items-center justify-center w-full aspect-square max-w-xs mx-auto bg-gray-50 rounded-full border-4 border-dashed border-gray-200">
        <div className="text-center text-gray-400">
          <div className="text-4xl mb-2">🍽️</div>
          <div className="text-sm">후보를 먼저 불러오세요</div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full max-w-xs mx-auto">
      <canvas
        ref={canvasRef}
        width={280}
        height={280}
        className="w-full h-auto drop-shadow-xl"
      />
    </div>
  );
}
