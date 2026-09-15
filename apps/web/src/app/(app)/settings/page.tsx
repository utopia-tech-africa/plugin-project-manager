"use client";

import { ChevronDownIcon } from "lucide-react";
import type { ReactNode } from "react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import {
  useGetTeams,
  useGetTeamsById,
  usePostInvites,
  usePostTeams,
  usePostTeamsSubTeams,
  usePutTeamsPhases,
} from "@/lib/api/generated/client";
import { ApiError } from "@/lib/api/problem-details";
import { useAuthStore } from "@/lib/auth/auth-store";
import { slugify, uniqueSlugs } from "@/lib/slug";
import type {
  InviteCreated,
  TeamDetail,
  TeamMember,
  TeamSummary,
} from "@/lib/types";
import { cn } from "@/lib/utils";

type PhaseDraft = {
  key: string;
  name: string;
  step: string;
  subTeamId: string;
};

const SettingsGroup = ({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: ReactNode;
}) => (
  <section className="flex flex-col gap-5">
    <div>
      <h2 className="font-heading text-2xl tracking-tight">{title}</h2>
      <p className="mt-1 text-sm text-muted-foreground">{description}</p>
    </div>
    {children}
  </section>
);

const sortedMembers = (memberships: TeamMember[]) =>
  [...memberships].sort((left, right) => {
    if (left.role === right.role) {
      return left.user.fullName.localeCompare(right.user.fullName);
    }
    return left.role === "lead" ? -1 : 1;
  });

