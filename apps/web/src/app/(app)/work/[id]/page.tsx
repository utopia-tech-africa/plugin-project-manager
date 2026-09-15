"use client";

import { useParams } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { DocketId } from "@/components/docket-id";
import { PageHeader } from "@/components/page-header";
import { Ticket } from "@/components/ticket";
import { Button } from "@/components/ui/button";
import { Field, FieldLabel } from "@/components/ui/field";
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
import { getApiBaseUrl } from "@/lib/api/api-base-url";
import {
  useGetProjectsById,
  usePostProjectPhaseComplete,
  usePostProjectPhaseDocuments,
  usePostProjectsSendBack,
} from "@/lib/api/generated/client";
import { ApiError } from "@/lib/api/problem-details";
import { useAuthStore } from "@/lib/auth/auth-store";
import type { PhaseStatus, Project } from "@/lib/types";

const phaseTone = (
  status: PhaseStatus,
): "live" | "waiting" | "returned" | "quiet" | "default" => {
  if (status === "active") {
    return "live";
  }
  if (status === "returned") {
    return "returned";
  }
  if (status === "pending") {
    return "quiet";
  }
  return "default";
};

export default function ProjectPage() {
  const params = useParams<{ id: string }>();
  const token = useAuthStore((state) => state.accessToken);
  const query = useGetProjectsById(params.id);
  const completePhase = usePostProjectPhaseComplete();
  const uploadDocuments = usePostProjectPhaseDocuments();
  const sendBack = usePostProjectsSendBack();
  const project = query.data as Project | undefined;
  const [files, setFiles] = useState<FileList | null>(null);
  const [returnReason, setReturnReason] = useState("");
  const [targetPhaseId, setTargetPhaseId] = useState("");

  if (query.isLoading) {
    return <p className="text-muted-foreground">Loading project…</p>;
  }
  if (project === undefined) {
    return <p className="text-muted-foreground">Project was not found.</p>;
  }

  const latestBySlug = new Map<string, (typeof project.phases)[number]>();
  for (const phase of project.phases) {
    const existing = latestBySlug.get(`${phase.step}-${phase.slug}`);
    if (existing === undefined || phase.attempt > existing.attempt) {
      latestBySlug.set(`${phase.step}-${phase.slug}`, phase);
    }
  }
  const visible = [...latestBySlug.values()].sort(
    (left, right) =>
      left.step - right.step || left.name.localeCompare(right.name),
  );
  const previousStep = project.currentStep - 1;
  const sendBackTargets =
    previousStep >= 1
      ? visible.filter((phase) => phase.step === previousStep)
      : [];

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-3">
        <DocketId value={project.publicId} />
        <PageHeader eyebrow={project.team.name} title={project.name} />
        {project.description.length > 0 ? (
          <p className="text-muted-foreground">{project.description}</p>
        ) : null}
      </div>

      <ol className="flex flex-col gap-4">
        {visible.map((phase) => (
          <li key={phase.id}>
            <Ticket tone={phaseTone(phase.status)}>
              <div className="flex items-start justify-between gap-4">
                <div className="flex flex-col gap-2">
                  <p className="font-mono text-[0.68rem] tracking-[0.16em] text-muted-foreground uppercase">
                    Step {phase.step} · {phase.subTeam.name}
                  </p>
                  <h2 className="font-heading text-2xl tracking-tight">
                    {phase.name}
                  </h2>
                  <DocketId value={phase.publicId} />
                </div>
                <p className="font-mono text-xs tracking-[0.12em] text-muted-foreground uppercase">
                  {phase.status}
                </p>
              </div>

              {phase.documents.length > 0 ? (
                <ul className="mt-4 flex flex-col gap-2">
                  {phase.documents.map((document) => (
                    <li key={document.id}>
                      <a
                        className="text-sm text-cobalt underline underline-offset-4"
                        href={`${getApiBaseUrl()}/documents/${document.id}/file`}
                        onClick={(event) => {
                          event.preventDefault();
                          void fetch(
                            `${getApiBaseUrl()}/documents/${document.id}/file`,
                            {
                              headers:
                                token !== null
                                  ? { Authorization: `Bearer ${token}` }
                                  : {},
                            },
                          )
                            .then(async (response) => {
                              const blob = await response.blob();
                              const url = URL.createObjectURL(blob);
                              const link = window.document.createElement("a");
                              link.href = url;
                              link.download = document.fileName;
                              link.click();
                              URL.revokeObjectURL(url);
                            })
                            .catch(() =>
                              toast.error("Could not download that file."),
                            );
                        }}
                      >
                        {document.fileName}
                      </a>
                    </li>
                  ))}
                </ul>
              ) : null}

              {phase.status === "active" ? (
                <div className="mt-5 flex flex-col gap-3">
                  <Field>
                    <FieldLabel htmlFor={`files-${phase.id}`}>Files</FieldLabel>
                    <Input
                      id={`files-${phase.id}`}
                      type="file"
                      multiple
                      onChange={(event) => setFiles(event.target.files)}
                    />
                  </Field>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      disabled={
                        completePhase.isPending ||
                        uploadDocuments.isPending ||
                        (phase.documents.length === 0 &&
                          (files === null || files.length === 0))
                      }
                      onClick={async () => {
                        try {
                          if (files !== null && files.length > 0) {
                            await uploadDocuments.mutateAsync({
                              id: phase.id,
                              data: { files: Array.from(files) },
                            });
                            setFiles(null);
                          }
                          await completePhase.mutateAsync({ id: phase.id });
                          toast.success("Handed off.");
                          await query.refetch();
                        } catch (error) {
                          toast.error(
                            error instanceof ApiError
                              ? error.message
                              : "Upload a file before handing off.",
                          );
                        }
                      }}
                    >
                      Hand off
                    </Button>
                  </div>
                </div>
              ) : null}
            </Ticket>
          </li>
        ))}
      </ol>

      {project.status === "active" && sendBackTargets.length > 0 ? (
        <Ticket tone="returned">
          <h2 className="font-heading text-xl tracking-tight">Send back</h2>
          <form
            className="mt-4"
            onSubmit={async (event) => {
              event.preventDefault();
              if (targetPhaseId.length === 0) {
                toast.error("Choose a phase to return to.");
                return;
              }
              try {
                await sendBack.mutateAsync({
                  id: project.id,
                  data: { targetPhaseId, reason: returnReason },
                });
                toast.success("Sent back.");
                setReturnReason("");
                setTargetPhaseId("");
                await query.refetch();
              } catch (error) {
                toast.error(
                  error instanceof ApiError
                    ? error.message
                    : "Could not send this back.",
                );
              }
            }}
          >
            <div className="flex flex-col gap-4">
              <Field>
                <FieldLabel htmlFor="target">Return to</FieldLabel>
                <Select
                  value={targetPhaseId.length > 0 ? targetPhaseId : null}
                  items={Object.fromEntries(
                    sendBackTargets.map((phase) => [
                      phase.id,
                      `${phase.publicId} · ${phase.name}`,
                    ]),
                  )}
                  onValueChange={(value) => {
                    if (value === null) {
                      return;
                    }
                    setTargetPhaseId(value);
                  }}
                >
                  <SelectTrigger id="target" className="w-full">
                    <SelectValue placeholder="Choose previous phase" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      {sendBackTargets.map((phase) => (
                        <SelectItem key={phase.id} value={phase.id}>
                          {phase.publicId} · {phase.name}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </Field>
              <Field>
                <FieldLabel htmlFor="reason">Reason</FieldLabel>
                <Textarea
                  id="reason"
                  value={returnReason}
                  onChange={(event) => setReturnReason(event.target.value)}
                />
              </Field>
              <Button
                type="submit"
                variant="outline"
                disabled={sendBack.isPending}
              >
                Send back
              </Button>
            </div>
          </form>
        </Ticket>
      ) : null}
    </div>
  );
}
