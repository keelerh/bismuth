pragma solidity ^0.4.9;

contract SingleDataProviderEscrowContract {

    // State variables
    address public querier;
    string public queryURI;
    address public target;
    uint public amount;
    string public queryResultHash;

    enum State { Created, Completed, Inactive }
    State public state = State.Created;

    function Query(string _queryURI, address _target, uint _amount)
      payable
    {
        querier = msg.sender;
        queryURI = _queryURI;
        target = _target;
        amount = _amount;
    }

    modifier onlyQuerier() {
        if (msg.sender != querier) throw;
        _;
    }

    modifier onlyTarget() {
        if (msg.sender != target) throw;
        _;
    }

    modifier inState(State _state) {
        if (state != _state) throw;
        _;
    }

    event queryRun(address target);
    event queryPaymentSent(address from, address to, uint amount);
    event inactivated();

    /// Called by the specified data provider after
    // algorithm execution.
    function confirmQueryRun()
        onlyTarget()
        inState(State.Created)
        returns(bool success)
    {
        queryRun(msg.sender);
        state = State.Completed;
        return true;
    }

    /// Uses the withdrawal pattern to allow the
    /// target data provider to retrieve their payment.
    // See: http://solidity.readthedocs.io/en/develop/common-patterns.html
    function withdraw()
        onlyTarget
        inState(State.Completed)
        returns(bool success)
    {
        // The pending payment for the data provider must
        // be zeroed before sending to prevent re-entrancy
        // attacks
        uint payment = amount;
        amount = 0;
        if (msg.sender.send(payment)) {
            queryPaymentSent(querier, msg.sender, amount);
            state = State.Inactive;
            return true;
        } else {
            amount = payment;
            return false;
        }
    }

}
