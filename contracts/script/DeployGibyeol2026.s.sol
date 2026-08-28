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

    uint256 private constant TARGET_CHAIN_ID = 84_532;
    uint64 private constant UNLOCK_AT = 1_798_124_400;
    uint64 private constant UNLOCK_ROUND = 35_107_012;
    bytes32 private constant QUICKNET_CHAIN_HASH =
        0x52db9ba70e0cc0f6eaf7803dd07447a1f5477735fd3f661792ba94600c84e971;

    error WrongChainId(uint256 expected, uint256 actual);
    error ZeroRecoveryPublicKey();

    function run() external returns (Gibyeol2026 deployed) {
        if (block.chainid != TARGET_CHAIN_ID) {
            revert WrongChainId(TARGET_CHAIN_ID, block.chainid);
        }

        bytes32 recoveryPublicKey = VM.envBytes32("RECOVERY_PUBLIC_KEY");
        if (recoveryPublicKey == bytes32(0)) revert ZeroRecoveryPublicKey();

        VM.startBroadcast();
        deployed = new Gibyeol2026(UNLOCK_AT, UNLOCK_ROUND, QUICKNET_CHAIN_HASH, recoveryPublicKey);
        VM.stopBroadcast();
    }
}
