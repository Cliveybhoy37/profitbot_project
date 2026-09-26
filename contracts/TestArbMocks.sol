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
contract TestFeeOnTransferToken is ERC20 {
    constructor() ERC20("FeeToken", "FEE") {}

    function mint(address recipient, uint256 amount) external {
        _mint(recipient, amount);
    }

    function _transfer(
        address sender,
        address recipient,
        uint256 amount
    ) internal override {
        uint256 fee = amount / 100;
        super._transfer(sender, recipient, amount - fee);
        _burn(sender, fee);
    }
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

contract TestV3Router {
    struct ExactInputSingleParams {
        address tokenIn;
        address tokenOut;
        uint24 fee;
        address recipient;
        uint256 deadline;
        uint256 amountIn;
        uint256 amountOutMinimum;
        uint160 sqrtPriceLimitX96;
    }

    uint256 public ratioBps;

    constructor(uint256 ratio_) {
        ratioBps = ratio_;
    }

    function exactInputSingle(
        ExactInputSingleParams calldata params
    ) external payable returns (uint256 amountOut) {
        amountOut = params.amountIn * ratioBps / 10000;
        require(amountOut >= params.amountOutMinimum, "slippage");
        IERC20(params.tokenIn).transferFrom(
            msg.sender,
            address(this),
            params.amountIn
        );
        IERC20(params.tokenOut).transfer(params.recipient, amountOut);
    }
}

import { IVault } from "../lib/balancer-v2/pkg/interfaces/contracts/vault/IVault.sol";

contract TestBalancerVault {
    uint256 public ratioBps;

    constructor(uint256 ratio_) {
        ratioBps = ratio_;
    }

    function swap(
        IVault.SingleSwap memory singleSwap,
        IVault.FundManagement memory funds,
        uint256 limit,
        uint256 deadline
    ) external payable returns (uint256 amountOut) {
        require(
            singleSwap.kind == IVault.SwapKind.GIVEN_IN,
            "unsupported swap kind"
        );
        require(block.timestamp <= deadline, "expired");

        amountOut = singleSwap.amount * ratioBps / 10000;
        require(amountOut >= limit, "slippage");

        address tokenIn = address(singleSwap.assetIn);
        address tokenOut = address(singleSwap.assetOut);

        IERC20(tokenIn).transferFrom(
            funds.sender,
            address(this),
            singleSwap.amount
        );

        IERC20(tokenOut).transfer(
            funds.recipient,
            amountOut
        );
    }
}

contract TestFalseReturnToken {
    mapping(address => uint256) public balanceOf;

    function mint(address recipient, uint256 amount) external {
        balanceOf[recipient] += amount;
    }

    function transfer(address, uint256) external pure returns (bool) {
        return false;
    }
}

contract TestGasConsumingOwner {
    uint256 public received;

    receive() external payable {
        received += msg.value;
    }

    function withdrawEtherFrom(address bot) external {
        (bool success, ) = bot.call(
            abi.encodeWithSignature("withdrawEther()")
        );
        require(success, "withdraw failed");
    }
}
