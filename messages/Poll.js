class Poll {
  msg
  onVote
  onUnvote

  constructor(msg) {
    this.msg = msg;
  }
}

module.exports = { Poll };