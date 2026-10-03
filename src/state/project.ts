export type ProjectStatus =
  | "draft"
  | "running"
  | "review"
  | "revision"
  | "approved"
  | "blocked";

export interface ArtifactReference {
  path: string;
  version: string;
  status: string;
  checksum?: string;
  inputs?: string[];
}

export interface VideoProjectState {
  projectId: string;
  title: string;
  status: ProjectStatus;
  createdAt: string;
  updatedAt?: string;
  artifacts: Record<string, ArtifactReference>;
  renderHistory: ArtifactReference[];
}

// Persistence and schema validation are intentionally deferred.
