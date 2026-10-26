// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/utils/Strings.sol";
import "@openzeppelin/contracts/utils/Base64.sol";

/**
 * @title CardSVGGenerator
 * @author Tejaswini Kunkulagunta (CS23B032)
 * @notice Generates high-fidelity on-chain SVG artwork and dynamic achievement badges
 *         reflecting real-world cricket athletic milestones.
 */
contract CardSVGGenerator {
    using Strings for uint256;
    using Strings for uint32;

    struct CardVisualParams {
        string name;
        string role;
        string team;
        uint8 rarity;
        uint16 multiplierBps;
        uint32 matches;
        uint32 runs;
        uint32 wickets;
        uint32 strikeRate;
        uint32 economy;
    }

    /**
     * @notice Returns hex color scheme for a given rarity tier
     */
    function getRarityColors(uint8 rarity) public pure returns (string memory primary, string memory border, string memory glow) {
        if (rarity == 4) {
            // Legendary (Amber / Gold)
            return ("#F59E0B", "#FBBF24", "rgba(245, 158, 11, 0.45)");
        } else if (rarity == 3) {
            // Epic (Purple / Violet)
            return ("#8B5CF6", "#A78BFA", "rgba(139, 92, 246, 0.45)");
        } else if (rarity == 2) {
            // Rare (Cyan / Electric Blue)
            return ("#0EA5E9", "#38BDF8", "rgba(14, 165, 233, 0.45)");
        } else if (rarity == 1) {
            // Uncommon (Emerald Turf Green)
            return ("#10B981", "#34D399", "rgba(16, 185, 129, 0.45)");
        } else {
            // Common (Steel / Slate)
            return ("#64748B", "#94A3B8", "rgba(100, 116, 139, 0.35)");
        }
    }

    /**
     * @notice Generates dynamic milestone achievement badges based on player telemetry
     */
    function generateBadges(uint32 runs, uint32 wickets, uint32 strikeRate, uint32 economy) public pure returns (string memory) {
        bytes memory b = "";

        if (runs >= 100) {
            b = abi.encodePacked(b, '<rect x="24" y="380" width="105" height="24" rx="12" fill="#FEF08A" stroke="#CA8A04" stroke-width="1.5"/><text x="76" y="396" fill="#854D0E" font-size="11" font-weight="bold" font-family="Arial, sans-serif" text-anchor="middle">CENTURION 100+</text>');
        } else if (runs >= 50) {
            b = abi.encodePacked(b, '<rect x="24" y="380" width="95" height="24" rx="12" fill="#FEF9C3" stroke="#EAB308" stroke-width="1.5"/><text x="71" y="396" fill="#A16207" font-size="11" font-weight="bold" font-family="Arial, sans-serif" text-anchor="middle">HALF-TON 50+</text>');
        }

        if (wickets >= 5) {
            b = abi.encodePacked(b, '<rect x="135" y="380" width="115" height="24" rx="12" fill="#FEE2E2" stroke="#DC2626" stroke-width="1.5"/><text x="192" y="396" fill="#991B1B" font-size="11" font-weight="bold" font-family="Arial, sans-serif" text-anchor="middle">5-WKT HAUL</text>');
        } else if (wickets >= 3) {
            b = abi.encodePacked(b, '<rect x="135" y="380" width="105" height="24" rx="12" fill="#FFEDD5" stroke="#EA580C" stroke-width="1.5"/><text x="187" y="396" fill="#9A3412" font-size="11" font-weight="bold" font-family="Arial, sans-serif" text-anchor="middle">3-WKT CRUSH</text>');
        }

        if (strikeRate >= 15000) {
            b = abi.encodePacked(b, '<rect x="24" y="412" width="110" height="22" rx="11" fill="#E0E7FF" stroke="#4F46E5" stroke-width="1"/><text x="79" y="427" fill="#3730A3" font-size="10" font-weight="bold" font-family="Arial, sans-serif" text-anchor="middle">STRIKE MASTER</text>');
        }

        if (economy > 0 && economy <= 600) {
            b = abi.encodePacked(b, '<rect x="140" y="412" width="105" height="22" rx="11" fill="#DCFCE7" stroke="#16A34A" stroke-width="1"/><text x="192" y="427" fill="#166534" font-size="10" font-weight="bold" font-family="Arial, sans-serif" text-anchor="middle">ECONOMY KING</text>');
        }

        return string(b);
    }

    /**
     * @notice Formats strike rate / economy with two decimal places
     */
    function formatScaled(uint32 val) public pure returns (string memory) {
        uint32 whole = val / 100;
        uint32 decimal = val % 100;
        string memory decStr = decimal < 10 ? string(abi.encodePacked("0", uint256(decimal).toString())) : uint256(decimal).toString();
        return string(abi.encodePacked(uint256(whole).toString(), ".", decStr));
    }

    function _renderHeader(string memory name, string memory role, string memory team, string memory primary, string memory border, string memory multStr) internal pure returns (bytes memory) {
        return abi.encodePacked(
            '<rect x="24" y="24" width="292" height="60" rx="14" fill="#0B1329" stroke="', border, '" stroke-width="1"/>',
            '<text x="38" y="52" fill="#F8FAFC" font-size="18" font-weight="900" font-family="Arial, sans-serif">', name, '</text>',
            '<text x="38" y="72" fill="', primary, '" font-size="12" font-weight="bold" font-family="Arial, sans-serif">', role, ' | ', team, '</text>',
            '<rect x="236" y="34" width="70" height="26" rx="8" fill="', primary, '"/>',
            '<text x="271" y="52" fill="#FFFFFF" font-size="12" font-weight="900" font-family="Arial, sans-serif" text-anchor="middle">', multStr, 'x</text>'
        );
    }

    function _renderStats(uint32 matches, uint32 runs, uint32 wickets, string memory srStr, string memory econStr) internal pure returns (bytes memory) {
        return abi.encodePacked(
            '<rect x="24" y="258" width="292" height="106" rx="14" fill="#0B1329" stroke="#334155" stroke-width="1"/>',
            '<text x="44" y="284" fill="#94A3B8" font-size="11" font-family="Arial, sans-serif">MATCHES</text>',
            '<text x="44" y="306" fill="#F8FAFC" font-size="16" font-weight="bold" font-family="Arial, sans-serif">', uint256(matches).toString(), '</text>',
            '<text x="120" y="284" fill="#94A3B8" font-size="11" font-family="Arial, sans-serif">RUNS</text>',
            '<text x="120" y="306" fill="#F8FAFC" font-size="16" font-weight="bold" font-family="Arial, sans-serif">', uint256(runs).toString(), '</text>',
            '<text x="194" y="284" fill="#94A3B8" font-size="11" font-family="Arial, sans-serif">WICKETS</text>',
            '<text x="194" y="306" fill="#F8FAFC" font-size="16" font-weight="bold" font-family="Arial, sans-serif">', uint256(wickets).toString(), '</text>',
            '<text x="260" y="284" fill="#94A3B8" font-size="11" font-family="Arial, sans-serif">STRIKE</text>',
            '<text x="260" y="306" fill="#F8FAFC" font-size="14" font-weight="bold" font-family="Arial, sans-serif">', srStr, '</text>',
            '<text x="44" y="336" fill="#94A3B8" font-size="11" font-family="Arial, sans-serif">ECONOMY: ', econStr, '</text>'
        );
    }

    /**
     * @notice Renders raw SVG XML string for a player card
     */
    function renderCardSVG(CardVisualParams memory p) public pure returns (string memory) {
        (string memory primary, string memory border, string memory glow) = getRarityColors(p.rarity);
        string memory badgeElements = generateBadges(p.runs, p.wickets, p.strikeRate, p.economy);
        string memory multStr = formatScaled(p.multiplierBps);
        string memory srStr = formatScaled(p.strikeRate);
        string memory econStr = formatScaled(p.economy);

        bytes memory part1 = abi.encodePacked(
            '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 340 480" width="100%" height="100%">',
            '<defs>',
            '<linearGradient id="cardGrad" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#0F172A"/><stop offset="100%" stop-color="#1E293B"/></linearGradient>',
            '<filter id="glow" x="-20%" y="-20%" width="140%" height="140%"><feDropShadow dx="0" dy="6" stdDeviation="10" flood-color="', glow, '"/></filter>',
            '</defs>',
            '<rect x="10" y="10" width="320" height="460" rx="24" fill="url(#cardGrad)" stroke="', border, '" stroke-width="3" filter="url(#glow)"/>'
        );

        bytes memory part2 = _renderHeader(p.name, p.role, p.team, primary, border, multStr);

        bytes memory part3 = abi.encodePacked(
            '<rect x="24" y="96" width="292" height="150" rx="16" fill="#132238" stroke="#334155" stroke-width="1"/>',
            '<circle cx="170" cy="171" r="54" fill="#1E293B" stroke="', border, '" stroke-width="2"/>',
            '<text x="170" y="180" fill="', primary, '" font-size="34" font-family="Arial, sans-serif" text-anchor="middle">&#127951;</text>'
        );

        bytes memory part4 = _renderStats(p.matches, p.runs, p.wickets, srStr, econStr);

        return string(abi.encodePacked(part1, part2, part3, part4, badgeElements, '</svg>'));
    }

    /**
     * @notice Generates an RFC-2397 Data URI containing base64 encoded SVG
     */
    function generateCardTokenURI(CardVisualParams memory p) external pure returns (string memory) {
        string memory svg = renderCardSVG(p);
        string memory json = string(abi.encodePacked(
            '{"name":"', p.name, '",',
            '"description":"CricketVerse Dynamic Player Card with On-Chain Telemetry and Milestones",',
            '"attributes":[{"trait_type":"Role","value":"', p.role, '"},',
            '{"trait_type":"Team","value":"', p.team, '"},',
            '{"trait_type":"Runs","value":', uint256(p.runs).toString(), '},',
            '{"trait_type":"Wickets","value":', uint256(p.wickets).toString(), '}],',
            '"image":"data:image/svg+xml;base64,', Base64.encode(bytes(svg)), '"}'
        ));
        return string(abi.encodePacked("data:application/json;base64,", Base64.encode(bytes(json))));
    }
}
