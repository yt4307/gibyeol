// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

contract Gibyeol2026 {
    uint8 public constant PROTOCOL_VERSION = 1;
    uint256 public constant MAX_ENCRYPTED_TEXT_BYTES = 65_536;
    uint256 public constant MAX_SEALED_KEY_BYTES = 4_096;

    uint64 public immutable UNLOCK_AT;
    uint64 public immutable UNLOCK_ROUND;
    bytes32 public immutable DRAND_CHAIN_HASH;
    bytes32 public immutable RECOVERY_PUBLIC_KEY;

    mapping(address owner => uint32 keyId) public currentKeyId;
    mapping(address owner => mapping(uint32 keyId => bytes32 publicKey)) public mailboxPublicKeys;
    mapping(address owner => bool active) public mailboxActive;
    mapping(bytes32 letterId => bool isSealed) public sealedLetters;

    error ZeroMailboxPublicKey();
    error MailboxKeyIdOverflow();
    error MailboxMissing();
    error MailboxAlreadyInactive();
    error ZeroRecipient();
    error LetterAlreadySealed(bytes32 letterId);
    error StaleRecipientKey(uint32 expectedKeyId, uint32 suppliedKeyId);
    error RecipientMailboxMissing(address recipient, uint32 keyId);
    error RecipientMailboxInactive(address recipient);
    error EncryptedTextTooLarge(uint256 suppliedLength);
    error SealedKeyTooLarge(uint256 suppliedLength);

    event MailboxKeyRegistered(address indexed owner, uint32 indexed keyId, bytes32 publicKey);
    event MailboxDeactivated(address indexed owner, uint32 indexed keyId);

    event LetterSealed(
        bytes32 indexed letterId,
        address indexed sender,
        address indexed recipient,
        uint32 recipientKeyId,
        bytes32 archiveSha256
    );

    constructor(
        uint64 unlockAt,
        uint64 unlockRound,
        bytes32 drandChainHash,
        bytes32 recoveryPublicKey
    ) {
        UNLOCK_AT = unlockAt;
        UNLOCK_ROUND = unlockRound;
        DRAND_CHAIN_HASH = drandChainHash;
        RECOVERY_PUBLIC_KEY = recoveryPublicKey;
    }

    function registerMailboxKey(
        bytes32 publicKey,
        bytes calldata passkeyEnvelope,
        bytes calldata recoveryEnvelope
    ) external {
        if (publicKey == bytes32(0)) revert ZeroMailboxPublicKey();

        uint32 previousKeyId = currentKeyId[msg.sender];
        if (previousKeyId == type(uint32).max) revert MailboxKeyIdOverflow();
        uint32 keyId = previousKeyId + 1;

        currentKeyId[msg.sender] = keyId;
        mailboxPublicKeys[msg.sender][keyId] = publicKey;
        mailboxActive[msg.sender] = true;

        // Envelope bytes intentionally remain only in immutable transaction calldata.
        passkeyEnvelope;
        recoveryEnvelope;
        emit MailboxKeyRegistered(msg.sender, keyId, publicKey);
    }

    function deactivateMailbox() external {
        uint32 keyId = currentKeyId[msg.sender];
        if (keyId == 0) revert MailboxMissing();
        if (!mailboxActive[msg.sender]) revert MailboxAlreadyInactive();

        mailboxActive[msg.sender] = false;
        emit MailboxDeactivated(msg.sender, keyId);
    }

    function sealLetter(
        bytes32 letterId,
        address recipient,
        uint32 recipientKeyId,
        bytes calldata encryptedText,
        bytes calldata sealedKey,
        bytes32 archiveSha256
    ) external {
        if (recipient == address(0)) revert ZeroRecipient();
        if (sealedLetters[letterId]) revert LetterAlreadySealed(letterId);

        uint32 activeKeyId = currentKeyId[recipient];
        if (!mailboxActive[recipient]) revert RecipientMailboxInactive(recipient);
        if (activeKeyId != recipientKeyId) {
            revert StaleRecipientKey(activeKeyId, recipientKeyId);
        }
        if (mailboxPublicKeys[recipient][recipientKeyId] == bytes32(0)) {
            revert RecipientMailboxMissing(recipient, recipientKeyId);
        }
        if (encryptedText.length > MAX_ENCRYPTED_TEXT_BYTES) {
            revert EncryptedTextTooLarge(encryptedText.length);
        }
        if (sealedKey.length > MAX_SEALED_KEY_BYTES) {
            revert SealedKeyTooLarge(sealedKey.length);
        }

        sealedLetters[letterId] = true;
        emit LetterSealed(letterId, msg.sender, recipient, recipientKeyId, archiveSha256);
    }
}
