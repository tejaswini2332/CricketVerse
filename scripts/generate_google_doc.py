import os
from docx import Document
from docx.shared import Inches, Pt, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT
from docx.oxml import parse_xml
from docx.oxml.ns import nsdecls

doc = Document()

# Page Margins
for section in doc.sections:
    section.top_margin = Inches(0.75)
    section.bottom_margin = Inches(0.75)
    section.left_margin = Inches(0.75)
    section.right_margin = Inches(0.75)

NAVY = RGBColor(15, 23, 42)
GREEN = RGBColor(21, 128, 61)
MUTED = RGBColor(100, 116, 139)

def set_cell_background(cell, fill_hex):
    shading_elm = parse_xml(f'<w:shd {nsdecls("w")} w:fill="{fill_hex}"/>')
    cell._tc.get_or_add_tcPr().append(shading_elm)

# Header
title = doc.add_paragraph()
title_run = title.add_run("CRICKETVERSE: A Decentralized Web3 Cricket Ecosystem")
title_run.font.name = "Arial"
title_run.font.size = Pt(20)
title_run.font.bold = True
title_run.font.color.rgb = NAVY
title.alignment = WD_ALIGN_PARAGRAPH.CENTER

sub = doc.add_paragraph()
sub_run = sub.add_run("Progress Report: Completed Days 01–10 & Next 10-Day Workplan")
sub_run.font.name = "Arial"
sub_run.font.size = Pt(13)
sub_run.font.bold = True
sub_run.font.color.rgb = GREEN
sub.alignment = WD_ALIGN_PARAGRAPH.CENTER

meta = doc.add_paragraph()
meta.paragraph_format.space_after = Pt(12)
m_run = meta.add_run("Author: Tejaswini Kunkulagunta | Roll No: CS23B032 | Dept: CSE | Academic Year: 2026\nSmart Contract Stack: Solidity 0.8.24 (ERC-20, ERC-721, ERC-1155) | Network: Polygon Amoy / EVM Local")
m_run.font.name = "Arial"
m_run.font.size = Pt(9.5)
m_run.font.italic = True
m_run.font.color.rgb = MUTED
meta.alignment = WD_ALIGN_PARAGRAPH.CENTER

def add_heading(text, level=1):
    h = doc.add_paragraph()
    h.paragraph_format.space_before = Pt(10)
    h.paragraph_format.space_after = Pt(3)
    run = h.add_run(text)
    run.font.name = "Arial"
    run.font.bold = True
    if level == 1:
        run.font.size = Pt(14)
        run.font.color.rgb = NAVY
    else:
        run.font.size = Pt(11.5)
        run.font.color.rgb = GREEN
    return h

# 1. Executive Summary
add_heading("1. Executive Summary", 1)
doc.add_paragraph(
    "CricketVerse is an academic Web3 sports ecosystem designed to resolve fundamental structural problems in centralized fantasy platforms: custodial asset risks, opaque scoring algorithms, unchecked secondary market ticket scalping, and fragmented user silos.\n\n"
    "During Days 01–10, the core foundation of the project has been fully developed, tested with 100% automated test coverage, and connected to an interactive frontend featuring an authentic Cricket Stadium Day Match theme with real international cricketer photography."
)

# 2. Completed Deliverables
add_heading("2. Completed Deliverables (Days 01–10)", 1)
p_contracts = doc.add_paragraph()
p_contracts.add_run(
    "• CRIC.sol (ERC-20 Utility Token): 100,000,000 CRIC cap, genesis mint (10M CRIC), minter access control, and a prototype rate-limited faucet (claimFaucet(), 1,000 CRIC / 1-hr cooldown).\n"
    "• PlayerCardNFT.sol (ERC-1155 Dynamic NFT): 5 rarity tiers (Common 1.0x, Uncommon 1.1x, Rare 1.25x, Epic 1.5x, Legendary 2.0x), hardcoded supply caps (Legendary max 25 units), and on-chain athletic telemetry upgrade routines.\n"
    "• MatchTicketNFT.sol (ERC-721 Anti-Scalping Ticket): Enforces maximum secondary resale ceiling (MaxResalePrice = FaceValue * 1.15). Integrates one-time gate turnstile redemption (redeemTicket) callable only by GATEKEEPER_ROLE to prevent double-entry fraud.\n"
    "• CricketMarketplace.sol: Non-custodial P2P marketplace with atomic settlement in CRIC tokens and automated 5% secondary royalty routing to drop pools.\n"
    "• Deterministic Scoring Engine: Implements Section 5.4 point rules (Runs +1, 4s +1, 6s +2, Wickets +20, Catches +8, 50s +10, 100s +25) and enforces 100-credit salary cap Playing XI validation.\n"
    "• Automated Test Suite: 13 unit tests passed with 100% pass rate in Hardhat (Cancun target)."
)

# 3. Visual Verification with Screenshots
add_heading("3. Visual Verification & User Interface Showcase", 1)
doc.add_paragraph("The application runs locally on http://localhost:3000 in an authentic Cricket Stadium Day Match Light Theme using verified photography of international cricketers:")

