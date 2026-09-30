// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @notice Fork-research-only Aave-funded atomic V4 execution probe.
/// @dev Not production code. No ProfitBot or deployment integration.
contract PolygonV4AaveExecutionProbe {
    struct PoolKey {
        address currency0;
        address currency1;
        uint24 fee;
        int24 tickSpacing;
        address hooks;
    }

    struct ExactInputSingleParams {
        PoolKey poolKey;
        bool zeroForOne;
        uint128 amountIn;
        uint128 amountOutMinimum;
        uint256 minHopPriceX36;
        bytes hookData;
    }

    struct V3ExactInputSingleParams {
        address tokenIn;
        address tokenOut;
        uint24 fee;
        address recipient;
        uint256 deadline;
        uint256 amountIn;
        uint256 amountOutMinimum;
        uint160 sqrtPriceLimitX96;
    }

    address public constant WPOL =
        0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270;

    address public constant DAI =
        0x8f3Cf7ad23Cd3CaDbD9735AFf958023239c6A063;

    address public constant APEPE =
        0xA3f751662e282E83EC3cBc387d225Ca56dD63D3A;

    address public constant V3_ROUTER =
        0xE592427A0AEce92De3Edee1F18E0157C05861564;

    address public constant V4_ROUTER =
        0xDc264714F68d84CF29BC605589405E78bDBE7C9f;

    address public constant PERMIT2 =
        0x000000000022D473030F116dDEE9F6B43aC78BA3;

    address public constant AAVE_PROVIDER =
        0xa97684ead0e402dC232d5A977953DF7ECBaB3CDb;

    address public immutable AAVE_POOL;

    uint256 public lastAmount;
    uint256 public lastPremium;
    uint256 public lastRouteOutput;
    uint256 public lastDebt;
    uint256 public lastProfitBeforeRepayment;

    uint24 public constant V3_FEE = 100;
    uint24 public constant V4_FEE = 10000;
    int24 public constant V4_TICK_SPACING = 100;

    uint256 public constant START_AMOUNT = 0.125 ether;

    uint8 private constant V4_SWAP = 0x10;

    uint8 private constant SWAP_EXACT_IN_SINGLE = 0x06;
    uint8 private constant SETTLE_ALL = 0x0c;
    uint8 private constant TAKE_ALL = 0x0f;

    address public immutable owner;

    constructor() {
        owner = msg.sender;

        AAVE_POOL =
            IAaveAddressesProvider(AAVE_PROVIDER).getPool();

        require(AAVE_POOL != address(0), "AAVE_POOL");
    }

    function initiateFlashloan()
        external
    {
        require(msg.sender == owner, "OWNER");

        IAavePool(AAVE_POOL).flashLoanSimple(
            address(this),
            WPOL,
            START_AMOUNT,
            bytes(""),
            0
        );
    }

    function executeOperation(
        address asset,
        uint256 amount,
        uint256 premium,
        address initiator,
        bytes calldata
    )
        external
        returns (bool)
    {
        require(msg.sender == AAVE_POOL, "POOL");
        require(initiator == address(this), "INITIATOR");
        require(asset == WPOL, "ASSET");
        require(amount == START_AMOUNT, "AMOUNT");

        lastAmount = amount;
        lastPremium = premium;

        (
            ,
            ,
            uint256 finalWpol
        ) = _executeRoute();

        uint256 debt = amount + premium;

        require(finalWpol > debt, "NO_NET_PROFIT");

        lastRouteOutput = finalWpol;
        lastDebt = debt;
        lastProfitBeforeRepayment =
            finalWpol - debt;

        _forceApprove(
            WPOL,
            AAVE_POOL,
            debt
        );

        return true;
    }

    function _executeRoute()
        internal
        returns (
            uint256 daiAfterEntry,
            uint256 apepeAfterV4,
            uint256 finalWpol
        )
    {

        uint256 startingWpol = IERC20(WPOL).balanceOf(address(this));
        require(startingWpol >= START_AMOUNT, "WPOL");

        // ------------------------------------------------------------
        // Leg 1: exact historical V3 WPOL -> DAI, fee 100.
        // ------------------------------------------------------------

        _forceApprove(WPOL, V3_ROUTER, START_AMOUNT);

        daiAfterEntry = IV3Router(V3_ROUTER).exactInputSingle(
            V3ExactInputSingleParams({
                tokenIn: WPOL,
                tokenOut: DAI,
                fee: V3_FEE,
                recipient: address(this),
                deadline: block.timestamp,
                amountIn: START_AMOUNT,
                amountOutMinimum: 0,
                sqrtPriceLimitX96: 0
            })
        );

        _forceApprove(WPOL, V3_ROUTER, 0);

        require(daiAfterEntry > 0, "ENTRY_ZERO");

        // ------------------------------------------------------------
        // Leg 2: V4 DAI -> APEPE.
        //
        // Universal Router's V4 payment path settles ERC20 debt via
        // Permit2. The harness therefore grants only the amount produced
        // by leg 1.
        // ------------------------------------------------------------

        _forceApprove(DAI, PERMIT2, daiAfterEntry);

        IPermit2(PERMIT2).approve(
            DAI,
            V4_ROUTER,
            uint160(daiAfterEntry),
            uint48(block.timestamp)
        );

        PoolKey memory key = PoolKey({
            currency0: DAI,
            currency1: APEPE,
            fee: V4_FEE,
            tickSpacing: V4_TICK_SPACING,
            hooks: address(0)
        });

        ExactInputSingleParams memory swapParams =
            ExactInputSingleParams({
                poolKey: key,
                zeroForOne: true,
                amountIn: uint128(daiAfterEntry),
                amountOutMinimum: 0,
                minHopPriceX36: 0,
                hookData: bytes("")
            });

        bytes memory actions = abi.encodePacked(
            SWAP_EXACT_IN_SINGLE,
            SETTLE_ALL,
            TAKE_ALL
        );

        bytes[] memory actionParams = new bytes[](3);

        actionParams[0] = abi.encode(swapParams);

        // Pay no more than the exact DAI received from leg 1.
        actionParams[1] = abi.encode(
            DAI,
            daiAfterEntry
        );

        // Take all APEPE credit. Zero minimum for measurement-only probe.
        actionParams[2] = abi.encode(
            APEPE,
            uint256(0)
        );

        bytes memory commands =
            abi.encodePacked(V4_SWAP);

        bytes[] memory inputs =
            new bytes[](1);

        inputs[0] =
            abi.encode(actions, actionParams);

        IUniversalRouter(V4_ROUTER).execute(
            commands,
            inputs,
            block.timestamp
        );

        // Remove Permit2 spending permission immediately after the V4 leg.
        IPermit2(PERMIT2).approve(
            DAI,
            V4_ROUTER,
            0,
            0
        );

        _forceApprove(DAI, PERMIT2, 0);

        apepeAfterV4 =
            IERC20(APEPE).balanceOf(address(this));

        require(apepeAfterV4 > 0, "V4_ZERO");

        // ------------------------------------------------------------
        // Leg 3: exact historical V3 APEPE -> WPOL, fee 100.
        // ------------------------------------------------------------

        _forceApprove(
            APEPE,
            V3_ROUTER,
            apepeAfterV4
        );

        IV3Router(V3_ROUTER).exactInputSingle(
            V3ExactInputSingleParams({
                tokenIn: APEPE,
                tokenOut: WPOL,
                fee: V3_FEE,
                recipient: address(this),
                deadline: block.timestamp,
                amountIn: apepeAfterV4,
                amountOutMinimum: 0,
                sqrtPriceLimitX96: 0
            })
        );

        _forceApprove(APEPE, V3_ROUTER, 0);

        finalWpol =
            IERC20(WPOL).balanceOf(address(this));

        require(
            finalWpol > startingWpol,
            "NOT_PROFITABLE"
        );
    }

    function _forceApprove(
        address token,
        address spender,
        uint256 amount
    ) internal {
        require(
            IERC20(token).approve(spender, 0),
            "APPROVE_RESET"
        );

        if (amount != 0) {
            require(
                IERC20(token).approve(
                    spender,
                    amount
                ),
                "APPROVE"
            );
        }
    }
}

interface IERC20 {
    function balanceOf(address account)
        external
        view
        returns (uint256);

    function approve(
        address spender,
        uint256 amount
    )
        external
        returns (bool);

    function transfer(
        address recipient,
        uint256 amount
    )
        external
        returns (bool);
}

interface IWPol is IERC20 {
    function deposit() external payable;
}

interface IV3Router {
    function exactInputSingle(
        PolygonV4AaveExecutionProbe.V3ExactInputSingleParams calldata params
    )
        external
        payable
        returns (uint256 amountOut);
}

interface IUniversalRouter {
    function execute(
        bytes calldata commands,
        bytes[] calldata inputs,
        uint256 deadline
    )
        external
        payable;
}

interface IPermit2 {
    function approve(
        address token,
        address spender,
        uint160 amount,
        uint48 expiration
    )
        external;
}


interface IAaveAddressesProvider {
    function getPool()
        external
        view
        returns (address);
}

interface IAavePool {
    function flashLoanSimple(
        address receiverAddress,
        address asset,
        uint256 amount,
        bytes calldata params,
        uint16 referralCode
    )
        external;
}
