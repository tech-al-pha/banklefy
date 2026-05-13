import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Crown, User } from "lucide-react";

type UploadDemoDialogsProps = {
  showLimitDialog: boolean;
  setShowLimitDialog: (value: boolean) => void;
  limitDialogTitle: string;
  limitDialogMessage: string;
  limitDialogShowSignup: boolean;
  limitDialogShowPricing: boolean;
  showUpgradeDialog: boolean;
  setShowUpgradeDialog: (value: boolean) => void;
  onGoToAuth: () => void;
  onGoToPricing: () => void;
};

export const UploadDemoDialogs = ({
  showLimitDialog,
  setShowLimitDialog,
  limitDialogTitle,
  limitDialogMessage,
  limitDialogShowSignup,
  limitDialogShowPricing,
  showUpgradeDialog,
  setShowUpgradeDialog,
  onGoToAuth,
  onGoToPricing,
}: UploadDemoDialogsProps) => {
  return (
    <>
      <Dialog open={showLimitDialog} onOpenChange={setShowLimitDialog}>
        <DialogContent className="bg-card border-primary/20">
          <DialogHeader>
            <DialogTitle>{limitDialogTitle}</DialogTitle>
            <DialogDescription className="space-y-4 pt-4">
              <p>{limitDialogMessage}</p>
              <div className="flex gap-2 pt-2">
                {limitDialogShowSignup && (
                  <Button
                    className="bg-primary text-primary-foreground"
                    onClick={() => {
                      setShowLimitDialog(false);
                      onGoToAuth();
                    }}
                  >
                    <User className="mr-2 h-4 w-4" />
                    Sign Up
                  </Button>
                )}
                {limitDialogShowPricing && (
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowLimitDialog(false);
                      onGoToPricing();
                    }}
                  >
                    <Crown className="mr-2 h-4 w-4" />
                    View Plans
                  </Button>
                )}
                <Button variant="ghost" onClick={() => setShowLimitDialog(false)}>
                  Close
                </Button>
              </div>
            </DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>

      <Dialog open={showUpgradeDialog} onOpenChange={setShowUpgradeDialog}>
        <DialogContent className="bg-card border-primary/20">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Crown className="h-5 w-5 text-amber-500" />
              Premium Feature
            </DialogTitle>
            <DialogDescription className="space-y-4 pt-4">
              <p>This export is available for paid users only.</p>
              <p className="text-sm text-muted-foreground">
                Upgrade your plan to unlock premium formats beyond XLSX and CSV.
              </p>
              <div className="flex gap-2 pt-4">
                <Button
                  className="bg-primary text-primary-foreground"
                  onClick={() => {
                    setShowUpgradeDialog(false);
                    onGoToPricing();
                  }}
                >
                  <Crown className="mr-2 h-4 w-4" />
                  View Plans
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setShowUpgradeDialog(false)}
                >
                  Maybe Later
                </Button>
              </div>
            </DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>
    </>
  );
};
