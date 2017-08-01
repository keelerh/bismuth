pragma solidity ^0.4.13;

contract MultiDataProviderBidContract {

    struct DataProvider {
        uint bid;
        bool isTarget;
        bool bidAccepted;
        bool bidRejected;
        bool algorithmExecuted;
        string resultsUri;
        bool paymentDelivered;
    }

    address public questioner;
    string public algorithmUri;
    mapping(address => DataProvider) public targets;
    address[] targetIdx;

    enum State { Created, Locked, Completed, Inactive }
    State public state = State.Created;

    function MultiDataProviderBidContract(string _algorithmUri) {
        questioner = msg.sender;
        algorithmUri = _algorithmUri;
    }

    modifier onlyQuestioner() {
        require(msg.sender == questioner);
        _;
    }

    modifier onlyTarget() {
        require(targets[msg.sender].isTarget);
        _;
    }

    modifier inState(State _state) {
      require(_state == state);
        _;
    }

    event BidSubmitted(address dataProviderAddr, uint bid);
    event BidRejected(address dataProviderAddr, uint bid);
    event BidAccepted(address dataProviderAddr, uint bid);
    event AlgorithmLocked();
    event AlgorithmExecuted(address target, address questioner, string resultsUri);
    event PaymentDelivered(address from, address to, uint amount);

    function submitBid(address _dataProviderAddress, uint _bid)
        payable
        onlyQuestioner
        inState(State.Created)
        returns(bool success)
    {
        if (msg.value < _bid) throw;
        DataProvider memory target = DataProvider({
            bid: _bid,
            isTarget: true,
            bidAccepted: false,
            bidRejected: false,
            algorithmExecuted: false,
            paymentDelivered: false
        });
        targets[_dataProviderAddress] = target;
        targetIdx.push(_dataProviderAddress);
        BidSubmitted(_dataProviderAddress, _bid);
        return true;
    }

    function rejectBid()
        onlyTarget
        inState(State.Created)
        returns(bool success)
    {
        DataProvider target = targets[msg.sender];
        if (target.bidAccepted) throw;
        if (!questioner.send(target.bid)) throw;
        targets[msg.sender].bidRejected = true;
        BidRejected(msg.sender, target.bid);
        return true;
    }

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
        BidAccepted(msg.sender, targets[msg.sender].bid);
        return true;
    }

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
            QueryLocked();
        } else {
            state = State.Inactive;
        }
    }

    function cancel()
        onlyQuerier
        inState(State.Created)
    {
        state = State.Inactive;
        if (!querier.send(this.balance)) throw;
    }

    function confirmAlgorithmExecuted(string _resultsUri)
        onlyTarget()
        inState(State.Locked)
        returns(bool success)
    {
        targets[msg.sender].algorithmExecuted = true;
        targets[msg.sender].resultsUri = _resultsUri;
        AlgorithmExecuted(msg.sender, questioner, _resultsUri);
        uint numCompleted = 0;
        for (uint8 i = 0; i < targetIdx.length; i++) {
            if (targets[targetIdx[i]].algorithmExecuted) {
                numCompleted += 1;
            }
        }
        if (numCompleted == targetIdx.length) {
            state = State.Completed;
        }
        return true;
    }

    function withdraw()
        onlyTarget
        inState(State.Completed)
        returns(bool success)
    {
        uint amount = targets[msg.sender].bid;
        // The pending payment for this data provider must
        // be zeroed before sending to prevent reentrancy
        // attacks
        targets[msg.sender].bid = 0;
        if (msg.sender.send(amount)) {
            targets[msg.sender].paymentDelivered = true;
            PaymentDelivered(questioner, msg.sender, amount);
            uint numPaid = 0;
            for (uint8 i = 0; i < targetIdx.length; i++) {
                if (targets[targetIdx[i]].paymentDelivered) {
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
