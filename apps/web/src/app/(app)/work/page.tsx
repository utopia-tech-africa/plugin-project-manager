"use client";

import { useState } from "react";
import { toast } from "sonner";

import { DocketId } from "@/components/docket-id";
import { PageHeader } from "@/components/page-header";
import { Ticket } from "@/components/ticket";
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
import { Textarea } from "@/components/ui/textarea";
import {
  useGetProjects,
  useGetTeams,
  usePostProjects,
} from "@/lib/api/generated/client";
import { ApiError } from "@/lib/api/problem-details";
import { useAuthStore } from "@/lib/auth/auth-store";
import type { Project, TeamSummary } from "@/lib/types";

export default function WorkPage() {
  const user = useAuthStore((state) => state.user);
  const projectsQuery = useGetProjects();
  const teamsQuery = useGetTeams();
  const createProject = usePostProjects();
  const projects = (projectsQuery.data as Project[] | undefined) ?? [];
  const teams = (teamsQuery.data as TeamSummary[] | undefined) ?? [];
  const canCreate =
    user?.orgRole === "admin" ||
    user?.teamRoles.some((item) => item.role === "lead") === true;
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [teamId, setTeamId] = useState("");
  const leadTeams = teams.filter(
    (team) =>
      user?.orgRole === "admin" ||
      user?.teamRoles.some(
        (item) => item.teamId === team.id && item.role === "lead",
      ),
  );

  return (
    <div className="flex flex-col gap-10">
      <PageHeader eyebrow="Now" title="Work" />

      {canCreate ? (
        <Ticket>
          <h2 className="font-heading text-xl tracking-tight">New project</h2>
          <form
            className="mt-4"
            onSubmit={async (event) => {
              event.preventDefault();
              const selectedTeamId = teamId || leadTeams[0]?.id;
              if (selectedTeamId === undefined) {
                toast.error("Create a team before adding a project.");
                return;
              }
              try {
                await createProject.mutateAsync({
                  data: { teamId: selectedTeamId, name, description },
                });
                setName("");
                setDescription("");
                toast.success("Project created.");
                await projectsQuery.refetch();
              } catch (error) {
                toast.error(
                  error instanceof ApiError
                    ? error.message
                    : "Could not create the project.",
                );
              }
            }}
          >
            <FieldGroup>
              {leadTeams.length > 1 ? (
                <Field>
                  <FieldLabel htmlFor="team">Team</FieldLabel>
                  <Select
                    value={teamId || leadTeams[0]?.id}
                    items={Object.fromEntries(
                      leadTeams.map((team) => [team.id, team.name]),
                    )}
                    onValueChange={(value) => {
                      if (value === null) {
                        return;
                      }
                      setTeamId(value);
                    }}
                  >
                    <SelectTrigger id="team" className="w-full">
                      <SelectValue placeholder="Choose a team" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        {leadTeams.map((team) => (
                          <SelectItem key={team.id} value={team.id}>
                            {team.name}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </Field>
              ) : null}
              <Field>
                <FieldLabel htmlFor="name">Name</FieldLabel>
                <Input
                  id="name"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  required
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="description">Note</FieldLabel>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                />
              </Field>
              <Button type="submit" disabled={createProject.isPending}>
                Create project
              </Button>
            </FieldGroup>
          </form>
        </Ticket>
      ) : null}

      <section className="flex flex-col gap-4">
        {projects.length === 0 ? (
          <Ticket>
            <p className="font-heading text-xl">Nothing on your plate yet</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Active jobs for your team will land here.
            </p>
          </Ticket>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {projects.map((project) => {
              const active = project.phases.filter(
                (phase) => phase.status === "active",
              );
              return (
                <Ticket
                  key={project.id}
                  href={`/work/${project.id}`}
                  tone={active.length > 0 ? "live" : "default"}
                >
                  <div className="flex flex-col gap-3">
                    <DocketId value={project.publicId} />
                    <p className="font-heading text-xl tracking-tight">
                      {project.name}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {project.team.name}
                      {active.length > 0
                        ? ` · ${active.map((phase) => phase.subTeam.name).join(" · ")}`
                        : ` · ${project.status}`}
                    </p>
                    {active.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {active.map((phase) => (
                          <DocketId key={phase.id} value={phase.publicId} />
                        ))}
                      </div>
                    ) : null}
                  </div>
                </Ticket>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
