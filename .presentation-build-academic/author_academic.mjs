import fs from 'node:fs/promises';
import path from 'node:path';
import { Presentation, PresentationFile } from '@oai/artifact-tool';
import { pathToFileURL } from 'node:url';

const workspaceDir = '/Users/tejaswinikunkulagunta/Desktop/DFCP/CricketVerse';
const buildDir = path.join(workspaceDir, '.presentation-build-academic');
const outDir = path.join(workspaceDir, 'presentation_output');
const finalPath = path.join(outDir, 'CricketVerse_User_Centered_Academic_v2.pptx');
const skillDir = '/Users/tejaswinikunkulagunta/.codex/plugins/cache/openai-primary-runtime/presentations/26.1024.11018/skills/presentations';
const py = '/Users/tejaswinikunkulagunta/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3';
const font = 'Avenir Next';
const W = 1280, H = 720;
const C = {
  ink: '#082C24', deep: '#0B382C', green: '#14523F', mid: '#1D6A50', mint: '#A9D9B9',
  cream: '#F5F2E8', paper: '#FCFBF7', gold: '#E7B942', coral: '#E47B55',
  charcoal: '#18332C', body: '#40564E', muted: '#718078', line: '#D7DED5',
  white: '#FFFFFF', pale: '#E7EFE7', paleGold: '#F5E6B7', softGreen: '#DDEBE0',
};
const presentation = Presentation.create({ slideSize: { width: W, height: H } });
const coverBytes = await readImage(path.join(buildDir, 'cover-fan-cricket.png'));

function rect(slide, x, y, w, h, fill, radius = false, stroke = 'none', sw = 0) {
  return slide.shapes.add({
    geometry: radius ? 'roundRect' : 'rect',
    position: { left: x, top: y, width: w, height: h }, fill,
    line: { style: 'solid', fill: stroke, width: sw },
    ...(radius ? { borderRadius: 'rounded-xl' } : {}),
  });
}
function text(slide, value, x, y, w, h, opts = {}) {
  const s = slide.shapes.add({
    geometry: 'textbox', name: opts.name,
    position: { left: x, top: y, width: w, height: h },
    fill: 'none', line: { style: 'solid', fill: 'none', width: 0 },
  });
  s.text = value;
  s.text.style = {
    typeface: font, fontSize: opts.size ?? 24, color: opts.color ?? C.charcoal,
    bold: opts.bold ?? false, alignment: opts.align ?? 'left',
    verticalAlignment: opts.valign ?? 'middle', wrap: 'square', autoFit: 'shrinkText',
    insets: opts.inset ?? 0,
  };
  return s;
}
function rule(slide, x, y, w, color = C.line, h = 1) { rect(slide, x, y, w, h, color); }
function notes(slide, value) { slide.speakerNotes.text = value; }
function base({ dark = false, section, title, subtitle = '', number }) {
  const s = presentation.slides.add();
  s.background.fill = dark ? C.ink : C.cream;
  const fg = dark ? C.cream : C.ink;
  const sub = dark ? C.mint : C.body;
  text(s, section.toUpperCase(), 72, 34, 620, 24, { size: 16, bold: true, color: dark ? C.gold : C.mid });
  text(s, title, 72, 74, 1136, 74, { size: 54, bold: true, color: fg });
  if (subtitle) text(s, subtitle, 74, 151, 1090, 48, { size: 23, color: sub });
  rule(s, 72, 674, 1136, dark ? '#31574A' : C.line, 1);
  text(s, 'CRICKETVERSE  ·  B.TECH CAPSTONE', 72, 679, 740, 21, { size: 14, bold: true, color: dark ? '#AFC5B8' : C.muted });
  text(s, String(number).padStart(2, '0'), 1152, 679, 56, 21, { size: 15, bold: true, align: 'right', color: dark ? C.gold : C.mid });
  return s;
}
function label(slide, v, x, y, w, dark = false) { text(slide, v.toUpperCase(), x, y, w, 24, { size: 16, bold: true, color: dark ? C.gold : C.mid }); }
function readImage(pathname) { return fs.readFile(pathname).then(b => new Uint8Array(b)); }

