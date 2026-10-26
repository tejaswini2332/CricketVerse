import fs from 'node:fs/promises';
import path from 'node:path';
import { Presentation, PresentationFile } from '@oai/artifact-tool';
import { pathToFileURL } from 'node:url';

const workspaceDir = '/Users/tejaswinikunkulagunta/Desktop/DFCP/CricketVerse';
const buildDir = path.join(workspaceDir, '.presentation-build');
const outDir = path.join(workspaceDir, 'presentation_output');
const finalPath = path.join(outDir, 'CricketVerse_Blockchain_Focus_v2.pptx');
const skillDir = '/Users/tejaswinikunkulagunta/.codex/plugins/cache/openai-primary-runtime/presentations/26.1024.11018/skills/presentations';
const py = '/Users/tejaswinikunkulagunta/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3';
const font = 'Avenir Next';
const C = {
  ink: '#082C24', deep: '#0B382C', green: '#14523F', mid: '#1D6A50', mint: '#A9D9B9',
  cream: '#F5F2E8', paper: '#FCFBF7', gold: '#E7B942', coral: '#E47B55',
  charcoal: '#18332C', body: '#40564E', muted: '#718078', line: '#D7DED5',
  white: '#FFFFFF', pale: '#E7EFE7', paleGold: '#F5E6B7', softGreen: '#DDEBE0',
};
const W = 1280, H = 720;
const presentation = Presentation.create({ slideSize: { width: W, height: H } });

function box(slide, x, y, w, h, fill, radius = false, stroke = 'none', sw = 0) {
  return slide.shapes.add({
    geometry: radius ? 'roundRect' : 'rect',
    position: { left: x, top: y, width: w, height: h }, fill,
    line: { style: 'solid', fill: stroke, width: sw },
    ...(radius ? { borderRadius: 'rounded-xl' } : {}),
  });
}
function txt(slide, text, x, y, w, h, opts = {}) {
  const s = slide.shapes.add({
    geometry: 'textbox', name: opts.name,
    position: { left: x, top: y, width: w, height: h },
    fill: 'none', line: { style: 'solid', fill: 'none', width: 0 },
  });
  s.text = text;
  s.text.style = {
    typeface: font, fontSize: opts.size ?? 24, color: opts.color ?? C.charcoal,
    bold: opts.bold ?? false, alignment: opts.align ?? 'left',
    verticalAlignment: opts.valign ?? 'middle', wrap: 'square', autoFit: 'shrinkText',
    insets: opts.inset ?? 0,
  };
  return s;
}
function rule(slide, x, y, w, color = C.line, h = 2) { box(slide, x, y, w, h, color); }
function circle(slide, x, y, d, fill, stroke = 'none', sw = 0) {
  return slide.shapes.add({ geometry: 'ellipse', position: { left: x, top: y, width: d, height: d }, fill, line: { style: 'solid', fill: stroke, width: sw } });
}
function base({ dark = false, section = '', title = '', subtitle = '', slideNo = 1 } = {}) {
  const s = presentation.slides.add();
  const bg = dark ? C.ink : C.cream;
  s.background.fill = bg;
  if (section) txt(s, section.toUpperCase(), 72, 44, 620, 22, { size: 15, bold: true, color: dark ? C.gold : C.mid });
  if (title) txt(s, title, 72, 79, 1120, 68, { size: 46, bold: true, color: dark ? C.cream : C.ink });
  if (subtitle) txt(s, subtitle, 74, 151, 1060, 38, { size: 21, color: dark ? C.mint : C.body });
  rule(s, 72, 672, 1136, dark ? '#31574A' : C.line, 1);
  txt(s, 'CRICKETVERSE  ·  CAPSTONE PROTOTYPE', 72, 678, 700, 22, { size: 13, bold: true, color: dark ? '#AFC5B8' : C.muted });
  txt(s, String(slideNo).padStart(2, '0'), 1152, 678, 56, 22, { size: 14, bold: true, align: 'right', color: dark ? C.gold : C.mid });
  return s;
}
function notes(slide, text) { slide.speakerNotes.text = text; }
function row(slide, y, n, title, body, dark = false) {
  const fg = dark ? C.cream : C.ink;
  const sub = dark ? C.mint : C.body;
  circle(slide, 82, y + 3, 38, dark ? C.gold : C.green);
  txt(slide, String(n).padStart(2, '0'), 82, y + 3, 38, 38, { size: 14, bold: true, color: dark ? C.ink : C.white, align: 'center' });
  txt(slide, title, 145, y, 370, 34, { size: 26, bold: true, color: fg });
  txt(slide, body, 535, y, 650, 52, { size: 20, color: sub });
}

