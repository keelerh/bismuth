pragma solidity ^0.4.13;

contract SingleDataProviderEscrowContract {

    address public questioner;
    string public algorithmURI;
    address public target;
    uint public amount;
    string public algorithmResultHash;

    enum State { Created, Completed, Inactive }
    State public state = State.Created;

    function SingleDataProviderEscrowContract(string _algorithmURI, address _target, uint _amount)
      payable
    {
        questioner = msg.sender;
        algorithmURI = _algorithmURI;
        target = _target;
        amount = _amount;
    }

    modifier onlyQuestioner() {
        require(msg.sender == questioner);
        _;
    }

    modifier onlyTarget() {
        require(msg.sender == target);
        _;
    }

    modifier inState(State _state) {
        require(state == _state);
        _;
    }

    event AlgorithmExecuted(address target, address questioner, string hash);
    event PaymentDelivered(address from, address to, uint amount);

    function confirmAlgorithmExecuted(string _hash)
        onlyTarget()
        inState(State.Created)
        public
        returns(bool success)
    {
        algorithmResultHash = _hash;
        AlgorithmExecuted(msg.sender, questioner, algorithmResultHash);
        state = State.Completed;
        return true;
    }

    function withdraw()
       onlyTarget()
       inState(State.Completed)
       public
       returns(bool success)
    {
       uint payment = amount;
       amount = 0;
       if (msg.sender.send(payment)) {
          PaymentDelivered(questioner, msg.sender, amount);
          state = State.Inactive;
          return true;
       } else {
          amount = payment;
          return false;
       }
    }
}