// 1 — Cover: a fan is the centre of the story.
{
  const s = presentation.slides.add();
  s.background.fill = C.ink;
  s.images.add({ blob: coverBytes, contentType: 'image/png', alt: 'Cricket fans following a match together at a stadium', fit: 'cover', position: { left: 0, top: 0, width: W, height: H } });
  rect(s, 62, 72, 7, 572, C.gold);
  text(s, 'B.TECH CAPSTONE  ·  BLOCKCHAIN & WEB3', 94, 95, 590, 26, { size: 17, bold: true, color: C.gold });
  text(s, 'CricketVerse', 92, 172, 720, 86, { size: 64, bold: true, color: C.cream });
  text(s, 'A fan-centred cricket platform', 96, 267, 680, 62, { size: 36, bold: true, color: C.mint });
  text(s, 'Connecting matchday participation, digital ownership and clearer rules', 96, 350, 600, 92, { size: 26, color: C.cream });
  text(s, 'Tejaswini Kunkulagunta  ·  Department of Computer Science & Engineering', 96, 581, 705, 50, { size: 18, bold: true, color: C.cream });
  notes(s, 'Open with the fan experience. CricketVerse is a capstone prototype that brings matchday fantasy, collectibles, polls, ticketing and contest participation into one product. Cover image is AI-generated for this presentation and is illustrative, not a photograph of a specific real match.');
}

// 2 — Why this project.
{
  const s = base({ section: 'Why', title: 'Digital cricket participation is fragmented', subtitle: 'The project starts from a fan need: take part in the match and keep meaningful digital assets.', number: 2 });
  const items = [
    ['Follow', 'Stay connected to today’s match and its players.'],
    ['Participate', 'Build a fantasy XI, vote and join a contest.'],
    ['Keep', 'Collect player cards that belong to the fan’s wallet.'],
    ['Trust', 'See rules for purchases, resale, entry and funds.'],
  ];
  items.forEach(([head, body], i) => {
    const y = 244 + i * 86;
    text(s, head, 92, y, 230, 42, { size: 30, bold: true, color: C.ink });
    text(s, body, 350, y + 1, 760, 48, { size: 24, color: C.body });
    if (i < items.length - 1) rule(s, 92, y + 61, 1058, C.line, 1);
  });
  rect(s, 92, 604, 1058, 40, C.paleGold, true);
  text(s, 'Motivation  ·  Put fan participation, ownership and rules in one connected experience.', 112, 609, 1015, 31, { size: 20, bold: true, color: C.ink });
  notes(s, 'This is the project motivation and design framing, not a claim that every existing cricket platform has the same shortcomings. Source basis: supplied CricketVerse project proposal and user-provided presentation materials.');
}

// 3 — Research aim and contribution.
{
  const s = base({ dark: true, section: 'What', title: 'Research aim and contribution', subtitle: 'Explore how a cricket app can connect live participation with user-owned assets and rules fans can inspect.', number: 3 });
  label(s, 'Guiding question', 92, 256, 300, true);
  text(s, 'How can one platform connect matchday activity with digital ownership without putting fast-changing match data on-chain?', 92, 290, 1040, 103, { size: 30, bold: true, color: C.cream });
  rule(s, 92, 426, 1048, '#31574A', 1);
  label(s, 'Prototype contribution', 92, 462, 340, true);
  text(s, 'An integrated proof of concept combining a cricket-data API, a fan-facing web app and wallet-signed contract actions.', 92, 495, 1000, 70, { size: 25, color: C.mint });
  notes(s, 'Describe this as an engineering and design contribution. No user study or measured impact is claimed in the current materials. Source basis: project proposal, app and server source.');
}