screenshots = [
    ("3.1 The Pavilion | Player Dugout (Dynamic Cards dNFT)", 
     "/Users/tejaswinikunkulagunta/.gemini/antigravity-ide/brain/6a8387f9-9d18-4b42-b318-49a870f285a1/pavilion_player_dugout_1791208420447.png",
     "Figure 1: The Pavilion displaying real photos of Virat Kohli, Jasprit Bumrah, Rohit Sharma, MS Dhoni, etc., alongside rarity tags, performance multipliers, and live athletic telemetry."),
    
    ("3.2 The Auction Room | P2P Player & Pass Exchange",
     "/Users/tejaswinikunkulagunta/.gemini/antigravity-ide/brain/6a8387f9-9d18-4b42-b318-49a870f285a1/auction_room_p2p_trading_1791208578371.png",
     "Figure 2: Non-custodial marketplace featuring atomic settlement, automated 5% creator pool royalty deduction, and anti-scalping ceiling protection."),
    
    ("3.3 Matchday XI | Live Pitch Arena & Fantasy Squad Builder",
     "/Users/tejaswinikunkulagunta/.gemini/antigravity-ide/brain/6a8387f9-9d18-4b42-b318-49a870f285a1/matchday_xi_live_pitch_arena_1791208692634.png",
     "Figure 3: 11-player squad builder with 100-credit salary cap meter, role trackers, and live 'Bowl Next Over' deterministic match simulation."),
     
    ("3.4 Stadium Gate Pass | Anti-Scalp Turnstile Scanner",
     "/Users/tejaswinikunkulagunta/.gemini/antigravity-ide/brain/6a8387f9-9d18-4b42-b318-49a870f285a1/stadium_gate_pass_anti_scalp_1791208778850.png",
     "Figure 4: Anti-scalping policy validator (reverting listings >115% of face value) and simulated optical QR laser turnstile with <2.0s admission verification."),
     
    ("3.5 Superfan Dugout | Polls & CRIC Drops",
     "/Users/tejaswinikunkulagunta/.gemini/antigravity-ide/brain/6a8387f9-9d18-4b42-b318-49a870f285a1/superfan_dugout_polls_drops_1791208862344.png",
     "Figure 5: Community match predictions allowing fans to vote and claim instant CRIC utility tokens directly into their Web3 wallets.")
]

for title_text, img_path, caption in screenshots:
    add_heading(title_text, 2)
    if os.path.exists(img_path):
        doc.add_picture(img_path, width=Inches(6.4))
        cap = doc.add_paragraph()
        cap.paragraph_format.space_before = Pt(2)
        cap.paragraph_format.space_after = Pt(8)
        c_run = cap.add_run(caption)
        c_run.font.name = "Arial"
        c_run.font.size = Pt(8.5)
        c_run.font.italic = True
        c_run.font.color.rgb = MUTED

# 4. Next 10 Days Workplan
add_heading("4. Next 10 Days Technical Workplan (Days 11–20)", 1)
doc.add_paragraph(
    "Rather than extending across the entire project horizon, the immediate engineering focus for the next 10 days centers on oracle automation, database persistence, and prize pool contracts:"
)

table_next = doc.add_table(rows=1, cols=3)
table_next.alignment = WD_TABLE_ALIGNMENT.CENTER
t_hdr = table_next.rows[0].cells
t_hdr[0].text = "Timeline"
t_hdr[1].text = "Milestone & Engineering Objectives"
t_hdr[2].text = "Deliverables"
for c in t_hdr:
    set_cell_background(c, "15803D")
    for r in c.paragraphs[0].runs:
        r.font.bold = True
        r.font.color.rgb = RGBColor(255, 255, 255)

next_rows = [
    ("Days 11–12", "Chainlink Functions Oracle Integration", "Implement Chainlink Functions consumer contract to query external cricket APIs (CricAPI/Sportradar). Automate on-chain calls to PlayerCardNFT.updatePlayerStats upon match conclusion."),
    ("Days 13–14", "Dockerized PostgreSQL & Leaderboard Cache", "Replace mock data store with Dockerized PostgreSQL schema (match_fixtures, ball_telemetry, player_stats). Add Redis cache for sub-second fantasy leaderboard rendering."),
    ("Days 15–16", "Dynamic On-Chain / SVG Card Art", "Develop dynamic SVG card renderer updating card borders and achievement badges (e.g. 'Century', '5-Wicket Haul') based on real-world athletic milestones."),
    ("Days 17–18", "Tournament Escrow Prize Pool Contracts", "Author TournamentPool.sol to escrow CRIC contest entry fees during match windows and execute automated, non-custodial payouts to top 10 fantasy leaderboard winners."),
    ("Days 19–20", "Gas Optimization & Testnet Deployment Prep", "Profile smart contract gas consumption using Hardhat Gas Reporter. Configure deployment scripts and environment variables for Polygon Amoy Testnet.")
]

for nr in next_rows:
    row = table_next.add_row().cells
    row[0].text = nr[0]
    row[1].text = nr[1]
    row[2].text = nr[2]

output_filename = "CricketVerse_Phase1_Progress_Report.docx"
doc.save(output_filename)
print(f"Generated: {output_filename} ({os.path.getsize(output_filename)} bytes)")
