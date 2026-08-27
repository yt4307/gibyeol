// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import { Gibyeol2026 } from "../src/Gibyeol2026.sol";

interface VmLocal {
    function startBroadcast() external;
    function stopBroadcast() external;
}

contract LocalE2E {
    VmLocal private constant VM = VmLocal(address(uint160(uint256(keccak256("hevm cheat code")))));

    function run() external returns (Gibyeol2026 deployed) {
        bytes32 mailboxPublicKey = keccak256("local mailbox public key");
        bytes32 letterId = keccak256("local idempotent letter ID");

        VM.startBroadcast();
        deployed = new Gibyeol2026(
            1_798_124_400,
            35_107_012,
            0x52db9ba70e0cc0f6eaf7803dd07447a1f5477735fd3f661792ba94600c84e971,
            keccak256("local recovery public key")
        );
        deployed.registerMailboxKey(
            mailboxPublicKey,
            hex"47504b310001010000000000000000000000000000000000000000000000000000000000000000",
            hex"746c6f636b2d7265636f766572792d656e76656c6f7065"
        );
        deployed.sealLetter(
            letterId,
            msg.sender,
            1,
            hex"47545831000000000000000000000000000000000000000000000000000000000000000000",
            hex"746c6f636b2d7365616c65642d6b6579",
            sha256(hex"4742594c01000000")
        );
        VM.stopBroadcast();

        require(deployed.currentKeyId(msg.sender) == 1, "mailbox registration failed");
        require(deployed.sealedLetters(letterId), "letter sealing failed");
    }
}