// 4 — Fan journey.
{
  const s = base({ section: 'What', title: 'A fan’s matchday in CricketVerse', subtitle: 'A single journey links the actions that are otherwise treated as separate features.', number: 4 });
  const centers = [210, 640, 1070];
  rule(s, 210, 288, 860, C.line, 3);
  const stages = [
    { title: 'Before play', body: 'Choose today’s fixture\nBuild a Matchday XI\nCollect a favourite player card', color: C.green },
    { title: 'During play', body: 'Follow provider-fed points\nTake part in fan polls\nCheck contest progress', color: C.gold },
    { title: 'After play', body: 'Keep or trade cards\nReview ticket activity\nSee contest settlement status', color: C.coral },
  ];
  stages.forEach((item, i) => {
    const x = centers[i] - 172;
    rect(s, centers[i] - 19, 269, 38, 38, item.color, true);
    text(s, item.title, x, 338, 344, 46, { size: 29, bold: true, color: C.ink, align: 'center' });
    text(s, item.body, x + 4, 394, 336, 118, { size: 22, color: C.body, align: 'center' });
  });
  text(s, 'The wallet is used when the fan chooses to buy, trade, vote or enter.', 140, 572, 1000, 40, { size: 22, bold: true, color: C.green, align: 'center' });
  notes(s, 'The timeline is a user-facing summary of the features in the current app. Match and points availability depends on the cricket provider connection; purchases and other contract actions require a connected wallet. Source: public/app.js, server/server.js, BLOCKCHAIN_SETUP.md.');
}

// 5 — Matchday XI.
{
  const s = base({ dark: true, section: 'How · matchday', title: 'Matchday XI gives fans a role in the game', subtitle: 'The app turns a confirmed playing list into a squad the fan can shape.', number: 5 });
  text(s, '22', 120, 256, 260, 132, { size: 110, bold: true, color: C.gold, align: 'center' });
  text(s, 'confirmed players', 113, 389, 274, 38, { size: 23, bold: true, color: C.mint, align: 'center' });
  text(s, '→', 474, 294, 120, 70, { size: 62, color: C.cream, align: 'center' });
  text(s, '11', 650, 256, 260, 132, { size: 110, bold: true, color: C.cream, align: 'center' });
  text(s, 'chosen by the fan', 647, 389, 274, 38, { size: 23, bold: true, color: C.gold, align: 'center' });
  rule(s, 980, 236, 1, '#31574A', 250);
  label(s, 'The selection rules', 1010, 256, 220, true);
  text(s, 'Role balance\nCredit limit\nSquad linked to contest entry', 1010, 300, 220, 145, { size: 21, color: C.mint });
  rule(s, 92, 508, 1092, '#31574A', 1);
  text(s, 'The cricket API supplies the match, playing XI and points; the app refreshes points as the provider updates them.', 92, 535, 1092, 66, { size: 22, color: C.cream });
  notes(s, 'The code uses the provider playing XI as the available pool, validates an 11-player squad with role and credit constraints, and fetches match points from the API. Squad integrity is committed as a hash. Points are not currently validated by an on-chain oracle. Source: server/server.js, server/scoringEngine.js, public/app.js, BLOCKCHAIN_SETUP.md.');
}

// 6 — Hybrid design.
{
  const s = base({ section: 'How · design choice', title: 'A hybrid design fits the two kinds of data', subtitle: 'Match information changes quickly; ownership and transaction rules need a shared record.', number: 6 });
  label(s, 'From the cricket provider', 92, 251, 440);
  text(s, 'Today’s fixtures\nConfirmed playing XI\nLive match points', 92, 290, 460, 150, { size: 29, color: C.ink });
  text(s, 'API + server cache', 92, 468, 420, 36, { size: 21, bold: true, color: C.mid });
  rule(s, 628, 234, 2, C.line, 322);
  label(s, 'From the blockchain', 690, 251, 460);
  text(s, 'Card and ticket ownership\nWallet-signed purchases and votes\nEscrow and ticket rules', 690, 290, 500, 150, { size: 29, color: C.ink });
  text(s, 'Wallet + smart contracts', 690, 468, 430, 36, { size: 21, bold: true, color: C.mid });
  rect(s, 92, 558, 1096, 56, C.paleGold, true);
  text(s, 'Blockchain records assets and enforces coded rules; it does not make a cricket score trustworthy by itself.', 113, 564, 1056, 44, { size: 20, bold: true, color: C.ink });
  notes(s, 'State the trust boundary precisely. The code has cricket API endpoints and contracts for assets and financial rules. Current deployment defaults to local Hardhat. The CricketOracleConsumer is not connected to a live Chainlink Functions subscription, and contest winners are selected by the organizer. Source: server/server.js, contracts/CricketOracleConsumer.sol, BLOCKCHAIN_SETUP.md.');
}

