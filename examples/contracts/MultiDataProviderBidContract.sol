pragma solidity ^0.4.9;

contract Query {

    struct DataProvider {
        uint bid;
        bool isTarget;
        bool bidAccepted;
        bool bidRejected;
        bool queryRun;
        bool paymentCollected;
    }

    // State variables
    address public querier;
    string public queryURI;
    mapping(address => DataProvider) public targets;
    address[] targetIdx;
    string[] public queryResultHashes;

    enum State { Created, Locked, Completed, Inactive }
    State public state = State.Created;

    function Query(string _queryURI) {
        querier = msg.sender;
        queryURI = _queryURI;
    }

    modifier onlyQuerier() {
        if (msg.sender != querier) throw;
        _;
    }

    modifier onlyTarget() {
        if (!targets[msg.sender].isTarget) throw;
        _;
    }

    modifier inState(State _state) {
        if (state != _state) throw;
        _;
    }

    event bidSubmitted(address dataProviderAddr, uint bid);
    event bidRejected(address dataProviderAddr, uint bid);
    event bidAccepted(address dataProviderAddr, uint bid);
    event queryLocked();
    event queryRun(address dataProviderAddr);
    event queryPaymentSent(address from, address to, uint amoun);
    event inactivated();

    /// Add a data provider as a target, specifying
    /// a bid amount and supplying payment equivalent
    /// to the bid amount.
    function submitBid(address _dataProviderAddress, uint _bid)
        payable
        onlyQuerier
        inState(State.Created)
        returns(bool success)
    {
        if (msg.value < _bid) throw;
        DataProvider memory target = DataProvider({
            bid: _bid,
            isTarget: true,
            bidAccepted: false,
            bidRejected: false,
            queryRun: false,
            paymentCollected: false
        });
        targets[_dataProviderAddress] = target;
        targetIdx.push(_dataProviderAddress);
        bidSubmitted(_dataProviderAddress, _bid);
        return true;
    }

    /// Reject the bid for running the contract,
    /// which returns the ether held in escrow for
    /// that bid to the querier.
    function rejectBid()
        onlyTarget
        inState(State.Created)
        returns(bool success)
    {
        DataProvider target = targets[msg.sender];
        if (target.bidAccepted) throw;
        if (!querier.send(target.bid)) throw;
        targets[msg.sender].bidRejected = true;
        bidRejected(msg.sender, target.bid);
        return true;
    }

    /// Confirms that a data provider accepts the
    /// query bid. The query is locked once all data
    /// providers accept.
    function acceptBid()
        onlyTarget
        inState(State.Created)
        returns(bool success)
    {
        targets[msg.sender].bidAccepted = true;
        uint8 numAccepted = 0;
        for (uint i = 0; i < targetIdx.length; i++) {
            if (targets[targetIdx[i]].bidAccepted) {
                numAccepted += 1;
            }
        }
        if (numAccepted == targetIdx.length) {
            state = State.Locked;
        }
        bidAccepted(msg.sender, targets[msg.sender].bid);
        return true;
    }

    /// Allows the querier to lock the query, signalling
    /// to the data providers which have accepted their
    /// bid to run the query. At this point, no additional
    /// data providers may be included, and any provider
    /// which has not accepted their bid is excluded from
    /// this query transaction.
    function lock()
        onlyQuerier()
        inState(State.Created)
    {
        uint numTargets = 0;
        for (uint i = 0; i < targetIdx.length; i++) {
            if (!targets[targetIdx[i]].bidAccepted) {
                targets[targetIdx[i]].isTarget = false;
            } else {
                numTargets += 1;
            }
        }
        if (numTargets > 0) {
            state = State.Locked;
            queryLocked();
        } else {
            state = State.Inactive;
            inactivated();
        }
    }

    /// Cancel the query and reclaim the ether.
    /// Can only be called by the querier before
    /// the contract is locked.
    function cancel()
        onlyQuerier
        inState(State.Created)
    {
        state = State.Inactive;
        if (!querier.send(this.balance)) throw;
        inactivated();
    }

    /// Called by a data provider after completion
    /// of its part of the query.
    function confirmQueryRun()
        onlyTarget()
        inState(State.Locked)
        returns(bool success)
    {
        targets[msg.sender].queryRun = true;
        queryRun(msg.sender);
        uint numCompleted = 0;
        for (uint8 i = 0; i < targetIdx.length; i++) {
            if (targets[targetIdx[i]].queryRun) {
                numCompleted += 1;
            }
        }
        if (numCompleted == targetIdx.length) {
            state = State.Completed;
        }
        return true;
    }

    /// Uses the withdrawal pattern to allow data
    /// providers to retrieve payment equivalent to
    /// the accepted bid after all targets have
    /// completed execution.
    // See: http://solidity.readthedocs.io/en/develop/common-patterns.html
    function withdraw()
        onlyTarget
        inState(State.Completed)
        returns(bool success)
    {
        uint amount = targets[msg.sender].bid;
        // The pending payment for this data provider must
        // be zeroed before sending to prevent re-entrancy
        // attacks
        targets[msg.sender].bid = 0;
        if (msg.sender.send(amount)) {
            targets[msg.sender].paymentCollected = true;
            queryPaymentSent(querier, msg.sender, amount);
            uint numPaid = 0;
            for (uint8 i = 0; i < targetIdx.length; i++) {
                if (targets[targetIdx[i]].paymentCollected) {
                    numPaid += 1;
                }
            }
            if (numPaid == targetIdx.length) {
                state = State.Inactive;
            }
            return true;
        } else {
            targets[msg.sender].bid = amount;
            return false;
        }
    }

    /// Called by the querier to recover any
    /// additional funds overpaid to the contract
    /// after all data providers have extracted their
    /// payment from escrow.
    function withdrawRemainingFunds()
        onlyQuerier()
        inState(State.Inactive)
        returns(bool success)
    {
        uint amount = targets[msg.sender].bid;
        if (!querier.send(this.balance)) throw;
        return true;
    }

}
