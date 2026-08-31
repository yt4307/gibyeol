<?php

declare(strict_types=1);

namespace App\Tests\Email;

use App\Email\EmailTemplateRenderer;
use PHPUnit\Framework\TestCase;

final class EmailTemplateRendererTest extends TestCase
{
    private EmailTemplateRenderer $renderer;

    protected function setUp(): void
    {
        $this->renderer = new EmailTemplateRenderer(
            'http://localhost:3001/',
            'https://www.gibyeol.kro.kr/',
        );
    }

    public function testRendersAccessibleVerificationMessage(): void
    {
        $html = $this->renderer->verification('482 915');

        self::assertStringContainsString('<html lang="ko">', $html);
        self::assertStringContainsString('482 915', $html);
        self::assertStringContainsString('10분 동안 유효', $html);
        self::assertStringContainsString('https://www.gibyeol.kro.kr/brand/gibyeol-symbol-sealed.png', $html);
        self::assertStringContainsString('alt="별빛으로 봉인된 기별 봉투"', $html);
        self::assertStringContainsString('패스키 메일박스 · 이메일 확인', $html);
        self::assertStringContainsString('인증번호', $html);
        self::assertStringContainsString('background:#0B1320', $html);
        self::assertStringContainsString('#0D1321', $html);
        self::assertStringContainsString('#D9C7A3', $html);
    }

    public function testEscapesVerificationCode(): void
    {
        $html = $this->renderer->verification('<script>alert(1)</script>');

        self::assertStringNotContainsString('<script>', $html);
        self::assertStringContainsString('&lt;script&gt;', $html);
    }

    public function testRendersChristmasArrivalWithInboxLink(): void
    {
        $html = $this->renderer->christmas(2);

        self::assertStringContainsString('기별이 닿았습니다', $html);
        self::assertStringContainsString('<strong style="font-size:34px;font-weight:600;">2</strong>통', $html);
        self::assertStringContainsString('http://localhost:3001/inbox', $html);
        self::assertStringContainsString('https://www.gibyeol.kro.kr/brand/gibyeol-symbol-open.png', $html);
        self::assertStringContainsString('alt="봉투에서 별빛이 피어오르는 기별 심볼"', $html);
        self::assertStringContainsString('12월 25일 · 도착 안내', $html);
        self::assertStringContainsString('2026년에 봉인 · 크리스마스에 도착', $html);
        self::assertStringContainsString('이메일에 편지 내용을 담아 보내지 않습니다', $html);
    }
}
