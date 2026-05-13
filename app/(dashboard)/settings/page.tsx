"use client";

import { useState, useEffect } from "react";
import { Topbar } from "@/components/layout/topbar";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Settings, Building2, Users, Bell, Shield, Loader2, User } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { api } from "@/lib/trpc/client";

function getInitials(name: string) {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

// ─── Organization Tab ─────────────────────────────────────────────────────────

function OrgTab() {
  const { data: org, isLoading } = api.settings.getOrg.useQuery();
  const [name, setName] = useState("");
  const utils = api.useUtils();

  useEffect(() => { if (org?.name) setName(org.name); }, [org?.name]);

  const updateOrg = api.settings.updateOrg.useMutation({
    onSuccess: () => utils.settings.getOrg.invalidate(),
  });

  return (
    <div className="space-y-6">
      <Card className="p-6 space-y-5">
        <div>
          <h3 className="text-sm font-semibold mb-0.5">Organization Details</h3>
          <p className="text-xs text-muted-foreground">Update your organization name and settings</p>
        </div>
        <Separator />
        {isLoading ? (
          <div className="space-y-4 max-w-sm">
            <div className="space-y-1.5"><Skeleton className="h-4 w-32" /><Skeleton className="h-9 w-full" /></div>
            <div className="space-y-1.5"><Skeleton className="h-4 w-16" /><Skeleton className="h-9 w-full" /></div>
          </div>
        ) : (
        <div className="space-y-4 max-w-sm">
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Organization name</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="h-9 text-sm"
              placeholder="My Company"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Plan</Label>
            <div className="flex items-center gap-2">
              <Input
                value={org?.planTier ? org.planTier.charAt(0) + org.planTier.slice(1).toLowerCase() : "Free"}
                className="h-9 text-sm"
                readOnly
              />
              <Button size="sm" className="h-9 text-xs shrink-0">Upgrade</Button>
            </div>
          </div>
        </div>
        )}
        <Button
          size="sm"
          className="h-9 text-sm"
          disabled={!name.trim() || name === org?.name || updateOrg.isPending}
          onClick={() => updateOrg.mutate({ name: name.trim() })}
        >
          {updateOrg.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : null}
          Save changes
        </Button>
      </Card>

      <Card className="p-6 border-destructive/30">
        <div className="flex items-start gap-3">
          <Shield className="h-4 w-4 text-destructive mt-0.5" />
          <div className="flex-1">
            <h3 className="text-sm font-semibold text-destructive mb-0.5">Danger zone</h3>
            <p className="text-xs text-muted-foreground mb-3">Irreversible actions. Proceed with caution.</p>
            <Button variant="destructive" size="sm" className="h-8 text-xs">Delete organization</Button>
          </div>
        </div>
      </Card>
    </div>
  );
}

// ─── Profile Tab ──────────────────────────────────────────────────────────────

function ProfileTab() {
  const { data: profile, isLoading } = api.settings.getProfile.useQuery();
  const [name, setName] = useState("");
  const utils = api.useUtils();

  useEffect(() => { if (profile?.name) setName(profile.name); }, [profile?.name]);

  const updateProfile = api.settings.updateProfile.useMutation({
    onSuccess: () => utils.settings.getProfile.invalidate(),
  });

  return (
    <Card className="p-6 space-y-5">
      <div>
        <h3 className="text-sm font-semibold mb-0.5">Your Profile</h3>
        <p className="text-xs text-muted-foreground">Manage your personal account details</p>
      </div>
      <Separator />
      {isLoading ? (
        <div className="flex items-center gap-4">
          <Skeleton className="h-14 w-14 rounded-full" />
          <div className="space-y-2"><Skeleton className="h-4 w-28" /><Skeleton className="h-3 w-40" /></div>
        </div>
      ) : (
      <div className="flex items-center gap-4">
        <Avatar className="h-14 w-14">
          <AvatarFallback className="bg-primary text-primary-foreground text-lg font-semibold">
            {profile?.name ? getInitials(profile.name) : "U"}
          </AvatarFallback>
        </Avatar>
        <div>
          <p className="text-sm font-semibold">{profile?.name ?? "—"}</p>
          <p className="text-xs text-muted-foreground">{profile?.email ?? "—"}</p>
        </div>
      </div>
      )}
      <div className="space-y-4 max-w-sm">
        <div className="space-y-1.5">
          <Label className="text-xs font-medium">Display name</Label>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="h-9 text-sm"
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs font-medium">Email</Label>
          <Input value={profile?.email ?? ""} className="h-9 text-sm" readOnly />
          <p className="text-xs text-muted-foreground">To change your email, update it in your Supabase account settings.</p>
        </div>
      </div>
      <Button
        size="sm"
        className="h-9 text-sm"
        disabled={!name.trim() || name === profile?.name || updateProfile.isPending}
        onClick={() => updateProfile.mutate({ name: name.trim() })}
      >
        {updateProfile.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : null}
        Save changes
      </Button>
    </Card>
  );
}

// ─── Team Tab ─────────────────────────────────────────────────────────────────

function TeamTab() {
  const { data: members, isLoading } = api.settings.getMembers.useQuery();

  return (
    <Card className="p-6">
      <h3 className="text-sm font-semibold mb-4">Team Members</h3>
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2].map((i) => (
            <div key={i} className="flex items-center justify-between py-2">
              <div className="flex items-center gap-3">
                <Skeleton className="h-8 w-8 rounded-full" />
                <div className="space-y-1.5"><Skeleton className="h-4 w-28" /><Skeleton className="h-3 w-36" /></div>
              </div>
              <Skeleton className="h-5 w-14 rounded-full" />
            </div>
          ))}
        </div>
      ) : (
      <div className="divide-y divide-border">
        {(members ?? []).map((member) => (
          <div key={member.id} className="flex items-center justify-between py-3 first:pt-0 last:pb-0">
            <div className="flex items-center gap-3">
              <Avatar className="h-8 w-8">
                <AvatarFallback className="bg-muted text-xs font-semibold">
                  {getInitials(member.user.name)}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="text-sm font-medium">{member.user.name}</p>
                <p className="text-xs text-muted-foreground">{member.user.email}</p>
              </div>
            </div>
            <Badge variant="secondary" className="text-xs capitalize">
              {member.role.toLowerCase()}
            </Badge>
          </div>
        ))}
      </div>
      )}
      <Button variant="outline" size="sm" className="h-9 mt-5 gap-1.5 text-sm">
        <Users className="h-3.5 w-3.5" />
        Invite team member
      </Button>
    </Card>
  );
}