export default function SettingsPage() {
  const user = useAuthStore((state) => state.user);
  const teamsQuery = useGetTeams();
  const createTeam = usePostTeams();
  const createSubTeam = usePostTeamsSubTeams();
  const savePhases = usePutTeamsPhases();
  const createInvite = usePostInvites();
  const teams = (teamsQuery.data as TeamSummary[] | undefined) ?? [];
  const [selectedTeamId, setSelectedTeamId] = useState<string | undefined>(
    undefined,
  );
  const teamId =
    selectedTeamId === undefined ? (teams[0]?.id ?? "") : selectedTeamId;
  const teamQuery = useGetTeamsById(teamId, {
    query: { enabled: teamId.length > 0 },
  });
  const team = teamQuery.data as TeamDetail | undefined;
  const isAdmin = user?.orgRole === "admin";
  const canConfigure =
    isAdmin === true ||
    user?.teamRoles.some(
      (item) => item.teamId === teamId && item.role === "lead",
    ) === true;

  const [teamName, setTeamName] = useState("");
  const [subTeamName, setSubTeamName] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteSubTeamId, setInviteSubTeamId] = useState("none");
  const [inviteRole, setInviteRole] = useState<"member" | "lead">("member");
  const [inviteUrl, setInviteUrl] = useState<string | null>(null);
  const [expandedSubTeamIds, setExpandedSubTeamIds] = useState<string[]>([]);

  const phaseDrafts = useMemo<PhaseDraft[]>(() => {
    if (team === undefined) {
      return [];
    }
    return team.phases.map((phase) => ({
      key: phase.id,
      name: phase.name,
      step: String(phase.step),
      subTeamId: phase.subTeamId,
    }));
  }, [team]);
  const [phases, setPhases] = useState<PhaseDraft[] | null>(null);
  const editor = phases ?? phaseDrafts;
  const subTeamItems = Object.fromEntries(
    (team?.subTeams ?? []).map((subTeam) => [subTeam.id, subTeam.name]),
  );

  const updatePhase = (index: number, patch: Partial<PhaseDraft>) => {
    setPhases(
      editor.map((item, itemIndex) =>
        itemIndex === index ? { ...item, ...patch } : item,
      ),
    );
  };

  return (
    <div className="flex flex-col gap-12">
      <PageHeader eyebrow="Configure" title="Settings" />

      {teams.length === 0 && !isAdmin ? (
        <p className="text-muted-foreground">
          No teams yet. An admin can create the first one.
        </p>
      ) : null}

      <SettingsGroup
        title="Team"
        description="Click a team to see its sub-teams and members."
      >
        {isAdmin ? (
          <section className="ticket">
            <h3 className="font-heading text-xl">New team</h3>
            <form
              className="mt-4"
              onSubmit={async (event) => {
                event.preventDefault();
                try {
                  const created = (await createTeam.mutateAsync({
                    data: { name: teamName },
                  })) as unknown as TeamSummary;
                  setTeamName("");
                  setSelectedTeamId(created.id);
                  toast.success("Team created.");
                  await teamsQuery.refetch();
                } catch (error) {
                  toast.error(
                    error instanceof ApiError
                      ? error.message
                      : "Could not create the team.",
                  );
                }
              }}
            >
              <FieldGroup>
                <Field>
                  <FieldLabel htmlFor="team-name">Name</FieldLabel>
                  <Input
                    id="team-name"
                    value={teamName}
                    onChange={(event) => setTeamName(event.target.value)}
                    required
                  />
                </Field>
                <Button type="submit">Create team</Button>
              </FieldGroup>
            </form>
          </section>
        ) : null}

        {teams.length > 0 ? (
          <ul className="flex flex-col gap-3">
            {teams.map((item) => {
              const open = item.id === teamId;
              return (
                <li key={item.id} className="ticket">
                  <button
                    type="button"
                    aria-expanded={open}
                    className="flex w-full items-center justify-between gap-3 text-left"
                    onClick={() => {
                      if (item.id === teamId) {
                        setSelectedTeamId("");
                        setExpandedSubTeamIds([]);
                        return;
                      }
                      setSelectedTeamId(item.id);
                      setExpandedSubTeamIds([]);
                      setPhases(null);
                      setInviteUrl(null);
                      setInviteSubTeamId("none");
                    }}
                  >
                    <span className="font-heading text-xl tracking-tight">
                      {item.name}
                    </span>
                    <ChevronDownIcon
                      className={cn(
                        "size-4 text-muted-foreground",
                        open ? "rotate-0" : "-rotate-90",
                      )}
                    />
                  </button>
                  {open ? (
                    <div className="mt-5 border-l-2 border-cobalt/40 pl-4">
                      {teamQuery.isLoading ||
                      team === undefined ||
                      team.id !== item.id ? (
                        <p className="text-sm text-muted-foreground">
                          Loading team…
                        </p>
                      ) : (
                        <div className="flex flex-col gap-6">
                          <div>
                            <h3 className="font-mono text-[0.68rem] tracking-[0.16em] text-muted-foreground uppercase">
                              Sub-teams
                            </h3>
                            {team.subTeams.length === 0 ? (
                              <p className="mt-2 text-sm text-muted-foreground">
                                No sub-teams yet.
                              </p>
                            ) : (
                              <ul className="mt-2 flex flex-col gap-2">
                                {team.subTeams.map((subTeam) => {
                                  const subTeamOpen =
                                    expandedSubTeamIds.includes(subTeam.id);
                                  const members = subTeam.memberships ?? [];
                                  return (
                                    <li key={subTeam.id}>
                                      <button
                                        type="button"
                                        aria-expanded={subTeamOpen}
                                        className="flex w-full items-center justify-between gap-3 py-1 text-left text-sm"
                                        onClick={() =>
                                          setExpandedSubTeamIds((current) =>
                                            subTeamOpen
                                              ? current.filter(
                                                  (id) => id !== subTeam.id,
                                                )
                                              : [...current, subTeam.id],
                                          )
                                        }
                                      >
                                        <span>{subTeam.name}</span>
                                        <ChevronDownIcon
                                          className={cn(
                                            "size-4 text-muted-foreground",
                                            subTeamOpen
                                              ? "rotate-0"
                                              : "-rotate-90",
                                          )}
                                        />
                                      </button>
                                      {subTeamOpen ? (
                                        <div className="mt-1 mb-2 ml-3 border-l border-ink/20 pl-3">
                                          {members.length === 0 ? (
                                            <p className="text-sm text-muted-foreground">
                                              No members on this sub-team.
                                            </p>
                                          ) : (
                                            <ul className="flex flex-col gap-1 text-sm">
                                              {members.map((membership) => (
                                                <li key={membership.id}>
                                                  {membership.user.fullName}
                                                  <span className="text-muted-foreground">
                                                    {" "}
                                                    · {membership.user.email}
                                                  </span>
                                                </li>
                                              ))}
                                            </ul>
                                          )}
                                        </div>
                                      ) : null}
                                    </li>
                                  );
                                })}
                              </ul>
                            )}
                            {canConfigure ? (
                              <form
                                className="mt-3"
                                onSubmit={async (event) => {
                                  event.preventDefault();
                                  try {
                                    await createSubTeam.mutateAsync({
                                      id: team.id,
                                      data: { name: subTeamName },
                                    });
                                    setSubTeamName("");
                                    toast.success("Sub-team created.");
                                    await teamQuery.refetch();
                                  } catch (error) {
                                    toast.error(
                                      error instanceof ApiError
                                        ? error.message
                                        : "Could not create the sub-team.",
                                    );
                                  }
                                }}
                              >
                                <FieldGroup>
                                  <Field>
                                    <FieldLabel htmlFor="subteam">
                                      Name
                                    </FieldLabel>
                                    <Input
                                      id="subteam"
                                      value={subTeamName}
                                      onChange={(event) =>
                                        setSubTeamName(event.target.value)
                                      }
                                      required
                                    />
                                  </Field>
                                  <Button type="submit">Add sub-team</Button>
                                </FieldGroup>
                              </form>
                            ) : null}
                          </div>

                          <div>
                            <h3 className="font-mono text-[0.68rem] tracking-[0.16em] text-muted-foreground uppercase">
                              Members
                            </h3>
                            {team.memberships.length === 0 ? (
                              <p className="mt-2 text-sm text-muted-foreground">
                                No members yet.
                              </p>
                            ) : (
                              <ul className="mt-2 flex flex-col gap-2">
                                {sortedMembers(team.memberships).map(
                                  (membership) => (
                                    <li
                                      key={membership.id}
                                      className="flex items-baseline justify-between gap-3 text-sm"
                                    >
                                      <span>
                                        {membership.user.fullName}
                                        <span className="text-muted-foreground">
                                          {" "}
                                          · {membership.user.email}
                                        </span>
                                      </span>
                                      <span className="font-mono text-[0.68rem] tracking-[0.12em] text-muted-foreground uppercase">
                                        {membership.role === "lead"
                                          ? "Lead"
                                          : "Member"}
                                      </span>
                                    </li>
                                  ),
                                )}
                              </ul>
                            )}
                            {canConfigure ? (
                              <>
                                <Separator className="my-4" />
                                <h4 className="font-heading text-lg">
                                  Invite someone
                                </h4>
                                <form
                                  className="mt-3"
                                  onSubmit={async (event) => {
                                    event.preventDefault();
                                    try {
                                      const created =
                                        (await createInvite.mutateAsync({
                                          data: {
                                            email: inviteEmail,
                                            teamId: team.id,
                                            ...(inviteSubTeamId !== "none"
                                              ? { subTeamId: inviteSubTeamId }
                                              : {}),
                                            ...(isAdmin
                                              ? { teamRole: inviteRole }
                                              : {}),
                                          },
                                        })) as unknown as InviteCreated;
                                      setInviteEmail("");
                                      setInviteUrl(created.inviteUrl);
                                      toast.success(
                                        created.emailSent
                                          ? "Invite emailed. Link kept below if they need it again."
                                          : "Invite created. Copy the link below (email is not configured yet).",
                                      );
                                    } catch (error) {
                                      toast.error(
                                        error instanceof ApiError
                                          ? error.message
                                          : "Could not send the invite.",
                                      );
                                    }
                                  }}
                                >
                                  <FieldGroup>
                                    <Field>
                                      <FieldLabel htmlFor="invite-email">
                                        Email
                                      </FieldLabel>
                                      <Input
                                        id="invite-email"
                                        type="email"
                                        value={inviteEmail}
                                        onChange={(event) =>
                                          setInviteEmail(event.target.value)
                                        }
                                        required
                                      />
                                    </Field>
                                    <Field>
                                      <FieldLabel htmlFor="invite-subteam">
                                        Sub-team
                                      </FieldLabel>
                                      <Select
                                        value={inviteSubTeamId}
                                        items={{
                                          none: "None yet",
                                          ...subTeamItems,
                                        }}
                                        onValueChange={(value) => {
                                          if (value === null) {
                                            return;
                                          }
                                          setInviteSubTeamId(value);
                                        }}
                                      >
                                        <SelectTrigger
                                          id="invite-subteam"
                                          className="w-full"
                                        >
                                          <SelectValue placeholder="None yet" />
                                        </SelectTrigger>
                                        <SelectContent>
                                          <SelectGroup>
                                            <SelectItem value="none">
                                              None yet
                                            </SelectItem>
                                            {team.subTeams.map((subTeam) => (
                                              <SelectItem
                                                key={subTeam.id}
                                                value={subTeam.id}
                                              >
                                                {subTeam.name}
                                              </SelectItem>
                                            ))}
                                          </SelectGroup>
                                        </SelectContent>
                                      </Select>
                                    </Field>
                                    {isAdmin ? (
                                      <Field>
                                        <FieldLabel htmlFor="invite-role">
                                          Role
                                        </FieldLabel>
                                        <Select
                                          value={inviteRole}
                                          items={{
                                            member: "Member",
                                            lead: "Team lead",
                                          }}
                                          onValueChange={(value) => {
                                            if (
                                              value === "member" ||
                                              value === "lead"
                                            ) {
                                              setInviteRole(value);
                                            }
                                          }}
                                        >
                                          <SelectTrigger
                                            id="invite-role"
                                            className="w-full"
                                          >
                                            <SelectValue />
                                          </SelectTrigger>
                                          <SelectContent>
                                            <SelectGroup>
                                              <SelectItem value="member">
                                                Member
                                              </SelectItem>
                                              <SelectItem value="lead">
                                                Team lead
                                              </SelectItem>
                                            </SelectGroup>
                                          </SelectContent>
                                        </Select>
                                      </Field>
                                    ) : null}
                                    <Button type="submit">Create invite</Button>
                                  </FieldGroup>
                                </form>
                                {inviteUrl !== null ? (
                                  <p className="mt-3 break-all font-mono text-sm">
                                    {inviteUrl}
                                  </p>
                                ) : null}
                              </>
                            ) : null}
                          </div>
                        </div>
                      )}
                    </div>
                  ) : null}
                </li>
              );
            })}
          </ul>
        ) : null}
      </SettingsGroup>

      {team !== undefined && canConfigure ? (
        <SettingsGroup
          title="Pipeline"
          description="How new projects move through sub-teams. Same step number means those desks work at the same time."
        >
          <section className="ticket">
            <h3 className="font-heading text-xl">Phases</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              The ID slug is generated from the name. Changes apply to new
              projects.
            </p>
            <div className="mt-4 flex flex-col gap-3">
              {editor.map((phase, index) => {
                const generatedSlug = slugify(phase.name);
                return (
                  <div
                    key={phase.key}
                    className="grid gap-3 md:grid-cols-[minmax(0,1fr)_6.5rem_minmax(12rem,0.9fr)_auto] md:items-start"
                  >
                    <div className="flex min-w-0 flex-col gap-1">
                      <Field>
                        <FieldLabel htmlFor={`phase-name-${phase.key}`}>
                          Name
                        </FieldLabel>
                        <Input
                          id={`phase-name-${phase.key}`}
                          placeholder="Design"
                          value={phase.name}
                          onChange={(event) =>
                            updatePhase(index, { name: event.target.value })
                          }
                        />
                      </Field>
                      <p className="font-mono text-[0.68rem] text-muted-foreground">
                        {generatedSlug.length > 0
                          ? generatedSlug
                          : "slug from name"}
                      </p>
                    </div>
                    <Field>
                      <FieldLabel htmlFor={`phase-step-${phase.key}`}>
                        Step
                      </FieldLabel>
                      <Input
                        id={`phase-step-${phase.key}`}
                        placeholder="1"
                        inputMode="numeric"
                        value={phase.step}
                        onChange={(event) =>
                          updatePhase(index, { step: event.target.value })
                        }
                      />
                    </Field>
                    <Field>
                      <FieldLabel htmlFor={`phase-subteam-${phase.key}`}>
                        Sub-team
                      </FieldLabel>
                      <Select
                        value={
                          phase.subTeamId.length > 0 ? phase.subTeamId : null
                        }
                        items={subTeamItems}
                        onValueChange={(value) => {
                          if (value === null) {
                            return;
                          }
                          updatePhase(index, { subTeamId: value });
                        }}
                      >
                        <SelectTrigger
                          id={`phase-subteam-${phase.key}`}
                          className="w-full"
                        >
                          <SelectValue placeholder="Choose a sub-team" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectGroup>
                            {team.subTeams.map((subTeam) => (
                              <SelectItem key={subTeam.id} value={subTeam.id}>
                                {subTeam.name}
                              </SelectItem>
                            ))}
                          </SelectGroup>
                        </SelectContent>
                      </Select>
                    </Field>
                    <Field>
                      <FieldLabel
                        className="invisible max-md:hidden"
                        aria-hidden
                      >
                        Remove
                      </FieldLabel>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() =>
                          setPhases(
                            editor.filter(
                              (_, itemIndex) => itemIndex !== index,
                            ),
                          )
                        }
                      >
                        Remove
                      </Button>
                    </Field>
                  </div>
                );
              })}
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() =>
                    setPhases([
                      ...editor,
                      {
                        key: crypto.randomUUID(),
                        name: "",
                        step: String(editor.length + 1),
                        subTeamId: team.subTeams[0]?.id ?? "",
                      },
                    ])
                  }
                >
                  Add phase
                </Button>
                <Button
                  type="button"
                  onClick={async () => {
                    if (editor.length === 0) {
                      toast.error("Add at least one phase.");
                      return;
                    }
                    const slugs = uniqueSlugs(
                      editor.map((phase) => phase.name),
                    );
                    try {
                      await savePhases.mutateAsync({
                        id: team.id,
                        data: {
                          phases: editor.map((phase, index) => ({
                            name: phase.name,
                            slug: slugs[index],
                            step: Number(phase.step),
                            subTeamId: phase.subTeamId,
                          })),
                        },
                      });
                      setPhases(null);
                      toast.success("Phases saved.");
                      await teamQuery.refetch();
                    } catch (error) {
                      toast.error(
                        error instanceof ApiError
                          ? error.message
                          : "Could not save phases.",
                      );
                    }
                  }}
                >
                  Save phases
                </Button>
              </div>
            </div>
          </section>
        </SettingsGroup>
      ) : null}
    </div>
  );
}
