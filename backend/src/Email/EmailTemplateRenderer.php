<?php

declare(strict_types=1);

namespace App\Email;

final readonly class EmailTemplateRenderer
{
    public function __construct(private string $webOrigin)
    {
    }

    public function verification(string $code): string
    {
        $safeCode = htmlspecialchars($code, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
        $symbolUrl = $this->assetUrl('/brand/gibyeol-symbol-sealed.png');
        $content = <<<HTML
            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin:0 0 30px;border-collapse:collapse;">
              <tr><td align="center"><img src="{$symbolUrl}" width="174" alt="별빛으로 봉인된 기별 봉투" style="display:block;width:174px;max-width:52%;height:auto;border:0;outline:none;"></td></tr>
            </table>
            <p style="margin:0 0 16px;color:#D9C7A3;font-size:11px;font-weight:700;letter-spacing:0.18em;line-height:1.5;">패스키 메일박스 · 이메일 확인</p>
            <h1 style="margin:0;color:#F5F6FA;font-family:'MaruBuri','Noto Serif KR',Georgia,serif;font-size:34px;font-weight:400;letter-spacing:-0.04em;line-height:1.35;">메일 주소를<br>확인해 주세요.</h1>
            <p style="margin:22px 0 0;color:#C7CCD7;font-size:15px;line-height:1.8;">기별의 메일박스를 준비하고 있어요.<br>아래 인증번호를 기별 화면에 입력해 주세요.</p>
            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin-top:30px;border-collapse:separate;background:#121C2E;border:1px solid #4B5260;">
              <tr>
                <td width="88" align="center" valign="middle" style="padding:24px 0 24px 20px;">
                  <div style="width:54px;height:54px;border:1px solid #D9C7A3;border-radius:50%;color:#F5F6FA;font-family:Georgia,serif;font-size:28px;line-height:54px;text-align:center;">✦</div>
                </td>
                <td style="padding:24px 22px;">
                  <p style="margin:0 0 8px;color:#9299A8;font-size:10px;font-weight:700;letter-spacing:0.16em;line-height:1.4;">인증번호</p>
                  <p style="margin:0;color:#F5F6FA;font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:30px;font-weight:700;letter-spacing:0.22em;line-height:1.2;">{$safeCode}</p>
                </td>
              </tr>
            </table>
            <p style="margin:18px 0 0;color:#9299A8;font-size:12px;line-height:1.7;">이 인증번호는 10분 동안 유효합니다. 본인이 요청하지 않았다면 이 메일을 무시해 주세요.</p>
            HTML;

        return $this->layout(
            '기별 이메일 인증번호',
            '기별 메일박스를 위한 인증번호가 도착했습니다.',
            '이메일 인증',
            $content,
        );
    }

    public function christmas(int $letterCount): string
    {
        $count = max(0, $letterCount);
        $inboxUrl = htmlspecialchars(rtrim($this->webOrigin, '/').'/inbox', ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
        $symbolUrl = $this->assetUrl('/brand/gibyeol-symbol-open.png');
        $content = <<<HTML
            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin:0 0 30px;border-collapse:collapse;">
              <tr><td align="center"><img src="{$symbolUrl}" width="220" alt="봉투에서 별빛이 피어오르는 기별 심볼" style="display:block;width:220px;max-width:66%;height:auto;border:0;outline:none;"></td></tr>
            </table>
            <p style="margin:0 0 16px;color:#D9C7A3;font-size:11px;font-weight:700;letter-spacing:0.18em;line-height:1.5;">12월 25일 · 도착 안내</p>
            <h1 style="margin:0;color:#F5F6FA;font-family:'MaruBuri','Noto Serif KR',Georgia,serif;font-size:36px;font-weight:400;letter-spacing:-0.04em;line-height:1.35;">시간을 건너,<br>기별이 닿았습니다.</h1>
            <p style="margin:22px 0 0;color:#C7CCD7;font-size:15px;line-height:1.8;">약속한 오늘, 오래 기다린 마음이 봉인을 풀 준비를 마쳤어요.</p>
            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin-top:30px;border-collapse:separate;background:#F5F6FA;border:1px solid #D9C7A3;">
              <tr>
                <td align="center" style="padding:30px 24px 12px;color:#A6463E;font-family:Georgia,serif;font-size:20px;line-height:1;">✦</td>
              </tr>
              <tr>
                <td align="center" style="padding:0 24px;color:#0D1321;font-family:'MaruBuri','Noto Serif KR',Georgia,serif;font-size:24px;line-height:1.5;">도착한 기별 <strong style="font-size:34px;font-weight:600;">{$count}</strong>통</td>
              </tr>
              <tr>
                <td align="center" style="padding:12px 24px 30px;color:#5B6270;font-size:12px;letter-spacing:0.08em;line-height:1.6;">2026년에 봉인 · 크리스마스에 도착</td>
              </tr>
            </table>
            <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin-top:28px;border-collapse:separate;">
              <tr>
                <td bgcolor="#D9C7A3" style="border:1px solid #D9C7A3;">
                  <a href="{$inboxUrl}" style="display:inline-block;padding:14px 24px;color:#0D1321;font-size:14px;font-weight:700;line-height:1;text-decoration:none;">도착한 기별 확인하기&nbsp; →</a>
                </td>
              </tr>
            </table>
            <p style="margin:22px 0 0;color:#9299A8;font-size:12px;line-height:1.7;">편지를 열려면 기별에 연결했던 지갑과 패스키가 필요합니다. 기별은 이메일에 편지 내용을 담아 보내지 않습니다.</p>
            HTML;

        return $this->layout(
            '기별이 도착했습니다',
            "기다리던 기별 {$count}통이 12월 25일에 도착했습니다.",
            '크리스마스 도착 우편',
            $content,
        );
    }

    private function layout(string $title, string $preheader, string $edition, string $content): string
    {
        $safeTitle = htmlspecialchars($title, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
        $safePreheader = htmlspecialchars($preheader, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
        $safeEdition = htmlspecialchars($edition, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
        $iconUrl = $this->assetUrl('/icons/pwa-192x192.png');

        return <<<HTML
            <!doctype html>
            <html lang="ko">
            <head>
              <meta charset="utf-8">
              <meta name="viewport" content="width=device-width,initial-scale=1">
              <meta name="color-scheme" content="dark">
              <meta name="supported-color-schemes" content="dark">
              <title>{$safeTitle}</title>
              <style>
                @media only screen and (max-width: 640px) {
                  .gibyeol-shell { width: 100% !important; }
                  .gibyeol-pad { padding-left: 24px !important; padding-right: 24px !important; }
                }
              </style>
            </head>
            <body style="margin:0;padding:0;background:#0D1321;color:#F5F6FA;-webkit-text-size-adjust:100%;">
              <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">{$safePreheader}</div>
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" bgcolor="#0D1321" style="width:100%;background:#0D1321;border-collapse:collapse;">
                <tr>
                  <td align="center" style="padding:28px 12px 44px;">
                    <table role="presentation" width="600" cellspacing="0" cellpadding="0" border="0" class="gibyeol-shell" style="width:600px;max-width:600px;border-collapse:collapse;">
                      <tr>
                        <td class="gibyeol-pad" style="padding:20px 42px;border:1px solid #343E51;border-bottom:0;background:#0B1320;">
                          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="border-collapse:collapse;">
                            <tr>
                              <td>
                                <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="border-collapse:collapse;">
                                  <tr>
                                    <td style="padding-right:12px;"><img src="{$iconUrl}" width="32" height="32" alt="" style="display:block;width:32px;height:32px;border:0;outline:none;"></td>
                                    <td style="color:#F5F6FA;font-family:'MaruBuri','Noto Serif KR',Georgia,serif;font-size:22px;letter-spacing:0.18em;line-height:1.3;">기별</td>
                                  </tr>
                                </table>
                              </td>
                              <td align="right" style="color:#9299A8;font-size:10px;letter-spacing:0.12em;line-height:1.4;">{$safeEdition}</td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                      <tr>
                        <td class="gibyeol-pad" style="padding:48px 42px 44px;border:1px solid #343E51;background:#0F1727;font-family:-apple-system,BlinkMacSystemFont,'Apple SD Gothic Neo','Noto Sans KR','Malgun Gothic',sans-serif;">
                          {$content}
                        </td>
                      </tr>
                      <tr>
                        <td class="gibyeol-pad" style="padding:22px 42px;color:#707888;font-family:-apple-system,BlinkMacSystemFont,'Apple SD Gothic Neo','Noto Sans KR','Malgun Gothic',sans-serif;font-size:11px;line-height:1.7;">
                          시간을 건너, 기별이 닿습니다.<br>이 메일은 기별 서비스의 요청 또는 약속에 따라 발송되었습니다.
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </body>
            </html>
            HTML;
    }

    private function assetUrl(string $path): string
    {
        return htmlspecialchars(rtrim($this->webOrigin, '/').$path, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
    }
}
