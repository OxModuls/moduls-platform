import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Textarea } from "@/components/ui/textarea";
import {
  ArrowRight,
  ChevronUp,
  Copy,
  File,
  Image,
  Info,
  Link,
  Wallet,
} from "lucide-react";
import React, { useRef, useState } from "react";
import { toast } from "sonner";
import SeiIcon from "@/components/sei-icon";
import { writeToClipboard } from "@/lib/utils";
import { useAccount } from "wagmi";

const modulTypes = [
  {
    name: "GameFi NPC",
    emoji: "🎮",
    description: "Onchain AI that responds in-chat and via gameplay.",
    identifier: "gamefi-npc",
  },
  {
    name: "DeFAI",
    emoji: "🧠",
    description: "Scan, snipe execute — fully autonomous, fully aligned",
    identifier: "defai",
  },
  {
    name: "Meme Token",
    emoji: "💸",
    description: "Mint, hype, moon — launch fully memetic, fully chaotic.",
    identifier: "meme-token-launcher",
  },
  {
    name: "Oracle Feed",
    emoji: "🔮",
    description: "Pulls and verifies external data onchain.",
    identifier: "oracle-feed",
  },
  {
    name: "Custom Logic",
    emoji: "🛠️",
    description: "Paste or upload a .goat.json to define custom behavior.",
    identifier: "custom",
  },
];

const acceptedImageFormats = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "application/gif",
];
const maxImageSize = 5 * 1024 * 1024;