// 1 — Cover
{
  const s = presentation.slides.add(); s.background.fill = C.ink;
  box(s, 0, 0, 18, H, C.gold);
  txt(s, 'B.TECH CAPSTONE  ·  BLOCKCHAIN & WEB3', 86, 86, 600, 24, { size: 16, bold: true, color: C.gold });
  txt(s, 'Cricket\nVerse', 82, 149, 660, 206, { size: 82, bold: true, color: C.cream });
  txt(s, 'Blockchain for portable fan ownership', 88, 385, 680, 42, { size: 30, bold: true, color: C.mint });
  txt(s, 'Matchday XI · player cards · fairer tickets · transparent escrow', 88, 442, 720, 58, { size: 21, color: C.cream });
  rule(s, 88, 546, 598, '#31574A', 2);
  txt(s, 'Tejaswini Kunkulagunta', 88, 565, 470, 32, { size: 21, bold: true, color: C.white });
  txt(s, 'CS23B032  ·  2026', 88, 603, 360, 28, { size: 17, color: '#B7C9BF' });
  // Editorial matchday graphic: score progression, rather than decorative UI.
  txt(s, '22', 858, 214, 244, 168, { size: 142, bold: true, color: C.gold, align: 'center' });
  rule(s, 900, 400, 162, C.mid, 3);
  txt(s, 'PLAYERS IN TODAY’S XI POOL', 838, 414, 288, 28, { size: 16, bold: true, color: C.mint, align: 'center' });
  txt(s, '11', 878, 466, 210, 122, { size: 98, bold: true, color: C.cream, align: 'center' });
  txt(s, 'PICK YOUR SQUAD', 851, 594, 266, 24, { size: 16, bold: true, color: C.gold, align: 'center' });
  notes(s, 'Introduce CricketVerse as a course prototype that connects matchday fantasy, player collectibles and ticketing. Live provider access depends on an API key and the provider feed; the default blockchain demo uses a local Hardhat chain.');
}

// 2 — The problem
{
  const s = base({ section: '01 · Motivation', title: 'The fan experience is split across systems', slideNo: 2 });
  txt(s, 'The match is shared. Ownership and trust are not.', 74, 154, 890, 36, { size: 22, color: C.body });
  const items = [
    ['Collectibles', 'Player cards and fan rewards stay locked inside platform databases.'],
    ['Fantasy', 'Scoring and settlement can be difficult for fans to verify.'],
    ['Tickets', 'Resale can add markups while leaving organisers out of the loop.'],
    ['Access', 'Wallet setup and unreliable venue connectivity create friction.'],
  ];
  items.forEach(([a,b], i) => {
    const y = 230 + i * 104;
    txt(s, String(i + 1).padStart(2, '0'), 78, y, 64, 52, { size: 30, bold: true, color: C.gold });
    txt(s, a, 160, y, 250, 46, { size: 29, bold: true, color: C.ink });
    txt(s, b, 445, y + 2, 700, 52, { size: 21, color: C.body });
    if (i < 3) rule(s, 160, y + 76, 980, C.line, 1);
  });
  box(s, 160, 603, 980, 44, C.paleGold, true);
  txt(s, 'Motivation: give fans assets they can own and rules they can verify.', 181, 608, 940, 34, { size: 18, bold: true, color: C.ink });
  notes(s, 'Frame these as design problems addressed by the prototype, not claims about every cricket platform.');
}