// 7 — Features in the fan's language.
{
  const s = base({ dark: true, section: 'How · fan features', title: 'Blockchain-backed fan features', subtitle: 'Contracts matter when a fan needs ownership, a transaction record or a rule they can inspect.', number: 7 });
  const rows = [
    ['Player cards', 'Owned by a wallet; can be collected or traded'],
    ['CRIC test token', 'Used for demo purchases and contest entry'],
    ['Tickets', 'Resale limit and one-time redemption enforced by contract'],
    ['Polls and contests', 'Votes and entry funds recorded; prize settlement still needs an organizer'],
  ];
  rows.forEach(([title, body], i) => {
    const y = 260 + i * 77;
    text(s, title, 92, y, 270, 42, { size: 25, bold: true, color: C.cream });
    text(s, body, 385, y, 790, 48, { size: 22, color: C.mint });
    if (i < rows.length - 1) rule(s, 92, y + 58, 1090, '#31574A', 1);
  });
  text(s, 'The 50,000 CRIC faucet is a local test feature, not a real-money reward.', 92, 584, 1090, 34, { size: 18, bold: true, color: C.gold });
  notes(s, 'The local CRIC contract gives test tokens through a wallet-signed faucet transaction. ERC-1155 cards and ERC-721 tickets are controlled by contracts. The marketplace escrows assets; tournament entries and refunds are on-chain, but the organizer settles winners. Source: contracts/CRIC.sol, PlayerCardNFT.sol, MatchTicketNFT.sol, CricketMarketplace.sol, TournamentPool.sol, FanPolls.sol, BLOCKCHAIN_SETUP.md.');
}

// 8 — Architecture in plain language.
{
  const s = base({ section: 'How · implementation', title: 'The app joins cricket data to wallet actions', subtitle: 'Two paths meet in the browser: one reads the match feed; the other asks the fan’s wallet to sign.', number: 8 });
  label(s, 'Match data path', 92, 240, 380);
  const nodes = [
    { x: 92, w: 250, title: 'Cricket provider', sub: 'Fixtures · playing XI · points' },
    { x: 500, w: 280, title: 'Express API', sub: 'Normalises data · short cache' },
    { x: 938, w: 250, title: 'Web app', sub: 'Builds XI · shows points' },
  ];
  nodes.forEach(n => {
    rect(s, n.x, 286, n.w, 106, C.paper, false, C.line, 1);
    text(s, n.title, n.x + 18, 300, n.w - 36, 34, { size: 24, bold: true, color: C.ink });
    text(s, n.sub, n.x + 18, 342, n.w - 36, 42, { size: 18, color: C.body });
  });
  text(s, '→', 376, 311, 92, 44, { size: 42, color: C.gold, align: 'center' });
  text(s, '→', 820, 311, 92, 44, { size: 42, color: C.gold, align: 'center' });
  rule(s, 92, 434, 1096, C.line, 1);
  label(s, 'Wallet transaction path', 92, 466, 380);
  text(s, 'Fan’s wallet', 92, 505, 270, 42, { size: 25, bold: true, color: C.ink });
  text(s, 'signs', 389, 505, 116, 42, { size: 20, color: C.body, align: 'center' });
  text(s, 'Local Hardhat contracts', 542, 505, 355, 42, { size: 25, bold: true, color: C.ink });
  text(s, 'Cards · CRIC · tickets · escrow · polls', 902, 505, 286, 60, { size: 18, color: C.body });
  text(s, 'The current contract deployment is local to the developer’s computer.', 92, 592, 1096, 28, { size: 18, bold: true, color: C.coral });
  notes(s, 'This diagram summarises the implemented frontend/API/blockchain split. API endpoints rely on a provider key and network access. Browser wallet signs transactions, while contracts currently run on a local Hardhat network; other users cannot transact against this deployment from another computer. Source: public/app.js, public/chain.js, server/server.js, BLOCKCHAIN_SETUP.md.');
}

