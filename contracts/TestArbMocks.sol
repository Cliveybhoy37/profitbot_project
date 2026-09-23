// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
interface IReceiverMock {
    function executeOperation(address,uint256,uint256,address,bytes calldata) external returns (bool);
}
contract TestToken is ERC20 {
    constructor(string memory name_) ERC20(name_, name_) {}
    function mint(address recipient, uint256 amount) external { _mint(recipient, amount); }
}
contract TestPool {
    uint256 public premium = 9;
    function flashLoanSimple(address receiver, address asset, uint256 amount, bytes calldata params, uint16) external {
        uint256 fee = (amount * premium + 9999) / 10000;
        IERC20(asset).transfer(receiver, amount);
        require(IReceiverMock(receiver).executeOperation(asset, amount, fee, msg.sender == receiver ? receiver : msg.sender, params), "callback failed");
        IERC20(asset).transferFrom(receiver, address(this), amount + fee);
    }
    function invoke(address receiver,address asset,uint256 amount,uint256 fee,bytes calldata params) external {
        IERC20(asset).transfer(receiver,amount);
        require(IReceiverMock(receiver).executeOperation(asset,amount,fee,receiver,params),"callback failed");
        IERC20(asset).transferFrom(receiver,address(this),amount+fee);
    }
}
contract TestProvider {
    address public immutable pool;
    constructor(address pool_) { pool = pool_; }
    function getPool() external view returns (address) { return pool; }
}
contract TestRouter {
    uint256 public ratioBps;
    constructor(uint256 ratio_) { ratioBps=ratio_; }
    function getAmountsOut(uint256 amount, address[] calldata path) external view returns(uint256[] memory amounts) {
        amounts = new uint256[](path.length);
        amounts[0]=amount;
        for(uint i=1;i<path.length;i++) amounts[i]=amounts[i-1]*ratioBps/10000;
    }
    function swapExactTokensForTokensSupportingFeeOnTransferTokens(
        uint256 amount, uint256 minimum, address[] calldata path, address to, uint256) external {
        uint256 out = amount*ratioBps/10000;
        require(out >= minimum,"slippage");
        IERC20(path[0]).transferFrom(msg.sender,address(this),amount);
        IERC20(path[path.length-1]).transfer(to,out);
    }
}
