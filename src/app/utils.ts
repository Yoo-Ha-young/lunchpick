/**
 * Clipboard API가 차단된 환경(iframe, 권한 정책 등)에서도 동작하는 복사 유틸
 * 1차: navigator.clipboard.writeText (modern)
 * 2차: document.execCommand('copy') (legacy fallback)
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  // 1차 시도: Clipboard API
  if (navigator.clipboard && navigator.clipboard.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // 권한 거부 또는 정책 차단 → fallback
    }
  }

  // 2차 시도: execCommand fallback
  try {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.cssText = 'position:fixed;top:-9999px;left:-9999px;opacity:0;pointer-events:none;';
    document.body.appendChild(textarea);
    textarea.focus();
    textarea.select();
    const success = document.execCommand('copy');
    document.body.removeChild(textarea);
    return success;
  } catch {
    return false;
  }
}
