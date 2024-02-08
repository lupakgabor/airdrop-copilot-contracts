// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "hardhat/console.sol";

contract Subscription {
    enum DiscountType {PERCENTAGE, FIXED}

    struct Discount {
        uint8 value; // TODO: consider uint8 type is a good choice here
        DiscountType discountType;
    }

    address public owner;
    address public manager;

    mapping(address => uint32) public subscriptions;
    mapping(address => Discount) public discounts;

    constructor(address _owner, address _manager) {
        owner = _owner;
        manager = _manager;
    }

    function subscribe() public payable {
        require(msg.value >= 0.01 ether, 'The sent amount is too low.');

        subscriptions[msg.sender] = uint32(block.timestamp) + 30 * 24 * 60 * 60; // 30 days
    }

    function changeManager(address newManager) public payable ownerOnly {
        manager = newManager;
    }

    modifier ownerOnly() {
        require(msg.sender == owner, "Only the owner can perform this action.");
        _;
    }
}
