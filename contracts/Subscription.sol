// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract Subscription {

    address public owner;
    address public manager;

    constructor(address _owner, address _manager){
        owner = _owner;
        manager = _manager;
    }
}
