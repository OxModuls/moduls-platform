import { expect } from "chai";
import { ethers } from "hardhat";
import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers.js";

describe("ModulsDeployer", function () {
    async function deployModulsDeployerFixture() {
        const [owner, creator, agentWallet, platformAdmin, otherAccount] = await ethers.getSigners();

        const ModulsSalesManager = await ethers.getContractFactory("ModulsSalesManager");
        const salesManager = await ModulsSalesManager.deploy(platformAdmin.address);

        const ModulsDeployer = await ethers.getContractFactory("ModulsDeployer");
        const deployer = await ModulsDeployer.deploy(salesManager.target);

        return {
            deployer,
            salesManager,
            owner,
            creator,
            agentWallet,
            platformAdmin,
            otherAccount,
        };
    }

    describe("Deployment", function () {
        it("Should deploy successfully", async function () {
            const { deployer } = await loadFixture(deployModulsDeployerFixture);
            expect(deployer.target).to.be.properAddress;
        });

        it("Should start with empty deployed tokens array", async function () {
            const { deployer } = await loadFixture(deployModulsDeployerFixture);
            const deployedTokens = await deployer.getDeployedTokens();
            expect(deployedTokens).to.have.lengthOf(0);
        });
    });

    describe("Token Deployment", function () {
        const tokenParams = {
            name: "Test Token",
            symbol: "TEST",
            initialSupply: ethers.parseEther("1000000"),
            taxPercent: 5,
            agentSplit: 60,
            intentId: 12345,
            metadataURI: "ipfs://QmTestMetadata",
        };

        it("Should deploy a token successfully", async function () {
            const { deployer, creator, agentWallet, salesManager } = await loadFixture(deployModulsDeployerFixture);

            const tx = await deployer.connect(creator).deployToken(
                tokenParams.name,
                tokenParams.symbol,
                tokenParams.initialSupply,
                agentWallet.address,
                tokenParams.taxPercent,
                tokenParams.agentSplit,
                tokenParams.intentId,
                tokenParams.metadataURI,
                true // autoRegister
            );

            const receipt = await tx.wait();
            const event = receipt.logs.find(log => {
                try {
                    return deployer.interface.parseLog(log);
                } catch {
                    return false;
                }
            });

            expect(event).to.not.be.undefined;
            const parsedEvent = deployer.interface.parseLog(event);
            expect(parsedEvent.name).to.equal("ModulsTokenCreated");
        });

        it("Should add deployed token to the array", async function () {
            const { deployer, creator, agentWallet } = await loadFixture(deployModulsDeployerFixture);

            await deployer.connect(creator).deployToken(
                tokenParams.name,
                tokenParams.symbol,
                tokenParams.initialSupply,
                agentWallet.address,
                tokenParams.taxPercent,
                tokenParams.agentSplit,
                tokenParams.intentId,
                tokenParams.metadataURI,
                true // autoRegister
            );

            const deployedTokens = await deployer.getDeployedTokens();
            expect(deployedTokens).to.have.lengthOf(1);
        });

        it("Should set correct token creator mapping", async function () {
            const { deployer, creator, agentWallet } = await loadFixture(deployModulsDeployerFixture);

            const tx = await deployer.connect(creator).deployToken(
                tokenParams.name,
                tokenParams.symbol,
                tokenParams.initialSupply,
                agentWallet.address,
                tokenParams.taxPercent,
                tokenParams.agentSplit,
                tokenParams.intentId,
                tokenParams.metadataURI,
                true // autoRegister
            );

            const receipt = await tx.wait();
            const event = receipt.logs.find(log => {
                try {
                    return deployer.interface.parseLog(log);
                } catch {
                    return false;
                }
            });

            const parsedEvent = deployer.interface.parseLog(event);
            const tokenAddress = parsedEvent.args.tokenAddress;

            const tokenCreator = await deployer.tokenCreators(tokenAddress);
            expect(tokenCreator).to.equal(creator.address);
        });

        it("Should emit ModulsTokenCreated event with correct parameters", async function () {
            const { deployer, creator, agentWallet, salesManager } = await loadFixture(deployModulsDeployerFixture);

            await expect(
                deployer.connect(creator).deployToken(
                    tokenParams.name,
                    tokenParams.symbol,
                    tokenParams.initialSupply,
                    agentWallet.address,
                    tokenParams.taxPercent,
                    tokenParams.agentSplit,
                    tokenParams.intentId,
                    tokenParams.metadataURI,
                    true // autoRegister
                )
            )
                .to.emit(deployer, "ModulsTokenCreated")
                .withArgs(
                    anyValue, // tokenAddress
                    tokenParams.name,
                    tokenParams.symbol,
                    tokenParams.initialSupply,
                    agentWallet.address,
                    salesManager.target,
                    tokenParams.taxPercent,
                    tokenParams.agentSplit,
                    tokenParams.intentId,
                    tokenParams.metadataURI,
                    creator.address
                );
        });
    });

    describe("IntentId Uniqueness", function () {
        const tokenParams = {
            name: "Test Token",
            symbol: "TEST",
            initialSupply: ethers.parseEther("1000000"),
            taxPercent: 5,
            agentSplit: 60,
            intentId: 12345,
            metadataURI: "ipfs://QmTestMetadata",
        };

        it("Should allow deployment with unique intentId", async function () {
            const { deployer, creator, agentWallet, salesManager } = await loadFixture(deployModulsDeployerFixture);

            await expect(
                deployer.connect(creator).deployToken(
                    tokenParams.name,
                    tokenParams.symbol,
                    tokenParams.initialSupply,
                    agentWallet.address,
                    salesManager.address,
                    tokenParams.taxPercent,
                    tokenParams.agentSplit,
                    tokenParams.intentId,
                    tokenParams.metadataURI
                )
            ).to.not.be.reverted;
        });

        it("Should revert when deploying with duplicate intentId", async function () {
            const { deployer, creator, agentWallet, salesManager, otherAccount } = await loadFixture(deployModulsDeployerFixture);

            // Deploy first token
            await deployer.connect(creator).deployToken(
                tokenParams.name,
                tokenParams.symbol,
                tokenParams.initialSupply,
                agentWallet.address,
                salesManager.address,
                tokenParams.taxPercent,
                tokenParams.agentSplit,
                tokenParams.intentId,
                tokenParams.metadataURI
            );

            // Try to deploy second token with same intentId
            await expect(
                deployer.connect(otherAccount).deployToken(
                    "Another Token",
                    "ANOTHER",
                    ethers.parseEther("500000"),
                    agentWallet.address,
                    salesManager.address,
                    3,
                    50,
                    tokenParams.intentId, // Same intentId
                    "ipfs://QmAnotherMetadata"
                )
            ).to.be.revertedWith("IntentId already exists");
        });

        it("Should allow deployment with different intentIds", async function () {
            const { deployer, creator, agentWallet, salesManager, otherAccount } = await loadFixture(deployModulsDeployerFixture);

            // Deploy first token
            await deployer.connect(creator).deployToken(
                tokenParams.name,
                tokenParams.symbol,
                tokenParams.initialSupply,
                agentWallet.address,
                salesManager.address,
                tokenParams.taxPercent,
                tokenParams.agentSplit,
                tokenParams.intentId,
                tokenParams.metadataURI
            );

            // Deploy second token with different intentId
            await expect(
                deployer.connect(otherAccount).deployToken(
                    "Another Token",
                    "ANOTHER",
                    ethers.parseEther("500000"),
                    agentWallet.address,
                    salesManager.address,
                    3,
                    50,
                    67890, // Different intentId
                    "ipfs://QmAnotherMetadata"
                )
            ).to.not.be.reverted;

            const deployedTokens = await deployer.getDeployedTokens();
            expect(deployedTokens).to.have.lengthOf(2);
        });
    });

    describe("Deployed Token Properties", function () {
        it("Should create token with correct initial properties", async function () {
            const { deployer, creator, agentWallet, salesManager } = await loadFixture(deployModulsDeployerFixture);

            const tokenParams = {
                name: "Test Token",
                symbol: "TEST",
                initialSupply: ethers.parseEther("1000000"),
                taxPercent: 5,
                agentSplit: 60,
                intentId: 12345,
                metadataURI: "ipfs://QmTestMetadata",
            };

            const tx = await deployer.connect(creator).deployToken(
                tokenParams.name,
                tokenParams.symbol,
                tokenParams.initialSupply,
                agentWallet.address,
                salesManager.address,
                tokenParams.taxPercent,
                tokenParams.agentSplit,
                tokenParams.intentId,
                tokenParams.metadataURI
            );

            const receipt = await tx.wait();
            const event = receipt.logs.find(log => {
                try {
                    return deployer.interface.parseLog(log);
                } catch {
                    return false;
                }
            });

            const parsedEvent = deployer.interface.parseLog(event);
            const tokenAddress = parsedEvent.args.tokenAddress;

            // Get the deployed token contract
            const ModulsToken = await ethers.getContractFactory("ModulsToken");
            const token = ModulsToken.attach(tokenAddress);

            // Verify token properties
            expect(await token.name()).to.equal(tokenParams.name);
            expect(await token.symbol()).to.equal(tokenParams.symbol);
            expect(await token.agentWallet()).to.equal(agentWallet.address);
            expect(await token.salesManager()).to.equal(salesManager.address);
            expect(await token.taxPercent()).to.equal(tokenParams.taxPercent);
            expect(await token.agentSplit()).to.equal(tokenParams.agentSplit);
            expect(await token.intentId()).to.equal(tokenParams.intentId);
            expect(await token.metadataURI()).to.equal(tokenParams.metadataURI);
        });

        it("Should mint initial supply to sales manager", async function () {
            const { deployer, creator, agentWallet, salesManager } = await loadFixture(deployModulsDeployerFixture);

            const initialSupply = ethers.parseEther("1000000");

            const tx = await deployer.connect(creator).deployToken(
                "Test Token",
                "TEST",
                initialSupply,
                agentWallet.address,
                salesManager.address,
                5,
                60,
                12345,
                "ipfs://QmTestMetadata"
            );

            const receipt = await tx.wait();
            const event = receipt.logs.find(log => {
                try {
                    return deployer.interface.parseLog(log);
                } catch {
                    return false;
                }
            });

            const parsedEvent = deployer.interface.parseLog(event);
            const tokenAddress = parsedEvent.args.tokenAddress;

            const ModulsToken = await ethers.getContractFactory("ModulsToken");
            const token = ModulsToken.attach(tokenAddress);

            expect(await token.balanceOf(salesManager.address)).to.equal(initialSupply);
        });
    });

    describe("Multiple Token Deployments", function () {
        it("Should track multiple deployed tokens correctly", async function () {
            const { deployer, creator, agentWallet, salesManager, otherAccount } = await loadFixture(deployModulsDeployerFixture);

            // Deploy first token
            await deployer.connect(creator).deployToken(
                "First Token",
                "FIRST",
                ethers.parseEther("1000000"),
                agentWallet.address,
                salesManager.address,
                5,
                60,
                12345,
                "ipfs://QmFirstMetadata"
            );

            // Deploy second token
            await deployer.connect(otherAccount).deployToken(
                "Second Token",
                "SECOND",
                ethers.parseEther("500000"),
                agentWallet.address,
                salesManager.address,
                3,
                50,
                67890,
                "ipfs://QmSecondMetadata"
            );

            // Deploy third token
            await deployer.connect(creator).deployToken(
                "Third Token",
                "THIRD",
                ethers.parseEther("750000"),
                agentWallet.address,
                salesManager.address,
                7,
                70,
                11111,
                "ipfs://QmThirdMetadata"
            );

            const deployedTokens = await deployer.getDeployedTokens();
            expect(deployedTokens).to.have.lengthOf(3);

            // Verify all tokens are unique addresses
            const uniqueAddresses = new Set(deployedTokens.map(token => token.toLowerCase()));
            expect(uniqueAddresses.size).to.equal(3);
        });
    });

    describe("Edge Cases", function () {
        it("Should handle zero initial supply", async function () {
            const { deployer, creator, agentWallet, salesManager } = await loadFixture(deployModulsDeployerFixture);

            await expect(
                deployer.connect(creator).deployToken(
                    "Zero Supply Token",
                    "ZERO",
                    0,
                    agentWallet.address,
                    salesManager.address,
                    5,
                    60,
                    99999,
                    "ipfs://QmZeroMetadata"
                )
            ).to.not.be.reverted;
        });

        it("Should handle maximum tax percentage", async function () {
            const { deployer, creator, agentWallet, salesManager } = await loadFixture(deployModulsDeployerFixture);

            await expect(
                deployer.connect(creator).deployToken(
                    "Max Tax Token",
                    "MAXTAX",
                    ethers.parseEther("1000000"),
                    agentWallet.address,
                    salesManager.address,
                    10, // Maximum allowed tax
                    60,
                    88888,
                    "ipfs://QmMaxTaxMetadata"
                )
            ).to.not.be.reverted;
        });

        it("Should handle maximum agent split", async function () {
            const { deployer, creator, agentWallet, salesManager } = await loadFixture(deployModulsDeployerFixture);

            await expect(
                deployer.connect(creator).deployToken(
                    "Max Split Token",
                    "MAXSPLIT",
                    ethers.parseEther("1000000"),
                    agentWallet.address,
                    salesManager.address,
                    5,
                    100, // Maximum allowed agent split
                    77777,
                    "ipfs://QmMaxSplitMetadata"
                )
            ).to.not.be.reverted;
        });
    });
}); 