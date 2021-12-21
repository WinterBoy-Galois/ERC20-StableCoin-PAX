const PAXMock = artifacts.require('PAXWithBalance.sol');
const Proxy = artifacts.require('AdminUpgradeabilityProxy.sol');

const assertRevert = require('./helpers/assertRevert');

// Test that PAX operates correctly as a Pausable token.
contract('Pausable PAX', function ([_, admin, anotherAccount, owner]) {
  beforeEach(async function () {
    const pax = await PAXMock.new({from: owner});
    const proxy = await Proxy.new(pax.address, {from: admin});
    const proxiedPAX = await PAXMock.at(proxy.address);
    await proxiedPAX.initialize({from: owner});
    await proxiedPAX.initializeBalance(owner, 100);
    this.token = proxiedPAX;
  });

  const amount = 10;

  it('can transfer in non-pause', async function () {
    const paused = await this.token.paused();
    assert.equal(paused, false);
    await this.token.transfer(anotherAccount, amount, {from: owner});
    const balance = await this.token.balanceOf(owner);
    assert.equal(90, balance);
  });

  it('cannot transfer in pause', async function () {
    const {logs} = await this.token.pause({from: owner});
    const paused = await this.token.paused();
    assert.equal(paused, true);
    await assertRevert(this.token.transfer(anotherAccount, amount, {from: owner}));
    const balance = await this.token.balanceOf(owner);
    assert.equal(100, balance);

    // emits a Pause event
    assert.equal(logs.length, 1);
    assert.equal(logs[0].event, 'Pause');
  });

  it('cannot approve/transferFrom in pause', async function () {
    await this.token.approve(anotherAccount, amount, {from: owner});
    const {logs} = await this.token.pause({from: owner});
    await assertRevert(this.token.approve(anotherAccount, 2 * amount, {from: owner}));
    await assertRevert(this.token.transferFrom(owner, anotherAccount, amount, {from: anotherAccount}));
  });

  it('should resume allowing normal process after pause is over', async function () {
    await this.token.pause({from: owner});
    const {logs} = await this.token.unpause({from: owner});
    await this.token.transfer(anotherAccount, amount, {from: owner});
    const balance = await this.token.balanceOf(owner);
    assert.equal(90, balance);

    // emits a Unpause event
    assert.equal(logs.length, 1);
    assert.equal(logs[0].event, 'Unpause');
  });

  it('cannot unpause when unpaused or pause when paused', async function () {
    await assertRevert(this.token.unpause({from: owner}));
    await this.token.pause({from: owner});
    await assertRevert(this.token.pause({from: owner}));
  });
});