// 3 — Why blockchain
{
  const s = base({ dark: true, section: '02 · Why blockchain', title: 'Use the chain where fans need shared proof', subtitle: 'Keep fast-changing match data off-chain; put ownership and enforceable rules on-chain.', slideNo: 3 });
  txt(s, 'ON-CHAIN', 90, 242, 440, 28, { size: 16, bold: true, color: C.gold });
  txt(s, 'Wallet-owned cards and tickets\nCRIC payments and escrow balances\nResale caps and one-time redemption\nTransaction history anyone can inspect', 92, 291, 484, 208, { size: 24, color: C.cream });
  rule(s, 636, 237, 2, '#477565', 321);
  txt(s, 'OFF-CHAIN', 708, 242, 430, 28, { size: 16, bold: true, color: C.mint });
  txt(s, 'Today’s fixtures and playing XIs\nLive score and points feed\nAPI caching and browser display\nFantasy data refresh and match status', 710, 291, 478, 208, { size: 24, color: C.cream });
  box(s, 86, 558, 1105, 64, C.deep, true);
  txt(s, 'The blockchain adds value by making asset ownership portable and transaction rules independently checkable.', 106, 566, 1060, 47, { size: 19, bold: true, color: C.cream });
  notes(s, 'Motivation: use a public ledger for shared ownership and rules, not as a replacement for the match-data API. The current demo uses local Hardhat; no public deployment is configured.');
}

// 4 — Architecture and trust boundaries
{
  const s = base({ section: '03 · System design', title: 'APIs serve match data; contracts secure assets', subtitle: 'A wallet separately signs each local-chain action.', slideNo: 4 });
  const y = 240;
  const nodes = [
    { x: 82, w: 255, label: 'CRICKET PROVIDER', title: 'Fixtures · XI · points', detail: 'CricAPI / CricketData feed', fill: C.pale },
    { x: 442, w: 300, label: 'EXPRESS SERVER', title: 'API adapter + cache', detail: 'Normalises provider responses', fill: C.softGreen },
    { x: 846, w: 330, label: 'WEB APP', title: 'Matchday XI + cards', detail: 'Browser renders status and scores', fill: C.paleGold },
  ];
  nodes.forEach((n) => {
    box(s, n.x, y, n.w, 148, n.fill, true);
    txt(s, n.label, n.x + 22, y + 16, n.w - 44, 24, { size: 14, bold: true, color: C.mid });
    txt(s, n.title, n.x + 22, y + 49, n.w - 44, 42, { size: 24, bold: true, color: C.ink });
    txt(s, n.detail, n.x + 22, y + 99, n.w - 44, 36, { size: 17, color: C.body });
  });
  txt(s, '→', 350, 287, 74, 52, { size: 38, bold: true, color: C.gold, align: 'center' });
  txt(s, '→', 755, 287, 74, 52, { size: 38, bold: true, color: C.gold, align: 'center' });
  rule(s, 82, 438, 1094, C.line, 1);
  txt(s, 'WALLET-SIGNED BLOCKCHAIN PATH', 84, 463, 390, 24, { size: 15, bold: true, color: C.mid });
  txt(s, 'Wallet', 84, 503, 170, 40, { size: 24, bold: true, color: C.ink });
  txt(s, 'signs', 264, 503, 128, 40, { size: 18, color: C.body, align: 'center' });
  txt(s, '→', 388, 499, 48, 42, { size: 30, bold: true, color: C.gold, align: 'center' });
  txt(s, 'Local Hardhat contracts', 445, 503, 330, 40, { size: 24, bold: true, color: C.ink });
  txt(s, 'CRIC · cards · tickets · escrow', 800, 503, 354, 40, { size: 19, color: C.body });
  txt(s, 'Provider access needs a configured key and network connection. Contract demos default to a local chain.', 84, 585, 1050, 32, { size: 17, color: C.muted });
  notes(s, 'Source basis: server/server.js and public/app.js implement provider-backed fixtures, playing XI and match points. BLOCKCHAIN_SETUP.md says the default chain is local Hardhat; the contracts are separate from the live sports API.');
}