const CreateAgent = () => {
  const { address } = useAccount();
  const pickModulDivRef = useRef(null);
  const taxSettingsDivRef = useRef(null);
  const prebuyDivRef = useRef(null);

  const [showSocialLinks, setShowSocialLinks] = useState(false);
  const [selectedFileName, setSelectedFileName] = useState("");

  const [formData, setFormData] = useState({
    agentName: "",
    agentPrompt: "",
    modulType: modulTypes[0].identifier,
    tokenSymbol: "",
    totalSupply: 1_000_000_000,
    tax: {
      swap: 2,
      agentWallet: 50,
      devWallet: 50,
    },
    socialLinks: {
      website: "",
      x: "",
      telegram: "",
    },
    prebuyAmount: 0,
  });
  const [agentImageUrl, setAgentImageURL] = useState();

  const agentWallet = "0x5A0bCC35AD8cE6CCB6980B8d0A6B23DDCA6";

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    if (name === "agentImage") {
      const file = e.target.files[0];
      if (
        file &&
        acceptedImageFormats.includes(file.type) &&
        file.size < maxImageSize
      ) {
        setFormData((prev) => ({
          ...prev,
          agentImage: { ...file },
        }));
        setSelectedFileName(file.name);
        const reader = new FileReader();
        reader.onloadend = () => {
          setAgentImageURL(reader.result);
        };
        reader.readAsDataURL(file);
        toast.success("Added image successfully");
      }
    }
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      if (
        file &&
        acceptedImageFormats.includes(file.type) &&
        file.size < maxImageSize
      ) {
        setFormData((prev) => ({ ...prev, agentImage: file }));
        setSelectedFileName(file.name);
        const reader = new FileReader();
        reader.onloadend = () => {
          setAgentImageURL(reader.result);
        };
        reader.readAsDataURL(file);
        toast.success("Added image successfully");
      }
    }
  };

  const submitForm = (e) => {
    e.preventDefault();
  };

  return (
    <div className="px-6 pt-4 pb-12 flex flex-col">
      <div className="max-w-lg mx-auto">
        <div className="ml-1">
          <h1 className="text-2xl font-bold">Launch Your Agent</h1>
          <p className="mt-1 text-lg text-muted-foreground">
            Plug logic into the chain. Give it a name. Let it cook.
          </p>
        </div>
        <form onSubmit={submitForm} className="">
          <div className="flex flex-col gap-5 mt-4 px-4 py-6 border rounded-xl">
            <div className="ml-1">
              <h2 className="text-xl font-semibold">Agent Identity</h2>
              <p className="text-muted-foreground">
                Give your agent a face and identity.
              </p>
            </div>
            <div className="flex flex-col md:flex-row gap-5">
              <div className="flex-1">
                <label htmlFor="agent-name" className="ml-1">
                  Agent Name
                </label>
                <Input
                  id="agent-name"
                  name="agentName"
                  placeholder="Name your Agent. Go wild"
                  className="mt-1"
                  value={formData.agentName}
                  onChange={handleFormChange}
                />
              </div>
              <div className="flex-1">
                <label htmlFor="token-symbol" className="ml-1">
                  Token Symbol
                </label>
                <Input
                  id="token-symbol"
                  name="tokenSymbol"
                  placeholder="Ticker for your token, like $MOD"
                  className="mt-1"
                  maxLength={5}
                  value={formData.tokenSymbol}
                  onChange={handleFormChange}
                />
              </div>
            </div>
            <div className="">
              <label htmlFor="agent-prompt" className="ml-1">
                Agent Description/Prompt
              </label>
              <Textarea
                id="agent-prompt"
                name="agentPrompt"
                placeholder="A degen AI that hypes launches, roasts rugs, and protects LPs."
                className="mt-2"
                value={formData.agentPrompt}
                onChange={handleFormChange}
              />
              <p className="ml-1 mt-1 text-xs text-muted-foreground">
                Set the tone. Define the agent’s behavior or chat style.
              </p>
            </div>
            <div>
              <div className="ml-1 mt-5 flex items-center gap-2">
                <Link className="size-4" />
                <p>
                  add social links{" "}
                  <span className="text-muted-foreground">(optional)</span>
                </p>
                <button
                  type="button"
                  onClick={() => setShowSocialLinks(!showSocialLinks)}
                  className="cursor-pointer"
                >
                  <ChevronUp
                    className={`size-4 ${showSocialLinks ? "rotate-180" : ""}`}
                  />
                </button>
              </div>
              <div
                className={`mt-3 flex flex-col gap-5 ${showSocialLinks ? "hidden" : "flex"}`}
              >
                <div>
                  <label htmlFor="website" className="ml-1">
                    Website
                  </label>
                  <Input
                    id="website"
                    name="website"
                    placeholder="Enter URL"
                    className="mt-1"
                    value={formData.socialLinks.website}
                    onChange={(e) => {
                      setFormData((prev) => ({
                        ...prev,
                        socialLinks: {
                          ...prev.socialLinks,
                          website: e.target.value,
                        },
                      }));
                    }}
                  />
                </div>
                <div className="">
                  <label htmlFor="x-url" className="ml-1">
                    X
                  </label>
                  <Input
                    id="x-url"
                    name="x"
                    placeholder="Enter URL"
                    className="mt-1"
                    value={formData.socialLinks.x}
                    onChange={(e) => {
                      setFormData((prev) => ({
                        ...prev,
                        socialLinks: {
                          ...prev.socialLinks,
                          x: e.target.value,
                        },
                      }));
                    }}
                  />
                </div>
                <div className="">
                  <label htmlFor="telegram" className="ml-1">
                    Telegram
                  </label>
                  <Input
                    id="telegram"
                    name="telegram"
                    placeholder="Enter URL"
                    className="mt-1"
                    value={formData.socialLinks.telegram}
                    onChange={(e) => {
                      setFormData((prev) => ({
                        ...prev,
                        socialLinks: {
                          ...prev.socialLinks,
                          telegram: e.target.value,
                        },
                      }));
                    }}
                  />
                </div>
              </div>
            </div>
            <div className="mt-10">
              <label
                htmlFor="agent-image"
                className="h-64 border-2 border-dotted rounded-lg flex justify-center items-center"
                onDragOver={handleDragOver}
                onDrop={handleDrop}
              >
                <div className="flex flex-col items-center">
                  {formData.agentImage ? (
                    <>
                      <img
                        src={agentImageUrl}
                        alt="agent image"
                        className="size-24 object-cover"
                      />
                      <p className="mt-2">selected file: {selectedFileName}</p>
                      <span className="font-light">tap/click to change</span>
                    </>
                  ) : (
                    <>
                      <Image className="size-10" />
                      <p className="mt-2">select an image to upload</p>
                      <span className="font-light">or drag and drop here</span>
                    </>
                  )}
                </div>
                <input
                  type="file"
                  id="agent-image"
                  name="agentImage"
                  className="sr-only"
                  onChange={handleFormChange}
                />
              </label>
              <div className="mt-5 ml-2">
                <div className="flex items-center gap-2">
                  <File className="size-5" />
                  <h3 className="font-semibold">File size and type</h3>
                </div>
                <ul className="mt-1 ml-1 list-disc list-inside text-sm font-light">
                  <li>Max. size 5MB.</li>
                  <li>JPG, GIF, and PNG formats.</li>
                </ul>
              </div>
            </div>
            <div className="">
              <label htmlFor="total-supply" className="ml-1">
                Total Supply
              </label>
              <Input
                id="total-supply"
                placeholder="Fixed supply baked in at launch"
                className="mt-1"
                value={"1B"}
                disabled
              />
            </div>
          </div>
          <div
            ref={taxSettingsDivRef}
            className="flex flex-col gap-5 mt-4 px-4 py-6 border rounded-xl"
          >
            <div className="ml-1">
              <h2 className="text-xl font-semibold">Tax Settings</h2>
              <p className="text-muted-foreground">
                Fund your agent. Feed your dev. Or don't.
              </p>
            </div>
            <div className="flex flex-col gap-y-5">
              <div className="">
                <label
                  htmlFor="swap-tax"
                  className="flex items-center justify-between"
                >
                  <p className="">Total Swap Tax (%)</p>
                  <span className="text-sm">{formData.tax.swap}%</span>
                </label>
                <div className="mt-2 flex flex-col gap-1.5 items-center">
                  <Slider
                    className=""
                    rangeClassName="dark:bg-accent"
                    thumbClassName="dark:border-accent"
                    min={2}
                    max={10}
                    step={0.5}
                    value={[formData.tax.swap]}
                    onValueChange={(value) =>
                      setFormData({
                        ...formData,
                        tax: { ...formData.tax, swap: value[0] },
                      })
                    }
                    disabled
                  />
                  <div className="w-full mt-1 px-1 flex justify-between text-xs text-muted-foreground">
                    <span>2%</span>
                    <span>10%</span>
                  </div>
                </div>
                <p className="ml-1 mt-2 text-xs text-muted-foreground">
                  Percentage fee taken on every swap.
                </p>
              </div>
              <div className="">
                <label
                  htmlFor="agent-wallet"
                  className="flex items-center justify-between"
                >
                  <p className="">Agent Wallet (%)</p>
                  <span className="text-sm">{formData.tax.agentWallet}%</span>
                </label>
                <div className="mt-3 flex flex-col gap-1.5 items-center">
                  <Slider
                    className="mt-2"
                    rangeClassName="dark:bg-accent"
                    thumbClassName="dark:border-accent"
                    min={1}
                    max={100}
                    step={1}
                    value={[formData.tax.agentWallet]}
                    onValueChange={(value) =>
                      setFormData({
                        ...formData,
                        tax: {
                          ...formData.tax,
                          agentWallet: value[0],
                          devWallet: 100 - value[0],
                        },
                      })
                    }
                    disabled
                  />
                  <div className="w-full mt-1 px-1 flex justify-between text-xs text-muted-foreground">
                    <span>1%</span>
                    <span>100%</span>
                  </div>
                </div>
                <p className="mt-2 text-xs text-muted-foreground">
                  Funds your agent's operations and memory.
                </p>
              </div>
              <div className="">
                <label
                  htmlFor="agent-wallet"
                  className="flex items-center justify-between"
                >
                  <p className="">
                    Dev Wallet (%){" "}
                    <span className="text-muted-foreground">(optional)</span>
                  </p>
                  <span className="text-sm">{formData.tax.devWallet}%</span>
                </label>
                <div className="mt-3 flex flex-col gap-1.5 items-center">
                  <Slider
                    className=""
                    rangeClassName="dark:bg-accent"
                    thumbClassName="dark:border-accent"
                    min={0}
                    max={99}
                    step={1}
                    value={[formData.tax.devWallet]}
                    onValueChange={(value) =>
                      setFormData({
                        ...formData,
                        tax: {
                          ...formData.tax,
                          devWallet: value[0],
                          agentWallet: 100 - value[0],
                        },
                      })
                    }
                    disabled
                  />
                  <div className="w-full mt-1 px-1 flex justify-between text-xs text-muted-foreground">
                    <span>0%</span>
                    <span>99%</span>
                  </div>
                </div>
                <p className="mt-2 text-xs text-muted-foreground">
                  Kickback for builders, community, or vibes.
                </p>
              </div>
            </div>
            <div className="flex flex-col gap-5">
              <div className="">
                <div className="flex items-center justify-between">
                  <p className="">Dev Wallet</p>
                  <button
                    className="cursor-pointer"
                    onClick={() => {
                      address
                        ? writeToClipboard(address)
                        : toast.error("Connect your wallet first");
                    }}
                  >
                    <Copy className="size-5" />
                  </button>
                </div>
                <Input
                  className="w-full mt-2"
                  value={address || "Connect wallet to add dev wallet"}
                  disabled
                />
                <div className="w-full mt-1 px-1 text-xs text-muted-foreground">
                  Your wallet.
                </div>
              </div>
              <div className="">
                <div className="flex items-center justify-between">
                  <p className="">Agent Wallet</p>
                  <button
                    className="cursor-pointer"
                    onClick={() => writeToClipboard(agentWallet)}
                  >
                    <Copy className="size-5" />
                  </button>
                </div>
                <Input className="w-full mt-2" value={agentWallet} disabled />
                <div className="w-full mt-1 px-1 text-xs text-muted-foreground">
                  Auto-generated wallet for your agent.
                </div>
              </div>
            </div>
            <div className="mt-2 flex justify-end">
              <button
                className="px-3 py-2 bg-accent rounded-lg text-sm font-semibold hover:scale-105 transition-all duration-500 flex items-center gap-2"
                onClick={() =>
                  prebuyDivRef.current &&
                  prebuyDivRef.current.scrollIntoView({
                    behavior: "smooth",
                  })
                }
              >
                <ArrowRight className="size-5" />
                <span>Next</span>
              </button>
            </div>
          </div>
          <div
            ref={prebuyDivRef}
            className="flex flex-col mt-4 px-4 py-6 border rounded-xl"
          >
            <div className="ml-1">
              <h2 className="text-xl font-semibold">Pre-buy Token</h2>
              <p className="text-muted-foreground">
                Purchasing a small amount of your token is optional but can help
                protect your coin from snipers.
              </p>
            </div>
            <div className="mt-3 px-2 py-4 bg-neutral-850 border rounded-lg flex flex-col gap-4">
              <div className="w-full flex flex-col gap-1">
                <label
                  htmlFor="slippage"
                  className="ml-1 text-sm font-semibold"
                >
                  Slippage (%)
                </label>
                <Input
                  type="number"
                  id="slippage"
                  className="py-2"
                  value={formData.prebuyAmount}
                  onChange={handleFormChange}
                />
              </div>
              <div className="w-full flex flex-col gap-1">
                <label htmlFor="amount" className="ml-1 text-sm font-semibold">
                  Amount
                </label>
                <div className="relative">
                  <Input
                    type="number"
                    id="amount"
                    name="prebuyAmount"
                    className="py-2 pr-28"
                    defaultValue={0}
                  />
                  <div className="absolute top-[50%] translate-y-[-50%] right-4 flex items-center gap-2 text-neutral-400">
                    <div className="flex items-center gap-2">
                      <span className="uppercase">sei</span>
                      <SeiIcon className="size-4" />
                    </div>
                  </div>
                </div>
                <div className="px-1 w-full flex justify-between text-xs">
                  <span className="text-red-500">Insufficient balance</span>
                  <div className="flex items-center gap-1">
                    <Wallet className="size-3" />
                    <span className="">0 SEI</span>
                    <button className="text-green-500">MAX</button>
                  </div>
                </div>
                <div className="w-full px-1 mt-2 text-xs text-muted-foreground flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <span>Creation Fee</span>
                    <Info className="size-3.5" />
                  </div>
                  <span>30 SEI</span>
                </div>
                {formData.tokenSymbol && (
                  <div className="ml-1 w-full">
                    <p className="mt-1.25 text-neutral-400 text-xs">
                      You will receive <span>1,000,000</span>{" "}
                      <span>${formData.tokenSymbol.toUpperCase()}</span>
                    </p>
                  </div>
                )}
              </div>
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <button
                className="px-3 py-2 bg-accent rounded-lg text-sm font-semibold hover:scale-105 transition-all duration-500 text-center"
                onClick={() => {}}
              >
                Launch Agent
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateAgent; 