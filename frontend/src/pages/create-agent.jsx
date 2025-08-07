import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Textarea } from "@/components/ui/textarea";
import {
  ArrowRight,
  ChevronUp,
  File,
  Image,
  Info,
  Link,
  Wallet,
} from "lucide-react";
import React, { useRef, useState } from "react";
import { toast } from "sonner";
import SeiIcon from "@/components/sei-icon";
import { useReadContract, useBalance, useAccount } from "wagmi";
import { formatEther, parseEther } from "viem";
import { useAuth } from "../shared/hooks/useAuth";
import { useNavigate } from "react-router";
import config from "../shared/config";
import { Formik, Form, Field, ErrorMessage } from "formik";
import * as Yup from "yup";
import { useMutation } from "@tanstack/react-query";
import { createFetcher } from "@/lib/fetcher";
import AuthWrapper from "@/components/auth-wrapper";
import ModulsDeployerABI from "@/lib/abi/ModulsDeployer.json";
import { useWriteContract } from "wagmi";

const modulTypes = [
  {
    name: "GameFi NPC",
    emoji: "🎮",
    description: "Onchain AI that responds in-chat and via gameplay.",
    identifier: "GAME_FI_NPC",
    value: "GAME_FI_NPC",
  },
  {
    name: "DeFAI",
    emoji: "🧠",
    description: "Scan, snipe execute — fully autonomous, fully aligned",
    identifier: "DEFI_AI",
    value: "DEFI_AI",
  },
  {
    name: "Meme Token",
    emoji: "💸",
    description: "Mint, hype, moon — launch fully memetic, fully chaotic.",
    identifier: "MEME",
    value: "MEME",
  },
  {
    name: "Oracle Feed",
    emoji: "🔮",
    description: "Pulls and verifies external data onchain.",
    identifier: "ORACLE_FEED",
    value: "ORACLE_FEED",
  },
  {
    name: "Custom Logic",
    emoji: "🛠️",
    description: "Paste or upload a .goat.json to define custom behavior.",
    identifier: "CUSTOM",
    value: "CUSTOM",
  },
];

const acceptedImageFormats = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "application/gif",
];
const maxImageSize = 5 * 1024 * 1024;

// Initial form values
const initialValues = {
  name: "",
  description: "",
  modulType: modulTypes[0].value,
  tokenSymbol: "",
  totalSupply: 1000000000,
  agentImage: null,
  taxSettings: {
    totalTaxPercentage: 2,
    agentWalletShare: 50,
    devWalletShare: 50,
  },
  prebuySettings: {
    slippage: 1,
    amountInEther: 0,
  },
  launchDate: "", // Optional - no preset value
  websiteUrl: "",
  twitterUrl: "",
  telegramUrl: "",
  tags: [],
};

