const crypto = require('crypto');

const { decryptPollVote } = require("baileys");
const { getRealLid } = require("./Utils");

const polls = new Map();

class Poll {
  msg
  onVote
  onUnvote

  constructor(msg) {
    this.msg = msg;
  }
}

function getOptionHash(optionName) {
  return crypto
    .createHash("sha256")
    .update(optionName)
    .digest();
}

function handlePollMessage(sock, msg) {
  const update = msg.message?.pollUpdateMessage;
  if (!update) return false;
  const pollKey = update.pollCreationMessageKey;

  const poll = polls.get(pollKey.id);
  if (poll) {
    const secret =
      poll.msg.message.messageContextInfo.messageSecret;

    const pollCreatorJid = poll.msg.key.fromMe
      ? getRealLid(sock.user.lid)
      : poll.msg.key.participant;

    const voterJid = msg.key.fromMe
      ? getRealLid(sock.user.lid)
      : msg.key.remoteJid.endsWith('@g.us')
        ? msg.key.participant
        : msg.key.remoteJid;

    const result = decryptPollVote(update.vote, {
      pollCreatorJid,
      pollMsgId: poll.msg.key.id,
      pollEncKey: secret,
      voterJid
    });

    const selected = result.selectedOptions[0];
    if (selected) {
      const option = poll.msg.message.pollCreationMessageV3.options.find(
        opt => Buffer.compare(getOptionHash(opt.optionName), selected) === 0
      );

      poll.onVote?.(option.optionName, msg);
    }
    else {
      poll.onUnvote?.(msg);
    }
  }
  return true;
}

module.exports = {
  Poll,
  polls,
  handlePollMessage
};