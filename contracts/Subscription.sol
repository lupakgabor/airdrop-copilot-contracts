// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "hardhat/console.sol";


contract Subscription {
    
    address public owner;
    address public manager;

    mapping(address => uint32) public subscriptions; // Max value: 2106-02-07
    mapping(address => uint8) public discounts; // Value: 0-100

    uint64 public basePriceWei; // Max value: 18.44 Eth

    constructor(address _owner, address _manager) {
        owner = _owner;
        manager = _manager;
        basePriceWei = 0.05 ether;
    }

    function subscribe() public payable {
        uint64 userBasePrice = basePriceWei;
        if (discounts[msg.sender] > 0) {
            userBasePrice = basePriceWei * (100-discounts[msg.sender]) / 100;
        }

        require(msg.value >= userBasePrice, 'The sent amount is too low.');

        subscriptions[msg.sender] = uint32(block.timestamp) + 30 * 24 * 60 * 60; // 30 days
    }

    function changeManager(address newManager) public payable ownerOnly {
        manager = newManager;
    }

    function setBasePriceWei(uint64 newBasePriceWei) public payable managerOnly {
        basePriceWei = newBasePriceWei;
    }

    function addDiscount(address userAddress, uint8 discountPercentage) public payable managerOnly {
        discounts[userAddress] = discountPercentage;
    }

    modifier ownerOnly() {
        require(msg.sender == owner, "Only the owner can perform this action.");
        _;
    }

   modifier managerOnly() {
        require(msg.sender == manager, "Only the manager can perform this action.");
        _;
    }
}
