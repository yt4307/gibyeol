// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import { Gibyeol2026 } from "../src/Gibyeol2026.sol";

interface Vm {
    function envBytes32(string calldata name) external view returns (bytes32 value);
    function startBroadcast() external;
    function stopBroadcast() external;
}

contract DeployGibyeol2026 {
    Vm private constant VM = Vm(address(uint160(uint256(keccak256("hevm cheat code")))));

    uint64 private constant UNLOCK_AT = 1_798_124_400;
    uint64 private constant UNLOCK_ROUND = 35_107_012;
    bytes32 private constant QUICKNET_CHAIN_HASH =
        0x52db9ba70e0cc0f6eaf7803dd07447a1f5477735fd3f661792ba94600c84e971;

    function run() external returns (Gibyeol2026 deployed) {
        bytes32 recoveryPublicKey = VM.envBytes32("RECOVERY_PUBLIC_KEY");
        VM.startBroadcast();
        deployed = new Gibyeol2026(UNLOCK_AT, UNLOCK_ROUND, QUICKNET_CHAIN_HASH, recoveryPublicKey);
        VM.stopBroadcast();
    }
}