// 5 — Matchday XI
{
  const s = base({ dark: true, section: '04 · Matchday XI', title: 'Choose 11 from today’s confirmed 22', subtitle: 'The API supplies the player pool; a squad hash links your picks to the on-chain contest entry.', slideNo: 5 });
  txt(s, '22', 85, 226, 255, 143, { size: 126, bold: true, color: C.gold, align: 'center' });
  txt(s, 'API players', 102, 369, 220, 35, { size: 21, bold: true, color: C.mint, align: 'center' });
  txt(s, '→', 350, 283, 92, 72, { size: 58, bold: true, color: C.cream, align: 'center' });
  txt(s, '11', 442, 226, 250, 143, { size: 126, bold: true, color: C.cream, align: 'center' });
  txt(s, 'selected players', 446, 369, 244, 35, { size: 21, bold: true, color: C.mint, align: 'center' });
  rule(s, 768, 225, 2, '#477565', 340);
  txt(s, '120', 826, 238, 270, 97, { size: 82, bold: true, color: C.gold });
  txt(s, 'CREDIT LIMIT', 831, 334, 250, 27, { size: 16, bold: true, color: C.mint });
  txt(s, 'Role rules', 831, 398, 275, 32, { size: 24, bold: true, color: C.cream });
  txt(s, 'At least 1 keeper · 3 batters · 3 bowlers · 1 all-rounder', 831, 437, 350, 88, { size: 19, color: C.mint });
  rule(s, 84, 552, 1092, '#31574A', 1);
  txt(s, 'A 120-credit cap and role minimums shape the squad. The live points feed remains an API input.', 88, 570, 1080, 54, { size: 18, color: C.cream });
  notes(s, 'Source basis: /api/matches/today and /api/match/:id/playingXI in server/server.js; server/scoringEngine.js requires exactly 11 players, caps the squad at 120 credits, and enforces role minimums. BLOCKCHAIN_SETUP.md states contest entries commit a squad hash.');
}

// 6 — Live points
{
  const s = base({ section: '05 · Live scoring', title: 'Fantasy points refresh from match data', subtitle: 'The app reads provider points by player and updates the squad view.', slideNo: 6 });
  const labels = [
    ['01', 'Fetch', 'Match points endpoint'], ['02', 'Group', 'Batting · bowling · catching'], ['03', 'Match', 'Player names to selected XI'], ['04', 'Refresh', 'Every 30 seconds'],
  ];
  labels.forEach(([n,t,b], i) => {
    const y = 230 + i * 95;
    txt(s, n, 84, y, 52, 42, { size: 23, bold: true, color: C.gold });
    txt(s, t, 158, y, 205, 40, { size: 27, bold: true, color: C.ink });
    txt(s, b, 414, y + 2, 610, 42, { size: 21, color: C.body });
    if (i < 3) rule(s, 158, y + 61, 850, C.line, 1);
  });
  box(s, 994, 250, 210, 250, C.ink, true);
  txt(s, '30s', 1010, 287, 178, 88, { size: 70, bold: true, color: C.gold, align: 'center' });
  txt(s, 'refresh interval', 1010, 378, 178, 32, { size: 19, bold: true, color: C.cream, align: 'center' });
  txt(s, 'While the match endpoint is reachable', 1016, 424, 166, 56, { size: 16, color: C.mint, align: 'center' });
  txt(s, 'A missing key, provider outage or incomplete feed stops live updates; cached/demo data is not presented as a live score.', 84, 616, 1080, 32, { size: 17, color: C.muted });
  notes(s, 'Source basis: /api/match/:id/points aggregates provider batting, bowling and catching point fields. public/app.js polls the endpoint every 30 seconds. Provider API access requires CRICKET_API_KEY and a successful provider response.');
}

// 7 — Player cards
{
  const s = base({ dark: true, section: '06 · On-chain collectibles', title: 'ERC-1155 cards put player assets in fan wallets', subtitle: 'Player data starts in the catalogue; ownership and rarity are tracked by the contract.', slideNo: 7 });
  txt(s, '4,800', 84, 241, 376, 120, { size: 94, bold: true, color: C.gold });
  txt(s, 'player records in the catalogue', 92, 362, 360, 62, { size: 22, color: C.mint });
  rule(s, 496, 230, 2, '#477565', 330);
  txt(s, 'RARITY', 552, 231, 250, 26, { size: 15, bold: true, color: C.gold });
  txt(s, 'MULTIPLIER', 927, 231, 220, 26, { size: 15, bold: true, color: C.gold, align: 'right' });
  const tiers = [['Common','1.00×'],['Uncommon','1.10×'],['Rare','1.25×'],['Epic','1.50×'],['Legendary','2.00×']];
  tiers.forEach(([name,mul], i) => {
    const y = 279 + i * 50;
    txt(s, name, 552, y, 300, 36, { size: 22, bold: i === 4, color: C.cream });
    rule(s, 552, y + 40, 595, '#31574A', 1);
    txt(s, mul, 936, y, 211, 36, { size: 23, bold: true, color: i === 4 ? C.gold : C.mint, align: 'right' });
  });
  txt(s, 'A card must be registered on the chain before it can be bought; stats require an authorised updater.', 88, 586, 1085, 40, { size: 18, color: C.cream });
  notes(s, 'Source basis: server/data/players_2000_2026.json, BLOCKCHAIN_SETUP.md, and contracts/PlayerCardNFT.sol. The catalogue is server data; a card must be registered on the deployed chain before its primary sale can complete.');
}