// 9 — Impact and measurement.
{
  const s = base({ section: 'Impact', title: 'Expected value should be tested with fans', subtitle: 'These are outcomes to evaluate, not results claimed by the current prototype.', number: 9 });
  const cols = [
    { x: 92, head: 'Agency', body: 'Can fans build an XI and manage a player card without help?' },
    { x: 470, head: 'Clarity', body: 'Can fans understand what is recorded on-chain and what comes from the API?' },
    { x: 848, head: 'Confidence', body: 'Can fans verify ticket rules, votes and contest-fund activity?' },
  ];
  cols.forEach((v, i) => {
    text(s, v.head, v.x, 280, 330, 48, { size: 31, bold: true, color: i === 1 ? C.green : C.ink });
    rule(s, v.x, 337, 306, i === 1 ? C.gold : C.line, 3);
    text(s, v.body, v.x, 367, 310, 132, { size: 23, color: C.body });
  });
  rect(s, 92, 548, 1096, 70, C.softGreen, true);
  text(s, 'Evaluation focus  ·  task completion, rule correctness, data clarity and fan feedback.', 114, 560, 1054, 48, { size: 21, bold: true, color: C.ink });
  notes(s, 'These are proposed evaluation criteria, not measured outcomes. A future evaluation should test the fan journey with representative users, verify contract rules with automated tests, and report API failure and recovery behavior separately.');
}

// 10 — What is implemented versus outstanding.
{
  const s = base({ dark: true, section: 'Prototype status', title: 'A working prototype with clear boundaries', subtitle: 'The current build demonstrates integration; it is not yet a public production service.', number: 10 });
  label(s, 'Implemented in the prototype', 92, 244, 490, true);
  text(s, 'Match, playing XI and points API routes\nPlayer catalogue and fantasy squad flow\nWallet-connected token, card, ticket and marketplace contracts\nPoll and tournament contract interactions', 92, 285, 510, 222, { size: 22, color: C.cream });
  rule(s, 640, 238, 2, '#31574A', 326);
  label(s, 'Still to complete', 692, 244, 420, true);
  text(s, 'Public testnet deployment and hosted site\nProduction-grade provider access and monitoring\nTrusted automated match-result/oracle flow\nFan usability evaluation', 692, 285, 500, 222, { size: 22, color: C.mint });
  rect(s, 92, 548, 1096, 65, '#123E31', true);
  text(s, 'Current limitation  ·  tournament winners are reviewed and submitted by an organizer; live score data is not verified by a chain oracle.', 112, 556, 1056, 50, { size: 18, bold: true, color: C.cream });
  notes(s, 'Be explicit about prototype status. Current contracts-config.json targets Local Hardhat. BLOCKCHAIN_SETUP.md states that no public Amoy deployment or live Chainlink Functions subscription is configured, and tournament winners are organizer-selected. Provider routes exist but successful live data still depends on a configured key and provider availability. Source: BLOCKCHAIN_SETUP.md, server/server.js, public/contracts-config.json.');
}

// 11 — Academic evaluation plan.
{
  const s = base({ section: 'Evaluation', title: 'A practical evaluation can answer the research question', subtitle: 'Assess both the fan experience and the correctness of the rules the prototype promises.', number: 11 });
  const evalRows = [
    ['Usability', 'Ask fans to select an XI, find live points and collect a player card.'],
    ['Rule correctness', 'Test resale limits, one-time ticket redemption, escrow and refund paths.'],
    ['Data behavior', 'Observe provider delay, missing fields, and recovery when the API is unavailable.'],
  ];
  evalRows.forEach(([head, body], i) => {
    const y = 268 + i * 99;
    text(s, head, 92, y, 290, 46, { size: 28, bold: true, color: C.ink });
    text(s, body, 402, y + 2, 760, 52, { size: 22, color: C.body });
    if (i < evalRows.length - 1) rule(s, 92, y + 70, 1092, C.line, 1);
  });
  text(s, 'Report observed findings separately from intended impact.', 92, 584, 1090, 34, { size: 21, bold: true, color: C.green });
  notes(s, 'This evaluation plan is a recommendation, not a description of completed user research. It separates usability, contract correctness and API reliability so one passing component does not imply the whole system is reliable.');
}

