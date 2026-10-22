import { expect } from "chai";
import { ethers } from "hardhat";
import { time } from "@nomicfoundation/hardhat-network-helpers";

const H = ethers.keccak256(ethers.toUtf8Bytes("meta"));
const I = ethers.keccak256(ethers.toUtf8Bytes("img"));

async function setup() {
  const [admin, owner, borrower, stranger] = await ethers.getSigners();
  const app = await ethers.deployContract("SafeShare", [admin.address]);
  await app.verifyUser(owner.address);
  await app.verifyUser(borrower.address);
  await app.connect(owner).registerResource(H, I, 20, 4);
  return { admin, owner, borrower, stranger, app };
}

async function checkedOut(app: any, owner: any, borrower: any, hours = 24, before = 4) {
  await app.connect(borrower).requestResource(1, hours);
  await app.connect(owner).approveRequest(1);
  await app.connect(owner).confirmCheckout(1, before);
}

describe("SafeShare", () => {
  it("good on-time return updates trust stats and refunds deposit", async () => {
    const { owner, borrower, app } = await setup();
    await checkedOut(app, owner, borrower);
    await app.connect(borrower).returnResource(1);
    await app.connect(owner).confirmReturn(1, 4, 5);
    const s = await app.stats(borrower.address);
    expect(s.completed).to.equal(1);
    expect(s.onTime).to.equal(1);
    expect(s.careSum).to.equal(5);
    expect(await app.credits(borrower.address)).to.equal(100);
  });

  it("condition drop of 2+ stars is damage and slashes the deposit", async () => {
    const { owner, borrower, app } = await setup();
    await checkedOut(app, owner, borrower, 24, 5);
    await app.connect(owner).confirmReturn(1, 3, 1);
    expect((await app.stats(borrower.address)).damaged).to.equal(1);
    expect(await app.credits(owner.address)).to.equal(120);
  });

  it("late return slashes 25% of the deposit", async () => {
    const { owner, borrower, app } = await setup();
    await checkedOut(app, owner, borrower, 1);
    await time.increase(2 * 3600);
    await app.connect(owner).confirmReturn(1, 4, 4);
    expect(await app.credits(owner.address)).to.equal(105);
    expect((await app.stats(borrower.address)).onTime).to.equal(0);
  });

  it("unverified wallets are blocked (Sybil defense)", async () => {
    const { stranger, app } = await setup();
    await expect(app.connect(stranger).registerResource(H, I, 0, 3)).to.be.revertedWith("Not verified");
    await expect(app.connect(stranger).requestResource(1, 1)).to.be.revertedWith("Not verified");
  });

  it("borrower cannot confirm their own return", async () => {
    const { owner, borrower, app } = await setup();
    await checkedOut(app, owner, borrower);
    await expect(app.connect(borrower).confirmReturn(1, 5, 5)).to.be.revertedWith("Not owner");
  });

  it("rejects invalid ids and double requests", async () => {
    const { borrower, app } = await setup();
    await expect(app.connect(borrower).requestResource(9999, 1)).to.be.revertedWith("Invalid resource id");
    await app.connect(borrower).requestResource(1, 1);
    await expect(app.connect(borrower).requestResource(1, 1)).to.be.revertedWith("Not available");
  });

  it("pause and blacklist work", async () => {
    const { admin, owner, borrower, app } = await setup();
    await app.connect(admin).setBlacklist(borrower.address, true);
    await expect(app.connect(borrower).requestResource(1, 1)).to.be.revertedWith("Blacklisted");
    await app.connect(admin).pause();
    await expect(app.connect(owner).registerResource(H, I, 0, 3)).to.be.reverted;
  });

  it("admin resolves a dispute and splits the deposit", async () => {
    const { admin, owner, borrower, app } = await setup();
    await checkedOut(app, owner, borrower);
    await app.connect(borrower).raiseDispute(1);
    await app.connect(admin).resolveDispute(1, 5000);
    expect(await app.credits(owner.address)).to.equal(110);
  });
});