// 8 — Token
{
  const s = base({ section: '07 · Token utility', title: 'CRIC moves value through on-chain fan features', subtitle: 'The demo token is used for primary card purchases, marketplace trades and contest entries.', slideNo: 8 });
  txt(s, '50,000', 76, 237, 565, 132, { size: 102, bold: true, color: C.green });
  txt(s, 'CRIC per faucet claim', 88, 372, 530, 40, { size: 27, bold: true, color: C.ink });
  txt(s, 'Buy a card · trade an asset · join an escrow contest', 88, 424, 540, 58, { size: 20, color: C.body });
  rule(s, 680, 226, 2, C.line, 340);
  const facts = [['10M','genesis supply'],['1 hour','faucet cooldown'],['100M','maximum supply']];
  facts.forEach(([big,label], i) => {
    const y = 244 + i * 102;
    txt(s, big, 728, y, 260, 52, { size: 38, bold: true, color: i === 0 ? C.green : C.ink });
    txt(s, label, 968, y + 2, 236, 48, { size: 20, color: C.body });
    if (i < 2) rule(s, 728, y + 68, 474, C.line, 1);
  });
  box(s, 84, 526, 1116, 76, C.paleGold, true);
  txt(s, 'Local test token only · CRIC has no public-chain deployment or real-world cash value in this demo.', 108, 537, 1070, 52, { size: 19, bold: true, color: C.ink });
  notes(s, 'Source basis: contracts/CRIC.sol and BLOCKCHAIN_SETUP.md. Local Hardhat demo uses the 50,000 CRIC faucet and a one-hour cooldown. Do not describe CRIC as a public or cash-equivalent asset.');
}

// 9 — Contract ecosystem
{
  const s = base({ dark: true, section: '08 · Smart contracts', title: 'Eight contracts put product rules on-chain', subtitle: 'The code governs tokens, cards, tickets, trades, polls and contest funds.', slideNo: 9 });
  const contracts = [
    ['CRIC','Demo payments'], ['PlayerCardNFT','Wallet-owned cards'], ['MatchTicketNFT','Ticket + entry rules'], ['Marketplace','Asset escrow · 5% royalty'],
    ['TournamentPool','Entry escrow · prize/refund'], ['FanPolls','Wallet vote records'], ['CardSVGGenerator','On-chain card art'], ['OracleConsumer','Authorized stats relay'],
  ];
  contracts.forEach(([a,b], i) => {
    const col = i % 2, r = Math.floor(i / 2), x = col ? 665 : 92, y = 245 + r * 83;
    txt(s, String(i + 1).padStart(2, '0'), x, y, 46, 40, { size: 19, bold: true, color: C.gold });
    txt(s, a, x + 58, y, 260, 36, { size: 22, bold: true, color: C.cream });
    txt(s, b, x + 320, y, 210, 42, { size: 18, color: C.mint });
    rule(s, x + 58, y + 54, 480, '#31574A', 1);
  });
  txt(s, 'The stats relay is not connected to a live Chainlink Functions subscription.', 94, 594, 1070, 42, { size: 17, color: C.cream });
  notes(s, 'Source basis: eight Solidity files in contracts/. BLOCKCHAIN_SETUP.md identifies CricketOracleConsumer as an authorized relay and states a live Chainlink Functions subscription is not configured.');
}