const CreateAgent = () => {
  const { address } = useAccount();
  const navigate = useNavigate();
  const { getAccessToken } = useAuth();
  const agentUniqueIdRef = useRef(null);
  const taxSettingsDivRef = useRef(null);
  const prebuyDivRef = useRef(null);

  const [showSocialLinks, setShowSocialLinks] = useState(false);
  const [selectedFileName, setSelectedFileName] = useState("");
  const [agentImageUrl, setAgentImageURL] = useState();

  // Get wallet balance for MAX button
  const { data: walletBalance } = useBalance({
    address: address,
  });

  // Yup validation schema
  const validationSchema = Yup.object({
    name: Yup.string()
      .min(3, "Agent name must be at least 3 characters")
      .max(100, "Agent name must be less than 100 characters")
      .required("Agent name is required"),
    description: Yup.string()
      .min(10, "Agent description must be at least 10 characters")
      .max(1024, "Agent description must be less than 1024 characters")
      .required("Agent description is required"),
    modulType: Yup.string()
      .oneOf(
        ["GAME_FI_NPC", "DEFI_AI", "MEME", "ORACLE_FEED", "CUSTOM"],
        "Invalid module type",
      )
      .required("Module type is required"),
    tokenSymbol: Yup.string()
      .min(3, "Token symbol must be at least 3 characters")
      .max(8, "Token symbol must be less than 8 characters")
      .required("Token symbol is required"),
    totalSupply: Yup.number()
      .min(1000000000, "Total supply must be at least 1,000,000,000")
      .required("Total supply is required"),
    taxSettings: Yup.object({
      totalTaxPercentage: Yup.number()
        .min(1, "Total tax percentage must be at least 1%")
        .max(10, "Total tax percentage must be at most 10%")
        .required("Total tax percentage is required"),
      agentWalletShare: Yup.number()
        .min(1, "Agent wallet share must be at least 1%")
        .max(100, "Agent wallet share must be at most 100%")
        .required("Agent wallet share is required"),
      devWalletShare: Yup.number()
        .min(1, "Dev wallet share must be at least 1%")
        .max(100, "Dev wallet share must be at most 100%")
        .required("Dev wallet share is required"),
    }),
    agentImage: Yup.mixed().required("Please upload an image"),
    prebuySettings: Yup.object({
      slippage: Yup.number()
        .min(1, "Slippage must be at least 1%")
        .max(50, "Slippage must be at most 50%")
        .required("Slippage is required"),
      amountInEther: Yup.number()
        .min(0, "Amount must be at least 0")
        .test("max-balance", "Insufficient balance", function (value) {
          if (!value || value <= 0) return true;
          return value <= walletBalance.value;
        })
        .optional(),
    }),
    launchDate: Yup.date()
      .test(
        "min-5-minutes",
        "Launch date must be at least 5 minutes from now",
        (value) => {
          if (!value) return true; // Optional field
          const now = new Date();
          const minDate = new Date(now.getTime() + 5 * 60 * 1000);
          return new Date(value) >= minDate;
        },
      )
      .optional(),
    websiteUrl: Yup.string().url("Invalid website URL").optional(),
    twitterUrl: Yup.string().url("Invalid Twitter URL").optional(),
    telegramUrl: Yup.string().url("Invalid Telegram URL").optional(),
  });

  // Read deployment fee from contract
  const { data: deploymentFee, isSuccess: deploymentFeeSuccess } =
    useReadContract({
      address: config.contractAddresses[config.chainMode].modulsDeployer,
      abi: ModulsDeployerABI,
      functionName: "deploymentFee",
      query: {
        enabled: !!config.contractAddresses[config.chainMode].modulsDeployer,
        refetchInterval: 20000,
      },
    });

  // contract interactions
  const { writeContract, isPending: deployModulsTokenPending } =
    useWriteContract({
      mutation: {
        onSuccess: (data) => {
          toast.success("Token deployment submitted");

          console.log("Token deployment submitted, ", data);
          navigate(`/agents/${agentUniqueIdRef.current}`);
        },
        onError: (error) => {
          console.log(error);
          toast.error("Failed to deploy token, please try again");
        },
      },
    });

  function deployModulsToken(args) {
    // Calculate total value needed (deployment fee + pre-buy amount)
    if (!deploymentFeeSuccess && !deploymentFee) {
      toast.error("Deployment fee not loaded, please try again");
      return;
    }

    // console.log(args.preBuySettings);
    const deploymentFeeValue = BigInt(deploymentFee || 0);
    const preBuyAmount = BigInt(args.preBuySettings.amountInWei);

    // Apply slippage to pre-buy amount: value + (slippage% * value)
    const slippageMultiplier = BigInt(args.preBuySettings.slippage.toString()); // Convert to basis points
    const slippageAmount = (preBuyAmount * slippageMultiplier) / BigInt(100); // Divide by 100 for percentage
    const effectivePreBuyAmount = preBuyAmount + slippageAmount;

    const totalValue = deploymentFeeValue + effectivePreBuyAmount;

    if (totalValue > walletBalance.value) {
      toast.error("Insufficient balance");
      return;
    }

    // Determine auto-register based on launch date
    const autoRegister = !!args.launchDate;

    writeContract({
      address: config.contractAddresses[config.chainMode].modulsDeployer,
      abi: ModulsDeployerABI,
      functionName: "deployToken",
      args: [
        args.name,
        args.symbol,
        args.initialSupply,
        args.agentWallet,
        args.taxPercent,
        args.agentSplit,
        args.intentId,
        args.metadataURI,
        preBuyAmount, // preBuyEthAmount
        autoRegister, // autoRegister - true if launch date is set
      ],
      value: totalValue,
    });
  }

  // Create agent mutation
  const createAgentMutation = useMutation({
    mutationFn: async (formData) => {
      const token = await getAccessToken();
      if (!token) {
        throw new Error("Please authenticate first");
      }

      // Use our normal createFetcher (which supports FormData)
      const response = await createFetcher({
        url: config.endpoints.createAgent,
        method: "POST",
        body: formData,
        auth: { accessToken: token },
        formEncoded: true,
      })();
      return response;
    },
    onSuccess: (data) => {
      toast.info(
        "Agent created, pulling up your wallet to sign the transaction",
      );

      agentUniqueIdRef.current = data.agent.uniqueId;

      const deploymentData = {
        name: data.agent.name,
        symbol: data.agent.tokenSymbol,
        initialSupply: data.agent.totalSupply,
        agentWallet: data.agent.walletAddress,
        taxPercent: data.agent.totalTaxPercentage,
        agentSplit: data.agent.agentWalletShare,
        intentId: data.agent.intentId,
        metadataURI: data.agent.logoUrl,
        preBuySettings: data.agent.preBuySettings,
        launchDate: data.agent.launchDate,
      };

      // console.log(deploymentData);
      deployModulsToken(deploymentData);
    },
    onError: (error) => {
      toast.error(error.message || "Failed to create agent, please try again");
    },
  });

  const handleImageUpload = (file, setFieldValue) => {
    if (
      file &&
      acceptedImageFormats.includes(file.type) &&
      file.size < maxImageSize
    ) {
      setSelectedFileName(file.name);
      const reader = new FileReader();
      reader.onloadend = () => {
        setAgentImageURL(reader.result);
      };
      reader.readAsDataURL(file);
      toast.success("Added image successfully");
      setFieldValue("agentImage", file);
    } else {
      toast.error("Invalid file type or size");
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e, setFieldValue) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleImageUpload(e.dataTransfer.files[0], setFieldValue);
    }
  };

  async function handleSubmit(values) {
    // Prepare the data object
    const agentData = {
      name: values.name,
      description: values.description,
      modulType: values.modulType,
      tokenSymbol: values.tokenSymbol,
      totalSupply: values.totalSupply,
      totalTaxPercentage: values.taxSettings.totalTaxPercentage,
      agentWalletShare: values.taxSettings.agentWalletShare,
      devWalletShare: values.taxSettings.devWalletShare,
      slippage: values.prebuySettings.slippage,
      amountInWei: parseEther(
        (values.prebuySettings.amountInEther || 0).toString(),
      ).toString(),
      websiteUrl: values.websiteUrl,
      twitterUrl: values.twitterUrl,
      telegramUrl: values.telegramUrl,
      tags: [
        modulTypes.find((modul) => modul.value === values.modulType).name,
        values.name,
        values.tokenSymbol,
      ].join(","),
      image: values.agentImage,
      launchDate: values.launchDate,
    };

    createAgentMutation.mutate(agentData);
  }

  return (
    <AuthWrapper pageLevel={true}>
      {() => (
        <div className="px-6 pt-4 pb-12 flex flex-col">
          <div className="max-w-lg mx-auto">
            <div className="ml-1">
              <h1 className="text-2xl font-bold">Launch Your Agent</h1>
              <p className="mt-1 text-lg text-muted-foreground">
                Plug logic into the chain. Give it a name. Let it cook.
              </p>
            </div>

            <Formik
              initialValues={initialValues}
              validationSchema={validationSchema}
              onSubmit={handleSubmit}
              context={{ walletBalance: walletBalance?.value || 0 }}
            >
              {({ values, setFieldValue, isValid }) => (
                <Form className="">
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
                        <Field
                          as={Input}
                          id="agent-name"
                          name="name"
                          placeholder="Name your Agent. Go wild"
                          className="mt-1"
                        />
                        <ErrorMessage
                          name="name"
                          component="div"
                          className="text-red-500 text-sm mt-1"
                        />
                      </div>
                      <div className="flex-1">
                        <label htmlFor="token-symbol" className="ml-1">
                          Token Symbol
                        </label>
                        <Field
                          as={Input}
                          id="token-symbol"
                          name="tokenSymbol"
                          placeholder="Ticker for your token, like $MOD"
                          className="mt-1"
                          maxLength={5}
                        />
                        <ErrorMessage
                          name="tokenSymbol"
                          component="div"
                          className="text-red-500 text-sm mt-1"
                        />
                      </div>
                    </div>
                    <div className="">
                      <label htmlFor="agent-prompt" className="ml-1">
                        Agent Description/Prompt
                      </label>
                      <Field
                        as={Textarea}
                        id="agent-prompt"
                        name="description"
                        placeholder="A degen AI that hypes launches, roasts rugs, and protects LPs."
                        className="mt-2"
                      />
                      <ErrorMessage
                        name="description"
                        component="div"
                        className="text-red-500 text-sm mt-1"
                      />
                      <p className="ml-1 mt-1 text-xs text-muted-foreground">
                        Set the tone. Define the agent's behavior or chat style.
                      </p>
                    </div>

                    {/* Modul Type Selection */}
                    <div className="">
                      <label className="ml-1">Modul Type</label>
                      <div className="mt-2 grid grid-cols-1 gap-2">
                        {modulTypes.map((modul) => (
                          <div
                            key={modul.identifier}
                            className={`p-3 border rounded-lg cursor-pointer transition-all duration-200 ${
                              values.modulType === modul.value
                                ? "border-accent bg-accent/10"
                                : "border-border hover:border-accent/50"
                            }`}
                            onClick={() =>
                              setFieldValue("modulType", modul.value)
                            }
                          >
                            <div className="flex items-center gap-3">
                              <div className="text-xl">{modul.emoji}</div>
                              <div className="flex-1 min-w-0">
                                <h3 className="font-semibold text-foreground text-sm">
                                  {modul.name}
                                </h3>
                                <p className="text-xs text-muted-foreground">
                                  {modul.description}
                                </p>
                              </div>
                              {values.modulType === modul.value && (
                                <div className="w-4 h-4 bg-accent rounded-full flex items-center justify-center flex-shrink-0">
                                  <div className="w-1.5 h-1.5 bg-accent-foreground rounded-full"></div>
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                      <ErrorMessage
                        name="modulType"
                        component="div"
                        className="text-red-500 text-sm mt-1"
                      />
                    </div>

                    <div>
                      <div className="ml-1 mt-5 flex items-center gap-2">
                        <Link className="size-4" />
                        <p>
                          add social links{" "}
                          <span className="text-muted-foreground">
                            (optional)
                          </span>
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
                          <Field
                            as={Input}
                            id="website"
                            name="websiteUrl"
                            placeholder="Enter URL"
                            className="mt-1"
                          />
                          <ErrorMessage
                            name="websiteUrl"
                            component="div"
                            className="text-red-500 text-sm mt-1"
                          />
                        </div>
                        <div className="">
                          <label htmlFor="x-url" className="ml-1">
                            X
                          </label>
                          <Field
                            as={Input}
                            id="x-url"
                            name="twitterUrl"
                            placeholder="Enter URL"
                            className="mt-1"
                          />
                          <ErrorMessage
                            name="twitterUrl"
                            component="div"
                            className="text-red-500 text-sm mt-1"
                          />
                        </div>
                        <div className="">
                          <label htmlFor="telegram" className="ml-1">
                            Telegram
                          </label>
                          <Field
                            as={Input}
                            id="telegram"
                            name="telegramUrl"
                            placeholder="Enter URL"
                            className="mt-1"
                          />
                          <ErrorMessage
                            name="telegramUrl"
                            component="div"
                            className="text-red-500 text-sm mt-1"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Agent Image Upload */}
                    <div className="">
                      <label htmlFor="agent-image" className="ml-1">
                        Agent Image
                      </label>
                      <div
                        className="mt-2 p-8 border-2 border-dashed border-accent/20 rounded-lg text-center cursor-pointer hover:border-accent/40 transition-colors"
                        onDragOver={handleDragOver}
                        onDrop={(e) => handleDrop(e, setFieldValue)}
                        onClick={() =>
                          document.getElementById("agent-image").click()
                        }
                      >
                        {agentImageUrl ? (
                          <div className="flex flex-col items-center gap-2">
                            <img
                              src={agentImageUrl}
                              alt="Agent"
                              className="w-20 h-20 object-cover rounded-lg"
                            />
                            <p className="text-sm text-muted-foreground">
                              {selectedFileName}
                            </p>
                          </div>
                        ) : (
                          <div className="flex flex-col items-center gap-2">
                            <Image className="size-8 text-muted-foreground" />
                            <p className="text-sm font-medium">
                              Drop image here or click to upload
                            </p>
                            <p className="text-xs text-muted-foreground">
                              JPG, PNG, GIF up to 5MB
                            </p>
                          </div>
                        )}
                        <input
                          type="file"
                          id="agent-image"
                          name="agentImage"
                          className="sr-only"
                          onChange={(e) =>
                            handleImageUpload(e.target.files[0], setFieldValue)
                          }
                        />
                      </div>
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

                      <ErrorMessage
                        name="agentImage"
                        component="div"
                        className="text-red-500 text-sm mt-1"
                      />
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
                          <span className="text-sm">
                            {values.taxSettings.totalTaxPercentage}%
                          </span>
                        </label>
                        <div className="mt-2 flex flex-col gap-1.5 items-center">
                          <Slider
                            className=""
                            rangeClassName="dark:bg-accent"
                            thumbClassName="dark:border-accent"
                            min={2}
                            max={10}
                            step={1}
                            value={[values.taxSettings.totalTaxPercentage]}
                            onValueChange={(value) =>
                              setFieldValue(
                                "taxSettings.totalTaxPercentage",
                                value[0],
                              )
                            }
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
                          <span className="text-sm">
                            {values.taxSettings.agentWalletShare}%
                          </span>
                        </label>
                        <div className="mt-3 flex flex-col gap-1.5 items-center">
                          <Slider
                            className="mt-2"
                            rangeClassName="dark:bg-accent"
                            thumbClassName="dark:border-accent"
                            min={1}
                            max={100}
                            step={1}
                            value={[values.taxSettings.agentWalletShare]}
                            onValueChange={(value) => {
                              setFieldValue(
                                "taxSettings.agentWalletShare",
                                value[0],
                              );
                              setFieldValue(
                                "taxSettings.devWalletShare",
                                100 - value[0],
                              );
                            }}
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
                            <span className="text-muted-foreground">
                              (optional)
                            </span>
                          </p>
                          <span className="text-sm">
                            {values.taxSettings.devWalletShare}%
                          </span>
                        </label>
                        <div className="mt-3 flex flex-col gap-1.5 items-center">
                          <Slider
                            className=""
                            rangeClassName="dark:bg-accent"
                            thumbClassName="dark:border-accent"
                            min={0}
                            max={99}
                            step={1}
                            value={[values.taxSettings.devWalletShare]}
                            onValueChange={(value) => {
                              setFieldValue(
                                "taxSettings.devWalletShare",
                                value[0],
                              );
                              setFieldValue(
                                "taxSettings.agentWalletShare",
                                100 - value[0],
                              );
                            }}
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
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
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
                      <h2 className="text-xl font-semibold">Launch Schedule</h2>
                      <p className="text-muted-foreground">
                        Set when trading opens for your token. Leave empty to
                        deploy without opening trading yet.
                      </p>
                    </div>
                    <div className="mt-3 px-2 py-4 bg-neutral-850 border rounded-lg flex flex-col gap-4">
                      <div className="w-full flex flex-col gap-1">
                        <label
                          htmlFor="launch-date"
                          className="ml-1 text-sm font-semibold"
                        >
                          Launch Date & Time
                        </label>
                        <Field
                          as={Input}
                          type="datetime-local"
                          id="launch-date"
                          name="launchDate"
                          className="py-2"
                        />
                        <ErrorMessage
                          name="launchDate"
                          component="div"
                          className="text-red-500 text-sm mt-1"
                        />
                        <p className="text-xs text-muted-foreground ml-1">
                          Optional: Must be at least 5 minutes from now if set.
                          Token deploys immediately, trading opens at the
                          specified time.
                        </p>
                      </div>
                    </div>

                    <div className="mt-4 ml-1">
                      <h3 className="text-lg font-semibold">Pre-buy Token</h3>
                      <p className="text-muted-foreground">
                        Purchasing a small amount of your token is optional but
                        can help protect your coin from snipers.
                      </p>
                    </div>
                    <div className="mt-3 px-2 py-4 bg-neutral-850 border rounded-lg flex flex-col gap-4">
                      {values.prebuySettings.amountInEther > 0 &&
                        !values.launchDate && (
                          <div className="w-full p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                            <p className="text-sm text-yellow-600 dark:text-yellow-400">
                              ⚠️ Pre-buy requires trading to be enabled. Please
                              set a launch date to enable pre-buy functionality.
                            </p>
                          </div>
                        )}
                      <div className="w-full flex flex-col gap-1">
                        <label
                          htmlFor="slippage"
                          className="ml-1 text-sm font-semibold"
                        >
                          Slippage (%)
                        </label>
                        <Field
                          as={Input}
                          type="number"
                          id="slippage"
                          name="prebuySettings.slippage"
                          className="py-2"
                          disabled={!values.launchDate}
                        />
                        <ErrorMessage
                          name="prebuySettings.slippage"
                          component="div"
                          className="text-red-500 text-sm mt-1"
                        />
                      </div>
                      <div className="w-full flex flex-col gap-1">
                        <label
                          htmlFor="amount"
                          className="ml-1 text-sm font-semibold"
                        >
                          Amount
                        </label>
                        <div className="relative">
                          <Field
                            as={Input}
                            type="number"
                            id="amount"
                            name="prebuySettings.amountInEther"
                            className="py-2 pr-24 appearance-none"
                            disabled={!values.launchDate}
                          />
                          <div className="absolute top-[50%] translate-y-[-50%] right-4 flex items-center gap-2 text-neutral-400">
                            <button
                              type="button"
                              className="text-green-500 hover:text-green-400 transition-colors text-xs font-medium"
                              onClick={() => {
                                if (walletBalance?.formatted) {
                                  setFieldValue(
                                    "prebuySettings.amountInEther",
                                    parseFloat(walletBalance.formatted),
                                  );
                                }
                              }}
                            >
                              MAX
                            </button>
                            <div className="w-px h-4 bg-border"></div>
                            <div className="flex items-center gap-1">
                              <span className="uppercase text-xs">sei</span>
                              <SeiIcon className="size-4" />
                            </div>
                          </div>
                        </div>
                        <ErrorMessage
                          name="prebuySettings.amountInEther"
                          component="div"
                          className="text-red-500 text-sm mt-1"
                        />
                        <div className="px-1 w-full flex justify-between text-xs">
                          <div className="flex items-center gap-1">
                            <Wallet className="size-3" />
                            <span className="">
                              {walletBalance?.formatted
                                ? `${walletBalance.formatted} SEI`
                                : "0 SEI"}
                            </span>
                          </div>
                        </div>
                        <div className="w-full px-1 mt-2 text-xs text-muted-foreground flex justify-between items-center">
                          <div className="flex items-center gap-2">
                            <span>Deployment Fee</span>
                            <Info className="size-3.5" />
                          </div>
                          <span>
                            {deploymentFee
                              ? `${formatEther(deploymentFee)} SEI`
                              : "Loading..."}
                          </span>
                        </div>
                        <div className="w-full px-1 mt-1 text-xs text-muted-foreground flex justify-between items-center">
                          <div className="flex items-center gap-2">
                            <span>Total Required</span>
                            <Info className="size-3.5" />
                          </div>
                          <span>
                            {deploymentFee &&
                            values.launchDate &&
                            values.prebuySettings.amountInEther
                              ? `${formatEther(
                                  BigInt(deploymentFee) +
                                    parseEther(
                                      (
                                        values.prebuySettings.amountInEther || 0
                                      ).toString(),
                                    ),
                                )} SEI`
                              : deploymentFee
                                ? `${formatEther(deploymentFee)} SEI`
                                : "Loading..."}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="mt-4 flex justify-end gap-2">
                      <button
                        type="submit"
                        disabled={
                          createAgentMutation.isPending ||
                          !isValid ||
                          deployModulsTokenPending
                        }
                        className="px-3 py-2 bg-accent rounded-lg text-sm font-semibold hover:scale-105 transition-all duration-500 text-center disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                      >
                        {(createAgentMutation.isPending ||
                          deployModulsTokenPending) && (
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        )}
                        {createAgentMutation.isPending ||
                        deployModulsTokenPending
                          ? createAgentMutation.isPending
                            ? "Creating Agent..."
                            : "Deploying Token..."
                          : "Launch Agent"}
                      </button>
                    </div>
                  </div>
                </Form>
              )}
            </Formik>
          </div>
        </div>
      )}
    </AuthWrapper>
  );
};

export default CreateAgent;
