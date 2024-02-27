// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "hardhat/console.sol";


contract Subscription {
    address public owner;
    address public manager;

    enum TIER_TYPE {BASIC, PRO, LIFETIME_BASIC, LIFETIME_PRO} // Values: 0,1,2,3

    struct TIER {
        uint64 priceWei;  // Max value: 18.44 Eth
        uint32 additionalDuration; // In seconds
    }

    struct UserSubscription {
        TIER_TYPE tierType;
        uint32 validity;
    }

    mapping(TIER_TYPE => TIER) public tiers;
    mapping(address => UserSubscription) public subscriptions; // Max value: 2106-02-07
    mapping(address => uint8) public discounts; // Value: 0-100

    constructor(address _owner, address _manager) {
        owner = _owner;
        manager = _manager;

        tiers[TIER_TYPE.BASIC] = TIER({priceWei: 0.05 ether, additionalDuration: 30 * 24 * 60 * 60}); // 30 days
        tiers[TIER_TYPE.PRO] = TIER({priceWei: 0.25 ether, additionalDuration: 30 * 24 * 60 * 60}); // 30 days
        tiers[TIER_TYPE.LIFETIME_BASIC] = TIER({priceWei: 1.25 ether, additionalDuration: 10 * 12 * 30 * 24 * 60 * 60}); // 10 years
        tiers[TIER_TYPE.LIFETIME_PRO] = TIER({priceWei: 4 ether, additionalDuration: 10 * 12 * 30 * 24 * 60 * 60}); // 10 years
    }

    function isSubscriptionActive(address userAddress) public view returns (bool) {
        return uint32(block.timestamp) < subscriptions[userAddress].validity;
    }

    function calculateDiscount(uint64 userPrice, uint8 discount) pure public returns (uint64) {
        return userPrice / 100 * (100 - discount);
    }

    function subscribe(TIER_TYPE _tierType) public payable {
        TIER memory tier = tiers[_tierType];
        uint64 userPrice = tier.priceWei;
        if (discounts[msg.sender] > 0) {
            userPrice = calculateDiscount(userPrice, discounts[msg.sender]);
        }

        require(msg.value == userPrice, 'The sent amount is not correct.');

        uint32 initialTime = uint32(block.timestamp);

        if (isSubscriptionActive(msg.sender)) {
            initialTime = subscriptions[msg.sender].validity;
        }

        subscriptions[msg.sender] = UserSubscription({
            tierType: _tierType,
            validity: initialTime + tier.additionalDuration
        });
    }

    function changeManager(address newManager) public ownerOnly {
        manager = newManager;
    }

    function setTierPriceWei(TIER_TYPE tierType, uint64 newBasePriceWei) public managerOnly {
        tiers[tierType].priceWei = newBasePriceWei;
    }

    function setTierAdditionalDuration(TIER_TYPE tierType, uint32 additionalDuration) public managerOnly {
        tiers[tierType].additionalDuration = additionalDuration;
    }

    function addDiscount(address userAddress, uint8 discountPercentage) public managerOnly {
        discounts[userAddress] = discountPercentage;
    }

    function gatherDeposit(uint256 amount) public managerOnly {
        require(amount <= address(this).balance, 'The given amount is greater than the balance.');
        payable(owner).transfer(amount);
    }

    function setSubscription(address _address, TIER_TYPE _tierType, uint32 _validity) public managerOnly {
        subscriptions[_address] = UserSubscription({
            tierType: _tierType,
            validity: _validity
        });
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