// 10 — Ticket anti-scalping
{
  const s = base({ section: '09 · Ticketing', title: 'The ticket contract blocks resale above 115%', subtitle: 'A check in the ERC-721 contract makes the resale ceiling enforceable by code.', slideNo: 10 });
  txt(s, 'MAXIMUM RESALE', 82, 238, 380, 25, { size: 16, bold: true, color: C.mid });
  txt(s, '1.15×', 74, 279, 474, 106, { size: 86, bold: true, color: C.green });
  txt(s, 'face value', 88, 390, 350, 38, { size: 25, bold: true, color: C.ink });
  txt(s, 'A listing above this ceiling reverts, even if the app accepts the request.', 88, 446, 460, 76, { size: 21, color: C.body });
  rule(s, 600, 236, 2, C.line, 318);
  const steps = [
    ['01', 'Issue', 'Organiser sets the face value.'],
    ['02', 'Resell', 'Contract checks the proposed price.'],
    ['03', 'Scan', 'An authorised gatekeeper verifies entry.'],
    ['04', 'Redeem', 'The ticket cannot be used twice.'],
  ];
  steps.forEach(([n, title, detail], i) => {
    const y = 242 + i * 78;
    circle(s, 638, y + 2, 38, i === 3 ? C.coral : C.green);
    txt(s, n, 638, y + 2, 38, 38, { size: 13, bold: true, color: C.white, align: 'center' });
    txt(s, title, 696, y, 170, 40, { size: 23, bold: true, color: C.ink });
    txt(s, detail, 872, y, 306, 46, { size: 18, color: C.body });
    if (i < 3) rule(s, 696, y + 54, 482, C.line, 1);
  });
  notes(s, 'Source basis: contracts/MatchTicketNFT.sol and BLOCKCHAIN_SETUP.md. The contract enforces a 15% maximum markup and one-time redemption in the local demo.');
}

// 11 — Escrow and offline access
{
  const s = base({ dark: true, section: '10 · Escrow & access', title: 'Escrow makes contest funds traceable', subtitle: 'The contract controls deposits and refunds; an organiser still settles winners.', slideNo: 11 });
  rule(s, 638, 232, 2, '#477565', 358);
  txt(s, 'TOURNAMENT ESCROW', 86, 236, 440, 26, { size: 15, bold: true, color: C.gold });
  txt(s, '95 / 5', 82, 281, 462, 100, { size: 78, bold: true, color: C.cream });
  txt(s, '95% to winners · 5% to treasury', 91, 383, 478, 42, { size: 21, bold: true, color: C.mint });
  txt(s, 'Funds stay in contract escrow until settlement. Cancelled contests allow full refunds.', 91, 448, 474, 82, { size: 19, color: C.cream });
  txt(s, 'ORGANISER SETTLEMENT', 706, 236, 440, 26, { size: 15, bold: true, color: C.gold });
  const steps = [['01','Locks entries'],['02','Reviews the result'],['03','Selects winners'],['04','Submits settlement']];
  steps.forEach(([n,t], i) => {
    const y = 287 + i * 68;
    circle(s, 710, y + 3, 34, i === 1 ? C.gold : C.mid);
    txt(s, n, 710, y + 3, 34, 34, { size: 13, bold: true, color: i === 1 ? C.ink : C.white, align: 'center' });
    txt(s, t, 765, y, 385, 42, { size: 20, color: C.cream });
  });
  notes(s, 'Source basis: contracts/TournamentPool.sol and BLOCKCHAIN_SETUP.md. Entry funds are held in escrow; the organiser locks the contest and submits winners. Refunds are available when the contest is cancelled.');
}

