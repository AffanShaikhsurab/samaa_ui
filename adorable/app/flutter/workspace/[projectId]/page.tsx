import FlutterWorkspacePage from "../page";

export default async function FlutterWorkspaceProjectPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  return <FlutterWorkspacePage initialProjectId={projectId} />;
}
