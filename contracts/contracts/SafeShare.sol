// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";

contract SafeShare is AccessControl, Pausable {
    bytes32 public constant VERIFIED_ROLE = keccak256("VERIFIED_ROLE");
    uint256 public constant STARTING_CREDITS = 100;
    uint256 public constant LATE_PENALTY_BPS = 2500; // 25% of deposit

    enum Status { Available, Requested, Approved, CheckedOut, ReturnPending, Disputed, Retired }

    struct Resource {
        uint256 id;
        address owner;
        address borrower;
        bytes32 metadataHash;
        bytes32 imageHash;
        uint256 deposit;
        uint8 condition;
        uint8 conditionBefore;
        uint64 durationSecs;
        uint64 dueDate;
        Status status;
    }

    struct Stats {
        uint32 completed;
        uint32 onTime;
        uint32 damaged;
        uint32 disputesLost;
        uint32 lent;
        uint32 careCount;
        uint32 careSum;
    }

    uint256 public resourceCount;
    mapping(uint256 => Resource) public resources;
    mapping(address => Stats) public stats;
    mapping(address => uint256) public credits;
    mapping(address => bool) public blacklisted;

    event UserVerified(address indexed user, uint256 credits);
    event UserRevoked(address indexed user);
    event UserBlacklisted(address indexed user, bool status);
    event ResourceRegistered(uint256 indexed id, address indexed owner, bytes32 metadataHash, bytes32 imageHash, uint256 deposit, uint8 condition);
    event ResourceRequested(uint256 indexed id, address indexed borrower, uint64 durationSecs);
    event RequestCancelled(uint256 indexed id, address indexed borrower);
    event RequestRejected(uint256 indexed id, address indexed borrower);
    event RequestApproved(uint256 indexed id, address indexed borrower);
    event CheckedOut(uint256 indexed id, address indexed borrower, uint8 conditionBefore, uint64 dueDate);
    event ReturnInitiated(uint256 indexed id, address indexed borrower);
    event ReturnConfirmed(uint256 indexed id, address indexed borrower, uint8 conditionAfter, uint8 careRating, bool late, bool damaged, uint256 refunded, uint256 slashed);
    event DisputeRaised(uint256 indexed id, address indexed by);
    event DisputeResolved(uint256 indexed id, uint256 borrowerRefundBps);
    event ResourceRetired(uint256 indexed id);

    constructor(address admin) {
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(VERIFIED_ROLE, admin);
    }

    modifier onlyVerified() {
        require(hasRole(VERIFIED_ROLE, msg.sender), "Not verified");
        require(!blacklisted[msg.sender], "Blacklisted");
        _;
    }

    modifier validId(uint256 id) {
        require(id > 0 && id <= resourceCount, "Invalid resource id");
        _;
    }

    // ---------- admin ----------
    function verifyUser(address user) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(!hasRole(VERIFIED_ROLE, user), "Already verified");
        _grantRole(VERIFIED_ROLE, user);
        credits[user] += STARTING_CREDITS;
        emit UserVerified(user, STARTING_CREDITS);
    }

    function revokeUser(address user) external onlyRole(DEFAULT_ADMIN_ROLE) {
        _revokeRole(VERIFIED_ROLE, user);
        emit UserRevoked(user);
    }

    function setBlacklist(address user, bool status) external onlyRole(DEFAULT_ADMIN_ROLE) {
        blacklisted[user] = status;
        emit UserBlacklisted(user, status);
    }

    function grantCredits(address user, uint256 amount) external onlyRole(DEFAULT_ADMIN_ROLE) {
        credits[user] += amount;
    }

    function pause() external onlyRole(DEFAULT_ADMIN_ROLE) { _pause(); }
    function unpause() external onlyRole(DEFAULT_ADMIN_ROLE) { _unpause(); }

    // ---------- lifecycle ----------
    function registerResource(bytes32 metadataHash, bytes32 imageHash, uint256 deposit, uint8 condition)
        external onlyVerified whenNotPaused returns (uint256 id)
    {
        require(condition >= 1 && condition <= 5, "Bad condition");
        id = ++resourceCount;
        resources[id] = Resource(id, msg.sender, address(0), metadataHash, imageHash, deposit, condition, 0, 0, 0, Status.Available);
        emit ResourceRegistered(id, msg.sender, metadataHash, imageHash, deposit, condition);
    }

    function requestResource(uint256 id, uint64 durationHours)
        external onlyVerified whenNotPaused validId(id)
    {
        Resource storage r = resources[id];
        require(r.status == Status.Available, "Not available");
        require(r.owner != msg.sender, "Owner cannot borrow own item");
        require(durationHours > 0 && durationHours <= 24 * 30, "Bad duration");
        require(credits[msg.sender] >= r.deposit, "Insufficient credits");

        credits[msg.sender] -= r.deposit;
        r.borrower = msg.sender;
        r.durationSecs = durationHours * 1 hours;
        r.status = Status.Requested;
        emit ResourceRequested(id, msg.sender, r.durationSecs);
    }

    function cancelRequest(uint256 id) external validId(id) {
        Resource storage r = resources[id];
        require(r.borrower == msg.sender, "Not borrower");
        require(r.status == Status.Requested || r.status == Status.Approved, "Cannot cancel now");
        _resetAndRefund(r);
        emit RequestCancelled(id, msg.sender);
    }

    function rejectRequest(uint256 id) external validId(id) {
        Resource storage r = resources[id];
        require(r.owner == msg.sender, "Not owner");
        require(r.status == Status.Requested, "No pending request");
        address b = r.borrower;
        _resetAndRefund(r);
        emit RequestRejected(id, b);
    }

    function approveRequest(uint256 id) external whenNotPaused validId(id) {
        Resource storage r = resources[id];
        require(r.owner == msg.sender, "Not owner");
        require(r.status == Status.Requested, "No pending request");
        r.status = Status.Approved;
        emit RequestApproved(id, r.borrower);
    }

    function confirmCheckout(uint256 id, uint8 conditionBefore) external whenNotPaused validId(id) {
        Resource storage r = resources[id];
        require(r.owner == msg.sender, "Not owner");
        require(r.status == Status.Approved, "Not approved");
        require(conditionBefore >= 1 && conditionBefore <= 5, "Bad condition");
        r.conditionBefore = conditionBefore;
        r.status = Status.CheckedOut;
        r.dueDate = uint64(block.timestamp) + r.durationSecs;
        emit CheckedOut(id, r.borrower, conditionBefore, r.dueDate);
    }

    function returnResource(uint256 id) external validId(id) {
        Resource storage r = resources[id];
        require(r.borrower == msg.sender, "Not borrower");
        require(r.status == Status.CheckedOut, "Not checked out");
        r.status = Status.ReturnPending;
        emit ReturnInitiated(id, msg.sender);
    }

    function confirmReturn(uint256 id, uint8 conditionAfter, uint8 careRating) external validId(id) {
        Resource storage r = resources[id];
        require(r.owner == msg.sender, "Not owner");
        require(r.status == Status.CheckedOut || r.status == Status.ReturnPending, "Nothing to confirm");
        require(conditionAfter >= 1 && conditionAfter <= 5, "Bad condition");
        require(careRating >= 1 && careRating <= 5, "Bad rating");

        address borrower = r.borrower;
        bool late = block.timestamp > r.dueDate;
        bool damaged = uint256(conditionAfter) + 2 <= r.conditionBefore;

        uint256 slashed = damaged ? r.deposit : (late ? (r.deposit * LATE_PENALTY_BPS) / 10000 : 0);
        uint256 refund = r.deposit - slashed;

        Stats storage s = stats[borrower];
        s.completed++;
        if (!late) s.onTime++;
        if (damaged) s.damaged++;
        s.careSum += careRating;
        s.careCount++;
        stats[msg.sender].lent++;

        credits[borrower] += refund;
        credits[msg.sender] += slashed;

        r.condition = conditionAfter;
        r.borrower = address(0);
        r.dueDate = 0;
        r.durationSecs = 0;
        r.status = Status.Available;

        emit ReturnConfirmed(id, borrower, conditionAfter, careRating, late, damaged, refund, slashed);
    }

    // ---------- disputes ----------
    function raiseDispute(uint256 id) external validId(id) {
        Resource storage r = resources[id];
        require(msg.sender == r.owner || msg.sender == r.borrower, "Not a party");
        require(r.status == Status.CheckedOut || r.status == Status.ReturnPending, "Cannot dispute now");
        r.status = Status.Disputed;
        emit DisputeRaised(id, msg.sender);
    }

    function resolveDispute(uint256 id, uint256 borrowerRefundBps)
        external onlyRole(DEFAULT_ADMIN_ROLE) validId(id)
    {
        Resource storage r = resources[id];
        require(r.status == Status.Disputed, "Not disputed");
        require(borrowerRefundBps <= 10000, "Bad bps");

        uint256 toBorrower = (r.deposit * borrowerRefundBps) / 10000;
        credits[r.borrower] += toBorrower;
        credits[r.owner] += r.deposit - toBorrower;

        if (borrowerRefundBps >= 5000) stats[r.owner].disputesLost++;
        else stats[r.borrower].disputesLost++;

        r.borrower = address(0);
        r.dueDate = 0;
        r.durationSecs = 0;
        r.status = Status.Available;
        emit DisputeResolved(id, borrowerRefundBps);
    }

    function retireResource(uint256 id) external validId(id) {
        Resource storage r = resources[id];
        require(r.owner == msg.sender, "Not owner");
        require(r.status == Status.Available, "Must be available");
        r.status = Status.Retired;
        emit ResourceRetired(id);
    }

    function _resetAndRefund(Resource storage r) internal {
        credits[r.borrower] += r.deposit;
        r.borrower = address(0);
        r.durationSecs = 0;
        r.status = Status.Available;
    }
}