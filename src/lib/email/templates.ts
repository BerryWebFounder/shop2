// ================================================================
// src/lib/email/templates.ts
// 이메일 HTML 템플릿
// ================================================================

export function sellerInviteEmail({
  applyUrl,
  qrDataUrl,
  expiresHours = 48,
}: {
  applyUrl:     string
  qrDataUrl:    string   // base64 PNG
  expiresHours?: number
}) {
  return `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>소호몰 개설 신청 안내</title>
</head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:'Apple SD Gothic Neo',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:40px 0;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0"
        style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">

        <!-- 헤더 -->
        <tr>
          <td style="background:#4f46e5;padding:32px;text-align:center;">
            <div style="font-size:28px;margin-bottom:8px;">🏪</div>
            <h1 style="margin:0;color:#ffffff;font-size:22px;font-weight:700;">소호몰 개설 신청</h1>
            <p style="margin:8px 0 0;color:rgba(255,255,255,0.8);font-size:14px;">
              아래 버튼 또는 QR코드로 신청서를 작성해 주세요
            </p>
          </td>
        </tr>

        <!-- 본문 -->
        <tr>
          <td style="padding:40px 32px;">
            <p style="margin:0 0 8px;color:#374151;font-size:15px;line-height:1.6;">
              안녕하세요! 소호몰 개설 신청 링크가 발송되었습니다.
            </p>
            <p style="margin:0 0 32px;color:#6b7280;font-size:14px;line-height:1.6;">
              이 링크는 <strong style="color:#4f46e5;">${expiresHours}시간</strong> 동안만 유효하며,
              1회만 사용할 수 있습니다.
            </p>

            <!-- CTA 버튼 -->
            <div style="text-align:center;margin-bottom:36px;">
              <a href="${applyUrl}"
                style="display:inline-block;background:#4f46e5;color:#ffffff;text-decoration:none;
                  padding:14px 40px;border-radius:8px;font-size:16px;font-weight:700;
                  letter-spacing:-0.3px;">
                신청서 작성하기 →
              </a>
            </div>

            <!-- 구분선 -->
            <hr style="border:none;border-top:1px solid #e5e7eb;margin:0 0 32px;" />

            <!-- QR 코드 -->
            <div style="text-align:center;margin-bottom:32px;">
              <p style="margin:0 0 16px;color:#374151;font-size:14px;font-weight:600;">
                📱 모바일에서는 QR코드로 접속하세요
              </p>
              <img src="${qrDataUrl}" alt="신청 QR코드"
                width="180" height="180"
                style="border:1px solid #e5e7eb;border-radius:8px;display:block;margin:0 auto;" />
            </div>

            <!-- 링크 텍스트 -->
            <div style="background:#f9fafb;border-radius:8px;padding:16px;margin-bottom:8px;">
              <p style="margin:0 0 6px;color:#6b7280;font-size:12px;">신청 URL (버튼이 동작하지 않을 경우 복사해서 사용하세요)</p>
              <p style="margin:0;color:#4f46e5;font-size:12px;word-break:break-all;">${applyUrl}</p>
            </div>
          </td>
        </tr>

        <!-- 푸터 -->
        <tr>
          <td style="background:#f9fafb;padding:20px 32px;border-top:1px solid #e5e7eb;">
            <p style="margin:0;color:#9ca3af;font-size:12px;text-align:center;line-height:1.6;">
              본 메일은 소호몰 개설 신청 요청에 의해 발송되었습니다.<br />
              요청하지 않으셨다면 이 메일을 무시해 주세요.
            </p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`
}