// ─── Notifications Tab ────────────────────────────────────────────────────────

const NOTIFICATION_PREFS = [
  { label: "Critical low stock alerts", description: "Immediately when items hit zero" },
  { label: "Daily digest", description: "Summary of inventory health every morning" },
  { label: "AI insight summaries", description: "Weekly intelligence report" },
  { label: "Reorder reminders", description: "When items cross the reorder point" },
];

function NotificationsTab() {
  return (
    <Card className="p-6">
      <h3 className="text-sm font-semibold mb-1">Notification Preferences</h3>
      <p className="text-xs text-muted-foreground mb-4">Configure when and how you receive alerts</p>
      <div className="space-y-0 divide-y divide-border">
        {NOTIFICATION_PREFS.map((pref) => (
          <div key={pref.label} className="flex items-center justify-between py-3">
            <div>
              <p className="text-sm font-medium">{pref.label}</p>
              <p className="text-xs text-muted-foreground">{pref.description}</p>
            </div>
            <input type="checkbox" defaultChecked className="h-4 w-4 accent-primary" />
          </div>
        ))}
      </div>
    </Card>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function SettingsPage() {
  return (
    <div className="flex flex-col">
      <Topbar title="Settings" subtitle="Manage your workspace and preferences" />

      <div className="flex-1 p-6 max-w-3xl">
        <Tabs defaultValue="organization">
          <TabsList className="mb-6">
            <TabsTrigger value="organization" className="gap-2 text-sm">
              <Building2 className="h-3.5 w-3.5" />Organization
            </TabsTrigger>
            <TabsTrigger value="profile" className="gap-2 text-sm">
              <User className="h-3.5 w-3.5" />Profile
            </TabsTrigger>
            <TabsTrigger value="team" className="gap-2 text-sm">
              <Users className="h-3.5 w-3.5" />Team
            </TabsTrigger>
            <TabsTrigger value="notifications" className="gap-2 text-sm">
              <Bell className="h-3.5 w-3.5" />Notifications
            </TabsTrigger>
          </TabsList>

          <TabsContent value="organization"><OrgTab /></TabsContent>
          <TabsContent value="profile"><ProfileTab /></TabsContent>
          <TabsContent value="team"><TeamTab /></TabsContent>
          <TabsContent value="notifications"><NotificationsTab /></TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