// 12 — Conclusion.
{
  const s = presentation.slides.add();
  s.background.fill = C.ink;
  text(s, 'TAKEAWAY', 84, 72, 400, 26, { size: 17, bold: true, color: C.gold });
  text(s, 'CricketVerse connects\nparticipation with ownership', 84, 134, 890, 154, { size: 58, bold: true, color: C.cream });
  text(s, 'Live cricket data keeps the experience current. Smart contracts make selected asset and transaction rules visible and enforceable.', 88, 326, 900, 92, { size: 27, color: C.mint });
  rule(s, 88, 472, 930, '#31574A', 2);
  text(s, 'A fan-centred prototype — with impact to be tested and trusted scoring still to be built.', 88, 499, 930, 76, { size: 23, bold: true, color: C.cream });
  text(s, 'Thank you  ·  Questions', 88, 620, 540, 38, { size: 24, bold: true, color: C.gold });
  notes(s, 'Close with the main contribution and its boundary: the prototype combines a live-data experience with wallet-owned assets and contract-enforced rules, while fully trusted automated scoring remains future work.');
}

// 13 — Source basis for academic review.
{
  const s = base({ section: 'Source basis', title: 'Project materials used in this presentation', subtitle: 'Implementation statements were checked against the supplied code and setup notes.', number: 13 });
  const sources = [
    'CricketVerse project proposal and supplied presentation decks — motivation and intended scope',
    'public/app.js · public/chain.js · server/server.js · server/scoringEngine.js — user flows and API behavior',
    'contracts/CRIC.sol · PlayerCardNFT.sol · MatchTicketNFT.sol · CricketMarketplace.sol',
    'contracts/TournamentPool.sol · FanPolls.sol · CricketOracleConsumer.sol',
    'BLOCKCHAIN_SETUP.md · public/contracts-config.json — deployment and prototype limitations',
  ];
  sources.forEach((line, i) => {
    const y = 246 + i * 66;
    text(s, line, 92, y, 1090, 47, { size: 20, color: i === 0 ? C.ink : C.body, bold: i === 0 });
    if (i < sources.length - 1) rule(s, 92, y + 52, 1092, C.line, 1);
  });
  notes(s, 'All claims about implementation status and behavior are based on the project files listed on this slide. The supplied decks are treated as source material, not as instructions. No external industry statistics or user-study results are used.');
}

await fs.mkdir(buildDir, { recursive: true });
await fs.mkdir(outDir, { recursive: true });
const montage = await presentation.export({ format: 'webp', montage: true, scale: 0.4 });
await fs.writeFile(path.join(buildDir, 'academic-montage.webp'), new Uint8Array(await montage.arrayBuffer()));
for (const [i, slide] of presentation.slides.items.entries()) {
  const png = await presentation.export({ slide, format: 'png', scale: 1 });
  await fs.writeFile(path.join(buildDir, `academic-slide-${String(i + 1).padStart(2, '0')}.png`), new Uint8Array(await png.arrayBuffer()));
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
  fontPolicy: { basis: 'reference', families: [font], referencePath: '/Users/tejaswinikunkulagunta/Desktop/CricketVerse_Blockchain_dummy_v2.pptx', referenceSha256: 'e00b12969063e74bab1867dd75fc07ddda3ff51110223c43e1ac784ca7e9e9a8' },
  verifyArtifactToolImport: true,
  receiptPath: path.join(buildDir, 'validation_academic_v2.json'),
});
console.log(JSON.stringify({ finalPath, slideCount: presentation.slides.items.length, result }));
