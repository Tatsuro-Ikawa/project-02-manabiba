import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const pagePath = join(__dirname, '../src/app/trial_4w/landing/page.tsx');

let s = readFileSync(pagePath, 'utf8');

if (!s.includes('28\u65e5\u9593')) {
  throw new Error('Expected UTF-8 Japanese in landing page');
}

const nl = '\r\n';
const t = 'motion'.replace('motion', 'div');
const o = (cls) => `<${t} className="${cls}">`;
const c = () => `</${t}>`;

const constants =
  "  const freeSignupNext = '/post-login?next=/start-program';" +
  nl +
  "  const kizukiTrialNext = '/post-login?next=/trial_4w';" +
  nl;

if (!s.includes('freeSignupNext')) {
  s = s.replace(`  const loggedIn = !loading && !!user;${nl}`, `  const loggedIn = !loading && !!user;${nl}${constants}`);
}

const page1Label = '\u30da\u30fc\u30b8 1/2';
const page2Label = '\u30da\u30fc\u30b8 2/2';
const startMarker = `            <section className="trial-landing-card" aria-label="${page1Label}">`;
const endMarker = `            <section className="trial-landing-card" aria-label="${page2Label}">`;

const start = s.indexOf(startMarker);
const end = s.indexOf(endMarker);
if (start < 0 || end < 0) {
  throw new Error(`section markers not found (start=${start}, end=${end})`);
}

const section7 =
  '            <section className="trial-landing-card" aria-label="7\u65e5\u9593\u30d7\u30ed\u30b0\u30e9\u30e0">' +
  nl +
  `              ${o('trial-landing-subtitle')}\u25c6 \u306a\u308a\u305f\u3044\u81ea\u5206\u3078\u306e\u8fd1\u9053${c()}` +
  nl +
  `              ${o('trial-landing-card-inner')}` +
  nl +
  `                ${o('trial-landing-card-title')}\u81ea\u5206\u3092\u5909\u3048\u308b7\u65e5\u9593\u30d7\u30ed\u30b0\u30e9\u30e0${c()}` +
  nl +
  `                ${o('trial-landing-cols trial-landing-cols--single')}` +
  nl +
  `                  ${o('trial-landing-col')}` +
  nl +
  `                    ${o('trial-landing-col-header')}\u30bb\u30eb\u30d5\u30b3\u30fc\u30c1\u30f3\u30b0\uff08\u30d5\u30ea\u30fc\u30b3\u30fc\u30b9\uff09${c()}` +
  nl +
  `                    ${o('trial-landing-price-box')}` +
  nl +
  `                      ${o('trial-landing-price')}\u00a50${c()}` +
  nl +
  `                    ${c()}` +
  nl +
  '                    {loggedIn ? (' +
  nl +
  '                      <Link href={freeSignupNext} className="trial-landing-cta">' +
  nl +
  '                        \u3084\u3063\u3066\u307f\u308b' +
  nl +
  '                      </Link>' +
  nl +
  '                    ) : (' +
  nl +
  '                      <Link' +
  nl +
  '                        href={`/login?next=${encodeURIComponent(freeSignupNext)}`}' +
  nl +
  '                        className="trial-landing-cta"' +
  nl +
  '                      >' +
  nl +
  '                        \u3084\u3063\u3066\u307f\u308b' +
  nl +
  '                      </Link>' +
  nl +
  '                    )}' +
  nl +
  `                  ${c()}` +
  nl +
  `                ${c()}` +
  nl +
  `              ${c()}` +
  nl +
  '            </section>' +
  nl;

s = s.slice(0, start) + section7 + s.slice(end);

s = s.replace(
  '<Link href="/trial_4w" className="trial-landing-cta">',
  '<Link href={kizukiTrialNext} className="trial-landing-cta">'
);
s = s.replace(
  "<Link href={`/login?next=${encodeURIComponent('/trial_4w')}`} className=\"trial-landing-cta\">",
  '<Link href={`/login?next=${encodeURIComponent(kizukiTrialNext)}`} className="trial-landing-cta">'
);

if (s.includes('motion')) {
  throw new Error('Unexpected motion tag after patch');
}

writeFileSync(pagePath, s, 'utf8');
console.log('patched:', pagePath);
