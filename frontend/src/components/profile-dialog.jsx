import { useState } from "react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import { Separator } from "./ui/separator";
import { Camera } from "lucide-react";
import { Textarea } from "./ui/textarea";
import { FaTelegram, FaXTwitter } from "react-icons/fa6";
import { Input } from "./ui/input";

const acceptedImageFormats = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "application/gif",
];
const maxImageSize = 5 * 1024 * 1024;

const ProfileDialog = ({ open, onOpenChange }) => {
  const [profilePic, setProfilePic] = useState();
  const [profilePicUrl, setProfilePicURL] = useState();

  const handleFileChange = (e) => {
    const file = e.target.files[0];

    if (
      file &&
      acceptedImageFormats.includes(file.type) &&
      file.size < maxImageSize
    ) {
      setProfilePic(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setProfilePicURL(reader.result);
      };
      reader.readAsDataURL(file);
      toast.success("Added image successfully");
    }
  };
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent showCloseButton={true} className="md:w-sm">
        <DialogHeader>
          <DialogTitle>Profile</DialogTitle>
          <DialogDescription className="sr-only">
            Update your profile
          </DialogDescription>
        </DialogHeader>
        <Separator className="my-2" />
        <div className="mt-2 flex flex-col gap-2">
          <div className="flex w-full justify-center">
            <div className="relative">
              <label
                htmlFor="profile-pic"
                className="block size-24 rounded-full border-2 border-accent"
              >
                {profilePic && (
                  <img
                    src={profilePicUrl}
                    alt="profile pic"
                    className="size-full rounded-full object-cover"
                  />
                )}
                <input
                  type="file"
                  id="profile-pic"
                  name="profilePic"
                  className="sr-only"
                  onChange={handleFileChange}
                />
                <Camera className="absolute right-1 bottom-1 size-6 fill-background" />
              </label>
            </div>
          </div>
          <div className="">
            <label htmlFor="bio" className="ml-1 font-medium">
              Bio
            </label>
            <Textarea
              id="bio"
              placeholder="Describe yourself"
              className="mt-1"
            />
            <button className="bg-button-gradient mt-2 cursor-pointer rounded-md px-3 py-1">
              Save
            </button>
          </div>

          <p className="mt-4 text-lg font-medium">Social Links</p>
          <div className="flex flex-col gap-4">
            <div className="">
              <label
                htmlFor="x"
                className="ml-1 flex items-center gap-2 font-medium"
              >
                <FaXTwitter />
                <span>X/Twitter</span>
              </label>
              <div className="mt-1 flex w-full items-center gap-2">
                <Input
                  id="x"
                  placeholder="X URL"
                  className="placeholder:text-base"
                />
                <button className="from-logo bg-button-gradient cursor-pointer rounded-md px-3 py-1">
                  Save
                </button>
              </div>
            </div>
            <div className="">
              <label
                htmlFor="telegram"
                className="ml-1 flex items-center gap-2 font-medium"
              >
                <FaTelegram />
                <span>Telegram</span>
              </label>
              <div className="mt-1 flex w-full items-center gap-2">
                <Input
                  id="telegram"
                  placeholder="Telegram URL"
                  className="placeholder:text-base"
                />
                <button className="from-logo cursor-pointer rounded-md bg-button-gradient px-3 py-1">
                  Save
                </button>
              </div>
            </div>
          </div>
        </div>
        <DialogFooter className="h-4"></DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ProfileDialog;
