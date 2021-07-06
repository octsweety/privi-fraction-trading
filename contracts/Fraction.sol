//Contract based on https://docs.openzeppelin.com/contracts/3.x/erc721
// SPDX-License-Identifier: MIT
pragma solidity >0.6.0;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract Fraction is ERC20, Ownable {
    using Address for address;
    using SafeMath for uint256;

    // uint256 public initialSupply = uint256(10 ether); // 100,000,000
    address public minter;

    modifier whiteListed {
        require(msg.sender == owner() || msg.sender == minter, "!minter");
        _;
    }

    constructor() 
        ERC20("Fraction Token", "FRACTION") public
    {
        minter = msg.sender;
    }

    function setMinter(address _minter) external onlyOwner {
        minter = _minter;
    }

    function mint(address _recipient, uint _amount) external whiteListed {
        _mint(_recipient, _amount);
    }
}