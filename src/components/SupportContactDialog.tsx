import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

type SupportContactDialogProps = {
  trigger: React.ReactNode;
  defaultSubject?: string;
  source?: string;
  kind?: "support" | "refund" | "privacy" | "terms" | "billing" | "other";
};

const SupportContactDialog = ({ trigger, defaultSubject, source, kind }: SupportContactDialogProps) => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState(user?.email ?? "");
  const [subject, setSubject] = useState(defaultSubject ?? "");
  const [message, setMessage] = useState("");

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!message.trim()) {
      toast({ variant: "destructive", title: "Message required", description: "Please enter your message." });
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        name: name.trim() || null,
        email: email.trim() || null,
        subject: subject.trim() || null,
        message: message.trim(),
        source: source ?? window.location.pathname,
        kind: kind ?? "support",
      };

      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData.session?.access_token;

      const { error } = await supabase.functions.invoke("support-request", {
        body: payload,
        headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined,
      });
      if (error) throw error;

      toast({
        title: "Request sent",
        description: "We received your request. You'll hear back on email soon.",
      });
      setMessage("");
      if (!defaultSubject) setSubject("");
      setOpen(false);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to send message.";
      toast({ variant: "destructive", title: "Send failed", description: message });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="bg-background border-border">
        <DialogHeader>
          <DialogTitle>Contact Support</DialogTitle>
          <DialogDescription>
            Share your question or issue and we'll respond as soon as possible. You can also email{" "}
            <span className="font-medium text-foreground">support@banklefy.com</span>.
          </DialogDescription>
        </DialogHeader>
        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <label className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Name</label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" />
            </div>
            <div className="space-y-1">
              <label className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Email</label>
              <Input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                type="email"
              />
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Subject</label>
            <Input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Subject (optional)" />
          </div>
          <div className="space-y-1">
            <label className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Message</label>
            <Textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Tell us what you need help with..."
              rows={5}
            />
          </div>
          <div className="flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" className="bg-primary text-primary-foreground" disabled={submitting}>
              {submitting ? "Sending..." : "Send Message"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default SupportContactDialog;