// 12 — Expected impact
{
  const s = base({ section: '11 · Expected impact', title: 'Make fan trust easier to verify', subtitle: 'These are outcomes to measure as the prototype is exercised, not results claimed today.', slideNo: 12 });
  const outcomes = [
    ['Portable ownership','Measure card transfers and wallet-held assets.'],
    ['Fairer ticket resale','Confirm over-cap listings revert in the contract.'],
    ['Traceable contest funds','Inspect deposits, payouts and refund events.'],
    ['More resilient entry','Measure offline checks and successful later sync.'],
  ];
  outcomes.forEach(([a,b], i) => {
    const y = 228 + i * 86;
    txt(s, String(i + 1).padStart(2, '0'), 86, y, 52, 40, { size: 22, bold: true, color: C.gold });
    txt(s, a, 154, y, 360, 38, { size: 24, bold: true, color: C.ink });
    txt(s, b, 540, y, 630, 46, { size: 20, color: C.body });
    if (i < 3) rule(s, 154, y + 57, 1018, C.line, 1);
  });
  notes(s, 'These are expected impacts and proposed evaluation measures. No adoption, cost savings, anti-fraud rate or venue throughput improvement has been measured.');
}

// 13 — Status and close
{
  const s = base({ dark: true, section: '12 · Prototype status', title: 'A credible local demo, with clear next steps', subtitle: 'The blockchain features work in a local environment; public and oracle setup remain future work.', slideNo: 13 });
  txt(s, 'IMPLEMENTED IN THE PROJECT', 88, 230, 485, 26, { size: 15, bold: true, color: C.gold });
  txt(s, 'Eight local contracts\nCRIC faucet: 50,000 per claim\nAPI routes for matchday data\nCards, ticketing and contest flows', 90, 274, 485, 186, { size: 21, color: C.cream });
  rule(s, 638, 226, 2, '#477565', 290);
  txt(s, 'NEXT TO CONFIGURE', 704, 230, 450, 26, { size: 15, bold: true, color: C.mint });
  txt(s, 'Provider key and confirmed-XI access\nPublic Amoy deployment + HTTPS host\nLive Chainlink Functions subscription\nAutomated match-result settlement', 706, 274, 492, 186, { size: 20, color: C.cream });
  box(s, 86, 510, 1105, 62, C.deep, true);
  txt(s, 'Blockchain tracks assets and enforces rules; the match feed supplies live cricket data.', 107, 518, 1064, 46, { size: 20, bold: true, color: C.cream });
  txt(s, 'Thank you  ·  Questions?', 88, 603, 600, 40, { size: 25, bold: true, color: C.gold });
  txt(s, 'Tejaswini Kunkulagunta  ·  CS23B032', 750, 610, 442, 28, { size: 16, color: C.cream, align: 'right' });
  notes(s, 'Current scope is a course prototype on local Hardhat. The cricket provider adapter requires CRICKET_API_KEY and feed coverage. No public deployment, live Chainlink Functions subscription or trusted automatic tournament settlement is configured.');
}

await fs.mkdir(buildDir, { recursive: true });
await fs.mkdir(outDir, { recursive: true });
await fs.writeFile(path.join(buildDir, 'deck-montage.webp'), new Uint8Array(await presentation.export({ format: 'webp', montage: true, scale: 0.45 })));
for (let i = 0; i < presentation.slides.items.length; i++) {
  const png = await presentation.export({ slide: presentation.slides.items[i], format: 'png', scale: 1 });
  await fs.writeFile(path.join(buildDir, `slide-${String(i + 1).padStart(2, '0')}.png`), new Uint8Array(await png.arrayBuffer()));
}
const { finalizePresentation } = await import(pathToFileURL(path.join(skillDir, 'container_tools/artifact_tool_utils.mjs')).href);
const candidatePath = path.join(buildDir, 'candidate.pptx');
await (await PresentationFile.exportPptx(presentation)).save(candidatePath);
const result = await finalizePresentation({
  workspaceDir,
  candidatePath,
  finalPath,
  pythonExecutable: py,
  integrityValidatorPath: path.join(skillDir, 'container_tools/inspect_presentation_package_integrity.py'),
  layoutValidatorPath: path.join(skillDir, 'container_tools/inspect_presentation_layout_geometry.py'),
  layoutArgs: ['--expected-slide-size-emu', '12192000,6858000', '--validate-bullet-geometry', '--validate-heading-fit'],
  requiredNativeTableOwnerSlides: [],
  requiredNativeChartOwnerSlides: [],
  fontPolicy: { basis: 'design', families: [font] },
  verifyArtifactToolImport: true,
  receiptPath: path.join(buildDir, 'validation_v5.json'),
});
console.log(JSON.stringify({ finalPath, slideCount: presentation.slides.items.length, result }));
