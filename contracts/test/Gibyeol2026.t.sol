// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import { Gibyeol2026 } from "../src/Gibyeol2026.sol";

struct RecordedLog {
    bytes32[] topics;
    bytes data;
    address emitter;
}

interface VmLogs {
    function recordLogs() external;
    function getRecordedLogs() external returns (RecordedLog[] memory);
}

contract GibyeolActor {
    function register(
        Gibyeol2026 target,
        bytes32 publicKey,
        bytes calldata passkeyEnvelope,
        bytes calldata recoveryEnvelope
    ) external {
        target.registerMailboxKey(publicKey, passkeyEnvelope, recoveryEnvelope);
    }

    function deactivate(Gibyeol2026 target) external {
        target.deactivateMailbox();
    }

    function seal(
        Gibyeol2026 target,
        bytes32 letterId,
        address recipient,
        uint32 recipientKeyId,
        bytes calldata encryptedText,
        bytes calldata sealedKey,
        bytes32 archiveSha256
    ) external {
        target.sealLetter(
            letterId, recipient, recipientKeyId, encryptedText, sealedKey, archiveSha256
        );
    }
}

contract Gibyeol2026Test {
    VmLogs internal constant VM = VmLogs(address(uint160(uint256(keccak256("hevm cheat code")))));
    uint64 internal constant UNLOCK_AT = 1_798_124_400;
    uint64 internal constant UNLOCK_ROUND = 42_000_000;
    bytes32 internal constant CHAIN_HASH = keccak256("quicknet");
    bytes32 internal constant RECOVERY_KEY = bytes32(uint256(0x1234));

    Gibyeol2026 internal target;
    GibyeolActor internal sender;
    GibyeolActor internal recipient;

    function setUp() public {
        target = new Gibyeol2026(UNLOCK_AT, UNLOCK_ROUND, CHAIN_HASH, RECOVERY_KEY);
        sender = new GibyeolActor();
        recipient = new GibyeolActor();
    }

    function testConstructorAndAbiSnapshot() public view {
        require(target.PROTOCOL_VERSION() == 1, "protocol version");
        require(target.UNLOCK_AT() == UNLOCK_AT, "unlock at");
        require(target.UNLOCK_ROUND() == UNLOCK_ROUND, "unlock round");
        require(target.DRAND_CHAIN_HASH() == CHAIN_HASH, "chain hash");
        require(target.RECOVERY_PUBLIC_KEY() == RECOVERY_KEY, "recovery key");

        require(
            target.registerMailboxKey.selector
                == bytes4(keccak256("registerMailboxKey(bytes32,bytes,bytes)")),
            "register selector"
        );
        require(
            target.sealLetter.selector
                == bytes4(keccak256("sealLetter(bytes32,address,uint32,bytes,bytes,bytes32)")),
            "seal selector"
        );
        require(
            target.deactivateMailbox.selector == bytes4(keccak256("deactivateMailbox()")),
            "deactivate selector"
        );
        require(
            keccak256("MailboxKeyRegistered(address,uint32,bytes32)")
                == 0xbf6bd81319d12d0543835e7dc44e48ec5219dd878a513a88b343bed6b6dd8fd3,
            "mailbox event signature"
        );
        require(
            keccak256("LetterSealed(bytes32,address,address,uint32,bytes32)")
                == 0x2be88081f72f00781e57de1505090095ec00dc51b664736358f0a3eb16cdc88f,
            "letter event signature"
        );
    }

    function testMailboxRotationPreservesOldKeys() public {
        recipient.register(target, bytes32(uint256(1)), hex"0102", hex"0304");
        recipient.register(target, bytes32(uint256(2)), hex"0506", hex"0708");

        require(target.currentKeyId(address(recipient)) == 2, "current key");
        require(target.mailboxPublicKeys(address(recipient), 1) == bytes32(uint256(1)), "old key");
        require(target.mailboxPublicKeys(address(recipient), 2) == bytes32(uint256(2)), "new key");
        require(target.mailboxActive(address(recipient)), "mailbox inactive after rotation");
    }

    function testMailboxDeactivationAndReactivation() public {
        (bool missing,) = address(recipient).call(
            abi.encodeCall(GibyeolActor.deactivate, (target))
        );
        require(!missing, "missing mailbox deactivated");

        recipient.register(target, bytes32(uint256(1)), hex"01", hex"02");
        VM.recordLogs();
        recipient.deactivate(target);
        RecordedLog[] memory deactivationLogs = VM.getRecordedLogs();
        require(deactivationLogs.length == 1, "deactivation log count");
        require(
            deactivationLogs[0].topics[0] == keccak256("MailboxDeactivated(address,uint32)"),
            "deactivation signature"
        );
        require(
            deactivationLogs[0].topics[1] == bytes32(uint256(uint160(address(recipient)))),
            "deactivation owner topic"
        );
        require(deactivationLogs[0].topics[2] == bytes32(uint256(1)), "deactivation key topic");
        require(!target.mailboxActive(address(recipient)), "mailbox still active");
        require(target.currentKeyId(address(recipient)) == 1, "key id removed");
        require(
            target.mailboxPublicKeys(address(recipient), 1) == bytes32(uint256(1)),
            "public key removed"
        );

        (bool repeated,) = address(recipient).call(
            abi.encodeCall(GibyeolActor.deactivate, (target))
        );
        require(!repeated, "repeated deactivation accepted");

        (bool sealedWhileInactive,) = address(sender).call(
            abi.encodeCall(
                GibyeolActor.seal,
                (
                    target,
                    keccak256("inactive"),
                    address(recipient),
                    1,
                    bytes(""),
                    bytes(""),
                    bytes32(0)
                )
            )
        );
        require(!sealedWhileInactive, "inactive mailbox accepted a letter");

        recipient.register(target, bytes32(uint256(2)), hex"03", hex"04");
        require(target.mailboxActive(address(recipient)), "mailbox not reactivated");
        require(target.currentKeyId(address(recipient)) == 2, "reactivated key id");
        sender.seal(
            target,
            keccak256("reactivated"),
            address(recipient),
            2,
            hex"47545831",
            hex"1234",
            keccak256("reactivated archive")
        );
    }

    function testRejectsZeroMailboxKeyAndRecipient() public {
        (bool keySuccess,) = address(recipient)
            .call(abi.encodeCall(GibyeolActor.register, (target, bytes32(0), bytes(""), bytes(""))));
        require(!keySuccess, "zero mailbox key accepted");

        (bool recipientSuccess,) = address(sender)
            .call(
                abi.encodeCall(
                    GibyeolActor.seal,
                    (
                        target,
                        keccak256("zero recipient"),
                        address(0),
                        0,
                        bytes(""),
                        bytes(""),
                        bytes32(0)
                    )
                )
            );
        require(!recipientSuccess, "zero recipient accepted");
    }

    function testSealLetterAndRejectDuplicate() public {
        recipient.register(target, bytes32(uint256(1)), hex"01", hex"02");
        bytes32 letterId = keccak256("letter");
        sender.seal(
            target, letterId, address(recipient), 1, hex"47545831", hex"1234", keccak256("archive")
        );
        require(target.sealedLetters(letterId), "not sealed");

        (bool success,) = address(sender)
            .call(
                abi.encodeCall(
                    GibyeolActor.seal,
                    (
                        target,
                        letterId,
                        address(recipient),
                        1,
                        hex"47545831",
                        hex"1234",
                        keccak256("archive")
                    )
                )
            );
        require(!success, "duplicate accepted");
    }

    function testEventTopicsAndDataMatchFreezeAbi() public {
        bytes32 publicKey = bytes32(uint256(0x1234));
        VM.recordLogs();
        recipient.register(target, publicKey, hex"0102", hex"0304");
        RecordedLog[] memory mailboxLogs = VM.getRecordedLogs();
        require(mailboxLogs.length == 1, "mailbox log count");
        require(
            mailboxLogs[0].topics[0] == keccak256("MailboxKeyRegistered(address,uint32,bytes32)"),
            "mailbox signature"
        );
        require(
            mailboxLogs[0].topics[1] == bytes32(uint256(uint160(address(recipient)))),
            "mailbox owner topic"
        );
        require(mailboxLogs[0].topics[2] == bytes32(uint256(1)), "mailbox key topic");
        require(abi.decode(mailboxLogs[0].data, (bytes32)) == publicKey, "mailbox data");

        bytes32 letterId = keccak256("event letter");
        bytes32 archiveSha256 = keccak256("event archive");
        VM.recordLogs();
        sender.seal(
            target, letterId, address(recipient), 1, hex"47545831", hex"1234", archiveSha256
        );
        RecordedLog[] memory letterLogs = VM.getRecordedLogs();
        require(letterLogs.length == 1, "letter log count");
        require(
            letterLogs[0].topics[0]
                == keccak256("LetterSealed(bytes32,address,address,uint32,bytes32)"),
            "letter signature"
        );
        require(letterLogs[0].topics[1] == letterId, "letter ID topic");
        require(
            letterLogs[0].topics[2] == bytes32(uint256(uint160(address(sender)))), "sender topic"
        );
        require(
            letterLogs[0].topics[3] == bytes32(uint256(uint160(address(recipient)))),
            "recipient topic"
        );
        (uint32 keyId, bytes32 archive) = abi.decode(letterLogs[0].data, (uint32, bytes32));
        require(keyId == 1, "recipient key data");
        require(archive == archiveSha256, "archive data");
    }

    function testRejectsStaleKeyAndMissingMailbox() public {
        (bool missing,) = address(sender)
            .call(
                abi.encodeCall(
                    GibyeolActor.seal,
                    (
                        target,
                        keccak256("missing"),
                        address(recipient),
                        0,
                        bytes(""),
                        bytes(""),
                        bytes32(0)
                    )
                )
            );
        require(!missing, "missing mailbox accepted");

        recipient.register(target, bytes32(uint256(1)), hex"01", hex"02");
        recipient.register(target, bytes32(uint256(2)), hex"03", hex"04");
        (bool stale,) = address(sender)
            .call(
                abi.encodeCall(
                    GibyeolActor.seal,
                    (
                        target,
                        keccak256("stale"),
                        address(recipient),
                        1,
                        bytes(""),
                        bytes(""),
                        bytes32(0)
                    )
                )
            );
        require(!stale, "stale key accepted");

        bytes32 sameLetterId = keccak256("stale");
        sender.seal(
            target,
            sameLetterId,
            address(recipient),
            2,
            hex"47545831",
            hex"7265777261707065642d666f722d6b65792d32",
            keccak256("unchanged archive")
        );
        require(target.sealedLetters(sameLetterId), "rewrapped retry not sealed");
    }

    function testPayloadBoundaries() public {
        recipient.register(target, bytes32(uint256(1)), hex"01", hex"02");
        sender.seal(
            target,
            keccak256("boundary"),
            address(recipient),
            1,
            new bytes(65_536),
            new bytes(4_096),
            bytes32(0)
        );

        (bool textSuccess,) = address(sender)
            .call(
                abi.encodeCall(
                    GibyeolActor.seal,
                    (
                        target,
                        keccak256("large text"),
                        address(recipient),
                        1,
                        new bytes(65_537),
                        bytes(""),
                        bytes32(0)
                    )
                )
            );
        require(!textSuccess, "large text accepted");

        (bool keySuccess,) = address(sender)
            .call(
                abi.encodeCall(
                    GibyeolActor.seal,
                    (
                        target,
                        keccak256("large key"),
                        address(recipient),
                        1,
                        bytes(""),
                        new bytes(4_097),
                        bytes32(0)
                    )
                )
            );
        require(!keySuccess, "large sealed key accepted");
    }

    function testFuzzSealsRandomLetterId(bytes32 letterId) public {
        recipient.register(target, bytes32(uint256(1)), hex"01", hex"02");
        sender.seal(target, letterId, address(recipient), 1, bytes(""), bytes(""), bytes32(0));
        require(target.sealedLetters(letterId), "random ID not sealed");
    }
}
