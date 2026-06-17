// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title BicycleCollection
 * @dev 배달 자전거 도감 ERC-1155 스마트 컨트랙트
 */
contract BicycleCollection is ERC1155, Ownable {
    struct Bicycle {
        string name;
        string metadataURI;
        bool exists;
    }

    uint256 private _bicycleCounter;

    mapping(uint256 => Bicycle) public bicycles;

    event BicycleRegistered(uint256 indexed bicycleId, string name, string metadataURI);
    event BicycleMinted(address indexed player, uint256 indexed bicycleId, uint256 amount);

    constructor() ERC1155("") Ownable(msg.sender) {}

    function registerBicycle(
        string memory _name,
        string memory _metadataURI
    ) public onlyOwner {
        _bicycleCounter++;

        bicycles[_bicycleCounter] = Bicycle({
            name: _name,
            metadataURI: _metadataURI,
            exists: true
        });

        emit BicycleRegistered(_bicycleCounter, _name, _metadataURI);
    }

    function mintBicycle(
        address _player,
        uint256 _bicycleId,
        uint256 _amount
    ) public onlyOwner {
        require(bicycles[_bicycleId].exists, "Bicycle does not exist");

        _mint(_player, _bicycleId, _amount, "");

        emit BicycleMinted(_player, _bicycleId, _amount);
    }

    function hasBicycle(
        address _player,
        uint256 _bicycleId
    ) public view returns (bool) {
        return balanceOf(_player, _bicycleId) > 0;
    }

    function isRegistered(
        uint256 _bicycleId
    ) public view returns (bool) {
        return bicycles[_bicycleId].exists;
    }

    function getBicycleCount() public view returns (uint256) {
        return _bicycleCounter;
    }

    function uri(uint256 _bicycleId) public view override returns (string memory) {
        require(bicycles[_bicycleId].exists, "Bicycle does not exist");
        return bicycles[_bicycleId].metadataURI;
    }
}