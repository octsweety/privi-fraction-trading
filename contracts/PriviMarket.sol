//SPDX-License-Identifier: Unlicense
pragma solidity >0.6.0;
pragma experimental ABIEncoderV2;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/SafeERC20.sol";
import "@openzeppelin/contracts/math/SafeMath.sol";
import "@openzeppelin/contracts/utils/EnumerableSet.sol";

contract PriviMarket is Ownable {
    using SafeMath for uint256;
    using SafeERC20 for IERC20;
    using EnumerableSet for EnumerableSet.AddressSet;
    using EnumerableSet for EnumerableSet.UintSet;

    struct Order {
        uint256 id;
        address holder;
        uint256 amount;
        uint256 price;
    }

    mapping(uint256 => Order) public buyOrderMap;
    mapping(uint256 => Order) public sellOrderMap;
    EnumerableSet.UintSet buyOrders;
    EnumerableSet.UintSet sellOrders;

    mapping(address => uint256) holderMap;
    EnumerableSet.AddressSet holders;

    IERC20 public currency;
    IERC20 public fraction;

    uint256 public totalSupply;

    modifier checkOrder(uint256 _orderId, bool _flag) {
        _flag
            ? require(
                sellOrders.contains(_orderId) &&
                    sellOrderMap[_orderId].holder == msg.sender,
                "!available order"
            )
            : require(
                buyOrders.contains(_orderId) &&
                    buyOrderMap[_orderId].holder == msg.sender,
                "!available order"
            );
        _;
    }

    constructor(address _fraction, address _currency) public {
        currency = IERC20(_currency);
        fraction = IERC20(_fraction);
    }

    function fractionaliseToken(uint256 _amount, uint256 _initialPrice)
        external
        onlyOwner
    {
        fraction.safeTransferFrom(msg.sender, address(this), _amount);

        uint256 orderId = block.number;
        sellOrderMap[orderId].id = orderId;
        sellOrderMap[orderId].holder = msg.sender;
        sellOrderMap[orderId].amount = _amount;
        sellOrderMap[orderId].price = _initialPrice;

        sellOrders.add(orderId);
        totalSupply += _amount;
        _addHolder(address(this), _amount);
    }

    // true: Sell, false: Buy
    function newOrder(
        uint256 _amount,
        uint256 _wantPrice,
        bool _flag
    ) external {
        // Add order
        if (_flag == true) {
            // Transfer fraction from seller to market
            fraction.safeTransferFrom(msg.sender, address(this), _amount);

            uint256 orderId = block.number;
            sellOrderMap[orderId].id = orderId;
            sellOrderMap[orderId].holder = msg.sender;
            sellOrderMap[orderId].price = _wantPrice;
            sellOrderMap[orderId].amount = _amount;

            sellOrders.add(orderId);
            _removeHolder(msg.sender, _amount);
            _addHolder(address(this), _amount);
        } else {
            // Transfer fund from buyer to market
            currency.safeTransferFrom(
                msg.sender,
                address(this),
                _wantPrice.mul(_amount)
            );

            uint256 orderId = block.number;
            buyOrderMap[orderId].id = orderId;
            buyOrderMap[orderId].holder = msg.sender;
            buyOrderMap[orderId].price = _wantPrice;
            buyOrderMap[orderId].amount = _amount;

            buyOrders.add(orderId);
        }
    }

    function buyFraction(uint256 _orderId) external {
        require(sellOrders.contains(_orderId), "doesn't exist in sell orders");

        Order storage order = sellOrderMap[_orderId];
        uint256 beforeBalance = currency.balanceOf(address(this));
        currency.safeTransferFrom(
            msg.sender,
            address(this),
            order.price.mul(order.amount)
        );
        uint256 amount = currency.balanceOf(address(this)).sub(beforeBalance);

        // Transfer payment to sell order holder
        currency.safeTransfer(order.holder, amount);

        // Transfer fraction from market to buyer
        fraction.safeTransfer(msg.sender, order.amount);

        delete sellOrderMap[_orderId];
        sellOrders.remove(_orderId);
        _addHolder(msg.sender, order.amount);
        _removeHolder(address(this), order.amount);
    }

    function sellFraction(uint256 _orderId) external {
        require(buyOrders.contains(_orderId), "doesn't exist in buy orders");

        Order storage order = buyOrderMap[_orderId];
        fraction.safeTransferFrom(msg.sender, address(this), order.amount);

        // Transfer payment to seller
        uint256 amount = order.amount.mul(order.price);
        if (amount > currency.balanceOf(address(this)))
            amount = currency.balanceOf(address(this));
        currency.safeTransfer(msg.sender, amount);

        // Transfer fraction from market to buy order holder
        fraction.safeTransfer(order.holder, order.amount);

        delete buyOrderMap[_orderId];
        buyOrders.remove(_orderId);
        _addHolder(order.holder, order.amount);
        _removeHolder(msg.sender, order.amount);
    }

    function removeSellOrder(uint256 _orderId)
        external
        checkOrder(_orderId, true)
    {
        Order storage order = sellOrderMap[_orderId];
        fraction.safeTransfer(msg.sender, order.amount);

        _addHolder(msg.sender, order.amount);
        _removeHolder(address(this), order.amount);

        delete sellOrderMap[_orderId];
        sellOrders.remove(_orderId);
    }

    function removeBuyOrder(uint256 _orderId)
        external
        checkOrder(_orderId, false)
    {
        Order storage order = buyOrderMap[_orderId];
        uint256 amount = order.price.mul(order.amount);
        if (amount > currency.balanceOf(address(this)))
            amount = currency.balanceOf(address(this));
        currency.safeTransfer(msg.sender, amount);

        delete buyOrderMap[_orderId];
        buyOrders.remove(_orderId);
    }

    function buybackFraction() external onlyOwner {}

    function _addHolder(address _holder, uint256 _amount) internal {
        holderMap[_holder] += _amount;
        if (!holders.contains(_holder)) holders.add(_holder);
    }

    function _removeHolder(address _holder, uint256 _amount) internal {
        if (holderMap[_holder] > _amount) {
            holderMap[_holder] -= _amount;
        } else {
            delete holderMap[_holder];
            holders.remove(_holder);
        }
    }

    function sellOrderCount() external view returns (uint) {
        return sellOrders.length();
    }

    function getSellOrders() external view returns(Order[] memory) {
        Order[] memory orders = new Order[](sellOrders.length());
        for (uint i = 0; i < sellOrders.length(); i++) {
            orders[i] = sellOrderMap[sellOrders.at(i)];
        }
        return orders;
    }

    function buyOrderCount() external view returns (uint) {
        return buyOrders.length();
    }

    function getBuyOrders() external view returns(Order[] memory) {
        Order[] memory orders = new Order[](buyOrders.length());
        for (uint i = 0; i < buyOrders.length(); i++) {
            orders[i] = buyOrderMap[buyOrders.at(i)];
        }
        return orders;
    }
}
