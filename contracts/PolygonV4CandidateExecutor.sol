// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @notice Isolated fork-stage candidate-driven Aave V3/V4 executor.
/// @dev Not production-integrated. Supports exactly three V3/V4 legs.
contract PolygonV4CandidateExecutor {
    enum Venue {
        QUICKSWAP_V2,
        SUSHISWAP_V2,
        UNISWAP_V3,
        BALANCER_V2,
        UNISWAP_V4
    }

    struct SwapLeg {
        Venue venue;
        address tokenIn;
        address tokenOut;
        uint256 minAmountOut;
        bytes venueData;
    }

    struct ExecutionPlan {
        uint256 deadline;
        uint256 minimumProfit;
        SwapLeg[] legs;
    }

    struct PoolKey {
        address currency0;
        address currency1;
        uint24 fee;
        int24 tickSpacing;
        address hooks;
    }

    struct V4VenueData {
        address currency0;
        address currency1;
        uint24 fee;
        int24 tickSpacing;
        address hooks;
        bool zeroForOne;
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

    address public constant V3_ROUTER =
        0xE592427A0AEce92De3Edee1F18E0157C05861564;

    address public constant V4_ROUTER =
        0xDc264714F68d84CF29BC605589405E78bDBE7C9f;

    address public constant PERMIT2 =
        0x000000000022D473030F116dDEE9F6B43aC78BA3;

    address public constant AAVE_PROVIDER =
        0xa97684ead0e402dC232d5A977953DF7ECBaB3CDb;

    uint8 private constant V4_SWAP = 0x10;
    uint8 private constant SWAP_EXACT_IN_SINGLE = 0x06;
    uint8 private constant SETTLE_ALL = 0x0c;
    uint8 private constant TAKE_ALL = 0x0f;

    address public immutable owner;
    address public immutable AAVE_POOL;

    uint256 public lastAmount;
    uint256 public lastPremium;
    uint256 public lastRouteOutput;
    uint256 public lastDebt;
    uint256 public lastProfitBeforeRepayment;

    constructor() {
        owner = msg.sender;

        AAVE_POOL =
            IAaveAddressesProviderCandidate(AAVE_PROVIDER).getPool();

        require(AAVE_POOL != address(0), "AAVE_POOL");
    }

    function initiateFlashloan(
        address token,
        uint256 amount,
        bytes calldata params
    )
        external
    {
        require(msg.sender == owner, "OWNER");
        require(token != address(0), "TOKEN");
        require(amount > 0, "AMOUNT");

        ExecutionPlan memory plan =
            abi.decode(params, (ExecutionPlan));

        // Fail closed before requesting the flashloan.
        _validatePlan(plan, token);

        IAavePoolCandidate(AAVE_POOL).flashLoanSimple(
            address(this),
            token,
            amount,
            params,
            0
        );
    }

    function executeOperation(
        address asset,
        uint256 amount,
        uint256 premium,
        address initiator,
        bytes calldata params
    )
        external
        returns (bool)
    {
        require(msg.sender == AAVE_POOL, "POOL");
        require(initiator == address(this), "INITIATOR");
        require(asset != address(0), "ASSET");
        require(amount > 0, "AMOUNT");

        ExecutionPlan memory plan =
            abi.decode(params, (ExecutionPlan));

        // Revalidate at the callback security boundary.
        _validatePlan(plan, asset);

        SwapLeg[] memory legs =
            plan.legs;

        uint256 balanceAtCallback =
            IERC20Candidate(asset).balanceOf(address(this));

        require(
            balanceAtCallback >= amount,
            "LOAN_NOT_RECEIVED"
        );

        uint256 startingAsset =
            balanceAtCallback - amount;

        lastAmount = amount;
        lastPremium = premium;

        uint256 currentAmount = amount;

        for (uint256 i = 0; i < legs.length; i++) {
            currentAmount =
                _executeLeg(legs[i], currentAmount);

            require(
                currentAmount >= legs[i].minAmountOut,
                "OUTPUT_BELOW_MIN"
            );
        }

        uint256 debt = amount + premium;

        uint256 finalBalance =
            IERC20Candidate(asset).balanceOf(address(this));

        require(
            finalBalance >= startingAsset + debt,
            "DEBT_NOT_COVERED"
        );

        uint256 incrementalOutput =
            finalBalance - startingAsset;

        uint256 incrementalProfit =
            incrementalOutput - debt;

        require(
            incrementalProfit >= plan.minimumProfit,
            "PROFIT_BELOW_MINIMUM"
        );

        lastRouteOutput = incrementalOutput;
        lastDebt = debt;
        lastProfitBeforeRepayment =
            incrementalProfit;

        _forceApprove(
            asset,
            AAVE_POOL,
            debt
        );

        return true;
    }

    function _validatePlan(
        ExecutionPlan memory plan,
        address asset
    )
        internal
        view
    {
        require(
            plan.deadline >= block.timestamp,
            "PLAN_EXPIRED"
        );

        require(
            plan.minimumProfit > 0,
            "MIN_PROFIT_ZERO"
        );

        _validateRoute(
            plan.legs,
            asset
        );
    }

    function _validateRoute(
        SwapLeg[] memory legs,
        address asset
    )
        internal
        pure
    {
        require(legs.length == 3, "THREE_LEGS");
        require(legs[0].tokenIn == asset, "START_ASSET");
        require(legs[2].tokenOut == asset, "CLOSE_ASSET");

        for (uint256 i = 0; i < legs.length; i++) {
            require(
                legs[i].tokenIn != address(0) &&
                legs[i].tokenOut != address(0),
                "TOKEN_ZERO"
            );

            require(
                legs[i].tokenIn != legs[i].tokenOut,
                "SELF_SWAP"
            );

            require(
                legs[i].minAmountOut > 0,
                "MIN_OUT_ZERO"
            );

            if (i > 0) {
                require(
                    legs[i - 1].tokenOut ==
                    legs[i].tokenIn,
                    "NOT_CONTIGUOUS"
                );
            }

            if (legs[i].venue == Venue.UNISWAP_V3) {
                uint24 fee =
                    abi.decode(
                        legs[i].venueData,
                        (uint24)
                    );

                require(fee > 0, "V3_FEE");
            } else if (
                legs[i].venue == Venue.UNISWAP_V4
            ) {
                V4VenueData memory data =
                    abi.decode(
                        legs[i].venueData,
                        (V4VenueData)
                    );

                require(
                    data.currency0 != address(0) &&
                    data.currency1 != address(0),
                    "V4_CURRENCY"
                );

                require(
                    data.currency0 != data.currency1,
                    "V4_SAME_CURRENCY"
                );

                require(data.fee > 0, "V4_FEE");

                require(
                    data.tickSpacing > 0,
                    "V4_TICK"
                );

                address expectedIn =
                    data.zeroForOne
                        ? data.currency0
                        : data.currency1;

                address expectedOut =
                    data.zeroForOne
                        ? data.currency1
                        : data.currency0;

                require(
                    expectedIn == legs[i].tokenIn &&
                    expectedOut == legs[i].tokenOut,
                    "V4_DIRECTION"
                );
            } else {
                revert("VENUE_NOT_ENABLED");
            }
        }
    }

    function _executeLeg(
        SwapLeg memory leg,
        uint256 amountIn
    )
        internal
        returns (uint256 amountOut)
    {
        if (leg.venue == Venue.UNISWAP_V3) {
            uint24 fee =
                abi.decode(
                    leg.venueData,
                    (uint24)
                );

            _forceApprove(
                leg.tokenIn,
                V3_ROUTER,
                amountIn
            );

            amountOut =
                IV3RouterCandidate(V3_ROUTER)
                    .exactInputSingle(
                        V3ExactInputSingleParams({
                            tokenIn: leg.tokenIn,
                            tokenOut: leg.tokenOut,
                            fee: fee,
                            recipient: address(this),
                            deadline: block.timestamp,
                            amountIn: amountIn,
                            amountOutMinimum:
                                leg.minAmountOut,
                            sqrtPriceLimitX96: 0
                        })
                    );

            _forceApprove(
                leg.tokenIn,
                V3_ROUTER,
                0
            );

            return amountOut;
        }

        if (leg.venue == Venue.UNISWAP_V4) {
            return _executeV4(
                leg,
                amountIn
            );
        }

        revert("VENUE_NOT_ENABLED");
    }

    function _executeV4(
        SwapLeg memory leg,
        uint256 amountIn
    )
        internal
        returns (uint256 amountOut)
    {
        require(
            amountIn <= type(uint128).max,
            "V4_AMOUNT128"
        );

        require(
            leg.minAmountOut <= type(uint128).max,
            "V4_MIN128"
        );

        V4VenueData memory data =
            abi.decode(
                leg.venueData,
                (V4VenueData)
            );

        PoolKey memory key = PoolKey({
            currency0: data.currency0,
            currency1: data.currency1,
            fee: data.fee,
            tickSpacing: data.tickSpacing,
            hooks: data.hooks
        });

        ExactInputSingleParams memory swapParams =
            ExactInputSingleParams({
                poolKey: key,
                zeroForOne: data.zeroForOne,
                amountIn: uint128(amountIn),
                amountOutMinimum:
                    uint128(leg.minAmountOut),
                minHopPriceX36: 0,
                hookData: bytes("")
            });

        _forceApprove(
            leg.tokenIn,
            PERMIT2,
            amountIn
        );

        require(
            amountIn <= type(uint160).max,
            "PERMIT2_AMOUNT"
        );

        IPermit2Candidate(PERMIT2).approve(
            leg.tokenIn,
            V4_ROUTER,
            uint160(amountIn),
            uint48(block.timestamp)
        );

        bytes memory actions =
            abi.encodePacked(
                SWAP_EXACT_IN_SINGLE,
                SETTLE_ALL,
                TAKE_ALL
            );

        bytes[] memory actionParams =
            new bytes[](3);

        actionParams[0] =
            abi.encode(swapParams);

        actionParams[1] =
            abi.encode(
                leg.tokenIn,
                amountIn
            );

        actionParams[2] =
            abi.encode(
                leg.tokenOut,
                leg.minAmountOut
            );

        bytes memory commands =
            abi.encodePacked(V4_SWAP);

        bytes[] memory inputs =
            new bytes[](1);

        inputs[0] =
            abi.encode(
                actions,
                actionParams
            );

        uint256 beforeOut =
            IERC20Candidate(leg.tokenOut)
                .balanceOf(address(this));

        IUniversalRouterCandidate(V4_ROUTER).execute(
            commands,
            inputs,
            block.timestamp
        );

        IPermit2Candidate(PERMIT2).approve(
            leg.tokenIn,
            V4_ROUTER,
            0,
            0
        );

        _forceApprove(
            leg.tokenIn,
            PERMIT2,
            0
        );

        uint256 afterOut =
            IERC20Candidate(leg.tokenOut)
                .balanceOf(address(this));

        amountOut =
            afterOut - beforeOut;

        require(
            amountOut >= leg.minAmountOut,
            "V4_OUTPUT_BELOW_MIN"
        );
    }

    function _forceApprove(
        address token,
        address spender,
        uint256 amount
    )
        internal
    {
        require(
            IERC20Candidate(token).approve(
                spender,
                0
            ),
            "APPROVE_RESET"
        );

        if (amount != 0) {
            require(
                IERC20Candidate(token).approve(
                    spender,
                    amount
                ),
                "APPROVE"
            );
        }
    }
}

interface IERC20Candidate {
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

    function allowance(
        address owner,
        address spender
    )
        external
        view
        returns (uint256);
}

interface IV3RouterCandidate {
    function exactInputSingle(
        PolygonV4CandidateExecutor.V3ExactInputSingleParams
            calldata params
    )
        external
        payable
        returns (uint256 amountOut);
}

interface IUniversalRouterCandidate {
    function execute(
        bytes calldata commands,
        bytes[] calldata inputs,
        uint256 deadline
    )
        external
        payable;
}

interface IPermit2Candidate {
    function approve(
        address token,
        address spender,
        uint160 amount,
        uint48 expiration
    )
        external;
}

interface IAaveAddressesProviderCandidate {
    function getPool()
        external
        view
        returns (address);
}

interface IAavePoolCandidate {
    function flashLoanSimple(
        address receiverAddress,
        address asset,
        uint256 amount,
        bytes calldata params,
        uint16 referralCode
    )
        external;
}
